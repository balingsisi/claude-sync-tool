/**
 * Doctor command - Health check for skills
 */

import { Command } from 'commander';
import { isConfigInitialized } from '../utils/config-loader.js';
import { header, info, warn, error, success, bullet, spinner } from '../utils/logger.js';
import { HealthChecker } from '../core/health-checker.js';
import { formatDate, formatFileSize } from '../utils/helpers.js';
import type { HealthCheckSummary, HealthCheckResult } from '../types/index.js';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check health of Claude skills')
    .option('--fix', 'Attempt to auto-fix issues (experimental)')
    .option('--json', 'Output results in JSON format')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      header('Health Check Report');

      // Check if initialized
      if (!isConfigInitialized()) {
        error('Not initialized. Run: claude-config-sync init');
        return;
      }

      const check = spinner('Checking skills...');
      check.start();

      try {
        const checker = new HealthChecker();
        const summary = await checker.checkAll();

        check.stop();

        // JSON output
        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
          return;
        }

        // Display summary
        info('Total Skills:', summary.totalSkills.toString());
        success(`Healthy: ${summary.healthy}`);
        if (summary.warnings > 0) {
          warn(`Warnings: ${summary.warnings}`);
        }
        if (summary.errors > 0) {
          error(`Errors: ${summary.errors}`);
        }

        console.log();

        // Show errors
        const errors = checker.getErrors(summary);
        if (errors.length > 0) {
          info('Errors:');
          for (const skill of errors) {
            console.log();
            error(`  ✗ ${skill.skillName}`);
            for (const issue of skill.issues) {
              console.log(`    • ${issue}`);
            }
            if (skill.suggestions.length > 0) {
              for (const suggestion of skill.suggestions) {
                console.log(`    💡 ${suggestion}`);
              }
            }
          }
          console.log();
        }

        // Show warnings
        const warnings = checker.getWarnings(summary);
        if (warnings.length > 0) {
          info('Warnings:');
          for (const skill of warnings) {
            console.log();
            warn(`  ⚠ ${skill.skillName}`);
            for (const issue of skill.issues) {
              console.log(`    • ${issue}`);
            }
            if (skill.suggestions.length > 0) {
              for (const suggestion of skill.suggestions) {
                console.log(`    💡 ${suggestion}`);
              }
            }
          }
          console.log();
        }

        // Show healthy skills
        const healthy = checker.getHealthy(summary);
        if (healthy.length > 0 && options.verbose) {
          info('Healthy Skills:');
          for (const skill of healthy) {
            const meta: string[] = [];
            if (skill.lastModified) {
              meta.push(`updated: ${formatDate(skill.lastModified)}`);
            }
            if (skill.fileSize) {
              meta.push(`size: ${formatFileSize(skill.fileSize)}`);
            }
            const metaStr = meta.length > 0 ? ` (${meta.join(', ')})` : '';
            console.log(`  ✓ ${skill.skillName}${metaStr}`);
          }
          console.log();
        }

        // Summary message
        if (summary.errors === 0 && summary.warnings === 0) {
          success('All skills are healthy!');
        } else if (summary.errors === 0) {
          info(`All skills functional, but ${summary.warnings} may need attention.`);
        } else {
          error(`Found ${summary.errors} error(s) and ${summary.warnings} warning(s).`);
        }

        // Handle fix option (placeholder for future implementation)
        if (options.fix) {
          if (summary.errors === 0 && summary.warnings === 0) {
            info('Nothing to fix.');
          } else {
            info('\nAuto-fix is not yet implemented.');
            info('Please fix the issues manually based on the suggestions above.');
          }
        }

      } catch (err) {
        check.stop();
        error('Health check failed');
        error(String(err));
      }
    });
}
