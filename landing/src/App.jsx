import React, { useState } from 'react';

export default function App() {
  const [copied, setCopied] = useState(false);

  const copyCliCommand = () => {
    navigator.clipboard.writeText('npx localflux start --port 3000');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-200 flex flex-col items-center justify-center p-6 font-sans overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/20 blur-[120px] animate-pulse mix-blend-screen pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[20%] w-[20vw] h-[20vw] rounded-full bg-purple-600/20 blur-[100px] animate-pulse mix-blend-screen pointer-events-none" style={{ animationDelay: '4s' }}></div>

      {/* Navbar */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center max-w-6xl z-10">
         <div className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-slate-900 text-sm">⚡</span>
            LocalFlux
         </div>
         <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            <a href="https://github.com/Unknownbeliek/LocalFlux" className="hover:text-white transition">GitHub Repo</a>
         </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl mt-12">

        {/* Live Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-medium backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          v1.0 Live for FOSS Hack 2026
        </div>

        {/* Hero Text */}
        <div className="text-center max-w-4xl mb-16">
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight mb-6 leading-tight">
            The Game Engine for the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
              Offline World.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-light max-w-2xl mx-auto">
            Zero lag. Zero cloud dependencies. <strong className="text-slate-200">100% Open Source.</strong><br/> Host live, interactive quizzes directly on your local network.
          </p>
        </div>

        {/* Dual Doors */}
        <div className="flex flex-col md:flex-row items-stretch gap-6 w-full max-w-4xl justify-center">

          {/* Door 1: Consumer App */}
          <div className="group relative flex flex-col items-center backdrop-blur-xl bg-white/5 p-10 rounded-3xl border border-white/10 hover:border-emerald-500/50 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 w-full md:w-1/2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex flex-col items-center h-full">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                🖥️
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Host an Event</h2>
              <p className="text-center text-slate-400 mb-8 leading-relaxed">
                Download the desktop app to start the server and cast the game to your big screen.
              </p>
              <a href="https://github.com/Unknownbeliek/LocalFlux" className="mt-auto bg-white text-slate-950 hover:bg-emerald-400 text-center font-bold py-4 px-8 rounded-full transition-all duration-300 w-full shadow-[0_0_20px_rgba(52,211,118,0.2)] group-hover:shadow-[0_0_30px_rgba(52,211,118,0.4)] transform group-hover:-translate-y-1">
                Download Core Engine
              </a>
            </div>
          </div>

          {/* Door 2: Developer CLI */}
          <div className="group relative flex flex-col items-center backdrop-blur-xl bg-white/5 p-10 rounded-3xl border border-white/10 hover:border-blue-500/50 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 w-full md:w-1/2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex flex-col items-center w-full h-full">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                💻
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Run via CLI</h2>
              <p className="text-center text-slate-400 mb-8 leading-relaxed">
                For developers. Spin up the engine instantly via your terminal without installing anything.
              </p>
              <div onClick={copyCliCommand} className="mt-auto w-full bg-[#0a0f1c] border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-4 flex justify-between items-center cursor-pointer transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <code className="text-blue-400 text-sm font-mono tracking-wider">npx localflux start</code>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase transition-colors ${copied ? 'text-emerald-400' : 'text-slate-500 group-hover:text-blue-400'}`}>
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-6xl mt-24">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Packed with Features</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            
            {/* Feature 1: Offline First */}
            <div className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-white mb-2">100% Offline</h3>
              <p className="text-slate-400">Run entirely on your local network. No internet required, ensuring zero lag and complete data privacy.</p>
            </div>

            {/* Feature 2: Deck Studio */}
            <div className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">Deck Studio</h3>
              <p className="text-slate-400">Create, edit, and manage your quiz content with an intuitive, built-in deck editor.</p>
            </div>

            {/* Feature 3: VIP Bouncer */}
            <div className="backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">VIP Bouncer</h3>
              <p className="text-slate-400">Control who can join your game. The VIP Bouncer ensures only authorized players can participate.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}