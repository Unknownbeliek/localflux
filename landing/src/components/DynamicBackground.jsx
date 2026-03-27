import { useMemo } from "react";
import { motion } from "framer-motion";

// ✅ Pre-generate stable values (VERY IMPORTANT)
const floatingOrbs = Array.from({ length: 8 }).map(() => ({
  width: 150 + Math.random() * 200,
  height: 150 + Math.random() * 200,
  left: Math.random() * 100,
  top: Math.random() * 100,
  moveX: Math.random() * 100 - 50,
  moveY: Math.random() * 100 - 50,
  duration: 15 + Math.random() * 10,
  delay: Math.random() * 5,
}));

export function DynamicBackground() {
  const baseParticles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, id) => ({
        id,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 2,
        color:
          Math.random() < 0.5
            ? "rgba(16,185,129,0.9)"
            : Math.random() < 0.5
            ? "rgba(6,182,212,0.9)"
            : "rgba(139,92,246,0.85)",
        duration: 4 + Math.random() * 4,
        delay: Math.random() * 3,
        driftX: Math.random() * 20 - 10,
        driftY: Math.random() * 20 - 10,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#030712]" />

      {/* Grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(16,185,129,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(16,185,129,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Main Orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          filter: "blur(90px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Orbs (FIXED) */}
      {floatingOrbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.width,
            height: orb.height,
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            background:
              i % 3 === 0
                ? "radial-gradient(circle, rgba(16,185,129,0.2), transparent)"
                : i % 3 === 1
                ? "radial-gradient(circle, rgba(6,182,212,0.2), transparent)"
                : "radial-gradient(circle, rgba(139,92,246,0.15), transparent)",
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, orb.moveX, 0],
            y: [0, orb.moveY, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {/* Existing calm particles (preserved) */}
      <div className="absolute inset-0">
        {baseParticles.map((p) => (
          <motion.div
            key={`base-particle-${p.id}`}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: p.color,
              boxShadow: `0 0 12px ${p.color}`,
            }}
            animate={{
              x: [0, p.driftX, 0],
              y: [0, p.driftY, 0],
              opacity: [0.25, 0.75, 0.25],
              scale: [1, 1.35, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(3,7,18,0.5) 100%)",
        }}
      />

      {/* Top + Bottom Fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#030712] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />

    </div>
  );
}