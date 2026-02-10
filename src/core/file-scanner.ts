/**
 * File scanner for finding Claude configuration files
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { FileScanResult, SyncConfig } from '../types/index.js';
import { getClaudePaths, matchesPattern } from '../utils/helpers.js';
import { debug } from '../utils/logger.js';

export class FileScanner {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * Scan for files that should be synced
   */
  async scan(): Promise<FileScanResult> {
    const paths = getClaudePaths();
    const allFiles: string[] = [];
    const byCategory = new Map<string, string[]>();

    // Scan based on include options
    if (this.config.sync.include.skills) {
      const skillFiles = await this.scanSkills(paths.claudeHome);
      allFiles.push(...skillFiles);
      byCategory.set('skills', skillFiles);
    }

    if (this.config.sync.include.plugins) {
      const pluginFiles = await this.scanPlugins(paths.claudeHome);
      allFiles.push(...pluginFiles);
      byCategory.set('plugins', pluginFiles);
    }

    if (this.config.sync.include.settings) {
      const settingsFiles = await this.scanSettings(paths.claudeHome);
      allFiles.push(...settingsFiles);
      byCategory.set('settings', settingsFiles);
    }

    if (this.config.sync.include.projects) {
      const projectFiles = await this.scanProjects(paths.claudeHome);
      allFiles.push(...projectFiles);
      byCategory.set('projects', projectFiles);
    }

    if (this.config.sync.include.history) {
      const historyFiles = await this.scanHistory(paths.claudeHome);
      allFiles.push(...historyFiles);
      byCategory.set('history', historyFiles);
    }

    // Scan custom patterns
    if (this.config.sync.include.customPatterns.length > 0) {
      const customFiles = await this.scanCustomPatterns(
        paths.claudeHome,
        this.config.sync.include.customPatterns
      );
      allFiles.push(...customFiles);
      byCategory.set('custom', customFiles);
    }

    // Apply exclude patterns
    const filteredFiles = this.applyExcludes(allFiles);

    // Calculate total size
    let totalSize = 0;
    for (const file of filteredFiles) {
      try {
        const stats = fs.statSync(file);
        totalSize += stats.size;
      } catch {
        // File might not exist, skip
      }
    }

    debug(`Scanned ${filteredFiles.length} files, total size: ${totalSize}`);

    return {
      files: filteredFiles,
      totalSize,
      byCategory,
    };
  }

  /**
   * Scan skills directory
   */
  private async scanSkills(claudeHome: string): Promise<string[]> {
    const skillsPath = path.join(claudeHome, 'skills');

    if (!fs.existsSync(skillsPath)) {
      return [];
    }

    const patterns = [
      path.join(skillsPath, '**/*.json'),
      path.join(skillsPath, '**/*.js'),
      path.join(skillsPath, '**/*.ts'),
      path.join(skillsPath, '**/*.md'),  // Claude skill files
    ];

    const files = await this.globFiles(patterns);
    debug(`Found ${files.length} skill files`);
    return files;
  }

  /**
   * Scan plugins directory
   */
  private async scanPlugins(claudeHome: string): Promise<string[]> {
    const pluginsPath = path.join(claudeHome, 'plugins');

    if (!fs.existsSync(pluginsPath)) {
      return [];
    }

    const patterns = [
      path.join(pluginsPath, '**/*.json'),
      path.join(pluginsPath, '**/*.js'),
      path.join(pluginsPath, '**/*.ts'),
      path.join(pluginsPath, '**/*.md'),  // Plugin documentation
    ];

    const files = await this.globFiles(patterns);
    debug(`Found ${files.length} plugin files`);
    return files;
  }

  /**
   * Scan settings files
   */
  private async scanSettings(claudeHome: string): Promise<string[]> {
    const files: string[] = [];

    // Main settings file
    const settingsPath = path.join(claudeHome, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      files.push(settingsPath);
    }

    // Other config files
    const configFiles = [
      'context.json',
      'prompts.json',
      'skills.json',
      'plugins.json',
    ];

    for (const file of configFiles) {
      const filePath = path.join(claudeHome, file);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    debug(`Found ${files.length} settings files`);
    return files;
  }

  /**
   * Scan projects directory
   */
  private async scanProjects(claudeHome: string): Promise<string[]> {
    const projectsPath = path.join(claudeHome, 'projects');

    if (!fs.existsSync(projectsPath)) {
      return [];
    }

    const patterns = [path.join(projectsPath, '**/*.json')];
    const files = await this.globFiles(patterns);
    debug(`Found ${files.length} project files`);
    return files;
  }

  /**
   * Scan history directory
   */
  private async scanHistory(claudeHome: string): Promise<string[]> {
    const historyPath = path.join(claudeHome, 'history');

    if (!fs.existsSync(historyPath)) {
      return [];
    }

    const patterns = [path.join(historyPath, '**/*.json')];
    const files = await this.globFiles(patterns);
    debug(`Found ${files.length} history files`);
    return files;
  }

  /**
   * Scan using custom patterns
   */
  private async scanCustomPatterns(
    claudeHome: string,
    patterns: string[]
  ): Promise<string[]> {
    const expandedPatterns = patterns.map(p => {
      // Support both relative and absolute patterns
      if (path.isAbsolute(p)) {
        return p;
      }
      return path.join(claudeHome, p);
    });

    const files = await this.globFiles(expandedPatterns);
    debug(`Found ${files.length} files from custom patterns`);
    return files;
  }

  /**
   * Execute glob patterns and return unique files
   */
  private async globFiles(patterns: string[]): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          absolute: true,
          nodir: true,
          windowsPathsNoEscape: true,
        });
        allFiles.push(...matches);
      } catch (err) {
        debug(`Error matching pattern ${pattern}:`, err);
      }
    }

    // Remove duplicates
    return [...new Set(allFiles)];
  }

  /**
   * Apply exclude patterns to file list
   */
  private applyExcludes(files: string[]): string[] {
    const excludePatterns = this.config.sync.excludePatterns;

    return files.filter(file => {
      return !matchesPattern(file, excludePatterns);
    });
  }

  /**
   * Get relative paths from claude home
   */
  getRelativePaths(files: string[]): string[] {
    const paths = getClaudePaths();
    return files.map(f => path.relative(paths.claudeHome, f));
  }

  /**
   * Get absolute paths from relative paths
   */
  getAbsolutePaths(relativeFiles: string[]): string[] {
    const paths = getClaudePaths();
    return relativeFiles.map(f => path.join(paths.claudeHome, f));
  }

  /**
   * Check if a file should be synced
   */
  shouldSyncFile(filePath: string): boolean {
    const relativePath = path.relative(getClaudePaths().claudeHome, filePath);

    // Check exclude patterns first
    if (matchesPattern(relativePath, this.config.sync.excludePatterns)) {
      return false;
    }

    // Check include patterns
    const includeOptions = this.config.sync.include;

    // Check skills
    if (includeOptions.skills && relativePath.startsWith('skills' + path.sep)) {
      return true;
    }

    // Check plugins
    if (includeOptions.plugins && relativePath.startsWith('plugins' + path.sep)) {
      return true;
    }

    // Check settings
    if (includeOptions.settings) {
      const settingsFiles = ['settings.json', 'context.json', 'prompts.json', 'skills.json', 'plugins.json'];
      if (settingsFiles.includes(relativePath)) {
        return true;
      }
    }

    // Check projects
    if (includeOptions.projects && relativePath.startsWith('projects' + path.sep)) {
      return true;
    }

    // Check history
    if (includeOptions.history && relativePath.startsWith('history' + path.sep)) {
      return true;
    }

    // Check custom patterns
    for (const pattern of includeOptions.customPatterns) {
      if (matchesPattern(relativePath, [pattern])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate that all files exist
   */
  validateFiles(files: string[]): string[] {
    return files.filter(f => fs.existsSync(f));
  }
}
