/**
 * tests/roomStore.test.js
 *
 * Unit tests for server/core/roomStore.js
 *
 * Each test clears the rooms map before running to ensure isolation.
 */

'use strict';

const store = require('../core/roomStore');

// Reset the rooms store before every test
beforeEach(() => {
  for (const pin in store.rooms) delete store.rooms[pin];
});

// ── createRoom ───────────────────────────────────────────────────────────────

describe('createRoom()', () => {
  test('returns a 4-digit string PIN', () => {
    const pin = store.createRoom('Test Room', 'host-1');
    expect(typeof pin).toBe('string');
    expect(pin).toMatch(/^\d{4}$/);
  });

  test('creates a room with the correct initial shape', () => {
    const pin = store.createRoom('Trivia Night', 'host-1');
    const room = store.getRoom(pin);
    expect(room.roomName).toBe('Trivia Night');
    expect(room.hostId).toBe('host-1');
    expect(room.players).toEqual([]);
    expect(room.status).toBe('lobby');
    expect(room.currentQ).toBe(-1);
    expect(room.answersIn).toEqual({});
  });

  test('generates unique PINs for concurrent rooms', () => {
    const pins = new Set();
    for (let i = 0; i < 10; i++) pins.add(store.createRoom(`Room ${i}`, `host-${i}`));
    expect(pins.size).toBe(10);
  });
});

// ── getRoom ──────────────────────────────────────────────────────────────────

describe('getRoom()', () => {
  test('returns the room for a valid PIN', () => {
    const pin = store.createRoom('Test', 'h1');
    expect(store.getRoom(pin)).toBeDefined();
  });

  test('returns undefined for an unknown PIN', () => {
    expect(store.getRoom('0000')).toBeUndefined();
  });
});

// ── deleteRoom ───────────────────────────────────────────────────────────────

describe('deleteRoom()', () => {
  test('removes the room from the store', () => {
    const pin = store.createRoom('Test', 'h1');
    store.deleteRoom(pin);
    expect(store.getRoom(pin)).toBeUndefined();
  });

  test('is a no-op for non-existent PINs', () => {
    expect(() => store.deleteRoom('9999')).not.toThrow();
  });
});

// ── addPlayer ────────────────────────────────────────────────────────────────

describe('addPlayer()', () => {
  test('adds a player to the room with score 0', () => {
    const pin = store.createRoom('Test', 'h1');
    store.addPlayer(pin, { id: 'p1', name: 'Alice' });
    const room = store.getRoom(pin);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ id: 'p1', name: 'Alice', score: 0 });
  });

  test('returns true when a new player is added', () => {
    const pin = store.createRoom('Test', 'h1');
    expect(store.addPlayer(pin, { id: 'p1', name: 'Alice' })).toBe(true);
  });

  test('does not add duplicate players', () => {
    const pin = store.createRoom('Test', 'h1');
    store.addPlayer(pin, { id: 'p1', name: 'Alice' });
    const added = store.addPlayer(pin, { id: 'p1', name: 'Alice' });
    expect(added).toBe(false);
    expect(store.getRoom(pin).players).toHaveLength(1);
  });

  test('returns false for unknown PIN', () => {
    expect(store.addPlayer('0000', { id: 'p1', name: 'X' })).toBe(false);
  });
});

// ── removePlayer ─────────────────────────────────────────────────────────────

describe('removePlayer()', () => {
  test('removes the player and returns the PIN', () => {
    const pin = store.createRoom('Test', 'h1');
    store.addPlayer(pin, { id: 'p1', name: 'Alice' });
    const affected = store.removePlayer('p1');
    expect(affected).toBe(pin);
    expect(store.getRoom(pin).players).toHaveLength(0);
  });

  test('returns null if the socket is not a player in any room', () => {
    expect(store.removePlayer('ghost')).toBeNull();
  });
});

// ── findHostPin ───────────────────────────────────────────────────────────────

describe('findHostPin()', () => {
  test('returns the PIN where the socket is the host', () => {
    const pin = store.createRoom('Test', 'host-socket');
    expect(store.findHostPin('host-socket')).toBe(pin);
  });

  test('returns null when the socket is not a host', () => {
    expect(store.findHostPin('nobody')).toBeNull();
  });
});
