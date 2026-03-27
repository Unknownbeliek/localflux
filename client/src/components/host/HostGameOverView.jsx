import { useEffect, useMemo, useState } from 'react';
import LeaderboardResultsCard from '../leaderboard/LeaderboardResultsCard';
import { playGameSfx } from '../../utils/gameFeel';
import { triggerHaptic } from '../../utils/haptics';
import BgmControl from '../BgmControl';

const CELEBRATION_FX_KEY = 'lf_celebration_fx_enabled';

export default function HostGameOverView({
  finalScores,
  handleHostPlayAgainSameDeck,
  handleHostNewRoom,
  handleExportFinalScores,
  handleBack,
  showDraftManager,
  setShowDraftManager,
  cancelRenameStudioDraft,
  setManageNotice,
  manageNotice,
  studioDecks,
  renameDraftId,
  renameDraftTitle,
  setRenameDraftTitle,
  submitRenameStudioDraft,
  startRenameStudioDraft,
  handleDeleteStudioDraft,
}) {
  const [showRevealCurtain, setShowRevealCurtain] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [celebrationFxEnabled, setCelebrationFxEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const value = window.localStorage.getItem(CELEBRATION_FX_KEY);
    return value !== 'false';
  });
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.45}s`,
        duration: `${2.1 + Math.random() * 1.3}s`,
        hue: 130 + Math.floor(Math.random() * 130),
        drift: `${-22 + Math.random() * 44}px`,
      })),
    []
  );

  useEffect(() => {
    setShowConfetti(celebrationFxEnabled);

    if (celebrationFxEnabled) {
      playGameSfx('streak', { intensity: 1 });
      triggerHaptic('success');
    }

    const revealTimer = window.setTimeout(() => {
      setShowRevealCurtain(false);
    }, 700);

    const confettiTimer = window.setTimeout(() => {
      setShowConfetti(false);
    }, 2800);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(confettiTimer);
    };
  }, [celebrationFxEnabled]);

  const toggleCelebrationFx = () => {
    setCelebrationFxEnabled((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CELEBRATION_FX_KEY, String(next));
      }
      return next;
    });
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-8 overflow-hidden text-white animate-phase-in">
      {showRevealCurtain && <div className="host-final-curtain" />}
      {celebrationFxEnabled && showConfetti && (
        <div className="host-confetti-layer" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="host-confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                background: `hsl(${piece.hue} 90% 62%)`,
                '--confetti-drift': piece.drift,
              }}
            />
          ))}
        </div>
      )}
      <div className="w-full max-w-5xl flex-1 flex items-center justify-center animate-final-reveal">
        <LeaderboardResultsCard finalScores={finalScores} pretitle="Final Scores" title="Leaderboard" />
      </div>

      {/* Button Group */}
      <div className="flex flex-wrap justify-center gap-4 mt-auto">
        <BgmControl />

        <button
          onClick={toggleCelebrationFx}
          className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          FX: {celebrationFxEnabled ? 'ON' : 'OFF'}
        </button>

        {/* Primary Action */}
        <button
          onClick={handleHostNewRoom}
          className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          NEW ROOM
        </button>

        {/* Secondary Actions */}
        <button
          onClick={handleHostPlayAgainSameDeck}
          className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={handleExportFinalScores}
          className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          EXPORT CSV
        </button>
        <button
          onClick={handleBack}
          className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          EXIT HOST
        </button>
      </div>

      {showDraftManager && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/60">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black tracking-wide text-emerald-200">Manage Studio Drafts</p>
              <button
                onClick={() => {
                  setShowDraftManager(false);
                  cancelRenameStudioDraft();
                  setManageNotice('');
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {manageNotice && (
              <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{manageNotice}</p>
            )}

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {studioDecks.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-4 text-center text-xs text-slate-500">
                  No studio drafts saved yet.
                </div>
              )}

              {studioDecks.map((draft) => {
                const isEditing = renameDraftId === draft.id;
                const questionCount = Array.isArray(draft.slides) ? draft.slides.length : 0;
                return (
                  <div key={draft.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            value={renameDraftTitle}
                            onChange={(e) => setRenameDraftTitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <p className="truncate text-sm font-semibold text-slate-100">{draft.title || 'Untitled Deck'}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">{questionCount} questions</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={submitRenameStudioDraft}
                              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelRenameStudioDraft}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startRenameStudioDraft(draft)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Rename
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteStudioDraft(draft.id)}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/25"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
