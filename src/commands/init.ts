/**
 * Init command - Initialize sync configuration
 */

import inquirer from 'inquirer';
import { Command } from 'commander';
import type { SyncConfig, IncludeOptions } from '../types/index.js';
import { loadConfig, saveConfig, validateConfig } from '../utils/config-loader.js';
import { getClaudePaths, ensureDir, isValidGitUrl } from '../utils/helpers.js';
import { header, success, error, info, warn, spinner } from '../utils/logger.js';
import { SyncEngine } from '../core/sync-engine.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize claude-sync configuration')
    .option('-r, --repo <url>', 'Git repository URL')
    .option('-b, --branch <name>', 'Branch name (default: main)')
    .option('--no-skills', 'Exclude skills from sync')
    .option('--no-plugins', 'Exclude plugins from sync')
    .option('--no-settings', 'Exclude settings from sync')
    .option('--include-projects', 'Include projects in sync')
    .option('--include-history', 'Include history in sync')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options) => {
      header('Claude Sync Initialization');

      const paths = getClaudePaths();
      const existingConfig = loadConfig();

      // Check if already initialized
      if (existingConfig.sync.repository && !options.repo) {
        warn('Configuration already exists');
        info(`Current repository: ${existingConfig.sync.repository}`);

        const { reinit } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'reinit',
            message: 'Do you want to reinitialize?',
            default: false,
          },
        ]);

        if (!reinit) {
          info('Exiting...');
          return;
        }
      }

      let repoUrl = options.repo;
      let branch = options.branch || 'main';

      // Interactive prompts if not provided
      if (!repoUrl) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'repoUrl',
            message: 'Git repository URL:',
            validate: (input: string) => {
              if (!input) {
                return 'Repository URL is required';
              }
              if (!isValidGitUrl(input)) {
                return 'Invalid Git repository URL format';
              }
              return true;
            },
          },
          {
            type: 'input',
            name: 'branch',
            message: 'Branch name:',
            default: 'main',
          },
        ]);

        repoUrl = answers.repoUrl;
        branch = answers.branch;
      }

      // Configure what to sync
      let includeOptions: IncludeOptions;

      if (options.yes) {
        includeOptions = {
          skills: options.skills !== false,
          plugins: options.plugins !== false,
          settings: options.settings !== false,
          projects: options.includeProjects || false,
          history: options.includeHistory || false,
          customPatterns: [],
        };
      } else {
        const includeAnswers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'items',
            message: 'What do you want to sync?',
            choices: [
              { name: 'Skills', value: 'skills', checked: true },
              { name: 'Plugins', value: 'plugins', checked: true },
              { name: 'Settings', value: 'settings', checked: true },
              { name: 'Projects', value: 'projects', checked: false },
              { name: 'History', value: 'history', checked: false },
            ],
          },
        ]);

        const items = includeAnswers.items as string[];
        includeOptions = {
          skills: items.includes('skills'),
          plugins: items.includes('plugins'),
          settings: items.includes('settings'),
          projects: items.includes('projects'),
          history: items.includes('history'),
          customPatterns: [],
        };
      }

      // Conflict strategy
      let conflictStrategy = 'ask' as const;

      if (!options.yes) {
        const { strategy } = await inquirer.prompt([
          {
            type: 'list',
            name: 'strategy',
            message: 'Conflict resolution strategy:',
            choices: [
              { name: 'Ask (interactive)', value: 'ask' },
              { name: 'Prefer local version', value: 'local' },
              { name: 'Prefer remote version', value: 'remote' },
              { name: 'Use newest (by modification time)', value: 'newest' },
            ],
            default: 'ask',
          },
        ]);

        conflictStrategy = strategy;
      }

      // Create config
      const config: SyncConfig = {
        version: '1.0.0',
        sync: {
          repository: repoUrl,
          branch,
          autoSync: false,
          syncIntervalMinutes: 30,
          include: includeOptions,
          excludePatterns: ['.env', '*.key', 'secrets/', '*.secret'],
          conflictStrategy,
        },
      };

      // Validate config
      const validation = validateConfig(config);
      if (!validation.valid) {
        error('Invalid configuration:');
        for (const err of validation.errors) {
          error(`  - ${err}`);
        }
        return;
      }

      // Ensure directories exist
      ensureDir(paths.syncHome);

      // Save config
      saveConfig(config);
      success('Configuration saved');

      // Initialize repository
      const spin = spinner('Initializing repository...').start();

      try {
        const engine = new SyncEngine(config);
        const result = await engine.initialize();

        if (result.success) {
          spin.succeed('Repository initialized');

          // Ask if user wants to do initial push
          if (!options.yes) {
            const { shouldPush } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'shouldPush',
                message: 'Do you want to push your current configuration now?',
                default: true,
              },
            ]);

            if (shouldPush) {
              info('Pushing initial configuration...');
              const pushResult = await engine.push();

              if (pushResult.success) {
                success(`Initial push completed: ${pushResult.pushed} files`);
              } else {
                warn('Initial push failed. You can push later with: claude-sync push');
              }
            }
          } else {
            info('You can push your configuration later with: claude-sync push');
          }
        } else {
          spin.fail('Repository initialization failed');
          error(result.message);
          if (result.errors) {
            for (const err of result.errors) {
              error(`  ${err}`);
            }
          }
        }
      } catch (err) {
        spin.fail('Initialization failed');
        error(String(err));
      }

      success('\nSetup complete!');
      info(`Repository: ${repoUrl}`);
      info(`Branch: ${branch}`);
      info('\nCommands:');
      info('  claude-sync push   - Push local changes to remote');
      info('  claude-sync pull   - Pull changes from remote');
      info('  claude-sync sync   - Bidirectional sync');
      info('  claude-sync status - Check sync status');
    });
}
