import { motion } from "framer-motion";
import { GitBranch, BookOpen, FileText, Terminal } from "lucide-react";

export default function Footer() {
  const links = [
    { icon: GitBranch, label: "GitHub" },
    { icon: BookOpen, label: "Docs" },
    { icon: FileText, label: "License" },
    { icon: Terminal, label: "CLI" },
  ];

  return (
    <footer className="relative py-20 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-between gap-10 mb-12"
        >
          {/* Logo Section */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center md:text-left group cursor-pointer"
          >
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300"
                style={{ boxShadow: "0 0 16px rgba(16,185,129,0.6), 0 0 32px rgba(6,182,212,0.3)" }}
              >
                <span className="text-white font-bold">LF</span>
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-emerald-300 group-hover:to-cyan-300 transition-all duration-300">
                LocalFlux
              </span>
            </div>
            <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
              The game engine for the offline world
            </p>
          </motion.div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6">
            {links.map((link, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ scale: 1.1, y: -2 }}
                className="group relative flex items-center gap-2 text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors duration-300"
              >
                {/* Glow on hover */}
                <div className="absolute -inset-2 rounded-lg opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300 bg-emerald-400/30" />
                
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  className="relative flex items-center gap-2"
                  style={{ filter: "drop-shadow(0 0 8px rgba(16,185,129,0.4))" }}
                >
                  <link.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
                  <span className="relative">{link.label}</span>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div 
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8 origin-left"
        />

        {/* Bottom Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm"
        >
          <p className="hover:text-gray-400 transition-colors duration-300">
            © 2026 LocalFlux. All rights reserved.
          </p>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="group relative px-4 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 hover:border-emerald-400/80 hover:text-emerald-300 transition-all duration-300 bg-white/[0.03] backdrop-blur-sm"
          >
            {/* Badge glow */}
            <div className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-70 blur-lg transition-opacity duration-300 bg-gradient-to-r from-emerald-400/60 to-cyan-400/30" />
            <span className="relative">100% Open Source</span>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
