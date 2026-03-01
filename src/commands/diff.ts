/**
 * Diff command - Show changes before sync
 */

import { Command } from 'commander';
import { loadConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, info, warn, error, success, bullet, fileStatus, spinner } from '../utils/logger.js';
import { DiffEngine } from '../core/diff-engine.js';
import { formatFileSize } from '../utils/helpers.js';
import type { ChangeDetail } from '../types/index.js';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Show changes before sync')
    .option('--detailed', 'Show detailed diff for each file')
    .option('--json', 'Output results in JSON format')
    .option('--push-only', 'Show only changes to be pushed')
    .option('--pull-only', 'Show only changes to be pulled')
    .action(async (options) => {
      header('Sync Changes Preview');

      // Check if initialized
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-config-sync init');
        return;
      }

      const config = loadConfig();

      const check = spinner('Analyzing changes...');
      check.start();

      try {
        const engine = new DiffEngine(config);
        const summary = await engine.getDiff({ detailed: options.detailed });

        check.stop();

        // JSON output
        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
          return;
        }

        // Filter if requested
        const showPush = !options.pullOnly;
        const showPull = !options.pushOnly;

        let totalChanges = 0;

        // Show push changes
        if (showPush && summary.pushChanges.length > 0) {
          info(`\n📤 Will Push (${summary.pushChanges.length} file${summary.pushChanges.length === 1 ? '' : 's'}):`);
          console.log();

          for (const change of summary.pushChanges) {
            const sizeInfo = change.size ? ` (~${formatFileSize(change.size)})` : '';
            const statusChar = getStatusChar(change.status);
            const typeInfo = change.type ? ` [${change.type}]` : '';

            console.log(`  ${statusChar} ${change.path}${typeInfo}${sizeInfo}`);

            if (options.detailed && change.diff) {
              console.log();
              console.log('    Diff:');
              const diffLines = change.diff.split('\n');
              for (const line of diffLines) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                  console.log(`    ${line}`);
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  console.log(`    ${line}`);
                } else if (line.startsWith('@@')) {
                  console.log(`    ${line}`);
                }
              }
              console.log();
            }
          }

          totalChanges += summary.pushChanges.length;
        } else if (showPush) {
          info('\n📤 Will Push: No changes');
        }

        // Show pull changes
        if (showPull && summary.pullChanges.length > 0) {
          info(`\n📥 Will Pull (${summary.pullChanges.length} file${summary.pullChanges.length === 1 ? '' : 's'}):`);
          console.log();

          for (const change of summary.pullChanges) {
            const statusChar = getStatusChar(change.status);
            const typeInfo = change.type ? ` [${change.type}]` : '';
            console.log(`  ${statusChar} ${change.path}${typeInfo}`);
          }

          totalChanges += summary.pullChanges.length;
        } else if (showPull) {
          info('\n📥 Will Pull: No changes');
        }

        // Show conflicts
        if (summary.conflicts.length > 0) {
          warn(`\n⚠️ Conflicts: ${summary.conflicts.length}`);
          for (const conflict of summary.conflicts) {
            console.log(`  ! ${conflict}`);
          }
        } else {
          info('\n⚠️ Conflicts: 0');
        }

        // Show summary
        if (totalChanges > 0 || summary.conflicts.length > 0) {
          console.log();
          info('Summary:');
          bullet(`To push: ${summary.stats.toAdd + summary.stats.toModify + summary.stats.toDelete} ` +
                `(add: ${summary.stats.toAdd}, modify: ${summary.stats.toModify}, delete: ${summary.stats.toDelete})`);
          bullet(`To pull: ${summary.pullChanges.length} file(s)`);
        }

        if (totalChanges === 0) {
          success('\nEverything is up to date!');
        } else if (options.detailed) {
          info('\nUse without --detailed for a cleaner view');
        } else {
          info('\nUse --detailed to see full diff for each file');
        }

      } catch (err) {
        check.stop();
        error('Failed to analyze changes');
        error(String(err));
      }
    });
}

/**
 * Get status character for display
 */
function getStatusChar(status: ChangeDetail['status']): string {
  switch (status) {
    case 'added':
      return '+';
    case 'modified':
      return 'M';
    case 'deleted':
      return '-';
    case 'renamed':
      return 'R';
    default:
      return '?';
  }
}
