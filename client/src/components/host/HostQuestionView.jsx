import { useState } from 'react';
import Chat from '../Chat';
import AnimatedBackground from '../AnimatedBackground';
import ConfirmActionModal from '../ConfirmActionModal';
import BgmControl from '../BgmControl';

function resolveImageUrl(image) {
  if (!image) return null;
  const trimmed = String(image).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('/')) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `/deck-images/${trimmed}`;
}

export default function HostQuestionView({
  question,
  qIndex,
  qTotal,
  answerCount,
  players,
  timeLeft,
  timeTotal,
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
  answerMode,
  answerModeLabels,
  onHostAnnouncement,
  onEndGameRequest,
  isEndGameModalOpen,
  endGameConfirmChecked,
  setEndGameConfirmChecked,
  onEndGameCancel,
  onEndGameConfirm,
  gameMode,
  gameModeOptions,
  gameModeLabels,
  syncGameMode,
}) {
  const roomGameMode = chatMode === 'RESTRICTED' ? 'guided' : 'open';
  const timerProgress = timeTotal > 0 ? Math.max(0, Math.round((timeLeft / timeTotal) * 100)) : 0;
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFeedback, setAnnouncementFeedback] = useState('');

  const handleSendAnnouncement = () => {
    const text = announcementText.trim();
    if (!text || !onHostAnnouncement) return;
    onHostAnnouncement(text, (ack) => {
      if (!ack?.ok) {
        setAnnouncementFeedback('Could not send announcement.');
        return;
      }
      setAnnouncementText('');
      setAnnouncementFeedback('Announcement sent.');
      window.setTimeout(() => setAnnouncementFeedback(''), 1800);
    });
  };

  return (
    <div className="relative min-h-[100dvh] bg-slate-950 text-white p-4 md:p-8 overflow-x-hidden flex flex-col animate-phase-in z-0">
      <AnimatedBackground />
      <div className="relative z-10 w-full mx-auto grid max-w-[1400px] gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(350px,1fr)]">
        <main className="rounded-[2rem] border border-white/10 bg-slate-950/40 backdrop-blur-2xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question {qIndex + 1} / {qTotal}</p>
              <p className="mt-2 text-sm text-slate-400">{answerCount} of {players.length} players answered</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Mode: {answerModeLabels?.[answerMode] || answerMode}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <BgmControl />
              <div className={`rounded-2xl border-2 px-5 py-3 text-right transition-colors duration-300 backdrop-blur-md shadow-xl ${
                timeLeft <= 5
                  ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'border-white/10 bg-black/40'
              }`}>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Timer</p>
                <p className={`text-3xl font-black tabular-nums ${timeLeft <= 5 ? 'animate-pulse' : ''} ${timerTone}`}>{timeLeft}s</p>
              </div>
            </div>
          </div>

          <div className="mb-8 h-2.5 w-full overflow-hidden rounded-full bg-slate-900/80 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-500" style={{ width: `${timerProgress}%` }} />
          </div>

          <div className="mb-8 rounded-3xl border border-white/10 bg-black/20 backdrop-blur-lg px-8 py-8 shadow-inner">
            <p className="text-3xl md:text-4xl font-black leading-tight text-white drop-shadow-md">{question.prompt}</p>
          </div>

          {question.image && (
            <div className="mb-6 flex justify-center">
              <img src={resolveImageUrl(question.image)} alt="Question visual" className="max-h-[30vh] rounded-xl object-contain drop-shadow-lg" />
            </div>
          )}

          {answerMode === 'type_guess' ? (
            <div className="rounded-3xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/10 px-6 py-8 text-center text-lg font-black tracking-wide text-emerald-200 backdrop-blur-md shadow-inner">
              Players submit guesses as chat messages in this round.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {question.options.map((opt, idx) => {
                const optionStyles = [
                  'bg-gradient-to-br from-rose-500 to-pink-600 border-white/20 shadow-xl text-rose-50',
                  'bg-gradient-to-br from-blue-500 to-indigo-600 border-white/20 shadow-xl text-blue-50',
                  'bg-gradient-to-br from-amber-400 to-orange-500 border-white/20 shadow-xl text-white',
                  'bg-gradient-to-br from-emerald-400 to-teal-500 border-white/20 shadow-xl text-emerald-50',
                ];
                return (
                  <div key={opt} className={`rounded-3xl border-2 px-6 py-6 text-xl md:text-2xl font-black backdrop-blur-md transition-all ${optionStyles[idx % 4]}`}>
                    <span className="drop-shadow-md">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm font-black tracking-[0.2em] text-white/50 uppercase">
            ANSWER REVEAL IS AUTOMATIC
          </div>
        </main>

        <aside className="flex flex-col gap-6">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-6 shadow-2xl shadow-black/50">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Chat Mode</p>
                <p className="text-xs text-slate-500 mt-1">{roomGameMode === 'guided' ? 'Guided Mode' : 'Open Mode'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]">LIVE</span>
                <button
                  onClick={onEndGameRequest}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-black tracking-[0.12em] text-rose-200 transition hover:bg-rose-500/20"
                >
                  END GAME
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {modeOptions.map((mode) => (
                <button
                  key={mode}
                  onClick={() => syncChatMode(mode)}
                  className={`rounded-2xl px-3 py-3 text-[11px] font-black tracking-[0.2em] transition-all duration-300 border ${
                    chatMode === mode
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-teal-950 shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-[1.02] border-transparent'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Scoring Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {gameModeOptions.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => syncGameMode(mode)}
                    className={`rounded-lg px-2 py-2.5 text-[10px] font-black tracking-wide transition-all duration-150 ${gameMode === mode
                        ? mode === 'casual'
                          ? 'bg-emerald-400 text-black shadow-md shadow-emerald-500/20'
                          : mode === 'moderate'
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                          : 'bg-rose-400 text-black shadow-md shadow-rose-500/20'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {mode === 'casual' && '🟢'} {mode === 'moderate' && '🟡'} {mode === 'pro' && '🔴'} {mode.toUpperCase()}
                  </button>
                ))}
              </div>
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

          <section className="min-h-[400px] flex-1 flex flex-col rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-3 shadow-2xl shadow-black/50 overflow-hidden">
            <div className="mb-3 rounded-2xl border border-slate-700/40 bg-black/30 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Host Announcement</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={announcementText}
                  onChange={(event) => setAnnouncementText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSendAnnouncement()}
                  placeholder="Broadcast to all players..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  maxLength={280}
                />
                <button
                  onClick={handleSendAnnouncement}
                  disabled={!announcementText.trim()}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Send
                </button>
              </div>
              {announcementFeedback && <p className="mt-2 text-xs text-emerald-300">{announcementFeedback}</p>}
            </div>
            <div className="h-full rounded-2xl border border-white/10 bg-black/25 p-2 overflow-hidden">
              <Chat
                socket={socket}
                roomPin={roomId}
                readOnly
                title="Room Chat"
                initialMode={chatMode}
                initialAllowed={allowedList}
                allowHostActions
                onHostMute={handleMute}
                mutedSet={mutedSet}
              />
            </div>
          </section>
        </aside>
      </div>

      <ConfirmActionModal
        open={isEndGameModalOpen}
        title="End Live Question"
        message="Ending now will stop this question and close the room for all players."
        checkboxLabel="I understand everyone will be disconnected from this live room."
        checked={endGameConfirmChecked}
        onCheckedChange={setEndGameConfirmChecked}
        onCancel={onEndGameCancel}
        onConfirm={onEndGameConfirm}
        confirmLabel="End Room"
      />
    </div>
  );
}
