/**
 * handlers.js
 *
 * Socket.IO event handlers — the thin wiring layer between the network and
 * the game engine.  Each handler validates ownership / state then delegates
 * all mutations to core modules.
 */

'use strict';

const {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  findHostPin,
} = require('../core/roomStore');

const { startGame, submitAnswer, advanceQuestion } = require('../core/gameEngine');

/**
 * Register all game event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {object[]} questions - Pre-loaded QUESTIONS array from the deck
 */
function registerHandlers(socket, io, questions) {
  // ── create_room ─────────────────────────────────────────────────────────
  socket.on('create_room', ({ roomName }, callback) => {
    if (!roomName || !roomName.trim()) {
      return callback({ success: false, error: 'Room name is required.' });
    }
    const pin = createRoom(roomName.trim(), socket.id);
    socket.join(pin);
    console.log(`[Room] "${roomName}" created — PIN: ${pin}`);
    callback({ success: true, pin });
  });

  // ── join_room ────────────────────────────────────────────────────────────
  socket.on('join_room', ({ playerName, pin }, callback) => {
    const room = getRoom(pin);
    if (!room) {
      return callback({ success: false, error: 'Room not found. Check your PIN.' });
    }
    if (room.status !== 'lobby') {
      return callback({ success: false, error: 'Game already in progress.' });
    }

    addPlayer(pin, { id: socket.id, name: playerName });
    socket.join(pin);
    console.log(`[Join] "${playerName}" → PIN ${pin}`);

    io.to(pin).emit('player_joined', { players: room.players });
    callback({ success: true, roomName: room.roomName });
  });

  // ── start_game ───────────────────────────────────────────────────────────
  socket.on('start_game', ({ pin }, callback) => {
    const room = getRoom(pin);
    if (!room) return callback({ success: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return callback({ success: false, error: 'Only the host can start.' });

    try {
      const firstQ = startGame(room, questions);
      console.log(`[Game] PIN ${pin} started with ${room.players.length} player(s).`);
      io.to(pin).emit('game_started', { pin, roomName: room.roomName });
      io.to(pin).emit('next_question', firstQ);
      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ── submit_answer ────────────────────────────────────────────────────────
  socket.on('submit_answer', ({ pin, answer }, callback) => {
    const room = getRoom(pin);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const result = submitAnswer(room, questions, socket.id, answer);
    console.log(`[Answer] PIN ${pin} Q${room.currentQ} — "${answer}" (${result.correct ? 'correct' : 'wrong'})`);

    if (result.alreadyAnswered) {
      return callback?.({ success: false, error: 'Already answered.' });
    }

    callback?.({ success: true, correct: result.correct });

    io.to(room.hostId).emit('answer_count', {
      count: result.answerCount,
      total: result.totalPlayers,
    });
  });

  // ── next_question (host advances) ────────────────────────────────────────
  socket.on('next_question', ({ pin }, callback) => {
    const room = getRoom(pin);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only the host can advance.' });

    try {
      const { result, next, gameOver } = advanceQuestion(room, questions);

      io.to(pin).emit('question_result', result);

      if (gameOver) {
        io.to(pin).emit('game_over', gameOver);
        deleteRoom(pin);
        console.log(`[Game] PIN ${pin} finished. Room deleted.`);
        return callback?.({ success: true, done: true });
      }

      io.to(pin).emit('next_question', next);
      callback?.({ success: true, done: false });
    } catch (err) {
      callback?.({ success: false, error: err.message });
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    const hostPin = findHostPin(socket.id);
    if (hostPin) {
      io.to(hostPin).emit('room_closed', { message: 'Host disconnected.' });
      deleteRoom(hostPin);
      console.log(`[Room] PIN ${hostPin} destroyed (host left).`);
      return;
    }

    const playerPin = removePlayer(socket.id);
    if (playerPin) {
      const room = getRoom(playerPin);
      if (room) {
        io.to(playerPin).emit('player_joined', { players: room.players });
      }
    }
  });
}

module.exports = { registerHandlers };
