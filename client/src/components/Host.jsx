import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { createGameSocket, getBackendUrl } from '../backendUrl';
import { useHostToken } from '../context/HostTokenProvider';
import { deckStudioDB } from '../deckStudio/db';
import { saveDraft } from '../deckStudio/db';
import { fetchCloudDecks, downloadDeckToLocal } from '../deckStudio/cloudCatalog';
import { DeckSchema } from '../deckStudio/schemas';
import HostResultView from './host/HostResultView';
import HostQuestionView from './host/HostQuestionView';
import HostGameOverView from './host/HostGameOverView';
import HostLobbyView from './host/HostLobbyView';

const HOST_SESSION_KEY = 'lf_host_session_id';
const HOST_STATE_KEY = 'lf_host_state';
const LAN_ROOM = 'local_flux_main';

function isLoopbackHost(hostname) {
  const value = String(hostname || '').trim().toLowerCase();
  return value === 'localhost' || value === '127.0.0.1' || value === '::1' || value === '[::1]';
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
  // Canonical schema pass-through. Kept for call-site compatibility.
  return Array.isArray(slides) ? slides.map((slide) => ({ ...slide })) : [];
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function questionsToDeck(raw, fallbackTitle = 'Imported Deck') {
  const meta = raw?.deck_meta || {};
  const slides = Array.isArray(raw?.slides)
    ? raw.slides
    : Array.isArray(raw?.questions)
      ? raw.questions.map((q, idx) => {
        const options = Array.isArray(q?.options) ? q.options.map((opt) => String(opt || '').trim()) : [];
        const normalized = options.slice(0, 4);
        while (normalized.length < 4) normalized.push('');

        const correctAnswer = String(q?.correct_answer || '').trim();
        let correctIndex = normalized.findIndex((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
        if (correctIndex < 0) correctIndex = 0;

        return {
          id: String(q?.id || q?.q_id || `slide_${idx + 1}_${uid()}`),
          type: q?.type === 'typing' ? 'typing' : 'mcq',
          prompt: String(q?.prompt || '').trim(),
          image: String(q?.image || q?.asset_ref || '').trim() || null,
          options: normalized,
          correctIndex,
          acceptedAnswers: Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [],
          suggestionBank: Array.isArray(q?.suggestionBank) ? q.suggestionBank : [],
          timeLimit: Number.isFinite(Number(q?.timeLimit)) ? Number(q.timeLimit) : 20000,
        };
      })
      : [];

  return {
    id: String(raw?.id || meta.id || `import_${uid()}`),
    title: String(raw?.title || meta.title || fallbackTitle).trim(),
    version: String(raw?.version || meta.version || '1.0.0').trim(),
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
        type: 'mcq',
        prompt: String(row.prompt || row.question || '').trim(),
        image: String(row.image || row.imageUrl || '').trim() || null,
        options,
        correctIndex,
        acceptedAnswers: [],
        suggestionBank: [],
        timeLimit: 20000,
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
  const [hostRejectedMessage, setHostRejectedMessage] = useState('');
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
  const [answerMode, setAnswerMode] = useState('multiple_choice');
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
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [cloudDecks, setCloudDecks] = useState([]);
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [cloudError, setCloudError] = useState('');
  const [hasFetchedCloudCatalog, setHasFetchedCloudCatalog] = useState(false);
  const [downloadingCloudDeckId, setDownloadingCloudDeckId] = useState('');
  const [shareHost, setShareHost] = useState(() => {
    if (typeof window === 'undefined') return '';
    const initialHost = String(window.location.hostname || '').trim();
    return isLoopbackHost(initialHost) ? '' : initialHost;
  });
  const [recentlyUpdatedPlayerIds, setRecentlyUpdatedPlayerIds] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const [autoAdvanceIn, setAutoAdvanceIn] = useState(0);
  const [isStartConfirmArmed, setIsStartConfirmArmed] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const startConfirmTimerRef = useRef(null);
  const profilePulseTimersRef = useRef(new Map());
  const modeOptions = ['FREE', 'RESTRICTED', 'OFF'];
  const modeLabels = { FREE: 'OPEN', RESTRICTED: 'GUIDED', OFF: 'SILENT' };
  const answerModeOptions = ['auto', 'multiple_choice', 'type_guess'];
  const answerModeLabels = {
    auto: 'AUTO (DECK-DRIVEN)',
    multiple_choice: '4 OPTIONS',
    type_guess: 'TYPE GUESS',
  };

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
          setAnswerMode(String(res.answerMode || 'multiple_choice'));
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
    socket.on('host:rejected', ({ message }) => {
      const text = message || 'A game is already being hosted on this network.';
      setHostRejectedMessage(text);
      setError(text);
      setRoomId(null);
      setPhase('setup');
      setResumeNotice('');
      clearHostState();
    });
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
      setAutoAdvanceIn(0);
      const limitMs = Number(durationMs ?? question?.timeLimit);
      const normalizedMs = Number.isFinite(limitMs) && limitMs > 0 ? limitMs : 20000;
      const targetEndsAt = Number(endsAt) || Date.now() + normalizedMs;
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
      setPhase('question');
    });
    socket.on('answer_count', ({ count }) => setAnswerCount(count));
    socket.on('question_result', (data) => {
      setResultData(data);
      setPhase('result');
    });
    socket.on('round:transition', ({ nextInMs }) => {
      const seconds = Math.max(0, Math.ceil(Number(nextInMs || 0) / 1000));
      setAutoAdvanceIn(seconds);
    });
    socket.on('game_over', ({ scores }) => {
      setAutoAdvanceIn(0);
      setFinalScores(scores);
      setPhase('gameover');
    });
    socket.on('room:deck_updated', ({ selected, deckName, deckSource, questionCount }) => {
      if (typeof selected === 'boolean') setIsDeckReady(selected);
      if (deckName) setDeckLabel(deckName);
      if (deckSource) setSelectedDeckSource(deckSource);
      if (typeof questionCount === 'number') setSelectedDeckCount(questionCount);
    });
    socket.on('room:answer_mode', ({ mode }) => {
      if (!mode) return;
      setAnswerMode(String(mode));
    });
    socket.on('host_reconnecting', ({ message }) => {
      if (message) setError(message);
    });
    socket.on('chat:muted', () => { });
    socket.on('chat:unmuted', () => { });
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

  useEffect(() => {
    if (phase !== 'result' || autoAdvanceIn <= 0) return undefined;
    const timer = window.setInterval(() => {
      setAutoAdvanceIn((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, autoAdvanceIn]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentHost = String(window.location.hostname || '').trim();
    if (!isLoopbackHost(currentHost)) {
      setShareHost(currentHost);
      return;
    }

    let active = true;
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/network-info`);
        if (!response.ok) return;
        const data = await response.json();
        const localIp = String(data?.localIp || '').trim();
        if (active && localIp) {
          setShareHost(localIp);
        }
      } catch {
        // Keep localhost fallback when LAN info is unavailable.
      }
    };

    fetchNetworkInfo();

    return () => {
      active = false;
    };
  }, []);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/play';
    const protocol = window.location.protocol;
    const host = shareHost || window.location.hostname || 'localhost';
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${host}${port}/play`;
  }, [shareHost]);

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

  const emitSelectedDeck = (deckName, deckSource, deckSlides, deckFile = null) => {
    if (!socketRef.current?.connected) {
      setError('Room is not connected yet. Try again.');
      return;
    }
    socketRef.current.emit(
      'host:set_deck',
      {
        hostToken,
        hostSessionId: hostSessionIdRef.current,
        deckName,
        deckSource,
        deckSlides,
        deckFile,
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
      const deckSlides = studioSlidesToQuestions(draft?.slides || []);
      setSelectedDeckSource('studio');
      setSelectedDeckCount(draft?.slides?.length || 0);
      setDeckLabel(draft?.title || 'Studio Draft');
      emitSelectedDeck(draft?.title || 'Studio Draft', 'studio', deckSlides);
      return;
    }

    if (value.startsWith('server:')) {
      const file = value.replace('server:', '');
      const deck = availableDecks.find((item) => item.file === file);
      setSelectedDeckSource('server');
      setSelectedDeckCount(deck?.count || 0);
      setDeckLabel(deck?.name || 'Bundled Deck');
      emitSelectedDeck(deck?.name || 'Bundled Deck', 'server', null, file);
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
        setAnswerMode(String(res.answerMode || 'multiple_choice'));
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
        const deckSlides = studioSlidesToQuestions(validatedDeck.slides || []);

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
              hostSessionId: hostSessionIdRef.current,
              deckName: validatedDeck.title,
              deckSource: 'drop',
              deckSlides,
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
      const deckSlides = studioSlidesToQuestions(savedDeck.slides || []);

      setStudioDecks((prev) => {
        const remaining = prev.filter((entry) => entry.id !== savedDeck.id);
        return [savedDeck, ...remaining];
      });
      setSelectedDeckKey(`studio:${savedDeck.id}`);
      setSelectedDeckSource('studio');
      setSelectedDeckCount(savedDeck.slides.length);
      setDeckLabel(savedDeck.title);

      emitSelectedDeck(savedDeck.title, 'cloud', deckSlides);
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
    socketRef.current.emit('start_game', { hostSessionId: hostSessionIdRef.current }, (res) => {
      if (!res?.success) {
        setIsStartingGame(false);
        setError(res?.error || 'Could not start.');
      }
    });
  };

  const handleMute = (socketId) => {
    socketRef.current.emit('chat:host_mute', { target: socketId, hostSessionId: hostSessionIdRef.current }, (ack) => {
      if (ack?.ok) setMutedSet((s) => new Set([...s, socketId]));
    });
  };

  const handleUnmute = (socketId) => {
    socketRef.current.emit('chat:host_unmute', { target: socketId, hostSessionId: hostSessionIdRef.current }, (ack) => {
      if (ack?.ok) setMutedSet((s) => { const n = new Set([...s]); n.delete(socketId); return n; });
    });
  };

  const handleKick = (socketId) => {
    socketRef.current.emit('host:kick_player', { target: socketId, hostToken, hostSessionId: hostSessionIdRef.current }, (ack) => {
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
    const payload = { mode, hostToken, hostSessionId: hostSessionIdRef.current };
    if (mode === 'RESTRICTED' && nextAllowed.length > 0) payload.allowed = nextAllowed;
    socketRef.current.emit('chat:host_set_mode', payload, (ack) => {
      if (!ack?.ok) setError(ack?.reason || 'Failed to set chat mode');
    });
  };

  const syncAnswerMode = (mode, options = {}) => {
    const { requireLobby = true } = options;
    const normalizedMode = String(mode || '').trim();
    if (!['multiple_choice', 'type_guess'].includes(normalizedMode)) return;
    if (requireLobby && phase !== 'lobby') {
      setError('Answer mode can only be changed in lobby.');
      return;
    }

    setAnswerMode(normalizedMode);
    if (!roomId || !socketRef.current?.connected) return;

    socketRef.current.emit(
      'host:set_answer_mode',
      { mode: normalizedMode, hostToken, hostSessionId: hostSessionIdRef.current },
      (ack) => {
        if (!ack?.ok) {
          setError(ack?.reason || 'Failed to set answer mode.');
          return;
        }
        if (ack.mode) setAnswerMode(ack.mode);
      }
    );
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
        socketRef.current.emit('host:close_room', { hostToken, hostSessionId: hostSessionIdRef.current }, () => { });
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
    setAnswerMode('multiple_choice');
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

      syncAnswerMode(answerMode, { requireLobby: false });

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

  if (phase === 'gameover') {
    return (
      <HostGameOverView
        finalScores={finalScores}
        handleHostPlayAgainSameDeck={handleHostPlayAgainSameDeck}
        handleHostNewRoom={handleHostNewRoom}
        handleExportFinalScores={handleExportFinalScores}
        handleBack={handleBack}
        showDraftManager={showDraftManager}
        setShowDraftManager={setShowDraftManager}
        cancelRenameStudioDraft={cancelRenameStudioDraft}
        setManageNotice={setManageNotice}
        manageNotice={manageNotice}
        studioDecks={studioDecks}
        renameDraftId={renameDraftId}
        renameDraftTitle={renameDraftTitle}
        setRenameDraftTitle={setRenameDraftTitle}
        submitRenameStudioDraft={submitRenameStudioDraft}
        startRenameStudioDraft={startRenameStudioDraft}
        handleDeleteStudioDraft={handleDeleteStudioDraft}
      />
    );
  }

  if (hostRejectedMessage) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(244,63,94,0.18),rgba(2,6,23,0)_70%)]" />
        <div className="z-10 w-full max-w-xl rounded-3xl border border-rose-500/40 bg-slate-900/85 p-8 shadow-2xl shadow-black/40 animate-phase-in">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-300">Access Denied</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Host Session In Use</h1>
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {hostRejectedMessage}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Another host session already controls the active room. Use the original host device/session to manage this game.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-rose-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    return <HostResultView resultData={resultData} qIndex={qIndex} qTotal={qTotal} connected={connected} autoAdvanceIn={autoAdvanceIn} />;
  }

  if (phase === 'question' && question) {
    return (
      <HostQuestionView
        question={question}
        qIndex={qIndex}
        qTotal={qTotal}
        answerCount={answerCount}
        players={players}
        timeLeft={timeLeft}
        timerTone={timerTone}
        modeOptions={modeOptions}
        chatMode={chatMode}
        modeLabels={modeLabels}
        syncChatMode={syncChatMode}
        newAllowedText={newAllowedText}
        setNewAllowedText={setNewAllowedText}
        addAllowedMessage={addAllowedMessage}
        allowedList={allowedList}
        removeAllowedMessage={removeAllowedMessage}
        socket={socketRef.current}
        roomId={LAN_ROOM}
        handleMute={handleMute}
        mutedSet={mutedSet}
        answerMode={answerMode}
        answerModeLabels={answerModeLabels}
      />
    );
  }

  if (phase === 'lobby') {
    return (
      <HostLobbyView
        handleBack={handleBack}
        hostSocket={hostSocket}
        joinUrl={joinUrl}
        copied={copied}
        setCopied={setCopied}
        isQrFullscreenOpen={isQrFullscreenOpen}
        setIsQrFullscreenOpen={setIsQrFullscreenOpen}
        isDragging={isDragging}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleFileDrop={handleFileDrop}
        deckLabel={deckLabel}
        studioDeckQuery={studioDeckQuery}
        setStudioDeckQuery={setStudioDeckQuery}
        setShowDraftManager={setShowDraftManager}
        setManageNotice={setManageNotice}
        selectedDeckKey={selectedDeckKey}
        handleDeckSelection={handleDeckSelection}
        availableDecks={availableDecks}
        isLoadingBundledDecks={isLoadingBundledDecks}
        studioQuestions={studioQuestions}
        filteredStudioDecks={filteredStudioDecks}
        studioDecks={studioDecks}
        selectedDeckSource={selectedDeckSource}
        selectedDeckCount={selectedDeckCount}
        bundledDecksError={bundledDecksError}
        dropNotice={dropNotice}
        loadBundledDecks={loadBundledDecks}
        hasFetchedCloudCatalog={hasFetchedCloudCatalog}
        isOnline={isOnline}
        handleLoadMoreCloudDecks={handleLoadMoreCloudDecks}
        cloudStatus={cloudStatus}
        cloudError={cloudError}
        cloudDecks={cloudDecks}
        handleDownloadCloudDeck={handleDownloadCloudDeck}
        downloadingCloudDeckId={downloadingCloudDeckId}
        hostToken={hostToken}
        players={players}
        recentlyUpdatedPlayerIds={recentlyUpdatedPlayerIds}
        mutedSet={mutedSet}
        handleUnmute={handleUnmute}
        handleMute={handleMute}
        handleKick={handleKick}
        startReady={startReady}
        isStartingGame={isStartingGame}
        isStartConfirmArmed={isStartConfirmArmed}
        handleStart={handleStart}
        startButtonLabel={startButtonLabel}
        startStatusText={startStatusText}
        answerMode={answerMode}
        answerModeOptions={answerModeOptions}
        answerModeLabels={answerModeLabels}
        syncAnswerMode={syncAnswerMode}
        modeOptions={modeOptions}
        syncChatMode={syncChatMode}
        chatMode={chatMode}
        modeLabels={modeLabels}
        newAllowedText={newAllowedText}
        setNewAllowedText={setNewAllowedText}
        addAllowedMessage={addAllowedMessage}
        allowedList={allowedList}
        removeAllowedMessage={removeAllowedMessage}
        socket={socketRef.current}
        roomId={LAN_ROOM}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(139,92,246,0.12),rgba(13,17,23,0)_70%)]" />
      <button onClick={handleBack} className="absolute top-5 left-5 text-slate-500 hover:text-white text-sm font-semibold transition-colors font-outfit">← back</button>
      <div className="z-10 w-full max-w-sm panel-elevated p-8 animate-phase-in">
        <h1 className="mb-8 text-5xl font-black tracking-tight font-outfit text-gradient-brand">New Room</h1>
        <div className="w-full">
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="mb-3 w-full rounded-2xl border border-slate-700/50 bg-[#0D1117] px-4 py-4 text-lg font-semibold text-white placeholder-slate-500 transition-colors focus:border-violet-400 focus:outline-none font-outfit"
          />
          {error && <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-2.5 text-xs font-mono text-red-300">{error}</p>}
          <button onClick={handleCreate} disabled={!connected} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 py-5 text-xl font-black text-white font-outfit transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 animate-shimmer">
            CREATE
          </button>
          <div className={`mt-3 flex items-center justify-center gap-2 text-xs font-outfit font-semibold ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
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
          {resumeNotice && <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2.5 text-xs text-emerald-200">{resumeNotice}</p>}
        </div>
      </div>
    </div>
  );
}