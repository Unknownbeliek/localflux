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

function isTypingCorrect(slide, answer) {
  const accepted = Array.isArray(slide?.acceptedAnswers) ? slide.acceptedAnswers : [];
  const submitted = normalizeText(answer);
  if (!submitted) return false;

  return accepted.some((item) => normalizeText(item) === submitted);
}

function calculateScoreForCorrect(slide) {
  const raw = Number(slide?.timeLimit);
  const safe = Number.isFinite(raw) && raw > 0 ? raw : 20000;
  const derived = Math.round(safe / 200); // 20s => 100
  return Math.max(50, Math.min(300, derived));
}

/**
 * Start a game in the given room.
 * Mutates room.status, room.currentQ, room.answersIn.
 *
 * @param {object} room      - Room object from roomStore
 * @param {object[]} questions - Full QUESTIONS array from the loaded deck
 * @returns {{ question: object, index: number, total: number }}
 */
function startGame(room, slides) {
  if (room.status !== 'lobby') throw new Error('Game is already in progress.');
  if (room.players.length === 0) throw new Error('Need at least one player.');

  room.status = 'started';
  room.currentQ = 0;
  room.answersIn = {};

  return {
    question: sanitizeQuestion(slides[0]),
    index: 0,
    total: slides.length,
  };
}

/**
 * Record a player's answer for the current question.
 * Awards +100 points for the first correct submission per player per round.
 * Idempotent — subsequent calls from the same player are rejected.
 *
 * @param {object} room
 * @param {object[]} questions
 * @param {string} socketId
 * @param {string} answer
 * @returns {{ correct: boolean, alreadyAnswered: boolean, answerCount: number, totalPlayers: number }}
 */
function submitAnswer(room, slides, socketId, answer) {
  if (room.status !== 'started') {
    return { correct: false, alreadyAnswered: false, answerCount: 0, totalPlayers: room.players.length };
  }

  if (room.answersIn[socketId] !== undefined) {
    return {
      correct: false,
      alreadyAnswered: true,
      answerCount: Object.keys(room.answersIn).length,
      totalPlayers: room.players.length,
    };
  }

  const slide = slides[room.currentQ];
  const type = String(slide?.type || 'mcq').trim().toLowerCase();

  let correct = false;
  if (type === 'typing') {
    correct = isTypingCorrect(slide, answer);
  } else {
    correct = isMcqCorrect(slide, answer);
  }

  if (correct) {
    const player = room.players.find((p) => p.id === socketId);
    if (player) player.score += calculateScoreForCorrect(slide);
  }

  room.answersIn[socketId] = answer;

  return {
    correct,
    alreadyAnswered: false,
    answerCount: Object.keys(room.answersIn).length,
    totalPlayers: room.players.length,
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

  const prevSlide = slides[room.currentQ];
  const prevType = String(prevSlide?.type || 'mcq').trim().toLowerCase();
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

  return {
    result,
    next: {
      question: sanitizeQuestion(slides[room.currentQ]),
      index: room.currentQ,
      total: slides.length,
    },
    gameOver: null,
  };
}

module.exports = { startGame, submitAnswer, advanceQuestion };
