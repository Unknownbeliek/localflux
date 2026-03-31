import React from "react";
import { motion } from "framer-motion";
import { Server, QrCode, Gamepad2 } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Server,
      title: "Host",
      description: "Run one command to start your local game server",
      code: "npx localflux start",
    },
    {
      icon: QrCode,
      title: "Connect",
      description: "Players scan QR code to join instantly",
      code: "scan & join",
    },
    {
      icon: Gamepad2,
      title: "Play",
      description: "Real-time quiz games with zero lag",
      code: "0ms latency",
    },
  ];

  return (
    <section className="py-24">
      <style>{`
        .step-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
            background: #10B981;
          color: black;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(16,185,129,0.4);
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-colors duration-300">
            How It{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              Works
            </span>
          </h2>
          <p className="text-slate-600 dark:text-gray-300 mt-4 text-lg transition-colors duration-300">
            Three simple steps to host professional quiz games
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {steps.map((step, i) => {
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
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                  cardRef.current?.style.setProperty("--x", "50%");
                  cardRef.current?.style.setProperty("--y", "50%");
                }}
                className="group relative pt-7 h-full"
              >
                {/* Main card */}
                <div className="interactive-border relative h-full min-h-[200px] p-6 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 backdrop-blur-xl hover:border-slate-400 dark:hover:border-white/15 transition-all duration-300 flex flex-col" style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                }}>
                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    {/* Icon - subtle hover scale */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      whileHover={{ scale: 1.08 }}
                      className="w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 transition-transform duration-200"
                    >
                      <step.icon className="text-black w-6 h-6" />
                    </motion.div>

                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-slate-800 dark:group-hover:text-white/90 transition-colors duration-300">
                      {step.title}
                    </h3>

                    <p className="text-slate-600 dark:text-gray-400 mb-4 group-hover:text-slate-700 dark:group-hover:text-gray-300/80 transition-colors duration-300">
                      {step.description}
                    </p>

                    {/* Code badge - simple, subtle */}
                    <div className="inline-block mt-auto self-start text-emerald-600 dark:text-emerald-400 text-sm font-mono bg-emerald-50 dark:bg-black/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-white/10 group-hover:border-emerald-300 dark:group-hover:border-white/20 transition-colors duration-300">
                      {step.code}
                    </div>
                  </div>
                </div>

                {/* Step number badge */}
                <div className="step-badge">{i + 1}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
