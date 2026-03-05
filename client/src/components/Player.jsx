import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Player({ onBack }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('game_started', () => setGameStarted(true));
    socket.on('room_closed', ({ message }) => { setError(message); setJoined(false); });
    return () => socket.disconnect();
  }, []);

  const handleJoin = () => {
    if (!playerName.trim()) return setError('Enter your name.');
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be 4 digits.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    setError('');
    socketRef.current.emit('join_room', { playerName, pin }, (res) => {
      if (res.success) { setRoomName(res.roomName); setJoined(true); }
      else setError(res.error || 'Could not join.');
    });
  };

  // ── GAME STARTED ──────────────────────────────────────────────────────────
  if (gameStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-2">
        <p className="text-3xl font-black tracking-tighter">Game started</p>
        <p className="text-zinc-500 text-sm font-mono">{playerName} · {roomName}</p>
      </div>
    );
  }

  // ── WAITING ───────────────────────────────────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl font-black text-yellow-400">
          {playerName[0]?.toUpperCase()}
        </div>
        <p className="text-xl font-black">{playerName}</p>
        <p className="text-zinc-600 text-xs font-mono">{roomName}</p>
        <p className="text-zinc-700 text-xs mt-6">waiting for host...</p>
      </div>
    );
  }

  // ── JOIN ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-5 left-5 text-zinc-600 hover:text-white text-sm transition-colors">
        ← back
      </button>

      <h1 className="text-5xl font-black tracking-tighter mb-10">Join game</h1>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          placeholder="your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-4 text-white text-lg font-semibold placeholder-zinc-600 focus:outline-none transition-colors"
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-4 text-white text-3xl font-black text-center tracking-[0.5em] placeholder-zinc-700 focus:outline-none transition-colors"
        />

        {error && <p className="text-red-500 text-xs font-mono">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={!connected}
          className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-30 text-black font-black text-xl py-4 rounded-xl transition-all duration-100 mt-1"
        >
          JOIN
        </button>

        <p className={`text-center text-xs font-mono ${connected ? 'text-green-500' : 'text-yellow-500'}`}>
          {connected ? 'connected' : 'connecting...'}
        </p>
      </div>
    </div>
  );
}
