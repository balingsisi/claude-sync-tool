/**
 * Diff engine for comparing local and remote changes
 * Shows what will be pushed and pulled before sync
 */

import fs from 'node:fs';
import path from 'node:path';
import type { DiffSummary, ChangeDetail, SyncConfig } from '../types/index.js';
import { GitManager } from './git-manager.js';
import { FileScanner } from './file-scanner.js';
import { getClaudePaths } from '../utils/helpers.js';
import { debug } from '../utils/logger.js';

export class DiffEngine {
  private config: SyncConfig;
  private git: GitManager;
  private scanner: FileScanner;
  private claudeHome: string;

  constructor(config: SyncConfig) {
    this.config = config;
    this.git = new GitManager();
    this.scanner = new FileScanner(config);
    const paths = getClaudePaths();
    this.claudeHome = paths.claudeHome;
  }

  /**
   * Get diff between local and remote
   */
  async getDiff(options?: { detailed?: boolean }): Promise<DiffSummary> {
    const pushChanges: ChangeDetail[] = [];
    const pullChanges: ChangeDetail[] = [];
    const conflicts: string[] = [];

    // Get git status
    const status = await this.git.status();
    if (!status) {
      return {
        pushChanges: [],
        pullChanges: [],
        conflicts: [],
        stats: { toAdd: 0, toModify: 0, toDelete: 0 },
      };
    }

    // Get local changes (files to push)
    const files = Array.isArray(status.files) ? status.files : [];
    for (const file of files) {
      const gitStatus = file.index || file.working_dir;
      if (!gitStatus) continue;

      const change: ChangeDetail = {
        path: file.path,
        status: this.mapGitStatus(gitStatus),
        type: this.categorizeFile(file.path),
      };

      pushChanges.push(change);
    }

    // Add untracked files as new files
    const untrackedFiles = Array.isArray(status.untracked) ? status.untracked : [];
    for (const file of untrackedFiles) {
      // Only include files that should be synced
      if (this.scanner.shouldSyncFile(path.join(this.claudeHome, file))) {
        const fullPath = path.join(this.claudeHome, file);
        let size: number | undefined;
        try {
          const stats = fs.statSync(fullPath);
          size = stats.size;
        } catch {}

        pushChanges.push({
          path: file,
          status: 'added',
          type: this.categorizeFile(file),
          size,
        });
      }
    }

    // Get remote changes (files to pull)
    // First fetch to get latest remote info
    await this.git.fetch();

    const currentBranch = await this.git.getCurrentBranch();
    const remoteBranch = `origin/${currentBranch}`;

    // Check if we're behind remote
    if (status.behind > 0) {
      // Get files that changed on remote
      try {
        // Get diff between HEAD and origin/currentBranch
        // Use getGit() directly to access simple-git for more options
        const diffResult = await this.git['getGit']().diff([`HEAD...${remoteBranch}`, '--name-status']);
        const remoteDiff = diffResult;

        const lines = remoteDiff.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [statusChar, ...filePathParts] = line.split('\t');
          const filePath = filePathParts.join('\t');

          if (filePath) {
            pullChanges.push({
              path: filePath,
              status: this.mapGitStatus(statusChar),
              type: this.categorizeFile(filePath),
            });
          }
        }
      } catch (err) {
        debug('Error getting remote diff:', err);
      }
    }

    // Check for conflicts
    const conflictedFiles = Array.isArray(status.conflicted) ? status.conflicted : [];
    for (const file of conflictedFiles) {
      conflicts.push(file);
    }

    // Get detailed diffs if requested
    if (options?.detailed) {
      for (const change of pushChanges) {
        try {
          const fullPath = path.join(this.claudeHome, change.path);
          if (fs.existsSync(fullPath)) {
            change.diff = await this.git.diff(change.path);
          }
        } catch {}
      }
    }

    // Calculate stats
    const stats = {
      toAdd: pushChanges.filter(c => c.status === 'added').length,
      toModify: pushChanges.filter(c => c.status === 'modified').length,
      toDelete: pushChanges.filter(c => c.status === 'deleted').length,
    };

    return {
      pushChanges,
      pullChanges,
      conflicts,
      stats,
    };
  }

  /**
   * Map git status char to our status type
   */
  private mapGitStatus(status: string): ChangeDetail['status'] {
    switch (status) {
      case 'A':
        return 'added';
      case 'M':
        return 'modified';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      default:
        return 'modified';
    }
  }

  /**
   * Categorize file by type
   */
  private categorizeFile(filePath: string): ChangeDetail['type'] {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.startsWith('skills/')) {
      return 'skill';
    }
    if (normalizedPath.startsWith('plugins/')) {
      return 'plugin';
    }
    if (normalizedPath.startsWith('projects/')) {
      return 'project';
    }
    if (normalizedPath.startsWith('history/')) {
      return 'history';
    }
    if (normalizedPath.includes('/') || normalizedPath.includes('\\')) {
      return 'custom';
    }
    return 'setting';
  }

  /**
   * Get file diff for a specific file
   */
  async getFileDiff(filePath: string): Promise<string> {
    try {
      return await this.git.diff(filePath);
    } catch {
      return '';
    }
  }

  /**
   * Get changes grouped by type
   */
  groupChangesByType(changes: ChangeDetail[]): Map<string, ChangeDetail[]> {
    const grouped = new Map<string, ChangeDetail[]>();

    for (const change of changes) {
      const type = change.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(change);
    }

    return grouped;
  }

  /**
   * Format diff summary for display
   */
  formatSummary(summary: DiffSummary): string {
    const lines: string[] = [];

    // Push changes
    if (summary.pushChanges.length > 0) {
      lines.push(`Will push: ${summary.pushChanges.length} file(s)`);
    }

    // Pull changes
    if (summary.pullChanges.length > 0) {
      lines.push(`Will pull: ${summary.pullChanges.length} file(s)`);
    }

    // Conflicts
    if (summary.conflicts.length > 0) {
      lines.push(`Conflicts: ${summary.conflicts.length} file(s)`);
    }

    // Stats
    lines.push(`\nTo push: ${summary.stats.toAdd + summary.stats.toModify + summary.stats.toDelete}`);
    lines.push(`  (add: ${summary.stats.toAdd}, modify: ${summary.stats.toModify}, delete: ${summary.stats.toDelete})`);

    return lines.join('\n');
  }
}
