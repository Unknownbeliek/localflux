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

/**
 * Calculates LocalFlux score using base difficulty, time bonus, and host-mode multiplier.
 *
 * Formula: floor((base + (timeRemaining / totalTime) * 500) * multiplier)
 *
 * @param {CalculateScoreParams} params
 * @returns {ScoreBreakdown}
 */
function calculateScore(params) {
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
