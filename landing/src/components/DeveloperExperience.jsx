import React from "react";
import { motion } from "framer-motion";

export function DeveloperExperience() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          {/* Heading */}
          <motion.div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Developer-First
              </span>{" "}
              Experience
            </h2>

            <p className="text-xl md:text-2xl text-slate-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
              Get started in seconds. No configuration, no cloud setup, no hassle.
            </p>
          </motion.div>

          {/* Stat Cards - Premium */}
          <motion.div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Install Time", value: "< 30s", icon: "⚡" },
              { label: "Configuration", value: "Zero", icon: "✨" },
              { label: "Dependencies", value: "Minimal", icon: "📦" },
            ].map((stat, i) => {
              const [light, setLight] = React.useState({ x: 0, y: 0 });
              
              const handleMouseMove = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setLight({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              };
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -6 }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setLight({ x: 0, y: 0 })}
                  className="group relative"
                >
                  {/* Card */}
                  <div className="relative bg-white/80 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-2xl p-6 text-center backdrop-blur-xl transition-all duration-300" style={{
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                  }}>
                    {/* Cursor-following light */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none rounded-2xl transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(300px circle at ${light.x}px ${light.y}px, rgba(16,185,129,0.12), transparent 60%)`
                      }}
                    />

                    {/* Content */}
                    <motion.div 
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="relative text-4xl mb-3 z-10"
                    >
                      {stat.icon}
                    </motion.div>

                    <div className="relative text-3xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2 z-10">
                      {stat.value}
                    </div>
                    <div className="relative text-slate-600 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300/80 transition-colors duration-300 z-10">{stat.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
