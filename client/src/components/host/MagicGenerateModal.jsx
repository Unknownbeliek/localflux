import { Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const OPEN_TDB_CATEGORIES = [
  { id: '', label: 'Any Category' },
  { id: '9', label: 'General Knowledge' },
  { id: '10', label: 'Entertainment: Books' },
  { id: '11', label: 'Entertainment: Film' },
  { id: '12', label: 'Entertainment: Music' },
  { id: '13', label: 'Entertainment: Musicals & Theatres' },
  { id: '14', label: 'Entertainment: Television' },
  { id: '15', label: 'Video Games' },
  { id: '16', label: 'Entertainment: Board Games' },
  { id: '17', label: 'Science & Nature' },
  { id: '18', label: 'Science: Computers' },
  { id: '19', label: 'Science: Mathematics' },
  { id: '20', label: 'Mythology' },
  { id: '21', label: 'Sports' },
  { id: '22', label: 'Geography' },
  { id: '23', label: 'History' },
  { id: '24', label: 'Politics' },
  { id: '25', label: 'Art' },
  { id: '26', label: 'Celebrities' },
  { id: '27', label: 'Animals' },
  { id: '28', label: 'Vehicles' },
  { id: '29', label: 'Entertainment: Comics' },
  { id: '30', label: 'Science: Gadgets' },
  { id: '31', label: 'Japanese Anime & Manga' },
  { id: '32', label: 'Entertainment: Cartoon & Animations' },
];

const TMDB_GENRES = [
  { id: '', label: 'Any Genre' },
  { id: '28', label: 'Action' },
  { id: '12', label: 'Adventure' },
  { id: '16', label: 'Animation' },
  { id: '35', label: 'Comedy' },
  { id: '80', label: 'Crime' },
  { id: '99', label: 'Documentary' },
  { id: '18', label: 'Drama' },
  { id: '10751', label: 'Family' },
  { id: '14', label: 'Fantasy' },
  { id: '36', label: 'History' },
  { id: '27', label: 'Horror' },
  { id: '10402', label: 'Music' },
  { id: '9648', label: 'Mystery' },
  { id: '10749', label: 'Romance' },
  { id: '878', label: 'Science Fiction' },
  { id: '10770', label: 'TV Movie' },
  { id: '53', label: 'Thriller' },
  { id: '10752', label: 'War' },
  { id: '37', label: 'Western' },
];

const QUESTION_COUNTS = [10, 20, 30];
const TMDB_API_KEY_STORAGE_KEY = 'lf_tmdb_api_key';
const TMDB_API_KEY_REMEMBER_KEY = 'lf_tmdb_api_key_remember';

const clampProgress = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const getStoredRememberFlag = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TMDB_API_KEY_REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
};

const getStoredTmdbApiKey = () => {
  if (typeof window === 'undefined') return '';
  try {
    const shouldRemember = window.localStorage.getItem(TMDB_API_KEY_REMEMBER_KEY) === '1';
    if (!shouldRemember) return '';
    return String(window.localStorage.getItem(TMDB_API_KEY_STORAGE_KEY) || '');
  } catch {
    return '';
  }
};

export default function MagicGenerateModal({
  open,
  onClose,
  onGenerateOpenTrivia,
  onGenerateTMDB = () => {},
  isGenerating = false,
  errorMessage = '',
  isOnline = true,
  generationProgress = 0,
  generationStatusText = '',
}) {
  const [activeTab, setActiveTab] = useState('open_trivia');
  const [categoryId, setCategoryId] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [tmdbApiKey, setTmdbApiKey] = useState(() => getStoredTmdbApiKey());
  const [rememberTmdbApiKey, setRememberTmdbApiKey] = useState(() => getStoredRememberFlag());
  const [tmdbQuestionCount, setTmdbQuestionCount] = useState(10);
  const [tmdbGenreId, setTmdbGenreId] = useState('');
  const [tmdbGenreQuery, setTmdbGenreQuery] = useState('');

  const tabs = useMemo(
    () => [
      { id: 'open_trivia', label: 'Open Trivia', hint: 'Free API' },
      { id: 'tmdb', label: 'TMDB Movies', hint: 'Host API Key' },
      { id: 'local_ai', label: 'Local AI', hint: 'Ollama' },
    ],
    []
  );

  const filteredOpenTdbCategories = useMemo(() => {
    const q = String(categoryQuery || '').trim().toLowerCase();
    if (!q) return OPEN_TDB_CATEGORIES;
    return OPEN_TDB_CATEGORIES.filter((entry) => String(entry.label || '').toLowerCase().includes(q));
  }, [categoryQuery]);

  const filteredTmdbGenres = useMemo(() => {
    const q = String(tmdbGenreQuery || '').trim().toLowerCase();
    if (!q) return TMDB_GENRES;
    return TMDB_GENRES.filter((entry) => String(entry.label || '').toLowerCase().includes(q));
  }, [tmdbGenreQuery]);

  const progress = clampProgress(generationProgress);
  const progressLabel = String(generationStatusText || '').trim() || 'Preparing deck data...';

  const handleRememberTmdbKeyChange = (checked) => {
    setRememberTmdbApiKey(checked);
    if (typeof window === 'undefined') return;

    try {
      if (checked) {
        window.localStorage.setItem(TMDB_API_KEY_REMEMBER_KEY, '1');
        const cleanKey = tmdbApiKey.trim();
        if (cleanKey) {
          window.localStorage.setItem(TMDB_API_KEY_STORAGE_KEY, cleanKey);
        }
      } else {
        window.localStorage.removeItem(TMDB_API_KEY_REMEMBER_KEY);
        window.localStorage.removeItem(TMDB_API_KEY_STORAGE_KEY);
      }
    } catch {
      // Ignore local storage write errors.
    }
  };

  const handleGenerateTmdb = () => {
    const cleanKey = tmdbApiKey.trim();

    if (typeof window !== 'undefined') {
      try {
        if (rememberTmdbApiKey && cleanKey) {
          window.localStorage.setItem(TMDB_API_KEY_REMEMBER_KEY, '1');
          window.localStorage.setItem(TMDB_API_KEY_STORAGE_KEY, cleanKey);
        }
      } catch {
        // Ignore local storage write errors.
      }
    }

    onGenerateTMDB({ amount: tmdbQuestionCount, apiKey: cleanKey, genreId: tmdbGenreId || null });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Close magic generate" onClick={() => !isGenerating && onClose()} />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-700/70 bg-[#11161D] p-6 shadow-2xl shadow-black/60">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-white">Magic Generate</p>
            <p className="text-xs text-slate-400">Generate trivia decks from external sources.</p>
          </div>
          <button
            onClick={() => !isGenerating && onClose()}
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700/70 bg-[#1C2128] p-2 text-slate-200 transition hover:bg-[#22272E]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl border px-3 py-2 text-left transition ${
                activeTab === tab.id
                  ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                  : 'border-slate-700/70 bg-[#0D1117] text-slate-300 hover:bg-[#1C2128]'
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wide">{tab.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{tab.hint}</p>
            </button>
          ))}
        </div>

        {!isOnline ? (
          <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            You are offline. Connect to internet to use Magic Generate.
          </div>
        ) : null}

        {isGenerating ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black tracking-wide text-emerald-100">Generating Deck...</p>
              <p className="text-sm font-black text-emerald-200">{progress}%</p>
            </div>
            <p className="mt-1 text-xs text-emerald-100/80">{progressLabel}</p>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="relative h-full rounded-full bg-linear-to-r from-emerald-300 via-cyan-300 to-teal-300 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.7)_45%,transparent_80%)] bg-size-[200%_100%] animate-[shimmer_1.8s_linear_infinite]" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div className={`rounded-lg border px-2 py-1 text-center ${progress >= 25 ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : 'border-slate-700 bg-slate-900/60 text-slate-400'}`}>
                Fetching
              </div>
              <div className={`rounded-lg border px-2 py-1 text-center ${progress >= 60 ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100' : 'border-slate-700 bg-slate-900/60 text-slate-400'}`}>
                Building
              </div>
              <div className={`rounded-lg border px-2 py-1 text-center ${progress >= 90 ? 'border-teal-300/40 bg-teal-400/15 text-teal-100' : 'border-slate-700 bg-slate-900/60 text-slate-400'}`}>
                Saving
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'open_trivia' ? (
          <div className="rounded-2xl border border-slate-700/70 bg-[#0D1117] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Category</p>
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                  placeholder="Search categories..."
                  className="mb-2 w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                >
                  {filteredOpenTdbCategories.map((category) => (
                    <option key={category.id || 'any'} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Question Count</p>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                >
                  {QUESTION_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => onGenerateOpenTrivia({ amount: questionCount, categoryId: categoryId || null })}
              disabled={isGenerating || !isOnline}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating...' : 'Generate Deck'}
            </button>
          </div>
        ) : activeTab === 'tmdb' ? (
          <div className="rounded-2xl border border-slate-700/70 bg-[#0D1117] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">TMDB API Key</p>
                <input
                  type="password"
                  value={tmdbApiKey}
                  onChange={(event) => setTmdbApiKey(event.target.value)}
                  placeholder="Paste your TMDB v3 API key"
                  className="w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <label className="mt-2 flex items-start gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={rememberTmdbApiKey}
                    onChange={(event) => handleRememberTmdbKeyChange(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-950 text-emerald-400 focus:ring-emerald-400"
                  />
                  <span className="text-[11px] text-slate-300">
                    Remember API key on this device. Stored only in this browser and can be cleared anytime.
                  </span>
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Genre</p>
                <input
                  type="text"
                  value={tmdbGenreQuery}
                  onChange={(event) => setTmdbGenreQuery(event.target.value)}
                  placeholder="Search genres..."
                  className="mb-2 w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <select
                  value={tmdbGenreId}
                  onChange={(event) => setTmdbGenreId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                >
                  {filteredTmdbGenres.map((genre) => (
                    <option key={genre.id || 'any'} value={genre.id}>
                      {genre.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Question Count</p>
                <select
                  value={tmdbQuestionCount}
                  onChange={(event) => setTmdbQuestionCount(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-700/50 bg-[#11161D] px-3 py-2.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
                >
                  {QUESTION_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateTmdb}
              disabled={isGenerating || !tmdbApiKey.trim() || !isOnline}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating...' : 'Generate Movie Deck'}
            </button>

            <details className="mt-4 rounded-xl border border-slate-700/70 bg-[#11161D] p-3 text-xs text-slate-300">
              <summary className="cursor-pointer font-semibold text-slate-100">How to get your TMDB API key</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Go to https://www.themoviedb.org and create/login to your account.</li>
                <li>Open profile settings and navigate to API section.</li>
                <li>Request a Developer API key (v3 auth) and complete the form.</li>
                <li>Copy the generated v3 API key and paste it above.</li>
                <li>Keep this key private and do not commit it in source files.</li>
              </ol>
            </details>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/70 bg-[#0D1117] p-5 text-sm text-slate-400">
            {'Local AI generation coming next. Start Ollama and configure model settings to use this tab.'}
          </div>
        )}

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
