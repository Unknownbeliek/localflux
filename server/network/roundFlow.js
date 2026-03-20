'use strict';

function createRoundFlow({
  io,
  LAN_ROOM_ID,
  withQuestionTiming,
  getRoom,
  deleteRoom,
  advanceQuestion,
  markRoomClosed,
  clearTimerByRoom,
  clearRoundTimers,
  questionTimeoutTimers,
  roundLockTimers,
  roundTransitionTimers,
  roundLockDelayMs,
  roundTransitionDelayMs,
}) {
  const emitNextQuestionForRound = (room, nextQuestionPayload) => {
    const timedPayload = withQuestionTiming(nextQuestionPayload);
    room.roundSettled = false;
    room.roundId = Number(room.roundId || 0) + 1;

    io.to(LAN_ROOM_ID).emit('next_question', timedPayload);

    clearTimerByRoom(questionTimeoutTimers, LAN_ROOM_ID);
    const expectedRoundId = room.roundId;
    const expectedQuestionIndex = Number(room.currentQ);
    const timeoutMs = Number(timedPayload.durationMs) > 0 ? Number(timedPayload.durationMs) : 20000;

    const timeoutHandle = setTimeout(() => {
      const liveRoom = getRoom();
      if (!liveRoom || liveRoom.status !== 'started') return;
      if (Number(liveRoom.roundId || 0) !== Number(expectedRoundId)) return;
      if (Number(liveRoom.currentQ) !== Number(expectedQuestionIndex)) return;
      settleCurrentRound({ reason: 'timeout' });
    }, timeoutMs);

    questionTimeoutTimers.set(LAN_ROOM_ID, timeoutHandle);
  };

  const settleCurrentRound = ({ reason = 'timeout', callback } = {}) => {
    const room = getRoom();
    if (!room) {
      callback?.({ success: false, error: 'Room not found.' });
      return false;
    }

    if (room.status !== 'started') {
      callback?.({ success: false, error: 'Game is not in progress.' });
      return false;
    }

    if (room.roundSettled) {
      callback?.({ success: true, alreadySettled: true });
      return false;
    }

    const lockedQuestionIndex = Number(room.currentQ);
    const lockedRoundId = Number(room.roundId || 0);
    room.roundSettled = true;

    clearTimerByRoom(questionTimeoutTimers, LAN_ROOM_ID);

    io.to(LAN_ROOM_ID).emit('round:locked', {
      reason,
      questionIndex: lockedQuestionIndex,
      lockMs: roundLockDelayMs,
      answersReceived: Object.keys(room.answersIn || {}).length,
      totalPlayers: Array.isArray(room.players) ? room.players.length : 0,
    });

    clearTimerByRoom(roundLockTimers, LAN_ROOM_ID);
    const lockTimer = setTimeout(() => {
      const liveRoom = getRoom();
      if (!liveRoom || liveRoom.status !== 'started') return;
      if (Number(liveRoom.currentQ) !== lockedQuestionIndex) return;
      if (Number(liveRoom.roundId || 0) !== lockedRoundId) return;

      const liveQuestions = Array.isArray(liveRoom.questions) ? liveRoom.questions : [];

      try {
        const { result, next, gameOver } = advanceQuestion(liveRoom, liveQuestions);
        io.to(LAN_ROOM_ID).emit('question_result', result);

        if (gameOver) {
          io.to(LAN_ROOM_ID).emit('game_over', gameOver);
          markRoomClosed('ended');
          clearRoundTimers(LAN_ROOM_ID);
          deleteRoom();
          console.log('[Game] LAN_ROOM finished. Room deleted.');
          return;
        }

        io.to(LAN_ROOM_ID).emit('round:transition', {
          nextInMs: roundTransitionDelayMs,
          nextQuestion: Number(next.index) + 1,
          totalQuestions: Number(next.total),
        });

        clearTimerByRoom(roundTransitionTimers, LAN_ROOM_ID);
        const transitionTimer = setTimeout(() => {
          const pendingRoom = getRoom();
          if (!pendingRoom || pendingRoom.status !== 'started') return;
          if (Number(pendingRoom.currentQ) !== Number(next.index)) return;
          emitNextQuestionForRound(pendingRoom, next);
        }, roundTransitionDelayMs);

        roundTransitionTimers.set(LAN_ROOM_ID, transitionTimer);
      } catch (err) {
        console.error('[Game] Round settle failed:', err.message);
      }
    }, roundLockDelayMs);

    roundLockTimers.set(LAN_ROOM_ID, lockTimer);
    callback?.({ success: true, queued: true });
    return true;
  };

  return { emitNextQuestionForRound, settleCurrentRound };
}

module.exports = { createRoundFlow };
