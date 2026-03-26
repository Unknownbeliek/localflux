import { useState, useEffect, useRef } from "react";
import Hero from "./components/Hero";
import Navigation from "./components/Navigation";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import { DynamicBackground } from "./components/DynamicBackground";
import { DeveloperExperience } from "./components/DeveloperExperience";
import { SocialProof } from "./components/SocialProof";
import Contributors from "./components/Contributors";

/* ─────────────────────────────────────────
   GLOBAL KEYFRAME STYLES (injected once)
───────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Geist:wght@300;400;500;600;700;900&display=swap');

    :root {
      --emerald: #10b981;
      --cyan: #06b6d4;
      --slate-950: #030712;
    }

    * { box-sizing: border-box; }
    body { background: #030712; }

    @keyframes ping-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.7; }
    }
    @keyframes ping-ring {
      0% { transform: scale(0.8); opacity: 0.9; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes latency-bar {
      0% { width: 4%; }
      60% { width: 18%; }
      100% { width: 4%; }
    }
    @keyframes toggle-slide {
      0%   { transform: translateX(0px); }
      33%  { transform: translateX(0px); }
      34%  { transform: translateX(28px); }
      66%  { transform: translateX(28px); }
      67%  { transform: translateX(56px); }
      99%  { transform: translateX(56px); }
      100% { transform: translateX(0px); }
    }
    @keyframes toggle-color {
      0%   { background: #6b7280; }
      33%  { background: #6b7280; }
      34%  { background: #f59e0b; }
      66%  { background: #f59e0b; }
      67%  { background: #10b981; }
      99%  { background: #10b981; }
      100% { background: #6b7280; }
    }
    @keyframes zod-check {
      0%, 70% { stroke-dashoffset: 40; opacity: 0; }
      80% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
    @keyframes file-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes arrow-pulse {
      0%, 100% { opacity: 0.3; transform: translateX(0); }
      50% { opacity: 1; transform: translateX(4px); }
    }
    @keyframes reconnect-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    @keyframes wifi-restore {
      0%, 40% { opacity: 0.2; }
      60%, 100% { opacity: 1; }
    }
    @keyframes score-reveal {
      0%, 50% { opacity: 0; transform: translateY(8px); }
      70%, 100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 8px 2px rgba(16,185,129,0.25); }
      50% { box-shadow: 0 0 20px 6px rgba(16,185,129,0.5); }
    }
    @keyframes typing-cursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes scan-line {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pipeline-flow {
      0%   { stroke-dashoffset: 200; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes dot-travel {
      0%   { offset-distance: 0%; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
    @keyframes card-glow-in {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes label-cycle {
      0%, 30%  { content: "FREE"; color: #9ca3af; }
      33%, 63% { content: "GUIDED"; color: #f59e0b; }
      66%, 96% { content: "SILENT"; color: #10b981; }
    }

    .font-geist  { font-family: 'Geist', 'Inter', sans-serif; }
    .font-mono   { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

    .bento-card {
      animation: card-glow-in 0.6s ease both;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(20px);
      transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
      overflow: hidden;
      position: relative;
    }
    .bento-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at top left, rgba(16,185,129,0.04) 0%, transparent 60%);
      pointer-events: none;
    }
    .bento-card:hover {
      border-color: rgba(16,185,129,0.6);
      transform: translateY(-4px);
      box-shadow: 0 0 30px -8px rgba(16,185,129,0.5), 0 0 60px -4px rgba(6,182,212,0.2), 0 0 0 1px rgba(16,185,129,0.2);
    }

    .interactive-border {
      position: relative;
      overflow: hidden;
    }

    .interactive-border::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      background: radial-gradient(
        250px circle at var(--x, 50%) var(--y, 50%),
        rgba(16, 185, 129, 0.18),
        transparent 60%
      );
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    .interactive-border:hover::after {
      opacity: 1;
    }

    .ping-dot {
      animation: ping-pulse 1.8s ease-in-out infinite;
    }
    .ping-ring {
      animation: ping-ring 1.8s ease-out infinite;
    }
    .zod-path {
      stroke-dasharray: 40;
      animation: zod-check 2.4s ease-in-out infinite;
    }
    .file-float {
      animation: file-float 3s ease-in-out infinite;
    }
    .arrow-pulse {
      animation: arrow-pulse 1.2s ease-in-out infinite;
    }
    .reconnect-blink {
      animation: reconnect-blink 1s step-end infinite;
    }
    .wifi-restore {
      animation: wifi-restore 3s ease-in-out infinite;
    }
    .score-reveal {
      animation: score-reveal 3s ease-in-out infinite;
    }
    .glow-pulse {
      animation: glow-pulse 2s ease-in-out infinite;
    }
    .toggle-thumb {
      animation: toggle-slide 6s ease-in-out infinite;
    }
    .toggle-track {
      animation: toggle-color 6s ease-in-out infinite;
    }

    .terminal-window {
      background: rgba(3, 7, 18, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 0 40px -8px rgba(16,185,129,0.3), 0 0 80px -12px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.05);
      overflow: hidden;
    }
    .terminal-scanline {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(16,185,129,0.12), transparent);
      animation: scan-line 8s linear infinite;
      pointer-events: none;
    }
    .shimmer-text {
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 40%, #10b981 80%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }
    .pipeline-connector {
      stroke-dasharray: 200;
      animation: pipeline-flow 1.5s ease-out both;
    }

    /* PREMIUM EFFECTS */
    .animate-shimmer {
      background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }

    .group-hover\:animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `}</style>
);

/* ─────────────────────────────────────────
   CARD 1 — 0ms Local Network
───────────────────────────────────────── */
const PingVisual = () => (
  <div className="flex items-center gap-6">
    {/* Live ping indicator */}
    <div className="relative flex items-center justify-center w-14 h-14">
      <div className="ping-ring absolute w-10 h-10 rounded-full border border-emerald-400/60" />
      <div className="ping-ring absolute w-10 h-10 rounded-full border border-emerald-400/40" style={{ animationDelay: "0.6s" }} />
      <div className="ping-dot relative z-10 w-5 h-5 rounded-full bg-emerald-400 glow-pulse" />
    </div>

    {/* Latency readout */}
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-3xl font-bold text-emerald-400">&lt; 5</span>
        <span className="font-mono text-sm text-emerald-500/70">ms</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full" style={{ animation: "latency-bar 2s ease-in-out infinite", width: "8%" }} />
        </div>
        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">LAN RTT</span>
      </div>
    </div>

    {/* Crossed-out cloud */}
    <div className="ml-auto opacity-30 relative">
      <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
        <path d="M9 22a7 7 0 1 1 3.5-13.1A9 9 0 0 1 27 14a5 5 0 0 1-1 9.9H9Z" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
        <line x1="3" y1="3" x2="33" y2="27" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[9px] text-red-400/70 tracking-wider">NO CLOUD</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   CARD 2 — God-Mode Host
───────────────────────────────────────── */
const TOGGLE_LABELS = ["FREE", "GUIDED", "SILENT"];
const TOGGLE_COLORS = ["text-slate-400", "text-amber-400", "text-emerald-400"];

const ToggleVisual = () => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 2000);
    return () => clearInterval(id);
  }, []);

  const trackColors = ["bg-slate-600", "bg-amber-500", "bg-emerald-500"];
  const thumbPositions = ["translate-x-0", "translate-x-7", "translate-x-14"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          {/* Track */}
          <div className={`w-20 h-7 rounded-full transition-colors duration-500 ${trackColors[phase]}`}>
            {/* Thumb */}
            <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-500 ease-in-out ${thumbPositions[phase]}`} />
          </div>
        </div>
        <div className={`font-mono text-sm font-bold tracking-widest transition-all duration-300 ${TOGGLE_COLORS[phase]}`}>
          {TOGGLE_LABELS[phase]}
        </div>
      </div>

      {/* State labels */}
      <div className="flex gap-2">
        {TOGGLE_LABELS.map((label, i) => (
          <div key={label} className={`px-2 py-0.5 rounded font-mono text-[10px] tracking-widest border transition-all duration-300 ${phase === i
              ? `border-current ${TOGGLE_COLORS[i]} bg-current/10`
              : "border-slate-700 text-slate-600"
            }`}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   CARD 3 — Deck Studio Pipeline
───────────────────────────────────────── */
const PipelineVisual = () => (
  <div className="flex items-center gap-3">
    {/* .csv file */}
    <div className="file-float flex flex-col items-center gap-1">
      <div className="w-12 h-14 rounded-md border border-slate-600 bg-slate-800/80 flex flex-col items-center justify-center gap-1 relative">
        <div className="absolute top-0 right-0 w-4 h-4 bg-slate-700 rounded-bl-md" />
        <div className="w-6 h-0.5 bg-slate-500 rounded" />
        <div className="w-6 h-0.5 bg-slate-500 rounded" />
        <div className="w-6 h-0.5 bg-slate-500 rounded" />
      </div>
      <span className="font-mono text-[10px] text-slate-400">.csv</span>
    </div>

    {/* Arrow */}
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <svg key={i} className="arrow-pulse" style={{ animationDelay: `${i * 0.2}s` }} width="8" height="10" viewBox="0 0 8 10">
          <polyline points="2,1 6,5 2,9" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      ))}
    </div>

    {/* Zod validation */}
    <div className="flex flex-col items-center gap-1">
      <div className="w-10 h-10 rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path className="zod-path" d="M3 9 L7.5 13.5 L15 5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-mono text-[10px] text-emerald-400/70">ZOD ✓</span>
    </div>

    {/* More arrows */}
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <svg key={i} className="arrow-pulse" style={{ animationDelay: `${0.4 + i * 0.2}s` }} width="8" height="10" viewBox="0 0 8 10">
          <polyline points="2,1 6,5 2,9" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      ))}
    </div>

    {/* .flux payload */}
    <div className="file-float flex flex-col items-center gap-1" style={{ animationDelay: "1.5s" }}>
      <div className="w-12 h-14 rounded-md border border-emerald-500/60 bg-emerald-950/60 flex flex-col items-center justify-center gap-1 relative" style={{ boxShadow: "0 0 12px rgba(16,185,129,0.25)" }}>
        <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-900/60 rounded-bl-md" />
        <span className="text-emerald-400 text-[9px] font-mono font-bold">FX</span>
        <div className="w-5 h-0.5 bg-emerald-600/60 rounded" />
        <div className="w-5 h-0.5 bg-emerald-600/60 rounded" />
      </div>
      <span className="font-mono text-[10px] text-emerald-400">.flux</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   CARD 4 — Bulletproof Reconnect
───────────────────────────────────────── */
const ReconnectVisual = () => {
  const [phase, setPhase] = useState(0); // 0: disconnected, 1: reconnecting, 2: restored
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-28 mx-auto">
      {/* Phone frame */}
      <div className="w-28 h-48 rounded-2xl border-2 border-slate-600 bg-slate-900 flex flex-col overflow-hidden shadow-xl">
        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80">
          <div className="flex gap-0.5">
            {[1, 2, 3].map(b => (
              <div key={b} className={`w-1 rounded-sm transition-all duration-500 ${phase === 2 ? "bg-emerald-400" : "bg-slate-600"}`} style={{ height: `${b * 3 + 3}px` }} />
            ))}
          </div>
          <div className="w-6 h-1.5 rounded-full bg-slate-600" />
        </div>

        {/* Screen content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2">
          {phase === 0 && (
            <div className="flex flex-col items-center gap-1.5 animate-pulse">
              <svg width="28" height="20" viewBox="0 0 28 20" fill="none" opacity="0.3">
                <path d="M1 5.5C5 1.5 11 0 14 0s9 1.5 13 5.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5 9.5C7.5 7 11 6 14 6s6.5 1 9 3.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9 13c1.5-1.5 3-2 5-2s3.5.5 5 2" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="14" cy="16.5" r="1.5" fill="#ef4444" />
              </svg>
              <span className="font-mono text-[8px] text-red-400 reconnect-blink">Wi-Fi Lost</span>
              <div className="text-[8px] font-mono text-slate-500 text-center">Grace: 45s</div>
            </div>
          )}
          {phase === 1 && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="font-mono text-[8px] text-amber-400">Restoring...</span>
            </div>
          )}
          {phase === 2 && (
            <div className="flex flex-col items-center gap-1.5">
              <svg className="wifi-restore" width="28" height="20" viewBox="0 0 28 20" fill="none">
                <path d="M1 5.5C5 1.5 11 0 14 0s9 1.5 13 5.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5 9.5C7.5 7 11 6 14 6s6.5 1 9 3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9 13c1.5-1.5 3-2 5-2s3.5.5 5 2" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="14" cy="16.5" r="1.5" fill="#10b981" />
              </svg>
              <div className="score-reveal flex flex-col items-center gap-0.5">
                <span className="font-mono text-[7px] text-emerald-400/70 uppercase tracking-wider">Score Preserved</span>
                <span className="font-mono text-[9px] text-emerald-300 font-bold">Neo Spark</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="h-4 bg-slate-800/50 flex items-center justify-center">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex justify-center gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${phase === i ? "bg-emerald-400" : "bg-slate-700"}`} />
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   SECTION 1: BENTO GRID
───────────────────────────────────────── */
const BentoGrid = () => {
  const cards = [
    {
      id: 1,
      delay: "0ms",
      tag: "LATENCY",
      title: "0ms Local Network",
      body: "Binds directly to 0.0.0.0 — infrastructure-agnostic, real-time LAN routing with no relay servers, no cloud overhead, no surprises.",
      visual: <PingVisual />,
      accent: "emerald",
      size: "large", // col-span-2 on md
    },
    {
      id: 2,
      delay: "100ms",
      tag: "HOST CONTROL",
      title: "God-Mode Host",
      body: "Granular classroom orchestration. Cycle moderation states on the fly and export one-click CSV telemetry for post-session analysis.",
      visual: <ToggleVisual />,
      accent: "amber",
      size: "normal",
    },
    {
      id: 3,
      delay: "200ms",
      tag: "CMS ENGINE",
      title: "Deck Studio Pipeline",
      body: "Local-first content pipeline. PapaParse ingests CSVs, Zod validates schemas, and IndexedDB persists — zero network dependency.",
      visual: <PipelineVisual />,
      accent: "cyan",
      size: "normal",
    },
    {
      id: 4,
      delay: "300ms",
      tag: "RESILIENCE",
      title: "Bulletproof Reconnect",
      body: "45-second server-side grace window with sessionStorage hot-swapping. Players seamlessly rejoin mid-session — scores intact.",
      visual: <ReconnectVisual />,
      accent: "emerald",
      size: "large",
    },
  ];

  const accentMap = {
    emerald: { tag: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", title: "text-white" },
    amber: { tag: "text-amber-400 bg-amber-400/10 border-amber-400/20", title: "text-white" },
    cyan: { tag: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20", title: "text-white" },
  };

  return (
    <section className="font-geist w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Section header */}
      <div className="mb-12 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent max-w-16" />
          <span className="font-mono text-xs tracking-[0.25em] text-slate-500 uppercase">Engine Architecture</span>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-700 via-transparent to-transparent max-w-16" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Built different.{" "}
          <span className="shimmer-text">From the ground up.</span>
        </h2>
        <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
          LocalFlux isn't a thin wrapper. Every primitive is engineered for the LAN-first reality of live classroom and event environments.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 — large, spans 2 cols */}
        <div
          className="bento-card md:col-span-2 p-6 flex flex-col gap-5"
          style={{ animationDelay: cards[0].delay }}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded border ${accentMap[cards[0].accent].tag}`}>
              {cards[0].tag}
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 glow-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
          <div className="py-4">
            <PingVisual />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1.5">{cards[0].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{cards[0].body}</p>
          </div>
        </div>

        {/* Card 2 — normal */}
        <div
          className="bento-card p-6 flex flex-col gap-5"
          style={{ animationDelay: cards[1].delay }}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded border ${accentMap[cards[1].accent].tag}`}>
              {cards[1].tag}
            </span>
          </div>
          <div className="py-2">
            <ToggleVisual />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1.5">{cards[1].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{cards[1].body}</p>
          </div>
        </div>

        {/* Card 3 — normal */}
        <div
          className="bento-card p-6 flex flex-col gap-5"
          style={{ animationDelay: cards[2].delay }}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded border ${accentMap[cards[2].accent].tag}`}>
              {cards[2].tag}
            </span>
          </div>
          <div className="py-2 overflow-x-auto">
            <PipelineVisual />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1.5">{cards[2].title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{cards[2].body}</p>
          </div>
        </div>

        {/* Card 4 — spans 2 cols */}
        <div
          className="bento-card md:col-span-2 p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center"
          style={{ animationDelay: cards[3].delay }}
        >
          <div className="flex-shrink-0">
            <ReconnectVisual />
          </div>
          <div className="flex flex-col gap-4">
            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded border w-fit ${accentMap[cards[3].accent].tag}`}>
              {cards[3].tag}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1.5">{cards[3].title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{cards[3].body}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["45s Grace Window", "sessionStorage Hot-swap", "Score Preservation"].map(tag => (
                <span key={tag} className="font-mono text-[10px] text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 2: ANIMATED DX TERMINAL
───────────────────────────────────────── */
const TERMINAL_SEQUENCE = [
  { delay: 0, type: "prompt", text: "" },                                          // cursor waiting
  { delay: 400, type: "typing", text: "npx localflux start" },
  { delay: 2000, type: "output", text: "", color: "text-slate-500" },
  { delay: 2100, type: "output", text: "  LocalFlux v1.0.0 — FOSS LAN Event Engine", color: "text-slate-400" },
  { delay: 2300, type: "output", text: "  ─────────────────────────────────────────", color: "text-slate-700" },
  { delay: 2500, type: "output", text: "  Starting LocalFlux State Machine...", color: "text-yellow-400" },
  { delay: 3200, type: "output", text: "  ✔  IndexedDB initialized", color: "text-emerald-400" },
  { delay: 3600, type: "output", text: "  ✔  Zod schemas validated", color: "text-emerald-400" },
  { delay: 4000, type: "output", text: "  ✔  Session state machine READY", color: "text-emerald-400" },
  { delay: 4600, type: "output", text: "  ✔  Binding to 0.0.0.0:5173...", color: "text-emerald-400" },
  { delay: 5200, type: "success", text: "  🚀 Engine running on http://192.168.1.5:5173", color: "text-emerald-300" },
  { delay: 5800, type: "output", text: "", color: "text-slate-500" },
  { delay: 5900, type: "output", text: "  Host Dashboard → http://192.168.1.5:5173/host", color: "text-cyan-400" },
  { delay: 6100, type: "output", text: "  Player Join   → http://192.168.1.5:5173/join", color: "text-cyan-400" },
];

const TerminalSection = () => {
  const [visibleLines, setVisibleLines] = useState([]);
  const [typingText, setTypingText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState("idle"); // idle | typing | output | done
  const containerRef = useRef(null);

  useEffect(() => {
    const timers = [];
    let charTimer = null;

    // Start sequence
    const startSequence = () => {
      setVisibleLines([]);
      setTypingText("");
      setPhase("idle");
      setShowCursor(true);

      TERMINAL_SEQUENCE.forEach((step, idx) => {
        const t = setTimeout(() => {
          if (step.type === "typing") {
            setPhase("typing");
            const chars = step.text.split("");
            chars.forEach((char, ci) => {
              const ct = setTimeout(() => {
                setTypingText(prev => prev + char);
                if (ci === chars.length - 1) setPhase("output");
              }, ci * 55);
              timers.push(ct);
            });
          } else if (step.type === "output" || step.type === "success") {
            setVisibleLines(prev => [...prev, { text: step.text, color: step.color, bold: step.type === "success" }]);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }
        }, step.delay);
        timers.push(t);
      });

      // Loop after 10s
      const loopT = setTimeout(() => {
        setTypingText("");
        startSequence();
      }, 10500);
      timers.push(loopT);
    };

    startSequence();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="font-geist w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section header */}
      <div className="mb-8 text-center flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.25em] text-slate-500 uppercase">Developer Experience</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          One command.{" "}
          <span className="shimmer-text">Instant LAN.</span>
        </h2>
      </div>

      {/* Terminal */}
      <div className="terminal-window relative">
        {/* Scanline effect */}
        <div className="terminal-scanline" />

        {/* macOS title bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border-b border-slate-700/60">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="font-mono text-xs text-slate-500">zsh — localflux</span>
          </div>
          <div className="w-12 flex justify-end">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400 glow-pulse" />
            </div>
          </div>
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="p-5 min-h-64 max-h-80 overflow-y-auto font-mono text-sm leading-6 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Previous session ghost */}
          <div className="text-slate-700 text-xs mb-3">Last login: Mon Mar 24 07:31:18 on ttys001</div>

          {/* Prompt line */}
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">❯</span>
            <span className="text-slate-300">{typingText}</span>
            {(phase === "idle" || phase === "typing") && (
              <span
                className="inline-block w-2 h-4 bg-emerald-400 align-middle"
                style={{ animation: "typing-cursor 0.8s step-end infinite" }}
              />
            )}
          </div>

          {/* Output lines */}
          <div className="mt-1">
            {visibleLines.map((line, i) => (
              <div
                key={i}
                className={`${line.color} ${line.bold ? "font-bold" : ""} text-sm leading-6`}
                style={{ animation: "fade-in-up 0.2s ease both" }}
              >
                {line.text}
              </div>
            ))}
          </div>

          {/* Final cursor */}
          {phase === "done" && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-emerald-400">❯</span>
              <span className="inline-block w-2 h-4 bg-emerald-400 align-middle" style={{ animation: "typing-cursor 0.8s step-end infinite" }} />
            </div>
          )}
        </div>
      </div>

      {/* Metadata strip */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {[
          { label: "npx install", value: "zero config" },
          { label: "Port", value: ":5173" },
          { label: "Bind", value: "0.0.0.0" },
          { label: "Runtime", value: "Node ≥ 18" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500">{item.label}</span>
            <span className="text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────
   SECTION 3: HOW IT WORKS PIPELINE
───────────────────────────────────────── */
const LaptopIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="6" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="4" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1.5" />
    <line x1="2" y1="26" x2="30" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="12" y="23" width="8" height="3" rx="1" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
  </svg>
);

const QRIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="3" y="3" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="6" y="6" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.6" />
    <rect x="17" y="3" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="20" y="6" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.6" />
    <rect x="3" y="17" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="6" y="20" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.6" />
    <rect x="17" y="17" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    <rect x="25" y="17" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    <rect x="17" y="25" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    <rect x="25" y="25" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
  </svg>
);

const GamepadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M6 10 C4 10 2 12 2 15 L3 22 C3.5 25 6 27 8 25 L10 22 H22 L24 25 C26 27 28.5 25 29 22 L30 15 C30 12 28 10 26 10 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="9" y1="16" x2="9" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="7" y1="18" x2="11" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="22" cy="17" r="1.5" fill="currentColor" opacity="0.7" />
    <circle cx="25" cy="20" r="1.5" fill="currentColor" opacity="0.7" />
  </svg>
);

const STEPS = [
  {
    num: "01",
    label: "Host",
    icon: <LaptopIcon />,
    desc: "Run `npx localflux start` on your laptop. The engine auto-discovers your LAN IP and spins up the state machine.",
    color: "emerald",
  },
  {
    num: "02",
    label: "Connect",
    icon: <QRIcon />,
    desc: "A QR code is generated pointing to your local IP. Students scan with any device — no app install required.",
    color: "cyan",
  },
  {
    num: "03",
    label: "Play",
    icon: <GamepadIcon />,
    desc: "Real-time LAN multiplayer with sub-5ms latency. Scores sync, reconnects are invisible, telemetry exports on demand.",
    color: "emerald",
  },
];

const ArrowConnector = () => (
  <div className="hidden md:flex items-center justify-center px-2 pt-6">
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
      <line x1="0" y1="12" x2="48" y2="12" stroke="#1f2937" strokeWidth="1.5" strokeDasharray="4 3" />
      <polyline points="42,6 52,12 42,18" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  </div>
);

/* ─────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────── */
export default function LocalFluxSections() {
  return (
    <div className="min-h-screen relative font-geist">
      <DynamicBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        <GlobalStyles />

        <Navigation />
        <Hero />
        <Features />
        <BentoGrid />

        <DeveloperExperience />

        {/* Enhanced section divider with glow */}
        <div className="w-full max-w-3xl mx-auto px-6 my-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
            <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />
          </div>
        </div>

        <TerminalSection />

        {/* Enhanced section divider with glass */}
        <div className="w-full max-w-3xl mx-auto px-6 my-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
            <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
          </div>
        </div>

        <HowItWorks />
        <SocialProof />
        <Contributors />
        <Footer />
      </div>
    </div>
  );
}