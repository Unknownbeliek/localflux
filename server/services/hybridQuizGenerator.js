/**
 * hybridQuizGenerator.js
 *
 * Implements a multi-source quiz generation system with fallback logic:
 * 1. Templates (local) - PRIMARY, always works
 * 2. Pre-made Decks (local) - For quick access
 * 3. Open Trivia DB (free API) - If internet available
 * 4. CSV upload (user-provided) - For power users
 */

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const QUESTION_BANKS = require('../data/questionBanks.json');
const DECKS_DIR = path.join(__dirname, '../data/decks');

class HybridQuizGenerator {
  /**
   * Main entry point - uses smart fallback logic
   * @param {string} topic - User-provided topic
   * @param {object} options - { count, difficulty, source }
   */
  async generateQuiz(topic, options = {}) {
    const {
      count = 10,
      difficulty = 'mixed',
      source = 'auto'
    } = options;

    try {
      // If explicitly requested Open Trivia, skip local template and pre-made fallback.
      if (source === 'openapi') {
        const apiQuestions = await this.generateFromOpenTriviaDB(topic, count);
        if (apiQuestions && apiQuestions.length > 0) {
          return this.formatDeck(topic, apiQuestions, 'openapi');
        }
        // If API fails, allow fallback to templates/pre-made
      }

      // 1. Try pre-made decks first (lightning fast)
      if (source !== 'openapi') {
        try {
          const deckQuestions = this.getPreMadeDeck(topic);
          if (deckQuestions && deckQuestions.length > 0) {
            return this.formatDeck(
              topic,
              this.selectRandomQuestions(deckQuestions, count),
              'pre-made'
            );
          }
        } catch (err) {
          // Fall through to next strategy
        }

        // 2. Try template-based generation (local, always works)
        try {
          const templateQuestions = await this.generateFromTemplates(topic, count, difficulty);
          if (templateQuestions && templateQuestions.length > 0) {
            return this.formatDeck(topic, templateQuestions, 'templates');
          }
        } catch (err) {
          // Fall through to next strategy
        }
      }

      // 3. For auto mode, attempt Open Trivia DB if available
      if (source === 'auto' || source === 'openapi') {
        try {
          const apiQuestions = await this.generateFromOpenTriviaDB(topic, count);
          if (apiQuestions && apiQuestions.length > 0) {
            return this.formatDeck(topic, apiQuestions, 'openapi');
          }
        } catch (err) {
          console.warn('OpenTriviaDB unavailable, falling back to local generation');
        }
      }

      // If all else fails, throw error
      throw new Error(
        `Could not generate quiz for topic "${topic}". Check spelling or try another topic.`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Strategy 1: Get pre-made deck if available
   */
  getPreMadeDeck(topic) {
    const normalized = topic.toLowerCase().trim();
    const deckFiles = fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json'));

    for (const file of deckFiles) {
      const deckPath = path.join(DECKS_DIR, file);
      try {
        const deck = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));
        const category = (deck.deck_meta?.category || '').toLowerCase();
        const title = (deck.deck_meta?.title || '').toLowerCase();

        if (
          category.includes(normalized) ||
          normalized.includes(category) ||
          title.includes(normalized) ||
          normalized.includes(title)
        ) {
          return deck.slides || [];
        }
      } catch (err) {
        // Skip malformed deck files
      }
    }

    return null;
  }

  /**
   * Strategy 2: Generate from template-based system
   */
  async generateFromTemplates(topic, count, difficulty) {
    const category = this.findCategory(topic);
    if (!category) {
      throw new Error(
        `Category not found. Available: ${this.getAvailableCategories().join(', ')}`
      );
    }

    const templates = Array.isArray(category.templates) ? category.templates : [];
    const questions = [];

    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const template = templates[i];

      // Skip if difficulty doesn't match (unless 'mixed')
      if (difficulty !== 'mixed' && template.difficulty !== difficulty) {
        continue;
      }

      const question = this.instantiateTemplate(template);
      questions.push(question);
    }

    // Pad with additional random templates if needed
    while (questions.length < count) {
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const question = this.instantiateTemplate(randomTemplate);
      questions.push(question);
    }

    return questions.slice(0, count);
  }

  /**
   * Strategy 3: Generate from Open Trivia Database API
   */
  async generateFromOpenTriviaDB(topic, count) {
    // Try to find a matching category in Open Trivia DB
    const categoryMap = {
      science: 17,
      history: 23,
      sports: 21,
      entertainment: 11,
      geography: 22,
      movies: 11,
      literature: 10,
      technology: 18,
      general: 9
    };

    const categoryId = categoryMap[topic.toLowerCase()] || 9; // Default to general

    try {
      const response = await axios.get('https://opentdb.com/api.php', {
        params: {
          amount: count,
          category: categoryId,
          type: 'multiple',
          difficulty: 'medium'
        },
        timeout: 5000
      });

      if (!response.data.results) {
        throw new Error('Invalid API response');
      }

      return response.data.results.map((q) => ({
        type: 'typing',
        prompt: this.decodeHTML(q.question),
        correct_answer: this.decodeHTML(q.correct_answer),
        acceptedAnswers: [this.decodeHTML(q.correct_answer)],
        timeLimit: 15000
      }));
    } catch (error) {
      throw new Error('Open Trivia DB unavailable');
    }
  }

  /**
   * Instantiate a template with random values
   */
  instantiateTemplate(template) {
    let prompt = template.template;
    let answers = Array.isArray(template.answers) ? [...template.answers] : [];
    let fuzzy = Array.isArray(template.fuzzy) ? [...template.fuzzy] : [];

    // Handle paired bank replacements (e.g., countryBank -> countryAnswers)
    const bankMatches = prompt.match(/{[^}]+}/g) || [];

    for (const placeholder of bankMatches) {
      const key = placeholder.slice(1, -1); // Remove {}
      const bankKey = `${key}Bank`;
      const answerKey = `${key}Answers`;

      if (template[bankKey] && template[answerKey]) {
        const bankArray = template[bankKey];
        const answerArray = template[answerKey];
        const idx = Math.floor(Math.random() * bankArray.length);

        prompt = prompt.replace(placeholder, bankArray[idx]);

        // Update answers if they contain the same placeholder
        answers = answers.map((ans) =>
          ans.replace(placeholder, answerArray[idx])
        );
        fuzzy = fuzzy.map((f) =>
          f.replace(placeholder, answerArray[idx])
        );
      }
    }

    // Build accepted answers list
    const acceptedAnswers = [];
    if (answers.length > 0 && String(answers[0] || '').trim()) {
      acceptedAnswers.push(String(answers[0]).trim());
    }
    if (fuzzy.length > 0) {
      fuzzy.forEach((f) => {
        if (String(f || '').trim()) acceptedAnswers.push(String(f).trim());
      });
    }
    if (answers.length > 1) {
      answers.slice(1).forEach((a) => {
        if (String(a || '').trim()) acceptedAnswers.push(String(a).trim());
      });
    }

    if (acceptedAnswers.length === 0) {
      acceptedAnswers.push('Answer');
    }

    return {
      id: `q_${Date.now()}_${Math.random()}`,
      type: 'typing',
      prompt,
      image: null,
      options: [],
      acceptedAnswers: [...new Set(acceptedAnswers)], // Remove duplicates
      timeLimit: 15000
    };
  }

  /**
   * Find category by fuzzy matching
   */
  findCategory(topic) {
    const normalized = topic.toLowerCase().trim();
    const cats = Object.entries(QUESTION_BANKS.categories);

    // Exact match
    for (const [key, cat] of cats) {
      if (key === normalized || cat.title.toLowerCase() === normalized) {
        return cat;
      }
    }

    // Substring match
    for (const [key, cat] of cats) {
      if (
        key.includes(normalized) ||
        normalized.includes(key) ||
        cat.title.toLowerCase().includes(normalized)
      ) {
        return cat;
      }
    }

    return null;
  }

  /**
   * Get list of available categories
   */
  getAvailableCategories() {
    return Object.values(QUESTION_BANKS.categories).map((cat) => cat.title);
  }

  /**
   * Select random subset of questions
   */
  selectRandomQuestions(questions, count) {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Format questions into LocalFlux deck format
   */
  formatDeck(topic, questions, source) {
    return {
      deck_meta: {
        id: `auto_${Date.now()}`,
        title: `${topic} Quiz`,
        author: 'LocalFlux Auto-Generator',
        version: '1.0.0',
        total_questions: questions.length,
        auto_generated: true,
        source: source,
        generated_at: new Date().toISOString()
      },
      slides: questions.map((q, i) => ({
        id: q.id || `q_${i + 1}`,
        type: q.type || 'typing',
        prompt: q.prompt,
        image: q.image || null,
        options: q.options || [],
        acceptedAnswers: q.acceptedAnswers || [q.correct_answer || ''],
        timeLimit: q.timeLimit || q.time_limit_ms || 15000
      }))
    };
  }

  /**
   * Decode HTML entities in API responses
   */
  decodeHTML(html) {
    const entities = {
      '&quot;': '"',
      '&#039;': "'",
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>'
    };
    let decoded = html || '';
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }
    return decoded;
  }

  /**
   * Parse and validate CSV input
   */
  parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have header and at least one question');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const q = {};

      headers.forEach((header, idx) => {
        q[header] = values[idx] || '';
      });

      if (q.question && q.answer) {
        questions.push({
          id: `q_${i}`,
          type: 'typing',
          prompt: q.question,
          image: null,
          options: [],
          acceptedAnswers: [q.answer],
          timeLimit: 15000
        });
      }
    }

    if (questions.length === 0) {
      throw new Error('No valid questions found in CSV');
    }

    return questions;
  }
}

module.exports = { HybridQuizGenerator };
