/**
 * Push command - Push local configuration to remote
 */

import { Command } from 'commander';
import { loadConfig, validateConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, success, error, info, spinner } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';

export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Push local configuration changes to remote repository')
    .option('-f, --force', 'Force push even if no changes detected')
    .option('-n, --dry-run', 'Show what would be pushed without actually pushing')
    .action(async (options) => {
      header('Push Configuration');

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
        info('Dry run mode - no changes will be pushed');
        const engine = new SyncEngine(config);
        const scanResult = await engine['scanner'].scan();

        info(`\nFiles that would be pushed (${scanResult.files.length}):`);
        for (const file of scanResult.files) {
          info(`  - ${file}`);
        }
        info(`\nTotal size: ${formatSize(scanResult.totalSize)}`);
        return;
      }

      // Perform push
      const spin = spinner('Pushing to remote...').start();

      try {
        const engine = new SyncEngine(config);
        const result = await engine.push();

        if (result.success) {
          if (result.pushed && result.pushed > 0) {
            spin.succeed(`Pushed ${result.pushed} file(s)`);
          } else {
            spin.info('No changes to push');
          }
        } else {
          spin.fail('Push failed');
          error(result.message);
          if (result.errors) {
            for (const err of result.errors) {
              error(`  ${err}`);
            }
          }
        }
      } catch (err) {
        spin.fail('Push failed');
        error(String(err));
      }
    });
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
