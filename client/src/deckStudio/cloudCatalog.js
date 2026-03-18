import { z } from 'zod';
import { saveDraft } from './db';
import { DeckSchema } from './schemas';

export const CLOUD_CATALOG_URL = '/cloud-mock/catalog.json';

const CloudCatalogDeckSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  deckUrl: z.string().trim().url(),
  questionCount: z.number().int().nonnegative().optional(),
  updatedAt: z.string().trim().optional(),
});

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveDeckId(url) {
  const base = String(url || '').split('/').pop() || 'cloud-deck';
  const slug = base.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `cloud_${slug || uid()}`;
}

function toDraftDeck(payload, sourceUrl) {
  if (payload && typeof payload === 'object' && Array.isArray(payload.slides)) {
    const existing = DeckSchema.safeParse(payload);
    if (existing.success) return existing.data;
  }

  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const meta = payload?.deck_meta || {};

  const slides = questions.map((q, idx) => {
    const options = Array.isArray(q?.options) ? q.options.map((o) => String(o || '').trim()) : [];
    const normalizedOptions = options.slice(0, 4);
    while (normalizedOptions.length < 4) normalizedOptions.push('');

    const correctAnswer = String(q?.correct_answer || '').trim();
    let correctIndex = normalizedOptions.findIndex((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
    if (correctIndex < 0) correctIndex = 0;

    return {
      id: String(q?.q_id || `q_${String(idx + 1).padStart(2, '0')}_${uid()}`),
      prompt: String(q?.prompt || '').trim(),
      options: normalizedOptions,
      correctIndex,
      imageUrl: String(q?.asset_ref || '').trim(),
    };
  });

  return {
    id: String(meta.id || deriveDeckId(sourceUrl)),
    title: String(meta.title || 'Cloud Deck').trim(),
    version: String(meta.version || '1.0.0').trim(),
    slides,
    updatedAt: Date.now(),
  };
}

export async function fetchCloudDecks() {
  const res = await fetch(CLOUD_CATALOG_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Catalog request failed (${res.status})`);
  }

  const body = await res.json();
  const decksRaw = Array.isArray(body) ? body : body?.decks;
  if (!Array.isArray(decksRaw)) {
    throw new Error('Invalid catalog format. Expected array or { decks: [] }.');
  }

  const validated = z.array(CloudCatalogDeckSchema).safeParse(decksRaw);
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message || 'Cloud catalog validation failed.');
  }

  return validated.data;
}

export async function downloadDeckToLocal(deckUrl) {
  if (!deckUrl || typeof deckUrl !== 'string') {
    throw new Error('A valid deck URL is required.');
  }

  const res = await fetch(deckUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Deck download failed (${res.status})`);
  }

  const payload = await res.json();
  const candidate = toDraftDeck(payload, deckUrl);
  const parsed = DeckSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Downloaded deck failed schema validation.');
  }

  await saveDraft(parsed.data);
  localStorage.setItem('lf_lastDraftId', parsed.data.id);
  localStorage.setItem('lf_lastSavedAt', String(Date.now()));
  return parsed.data;
}
