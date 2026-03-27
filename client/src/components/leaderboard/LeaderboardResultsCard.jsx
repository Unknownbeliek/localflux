import { Award, Crown, Medal, Trophy } from 'lucide-react';

const shimmerStyle = `
  @keyframes gradient {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
`;

const getFrameStyles = (frameType) => {
  const frameKey = String(frameType || '').trim().toLowerCase();
  const frames = {
    gold: 'border-4 border-yellow-400 rounded-full shadow-[0_0_16px_rgba(250,204,21,0.7)]',
    silver: 'border-4 border-slate-300 rounded-full shadow-[0_0_14px_rgba(226,232,240,0.65)]',
    bronze: 'border-4 border-orange-400 rounded-full shadow-[0_0_14px_rgba(251,146,60,0.6)]',
    default: 'border-2 border-slate-500 rounded-full',
  };
  if (frames[frameKey]) return frames[frameKey];
  if (frameKey) return `${frames.default} ${frameType}`;
  return frames.default;
};

const resolveFrameType = (player, fallback = 'default') => {
  const frameCandidate =
    player?.frame ||
    player?.avatarFrame ||
    player?.avatar_frame ||
    player?.avatarObject?.frame ||
    player?.avatarObject?.style ||
    fallback;
  return String(frameCandidate || fallback).trim().toLowerCase();
};

const resolveAvatarPath = (player) => {
  const preset = String(player?.avatarObject?.value || '').trim();
  if (preset) return preset.includes('.') ? `/avatars/${preset}` : `/avatars/${preset}.jpg`;

  const value = String(player?.avatar || '').trim();
  if (!value) return '/avatars/1.jpg';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return value;
  if (value.includes('/')) return `/${value}`;
  return value.includes('.') ? `/avatars/${value}` : `/avatars/${value}.jpg`;
};

export default function LeaderboardResultsCard({
  finalScores = [],
  highlightPlayerId = '',
  pretitle = 'Final Scores',
  title = 'Leaderboard',
  subtitle = '',
}) {
  const rankedFinalScores = [...finalScores].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
  const topThree = rankedFinalScores.slice(0, 3);
  const restOfPack = rankedFinalScores.slice(3);
  const champion = topThree[0] || null;
  const meEntry = rankedFinalScores.find((p) => p?.id === highlightPlayerId) || null;
  const myRank = meEntry ? rankedFinalScores.findIndex((p) => p?.id === highlightPlayerId) + 1 : 0;
  const myLeadFromBelow = myRank > 0 && myRank < rankedFinalScores.length
    ? Math.max(0, Number(meEntry?.score || 0) - Number(rankedFinalScores[myRank]?.score || 0))
    : 0;
  const podiumTopSpacing = subtitle ? 'mt-14 md:mt-18' : 'mt-10 md:mt-12';

  if (rankedFinalScores.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-8 py-12 text-center max-w-md">
        <p className="text-base text-slate-400 font-semibold">No scores were captured for this round.</p>
        <p className="mt-3 text-sm text-slate-500">Start a new room to run another game.</p>
      </div>
    );
  }

  return (
    <section className="w-full max-w-3xl rounded-4xl border border-slate-700/70 bg-slate-900/80 px-5 py-6 md:px-10 md:py-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <style>{shimmerStyle}</style>

      <div className="mb-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{pretitle}</p>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm font-mono tabular-nums text-slate-300">{subtitle}</p> : null}
      </div>

      <div className={`flex items-end justify-center gap-2 md:gap-7 ${podiumTopSpacing}`}>
        {[topThree[1], topThree[0], topThree[2]].map((player, idx) => {
          if (!player) return null;

          const isChampion = idx === 1;
          const isSilver = idx === 0;
          const isMe = player?.id === highlightPlayerId;
          const pedestalClass = isChampion
            ? 'w-24 md:w-36 h-40 md:h-52 bg-yellow-400/20 border-yellow-400'
            : isSilver
              ? 'w-20 md:w-32 h-32 md:h-40 bg-slate-300/10 border-slate-300'
              : 'w-20 md:w-32 h-28 md:h-36 bg-orange-400/10 border-orange-400';
          const rankFrame = resolveFrameType(player, isChampion ? 'gold' : isSilver ? 'silver' : 'bronze');
          const badgeClass = isChampion
            ? 'bg-yellow-400/90 text-yellow-950 border-yellow-200/80'
            : isSilver
              ? 'bg-slate-300/90 text-slate-900 border-slate-100/80'
              : 'bg-orange-400/90 text-orange-950 border-orange-200/80';
          const RankIcon = isChampion ? Trophy : isSilver ? Medal : Award;

          return (
            <article key={player.id || `${player.name}_${idx}`} className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 -top-9 md:-top-12 z-30 w-16 h-16 md:w-20 md:h-20 overflow-visible">
                  <div className={`relative h-full w-full overflow-hidden bg-slate-900 ${getFrameStyles(rankFrame)}`}>
                    <img
                      src={resolveAvatarPath(player)}
                      alt={player?.name || 'Player'}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        const fallback = event.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.opacity = '1';
                      }}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-base font-black text-white opacity-0">
                      {player?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>

                  <span className={`absolute -bottom-2.5 -right-2.5 z-40 h-7 w-7 md:h-8 md:w-8 rounded-full border flex items-center justify-center shadow-lg ${badgeClass}`}>
                    <RankIcon className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </div>

                <div className={`rounded-t-2xl border-t-4 ${pedestalClass} pt-10 md:pt-12 px-2 pb-3 flex flex-col items-center`}>
                  <div className="flex items-center justify-center gap-1.5 max-w-full">
                    <p className={`text-center text-xs md:text-sm line-clamp-2 ${isChampion ? 'animate-pulse font-extrabold text-yellow-300' : 'font-bold text-slate-100'}`}>
                      {player?.name || 'Player'}
                    </p>
                    {isMe ? (
                      <span className="shrink-0 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200">
                        You
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-auto font-black tabular-nums ${isChampion ? 'text-2xl md:text-3xl text-yellow-300' : 'text-lg md:text-xl text-slate-200'}`}>
                    {Number(player?.score || 0)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {meEntry && (
        <div className="mt-5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 md:px-4 md:py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5">
              <span className={`relative h-10 w-10 overflow-hidden bg-slate-900 ${getFrameStyles(resolveFrameType(meEntry, 'default'))}`}>
                <img
                  src={resolveAvatarPath(meEntry)}
                  alt={meEntry?.name || 'You'}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    const fallback = event.currentTarget.nextElementSibling;
                    if (fallback) fallback.style.opacity = '1';
                  }}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white opacity-0">
                  {meEntry?.name?.charAt(0)?.toUpperCase() || 'Y'}
                </span>
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">You</p>
                <p className="font-semibold text-emerald-100 leading-tight">{meEntry?.name || 'Player'}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">You are playing as this name</p>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rank <span className="text-emerald-200 font-bold">#{myRank}</span></p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Points <span className="text-emerald-200 font-bold tabular-nums">{Number(meEntry?.score || 0)}</span></p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lead <span className="text-emerald-200 font-bold tabular-nums">+{myLeadFromBelow}</span></p>
          </div>
        </div>
      )}

      {restOfPack.length > 0 && (
        <div className="mt-5 space-y-2">
          {restOfPack.map((player, index) => {
            const rank = index + 4;
            const isMe = player?.id === highlightPlayerId;
            return (
              <div
                key={player.id || `${player.name}_${index}`}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isMe ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700/60 bg-slate-950/45'}`}
              >
                <p className={`w-12 text-2xl md:text-3xl leading-none tabular-nums ${isMe ? 'font-black text-emerald-300 text-base md:text-lg' : 'font-light text-slate-400'}`}>
                  {isMe ? 'YOU' : String(rank).padStart(2, '0')}
                </p>
                <div className="flex-1 px-2 md:px-3">
                  <p className={`text-base md:text-lg font-semibold leading-tight ${isMe ? 'text-emerald-200' : 'text-slate-100'}`}>{player.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {Number(player.score || 0)} points{isMe ? ` • #${rank}` : ''}
                  </p>
                </div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${rank <= 5 ? 'border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-300' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}>
                  <Crown className="h-4 w-4" strokeWidth={2.4} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
