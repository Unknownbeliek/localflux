import React from 'react';
import { Rocket, WifiOff, Zap, Server, Activity } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4 font-sans relative z-0 overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content Container (Tightened Spacing) */}
      <div className="max-w-5xl w-full text-center space-y-6 z-10">
        
       
        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent pb-2">
            CineGnosis
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            The fault-tolerant, offline-first local multiplayer event engine.
          </p>
        </div>

        {/* Hackathon Launch Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 mt-4 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 font-bold tracking-widest text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <Rocket className="w-5 h-5 animate-pulse" />
          <span>LAUNCHING AT FOSS HACK 2026 • MARCH 1</span>
        </div>

        {/* Features Grid (Tighter Padding) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300">
            <WifiOff className="w-8 h-8 text-blue-400" />
            <h3 className="font-bold text-lg tracking-wide">100% Offline</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Survives auditorium Wi-Fi crashes with local LAN superiority.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all duration-300">
            <Zap className="w-8 h-8 text-purple-400" />
            <h3 className="font-bold text-lg tracking-wide">0ms Latency</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Deterministic lag compensation prioritizes reflexes over bandwidth.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-green-500/50 hover:bg-slate-800/50 transition-all duration-300">
            <Server className="w-8 h-8 text-green-400" />
            <h3 className="font-bold text-lg tracking-wide">Hybrid Tunnel</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Smart QR routing shifts overflow traffic to 4G seamlessly.
            </p>
          </div>

        </div>
      </div>

      {/* Footer Boot Sequence */}
      <div className="absolute bottom-4 flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-slate-600 text-xs font-mono tracking-widest uppercase">
          Initializing Engine Core...
        </span>
      </div>

    </div>
  );
}

export default App;