import { motion } from "framer-motion";
import { GitBranch, BookOpen, FileText, Terminal } from "lucide-react";

export default function Footer() {
  const links = [
    { icon: GitBranch, label: "GitHub", href: "https://github.com/Unknownbeliek/localflux" },
    { icon: BookOpen, label: "Docs", href: "http://localhost:5173/guide" },
    { icon: FileText, label: "License", href: "https://github.com/Unknownbeliek/localflux/blob/main/LICENSE" },
    { icon: Terminal, label: "CLI", href: "https://github.com/Unknownbeliek/localflux#quick-start" },
  ];

  return (
    <footer className="relative py-20 border-t border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] backdrop-blur-sm transition-colors duration-300">
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
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent group-hover:from-emerald-500 dark:group-hover:from-emerald-300 group-hover:to-cyan-500 dark:group-hover:to-cyan-300 transition-all duration-300">
                LocalFlux
              </span>
            </div>
            <p className="text-slate-600 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-gray-300 transition-colors duration-300">
              The game engine for the offline world
            </p>
          </motion.div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6">
            {links.map((link, i) => (
              <motion.a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ scale: 1.1, y: -2 }}
                className="group relative flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors duration-300"
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
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div 
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent mb-8 origin-left transition-colors duration-300"
        />

        {/* Bottom Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 dark:text-gray-500 text-sm transition-colors duration-300"
        >
          <p className="hover:text-slate-700 dark:hover:text-gray-400 transition-colors duration-300">
            © 2026 LocalFlux. All rights reserved.
          </p>

          <motion.div 
            whileHover={{ scale: 1.05, y: -2 }}
            className="group relative px-4 py-2 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-300 transition-[border-color,color,transform,background-color,opacity] duration-300 ease-out bg-white dark:bg-white/[0.03] backdrop-blur-sm overflow-hidden"
          >
            {/* Badge glow */}
            <div className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300 bg-gradient-to-r from-emerald-400/40 to-cyan-400/25" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-emerald-400/10" />
            <span className="relative">100% Open Source</span>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
