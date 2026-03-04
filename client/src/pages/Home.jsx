import React, { useState } from 'react'
import { Tv2, Users, Zap, Trophy, ArrowRight, X } from 'lucide-react'

function JoinModal({ onClose }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Users size={20} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Join a Game</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Game Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 tracking-widest text-lg font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition"
            />
          </div>
          <button
            disabled={!code || !name}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/25"
          >
            Join Now <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function HostModal({ onClose }) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Tv2 size={20} className="text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Host a Game</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Host Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
          <button
            disabled={!name}
            className="w-full mt-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            Create Lobby <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [showJoin, setShowJoin] = useState(false)
  const [showHost, setShowHost] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-700/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-600/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
         
          <span className="text-4xl  font-bold tracking-tight ">LocalFlux</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Download</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">Get Started</a>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20">

           

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6 max-w-3xl">
          Host. Play.{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
            Dominate.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-xl mb-12 leading-relaxed">
            Host Local quiz on your network for your team, classroom, or friends 
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto">

          {/* Host Game */}
          <button
            onClick={() => setShowHost(true)}
            className="group relative overflow-hidden bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl px-8 py-4 flex items-center justify-center gap-3 text-base transition-all duration-200 shadow-xl shadow-violet-600/30 hover:shadow-violet-500/40 hover:-translate-y-0.5"
          >
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Tv2 size={17} />
            </div>
            Host a Game
            <ArrowRight size={16} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Join Game */}
          <button
            onClick={() => setShowJoin(true)}
            className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-white font-semibold rounded-2xl px-8 py-4 flex items-center justify-center gap-3 text-base transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Users size={17} className="text-emerald-400" />
            </div>
            Join a Game
            <ArrowRight size={16} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

       
        
      </main>

      {/* Features section */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-20 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Everything you need for a great quiz
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap size={20} className="text-amber-400" />,
              bg: 'bg-amber-500/10',
              title: 'Real-time sync',
              desc: 'All players see questions and scores update live via WebSockets.',
            },
            {
              icon: <Trophy size={20} className="text-violet-400" />,
              bg: 'bg-violet-500/10',
              title: 'Live leaderboard',
              desc: 'Rankings update instantly after every answer to keep things exciting.',
            },
            {
              icon: <Users size={20} className="text-emerald-400" />,
              bg: 'bg-emerald-500/10',
              title: 'No sign-up required',
              desc: 'Jump straight into a game with just a code — no accounts needed.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
        <span>© 2026 LocalFLux — Open Source</span>
        <span>Built with ❤️ for FossHack</span>
      </footer>

      {/* Modals */}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
      {showHost && <HostModal onClose={() => setShowHost(false)} />}
    </div>
  )
}
