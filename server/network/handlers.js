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
const { ChatManager } = require('../core/chatManager');

let chatInstance = null;

/**
 * Register all game event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {object[]} questions - Pre-loaded QUESTIONS array from the deck
 */
function registerHandlers(socket, io, questions) {
  // create ChatManager singleton when first socket connects
  if (!chatInstance) {
    chatInstance = new ChatManager(io);
  }

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

  // attach chat listeners
  socket.on('chat:free', (payload, ack) => chatInstance.handleEvent(socket, 'chat:free', payload, ack));
  socket.on('chat:pre', (payload, ack) => chatInstance.handleEvent(socket, 'chat:pre', payload, ack));

  // host moderation events
  socket.on('chat:host_mute', ({ target }, callback) => {
    const pin = findHostPin(socket.id);
    if (!pin) return callback?.({ ok: false, reason: 'not_host' });
    const room = getRoom(pin);
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.mute(target);
    io.to(pin).emit('chat:moderation', { action: 'mute', target });
    callback?.({ ok: true });
  });

  socket.on('chat:host_unmute', ({ target }, callback) => {
    const pin = findHostPin(socket.id);
    if (!pin) return callback?.({ ok: false, reason: 'not_host' });
    const room = getRoom(pin);
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.unmute(target);
    io.to(pin).emit('chat:moderation', { action: 'unmute', target });
    callback?.({ ok: true });
  });

  // host sets chat mode (OFF | FREE | RESTRICTED) and optional allowed messages
  socket.on('chat:host_set_mode', ({ pin: p, mode, allowed }, callback) => {
    const pin = p || findHostPin(socket.id);
    if (!pin) return callback?.({ ok: false, reason: 'not_host' });
    const room = getRoom(pin);
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    try {
      if (mode === 'RESTRICTED' && Array.isArray(allowed)) {
        // server-side validation: limit count and text length
        const MAX_ALLOWED = 24;
        const MAX_TEXT_LEN = 120;
        const validated = [];
        for (const a of allowed.slice(0, MAX_ALLOWED)) {
          const tid = String(a.id || `c_${Date.now().toString(36)}`);
          const txt = String(a.text || '').trim().slice(0, MAX_TEXT_LEN);
          if (txt.length === 0) continue;
          validated.push({ id: tid, text: txt });
        }
        if (validated.length === 0) return callback?.({ ok: false, reason: 'no_valid_allowed' });
        chatInstance.allowed = validated;
      }
      chatInstance.setMode(mode);
      io.to(pin).emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, reason: err.message });
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    // cleanup chat state
    if (chatInstance) chatInstance.onDisconnect(socket.id);

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
