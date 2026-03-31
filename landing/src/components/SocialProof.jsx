import React from "react";
import { motion } from "framer-motion";
import { Users, Zap, Shield } from "lucide-react";

export function SocialProof() {
  const stats = [
    {
      icon: Users,
      value: "1000+",
      label: "Players Hosted",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
      glowColor: "rgba(168, 85, 247, 0.5)",
    },
    {
      icon: Zap,
      value: "0ms",
      label: "Latency",
      gradient: "from-emerald-500 via-green-500 to-teal-600 dark:from-emerald-400",
      glowColor: "rgba(16, 185, 129, 0.5)",
    },
    {
      icon: Shield,
      value: "100%",
      label: "Offline",
      gradient: "from-cyan-500 via-blue-500 to-indigo-600 dark:from-cyan-400",
      glowColor: "rgba(6, 182, 212, 0.5)",
    },
  ];

  const badges = [
    "⚡ Zero Cloud Dependency",
    "🔒 Privacy First",
    "🌐 Works Everywhere",
    "📦 Self-Hosted",
  ];

  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6 relative z-10">
        {/* Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.2)] text-slate-900 dark:text-white transition-colors duration-300">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              Developers
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-gray-300 transition-colors duration-300">
            Join the growing community of offline-first game hosts
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {stats.map((stat, index) => {
            const cardRef = React.useRef(null);
            
            const handleMouseMove = (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
              e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
            };
            
            return (
              <motion.div
                key={index}
                ref={cardRef}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                  cardRef.current?.style.setProperty("--x", "50%");
                  cardRef.current?.style.setProperty("--y", "50%");
                }}
                className="relative group"
              >
                {/* Main card */}
                <div className="interactive-border relative p-10 text-center rounded-3xl bg-white/80 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 backdrop-blur-xl transition-all duration-300 overflow-hidden" style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                }}>
                  {/* Content - relative to stay on top */}
                  <div className="relative z-10">
                    {/* Icon - subtle hover scale, no animation */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: index * 0.1
                      }}
                      whileHover={{ scale: 1.08 }}
                      className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-gradient-to-r ${stat.gradient} transition-transform duration-200`}
                    >
                      <stat.icon className="w-10 h-10 text-white" />
                    </motion.div>

                    {/* Value with gradient */}
                    <div className={`text-5xl font-bold mb-3 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>

                    {/* Label */}
                    <div className="text-slate-600 dark:text-gray-300 text-lg group-hover:text-slate-700 dark:group-hover:text-gray-100/90 transition-colors duration-300">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Badges - Premium */}
        <div className="flex flex-wrap justify-center gap-4">
          {badges.map((badge, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -2 }}
              className="group relative"
            >
              <div className="relative px-6 py-3 rounded-2xl text-slate-600 dark:text-gray-300 bg-white/80 dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 group-hover:border-slate-400 dark:group-hover:border-white/20 backdrop-blur-md transition-all duration-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {badge}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
