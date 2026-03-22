/**
 * tests/gameEngine.test.js
 *
 * Unit tests for server/core/gameEngine.js
 *
 * The game engine is pure logic — no sockets, no I/O.
 * Each test builds its own minimal room + slides fixture.
 */

'use strict';

const { startGame, submitAnswer, advanceQuestion } = require('../core/gameEngine');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRoom(overrides = {}) {
  return {
    roomName: 'Test Room',
    hostId: 'host-1',
    players: [
      { id: 'p1', name: 'Alice', score: 0 },
      { id: 'p2', name: 'Bob', score: 0 },
    ],
    status: 'lobby',
    currentQ: -1,
    answersIn: {},
    ...overrides,
  };
}

const SLIDES = [
  {
    id: 'slide_01',
    type: 'mcq',
    prompt: 'Who directed Inception?',
    image: null,
    options: ['Nolan', 'Spielberg', 'Scott', 'Cameron'],
    correctIndex: 0,
    acceptedAnswers: [],
    suggestionBank: [],
    timeLimit: 20000,
  },
  {
    id: 'slide_02',
    type: 'mcq',
    prompt: 'What year did Titanic release?',
    image: null,
    options: ['1995', '1996', '1997', '1998'],
    correctIndex: 2,
    acceptedAnswers: [],
    suggestionBank: [],
    timeLimit: 20000,
  },
];

// ── startGame ─────────────────────────────────────────────────────────────────

describe('startGame()', () => {
  test('transitions room status from lobby to started', () => {
    const room = makeRoom();
    startGame(room, SLIDES);
    expect(room.status).toBe('started');
  });

  test('sets currentQ to 0', () => {
    const room = makeRoom();
    startGame(room, SLIDES);
    expect(room.currentQ).toBe(0);
  });

  test('returns sanitized first question with index and total', () => {
    const room = makeRoom();
    const result = startGame(room, SLIDES);
    expect(result.index).toBe(0);
    expect(result.total).toBe(SLIDES.length);
    expect(result.question).not.toHaveProperty('correctIndex');
    expect(result.question).not.toHaveProperty('acceptedAnswers');
    expect(result.question.prompt).toBe(SLIDES[0].prompt);
  });

  test('resets answersIn', () => {
    const room = makeRoom({ answersIn: { 'p1': 'Nolan' } });
    room.status = 'lobby'; // reset so startGame accepts it
    startGame(room, SLIDES);
    expect(room.answersIn).toEqual({});
  });

  test('throws when there are no players', () => {
    const room = makeRoom({ players: [] });
    expect(() => startGame(room, SLIDES)).toThrow('at least one player');
  });

  test('throws when game is already in progress', () => {
    const room = makeRoom({ status: 'started' });
    expect(() => startGame(room, SLIDES)).toThrow('already in progress');
  });
});

// ── submitAnswer ──────────────────────────────────────────────────────────────

describe('submitAnswer()', () => {
  function startedRoom() {
    const room = makeRoom({ status: 'started', currentQ: 0, answersIn: {} });
    return room;
  }

  test('awards 100 points for the correct answer', () => {
    const room = startedRoom();
    submitAnswer(room, SLIDES, 'p1', 'Nolan');
    const p1 = room.players.find((p) => p.id === 'p1');
    expect(p1.score).toBe(100);
  });

  test('does not award points for a wrong answer', () => {
    const room = startedRoom();
    submitAnswer(room, SLIDES, 'p1', 'Spielberg');
    expect(room.players.find((p) => p.id === 'p1').score).toBe(0);
  });

  test('returns correct: true for the right answer', () => {
    const room = startedRoom();
    const res = submitAnswer(room, SLIDES, 'p1', 'Nolan');
    expect(res.correct).toBe(true);
  });

  test('returns correct: false for the wrong answer', () => {
    const room = startedRoom();
    const res = submitAnswer(room, SLIDES, 'p1', 'Cameron');
    expect(res.correct).toBe(false);
  });

  test('rejects duplicate answers from the same player', () => {
    const room = startedRoom();
    submitAnswer(room, SLIDES, 'p1', 'Nolan');
    const res = submitAnswer(room, SLIDES, 'p1', 'Nolan');
    expect(res.alreadyAnswered).toBe(true);
    // Score should not be doubled
    expect(room.players.find((p) => p.id === 'p1').score).toBe(100);
  });

  test('tracks answer count correctly', () => {
    const room = startedRoom();
    const r1 = submitAnswer(room, SLIDES, 'p1', 'Nolan');
    expect(r1.answerCount).toBe(1);
    const r2 = submitAnswer(room, SLIDES, 'p2', 'Scott');
    expect(r2.answerCount).toBe(2);
  });

  test('does nothing when game is not in started status', () => {
    const room = makeRoom({ status: 'lobby', currentQ: 0, answersIn: {} });
    const res = submitAnswer(room, SLIDES, 'p1', 'Nolan');
    expect(res.answerCount).toBe(0);
  });
});

// ── advanceQuestion ───────────────────────────────────────────────────────────

describe('advanceQuestion()', () => {
  function inProgressRoom(currentQ = 0) {
    return makeRoom({ status: 'started', currentQ, answersIn: {} });
  }

  test('emits the correct_answer in the result', () => {
    const room = inProgressRoom(0);
    const { result } = advanceQuestion(room, SLIDES);
    expect(result.correct_answer).toBe(SLIDES[0].options[SLIDES[0].correctIndex]);
  });

  test('includes current scores in the result', () => {
    const room = inProgressRoom(0);
    room.players[0].score = 100;
    const { result } = advanceQuestion(room, SLIDES);
    expect(result.scores).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Alice', score: 100 }),
      expect.objectContaining({ name: 'Bob', score: 0 }),
    ]));
  });

  test('advances currentQ by 1', () => {
    const room = inProgressRoom(0);
    advanceQuestion(room, SLIDES);
    expect(room.currentQ).toBe(1);
  });

  test('resets answersIn', () => {
    const room = inProgressRoom(0);
    room.answersIn = { p1: 'Nolan' };
    advanceQuestion(room, SLIDES);
    expect(room.answersIn).toEqual({});
  });

  test('returns next question data when more questions remain', () => {
    const room = inProgressRoom(0);
    const { next, gameOver } = advanceQuestion(room, SLIDES);
    expect(gameOver).toBeNull();
    expect(next).not.toBeNull();
    expect(next.index).toBe(1);
    expect(next.total).toBe(SLIDES.length);
    expect(next.question).not.toHaveProperty('correctIndex');
  });

  test('sets status to finished and returns gameOver when last question is revealed', () => {
    const room = inProgressRoom(SLIDES.length - 1);
    const { next, gameOver } = advanceQuestion(room, SLIDES);
    expect(next).toBeNull();
    expect(gameOver).not.toBeNull();
    expect(room.status).toBe('finished');
  });

  test('sorts final scores descending in gameOver', () => {
    const room = inProgressRoom(SLIDES.length - 1);
    room.players[0].score = 0;   // Alice
    room.players[1].score = 100; // Bob
    const { gameOver } = advanceQuestion(room, SLIDES);
    expect(gameOver.scores[0].name).toBe('Bob');
    expect(gameOver.scores[1].name).toBe('Alice');
  });

  test('throws when game is not in progress', () => {
    const room = makeRoom({ status: 'lobby' });
    expect(() => advanceQuestion(room, SLIDES)).toThrow('not in progress');
  });
});
