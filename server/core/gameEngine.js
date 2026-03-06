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

/**
 * Start a game in the given room.
 * Mutates room.status, room.currentQ, room.answersIn.
 *
 * @param {object} room      - Room object from roomStore
 * @param {object[]} questions - Full QUESTIONS array from the loaded deck
 * @returns {{ question: object, index: number, total: number }}
 */
function startGame(room, questions) {
  if (room.status !== 'lobby') throw new Error('Game is already in progress.');
  if (room.players.length === 0) throw new Error('Need at least one player.');

  room.status = 'started';
  room.currentQ = 0;
  room.answersIn = {};

  return {
    question: sanitizeQuestion(questions[0]),
    index: 0,
    total: questions.length,
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
function submitAnswer(room, questions, socketId, answer) {
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

  const q = questions[room.currentQ];
  const correct = answer === q.correct_answer;

  if (correct) {
    const player = room.players.find((p) => p.id === socketId);
    if (player) player.score += 100;
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
function advanceQuestion(room, questions) {
  if (room.status !== 'started') throw new Error('Game is not in progress.');

  const prevQ = questions[room.currentQ];
  const result = {
    correct_answer: prevQ.correct_answer,
    scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
  };

  room.currentQ += 1;
  room.answersIn = {};

  if (room.currentQ >= questions.length) {
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
      question: sanitizeQuestion(questions[room.currentQ]),
      index: room.currentQ,
      total: questions.length,
    },
    gameOver: null,
  };
}

module.exports = { startGame, submitAnswer, advanceQuestion };
