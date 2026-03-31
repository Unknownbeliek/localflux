import PingIndicator from '../PingIndicator';
import VolumeKnob from '../VolumeKnob';
import { resolvePresetPath } from '../../utils/avatarObject';

export function AvatarBadge({ avatarValue, sizeClass = 'h-12 w-12' }) {
  return (
    <div
      className={`${sizeClass} rounded-full border border-slate-600 p-1 shadow-inner`}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <img
        src={resolvePresetPath(avatarValue)}
        alt="Selected avatar"
        className="h-full w-full rounded-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
}

export function StreakBadge({ streakCount, showFireIgnite, fireIgniteTick }) {
  if (streakCount < 2) return null;
  const isOnFire = streakCount >= 3;

  return (
    <div className="ml-2 flex items-center gap-2">
      {showFireIgnite && isOnFire && (
        <span key={fireIgniteTick} className="animate-fire-ignite rounded-full border border-orange-300/60 bg-orange-500/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-100">
          Fire Mode
        </span>
      )}
      <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isOnFire ? 'animate-on-fire-badge border-orange-300/65 bg-orange-500/20 text-orange-50' : 'border-amber-400/60 bg-amber-500/15 text-amber-100'}`}>
        <span>{isOnFire ? 'On Fire' : 'Streak'}</span>
        <span className="font-mono tabular-nums">x{streakCount}</span>
      </div>
    </div>
  );
}

export function PlayerTopBar({ showLeaveButton = false, onLeaveGame, socket }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {showLeaveButton && (
          <button
            onClick={onLeaveGame}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-rose-200 transition-all hover:-translate-y-0.5 hover:bg-rose-500/20"
          >
            LEAVE GAME
          </button>
        )}
        <PingIndicator socket={socket} />
      </div>
      <VolumeKnob />
    </div>
  );
}
