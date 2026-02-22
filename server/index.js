const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize Express & HTTP Server
const app = express();
app.use(cors());
const server = http.createServer(app);

// Initialize Socket.io with aggressive CORS for local testing
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your React app on port 5173 to connect
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// --- CORE ENGINE LOGIC ---

io.on('connection', (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // 1. DETERMINISTIC LAG COMPENSATION (NTP Handshake)
  // When the client pings, we immediately send back the server's exact timestamp.
  // The client uses this to calculate exactly how many milliseconds of lag they have.
  socket.on('client_ping', (clientTime) => {
    socket.emit('server_pong', {
      clientTime: clientTime,
      serverTime: Date.now()
    });
  });

  // 2. LOBBY SYSTEM (Basic Setup)
  socket.on('join_game', (data) => {
    console.log(`👤 ${data.username} joined the lobby.`);
    socket.broadcast.emit('player_joined', data.username);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
  });
});

// Start the Engine
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================`);
  console.log(`🎬 CineGnosis Core Engine Online`);
  console.log(`📡 Listening on Local Network: http://localhost:${PORT}`);
  console.log(`======================================\n`);
});