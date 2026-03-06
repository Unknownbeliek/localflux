import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Player({ onBack }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');

  const [phase, setPhase] = useState('join');
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [finalScores, setFinalScores] = useState([]);

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3000`, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room_closed', () => { setError('Room closed by host.'); setPhase('join'); });
    socket.on('game_started', () => setPhase('waiting'));
    socket.on('next_question', ({ question }) => {
      setQuestion(question);
      setSelected(null);
      setResultData(null);
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
    return () => socket.disconnect();
  }, []);

  const handleJoin = () => {
    if (!name.trim()) return setError('Enter your name.');
    if (pin.length < 4) return setError('Enter the 4-digit PIN.');
    if (!socketRef.current?.connected) return setError('Not connected.');
    setError('');
    socketRef.current.emit('join_room', { pin, playerName: name.trim() }, (res) => {
      if (res.success) { setRoomName(res.roomName); setPhase('waiting'); }
      else setError(res.error || 'Could not join.');
    });
  };

  const handleAnswer = (opt) => {
    if (selected) return;
    setSelected(opt);
    setPhase('answered');
    socketRef.current.emit('submit_answer', { pin, answer: opt });
  };

  if (phase === 'gameover') {
    const myEntry = finalScores.find(p => p.id === socketRef.current?.id);
    const myRank = finalScores.findIndex(p => p.id === socketRef.current?.id) + 1;
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <p className="text-xs text-zinc-500 font-mono mb-8">game over</p>
        <h2 className="text-3xl font-black mb-2">Done</h2>
        {myEntry && (
          <p className="text-zinc-400 text-sm mb-8 font-mono">
            you placed #{myRank} with {myEntry.score} pts
          </p>
        )}
        <div className="flex flex-col gap-3 flex-1">
          {finalScores.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                p.id === socketRef.current?.id
                  ? 'bg-yellow-400 border-yellow-400 text-black'
                  : 'bg-zinc-900 border-zinc-800 text-white'
              }`}
            >
              <span className="font-mono text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black">{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} className="w-full mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-lg py-4 rounded-xl transition-all duration-100">
          HOME
        </button>
      </div>
    );
  }

  if (phase === 'result' && resultData) {
    const gotIt = selected === resultData.correct_answer;
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 gap-6">
        <div className={`text-6xl font-black ${gotIt ? 'text-green-400' : 'text-red-500'}`}>
          {gotIt ? '+100' : 'WRONG'}
        </div>
        <p className="text-zinc-400 text-sm">answer: <span className="text-white font-bold">{resultData.correct_answer}</span></p>
        <p className="text-zinc-500 font-mono text-sm">your score: <span className="text-yellow-400 font-black">{myScore}</span></p>
        <p className="text-zinc-700 text-xs mt-4">waiting for host...</p>
      </div>
    );
  }

  if (phase === 'answered') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-xl font-bold text-zinc-300">Locked in:</p>
        <p className="text-2xl font-black text-yellow-400">{selected}</p>
        <p className="text-zinc-600 text-sm mt-6">waiting for others...</p>
      </div>
    );
  }

  if (phase === 'question' && question) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col p-6 pt-10">
        <p className="text-xs text-zinc-500 font-mono mb-8">{roomName}</p>
        <p className="text-xl font-bold leading-snug mb-10">{question.prompt}</p>
        <div className="grid grid-cols-1 gap-4 flex-1 content-start">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 hover:border-yellow-400 text-white text-lg font-semibold py-5 px-4 rounded-xl text-left transition-all duration-100"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <p className="text-2xl font-black">{roomName || 'Lobby'}</p>
        <p className="text-zinc-500 text-sm font-mono">waiting for host to start...</p>
        <p className={`text-xs font-mono mt-4 ${connected ? 'text-green-500' : 'text-red-500'}`}>
          {connected ? 'connected' : 'reconnecting...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-5 left-5 text-zinc-600 hover:text-white text-sm transition-colors">back</button>
      <h1 className="text-5xl font-black tracking-tighter mb-10">Join game</h1>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-4 text-white text-lg font-semibold placeholder-zinc-600 focus:outline-none transition-colors"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Room PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-4 text-white text-lg font-semibold placeholder-zinc-600 focus:outline-none tracking-widest transition-colors"
        />
        {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={!connected}
          className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 disabled:opacity-30 text-black font-black text-xl py-4 rounded-xl transition-all duration-100"
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