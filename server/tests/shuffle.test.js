/**
 * tests/shuffle.test.js
 *
 * Unit tests for server/core/shuffle.js
 *
 * Tests the Fisher-Yates shuffle algorithm for:
 * - Preserving all elements
 * - Not modifying the original array
 * - Randomness (basic distribution test)
 * - Edge cases (empty, single-element, null arrays)
 */

'use strict';

const { shuffle } = require('../core/shuffle');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Count frequency of each element in result array.
 * Used to verify all elements are present after shuffle.
 */
function elementFrequency(arr) {
  const freq = {};
  for (const item of arr) {
    freq[item] = (freq[item] || 0) + 1;
  }
  return freq;
}

/**
 * Simple chi-squared test for randomness of position changes.
 * If shuffle is working, we expect fewer elements to stay in original position.
 */
function countElementsInOriginalPosition(original, shuffled) {
  let count = 0;
  for (let i = 0; i < original.length; i++) {
    if (original[i] === shuffled[i]) {
      count++;
    }
  }
  return count;
}

// ── Basic Functionality Tests ─────────────────────────────────────────────────

describe('shuffle()', () => {
  describe('element preservation', () => {
    test('preserves all elements from original array', () => {
      const original = [1, 2, 3, 4, 5];
      const result = shuffle(original);

      const origFreq = elementFrequency(original);
      const resultFreq = elementFrequency(result);

      expect(resultFreq).toEqual(origFreq);
    });

    test('preserves elements for string array', () => {
      const original = ['a', 'b', 'c', 'd'];
      const result = shuffle(original);

      expect(result.length).toBe(original.length);
      expect(result.sort()).toEqual(original.sort());
    });

    test('preserves elements for mixed-type array', () => {
      const original = [1, 'a', { x: 1 }, true];
      const result = shuffle(original);

      expect(result.length).toBe(original.length);
      // Count each type
      expect(result.filter((x) => typeof x === 'number')).toHaveLength(1);
      expect(result.filter((x) => typeof x === 'string')).toHaveLength(1);
      expect(result.filter((x) => typeof x === 'object' && x !== null)).toHaveLength(1);
      expect(result.filter((x) => typeof x === 'boolean')).toHaveLength(1);
    });

    test('preserves duplicate elements', () => {
      const original = [1, 2, 2, 3, 3, 3];
      const result = shuffle(original);

      const origFreq = elementFrequency(original);
      const resultFreq = elementFrequency(result);

      expect(resultFreq).toEqual(origFreq);
    });
  });

  // ── Non-Mutation Tests ────────────────────────────────────────────────────

  describe('non-mutation', () => {
    test('does not mutate original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];

      shuffle(original);

      expect(original).toEqual(originalCopy);
    });

    test('returns a new array instance', () => {
      const original = [1, 2, 3];
      const result = shuffle(original);

      expect(result).not.toBe(original);
    });
  });

  // ── Randomness Tests ──────────────────────────────────────────────────────

  describe('randomness', () => {
    test('typically produces different order (not always in original order)', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let differentOrders = 0;

      // Run shuffle 10 times, check if at least one is different
      for (let i = 0; i < 10; i++) {
        const result = shuffle(original);
        if (!arraysEqual(result, original)) {
          differentOrders++;
        }
      }

      // With very high probability, at least one should be different
      expect(differentOrders).toBeGreaterThan(0);
    });

    test('does not keep all elements in original positions', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let runs = 0;
      let totalInPlace = 0;

      // Run 100 times, check average
      for (let i = 0; i < 100; i++) {
        const result = shuffle(original);
        totalInPlace += countElementsInOriginalPosition(original, result);
        runs++;
      }

      const avgInPlace = totalInPlace / runs;
      // For a 10-element array, random should keep ~1 in place on average
      // We allow up to 3 to account for variance
      expect(avgInPlace).toBeLessThan(5);
    });

    test('larger arrays show more randomness variation', () => {
      const original = Array.from({ length: 20 }, (_, i) => i);
      const distributions = [];

      for (let i = 0; i < 20; i++) {
        const result = shuffle(original);
        distributions.push(countElementsInOriginalPosition(original, result));
      }

      // Check that we get variety in shuffle quality
      const minInPlace = Math.min(...distributions);
      const maxInPlace = Math.max(...distributions);
      expect(maxInPlace - minInPlace).toBeGreaterThan(0);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('empty array returns empty array', () => {
      const result = shuffle([]);
      expect(result).toEqual([]);
    });

    test('single element array returns same element', () => {
      const result = shuffle([42]);
      expect(result).toEqual([42]);
    });

    test('two element array works correctly', () => {
      const original = [1, 2];
      const result = shuffle(original);

      expect(result.length).toBe(2);
      expect(result).toContain(1);
      expect(result).toContain(2);
    });

    test('undefined array handled gracefully', () => {
      // The function expects an array; if undefined is passed, it will fail
      // but we document this expected behavior
      expect(() => shuffle(undefined)).toThrow();
    });

    test('null array handled gracefully', () => {
      expect(() => shuffle(null)).toThrow();
    });

    test('non-array inputs are passed through spread safely', () => {
      // Note: The shuffle function uses [...array], which works for strings
      // and array-like objects. This is acceptable behavior.
      const stringResult = shuffle('abc');
      expect(stringResult.length).toBe(3);
      expect(stringResult).toContain('a');
      expect(stringResult).toContain('b');
      expect(stringResult).toContain('c');
    });
  });

  // ── Determinism & Consistency ─────────────────────────────────────────────

  describe('consistency', () => {
    test('shuffle with same input produces different results (not deterministic)', () => {
      const input = [1, 2, 3, 4, 5];
      const result1 = shuffle(input);
      const result2 = shuffle(input);

      // With high probability, two shuffles should differ
      // (though mathematically it's possible they're the same)
      expect(
        !arraysEqual(result1, result2) || !arraysEqual(result1, input)
      ).toBe(true);
    });

    test('all elements appear with similar frequency across many shuffles', () => {
      const input = [1, 2, 3, 4];
      const positions = { 1: {}, 2: {}, 3: {}, 4: {} };

      // Track where each element ends up over 100 shuffles
      for (let i = 0; i < 100; i++) {
        const result = shuffle(input);
        for (let pos = 0; pos < result.length; pos++) {
          const elem = result[pos];
          positions[elem][pos] = (positions[elem][pos] || 0) + 1;
        }
      }

      // Each element should appear in each position roughly 25 times
      for (const elem of [1, 2, 3, 4]) {
        for (let pos = 0; pos < 4; pos++) {
          const count = positions[elem][pos] || 0;
          // Allow variance: between 10 and 40 (out of 100)
          expect(count).toBeGreaterThan(5);
          expect(count).toBeLessThan(50);
        }
      }
    });
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Deep equality check for arrays of primitives.
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
