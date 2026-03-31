'use strict';

/**
 * @typedef {'easy'|'medium'|'hard'|string|null|undefined} Difficulty
 */

/**
 * @typedef {'casual'|'moderate'|'pro'|'arcade'|string|null|undefined} HostMode
 */

/**
 * @typedef {object} CalculateScoreParams
 * @property {Difficulty} difficulty
 * @property {HostMode} hostMode
 * @property {number} timeRemaining
 * @property {number} totalTime
 * @property {boolean} isExactMatch
 * @property {boolean} isFuzzyMatch
 */

/**
 * @typedef {object} ScoreBreakdown
 * @property {number} baseScore
 * @property {number} timeBonus
 * @property {number} multiplier
 * @property {number} finalScore
 */

const BASE_BY_DIFFICULTY = {
  easy: 1000,
  medium: 1500,
  hard: 2000,
};

const MULTIPLIERS = {
  casual: { exact: 1.0, fuzzy: 0.8 },
  moderate: { exact: 1.0, fuzzy: 0.0 },
  pro: { exact: 1.25, fuzzy: 0.0 },
};

function normalizeHostMode(mode) {
  const normalized = String(mode || 'casual').trim().toLowerCase();
  if (normalized === 'arcade') return 'moderate'; // Backward compatibility.
  if (normalized === 'casual' || normalized === 'moderate' || normalized === 'pro') return normalized;
  return 'casual';
}

function getBaseScore(difficulty) {
  const normalized = String(difficulty || 'easy').trim().toLowerCase();
  return BASE_BY_DIFFICULTY[normalized] || BASE_BY_DIFFICULTY.easy;
}

function getAccuracyMultiplier(hostMode, isExactMatch, isFuzzyMatch) {
  if (isExactMatch) return MULTIPLIERS[hostMode].exact;
  if (isFuzzyMatch) return MULTIPLIERS[hostMode].fuzzy;
  return 0;
}

function clampRatio(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function calculateLegacyScore(correct, hostMode, timeRemainingMs, totalTimeMs, currentStreak) {
  const mode = normalizeHostMode(hostMode);
  const safeTotal = Number.isFinite(Number(totalTimeMs)) ? Number(totalTimeMs) : 0;
  const safeRemaining = Math.max(0, Number.isFinite(Number(timeRemainingMs)) ? Number(timeRemainingMs) : 0);
  const ratio = safeTotal > 0 ? clampRatio(safeRemaining / safeTotal) : 1;
  const streak = Math.max(0, Number(currentStreak) || 0);

  if (!correct) {
    return {
      points: mode === 'pro' ? -50 : 0,
      newStreak: 0,
      baseScore: 0,
      timeBonus: 0,
      multiplier: 0,
      finalScore: mode === 'pro' ? -50 : 0,
    };
  }

  const basePoints = 50 + Math.round(50 * ratio);
  const newStreak = streak + 1;
  const streakBonus = Math.max(0, (newStreak - 1) * 10);
  const points = basePoints + streakBonus;

  return {
    points,
    newStreak,
    baseScore: basePoints,
    timeBonus: streakBonus,
    multiplier: 1,
    finalScore: points,
  };
}

/**
 * Calculates LocalFlux score using base difficulty, time bonus, and host-mode multiplier.
 *
 * Formula: floor((base + (timeRemaining / totalTime) * 500) * multiplier)
 *
 * @param {CalculateScoreParams} params
 * @returns {ScoreBreakdown}
 */
function calculateScore(params) {
  // Backward compatibility for legacy positional signature:
  // calculateScore(correct, difficulty, hostMode, timeRemainingMs, totalTimeMs, currentStreak)
  if (arguments.length > 1 || (params !== undefined && (typeof params !== 'object' || params === null))) {
    const [correct, _difficulty, hostMode, timeRemainingMs, totalTimeMs, currentStreak] = arguments;
    return calculateLegacyScore(Boolean(correct), hostMode, timeRemainingMs, totalTimeMs, currentStreak);
  }

  const {
    difficulty,
    hostMode,
    timeRemaining,
    totalTime,
    isExactMatch,
    isFuzzyMatch,
  } = params || {};

  const safeMode = normalizeHostMode(hostMode);
  const baseScore = getBaseScore(difficulty);
  const safeTotalTime = Number.isFinite(Number(totalTime)) ? Number(totalTime) : 0;
  const safeRemaining = Math.max(0, Number.isFinite(Number(timeRemaining)) ? Number(timeRemaining) : 0);

  const ratio = safeTotalTime > 0 ? Math.max(0, Math.min(1, safeRemaining / safeTotalTime)) : 0;
  const timeBonus = ratio * 500;
  const multiplier = getAccuracyMultiplier(safeMode, Boolean(isExactMatch), Boolean(isFuzzyMatch));
  const finalScore = Math.floor((baseScore + timeBonus) * multiplier);

  return {
    baseScore,
    timeBonus,
    multiplier,
    finalScore,
  };
}

module.exports = {
  calculateScore
};
