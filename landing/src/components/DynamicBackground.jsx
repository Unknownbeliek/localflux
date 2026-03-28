import { memo, useMemo } from "react";
import { motion } from "framer-motion";

const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(to right, rgba(16,185,129,0.1) 1px, transparent 1px)," +
    "linear-gradient(to bottom, rgba(16,185,129,0.1) 1px, transparent 1px)",
  backgroundSize: "80px 80px",
};

const MAIN_ORB_1_STYLE = {
  background:
    "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
  filter: "blur(80px)",
  willChange: "transform, opacity",
};

const MAIN_ORB_2_STYLE = {
  background:
    "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",
  filter: "blur(80px)",
  willChange: "transform, opacity",
};

const MAIN_ORB_3_STYLE = {
  background:
    "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
  filter: "blur(90px)",
  willChange: "transform, opacity",
};

const MAIN_ORB_1_ANIMATE = { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] };
const MAIN_ORB_1_TRANSITION = { duration: 20, repeat: Infinity, ease: "easeInOut" };

const MAIN_ORB_2_ANIMATE = {
  x: [0, -50, 0],
  y: [0, -30, 0],
  scale: [1, 1.15, 1],
};
const MAIN_ORB_2_TRANSITION = { duration: 25, repeat: Infinity, ease: "easeInOut" };

const MAIN_ORB_3_ANIMATE = { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] };
const MAIN_ORB_3_TRANSITION = { duration: 15, repeat: Infinity, ease: "easeInOut" };

const VIGNETTE_STYLE = {
  background:
    "radial-gradient(ellipse at center, transparent 0%, rgba(3,7,18,0.5) 100%)",
};

const FLOATING_ORB_BACKGROUNDS = [
  "radial-gradient(circle, rgba(16,185,129,0.2), transparent)",
  "radial-gradient(circle, rgba(6,182,212,0.2), transparent)",
  "radial-gradient(circle, rgba(139,92,246,0.15), transparent)",
];

export function DynamicBackground() {
  const floatingOrbs = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, id) => {
        const moveX = Math.random() * 100 - 50;
        const moveY = Math.random() * 100 - 50;

        return {
          id,
          style: {
            width: 150 + Math.random() * 200,
            height: 150 + Math.random() * 200,
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            background: FLOATING_ORB_BACKGROUNDS[id % 3],
            filter: "blur(60px)",
            willChange: "transform, opacity",
          },
          animate: {
            x: [0, moveX, 0],
            y: [0, moveY, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          },
          transition: {
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          },
        };
      }),
    []
  );

  const baseParticles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, id) => {
        const colorRoll = Math.random();
        const color =
          colorRoll < 0.5
            ? "rgba(16,185,129,0.9)"
            : colorRoll < 0.75
            ? "rgba(6,182,212,0.9)"
            : "rgba(139,92,246,0.85)";
        const driftX = Math.random() * 20 - 10;
        const driftY = Math.random() * 20 - 10;
        const size = 2 + Math.random() * 2;

        return {
          id,
          style: {
            width: size + "px",
            height: size + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            background: color,
            boxShadow: "0 0 12px " + color,
            willChange: "transform, opacity",
          },
          animate: {
            x: [0, driftX, 0],
            y: [0, driftY, 0],
            opacity: [0.25, 0.75, 0.25],
            scale: [1, 1.35, 1],
          },
          transition: {
            duration: 4 + Math.random() * 4,
            delay: Math.random() * 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      }),
    []
  );

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-[#030712]" />

      {/* Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={GRID_STYLE} />
      </div>

      {/* Main Orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
        style={MAIN_ORB_1_STYLE}
        animate={MAIN_ORB_1_ANIMATE}
        transition={MAIN_ORB_1_TRANSITION}
      />

      <motion.div
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
        style={MAIN_ORB_2_STYLE}
        animate={MAIN_ORB_2_ANIMATE}
        transition={MAIN_ORB_2_TRANSITION}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={MAIN_ORB_3_STYLE}
        animate={MAIN_ORB_3_ANIMATE}
        transition={MAIN_ORB_3_TRANSITION}
      />

      {/* Floating Orbs (FIXED) */}
      {floatingOrbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={orb.style}
          animate={orb.animate}
          transition={orb.transition}
        />
      ))}

      {/* Existing calm particles (preserved) */}
      <div className="absolute inset-0">
        {baseParticles.map((p) => (
          <motion.div
            key={"base-particle-" + p.id}
            className="absolute rounded-full"
            style={p.style}
            animate={p.animate}
            transition={p.transition}
          />
        ))}
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={VIGNETTE_STYLE}
      />

      {/* Top + Bottom Fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#030712] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />

    </div>
  );
}

export default memo(DynamicBackground);