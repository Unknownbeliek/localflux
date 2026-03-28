import React from "react";
import { motion } from "framer-motion";
import { Download, Code2, Sparkles } from "lucide-react";

const TERMINAL_SEQUENCE = [
  { delay: 0, type: "prompt", text: "" },
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

export default function Hero() {
  const [visibleLines, setVisibleLines] = React.useState([]);
  const [typingText, setTypingText] = React.useState("");
  const [phase, setPhase] = React.useState("idle");
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const timers = [];

    const startSequence = () => {
      setVisibleLines([]);
      setTypingText("");
      setPhase("idle");

      TERMINAL_SEQUENCE.forEach((step) => {
        const t = setTimeout(() => {
          if (step.type === "typing") {
            setPhase("typing");
            const chars = step.text.split("");
            chars.forEach((char, ci) => {
              const ct = setTimeout(() => {
                setTypingText((prev) => prev + char);
                if (ci === chars.length - 1) setPhase("output");
              }, ci * 55);
              timers.push(ct);
            });
          } else if (step.type === "output" || step.type === "success") {
            setVisibleLines((prev) => [...prev, { text: step.text, color: step.color, bold: step.type === "success" }]);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }
        }, step.delay);
        timers.push(t);
      });

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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="relative z-10 container mx-auto px-6 py-32 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="max-w-6xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-white/20 transition-colors"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </motion.div>
            <span className="text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-medium">
              100% Open Source • Zero Cloud Dependency
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold text-white leading-tight"
          >
            The Game Engine for the{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Offline World
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto"
          >
            Host real-time interactive quizzes on your local network with ultra-low latency.
            No cloud. No lag. No limits.
          </motion.p>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {/* Primary Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="px-6 py-3 rounded-full text-black font-semibold flex items-center gap-2 relative bg-gradient-to-r from-emerald-400 to-cyan-400 transition-transform duration-[250ms] ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>Download Core Engine</span>
            </motion.button>

            {/* Secondary Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2 relative border border-white/10 bg-white/[0.03] transition-transform duration-[250ms] ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
            >
              <Code2 className="w-5 h-5" />
              <span>Run via CLI</span>
            </motion.button>
          </div>

          <div className="mb-8 text-center flex flex-col gap-2 mt-12">
            <span className="font-mono text-xs tracking-[0.25em] text-slate-500 uppercase">Developer Experience</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              One command.{" "}
              <span className="shimmer-text">Instant LAN.</span>
            </h2>
          </div>

          {/* Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="max-w-4xl mx-auto"
          >
            <div className="terminal-window relative">
              <div className="terminal-scanline" />

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

              <div
                ref={containerRef}
                className="p-5 min-h-64 max-h-80 overflow-y-auto font-mono text-sm leading-6 scroll-smooth"
                style={{ scrollbarWidth: "none" }}
              >
                <div className="text-slate-700 text-xs mb-3">Last login: Mon Mar 24 07:31:18 on ttys001</div>

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

                {phase === "done" && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-400">❯</span>
                    <span className="inline-block w-2 h-4 bg-emerald-400 align-middle" style={{ animation: "typing-cursor 0.8s step-end infinite" }} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              {[
                { label: "npx install", value: "zero config" },
                { label: "Port", value: ":5173" },
                { label: "Bind", value: "0.0.0.0" },
                { label: "Runtime", value: "Node ≥ 18" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-slate-300 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
