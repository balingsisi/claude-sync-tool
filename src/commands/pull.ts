/**
 * Pull command - Pull configuration from remote
 */

import { Command } from 'commander';
import { loadConfig, validateConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, success, error, info, warn, spinner } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';

export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull configuration changes from remote repository')
    .option('-f, --force', 'Force pull and overwrite local changes')
    .option('-n, --dry-run', 'Show what would be pulled without actually pulling')
    .action(async (options) => {
      header('Pull Configuration');

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
        info('Dry run mode - no changes will be pulled');
        const engine = new SyncEngine(config);
        const repoFiles = await engine['getRepoFiles']();

        info(`\nFiles that would be pulled (${repoFiles.length}):`);
        for (const file of repoFiles) {
          info(`  - ${file}`);
        }
        return;
      }

      // Warn about potential conflicts
      if (!options.force) {
        warn('This may overwrite your local configuration');
        warn('A backup will be created automatically');
        // Could add confirmation prompt here
      }

      // Perform pull
      const spin = spinner('Pulling from remote...').start();

      try {
        const engine = new SyncEngine(config);
        const result = await engine.pull();

        if (result.success) {
          if (result.pulled && result.pulled > 0) {
            spin.succeed(`Pulled ${result.pulled} file(s)`);

            if (result.conflicts && result.conflicts.length > 0) {
              info(`Resolved ${result.conflicts.length} conflict(s)`);
            }
          } else {
            spin.info('No changes to pull');
          }
        } else {
          spin.fail('Pull failed');
          error(result.message);
          if (result.errors) {
            for (const err of result.errors) {
              error(`  ${err}`);
            }
          }
        }
      } catch (err) {
        spin.fail('Pull failed');
        error(String(err));
      }
    });
}
