'use strict';

const { evaluateTypeGuess } = require('../services/typeGuessMatcher');
const { MODE_CONFIG } = require('../config/scoringPolicy');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseSubmittedIndex(answer) {
  if (typeof answer === 'number' && Number.isInteger(answer)) return answer;

  const asNumber = Number(answer);
  if (Number.isInteger(asNumber) && String(answer).trim() !== '') return asNumber;

  return null;
}

function isMcqCorrect(slide, answer) {
  const options = Array.isArray(slide?.options) ? slide.options : [];
  const correctIndex = Number(slide?.correctIndex);

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) return false;

  const submittedIndex = parseSubmittedIndex(answer);
  if (submittedIndex !== null) return submittedIndex === correctIndex;

  const submittedText = normalizeText(answer);
  const correctText = normalizeText(options[correctIndex]);
  return submittedText.length > 0 && submittedText === correctText;
}

function buildAcceptedAnswers(slide) {
  const explicit = Array.isArray(slide?.acceptedAnswers) ? slide.acceptedAnswers : [];
  if (explicit.length > 0) return explicit;

  const fromSlide = [];
  if (slide?.correct_answer) fromSlide.push(slide.correct_answer);
  if (Array.isArray(slide?.fuzzy_allowances)) fromSlide.push(...slide.fuzzy_allowances);
  return fromSlide;
}

/**
 * Validates a submitted answer against a slide, considering the game mode for fuzzy thresholds.
 * 
 * @param {object} slide - The current question slide
 * @param {string|number} answer - The submitted answer
 * @param {string} gameMode - 'casual', 'arcade', 'pro'
 * 
 * @returns {{ correct: boolean, matchType: string|null, score: number, reason: string }}
 */
function validateAnswer(slide, answer, gameMode = 'arcade') {
  if (!slide) return { correct: false, matchType: null, score: 0, reason: 'no_slide' };

  const type = String(slide.answer_mode === 'type_guess' ? 'typing' : 'mcq').trim().toLowerCase();

  if (type === 'mcq') {
    const isCorrect = isMcqCorrect(slide, answer);
    return {
      correct: isCorrect,
      matchType: isCorrect ? 'exact' : null,
      score: isCorrect ? 1 : 0,
      reason: isCorrect ? 'exact' : 'no_match'
    };
  } else {
    // Typing validation
    const safeMode = MODE_CONFIG[gameMode] ? gameMode : 'arcade';
    const config = MODE_CONFIG[safeMode];

    const acceptedAnswers = buildAcceptedAnswers(slide);
    const result = evaluateTypeGuess({
      guessText: String(answer || ''),
      acceptedAnswers,
      threshold: config.fuzzyThreshold
    });

    return {
      correct: result.matched,
      matchType: result.matchType,
      score: result.score,
      reason: result.reason
    };
  }
}

module.exports = {
  validateAnswer,
  buildAcceptedAnswers
};
