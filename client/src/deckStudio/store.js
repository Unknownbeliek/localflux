import Papa from 'papaparse';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DeckSchema, toDeckErrors } from './schemas';
import { loadDraft, saveDraft } from './db';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSlide() {
  return {
    id: uid(),
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    imageUrl: '',
    difficulty: undefined,
  };
}

function createDeck() {
  return {
    id: `draft_${uid()}`,
    title: 'Untitled Deck',
    version: '1.0.0',
    slides: [createSlide()],
    updatedAt: Date.now(),
  };
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function cloneDeck(deck) {
  return JSON.parse(JSON.stringify(deck));
}

export const useDeckStudioStore = create(
  immer((set, get) => {
    const saveDebounced = debounce(async () => {
      const deck = get().deck;
      set((state) => {
        state.saveState = 'saving';
      });
      try {
        await saveDraft(deck);
        localStorage.setItem('lf_lastDraftId', deck.id);
        localStorage.setItem('lf_lastSavedAt', String(Date.now()));
        set((state) => {
          state.saveState = 'saved';
        });
      } catch {
        set((state) => {
          state.saveState = 'error';
        });
      }
    }, 700);

    const touchDeck = () => {
      set((state) => {
        state.deck.updatedAt = Date.now();
      });
      saveDebounced();
    };

    const pushHistory = () => {
      const snapshot = cloneDeck(get().deck);
      set((state) => {
        state.historyPast.push(snapshot);
        if (state.historyPast.length > 80) state.historyPast.shift();
        state.historyFuture = [];
      });
    };

    return {
      deck: createDeck(),
      selectedSlideId: '',
      validation: { bySlide: {}, global: [] },
      saveState: 'idle',
      csvError: '',
      historyPast: [],
      historyFuture: [],

      initDraft: async () => {
        const draftId = localStorage.getItem('lf_lastDraftId');
        if (!draftId) {
          const firstSlideId = get().deck.slides[0].id;
          set((state) => {
            state.selectedSlideId = firstSlideId;
          });
          saveDebounced();
          return;
        }

        const draft = await loadDraft(draftId);
        if (draft) {
          set((state) => {
            state.deck = draft;
            state.selectedSlideId = draft.slides[0]?.id || '';
            state.saveState = 'saved';
            state.historyPast = [];
            state.historyFuture = [];
          });
        } else {
          const firstSlideId = get().deck.slides[0].id;
          set((state) => {
            state.selectedSlideId = firstSlideId;
          });
        }
      },

      setTitle: (title) => {
        pushHistory();
        set((state) => {
          state.deck.title = title;
        });
        touchDeck();
      },

      setVersion: (version) => {
        pushHistory();
        set((state) => {
          state.deck.version = version;
        });
        touchDeck();
      },

      addSlide: () => {
        pushHistory();
        const slide = createSlide();
        set((state) => {
          state.deck.slides.push(slide);
          state.selectedSlideId = slide.id;
        });
        touchDeck();
      },

      removeSlide: (slideId) => {
        if (get().deck.slides.length <= 1) return;
        pushHistory();
        set((state) => {
          state.deck.slides = state.deck.slides.filter((s) => s.id !== slideId);
          if (state.selectedSlideId === slideId) {
            state.selectedSlideId = state.deck.slides[0]?.id || '';
          }
        });
        touchDeck();
      },

      selectSlide: (slideId) => {
        set((state) => {
          state.selectedSlideId = slideId;
        });
      },

      updatePrompt: (slideId, prompt) => {
        pushHistory();
        set((state) => {
          const slide = state.deck.slides.find((s) => s.id === slideId);
          if (slide) slide.prompt = prompt;
        });
        touchDeck();
      },

      updateImageUrl: (slideId, imageUrl) => {
        pushHistory();
        set((state) => {
          const slide = state.deck.slides.find((s) => s.id === slideId);
          if (slide) slide.imageUrl = imageUrl;
        });
        touchDeck();
      },

      updateOption: (slideId, optionIndex, value) => {
        pushHistory();
        set((state) => {
          const slide = state.deck.slides.find((s) => s.id === slideId);
          if (slide && optionIndex >= 0 && optionIndex < 4) {
            slide.options[optionIndex] = value;
          }
        });
        touchDeck();
      },

      setCorrectIndex: (slideId, correctIndex) => {
        pushHistory();
        set((state) => {
          const slide = state.deck.slides.find((s) => s.id === slideId);
          if (slide) slide.correctIndex = correctIndex;
        });
        touchDeck();
      },

      setDifficulty: (slideId, difficulty) => {
        pushHistory();
        set((state) => {
          const slide = state.deck.slides.find((s) => s.id === slideId);
          if (slide) {
            // Toggle: if already selected, clear it (set to undefined)
            if (slide.difficulty === difficulty) {
              slide.difficulty = undefined;
            } else if (['easy', 'medium', 'hard'].includes(difficulty)) {
              slide.difficulty = difficulty;
            }
          }
        });
        touchDeck();
      },

      importCsvText: (text) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (parsed.errors.length > 0) {
          set((state) => {
            state.csvError = parsed.errors[0].message || 'CSV parse failed.';
          });
          return;
        }

        const slides = parsed.data
          .map((row) => {
            const options = [
              String(row.optionA || row.a || '').trim(),
              String(row.optionB || row.b || '').trim(),
              String(row.optionC || row.c || '').trim(),
              String(row.optionD || row.d || '').trim(),
            ];
            const correctRaw = String(row.correct || row.correctOption || '').trim();
            const correctIndex = options.findIndex((o) => o.toLowerCase() === correctRaw.toLowerCase());
            const fallbackIndex = Number(row.correctIndex);

            return {
              id: uid(),
              prompt: String(row.prompt || row.question || '').trim(),
              options,
              correctIndex: correctIndex >= 0 ? correctIndex : Number.isInteger(fallbackIndex) ? fallbackIndex : 0,
              imageUrl: String(row.imageUrl || row.image || '').trim(),
            };
          })
          .filter((s) => s.prompt.length > 0);

        if (slides.length === 0) {
          set((state) => {
            state.csvError = 'No valid rows found. Expected prompt + 4 options.';
          });
          return;
        }

        pushHistory();
        set((state) => {
          state.deck.slides = slides;
          state.selectedSlideId = slides[0].id;
          state.csvError = '';
        });
        touchDeck();
      },

      undo: () => {
        set((state) => {
          if (state.historyPast.length === 0) return;
          const previous = state.historyPast.pop();
          state.historyFuture.unshift(cloneDeck(state.deck));
          if (state.historyFuture.length > 80) state.historyFuture.pop();
          state.deck = previous;
          if (!state.deck.slides.some((s) => s.id === state.selectedSlideId)) {
            state.selectedSlideId = state.deck.slides[0]?.id || '';
          }
          state.deck.updatedAt = Date.now();
        });
        saveDebounced();
      },

      redo: () => {
        set((state) => {
          if (state.historyFuture.length === 0) return;
          const next = state.historyFuture.shift();
          state.historyPast.push(cloneDeck(state.deck));
          if (state.historyPast.length > 80) state.historyPast.shift();
          state.deck = next;
          if (!state.deck.slides.some((s) => s.id === state.selectedSlideId)) {
            state.selectedSlideId = state.deck.slides[0]?.id || '';
          }
          state.deck.updatedAt = Date.now();
        });
        saveDebounced();
      },

      validateDeck: () => {
        const deck = get().deck;
        const result = DeckSchema.safeParse(deck);
        if (result.success) {
          set((state) => {
            state.validation = { bySlide: {}, global: [] };
          });
          return { ok: true, data: result.data };
        }

        set((state) => {
          state.validation = toDeckErrors(result.error);
        });
        return { ok: false, error: result.error };
      },

      exportFlux: () => {
        const checked = get().validateDeck();
        if (!checked.ok) return false;

        const payload = {
          deck_meta: {
            id: get().deck.id,
            title: get().deck.title,
            version: get().deck.version,
            total_questions: get().deck.slides.length,
            compiled_at: Date.now(),
            source: 'deck-studio',
          },
          questions: get().deck.slides.map((slide, index) => ({
            q_id: `q_${String(index + 1).padStart(2, '0')}`,
            type: slide.imageUrl ? 'image_guess' : 'text_only',
            prompt: slide.prompt,
            asset_ref: slide.imageUrl || null,
            options: slide.options,
            correct_answer: slide.options[slide.correctIndex],
            time_limit_ms: 20000,
            fuzzy_allowances: [],
          })),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${get().deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'deck'}.flux`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      },
    };
  })
);
