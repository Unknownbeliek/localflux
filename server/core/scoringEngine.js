'use strict';

const { DIFFICULTY_POINTS, MODE_CONFIG, STREAK_BONUSES } = require('../config/scoringPolicy');

/**
 * Calculates the score for a given answer based on difficulty, time taken, game mode, and current streak.
 * 
 * @param {boolean} isCorrect - Whether the user's answer was validated as correct
 * @param {string} difficulty - 'easy', 'standard', 'medium', 'hard' (defaults to standard)
 * @param {string} gameMode - 'casual', 'arcade', 'pro' (defaults to arcade)
 * @param {number} timeRemainingMs - Time left in the question when answered
 * @param {number} totalTimeMs - Total time limit for the question
 * @param {number} currentStreak - The player's current consecutive correct answers BEFORE this answer
 * 
 * @returns {{ points: number, newStreak: number, basePoints: number, streakBonus: number, penalty: number }}
 */
function calculateScore(isCorrect, difficulty, gameMode, timeRemainingMs, totalTimeMs, currentStreak = 0) {
  const safeDiff = typeof difficulty === 'string' && DIFFICULTY_POINTS[difficulty] ? difficulty : 'standard';
  const basePoints = DIFFICULTY_POINTS[safeDiff];

  const safeMode = typeof gameMode === 'string' && MODE_CONFIG[gameMode] ? gameMode : 'arcade';
  const config = MODE_CONFIG[safeMode];

  let points = 0;
  let newStreak = isCorrect ? currentStreak + 1 : 0;
  let streakBonus = 0;
  let penalty = 0;

  if (isCorrect) {
    // 1. Calculate time decay multiplier
    // Clamp the ratio between 0 and 1 to be safe against negative / oversized times
    const ratioRaw = totalTimeMs > 0 ? timeRemainingMs / totalTimeMs : 0;
    const ratio = Math.max(0, Math.min(1, ratioRaw));

    // multiplier = floor + (1 - floor) * ratio
    const multiplier = config.decayFloor + (1 - config.decayFloor) * ratio;
    
    // 2. Base score with time decay
    const timedScore = Math.round(basePoints * multiplier);

    // 3. Streak bonus calculation
    for (const tier of STREAK_BONUSES) {
      if (newStreak >= tier.min) {
        streakBonus = tier.bonus;
        break; // STREAK_BONUSES is sorted descending by min
      }
    }

    points = timedScore + streakBonus;
  } else {
    // Handling wrong answers
    if (config.penalty !== 0) {
      penalty = Math.round(basePoints * config.penalty);
      points = penalty; // This will return a negative number
    }
  }

  return {
    points,
    newStreak,
    basePoints,
    streakBonus,
    penalty
  };
}

module.exports = {
  calculateScore
};
