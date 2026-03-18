import { useState, useEffect, useRef } from 'react';
import Chat from './Chat';
import { createGameSocket } from '../backendUrl';
import { Rocket, Shield, Zap, Flame } from 'lucide-react';

const LAN_ROOM = 'local_flux_main';
const PLAYER_SESSION_KEY = 'lf_player_session_id';
const PLAYER_STATE_KEY = 'lf_player_state';
const PRESET_AVATARS = [
  '1.avf',
  '1.jpg',
  '11.avf',
  '2.jpg',
  '4.jpg',
  '5.jpg',
  '6.avf',
  '7dcc3f3eebc2fccd2f9dd3146c61c914.avf',
  '8.avf',
  'e55afb4aea57bced165fb55ad92addf5.jpg',
];
const GRADIENT_AVATARS = [
  { value: 'emerald', className: 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600' },
  { value: 'sunset', className: 'bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600' },
  { value: 'ocean', className: 'bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-700' },
  { value: 'neon', className: 'bg-gradient-to-br from-lime-300 via-green-500 to-emerald-700' },
];
const ICON_AVATARS = [
  { value: 'rocket', Icon: Rocket },
  { value: 'shield', Icon: Shield },
  { value: 'zap', Icon: Zap },
  { value: 'flame', Icon: Flame },
];

function normalizeAvatarObject(input) {
  if (!input || typeof input !== 'object') return { type: 'gradient', value: 'emerald' };
  if (!['preset', 'gradient', 'icon'].includes(input.type)) return { type: 'gradient', value: 'emerald' };
  if (!String(input.value || '').trim()) return { type: 'gradient', value: 'emerald' };
  return { type: input.type, value: String(input.value).trim() };
}

function resolvePresetPath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/avatars/1.png';
  return trimmed.includes('.') ? `/avatars/${trimmed}` : `/avatars/${trimmed}.png`;
}

function getOrCreatePlayerSessionId() {
  if (typeof window === 'undefined') return '';
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

export default function Player({ onBack }) {
  const savedPlayerState = readPlayerState();
  const playerSessionIdRef = useRef(getOrCreatePlayerSessionId());
  const resumeAttemptedRef = useRef(false);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState(savedPlayerState?.name || 'Guest');
  const [avatarObject, setAvatarObject] = useState(normalizeAvatarObject(savedPlayerState?.avatarObject));
  const [avatarTab, setAvatarTab] = useState(savedPlayerState?.avatarObject?.type || 'preset');
  const [isEditingName, setIsEditingName] = useState(false);
  const [hiddenPresetPaths, setHiddenPresetPaths] = useState(() => new Set());
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState(savedPlayerState?.roomName || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [phase, setPhase] = useState('joining');
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  const [chatMode, setChatMode] = useState('FREE');
  const [chatAllowed, setChatAllowed] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeTotal, setTimeTotal] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(0);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const modeLabels = { FREE: 'OPEN', RESTRICTED: 'GUIDED', OFF: 'SILENT' };

  useEffect(() => {
    if (!name.trim() && !roomName.trim()) return;
    persistPlayerState({
      name: name.trim(),
      avatarObject,
      roomName: roomName.trim(),
      updatedAt: Date.now(),
    });
  }, [name, avatarObject, roomName]);

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);

      // Auto-join to LAN room on connect
      socket.emit(
        'join',
        {
          playerName: name || 'Guest',
          playerSessionId: playerSessionIdRef.current,
        },
        (res) => {
          if (!res?.success) {
            setError(res?.error || 'Could not join game.');
            return;
          }

          setError('');
          setRoomName(res.roomName || 'LocalFlux Game');
          if (res.chatMode) setChatMode(res.chatMode);
          if (Array.isArray(res.chatAllowed)) setChatAllowed(res.chatAllowed);
          setMyScore(Number(res.myScore) || 0);
          setPhase('waiting');
        }
      );
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('player:profileUpdated', ({ player }) => {
      if (!player || player.id !== socket.id) return;
      if (typeof player.name === 'string') setName(player.name);
      setAvatarObject(normalizeAvatarObject(player.avatarObject));
    });
    socket.on('chat:mode', ({ mode, allowed }) => {
      if (mode) setChatMode(mode);
      if (Array.isArray(allowed)) setChatAllowed(allowed);
    });
    socket.on('room_closed', ({ message }) => {
      setError(message || 'Room closed by host.');
      setPhase('join');
      setRoomName('');
      clearPlayerState();
    });
    socket.on('game_started', () => setPhase('waiting'));
    socket.on('next_question', ({ question, durationMs, endsAt }) => {
      setQuestion(question);
      setSelected(null);
      setResultData(null);
      setChatDrawerOpen(false);
      const limitMs = Number(durationMs ?? question?.time_limit_ms);
      const normalizedMs = Number.isFinite(limitMs) && limitMs > 0 ? limitMs : 20000;
      const targetEndsAt = Number(endsAt) || Date.now() + normalizedMs;
      setTimeTotal(Math.ceil(normalizedMs / 1000));
      setQuestionEndsAt(targetEndsAt);
      setTimeLeft(Math.max(0, Math.ceil((targetEndsAt - Date.now()) / 1000)));
      setPhase('question');
    });
    socket.on('question_result', (data) => {
      setResultData(data);
      const me = data.scores.find(p => p.id === socket.id);
      if (me) setMyScore(me.score);
      setPhase('result');
    });
    socket.on('game_over', ({ scores }) => {
      setFinalScores(scores);
      setPhase('gameover');
    });
    return () => {
      socket.off('chat:mode');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!(phase === 'question' || phase === 'answered') || !questionEndsAt) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((questionEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, questionEndsAt]);

  const handleBack = () => {
    clearPlayerState();
    onBack?.();
  };

  const handleLeaveRoom = () => {
    const ok = window.confirm('Leave this room and return home?');
    if (!ok) return;
    handleBack();
  };

  const handleAnswer = (opt) => {
    if (selected) return;
    setSelected(opt);
    setChatDrawerOpen(false);
    setPhase('answered');
    socketRef.current.emit('submit_answer', { answer: opt });
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
    if (avatarObject.type === 'preset') {
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
    }
    if (avatarObject.type === 'icon') {
      const iconEntry = ICON_AVATARS.find((entry) => entry.value === avatarObject.value) || ICON_AVATARS[0];
      const AvatarIcon = iconEntry.Icon;
      return (
        <div className={`${sizeClass} rounded-full border border-emerald-500/40 bg-emerald-500/15 flex items-center justify-center text-emerald-200`}>
          <AvatarIcon size={22} strokeWidth={2.4} />
        </div>
      );
    }

    const gradient = GRADIENT_AVATARS.find((entry) => entry.value === avatarObject.value)?.className || GRADIENT_AVATARS[0].className;
    return <div className={`${sizeClass} rounded-full border border-white/20 ${gradient}`} />;
  };

  const timerTone =
    timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.25)
      ? 'text-red-400'
      : timeTotal > 0 && timeLeft <= Math.ceil(timeTotal * 0.5)
        ? 'text-amber-300'
        : 'text-emerald-300';

  if (phase === 'gameover') {
    const myEntry = finalScores.find(p => p.id === socketRef.current?.id);
    const myRank = finalScores.findIndex(p => p.id === socketRef.current?.id) + 1;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 pt-8 animate-phase-in">
        <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-slate-500">Game Over</p>
        <h2 className="text-4xl font-black tracking-tight mb-2">Final Standings</h2>
        {myEntry && (
          <p className="text-slate-400 text-sm mb-6 font-mono tabular-nums">
            You placed #{myRank} with {myEntry.score} pts
          </p>
        )}
        <div className="flex flex-col gap-3 flex-1">
          {finalScores.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-4 border ${
                i === 0
                  ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
                  : p.id === socketRef.current?.id
                    ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100'
                    : 'border-slate-800 bg-slate-900/80 text-white'
              }`}
            >
              <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black tabular-nums">{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={handleBack} className="w-full mt-8 rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95">
          HOME
        </button>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    const gotIt = selected === resultData.correct_answer;
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 gap-6 text-white animate-phase-in ${gotIt ? 'bg-emerald-950' : 'bg-rose-950'}`}>
        <button onClick={handleLeaveRoom} className="absolute top-5 left-5 rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/85 transition hover:bg-black/45">Leave</button>
        <div className={`text-6xl font-black tracking-tight ${gotIt ? 'text-emerald-300' : 'text-rose-300'}`}>
          {gotIt ? 'CORRECT' : 'INCORRECT'}
        </div>
        <p className="rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-center text-sm text-slate-200">
          Correct answer: <span className="font-black text-white">{resultData.correct_answer}</span>
        </p>
        <p className="font-mono text-sm tabular-nums">Score: <span className="font-black text-amber-300">{myScore}</span></p>
        <p className="text-xs uppercase tracking-[0.24em] text-white/60">Waiting for host</p>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-4 animate-phase-in">
        <button onClick={handleLeaveRoom} className="absolute top-5 left-5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:bg-slate-800">Leave</button>
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Answer Locked</p>
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
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 pt-6 pb-24 md:pb-6 animate-phase-in">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <button onClick={handleLeaveRoom} className="mb-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:bg-slate-800">Leave</button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{roomName}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timer</p>
            <p className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timerTone}`}>{timeLeft}s</p>
          </div>
        </div>

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress <= 25 ? 'bg-red-400' : progress <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-6">
          <p className="text-2xl font-black leading-tight">{question.prompt}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 content-start">
          {question.options.map((opt, idx) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className={`w-full rounded-2xl border px-5 py-6 text-left text-xl font-black transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                idx % 4 === 0
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
                  : idx % 4 === 1
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20'
                    : idx % 4 === 2
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-5 hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-3 md:block">
          <Chat socket={socketRef.current} roomPin={LAN_ROOM} title="Room Chat" initialMode={chatMode} initialAllowed={chatAllowed} />
        </div>

        <button
          onClick={() => setChatDrawerOpen(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full border border-emerald-500/40 bg-slate-900/95 px-5 py-3 text-sm font-black tracking-[0.16em] text-emerald-300 shadow-lg shadow-black/40 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 active:scale-95 md:hidden"
        >
          CHAT
        </button>

        {chatDrawerOpen && (
          <>
            <button
              aria-label="Close chat drawer"
              onClick={() => setChatDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
            />
            <div className="fixed inset-x-0 bottom-0 z-50 flex h-[62vh] max-h-[560px] flex-col rounded-t-3xl border border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-black/60 md:hidden">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Room Chat</p>
                <button
                  onClick={() => setChatDrawerOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Chat socket={socketRef.current} roomPin={LAN_ROOM} title="Room Chat" initialMode={chatMode} initialAllowed={chatAllowed} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3 p-5 animate-phase-in">
        <button onClick={handleLeaveRoom} className="absolute top-5 left-5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:bg-slate-800">Leave</button>
        <p className="text-3xl font-black tracking-tight">{roomName || 'Lobby'}</p>
        <p className="text-slate-400 text-sm font-mono">Waiting for host to start...</p>
        <p className={`text-xs font-mono mt-2 ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
          {connected ? 'connected' : 'reconnecting...'}
        </p>

        <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Chat Mode: <span className={`${chatMode === 'FREE' ? 'text-emerald-300' : chatMode === 'RESTRICTED' ? 'text-amber-200' : 'text-slate-500'}`}>{modeLabels[chatMode] || chatMode}</span>
        </div>

        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/75 p-4 shadow-xl shadow-black/30">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Player ID Card</p>
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Username</p>
                  <p className="text-base font-black text-emerald-200">{name || 'Player'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingName((v) => !v)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-emerald-500/40 hover:text-white"
                  >
                    {isEditingName ? 'Close' : 'Edit'}
                  </button>
                  {renderAvatarBadge()}
                </div>
              </div>

              {isEditingName && (
                <>
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 24))}
                    placeholder="Your hacker alias"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-semibold text-white placeholder-slate-500 transition-colors focus:border-emerald-400 focus:outline-none"
                  />
                </>
              )}

              {isEditingName ? (
                <>
                  <div className="mt-4 mb-2 grid grid-cols-3 gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-1">
                    {['preset', 'gradient', 'icon'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setAvatarTab(tab)}
                        className={`rounded-lg py-1.5 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                          avatarTab === tab ? 'bg-emerald-400 text-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {avatarTab === 'preset' && (
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_AVATARS.map((presetId) => (
                        hiddenPresetPaths.has(presetId) ? null :
                        <button
                          key={presetId}
                          onClick={() => setAvatarObject({ type: 'preset', value: presetId })}
                          className={`rounded-xl border p-1 transition ${
                            avatarObject.type === 'preset' && avatarObject.value === presetId
                              ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                          style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' }}
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
                            className="h-14 w-full rounded-lg object-contain p-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {avatarTab === 'gradient' && (
                    <div className="grid grid-cols-4 gap-2">
                      {GRADIENT_AVATARS.map((entry) => (
                        <button
                          key={entry.value}
                          onClick={() => setAvatarObject({ type: 'gradient', value: entry.value })}
                          className={`rounded-xl border p-2 transition ${
                            avatarObject.type === 'gradient' && avatarObject.value === entry.value
                              ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className={`h-10 w-10 mx-auto rounded-full border border-white/20 ${entry.className}`} />
                        </button>
                      ))}
                    </div>
                  )}

                  {avatarTab === 'icon' && (
                    <div className="grid grid-cols-4 gap-2">
                      {ICON_AVATARS.map((entry) => {
                        const AvatarIcon = entry.Icon;
                        const selectedIcon = avatarObject.type === 'icon' && avatarObject.value === entry.value;
                        return (
                          <button
                            key={entry.value}
                            onClick={() => setAvatarObject({ type: 'icon', value: entry.value })}
                            className={`rounded-xl border p-2 transition ${
                              selectedIcon
                                ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-500/40 text-emerald-200'
                                : 'border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="h-10 w-10 mx-auto rounded-full border border-current/30 flex items-center justify-center">
                              <AvatarIcon size={20} strokeWidth={2.3} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    className="mt-4 w-full rounded-xl bg-emerald-400 py-3 text-sm font-black tracking-[0.16em] text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
                  >
                    SAVE PROFILE
                  </button>
                </>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Click Edit to change your name or profile picture.</p>
              )}
            {profileSaved && (
              <p className="mt-2 text-center text-xs text-emerald-300">Profile saved.</p>
            )}
          </div>
        </section>

        <div className="w-full max-w-md mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <Chat socket={socketRef.current} roomPin={LAN_ROOM} title="Lobby Chat" initialMode={chatMode} initialAllowed={chatAllowed} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.20),rgba(2,6,23,0)_70%)]" />
      <button onClick={handleBack} className="absolute top-5 left-5 text-slate-500 hover:text-white text-sm transition-colors">back</button>
      <div className="z-10 w-full max-w-sm animate-phase-in rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <h1 className="text-5xl font-black tracking-tight mb-8">Joining Game</h1>
        <div className="w-full flex flex-col gap-3 items-center justify-center">
          <p className="text-slate-400 mb-4">One moment...</p>
          {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300 w-full text-center">{error}</p>}
          <div className={`flex items-center justify-center gap-2 text-xs font-mono ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
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