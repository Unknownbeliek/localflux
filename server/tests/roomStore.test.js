/**
 * tests/roomStore.test.js
 *
 * Unit tests for server/core/roomStore.js (single LAN room model)
 *
 * Each test clears the rooms map before running to ensure isolation.
 */

'use strict';

const store = require('../core/roomStore');

// Reset the rooms store before every test
beforeEach(() => {
  delete store.rooms[store.LAN_ROOM_ID];
});

// ── initLanRoom ──────────────────────────────────────────────────────────────

describe('initLanRoom()', () => {
  test('returns the LAN_ROOM_ID constant', () => {
    const roomId = store.initLanRoom('Test Room', 'host-1');
    expect(roomId).toBe(store.LAN_ROOM_ID);
  });

  test('creates a room with the correct initial shape', () => {
    store.initLanRoom('Trivia Night', 'host-1', 'session-1');
    const room = store.getRoom();
    expect(room.roomName).toBe('Trivia Night');
    expect(room.hostId).toBe('host-1');
    expect(room.hostSessionId).toBe('session-1');
    expect(room.players).toEqual([]);
    expect(room.status).toBe('lobby');
    expect(room.currentQ).toBe(-1);
    expect(Object.keys(room.answersIn)).toHaveLength(0);
    expect(Object.getPrototypeOf(room.answersIn)).toBeNull();
    expect(room.maxPlayers).toBe(20);
  });

  test('accepts custom maxPlayers value when creating room', () => {
    store.initLanRoom('Trivia Night', 'host-1', 'session-1', 125);
    const room = store.getRoom();
    expect(room.maxPlayers).toBe(125);
  });

  test('resets an existing room', () => {
    store.initLanRoom('Room 1', 'host-1');
    store.initLanRoom('Room 2', 'host-2');
    const room = store.getRoom();
    expect(room.roomName).toBe('Room 2');
    expect(room.hostId).toBe('host-2');
  });
});

// ── getRoom ──────────────────────────────────────────────────────────────────

describe('getRoom()', () => {
  test('returns the LAN room', () => {
    store.initLanRoom('Test', 'h1');
    expect(store.getRoom()).toBeDefined();
    expect(store.getRoom().roomName).toBe('Test');
  });

  test('returns undefined if room does not exist', () => {
    expect(store.getRoom()).toBeUndefined();
  });
});

// ── addPlayer ────────────────────────────────────────────────────────────────

describe('addPlayer()', () => {
  beforeEach(() => {
    store.initLanRoom('Test Room', 'host-1');
  });

  test('adds a player to the room with score 0', () => {
    store.addPlayer({ id: 'p1', name: 'Alice' });
    const room = store.getRoom();
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ id: 'p1', name: 'Alice', score: 0, streak: 0 });
  });

  test('returns true when a new player is added', () => {
    expect(store.addPlayer({ id: 'p1', name: 'Alice' })).toBe(true);
  });

  test('does not add duplicate players', () => {
    store.addPlayer({ id: 'p1', name: 'Alice' });
    const added = store.addPlayer({ id: 'p1', name: 'Alice' });
    expect(added).toBe(false);
    expect(store.getRoom().players).toHaveLength(1);
  });

  test('returns false if no room exists', () => {
    delete store.rooms[store.LAN_ROOM_ID];
    expect(store.addPlayer({ id: 'p1', name: 'X' })).toBe(false);
  });
});

// ── removePlayer ─────────────────────────────────────────────────────────────

describe('removePlayer()', () => {
  beforeEach(() => {
    store.initLanRoom('Test', 'h1');
    store.addPlayer({ id: 'p1', name: 'Alice' });
    store.addPlayer({ id: 'p2', name: 'Bob' });
  });

  test('removes the player and returns true', () => {
    const removed = store.removePlayer('p1');
    expect(removed).toBe(true);
    expect(store.getRoom().players).toHaveLength(1);
    expect(store.getRoom().players[0].name).toBe('Bob');
  });

  test('returns false if the socket is not a player', () => {
    expect(store.removePlayer('ghost')).toBe(false);
  });

  test('returns false if no room exists', () => {
    delete store.rooms[store.LAN_ROOM_ID];
    expect(store.removePlayer('p1')).toBe(false);
  });
});

// ── deleteRoom ───────────────────────────────────────────────────────────────

describe('deleteRoom()', () => {
  beforeEach(() => {
    store.initLanRoom('Test', 'h1');
  });

  test('removes the LAN room from the store', () => {
    expect(store.getRoom()).toBeDefined();
    store.deleteRoom();
    expect(store.getRoom()).toBeUndefined();
  });

  test('is a no-op if room does not exist', () => {
    store.deleteRoom();
    expect(store.getRoom()).toBeUndefined();
  });
});

// ── getHostId ────────────────────────────────────────────────────────────────

describe('getHostId()', () => {
  test('returns the host ID of the room', () => {
    store.initLanRoom('Test', 'host-1');
    expect(store.getHostId()).toBe('host-1');
  });

  test('returns null if no room exists', () => {
    expect(store.getHostId()).toBeNull();
  });

  test('returns null if host is not set', () => {
    store.initLanRoom('Test', null);
    expect(store.getHostId()).toBeNull();
  });
});

