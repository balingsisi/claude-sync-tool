/**
 * Configuration loader and manager
 */

import fs from 'node:fs';
import type { SyncConfig, IncludeOptions } from '../types/index.js';
import { readJsonFile, writeJsonFile, getClaudePaths } from './helpers.js';

const DEFAULT_CONFIG: SyncConfig = {
  version: '1.0.0',
  sync: {
    repository: '',
    branch: 'main',
    autoSync: false,
    syncIntervalMinutes: 30,
    include: {
      skills: true,
      plugins: true,
      settings: true,
      projects: false,
      history: false,
      customPatterns: [],
    },
    excludePatterns: ['.env', '*.key', 'secrets/', '*.secret'],
    conflictStrategy: 'ask',
  },
};

/**
 * Load sync configuration from file
 */
export function loadConfig(): SyncConfig {
  const paths = getClaudePaths();

  if (!fs.existsSync(paths.syncConfig)) {
    return DEFAULT_CONFIG;
  }

  return readJsonFile<SyncConfig>(paths.syncConfig, DEFAULT_CONFIG);
}

/**
 * Save sync configuration to file
 */
export function saveConfig(config: SyncConfig): void {
  const paths = getClaudePaths();
  writeJsonFile(paths.syncConfig, config);
}

/**
 * Get a specific config value by path
 */
export function getConfigValue(path: string): unknown {
  const config = loadConfig();
  const keys = path.split('.');
  let value: unknown = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Set a specific config value by path
 */
export function setConfigValue(path: string, value: unknown): void {
  const config = loadConfig();
  const keys = path.split('.');
  let obj: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in obj)) {
      (obj as Record<string, unknown>)[key] = {};
    }
    obj = (obj as Record<string, unknown>)[key] as Record<string, unknown>;
  }

  (obj as Record<string, unknown>)[keys[keys.length - 1]] = value;
  saveConfig(config);
}

/**
 * Update include options
 */
export function updateIncludeOptions(updates: Partial<IncludeOptions>): void {
  const config = loadConfig();
  config.sync.include = { ...config.sync.include, ...updates };
  saveConfig(config);
}

/**
 * Add exclude pattern
 */
export function addExcludePattern(pattern: string): void {
  const config = loadConfig();
  if (!config.sync.excludePatterns.includes(pattern)) {
    config.sync.excludePatterns.push(pattern);
    saveConfig(config);
  }
}

/**
 * Remove exclude pattern
 */
export function removeExcludePattern(pattern: string): void {
  const config = loadConfig();
  config.sync.excludePatterns = config.sync.excludePatterns.filter(p => p !== pattern);
  saveConfig(config);
}

/**
 * Check if config is initialized
 */
export function isConfigInitialized(): boolean {
  const paths = getClaudePaths();
  return fs.existsSync(paths.syncConfig);
}

/**
 * Validate configuration
 */
export function validateConfig(config: SyncConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.sync.repository) {
    errors.push('Repository URL is required');
  }

  if (!config.sync.branch) {
    errors.push('Branch name is required');
  }

  if (config.sync.syncIntervalMinutes < 1) {
    errors.push('Sync interval must be at least 1 minute');
  }

  if (!['ask', 'local', 'remote', 'newest'].includes(config.sync.conflictStrategy)) {
    errors.push('Invalid conflict strategy');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  const paths = getClaudePaths();
  writeJsonFile(paths.syncConfig, DEFAULT_CONFIG);
}
