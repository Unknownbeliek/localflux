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
  const rankedFinalScores = [...finalScores].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 pt-10 animate-phase-in">
      <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-slate-500">Final Scores</p>
      <h2 className="text-4xl font-black tracking-tight mb-8">Results</h2>
      <div className="flex flex-col gap-3 flex-1">
        {rankedFinalScores.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">No scores were captured for this round.</p>
            <p className="mt-2 text-xs text-slate-500">Start a new room to run another game.</p>
          </div>
        )}

        {rankedFinalScores.map((p, i) => {
          const isTopOne = i === 0;
          const isTopTwo = i === 1;
          const isTopThree = i === 2;
          const placementClass =
            isTopOne
              ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
              : isTopTwo
                ? 'border-slate-300/40 bg-slate-200/10 text-slate-100'
                : isTopThree
                  ? 'border-orange-300/40 bg-orange-300/10 text-orange-100'
                  : 'border-slate-800 bg-slate-900/80 text-white';
          const medal = isTopOne ? '🥇' : isTopTwo ? '🥈' : isTopThree ? '🥉' : '';

          return (
            <div key={p.id || `${p.name}_${i}`} className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${placementClass}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
                {medal && <span className="text-base leading-none">{medal}</span>}
              </div>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-black text-amber-300 tabular-nums">{p.score}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={handleHostPlayAgainSameDeck}
          className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-lg font-black text-emerald-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-500/20 active:translate-y-0 active:scale-95"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={handleHostNewRoom}
          className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95"
        >
          NEW ROOM
        </button>
        <button
          onClick={handleExportFinalScores}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
        >
          EXPORT CSV
        </button>
      </div>

      <div className="mt-3">
        <button
          onClick={handleBack}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 text-lg font-black text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-slate-800 active:translate-y-0 active:scale-95"
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
