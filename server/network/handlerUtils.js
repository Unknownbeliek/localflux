'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_AVATAR_OBJECT = { type: 'preset', value: '1.jpg' };
const PRESET_AVATAR_POOL = [
  '1.jpg',
  '2.jpg',
  '4.jpg',
  '5.jpg',
  '11.jpg',
  '15.jpg',
  '16.jpg',
  '18.jpg',
  '19.jpg',
  '21.jpg',
  '22.jpg',
  '23.jpg',
  '7dcc3f3eebc2fccd2f9dd3146c61c914.avf',
  'e55afb4aea57bced165fb55ad92addf5.jpg',
];
const NAME_PREFIXES = ['Neo', 'Turbo', 'Solar', 'Nova', 'Glitch', 'Echo', 'Pixel', 'Drift', 'Axel', 'Flux'];
const NAME_SUFFIXES = ['Rider', 'Nomad', 'Spark', 'Cipher', 'Pilot', 'Comet', 'Vector', 'Pulse', 'Ghost', 'Runner'];

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function generateJoinProfile(room) {
  const existingNames = new Set((room?.players || []).map((p) => String(p?.name || '').toLowerCase()));
  let candidate = `${pickRandom(NAME_PREFIXES)} ${pickRandom(NAME_SUFFIXES)}`.trim();
  if (!candidate) candidate = 'Flux Guest';

  if (existingNames.has(candidate.toLowerCase())) {
    for (let i = 0; i < 12; i += 1) {
      const withNumber = `${candidate} ${Math.floor(Math.random() * 90) + 10}`;
      if (!existingNames.has(withNumber.toLowerCase())) {
        candidate = withNumber;
        break;
      }
    }
  }

  return {
    name: candidate,
    avatarObject: { type: 'preset', value: pickRandom(PRESET_AVATAR_POOL) || DEFAULT_AVATAR_OBJECT.value },
  };
}

function normalizeCustomQuestions(input) {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > 200) return null;

  const normalized = [];
  for (let i = 0; i < input.length; i += 1) {
    const q = input[i] || {};
    const prompt = String(q.prompt || '').trim();
    const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt || '').trim()) : [];
    const correctAnswer = String(q.correct_answer || '').trim();
    const timeLimitMsRaw = Number(q.time_limit_ms);
    const timeLimitMs = Number.isFinite(timeLimitMsRaw) && timeLimitMsRaw >= 3000 ? timeLimitMsRaw : 20000;

    if (!prompt) return null;
    if (options.length !== 4) return null;
    if (options.some((opt) => !opt)) return null;
    if (!options.includes(correctAnswer)) return null;

    normalized.push({
      q_id: String(q.q_id || `q_${String(i + 1).padStart(2, '0')}`),
      type: q.type === 'image_guess' ? 'image_guess' : 'text_only',
      prompt,
      options,
      correct_answer: correctAnswer,
      time_limit_ms: timeLimitMs,
      asset_ref: q.asset_ref || null,
      fuzzy_allowances: Array.isArray(q.fuzzy_allowances) ? q.fuzzy_allowances : [],
    });
  }

  return normalized;
}

function withQuestionTiming(payload) {
  const now = Date.now();
  const limitMsRaw = Number(payload?.question?.time_limit_ms);
  const durationMs = Number.isFinite(limitMsRaw) && limitMsRaw > 0 ? limitMsRaw : 20000;
  return {
    ...payload,
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
  };
}

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  const rawType = String(input.type || '').trim();
  const rawValue = String(input.value || '').trim();

  if (!rawType || !rawValue) {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  if (!['gradient', 'icon', 'preset'].includes(rawType)) {
    return { ...DEFAULT_AVATAR_OBJECT };
  }

  return {
    type: rawType,
    value: rawValue.slice(0, 48),
  };
}

function loadDeckQuestionsFromFile(deckFile) {
  const requested = String(deckFile || '').trim();
  if (!requested.endsWith('.json') || requested.includes('/') || requested.includes('\\')) {
    return null;
  }

  const decksDir = path.resolve(__dirname, '..', '..', 'data', 'decks');
  const resolvedDeckPath = path.resolve(decksDir, requested);
  if (!resolvedDeckPath.startsWith(decksDir)) return null;
  if (!fs.existsSync(resolvedDeckPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(resolvedDeckPath, 'utf8'));
    return Array.isArray(data?.questions) ? data.questions : null;
  } catch {
    return null;
  }
}

module.exports = {
  generateJoinProfile,
  normalizeCustomQuestions,
  withQuestionTiming,
  normalizeAvatarObject,
  loadDeckQuestionsFromFile,
};
