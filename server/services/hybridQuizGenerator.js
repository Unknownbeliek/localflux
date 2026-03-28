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
const { shuffle } = require('../core/shuffle');

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

      const question = await this.instantiateTemplate(template);
      questions.push(question);
    }

    // Pad with additional random templates if needed
    while (questions.length < count) {
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const question = await this.instantiateTemplate(randomTemplate);
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

      // Process questions and add images
      const questions = [];
      for (const q of response.data.results) {
        // Create MCQ options: 1 correct + 3 incorrect
        const correctAnswer = this.decodeHTML(q.correct_answer);
        const incorrectAnswers = q.incorrect_answers.map(ans => this.decodeHTML(ans));

        // Shuffle the options
        const allOptions = [correctAnswer, ...incorrectAnswers];
        const shuffledOptions = shuffle(allOptions);

        const question = {
          type: 'multiple',
          prompt: this.decodeHTML(q.question),
          options: shuffledOptions,
          correct_answer: correctAnswer,
          acceptedAnswers: [correctAnswer],
          timeLimit: 15000
        };

        // Try to fetch relevant image
        try {
          const imageData = await this.fetchRelevantImage(question.prompt, topic);
          if (imageData) {
            question.image = imageData.url;
            question.imageThumb = imageData.thumb;
            question.imageAlt = imageData.alt;
            question.imageCredit = imageData.credit;
          }
        } catch (imgError) {
          console.warn('Failed to fetch image for question:', imgError.message);
        }

        questions.push(question);
      }

      return questions;
    } catch (error) {
      throw new Error('Open Trivia DB unavailable');
    }
  }

  /**
   * Instantiate a template with random values
   */
  async instantiateTemplate(template) {
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

    const question = {
      id: `q_${Date.now()}_${Math.random()}`,
      type: 'typing',
      prompt,
      image: null,
      options: [],
      acceptedAnswers: [...new Set(acceptedAnswers)], // Remove duplicates
      timeLimit: 15000
    };

    // Try to fetch relevant image for template questions too
    try {
      const imageData = await this.fetchRelevantImage(question.prompt, this.findCategoryName(template));
      if (imageData) {
        question.image = imageData.url;
        question.imageThumb = imageData.thumb;
        question.imageAlt = imageData.alt;
        question.imageCredit = imageData.credit;
      }
    } catch (imgError) {
      console.warn('Failed to fetch image for template question:', imgError.message);
    }

    return question;
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
   * Fetch relevant image for a question using Unsplash API
   */
  async fetchRelevantImage(questionText, topic) {
    try {
      // Extract keywords from question and topic
      const keywords = this.extractImageKeywords(questionText, topic);

      // Check if Unsplash API key is available
      const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
      if (unsplashKey) {
        try {
          // Use Unsplash API
          const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: {
              query: keywords,
              per_page: 1,
              orientation: 'landscape',
              content_filter: 'high'
            },
            headers: {
              'Authorization': `Client-ID ${unsplashKey}`
            },
            timeout: 3000
          });

          if (response.data.results && response.data.results.length > 0) {
            const photo = response.data.results[0];
            return {
              url: photo.urls.regular,
              thumb: photo.urls.thumb,
              alt: photo.alt_description || `${topic} related image`,
              credit: `Photo by ${photo.user.name} on Unsplash`
            };
          }
        } catch (unsplashError) {
          console.warn('Unsplash API failed, using fallback:', unsplashError.message);
        }
      }

      // Fallback to placeholder images if Unsplash fails or no key
      return this.getPlaceholderImage(topic, questionText);
    } catch (error) {
      console.warn('Image fetch failed:', error.message);
      return this.getPlaceholderImage(topic, questionText);
    }
  }

  /**
   * Extract relevant keywords from question text for image search
   */
  extractImageKeywords(questionText, topic) {
    // Remove common question words and extract key terms
    const cleaned = questionText
      .toLowerCase()
      .replace(/^(what|who|when|where|why|how|which|in what|on what|for what)/g, '')
      .replace(/[?.!,;:]/g, '')
      .trim();

    // Extract nouns and important terms
    const words = cleaned.split(/\s+/);
    const keywords = [];

    // Add topic as primary keyword
    keywords.push(topic);

    // Add relevant words from question
    const relevantWords = words.filter(word =>
      word.length > 3 &&
      !['many', 'much', 'some', 'most', 'first', 'last', 'best', 'worst', 'same', 'different'].includes(word)
    );

    keywords.push(...relevantWords.slice(0, 2)); // Add up to 2 more keywords

    return keywords.join(' ');
  }

  /**
   * Find category name for a template (used for image fetching)
   */
  findCategoryName(template) {
    // Try to find which category this template belongs to
    for (const [categoryName, categoryData] of Object.entries(QUESTION_BANKS.categories)) {
      if (categoryData.templates && categoryData.templates.includes(template)) {
        return categoryName;
      }
    }
    return 'general'; // Default fallback
  }

  /**
   * Get placeholder image based on topic and question content
   */
  getPlaceholderImage(topic, questionText = '') {
    const topicImages = {
      science: [
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop&crop=center', // 0
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=center', // 1
        'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=400&fit=crop&crop=center', // 2
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop&crop=center', // 3
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop&crop=center', // 4
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop&crop=center'  // 5
      ],
      history: [
        'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1520637836862-4d197d17c1a8?w=600&h=400&fit=crop&crop=center'
      ],
      geography: [
        'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&crop=center'
      ],
      movies: [
        'https://images.unsplash.com/photo-1489599735734-79b4dfe3b4a6?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1489599735734-79b4dfe3b4a6?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1489599735734-79b4dfe3b4a6?w=600&h=400&fit=crop&crop=center'
      ],
      sports: [
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop&crop=center'
      ],
      technology: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop&crop=center'
      ],
      literature: [
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop&crop=center'
      ],
      entertainment: [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1489599735734-79b4dfe3b4a6?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1489599735734-79b4dfe3b4a6?w=600&h=400&fit=crop&crop=center'
      ],
      general: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1520637836862-4d197d17c1a8?w=600&h=400&fit=crop&crop=center'
      ]
    };

    // Get images for the topic, fallback to general
    const images = topicImages[topic.toLowerCase()] || topicImages.general;

    // Use random selection for guaranteed variety
    const imageIndex = Math.floor(Math.random() * images.length);
    const imageUrl = images[imageIndex];

    return {
      url: imageUrl,
      thumb: imageUrl.replace('w=600', 'w=300').replace('h=400', 'h=200'),
      alt: `${topic} related vibrant image`,
      credit: 'High-quality placeholder image'
    };
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
