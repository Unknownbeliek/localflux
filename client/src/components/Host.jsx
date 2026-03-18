import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import Chat from './Chat';
import { createGameSocket, getBackendUrl } from '../backendUrl';
import { useHostToken } from '../context/HostTokenProvider';
import { deckStudioDB } from '../deckStudio/db';
import { saveDraft } from '../deckStudio/db';
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog';
import { DeckSchema } from '../deckStudio/schemas';
import { QRCodeSVG } from 'qrcode.react';
import PingIndicator from './PingIndicator';

const HOST_SESSION_KEY = 'lf_host_session_id';
const HOST_STATE_KEY = 'lf_host_state';
const LAN_ROOM = 'local_flux_main';

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { type: 'preset', value: '1.jpg' };
  const value = String(input.value || '').trim();
  if (input.type !== 'preset' || !value) return { type: 'preset', value: '1.jpg' };
  return { type: 'preset', value };
}

function presetPath(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '/avatars/1.png';
  return cleaned.includes('.') ? `/avatars/${cleaned}` : `/avatars/${cleaned}.png`;
}

function getOrCreateHostSessionId() {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(HOST_SESSION_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(HOST_SESSION_KEY, next);
  return next;
}

function readHostState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HOST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistHostState(next) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOST_STATE_KEY, JSON.stringify(next));
}

function clearHostState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HOST_STATE_KEY);
}

function studioSlidesToQuestions(slides = []) {
  return slides.map((slide, index) => ({
    q_id: `q_${String(index + 1).padStart(2, '0')}`,
    type: slide.imageUrl ? 'image_guess' : 'text_only',
    prompt: String(slide.prompt || '').trim(),
    asset_ref: slide.imageUrl || null,
    options: Array.isArray(slide.options) ? slide.options.map((opt) => String(opt || '').trim()) : ['', '', '', ''],
    correct_answer: Array.isArray(slide.options) ? String(slide.options[slide.correctIndex] || slide.options[0] || '').trim() : '',
    time_limit_ms: 20000,
    fuzzy_allowances: [],
  }));
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function questionsToDeck(raw, fallbackTitle = 'Imported Deck') {
  const questions = Array.isArray(raw?.questions) ? raw.questions : [];
  const meta = raw?.deck_meta || {};

  const slides = questions.map((q, idx) => {
    const options = Array.isArray(q?.options) ? q.options.map((opt) => String(opt || '').trim()) : [];
    const normalized = options.slice(0, 4);
    while (normalized.length < 4) normalized.push('');

    const correctAnswer = String(q?.correct_answer || '').trim();
    let correctIndex = normalized.findIndex((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
    if (correctIndex < 0) correctIndex = 0;

    return {
      id: String(q?.q_id || `q_${idx + 1}_${uid()}`),
      prompt: String(q?.prompt || '').trim(),
      options: normalized,
      correctIndex,
      imageUrl: String(q?.asset_ref || '').trim(),
    };
  });

  return {
    id: String(meta.id || `import_${uid()}`),
    title: String(meta.title || fallbackTitle).trim(),
    version: String(meta.version || '1.0.0').trim(),
    slides,
    updatedAt: Date.now(),
  };
}

function csvRowsToDeck(rows, fallbackTitle = 'CSV Import') {
  const slides = rows
    .map((row, idx) => {
      const options = [
        String(row.optionA || row.a || '').trim(),
        String(row.optionB || row.b || '').trim(),
        String(row.optionC || row.c || '').trim(),
        String(row.optionD || row.d || '').trim(),
      ];

      const correctRaw = String(row.correct || row.correctOption || '').trim();
      const byAnswer = options.findIndex((opt) => opt.toLowerCase() === correctRaw.toLowerCase());
      const byIndex = Number(row.correctIndex);
      const correctIndex = byAnswer >= 0 ? byAnswer : Number.isInteger(byIndex) ? byIndex : 0;

      return {
        id: `csv_${idx + 1}_${uid()}`,
        prompt: String(row.prompt || row.question || '').trim(),
        options,
        correctIndex,
        imageUrl: String(row.imageUrl || row.image || '').trim(),
      };
    })
    .filter((slide) => slide.prompt.length > 0);

  return {
    id: `import_${uid()}`,
    title: fallbackTitle,
    version: '1.0.0',
    slides,
    updatedAt: Date.now(),
  };
}

export default function Host({ onBack, studioQuestions = null }) {
  const { token: hostToken } = useHostToken();
  const savedHostState = readHostState();
  const hostSessionIdRef = useRef(getOrCreateHostSessionId());
  const resumeAttemptedRef = useRef(false);
  const socketRef = useRef(null);
  const [hostSocket, setHostSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState(savedHostState?.roomName || '');
  const [roomId, setRoomId] = useState(savedHostState?.roomId || null);
  const [players, setPlayers] = useState(savedHostState?.players || []);
  const [error, setError] = useState('');
  const [resumeNotice, setResumeNotice] = useState(savedHostState?.roomId ? 'Reconnecting to your previous room...' : '');

  const [phase, setPhase] = useState(savedHostState?.roomId ? 'lobby' : 'setup');
  const [question, setQuestion] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  const [mutedSet, setMutedSet] = useState(new Set());
  const [chatMode, setChatMode] = useState('RESTRICTED');
  const [allowedList, setAllowedList] = useState([]);
  const [newAllowedText, setNewAllowedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isQrFullscreenOpen, setIsQrFullscreenOpen] = useState(false);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [isLoadingBundledDecks, setIsLoadingBundledDecks] = useState(false);
  const [bundledDecksError, setBundledDecksError] = useState('');
  const [studioDecks, setStudioDecks] = useState([]);
  const [studioDeckQuery, setStudioDeckQuery] = useState('');
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [renameDraftId, setRenameDraftId] = useState('');
  const [renameDraftTitle, setRenameDraftTitle] = useState('');
  const [manageNotice, setManageNotice] = useState('');
  const [selectedDeckKey, setSelectedDeckKey] = useState('');
  const [selectedDeckSource, setSelectedDeckSource] = useState('none');
  const [selectedDeckCount, setSelectedDeckCount] = useState(null);
  const [deckLabel, setDeckLabel] = useState('No deck selected');
  const [isDeckReady, setIsDeckReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [_pendingDroppedDeck, setPendingDroppedDeck] = useState(null);
  const [dropNotice, setDropNotice] = useState('');
  const [cloudDecks, setCloudDecks] = useState([]);
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [cloudError, setCloudError] = useState('');
  const [hasFetchedCloudCatalog, setHasFetchedCloudCatalog] = useState(false);
  const [downloadingCloudDeckId, setDownloadingCloudDeckId] = useState('');
  const [recentlyUpdatedPlayerIds, setRecentlyUpdatedPlayerIds] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const [isStartConfirmArmed, setIsStartConfirmArmed] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const startConfirmTimerRef = useRef(null);
  const profilePulseTimersRef = useRef(new Map());
  const modeOptions = ['FREE', 'RESTRICTED', 'OFF'];
  const modeLabels = { FREE: 'OPEN', RESTRICTED: 'GUIDED', OFF: 'SILENT' };

  useEffect(() => {
    if (!roomId && !roomName) return;
    persistHostState({
      roomId,
      roomName,
      players,
      phase,
      deckLabel,
      updatedAt: Date.now(),
    });
  }, [roomId, roomName, players, phase, deckLabel]);

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;
    setHostSocket(socket);
    socket.on('connect', () => {
      setConnected(true);

      const recoveredState = readHostState();
      if (resumeAttemptedRef.current || !recoveredState?.roomId) return;

      resumeAttemptedRef.current = true;
      socket.emit(
        'host:resume',
        { hostSessionId: hostSessionIdRef.current },
        (res) => {
          if (!res?.success) {
            clearHostState();
            setRoomId(null);
            setPlayers([]);
            setPhase('setup');
            setResumeNotice('');
            setError('Previous host room was not recoverable. Create a new room.');
            return;
          }

          setError('');
          setResumeNotice('');
          setRoomId(LAN_ROOM);
          setRoomName(res.roomName || recoveredState.roomName || '');
          setPlayers(Array.isArray(res.players) ? res.players : []);
          setIsDeckReady(Boolean(res.deckSelected));
          if (res.deckMeta?.name) setDeckLabel(res.deckMeta.name);
          if (typeof res.deckMeta?.count === 'number') setSelectedDeckCount(res.deckMeta.count);
          if (res.deckMeta?.source) setSelectedDeckSource(res.deckMeta.source);

          if (res.status === 'started' && res.activeQuestion) {
            const { question, index, total, durationMs, endsAt } = res.activeQuestion;
            setQuestion(question);
            setQIndex(index);
            setQTotal(total);
            setResultData(null);
            const normalizedMs = Number.isFinite(Number(durationMs)) && Number(durationMs) > 0 ? Number(durationMs) : 20000;
            const targetEndsAt = Number(endsAt) || Date.now() + normalizedMs;
            setTimeTotal(Math.ceil(normalizedMs / 1000));
            setQuestionEndsAt(targetEndsAt);
            setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
            setPhase('question');
          } else {
            setPhase('lobby');
          }
        }
      );
    });
    socket.on('disconnect', () => setConnected(false));
    // keep host view of chat mode in sync
    socket.on('chat:mode', ({ mode, allowed }) => { setChatMode(mode); if (allowed) setAllowedList(allowed); });
    
    socket.on('player_joined', ({ players }) => setPlayers(players));
    socket.on('player:profileUpdated', ({ player, players }) => {
      if (Array.isArray(players)) setPlayers(players);
      if (!player?.id) return;

      setRecentlyUpdatedPlayerIds((prev) => {
        const next = new Set(prev);
        next.add(player.id);
        return next;
      });

      const existing = profilePulseTimersRef.current.get(player.id);
      if (existing) window.clearTimeout(existing);

      const timer = window.setTimeout(() => {
        setRecentlyUpdatedPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
        profilePulseTimersRef.current.delete(player.id);
      }, 1400);

      profilePulseTimersRef.current.set(player.id, timer);
    });
    socket.on('room_closed', ({ message }) => {
      setError(message);
      setPhase('setup');
      setRoomId(null);
      setIsStartingGame(false);
      setIsStartConfirmArmed(false);
      clearHostState();
    });
    socket.on('game_started', () => {
      setIsStartingGame(false);
      setIsStartConfirmArmed(false);
      setPhase('question');
    });
    socket.on('next_question', ({ question, index, total, durationMs, endsAt }) => {
      setQuestion(question);
      setQIndex(index);
      setQTotal(total);
      setAnswerCount(0);
      setResultData(null);
      const limitMs = Number(durationMs ?? question?.time_limit_ms);
      const normalizedMs = Number.isFinite(limitMs) && limitMs > 0 ? limitMs : 20000;
      const targetEndsAt = Number(endsAt) || Date.now() + normalizedMs;
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
      setPhase('question');
    });
    socket.on('answer_count', ({ count }) => setAnswerCount(count));
    socket.on('question_result', (data) => { setResultData(data); setPhase('result'); });
    socket.on('game_over', ({ scores }) => { setFinalScores(scores); setPhase('gameover'); });
    socket.on('room:deck_updated', ({ selected, deckName, deckSource, questionCount }) => {
      if (typeof selected === 'boolean') setIsDeckReady(selected);
      if (deckName) setDeckLabel(deckName);
      if (deckSource) setSelectedDeckSource(deckSource);
      if (typeof questionCount === 'number') setSelectedDeckCount(questionCount);
    });
    socket.on('host_reconnecting', ({ message }) => {
      if (message) setError(message);
    });
    socket.on('chat:muted', () => {});
    socket.on('chat:unmuted', () => {});
    // listen for moderator updates if server emits them
    socket.on('chat:moderation', ({ action, target }) => {
      setMutedSet((s) => {
        const next = new Set(Array.from(s));
        if (action === 'mute') next.add(target);
        if (action === 'unmute') next.delete(target);
        return next;
      });
    });
    const profilePulseTimers = profilePulseTimersRef.current;

    return () => {
      if (startConfirmTimerRef.current) {
        window.clearTimeout(startConfirmTimerRef.current);
        startConfirmTimerRef.current = null;
      }
      profilePulseTimers.forEach((timer) => window.clearTimeout(timer));
      profilePulseTimers.clear();
      setHostSocket(null);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'question' || !questionEndsAt) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, questionEndsAt]);

  const loadBundledDecks = useCallback(async () => {
    setIsLoadingBundledDecks(true);
    setBundledDecksError('');
    try {
      const response = await fetch(`${getBackendUrl()}/api/decks`);
      const decks = await response.json();
      if (!Array.isArray(decks)) {
        throw new Error('Invalid deck list response.');
      }
      setAvailableDecks(decks);
    } catch (err) {
      setAvailableDecks([]);
      setBundledDecksError(err?.message || 'Could not load bundled decks.');
      console.error('Failed to fetch decks:', err);
    } finally {
      setIsLoadingBundledDecks(false);
    }
  }, []);

  // Fetch bundled server decks on mount
  useEffect(() => {
    loadBundledDecks();
  }, [loadBundledDecks]);

  // Retry deck loading when entering lobby if previous attempt failed or was empty
  useEffect(() => {
    if (phase !== 'lobby') return;
    if (availableDecks.length > 0) return;
    loadBundledDecks();
  }, [phase, availableDecks.length, loadBundledDecks]);

  // Fetch Deck Studio local drafts
  useEffect(() => {
    let active = true;
    deckStudioDB.drafts
      .orderBy('updatedAt')
      .reverse()
      .toArray()
      .then((drafts) => {
        if (!active) return;
        setStudioDecks(drafts || []);
      })
      .catch((err) => {
        console.error('Failed to load studio drafts:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredStudioDecks = useMemo(() => {
    const q = studioDeckQuery.trim().toLowerCase();
    if (!q) return studioDecks;
    return studioDecks.filter((draft) => String(draft?.title || '').toLowerCase().includes(q));
  }, [studioDecks, studioDeckQuery]);

  const handleLoadMoreCloudDecks = async () => {
    if (cloudStatus === 'loading' || !isOnline) return;

    setCloudStatus('loading');
    setCloudError('');

    try {
      const decks = await fetchCloudDecks();
      setCloudDecks((prev) => {
        const byId = new Map(prev.map((deck) => [deck.id, deck]));
        decks.forEach((deck) => {
          byId.set(deck.id, deck);
        });
        return Array.from(byId.values());
      });
      setCloudStatus('ready');
    } catch {
      setCloudStatus('error');
      setCloudError('Failed to reach cloud catalog.');
    } finally {
      setHasFetchedCloudCatalog(true);
    }
  };

  const emitSelectedDeck = (deckName, deckSource, deckQuestions) => {
    if (!socketRef.current?.connected) {
      setError('Room is not connected yet. Try again.');
      return;
    }
    socketRef.current.emit(
      'host:set_deck',
      {
        hostToken,
        deckName,
        deckSource,
        deckQuestions,
      },
      (ack) => {
        if (!ack?.ok) {
          setIsDeckReady(false);
          setError(ack?.reason || 'Failed to apply selected deck.');
          return;
        }
        setError('');
        setIsDeckReady(true);
      }
    );
  };

  const handleDeckSelection = async (event) => {
    const value = event.target.value;
    setSelectedDeckKey(value);

    if (value === 'studio:session') {
      setSelectedDeckSource('studio');
      const count = Array.isArray(studioQuestions) ? studioQuestions.length : 0;
      setSelectedDeckCount(count);
      setDeckLabel(`Studio Session (${count} questions)`);
      if (count > 0) emitSelectedDeck('Studio Session', 'studio', studioQuestions || []);
      return;
    }

    if (value.startsWith('studio:')) {
      const id = value.replace('studio:', '');
      const draft = studioDecks.find((item) => item.id === id);
      const deckQuestions = studioSlidesToQuestions(draft?.slides || []);
      setSelectedDeckSource('studio');
      setSelectedDeckCount(draft?.slides?.length || 0);
      setDeckLabel(draft?.title || 'Studio Draft');
      emitSelectedDeck(draft?.title || 'Studio Draft', 'studio', deckQuestions);
      return;
    }

    if (value.startsWith('server:')) {
      const file = value.replace('server:', '');
      const deck = availableDecks.find((item) => item.file === file);
      setSelectedDeckSource('server');
      setSelectedDeckCount(deck?.count || 0);
      setDeckLabel(deck?.name || 'Bundled Deck');
      try {
        const res = await fetch(`${getBackendUrl()}/api/decks/${encodeURIComponent(file)}`);
        const data = await res.json();
        if (!Array.isArray(data?.questions)) {
          throw new Error(data?.error || 'Invalid server deck payload.');
        }
        emitSelectedDeck(deck?.name || 'Bundled Deck', 'server', data.questions);
      } catch (err) {
        setIsDeckReady(false);
        setError(err?.message || 'Could not load selected server deck.');
      }
    }
  };

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    if (!hostToken) return setError('Host token invalid. Restart the application.');
    setError('');

    socketRef.current.emit('create_room', { roomName, hostSessionId: hostSessionIdRef.current, hostToken }, (res) => {
      if (res.success) {
        setRoomId(LAN_ROOM);
        setPhase('lobby');
        setSelectedDeckKey('');
        setSelectedDeckSource('none');
        setSelectedDeckCount(null);
        setDeckLabel('No deck selected');
        setIsDeckReady(false);
        if (chatMode) {
          const modePayload = { mode: chatMode, hostToken };
          if (chatMode === 'RESTRICTED' && allowedList.length > 0) modePayload.allowed = allowedList;
          socketRef.current.emit('chat:host_set_mode', modePayload, (ack) => {
            if (!ack?.ok) setError(ack?.reason || 'Failed to set chat mode');
          });
        }
        return;
      }
      setError(res?.error || 'Failed to create room.');
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    const lowerName = String(file.name || '').toLowerCase();
    const isCsv = lowerName.endsWith('.csv');
    const isJson = lowerName.endsWith('.json');
    const isFlux = lowerName.endsWith('.flux');

    if (!isCsv && !isJson && !isFlux) {
      setError('Unsupported file type. Drop .json, .flux, or .csv only.');
      setDropNotice('');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setError('Unable to read dropped file.');
      setDropNotice('');
      setPendingDroppedDeck(null);
    };

    reader.onload = async () => {
      try {
        const text = String(reader.result || '');
        let candidateDeck;

        if (isCsv) {
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          if (parsed.errors?.length > 0) {
            throw new Error(parsed.errors[0].message || 'CSV parse failed.');
          }
          candidateDeck = csvRowsToDeck(parsed.data, lowerName.replace('.csv', '') || 'CSV Import');
        } else {
          const parsedJson = JSON.parse(text);
          const hasSlides = Array.isArray(parsedJson?.slides);
          candidateDeck = hasSlides
            ? {
                id: String(parsedJson.id || `import_${uid()}`),
                title: String(parsedJson.title || lowerName || 'Imported Deck').trim(),
                version: String(parsedJson.version || '1.0.0').trim(),
                slides: parsedJson.slides,
                updatedAt: Date.now(),
              }
            : questionsToDeck(parsedJson, lowerName.replace(/\.(json|flux)$/i, '') || 'Imported Deck');
        }

        const checked = DeckSchema.safeParse(candidateDeck);
        if (!checked.success) {
          throw new Error(checked.error.issues[0]?.message || 'Deck validation failed.');
        }

        const validatedDeck = checked.data;
        const deckQuestions = studioSlidesToQuestions(validatedDeck.slides || []);

        await saveDraft(validatedDeck);

        setPendingDroppedDeck(validatedDeck);
        setStudioDecks((prev) => {
          const remaining = prev.filter((entry) => entry.id !== validatedDeck.id);
          return [validatedDeck, ...remaining];
        });
        setSelectedDeckKey(`studio:${validatedDeck.id}`);
        setSelectedDeckSource('studio');
        setSelectedDeckCount(validatedDeck.slides.length);
        setDeckLabel(validatedDeck.title);

        if (roomId && socketRef.current?.connected) {
          socketRef.current.emit(
            'host:set_deck',
            {
              hostToken,
              deckName: validatedDeck.title,
              deckSource: 'drop',
              deckQuestions,
            },
            (ack) => {
              if (!ack?.ok) {
                setError(ack?.reason || 'Deck saved locally but failed to sync room.');
                setDropNotice(`Saved ${validatedDeck.title}, but room sync failed.`);
                return;
              }
              setDropNotice(`Loaded ${validatedDeck.title} (${validatedDeck.slides.length} questions) and synced to room.`);
            }
          );
        } else {
          setDropNotice(`Loaded ${validatedDeck.title} (${validatedDeck.slides.length} questions) to local library.`);
        }

        setError('');
      } catch (err) {
        setPendingDroppedDeck(null);
        setDropNotice('');
        setError(err?.message || 'Failed to parse dropped file.');
      }
    };

    reader.readAsText(file);
  };

  const handleDownloadCloudDeck = async (deckMeta) => {
    if (!deckMeta?.deckUrl || downloadingCloudDeckId) return;

    setDownloadingCloudDeckId(deckMeta.id);
    setError('');

    try {
      const savedDeck = await downloadDeckToLocal(deckMeta.deckUrl);
      const deckQuestions = studioSlidesToQuestions(savedDeck.slides || []);

      setStudioDecks((prev) => {
        const remaining = prev.filter((entry) => entry.id !== savedDeck.id);
        return [savedDeck, ...remaining];
      });
      setSelectedDeckKey(`studio:${savedDeck.id}`);
      setSelectedDeckSource('studio');
      setSelectedDeckCount(savedDeck.slides.length);
      setDeckLabel(savedDeck.title);

      emitSelectedDeck(savedDeck.title, 'cloud', deckQuestions);
      setDropNotice(`Downloaded ${savedDeck.title} and set it as the active room deck.`);
    } catch (err) {
      setError(err?.message || 'Cloud deck download failed.');
    } finally {
      setDownloadingCloudDeckId('');
    }
  };

  const handleDeleteStudioDraft = async (draftId) => {
    if (!draftId) return;
    const ok = window.confirm('Delete this saved studio deck?');
    if (!ok) return;

    try {
      await deckStudioDB.drafts.delete(draftId);
      setStudioDecks((prev) => prev.filter((draft) => draft.id !== draftId));
      setManageNotice('Draft deleted.');

      if (selectedDeckKey === `studio:${draftId}`) {
        setSelectedDeckKey('');
        setSelectedDeckSource('none');
        setSelectedDeckCount(null);
        setDeckLabel('No deck selected');
        setIsDeckReady(false);
      }
    } catch (err) {
      setManageNotice(err?.message || 'Failed to delete draft.');
    }
  };

  const startRenameStudioDraft = (draft) => {
    setRenameDraftId(draft.id);
    setRenameDraftTitle(String(draft.title || 'Untitled Deck'));
    setManageNotice('');
  };

  const cancelRenameStudioDraft = () => {
    setRenameDraftId('');
    setRenameDraftTitle('');
  };

  const submitRenameStudioDraft = async () => {
    const nextTitle = renameDraftTitle.trim();
    if (!renameDraftId || !nextTitle) {
      setManageNotice('Deck title cannot be empty.');
      return;
    }

    const draft = studioDecks.find((item) => item.id === renameDraftId);
    if (!draft) {
      setManageNotice('Draft not found.');
      return;
    }

    const updated = {
      ...draft,
      title: nextTitle,
      updatedAt: Date.now(),
    };

    try {
      await saveDraft(updated);
      setStudioDecks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedDeckKey === `studio:${updated.id}`) {
        setDeckLabel(updated.title);
      }
      setManageNotice('Draft renamed.');
      cancelRenameStudioDraft();
    } catch (err) {
      setManageNotice(err?.message || 'Failed to rename draft.');
    }
  };

  const startReady = players.length > 0 && isDeckReady;
  const startStatusText =
    players.length === 0
      ? 'Need at least 1 player'
      : !isDeckReady
        ? 'Need a deck selected'
        : isStartConfirmArmed
          ? 'Press again to confirm'
          : 'Ready to launch';
  const startButtonLabel = isStartingGame ? 'LAUNCHING...' : isStartConfirmArmed ? 'CONFIRM START' : 'START GAME';

  const handleStart = () => {
    if (!startReady || isStartingGame) return;
    if (!socketRef.current?.connected) return setError('Lost connection.');
    if (!isStartConfirmArmed) {
      setError('');
      setIsStartConfirmArmed(true);
      if (startConfirmTimerRef.current) {
        window.clearTimeout(startConfirmTimerRef.current);
      }
      startConfirmTimerRef.current = window.setTimeout(() => {
        setIsStartConfirmArmed(false);
        startConfirmTimerRef.current = null;
      }, 3000);
      return;
    }

    if (startConfirmTimerRef.current) {
      window.clearTimeout(startConfirmTimerRef.current);
      startConfirmTimerRef.current = null;
    }

    setIsStartConfirmArmed(false);
    setIsStartingGame(true);
    setError('');
    socketRef.current.emit('start_game', {}, (res) => {
      if (!res?.success) {
        setIsStartingGame(false);
        setError(res?.error || 'Could not start.');
      }
    });
  };

  const handleNext = () => {
    socketRef.current.emit('next_question', {});
  };

  const handleMute = (socketId) => {
    socketRef.current.emit('chat:host_mute', { target: socketId }, (ack) => {
      if (ack?.ok) setMutedSet((s) => new Set([...s, socketId]));
    });
  };

  const handleUnmute = (socketId) => {
    socketRef.current.emit('chat:host_unmute', { target: socketId }, (ack) => {
      if (ack?.ok) setMutedSet((s) => { const n = new Set([...s]); n.delete(socketId); return n; });
    });
  };

  const handleKick = (socketId) => {
    socketRef.current.emit('host:kick_player', { target: socketId, hostToken }, (ack) => {
      if (!ack?.ok) setError('Failed to remove player.');
      setMutedSet((s) => {
        const n = new Set([...s]);
        n.delete(socketId);
        return n;
      });
    });
  };

  const syncChatMode = (mode, nextAllowed = allowedList) => {
    setChatMode(mode);
    if (!roomId || !socketRef.current?.connected) return;
    setError('');
    const payload = { mode, hostToken };
    if (mode === 'RESTRICTED' && nextAllowed.length > 0) payload.allowed = nextAllowed;
    socketRef.current.emit('chat:host_set_mode', payload, (ack) => {
      if (!ack?.ok) setError(ack?.reason || 'Failed to set chat mode');
    });
  };

  const addAllowedMessage = () => {
    const text = newAllowedText.trim();
    if (!text) return;
    const nextAllowed = [...allowedList, { id: `c_${Date.now().toString(36)}`, text }].slice(0, 12);
    setAllowedList(nextAllowed);
    setNewAllowedText('');
    if (chatMode === 'RESTRICTED') syncChatMode('RESTRICTED', nextAllowed);
  };

  const removeAllowedMessage = (id) => {
    const nextAllowed = allowedList.filter((entry) => entry.id !== id);
    setAllowedList(nextAllowed);
    if (chatMode === 'RESTRICTED' && nextAllowed.length > 0) syncChatMode('RESTRICTED', nextAllowed);
  };

  const timerTone =
    timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.25)
      ? 'text-red-400'
      : timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.5)
        ? 'text-amber-300'
        : 'text-emerald-300';

  const handleBack = () => {
    const hasActiveRoom = Boolean(roomId) || phase !== 'setup';
    if (hasActiveRoom) {
      const confirmed = window.confirm('Leave host view? This can disrupt players in the room.');
      if (!confirmed) return;

      if (socketRef.current?.connected && hostToken) {
        socketRef.current.emit('host:close_room', { hostToken }, () => {});
      }
    }
    clearHostState();
    onBack?.();
  };

  const handleHostNewRoom = () => {
    clearHostState();
    setFinalScores([]);
    setQuestion(null);
    setResultData(null);
    setQIndex(0);
    setQTotal(0);
    setAnswerCount(0);
    setPlayers([]);
    setRoomId(null);
    setIsDeckReady(false);
    setDeckLabel('No deck selected');
    setSelectedDeckKey('');
    setSelectedDeckSource('none');
    setSelectedDeckCount(null);
    setError('');
    setPhase('setup');
  };

  const handleHostPlayAgainSameDeck = () => {
    if (!selectedDeckKey) {
      setError('No previous deck found. Choose a deck and start a new room.');
      return;
    }
    if (!socketRef.current?.connected) {
      setError('Not connected.');
      return;
    }
    if (!hostToken) {
      setError('Host token invalid. Restart the application.');
      return;
    }

    const preservedDeckKey = selectedDeckKey;
    const nextRoomName = roomName.trim() || 'LocalFlux Game';
    setError('');

    socketRef.current.emit('create_room', { roomName: nextRoomName, hostSessionId: hostSessionIdRef.current, hostToken }, async (res) => {
      if (!res?.success) {
        setError(res?.error || 'Failed to create room.');
        return;
      }

      setRoomName(nextRoomName);
      setRoomId(LAN_ROOM);
      setPhase('lobby');
      setFinalScores([]);
      setQuestion(null);
      setResultData(null);
      setQIndex(0);
      setQTotal(0);
      setAnswerCount(0);
      setIsDeckReady(false);
      setError('');

      if (chatMode) {
        const modePayload = { mode: chatMode, hostToken };
        if (chatMode === 'RESTRICTED' && allowedList.length > 0) modePayload.allowed = allowedList;
        socketRef.current.emit('chat:host_set_mode', modePayload, (ack) => {
          if (!ack?.ok) setError(ack?.reason || 'Failed to set chat mode');
        });
      }

      try {
        await handleDeckSelection({ target: { value: preservedDeckKey } });
      } catch {
        setError('Room created, but failed to re-apply the previous deck.');
      }
    });
  };

  const handleExportFinalScores = () => {
    const rankedFinalScores = [...finalScores].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
    if (rankedFinalScores.length === 0) {
      setError('No scores available to export.');
      return;
    }

    const csvRows = [
      ['rank', 'name', 'score'],
      ...rankedFinalScores.map((p, index) => [index + 1, String(p?.name || 'Player'), Number(p?.score || 0)]),
    ];

    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `localflux-final-scores-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const renderLobbyAvatar = (player) => {
    const avatarObject = normalizeAvatarObject(player?.avatarObject);
    return (
      <div className="relative mx-auto mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-gradient-to-br from-slate-900 to-slate-700 p-1">
        <img
          src={presetPath(avatarObject.value)}
          alt={`${player?.name || 'Player'} avatar`}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling;
            if (fallback) fallback.style.opacity = '1';
          }}
          className="h-full w-full rounded-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-emerald-200 opacity-0 transition-opacity duration-200">
          {player?.name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
    );
  };

  if (phase === 'gameover') {
    const rankedFinalScores = [...finalScores].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 pt-10 animate-phase-in">
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-slate-500">Final Scores</p>
        <h2 className="text-4xl font-black tracking-tight mb-8">Results</h2>
        <div className="flex flex-col gap-3 flex-1">
          {rankedFinalScores.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-8 text-center">
              <p className="text-sm text-slate-400">No scores were captured for this round.</p>
              <p className="mt-2 text-xs text-slate-500">Start a new room to run another game.</p>
            </div>
          )}

          {rankedFinalScores.map((p, i) => {
            const isTopOne = i === 0;
            const isTopTwo = i === 1;
            const isTopThree = i === 2;
            const placementClass =
              isTopOne
                ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
                : isTopTwo
                  ? 'border-slate-300/40 bg-slate-200/10 text-slate-100'
                  : isTopThree
                    ? 'border-orange-300/40 bg-orange-300/10 text-orange-100'
                    : 'border-slate-800 bg-slate-900/80 text-white';
            const medal = isTopOne ? '🥇' : isTopTwo ? '🥈' : isTopThree ? '🥉' : '';

            return (
              <div key={p.id || `${p.name}_${i}`} className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${placementClass}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
                  {medal && <span className="text-base leading-none">{medal}</span>}
                </div>
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className="font-black text-amber-300 tabular-nums">{p.score}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={handleHostPlayAgainSameDeck}
            className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-lg font-black text-emerald-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-500/20 active:translate-y-0 active:scale-95"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={handleHostNewRoom}
            className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
          >
            NEW ROOM
          </button>
          <button
            onClick={handleExportFinalScores}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
          >
            EXPORT CSV
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={handleBack}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
          >
            EXIT HOST
          </button>
        </div>

        {showDraftManager && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/60">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black tracking-wide text-emerald-200">Manage Studio Drafts</p>
                <button
                  onClick={() => {
                    setShowDraftManager(false);
                    cancelRenameStudioDraft();
                    setManageNotice('');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              {manageNotice && (
                <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{manageNotice}</p>
              )}

              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {studioDecks.length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-4 text-center text-xs text-slate-500">
                    No studio drafts saved yet.
                  </div>
                )}

                {studioDecks.map((draft) => {
                  const isEditing = renameDraftId === draft.id;
                  const questionCount = Array.isArray(draft.slides) ? draft.slides.length : 0;
                  return (
                    <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              value={renameDraftTitle}
                              onChange={(e) => setRenameDraftTitle(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                            />
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-100">{draft.title || 'Untitled Deck'}</p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-500">{questionCount} questions</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={submitRenameStudioDraft}
                                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelRenameStudioDraft}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startRenameStudioDraft(draft)}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                            >
                              Rename
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteStudioDraft(draft.id)}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/25"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 pt-8 animate-phase-in">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question {qIndex + 1} / {qTotal}</p>
          <span className={`text-xs font-mono ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>{connected ? 'live' : 'offline'}</span>
        </div>

        <div className="mb-7 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70 mb-1">Correct Answer</p>
          <p className="text-3xl font-black text-emerald-200">{resultData.correct_answer}</p>
        </div>

        <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">Leaderboard</p>
        <div className="flex flex-col gap-2 flex-1">
          {[...resultData.scores].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.name} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${i === 0 ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-slate-800 bg-slate-900/80 text-white'}`}>
              <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black text-amber-300 tabular-nums">{p.score}</span>
            </div>
          ))}
        </div>

        <button onClick={handleNext} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 text-xl font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95">
          {qIndex + 1 >= qTotal ? 'FINISH' : 'NEXT QUESTION'}
        </button>
      </div>
    );
  }

  if (phase === 'question' && question) {
    const progress = players.length > 0 ? Math.round((answerCount / players.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 animate-phase-in">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <main className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question {qIndex + 1} / {qTotal}</p>
                <p className="mt-2 text-sm text-slate-400">{answerCount} of {players.length} players answered</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
                <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timerTone}`}>{timeLeft}s</p>
              </div>
            </div>

            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-6">
              <p className="text-2xl md:text-3xl font-black leading-tight text-white">{question.prompt}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.options.map((opt) => (
                <div key={opt} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200">
                  {opt}
                </div>
              ))}
            </div>

            <button onClick={handleNext} className="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95">
              REVEAL ANSWER
            </button>
          </main>

          <aside className="flex flex-col gap-4">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Chat Mode</p>
                  <p className="text-xs text-slate-400 mt-1">Control room communication in real time.</p>
                </div>
                <span className="text-[11px] font-semibold tracking-[0.2em] text-emerald-300">LIVE</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => syncChatMode(mode)}
                    className={`rounded-xl px-3 py-2 text-[11px] font-black tracking-[0.2em] transition-all duration-150 ${
                      chatMode === mode
                        ? 'bg-emerald-400 text-black'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {modeLabels[mode]}
                  </button>
                ))}
              </div>

              {chatMode === 'RESTRICTED' && (
                <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3" open>
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">More Options</summary>
                  <div className="mt-3">
                  <p className="mb-2 text-xs text-slate-500">Restricted presets</p>
                  <div className="mb-2 flex gap-2">
                    <input
                      value={newAllowedText}
                      onChange={(e) => setNewAllowedText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAllowedMessage()}
                      placeholder="Add preset"
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button onClick={addAllowedMessage} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-black transition hover:bg-emerald-300">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allowedList.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                        <span>{entry.text}</span>
                        <button onClick={() => removeAllowedMessage(entry.id)} className="text-slate-500 transition hover:text-red-400">Remove</button>
                      </div>
                    ))}
                  </div>
                  </div>
                </details>
              )}
            </section>

            <section className="min-h-72 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <Chat
                socket={socketRef.current}
                roomPin={LAN_ROOM}
                readOnly
                title="Chat Monitor"
                allowHostActions
                onHostMute={handleMute}
                mutedSet={mutedSet}
              />
            </section>
          </aside>
        </div>
      </div>
    );
  }

  if (phase === 'lobby') {
    const joinUrl = `${window.location.origin}/play`;
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e) {
        console.error('copy failed', e);
      }
    };

    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white p-4 md:p-6 animate-phase-in">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.15),rgba(2,6,23,0)_70%)]" />
        <div className="relative z-10 -mx-4 mb-4 border-y border-slate-800 bg-slate-900/70 px-4 py-4 md:-mx-6 md:px-6">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">Back</button>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-emerald-500" />
                <div className="text-xl font-black tracking-tight text-emerald-400">LocalFlux</div>
              </div>
              <div className="ml-4 text-xs uppercase tracking-[0.2em] text-slate-500">Host Dashboard</div>
            </div>
            <div className="flex items-center gap-2">
              <PingIndicator socket={hostSocket} />
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">Session Active</span>
              </div>
            </div>
          </header>
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-4">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Join Link</div>
                <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
                  <p className="mb-3 text-xs text-slate-500">Scan to Join</p>
                  <div className="mx-auto flex w-full max-w-xs items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
                    <QRCodeSVG value={joinUrl} size={256} level="H" includeMargin className="h-56 w-56 md:h-64 md:w-64" />
                  </div>
                </div>

                <p className="mb-5 text-center text-xs uppercase tracking-[0.22em] text-slate-500">
                  Players join directly from the link or QR
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button onClick={copyLink} className="w-full rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95">
                    {copied ? 'Copied!' : 'Copy Join Link'}
                  </button>
                  <button
                    onClick={() => setIsQrFullscreenOpen(true)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-black text-slate-100 transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
                  >
                    Fullscreen QR
                  </button>
                </div>
              </div>

              <div
                className={`relative rounded-3xl border bg-slate-900/70 p-5 transition-all ${
                  isDragging
                    ? 'border-emerald-400/70 ring-4 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                    : 'border-slate-800'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
              >
                {isDragging && (
                  <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/90 bg-emerald-500/10 px-4 text-center">
                    <p className="text-sm font-black tracking-wide text-emerald-200">Drop .json, .flux, or .csv to load instantly</p>
                  </div>
                )}
                <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Choose Deck</div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="text-sm font-semibold text-emerald-300">{deckLabel}</div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={studioDeckQuery}
                        onChange={(e) => setStudioDeckQuery(e.target.value)}
                        placeholder="Search studio drafts"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setShowDraftManager(true);
                          setManageNotice('');
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                      >
                        Manage
                      </button>
                    </div>
                    <label className="mb-2 block text-xs text-slate-500">Select Deck</label>
                    <select
                      value={selectedDeckKey}
                      onChange={handleDeckSelection}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-emerald-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Choose a deck...</option>
                      <optgroup label={`Bundled Decks (${availableDecks.length})`}>
                        {availableDecks.length === 0 && (
                          <option value="" disabled>
                            {isLoadingBundledDecks ? 'Loading bundled decks...' : 'No bundled decks found'}
                          </option>
                        )}
                        {availableDecks.map((deck) => (
                          <option key={deck.file} value={`server:${deck.file}`}>
                            {deck.name} ({deck.count} questions)
                          </option>
                        ))}
                      </optgroup>
                      {Array.isArray(studioQuestions) && studioQuestions.length > 0 && (
                        <optgroup label="Current Studio Launch">
                          <option value="studio:session">Studio Session ({studioQuestions.length} questions)</option>
                        </optgroup>
                      )}
                      <optgroup label={`Studio Drafts (${filteredStudioDecks.length})`}>
                        {studioDecks.length === 0 && <option value="studio:none" disabled>No local studio drafts found</option>}
                        {studioDecks.length > 0 && filteredStudioDecks.length === 0 && <option value="studio:none_query" disabled>No drafts match search</option>}
                        {filteredStudioDecks.map((draft) => (
                          <option key={draft.id} value={`studio:${draft.id}`}>
                            {(draft.title || 'Untitled')} ({Array.isArray(draft.slides) ? draft.slides.length : 0} questions)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p>Active source: <span className="text-slate-300">{selectedDeckSource}</span></p>
                      <p>Question count: <span className="text-slate-300">{selectedDeckCount ?? '--'}</span></p>
                      {bundledDecksError && <p className="text-amber-300">Bundled deck load failed: {bundledDecksError}</p>}
                      {dropNotice && <p className="text-emerald-300">{dropNotice}</p>}
                      <button
                        onClick={loadBundledDecks}
                        disabled={isLoadingBundledDecks}
                        className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLoadingBundledDecks ? 'Refreshing decks...' : 'Refresh Bundled Decks'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Explore Cloud Decks</p>
                    {!hasFetchedCloudCatalog && isOnline && (
                      <button
                        onClick={handleLoadMoreCloudDecks}
                        disabled={cloudStatus === 'loading'}
                        className="mt-2 w-full rounded-lg border border-sky-400/40 bg-sky-400/10 px-2 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-2">
                          {cloudStatus === 'loading' && <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-200/40 border-t-sky-100" />}
                          {cloudStatus === 'loading' ? 'Loading Cloud Decks...' : '☁️ Load More from Cloud'}
                        </span>
                      </button>
                    )}
                    {!isOnline && (
                      <button
                        disabled
                        className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs font-semibold text-slate-400"
                      >
                        ☁️ Cloud Decks (No Internet Connection)
                      </button>
                    )}
                    {cloudStatus === 'loading' && <p className="mt-2 text-xs text-slate-500">Loading cloud catalog...</p>}
                    {cloudStatus === 'offline' && <p className="mt-2 text-xs text-amber-300">Offline mode: cloud decks unavailable.</p>}
                    {cloudStatus === 'error' && <p className="mt-2 text-xs text-rose-300">{cloudError}</p>}
                    {cloudStatus === 'ready' && cloudDecks.length === 0 && <p className="mt-2 text-xs text-slate-500">No cloud decks available.</p>}

                    {cloudStatus === 'ready' && cloudDecks.length > 0 && (
                      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                        {cloudDecks.map((deck) => (
                          <div key={deck.id} className="rounded-xl border border-slate-700 bg-slate-950 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-semibold text-slate-200">{deck.title}</p>
                              {typeof deck.questionCount === 'number' && (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  {deck.questionCount}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{deck.description || 'Official cloud deck'}</p>
                            <button
                              onClick={() => handleDownloadCloudDeck(deck)}
                              disabled={downloadingCloudDeckId === deck.id}
                              className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {downloadingCloudDeckId === deck.id ? 'Downloading...' : 'Download'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => { window.location.href = hostToken ? `/studio?token=${encodeURIComponent(hostToken)}` : '/studio'; }}
                      className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                    >
                      Open Studio (Build + Cloud)
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Players</span>
                <div className="rounded-full bg-emerald-400 px-2 py-1 text-xs font-black text-black tabular-nums">{players.length}</div>
              </div>

              {players.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-10 text-center">
                  <p className="text-sm text-slate-400">No players yet</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="status-dot" />
                    <span className="status-dot" />
                    <span className="status-dot" />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Waiting for joins...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {players.map((p, i) => (
                    <div key={p.id} className="group relative animate-slide-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className={`rounded-2xl border bg-slate-950/80 p-3 text-center transition-all duration-500 ease-out hover:-translate-y-0.5 ${
                        recentlyUpdatedPlayerIds.has(p.id)
                          ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_28px_rgba(16,185,129,0.25)] animate-pulse'
                          : 'border-slate-700 hover:border-emerald-500/50'
                      }`}>
                        {renderLobbyAvatar(p)}
                        <p className={`truncate text-sm font-semibold ${recentlyUpdatedPlayerIds.has(p.id) ? 'text-emerald-200' : 'text-slate-200'}`}>{p.name}</p>
                        <p className="mt-1 text-xs text-slate-500">#{i + 1}</p>
                        <div className="mt-3 flex items-center justify-center gap-2">
                          {mutedSet.has(p.id) ? (
                            <button onClick={() => handleUnmute(p.id)} className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/30">
                              Unmute
                            </button>
                          ) : (
                            <button onClick={() => handleMute(p.id)} className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/25">
                              Mute
                            </button>
                          )}
                          <button onClick={() => handleKick(p.id)} className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/25">
                            Kick
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <footer className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <button
                    onClick={handleStart}
                    disabled={!startReady || isStartingGame}
                    className={`rounded-2xl px-8 py-4 text-lg font-black transition-all duration-150 ${
                      !startReady
                        ? 'cursor-not-allowed bg-slate-700 text-slate-500'
                        : isStartConfirmArmed
                          ? 'bg-amber-300 text-black shadow-[0_0_22px_rgba(252,211,77,0.35)] hover:-translate-y-0.5 hover:bg-amber-200 active:translate-y-0 active:scale-95'
                          : 'bg-emerald-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.28)] hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isStartingGame && <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/40 border-t-black" />}
                      {startButtonLabel}
                    </span>
                  </button>
                  <p className={`mt-2 text-xs ${startReady ? 'text-emerald-300' : 'text-amber-300'}`}>{startStatusText}</p>
                </div>
                <p className="text-sm text-slate-400">Room ready. Once started, players enter timed questions instantly.</p>
              </div>
            </footer>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Chat Control</p>
                  <p className="mt-1 text-xs text-slate-400">Switch player chat instantly.</p>
                </div>
                <span className="text-[11px] font-semibold tracking-[0.2em] text-emerald-300">LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => syncChatMode(mode)}
                    className={`rounded-xl px-3 py-2 text-[11px] font-black tracking-[0.2em] transition-all duration-150 ${
                      chatMode === mode
                        ? 'bg-emerald-400 text-black'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {modeLabels[mode]}
                  </button>
                ))}
              </div>
              {chatMode === 'RESTRICTED' && (
                <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3" open>
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">More Options</summary>
                  <div className="mt-3">
                  <p className="mb-2 text-xs text-slate-500">Restricted presets</p>
                  <div className="mb-2 flex gap-2">
                    <input
                      value={newAllowedText}
                      onChange={(e) => setNewAllowedText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAllowedMessage()}
                      placeholder="Add preset"
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button onClick={addAllowedMessage} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-black transition hover:bg-emerald-300">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allowedList.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                        <span>{entry.text}</span>
                        <button onClick={() => removeAllowedMessage(entry.id)} className="text-slate-500 transition hover:text-red-400">Remove</button>
                      </div>
                    ))}
                  </div>
                  </div>
                </details>
              )}
            </section>

            <section className="min-h-72 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <Chat
                socket={socketRef.current}
                roomPin={LAN_ROOM}
                readOnly
                title="Chat Monitor"
                allowHostActions
                onHostMute={handleMute}
                mutedSet={mutedSet}
              />
            </section>
          </aside>
        </div>

        {isQrFullscreenOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <button
              aria-label="Close fullscreen QR"
              onClick={() => setIsQrFullscreenOpen(false)}
              className="absolute inset-0"
            />
            <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl shadow-black/70">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Join QR Fullscreen</p>
                <button
                  onClick={() => setIsQrFullscreenOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="mx-auto flex w-full max-w-xl items-center justify-center rounded-2xl bg-white p-4">
                <QRCodeSVG value={joinUrl} size={440} level="H" includeMargin className="h-auto w-full max-w-[440px]" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.20),rgba(2,6,23,0)_70%)]" />
      <button onClick={handleBack} className="absolute top-5 left-5 text-slate-500 hover:text-white text-sm transition-colors">back</button>
      <div className="z-10 w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/30 animate-phase-in">
        <h1 className="mb-8 text-5xl font-black tracking-tight">New Room</h1>
        <div className="w-full">
        <input
          type="text"
          placeholder="Room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="mb-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold text-white placeholder-slate-500 transition-colors focus:border-emerald-400 focus:outline-none"
        />
        {error && <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300">{error}</p>}
        <button onClick={handleCreate} disabled={!connected} className="w-full rounded-2xl bg-emerald-400 py-5 text-xl font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
          CREATE
        </button>
        <div className={`mt-3 flex items-center justify-center gap-2 text-xs font-mono ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
          {connected ? (
            <span>connected</span>
          ) : (
            <>
              <span>connecting</span>
              <span className="status-dot" />
              <span className="status-dot" />
              <span className="status-dot" />
            </>
          )}
        </div>
        {resumeNotice && <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{resumeNotice}</p>}
        </div>
      </div>
    </div>
  );
}