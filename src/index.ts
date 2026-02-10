#!/usr/bin/env node
/**
 * Claude Sync - Main CLI entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerInitCommand } from './commands/init.js';
import { registerPushCommand } from './commands/push.js';
import { registerPullCommand } from './commands/pull.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerStatusCommand } from './commands/status.js';
import { registerConfigCommand } from './commands/config.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerBackupCommand } from './commands/backup.js';
import { setLogLevel, header, info, error } from './utils/logger.js';
import { isConfigInitialized } from './utils/config-loader.js';

// Read package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Set up CLI program
const program = new Command();

const VERSION = packageJson.version || '0.1.0';

program
  .name('claude-config-sync')
  .description('Synchronize Claude Code configuration across multiple environments')
  .version(VERSION)
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output')
  .option('-d, --debug', 'enable debug output');

// Parse global options
program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();

  if (options.debug) {
    setLogLevel(0); // DEBUG
  } else if (options.quiet) {
    setLogLevel(3); // ERROR
  } else if (options.verbose) {
    setLogLevel(1); // INFO
  } else {
    setLogLevel(2); // WARN
  }
});

// Register commands
registerInitCommand(program);
registerPushCommand(program);
registerPullCommand(program);
registerSyncCommand(program);
registerStatusCommand(program);
registerConfigCommand(program);
registerWatchCommand(program);
registerBackupCommand(program);

// Default action - show help if no command provided
program.action(() => {
  header('Claude Config Sync');

  if (!isConfigInitialized()) {
    info('Welcome to Claude Config Sync!');
    info('\nTo get started, run:');
    info('  claude-config-sync init');
    info('\nThis will guide you through setting up synchronization.');
  } else {
    info('Claude Config Sync is configured.');
    info('\nCommon commands:');
    info('  claude-config-sync status   - Show sync status');
    info('  claude-config-sync sync     - Synchronize changes');
    info('  claude-config-sync push     - Push local changes');
    info('  claude-config-sync pull     - Pull remote changes');
    info('\nFor more information:');
    info('  claude-config-sync --help');
  }
});

// Parse arguments
program.parseAsync(process.argv).catch((err) => {
  error('Error:', err.message);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  error('Unhandled rejection:', reason);
  process.exit(1);
});
