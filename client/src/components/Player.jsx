import { useState, useEffect, useRef } from 'react';
import Chat from './Chat';
import AnimatedBackground from './AnimatedBackground';
import { createGameSocket } from '../backendUrl';
import PingIndicator from './PingIndicator';
import LeaderboardResultsCard from './leaderboard/LeaderboardResultsCard';
import { resolveQuestionTiming } from '../utils/questionTiming';

const LAN_ROOM = 'local_flux_main';
const PLAYER_SESSION_KEY = 'lf_player_session_id';
const PLAYER_STATE_KEY = 'lf_player_state';
const START_SPLASH_MIN_MS = 0;
const END_SPLASH_MIN_MS = 1400;
const PRESET_AVATARS = [
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
const MAX_CHAT_HISTORY = 300;

function messageKey(message = {}) {
  return `${message.id || ''}|${message.ts || ''}|${message.from || ''}|${message.name || ''}|${message.text || ''}|${message.event || ''}|${message.cannedId || ''}|${message.isCorrectGuess ? '1' : '0'}`;
}

function mergeChatHistory(existing, incoming) {
  const base = Array.isArray(existing) ? existing : [];
  const extra = Array.isArray(incoming) ? incoming : [];
  if (extra.length === 0) return base.slice(-MAX_CHAT_HISTORY);

  const merged = [...base];
  const seen = new Set(base.map((item) => messageKey(item)));

  extra.forEach((item) => {
    const key = messageKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged.slice(-MAX_CHAT_HISTORY);
}

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { type: 'preset', value: '1.jpg' };
  const value = String(input.value || '').trim();
  if (input.type !== 'preset' || !value) return { type: 'preset', value: '1.jpg' };
  return { type: 'preset', value };
}

function resolvePresetPath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/avatars/1.png';
  return trimmed.includes('.') ? `/avatars/${trimmed}` : `/avatars/${trimmed}.png`;
}

function resolveImageUrl(image) {
  if (!image) return null;
  const trimmed = String(image).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('/')) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `/deck-images/${trimmed}`;
}

function getOrCreatePlayerSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const fromStateRaw = window.sessionStorage.getItem(PLAYER_STATE_KEY);
    if (fromStateRaw) {
      const parsed = JSON.parse(fromStateRaw);
      const stateSession = String(parsed?.playerSessionId || '').trim();
      if (stateSession) {
        window.sessionStorage.setItem(PLAYER_SESSION_KEY, stateSession);
        return stateSession;
      }
    }
  } catch {
    // ignore state parsing errors and continue with fallback key path
  }

  const existing = window.sessionStorage.getItem(PLAYER_SESSION_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(PLAYER_SESSION_KEY, next);
  return next;
}

function readPlayerState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistPlayerState(next) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next));
}

function clearPlayerState() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PLAYER_STATE_KEY);
}

function displayRoomName(name) {
  const normalized = String(name || '').trim();
  if (!normalized || normalized.toLowerCase() === LAN_ROOM) {
    return 'LocalFlux Room';
  }
  return normalized;
}

export default function Player({ onBack }) {
  const savedPlayerState = readPlayerState();
  const savedStateSessionId = String(savedPlayerState?.playerSessionId || '').trim();
  const playerSessionIdRef = useRef(getOrCreatePlayerSessionId());
  const shouldTryResumeRef = useRef(Boolean(savedStateSessionId));
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [chatSocket, setChatSocket] = useState(null);
  const [selfPlayerId, setSelfPlayerId] = useState('');
  const [name, setName] = useState(savedPlayerState?.name || 'Guest');
  const [avatarObject, setAvatarObject] = useState(normalizeAvatarObject(savedPlayerState?.avatarObject));
  const [isEditingName, setIsEditingName] = useState(false);
  const [hiddenPresetPaths, setHiddenPresetPaths] = useState(() => new Set());
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState(savedPlayerState?.roomName || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [phase, setPhase] = useState('joining');
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [guessFeedback, setGuessFeedback] = useState('');
  const [answeredCorrect, setAnsweredCorrect] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateGuessHistory, setPrivateGuessHistory] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatMode, setChatMode] = useState('FREE');
  const [chatAllowed, setChatAllowed] = useState([]);
  const [isLobbyDeckReady, setIsLobbyDeckReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const [nextQuestionIn, setNextQuestionIn] = useState(0);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [joinRetryIn, setJoinRetryIn] = useState(0);
  const roomDisplayName = displayRoomName(roomName);
  const latestNameRef = useRef(name);
  const startSplashUntilRef = useRef(0);
  const pendingQuestionRef = useRef(null);
  const startSplashTimerRef = useRef(null);
  const pendingFinalScoresRef = useRef(null);
  const endSplashTimerRef = useRef(null);
  const desktopGuessInputRef = useRef(null);
  const mobileGuessInputRef = useRef(null);

  const applyNextQuestion = ({ question: nextQuestion, durationMs, endsAt, serverNow }) => {
    setQuestion(nextQuestion);
    setSelected(null);
    setGuessText('');
    setGuessFeedback('');
    setAnsweredCorrect(null);
    setIsSubmitting(false);
    setPrivateGuessHistory([]);
    setResultData(null);
    setNextQuestionIn(0);
    setChatDrawerOpen(false);
    const fallbackMs = Number(nextQuestion?.time_limit_ms) || 20000;
    const { normalizedMs, remainingMs, targetEndsAt } = resolveQuestionTiming({
      durationMs,
      endsAt,
      serverNow,
      fallbackMs,
    });
    setTimeTotal(Math.ceil(normalizedMs / 1000));
    setQuestionEndsAt(targetEndsAt);
    setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    setPhase('question');
  };

  const applyResumePayload = (res) => {
    setError('');
    setJoinRetryIn(0);
    setRoomName(res.roomName || 'LocalFlux Game');
    if (res.chatMode) setChatMode(res.chatMode);
    if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
    if (Array.isArray(res.chatHistory)) setChatHistory(res.chatHistory.slice(-MAX_CHAT_HISTORY));
    setIsLobbyDeckReady(Boolean(res.deckSelected));
    setMyScore(Number(res.myScore) || 0);

    const phaseFromServer = String(res.phase || res.status || '').toLowerCase();
    if (phaseFromServer === 'lobby') {
      setQuestion(null);
      setResultData(null);
      setSelected(null);
      setPhase('waiting');
      return;
    }

    if (phaseFromServer === 'started' && res.activeQuestion) {
      const { question: activeQuestion, durationMs, endsAt, serverNow } = res.activeQuestion;
      const hasAnswered = Boolean(res.hasAnswered);
      setQuestion(activeQuestion);
      setResultData(null);
      setSelected(hasAnswered ? res.answeredValue ?? null : null);
      setGuessText('');
      setGuessFeedback('');
      setPrivateGuessHistory([]);
      const isTypeGuessQuestion = activeQuestion?.answer_mode === 'type_guess';
      if (hasAnswered && isTypeGuessQuestion) {
        setAnsweredCorrect(true);
      } else {
        setAnsweredCorrect(null);
      }
      setPhase(hasAnswered ? 'answered' : 'question');
      const fallbackMs = Number(activeQuestion?.time_limit_ms) || 20000;
      const { normalizedMs, remainingMs, targetEndsAt } = resolveQuestionTiming({
        durationMs,
        endsAt,
        serverNow,
        fallbackMs,
      });
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      return;
    }

    setPhase('waiting');
  };

  const attemptJoinRoom = () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Connecting to server...');
      return;
    }

    socket.emit(
      'join',
      {
        playerName: latestNameRef.current || 'Guest',
        playerSessionId: playerSessionIdRef.current,
      },
      (res) => {
        if (!res?.success) {
          setError(res?.error || 'Could not join game.');
          return;
        }

        setError('');
        setJoinRetryIn(0);
        shouldTryResumeRef.current = true;
        if (typeof res.playerName === 'string' && res.playerName.trim()) {
          setName(res.playerName.trim());
        }
        if (res.avatarObject && typeof res.avatarObject === 'object') {
          setAvatarObject(normalizeAvatarObject(res.avatarObject));
        }
        setRoomName(res.roomName || 'LocalFlux Game');
        if (res.chatMode) setChatMode(res.chatMode);
        if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
        if (Array.isArray(res.chatHistory)) setChatHistory(res.chatHistory.slice(-MAX_CHAT_HISTORY));
        setIsLobbyDeckReady(Boolean(res.deckSelected));
        setMyScore(Number(res.myScore) || 0);
        setPhase('waiting');
      }
    );
  };

  const attemptResumeRoom = () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Connecting to server...');
      return;
    }

    const sessionId = String(playerSessionIdRef.current || '').trim();
    if (!sessionId) {
      shouldTryResumeRef.current = false;
      attemptJoinRoom();
      return;
    }

    socket.emit('player:resume', { sessionId }, (res) => {
      if (!res?.success) {
        shouldTryResumeRef.current = false;
        attemptJoinRoom();
        return;
      }

      applyResumePayload(res);
    });
  };

  const attemptEntry = () => {
    if (shouldTryResumeRef.current) {
      attemptResumeRoom();
      return;
    }
    attemptJoinRoom();
  };

  useEffect(() => {
    latestNameRef.current = name;
  }, [name]);

  useEffect(() => {
    if (!name.trim() && !roomName.trim()) return;
    persistPlayerState({
      name: name.trim(),
      avatarObject,
      roomName: roomName.trim(),
      playerSessionId: String(playerSessionIdRef.current || '').trim(),
      updatedAt: Date.now(),
    });
  }, [name, avatarObject, roomName]);

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;
    const chatSocketTimer = window.setTimeout(() => {
      setChatSocket(socket);
    }, 0);
    socket.on('connect', () => {
      setConnected(true);
      setSelfPlayerId(socket.id || '');
      attemptEntry();
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setJoinRetryIn(0);
    });
    socket.on('player:profileUpdated', ({ player }) => {
      if (!player || player.id !== socket.id) return;
      if (typeof player.name === 'string') setName(player.name);
      setAvatarObject(normalizeAvatarObject(player.avatarObject));
    });
    socket.on('chat:mode', ({ mode, allowed }) => {
      if (mode) setChatMode(mode);
      if (Array.isArray(allowed)) setChatAllowed(allowed);
    });
    socket.on('chat:history', ({ messages }) => {
      if (!Array.isArray(messages)) return;
      setChatHistory((current) => mergeChatHistory(current, messages));
    });
    socket.on('chat:message', (message) => {
      if (!message || typeof message !== 'object') return;
      setChatHistory((current) => mergeChatHistory(current, [message]));
    });
    socket.on('room:deck_updated', ({ selected }) => {
      if (typeof selected === 'boolean') {
        setIsLobbyDeckReady(selected);
        return;
      }
      setIsLobbyDeckReady(true);
    });
    socket.on('room_closed', ({ message }) => {
      setError(message || 'Room closed by host.');
      setPhase('joining');
      setRoomName('');
      setChatHistory([]);
      pendingFinalScoresRef.current = null;
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
        endSplashTimerRef.current = null;
      }
      clearPlayerState();
    });
    socket.on('game_started', () => {
      setPhase('starting');
      startSplashUntilRef.current = Date.now() + START_SPLASH_MIN_MS;
      pendingQuestionRef.current = null;
      if (startSplashTimerRef.current) {
        window.clearTimeout(startSplashTimerRef.current);
        startSplashTimerRef.current = null;
      }
    });
    socket.on('next_question', (payload) => {
      const remainingSplashMs = startSplashUntilRef.current - Date.now();
      if (remainingSplashMs > 0) {
        pendingQuestionRef.current = payload;
        if (startSplashTimerRef.current) {
          window.clearTimeout(startSplashTimerRef.current);
        }
        startSplashTimerRef.current = window.setTimeout(() => {
          if (!pendingQuestionRef.current) return;
          const nextPayload = pendingQuestionRef.current;
          pendingQuestionRef.current = null;
          startSplashTimerRef.current = null;
          applyNextQuestion(nextPayload);
        }, remainingSplashMs);
        return;
      }

      applyNextQuestion(payload);
    });
    socket.on('question_result', (data) => {
      setResultData(data);
      const me = data.scores.find(p => p.id === socket.id);
      if (me) setMyScore(me.score);
      setPhase('result');
    });
    socket.on('round:transition', ({ nextInMs }) => {
      const seconds = Math.max(0, Math.ceil(Number(nextInMs || 0) / 1000));
      setNextQuestionIn(seconds);
    });
    socket.on('game_over', ({ scores }) => {
      setNextQuestionIn(0);
      setPhase('ending');
      pendingFinalScoresRef.current = Array.isArray(scores) ? scores : [];
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
      }
      endSplashTimerRef.current = window.setTimeout(() => {
        setFinalScores(Array.isArray(pendingFinalScoresRef.current) ? pendingFinalScoresRef.current : []);
        pendingFinalScoresRef.current = null;
        endSplashTimerRef.current = null;
        setPhase('gameover');
      }, END_SPLASH_MIN_MS);
    });
    return () => {
      window.clearTimeout(chatSocketTimer);
      if (startSplashTimerRef.current) {
        window.clearTimeout(startSplashTimerRef.current);
        startSplashTimerRef.current = null;
      }
      if (endSplashTimerRef.current) {
        window.clearTimeout(endSplashTimerRef.current);
        endSplashTimerRef.current = null;
      }
      socket.off('chat:mode');
      socket.off('chat:history');
      socket.off('chat:message');
      setChatSocket(null);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'joining' || !connected) return undefined;

    let remaining = 3;
    const kickoffTimer = window.setTimeout(() => {
      attemptEntry();
      setJoinRetryIn(remaining);
    }, 0);

    const retryTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        attemptEntry();
        remaining = 3;
      }
      setJoinRetryIn(remaining);
    }, 1000);

    return () => {
      window.clearTimeout(kickoffTimer);
      window.clearInterval(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, connected]);

  useEffect(() => {
    if (!(phase === 'question' || phase === 'answered') || !questionEndsAt) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, questionEndsAt]);

  useEffect(() => {
    if (phase !== 'result' || nextQuestionIn <= 0) return undefined;
    const timer = window.setInterval(() => {
      setNextQuestionIn((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, nextQuestionIn]);

  const handleBack = () => {
    clearPlayerState();
    onBack?.();
  };

  const handleExitToPlay = () => {
    clearPlayerState();
    if (typeof window !== 'undefined') {
      window.location.assign('/play');
      return;
    }
    onBack?.();
  };

  const handleBackToLobby = () => {
    if (!socketRef.current?.connected) {
      setError('Not connected. Please retry in a moment.');
      return;
    }

    setError('');
    socketRef.current.emit(
      'join',
      {
        playerName: latestNameRef.current || 'Guest',
        playerSessionId: playerSessionIdRef.current,
      },
      (res) => {
        if (!res?.success) {
          setError(res?.error || 'Could not rejoin lobby.');
          return;
        }

        if (typeof res.playerName === 'string' && res.playerName.trim()) {
          setName(res.playerName.trim());
        }
        if (res.avatarObject && typeof res.avatarObject === 'object') {
          setAvatarObject(normalizeAvatarObject(res.avatarObject));
        }

        setRoomName(res.roomName || 'LocalFlux Game');
        if (res.chatMode) setChatMode(res.chatMode);
        if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
        if (Array.isArray(res.chatHistory)) setChatHistory(res.chatHistory.slice(-MAX_CHAT_HISTORY));
        setIsLobbyDeckReady(Boolean(res.deckSelected));
        setMyScore(Number(res.myScore) || 0);
        setFinalScores([]);
        setQuestion(null);
        setSelected(null);
        setPrivateGuessHistory([]);
        setResultData(null);
        setPhase('waiting');
      }
    );
  };

  const handleAnswer = (opt) => {
    if (selected || isSubmitting) return;
    setIsSubmitting(true);
    setSelected(opt);
    setAnsweredCorrect(null);
    setGuessFeedback('');
    setChatDrawerOpen(false);
    setPhase('answered');
    socketRef.current.emit('submit_answer', { answer: opt }, (res) => {
      if (res?.success && typeof res.correct === 'boolean') {
        setAnsweredCorrect(res.correct);
      }
      setIsSubmitting(false);
    });
  };

  const handleGuessSubmit = () => {
    const payload = String(guessText || '').trim();
    if (!payload || !socketRef.current || isSubmitting) return;

    setIsSubmitting(true);
    setGuessFeedback('');
    socketRef.current.emit('player:chat_guess', { text: payload }, (res) => {
      setIsSubmitting(false);
      if (!res?.ok) {
        if (res?.reason === 'already_answered') {
          setGuessFeedback('You already submitted your answer this round.');
          return;
        }
        setGuessFeedback('Could not submit guess. Try again.');
        return;
      }

      if (res.matched) {
        setSelected(payload);
        setAnsweredCorrect(true);
        setGuessText('');
        setChatDrawerOpen(false);
        setPhase('answered');
        const points = res.scoreAwarded || 100;
        setGuessFeedback(`That is correct! +${points} pts`);
        return;
      }

      setAnsweredCorrect(null);
      setGuessText('');
      setGuessFeedback('');
      if (chatMode !== 'FREE') {
        setPrivateGuessHistory((prev) => [payload, ...prev].slice(0, 6));
      }
    });
  };

  const handleReusePrivateGuess = (entry) => {
    const value = String(entry || '').trim();
    if (!value || answeredCorrect === true) return;

    setGuessText(value);

    const isMobileViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const inputEl = isMobileViewport ? mobileGuessInputRef.current : desktopGuessInputRef.current;
    inputEl?.focus();
    inputEl?.setSelectionRange(value.length, value.length);
  };

  const handleSaveProfile = () => {
    const newName = name.trim();
    if (!newName) return setError('Display name cannot be empty.');
    if (!socketRef.current?.connected) return setError('Not connected.');

    setError('');
    socketRef.current.emit('player:updateProfile', { newName, avatarObject }, (res) => {
      if (!res?.success) {
        setError(res?.error || 'Could not save profile.');
        return;
      }
      setName(newName);
      setAvatarObject(normalizeAvatarObject(res.player?.avatarObject || avatarObject));
      setProfileSaved(true);
      setIsEditingName(false);
      window.setTimeout(() => setProfileSaved(false), 1800);
    });
  };

  const renderAvatarBadge = (sizeClass = 'h-12 w-12') => {
    return (
      <div
        className={`${sizeClass} rounded-full border border-slate-600 p-1 shadow-inner`}
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <img
          src={resolvePresetPath(avatarObject.value)}
          alt="Selected avatar"
          className="h-full w-full rounded-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        />
      </div>
    );
  };

  const timerTone =
    timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.25)
      ? 'text-red-400'
      : timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.5)
        ? 'text-amber-300'
        : 'text-emerald-300';

  const renderLeaveAndPing = ({ inline = false } = {}) => {
    if (inline) {
      return (
        <div className="mb-2 flex items-center">
          <PingIndicator socket={chatSocket} />
        </div>
      );
    }

    return (
      <>
        <PingIndicator socket={chatSocket} className="absolute top-5 right-5" />
      </>
    );
  };

  if (phase === 'gameover') {
    const myEntry = finalScores.find(p => p.id === selfPlayerId);
    const myRank = finalScores.findIndex(p => p.id === selfPlayerId) + 1;

    return (
      <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white animate-phase-in">
        <AnimatedBackground />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-4 md:p-8">
          <div className="relative w-full max-w-3xl">
            {renderLeaveAndPing()}
            <LeaderboardResultsCard
              finalScores={finalScores}
              highlightPlayerId={selfPlayerId}
              pretitle="Game Over"
              title="Leaderboard"
              subtitle={myEntry ? `You placed #${myRank} with ${myEntry.score} pts` : ''}
            />

            {error && (
              <p className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-md">
                {error}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 md:gap-4 mt-10 md:mt-12">
              <button
                onClick={handleBackToLobby}
                className="rounded-xl bg-emerald-400 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
              >
                BACK TO LOBBY
              </button>
              <button
                onClick={handleExitToPlay}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ending') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex items-center justify-center p-6 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative w-full max-w-md rounded-3xl border border-sky-500/30 bg-slate-900/80 px-6 py-10 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full border-2 border-sky-400/60 border-t-sky-200 animate-spin" />
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300/80">Round Complete</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Game Ended</h2>
          <p className="mt-3 text-sm text-slate-300">Final standings up next.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse [animation-delay:160ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    const correctAnswer = resultData.correct_answer || resultData.correctAnswer || '';
    const hasAnswered = Boolean(selected);
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    return (
      <div className="relative z-0 flex h-screen w-screen overflow-hidden bg-slate-950 text-white animate-phase-in">
        <AnimatedBackground />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                {renderLeaveAndPing({ inline: true })}
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{roomDisplayName}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Next</p>
                <p className="text-2xl font-black tabular-nums text-emerald-300">{nextQuestionIn > 0 ? `${nextQuestionIn}s` : '...'}</p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 md:p-8">
            <div className="shrink-0 rounded-3xl border border-white/10 bg-slate-950/40 px-6 py-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Answer Reveal</p>
              <p className="text-2xl md:text-3xl font-black leading-tight text-white/90 drop-shadow-md text-center">{question?.prompt}</p>
            </div>

            {question?.image && (
              <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
                <img
                  src={resolveImageUrl(question.image)}
                  alt="Question visual"
                  className="max-h-full max-w-full rounded-2xl object-contain opacity-95 shadow-2xl shadow-black/50 ring-1 ring-white/10"
                />
              </div>
            )}

            <div className="mt-4 shrink-0">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90">Answer</p>
                  <p className="mt-1 text-xl font-black text-emerald-100">{correctAnswer || 'Not available'}</p>
                </div>
                <div className={`rounded-2xl border px-5 py-5 ${hasAnswered ? 'border-sky-400/60 bg-sky-500/10' : 'border-slate-700 bg-slate-900/70'}`}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                    {isTypeGuessQuestion ? 'Your Guess' : 'Your Answer'}
                  </p>
                  <p className="mt-1 text-lg font-black text-white">{hasAnswered ? selected : 'No answer submitted'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 shrink-0 text-center">
              <p className="text-sm font-semibold text-slate-300">
                {hasAnswered ? 'Answer submitted. Review shown above.' : 'You did not submit an answer this round.'}
              </p>
              <p className="mt-2 font-mono text-sm tabular-nums">Score: <span className="font-black text-amber-300">{myScore}</span></p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/60">
                {nextQuestionIn > 0 ? `Next question in ${nextQuestionIn}s` : 'Preparing next question'}
              </p>
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
                suppressFreeComposer={isTypeGuessQuestion}
                showMeta={!isTypeGuessQuestion}
                showModeBadge={!isTypeGuessQuestion}
              />
            </div>
          </div>
        </aside>

      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex items-center justify-center p-6 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/80 px-6 py-10 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full border-2 border-emerald-400/60 border-t-emerald-200 animate-spin" />
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Match Started</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Get Ready...</h2>
          <p className="mt-3 text-sm text-slate-300">Host started the game. Your first question is loading.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse [animation-delay:160ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="relative z-0 flex min-h-[100dvh] w-screen overflow-y-auto bg-slate-950 text-white animate-phase-in lg:h-screen lg:overflow-hidden">
        <AnimatedBackground />

        <div className="relative z-10 flex w-full flex-1 flex-col p-4 md:p-8">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              {renderLeaveAndPing({ inline: true })}
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">{roomDisplayName}</p>
            </div>
            <div
              className={`rounded-2xl border-2 px-4 py-2 text-right transition-colors duration-300 backdrop-blur-md shadow-xl ${
                timeLeft <= 2
                  ? 'border-red-500/60 bg-red-500/10'
                  : timeLeft <= 5
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-900'
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
              <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timeLeft <= 2 ? 'text-red-300' : timerTone}`}>{timeLeft}s</p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 items-start justify-center pt-2 lg:items-center lg:pt-0">
            <div className="w-full rounded-3xl border border-white/10 bg-black/35 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Answer Submitted</p>
              <p className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-2xl font-black text-emerald-200 shadow-lg shadow-emerald-900/30">
                {selected}
              </p>
              <p
                className={`mt-4 text-base font-black uppercase tracking-[0.16em] ${
                  answeredCorrect === true
                    ? 'text-emerald-300'
                    : answeredCorrect === false
                      ? 'text-rose-300'
                      : 'text-amber-300'
                }`}
              >
                {answeredCorrect === true ? 'Correct' : answeredCorrect === false ? 'Wrong' : 'Checking...'}
              </p>
              <div className="mt-3 flex items-center justify-center">
                {answeredCorrect === true ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="M4.5 10.5L8.3 14.2L15.5 6.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Right Answer
                  </span>
                ) : answeredCorrect === false ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-rose-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-400/25">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                        <path d="M6 6L14 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M14 6L6 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </span>
                    Wrong Answer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/25">
                      <span className="h-2 w-2 rounded-full bg-amber-200 animate-pulse" />
                    </span>
                    Verifying
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-400">You can chat while waiting for other players to submit.</p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="status-dot" />
                <span className="status-dot" />
                <span className="status-dot" />
              </div>
            </div>
          </div>

          <div className="mt-4 lg:hidden">
            <div className="h-[42dvh] min-h-[260px] rounded-2xl border border-white/10 bg-black/25 p-2">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
              />
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
              />
            </div>
          </div>
        </aside>
      </div>
    );
  }

  if (phase === 'question' && question) {
    const progress = timeTotal > 0 ? Math.max(0, Math.round((timeLeft / timeTotal) * 100)) : 0;
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    const answerControlMinHeight = 'clamp(68px, 10vh, 112px)';
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background bg-slate-950 text-foreground text-white animate-phase-in">
        <AnimatedBackground />

        <div className="relative z-10 flex flex-1 flex-col">
          <div className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                {renderLeaveAndPing({ inline: true })}
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">{roomDisplayName}</p>
              </div>
              <div
                className={`rounded-2xl border-2 px-4 py-2 text-right transition-colors duration-300 backdrop-blur-md shadow-xl ${
                  timeLeft <= 2
                    ? 'border-red-500/60 bg-red-500/10'
                    : timeLeft <= 5
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
                <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timeLeft <= 2 ? 'text-red-300' : timerTone}`}>{timeLeft}s</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 pb-2 pt-3 md:px-8">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress <= 25 ? 'bg-red-400' : progress <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-4 md:p-8">
              {question.image ? (
                <>
                  <p className="w-full max-w-5xl text-center text-2xl font-black leading-tight text-white/95 drop-shadow-md md:text-4xl">
                    {question.prompt}
                  </p>
                  <div className="mt-4 flex min-h-0 w-full flex-1 items-center justify-center">
                    <img
                      src={resolveImageUrl(question.image)}
                      alt="Question visual"
                      className="max-h-full max-w-full rounded-lg object-contain shadow-xl"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <p className="text-center text-3xl font-bold text-white md:text-5xl lg:text-6xl">
                    {question.prompt}
                  </p>
                </div>
              )}
            </div>

            {isTypeGuessQuestion ? (
              <div className="relative z-10 mx-auto grid w-full max-w-5xl shrink-0 grid-cols-1 gap-3 p-4 md:p-8">
                {chatMode !== 'FREE' && privateGuessHistory.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {privateGuessHistory.map((entry, idx) => (
                      <button
                        key={`${entry}_${idx}`}
                        type="button"
                        onClick={() => handleReusePrivateGuess(entry)}
                        title={entry}
                        disabled={answeredCorrect === true || isSubmitting}
                        className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="block max-w-36 truncate">{entry}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={desktopGuessInputRef}
                    type="text"
                    value={guessText}
                    onChange={(e) => setGuessText(e.target.value.slice(0, 180))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !answeredCorrect && !isSubmitting) handleGuessSubmit();
                    }}
                    placeholder={answeredCorrect ? 'Answer submitted' : 'Type your guess here...'}
                    disabled={answeredCorrect === true || isSubmitting}
                    className={`flex-1 rounded-xl border border-white/20 bg-slate-950/60 px-5 py-3 text-base font-semibold text-white shadow-inner placeholder:text-slate-400 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none transition-all ${(answeredCorrect === true || isSubmitting) ? 'cursor-not-allowed opacity-40' : ''}`}
                    style={{ minHeight: answerControlMinHeight }}
                  />
                  <button
                    onClick={handleGuessSubmit}
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-black tracking-wide text-teal-950 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    style={{ minHeight: answerControlMinHeight }}
                    disabled={!guessText.trim() || answeredCorrect === true || isSubmitting}
                  >
                    {isSubmitting ? '...' : 'GUESS'}
                  </button>
                </div>
                {guessFeedback && <p className="text-xs font-semibold text-emerald-300">{guessFeedback}</p>}
              </div>
            ) : (
              <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8 shrink-0">
                {question.options.map((opt, idx) => {
                  const colorClass =
                    idx % 4 === 0
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white'
                      : idx % 4 === 1
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        : idx % 4 === 2
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white';

                  return (
                    <button
                      key={`${question?.q_id || 'q'}_${idx}_${opt}`}
                      onClick={() => handleAnswer(opt)}
                      disabled={isSubmitting}
                      className={`rounded-xl px-6 py-4 text-left text-lg font-black transition-transform hover:scale-[1.02] active:scale-95 md:py-6 md:text-xl disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
                      style={{ minHeight: answerControlMinHeight }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:flex w-80 lg:w-96 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl relative z-10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">Room Chat</p>
            <p className="mt-1 text-[11px] text-slate-400">{roomDisplayName}</p>
          </div>
          <div className="min-h-0 flex-1 p-3">
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                initialMessages={chatHistory}
                suppressFreeComposer={isTypeGuessQuestion}
                showMeta={!isTypeGuessQuestion}
                showModeBadge={!isTypeGuessQuestion}
              />
            </div>
          </div>
        </aside>
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center gap-4 p-5 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative z-10 w-full flex flex-col items-center">
          {renderLeaveAndPing()}
        </div>
        <p className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">{roomDisplayName}</p>
        <p className="text-white/50 text-sm font-medium">Waiting for host to start...</p>
        <p className={`text-xs font-black uppercase tracking-[0.15em] ${isLobbyDeckReady ? 'text-emerald-300' : 'text-amber-300'}`}>
          {isLobbyDeckReady ? 'Deck selected! Get ready.' : 'Waiting for host to choose a deck...'}
        </p>
        <p className={`text-xs font-mono mt-1 ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
          {connected ? 'connected' : 'reconnecting...'}
        </p>

        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/80">Player ID Card</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Username</p>
                  <p className="text-lg font-black text-emerald-200 drop-shadow-sm">{name || 'Player'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingName((v) => !v)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white/80 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {isEditingName ? 'Close' : 'Edit'}
                  </button>
                  {renderAvatarBadge()}
                </div>
              </div>

              {isEditingName && (
                <>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 24))}
                    placeholder="Your hacker alias"
                    className="w-full rounded-full border border-white/15 bg-black/30 px-5 py-3 text-sm font-semibold text-white placeholder-white/30 transition-all focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none"
                  />
                </>
              )}

              {isEditingName ? (
                <>
                  <div className="mt-4 mb-2 grid grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((presetId) => (
                      hiddenPresetPaths.has(presetId) ? null :
                      <button
                        key={presetId}
                        onClick={() => setAvatarObject({ type: 'preset', value: presetId })}
                        className={`rounded-2xl border-2 p-1.5 transition-all duration-200 ${
                          avatarObject.value === presetId
                            ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.25)] scale-105'
                            : 'border-white/10 hover:border-white/30 hover:scale-105'
                        }`}
                        style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.6) 100%)' }}
                      >
                        <img
                          src={resolvePresetPath(presetId)}
                          alt={`Avatar preset ${presetId}`}
                          onError={() => {
                            setHiddenPresetPaths((prev) => {
                              const next = new Set(prev);
                              next.add(presetId);
                              return next;
                            });
                          }}
                          className="h-14 w-full rounded-xl object-contain p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 py-3.5 text-sm font-black tracking-[0.16em] text-teal-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:translate-y-0 active:scale-95"
                  >
                    SAVE PROFILE
                  </button>
                </>
              ) : (
                <p className="mt-3 text-xs text-white/40">Click Edit to change your name or profile picture.</p>
              )}
            {profileSaved && (
              <p className="mt-3 text-center text-xs font-bold text-emerald-300">Profile saved.</p>
            )}
          </div>
        </section>

        <div className="w-full max-w-md mt-4 rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-4 shadow-xl shadow-black/40">
          <Chat socket={chatSocket} roomPin={LAN_ROOM} title="Lobby Chat" initialMode={chatMode} initialAllowed={chatAllowed} initialMessages={chatHistory} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 z-0">
      <AnimatedBackground />
      <button onClick={handleBack} className="absolute top-5 left-5 z-20 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:bg-white/10 hover:text-white">← back</button>
      <div className="z-10 w-full max-w-sm animate-phase-in rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 drop-shadow-md">Joining Game</h1>
        <div className="w-full flex flex-col gap-4 items-center justify-center">
          <p className="text-white/50 font-medium">One moment...</p>
          {error && <p className="rounded-2xl border border-rose-500/40 bg-rose-500/15 backdrop-blur-md px-4 py-3 text-xs font-semibold text-rose-200 w-full text-center shadow-[0_0_15px_rgba(244,63,94,0.15)]">{error}</p>}
          {connected && phase === 'joining' && (
            <p className="text-xs font-mono text-white/40">Auto retry in {joinRetryIn || 1}s</p>
          )}
          <button
            onClick={() => {
              attemptEntry();
              setJoinRetryIn(3);
            }}
            disabled={!connected}
            className="mt-1 w-full rounded-full border-2 border-white/15 bg-white/5 px-4 py-3.5 text-sm font-black tracking-[0.1em] text-white/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            RETRY NOW
          </button>
          <div className={`flex items-center justify-center gap-2 text-xs font-bold ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
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
        </div>
      </div>
    </div>
  );
}