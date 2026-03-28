/**
 * Tests for the LocalFlux Scoring Engine
 *
 * Validates the calculateScore function with comprehensive test coverage
 * including edge cases, all host modes, and difficulty levels.
 */

'use strict';

const { calculateScore } = require('../core/scoringEngine');

describe('calculateScore - Scoring Engine Tests', () => {
  describe('Base Score by Difficulty', () => {
    it('should return 2000 points for hard difficulty', () => {
      const result = calculateScore({
        difficulty: 'hard',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(2000);
    });

    it('should return 1500 points for medium difficulty', () => {
      const result = calculateScore({
        difficulty: 'medium',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(1500);
    });

    it('should return 1000 points for easy difficulty', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(1000);
    });

    it('should default to 1000 points for undefined difficulty', () => {
      const result = calculateScore({
        difficulty: undefined,
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(1000);
    });

    it('should default to 1000 points for null difficulty', () => {
      const result = calculateScore({
        difficulty: null,
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(1000);
    });

    it('should default to 1000 points for unknown difficulty string', () => {
      const result = calculateScore({
        difficulty: 'nightmare',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(1000);
    });
  });

  describe('Time Bonus Calculation', () => {
    it('should give maximum 500 point bonus when time is full', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(500);
    });

    it('should give 250 point bonus when half time remains', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 10000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(250);
    });

    it('should give 0 point bonus when no time remains', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 0,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(0);
    });

    it('should clamp negative timeRemaining to 0', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: -5000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(0);
    });

    it('should handle totalTime of 0 safely (division by zero)', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 5000,
        totalTime: 0,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(0);
      expect(result.finalScore).toBe(1000);
    });

    it('should cap timeRemaining ratio at 1.0 when time exceeds total', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 25000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(500);
    });
  });

  describe('Accuracy Multiplier - Casual Mode (Default)', () => {
    it('should apply 1.0x multiplier for exact match', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(1.0);
      expect(result.finalScore).toBe(1500);
    });

    it('should apply 0.8x multiplier for fuzzy match', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: true,
      });
      expect(result.multiplier).toBe(0.8);
      expect(result.finalScore).toBe(1200);
    });

    it('should apply 0.0x multiplier for wrong answer', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Accuracy Multiplier - Moderate Mode', () => {
    it('should apply 1.0x multiplier for exact match', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'moderate',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(1.0);
      expect(result.finalScore).toBe(1500);
    });

    it('should apply 0.0x multiplier for fuzzy match (no points)', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'moderate',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: true,
      });
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });

    it('should apply 0.0x multiplier for wrong answer', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'moderate',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Accuracy Multiplier - Pro Mode', () => {
    it('should apply 1.25x multiplier for exact match', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'pro',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(1.25);
      expect(result.finalScore).toBe(1875);
    });

    it('should apply 0.0x multiplier for fuzzy match (no points)', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'pro',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: true,
      });
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });

    it('should apply 0.0x multiplier for wrong answer', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'pro',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Complete Scoring Scenarios', () => {
    it('should calculate full score for hard question with exact match and full time (casual)', () => {
      const result = calculateScore({
        difficulty: 'hard',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(2000);
      expect(result.timeBonus).toBe(500);
      expect(result.multiplier).toBe(1.0);
      expect(result.finalScore).toBe(2500);
    });

    it('should calculate reduced score for medium question with fuzzy match and half time (casual)', () => {
      const result = calculateScore({
        difficulty: 'medium',
        hostMode: 'casual',
        timeRemaining: 10000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: true,
      });
      expect(result.baseScore).toBe(1500);
      expect(result.timeBonus).toBe(250);
      expect(result.multiplier).toBe(0.8);
      expect(result.finalScore).toBe(1400);
    });

    it('should calculate pro mode bonus for hard question with exact match and full time', () => {
      const result = calculateScore({
        difficulty: 'hard',
        hostMode: 'pro',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.baseScore).toBe(2000);
      expect(result.timeBonus).toBe(500);
      expect(result.multiplier).toBe(1.25);
      expect(result.finalScore).toBe(3125);
    });

    it('should award zero points for hard question with fuzzy match in pro mode', () => {
      const result = calculateScore({
        difficulty: 'hard',
        hostMode: 'pro',
        timeRemaining: 10000,
        totalTime: 20000,
        isExactMatch: false,
        isFuzzyMatch: true,
      });
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle undefined parameters object', () => {
      const result = calculateScore(undefined);
      expect(result.baseScore).toBe(1000);
      expect(result.multiplier).toBe(0);
      expect(result.finalScore).toBe(0);
    });

    it('should handle mixed number and string time values', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: '10000',
        totalTime: '20000',
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(250);
      expect(result.finalScore).toBe(1250);
    });

    it('should handle NaN and invalid number values', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: NaN,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.timeBonus).toBe(0);
      expect(result.finalScore).toBe(1000);
    });

    it('should handle null host mode (default to casual)', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: null,
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(1.0);
      expect(result.finalScore).toBe(1500);
    });

    it('should handle arcade mode (backward compatibility alias)', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'arcade',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(result.multiplier).toBe(1.0);
      expect(result.finalScore).toBe(1500);
    });

    it('should always return a number for finalScore', () => {
      const result = calculateScore({
        difficulty: 'hard',
        hostMode: 'pro',
        timeRemaining: 5432,
        totalTime: 17891,
        isExactMatch: true,
        isFuzzyMatch: false,
      });
      expect(Number.isInteger(result.finalScore)).toBe(true);
      expect(result.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle case-insensitive host mode and difficulty', () => {
      const result1 = calculateScore({
        difficulty: 'HARD',
        hostMode: 'CASUAL',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });

      const result2 = calculateScore({
        difficulty: 'hard',
        hostMode: 'casual',
        timeRemaining: 20000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });

      expect(result1.finalScore).toBe(result2.finalScore);
    });

    it('should return consistent ScoreBreakdown structure', () => {
      const result = calculateScore({
        difficulty: 'easy',
        hostMode: 'casual',
        timeRemaining: 10000,
        totalTime: 20000,
        isExactMatch: true,
        isFuzzyMatch: false,
      });

      expect(result).toHaveProperty('baseScore');
      expect(result).toHaveProperty('timeBonus');
      expect(result).toHaveProperty('multiplier');
      expect(result).toHaveProperty('finalScore');
    });
  });
});
