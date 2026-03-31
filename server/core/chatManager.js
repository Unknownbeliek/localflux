/*
 * chatManager.js
 *
 * Server-side Chat Manager for LocalFlux
 * - FREE: free text with rate-limiter + profanity blocking (auto-mute after warnings)
 * - RESTRICTED: pre-canned message IDs only
 * - OFF: completely ignore chat events
 *
 * Designed to be transport-agnostic (accepts socket and io but emits using io)
 */

'use strict';

const leoProfanity = require('leo-profanity');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

const DEFAULT_ALLOWED = [
  { id: 'shout_yes', text: 'Nice one! 🎉' },
  { id: 'clap', text: '👏 Great!' },
  { id: 'laugh', text: 'Haha! 😄' },
  { id: 'thumbs_up', text: '👍 Good call' },
  { id: 'oops', text: 'Oops! 😅' },
  { id: 'wow', text: 'Wow! 😲' },
  { id: 'ready', text: "I'm ready ✅" },
  { id: 'cheer', text: "Let's go! 🚀" },
];

class ChatManager {
  constructor(io, opts = {}) {
    this.io = io;
    this.defaultRoomPin = typeof opts.defaultRoomPin === 'string' && opts.defaultRoomPin.trim()
      ? opts.defaultRoomPin.trim()
      : null;
    this.mode = opts.mode || 'RESTRICTED'; // FREE | RESTRICTED | OFF
    this.allowed = opts.allowedMessages || DEFAULT_ALLOWED;
    this.rateMap = new Map(); // socketId -> { tokens, last }
    this.warns = new Map();
    this.muted = new Set(); // socketId set for manual mutes

    this.MAX_WARN = opts.maxWarnings || 3;
    this.TOKEN_REFILL_MS = opts.tokenRefillMs || 2000; // refill interval
    this.TOKEN_CAP = opts.tokenCap || 1;

    this.GC_INTERVAL_MS = 60_000;
    this.STALE_MS = 10 * 60_000; // 10 minutes

    this.freeSchema = z.object({ roomPin: z.string().optional(), text: z.string().min(1).max(300) });
    this.preSchema = z.object({ roomPin: z.string().optional(), id: z.string() });

    // per-IP throttling
    this.ipMap = new Map(); // ip -> { count, windowStart }
    this.IP_WINDOW_MS = opts.ipWindowMs || 60_000; // 1 minute
    this.IP_LIMIT = opts.ipLimit || 120; // messages per IP per window

    // logging
    this.logPath = path.resolve(process.cwd(), 'logs', 'chat.log');
    this.onMessage = typeof opts.onMessage === 'function' ? opts.onMessage : null;
    try { fs.mkdirSync(path.dirname(this.logPath), { recursive: true }); } catch (e) {}

    // load profanity dictionary
    leoProfanity.loadDictionary();

    this.gcHandle = setInterval(() => this.gc(), this.GC_INTERVAL_MS);
  }

  setMode(m) {
    if (!['FREE', 'RESTRICTED', 'OFF'].includes(m)) throw new Error('invalid mode');
    this.mode = m;
    this.io.emit('chat:mode', { mode: this.mode, allowed: this.allowed });
  }

  allowSend(socketId) {
    const now = Date.now();
    let b = this.rateMap.get(socketId);
    if (!b) {
      b = { tokens: this.TOKEN_CAP, last: now };
      this.rateMap.set(socketId, b);
    }
    const elapsed = now - b.last;
    const refill = Math.floor(elapsed / this.TOKEN_REFILL_MS);
    if (refill > 0) {
      b.tokens = Math.min(this.TOKEN_CAP, b.tokens + refill);
      b.last = now;
    }
    if (b.tokens > 0) {
      b.tokens -= 1;
      return true;
    }
    return false;
  }

  sanitizeText(text) {
    if (leoProfanity.check(text)) return null; // block entirely
    return leoProfanity.clean(text);
  }

  isMuted(socketId) {
    return this.muted.has(socketId);
  }

  mute(socketId) {
    this.muted.add(socketId);
    this.writeLog({ action: 'mute', target: socketId, ts: Date.now() });
    try { this.io.to(socketId).emit('chat:muted', { reason: 'by_host' }); } catch (e) {}
  }

  unmute(socketId) {
    this.muted.delete(socketId);
    this.writeLog({ action: 'unmute', target: socketId, ts: Date.now() });
    try { this.io.to(socketId).emit('chat:unmuted', { reason: 'by_host' }); } catch (e) {}
  }

  ipAllow(socket) {
    const ip = socket?.handshake?.address || 'unknown';
    const now = Date.now();
    let entry = this.ipMap.get(ip);
    if (!entry) { entry = { count: 0, windowStart: now }; this.ipMap.set(ip, entry); }
    if (now - entry.windowStart > this.IP_WINDOW_MS) {
      entry.count = 0; entry.windowStart = now;
    }
    entry.count += 1;
    return entry.count <= this.IP_LIMIT; // Check after increment (atomic)
  }

  writeLog(obj) {
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(obj) + '\n');
    } catch (e) {
      // best-effort logging
      console.error('[ChatManager] failed to write log', e.message);
    }
  }

  resolveRoomPin(roomPin) {
    const value = String(roomPin || '').trim();
    if (value) return value;
    return this.defaultRoomPin;
  }

  handleFreeMessage(socket, payload, ack) {
    // check global mute
    if (this.isMuted(socket.id)) return ack?.({ ok: false, reason: 'muted' });

    // per-IP throttling
    if (!this.ipAllow(socket)) return ack?.({ ok: false, reason: 'ip_throttled' });

    const valid = this.freeSchema.safeParse(payload);
    if (!valid.success) return ack?.({ ok: false, reason: 'invalid_payload' });
    const roomPin = this.resolveRoomPin(valid.data.roomPin);
    if (!roomPin) return ack?.({ ok: false, reason: 'invalid_payload' });
    if (!this.allowSend(socket.id)) return ack?.({ ok: false, reason: 'rate_limited' });
    const clean = this.sanitizeText(valid.data.text);
    if (!clean) {
      const w = (this.warns.get(socket.id) || 0) + 1;
      this.warns.set(socket.id, w);
      this.writeLog({ action: 'profanity_block', socket: socket.id, text: valid.data.text, warnings: w, ts: Date.now() });
      if (w >= this.MAX_WARN) {
        this.mute(socket.id);
        this.io.to(socket.id).emit('chat:muted', { reason: 'profanity' });
      }
      return ack?.({ ok: false, reason: 'profanity' });
    }
    const msg = { from: socket.id, name: socket.playerName || 'Player', text: clean, ts: Date.now() };
    this.writeLog({ action: 'message', socket: socket.id, ip: socket?.handshake?.address || 'unknown', text: clean, ts: Date.now() });
    if (this.onMessage) this.onMessage(roomPin, msg);
    this.io.to(roomPin).emit('chat:message', msg);
    ack?.({ ok: true });
  }

  handlePreCanned(socket, payload, ack) {
    // check global mute
    if (this.isMuted(socket.id)) return ack?.({ ok: false, reason: 'muted' });

    const valid = this.preSchema.safeParse(payload);
    if (!valid.success) return ack?.({ ok: false, reason: 'invalid' });
    const roomPin = this.resolveRoomPin(valid.data.roomPin);
    if (!roomPin) return ack?.({ ok: false, reason: 'invalid' });
    if (this.mode !== 'RESTRICTED') return ack?.({ ok: false, reason: 'wrong_mode' });
    const allowed = this.allowed.find((a) => a.id === valid.data.id);
    if (!allowed) return ack?.({ ok: false, reason: 'not_allowed' });
    const msg = { from: socket.id, name: socket.playerName || 'Player', text: allowed.text, cannedId: allowed.id, ts: Date.now() };
    this.writeLog({ action: 'canned_message', socket: socket.id, id: allowed.id, ts: Date.now() });
    if (this.onMessage) this.onMessage(roomPin, msg);
    this.io.to(roomPin).emit('chat:message', msg);
    ack?.({ ok: true });
  }

  handleEvent(socket, event, payload, ack) {
    if (this.mode === 'OFF') return ack?.({ ok: false, reason: 'chat_off' });
    if (event === 'chat:free') return this.handleFreeMessage(socket, payload, ack);
    if (event === 'chat:pre') return this.handlePreCanned(socket, payload, ack);
    return ack?.({ ok: false, reason: 'unknown_event' });
  }

  onDisconnect(socketId) {
    this.rateMap.delete(socketId);
    this.warns.delete(socketId);
  }

  gc() {
    const now = Date.now();
    for (const [id, b] of this.rateMap) {
      if (now - b.last > this.STALE_MS) this.rateMap.delete(id);
    }
    for (const [id, w] of this.warns) {
      // clear warnings for idle sockets
      const last = this.rateMap.get(id)?.last || 0;
      if (now - last > this.STALE_MS) this.warns.delete(id);
    }
  }

  stop() {
    clearInterval(this.gcHandle);
  }
}

module.exports = { ChatManager };
