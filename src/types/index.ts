/**
 * Core type definitions for claude-sync
 */

export interface SyncConfig {
  sync: SyncOptions;
  version?: string;
}

export interface SyncOptions {
  repository: string;
  branch: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  include: IncludeOptions;
  excludePatterns: string[];
  conflictStrategy: ConflictStrategy;
}

export interface IncludeOptions {
  skills: boolean;
  plugins: boolean;
  settings: boolean;
  projects: boolean;
  history: boolean;
  customPatterns: string[];
}

export type ConflictStrategy = 'ask' | 'local' | 'remote' | 'newest';

export interface SyncStatus {
  repository: string;
  branch: string;
  currentCommit?: string;
  remoteCommit?: string;
  ahead: number;
  behind: number;
  conflicted: string[];
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  lastSyncAt?: Date;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  timestamp?: Date;
}

export interface SyncResult {
  success: boolean;
  pushed?: number;
  pulled?: number;
  conflicts?: ConflictInfo[];
  errors?: string[];
  message: string;
}

export interface ConflictInfo {
  path: string;
  localContent: string;
  remoteContent: string;
  baseContent?: string;
  resolved?: boolean;
}

export interface ClaudePaths {
  claudeHome: string;
  syncHome: string;
  syncConfig: string;
  syncRepoDir: string;
  backupDir: string;
  ignoreFile: string;
}

export interface WatchOptions {
  debounceDelay?: number;
  onSync?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}

export interface FileScanResult {
  files: string[];
  totalSize: number;
  byCategory: Map<string, string[]>;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  message: string;
  date: Date;
}

export interface BackupInfo {
  timestamp: Date;
  path: string;
  files: string[];
}
