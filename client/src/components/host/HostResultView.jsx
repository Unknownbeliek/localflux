import { useState } from 'react';
import Chat from '../Chat';
import ConfirmActionModal from '../ConfirmActionModal';
import BgmControl from '../BgmControl';

export default function HostResultView({
  resultData,
  qIndex,
  qTotal,
  connected,
  autoAdvanceIn,
  socket,
  roomId,
  chatMode,
  allowedList,
  handleMute,
  mutedSet,
  onHostAnnouncement,
  onEndGameRequest,
  isEndGameModalOpen,
  endGameConfirmChecked,
  setEndGameConfirmChecked,
  onEndGameCancel,
  onEndGameConfirm,
}) {
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
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-8 animate-phase-in">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <main className="flex min-h-0 flex-col">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question {qIndex + 1} / {qTotal}</p>
            <div className="flex items-center gap-3">
              <BgmControl />
              <span className={`text-xs font-mono ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>{connected ? 'live' : 'offline'}</span>
            </div>
          </div>

          <div className="mb-7 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-5">
            <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">Correct Answer</p>
            <p className="text-3xl font-black text-emerald-200">{resultData.correct_answer}</p>
          </div>

          <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">Leaderboard</p>
          <div className="flex flex-1 flex-col gap-2">
            {[...resultData.scores].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.name} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${i === 0 ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-slate-800 bg-slate-900/80 text-white'}`}>
                <span className="w-6 font-mono text-sm tabular-nums">{i + 1}</span>
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className="font-black tabular-nums text-amber-300">{p.score}</span>
              </div>
            ))}
          </div>

          <div className={`mt-8 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-center text-xl font-black text-emerald-200 ${autoAdvanceIn > 0 && autoAdvanceIn <= 3 ? 'animate-timer-danger' : ''}`}>
            {qIndex + 1 >= qTotal
              ? autoAdvanceIn > 0
                ? `FINISHING IN ${autoAdvanceIn}s`
                : 'FINALIZING ROUND...'
              : autoAdvanceIn > 0
                ? `NEXT QUESTION IN ${autoAdvanceIn}s`
                : 'PREPARING NEXT QUESTION...'}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col gap-4">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Host Announcement</p>
              <button
                onClick={onEndGameRequest}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-black tracking-[0.12em] text-rose-200 transition hover:bg-rose-500/20"
              >
                END GAME
              </button>
            </div>
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
          </section>

          <section className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-3">
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
        title="End Game Session"
        message="Ending here will close the room before the next transition for all players."
        checkboxLabel="I understand all players will be removed from this session."
        checked={endGameConfirmChecked}
        onCheckedChange={setEndGameConfirmChecked}
        onCancel={onEndGameCancel}
        onConfirm={onEndGameConfirm}
        confirmLabel="End Session"
      />
    </div>
  );
}
