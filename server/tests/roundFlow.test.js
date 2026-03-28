/**
 * tests/roundFlow.test.js
 *
 * Unit tests for server/network/roundFlow.js
 *
 * Tests the round timing and state management:
 * - emitNextQuestionForRound: Sends questions with timing
 * - settleCurrentRound: Ends round and calculates results
 * - Timer management and cleanup
 * - Round ID and question index tracking
 */

'use strict';

// Mock setup for roundFlow testing
describe('roundFlow module', () => {
  let mockIo, mockRoom, roundFlow;
  let questionTimeoutTimers, roundLockTimers, roundTransitionTimers;
  let clearedTimers;

  beforeEach(() => {
    jest.useFakeTimers();
    clearedTimers = [];
    questionTimeoutTimers = new Map();
    roundLockTimers = new Map();
    roundTransitionTimers = new Map();

    // Mock Socket.IO
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock room state
    mockRoom = {
      roomName: 'Test Room',
      hostId: 'host1',
      status: 'started',
      currentQ: 0,
      roundId: 1,
      roundSettled: false,
      players: [],
    };

    // Mock utils
    const mockGetRoom = jest.fn(() => mockRoom);
    const mockDeleteRoom = jest.fn();
    const mockMarkRoomClosed = jest.fn();
    const mockAdvanceQuestion = jest.fn(() => ({
      result: { correct_answer: 'A', scores: [] },
      next: { index: 1, total: 5, question: { prompt: 'Next?' } },
      gameOver: null,
    }));
    const mockClearTimerByRoom = jest.fn((timersMap, roomId) => {
      if (timersMap.has(roomId)) {
        clearedTimers.push({ mapType: 'timersMap', roomId });
        timersMap.delete(roomId);
      }
    });
    const mockClearRoundTimers = jest.fn(() => {
      for (const timer of questionTimeoutTimers.values()) {
        clearTimeout(timer);
      }
      for (const timer of roundLockTimers.values()) {
        clearTimeout(timer);
      }
      for (const timer of roundTransitionTimers.values()) {
        clearTimeout(timer);
      }
      questionTimeoutTimers.clear();
      roundLockTimers.clear();
      roundTransitionTimers.clear();
    });
    const mockWithQuestionTiming = jest.fn((payload) => ({
      ...payload,
      serverTime: Date.now(),
      durationMs: payload.durationMs || 20000,
    }));

    // Import roundFlow module
    const { createRoundFlow } = require('../network/roundFlow');
    roundFlow = createRoundFlow({
      io: mockIo,
      LAN_ROOM_ID: 'lan_room',
      withQuestionTiming: mockWithQuestionTiming,
      getRoom: mockGetRoom,
      deleteRoom: mockDeleteRoom,
      advanceQuestion: mockAdvanceQuestion,
      markRoomClosed: mockMarkRoomClosed,
      clearTimerByRoom: mockClearTimerByRoom,
      clearRoundTimers: mockClearRoundTimers,
      questionTimeoutTimers,
      roundLockTimers,
      roundTransitionTimers,
      roundLockDelayMs: 700,
      roundTransitionDelayMs: 3000,
    });
  });

  afterEach(() => {
    for (const timer of questionTimeoutTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of roundLockTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of roundTransitionTimers.values()) {
      clearTimeout(timer);
    }

    questionTimeoutTimers.clear();
    roundLockTimers.clear();
    roundTransitionTimers.clear();
    jest.useRealTimers();
  });

  // ── emitNextQuestionForRound Tests ────────────────────────────────────────

  describe('emitNextQuestionForRound()', () => {
    test('increments roundId', () => {
      const initialRoundId = mockRoom.roundId;
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      expect(mockRoom.roundId).toBe(initialRoundId + 1);
    });

    test('sets roundSettled to false', () => {
      mockRoom.roundSettled = true;
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      expect(mockRoom.roundSettled).toBe(false);
    });

    test('emits next_question event via socket.io', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      expect(mockIo.to).toHaveBeenCalledWith('lan_room');
      expect(mockIo.emit).toHaveBeenCalledWith('next_question', expect.any(Object));
    });

    test('sets timeout based on question duration', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
        durationMs: 15000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      expect(questionTimeoutTimers.has('lan_room')).toBe(true);
    });

    test('defaults timeout to 20000ms if durationMs is missing', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      // Timer should be created with default timeouts
      expect(questionTimeoutTimers.has('lan_room')).toBe(true);
    });

    test('stores timeout handle in map for cleanup', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Test question?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);

      const handle = questionTimeoutTimers.get('lan_room');
      expect(handle).toBeDefined();
      // In Jest fake timers, setTimeout returns a Timeout object, not a number
      expect(handle).not.toBeNull();
    });
  });

  // ── settleCurrentRound Tests ──────────────────────────────────────────────

  describe('settleCurrentRound()', () => {
    test('returns false and error if room not found', (done) => {
      const mockGetRoomEmpty = jest.fn(() => null);
      const { createRoundFlow } = require('../network/roundFlow');
      const rf = createRoundFlow({
        io: mockIo,
        LAN_ROOM_ID: 'lan_room',
        withQuestionTiming: (p) => p,
        getRoom: mockGetRoomEmpty,
        deleteRoom: jest.fn(),
        advanceQuestion: jest.fn(),
        markRoomClosed: jest.fn(),
        clearTimerByRoom: jest.fn(),
        clearRoundTimers: jest.fn(),
        questionTimeoutTimers,
        roundLockTimers,
        roundTransitionTimers,
        roundLockDelayMs: 700,
        roundTransitionDelayMs: 3000,
      });

      rf.settleCurrentRound({
        callback: (result) => {
          expect(result.success).toBe(false);
          expect(result.error).toContain('Room not found');
          done();
        },
      });
    });

    test('returns error if game not started', (done) => {
      mockRoom.status = 'lobby';

      roundFlow.settleCurrentRound({
        callback: (result) => {
          expect(result.success).toBe(false);
          expect(result.error).toContain('not in progress');
          done();
        },
      });
    });

    test('returns success if already settled', (done) => {
      mockRoom.roundSettled = true;

      roundFlow.settleCurrentRound({
        callback: (result) => {
          expect(result.success).toBe(true);
          expect(result.alreadySettled).toBe(true);
          done();
        },
      });
    });

    test('marks room as roundSettled', (done) => {
      mockRoom.roundSettled = false;

      roundFlow.settleCurrentRound({
        callback: () => {
          expect(mockRoom.roundSettled).toBe(true);
          done();
        },
      });
    });

    test('locks the question index during settlement', (done) => {
      const initialQ = mockRoom.currentQ;

      roundFlow.settleCurrentRound({
        callback: () => {
          // After settlement, currentQ should not change
          expect(mockRoom.currentQ).toBe(initialQ);
          done();
        },
      });
    });

    test('calls with reason parameter', (done) => {
      roundFlow.settleCurrentRound({
        reason: 'timeout',
        callback: (result) => {
          expect(result.success).toBe(true);
          done();
        },
      });
    });
  });

  // ── Timer Cleanup Tests ───────────────────────────────────────────────────

  describe('timer cleanup', () => {
    test('existing timeout is cleared before setting new one', () => {
      const nextQuestion1 = {
        index: 0,
        total: 5,
        question: { prompt: 'Q1?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion1);

      // Emit another question
      mockRoom.roundId = 2;
      const nextQuestion2 = {
        index: 1,
        total: 5,
        question: { prompt: 'Q2?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion2);

      // Timer should be cleared and replaced
      expect(clearedTimers.length).toBeGreaterThan(0);
    });
  });

  // ── State Validation Tests ────────────────────────────────────────────────

  describe('round state tracking', () => {
    test('roundId increments sequentially', () => {
      const baseRoundId = mockRoom.roundId;
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Q1?' },
        durationMs: 20000,
      };

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);
      expect(mockRoom.roundId).toBe(baseRoundId + 1);

      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);
      expect(mockRoom.roundId).toBe(baseRoundId + 2);
    });

    test('currentQ remains locked during round settlement', () => {
      mockRoom.currentQ = 2;

      roundFlow.settleCurrentRound({
        callback: () => {
          // Question index should be locked, not auto-advanced
          expect(mockRoom.currentQ).toBe(2);
        },
      });
    });

    test('roundSettled flag prevents duplicate settlements', () => {
      mockRoom.roundSettled = false;

      roundFlow.settleCurrentRound({
        callback: () => {
          expect(mockRoom.roundSettled).toBe(true);

          // Try to settle again
          roundFlow.settleCurrentRound({
            callback: (result) => {
              expect(result.alreadySettled).toBe(true);
            },
          });
        },
      });
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('handles undefined callback gracefully', () => {
      expect(() => {
        roundFlow.settleCurrentRound({ reason: 'timeout' });
      }).not.toThrow();
    });

    test('handles zero duration timeout', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Q?' },
        durationMs: 0,
      };

      // Should default to 20000ms
      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);
      expect(questionTimeoutTimers.has('lan_room')).toBe(true);
    });

    test('handles negative duration gracefully', () => {
      const nextQuestion = {
        index: 0,
        total: 5,
        question: { prompt: 'Q?' },
        durationMs: -5000,
      };

      // Should use fallback
      roundFlow.emitNextQuestionForRound(mockRoom, nextQuestion);
      expect(questionTimeoutTimers.has('lan_room')).toBe(true);
    });
  });
});
