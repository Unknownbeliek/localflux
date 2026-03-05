const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins on the local network
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// In-memory room store
// Shape: { [pin]: { roomName: string, hostId: string, players: [{ id, name }] } }
const rooms = {};

function generatePIN() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[pin]);
  return pin;
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // Host creates a room
  socket.on('create_room', ({ roomName }, callback) => {
    const pin = generatePIN();

    rooms[pin] = {
      roomName,
      hostId: socket.id,
      players: [],
    };

    socket.join(pin);
    console.log(`[Room] "${roomName}" created — PIN: ${pin}`);
    callback({ success: true, pin });
  });

  // Player joins a room by PIN
  socket.on('join_room', ({ playerName, pin }, callback) => {
    const room = rooms[pin];

    if (!room) {
      return callback({ success: false, error: 'Room not found. Check your PIN.' });
    }

    // Prevent duplicate entries for the same socket
    const alreadyJoined = room.players.some((p) => p.id === socket.id);
    if (!alreadyJoined) {
      room.players.push({ id: socket.id, name: playerName });
    }
    socket.join(pin);

    console.log(`[Join] "${playerName}" → PIN ${pin}`);

    // Notify everyone in the room (host + players) of the updated list
    io.to(pin).emit('player_joined', { players: room.players });

    callback({ success: true, roomName: room.roomName });
  });

  // Host starts the game
  socket.on('start_game', ({ pin }, callback) => {
    const room = rooms[pin];

    if (!room) {
      return callback({ success: false, error: 'Room not found.' });
    }
    if (room.hostId !== socket.id) {
      return callback({ success: false, error: 'Only the host can start the game.' });
    }
    if (room.players.length === 0) {
      return callback({ success: false, error: 'Need at least one player to start.' });
    }

    room.status = 'started';
    console.log(`[Game] PIN ${pin} — game started with ${room.players.length} player(s).`);

    // Notify all clients in the room (host + players)
    io.to(pin).emit('game_started', { pin, roomName: room.roomName });

    callback({ success: true });
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);

    for (const pin in rooms) {
      const room = rooms[pin];

      if (room.hostId === socket.id) {
        io.to(pin).emit('room_closed', { message: 'Host disconnected. Room closed.' });
        delete rooms[pin];
        console.log(`[Room] PIN ${pin} destroyed — host left.`);
        break;
      }

      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);

      if (room.players.length < before) {
        io.to(pin).emit('player_joined', { players: room.players });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LocalFlux server → http://localhost:${PORT}`);
  console.log(`On your network  → http://<your-local-ip>:${PORT}`);
});
