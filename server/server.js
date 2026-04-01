/**
 * server.js - LocalFlux entry point
 *
 * Responsibilities:
 *   1. Create the HTTP + Socket.IO server
 *   2. Load the quiz deck
 *   3. Wire socket connections to the handler layer
 *
 * All game logic lives in core/.  All socket events live in network/handlers.js.
 */

'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const { loadDeck, DEFAULT_DECK_PATH } = require('./core/deckLoader');
const { fetchOpenTDBDeck, fetchTMDBMovieDeck } = require('./core/apiAdapters');
const { buildDeckSummary, buildDeckDetail } = require('./core/deckApiShape');
const { registerHandlers } = require('./network/handlers');
const { HostTokenManager } = require('./core/hostTokenManager');
const { getRoom } = require('./core/roomStore');

const PORT = Number(process.env.PORT || 1267);
const CLIENT_PORT = Number(process.env.CLIENT_PORT || 7619);

function getPrimaryLanIp() {
  const networkInterfaces = os.networkInterfaces();
  for (const iface of Object.values(networkInterfaces)) {
    if (!Array.isArray(iface)) continue;
    for (const addr of iface) {
      if (!addr || addr.internal) continue;
      if (addr.family !== 'IPv4') continue;
      if (String(addr.address || '').startsWith('169.254.')) continue;
      return addr.address;
    }
  }
  return null;
}

//  HTTP + Socket.IO setup 

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//  Deck loading 

const deckPath = process.env.DECK_PATH || DEFAULT_DECK_PATH;
const deck = loadDeck(deckPath);
const QUESTIONS = deck.questions;
console.log(`[Deck] Loaded ${QUESTIONS.length} question(s) from ${path.basename(deckPath)}`);

//  Token management 

const tokenManager = new HostTokenManager({
  tokenTtl: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 60 * 1000, // cleanup every minute
});

function isLoopbackAddress(value) {
  const ip = String(value || '').trim();
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

function readHostAuth(req) {
  const hostSocketId = String(req.headers['x-host-socket-id'] || req.query.hostId || '').trim();
  const hostToken = String(req.headers['x-host-token'] || req.query.hostToken || '').trim();
  return { hostSocketId, hostToken };
}

function isAuthorizedHostHttpRequest(req, { allowLoopback = false } = {}) {
  const { hostSocketId, hostToken } = readHostAuth(req);
  const room = getRoom();

  if (room && hostSocketId && hostToken && hostSocketId === room.hostId) {
    const tokenCheck = tokenManager.validateTokenDetailed(hostToken, hostSocketId);
    if (tokenCheck.valid) return true;
  }

  if (allowLoopback && isLoopbackAddress(getRequestIp(req))) {
    return true;
  }

  return false;
}

//  Socket connections 

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  registerHandlers(socket, io, QUESTIONS, tokenManager);
});

//  API endpoints

app.post('/api/upload', express.raw({ type: 'image/webp', limit: '10mb' }), (req, res) => {
  if (!isAuthorizedHostHttpRequest(req, { allowLoopback: true })) {
    return res.status(403).json({ error: 'Unauthorized upload request.' });
  }

  if (!req.body || !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'No valid image buffer received' });
  }
  try {
    const publicDir = path.resolve(__dirname, 'public', 'uploads');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const filename = `img_${crypto.randomUUID()}.webp`;
    const filepath = path.join(publicDir, filename);
    fs.writeFileSync(filepath, req.body);
    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('[Upload] Error saving image:', err);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

app.get('/api/decks', (req, res) => {
  const decksDir = path.resolve(__dirname, 'data', 'decks');
  if (!fs.existsSync(decksDir)) {
    return res.json([]);
  }
  const decks = fs.readdirSync(decksDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(decksDir, f), 'utf8'));
        return buildDeckSummary(f, data);
      } catch (e) {
        console.error(`[Deck] Error reading ${f}:`, e.message);
        return null;
      }
    })
    .filter(d => d !== null);
  res.json(decks);
});

app.get('/api/decks/:file', (req, res) => {
  const requested = String(req.params.file || '');
  if (!requested.endsWith('.json') || requested.includes('/') || requested.includes('\\')) {
    return res.status(400).json({ error: 'Invalid deck file.' });
  }

  const decksDir = path.resolve(__dirname, 'data', 'decks');
  const deckPath = path.resolve(decksDir, requested);
  if (!deckPath.startsWith(decksDir)) {
    return res.status(400).json({ error: 'Invalid deck path.' });
  }
  if (!fs.existsSync(deckPath)) {
    return res.status(404).json({ error: 'Deck not found.' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(deckPath, 'utf8'));
    const detail = buildDeckDetail(requested, data);

    if (!detail) {
      return res.status(422).json({ error: 'Deck format invalid.' });
    }

    return res.json(detail);
  } catch (error) {
    console.error(`[Deck] Error reading ${requested}:`, error.message);
    return res.status(500).json({ error: 'Failed to read deck file.' });
  }
});

//  Log downloading endpoint

app.get('/logs/chat', (req, res) => {
  const { hostSocketId } = readHostAuth(req);
  if (!hostSocketId) return res.status(400).send('hostId required');
  const room = getRoom();
  if (!room) return res.status(404).send('room not found');
  if (room.hostId !== hostSocketId) return res.status(403).send('only host');
  if (!isAuthorizedHostHttpRequest(req, { allowLoopback: false })) {
    return res.status(403).send('unauthorized');
  }
  const logPath = path.resolve(process.cwd(), 'logs', 'chat.log');
  if (!fs.existsSync(logPath)) return res.status(404).send('no logs');
  res.download(logPath, 'chat.log');
});

app.get('/api/network-info', (_req, res) => {
  const localIp = getPrimaryLanIp();
  res.json({
    localIp,
    backendPort: PORT,
    clientPort: CLIENT_PORT,
  });
});

app.get('/api/magic/open-trivia', async (req, res) => {
  const amount = Number(req.query.amount || 10);
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;

  try {
    const slides = await fetchOpenTDBDeck(amount, categoryId);
    return res.json({
      ok: true,
      source: 'open_tdb',
      title: `Open Trivia (${slides.length} Questions)`,
      slides,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to generate Open Trivia deck.',
    });
  }
});

app.post('/api/magic/tmdb', async (req, res) => {
  const amount = Number(req.body?.amount || 10);
  const apiKey = String(req.body?.apiKey || '').trim();
  const genreId = req.body?.genreId == null ? null : Number(req.body.genreId);

  try {
    const slides = await fetchTMDBMovieDeck(amount, apiKey, genreId);
    return res.json({
      ok: true,
      source: 'tmdb_movies',
      title: `TMDB Movies (${slides.length} Questions)`,
      slides,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to generate TMDB movie deck.',
    });
  }
});

//  Start 

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getPrimaryLanIp();
  console.log(`LocalFlux server -> http://localhost:${PORT}`);
  if (localIp) {
    console.log(`On your network  -> http://${localIp}:${PORT}`);
    console.log(`Host join page   -> http://${localIp}:${CLIENT_PORT}/play`);
  } else {
    console.log('On your network  -> LAN IP not detected');
  }
});