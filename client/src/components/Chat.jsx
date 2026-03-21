import { useEffect, useMemo, useRef, useState } from 'react';

export default function Chat({ socket, roomPin, readOnly = false, title = 'Chat', allowHostActions = false, onHostMute, mutedSet = new Set(), initialMode = 'FREE', initialAllowed = [], suppressFreeComposer = false, showMeta = true, showModeBadge = true }) {
  const [mode, setMode] = useState(initialMode || 'FREE');
  const [allowed, setAllowed] = useState(Array.isArray(initialAllowed) ? initialAllowed : []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [muted, setMuted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const messagesViewportRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const modeLabels = {
    FREE: 'OPEN',
    RESTRICTED: 'GUIDED',
    OFF: 'SILENT',
  };

  useEffect(() => {
    if (!socket) return undefined;

    const handleMode = ({ mode: nextMode, allowed: nextAllowed }) => {
      setMode(nextMode);
      if (nextAllowed) setAllowed(nextAllowed);
    };
    const handleMessage = (message) => setMessages((current) => [...current, message].slice(-300));
    const handleMuted = () => setMuted(true);
    const handleUnmuted = () => setMuted(false);

    socket.on('chat:mode', handleMode);
    socket.on('chat:message', handleMessage);
    socket.on('chat:muted', handleMuted);
    socket.on('chat:unmuted', handleUnmuted);

    return () => {
      socket.off('chat:mode', handleMode);
      socket.off('chat:message', handleMessage);
      socket.off('chat:muted', handleMuted);
      socket.off('chat:unmuted', handleUnmuted);
    };
  }, [socket]);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (Array.isArray(initialAllowed)) setAllowed(initialAllowed);
  }, [initialAllowed]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport || !shouldStickToBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const placeholder = useMemo(() => {
    if (muted) return 'You are muted by Host';
    if (mode === 'OFF') return 'Chat is in silent mode';
    if (mode === 'RESTRICTED') return 'Pick a guided message below';
    return 'Say something to the room';
  }, [mode, muted]);

  const isInputDisabled = readOnly || muted || mode !== 'FREE';
  const canSend = !isInputDisabled && input.trim().length > 0;
  const isSocketReady = Boolean(socket?.connected);

  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const prev = messages[index - 1];
      const prevSender = prev ? `${prev.from || ''}|${prev.name || ''}` : '';
      const currentSender = `${message.from || ''}|${message.name || ''}`;
      const showSender = index === 0 || prevSender !== currentSender;
      return {
        ...message,
        _showSender: showSender,
      };
    });
  }, [messages]);

  const sendFree = () => {
    if (!isSocketReady) {
      setFeedback('Reconnecting to chat...');
      return;
    }
    if (muted) {
      setFeedback('You are muted by the Host.');
      return;
    }
    if (mode === 'OFF') {
      setFeedback('Chat is in silent mode.');
      return;
    }
    if (mode !== 'FREE') {
      setFeedback('Free text is unavailable in restricted mode.');
      return;
    }
    if (!input.trim()) return;

    socket.emit('chat:free', { roomPin, text: input.trim() }, (ack) => {
      if (!ack?.ok) {
        setFeedback(ack.reason || 'Message blocked');
        return;
      }
      setInput('');
      setFeedback('');
    });
  };

  const sendPre = (id) => {
    if (!isSocketReady) {
      setFeedback('Reconnecting to chat...');
      return;
    }
    if (muted) {
      setFeedback('You are muted by the Host.');
      return;
    }

    socket.emit('chat:pre', { roomPin, id }, (ack) => {
      if (!ack?.ok) setFeedback(ack.reason || 'Not allowed');
    });
  };

  return (
    <div className={`flex h-full flex-col text-white ${showMeta || showModeBadge ? 'gap-2' : 'gap-1.5'}`}>
      {(showMeta || showModeBadge) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
          {showMeta ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
              <p className="mt-0.5 text-xs text-slate-400/90">
                {readOnly ? 'Live room feed' : mode === 'FREE' ? 'Open chat enabled' : mode === 'RESTRICTED' ? 'Guided mode' : 'Silent mode enabled'}
              </p>
            </div>
          ) : <div />}
          {showModeBadge && (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] ${
              mode === 'FREE'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : mode === 'RESTRICTED'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}>
              {modeLabels[mode] || mode}
            </span>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/70">
        <div className="flex h-full flex-col">
          <div
            ref={messagesViewportRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              shouldStickToBottomRef.current = distanceFromBottom < 48;
            }}
            className="min-h-24 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2"
          >
            {messages.length === 0 ? (
              <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/70 px-3 py-3 text-center text-xs text-slate-500">
                No messages yet.
              </div>
            ) : (
              groupedMessages.map((message, index) => (
                <div
                  key={`${message.ts}-${index}`}
                  className={`group px-1 py-0.5 ${
                    message._showSender
                      ? 'mt-1.5 first:mt-0'
                      : 'mt-0.5'
                  }`}
                >
                  {message._showSender ? (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="inline-block max-w-full rounded-2xl border border-slate-600/40 bg-transparent px-2.5 py-1.5 text-[13px] leading-5 text-slate-100 break-words">
                          <span className="mr-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300/90">{message.name}</span>
                          <span>{message.text}</span>
                        </p>
                        {allowHostActions && readOnly && message.from && onHostMute && message.name !== 'Host' && (
                          <button
                            onClick={() => onHostMute(message.from)}
                            className={`mt-1 hidden rounded-md px-2 py-0.5 text-xs font-semibold transition group-hover:inline-flex ${
                              mutedSet.has(message.from)
                                ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                                : 'border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                            }`}
                            disabled={mutedSet.has(message.from)}
                          >
                            {mutedSet.has(message.from) ? 'Muted' : 'Mute'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="ml-0.5 inline-block max-w-full rounded-2xl border border-slate-600/40 bg-transparent px-2.5 py-1.5 text-[13px] leading-5 text-slate-100 break-words">{message.text}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {!readOnly && (
            <div className="border-t border-slate-800 px-2.5 py-2.5">
              {feedback && <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">{feedback}</p>}

              {mode === 'FREE' && !suppressFreeComposer && (
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendFree()}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
                    disabled={isInputDisabled}
                  />
                  <button
                    onClick={sendFree}
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    disabled={!canSend || !isSocketReady}
                  >
                    Send
                  </button>
                </div>
              )}

              {mode === 'RESTRICTED' && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Quick Replies</p>
                  <div className="overflow-x-auto overflow-y-hidden pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max gap-1.5 pr-1">
                    {allowed.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => sendPre(entry.id)}
                        title={entry.text}
                        className="shrink-0 whitespace-nowrap rounded-xl border border-amber-500/35 bg-gradient-to-b from-amber-400/12 to-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300/60 hover:from-amber-400/20 hover:to-amber-500/10 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={muted || mode !== 'RESTRICTED' || !isSocketReady}
                      >
                        <span className="block max-w-36 truncate text-center">{entry.text}</span>
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              )}

              {(muted || mode === 'OFF') && !feedback && (
                <p className="mt-3 text-xs text-slate-500">{placeholder}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
