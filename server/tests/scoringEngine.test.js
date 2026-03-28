<<<<<<< HEAD
/**
 * tests/scoringEngine.test.js
 *
 * Unit tests for server/core/scoringEngine.js
 *
 * Tests the calculateScore function for correct handling of:
 * - Difficulty levels (easy, standard, medium, hard)
 * - Game modes (casual, arcade, pro) with different decay floors and penalties
 * - Time decay multiplier calculations
 * - Streak bonuses
 * - Correct vs. incorrect answer handling
 */

'use strict';

const { calculateScore } = require('../core/scoringEngine');

describe('scoringEngine.calculateScore()', () => {
  // ── Tests: Difficulty Points ──────────────────────────────────────────────

  describe('difficulty points', () => {
    test('easy difficulty grants 50 base points', () => {
      const result = calculateScore(true, 'easy', 'arcade', 10000, 20000);
      expect(result.basePoints).toBe(50);
    });

    test('standard difficulty grants 100 base points', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000);
      expect(result.basePoints).toBe(100);
    });

    test('medium difficulty grants 150 base points', () => {
      const result = calculateScore(true, 'medium', 'arcade', 10000, 20000);
      expect(result.basePoints).toBe(150);
    });

    test('hard difficulty grants 200 base points', () => {
      const result = calculateScore(true, 'hard', 'arcade', 10000, 20000);
      expect(result.basePoints).toBe(200);
    });

    test('defaults to standard for invalid difficulty', () => {
      const result = calculateScore(true, 'invalid', 'arcade', 10000, 20000);
      expect(result.basePoints).toBe(100);
    });
  });

  // ── Tests: Time Decay Multiplier ──────────────────────────────────────────

  describe('time decay multiplier', () => {
    test('casual mode (decay floor 1.0) gives full points regardless of time', () => {
      const result1 = calculateScore(true, 'standard', 'casual', 20000, 20000);
      const result2 = calculateScore(true, 'standard', 'casual', 0, 20000);
      expect(result1.points).toBe(result2.points);
      expect(result1.points).toBe(100); // No time penalty
    });

    test('arcade mode (decay floor 0.5) gives 50% at t=0 and 100% at t=max', () => {
      const fullTime = calculateScore(true, 'standard', 'arcade', 20000, 20000);
      const noTime = calculateScore(true, 'standard', 'arcade', 0, 20000);
      const midTime = calculateScore(true, 'standard', 'arcade', 10000, 20000);

      expect(fullTime.points).toBe(100); // 100 * (0.5 + 0.5*1) = 100
      expect(noTime.points).toBe(50);    // 100 * (0.5 + 0.5*0) = 50
      expect(midTime.points).toBe(75);   // 100 * (0.5 + 0.5*0.5) = 75
    });

    test('pro mode (decay floor 0.0) gives 0% at t=0 and 100% at t=max', () => {
      const fullTime = calculateScore(true, 'standard', 'pro', 20000, 20000);
      const noTime = calculateScore(true, 'standard', 'pro', 0, 20000);
      const midTime = calculateScore(true, 'standard', 'pro', 10000, 20000);

      expect(fullTime.points).toBe(100); // 100 * (0 + 1*1) = 100
      expect(noTime.points).toBe(0);     // 100 * (0 + 1*0) = 0
      expect(midTime.points).toBe(50);   // 100 * (0 + 1*0.5) = 50
    });

    test('clamps time ratio between 0 and 1', () => {
      // Test with timeRemaining > totalTime (shouldn't happen, but should be safe)
      const result1 = calculateScore(true, 'standard', 'arcade', 30000, 20000);
      // Test with negative time (shouldn't happen, but should be safe)
      const result2 = calculateScore(true, 'standard', 'arcade', -5000, 20000);

      expect(result1.points).toBeLessThanOrEqual(100);
      expect(result2.points).toBeGreaterThanOrEqual(50);
    });

    test('handles zero totalTimeMs safely', () => {
      const result = calculateScore(true, 'standard', 'arcade', 0, 0);
      expect(result.points).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Tests: Streak Bonuses ─────────────────────────────────────────────────

  describe('streak bonuses', () => {
    test('no streak bonus at streak 0-2', () => {
      const s0 = calculateScore(true, 'standard', 'arcade', 10000, 20000, 0);
      const s1 = calculateScore(true, 'standard', 'arcade', 10000, 20000, 1);

      expect(s0.streakBonus).toBe(0); // newStreak=1, no bonus
      expect(s1.streakBonus).toBe(0); // newStreak=2, no bonus
    });

    test('3-streak grants 20 bonus points', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000, 2);
      expect(result.newStreak).toBe(3);
      expect(result.streakBonus).toBe(20);
    });

    test('4-streak grants 30 bonus points', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000, 3);
      expect(result.newStreak).toBe(4);
      expect(result.streakBonus).toBe(30);
    });

    test('5+ streak grants 50 bonus points', () => {
      const result5 = calculateScore(true, 'standard', 'arcade', 10000, 20000, 4);
      const result10 = calculateScore(true, 'standard', 'arcade', 10000, 20000, 9);

      expect(result5.newStreak).toBe(5);
      expect(result5.streakBonus).toBe(50);
      expect(result10.newStreak).toBe(10);
      expect(result10.streakBonus).toBe(50);
    });

    test('streak bonuses are included in final points', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000, 4);
      expect(result.points).toBe(result.basePoints * 0.75 + result.streakBonus); // 75 + 50 = 125
    });
  });

  // ── Tests: Streak Continuity ──────────────────────────────────────────────

  describe('streak continuity', () => {
    test('correct answer increments streak by 1', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000, 5);
      expect(result.newStreak).toBe(6);
    });

    test('incorrect answer resets streak to 0', () => {
      const result = calculateScore(false, 'standard', 'arcade', 10000, 20000, 5);
      expect(result.newStreak).toBe(0);
    });

    test('incorrect answer with no streak stays 0', () => {
      const result = calculateScore(false, 'standard', 'arcade', 10000, 20000, 0);
      expect(result.newStreak).toBe(0);
    });
  });

  // ── Tests: Wrong Answer Penalties ─────────────────────────────────────────

  describe('wrong answer penalties', () => {
    test('casual mode has no penalty for wrong answers', () => {
      const result = calculateScore(false, 'standard', 'casual', 10000, 20000);
      expect(result.points).toBe(0);
      expect(result.penalty).toBe(0);
    });

    test('arcade mode has no penalty for wrong answers', () => {
      const result = calculateScore(false, 'standard', 'arcade', 10000, 20000);
      expect(result.points).toBe(0);
      expect(result.penalty).toBe(0);
    });

    test('pro mode penalizes wrong answers at -50% of base points', () => {
      const result = calculateScore(false, 'standard', 'pro', 10000, 20000);
      expect(result.penalty).toBe(-50); // -50% of 100
      expect(result.points).toBe(-50);  // Negative points returned
    });

    test('pro mode penalty scales with difficulty', () => {
      const easyPenalty = calculateScore(false, 'easy', 'pro', 10000, 20000);
      const hardPenalty = calculateScore(false, 'hard', 'pro', 10000, 20000);

      expect(easyPenalty.penalty).toBe(-25);  // -50% of 50
      expect(hardPenalty.penalty).toBe(-100); // -50% of 200
    });
  });

  // ── Tests: Complex Scoring Scenarios ──────────────────────────────────────

  describe('complex scenarios', () => {
    test('hard difficulty + perfect time + 5-streak in arcade', () => {
      const result = calculateScore(true, 'hard', 'arcade', 20000, 20000, 4);
      // basePoints = 200
      // multiplier = 0.5 + 0.5*1 = 1
      // timedScore = 200 * 1 = 200
      // streakBonus = 50 (at 5-streak)
      // points = 200 + 50 = 250
      expect(result.points).toBe(250);
      expect(result.newStreak).toBe(5);
    });

    test('easy difficulty + no time + no streak in pro', () => {
      const result = calculateScore(true, 'easy', 'pro', 0, 20000);
      // basePoints = 50
      // multiplier = 0 + 1*0 = 0
      // timedScore = 50 * 0 = 0
      // streakBonus = 0 (newStreak = 1)
      // points = 0
      expect(result.points).toBe(0);
      expect(result.newStreak).toBe(1);
    });

    test('medium difficulty + casual mode always full points', () => {
      const result = calculateScore(true, 'medium', 'casual', 5000, 20000, 2);
      // basePoints = 150
      // multiplier = 1 (casual always 1)
      // timedScore = 150
      // streakBonus = 0 (3-streak triggers after, so now 3)
      // Actually, streak calculation is AFTER the answer, so newStreak = 3, bonus = 20
      // points = 150 + 20 = 170
      expect(result.points).toBe(170);
    });
  });

  // ── Tests: Edge Cases and Defaults ───────────────────────────────────────

  describe('edge cases and defaults', () => {
    test('missing currentStreak defaults to 0', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000);
      expect(result.newStreak).toBe(1);
    });

    test('invalid gameMode defaults to arcade', () => {
      const result = calculateScore(true, 'standard', 'invalid', 10000, 20000);
      // arcade mode: 100 * (0.5 + 0.5*0.5) = 75
      expect(result.points).toBe(75);
    });

    test('returns all required properties', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000, 0);
      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('newStreak');
      expect(result).toHaveProperty('basePoints');
      expect(result).toHaveProperty('streakBonus');
      expect(result).toHaveProperty('penalty');
    });

    test('points are integers (rounded)', () => {
      const result = calculateScore(true, 'standard', 'arcade', 10000, 20000);
      expect(Number.isInteger(result.points)).toBe(true);
    });
  });
});
=======
/**
 * Tests for the LocalFlux Scoring Engine
 * 
 * Validates the calculateScore function with comprehensive test coverage
 * including edge cases, all host modes, and difficulty levels.
 */

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
      expect(result.finalScore).toBe(1000); // 1000 * 1.0 multiplier
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
      expect(result.timeBonus).toBe(500); // Capped at max bonus
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
      expect(result.finalScore).toBe(1500); // (1000 + 500) * 1.0
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
      expect(result.finalScore).toBe(1200); // Math.floor((1000 + 500) * 0.8)
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
      expect(result.finalScore).toBe(1875); // Math.floor((1000 + 500) * 1.25)
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
      expect(result.finalScore).toBe(2500); // (2000 + 500) * 1.0
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
      expect(result.finalScore).toBe(1400); // Math.floor((1500 + 250) * 0.8)
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
      expect(result.finalScore).toBe(3125); // Math.floor((2000 + 500) * 1.25)
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
      expect(result.baseScore).toBe(1000); // Default
      expect(result.multiplier).toBe(0); // Both flags false
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
      expect(result.finalScore).toBe(1250); // (1000 + 250) * 1.0
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
      expect(result.finalScore).toBe(1000); // 1000 * 1.0
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
      expect(result.multiplier).toBe(1.0); // Casual exact match
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
      // arcade is aliased to moderate, which has 1.0x for exact match
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
>>>>>>> b9f99c9 (feat(scoring): implement and wire robust calculateScore engine)
