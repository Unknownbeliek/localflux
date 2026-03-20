import Chat from '../Chat';

export default function HostQuestionView({
  question,
  qIndex,
  qTotal,
  answerCount,
  players,
  timeLeft,
  timerTone,
  modeOptions,
  chatMode,
  modeLabels,
  syncChatMode,
  newAllowedText,
  setNewAllowedText,
  addAllowedMessage,
  allowedList,
  removeAllowedMessage,
  socket,
  roomId,
  handleMute,
  mutedSet,
}) {
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

          <div className="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-center text-lg font-black text-slate-300">
            ANSWER REVEAL IS AUTOMATIC
          </div>
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
              socket={socket}
              roomPin={roomId}
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
