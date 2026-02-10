/**
 * Conflict resolver for handling merge conflicts
 */

import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import type { ConflictInfo, ConflictStrategy } from '../types/index.js';
import { Merger } from './merger.js';
import { error, info, warn, debug } from '../utils/logger.js';
import { getClaudePaths } from '../utils/helpers.js';

export interface ResolveResult {
  resolved: boolean;
  choice?: 'local' | 'remote' | 'merge' | 'skip';
  content?: string;
}

export class ConflictResolver {
  private strategy: ConflictStrategy;
  private merger: Merger;

  constructor(strategy: ConflictStrategy) {
    this.strategy = strategy;
    this.merger = new Merger(strategy);
  }

  /**
   * Resolve a list of conflicts
   */
  async resolveConflicts(conflicts: ConflictInfo[]): Promise<ConflictInfo[]> {
    const resolved: ConflictInfo[] = [];

    for (const conflict of conflicts) {
      const result = await this.resolveConflict(conflict);

      if (result.resolved && result.content !== undefined) {
        resolved.push({
          ...conflict,
          resolved: true,
        });
      } else if (result.choice === 'skip') {
        // Mark as unresolved but continue
        resolved.push({
          ...conflict,
          resolved: false,
        });
      } else {
        // Auto-resolved based on strategy
        resolved.push({
          ...conflict,
          resolved: true,
        });
      }
    }

    return resolved;
  }

  /**
   * Resolve a single conflict
   */
  async resolveConflict(conflict: ConflictInfo): Promise<ResolveResult> {
    debug(`Resolving conflict for: ${conflict.path}`);

    // Check if this is a JSON file that can be merged
    const canMerge = this.merger.canMerge(conflict.path);

    switch (this.strategy) {
      case 'local':
        return {
          resolved: true,
          choice: 'local',
          content: conflict.localContent,
        };

      case 'remote':
        return {
          resolved: true,
          choice: 'remote',
          content: conflict.remoteContent,
        };

      case 'newest':
        return this.resolveByNewest(conflict);

      case 'ask':
      default:
        return await this.askUser(conflict, canMerge);
    }
  }

  /**
   * Ask user to resolve conflict interactively
   */
  private async askUser(
    conflict: ConflictInfo,
    canMerge: boolean
  ): Promise<ResolveResult> {
    info(`\nConflict in: ${conflict.path}`);

    const choices: any[] = [
      { name: 'Use local version', value: 'local' },
      { name: 'Use remote version', value: 'remote' },
    ];

    if (canMerge) {
      choices.push({ name: 'Auto-merge both versions', value: 'merge' });
    }

    choices.push({ name: 'Skip for now', value: 'skip' });

    // Show diff preview
    this.showDiffPreview(conflict);

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'How do you want to resolve this conflict?',
        choices,
      },
    ]);

    switch (answers.choice) {
      case 'local':
        return {
          resolved: true,
          choice: 'local',
          content: conflict.localContent,
        };
      case 'remote':
        return {
          resolved: true,
          choice: 'remote',
          content: conflict.remoteContent,
        };
      case 'merge':
        const merged = this.merger.applyMergeChoice(
          conflict.localContent,
          conflict.remoteContent,
          'merge'
        );
        return {
          resolved: true,
          choice: 'merge',
          content: merged,
        };
      case 'skip':
        return {
          resolved: false,
          choice: 'skip',
        };
      default:
        return {
          resolved: false,
          choice: 'skip',
        };
    }
  }

  /**
   * Resolve by choosing the newest version (by modification time)
   */
  private resolveByNewest(conflict: ConflictInfo): ResolveResult {
    const paths = getClaudePaths();
    const localPath = path.join(paths.claudeHome, conflict.path);
    const remotePath = path.join(paths.syncRepoDir, conflict.path);

    let localMtime: Date | null = null;
    let remoteMtime: Date | null = null;

    try {
      const localStats = fs.statSync(localPath);
      localMtime = localStats.mtime;
    } catch {
      // File might not exist
    }

    try {
      const remoteStats = fs.statSync(remotePath);
      remoteMtime = remoteStats.mtime;
    } catch {
      // File might not exist
    }

    if (localMtime && remoteMtime) {
      if (localMtime > remoteMtime) {
        return {
          resolved: true,
          choice: 'local',
          content: conflict.localContent,
        };
      } else {
        return {
          resolved: true,
          choice: 'remote',
          content: conflict.remoteContent,
        };
      }
    } else if (localMtime) {
      return {
        resolved: true,
        choice: 'local',
        content: conflict.localContent,
      };
    } else if (remoteMtime) {
      return {
        resolved: true,
        choice: 'remote',
        content: conflict.remoteContent,
      };
    }

    // Can't determine, default to remote
    return {
      resolved: true,
      choice: 'remote',
      content: conflict.remoteContent,
    };
  }

  /**
   * Show a diff preview of the conflict
   */
  private showDiffPreview(conflict: ConflictInfo): void {
    warn('\n--- LOCAL VERSION ---');
    console.log(conflict.localContent.substring(0, 500));
    if (conflict.localContent.length > 500) {
      console.log('... (truncated)');
    }

    warn('\n--- REMOTE VERSION ---');
    console.log(conflict.remoteContent.substring(0, 500));
    if (conflict.remoteContent.length > 500) {
      console.log('... (truncated)');
    }
    console.log('');
  }

  /**
   * Find conflicts between two directories
   */
  async findConflicts(
    localDir: string,
    remoteDir: string,
    files: string[]
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (const file of files) {
      const localPath = path.join(localDir, file);
      const remotePath = path.join(remoteDir, file);

      const hasLocal = fs.existsSync(localPath);
      const hasRemote = fs.existsSync(remotePath);

      if (!hasLocal && !hasRemote) {
        continue;
      }

      if (!hasLocal || !hasRemote) {
        // File exists in only one location, not a conflict
        continue;
      }

      // Both exist, check if they differ
      const localContent = fs.readFileSync(localPath, 'utf-8');
      const remoteContent = fs.readFileSync(remotePath, 'utf-8');

      if (localContent !== remoteContent) {
        conflicts.push({
          path: file,
          localContent,
          remoteContent,
        });
      }
    }

    return conflicts;
  }

  /**
   * Apply resolved conflicts to target directory
   */
  async applyResolutions(
    conflicts: ConflictInfo[],
    targetDir: string
  ): Promise<void> {
    for (const conflict of conflicts) {
      if (conflict.resolved) {
        const targetPath = path.join(targetDir, conflict.path);
        const targetDirPath = path.dirname(targetPath);

        // Ensure directory exists
        if (!fs.existsSync(targetDirPath)) {
          fs.mkdirSync(targetDirPath, { recursive: true });
        }

        fs.writeFileSync(targetPath, conflict.remoteContent, 'utf-8');
        debug(`Applied resolution for: ${conflict.path}`);
      }
    }
  }

  /**
   * Create conflict marker file (like git's conflict markers)
   */
  createConflictMarkers(
    localContent: string,
    remoteContent: string,
    basePath?: string
  ): string {
    const lines: string[] = [];

    lines.push('<<<<<<< LOCAL');
    lines.push(localContent);
    if (basePath) {
      lines.push('||||||| BASE');
      lines.push(basePath);
    }
    lines.push('=======');
    lines.push(remoteContent);
    lines.push('>>>>>>> REMOTE');

    return lines.join('\n');
  }
}
