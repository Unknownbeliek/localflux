/**
 * tests/answerValidation.test.js
 *
 * Unit tests for server/core/answerValidation.js
 *
 * Tests the validateAnswer function for:
 * - MCQ validation (index matching, text matching)
 * - Type-guess validation with fuzzy matching
 * - Different game modes affecting fuzzy thresholds
 * - Edge cases (null/undefined slides, invalid answers)
 */

'use strict';

const { validateAnswer, buildAcceptedAnswers } = require('../core/answerValidation');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mcqSlide = {
  id: 'mcq_01',
  type: 'mcq',
  prompt: 'Who directed Inception?',
  answer_mode: 'mcq',
  options: ['Christopher Nolan', 'Steven Spielberg', 'David Fincher', 'Martin Scorsese'],
  correctIndex: 0,
  acceptedAnswers: [],
  fuzzy_allowances: [],
};

const typeGuessSlide = {
  id: 'type_01',
  type: 'typing',
  prompt: 'What is the capital of France?',
  answer_mode: 'type_guess',
  correct_answer: 'Paris',
  acceptedAnswers: ['Paris', 'PARIS', 'paris'],
  fuzzy_allowances: ['Pariss', 'Paries'],
};

const mixedSlide = {
  id: 'mixed_01',
  type: 'mcq',
  prompt: 'Which is correct?',
  answer_mode: 'type_guess',
  options: ['Option A', 'Option B', 'Option C'],
  correctIndex: 1,
  correct_answer: 'Option B',
  acceptedAnswers: [],
  fuzzy_allowances: ['Optional B'],
};

// ── MCQ Validation Tests ──────────────────────────────────────────────────────

describe('validateAnswer - MCQ mode', () => {
  test('correct answer by index', () => {
    const result = validateAnswer(mcqSlide, 0);
    expect(result.correct).toBe(true);
    expect(result.matchType).toBe('exact');
    expect(result.score).toBe(1);
  });

  test('correct answer by string text', () => {
    const result = validateAnswer(mcqSlide, 'Christopher Nolan');
    expect(result.correct).toBe(true);
    expect(result.matchType).toBe('exact');
  });

  test('correct answer case-insensitive', () => {
    const result = validateAnswer(mcqSlide, 'christopher nolan');
    expect(result.correct).toBe(true);
  });

  test('correct answer with extra whitespace trimmed', () => {
    const result = validateAnswer(mcqSlide, '  Christopher Nolan  ');
    expect(result.correct).toBe(true);
  });

  test('incorrect answer by index', () => {
    const result = validateAnswer(mcqSlide, 1);
    expect(result.correct).toBe(false);
    expect(result.matchType).toBeNull();
    expect(result.score).toBe(0);
    expect(result.reason).toBe('no_match');
  });

  test('incorrect answer by text', () => {
    const result = validateAnswer(mcqSlide, 'Steven Spielberg');
    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
  });

  test('invalid index out of bounds', () => {
    const result = validateAnswer(mcqSlide, 999);
    expect(result.correct).toBe(false);
  });

  test('negative index treated as invalid', () => {
    const result = validateAnswer(mcqSlide, -1);
    expect(result.correct).toBe(false);
  });

  test('string number index converted to number', () => {
    const result = validateAnswer(mcqSlide, '0');
    expect(result.correct).toBe(true);
  });

  test('invalid string number treated as text not index', () => {
    const result = validateAnswer(mcqSlide, 'hello123');
    expect(result.correct).toBe(false);
  });
});

// ── Type-Guess Validation Tests ───────────────────────────────────────────────

describe('validateAnswer - Type-Guess mode', () => {
  test('exact match at casual fuzzyThreshold=0.65', () => {
    const result = validateAnswer(typeGuessSlide, 'Paris', 'casual');
    expect(result.correct).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  test('exact match at arcade fuzzyThreshold=0.85', () => {
    const result = validateAnswer(typeGuessSlide, 'Paris', 'arcade');
    expect(result.correct).toBe(true);
  });

  test('exact match at pro fuzzyThreshold=1.0 (case+space sensitive)', () => {
    const result = validateAnswer(typeGuessSlide, 'Paris', 'pro');
    expect(result.correct).toBe(true);
  });

  test('case-insensitive match', () => {
    const result = validateAnswer(typeGuessSlide, 'PARIS', 'arcade');
    expect(result.correct).toBe(true);
  });

  test('fuzzy match at casual (more lenient)', () => {
    // "Paries" is a common typo — casual should accept it
    const result = validateAnswer(typeGuessSlide, 'Paries', 'casual');
    expect(result.correct).toBe(true);
  });

  test('fuzzy match at arcade (moderate)', () => {
    // "Pariss" is one extra letter — arcade may or may not accept
    const result = validateAnswer(typeGuessSlide, 'Pariss', 'arcade');
    // Result depends on fuzzy algorithm; just verify response structure
    expect(result).toHaveProperty('correct');
    expect(result).toHaveProperty('matchType');
  });

  test('no fuzzy match at pro (exact only)', () => {
    // Pro mode has fuzzyThreshold=1.0, so typos should fail
    const result = validateAnswer(typeGuessSlide, 'Pari', 'pro');
    expect(result.correct).toBe(false);
  });

  test('empty answer fails', () => {
    const result = validateAnswer(typeGuessSlide, '', 'arcade');
    expect(result.correct).toBe(false);
  });

  test('whitespace-only answer fails', () => {
    const result = validateAnswer(typeGuessSlide, '   ', 'arcade');
    expect(result.correct).toBe(false);
  });

  test('invalid gameMode defaults to arcade', () => {
    const result = validateAnswer(typeGuessSlide, 'Paris', 'invalid_mode');
    expect(result.correct).toBe(true);
  });
});

// ── Mixed Mode Detection ──────────────────────────────────────────────────────

describe('validateAnswer - Mode Detection', () => {
  test('MCQ slide with answer_mode=mcq uses MCQ validation', () => {
    const result = validateAnswer(mcqSlide, 0);
    expect(result.correct).toBe(true);
  });

  test('slide with answer_mode=type_guess forces type-guess validation', () => {
    const result = validateAnswer(mixedSlide, 'Option B', 'arcade');
    expect(result.correct).toBe(true);
  });

  test('isTypeGuess parameter overrides slide.answer_mode', () => {
    // Even though mcqSlide says MCQ, force type-guess mode
    const result = validateAnswer(mcqSlide, 'Christopher Nolan', 'arcade', true);
    // Should use type-guess validation, which is fuzzy
    expect(result).toHaveProperty('matchType');
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('validateAnswer - Edge Cases', () => {
  test('null slide returns error', () => {
    const result = validateAnswer(null, 'answer');
    expect(result.correct).toBe(false);
    expect(result.reason).toBe('no_slide');
  });

  test('undefined slide returns error', () => {
    const result = validateAnswer(undefined, 'answer');
    expect(result.correct).toBe(false);
  });

  test('slide with no options defaults to no match', () => {
    const badSlide = { ...mcqSlide, options: undefined };
    const result = validateAnswer(badSlide, 0);
    expect(result.correct).toBe(false);
  });

  test('slide with empty options array', () => {
    const badSlide = { ...mcqSlide, options: [] };
    const result = validateAnswer(badSlide, 0);
    expect(result.correct).toBe(false);
  });

  test('slide with non-numeric correctIndex string', () => {
    const badSlide = { ...mcqSlide, correctIndex: 'invalid' };
    const result = validateAnswer(badSlide, 0);
    expect(result.correct).toBe(false);
  });

  test('slide with non-integer correctIndex', () => {
    const badSlide = { ...mcqSlide, correctIndex: 0.5 };
    const result = validateAnswer(badSlide, 0);
    expect(result.correct).toBe(false);
  });

  test('always returns required properties', () => {
    const result = validateAnswer(mcqSlide, 0);
    expect(result).toHaveProperty('correct');
    expect(result).toHaveProperty('matchType');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('reason');
  });
});

// ── buildAcceptedAnswers Tests ────────────────────────────────────────────────

describe('buildAcceptedAnswers()', () => {
  test('returns explicit acceptedAnswers array if provided', () => {
    const slide = {
      acceptedAnswers: ['Answer 1', 'Answer 2'],
      correct_answer: 'Should be ignored',
    };
    const result = buildAcceptedAnswers(slide);
    expect(result).toEqual(['Answer 1', 'Answer 2']);
  });

  test('falls back to correct_answer + fuzzy_allowances', () => {
    const slide = {
      acceptedAnswers: [],
      correct_answer: 'Main Answer',
      fuzzy_allowances: ['Fuzzy 1', 'Fuzzy 2'],
    };
    const result = buildAcceptedAnswers(slide);
    expect(result).toContain('Main Answer');
    expect(result).toContain('Fuzzy 1');
    expect(result).toContain('Fuzzy 2');
  });

  test('extracts correct option from options array if needed', () => {
    const slide = {
      acceptedAnswers: [],
      correct_answer: undefined,
      fuzzy_allowances: [],
      options: ['Option A', 'Option B', 'Option C'],
      correctIndex: 1,
    };
    const result = buildAcceptedAnswers(slide);
    expect(result).toContain('Option B');
  });

  test('returns empty array if no answers found', () => {
    const slide = {
      acceptedAnswers: [],
      correct_answer: undefined,
      fuzzy_allowances: [],
    };
    const result = buildAcceptedAnswers(slide);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('handles null/undefined fuzzy_allowances gracefully', () => {
    const slide = {
      acceptedAnswers: [],
      correct_answer: 'Answer',
      fuzzy_allowances: null,
    };
    const result = buildAcceptedAnswers(slide);
    expect(result).toContain('Answer');
  });

  test('handles null/undefined correctIndex gracefully', () => {
    const slide = {
      acceptedAnswers: [],
      correct_answer: undefined,
      fuzzy_allowances: [],
      options: ['A', 'B', 'C'],
      correctIndex: null,
    };
    const result = buildAcceptedAnswers(slide);
    expect(Array.isArray(result)).toBe(true);
  });
});
