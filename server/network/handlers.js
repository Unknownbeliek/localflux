/**
 * handlers.js
 *
 * Socket.IO event handlers G�� the thin wiring layer between the network and
 * the game engine.  Each handler validates ownership / state then delegates
 * all mutations to core modules.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { isHotspotNetwork } = require('../utils/networkUtils');

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
const { registerTypeGuessHandlers } = require('./typeGuessHandlers');

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
const questionTimeoutTimers = new Map();
const roundLockTimers = new Map();
const roundTransitionTimers = new Map();
const ROUND_LOCK_DELAY_MS = 700;
const ROUND_TRANSITION_DELAY_MS = 3000;
const HOST_REJECTED_MESSAGE = 'A game is already being hosted on this network.';
const ENFORCE_HOST_SESSION = false;
let lastRoomClosedReason = null;
let lastRoomClosedAt = 0;

function markRoomClosed(reason) {
  lastRoomClosedReason = reason;
  lastRoomClosedAt = Date.now();
  
  // Clear all pending zombie reconnections when room closes
  for (const timer of playerDisconnectTimers.values()) {
    clearTimeout(timer);
  }
  playerDisconnectTimers.clear();
  pendingPlayerReconnect.clear();
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

function normalizeSlides(input) {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > 200) return null;

  const normalized = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] || {};
    const id = String(raw.id || `slide_${String(i + 1).padStart(2, '0')}`).trim();
    let type = String(raw.type || raw.q_type || 'mcq').trim().toLowerCase();
    if (type !== 'typing') type = 'mcq';

    const prompt = String(raw.prompt || raw.question || '').trim();
    const image = raw.image == null ? (raw.asset_ref == null ? null : String(raw.asset_ref).trim()) : String(raw.image).trim();
    const optionsRaw = Array.isArray(raw.options) ? raw.options.map((opt) => String(opt || '').trim()) : [];
    const options = optionsRaw.slice(0, 4);
    while (options.length < 4) options.push('');

    const acceptedAnswers = Array.isArray(raw.acceptedAnswers)
      ? raw.acceptedAnswers.map((value) => String(value || '').trim()).filter(Boolean)
      : (Array.isArray(raw.fuzzy_allowances) ? raw.fuzzy_allowances.map((value) => String(value || '').trim()).filter(Boolean) : []);
      
    const suggestionBank = Array.isArray(raw.suggestionBank)
      ? raw.suggestionBank.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
      
    const rawTime = raw.time_limit_ms != null ? raw.time_limit_ms : raw.timeLimit;
    const timeLimitRaw = Number(rawTime);
    const timeLimit = Number.isFinite(timeLimitRaw) && timeLimitRaw >= 3000 ? timeLimitRaw : 20000;

    if (!id || !prompt) return null;

    if (type === 'mcq') {
      let correctIndex = Number(raw.correctIndex);
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
        const correctRaw = String(raw.correct_answer || raw.correct || '').trim().toLowerCase();
        correctIndex = options.findIndex((opt) => opt.toLowerCase() === correctRaw);
        if (correctIndex < 0) correctIndex = 0;
      }

      normalized.push({
        id,
        type,
        prompt,
        image,
        options,
        correctIndex,
        acceptedAnswers: [],
        suggestionBank,
        timeLimit,
      });
      continue;
    }

    let finalAcceptedAnswers = acceptedAnswers;
    if (finalAcceptedAnswers.length === 0) {
      const fallback = String(raw.correct_answer || raw.correct || '').trim();
      if (fallback) finalAcceptedAnswers = [fallback];
    }
    
    if (finalAcceptedAnswers.length === 0) return null;
    normalized.push({
      id,
      type,
      prompt,
      image,
      options: [],
      correctIndex: -1,
      acceptedAnswers: finalAcceptedAnswers,
      suggestionBank,
      timeLimit,
    });
  }

  return normalized;
}

function withQuestionTiming(payload) {
  const now = Date.now();
  const limitRaw = Number(payload?.question?.timeLimit);
  const durationMs = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20000;
  return {
    ...payload,
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
  };
}

function withAnswerMode(payload, answerMode = 'multiple_choice') {
  if (!payload || !payload.question) return payload;
  let nextMode = payload.question.answer_mode || answerMode || 'multiple_choice';
  
  if (nextMode === 'auto') {
    nextMode = payload.question.type === 'typing' ? 'type_guess' : 'multiple_choice';
  }

  return {
    ...payload,
    question: {
      ...payload.question,
      answer_mode: nextMode,
    },
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

function loadDeckSlidesFromFile(deckFile) {
  const requested = String(deckFile || '').trim();
  if (!requested.endsWith('.json') || requested.includes('/') || requested.includes('\\')) {
    return null;
  }

  const decksDir = path.resolve(__dirname, '..', 'data', 'decks');
  const resolvedDeckPath = path.resolve(decksDir, requested);
  if (!resolvedDeckPath.startsWith(decksDir)) return null;
  if (!fs.existsSync(resolvedDeckPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(resolvedDeckPath, 'utf8'));
    if (Array.isArray(data?.slides)) return data.slides;
    if (Array.isArray(data?.questions)) return data.questions;
    return null;
  } catch {
    return null;
  }
}

function rejectHost(socket, callback, message = HOST_REJECTED_MESSAGE) {
  const payload = { success: false, error: message, reason: 'host_locked' };
  socket.emit('host:rejected', { message });
  callback?.(payload);
  return false;
}

function hasValidHostSession(room, hostSessionId) {
  if (!ENFORCE_HOST_SESSION) return true;

  const activeSession = String(room?.hostSessionId || '').trim();
  const incomingSession = String(hostSessionId || '').trim();
  if (!activeSession || !incomingSession) return false;
  return activeSession === incomingSession;
}

function clearTimerByRoom(timerMap, roomId) {
  const active = timerMap.get(roomId);
  if (active) {
    clearTimeout(active);
    timerMap.delete(roomId);
  }
}

function clearRoundTimers(roomId) {
  clearTimerByRoom(questionTimeoutTimers, roomId);
  clearTimerByRoom(roundLockTimers, roomId);
  clearTimerByRoom(roundTransitionTimers, roomId);
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

  const emitNextQuestionForRound = (room, nextQuestionPayload) => {
    const timedPayload = withQuestionTiming(withAnswerMode(nextQuestionPayload, room.answerMode));
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
      lockMs: ROUND_LOCK_DELAY_MS,
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
          nextInMs: ROUND_TRANSITION_DELAY_MS,
          nextQuestion: Number(next.index) + 1,
          totalQuestions: Number(next.total),
        });

        clearTimerByRoom(roundTransitionTimers, LAN_ROOM_ID);
        const transitionTimer = setTimeout(() => {
          const pendingRoom = getRoom();
          if (!pendingRoom || pendingRoom.status !== 'started') return;
          if (Number(pendingRoom.currentQ) !== Number(next.index)) return;
          emitNextQuestionForRound(pendingRoom, next);
        }, ROUND_TRANSITION_DELAY_MS);

        roundTransitionTimers.set(LAN_ROOM_ID, transitionTimer);
      } catch (err) {
        console.error('[Game] Round settle failed:', err.message);
      }
    }, ROUND_LOCK_DELAY_MS);

    roundLockTimers.set(LAN_ROOM_ID, lockTimer);
    callback?.({ success: true, queued: true });
    return true;
  };

  registerTypeGuessHandlers({
    socket,
    io,
    getRoom,
    LAN_ROOM_ID,
    settleCurrentRound,
    getChatMode: () => chatInstance?.mode || 'FREE',
  });

  const isHostAuthorized = (room, hostToken, hostSessionId) => {
    const hasValidToken = Boolean(hostToken) && tokenManager.validateToken(hostToken, socket.id);
    if (hasValidToken) return true;

    // Allow resumed host sessions to continue controlling room without forcing token refresh.
    return Boolean(room && room.hostId === socket.id && hasValidHostSession(room, hostSessionId));
  };

  // G��G�� client_ping G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  const emitPong = ({ clientTime } = {}, callback) => {
    const normalizedClientTime = Number.isFinite(Number(clientTime)) ? Number(clientTime) : Date.now();
    const payload = { clientTime: normalizedClientTime };
    socket.emit('server_pong', payload);
    callback?.(payload);
  };

  socket.on('client_ping', emitPong);

  // Backward compatibility for older clients still emitting client:ping.
  socket.on('client:ping', ({ timestamp } = {}, callback) => {
    emitPong({ clientTime: timestamp }, callback);
  });

  // G��G�� admin:generate-host-token G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('admin:generate-host-token', (payload, callback) => {
    try {
      const clientIp = socket.handshake.address;
      if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== '::ffff:127.0.0.1') {
        console.warn(`[Admin] Rejected token generation from non-localhost IP: ${clientIp}`);
        return callback({ success: false, error: 'Unauthorized: Admin actions must be performed on the host machine.' });
      }

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

  // G��G�� create_room G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('create_room', ({ roomName, hostSessionId, hostToken }, callback) => {
    // Validate host token
    if (!hostToken || !tokenManager.validateToken(hostToken, socket.id)) {
      console.warn(`[Warn] Unauthorized create_room attempt from ${socket.id}`);
      return callback({ success: false, error: 'Unauthorized: invalid or missing host token.' });
    }

    if (!roomName || !roomName.trim()) {
      return callback({ success: false, error: 'Room name is required.' });
    }

    const currentRoom = getRoom();
    if (currentRoom) {
      const previousHostId = currentRoom.hostId;
      const incomingSession = String(hostSessionId || '').trim();

      // In non-strict mode, transfer host control to the latest valid host token holder.
      if (previousHostId && previousHostId !== socket.id) {
        io.to(previousHostId).emit('host:rejected', { message: 'Host control transferred to a new host session.' });
      }

      currentRoom.hostSessionId = incomingSession || currentRoom.hostSessionId || `legacy_${socket.id}`;

      const existingTimer = hostDisconnectTimers.get(LAN_ROOM_ID);
      if (existingTimer) {
        clearTimeout(existingTimer);
        hostDisconnectTimers.delete(LAN_ROOM_ID);
      }

      currentRoom.hostId = socket.id;
      socket.join(LAN_ROOM_ID);
      socket.playerName = 'Host';
      socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
      io.to(LAN_ROOM_ID).emit('player_joined', { players: currentRoom.players });

      return callback({
        success: true,
        roomId: LAN_ROOM_ID,
        deckSource: currentRoom.deckMeta?.source || 'none',
        roomName: currentRoom.roomName,
        status: currentRoom.status,
        deckSelected: Array.isArray(currentRoom.questions) && currentRoom.questions.length > 0,
        answerMode: currentRoom.answerMode || 'auto',
      });
    }

    const resolvedHostSessionId = String(hostSessionId || '').trim() || `legacy_${socket.id}`;
    const lanRoomId = initLanRoom(roomName.trim(), socket.id, resolvedHostSessionId);
    clearRoundTimers(lanRoomId);
    const room = getRoom();
    if (room) {
      room.questions = [];
      room.deckMeta = null;
      room.answerMode = room.answerMode || 'auto';
    }
    lastRoomClosedReason = null;
    lastRoomClosedAt = 0;
    socket.join(lanRoomId);
    socket.playerName = 'Host';
    console.log(`[Host] "${roomName}" initialized room G�� LAN_ROOM: ${lanRoomId}`);
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({ success: true, roomId: lanRoomId, deckSource: 'none', answerMode: room?.answerMode || 'auto' });
  });

  // G��G�� host:set_deck G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('host:set_deck', ({ deckSlides, deckQuestions, deckName, deckSource, deckFile, hostToken, hostSessionId }, callback) => {
    const room = getRoom();
    if (!isHostAuthorized(room, hostToken, hostSessionId)) {
      console.warn(`[Warn] Unauthorized host:set_deck attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (room.status !== 'lobby') return callback?.({ ok: false, reason: 'room_not_lobby' });

    const sourceSlides = deckFile
      ? loadDeckSlidesFromFile(deckFile)
      : Array.isArray(deckSlides)
        ? deckSlides
        : deckQuestions;
    const normalizedSlides = normalizeSlides(sourceSlides);
    if (!normalizedSlides) {
      return callback?.({ ok: false, reason: 'invalid_deck_payload' });
    }

    room.questions = normalizedSlides;
    room.deckMeta = {
      name: String(deckName || 'Imported Deck').trim(),
      source: String(deckSource || 'host').trim(),
      count: normalizedSlides.length,
      updatedAt: Date.now(),
    };

    io.to(LAN_ROOM_ID).emit('room:deck_updated', {
      selected: true,
      deckName: room.deckMeta.name,
      deckSource: room.deckMeta.source,
      questionCount: room.deckMeta.count,
    });

    callback?.({ ok: true, questionCount: normalizedSlides.length });
  });

  // G��G�� host:resume G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('host:resume', ({ hostSessionId }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (!hasValidHostSession(room, hostSessionId)) {
      return rejectHost(socket, callback);
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
      answerMode: room.answerMode || 'auto',
      players: room.players,
      currentQ: room.currentQ,
      totalQ: roomQuestions.length,
      activeQuestion: canSyncQuestion
        ? withQuestionTiming(withAnswerMode({
            question: roomQuestions[currentIndex],
            index: currentIndex,
            total: roomQuestions.length,
          }, room.answerMode))
        : null,
    });
  });

  // G��G�� join_room G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
    
    if (isHotspotNetwork() && room.players.length >= 10) {
      return callback({ success: false, error: 'Hardware capacity limit reached. Hotspots support max 10 players.' });
    }

    const assigned = generateJoinProfile(room);
    addPlayer({ id: socket.id, name: assigned.name, avatarObject: assigned.avatarObject });
    socket.playerName = assigned.name;
    socket.playerSessionId = playerSessionId || null;
    socket.join(LAN_ROOM_ID);
    console.log(`[Join] "${assigned.name}" G�� LAN_ROOM`);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({
      success: true,
      roomName: room.roomName,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      deckSelected: Array.isArray(room.questions) && room.questions.length > 0,
      deckMeta: room.deckMeta || null,
      answerMode: room.answerMode || 'multiple_choice',
      playerName: assigned.name,
      avatarObject: assigned.avatarObject,
    });
  });

  // G��G�� join (LAN mode) G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
    
    if (isHotspotNetwork() && room.players.length >= 10) {
      return callback({ success: false, error: 'Hardware capacity limit reached. Hotspots support max 10 players.' });
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
    console.log(`[LAN Join] "${assigned.name}" G�� LAN_ROOM`);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });
    callback({
      success: true,
      roomName: room.roomName,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      deckSelected: Array.isArray(room.questions) && room.questions.length > 0,
      deckMeta: room.deckMeta || null,
      answerMode: room.answerMode || 'multiple_choice',
      playerName: assigned.name,
      avatarObject: assigned.avatarObject,
    });
  });

  // G��G�� player:resume G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('player:resume', ({ sessionId, playerSessionId }, callback) => {
    const effectiveSessionId = String(sessionId || playerSessionId || '').trim();
    if (!effectiveSessionId) {
      return callback?.({ success: false, error: 'No resumable player session.' });
    }

    const existingTimer = playerDisconnectTimers.get(effectiveSessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      playerDisconnectTimers.delete(effectiveSessionId);
    }

    const room = getRoom();
    if (!room) {
      pendingPlayerReconnect.delete(effectiveSessionId);
      return callback?.({ success: false, error: 'Room not found.' });
    }

    const pending = pendingPlayerReconnect.get(effectiveSessionId);
    if (!pending) {
      return callback?.({ success: false, error: 'No resumable player session.' });
    }

    if (room.status === 'finished') {
      pendingPlayerReconnect.delete(effectiveSessionId);
      return callback?.({ success: false, error: 'Game already finished.' });
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
    socket.playerSessionId = effectiveSessionId;
    socket.join(LAN_ROOM_ID);
    pendingPlayerReconnect.delete(effectiveSessionId);

    io.to(LAN_ROOM_ID).emit('player_joined', { players: room.players });
    socket.emit('chat:mode', { mode: chatInstance.mode, allowed: chatInstance.allowed });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    const currentIndex = Number(room.currentQ);
    const canSyncQuestion =
      room.status === 'started' &&
      Number.isInteger(currentIndex) &&
      currentIndex >= 0 &&
      currentIndex < roomQuestions.length;

    const hasAnswered = Object.prototype.hasOwnProperty.call(room.answersIn || {}, socket.id);

    return callback?.({
      success: true,
      roomName: room.roomName,
      phase: room.status,
      status: room.status,
      deckSelected: roomQuestions.length > 0,
      deckMeta: room.deckMeta || null,
      answerMode: room.answerMode || 'auto',
      myScore: me?.score || 0,
      chatMode: chatInstance.mode,
      chatAllowed: chatInstance.allowed,
      hasAnswered,
      answeredValue: hasAnswered ? room.answersIn[socket.id] : pending.lastAnswer,
      activeQuestion: canSyncQuestion
        ? withQuestionTiming(withAnswerMode({
            question: sanitizeQuestion(roomQuestions[currentIndex]),
            index: currentIndex,
            total: roomQuestions.length,
          }, room.answerMode))
        : null,
    });
  });

  // G��G�� host:set_answer_mode G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('host:set_answer_mode', ({ mode, hostToken, hostSessionId }, callback) => {
    const room = getRoom();
    if (!isHostAuthorized(room, hostToken, hostSessionId)) {
      return callback?.({ ok: false, reason: 'unauthorized' });
    }
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (room.status !== 'lobby') return callback?.({ ok: false, reason: 'room_not_lobby' });

    const nextMode = String(mode || '').trim();
    if (!['multiple_choice', 'type_guess', 'auto'].includes(nextMode)) {
      return callback?.({ ok: false, reason: 'invalid_mode' });
    }

    room.answerMode = nextMode;
    io.to(LAN_ROOM_ID).emit('room:answer_mode', { mode: nextMode });
    callback?.({ ok: true, mode: nextMode });
  });

  // G��G�� player:updateProfile G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

  // G��G�� start_game G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('start_game', ({ hostSessionId } = {}, callback) => {
    const room = getRoom();
    if (!room) return callback({ success: false, error: 'Room not found.' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback({ success: false, error: HOST_REJECTED_MESSAGE, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback({ success: false, error: 'Only the host can start.' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];
    if (roomQuestions.length === 0) {
      return callback({ success: false, error: 'Select a deck before starting the game.' });
    }

    try {
      const firstQ = startGame(room, roomQuestions);
      room.roundSettled = false;
      room.roundId = Number(room.roundId || 0);
      clearRoundTimers(LAN_ROOM_ID);
      console.log(`[Game] LAN_ROOM started with ${room.players.length} player(s).`);
      io.to(LAN_ROOM_ID).emit('game_started', { roomName: room.roomName });
      emitNextQuestionForRound(room, firstQ);
      callback({ success: true });
    } catch (err) {
      callback({ success: false, error: err.message });
    }
  });

  // G��G�� submit_answer G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('submit_answer', ({ answer }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const roomQuestions = Array.isArray(room.questions) ? room.questions : [];

    const result = submitAnswer(room, roomQuestions, socket.id, answer);
    console.log(`[Answer] LAN_ROOM Q${room.currentQ} G�� "${answer}" (${result.correct ? 'correct' : 'wrong'})`);

    if (result.alreadyAnswered) {
      return callback?.({ success: false, error: 'Already answered.' });
    }

    callback?.({ success: true, correct: result.correct });

    io.to(room.hostId).emit('answer_count', {
      count: result.answerCount,
      total: result.totalPlayers,
    });

    if (!room.roundSettled && result.totalPlayers > 0 && result.answerCount >= result.totalPlayers) {
      settleCurrentRound({ reason: 'all_answered' });
    }
  });

  // G��G�� next_question (host advances) G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
  socket.on('next_question', ({ hostSessionId } = {}, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ success: false, error: HOST_REJECTED_MESSAGE, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only the host can advance.' });

    // Legacy/manual trigger support: force early settle if needed.
    settleCurrentRound({ reason: 'host_manual_advance', callback });
  });

  // attach chat listeners
  socket.on('chat:free', (payload, ack) => chatInstance.handleEvent(socket, 'chat:free', payload, ack));
  socket.on('chat:pre', (payload, ack) => chatInstance.handleEvent(socket, 'chat:pre', payload, ack));

  // host moderation events
  socket.on('chat:host_mute', ({ target, hostSessionId }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.mute(target);
    io.to(LAN_ROOM_ID).emit('chat:moderation', { action: 'mute', target });
    callback?.({ ok: true });
  });

  socket.on('chat:host_unmute', ({ target, hostSessionId }, callback) => {
    const room = getRoom();
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });
    if (!chatInstance) return callback?.({ ok: false });
    chatInstance.unmute(target);
    io.to(LAN_ROOM_ID).emit('chat:moderation', { action: 'unmute', target });
    callback?.({ ok: true });
  });

  socket.on('host:kick_player', ({ target, hostToken, hostSessionId }, callback) => {
    const room = getRoom();
    if (!isHostAuthorized(room, hostToken, hostSessionId)) {
      console.warn(`[Warn] Unauthorized host:kick_player attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
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
  socket.on('chat:host_set_mode', ({ mode, allowed, hostToken, hostSessionId }, callback) => {
    const room = getRoom();
    if (!isHostAuthorized(room, hostToken, hostSessionId)) {
      console.warn(`[Warn] Unauthorized chat:host_set_mode attempt from ${socket.id}`);
      return callback?.({ ok: false, reason: 'unauthorized' });
    }
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
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
  socket.on('host:close_room', ({ hostToken, hostSessionId }, callback) => {
    const room = getRoom();
    if (!isHostAuthorized(room, hostToken, hostSessionId)) {
      return callback?.({ ok: false, reason: 'unauthorized' });
    }
    if (!room) return callback?.({ ok: false, reason: 'room_not_found' });
    if (!hasValidHostSession(room, hostSessionId)) {
      rejectHost(socket, null);
      return callback?.({ ok: false, reason: 'host_locked' });
    }
    if (room.hostId !== socket.id) return callback?.({ ok: false, reason: 'not_host' });

    io.to(LAN_ROOM_ID).emit('room_closed', { message: 'Host ended the room.' });
    markRoomClosed('host_disconnected');
    clearRoundTimers(LAN_ROOM_ID);
    deleteRoom();

    const existingTimer = hostDisconnectTimers.get(LAN_ROOM_ID);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hostDisconnectTimers.delete(LAN_ROOM_ID);
    }

    return callback?.({ ok: true });
  });

  // G��G�� disconnect G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
          clearRoundTimers(LAN_ROOM_ID);
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
