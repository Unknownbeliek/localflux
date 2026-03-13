import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function Chat({ socket, roomPin }) {
  const [mode, setMode] = useState('OFF');
  const [allowed, setAllowed] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:mode', ({ mode, allowed: a }) => { setMode(mode); if (a) setAllowed(a); });
    socket.on('chat:message', (m) => setMessages((s) => [...s, m]));
    socket.on('chat:muted', () => setMuted(true));
    socket.on('chat:unmuted', () => setMuted(false));
    return () => {
      socket.off('chat:mode');
      socket.off('chat:message');
      socket.off('chat:muted');
      socket.off('chat:unmuted');
    };
  }, [socket]);

  const sendFree = () => {
    if (muted) { alert('You are muted by the host.'); return; }
    if (!input.trim()) return;
    socket.emit('chat:free', { roomPin, text: input.trim() }, (ack) => {
      if (!ack?.ok) {
        // simple feedback
        alert(ack.reason || 'Message blocked');
      } else {
        setInput('');
      }
    });
  };

  const sendPre = (id) => {
    if (muted) { alert('You are muted by the host.'); return; }
    socket.emit('chat:pre', { roomPin, id }, (ack) => {
      if (!ack?.ok) alert(ack.reason || 'Not allowed');
    });
  };

  if (mode === 'OFF') return null;

  return (
    <div className="chat-panel">
      <div className="messages h-40 overflow-auto mb-2">
        {messages.map((m, i) => (
          <div key={i} className="text-sm text-white">
            <span className="font-mono text-xs text-zinc-400 mr-2">{new Date(m.ts).toLocaleTimeString()}</span>
            <strong className="mr-2">{m.name}:</strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      {muted && (
        <div className="mb-2 text-xs text-red-400">You are muted by the host. Messages are disabled.</div>
      )}

      {mode === 'RESTRICTED' ? (
        <div className="grid grid-cols-4 gap-2">
          {allowed.map(a => (
            <button key={a.id} onClick={() => sendPre(a.id)} className="bg-zinc-900 rounded-xl px-3 py-2 text-sm" disabled={muted}>{a.text}</button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-zinc-900 rounded-xl px-3 py-2 text-white text-sm" disabled={muted} />
          <button onClick={sendFree} className="bg-yellow-400 px-4 py-2 rounded-xl font-black" disabled={muted}>SEND</button>
        </div>
      )}
    </div>
  );
}
