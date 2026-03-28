/**
 * quizGeneratorRoutes.js
 *
 * Endpoints for the hybrid quiz generation system
 * - POST /api/quiz/generate - Generate quiz from topic
 * - GET /api/quiz/categories - List available categories
 * - POST /api/quiz/from-csv - Generate from CSV
 * - GET /api/quiz/predefined - List pre-made decks
 */

'use strict';

const express = require('express');
const { HybridQuizGenerator } = require('../services/hybridQuizGenerator');

const router = express.Router();
const generator = new HybridQuizGenerator();

/**
 * POST /api/quiz/generate
 * Generate a quiz from a topic
 */
router.post('/quiz/generate', async (req, res) => {
  try {
    const { topic, count = 10, difficulty = 'mixed', source = 'auto' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic is required (string)' });
    }

    const deck = await generator.generateQuiz(topic.trim(), {
      count: Math.max(5, Math.min(30, Number(count) || 10)),
      difficulty: ['easy', 'medium', 'hard', 'mixed'].includes(difficulty)
        ? difficulty
        : 'mixed',
      source: source || 'auto'
    });

    res.json({
      success: true,
      deck,
      stats: {
        totalQuestions: deck.slides.length,
        category: topic,
        source: deck.deck_meta.source,
        estimatedDuration: `${deck.slides.length * 15} seconds`
      }
    });
  } catch (error) {
    console.error('[Quiz Generator] Error:', error.message);
    res.status(400).json({
      error: error.message || 'Failed to generate quiz'
    });
  }
});

/**
 * GET /api/quiz/categories
 * List all available question categories
 */
router.get('/quiz/categories', (req, res) => {
  try {
    const categories = generator.getAvailableCategories();
    res.json({
      success: true,
      categories: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/quiz/from-csv
 * Generate quiz from CSV content
 */
router.post('/quiz/from-csv', (req, res) => {
  try {
    const { csv, topic = 'Custom' } = req.body;

    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    const questions = generator.parseCSV(csv);
    const deck = generator.formatDeck(topic, questions, 'csv');

    res.json({
      success: true,
      deck,
      stats: {
        totalQuestions: deck.slides.length,
        source: 'csv'
      }
    });
  } catch (error) {
    console.error('[CSV Parser] Error:', error.message);
    res.status(400).json({
      error: error.message || 'Failed to parse CSV'
    });
  }
});

/**
 * GET /api/quiz/predefined
 * List all pre-made decks available
 */
router.get('/quiz/predefined', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const decksDir = path.join(__dirname, '../data/decks');
    const deckFiles = fs.readdirSync(decksDir).filter((f) => f.endsWith('.json'));

    const decks = deckFiles.map((file) => {
      try {
        const deckPath = path.join(decksDir, file);
        const deckData = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));
        return {
          id: deckData.deck_meta?.id || file,
          title: deckData.deck_meta?.title,
          author: deckData.deck_meta?.author,
          category: deckData.deck_meta?.category,
          totalQuestions: deckData.slides?.length || 0,
          difficulty: deckData.deck_meta?.difficulty,
          description: deckData.deck_meta?.description
        };
      } catch (err) {
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      decks,
      count: decks.length
    });
  } catch (error) {
    console.error('[Predefined Decks] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch predefined decks' });
  }
});

/**
 * POST /api/quiz/load-predefined
 * Load a specific pre-made deck
 */
router.post('/quiz/load-predefined', (req, res) => {
  try {
    const { deckId } = req.body;
    const fs = require('fs');
    const path = require('path');

    if (!deckId || typeof deckId !== 'string') {
      return res.status(400).json({ error: 'Deck ID is required' });
    }

    const decksDir = path.join(__dirname, '../data/decks');
    const deckPath = path.join(decksDir, `${deckId}.json`);

    if (!fs.existsSync(deckPath)) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));

    res.json({
      success: true,
      deck,
      stats: {
        totalQuestions: deck.slides?.length || 0,
        source: 'predefined'
      }
    });
  } catch (error) {
    console.error('[Load Predefined] Error:', error.message);
    res.status(500).json({ error: 'Failed to load deck' });
  }
});

module.exports = router;
