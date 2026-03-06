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

const { loadDeck, DEFAULT_DECK_PATH } = require('./core/deckLoader');
const { registerHandlers } = require('./network/handlers');

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

//  Socket connections 

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  registerHandlers(socket, io, QUESTIONS);
});

//  Start 

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LocalFlux server -> http://localhost:${PORT}`);
  console.log(`On your network  -> http://<your-local-ip>:${PORT}`);
});