/**
 * handlers.js
 *
 * Socket.IO event handlers — the thin wiring layer between the network and
 * the game engine.  Each handler validates ownership / state then delegates
 * all mutations to core modules.
 */

'use strict';

const {
  LAN_ROOM_ID,
  initLanRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  getHostId,
} = require('../core/roomStore');

const { startGame, submitAnswer, advanceQuestion } = require('../core/gameEngine');
const { ChatManager } = require('../core/chatManager');
const { sanitizeQuestion } = require('../core/deckLoader');

let chatInstance = null;
const DEFAULT_AVATAR_OBJECT = { type: 'preset', value: '1.jpg' };
const PRESET_AVATAR_POOL = [
  '1.jpg',
  '2.jpg',
  '4.jpg',
  '5.jpg',
  '11.jpg',
  '15.jpg',
  '16.jpg',
  '18.jpg',
  '19.jpg',
  '21.jpg',
  '22.jpg',
  '23.jpg',
  '7dcc3f3eebc2fccd2f9dd3146c61c914.avf',
  'e55afb4aea57bced165fb55ad92addf5.jpg',
];
const NAME_PREFIXES = ['Neo', 'Turbo', 'Solar', 'Nova', 'Glitch', 'Echo', 'Pixel', 'Drift', 'Axel', 'Flux'];
const NAME_SUFFIXES = ['Rider', 'Nomad', 'Spark', 'Cipher', 'Pilot', 'Comet', 'Vector', 'Pulse', 'Ghost', 'Runner'];
const LAN_ROOM = 'local_flux_main';
const HOST_RECONNECT_GRACE_MS = 45000;
const hostDisconnectTimers = new Map();
const PLAYER_RECONNECT_GRACE_MS = 45000;
const pendingPlayerReconnect = new Map();
const playerDisconnectTimers = new Map();
let lastRoomClosedReason = null;
let lastRoomClosedAt = 0;

function markRoomClosed(reason) {
  lastRoomClosedReason = reason;
  lastRoomClosedAt = Date.now();
}

function getJoinUnavailableMessage() {
  const isRecentClosure = lastRoomClosedAt > 0 && Date.now() - lastRoomClosedAt < 6 * 60 * 60 * 1000;
  if (!isRecentClosure) {
    return 'Room is not created yet. Wait for the host to create a room.';
  }

  if (lastRoomClosedReason === 'ended') {
    return 'Room has ended. Wait for the host to create a new room.';
  }
  if (lastRoomClosedReason === 'host_disconnected') {
    return 'Room closed because the host disconnected. Wait for the host to create a new room.';
  }
  return 'Room is not created yet. Wait for the host to create a room.';
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function generateJoinProfile(room) {
  const existingNames = new Set((room?.players || []).map((p) => String(p?.name || '').toLowerCase()));
  let candidate = `${pickRandom(NAME_PREFIXES)} ${pickRandom(NAME_SUFFIXES)}`.trim();
  if (!candidate) candidate = 'Flux Guest';

  if (existingNames.has(candidate.toLowerCase())) {
    for (let i = 0; i < 12; i += 1) {
      const withNumber = `${candidate} ${Math.floor(Math.random() * 90) + 10}`;
      if (!existingNames.has(withNumber.toLowerCase())) {
        candidate = withNumber;
        break;
      }
    }
  }

  return {
    name: candidate,
    avatarObject: { type: 'preset', value: pickRandom(PRESET_AVATAR_POOL) || DEFAULT_AVATAR_OBJECT.value },
  };
}

function normalizeCustomQuestions(input) {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > 200) return null;

  const normalized = [];
  for (let i = 0; i < input.length; i += 1) {
    const q = input[i] || {};
    const prompt = String(q.prompt || '').trim();
    const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt || '').trim()) : [];
    const correctAnswer = String(q.correct_answer || '').trim();
    const timeLimitMsRaw = Number(q.time_limit_ms);
    const timeLimitMs = Number.isFinite(timeLimitMsRaw) && timeLimitMsRaw >= 3000 ? timeLimitMsRaw : 20000;

    if (!prompt) return null;
    if (options.length !== 4) return null;
    if (options.some((opt) => !opt)) return null;
    if (!options.includes(correctAnswer)) return null;

    normalized.push({
      q_id: String(q.q_id || `q_${String(i + 1).padStart(2, '0')}`),
      type: q.type === 'image_guess' ? 'image_guess' : 'text_only',
      prompt,
      options,
      correct_answer: correctAnswer,
      time_limit_ms: timeLimitMs,
      asset_ref: q.asset_ref || null,
      fuzzy_allowances: Array.isArray(q.fuzzy_allowances) ? q.fuzzy_allowances : [],
    });
  }

  return normalized;
}

function withQuestionTiming(payload) {
  const now = Date.now();
  const limitMsRaw = Number(payload?.question?.time_limit_ms);
  const durationMs = Number.isFinite(limitMsRaw) && limitMsRaw > 0 ? limitMsRaw : 20000;
  return {
    ...payload,
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
  };
}

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  const rawType = String(input.type || '').trim();
  const rawValue = String(input.value || '').trim();

  if (!rawType || !rawValue) {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  if (!['gradient', 'icon', 'preset'].includes(rawType)) {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  return {
    type: rawType,
    value: rawValue.slice(0, 48),
  };
}

/**
 * Register all game event handlers on a connected socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 * @param {object[]} questions - Pre-loaded QUESTIONS array from the deck
 */
function registerHandlers(socket, io, questions, tokenManager) {
  // create ChatManager singleton when first socket connects
  if (!chatInstance) {
    chatInstance = new ChatManager(io);
  }

  // ── client:ping ────────────────────────────────────────────────────────
  socket.on('client:ping', ({ timestamp } = {}, callback) => {
    socket.emit('server:pong', { timestamp });
    callback?.({ timestamp });
  });

  // ── admin:generate-host-token ──────────────────────────────────────────
  socket.on('admin:generate-host-token', (payload, callback) => {
    try {
      const token = tokenManager.generateToken();
      const ttlMs = tokenManager.getTokenTtl(token);
      
      console.log(`[Admin] Generated host token from ${socket.id} (TTL: ${ttlMs}ms)`);
      
      callback({
        success: true,
        token,
        ttlMs,
        message: 'Host token generated successfully.'
      });
    } catch (err) {
      console.error('[Admin] Token generation failed:', err.message);
      callback({
        success: false,
        error: 'Failed to generate host token.'
      });
    }
  });

  // ── create_room ─────────────────────────────────────────────────────────
  socket.on('create_room', ({ roomName, hostSessionId, hostToken }, callback) => {
    // Validate host token
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      console.warn(`[Warn] Unauthorized create_room attempt from ${socket.id}`);
      return callback({ success: false, error: 'Unauthorized: invalid or missing host token.' });
    }

    if (!roomName || !roomName.trim()) {
      return callback({ success: false, error: 'Room name is required.' });
    }

    const lanRoomId = initLanRoom(roomName.trim(), socket.id, hostSessionId || null);
    const room = getRoom();
    if (room) {
      room.questions = [];
      room.deckMeta = null;
    }
    lastRoomClosedReason = null;
    lastRoomClosedAt = 0;
    socket.join(lanRoomId);
    socket.playerName = 'Host';
    console.log(`[Host] "${roomName}" initialized room — LAN_ROOM: ${lanRoomId}`);
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({ success: true, roomId: lanRoomId, deckSource: 'none' });
  });

  // ── host:set_deck ────────────────────────────────────────────────────────
  socket.on('host:set_deck', ({ deckQuestions, deckName, deckSource, hostToken }, callback) => {
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      console.warn(`[Warn] Unauthorized host:set_deck attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }

    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (room.status !== 'lobby') return callback?.({ ok: false, reason: 'room_not_lobby' });

    const customQuestions = normalizeCustomQuestions(deckQuestions);
    if (!customQuestions) {
      return callback?.({ ok: false, reason: 'invalid_deck_payload' });
    }

    room.questions = customQuestions;
    room.deckMeta = {
      name: String(deckName || 'Imported Deck').trim(),
      source: String(deckSource || 'host').trim(),
      count: customQuestions.length,
      updatedAt: Date.now(),
    };

    io.to(LAN_ROOM_ID).emit('room:deck_updated', {
      selected: true,
      deckName: room.deckMeta.name,
      deckSource: room.deckMeta.source,
      questionCount: room.deckMeta.count,
    });

    callback?.({ ok: true, questionCount: customQuestions.length });
  });

  // ── host:resume ─────────────────────────────────────────────────────────
  socket.on('host:resume', ({ hostSessionId }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (!hostSessionId || room.hostSessionId !== hostSessionId) {
      return callback?.({ success: false, error: 'Session mismatch.' });
    }

    const existingTimer = hostDisconnectTimers.get(LAN_ROOM_ID);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hostDisconnectTimers.delete(LAN_ROOM_ID);
    }

    room.hostId = socket.id;
    socket.join(LAN_ROOM_ID);
    socket.playerName = 'Host';

    io.to(LAN_ROOM_ID).emit('host_resumed', { message: 'Host reconnected.' });
    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    const currentIndex = Number(room.currentQ);
    const canSyncQuestion =
      room.status === 'started' &&
      Number.isInteger(currentIndex) &&
      currentIndex >= 0 &&
      currentIndex < roomQuestions.length;

    return callback?.({
      success: true,
      roomName: room.roomName,
      status: room.status,
      deckSelected: roomQuestions.length > 0,
      deckMeta: room.deckMeta || null,
      players: room.players,
      currentQ: room.currentQ,
      totalQ: roomQuestions.length,
      activeQuestion: canSyncQuestion
        ? withQuestionTiming({
            question: roomQuestions[currentIndex],
            index: currentIndex,
            total: roomQuestions.length,
          })
        : null,
    });
  });

  // ── join_room ────────────────────────────────────────────────────────────
  socket.on('join_room', ({ playerName, playerSessionId }, callback) => {
    const room = getRoom();
    if (!room) {
      return callback({ success: false, error: getJoinUnavailableMessage() });
    }
    if (room.status === 'finished') {
      return callback({ success: false, error: 'Room has ended. Wait for the host to create a new room.' });
    }
    if (room.status !== 'lobby') {
      return callback({ success: false, error: 'Game already in progress.' });
    }

    const assigned = generateJoinProfile(room);
    addPlayer({ id: socket.id, name: assigned.name, avatarObject: assigned.avatarObject });
    socket.playerName = assigned.name;
    socket.playerSessionId = playerSessionId || null;
    socket.join(LAN_ROOM_ID);
    console.log(`[Join] "${assigned.name}" → LAN_ROOM`);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({
      success: true,
      roomName: room.roomName,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      deckSelected: Array.isArray(room.questions) && room.questions.length > 0,
      deckMeta: room.deckMeta || null,
      playerName: assigned.name,
      avatarObject: assigned.avatarObject,
    });
  });

  // ── join (LAN mode) ──────────────────────────────────────────────────────
  socket.on('join', ({ playerName, playerSessionId }, callback) => {
    const room = getRoom();

    if (!room) {
      return callback({ success: false, error: getJoinUnavailableMessage() });
    }
    if (room.status === 'finished') {
      return callback({ success: false, error: 'Room has ended. Wait for the host to create a new room.' });
    }

    if (room.status !== 'lobby') {
      return callback({ success: false, error: 'Game already in progress.' });
    }

    const assigned = generateJoinProfile(room);
    addPlayer({
      id: socket.id,
      name: assigned.name,
      avatarObject: assigned.avatarObject,
    });
    socket.playerName = assigned.name;
    socket.playerSessionId = playerSessionId || null;
    socket.join(LAN_ROOM_ID);
    console.log(`[LAN Join] "${assigned.name}" → LAN_ROOM`);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({
      success: true,
      roomName: room.roomName,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      deckSelected: Array.isArray(room.questions) && room.questions.length > 0,
      deckMeta: room.deckMeta || null,
      playerName: assigned.name,
      avatarObject: assigned.avatarObject,
    });
  });

  // ── player:resume ───────────────────────────────────────────────────────
  socket.on('player:resume', ({ playerSessionId }, callback) => {
    const room = getRoom();
    if (!room) {
      pendingPlayerReconnect.delete(playerSessionId);
      return callback?.({ success: false, error: 'Room not found.' });
    }

    const pending = pendingPlayerReconnect.get(playerSessionId);
    if (!pending) {
      return callback?.({ success: false, error: 'No resumable player session.' });
    }

    if (room.status === 'finished') {
      pendingPlayerReconnect.delete(playerSessionId);
      return callback?.({ success: false, error: 'Game already finished.' });
    }

    const existingTimer = playerDisconnectTimers.get(playerSessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      playerDisconnectTimers.delete(playerSessionId);
    }

    addPlayer({
      id: socket.id,
      name: pending.playerName,
      avatarObject: normalizeAvatarObject(pending.avatarObject),
    });
    const me = room.players.find((p) => p.id === socket.id);
    if (me) me.score = Number(pending.score) || 0;

    if (pending.lastAnswer !== undefined) {
      room.answersIn[socket.id] = pending.lastAnswer;
    }

    socket.playerName = pending.playerName;
    socket.playerSessionId = playerSessionId || null;
    socket.join(LAN_ROOM_ID);
    pendingPlayerReconnect.delete(playerSessionId);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    const currentIndex = Number(room.currentQ);
    const canSyncQuestion =
      room.status === 'started' &&
      Number.isInteger(currentIndex) &&
      currentIndex >= 0 &&
      currentIndex < roomQuestions.length;

    return callback?.({
      success: true,
      roomName: room.roomName,
      status: room.status,
      deckSelected: roomQuestions.length > 0,
      deckMeta: room.deckMeta || null,
      myScore: me?.score || 0,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      alreadyAnswered: pending.lastAnswer !== undefined,
      answeredValue: pending.lastAnswer,
      activeQuestion: canSyncQuestion
        ? withQuestionTiming({
            question: sanitizeQuestion(roomQuestions[currentIndex]),
            index: currentIndex,
            total: roomQuestions.length,
          })
        : null,
    });
  });

  // ── player:updateProfile ───────────────────────────────────────────────
  socket.on('player:updateProfile', ({ newName, avatarObject }, callback) => {
    const room = getRoom();
    if (!room) {
      return callback?.({ success: false, error: 'Player is not in an active room.' });
    }

    const normalizedName = String(newName || '').trim().slice(0, 24);
    const normalizedAvatarObject = normalizeAvatarObject(avatarObject);

    if (!normalizedName) {
      return callback?.({ success: false, error: 'Display name is required.' });
    }

    const target = room.players.find((p) => p.id === socket.id);
    if (!target) {
      return callback?.({ success: false, error: 'Player not found.' });
    }

    target.name = normalizedName;
    target.avatarObject = normalizedAvatarObject;
    socket.playerName = normalizedName;

    io.to(LAN_ROOM_ID).emit('player:profileUpdated', {
      player: { ...target },
      players: room.players,
    });
    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });

    return callback?.({ success: true, player: { ...target } });
  });

  // ── start_game ───────────────────────────────────────────────────────────
  socket.on('start_game', (_payload, callback) => {
    const room = getRoom();
    if (!room) return callback({ success: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return callback({ success: false, error: 'Only the host can start.' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    if (roomQuestions.length === 0) {
      return callback({ success: false, error: 'Select a deck before starting the game.' });
    }

    try {
      const firstQ = startGame(room, roomQuestions);
      const timedFirstQ = withQuestionTiming(firstQ);
      console.log(`[Game] LAN_ROOM started with ${room.players.length} player(s).`);
      io.to(LAN_ROOM_ID).emit('game_started', { roomName: room.roomName });
      io.to(LAN_ROOM_ID).emit('next_question', timedFirstQ);
      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // ── submit_answer ────────────────────────────────────────────────────────
  socket.on('submit_answer', ({ answer }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];

    const result = submitAnswer(room, roomQuestions, socket.id, answer);
    console.log(`[Answer] LAN_ROOM Q${room.currentQ} — "${answer}" (${result.correct ? 'correct' : 'wrong'})`);

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
  socket.on('next_question', (_payload, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only the host can advance.' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];

    try {
      const { result, next, gameOver } = advanceQuestion(room, roomQuestions);

      io.to(LAN_ROOM_ID).emit('question_result', result);

      if (gameOver) {
        io.to(LAN_ROOM_ID).emit('game_over', gameOver);
        markRoomClosed('ended');
        deleteRoom();
        console.log(`[Game] LAN_ROOM finished. Room deleted.`);
        return callback?.({ success: true, done: true });
      }

      io.to(LAN_ROOM_ID).emit('next_question', withQuestionTiming(next));
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
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.mute(target);
    io.to(LAN_ROOM_ID).emit('chat:moderation', { action: 'mute', target });
    callback?.({ ok: true });
  });

  socket.on('chat:host_unmute', ({ target }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.unmute(target);
    io.to(LAN_ROOM_ID).emit('chat:moderation', { action: 'unmute', target });
    callback?.({ ok: true });
  });

  socket.on('host:kick_player', ({ target, hostToken }, callback) => {
    // Validate host token
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      console.warn(`[Warn] Unauthorized host:kick_player attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }

    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });

    const exists = room.players.some((p) => p.id === target);
    if (!exists) return callback?.({ ok: false, reason: 'player_not_found' });

    room.players = room.players.filter((p) => p.id !== target);
    if (room.answersIn && room.answersIn[target] !== undefined) {
      delete room.answersIn[target];
    }

    if (chatInstance) chatInstance.unmute(target);

    const targetSocket = io.sockets.sockets.get(target);
    if (targetSocket) {
      targetSocket.leave(LAN_ROOM_ID);
      targetSocket.emit('room_closed', { message: 'You were removed by the host.' });
    }

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    callback?.({ ok: true });
  });

  // host sets chat mode (OFF | FREE | RESTRICTED) and optional allowed messages
  socket.on('chat:host_set_mode', ({ mode, allowed, hostToken }, callback) => {
    // Validate host token
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      console.warn(`[Warn] Unauthorized chat:host_set_mode attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }

    const room = getRoom();
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
      io.to(LAN_ROOM_ID).emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, reason: err.message });
    }
  });

  // host explicitly closes the room when leaving host view
  socket.on('host:close_room', ({ hostToken }, callback) => {
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      return callback?.({ ok: false, reason: 'unauthorized' });
    }

    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });

    io.to(LAN_ROOM_ID).emit('room_closed', { message: 'Host ended the room.' });
    markRoomClosed('host_disconnected');
    deleteRoom();

    const existingTimer = hostDisconnectTimers.get(LAN_ROOM_ID);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hostDisconnectTimers.delete(LAN_ROOM_ID);
    }

    return callback?.({ ok: true });
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    // cleanup chat state
    if (chatInstance) chatInstance.onDisconnect(socket.id);

    // Check if this is the host
    const room = getRoom();
    if (room && room.hostId === socket.id) {
      room.hostId = null;
      io.to(LAN_ROOM_ID).emit('host_reconnecting', {
        message: `Host disconnected. Waiting ${Math.floor(HOST_RECONNECT_GRACE_MS / 1000)}s for reconnection.`,
      });

      const existingTimer = hostDisconnectTimers.get(LAN_ROOM_ID);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        const liveRoom = getRoom();
        if (liveRoom && !liveRoom.hostId) {
          io.to(LAN_ROOM_ID).emit('room_closed', { message: 'Host disconnected.' });
          markRoomClosed('host_disconnected');
          deleteRoom();
          console.log(`[Room] LAN_ROOM destroyed (host did not reconnect in time).`);
        }
        hostDisconnectTimers.delete(LAN_ROOM_ID);
      }, HOST_RECONNECT_GRACE_MS);

      hostDisconnectTimers.set(LAN_ROOM_ID, timer);
      return;
    }

    // Check if this is a player
    const disconnectedPlayer = room?.players.find((p) => p.id === socket.id);
    const wasPlayerRemoved = removePlayer(socket.id);
    
    if (wasPlayerRemoved && room) {
      if (room) {
        let lastAnswer;
        if (room.answersIn && Object.prototype.hasOwnProperty.call(room.answersIn, socket.id)) {
          lastAnswer = room.answersIn[socket.id];
          delete room.answersIn[socket.id];
        }

        const playerSessionId = socket.playerSessionId;
        if (playerSessionId && disconnectedPlayer) {
          pendingPlayerReconnect.set(playerSessionId, {
            playerName: disconnectedPlayer.name,
            avatarObject: normalizeAvatarObject(disconnectedPlayer.avatarObject),
            score: disconnectedPlayer.score,
            lastAnswer,
          });

          const existingTimer = playerDisconnectTimers.get(playerSessionId);
          if (existingTimer) clearTimeout(existingTimer);
          const timer = setTimeout(() => {
            pendingPlayerReconnect.delete(playerSessionId);
            playerDisconnectTimers.delete(playerSessionId);
          }, PLAYER_RECONNECT_GRACE_MS);
          playerDisconnectTimers.set(playerSessionId, timer);
        }

        io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
      }
    }
  });
}

module.exports = { registerHandlers };
