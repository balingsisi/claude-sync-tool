/**
 * Helper utility functions
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { ClaudePaths } from '../types/index.js';

/**
 * Get platform-specific paths for Claude and claude-sync
 */
export function getClaudePaths(): ClaudePaths {
  const homeDir = os.homedir();
  const platform = os.platform();

  let claudeHome: string;

  if (platform === 'win32') {
    claudeHome = path.join(homeDir, '.claude');
  } else {
    claudeHome = path.join(homeDir, '.claude');
  }

  const syncHome = path.join(homeDir, '.claude-sync');

  return {
    claudeHome,
    syncHome,
    syncConfig: path.join(syncHome, 'config.json'),
    syncRepoDir: path.join(syncHome, 'repo'),
    backupDir: path.join(syncHome, 'backups'),
    ignoreFile: path.join(syncHome, '.syncignore'),
  };
}

/**
 * Ensure a directory exists, create if it doesn't
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if a path exists
 */
export function pathExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get file modification time
 */
export function getFileMtime(filePath: string): Date | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

/**
 * Read JSON file safely
 */
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Write JSON file safely
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Convert file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleString();
}

/**
 * Get relative path from base
 */
export function getRelativePath(fromPath: string, basePath: string): string {
  return path.relative(basePath, fromPath);
}

/**
 * Join paths safely
 */
export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * Check if a file matches any of the patterns
 */
export function matchesPattern(filePath: string, patterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) {
      // Negation pattern
      const negatedPattern = pattern.slice(1);
      if (minimatch(normalizedPath, negatedPattern)) {
        return false;
      }
    } else {
      if (minimatch(normalizedPath, pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Simple glob matching (minimatch-like)
 */
function minimatch(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  // Handle directory patterns
  if (pattern.endsWith('/')) {
    regexPattern += '.*';
  }

  // Handle ** patterns
  regexPattern = regexPattern.replace(/\.\*\.\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate Git repository URL format
 */
export function isValidGitUrl(url: string): boolean {
  // Check for HTTPS URL
  if (url.match(/^https?:\/\/.+/)) return true;
  // Check for SSH URL
  if (url.match(/^[\w-]+@[\w.-]+:[\w/-]+\.git$/)) return true;
  // Check for git@ format
  if (url.match(/^git@[\w.-]+:[\w/-]+\.git$/)) return true;
  return false;
}

/**
 * Extract repo name from URL
 */
export function extractRepoName(url: string): string {
  const match = url.match(/([^\/]+)\.git$/);
  return match ? match[1] : 'claude-config';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return os.platform() === 'win32';
}

/**
 * Check if running on macOS
 */
export function isMac(): boolean {
  return os.platform() === 'darwin';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return os.platform() === 'linux';
}
