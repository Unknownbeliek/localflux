/**
 * deckLoader.js
 *
 * Loads a quiz deck from disk and exposes the slide list.
 * Keeps all file-system concerns isolated from game logic.
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Load a deck JSON file and require at least one slide source.
 *
 * Canonical source is `slides`.
 * Backward-compatible fallback source is `questions`.
 *
 * @param {string} deckPath - Absolute path to the deck JSON file.
 * @returns {{ slides: object[] }} Parsed deck with a `slides` array.
 * @throws {Error} If the file cannot be read or has no valid slide/question array.
 */
function loadDeck(deckPath) {
  if (!fs.existsSync(deckPath)) {
    throw new Error(`Deck not found: ${deckPath}`);
  }

  const raw = fs.readFileSync(deckPath, 'utf-8');
  let deck;
  try {
    deck = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in deck at ${deckPath}: ${err.message}`);
  }

  const slides = Array.isArray(deck.slides) ? deck.slides : Array.isArray(deck.questions) ? deck.questions : null;
  if (!Array.isArray(slides)) {
    throw new Error(`Deck at "${deckPath}" is missing a "slides" array (or legacy "questions" fallback).`);
  }

  return {
    ...deck,
    slides,
    // Keep legacy key for compatibility with existing startup wiring.
    questions: slides,
  };
}

/**
 * Remove answer-critical fields before broadcasting a slide to players.
 * Uses a strict allowlist and explicitly strips correctness data.
 *
 * Allowed outbound fields:
 * id, type, prompt, image, options, suggestionBank, timeLimit
 *
 * @param {object} slide - Raw slide object.
 * @returns {object} Safe public slide payload.
 */
function sanitizeQuestion(slide) {
  const SAFE_FIELDS = ['id', 'type', 'prompt', 'image', 'options', 'suggestionBank', 'timeLimit'];
  const safe = {};

  SAFE_FIELDS.forEach((field) => {
    if (field in (slide || {})) safe[field] = slide[field];
  });

  // Explicitly strip cheat-sensitive fields even if present in source object.
  delete safe.correctIndex;
  delete safe.acceptedAnswers;

  return safe;
}

const DEFAULT_DECK_PATH = path.join(__dirname, '..', 'data', 'decks', 'movie.json');

module.exports = { loadDeck, sanitizeQuestion, DEFAULT_DECK_PATH };
