import usePing from '../hooks/usePing';
import useSmoothedPing from '../hooks/useSmoothedPing';

export default function PingIndicator({ socket = null, className = '' }) {
  const { latencyMs, connected } = usePing(socket, 2000);
  const smoothedPing = useSmoothedPing(latencyMs, 0.2);

  let toneClasses = 'text-slate-300';
  let dotClasses = 'bg-slate-400';
  if (typeof smoothedPing === 'number') {
    if (smoothedPing < 100) {
      toneClasses = 'text-emerald-300';
      dotClasses = 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]';
    } else if (smoothedPing <= 200) {
      toneClasses = 'text-amber-300';
      dotClasses = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]';
    } else {
      toneClasses = 'text-rose-300';
      dotClasses = 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]';
    }
  }

  return (
    <div className={`rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 backdrop-blur ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${connected ? dotClasses : 'bg-slate-500'}`} />
        <span className={`text-xs font-mono tabular-nums ${connected ? toneClasses : 'text-slate-400'}`}>
          {connected ? `${smoothedPing ?? '--'}ms` : 'offline'}
        </span>
      </div>
    </div>
  );
}
