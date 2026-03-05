import { useState } from 'react'
import Host from '../components/Host'
import Player from '../components/Player'

export default function Home() {
  const [view, setView] = useState('landing')

  if (view === 'host')   return <Host onBack={() => setView('landing')} />
  if (view === 'player') return <Player onBack={() => setView('landing')} />

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none">

      <h1 className="text-6xl font-black tracking-tighter mb-2">LocalFlux</h1>
      <p className="text-zinc-600 text-sm mb-14">local multiplayer quiz</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setView('host')}
          className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-xl py-5 rounded-xl transition-all duration-100 tracking-tight"
        >
          HOST
        </button>
        <button
          onClick={() => setView('player')}
          className="w-full bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-white font-black text-xl py-5 rounded-xl transition-all duration-100 tracking-tight"
        >
          JOIN
        </button>
      </div>

    </div>
  )
}
