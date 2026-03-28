import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDeckStudioStore } from '../deckStudio/store';
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog';
import CloudDeckCard from '../components/CloudDeckCard';
import AnimatedBackground from '../components/AnimatedBackground';
import ConfirmActionModal from '../components/ConfirmActionModal';
import QuizGeneratorModal from '../components/QuizGeneratorModal';
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

function resolveImagePreviewUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.includes('/')) return `/${trimmed}`;
  return `/deck-images/${trimmed}`;
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

  const location = useLocation();
  const [csvText, setCsvText] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [cloudDecks, setCloudDecks] = useState([]);
  const [cloudStatus, setCloudStatus] = useState('loading');
  const [cloudError, setCloudError] = useState('');
  const [downloadingDeckId, setDownloadingDeckId] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  const [showSlideScrollUpHint, setShowSlideScrollUpHint] = useState(false);
  const [showSlideScrollDownHint, setShowSlideScrollDownHint] = useState(false);
  const [isDeleteQuestionModalOpen, setIsDeleteQuestionModalOpen] = useState(false);
  const [deleteQuestionConfirmChecked, setDeleteQuestionConfirmChecked] = useState(false);
  const [showQuizGeneratorModal, setShowQuizGeneratorModal] = useState(false);
  const promptTextareaRef = useRef(null);
  const slideListRef = useRef(null);
  const [hostName] = useState(() =>
    typeof window !== 'undefined' ? String(window.location.hostname || '').toLowerCase() : ''
  );

  const isHostMachine = hostName === 'localhost' || hostName === '127.0.0.1';

  const uploadImageFile = async (file) => {
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
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    if (event.target) event.target.value = '';
  };

  const onImageDragOver = (event) => {
    event.preventDefault();
    setIsImageDropActive(true);
  };

  const onImageDragLeave = (event) => {
    event.preventDefault();
    setIsImageDropActive(false);
  };

  const onImageDrop = async (event) => {
    event.preventDefault();
    setIsImageDropActive(false);
    if (!activeSlide) return;

    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      await uploadImageFile(droppedFile);
      return;
    }

    const droppedText = String(
      event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain') || ''
    ).trim();
    if (droppedText) {
      updateImageUrl(activeSlide.id, droppedText);
      setActionMessage('Image URL pasted into this question.');
    }
  };

  const onImagePaste = (event) => {
    if (!activeSlide) return;
    const pastedText = String(event.clipboardData?.getData('text/plain') || '').trim();
    if (!pastedText) return;
    updateImageUrl(activeSlide.id, pastedText);
    setActionMessage('Image URL pasted into this question.');
  };

  const resizePromptTextarea = (element) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
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

  useEffect(() => {
    resizePromptTextarea(promptTextareaRef.current);
  }, [selectedSlideId, deck.slides]);

  useEffect(() => {
    const el = slideListRef.current;
    if (!el) return;

    const updateHints = () => {
      const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      setShowSlideScrollUpHint(el.scrollTop > 4);
      setShowSlideScrollDownHint(el.scrollTop < maxScrollTop - 4);
    };

    updateHints();
    el.addEventListener('scroll', updateHints, { passive: true });
    window.addEventListener('resize', updateHints);

    return () => {
      el.removeEventListener('scroll', updateHints);
      window.removeEventListener('resize', updateHints);
    };
  }, [deck.slides.length]);

  const activeSlide = useMemo(
    () => deck.slides.find((slide) => slide.id === selectedSlideId) || deck.slides[0],
    [deck.slides, selectedSlideId]
  );

  const activeIndex = deck.slides.findIndex((slide) => slide.id === activeSlide?.id);
  const activeErrors = validation.bySlide[activeIndex] || {};
  const invalidSlideCount = Object.keys(validation.bySlide || {}).length;
  const currentImageUrl = String(activeSlide?.imageUrl || '').trim();
  const imagePreviewUrl =
    currentImageUrl && currentImageUrl.startsWith('/uploads')
      ? `http://${hostName || 'localhost'}:3000${currentImageUrl}`
      : resolveImagePreviewUrl(currentImageUrl);

  const validCount = useMemo(
    () => deck.slides.filter((slide) => isSlideValid(slide)).length,
    [deck.slides]
  );

  const progressPct = deck.slides.length > 0 ? Math.round((validCount / deck.slides.length) * 100) : 0;
  const activeQuestionNumber = activeIndex >= 0 ? activeIndex + 1 : 0;

  const onImportCsv = () => {
    if (!csvText.trim()) {
      setActionMessage('CSV text is empty.');
      return;
    }
    importCsvText(csvText);
    setCsvText('');
    setActionMessage('CSV imported successfully.');
  };

  const generateTopicInstant = async (topic, source = 'auto') => {
    console.log('[generateTopicInstant] Called with topic:', topic, 'source:', source);
    if (!topic || !topic.trim()) {
      setActionMessage('Please choose a topic.');
      return;
    }

    try {
      setAutoGenLoading(true);
      setActionMessage(`Generating deck for ${topic}...`);
      const backendUrl = getBackendUrl();
      console.log('[generateTopicInstant] Backend URL:', backendUrl);
      const resp = await fetch(`${backendUrl}/api/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), count: 10, difficulty: 'mixed', source })
      });
      console.log('[generateTopicInstant] API response status:', resp.status);
      const data = await resp.json();
      console.log('[generateTopicInstant] API response data:', data);
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate deck');
      }

      onDeckGenerated(data.deck);
      setActionMessage(`✅ Generated '${topic}' quiz with ${data.deck.slides?.length || 0} questions.`);
    } catch (err) {
      console.error('[generateTopicInstant] Error:', err);
      setActionMessage(`Error: ${err.message || 'generation failed'}`);
    } finally {
      setAutoGenLoading(false);
    }
  };

  const onDeckGenerated = (generatedDeck) => {
    try {
      const normalizeQuestion = (slide, idx) => {
        const prompt = String(slide.prompt || '').trim();
        if (!prompt) return null;

        const isTyping = slide.type === 'typing';
        const acceptedAnswers = Array.isArray(slide.acceptedAnswers)
          ? slide.acceptedAnswers.filter((a) => String(a || '').trim())
          : [];

        // Build or reuse options array
        let options = Array.isArray(slide.options) && slide.options.length === 4
          ? slide.options.map((o) => String(o || '').trim())
          : [];

        if (isTyping) {
          // For typing content, create a safe MCQ fallback
          const answer = acceptedAnswers[0] || String(slide.correct_answer || '').trim() || 'Answer';
          const distractors = [
            'None of these',
            'Not sure',
            'Maybe',
            'I don\'t know'
          ].map((v) => `${v} (${idx + 1})`);

          options = [answer, ...distractors]
            .slice(0, 4)
            .map((v) => String(v).trim());
        }

        // Ensure we have 4 non-empty options
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }

        options = options.map((o) => (String(o || '').trim() || `Option ${Math.random().toString(36).slice(2, 6)}`));

        const correctAnswer = acceptedAnswers[0] || String(slide.correct_answer || '').trim() || options[0];
        const correctIndex = options.findIndex((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());

        return {
          id: slide.id || `gen_${idx}`,
          prompt,
          imageUrl: String(slide.image || '').trim(),
          options,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          imported: true
        };
      };

      // Convert generated deck to store format
      const convertedSlides = (generatedDeck.slides || [])
        .map((slide, idx) => normalizeQuestion(slide, idx))
        .filter(Boolean);

      // Clear current deck and add generated slides
      // Store should handle this, but we'll import via CSV string for compatibility
      const csvHeaders = 'prompt,optionA,optionB,optionC,optionD,correct,imageUrl';
      const csvRows = convertedSlides
        .map((slide) => {
          const opts = slide.options || [];
          const correctAnswer = opts[slide.correctIndex] || opts[0] || '';
          const imageUrl = slide.imageUrl || '';
          return `"${slide.prompt.replace(/"/g, '""')}","${(opts[0] || '').replace(/"/g, '""')}","${(opts[1] || '').replace(/"/g, '""')}","${(opts[2] || '').replace(/"/g, '""')}","${(opts[3] || '').replace(/"/g, '""')}","${correctAnswer.replace(/"/g, '""')}","${imageUrl.replace(/"/g, '""')}"`;
        })
        .join('\n');
      const csvData = csvHeaders + '\n' + csvRows;

      importCsvText(csvData);
      setShowQuizGeneratorModal(false);
      setActionMessage(
        `✅ Quiz auto-generated! "${generatedDeck.deck_meta?.title || 'New Quiz'}" loaded with ${generatedDeck.slides?.length || 0} questions ready to edit.`
      );
    } catch (err) {
      setActionMessage(`Error: ${err?.message || 'Failed to load generated deck'}`);
    }
  };

  const queryParams = new URLSearchParams(location.search);
  const autoTopicFromUrl = queryParams.get('autogen');
  const autoSourceFromUrl = queryParams.get('source') || 'auto';
  const [autoGenAttempted, setAutoGenAttempted] = useState(false);

  useEffect(() => {
    console.log('[DeckStudio] useEffect triggered, autoTopicFromUrl:', autoTopicFromUrl, 'autoGenAttempted:', autoGenAttempted);
    if (!autoTopicFromUrl || autoGenAttempted) return;

    setAutoGenAttempted(true);
    const runAutoGen = async () => {
      try {
        console.log('[DeckStudio] Starting auto-generation for topic:', autoTopicFromUrl);
        setActionMessage(`✨ Auto-generating quiz for "${autoTopicFromUrl}"...`);
        setAutoGenLoading(true);
        await generateTopicInstant(autoTopicFromUrl, autoSourceFromUrl);
      } catch (err) {
        console.error('[DeckStudio] Auto-gen error:', err);
        setActionMessage(`Failed to auto-generate: ${err?.message || 'Unknown error'}`);
        console.error('[AutoGen] Error:', err);
      } finally {
        setAutoGenLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(runAutoGen, 100);
    return () => clearTimeout(timer);
  }, [autoTopicFromUrl, autoGenAttempted]);

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
    setDeleteQuestionConfirmChecked(false);
    setIsDeleteQuestionModalOpen(true);
  };

  const confirmDeleteQuestion = () => {
    if (!activeSlide || deck.slides.length <= 1 || !deleteQuestionConfirmChecked) return;
    setIsDeleteQuestionModalOpen(false);
    setDeleteQuestionConfirmChecked(false);
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

  const onSendToHostLan = () => {
    const checked = validateDeck();
    if (!checked.ok) {
      setActionMessage('Cannot prepare transfer yet. Fix validation errors first.');
      return;
    }
    const ok = exportFlux();
    if (!ok) {
      setActionMessage('Failed to prepare deck transfer. Please try again.');
      return;
    }
    setActionMessage('Deck exported as .flux. Send this file to the host machine and load it there.');
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
    <div className="relative flex h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedBackground />
      <aside className="relative z-10 flex w-72 flex-col border-r border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-2xl">
        <div className="border-b border-white/10 p-5">
          <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">Deck Studio</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Slide Navigator</p>
          <input
            value={deck.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Deck"
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
        </div>
        <div className="relative min-h-0 flex-1 px-4 py-4">
          <div
            ref={slideListRef}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="h-full space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
          >
          {deck.slides.map((slide, index) => {
            const isActive = slide.id === activeSlide?.id;
            const slideImageUrlRaw = String(slide?.imageUrl || '').trim();
            const slideImagePreviewUrl =
              slideImageUrlRaw && slideImageUrlRaw.startsWith('/uploads')
                ? `http://${hostName || 'localhost'}:3000${slideImageUrlRaw}`
                : resolveImagePreviewUrl(slideImageUrlRaw);
            return (
              <button
                key={slide.id}
                onClick={() => selectSlide(slide.id)}
                className={`relative w-full overflow-hidden rounded-2xl border-2 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-emerald-300 bg-emerald-500/15 shadow-[0_0_16px_rgba(45,212,191,0.35)]'
                    : 'border-white/10 bg-slate-900/45 hover:border-white/25'
                }`}
              >
                <div className="relative aspect-video rounded-xl border border-white/10 bg-black/25 p-3">
                  <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-emerald-300 text-emerald-950' : 'bg-white/15 text-slate-200'}`}>
                    {index + 1}
                  </span>
                  <div className="mt-6 flex h-full flex-col">
                    <p className="truncate text-xs font-semibold text-slate-100/95">
                      {slide.prompt || 'Untitled question'}
                    </p>
                    <div className="mt-1 h-8 w-full overflow-hidden rounded">
                      {slideImageUrlRaw ? (
                        <img
                          src={slideImagePreviewUrl}
                          alt="Slide preview"
                          className="h-8 w-full rounded object-cover opacity-80"
                        />
                      ) : (
                        <div className="h-8 w-full rounded border border-white/10 bg-white/5" />
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <div className="h-2 w-full rounded-sm bg-gradient-to-br from-rose-500 to-pink-600" />
                      <div className="h-2 w-full rounded-sm bg-gradient-to-br from-blue-500 to-indigo-600" />
                      <div className="h-2 w-full rounded-sm bg-gradient-to-br from-amber-400 to-orange-500" />
                      <div className="h-2 w-full rounded-sm bg-gradient-to-br from-emerald-400 to-teal-500" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          </div>

          {showSlideScrollUpHint && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 animate-pulse rounded-full border border-white/20 bg-slate-900/80 px-2 py-1 text-white/90 shadow-lg">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 14 6-6 6 6" />
              </svg>
            </div>
          )}

          {showSlideScrollDownHint && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 animate-pulse rounded-full border border-white/20 bg-slate-900/80 px-2 py-1 text-white/90 shadow-lg">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 10 6 6 6-6" />
              </svg>
            </div>
          )}
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

      <main className="relative z-10 flex h-full flex-1 items-stretch justify-center overflow-hidden p-5">
        <div className="flex h-full w-full max-w-5xl flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div>
            <textarea
              ref={promptTextareaRef}
              value={activeSlide?.prompt || ''}
              onChange={(e) => {
                resizePromptTextarea(e.currentTarget);
                if (activeSlide) updatePrompt(activeSlide.id, e.target.value);
              }}
              placeholder="Type your question here..."
              className="w-full resize-none overflow-hidden rounded-2xl border-2 border-white/20 bg-slate-900/35 px-6 py-5 text-center text-3xl md:text-5xl font-black tracking-tight text-white/95 placeholder:text-white/30 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/80 focus:animate-pulse drop-shadow-md transition-all"
            />
            {activeErrors.prompt && <p className="mt-3 text-center text-sm font-semibold text-rose-400 drop-shadow-sm">{activeErrors.prompt}</p>}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border-2 border-dashed border-white/20 bg-slate-900/30 p-4 backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-slate-900/50">
            <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              Image Reference (URL or Upload)
            </p>
            {!currentImageUrl ? (
              <div
                tabIndex={0}
                onDragOver={onImageDragOver}
                onDragLeave={onImageDragLeave}
                onDrop={onImageDrop}
                onPaste={onImagePaste}
                className={`flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
                  isImageDropActive
                    ? 'border-emerald-400/80 bg-emerald-500/15'
                    : 'border-white/20 bg-black/25 hover:border-emerald-400/50 hover:bg-slate-900/50'
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-emerald-300 shadow-lg">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 18.5h10a4 4 0 0 0 .7-7.94A5.5 5.5 0 0 0 7.14 9.3 3.7 3.7 0 0 0 7 18.5z" />
                    <path d="M12 8v8" />
                    <path d="m8.8 11.2 3.2-3.2 3.2 3.2" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-200">Drag and drop an image here, or paste a URL</p>
                <p className="mt-1 text-xs text-slate-400">Tip: click this area first, then press Ctrl+V to paste a URL</p>
                <label className={`mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-300 transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] ${uploadingImage ? 'cursor-not-allowed opacity-50' : ''}`}>
                  {uploadingImage ? 'Uploading...' : 'Browse Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                <div className="relative h-full w-full rounded-2xl border-2 border-cyan-400/60 bg-gradient-to-br from-slate-900/60 to-slate-950/80 p-3 shadow-2xl shadow-cyan-500/20">
                  <button
                    type="button"
                    onClick={() => activeSlide && updateImageUrl(activeSlide.id, '')}
                    className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-2 text-white transition-all hover:bg-rose-500 hover:scale-110 shadow-lg"
                    aria-label="Remove image"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m6 6 12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </button>
                  <img
                    src={imagePreviewUrl}
                    alt="Question visual preview"
                    className="h-full max-h-full w-full rounded-xl border-2 border-cyan-300/40 object-contain shadow-xl shadow-cyan-500/30 transition-all hover:scale-[1.02]"
                  />
                  {/* Generated image indicator */}
                  {currentImageUrl && (currentImageUrl.startsWith('http') || currentImageUrl.includes('unsplash')) && (
                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-cyan-300 font-medium shadow-lg">
                      ✨ AI Generated
                    </div>
                  )}
                </div>
              </div>
            )}
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
                  className={`rounded-3xl border-2 p-5 text-white transition-all duration-300 focus-within:scale-[1.02] focus-within:shadow-2xl hover:scale-[1.01] ${optionStyles[optionIndex]}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">Option {optionIndex + 1}</label>
                    <button
                      type="button"
                      aria-label={`Set option ${optionIndex + 1} as correct answer`}
                      onClick={() => activeSlide && setCorrectIndex(activeSlide.id, optionIndex)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                        isCorrect
                          ? 'border-white bg-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.45)]'
                          : 'border-white/45 bg-black/10 text-white/60 hover:border-white/70 hover:text-white'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isCorrect ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.2l1-5.7-4.1-4 5.7-.8L12 3.5z" />
                      </svg>
                    </button>
                  </div>
                  <input
                    value={option}
                    onChange={(e) => activeSlide && updateOption(activeSlide.id, optionIndex, e.target.value)}
                    placeholder={`Answer ${optionIndex + 1}`}
                    className="w-full rounded-lg border border-white/40 bg-black/20 px-3 py-2 text-sm font-black text-white placeholder:text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
                  />
                </div>
              );
            })}
          </div>

          {activeErrors.options && <p className="text-center text-sm text-rose-300">{activeErrors.options}</p>}

          <div className="flex justify-end pt-2">
            <button
              onClick={onDeleteQuestion}
              disabled={deck.slides.length <= 1}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-40"
            >
              Delete Current Question
            </button>
          </div>
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
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Advanced Tools</p>
            <div className="mt-3 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {['Science', 'Geography', 'Movies', 'History'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => generateTopicInstant(theme)}
                      disabled={autoGenLoading}
                      className="rounded-lg border border-teal-500/50 bg-teal-500/15 text-teal-100 px-3 py-2 text-xs font-bold hover:bg-teal-500/30 transition"
                    >
                      {autoGenLoading ? 'Generating…' : `Start: ${theme}`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onExport}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-slate-100 hover:border-emerald-500/60"
              >
                Export .flux Deck
              </button>

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
            </div>
          </section>

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

          {(actionMessage || autoGenLoading) && (
            <div className={`rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              actionMessage?.includes('Failed') || actionMessage?.includes('Error')
                ? 'border border-rose-500/40 bg-rose-500/10 text-rose-100'
                : 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 animate-pulse'
            }`}>
              {autoGenLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
              <span>{actionMessage || 'Auto-generating quiz...'}</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 p-5 backdrop-blur-xl">
          {isHostMachine ? (
            <button
              onClick={onHostDirectly}
              className="w-full rounded-xl bg-emerald-400 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_0_20px_rgba(74,222,128,0.25)] transition-all hover:bg-emerald-300"
            >
              Save and Launch
            </button>
          ) : (
            <button
              onClick={onSendToHostLan}
              className="w-full rounded-xl border border-emerald-300/60 bg-emerald-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.18)] transition-all hover:bg-emerald-500/30"
            >
              Send to Host (LAN)
            </button>
          )}
        </div>
      </aside>

      <ConfirmActionModal
        open={isDeleteQuestionModalOpen}
        title="Delete Question"
        message={`Question ${activeQuestionNumber || '?'} will be removed from this deck draft.`}
        checkboxLabel="I understand this question will be deleted from the current draft."
        checked={deleteQuestionConfirmChecked}
        onCheckedChange={setDeleteQuestionConfirmChecked}
        onCancel={() => {
          setIsDeleteQuestionModalOpen(false);
          setDeleteQuestionConfirmChecked(false);
        }}
        onConfirm={confirmDeleteQuestion}
        confirmLabel="Delete Question"
      />

      {showQuizGeneratorModal && (
        <QuizGeneratorModal
          onDeckGenerated={onDeckGenerated}
          onClose={() => setShowQuizGeneratorModal(false)}
        />
      )}
    </div>
  );
}
