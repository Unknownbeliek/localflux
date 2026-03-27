import React from "react";
import { motion } from "framer-motion";
import { Zap, Crown, GitBranch, Wifi } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "0ms Local Network",
      description: "Ultra-low latency on your LAN. No internet roundtrips, just pure speed.",
      glowColor: "rgba(16, 185, 129, 0.15)"
    },
    {
      icon: Crown,
      title: "God-Mode Host",
      description: "Complete control over game state. Pause, skip, or override any action instantly.",
      glowColor: "rgba(6, 182, 212, 0.15)"
    },
    {
      icon: GitBranch,
      title: "Deck Studio Pipeline",
      description: "Import CSV, validate schemas, export production-ready game decks.",
      glowColor: "rgba(139, 92, 246, 0.15)"
    },
    {
      icon: Wifi,
      title: "Bulletproof Reconnect",
      description: "Mobile players reconnect seamlessly. No progress lost, ever.",
      glowColor: "rgba(59, 130, 246, 0.15)"
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            Built for{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              Performance
            </span>
          </h2>
          <p className="text-gray-300 mt-4 text-lg">
            Everything you need to run professional quiz games
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {features.map((f, i) => {
            const cardRef = React.useRef(null);
            
            const handleMouseMove = (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
              e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
            };
            
            return (
              <motion.div
                key={i}
                ref={cardRef}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                  cardRef.current?.style.setProperty("--x", "50%");
                  cardRef.current?.style.setProperty("--y", "50%");
                }}
                className="group relative h-full"
              >
                {/* Main card */}
                <div className="interactive-border relative h-full min-h-[200px] p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/15 transition-all duration-300 flex flex-col" style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                }}>
                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Icon - subtle hover scale */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      whileHover={{ scale: 1.08 }}
                      className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 transition-transform duration-200"
                    >
                      <f.icon className="text-black w-6 h-6" />
                    </motion.div>

                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-white/90 transition-colors duration-300">
                      {f.title}
                    </h3>

                    <p className="text-gray-400 group-hover:text-gray-300/80 transition-colors duration-300 flex-1">
                      {f.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
