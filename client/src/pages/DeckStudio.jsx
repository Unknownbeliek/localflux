import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeckStudioStore } from '../deckStudio/store';
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog';
import CloudDeckCard from '../components/CloudDeckCard';

function isSlideValid(slide) {
  return (
    slide &&
    slide.prompt.trim().length > 0 &&
    Array.isArray(slide.options) &&
    slide.options.length === 4 &&
    slide.options.every((opt) => String(opt || '').trim().length > 0) &&
    Number.isInteger(slide.correctIndex) &&
    slide.correctIndex >= 0 &&
    slide.correctIndex < 4
  );
}

export default function DeckStudio({ onBack, onHostDeck }) {
  const {
    deck,
    selectedSlideId,
    validation,
    saveState,
    csvError,
    initDraft,
    setTitle,
    addSlide,
    removeSlide,
    selectSlide,
    updatePrompt,
    updateImageUrl,
    updateOption,
    setCorrectIndex,
    importCsvText,
    exportFlux,
    validateDeck,
    undo,
    redo,
    historyPast,
    historyFuture,
  } = useDeckStudioStore();

  const [csvText, setCsvText] = useState('');
  const [category, setCategory] = useState('General Knowledge');
  const [actionMessage, setActionMessage] = useState('');
  const [cloudDecks, setCloudDecks] = useState([]);
  const [cloudStatus, setCloudStatus] = useState('loading');
  const [cloudError, setCloudError] = useState('');
  const [downloadingDeckId, setDownloadingDeckId] = useState('');

  const csvTemplate =
    'prompt,optionA,optionB,optionC,optionD,correct,imageUrl\n' +
    'Which planet is known as the Red Planet?,Mercury,Venus,Mars,Jupiter,Mars,\n';

  useEffect(() => {
    initDraft();
  }, [initDraft]);

  const loadCloudCatalog = useCallback(async () => {
    setCloudStatus('loading');
    setCloudError('');
    try {
      const decks = await fetchCloudDecks();
      setCloudDecks(decks);
      setCloudStatus('ready');
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      const isOffline =
        message.includes('failed to fetch') ||
        message.includes('network') ||
        message.includes('offline');
      setCloudDecks([]);
      setCloudStatus(isOffline ? 'offline' : 'error');
      setCloudError(err?.message || 'Unable to load cloud decks.');
    }
  }, []);

  useEffect(() => {
    loadCloudCatalog();
  }, [loadCloudCatalog]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (!withModifier) return;
      const key = event.key.toLowerCase();

      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (key === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const activeSlide = useMemo(
    () => deck.slides.find((slide) => slide.id === selectedSlideId) || deck.slides[0],
    [deck.slides, selectedSlideId]
  );

  const activeIndex = deck.slides.findIndex((slide) => slide.id === activeSlide?.id);
  const activeErrors = validation.bySlide[activeIndex] || {};
  const invalidSlideCount = Object.keys(validation.bySlide || {}).length;

  const validCount = useMemo(
    () => deck.slides.filter((slide) => isSlideValid(slide)).length,
    [deck.slides]
  );

  const progressPct = deck.slides.length > 0 ? Math.round((validCount / deck.slides.length) * 100) : 0;

  const onImportCsv = () => {
    if (!csvText.trim()) return;
    setActionMessage('');
    importCsvText(csvText);
  };

  const onExport = () => {
    const checked = validateDeck();
    if (!checked.ok) {
      setActionMessage('Cannot export yet. Fix validation errors first.');
      return;
    }
    const ok = exportFlux();
    setActionMessage(ok ? 'Deck exported as .flux.' : 'Export failed. Please try again.');
  };

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    importCsvText(text);
  };

  const onDeleteQuestion = () => {
    if (!activeSlide || deck.slides.length <= 1) return;
    const ok = window.confirm('Delete this question? You can still Undo.');
    if (!ok) return;
    setActionMessage('');
    removeSlide(activeSlide.id);
  };

  const onAddQuestion = () => {
    setActionMessage('');
    addSlide();
    window.setTimeout(() => validateDeck(), 0);
  };

  const onHostDirectly = () => {
    const checked = validateDeck();
    if (!checked.ok) {
      setActionMessage('Cannot launch game yet. Fix validation errors first.');
      return;
    }
    if (!onHostDeck) {
      setActionMessage('Launch unavailable in this context.');
      return;
    }
    const questions = checked.data.slides.map((slide, index) => ({
      q_id: `q_${String(index + 1).padStart(2, '0')}`,
      type: slide.imageUrl ? 'image_guess' : 'text_only',
      prompt: slide.prompt,
      asset_ref: slide.imageUrl || null,
      options: slide.options,
      correct_answer: slide.options[slide.correctIndex],
      time_limit_ms: 20000,
      fuzzy_allowances: [],
    }));
    onHostDeck(questions);
    setActionMessage('Launching host with this deck...');
  };

  const onDownloadCloudDeck = async (deckMeta) => {
    if (!deckMeta?.deckUrl || downloadingDeckId) return;
    setActionMessage('');
    setDownloadingDeckId(deckMeta.id);
    try {
      const saved = await downloadDeckToLocal(deckMeta.deckUrl);
      setActionMessage(`Downloaded "${saved.title}" to local deck storage.`);
      await initDraft();
    } catch (err) {
      setActionMessage(err?.message || 'Cloud download failed.');
    } finally {
      setDownloadingDeckId('');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.14),rgba(2,6,23,0)_70%)]" />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

      <header className="relative z-10 border-b border-slate-800 px-4 py-3 md:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            BACK
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Deck Studio</h1>
            <p className="text-xs tracking-wide text-slate-400">LocalFlux build and launch flow</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Draft Status</p>
            <p className="text-sm font-semibold text-emerald-300">{saveState}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 md:px-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Deck Identity</p>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Deck Name</label>
            <input
              value={deck.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Eyes of Cinema - Season 1"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />

            <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>Progress</span>
              <span className="font-black text-emerald-300">{validCount}/{deck.slides.length}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/30">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Question Builder</p>
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={historyPast.length === 0}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:opacity-40"
                >
                  UNDO
                </button>
                <button
                  onClick={redo}
                  disabled={historyFuture.length === 0}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:opacity-40"
                >
                  REDO
                </button>
              </div>
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Question Text</label>
            <textarea
              value={activeSlide?.prompt || ''}
              onChange={(e) => activeSlide && updatePrompt(activeSlide.id, e.target.value)}
              rows={3}
              placeholder="Type your question here..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
            {activeErrors.prompt && <p className="mt-1 text-xs text-rose-300">{activeErrors.prompt}</p>}

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {(activeSlide?.options || ['', '', '', '']).map((option, optionIndex) => (
                <div
                  key={`${activeSlide?.id || 'none'}_${optionIndex}`}
                  className={`rounded-lg border p-2.5 ${
                    activeSlide?.correctIndex === optionIndex
                      ? 'border-emerald-400/70 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Option {optionIndex + 1}</span>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={activeSlide?.correctIndex === optionIndex}
                        onChange={() => activeSlide && setCorrectIndex(activeSlide.id, optionIndex)}
                        className="mr-1"
                      />
                      Correct
                    </label>
                  </div>
                  {activeSlide?.correctIndex === optionIndex && (
                    <p className="mb-1 inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                      Correct Answer
                    </p>
                  )}
                  <input
                    value={option}
                    onChange={(e) => activeSlide && updateOption(activeSlide.id, optionIndex, e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  />
                </div>
              ))}
            </div>
            {activeErrors.options && <p className="mt-1 text-xs text-rose-300">{activeErrors.options}</p>}

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Frame Image (Optional)</label>
              <input
                value={activeSlide?.imageUrl || ''}
                onChange={(e) => activeSlide && updateImageUrl(activeSlide.id, e.target.value)}
                placeholder="https://example.com/frame.jpg"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              >
                <option>General Knowledge</option>
                <option>Movie Frames</option>
                <option>Science</option>
                <option>History</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={onAddQuestion}
                className="flex-1 rounded-xl bg-emerald-400 py-2.5 text-xs font-black tracking-wide text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
              >
                + ADD TO DECK
              </button>
              <button
                onClick={onDeleteQuestion}
                disabled={deck.slides.length <= 1}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold tracking-wide text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40"
              >
                DELETE
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {(cloudStatus === 'loading' || cloudStatus === 'ready' || cloudStatus === 'offline' || cloudStatus === 'error') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/30">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explore Cloud Decks</p>
                <div className="flex items-center gap-2">
                  {(cloudStatus === 'offline' || cloudStatus === 'error') && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                      Offline Mode
                    </span>
                  )}
                  <button
                    onClick={loadCloudCatalog}
                    disabled={cloudStatus === 'loading'}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cloudStatus === 'loading' ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              </div>

              {cloudStatus === 'loading' && (
                <p className="text-xs text-slate-400">Checking cloud catalog...</p>
              )}

              {cloudStatus === 'ready' && cloudDecks.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {cloudDecks.map((deckMeta) => (
                    <CloudDeckCard
                      key={deckMeta.id}
                      deck={deckMeta}
                      downloading={downloadingDeckId === deckMeta.id}
                      onDownload={onDownloadCloudDeck}
                    />
                  ))}
                </div>
              )}

              {cloudStatus === 'ready' && cloudDecks.length === 0 && (
                <p className="text-xs text-slate-400">No cloud decks currently available.</p>
              )}

              {cloudStatus === 'error' && (
                <p className="text-xs text-rose-300">{cloudError || 'Could not load cloud catalog.'}</p>
              )}

              {cloudStatus === 'offline' && (
                <p className="text-xs text-amber-200/90">Cloud catalog unavailable. Local editing remains fully available.</p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Deck Preview</p>

            {deck.slides.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-center text-slate-500">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide">No Questions Yet</p>
                  <p className="mt-1 text-xs">Build your first question on the left, then click + Add to Deck.</p>
                </div>
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {deck.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => selectSlide(slide.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${slide.id === activeSlide?.id ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 bg-slate-950 hover:border-emerald-500/40'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-300">Q{index + 1}</span>
                      <span className="truncate text-sm text-slate-100">{slide.prompt || 'Untitled question'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {validation.global.length > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {validation.global.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}

          {invalidSlideCount > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {invalidSlideCount} question{invalidSlideCount > 1 ? 's' : ''} need fixes before export or launch.
            </div>
          )}

          {actionMessage && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {actionMessage}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 shadow-2xl shadow-black/30">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">CSV Pipeline</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={4}
              placeholder="prompt,optionA,optionB,optionC,optionD,correct,imageUrl"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={onImportCsv} className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800">Import CSV Text</button>
              <button onClick={() => setCsvText(csvTemplate)} className="flex-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20">Template</button>
            </div>
            <label className="mt-2 block cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800">
              Import CSV File
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImportFile} />
            </label>
            {csvError && <p className="mt-2 text-xs text-rose-300">{csvError}</p>}
          </div>

          <button
            onClick={onExport}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black tracking-wide text-slate-100 transition hover:border-emerald-500/50 hover:bg-slate-800"
          >
            EXPORT .FLUX DECK
          </button>
          <button
            onClick={onHostDirectly}
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black tracking-wide text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
          >
            SAVE & LAUNCH GAME
          </button>
        </section>
      </main>
    </div>
  );
}
