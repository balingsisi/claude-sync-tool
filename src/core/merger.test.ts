/**
 * Tests for configuration merger
 */

import { describe, it, expect } from 'vitest';
import { Merger } from './merger.js';

describe('Merger', () => {
  describe('mergeJson', () => {
    it('should merge simple objects', () => {
      const merger = new Merger('ask');
      const local = { a: 1, b: 2 };
      const remote = { b: 3, c: 4 };
      const result = merger.mergeJson(local, remote);

      expect(result.result).toEqual({ a: 1, b: 3, c: 4 });
      expect(result.merged).toBe(true);
    });

    it('should detect conflicts', () => {
      const merger = new Merger('ask');
      const local = { a: 1 };
      const remote = { a: 2 };
      const result = merger.mergeJson(local, remote);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toBe('a');
    });

    it('should use remote strategy', () => {
      const merger = new Merger('remote');
      const local = { a: 1, b: { x: 1 } };
      const remote = { a: 2, b: { x: 2 } };
      const result = merger.mergeJson(local, remote);

      expect(result.result).toEqual({ a: 2, b: { x: 2 } });
    });

    it('should use local strategy', () => {
      const merger = new Merger('local');
      const local = { a: 1, b: { x: 1 } };
      const remote = { a: 2, b: { x: 2 } };
      const result = merger.mergeJson(local, remote);

      expect(result.result).toEqual({ a: 1, b: { x: 1 } });
    });
  });

  describe('mergeSettings', () => {
    it('should protect sensitive fields', () => {
      const merger = new Merger('ask');
      const local = { apiKey: 'local-key', theme: 'dark' };
      const remote = { apiKey: 'remote-key', theme: 'light' };
      const result = merger.mergeSettings(local, remote);

      // Should keep local API key
      expect(result.result.apiKey).toBe('local-key');
      // Should use remote theme
      expect(result.result.theme).toBe('light');
    });

    it('should detect non-sensitive conflicts', () => {
      const merger = new Merger('ask');
      const local = { setting1: 'a', setting2: 'b' };
      const remote = { setting1: 'x', setting2: 'y' };
      const result = merger.mergeSettings(local, remote);

      expect(result.conflicts).toContain('setting1');
      expect(result.conflicts).toContain('setting2');
    });
  });

  describe('canMerge', () => {
    it('should identify JSON files', () => {
      const merger = new Merger('ask');
      expect(merger.canMerge('test.json')).toBe(true);
      expect(merger.canMerge('/path/to/config.json')).toBe(true);
    });

    it('should reject non-JSON files', () => {
      const merger = new Merger('ask');
      expect(merger.canMerge('test.txt')).toBe(false);
      expect(merger.canMerge('test.js')).toBe(false);
    });
  });

  describe('threeWayMerge', () => {
    it('should prefer local when only local changed', () => {
      const merger = new Merger('ask');
      const base = { a: 1 };
      const local = { a: 2 };
      const remote = { a: 1 };
      const result = merger.threeWayMerge(base, local, remote);

      expect(result.result).toEqual({ a: 2 });
      expect(result.conflicts).toHaveLength(0);
    });

    it('should prefer remote when only remote changed', () => {
      const merger = new Merger('ask');
      const base = { a: 1 };
      const local = { a: 1 };
      const remote = { a: 2 };
      const result = merger.threeWayMerge(base, local, remote);

      expect(result.result).toEqual({ a: 2 });
      expect(result.conflicts).toHaveLength(0);
    });

    it('should merge when both changed different fields', () => {
      const merger = new Merger('ask');
      const base = { a: 1, b: 1 };
      const local = { a: 2, b: 1 };
      const remote = { a: 1, b: 2 };
      const result = merger.threeWayMerge(base, local, remote);

      expect(result.result).toEqual({ a: 2, b: 2 });
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect conflicts when both changed same field', () => {
      const merger = new Merger('ask');
      const base = { a: 1 };
      const local = { a: 2 };
      const remote = { a: 3 };
      const result = merger.threeWayMerge(base, local, remote);

      expect(result.conflicts).toHaveLength(1);
    });
  });
});
