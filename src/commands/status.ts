/**
 * Status command - Show sync status
 */

import { Command } from 'commander';
import { loadConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, info, error, warn, success, kv, bullet, fileStatus, table } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';
import { formatDate } from '../utils/helpers.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show synchronization status')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      header('Sync Status');

      // Check if initialized
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      const config = loadConfig();

      // Show configuration
      info('Configuration:');
      kv('Repository', config.sync.repository);
      kv('Branch', config.sync.branch);
      kv('Conflict Strategy', config.sync.conflictStrategy);
      kv('Auto Sync', config.sync.autoSync ? 'Enabled' : 'Disabled');

      // Show what's being synced
      info('\nSynced Items:');
      const { include } = config.sync;
      if (include.skills) bullet('Skills');
      if (include.plugins) bullet('Plugins');
      if (include.settings) bullet('Settings');
      if (include.projects) bullet('Projects');
      if (include.history) bullet('History');
      if (include.customPatterns.length > 0) {
        bullet(`Custom patterns: ${include.customPatterns.length}`);
      }

      // Get git status
      try {
        const engine = new SyncEngine(config);
        const status = await engine.status();

        info('\nRepository Status:');

        if (status.currentCommit) {
          kv('Current Commit', status.currentCommit.substring(0, 8));
        }

        if (status.ahead > 0) {
          warn(`Local is ${status.ahead} commit(s) ahead of remote`);
        }

        if (status.behind > 0) {
          warn(`Local is ${status.behind} commit(s) behind remote`);
        }

        if (status.ahead === 0 && status.behind === 0) {
          success('Up to date with remote');
        }

        // Show staged changes
        if (status.staged.length > 0) {
          info('\nStaged Changes:');
          for (const change of status.staged) {
            fileStatus(change.path, change.status);
          }
        }

        // Show conflicts
        if (status.conflicted.length > 0) {
          warn('\nConflicts:');
          for (const conflict of status.conflicted) {
            fileStatus(conflict, 'conflict');
          }
        }

        // Show untracked files in verbose mode
        if (options.verbose && status.untracked.length > 0) {
          info('\nUntracked Files:');
          for (const file of status.untracked) {
            bullet(file);
          }
        }

        // Show recent commits in verbose mode
        if (options.verbose) {
          const git = engine['git'];
          const commits = await git.log(5);

          if (commits.length > 0) {
            info('\nRecent Commits:');
            table(
              ['Hash', 'Date', 'Message'],
              commits.map(c => [
                c.hash.substring(0, 8),
                new Date(c.date).toLocaleDateString(),
                c.message.split('\n')[0].substring(0, 50),
              ])
            );
          }
        }

        // Show backups
        const backups = engine.listBackups();
        if (backups.length > 0) {
          info('\nRecent Backups:');
          for (let i = 0; i < Math.min(5, backups.length); i++) {
            const backup = backups[i];
            bullet(`${formatDate(backup.timestamp)} - ${backup.files.length} files`);
          }
          if (backups.length > 5) {
            info(`  ... and ${backups.length - 5} more`);
          }
        }
      } catch (err) {
        error('Failed to get status');
        error(String(err));
      }
    });
}
