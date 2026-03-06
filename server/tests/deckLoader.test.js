/**
 * tests/deckLoader.test.js
 *
 * Unit tests for server/core/deckLoader.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const { loadDeck, sanitizeQuestion } = require('../core/deckLoader');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Write a temporary deck JSON file and return its path. */
function writeTempDeck(obj) {
  const p = path.join(os.tmpdir(), `lf-test-deck-${Date.now()}.json`);
  fs.writeFileSync(p, JSON.stringify(obj), 'utf-8');
  return p;
}

// ── loadDeck ─────────────────────────────────────────────────────────────────

describe('loadDeck()', () => {
  test('loads a valid deck and returns its questions array', () => {
    const tmp = writeTempDeck({
      deck_meta: { title: 'Test' },
      questions: [{ q_id: 'q_01', prompt: 'Who?' }],
    });
    const deck = loadDeck(tmp);
    expect(Array.isArray(deck.questions)).toBe(true);
    expect(deck.questions).toHaveLength(1);
    fs.unlinkSync(tmp);
  });

  test('throws when the file does not exist', () => {
    expect(() => loadDeck('/nonexistent/path/deck.json')).toThrow('Deck not found');
  });

  test('throws when questions key is missing', () => {
    const tmp = writeTempDeck({ deck_meta: { title: 'Bad' } });
    expect(() => loadDeck(tmp)).toThrow('"questions" array');
    fs.unlinkSync(tmp);
  });

  test('throws when questions is not an array', () => {
    const tmp = writeTempDeck({ questions: 'oops' });
    expect(() => loadDeck(tmp)).toThrow('"questions" array');
    fs.unlinkSync(tmp);
  });
});

// ── sanitizeQuestion ─────────────────────────────────────────────────────────

describe('sanitizeQuestion()', () => {
  const raw = {
    q_id: 'q_01',
    type: 'text_only',
    prompt: 'Who directed Inception?',
    options: ['Nolan', 'Spielberg', 'Scott', 'Cameron'],
    correct_answer: 'Nolan',
    fuzzy_allowances: ['nolan', 'christopher nolan'],
    time_limit_ms: 20000,
  };

  test('removes correct_answer from the output', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe).not.toHaveProperty('correct_answer');
  });

  test('removes fuzzy_allowances from the output', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe).not.toHaveProperty('fuzzy_allowances');
  });

  test('preserves all other fields', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe.q_id).toBe(raw.q_id);
    expect(safe.prompt).toBe(raw.prompt);
    expect(safe.options).toEqual(raw.options);
    expect(safe.time_limit_ms).toBe(raw.time_limit_ms);
  });

  test('does not mutate the original question object', () => {
    sanitizeQuestion(raw);
    expect(raw).toHaveProperty('correct_answer', 'Nolan');
  });
});
