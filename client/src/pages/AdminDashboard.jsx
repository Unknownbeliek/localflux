import { useNavigate } from 'react-router-dom'
import { BookOpen, Gamepad2 } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none">
      {/* Background blur effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(16,185,129,0.20),rgba(2,6,23,0)_70%)]" />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Main container */}
      <div className="z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5em] text-emerald-400">Local Multiplayer Quiz</p>
          <h1 className="text-6xl font-black tracking-tight mb-2">LocalFlux</h1>
          <p className="text-slate-400 text-sm">Fast rounds. Live chat. Instant score swings.</p>
        </div>

        {/* Button grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deck Studio button */}
          <button
            onClick={() => navigate('/studio')}
            className="group relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-amber-600/5 p-6 transition-all duration-150 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/20 active:translate-y-0 active:scale-95"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-10" />

            {/* Content */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="rounded-full bg-amber-400/20 p-3 group-hover:bg-amber-400/30 transition-colors">
                <BookOpen className="h-8 w-8 text-amber-300" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-amber-200">Open Deck Studio</h2>
              <p className="text-sm text-amber-200/60">Create & edit quiz decks</p>
            </div>
          </button>

          {/* Launch Game button */}
          <button
            onClick={() => navigate('/host')}
            className="group relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-400/10 to-emerald-600/5 p-6 transition-all duration-150 hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/20 active:translate-y-0 active:scale-95"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-10" />

            {/* Content */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="rounded-full bg-emerald-400/20 p-3 group-hover:bg-emerald-400/30 transition-colors">
                <Gamepad2 className="h-8 w-8 text-emerald-300" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-emerald-200">Launch Game Screen</h2>
              <p className="text-sm text-emerald-200/60">Start hosting a game</p>
            </div>
          </button>
        </div>

        {/* Optional: Info section */}
        <div className="mt-12 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-6 backdrop-blur-sm">
          <p className="text-center text-sm text-slate-400">
            Players can join via <span className="font-semibold text-slate-300">/play</span> once a game is hosting.
          </p>
        </div>
      </div>
    </div>
  )
}
