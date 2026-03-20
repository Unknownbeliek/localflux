export default function HostResultView({ resultData, qIndex, qTotal, connected, autoAdvanceIn }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 pt-8 animate-phase-in">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question {qIndex + 1} / {qTotal}</p>
        <span className={`text-xs font-mono ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>{connected ? 'live' : 'offline'}</span>
      </div>

      <div className="mb-7 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70 mb-1">Correct Answer</p>
        <p className="text-3xl font-black text-emerald-200">{resultData.correct_answer}</p>
      </div>

      <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">Leaderboard</p>
      <div className="flex flex-col gap-2 flex-1">
        {[...resultData.scores].sort((a, b) => b.score - a.score).map((p, i) => (
          <div key={p.name} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${i === 0 ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-slate-800 bg-slate-900/80 text-white'}`}>
            <span className="font-mono text-sm w-6 tabular-nums">{i + 1}</span>
            <span className="flex-1 font-semibold">{p.name}</span>
            <span className="font-black text-amber-300 tabular-nums">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 text-center text-xl font-black text-emerald-200">
        {qIndex + 1 >= qTotal
          ? autoAdvanceIn > 0
            ? `FINISHING IN ${autoAdvanceIn}s`
            : 'FINALIZING ROUND...'
          : autoAdvanceIn > 0
            ? `NEXT QUESTION IN ${autoAdvanceIn}s`
            : 'PREPARING NEXT QUESTION...'}
      </div>
    </div>
  );
}
