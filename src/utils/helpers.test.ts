/**
 * Tests for helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  isValidGitUrl,
  extractRepoName,
  formatFileSize,
  matchesPattern,
  debounce,
} from './helpers.js';

describe('isValidGitUrl', () => {
  it('should accept HTTPS URLs', () => {
    expect(isValidGitUrl('https://github.com/user/repo.git')).toBe(true);
    expect(isValidGitUrl('https://gitlab.com/user/repo.git')).toBe(true);
  });

  it('should accept SSH URLs', () => {
    expect(isValidGitUrl('git@github.com:user/repo.git')).toBe(true);
    expect(isValidGitUrl('user@host:path/to/repo.git')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidGitUrl('not-a-url')).toBe(false);
    expect(isValidGitUrl('')).toBe(false);
    expect(isValidGitUrl('github.com/user/repo')).toBe(false);
  });
});

describe('extractRepoName', () => {
  it('should extract repository name from URL', () => {
    expect(extractRepoName('git@github.com:user/claude-config.git')).toBe('claude-config');
    expect(extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
  });

  it('should return default name for invalid URLs', () => {
    expect(extractRepoName('not-a-url')).toBe('claude-config');
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0.0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

describe('matchesPattern', () => {
  it('should match glob patterns', () => {
    expect(matchesPattern('test.json', ['*.json'])).toBe(true);
    expect(matchesPattern('test.txt', ['*.json'])).toBe(false);
  });

  it('should handle negation patterns', () => {
    expect(matchesPattern('secret.json', ['*.json', '!secret.json'])).toBe(false);
    expect(matchesPattern('public.json', ['*.json', '!secret.json'])).toBe(true);
  });
});

describe('debounce', () => {
  it('should delay function execution', async () => {
    let calls = 0;
    const debounced = debounce(() => calls++, 100);

    debounced();
    debounced();
    debounced();

    expect(calls).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(calls).toBe(1);
  });
});
