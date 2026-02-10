/**
 * Backup command - Manage configuration backups
 */

import inquirer from 'inquirer';
import { Command } from 'commander';
import { loadConfig, isConfigInitialized } from '../utils/config-loader.js';
import { header, success, error, info, warn, bullet, table } from '../utils/logger.js';
import { formatDate, formatFileSize } from '../utils/helpers.js';
import { SyncEngine } from '../core/sync-engine.js';
import fs from 'node:fs';
import path from 'node:path';

export function registerBackupCommand(program: Command): void {
  const backupCmd = program
    .command('backup')
    .description('Manage configuration backups');

  backupCmd
    .command('create')
    .description('Create a backup of current configuration')
    .option('-n, --name <name>', 'Backup name')
    .action(async (options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      header('Create Backup');

      const config = loadConfig();
      const engine = new SyncEngine(config);

      const backup = await engine.createBackup();

      success(`Backup created: ${path.basename(backup.path)}`);
      info(`Files: ${backup.files.length}`);
      info(`Location: ${backup.path}`);
    });

  backupCmd
    .command('list')
    .description('List available backups')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      header('Available Backups');

      const config = loadConfig();
      const engine = new SyncEngine(config);
      const backups = engine.listBackups();

      if (backups.length === 0) {
        info('No backups found');
        return;
      }

      if (options.verbose) {
        table(
          ['Name', 'Date', 'Files', 'Size'],
          backups.map(b => [
            path.basename(b.path),
            formatDate(b.timestamp),
            String(b.files.length),
            formatFileSize(getBackupSize(b.path)),
          ])
        );
      } else {
        for (let i = 0; i < backups.length; i++) {
          const backup = backups[i];
          info(`\n[${i + 1}] ${path.basename(backup.path)}`);
          bullet(`Date: ${formatDate(backup.timestamp)}`);
          bullet(`Files: ${backup.files.length}`);
        }
      }
    });

  backupCmd
    .command('restore <backup>')
    .description('Restore from a backup (use index or backup path)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (backupIdentifier, options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      header('Restore Backup');

      const config = loadConfig();
      const engine = new SyncEngine(config);
      const backups = engine.listBackups();

      let backupPath: string | undefined;

      // Check if it's a number (index)
      const index = parseInt(backupIdentifier, 10);
      if (!isNaN(index) && index > 0 && index <= backups.length) {
        backupPath = backups[index - 1].path;
      } else {
        // Try as direct path
        if (fs.existsSync(backupIdentifier)) {
          backupPath = backupIdentifier;
        }
      }

      if (!backupPath) {
        error('Backup not found');
        info('Use "claude-sync backup list" to see available backups');
        return;
      }

      const backup = backups.find(b => b.path === backupPath);
      if (backup) {
        info(`Restoring: ${path.basename(backup.path)}`);
        info(`Date: ${formatDate(backup.timestamp)}`);
        info(`Files: ${backup.files.length}`);
      }

      // Confirm unless force flag
      if (!options.force) {
        warn('\nThis will replace your current configuration!');
        warn('A new backup will be created automatically before restoring.');

        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Continue?',
            default: false,
          },
        ]);

        if (!answer.confirm) {
          info('Cancelled');
          return;
        }
      }

      // Create safety backup first
      info('\nCreating safety backup...');
      await engine.createBackup();

      // Restore
      info('Restoring...');
      const restoreSuccess = await engine.restoreBackup(backupPath);

      if (restoreSuccess) {
        success('Backup restored successfully');
      } else {
        error('Failed to restore backup');
      }
    });

  backupCmd
    .command('delete <backup>')
    .description('Delete a backup (use index or backup path)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (backupIdentifier, options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      header('Delete Backup');

      const config = loadConfig();
      const engine = new SyncEngine(config);
      const backups = engine.listBackups();

      let backupPath: string | undefined;

      const index = parseInt(backupIdentifier, 10);
      if (!isNaN(index) && index > 0 && index <= backups.length) {
        backupPath = backups[index - 1].path;
      } else {
        if (fs.existsSync(backupIdentifier)) {
          backupPath = backupIdentifier;
        }
      }

      if (!backupPath) {
        error('Backup not found');
        return;
      }

      // Confirm unless force
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Delete backup "${path.basename(backupPath)}"?`,
            default: false,
          },
        ]);

        if (!confirm) {
          info('Cancelled');
          return;
        }
      }

      try {
        fs.rmSync(backupPath, { recursive: true, force: true });
        success('Backup deleted');
      } catch (err) {
        error('Failed to delete backup:', err);
      }
    });

  backupCmd
    .command('clean')
    .description('Remove old backups (keep only N most recent)')
    .option('-k, --keep <number>', 'Number of backups to keep', '5')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      header('Clean Old Backups');

      const keep = parseInt(options.keep, 10);
      const config = loadConfig();
      const engine = new SyncEngine(config);
      const backups = engine.listBackups();

      if (backups.length <= keep) {
        info(`Only ${backups.length} backup(s) exist, nothing to clean`);
        return;
      }

      const toDelete = backups.slice(keep);

      info(`Found ${backups.length} backups, will delete ${toDelete.length}`);
      info(`Keeping the ${keep} most recent:`);

      for (let i = 0; i < Math.min(3, keep); i++) {
        bullet(path.basename(backups[i].path));
      }

      info('\nTo be deleted:');
      for (const backup of toDelete) {
        bullet(path.basename(backup.path));
      }

      // Confirm
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Continue?',
            default: false,
          },
        ]);

        if (!confirm) {
          info('Cancelled');
          return;
        }
      }

      // Delete old backups
      let deleted = 0;
      for (const backup of toDelete) {
        try {
          fs.rmSync(backup.path, { recursive: true, force: true });
          deleted++;
        } catch (err) {
          error(`Failed to delete ${path.basename(backup.path)}:`, err);
        }
      }

      success(`Deleted ${deleted} old backup(s)`);
    });
}

function getBackupSize(backupPath: string): number {
  let totalSize = 0;

  function calcSize(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        calcSize(fullPath);
      } else {
        try {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        } catch {
          // Skip
        }
      }
    }
  }

  calcSize(backupPath);
  return totalSize;
}
