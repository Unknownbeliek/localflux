import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeckStudioStore } from '../deckStudio/store';
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog';
import CloudDeckCard from '../components/CloudDeckCard';
import AnimatedBackground from '../components/AnimatedBackground';
import { getBackendUrl } from '../backendUrl';
import { compressImageToWebP } from '../utils/imageCompressor';

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
  const [actionMessage, setActionMessage] = useState('');
  const [cloudDecks, setCloudDecks] = useState([]);
  const [cloudStatus, setCloudStatus] = useState('loading');
  const [cloudError, setCloudError] = useState('');
  const [downloadingDeckId, setDownloadingDeckId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeSlide) return;
    
    try {
      setUploadingImage(true);
      setActionMessage('Compressing and uploading image...');
      
      const webpBlob = await compressImageToWebP(file);
      
      const res = await fetch(`${getBackendUrl()}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/webp'
        },
        body: webpBlob
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const { url } = await res.json();
      updateImageUrl(activeSlide.id, url);
      setActionMessage('Image successfully uploaded and optimized.');
    } catch (err) {
      setActionMessage(err?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = '';
    }
  };

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
    <div className="flex h-[100dvh] bg-slate-950 text-white overflow-hidden relative">
      <AnimatedBackground />
      <aside className="relative z-10 w-64 bg-slate-950/60 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl">
        <div className="border-b border-white/10 p-5">
          <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">Deck Studio</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Slide Navigator</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {deck.slides.map((slide, index) => {
            const isActive = slide.id === activeSlide?.id;
            return (
              <button
                key={slide.id}
                onClick={() => selectSlide(slide.id)}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isActive
                    ? 'border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                    : 'border-white/5 bg-slate-900/40 hover:border-white/20'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Question {index + 1}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-100">
                  {slide.prompt || 'Untitled question'}
                </p>
              </button>
            );
          })}
        </div>
        <div className="border-t border-white/10 p-5">
          <button
            onClick={onAddQuestion}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-4 text-sm font-black tracking-[0.1em] text-teal-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] active:translate-y-0 active:scale-95"
          >
            + ADD QUESTION
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div>
            <input
              value={activeSlide?.prompt || ''}
              onChange={(e) => activeSlide && updatePrompt(activeSlide.id, e.target.value)}
              placeholder="Type your question here..."
              className="w-full bg-transparent text-center text-4xl md:text-5xl font-black tracking-tight text-white/95 placeholder:text-white/30 focus:outline-none drop-shadow-md transition-all"
            />
            {activeErrors.prompt && <p className="mt-3 text-center text-sm font-semibold text-rose-400 drop-shadow-sm">{activeErrors.prompt}</p>}
          </div>

          <div className="rounded-3xl border-2 border-dashed border-white/20 bg-slate-900/30 p-8 backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-slate-900/50">
            <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              Image Reference (URL or Upload)
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={activeSlide?.imageUrl || ''}
                onChange={(e) => activeSlide && updateImageUrl(activeSlide.id, e.target.value)}
                placeholder="Paste image URL here"
                className="flex-1 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 shadow-inner overflow-hidden"
              />
              <label className={`flex cursor-pointer items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-sm font-black tracking-wide text-emerald-300 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] ${uploadingImage ? 'cursor-not-allowed opacity-50' : ''}`}>
                {uploadingImage ? 'UPLOADING...' : 'BROWSE IMAGE'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(activeSlide?.options || ['', '', '', '']).map((option, optionIndex) => {
              const optionStyles = [
                'bg-gradient-to-br from-rose-500 to-pink-600 border-white/20 shadow-xl',
                'bg-gradient-to-br from-blue-500 to-indigo-600 border-white/20 shadow-xl',
                'bg-gradient-to-br from-amber-400 to-orange-500 border-white/20 shadow-xl text-white',
                'bg-gradient-to-br from-emerald-400 to-teal-500 border-white/20 shadow-xl',
              ];
              const isCorrect = activeSlide?.correctIndex === optionIndex;

              return (
                <div
                  key={`${activeSlide?.id || 'none'}_${optionIndex}`}
                  className={`rounded-3xl border-2 p-5 transition-all duration-300 focus-within:scale-[1.02] focus-within:shadow-2xl hover:scale-[1.01] ${optionStyles[optionIndex]}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wide">Option {optionIndex + 1}</label>
                    <label className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={isCorrect}
                        onChange={() => activeSlide && setCorrectIndex(activeSlide.id, optionIndex)}
                        className="h-4 w-4"
                      />
                      Correct
                    </label>
                  </div>
                  <input
                    value={option}
                    onChange={(e) => activeSlide && updateOption(activeSlide.id, optionIndex, e.target.value)}
                    placeholder={`Answer ${optionIndex + 1}`}
                    className="w-full rounded-lg border border-white/40 bg-black/20 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/70"
                  />
                  {isCorrect && (
                    <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-white">
                      Correct Answer
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {activeErrors.options && <p className="text-center text-sm text-rose-300">{activeErrors.options}</p>}
        </div>
      </main>

      <aside className="relative z-10 w-80 bg-slate-950/60 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Settings</p>
            <button
              onClick={onBack}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Exit
            </button>
          </div>
          <p className="mt-1 text-xs text-emerald-300">Draft status: {saveState}</p>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Progress</span>
            <span className="font-black text-emerald-300">{validCount}/{deck.slides.length}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-2xl border border-white/5 bg-black/20 p-4 shadow-inner">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Deck Name</label>
            <input
              value={deck.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pop Culture Trivia"
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
            />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <button
              onClick={undo}
              disabled={historyPast.length === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-slate-300 transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={historyFuture.length === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-slate-300 transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Redo
            </button>
            <button
              onClick={onExport}
              className="col-span-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-slate-100 hover:border-emerald-500/60"
            >
              Export .flux Deck
            </button>
            <button
              onClick={onHostDirectly}
              className="col-span-2 rounded-xl bg-emerald-400 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-black hover:bg-emerald-300"
            >
              Save and Launch
            </button>
            <button
              onClick={onDeleteQuestion}
              disabled={deck.slides.length <= 1}
              className="col-span-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-rose-200 disabled:opacity-40"
            >
              Delete Current Question
            </button>
          </section>

          <details className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
              CSV Pipeline
            </summary>
            <div className="mt-3 space-y-2">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={5}
                placeholder="prompt,optionA,optionB,optionC,optionD,correct,imageUrl"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onImportCsv}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-emerald-500/60"
                >
                  Import Text
                </button>
                <button
                  onClick={() => setCsvText(csvTemplate)}
                  className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
                >
                  Template
                </button>
              </div>
              <label className="block cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-slate-100 hover:border-emerald-500/60">
                Import CSV File
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImportFile} />
              </label>
              {csvError && <p className="text-xs text-rose-300">{csvError}</p>}
            </div>
          </details>

          {(cloudStatus === 'loading' || cloudStatus === 'ready' || cloudStatus === 'offline' || cloudStatus === 'error') && (
            <details className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
                Cloud Catalog
              </summary>
              <div className="mt-3 space-y-2">
                <button
                  onClick={loadCloudCatalog}
                  disabled={cloudStatus === 'loading'}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-emerald-500/60 disabled:opacity-50"
                >
                  {cloudStatus === 'loading' ? 'Refreshing...' : 'Refresh Cloud Decks'}
                </button>
                {cloudStatus === 'loading' && <p className="text-xs text-slate-400">Checking cloud catalog...</p>}
                {cloudStatus === 'error' && <p className="text-xs text-rose-300">{cloudError || 'Could not load cloud catalog.'}</p>}
                {cloudStatus === 'offline' && <p className="text-xs text-amber-200">Cloud unavailable. Local editing continues.</p>}
                {cloudStatus === 'ready' && cloudDecks.length === 0 && (
                  <p className="text-xs text-slate-400">No cloud decks available.</p>
                )}
                {cloudStatus === 'ready' && cloudDecks.length > 0 && (
                  <div className="space-y-2">
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
              </div>
            </details>
          )}

          {validation.global.length > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {validation.global.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}

          {invalidSlideCount > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {invalidSlideCount} question{invalidSlideCount > 1 ? 's' : ''} need fixes before export or launch.
            </div>
          )}

          {actionMessage && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {actionMessage}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
