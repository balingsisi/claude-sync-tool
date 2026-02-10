/**
 * Watch command - Monitor files for changes and auto-sync
 */

import { Command } from 'commander';
import chokidar from 'chokidar';
import { loadConfig, isConfigInitialized } from '../utils/config-loader.js';
import { getClaudePaths } from '../utils/helpers.js';
import { info, success, error, warn, debug, spinner } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';
import { debounce } from '../utils/helpers.js';
import fs from 'node:fs';
import path from 'node:path';

// Store active watcher
let activeWatcher: chokidar.FSWatcher | null = null;
let syncInProgress = false;

export function registerWatchCommand(program: Command): void {
  const watchCmd = program
    .command('watch')
    .description('Monitor files for changes and auto-sync');

  watchCmd
    .command('start')
    .description('Start watching for file changes')
    .option('-d, --delay <ms>', 'Debounce delay in milliseconds', '5000')
    .option('-q, --quiet', 'Suppress normal output')
    .action(async (options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      if (activeWatcher) {
        warn('Watcher is already running');
        info('Run: claude-sync watch stop');
        return;
      }

      const config = loadConfig();
      const paths = getClaudePaths();

      info('Starting file watcher...');
      info(`Watching: ${paths.claudeHome}`);
      info(`Debounce delay: ${options.delay}ms`);
      info('\nPress Ctrl+C to stop\n');

      // Create sync engine
      const engine = new SyncEngine(config);

      // Create debounced sync function
      const debouncedSync = debounce(async () => {
        if (syncInProgress) {
          debug('Sync already in progress, skipping...');
          return;
        }

        syncInProgress = true;

        try {
          if (!options.quiet) {
            info('\n🔄 Changes detected, syncing...');
          }

          const result = await engine.sync();

          if (result.success) {
            if (!options.quiet) {
              success('Sync completed');
            }
          } else {
            error('Sync failed:', result.message);
          }
        } catch (err) {
          error('Sync error:', String(err));
        } finally {
          syncInProgress = false;
        }
      }, parseInt(options.delay, 10));

      // Create watcher
      const watchPath = path.join(paths.claudeHome, '**/*');
      const ignored = [
        '**/node_modules/**',
        '**/.git/**',
        '**/tmp/**',
        '**/temp/**',
        '**/*.log',
      ];

      activeWatcher = chokidar.watch(watchPath, {
        ignored,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
      });

      activeWatcher
        .on('ready', () => {
          success('Watcher ready - waiting for changes...');
        })
        .on('add', (filePath) => {
          debug(`File added: ${filePath}`);
          debouncedSync();
        })
        .on('change', (filePath) => {
          debug(`File changed: ${filePath}`);
          debouncedSync();
        })
        .on('unlink', (filePath) => {
          debug(`File removed: ${filePath}`);
          debouncedSync();
        })
        .on('error', (err) => {
          error('Watcher error:', err);
        });

      // Handle shutdown
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  watchCmd
    .command('stop')
    .description('Stop watching for file changes')
    .action(async () => {
      if (!activeWatcher) {
        warn('Watcher is not running');
        return;
      }

      info('Stopping watcher...');
      await shutdown();
    });

  watchCmd
    .command('status')
    .description('Show watcher status')
    .action(() => {
      if (activeWatcher) {
        success('Watcher is running');
        info('Monitored paths:');

        const paths = activeWatcher.getWatched();
        for (const [dir, files] of Object.entries(paths)) {
          info(`  ${dir}: ${files.length} files`);
        }
      } else {
        info('Watcher is not running');
      }
    });
}

async function shutdown(): Promise<void> {
  if (activeWatcher) {
    await activeWatcher.close();
    activeWatcher = null;
  }

  // Remove shutdown handlers
  process.off('SIGINT', shutdown);
  process.off('SIGTERM', shutdown);

  success('Watcher stopped');
  process.exit(0);
}

// Save PID for process management
export function savePid(): void {
  const paths = getClaudePaths();
  const pidFile = path.join(paths.syncHome, 'watcher.pid');
  fs.writeFileSync(pidFile, String(process.pid));
}

export function removePid(): void {
  const paths = getClaudePaths();
  const pidFile = path.join(paths.syncHome, 'watcher.pid');

  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }
}
