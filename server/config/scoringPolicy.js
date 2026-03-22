'use strict';

/**
 * scoringPolicy.js
 * 
 * Defines the economy, game modes, time decay floors, 
 * fuzzy matching thresholds, and streak bonuses for the quiz.
 */

const DIFFICULTY_POINTS = {
  easy: 50,
  standard: 100,
  medium: 150,
  hard: 200,
};

const MODE_CONFIG = {
  casual: {
    decayFloor: 1.0,     // 100% points regardless of time taken
    penalty: 0,          // No penalty for wrong answers
    fuzzyThreshold: 0.65 // Very forgiving (allows 3-4 typos)
  },
  arcade: {
    decayFloor: 0.5,     // Points drop to 50% at t=0
    penalty: 0,          // No penalty for wrong answers
    fuzzyThreshold: 0.85 // Moderate (allows 1-2 typos)
  },
  pro: {
    decayFloor: 0.0,     // Points drop to 0 at t=0
    penalty: -0.5,       // -50% of base points for wrong answers
    fuzzyThreshold: 1.0  // Exact match only (case-insensitive)
  }
};

const STREAK_BONUSES = [
  { min: 5, bonus: 50 },
  { min: 4, bonus: 30 },
  { min: 3, bonus: 20 },
]; // Evaluated top-down, so order strictly by decreasing min

module.exports = {
  DIFFICULTY_POINTS,
  MODE_CONFIG,
  STREAK_BONUSES,
};
