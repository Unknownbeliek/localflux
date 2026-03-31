/**
 * tests/textNormalization.test.js
 *
 * Unit tests for server/utils/textNormalization.js
 *
 * Tests text normalization functions used for answer comparison:
 * - normalizeGuessText: Full text normalization (accents, special chars, case)
 * - normalizeCompact: Remove all whitespace after normalization
 * - makeAcronym: Extract first letters from words
 */

'use strict';

const { normalizeGuessText, normalizeCompact, makeAcronym } = require('../utils/textNormalization');

describe('textNormalization', () => {
  // ── normalizeGuessText Tests ──────────────────────────────────────────────

  describe('normalizeGuessText()', () => {
    test('converts to lowercase', () => {
      const result = normalizeGuessText('PARIS');
      expect(result).toBe('paris');
    });

    test('trims leading and trailing whitespace', () => {
      const result = normalizeGuessText('  Paris  ');
      expect(result).toBe('paris');
    });

    test('removes accents and diacritics', () => {
      const result = normalizeGuessText('Café');
      expect(result).toBe('cafe');
    });

    test('removes accents from special characters (é, ñ, etc)', () => {
      expect(normalizeGuessText('naïve')).not.toContain('ï');
      expect(normalizeGuessText('résumé')).not.toContain('é');
    });

    test('removes special characters and replaces with space', () => {
      const result = normalizeGuessText('Hello-World!');
      expect(result).not.toContain('-');
      expect(result).not.toContain('!');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    test('collapses multiple spaces into single space', () => {
      const result = normalizeGuessText('hello    world');
      expect(result).toBe('hello world');
    });

    test('preserves numbers (does not remove them)', () => {
      const result = normalizeGuessText('Paris123');
      expect(result).toBe('paris123');
    });

    test('handles empty string', () => {
      const result = normalizeGuessText('');
      expect(result).toBe('');
    });

    test('handles null/undefined', () => {
      expect(normalizeGuessText(null)).toBe('');
      expect(normalizeGuessText(undefined)).toBe('');
    });

    test('handles mixed case with special characters', () => {
      const result = normalizeGuessText('New York City!');
      expect(result).toBe('new york city');
    });

    test('handles Unicode normalization', () => {
      // Test NFKD normalization (different forms of same character)
      const result = normalizeGuessText('Ａ'); // Full-width A
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── normalizeCompact Tests ────────────────────────────────────────────────

  describe('normalizeCompact()', () => {
    test('normalizes text and removes all spaces', () => {
      const result = normalizeCompact('Paris France');
      expect(result).toBe('parisfrance');
    });

    test('preserves single words', () => {
      const result = normalizeCompact('Paris');
      expect(result).toBe('paris');
    });

    test('removes spaces from multi-word text', () => {
      const result = normalizeCompact('New York');
      expect(result).toBe('newyork');
    });

    test('removes all spaces even with multiple words', () => {
      const result = normalizeCompact('United   States   of   America');
      expect(result).not.toContain(' ');
      expect(result).toMatch(/^unitedstatesofamerica$/);
    });

    test('still applies full normalization (accents, case, special chars)', () => {
      const result = normalizeCompact('Café Français!');
      expect(result).not.toContain('é');
      expect(result).not.toContain('!');
      expect(result).not.toContain(' ');
      expect(result).toBe('cafefrancais');
    });

    test('handles empty string', () => {
      const result = normalizeCompact('');
      expect(result).toBe('');
    });
  });

  // ── makeAcronym Tests ─────────────────────────────────────────────────────

  describe('makeAcronym()', () => {
    test('extracts first letter of each word', () => {
      const result = makeAcronym('United States of America');
      expect(result).toBe('usoa');
    });

    test('works with two-word phrases', () => {
      const result = makeAcronym('New York');
      expect(result).toBe('ny');
    });

    test('returns empty string for single word', () => {
      const result = makeAcronym('Paris');
      expect(result).toBe('');
    });

    test('returns empty string for empty input', () => {
      const result = makeAcronym('');
      expect(result).toBe('');
    });

    test('handles text with special characters before acronym', () => {
      const result = makeAcronym('United States of America!');
      expect(result).toBe('usoa');
    });

    test('handles text with multiple spaces between words', () => {
      const result = makeAcronym('United   States   of   America');
      expect(result).toBe('usoa');
    });

    test('handles case conversion before acronym', () => {
      const result = makeAcronym('UNITED STATES OF AMERICA');
      expect(result).toBe('usoa');
    });

    test('handles accented characters', () => {
      const result = makeAcronym('Élysée Théâtre');
      expect(result).toBe('et');
    });

    test('returns empty for whitespace only', () => {
      const result = makeAcronym('   ');
      expect(result).toBe('');
    });

    test('handles null/undefined', () => {
      expect(makeAcronym(null)).toBe('');
      expect(makeAcronym(undefined)).toBe('');
    });
  });

  // ── Cross-Function Tests ──────────────────────────────────────────────────

  describe('consistency across functions', () => {
    test('normalizeCompact is subset of normalizeGuessText (without spaces)', () => {
      const input = 'New York City!';
      const normalized = normalizeGuessText(input);
      const compact = normalizeCompact(input);

      expect(normalized.replace(/\s+/g, '')).toBe(compact);
    });

    test('makeAcronym uses same normalization as normalizeGuessText', () => {
      const input = 'NEW YORK CITY';
      const acronym = makeAcronym(input);
      
      // Acronym should be lowercase (like normalizeGuessText output)
      expect(acronym).toBe(acronym.toLowerCase());
      expect(acronym).toMatch(/^[a-z]+$/);
    });

    test('real-world example: spell-check similarity', () => {
      // Common student answer variations for "New Zealand"
      const answers = ['New Zealand', 'new zealand!'];
      const normalized = answers.map((a) => normalizeGuessText(a));
      
      // Both should normalize to the same thing (case insensitive, punctuation removed)
      expect(normalized[0]).toBe(normalized[1]);
    });

    test('acronym generation for common phrases', () => {
      expect(makeAcronym('United Nations')).toBe('un');
      expect(makeAcronym('World Health Organization')).toBe('who');
      expect(makeAcronym('North Atlantic Treaty Organization')).toBe('nato');
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('handles very long strings', () => {
      const longString = 'word '.repeat(10000);
      const result = normalizeGuessText(longString);
      expect(result).toContain('word');
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles strings with only special characters', () => {
      const result = normalizeGuessText('!!!***---');
      expect(result.trim()).toBe('');
    });

    test('handles mixed Unicode scripts', () => {
      // Supports multiple languages/scripts
      const result = normalizeGuessText('Café Naïve');
      expect(result).not.toContain('é');
      expect(result).not.toContain('ï');
    });

    test('preserves order after normalization', () => {
      const result = normalizeGuessText('ABC DEF GHI');
      expect(result.indexOf('a')).toBeLessThan(result.indexOf('d'));
      expect(result.indexOf('d')).toBeLessThan(result.indexOf('g'));
    });
  });
});
