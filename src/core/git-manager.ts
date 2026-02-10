/**
 * Git operations manager using simple-git
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import type { GitCommitInfo } from '../types/index.js';
import { getClaudePaths, ensureDir } from '../utils/helpers.js';
import { error, debug } from '../utils/logger.js';

export class GitManager {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath?: string) {
    const paths = getClaudePaths();
    this.repoPath = repoPath || paths.syncRepoDir;
    this.git = simpleGit({ baseDir: this.repoPath });
  }

  /**
   * Initialize a new Git repository
   */
  async init(): Promise<boolean> {
    try {
      ensureDir(this.repoPath);
      await this.git.init();
      debug('Git repository initialized at', this.repoPath);
      return true;
    } catch (err) {
      error('Failed to initialize git repository:', err);
      return false;
    }
  }

  /**
   * Clone a remote repository
   */
  async clone(repoUrl: string, branch?: string): Promise<boolean> {
    try {
      const parentDir = path.dirname(this.repoPath);
      ensureDir(parentDir);

      if (fs.existsSync(this.repoPath)) {
        debug('Repository directory already exists, removing...');
        fs.rmSync(this.repoPath, { recursive: true, force: true });
      }

      const cloneArgs = branch ? ['--branch', branch] : [];
      await this.git.clone(repoUrl, this.repoPath, cloneArgs);
      debug('Cloned repository from', repoUrl);
      return true;
    } catch (err) {
      error('Failed to clone repository:', err);
      return false;
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(name: string, url: string): Promise<boolean> {
    try {
      await this.git.addRemote(name, url);
      debug(`Added remote '${name}' -> ${url}`);
      return true;
    } catch (err) {
      error('Failed to add remote:', err);
      return false;
    }
  }

  /**
   * Set remote URL
   */
  async setRemoteUrl(name: string, url: string): Promise<boolean> {
    try {
      await this.git.remote(['set-url', name, url]);
      debug(`Set remote '${name}' -> ${url}`);
      return true;
    } catch (err) {
      error('Failed to set remote URL:', err);
      return false;
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(remote: string = 'origin'): Promise<boolean> {
    try {
      await this.git.fetch(remote);
      debug(`Fetched from '${remote}'`);
      return true;
    } catch (err) {
      error('Failed to fetch:', err);
      return false;
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      const pullArgs = branch ? [`${remote}/${branch}`] : [];
      await this.git.pull(remote, branch, pullArgs);
      debug(`Pulled from '${remote}${branch ? '/' + branch : ''}'`);
      return true;
    } catch (err) {
      error('Failed to pull:', err);
      return false;
    }
  }

  /**
   * Push changes to remote
   */
  async push(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      await this.git.push(remote, branch);
      debug(`Pushed to '${remote}${branch ? '/' + branch : ''}'`);
      return true;
    } catch (err) {
      error('Failed to push:', err);
      return false;
    }
  }

  /**
   * Add files to staging area
   */
  async add(files: string | string[]): Promise<boolean> {
    try {
      await this.git.add(files);
      debug('Staged files:', files);
      return true;
    } catch (err) {
      error('Failed to stage files:', err);
      return false;
    }
  }

  /**
   * Commit staged changes
   */
  async commit(message: string): Promise<string | null> {
    try {
      const result = await this.git.commit(message);
      debug('Committed changes:', message);
      return result.commit || null;
    } catch (err) {
      error('Failed to commit:', err);
      return null;
    }
  }

  /**
   * Get current status
   */
  async status(): Promise<any> {
    try {
      const statusResult = await this.git.status();
      return statusResult;
    } catch (err) {
      error('Failed to get status:', err);
      return null;
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branches = await this.git.branch();
      return branches.current || 'main';
    } catch (err) {
      error('Failed to get current branch:', err);
      return 'main';
    }
  }

  /**
   * Checkout a branch
   */
  async checkout(branch: string, createBranch = false): Promise<boolean> {
    try {
      if (createBranch) {
        await this.git.checkoutLocalBranch(branch);
      } else {
        await this.git.checkout(branch);
      }
      debug(`Checked out branch: ${branch}`);
      return true;
    } catch (err) {
      error('Failed to checkout branch:', err);
      return false;
    }
  }

  /**
   * Get commit history
   */
  async log(maxCount: number = 10): Promise<GitCommitInfo[]> {
    try {
      const logResult = await this.git.log({ maxCount });
      return logResult.all.map(commit => ({
        hash: commit.hash,
        author: commit.author_name,
        message: commit.message,
        date: new Date(commit.date),
      }));
    } catch (err) {
      error('Failed to get log:', err);
      return [];
    }
  }

  /**
   * Get diff of changes
   */
  async diff(file?: string): Promise<string> {
    try {
      if (file) {
        return await this.git.diff([file]);
      }
      return await this.git.diff();
    } catch (err) {
      error('Failed to get diff:', err);
      return '';
    }
  }

  /**
   * Reset to a commit
   */
  async reset(commit: string, hard = false): Promise<boolean> {
    try {
      if (hard) {
        await this.git.reset(['--hard', commit]);
      } else {
        await this.git.reset(['--soft', commit]);
      }
      debug(`Reset to ${commit}`);
      return true;
    } catch (err) {
      error('Failed to reset:', err);
      return false;
    }
  }

  /**
   * Check if repository exists
   */
  async repoExists(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommit(): Promise<string | null> {
    try {
      const logResult = await this.git.log({ maxCount: 1 });
      return logResult.latest?.hash || null;
    } catch {
      return null;
    }
  }

  /**
   * Get remote commit hash for current branch
   */
  async getRemoteCommit(remote: string = 'origin', branch?: string): Promise<string | null> {
    try {
      const targetBranch = branch || (await this.getCurrentBranch());
      const result = await this.git.remote(['show', remote]);
      // Parse the output to get the remote commit
      if (typeof result === 'string') {
        const match = result.match(/HEAD branch:\s+(\S+)/m);
        return match ? match[1] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * List files changed between commits
   */
  async getChangedFiles(from: string, to: string): Promise<string[]> {
    try {
      const diffResult = await this.git.diff([`${from}..${to}`, '--name-only']);
      return diffResult.split('\n').filter(f => f.trim());
    } catch {
      return [];
    }
  }

  /**
   * Check if file is ignored
   */
  async isIgnored(file: string): Promise<boolean> {
    try {
      await this.git.checkIgnore(file);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stage all changes
   */
  async addAll(): Promise<boolean> {
    try {
      await this.git.add('./*');
      debug('Staged all changes');
      return true;
    } catch (err) {
      error('Failed to stage all:', err);
      return false;
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasChanges(): Promise<boolean> {
    try {
      const statusResult = await this.git.status();
      return statusResult.files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string): Promise<boolean> {
    try {
      await this.git.checkoutLocalBranch(branchName);
      debug(`Created branch: ${branchName}`);
      return true;
    } catch (err) {
      error('Failed to create branch:', err);
      return false;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string, force = false): Promise<boolean> {
    try {
      await this.git.deleteLocalBranch(branchName, force);
      debug(`Deleted branch: ${branchName}`);
      return true;
    } catch (err) {
      error('Failed to delete branch:', err);
      return false;
    }
  }

  /**
   * List branches
   */
  async listBranches(): Promise<string[]> {
    try {
      const branches = await this.git.branch();
      return branches.all;
    } catch {
      return [];
    }
  }
}
