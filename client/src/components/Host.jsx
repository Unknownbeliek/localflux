import { useState, useEffect, useRef } from 'react';
import Chat from './Chat';
import { createGameSocket, getBackendUrl } from '../backendUrl';
import { useHostToken } from '../context/HostTokenProvider';
import { QRCodeSVG } from 'qrcode.react';
import { Rocket, Shield, Zap, Flame } from 'lucide-react';
import PingIndicator from './PingIndicator';

const HOST_SESSION_KEY = 'lf_host_session_id';
const HOST_STATE_KEY = 'lf_host_state';
const HOST_ICON_AVATARS = {
  rocket: Rocket,
  shield: Shield,
  zap: Zap,
  flame: Flame,
};
const HOST_GRADIENT_AVATARS = {
  emerald: 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600',
  sunset: 'bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600',
  ocean: 'bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-700',
  neon: 'bg-gradient-to-br from-lime-300 via-green-500 to-emerald-700',
};

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { type: 'gradient', value: 'emerald' };
  if (!['preset', 'gradient', 'icon'].includes(input.type)) return { type: 'gradient', value: 'emerald' };
  const value = String(input.value || '').trim();
  if (!value) return { type: 'gradient', value: 'emerald' };
  return { type: input.type, value };
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

export default function Host({ onBack, studioQuestions = null }) {
  const { token: hostToken } = useHostToken();
  const savedHostState = readHostState();
  const hostSessionIdRef = useRef(getOrCreateHostSessionId());
  const resumeAttemptedRef = useRef(false);
  const socketRef = useRef(null);
  const [hostSocket, setHostSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState(savedHostState?.roomName || '');
  const [pin, setPin] = useState(savedHostState?.pin || null);
  const [players, setPlayers] = useState(savedHostState?.players || []);
  const [error, setError] = useState('');
  const [resumeNotice, setResumeNotice] = useState(savedHostState?.pin ? 'Reconnecting to your previous room...' : '');

  const [phase, setPhase] = useState(savedHostState?.pin ? 'lobby' : 'setup');
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
  const [availableDecks, setAvailableDecks] = useState([]);
  const [deckLabel, setDeckLabel] = useState('Default');
  const [recentlyUpdatedPlayerIds, setRecentlyUpdatedPlayerIds] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const profilePulseTimersRef = useRef(new Map());
  const modeOptions = ['FREE', 'RESTRICTED', 'OFF'];
  const modeLabels = { FREE: 'OPEN', RESTRICTED: 'GUIDED', OFF: 'SILENT' };

  useEffect(() => {
    if (!pin && !roomName) return;
    persistHostState({
      pin,
      roomName,
      players,
      phase,
      deckLabel,
      updatedAt: Date.now(),
    });
  }, [pin, roomName, players, phase, deckLabel]);

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;
    setHostSocket(socket);
    socket.on('connect', () => {
      setConnected(true);

      const recoveredState = readHostState();
      if (resumeAttemptedRef.current || !recoveredState?.pin) return;

      resumeAttemptedRef.current = true;
      socket.emit(
        'host:resume',
        { pin: recoveredState.pin, hostSessionId: hostSessionIdRef.current },
        (res) => {
          if (!res?.success) {
            clearHostState();
            setPin(null);
            setPlayers([]);
            setPhase('setup');
            setResumeNotice('');
            setError('Previous host room was not recoverable. Create a new room.');
            return;
          }

          setError('');
          setResumeNotice('');
          setPin(recoveredState.pin);
          setRoomName(res.roomName || recoveredState.roomName || '');
          setPlayers(Array.isArray(res.players) ? res.players : []);

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
    socket.on('room_closed', ({ message }) => { setError(message); setPhase('setup'); setPin(null); clearHostState(); });
    socket.on('game_started', () => setPhase('question'));
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
    return () => {
      profilePulseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      profilePulseTimersRef.current.clear();
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

  // Fetch available decks on mount
  useEffect(() => {
    fetch(`${getBackendUrl()}/api/decks`)
      .then(r => r.json())
      .then(decks => {
        setAvailableDecks(decks);
        if (decks.length > 0) {
          setDeckLabel(decks[0].name);
        }
      })
      .catch(err => console.error('Failed to fetch decks:', err));
  }, []);

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    if (!hostToken) return setError('Host token invalid. Restart the application.');
    setError('');
    const payload = { roomName, hostSessionId: hostSessionIdRef.current, hostToken };
    if (Array.isArray(studioQuestions) && studioQuestions.length > 0) {
      payload.deckQuestions = studioQuestions;
    }

    socketRef.current.emit('create_room', payload, (res) => {
      if (res.success) { setPin(res.pin); setPhase('lobby');
        // apply the selected chat mode immediately for the new room
        if (chatMode) {
          const payload = { pin: res.pin, mode: chatMode, hostToken };
          if (chatMode === 'RESTRICTED' && allowedList.length > 0) payload.allowed = allowedList;
          socketRef.current.emit('chat:host_set_mode', payload, (ack) => {
            if (!ack?.ok) setError(ack?.reason || 'Failed to set chat mode');
          });
        }
      }
      else setError('Failed to create room.');
    });
  };

  const handleStart = () => {
    if (!socketRef.current?.connected) return setError('Lost connection.');
    setError('');
    socketRef.current.emit('start_game', { pin }, (res) => {
      if (!res?.success) setError(res?.error || 'Could not start.');
    });
  };

  const handleNext = () => {
    socketRef.current.emit('next_question', { pin });
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
    if (!pin || !socketRef.current?.connected) return;
    setError('');
    const payload = { pin, mode };
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
    const hasActiveRoom = Boolean(pin) || phase !== 'setup';
    if (hasActiveRoom) {
      const confirmed = window.confirm('Leave host view? This can disrupt players in the room.');
      if (!confirmed) return;
    }
    clearHostState();
    onBack?.();
  };

  const renderLobbyAvatar = (player) => {
    const avatarObject = normalizeAvatarObject(player?.avatarObject);
    if (avatarObject.type === 'preset') {
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
    }

    if (avatarObject.type === 'icon') {
      const AvatarIcon = HOST_ICON_AVATARS[avatarObject.value] || Rocket;
      return (
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-200">
          <AvatarIcon size={20} strokeWidth={2.3} />
        </div>
      );
    }

    const gradientClass = HOST_GRADIENT_AVATARS[avatarObject.value] || HOST_GRADIENT_AVATARS.emerald;
    return <div className={`mx-auto mb-2 h-10 w-10 rounded-full border border-white/20 ${gradientClass}`} />;
  };

  if (phase === 'gameover') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 pt-10 animate-phase-in">
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-slate-500">Final Scores</p>
        <h2 className="text-4xl font-black tracking-tight mb-8">Results</h2>
        <div className="flex flex-col gap-3 flex-1">
          {finalScores.map((p, i) => (
            <div key={p.name} className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${i === 0 ? 'border-amber-300/50 bg-amber-300/15 text-amber-100' : 'border-slate-800 bg-slate-900/80 text-white'}`}>
              <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black text-amber-300 tabular-nums">{p.score}</span>
            </div>
          ))}
        </div>
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
                roomPin={pin}
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
        <div className="relative z-10 mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div className="flex flex-col gap-4">
            <header className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
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

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Room PIN & Join Link</div>
                <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
                  <p className="mb-3 text-xs text-slate-500">Scan to Join</p>
                  <div className="mx-auto flex w-full max-w-xs items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
                    <div className="relative">
                      <QRCodeSVG value={joinUrl} size={256} level="H" includeMargin className="h-56 w-56 md:h-64 md:w-64" />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="rounded-lg border border-emerald-400/40 bg-slate-950 px-2.5 py-1.5 text-[11px] font-black tracking-[0.16em] text-emerald-300 shadow-md shadow-black/30">
                          LF
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-5 text-center">
                  <div className="mb-1 text-xs text-slate-500">Room PIN</div>
                  <div className="text-6xl font-black tracking-tight text-emerald-300 tabular-nums">{pin || '----'}</div>
                </div>

                <button onClick={copyLink} className="w-full rounded-xl bg-emerald-400 px-3 py-3 text-sm font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95">
                  {copied ? 'Copied!' : 'Copy Join Link'}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 text-[11px] uppercase tracking-[0.26em] text-slate-500">Active Deck</div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="text-sm font-semibold text-emerald-300">{deckLabel}</div>
                </div>
                <label className="mb-2 block text-xs text-slate-500">Select Deck</label>
                <select
                  value={deckLabel}
                  onChange={(e) => setDeckLabel(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-emerald-300 focus:border-emerald-500 focus:outline-none"
                >
                  {availableDecks.map((deck) => (
                    <option key={deck.name} value={deck.name}>
                      {deck.name} ({deck.count} questions)
                    </option>
                  ))}
                </select>
                <p className="mt-4 text-xs text-slate-500">Ready to play</p>
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
                    disabled={players.length === 0}
                    className={`rounded-2xl px-8 py-4 text-lg font-black transition-all duration-150 ${
                      players.length === 0
                        ? 'cursor-not-allowed bg-slate-700 text-slate-500'
                        : 'bg-emerald-400 text-black hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95'
                    }`}
                  >
                    START GAME
                  </button>
                  {players.length === 0 && <p className="mt-2 text-xs text-slate-500">Waiting for at least 1 player.</p>}
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
                roomPin={pin}
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