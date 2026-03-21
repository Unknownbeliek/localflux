'use strict';

const { registerTypeGuessHandlers } = require('../network/typeGuessHandlers');

function makeSocket() {
  const handlers = new Map();
  return {
    id: 'p1',
    playerName: 'Player One',
    on(event, cb) {
      handlers.set(event, cb);
    },
    trigger(event, payload, ack) {
      const cb = handlers.get(event);
      if (!cb) throw new Error(`Missing handler for ${event}`);
      cb(payload, ack);
    },
  };
}

function makeIo() {
  const calls = [];
  return {
    calls,
    to(room) {
      return {
        emit(event, payload) {
          calls.push({ room, event, payload });
        },
      };
    },
  };
}

function makeRoom(overrides = {}) {
  return {
    status: 'started',
    answerMode: 'type_guess',
    hostId: 'h1',
    currentQ: 0,
    roundSettled: false,
    questions: [
      {
        correct_answer: 'Interstellar',
        fuzzy_allowances: ['Interstellar (2014)'],
      },
    ],
    players: [{ id: 'p1', name: 'Player One', score: 0 }],
    answersIn: {},
    ...overrides,
  };
}

describe('typeGuessHandlers', () => {
  test('awards points on match', () => {
    const room = makeRoom();
    const socket = makeSocket();
    const io = makeIo();

    registerTypeGuessHandlers({
      socket,
      io,
      getRoom: () => room,
      LAN_ROOM_ID: 'local_flux_main',
      settleCurrentRound: jest.fn(),
      getChatMode: () => 'FREE',
    });

    let ack;
    socket.trigger('player:chat_guess', { text: 'Interstellar' }, (res) => {
      ack = res;
    });

    expect(ack.ok).toBe(true);
    expect(ack.matched).toBe(true);
    expect(room.players[0].score).toBe(100);
    expect(room.answersIn.p1).toBe('Interstellar');
    const systemMsg = io.calls.find((c) => c.event === 'chat:message' && c.payload?.event === 'guess_correct');
    expect(systemMsg?.payload?.text).toContain('+100 pts');
  });

  test('rejects guesses when mode is multiple choice', () => {
    const room = makeRoom({ answerMode: 'multiple_choice' });
    const socket = makeSocket();
    const io = makeIo();

    registerTypeGuessHandlers({
      socket,
      io,
      getRoom: () => room,
      LAN_ROOM_ID: 'local_flux_main',
      settleCurrentRound: jest.fn(),
      getChatMode: () => 'FREE',
    });

    let ack;
    socket.trigger('player:chat_guess', { text: 'Interstellar' }, (res) => {
      ack = res;
    });

    expect(ack.ok).toBe(false);
    expect(ack.reason).toBe('type_guess_disabled');
  });

  test('does not broadcast wrong guesses in restricted mode', () => {
    const room = makeRoom();
    const socket = makeSocket();
    const io = makeIo();

    registerTypeGuessHandlers({
      socket,
      io,
      getRoom: () => room,
      LAN_ROOM_ID: 'local_flux_main',
      settleCurrentRound: jest.fn(),
      getChatMode: () => 'RESTRICTED',
    });

    let ack;
    socket.trigger('player:chat_guess', { text: 'wrong answer' }, (res) => {
      ack = res;
    });

    expect(ack.ok).toBe(true);
    expect(ack.matched).toBe(false);
    const missMessage = io.calls.find((c) => c.event === 'chat:message' && c.payload?.event === 'guess_miss');
    expect(missMessage).toBeUndefined();
  });
});
