import { useState, useEffect, useRef } from 'react';
import Chat from './Chat';
import AnimatedBackground from './AnimatedBackground';
import { createGameSocket } from '../backendUrl';
import PingIndicator from './PingIndicator';

const LAN_ROOM = 'local_flux_main';
const PLAYER_SESSION_KEY = 'lf_player_session_id';
const PLAYER_STATE_KEY = 'lf_player_state';
const START_SPLASH_MIN_MS = 1200;
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
    const fromStateRaw = window.localStorage.getItem(PLAYER_STATE_KEY);
    if (fromStateRaw) {
      const parsed = JSON.parse(fromStateRaw);
      const stateSession = String(parsed?.playerSessionId || '').trim();
      if (stateSession) {
        window.localStorage.setItem(PLAYER_SESSION_KEY, stateSession);
        return stateSession;
      }
    }
  } catch {
    // ignore state parsing errors and continue with fallback key path
  }

  const existing = window.localStorage.getItem(PLAYER_SESSION_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(PLAYER_SESSION_KEY, next);
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
  window.localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next));
}

function clearPlayerState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLAYER_STATE_KEY);
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
  const [privateGuessHistory, setPrivateGuessHistory] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
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

  const resolveQuestionTiming = ({ durationMs, endsAt, question: incomingQuestion }) => {
    const limitMs = Number(durationMs ?? incomingQuestion?.time_limit_ms);
    const normalizedMs = Number.isFinite(limitMs) && limitMs > 0 ? limitMs : 20000;
    const serverEndsAt = Number(endsAt);
    const serverRemainingMs = Number.isFinite(serverEndsAt) ? serverEndsAt - Date.now() : NaN;
    const remainingMs = Number.isFinite(serverRemainingMs) && serverRemainingMs > 0 ? serverRemainingMs : normalizedMs;
    const targetEndsAt = Date.now() + remainingMs;
    return {
      normalizedMs,
      targetEndsAt,
    };
  };

  const applyNextQuestion = ({ question: nextQuestion, durationMs, endsAt }) => {
    setQuestion(nextQuestion);
    setSelected(null);
    setGuessText('');
    setGuessFeedback('');
    setAnsweredCorrect(null);
    setPrivateGuessHistory([]);
    setResultData(null);
    setNextQuestionIn(0);
    setChatDrawerOpen(false);
    const { normalizedMs, targetEndsAt } = resolveQuestionTiming({ durationMs, endsAt, question: nextQuestion });
    setTimeTotal(Math.ceil(normalizedMs / 1000));
    setQuestionEndsAt(targetEndsAt);
    setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
    setPhase('question');
  };

  const applyResumePayload = (res) => {
    setError('');
    setJoinRetryIn(0);
    setRoomName(res.roomName || 'LocalFlux Game');
    if (res.chatMode) setChatMode(res.chatMode);
    if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
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
      const { question: activeQuestion, durationMs, endsAt } = res.activeQuestion;
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
        setPhase('question');
      } else {
        setAnsweredCorrect(null);
        setPhase(hasAnswered ? 'answered' : 'question');
      }
      const { normalizedMs, targetEndsAt } = resolveQuestionTiming({ durationMs, endsAt, question: activeQuestion });
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
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
        if (typeof res.playerName === 'string' && res.playerName.trim()) {
          setName(res.playerName.trim());
        }
        if (res.avatarObject && typeof res.avatarObject === 'object') {
          setAvatarObject(normalizeAvatarObject(res.avatarObject));
        }
        setRoomName(res.roomName || 'LocalFlux Game');
        if (res.chatMode) setChatMode(res.chatMode);
        if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
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
    if (selected) return;
    setSelected(opt);
    setAnsweredCorrect(null);
    setGuessFeedback('');
    setChatDrawerOpen(false);
    setPhase('answered');
    socketRef.current.emit('submit_answer', { answer: opt });
  };

  const handleGuessSubmit = () => {
    const payload = String(guessText || '').trim();
    if (!payload || !socketRef.current) return;

    setGuessFeedback('');
    socketRef.current.emit('player:chat_guess', { text: payload }, (res) => {
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
    const rankedFinalScores = [...finalScores].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col p-5 pt-8 animate-phase-in z-0">
        <AnimatedBackground />
        {renderLeaveAndPing()}
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-slate-500">Game Over</p>
        <h2 className="text-4xl font-black tracking-tight mb-2">Final Standings</h2>
        {myEntry && (
          <p className="text-slate-400 text-sm mb-6 font-mono tabular-nums">
            You placed #{myRank} with {myEntry.score} pts
          </p>
        )}
        <div className="flex flex-col gap-3 flex-1">
          {rankedFinalScores.map((p, i) => {
            const isTopOne = i === 0;
            const isTopTwo = i === 1;
            const isTopThree = i === 2;
            const isMe = p.id === selfPlayerId;
            const placementClass =
              isTopOne
                ? 'border-amber-300/60 bg-amber-400/20 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.3)] ring-2 ring-amber-300/30'
                : isTopTwo
                  ? 'border-slate-300/50 bg-slate-200/15 text-slate-100 shadow-xl'
                  : isTopThree
                    ? 'border-orange-300/60 bg-orange-400/15 text-orange-100 shadow-lg'
                    : isMe
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/40'
                      : 'border-white/10 bg-slate-900/60 text-white/90 backdrop-blur-md';
            const medal = isTopOne ? '🥇' : isTopTwo ? '🥈' : isTopThree ? '🥉' : '';

            return (
              <div
                key={p.id || `${p.name}_${i}`}
                className={`flex items-center justify-between rounded-3xl px-6 py-5 border ${placementClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg w-8 tabular-nums opacity-80">{i + 1}</span>
                  {medal && <span className="text-2xl leading-none drop-shadow-md">{medal}</span>}
                </div>
                <span className="flex-1 font-black text-xl tracking-tight">{p.name}</span>
                <span className="font-black text-2xl tabular-nums drop-shadow-sm">{p.score}</span>
              </div>
            );
          })}
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-md">{error}</p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={handleBackToLobby} className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95">
            BACK TO LOBBY
          </button>
          <button onClick={handleExitToPlay} className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95">
            EXIT
          </button>
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
    const correctAnswer = resultData.correct_answer;
    const hasAnswered = Boolean(selected);
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    const gotIt = hasAnswered && (answeredCorrect === true || (!isTypeGuessQuestion && selected === correctAnswer));
    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col p-4 pt-6 pb-10 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="mb-4 flex items-start justify-between gap-3 relative z-10">
          <div>
            {renderLeaveAndPing({ inline: true })}
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{roomDisplayName}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Next</p>
            <p className="text-2xl font-black tabular-nums text-emerald-300">{nextQuestionIn > 0 ? `${nextQuestionIn}s` : '...'}</p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl px-6 py-8 shadow-2xl shadow-black/50">
          <p className="text-2xl md:text-3xl font-black leading-tight text-white/90 drop-shadow-md">{question?.prompt}</p>
        </div>

        {question?.image && (
          <div className="mb-6 flex justify-center">
            <img src={resolveImageUrl(question.image)} alt="Question visual" className="max-h-56 rounded-2xl object-contain opacity-95 shadow-2xl shadow-black/50 ring-1 ring-white/10" />
          </div>
        )}

        {isTypeGuessQuestion ? (
          <div className="grid grid-cols-1 gap-3 content-start">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90">Answer</p>
              <p className="mt-1 text-xl font-black text-emerald-100">{correctAnswer}</p>
            </div>
            <div className={`rounded-2xl border px-5 py-5 ${hasAnswered ? (gotIt ? 'border-emerald-400 bg-emerald-500/10' : 'border-rose-400 bg-rose-500/10') : 'border-slate-700 bg-slate-900/70'}`}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Your Guess</p>
              <p className="mt-1 text-lg font-black text-white">{hasAnswered ? selected : 'No guess submitted'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 content-start">
            {(Array.isArray(question?.options) ? question.options : []).map((opt, idx) => {
              const isSelected = selected === opt;
              const isCorrect = correctAnswer === opt;
              const baseClass = 'border-slate-700 bg-slate-900 text-slate-200';

              let feedbackClass = baseClass;
              if (isSelected && hasAnswered) {
                feedbackClass = gotIt
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : 'border-rose-400 bg-rose-500/20 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)] opacity-70';
              } else if (isCorrect) {
                feedbackClass = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 shadow-[0_0_25px_rgba(52,211,153,0.4)] ring-2 ring-emerald-400/50';
              } else {
                feedbackClass = 'border-white/5 bg-slate-900/40 text-slate-400 opacity-50 backdrop-blur-md';
              }

              return (
                <div
                  key={`${question?.q_id || 'q'}_${idx}_${opt}`}
                  className={`w-full rounded-3xl border-2 px-6 py-7 text-left text-xl md:text-2xl font-black transition-all duration-300 ${feedbackClass}`}
                >
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-center text-sm font-semibold text-slate-300">
          {hasAnswered ? (gotIt ? 'You answered correctly!' : 'Your selected answer was incorrect.') : 'You did not submit an answer this round.'}
        </p>
        <p className="mt-2 text-center font-mono text-sm tabular-nums">Score: <span className="font-black text-amber-300">{myScore}</span></p>
        <p className="mt-2 text-center text-xs uppercase tracking-[0.24em] text-white/60">
          {nextQuestionIn > 0 ? `Next question in ${nextQuestionIn}s` : 'Preparing next question'}
        </p>
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
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-4 animate-phase-in z-0">
        <AnimatedBackground />
        <div className="relative z-10 w-full flex flex-col items-center">
          {renderLeaveAndPing()}
        </div>
        <p className="relative z-10 text-sm uppercase tracking-[0.24em] text-slate-500">Answer Submitted</p>
        <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-4 text-2xl font-black text-emerald-200 shadow-lg shadow-emerald-900/30">{selected}</p>
        <div className={`mt-2 text-3xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timerTone}`}>{timeLeft}s</div>
        <div className="mt-3 flex gap-2">
          <span className="status-dot" />
          <span className="status-dot" />
          <span className="status-dot" />
        </div>
        <p className="text-slate-500 text-sm mt-3">Waiting for others...</p>
      </div>
    );
  }

  if (phase === 'question' && question) {
    const progress = timeTotal > 0 ? Math.max(0, Math.round((timeLeft / timeTotal) * 100)) : 0;
    const isTypeGuessQuestion = question?.answer_mode === 'type_guess';
    return (
      <div className={`relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col p-4 pt-6 md:pb-6 animate-phase-in z-0 ${isTypeGuessQuestion ? 'pb-[50vh]' : 'pb-24'}`}>
        <AnimatedBackground />
        <div className="relative z-10 mb-6 flex items-start justify-between gap-3">
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

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress <= 25 ? 'bg-red-400' : progress <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl px-6 py-8 shadow-2xl shadow-black/50">
          <p className="text-2xl md:text-3xl font-black leading-tight text-white/95 drop-shadow-md">{question.prompt}</p>
        </div>

        {question.image && (
          <div className="mb-8 flex justify-center">
            <img src={resolveImageUrl(question.image)} alt="Question visual" className="max-h-56 md:max-h-72 rounded-2xl object-contain shadow-2xl shadow-black/60 ring-1 ring-white/10" />
          </div>
        )}

        {isTypeGuessQuestion ? (
          <div className="hidden rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-6 md:block shadow-2xl shadow-black/50">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-emerald-400">Type Your Guess</p>
            {chatMode !== 'FREE' && privateGuessHistory.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your Attempts (Private)</p>
                <div className="flex flex-wrap gap-2">
                  {privateGuessHistory.map((entry, idx) => (
                    <button
                      key={`${entry}_${idx}`}
                      type="button"
                      onClick={() => handleReusePrivateGuess(entry)}
                      title={entry}
                      disabled={answeredCorrect === true}
                      className="max-w-full rounded-full border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="block max-w-48 truncate">{entry}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <input
                ref={desktopGuessInputRef}
                type="text"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value.slice(0, 180))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !answeredCorrect) handleGuessSubmit();
                }}
                placeholder="Type your guess..."
                disabled={answeredCorrect === true}
                className={`flex-1 rounded-full border border-white/20 bg-slate-950/60 px-6 py-4 text-base font-semibold text-white placeholder:text-slate-400 shadow-inner focus:border-emerald-400/80 focus:ring-4 focus:ring-emerald-400/20 focus:outline-none transition-all ${answeredCorrect === true ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
              <button
                onClick={handleGuessSubmit}
                className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-8 py-4 text-sm font-black tracking-wide text-teal-950 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                disabled={!guessText.trim() || answeredCorrect === true}
              >
                GUESS
              </button>
            </div>
            {guessFeedback && <p className="mt-3 text-xs font-semibold text-emerald-300">{guessFeedback}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 content-start">
            {question.options.map((opt, idx) => (
              <button
                key={`${question?.q_id || 'q'}_${idx}_${opt}`}
                onClick={() => handleAnswer(opt)}
                className={`group relative overflow-hidden w-full rounded-3xl border-2 px-6 py-7 text-left text-xl md:text-2xl font-black transition-all duration-300 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] shadow-lg hover:shadow-2xl backdrop-blur-md ${
                  idx % 4 === 0
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-50 hover:border-sky-400 hover:bg-sky-500/20 hover:shadow-sky-500/20'
                    : idx % 4 === 1
                      ? 'border-violet-500/30 bg-violet-500/10 text-violet-50 hover:border-violet-400 hover:bg-violet-500/20 hover:shadow-violet-500/20'
                      : idx % 4 === 2
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-50 hover:border-rose-400 hover:bg-rose-500/20 hover:shadow-rose-500/20'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-50 hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-amber-500/20'
                }`}
              >
                <div className="relative z-10">{opt}</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-3 md:block">
          <Chat
            socket={chatSocket}
            roomPin={LAN_ROOM}
            title="Room Chat"
            initialMode={chatMode}
            initialAllowed={chatAllowed}
            suppressFreeComposer={isTypeGuessQuestion}
            showMeta={!isTypeGuessQuestion}
            showModeBadge={!isTypeGuessQuestion}
          />
        </div>

        {isTypeGuessQuestion && (
          <div
            className="fixed inset-x-0 bottom-0 z-40 flex h-[40vh] flex-col border-t border-white/10 bg-black/60 backdrop-blur-2xl p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] md:hidden"
            style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
          >
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/80">Guess + Chat</p>

            <div className="min-h-0 flex-1 rounded-2xl border border-white/5 bg-white/5 p-1.5 overflow-hidden">
              <Chat
                socket={chatSocket}
                roomPin={LAN_ROOM}
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={chatAllowed}
                suppressFreeComposer
                showMeta={false}
                showModeBadge={false}
              />
            </div>

            <div className="mt-1.5 border-t border-white/10 pt-2">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/50">Type Your Guess</p>
              {chatMode !== 'FREE' && privateGuessHistory.length > 0 && (
                <div className="mb-1.5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {privateGuessHistory.map((entry, idx) => (
                    <button
                      key={`${entry}_${idx}`}
                      type="button"
                      onClick={() => handleReusePrivateGuess(entry)}
                      title={entry}
                      disabled={answeredCorrect === true}
                      className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="block max-w-36 truncate">{entry}</span>
                    </button>
                  ))}
                </div>
              )}
              {guessFeedback && <p className="mb-1.5 text-xs font-semibold text-emerald-300">{guessFeedback}</p>}
              <div className="flex gap-2">
                <input
                  ref={mobileGuessInputRef}
                  type="text"
                  value={guessText}
                  onChange={(e) => setGuessText(e.target.value.slice(0, 180))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !answeredCorrect) handleGuessSubmit();
                  }}
                  placeholder={answeredCorrect ? 'Answer submitted' : 'Type your guess here...'}
                  disabled={answeredCorrect === true}
                  className={`min-h-14 flex-1 rounded-full border border-white/20 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-white shadow-inner placeholder:text-slate-400 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none transition-all ${answeredCorrect === true ? 'cursor-not-allowed opacity-40' : ''}`}
                />
                <button
                  onClick={handleGuessSubmit}
                  className="min-h-14 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-black tracking-wide text-teal-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  disabled={!guessText.trim() || answeredCorrect === true}
                >
                  GUESS
                </button>
              </div>
            </div>
          </div>
        )}

        {!isTypeGuessQuestion && (
          <button
            onClick={() => setChatDrawerOpen(true)}
            className="fixed bottom-4 right-4 z-30 rounded-full border-2 border-emerald-400/40 bg-black/50 backdrop-blur-xl px-6 py-3.5 text-sm font-black tracking-[0.2em] text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] active:translate-y-0 active:scale-95 md:hidden"
            style={{ marginBottom: 'max(0px, env(safe-area-inset-bottom))' }}
          >
            CHAT
          </button>
        )}

        {!isTypeGuessQuestion && chatDrawerOpen && (
          <>
            <button
              aria-label="Close chat drawer"
              onClick={() => setChatDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex h-[62vh] max-h-140 flex-col rounded-t-[2rem] border-t border-white/10 bg-black/60 backdrop-blur-2xl p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] md:hidden">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/80">Room Chat</p>
                <button
                  onClick={() => setChatDrawerOpen(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-black text-white/80 transition-all hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Chat socket={chatSocket} roomPin={LAN_ROOM} title="Room Chat" initialMode={chatMode} initialAllowed={chatAllowed} />
              </div>
            </div>
          </>
        )}
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
          <Chat socket={chatSocket} roomPin={LAN_ROOM} title="Lobby Chat" initialMode={chatMode} initialAllowed={chatAllowed} />
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