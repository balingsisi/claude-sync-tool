/**
 * Configuration merger for intelligently merging settings and JSON files
 */

import deepmerge from 'deepmerge';
import fs from 'node:fs';
import type { ConflictStrategy } from '../types/index.js';
import { debug } from '../utils/logger.js';

export interface MergeResult {
  result: any;
  conflicts: string[];
  merged: boolean;
}

export class Merger {
  private conflictStrategy: ConflictStrategy;

  constructor(conflictStrategy: ConflictStrategy = 'ask') {
    this.conflictStrategy = conflictStrategy;
  }

  /**
   * Merge two JSON objects
   */
  mergeJson(local: any, remote: any, filePath?: string): MergeResult {
    const conflicts: string[] = [];
    const result = this.deepMergeWithConflicts(local, remote, [], conflicts);

    return {
      result,
      conflicts,
      merged: conflicts.length === 0 || this.conflictStrategy !== 'ask',
    };
  }

  /**
   * Deep merge with conflict detection
   */
  private deepMergeWithConflicts(
    local: any,
    remote: any,
    path: string[],
    conflicts: string[]
  ): any {
    // If both are primitives, check for conflicts
    if (this.isPrimitive(local) && this.isPrimitive(remote)) {
      if (local !== remote) {
        conflicts.push(path.join('.'));
        return this.resolveConflict(local, remote, path);
      }
      return local;
    }

    // If one is primitive, it's a conflict
    if (this.isPrimitive(local) || this.isPrimitive(remote)) {
      conflicts.push(path.join('.'));
      return this.resolveConflict(local, remote, path);
    }

    // Both are objects/arrays
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    const result: any = Array.isArray(local) ? [] : {};

    for (const key of allKeys) {
      const currentPath = [...path, key];

      if (!(key in local)) {
        // Only in remote
        result[key] = remote[key];
      } else if (!(key in remote)) {
        // Only in local
        result[key] = local[key];
      } else {
        // In both, merge
        result[key] = this.deepMergeWithConflicts(
          local[key],
          remote[key],
          currentPath,
          conflicts
        );
      }
    }

    return result;
  }

  /**
   * Resolve a conflict based on strategy
   */
  private resolveConflict(local: any, remote: any, path: string[]): any {
    switch (this.conflictStrategy) {
      case 'local':
        return local;
      case 'remote':
        return remote;
      case 'newest':
        // For primitive values, we can't determine age
        // Default to remote for newest strategy
        return remote;
      case 'ask':
      default:
        // Return remote as default, will be handled by conflict resolver
        return remote;
    }
  }

  /**
   * Check if value is primitive (not object or array)
   */
  private isPrimitive(value: any): boolean {
    return value === null || typeof value !== 'object';
  }

  /**
   * Merge settings.json specifically with special handling
   */
  mergeSettings(local: any, remote: any): MergeResult {
    const conflicts: string[] = [];

    // Special handling for sensitive fields
    const sensitiveFields = ['apiKey', 'apiToken', 'token', 'secret', 'password', 'credential'];

    const result = deepmerge(local, remote, {
      arrayMerge: (_destination, source) => {
        // For arrays, prefer source (remote)
        return source;
      },
    }) as any;

    // Detect conflicts
    for (const key of Object.keys(remote)) {
      if (key in local && JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
        if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          conflicts.push(key);
        }
      }
    }

    return {
      result,
      conflicts,
      merged: true,
    };
  }

  /**
   * Merge two files on disk
   */
  mergeFiles(localPath: string, remotePath: string, outputPath: string): MergeResult {
    if (!fs.existsSync(localPath)) {
      // No local file, just copy remote
      fs.copyFileSync(remotePath, outputPath);
      return {
        result: null,
        conflicts: [],
        merged: true,
      };
    }

    if (!fs.existsSync(remotePath)) {
      // No remote file, local is fine
      fs.copyFileSync(localPath, outputPath);
      return {
        result: null,
        conflicts: [],
        merged: true,
      };
    }

    const localContent = fs.readFileSync(localPath, 'utf-8');
    const remoteContent = fs.readFileSync(remotePath, 'utf-8');

    // Try to parse as JSON
    try {
      const localJson = JSON.parse(localContent);
      const remoteJson = JSON.parse(remoteContent);

      const mergeResult = this.mergeJson(localJson, remoteJson, localPath);

      // Write merged result
      fs.writeFileSync(outputPath, JSON.stringify(mergeResult.result, null, 2), 'utf-8');

      return mergeResult;
    } catch {
      // Not JSON, can't merge - mark as conflict
      const conflicts = [localPath];
      return {
        result: null,
        conflicts,
        merged: false,
      };
    }
  }

  /**
   * Apply merge result based on user choice
   */
  applyMergeChoice(
    localContent: string,
    remoteContent: string,
    choice: 'local' | 'remote' | 'merge'
  ): string {
    switch (choice) {
      case 'local':
        return localContent;
      case 'remote':
        return remoteContent;
      case 'merge':
        // Try JSON merge
        try {
          const localJson = JSON.parse(localContent);
          const remoteJson = JSON.parse(remoteContent);
          const merged = deepmerge(localJson, remoteJson);
          return JSON.stringify(merged, null, 2);
        } catch {
          // If not JSON, can't merge
          return remoteContent;
        }
    }
  }

  /**
   * Check if a file can be merged
   */
  canMerge(filePath: string): boolean {
    const jsonExtensions = ['.json'];
    return jsonExtensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Create a three-way merge if base is available
   */
  threeWayMerge(
    base: any,
    local: any,
    remote: any,
    filePath?: string
  ): MergeResult {
    const conflicts: string[] = [];

    // Check if local changed from base
    const localChanged = JSON.stringify(local) !== JSON.stringify(base);
    // Check if remote changed from base
    const remoteChanged = JSON.stringify(remote) !== JSON.stringify(base);

    if (!localChanged && !remoteChanged) {
      // No changes
      return { result: base, conflicts: [], merged: true };
    }

    if (!localChanged) {
      // Only remote changed
      return { result: remote, conflicts: [], merged: true };
    }

    if (!remoteChanged) {
      // Only local changed
      return { result: local, conflicts: [], merged: true };
    }

    // Both changed, try to merge
    const result = this.deepMergeWithConflicts(local, remote, [], conflicts);

    return {
      result,
      conflicts,
      merged: conflicts.length === 0,
    };
  }
}
