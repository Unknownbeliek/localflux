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

const { loadDeck, DEFAULT_DECK_PATH } = require('./core/deckLoader');
const { registerHandlers } = require('./network/handlers');
const { HostTokenManager } = require('./core/hostTokenManager');

const PORT = Number(process.env.PORT || 3000);
const CLIENT_PORT = Number(process.env.CLIENT_PORT || 5173);

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
});

app.use(cors());
app.use(express.json());

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

//  Socket connections 

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  registerHandlers(socket, io, QUESTIONS, tokenManager);
});

//  API endpoints

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
        return {
          name: f.replace('.json', ''),
          file: f,
          count: Array.isArray(data.questions) ? data.questions.length : 0
        };
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
    if (!Array.isArray(data.questions)) {
      return res.status(422).json({ error: 'Deck format invalid.' });
    }

    return res.json({
      name: requested.replace('.json', ''),
      file: requested,
      count: data.questions.length,
      questions: data.questions,
    });
  } catch (error) {
    console.error(`[Deck] Error reading ${requested}:`, error.message);
    return res.status(500).json({ error: 'Failed to read deck file.' });
  }
});

//  Log downloading endpoint

app.get('/logs/chat', (req, res) => {
  const hostSocketId = req.query.hostId; // host must pass socket id for verification
  if (!hostSocketId) return res.status(400).send('hostId required');
  const room = require('./core/roomStore').getRoom();
  if (!room) return res.status(404).send('room not found');
  if (room.hostId !== hostSocketId) return res.status(403).send('only host');
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