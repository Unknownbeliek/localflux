/**
 * storage.memory.js
 *
 * In-memory room store adapter for LocalFlux offline / single-server mode.
 */

'use strict';

const LAN_ROOM_ID = 'local_flux_main';
const DEFAULT_AVATAR_OBJECT = { type: 'preset', value: 'avatar01.jpg' };

const rooms = Object.create(null);

function normalizePlayerRecord(player = {}) {
  const id = String(player.id || '').trim();
  const name = String(player.name || 'Guest').trim() || 'Guest';
  const avatarObject = player.avatarObject && typeof player.avatarObject === 'object'
    ? player.avatarObject
    : DEFAULT_AVATAR_OBJECT;

  return {
    id,
    name,
    avatarObject,
    score: Number(player.score || 0),
    streak: Number(player.streak || 0),
  };
}

class MemoryRoomStorage {
  async initLanRoom(roomName, hostId, hostSessionId = null, maxPlayers = 20) {
    const normalizedMaxPlayers = Number.isInteger(Number(maxPlayers)) && Number(maxPlayers) > 0
      ? Number(maxPlayers)
      : 20;

    rooms[LAN_ROOM_ID] = {
      roomName: roomName || 'LocalFlux Game',
      hostId,
      hostSessionId,
      maxPlayers: normalizedMaxPlayers,
      players: [],
      status: 'lobby',
      currentQ: -1,
      answersIn: Object.create(null),
      answerMode: 'auto',
      questionTimerSeconds: 15,
      gameDifficulty: 'Normal',
      activeSlide: null,
      chatHistory: [],
    };
    return LAN_ROOM_ID;
  }

  async getRoom() {
    return rooms[LAN_ROOM_ID] || null;
  }

  async deleteRoom() {
    delete rooms[LAN_ROOM_ID];
  }

  async addPlayer(player) {
    const room = rooms[LAN_ROOM_ID];
    if (!room || !player || !player.id) return false;

    const exists = room.players.some((p) => p.id === player.id);
    if (exists) return false;

    room.players.push(normalizePlayerRecord(player));
    return true;
  }

  async removePlayer(socketId) {
    const room = rooms[LAN_ROOM_ID];
    if (!room) return false;

    const before = room.players.length;
    room.players = room.players.filter((p) => p.id !== socketId);
    return room.players.length < before;
  }

  async getHostId() {
    const room = rooms[LAN_ROOM_ID];
    return room ? room.hostId : null;
  }
}

module.exports = new MemoryRoomStorage();
