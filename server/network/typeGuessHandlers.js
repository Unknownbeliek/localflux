'use strict';

const { evaluateTypeGuess } = require('../services/typeGuessMatcher');
const {
  TYPE_GUESS_THRESHOLD,
  TYPE_GUESS_POINTS,
  MAX_GUESS_LENGTH,
} = require('../config/typeGuessPolicy');

function buildAcceptedAnswers(question) {
  const explicit = Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers : [];
  if (explicit.length > 0) return explicit;

  const fromQuestion = [];
  if (question?.correct_answer) fromQuestion.push(question.correct_answer);
  if (Array.isArray(question?.fuzzy_allowances)) fromQuestion.push(...question.fuzzy_allowances);
  return fromQuestion;
}

function registerTypeGuessHandlers({ socket, io, getRoom, LAN_ROOM_ID, settleCurrentRound, getChatMode }) {
  socket.on('player:chat_guess', ({ text } = {}, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.status !== 'started') return callback?.({ ok: false, reason: 'game_not_started' });
    if ((room.answerMode || 'multiple_choice') !== 'type_guess') {
      return callback?.({ ok: false, reason: 'type_guess_disabled' });
    }

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return callback?.({ ok: false, reason: 'player_not_found' });

    if (Object.prototype.hasOwnProperty.call(room.answersIn || {}, socket.id)) {
      return callback?.({ ok: false, reason: 'already_answered' });
    }

    const rawGuess = String(text || '').trim().slice(0, MAX_GUESS_LENGTH);
    if (!rawGuess) return callback?.({ ok: false, reason: 'empty_guess' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    const currentQ = roomQuestions[Number(room.currentQ)];
    if (!currentQ) return callback?.({ ok: false, reason: 'question_not_found' });

    const acceptedAnswers = buildAcceptedAnswers(currentQ);
    const result = evaluateTypeGuess({
      guessText: rawGuess,
      acceptedAnswers,
      threshold: TYPE_GUESS_THRESHOLD,
    });

    if (result.matched) {
      player.score = Number(player.score || 0) + TYPE_GUESS_POINTS;
      room.answersIn[socket.id] = rawGuess;
      const answerCount = Object.keys(room.answersIn || {}).length;
      const totalPlayers = Array.isArray(room.players) ? room.players.length : 0;

      io.to(LAN_ROOM_ID).emit('chat:message', {
        from: 'system',
        name: 'System',
        text: `${player.name} guessed correctly! +${TYPE_GUESS_POINTS} pts`,
        event: 'guess_correct',
        ts: Date.now(),
      });

      io.to(room.hostId).emit('host:guess_match', {
        playerId: socket.id,
        playerName: player.name,
        matchType: result.matchType,
        similarityScore: result.score,
        questionIndex: Number(room.currentQ),
        answerCount,
        totalPlayers,
        ts: Date.now(),
      });

      callback?.({
        ok: true,
        matched: true,
        matchType: result.matchType,
        submitted: true,
        scoreAwarded: TYPE_GUESS_POINTS,
      });

      io.to(room.hostId).emit('answer_count', {
        count: answerCount,
        total: totalPlayers,
      });

      if (!room.roundSettled && totalPlayers > 0 && answerCount >= totalPlayers) {
        settleCurrentRound({ reason: 'all_answered' });
      }

      return;
    }

    const chatMode = typeof getChatMode === 'function' ? String(getChatMode() || 'FREE') : 'FREE';
    if (chatMode === 'FREE') {
      io.to(LAN_ROOM_ID).emit('chat:message', {
        from: socket.id,
        name: socket.playerName || player.name || 'Player',
        text: rawGuess,
        event: 'guess_miss',
        ts: Date.now(),
      });
    }

    return callback?.({ ok: true, matched: false, submitted: false, reason: result.reason, score: result.score });
  });
}

module.exports = {
  registerTypeGuessHandlers,
};
