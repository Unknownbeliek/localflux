/**
 * deckLoader.js
 *
 * Loads a quiz deck from disk and exposes the question list.
 * Keeps all file-system concerns isolated from game logic.
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Load a deck JSON file and return its questions array.
 *
 * @param {string} deckPath - Absolute path to the deck JSON file.
 * @returns {{ questions: object[] }} Parsed deck with a `questions` array.
 * @throws {Error} If the file cannot be read or is missing the `questions` key.
 */
function loadDeck(deckPath) {
  if (!fs.existsSync(deckPath)) {
    throw new Error(`Deck not found: ${deckPath}`);
  }

  const raw = fs.readFileSync(deckPath, 'utf-8');
  const deck = JSON.parse(raw);

  if (!Array.isArray(deck.questions)) {
    throw new Error(`Deck at "${deckPath}" is missing a "questions" array.`);
  }

  return deck;
}

/**
 * Remove answer-critical fields before broadcasting a question to players.
 * Strips `correct_answer` and `fuzzy_allowances` from the question object.
 *
 * @param {object} question - A raw question object from the deck.
 * @returns {object} A safe copy with answer fields removed.
 */
function sanitizeQuestion(question) {
  // eslint-disable-next-line no-unused-vars
  const { correct_answer, fuzzy_allowances, ...safe } = question;
  return safe;
}

const DEFAULT_DECK_PATH = path.join(__dirname, '..', '..', 'data', 'decks', 'movie.json');

module.exports = { loadDeck, sanitizeQuestion, DEFAULT_DECK_PATH };
