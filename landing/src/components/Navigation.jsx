import { motion, useScroll, useTransform } from "framer-motion";
import { Terminal, GitBranch, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(3,7,18,0)", "rgba(3,7,18,0.95)"]
  );

  return (
    <>
      <motion.nav
        style={{ backgroundColor }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10"
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-white font-bold">LF</span>
              </div>
              <span className="text-white font-bold text-lg">LocalFlux</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex gap-8 text-gray-400">
              <a href="#" className="hover:text-white">Features</a>
              <a href="#" className="hover:text-white">Docs</a>
              <a href="#" className="hover:text-white">How It Works</a>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">

              <a href="#" className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-white">
                <GitBranch className="w-5 h-5" />
                GitHub
              </a>

              <button className="hidden sm:block px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold">
                Get Started
              </button>

              {/* Mobile toggle */}
              <button
                className="md:hidden text-gray-400"
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
        <div className="fixed top-20 left-0 right-0 bg-slate-900 border-b border-white/10 md:hidden z-40">
          <div className="p-6 flex flex-col gap-4 text-gray-300">
            <a href="#">Features</a>
            <a href="#">Docs</a>
            <a href="#">How It Works</a>
            <button className="mt-2 px-4 py-2 bg-emerald-400 text-black rounded-lg">
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
}
