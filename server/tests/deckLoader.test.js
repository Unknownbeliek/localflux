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
  test('loads a valid deck and returns its slides array', () => {
    const tmp = writeTempDeck({
      deck_meta: { title: 'Test' },
      slides: [{ id: 'slide_01', type: 'mcq', prompt: 'Who?', image: null, options: ['A', 'B', 'C', 'D'], correctIndex: 0, acceptedAnswers: [], suggestionBank: [], timeLimit: 20000 }],
    });
    const deck = loadDeck(tmp);
    expect(Array.isArray(deck.slides)).toBe(true);
    expect(deck.slides).toHaveLength(1);
    expect(deck.questions).toHaveLength(1); // compatibility alias
    fs.unlinkSync(tmp);
  });

  test('throws when the file does not exist', () => {
    expect(() => loadDeck('/nonexistent/path/deck.json')).toThrow('Deck not found');
  });

  test('throws when slides/questions key is missing', () => {
    const tmp = writeTempDeck({ deck_meta: { title: 'Bad' } });
    expect(() => loadDeck(tmp)).toThrow('"slides" array');
    fs.unlinkSync(tmp);
  });

  test('throws when slides and questions are not arrays', () => {
    const tmp = writeTempDeck({ questions: 'oops' });
    expect(() => loadDeck(tmp)).toThrow('"slides" array');
    fs.unlinkSync(tmp);
  });

  test('accepts legacy questions array as fallback', () => {
    const tmp = writeTempDeck({
      questions: [{ id: 'legacy_01', type: 'mcq', prompt: 'Legacy?', image: null, options: ['A', 'B', 'C', 'D'], correctIndex: 0, acceptedAnswers: [], suggestionBank: [], timeLimit: 20000 }],
    });
    const deck = loadDeck(tmp);
    expect(Array.isArray(deck.slides)).toBe(true);
    expect(deck.slides).toHaveLength(1);
    fs.unlinkSync(tmp);
  });
});

// ── sanitizeQuestion ─────────────────────────────────────────────────────────

describe('sanitizeQuestion()', () => {
  const raw = {
    id: 'slide_01',
    type: 'mcq',
    prompt: 'Who directed Inception?',
    image: null,
    options: ['Nolan', 'Spielberg', 'Scott', 'Cameron'],
    correctIndex: 0,
    acceptedAnswers: ['Nolan'],
    suggestionBank: ['Nolan', 'Scott'],
    timeLimit: 20000,
  };

  test('removes correctIndex from the output', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe).not.toHaveProperty('correctIndex');
  });

  test('removes acceptedAnswers from the output', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe).not.toHaveProperty('acceptedAnswers');
  });

  test('preserves allowed public fields', () => {
    const safe = sanitizeQuestion(raw);
    expect(safe.id).toBe(raw.id);
    expect(safe.prompt).toBe(raw.prompt);
    expect(safe.options).toEqual(raw.options);
    expect(safe.timeLimit).toBe(raw.timeLimit);
    expect(safe.suggestionBank).toEqual(raw.suggestionBank);
  });

  test('does not mutate the original question object', () => {
    sanitizeQuestion(raw);
    expect(raw).toHaveProperty('correctIndex', 0);
    expect(raw).toHaveProperty('acceptedAnswers');
  });
});
