/**
 * Health checker for Claude skills
 * Detects broken, outdated, or malformed skills
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { HealthCheckResult, HealthCheckSummary } from '../types/index.js';
import { getClaudePaths, getFileMtime, formatFileSize } from '../utils/helpers.js';
import { parseFrontmatter, validateSkillFrontmatter } from '../utils/frontmatter.js';
import { debug } from '../utils/logger.js';

// Age threshold for warning (6 months in milliseconds)
const OLD_SKILL_THRESHOLD = 6 * 30 * 24 * 60 * 60 * 1000;

export class HealthChecker {
  private claudeHome: string;

  constructor() {
    const paths = getClaudePaths();
    this.claudeHome = paths.claudeHome;
  }

  /**
   * Check all skills for health issues
   */
  async checkAll(): Promise<HealthCheckSummary> {
    const skillsPath = path.join(this.claudeHome, 'skills');

    if (!fs.existsSync(skillsPath)) {
      return {
        totalSkills: 0,
        healthy: 0,
        warnings: 0,
        errors: 0,
        skills: [],
      };
    }

    // Find all skill directories
    const pattern = path.join(skillsPath, '*/SKILL.md');
    const skillFiles = await glob(pattern, {
      absolute: true,
      nodir: true,
      windowsPathsNoEscape: true,
    });

    debug(`Found ${skillFiles.length} skill files`);

    const results: HealthCheckResult[] = [];

    for (const skillFile of skillFiles) {
      const skillName = path.basename(path.dirname(skillFile));
      const result = await this.checkSkill(skillFile, skillName);
      results.push(result);
    }

    // Also check for directories without SKILL.md
    const allDirs = fs.readdirSync(skillsPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const dirName of allDirs) {
      const hasSkillMd = results.some(r => r.skillName === dirName);
      if (!hasSkillMd) {
        const skillPath = path.join(skillsPath, dirName);
        const stats = fs.statSync(skillPath);
        results.push({
          skillName: dirName,
          status: 'error',
          issues: ['Missing SKILL.md file'],
          suggestions: ['Reinstall the skill or create SKILL.md'],
          lastModified: stats.mtime,
          fileSize: 0,
        });
      }
    }

    // Calculate summary
    const summary: HealthCheckSummary = {
      totalSkills: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      warnings: results.filter(r => r.status === 'warning').length,
      errors: results.filter(r => r.status === 'error').length,
      skills: results,
    };

    return summary;
  }

  /**
   * Check a single skill for health issues
   */
  private async checkSkill(
    skillPath: string,
    skillName: string
  ): Promise<HealthCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check if SKILL.md exists
    if (!fs.existsSync(skillPath)) {
      return {
        skillName,
        status: 'error',
        issues: ['Missing SKILL.md file'],
        suggestions: ['Reinstall the skill or create SKILL.md'],
      };
    }

    // Read SKILL.md content
    const content = fs.readFileSync(skillPath, 'utf-8');
    const stats = fs.statSync(skillPath);

    // Check for frontmatter
    const frontmatterResult = parseFrontmatter(content);

    if (!frontmatterResult) {
      status = 'warning';
      issues.push('No YAML frontmatter found');
      suggestions.push('Add frontmatter with name and description');
    } else {
      // Validate frontmatter
      const validation = validateSkillFrontmatter(frontmatterResult.frontmatter);
      if (!validation.valid) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push(...validation.errors);
        suggestions.push('Add missing fields to SKILL.md frontmatter');
      }

      // Check for empty description
      if (frontmatterResult.frontmatter.description === '') {
        status = status === 'healthy' ? 'warning' : status;
        issues.push('Empty description field');
        suggestions.push('Add a meaningful description');
      }
    }

    // Check file age
    const fileAge = Date.now() - stats.mtime.getTime();
    if (fileAge > OLD_SKILL_THRESHOLD) {
      status = status === 'healthy' ? 'warning' : status;
      const ageInDays = Math.floor(fileAge / (24 * 60 * 60 * 1000));
      issues.push(`Last updated ${ageInDays} days ago`);
      suggestions.push('Check for updates from the source');
    }

    // Check for empty content
    if (content.trim().length < 50) {
      status = 'error';
      issues.push('SKILL.md content is too short');
      suggestions.push('Add proper documentation and examples');
    }

    // Calculate skill directory size
    const skillDir = path.dirname(skillPath);
    const dirSize = this.getDirectorySize(skillDir);

    return {
      skillName,
      status,
      issues,
      suggestions,
      lastModified: stats.mtime,
      fileSize: dirSize,
    };
  }

  /**
   * Get the total size of a directory
   */
  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (err) {
      debug(`Error calculating directory size for ${dirPath}:`, err);
    }

    return totalSize;
  }

  /**
   * Format health status for display
   */
  formatStatus(summary: HealthCheckSummary): string {
    const lines: string[] = [];

    lines.push(`Total Skills: ${summary.totalSkills}`);
    lines.push(`✓ Healthy: ${summary.healthy}`);
    lines.push(`⚠ Warnings: ${summary.warnings}`);
    lines.push(`✗ Errors: ${summary.errors}`);

    return lines.join('\n');
  }

  /**
   * Get errors from summary
   */
  getErrors(summary: HealthCheckSummary): HealthCheckResult[] {
    return summary.skills.filter(s => s.status === 'error');
  }

  /**
   * Get warnings from summary
   */
  getWarnings(summary: HealthCheckSummary): HealthCheckResult[] {
    return summary.skills.filter(s => s.status === 'warning');
  }

  /**
   * Get healthy skills from summary
   */
  getHealthy(summary: HealthCheckSummary): HealthCheckResult[] {
    return summary.skills.filter(s => s.status === 'healthy');
  }
}
