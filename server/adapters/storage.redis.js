/**
 * storage.redis.js
 *
 * Redis room store adapter for LocalFlux online / multi-instance mode.
 * Uses JSON serialization to maintain room state across process restarts.
 */

'use strict';

const LAN_ROOM_ID = 'local_flux_main';
const DEFAULT_AVATAR_OBJECT = { type: 'preset', value: 'avatar01.jpg' };

class RedisRoomStorage {
  constructor() {
    this.client = null;
    this.fallbackMemory = null;
  }

  init(redisClient) {
    this.client = redisClient;
    // Fallback to memory if Redis connection fails
    this.fallbackMemory = require('./storage.memory');
  }

  async initLanRoom(roomName, hostId, hostSessionId = null, maxPlayers = 20) {
    if (!this.client) {
      return this.fallbackMemory.initLanRoom(roomName, hostId, hostSessionId, maxPlayers);
    }

    const normalizedMaxPlayers = Number.isInteger(Number(maxPlayers)) && Number(maxPlayers) > 0
      ? Number(maxPlayers)
      : 20;

    const room = {
      roomName: roomName || 'LocalFlux Game',
      hostId,
      hostSessionId,
      maxPlayers: normalizedMaxPlayers,
      players: [],
      status: 'lobby',
      currentQ: -1,
      answersIn: {},
      answerMode: 'auto',
      questionTimerSeconds: 15,
      gameDifficulty: 'Normal',
      activeSlide: null,
      chatHistory: [],
    };

    await this.client.set(`room:${LAN_ROOM_ID}`, JSON.stringify(room));
    return LAN_ROOM_ID;
  }

  async getRoom() {
    if (!this.client) return this.fallbackMemory.getRoom();

    const data = await this.client.get(`room:${LAN_ROOM_ID}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async deleteRoom() {
    if (!this.client) return this.fallbackMemory.deleteRoom();
    await this.client.del(`room:${LAN_ROOM_ID}`);
  }

  async addPlayer(player) {
    if (!this.client) return this.fallbackMemory.addPlayer(player);

    const room = await this.getRoom();
    if (!room || !player || !player.id) return false;

    const exists = room.players.some((p) => p.id === player.id);
    if (exists) return false;

    const normalized = {
      id: String(player.id).trim(),
      name: String(player.name || 'Guest').trim() || 'Guest',
      avatarObject: player.avatarObject && typeof player.avatarObject === 'object' ? player.avatarObject : DEFAULT_AVATAR_OBJECT,
      score: Number(player.score || 0),
      streak: Number(player.streak || 0),
    };

    room.players.push(normalized);
    await this.client.set(`room:${LAN_ROOM_ID}`, JSON.stringify(room));
    return true;
  }

  async removePlayer(socketId) {
    if (!this.client) return this.fallbackMemory.removePlayer(socketId);

    const room = await this.getRoom();
    if (!room) return false;

    const before = room.players.length;
    room.players = room.players.filter((p) => p.id !== socketId);
    if (room.players.length < before) {
      await this.client.set(`room:${LAN_ROOM_ID}`, JSON.stringify(room));
      return true;
    }
    return false;
  }

  async getHostId() {
    const room = await this.getRoom();
    return room ? room.hostId : null;
  }
}

module.exports = new RedisRoomStorage();
