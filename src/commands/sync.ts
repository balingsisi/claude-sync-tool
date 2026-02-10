/**
 * Sync command - Bidirectional synchronization
 */

import { Command } from 'commander';
import { loadConfig, validateConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, success, error, info, spinner } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Synchronize configuration both ways (pull then push)')
    .option('-n, --dry-run', 'Show what would be synced without actually syncing')
    .action(async (options) => {
      header('Sync Configuration');

      // Check if initialized
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      // Load and validate config
      const config = loadConfig();
      const validation = validateConfig(config);

      if (!validation.valid) {
        error('Invalid configuration:');
        for (const err of validation.errors) {
          error(`  - ${err}`);
        }
        return;
      }

      if (options.dryRun) {
        info('Dry run mode - no changes will be made');
        info('\nThis would:');
        info('  1. Pull changes from remote');
        info('  2. Resolve any conflicts');
        info('  3. Push local changes to remote');
        return;
      }

      // Perform sync
      const spin = spinner('Syncing...').start();

      try {
        const engine = new SyncEngine(config);
        const result = await engine.sync();

        spin.stop();

        if (result.success) {
          success('Sync completed successfully');

          const parts: string[] = [];
          if (result.pulled && result.pulled > 0) {
            parts.push(`${result.pulled} pulled`);
          }
          if (result.pushed && result.pushed > 0) {
            parts.push(`${result.pushed} pushed`);
          }

          if (parts.length > 0) {
            info(`Files: ${parts.join(', ')}`);
          }

          if (result.conflicts && result.conflicts.length > 0) {
            info(`Resolved ${result.conflicts.length} conflict(s)`);
          }
        } else {
          error('Sync failed');
          error(result.message);
          if (result.errors) {
            for (const err of result.errors) {
              error(`  ${err}`);
            }
          }
        }
      } catch (err) {
        spin.fail('Sync failed');
        error(String(err));
      }
    });
}
