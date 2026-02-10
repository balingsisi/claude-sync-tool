/**
 * Config command - Manage configuration
 */

import { Command } from 'commander';
import { loadConfig, saveConfig, setConfigValue, getConfigValue, addExcludePattern, removeExcludePattern } from '../utils/config-loader.js';
import { isConfigInitialized } from '../utils/config-loader.js';
import { header, success, error, info, bullet, kv } from '../utils/logger.js';
import inquirer from 'inquirer';

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage sync configuration');

  configCmd
    .command('set <path> <value>')
    .description('Set a configuration value (e.g., sync.autoSync true)')
    .action(async (configPath: string, value: string) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      // Parse value
      let parsedValue: unknown = value;
      if (value === 'true') {
        parsedValue = true;
      } else if (value === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(value))) {
        parsedValue = Number(value);
      }

      setConfigValue(configPath, parsedValue);
      success(`Set ${configPath} = ${parsedValue}`);
    });

  configCmd
    .command('get <path>')
    .description('Get a configuration value')
    .action((configPath: string) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      const value = getConfigValue(configPath);

      if (value === undefined) {
        error(`Configuration path not found: ${configPath}`);
        return;
      }

      info(`${configPath}:`);
      if (typeof value === 'object') {
        info(JSON.stringify(value, null, 2));
      } else {
        info(String(value));
      }
    });

  configCmd
    .command('list')
    .description('List all configuration')
    .action(() => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      const config = loadConfig();

      header('Configuration');

      info('Sync Options:');
      kv('Repository', config.sync.repository);
      kv('Branch', config.sync.branch);
      kv('Auto Sync', config.sync.autoSync ? 'Yes' : 'No');
      kv('Sync Interval', `${config.sync.syncIntervalMinutes} minutes`);
      kv('Conflict Strategy', config.sync.conflictStrategy);

      info('\nIncluded Items:');
      const { include } = config.sync;
      if (include.skills) bullet('Skills');
      if (include.plugins) bullet('Plugins');
      if (include.settings) bullet('Settings');
      if (include.projects) bullet('Projects');
      if (include.history) bullet('History');
      if (include.customPatterns.length > 0) {
        bullet('Custom Patterns:');
        for (const pattern of include.customPatterns) {
          info(`    - ${pattern}`);
        }
      }

      info('\nExcluded Patterns:');
      for (const pattern of config.sync.excludePatterns) {
        bullet(pattern);
      }
    });

  configCmd
    .command('exclude <pattern>')
    .description('Add an exclude pattern')
    .action((pattern: string) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      addExcludePattern(pattern);
      success(`Added exclude pattern: ${pattern}`);
    });

  configCmd
    .command('include <pattern>')
    .description('Remove an exclude pattern')
    .action((pattern: string) => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      removeExcludePattern(pattern);
      success(`Removed exclude pattern: ${pattern}`);
    });

  configCmd
    .command('edit')
    .description('Edit configuration interactively')
    .action(async () => {
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-sync init');
        return;
      }

      const config = loadConfig();

      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'autoSync',
          message: 'Enable auto sync?',
          default: config.sync.autoSync,
        },
        {
          type: 'number',
          name: 'syncIntervalMinutes',
          message: 'Sync interval (minutes):',
          default: config.sync.syncIntervalMinutes,
          when: (ans) => ans.autoSync,
        },
        {
          type: 'list',
          name: 'conflictStrategy',
          message: 'Conflict resolution strategy:',
          choices: [
            { name: 'Ask (interactive)', value: 'ask' },
            { name: 'Prefer local', value: 'local' },
            { name: 'Prefer remote', value: 'remote' },
            { name: 'Use newest', value: 'newest' },
          ],
          default: config.sync.conflictStrategy,
        },
      ]);

      // Update config
      config.sync.autoSync = answers.autoSync;
      config.sync.syncIntervalMinutes = answers.syncIntervalMinutes;
      config.sync.conflictStrategy = answers.conflictStrategy;

      saveConfig(config);
      success('Configuration updated');
    });
}
