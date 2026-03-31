import { motion, useScroll, useTransform } from "framer-motion";
import { GitBranch, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

const DOCS_URL = "http://localhost:5173";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { scrollY } = useScroll();

  const scrollToFeatures = (event) => {
    event.preventDefault();
    const featuresSection = document.getElementById("engine-architecture");
    featuresSection?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    isDark
      ? ["rgba(3,7,18,0)", "rgba(3,7,18,0.95)"]
      : ["rgba(248,250,252,0)", "rgba(248,250,252,0.94)"]
  );

  return (
    <>
      <motion.nav
        style={{ backgroundColor }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 transition-colors duration-300"
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex items-center gap-3 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 dark:from-emerald-400 dark:to-cyan-400 flex items-center justify-center">
                <span className="text-white dark:text-white font-bold">LF</span>
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-lg transition-colors duration-300">LocalFlux</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex gap-8 text-slate-600 dark:text-gray-400 transition-colors duration-300">
              <a href="#engine-architecture" onClick={scrollToFeatures} className="relative pb-1 transition-colors duration-200 hover:text-slate-900 dark:hover:text-white after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-emerald-400 after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100">Features</a>
              <a href={DOCS_URL} className="relative pb-1 transition-colors duration-200 hover:text-slate-900 dark:hover:text-white after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-emerald-400 after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100">Docs</a>
              <a href={DOCS_URL} className="relative pb-1 transition-colors duration-200 hover:text-slate-900 dark:hover:text-white after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-emerald-400 after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100">How It Works</a>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">

              <motion.a
                href="https://github.com/Unknownbeliek/localflux"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="group hidden sm:flex items-center gap-2 text-slate-600 dark:text-gray-400 transition-colors duration-300"
              >
                <span className="flex items-center gap-2 transition-transform duration-300 ease-out">
                  <GitBranch className="w-5 h-5 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
                  GitHub
                </span>
              </motion.a>

              <button
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="h-10 w-10 rounded-lg border border-slate-300 bg-white/90 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-emerald-400/60 dark:hover:text-emerald-300"
              >
                <span className="sr-only">Toggle theme</span>
                <span className="flex items-center justify-center">
                  {isDark ? (
                    <Sun className="w-5 h-5 transition-transform duration-300" />
                  ) : (
                    <Moon className="w-5 h-5 transition-transform duration-300" />
                  )}
                </span>
              </button>

              <a href="http://localhost:5175" className="hidden sm:block px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0 active:scale-[0.98]">
                Get Started
              </a>

              {/* Mobile toggle */}
              <button
                className="md:hidden text-slate-600 dark:text-gray-400 transition-colors duration-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>

          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 bg-white/95 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 md:hidden z-40 backdrop-blur-xl transition-colors duration-300">
          <div className="p-6 flex flex-col gap-4 text-slate-700 dark:text-gray-300 transition-colors duration-300">
            <a href="#engine-architecture" onClick={scrollToFeatures}>Features</a>
            <a href={DOCS_URL}>Docs</a>
            <a href={DOCS_URL}>How It Works</a>
            <button
              onClick={toggleTheme}
              className="mt-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-800 dark:border-white/20 dark:text-slate-200"
            >
              {isDark ? "Switch to Light" : "Switch to Dark"}
            </button>
            <a href="http://localhost:5175" className="mt-2 px-4 py-2 bg-emerald-400 text-black rounded-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0 active:scale-[0.98]">
              Get Started
            </a>
          </div>
        </div>
      )}
    </>
  );
}
