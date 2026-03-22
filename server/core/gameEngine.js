/**
 * gameEngine.js
 *
 * Pure game-logic functions.  Nothing here touches sockets or HTTP — it only
 * mutates the room object and returns structured result data that the handler
 * layer can broadcast.
 *
 * All functions throw descriptive Error objects on invalid input so handlers
 * can surface meaningful messages to clients.
 */

'use strict';

const { sanitizeQuestion } = require('./deckLoader');
const { shuffle } = require('./shuffle');

function applyModeToSlide(slide, mode) {
  if (!slide) return null;
  const cloned = JSON.parse(JSON.stringify(slide));
  const defaultMode = cloned.type === 'typing' ? 'type_guess' : 'multiple_choice';
  const targetMode = mode === 'auto' || !mode ? defaultMode : mode;

  cloned.answer_mode = targetMode;

  if (targetMode === 'multiple_choice' && cloned.type === 'typing') {
    const correctLabel = cloned.acceptedAnswers && cloned.acceptedAnswers[0] ? cloned.acceptedAnswers[0] : 'Correct Answer';
    let distractors = (cloned.suggestionBank || []).filter((s) => normalizeText(s) !== normalizeText(correctLabel));
    
    if (distractors.length < 3) {
      const backups = ['A', 'B', 'C', 'D'].filter((x) => normalizeText(x) !== normalizeText(correctLabel));
      while (distractors.length < 3) distractors.push(backups.shift() || 'Unknown');
    }
    distractors = distractors.slice(0, 3);
    
    const unselected = shuffle([correctLabel, ...distractors]);
    cloned.options = unselected;
    cloned.correctIndex = unselected.findIndex((opt) => opt === correctLabel);
  } else if (targetMode === 'type_guess' && cloned.type === 'mcq') {
    const correctIndex = Number(cloned.correctIndex);
    const correctText = Array.isArray(cloned.options) && correctIndex >= 0 ? cloned.options[correctIndex] : 'Correct Answer';
    cloned.acceptedAnswers = [correctText];
    cloned.suggestionBank = Array.isArray(cloned.options) ? [...cloned.options] : [];
  }

  return cloned;
}

const { validateAnswer } = require('./answerValidation');
const { calculateScore } = require('./scoringEngine');

/**
 * Start a game in the given room.
 * Mutates room.status, room.currentQ, room.answersIn.
 *
 * @param {object} room      - Room object from roomStore
 * @param {object[]} slides - Full QUESTIONS array from the loaded deck
 * @returns {{ question: object, index: number, total: number }}
 */
function startGame(room, slides) {
  if (room.status !== 'lobby') throw new Error('Game is already in progress.');
  if (room.players.length === 0) throw new Error('Need at least one player.');

  room.status = 'started';
  room.currentQ = 0;
  room.answersIn = {};

  const transformedSlide = applyModeToSlide(slides[0], room.answerMode);
  room.activeSlide = transformedSlide;

  return {
    question: sanitizeQuestion(transformedSlide),
    index: 0,
    total: slides.length,
  };
}

/**
 * Record a player's answer for the current question.
 *
 * @param {object} room
 * @param {object[]} slides
 * @param {string} socketId
 * @param {string} answer
 * @param {number} timeRemainingMs
 * @param {number} totalTimeMs
 * @param {string} gameMode
 * @returns {{ correct: boolean, alreadyAnswered: boolean, answerCount: number, totalPlayers: number, pointsAwarded: number, matchDetails: object }}
 */
function submitAnswer(room, slides, socketId, answer, timeRemainingMs = 0, totalTimeMs = 20000, gameMode = 'arcade') {
  if (room.status !== 'started') {
    return { correct: false, alreadyAnswered: false, answerCount: 0, totalPlayers: room.players.length, pointsAwarded: 0 };
  }

  if (room.answersIn[socketId] !== undefined) {
    return {
      correct: false,
      alreadyAnswered: true,
      answerCount: Object.keys(room.answersIn).length,
      totalPlayers: room.players.length,
      pointsAwarded: 0
    };
  }

  const slide = room.activeSlide || slides[room.currentQ];
  const player = room.players.find((p) => p.id === socketId);
  const currentStreak = player ? (player.streak || 0) : 0;
  
  const validationResult = validateAnswer(slide, answer, gameMode);
  const correct = validationResult.correct;

  let pointsAwarded = 0;
  
  if (player) {
    const slideDifficulty = slide?.difficulty || 'standard';
    const scoreResult = calculateScore(correct, slideDifficulty, gameMode, timeRemainingMs, totalTimeMs, currentStreak);
    
    player.score = (player.score || 0) + scoreResult.points;
    player.streak = scoreResult.newStreak;
    pointsAwarded = scoreResult.points;
  }

  room.answersIn[socketId] = answer;

  return {
    correct,
    alreadyAnswered: false,
    answerCount: Object.keys(room.answersIn).length,
    totalPlayers: room.players.length,
    pointsAwarded,
    matchDetails: validationResult
  };
}

/**
 * Advance the game to the next question (or end it).
 * Returns the data needed to broadcast question_result and then either
 * next_question or game_over.
 *
 * @param {object} room
 * @param {object[]} questions
 * @returns {{
 *   result: { correct_answer: string, scores: Array<{name,score}> },
 *   next: { question: object, index: number, total: number } | null,
 *   gameOver: { scores: Array<{name,score}> } | null,
 * }}
 */
function advanceQuestion(room, slides) {
  if (room.status !== 'started') throw new Error('Game is not in progress.');
  if (room.currentQ >= slides.length) throw new Error('Game is already finished.');

  const prevSlide = room.activeSlide || slides[room.currentQ];
  const prevType = String(prevSlide?.answer_mode === 'type_guess' ? 'typing' : 'mcq').trim().toLowerCase();
  let reveal = null;

  if (prevType === 'typing') {
    const accepted = Array.isArray(prevSlide?.acceptedAnswers) ? prevSlide.acceptedAnswers : [];
    reveal = accepted[0] || '';
  } else {
    const options = Array.isArray(prevSlide?.options) ? prevSlide.options : [];
    const correctIndex = Number(prevSlide?.correctIndex);
    reveal = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length ? options[correctIndex] : '';
  }

  const result = {
    correct_answer: reveal,
    scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
  };

  room.currentQ += 1;
  room.answersIn = {};

  if (room.currentQ >= slides.length) {
    room.status = 'finished';
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    return {
      result,
      next: null,
      gameOver: {
        scores: sorted.map((p) => ({ id: p.id, name: p.name, score: p.score })),
      },
    };
  }

  const transformedSlide = applyModeToSlide(slides[room.currentQ], room.answerMode);
  room.activeSlide = transformedSlide;

  return {
    result,
    next: {
      question: sanitizeQuestion(transformedSlide),
      index: room.currentQ,
      total: slides.length,
    },
    gameOver: null,
  };
}

module.exports = { startGame, submitAnswer, advanceQuestion };
