import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Host({ onBack }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('player_joined', ({ players }) => setPlayers(players));
    socket.on('game_started', () => setGameStarted(true));
    socket.on('room_closed', ({ message }) => { setError(message); setPin(null); });
    return () => socket.disconnect();
  }, []);

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    setError('');
    socketRef.current.emit('create_room', { roomName }, (res) => {
      if (res.success) setPin(res.pin);
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

  // ── GAME STARTED ──────────────────────────────────────────────────────────
  if (gameStarted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <p className="text-3xl font-black tracking-tighter">Game started</p>
        <p className="text-zinc-500 text-sm font-mono">PIN {pin} · {players.length} players</p>
      </div>
    );
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (pin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{roomName}</p>
          <span className={`text-xs font-mono ${connected ? 'text-green-500' : 'text-red-500'}`}>
            {connected ? 'live' : 'offline'}
          </span>
        </div>

        {/* PIN — the hero element */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-1">room pin</p>
          <p className="text-8xl font-black tracking-widest text-yellow-400 leading-none">{pin}</p>
          <p className="text-zinc-600 text-xs mt-2 font-mono">{roomName}</p>
        </div>

        {/* Player list */}
        <div className="flex-1 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">
            players — <span className="text-white">{players.length}</span>
          </p>
          {players.length === 0 ? (
            <p className="text-zinc-700 text-sm">no players yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((p, i) => (
                <span
                  key={p.id}
                  className="bg-zinc-900 border border-zinc-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                >
                  {i + 1}. {p.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs mb-3 font-mono">{error}</p>}

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={players.length === 0}
          className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-black font-black text-2xl py-5 rounded-xl transition-all duration-100 tracking-tight"
        >
          {players.length === 0 ? 'waiting...' : `START  ${players.length} PLAYER${players.length > 1 ? 'S' : ''}`}
        </button>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-5 left-5 text-zinc-600 hover:text-white text-sm transition-colors">
        ← back
      </button>

      <h1 className="text-5xl font-black tracking-tighter mb-10">New room</h1>

      <div className="w-full max-w-xs">
        <input
          type="text"
          placeholder="Room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-4 text-white text-lg font-semibold placeholder-zinc-600 focus:outline-none transition-colors mb-3"
        />
        {error && <p className="text-red-500 text-xs mb-3 font-mono">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={!connected}
          className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-30 text-black font-black text-xl py-4 rounded-xl transition-all duration-100"
        >
          CREATE
        </button>
        <p className={`text-center text-xs mt-3 font-mono ${connected ? 'text-green-500' : 'text-yellow-500'}`}>
          {connected ? 'connected' : 'connecting...'}
        </p>
      </div>
    </div>
  );
}
