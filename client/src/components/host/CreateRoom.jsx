import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import MagicGenerateModal from './MagicGenerateModal';

export default function CreateRoom({
  onBack,
  connected,
  error,
  resumeNotice,
  roomName,
  setRoomName,
  deckOptions,
  selectedDeckKey,
  onSelectDeck,
  gameDifficulty,
  setGameDifficulty,
  questionTimer,
  setQuestionTimer,
  answerMode,
  setAnswerMode,
  maxPlayers,
  setMaxPlayers,
  effectiveMaxPlayers,
  onLaunchLobby,
  onGenerateOpenTrivia,
  onGenerateTMDB,
  isMagicGenerating,
  magicGenerateError,
}) {
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const launchDisabled = !connected || !String(roomName || '').trim() || !selectedDeckKey;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.20),rgba(2,6,23,0)_70%)]" />
      <button onClick={onBack} className="absolute top-5 left-5 text-slate-500 hover:text-white text-sm transition-colors">back</button>

      <div className="z-10 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/85 p-6 md:p-8 shadow-xl shadow-black/30 animate-phase-in">
        <h1 className="mb-2 text-4xl md:text-5xl font-black tracking-tight">Create Room</h1>
        <p className="mb-6 text-sm text-slate-400">Step 1: Configure your session before launching the live lobby.</p>

        <button
          onClick={() => setIsMagicModalOpen(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-violet-400/45 bg-violet-500/12 px-4 py-2.5 text-sm font-black text-violet-100 transition hover:bg-violet-500/20"
        >
          <Sparkles size={16} />
          Magic Generate
        </button>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-[#0D1117] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Room Name</p>
            <input
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Movie Night"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base font-semibold text-white placeholder-slate-500 transition-colors focus:border-emerald-400 focus:outline-none"
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0D1117] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Deck Selection</p>
            <select
              value={selectedDeckKey}
              onChange={(event) => onSelectDeck(event.target.value)}
              className="w-full rounded-xl border border-slate-700/50 bg-[#0D1117] px-3.5 py-3 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="">Select a deck (required)</option>
              {deckOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0D1117] p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {['Easy', 'Normal', 'Hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setGameDifficulty(level)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                    gameDifficulty === level
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400'
                      : 'border border-slate-700/50 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0D1117] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Timer</p>
              <span className="text-sm font-black text-emerald-300">{questionTimer}s</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={questionTimer}
              onChange={(event) => setQuestionTimer(Number(event.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>5s</span>
              <span>60s</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-[#0D1117] p-4 md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lobby Capacity</p>
              <span className="text-sm font-black text-cyan-300">{maxPlayers} players</span>
            </div>
            <input
              type="range"
              min={10}
              max={250}
              step={5}
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(Number(event.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>10</span>
              <span>250</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Effective on this network may be lower (hotspot safety cap). Current effective preview: <span className="font-semibold text-slate-200">{effectiveMaxPlayers}</span>
            </p>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-800 bg-[#0D1117] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Answer Mode</p>
          <div className="grid grid-cols-2 gap-2 md:max-w-sm">
            {[
              { value: 'auto', label: 'Auto Deck' },
              { value: 'type_guess', label: 'Type Guess' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setAnswerMode(mode.value)}
                className={`rounded-xl px-4 py-2.5 text-[11px] font-black tracking-wide transition-all duration-150 ${
                  answerMode === mode.value
                    ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                    : 'bg-[#0D1117] text-slate-400 border border-slate-700/50 hover:bg-[#1C2128] hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300">{error}</p>}
        {resumeNotice && <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{resumeNotice}</p>}

        <button
          onClick={onLaunchLobby}
          disabled={launchDisabled}
          className="mt-6 w-full rounded-2xl bg-emerald-400 py-5 text-xl font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Launch Lobby
        </button>

        <div className={`mt-3 flex items-center justify-center gap-2 text-xs font-mono ${connected ? 'text-emerald-400' : 'text-amber-300'}`}>
          {connected ? <span>connected</span> : <span>connecting</span>}
        </div>
      </div>

      <MagicGenerateModal
        open={isMagicModalOpen}
        onClose={() => setIsMagicModalOpen(false)}
        onGenerateOpenTrivia={onGenerateOpenTrivia}
        onGenerateTMDB={onGenerateTMDB}
        isGenerating={isMagicGenerating}
        errorMessage={magicGenerateError}
      />
    </div>
  );
}
