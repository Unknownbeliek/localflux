'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { shuffle } = require('./shuffle');

const RECENT_TMDB_MOVIE_IDS = new Set();
const RECENT_TMDB_MOVIE_ID_LIMIT = 4000;

function decodeHtmlEntities(value = '') {
  const text = String(value || '');
  const namedMap = {
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&eacute;': 'e',
    '&uuml;': 'u',
    '&ouml;': 'o',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...',
  };

  let decoded = text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => namedMap[entity] || entity);

  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    const valueCode = Number(code);
    if (!Number.isFinite(valueCode)) return _;
    return String.fromCodePoint(valueCode);
  });

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const valueCode = Number.parseInt(hex, 16);
    if (!Number.isFinite(valueCode)) return _;
    return String.fromCodePoint(valueCode);
  });

  return decoded;
}

function randomQuestionId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 10;
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function normalizeCategory(categoryId) {
  const value = Number(categoryId);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
}

function normalizeGenre(genreId) {
  const value = Number(genreId);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
}

function normalizeTitle(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function ensureUploadsDir() {
  const uploadsDir = path.resolve(__dirname, '..', 'public', 'uploads', 'magic');
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

function inferImageExtension(contentType, sourcePath) {
  const lowerType = String(contentType || '').toLowerCase();
  if (lowerType.includes('webp')) return '.webp';
  if (lowerType.includes('png')) return '.png';
  if (lowerType.includes('jpeg') || lowerType.includes('jpg')) return '.jpg';

  const lowerPath = String(sourcePath || '').toLowerCase();
  if (lowerPath.endsWith('.webp')) return '.webp';
  if (lowerPath.endsWith('.png')) return '.png';
  if (lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.jpg')) return '.jpg';
  return '.jpg';
}

async function downloadTmdbImageToLocal(movieId, imagePath, kind = 'frame') {
  const remoteUrl = `https://image.tmdb.org/t/p/w1280${imagePath}`;
  const response = await fetch(remoteUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`TMDB image request failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) {
    throw new Error('Empty poster image buffer');
  }

  const uploadsDir = ensureUploadsDir();
  const ext = inferImageExtension(response.headers.get('content-type'), imagePath);
  const nonce = crypto.randomBytes(4).toString('hex');
  const filename = `tmdb_${kind}_${String(movieId)}_${Date.now().toString(36)}_${nonce}${ext}`;
  const absolutePath = path.join(uploadsDir, filename);
  fs.writeFileSync(absolutePath, buffer);

  return `/uploads/magic/${filename}`;
}

async function fetchBestBackdropPath(movieId, apiKey, fallbackBackdropPath = '') {
  const fallback = String(fallbackBackdropPath || '').trim();
  const params = new URLSearchParams({ api_key: apiKey, include_image_language: 'null,en' });
  const url = `https://api.themoviedb.org/3/movie/${movieId}/images?${params.toString()}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return fallback;
    const payload = await response.json();
    const backdrops = Array.isArray(payload?.backdrops) ? payload.backdrops : [];
    if (backdrops.length === 0) return fallback;

    const score = (item) => Number(item?.vote_count || 0) * 10 + Number(item?.vote_average || 0);

    const textless = backdrops
      .filter((item) => item && item.file_path && item.iso_639_1 == null)
      .sort((a, b) => score(b) - score(a));
    if (textless.length > 0) return String(textless[0].file_path);

    const english = backdrops
      .filter((item) => item && item.file_path && item.iso_639_1 === 'en')
      .sort((a, b) => score(b) - score(a));
    if (english.length > 0) return String(english[0].file_path);

    return fallback || String(backdrops[0]?.file_path || '').trim();
  } catch {
    return fallback;
  }
}

async function fetchOpenTDBDeck(amount, categoryId) {
  const safeAmount = normalizeAmount(amount);
  const safeCategory = normalizeCategory(categoryId);

  const params = new URLSearchParams({
    amount: String(safeAmount),
    type: 'multiple',
  });
  if (safeCategory) params.set('category', String(safeCategory));

  const url = `https://opentdb.com/api.php?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`OpenTDB request failed (${response.status})`);
  }

  const payload = await response.json();
  if (!payload || payload.response_code !== 0 || !Array.isArray(payload.results)) {
    throw new Error('OpenTDB returned an invalid response.');
  }

  const slides = payload.results.map((entry) => {
    const prompt = decodeHtmlEntities(entry?.question || '');
    const correctAnswer = decodeHtmlEntities(entry?.correct_answer || '');
    const wrongAnswers = Array.isArray(entry?.incorrect_answers)
      ? entry.incorrect_answers.map((answer) => decodeHtmlEntities(answer))
      : [];

    const shuffledOptions = shuffle([correctAnswer, ...wrongAnswers]);
    const correctIndex = shuffledOptions.findIndex((option) => option === correctAnswer);

    return {
      id: randomQuestionId(),
      type: 'mcq',
      prompt,
      image: null,
      options: shuffledOptions,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      timeLimit: 15000,
      acceptedAnswers: [],
      suggestionBank: [],
    };
  });

  return slides;
}

async function fetchTMDBMovieDeck(amount, apiKey, genreId = null) {
  const safeAmount = Math.min(30, Math.max(5, normalizeAmount(amount)));
  const token = String(apiKey || '').trim();
  const safeGenre = normalizeGenre(genreId);
  if (!token) {
    throw new Error('TMDB API key is required.');
  }

  const pool = [];
  const seen = new Set();
  const targetPoolSize = Math.max(safeAmount * 2, 24);
  let attempts = 0;

  while (pool.length < targetPoolSize && attempts < 14) {
    attempts += 1;
    const randomPage = Math.floor(Math.random() * 20) + 1;
    const params = new URLSearchParams({
      api_key: token,
      include_adult: 'false',
      include_video: 'false',
      language: 'en-US',
      sort_by: 'popularity.desc',
      page: String(randomPage),
    });
    if (safeGenre) {
      params.set('with_genres', String(safeGenre));
    }
    const url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid TMDB API key.');
      }
      throw new Error(`TMDB request failed (${response.status}).`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    results.forEach((movie) => {
      const id = Number(movie?.id);
      const title = String(movie?.title || '').trim();
      const backdropPath = String(movie?.backdrop_path || '').trim();
      if (!id || !title || !backdropPath) return;
      if (seen.has(id)) return;
      seen.add(id);
      pool.push({ id, title, backdropPath });
    });
  }

  if (pool.length < 4) {
    throw new Error('Not enough TMDB movie data to generate questions.');
  }

  const titleSeen = new Set();
  const uniquePool = pool.filter((movie) => {
    const key = normalizeTitle(movie.title);
    if (!key || titleSeen.has(key)) return false;
    titleSeen.add(key);
    return true;
  });

  if (uniquePool.length < 4) {
    throw new Error('Not enough unique TMDB movies to generate questions.');
  }

  const unseenPool = uniquePool.filter((movie) => !RECENT_TMDB_MOVIE_IDS.has(movie.id));
  const preferredPool = unseenPool.length >= 4 ? unseenPool : uniquePool;

  const randomizedPool = shuffle(preferredPool);
  const questionCount = Math.min(safeAmount, randomizedPool.length);
  const questions = [];
  const usedMovieIds = new Set();

  for (let i = 0; i < randomizedPool.length && questions.length < questionCount; i += 1) {
    const correctMovie = randomizedPool[i];
    if (usedMovieIds.has(correctMovie.id)) continue;

    const distractors = shuffle(
      randomizedPool
        .filter((item) => item.id !== correctMovie.id)
        .map((item) => item.title)
    ).slice(0, 3);

    if (distractors.length < 3) continue;

    const bestBackdropPath = await fetchBestBackdropPath(correctMovie.id, token, correctMovie.backdropPath);
    if (!bestBackdropPath) continue;

    let localImagePath;
    try {
      localImagePath = await downloadTmdbImageToLocal(correctMovie.id, bestBackdropPath, 'backdrop');
    } catch {
      continue;
    }

    const options = shuffle([correctMovie.title, ...distractors]);
    const correctIndex = options.findIndex((option) => option === correctMovie.title);

    usedMovieIds.add(correctMovie.id);
    RECENT_TMDB_MOVIE_IDS.add(correctMovie.id);
    if (RECENT_TMDB_MOVIE_IDS.size > RECENT_TMDB_MOVIE_ID_LIMIT) {
      const oldest = RECENT_TMDB_MOVIE_IDS.values().next().value;
      if (oldest != null) RECENT_TMDB_MOVIE_IDS.delete(oldest);
    }

    questions.push({
      id: randomQuestionId(),
      type: 'mcq',
      prompt: 'Which movie is this scene from?',
      image: localImagePath,
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      timeLimit: 15000,
      acceptedAnswers: [],
      suggestionBank: [],
    });
  }

  if (questions.length < safeAmount) {
    throw new Error(`TMDB deck generation produced ${questions.length}/${safeAmount} unique image questions. Try again.`);
  }

  return questions;
}

module.exports = {
  fetchOpenTDBDeck,
  fetchTMDBMovieDeck,
};
