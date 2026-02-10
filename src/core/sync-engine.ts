/**
 * Sync engine - main orchestrator for sync operations
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SyncConfig, SyncResult, SyncStatus, FileChange, BackupInfo } from '../types/index.js';
import { GitManager } from './git-manager.js';
import { FileScanner } from './file-scanner.js';
import { ConflictResolver } from './conflict-resolver.js';
import { Merger } from './merger.js';
import { getClaudePaths, ensureDir, getRelativePath, joinPaths } from '../utils/helpers.js';
import { info, success, error, warn, debug, spinner } from '../utils/logger.js';

export class SyncEngine {
  private config: SyncConfig;
  private git: GitManager;
  private scanner: FileScanner;
  private resolver: ConflictResolver;
  private merger: Merger;

  constructor(config: SyncConfig) {
    this.config = config;
    this.git = new GitManager();
    this.scanner = new FileScanner(config);
    this.resolver = new ConflictResolver(config.sync.conflictStrategy);
    this.merger = new Merger(config.sync.conflictStrategy);
  }

  /**
   * Initialize sync repository
   */
  async initialize(): Promise<SyncResult> {
    const spin = spinner('Initializing sync repository...').start();

    try {
      const paths = getClaudePaths();

      // Ensure sync directories exist
      ensureDir(paths.syncHome);
      ensureDir(paths.backupDir);

      // Check if repo already exists
      const repoExists = await this.git.repoExists();

      if (repoExists) {
        spin.warn('Repository already initialized');
        return {
          success: true,
          message: 'Repository already exists',
        };
      }

      // Clone or initialize repository
      const { repository, branch } = this.config.sync;

      if (repository) {
        // Clone existing repository
        spin.text = 'Cloning repository...';
        const cloned = await this.git.clone(repository, branch);

        if (!cloned) {
          spin.fail('Failed to clone repository');
          return {
            success: false,
            errors: ['Failed to clone repository'],
            message: 'Failed to clone repository',
          };
        }
      } else {
        // Initialize new repository
        spin.text = 'Initializing new repository...';
        await this.git.init();

        // Create initial commit
        await this.createInitialCommit();
      }

      spin.succeed('Repository initialized successfully');
      return {
        success: true,
        message: 'Repository initialized successfully',
      };
    } catch (err) {
      spin.fail('Initialization failed');
      return {
        success: false,
        errors: [String(err)],
        message: 'Initialization failed',
      };
    }
  }

  /**
   * Push local changes to remote
   */
  async push(): Promise<SyncResult> {
    const spin = spinner('Preparing to push...').start();

    try {
      // Backup current state
      await this.createBackup();

      // Scan for files to sync
      spin.text = 'Scanning files...';
      const scanResult = await this.scanner.scan();

      if (scanResult.files.length === 0) {
        spin.info('No files to sync');
        return {
          success: true,
          pushed: 0,
          message: 'No files to sync',
        };
      }

      // Copy files to repo directory
      spin.text = `Copying ${scanResult.files.length} files...`;
      await this.copyFilesToRepo(scanResult.files);

      // Stage and commit changes
      spin.text = 'Committing changes...';
      await this.git.addAll();

      const hasChanges = await this.git.hasChanges();

      if (!hasChanges) {
        spin.info('No changes to push');
        return {
          success: true,
          pushed: 0,
          message: 'No changes to push',
        };
      }

      const commitMessage = this.generateCommitMessage(scanResult.files.length);
      await this.git.commit(commitMessage);

      // Push to remote
      spin.text = 'Pushing to remote...';
      const pushed = await this.git.push('origin', this.config.sync.branch);

      if (!pushed) {
        spin.fail('Failed to push to remote');
        return {
          success: false,
          errors: ['Failed to push to remote'],
          message: 'Failed to push to remote',
        };
      }

      spin.succeed(`Pushed ${scanResult.files.length} files`);
      return {
        success: true,
        pushed: scanResult.files.length,
        message: `Successfully pushed ${scanResult.files.length} files`,
      };
    } catch (err) {
      spin.fail('Push failed');
      return {
        success: false,
        errors: [String(err)],
        message: 'Push operation failed',
      };
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(): Promise<SyncResult> {
    const spin = spinner('Pulling from remote...').start();

    try {
      // Backup current state
      await this.createBackup();

      // Pull from remote
      const pulled = await this.git.pull('origin', this.config.sync.branch);

      if (!pulled) {
        spin.fail('Failed to pull from remote');
        return {
          success: false,
          errors: ['Failed to pull from remote'],
          message: 'Failed to pull from remote',
        };
      }

      // Get files from repo
      spin.text = 'Scanning pulled files...';
      const repoFiles = await this.getRepoFiles();

      // Check for conflicts
      spin.text = 'Checking for conflicts...';
      const conflicts = await this.checkForConflicts(repoFiles);

      if (conflicts.length > 0) {
        spin.warn(`Found ${conflicts.length} conflicts`);

        const resolved = await this.resolver.resolveConflicts(conflicts);
        await this.resolver.applyResolutions(resolved, getClaudePaths().claudeHome);

        const unresolved = resolved.filter(c => !c.resolved).length;
        if (unresolved > 0) {
          spin.fail(`${unresolved} conflicts remain unresolved`);
          return {
            success: false,
            errors: [`${unresolved} conflicts remain unresolved`],
            message: 'Pull completed with unresolved conflicts',
          };
        }
      }

      // Apply files to Claude directory
      spin.text = 'Applying files...';
      await this.applyFilesToClaude(repoFiles);

      spin.succeed(`Pulled ${repoFiles.length} files`);
      return {
        success: true,
        pulled: repoFiles.length,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        message: `Successfully pulled ${repoFiles.length} files`,
      };
    } catch (err) {
      spin.fail('Pull failed');
      return {
        success: false,
        errors: [String(err)],
        message: 'Pull operation failed',
      };
    }
  }

  /**
   * Perform bidirectional sync
   */
  async sync(): Promise<SyncResult> {
    const spin = spinner('Syncing...').start();

    try {
      // First pull remote changes
      const pullResult = await this.pull();

      if (!pullResult.success && pullResult.errors?.length) {
        spin.fail('Sync failed during pull');
        return pullResult;
      }

      // Then push local changes
      const pushResult = await this.push();

      if (!pushResult.success) {
        spin.fail('Sync failed during push');
        return pushResult;
      }

      spin.succeed('Sync completed successfully');
      return {
        success: true,
        pulled: pullResult.pulled,
        pushed: pushResult.pushed,
        message: 'Sync completed successfully',
      };
    } catch (err) {
      spin.fail('Sync failed');
      return {
        success: false,
        errors: [String(err)],
        message: 'Sync operation failed',
      };
    }
  }

  /**
   * Get current sync status
   */
  async status(): Promise<SyncStatus> {
    const paths = getClaudePaths();

    try {
      const gitStatus = await this.git.status();
      const currentCommit = await this.git.getCurrentCommit();

      return {
        repository: this.config.sync.repository,
        branch: this.config.sync.branch,
        currentCommit: currentCommit || undefined,
        ahead: gitStatus.ahead || 0,
        behind: gitStatus.behind || 0,
        conflicted: gitStatus.conflicts || [],
        staged: gitStatus.files.map((f: any) => ({
          path: f.path,
          status: f.working_dir as any,
        })),
        unstaged: [],
        untracked: gitStatus.not_added || [],
      };
    } catch (err) {
      error('Failed to get status:', err);
      return {
        repository: this.config.sync.repository,
        branch: this.config.sync.branch,
        ahead: 0,
        behind: 0,
        conflicted: [],
        staged: [],
        unstaged: [],
        untracked: [],
      };
    }
  }

  /**
   * Create backup of current configuration
   */
  async createBackup(): Promise<BackupInfo> {
    const paths = getClaudePaths();
    const timestamp = new Date();
    const backupName = `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const backupPath = path.join(paths.backupDir, backupName);

    ensureDir(backupPath);

    const files = await this.scanner.scan();
    const backedUpFiles: string[] = [];

    for (const file of files.files) {
      const relativePath = getRelativePath(file, paths.claudeHome);
      const destPath = path.join(backupPath, relativePath);
      const destDir = path.dirname(destPath);

      ensureDir(destDir);
      fs.copyFileSync(file, destPath);
      backedUpFiles.push(relativePath);
    }

    debug(`Created backup: ${backupName}`);

    return {
      timestamp,
      path: backupPath,
      files: backedUpFiles,
    };
  }

  /**
   * List available backups
   */
  listBackups(): BackupInfo[] {
    const paths = getClaudePaths();

    if (!fs.existsSync(paths.backupDir)) {
      return [];
    }

    const backups: BackupInfo[] = [];
    const entries = fs.readdirSync(paths.backupDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('backup-')) {
        const backupPath = path.join(paths.backupDir, entry.name);
        const stats = fs.statSync(backupPath);

        // Get files in backup
        const files: string[] = [];
        const collectFiles = (dir: string, base: string = '') => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            const fullPath = path.join(dir, e.name);
            const relPath = path.join(base, e.name);
            if (e.isDirectory()) {
              collectFiles(fullPath, relPath);
            } else {
              files.push(relPath);
            }
          }
        };
        collectFiles(backupPath);

        backups.push({
          timestamp: stats.mtime,
          path: backupPath,
          files,
        });
      }
    }

    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      const paths = getClaudePaths();

      if (!fs.existsSync(backupPath)) {
        error('Backup not found:', backupPath);
        return false;
      }

      // Copy files from backup to Claude directory
      const restoreFiles = (dir: string, base: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const fullPath = path.join(dir, e.name);
          const relPath = path.join(base, e.name);
          const destPath = path.join(paths.claudeHome, relPath);

          if (e.isDirectory()) {
            ensureDir(destPath);
            restoreFiles(fullPath, relPath);
          } else {
            ensureDir(path.dirname(destPath));
            fs.copyFileSync(fullPath, destPath);
          }
        }
      };

      restoreFiles(backupPath);

      success('Backup restored successfully');
      return true;
    } catch (err) {
      error('Failed to restore backup:', err);
      return false;
    }
  }

  /**
   * Copy files to repository directory
   */
  private async copyFilesToRepo(files: string[]): Promise<void> {
    const paths = getClaudePaths();

    for (const file of files) {
      const relativePath = getRelativePath(file, paths.claudeHome);
      const destPath = path.join(paths.syncRepoDir, relativePath);
      const destDir = path.dirname(destPath);

      ensureDir(destDir);
      fs.copyFileSync(file, destPath);
    }
  }

  /**
   * Get all files in the repository
   */
  private async getRepoFiles(): Promise<string[]> {
    const paths = getClaudePaths();

    const collectFiles = (dir: string, base: string = ''): string[] => {
      const files: string[] = [];

      if (!fs.existsSync(dir)) {
        return files;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === '.git') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(base, entry.name);

        if (entry.isDirectory()) {
          files.push(...collectFiles(fullPath, relPath));
        } else {
          files.push(relPath);
        }
      }

      return files;
    };

    return collectFiles(paths.syncRepoDir);
  }

  /**
   * Check for conflicts between local and repo files
   */
  private async checkForConflicts(files: string[]): Promise<any[]> {
    const paths = getClaudePaths();
    const conflicts: any[] = [];

    for (const file of files) {
      const localPath = path.join(paths.claudeHome, file);
      const repoPath = path.join(paths.syncRepoDir, file);

      const hasLocal = fs.existsSync(localPath);
      const hasRepo = fs.existsSync(repoPath);

      if (hasLocal && hasRepo) {
        const localContent = fs.readFileSync(localPath, 'utf-8');
        const repoContent = fs.readFileSync(repoPath, 'utf-8');

        if (localContent !== repoContent) {
          conflicts.push({
            path: file,
            localContent,
            remoteContent: repoContent,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Apply files from repo to Claude directory
   */
  private async applyFilesToClaude(files: string[]): Promise<void> {
    const paths = getClaudePaths();

    for (const file of files) {
      const repoPath = path.join(paths.syncRepoDir, file);
      const destPath = path.join(paths.claudeHome, file);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(repoPath)) {
        continue;
      }

      ensureDir(destDir);
      fs.copyFileSync(repoPath, destPath);
    }
  }

  /**
   * Create initial commit
   */
  private async createInitialCommit(): Promise<void> {
    // Create .gitignore
    const paths = getClaudePaths();
    const gitignorePath = path.join(paths.syncRepoDir, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(
        gitignorePath,
        `.DS_Store
*.log
.env
*.key
secrets/
`,
        'utf-8'
      );
    }

    await this.git.add('.');
    await this.git.commit('Initial commit - claude-sync initialized');
  }

  /**
   * Generate commit message
   */
  private generateCommitMessage(fileCount: number): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    return `Update Claude configuration - ${fileCount} files

Date: ${now.toISOString()}
Tool: claude-sync
`;
  }
}
