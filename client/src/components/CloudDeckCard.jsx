export default function CloudDeckCard({ deck, onDownload, downloading = false }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100">{deck.title}</h4>
        {typeof deck.questionCount === 'number' && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            {deck.questionCount} Qs
          </span>
        )}
      </div>

      <p className="mb-3 line-clamp-3 text-xs text-slate-400">
        {deck.description || 'Official cloud deck from the public LocalFlux catalog.'}
      </p>

      <button
        onClick={() => onDownload(deck)}
        disabled={downloading}
        className="w-full rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? 'Downloading...' : 'Download to LAN'}
      </button>
    </article>
  );
}
