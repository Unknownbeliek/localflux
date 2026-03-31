import { useState } from 'react';
import { useBgm } from '../context/BgmProvider';

export default function BgmControl() {
  const { supported, enabled, toggleEnabled, volume, setVolume } = useBgm();
  const [expanded, setExpanded] = useState(false);

  if (!supported) return null;

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-2.5 shadow-xl shadow-black/35 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <p className="px-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">BGM</p>
        <button
          onClick={() => {
            void toggleEnabled();
          }}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition ${enabled ? 'border border-emerald-400/45 bg-emerald-500/20 text-emerald-100' : 'border border-slate-600 bg-slate-800 text-slate-200'}`}
        >
          {enabled ? 'Enabled' : 'Muted'}
        </button>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-100"
          aria-label={expanded ? 'Hide BGM volume controls' : 'Show BGM volume controls'}
        >
          {expanded ? 'Hide Volume' : 'Volume'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 flex items-center gap-2 border-t border-slate-700/70 pt-2">
          <span className="text-[10px] font-semibold text-slate-400">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-slate-700"
            aria-label="Background music volume"
          />
          <span className="w-10 text-right text-[10px] font-mono text-slate-300">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
