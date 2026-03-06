/**
 * roomStore.js
 *
 * In-memory store for active game rooms.
 *
 * Room shape:
 * {
 *   roomName : string,
 *   hostId   : string,          // socket.id of the host
 *   players  : Array<{          // joined players
 *     id    : string,           // socket.id
 *     name  : string,
 *     score : number,
 *   }>,
 *   status   : 'lobby' | 'started' | 'finished',
 *   currentQ : number,          // index into QUESTIONS, -1 = not started
 *   answersIn: Record<string, string>, // socketId → answer submitted this round
 * }
 */

'use strict';

/** @type {Record<string, object>} */
const rooms = {};

/**
 * Generate a unique 4-digit PIN not currently in use.
 * @returns {string}
 */
function generatePIN() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[pin]);
  return pin;
}

/**
 * Create a new room and return its PIN.
 *
 * @param {string} roomName
 * @param {string} hostId - socket.id of the creating host
 * @returns {string} 4-digit PIN
 */
function createRoom(roomName, hostId) {
  const pin = generatePIN();
  rooms[pin] = {
    roomName,
    hostId,
    players: [],
    status: 'lobby',
    currentQ: -1,
    answersIn: {},
  };
  return pin;
}

/**
 * Look up a room by PIN.
 * @param {string} pin
 * @returns {object|undefined}
 */
function getRoom(pin) {
  return rooms[pin];
}

/**
 * Delete a room by PIN.
 * @param {string} pin
 */
function deleteRoom(pin) {
  delete rooms[pin];
}

/**
 * Add a player to a room, ignoring duplicates (idempotent).
 *
 * @param {string} pin
 * @param {{ id: string, name: string }} player
 * @returns {boolean} true if player was newly added, false if already present
 */
function addPlayer(pin, player) {
  const room = rooms[pin];
  if (!room) return false;

  const exists = room.players.some((p) => p.id === player.id);
  if (exists) return false;

  room.players.push({ id: player.id, name: player.name, score: 0 });
  return true;
}

/**
 * Remove a player from all rooms by socket id.
 * Returns the PIN of the room affected (or null if none).
 *
 * @param {string} socketId
 * @returns {string|null}
 */
function removePlayer(socketId) {
  for (const pin in rooms) {
    const room = rooms[pin];
    const before = room.players.length;
    room.players = room.players.filter((p) => p.id !== socketId);
    if (room.players.length < before) return pin;
  }
  return null;
}

/**
 * Find the PIN of the room where socketId is the host.
 * @param {string} socketId
 * @returns {string|null}
 */
function findHostPin(socketId) {
  for (const pin in rooms) {
    if (rooms[pin].hostId === socketId) return pin;
  }
  return null;
}

module.exports = {
  rooms, // exported for testing; treat as read-only outside this module
  generatePIN,
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  findHostPin,
};
