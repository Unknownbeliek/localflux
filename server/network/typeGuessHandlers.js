'use strict';

const { validateAnswer } = require('../core/answerValidation');
const { calculateScore } = require('../core/scoringEngine');
const { MAX_GUESS_LENGTH } = require('../config/typeGuessPolicy');

function registerTypeGuessHandlers({ socket, io, getRoom, LAN_ROOM_ID, settleCurrentRound, getChatMode }) {
  socket.on('player:chat_guess', ({ text } = {}, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.status !== 'started') return callback?.({ ok: false, reason: 'game_not_started' });
    const currentQ = room.activeSlide;
    if (!currentQ) return callback?.({ ok: false, reason: 'question_not_found' });
    
    if (currentQ.answer_mode !== 'type_guess') {
      return callback?.({ ok: false, reason: 'type_guess_disabled' });
    }

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return callback?.({ ok: false, reason: 'player_not_found' });

    if (Object.prototype.hasOwnProperty.call(room.answersIn || {}, socket.id)) {
      return callback?.({ ok: false, reason: 'already_answered' });
    }

    const rawGuess = String(text || '').trim().slice(0, MAX_GUESS_LENGTH);
    if (!rawGuess) return callback?.({ ok: false, reason: 'empty_guess' });

    const gameMode = room.gameMode || 'arcade';
    const validationResult = validateAnswer(currentQ, rawGuess, gameMode);

    if (validationResult.correct) {
      const timeRemainingMs = Math.max(0, (room.currentQEndsAt || Date.now()) - Date.now());
      const totalTimeMs = Number(currentQ.timeLimit) > 0 ? Number(currentQ.timeLimit) : 20000;
      const currentStreak = player.streak || 0;
      
      const scoreResult = calculateScore(true, currentQ.difficulty, gameMode, timeRemainingMs, totalTimeMs, currentStreak);
      
      player.score = Number(player.score || 0) + scoreResult.points;
      player.streak = scoreResult.newStreak;
      room.answersIn[socket.id] = rawGuess;
      
      const answerCount = Object.keys(room.answersIn || {}).length;
      const totalPlayers = Array.isArray(room.players) ? room.players.length : 0;

      io.to(LAN_ROOM_ID).emit('chat:message', {
        from: 'system',
        name: 'System',
        text: `${player.name} guessed correctly! +${scoreResult.points} pts`,
        event: 'guess_correct',
        ts: Date.now(),
      });

      io.to(room.hostId).emit('host:guess_match', {
        playerId: socket.id,
        playerName: player.name,
        matchType: validationResult.matchType,
        similarityScore: validationResult.score,
        questionIndex: Number(room.currentQ),
        answerCount,
        totalPlayers,
        ts: Date.now(),
      });

      callback?.({
        ok: true,
        matched: true,
        matchType: validationResult.matchType,
        submitted: true,
        scoreAwarded: scoreResult.points,
      });

      io.to(room.hostId).emit('answer_count', {
        count: answerCount,
        total: totalPlayers,
      });

      if (!room.roundSettled && totalPlayers > 0 && answerCount >= totalPlayers) {
        settleCurrentRound({ reason: 'all_answered' });
      }

      return;
    } else {
      // Wrong answer - apply penalty if configured
      const timeRemainingMs = Math.max(0, (room.currentQEndsAt || Date.now()) - Date.now());
      const totalTimeMs = Number(currentQ.timeLimit) > 0 ? Number(currentQ.timeLimit) : 20000;
      const currentStreak = player.streak || 0;
      
      const scoreResult = calculateScore(false, currentQ.difficulty, gameMode, timeRemainingMs, totalTimeMs, currentStreak);
      
      if (scoreResult.penalty < 0) {
        player.score = Math.max(0, Number(player.score || 0) + scoreResult.penalty);
        player.streak = scoreResult.newStreak;
        
        io.to(LAN_ROOM_ID).emit('chat:message', {
          from: 'system',
          name: 'System',
          text: `${player.name} got a wrong answer penalty: ${scoreResult.penalty} pts`,
          event: 'guess_penalty',
          ts: Date.now(),
        });
      }
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

    return callback?.({ ok: true, matched: false, submitted: false, reason: validationResult.reason, score: validationResult.score });
  });
}

module.exports = {
  registerTypeGuessHandlers,
};
