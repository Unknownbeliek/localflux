import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Host({ onBack }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  const [phase, setPhase] = useState('setup');
  const [question, setQuestion] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('player_joined', ({ players }) => setPlayers(players));
    socket.on('room_closed', ({ message }) => { setError(message); setPhase('setup'); setPin(null); });
    socket.on('game_started', () => setPhase('question'));
    socket.on('next_question', ({ question, index, total }) => {
      setQuestion(question);
      setQIndex(index);
      setQTotal(total);
      setAnswerCount(0);
      setResultData(null);
      setPhase('question');
    });
    socket.on('answer_count', ({ count }) => setAnswerCount(count));
    socket.on('question_result', (data) => { setResultData(data); setPhase('result'); });
    socket.on('game_over', ({ scores }) => { setFinalScores(scores); setPhase('gameover'); });
    return () => socket.disconnect();
  }, []);

  const handleCreate = () => {
    if (!roomName.trim()) return setError('Enter a room name.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    setError('');
    socketRef.current.emit('create_room', { roomName }, (res) => {
      if (res.success) { setPin(res.pin); setPhase('lobby'); }
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

  if (phase === 'gameover') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <p className="text-xs text-zinc-500 font-mono mb-8">final scores</p>
        <h2 className="text-3xl font-black mb-8">Results</h2>
        <div className="flex flex-col gap-3 flex-1">
          {finalScores.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <span className="text-zinc-500 font-mono text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black text-yellow-400">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs text-zinc-500 font-mono">Q{qIndex + 1} / {qTotal}</p>
          <span className={`text-xs font-mono ${connected ? 'text-green-500' : 'text-red-500'}`}>{connected ? 'live' : 'offline'}</span>
        </div>
        <p className="text-xs text-zinc-600 mb-2">correct answer</p>
        <p className="text-2xl font-black text-yellow-400 mb-10">{resultData.correct_answer}</p>
        <p className="text-xs text-zinc-600 mb-4">scores</p>
        <div className="flex flex-col gap-2 flex-1">
          {[...resultData.scores].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.name} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <span className="text-zinc-500 font-mono text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black text-yellow-400">{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={handleNext} className="w-full mt-8 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-xl py-4 rounded-xl transition-all duration-100">
          {qIndex + 1 >= qTotal ? 'FINISH' : 'NEXT QUESTION'}
        </button>
      </div>
    );
  }

  if (phase === 'question' && question) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs text-zinc-500 font-mono">Q{qIndex + 1} / {qTotal}</p>
          <span className="text-xs font-mono text-zinc-500">{answerCount} / {players.length} answered</span>
        </div>
        <p className="text-xl font-bold leading-snug flex-1">{question.prompt}</p>
        <div className="grid grid-cols-2 gap-3 mt-8 mb-6">
          {question.options.map((opt) => (
            <div key={opt} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-300">
              {opt}
            </div>
          ))}
        </div>
        <button onClick={handleNext} className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-lg py-4 rounded-xl transition-all duration-100">
          REVEAL ANSWER
        </button>
      </div>
    );
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <div className="flex items-center justify-between mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{roomName}</p>
          <span className={`text-xs font-mono ${connected ? 'text-green-500' : 'text-red-500'}`}>{connected ? 'live' : 'offline'}</span>
        </div>
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-1">room pin</p>
          <p className="text-8xl font-black tracking-widest text-yellow-400 leading-none">{pin}</p>
        </div>
        <div className="flex-1 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">players - {players.length}</p>
          {players.length === 0 ? (
            <p className="text-zinc-700 text-sm">no players yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((p, i) => (
                <span key={p.id} className="bg-zinc-900 border border-zinc-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
                  {i + 1}. {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mb-3 font-mono">{error}</p>}
        <button onClick={handleStart} disabled={players.length === 0} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-black font-black text-2xl py-5 rounded-xl transition-all duration-100">
          {players.length === 0 ? 'waiting...' : `START  ${players.length} PLAYER${players.length > 1 ? 'S' : ''}`}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-5 left-5 text-zinc-600 hover:text-white text-sm transition-colors">back</button>
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
        <button onClick={handleCreate} disabled={!connected} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-30 text-black font-black text-xl py-4 rounded-xl transition-all duration-100">
          CREATE
        </button>
        <p className={`text-center text-xs mt-3 font-mono ${connected ? 'text-green-500' : 'text-yellow-500'}`}>
          {connected ? 'connected' : 'connecting...'}
        </p>
      </div>
    </div>
  );
}