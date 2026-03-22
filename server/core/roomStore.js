/**
 * roomStore.js
 *
 * Single global LAN room manager.
 * LocalFlux runs on a single local server with only ONE active game at a time.
 *
 * Room shape:
 * {
 *   roomName : string,
 *   hostId   : string|null,     // socket.id of the host
 *   hostSessionId : string|null,// stable host session for reconnect/reclaim
 *   players  : Array<{          // joined players
 *     id    : string,           // socket.id
 *     name  : string,
 *     avatarObject: { type: 'gradient' | 'icon' | 'preset', value: string },
 *     score : number,
 *   }>,
 *   status   : 'lobby' | 'started' | 'finished',
 *   currentQ : number,          // index into QUESTIONS, -1 = not started
 *   answersIn: Record<string, string>, // socketId → answer submitted this round
 * }
 */

'use strict';

const LAN_ROOM_ID = 'local_flux_main';

/** @type {Record<string, object>} */
const rooms = {};

/**
 * Initialize or reset the global LAN room.
 * @param {string} roomName - Display name for the room
 * @param {string} hostId - socket.id of the host
 * @param {string|null} [hostSessionId] - stable browser session id for host recovery
 * @returns {string} The room id (always LAN_ROOM_ID)
 */
function initLanRoom(roomName, hostId, hostSessionId = null) {
  rooms[LAN_ROOM_ID] = {
    roomName: roomName || 'LocalFlux Game',
    hostId,
    hostSessionId,
    players: [],
    status: 'lobby',
    currentQ: -1,
    answersIn: {},
    answerMode: 'auto',
    activeSlide: null,
  };
  return LAN_ROOM_ID;
}

/**
 * Get the global LAN room.
 * @returns {object|undefined}
 */
function getRoom() {
  return rooms[LAN_ROOM_ID];
}

/**
 * Delete the global LAN room (reset after game finishes).
 */
function deleteRoom() {
  delete rooms[LAN_ROOM_ID];
}

/**
 * Add a player to the LAN room, ignoring duplicates (idempotent).
 * @param {{ id: string, name: string, avatarObject?: { type: string, value: string } }} player
 * @returns {boolean} true if player was newly added, false if already present
 */
function addPlayer(player) {
  const room = rooms[LAN_ROOM_ID];
  if (!room) return false;

  const exists = room.players.some((p) => p.id === player.id);
  if (exists) return false;

  room.players.push({
    id: player.id,
    name: player.name,
    avatarObject: player.avatarObject || { type: 'gradient', value: 'emerald' },
    score: 0,
  });
  return true;
}

/**
 * Remove a player from the LAN room by socket id.
 * @param {string} socketId
 * @returns {boolean} true if player was found and removed
 */
function removePlayer(socketId) {
  const room = rooms[LAN_ROOM_ID];
  if (!room) return false;

  const before = room.players.length;
  room.players = room.players.filter((p) => p.id !== socketId);
  return room.players.length < before;
}

/**
 * Get the host socket id of the LAN room.
 * @returns {string|null}
 */
function getHostId() {
  const room = rooms[LAN_ROOM_ID];
  return room ? room.hostId : null;
}

module.exports = {
  LAN_ROOM_ID,
  rooms, // exported for testing; treat as read-only outside this module
  initLanRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  getHostId,
};
