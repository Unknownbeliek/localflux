/**
 * tests/deckApiShape.test.js
 *
 * Regression tests for server/core/deckApiShape.js
 * Ensures deck API endpoints handle both slides and questions schema variants.
 */

'use strict';

const { resolveDeckSlides, buildDeckSummary, buildDeckDetail } = require('../core/deckApiShape');

// ── resolveDeckSlides ────────────────────────────────────────────────────────

describe('resolveDeckSlides()', () => {
  test('resolves slides from slides key', () => {
    const deckWithSlides = {
      slides: [{ id: 'q1', type: 'mcq', prompt: 'Who?' }],
    };
    const slides = resolveDeckSlides(deckWithSlides);
    expect(Array.isArray(slides)).toBe(true);
    expect(slides).toHaveLength(1);
    expect(slides[0].id).toBe('q1');
  });

  test('falls back to questions when slides missing', () => {
    const legacyDeck = {
      questions: [
        { id: 'q1', type: 'mcq', prompt: 'Who?' },
        { id: 'q2', type: 'mcq', prompt: 'What?' },
      ],
    };
    const slides = resolveDeckSlides(legacyDeck);
    expect(Array.isArray(slides)).toBe(true);
    expect(slides).toHaveLength(2);
    expect(slides[1].id).toBe('q2');
  });

  test('prefers slides over questions when both present', () => {
    const deckWithBoth = {
      slides: [{ id: 'from-slides' }],
      questions: [{ id: 'from-questions' }],
    };
    const slides = resolveDeckSlides(deckWithBoth);
    expect(slides[0].id).toBe('from-slides');
  });

  test('returns null when neither slides nor questions present', () => {
    const badDeck = { meta: { title: 'Bad' } };
    const slides = resolveDeckSlides(badDeck);
    expect(slides).toBeNull();
  });

  test('returns null when slides/questions are not arrays', () => {
    expect(resolveDeckSlides({ slides: 'not-array' })).toBeNull();
    expect(resolveDeckSlides({ questions: 'not-array' })).toBeNull();
  });

  test('handles empty arrays', () => {
    expect(resolveDeckSlides({ slides: [] })).toEqual([]);
    expect(resolveDeckSlides({ questions: [] })).toEqual([]);
  });
});

// ── buildDeckSummary ─────────────────────────────────────────────────────────

describe('buildDeckSummary()', () => {
  test('builds summary from slides-based deck', () => {
    const deck = {
      slides: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    };
    const summary = buildDeckSummary('movie.json', deck);
    expect(summary.name).toBe('movie');
    expect(summary.file).toBe('movie.json');
    expect(summary.count).toBe(3);
  });

  test('builds summary from legacy questions-based deck', () => {
    const deck = {
      questions: [{ id: 'q1' }, { id: 'q2' }],
    };
    const summary = buildDeckSummary('trivia.json', deck);
    expect(summary.name).toBe('trivia');
    expect(summary.file).toBe('trivia.json');
    expect(summary.count).toBe(2);
  });

  test('strips .json extension from name', () => {
    const summary = buildDeckSummary('game-of-thrones.json', { slides: [] });
    expect(summary.name).toBe('game-of-thrones');
  });

  test('returns count=0 when no slides/questions', () => {
    const summary = buildDeckSummary('empty.json', {});
    expect(summary.count).toBe(0);
  });
});

// ── buildDeckDetail ──────────────────────────────────────────────────────────

describe('buildDeckDetail()', () => {
  test('builds detail from slides-based deck with both keys', () => {
    const deck = {
      slides: [
        { id: 'q1', type: 'mcq', prompt: 'Who?' },
        { id: 'q2', type: 'mcq', prompt: 'What?' },
      ],
    };
    const detail = buildDeckDetail('movie.json', deck);
    expect(detail).not.toBeNull();
    expect(detail.name).toBe('movie');
    expect(detail.file).toBe('movie.json');
    expect(detail.count).toBe(2);
    expect(detail.slides).toEqual(deck.slides);
    expect(detail.questions).toEqual(deck.slides); // backward-compat alias
  });

  test('builds detail from legacy questions-based deck with both keys', () => {
    const deck = {
      questions: [
        { id: 'q1', type: 'mcq', prompt: 'Who?' },
        { id: 'q2', type: 'mcq', prompt: 'What?' },
      ],
    };
    const detail = buildDeckDetail('legacy.json', deck);
    expect(detail).not.toBeNull();
    expect(detail.name).toBe('legacy');
    expect(detail.count).toBe(2);
    expect(detail.slides).toEqual(deck.questions);
    expect(detail.questions).toEqual(deck.questions); // same as slides when resolved from questions
  });

  test('ensures slides and questions keys are identical for consistency', () => {
    const deck = {
      slides: [{ id: 'q1' }, { id: 'q2' }],
    };
    const detail = buildDeckDetail('test.json', deck);
    expect(detail.slides).toBe(detail.questions); // same reference
  });

  test('returns null when neither slides nor questions present', () => {
    const badDeck = { meta: 'missing content' };
    const detail = buildDeckDetail('bad.json', badDeck);
    expect(detail).toBeNull();
  });

  test('returns null when slides/questions are not arrays', () => {
    expect(buildDeckDetail('bad.json', { slides: 'string' })).toBeNull();
    expect(buildDeckDetail('bad.json', { questions: {} })).toBeNull();
  });

  test('handles empty deck', () => {
    const detail = buildDeckDetail('empty.json', { slides: [] });
    expect(detail).not.toBeNull();
    expect(detail.count).toBe(0);
    expect(detail.slides).toEqual([]);
    expect(detail.questions).toEqual([]);
  });

  test('preserves full slide objects with all properties', () => {
    const fullSlide = {
      id: 'q1',
      type: 'mcq',
      prompt: 'Who won?',
      image: 'https://example.com/img.jpg',
      options: ['A', 'B', 'C'],
      correctIndex: 0,
      acceptedAnswers: [],
      suggestionBank: ['Hint 1'],
      timeLimit: 20000,
    };
    const detail = buildDeckDetail('detailed.json', { slides: [fullSlide] });
    expect(detail.slides[0]).toEqual(fullSlide);
    expect(detail.questions[0]).toEqual(fullSlide);
  });
});

// ── Regression: Schema Consistency ───────────────────────────────────────────

describe('Deck API Schema Consistency (Regression)', () => {
  test('client requesting /api/decks/:file receives both slides and questions keys', () => {
    // Simulate a slides-based deck
    const slidesDeck = {
      slides: [{ id: 's1' }, { id: 's2' }],
    };
    const detail = buildDeckDetail('slides-deck.json', slidesDeck);
    expect(detail.slides).toBeDefined();
    expect(detail.questions).toBeDefined();
    expect(detail.slides.length).toBe(2);
    expect(detail.questions.length).toBe(2);
  });

  test('client requesting /api/decks/:file receives both keys for legacy questions-based deck', () => {
    // Simulate a legacy questions-based deck
    const questionsDeck = {
      questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    };
    const detail = buildDeckDetail('legacy-deck.json', questionsDeck);
    expect(detail.slides).toBeDefined();
    expect(detail.questions).toBeDefined();
    expect(detail.slides.length).toBe(3);
    expect(detail.questions.length).toBe(3);
  });

  test('both /api/decks and /api/decks/:file use consistent summary logic', () => {
    const deck = {
      slides: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
    };

    const summary = buildDeckSummary('test.json', deck);
    const detail = buildDeckDetail('test.json', deck);

    expect(summary.count).toBe(detail.count);
    expect(summary.name).toBe(detail.name);
    expect(summary.file).toBe(detail.file);
  });
});
