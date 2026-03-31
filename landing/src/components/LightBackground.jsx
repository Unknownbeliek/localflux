import { memo } from "react";

const STATIC_PARTICLES = [
  { top: "12%", left: "18%", size: 2, color: "rgba(16,185,129,0.22)" },
  { top: "22%", left: "76%", size: 2, color: "rgba(6,182,212,0.18)" },
  { top: "36%", left: "58%", size: 1.8, color: "rgba(16,185,129,0.2)" },
  { top: "48%", left: "14%", size: 2.2, color: "rgba(6,182,212,0.16)" },
  { top: "62%", left: "82%", size: 1.8, color: "rgba(16,185,129,0.18)" },
  { top: "74%", left: "39%", size: 2, color: "rgba(6,182,212,0.17)" },
  { top: "84%", left: "64%", size: 1.8, color: "rgba(16,185,129,0.15)" },
];

function LightBackground({ darkMode = false }) {
  const baseGradient = darkMode
    ? "linear-gradient(180deg, #030712 0%, #020617 50%, #030712 100%)"
    : "linear-gradient(180deg, #ffffff 0%, #f8fafc 45%, #f1f5f9 100%)";

  const overlayGradient = darkMode
    ? "radial-gradient(120% 85% at 50% 22%, rgba(16,185,129,0.09) 0%, rgba(6,182,212,0.06) 32%, rgba(3,7,18,0.12) 58%, rgba(3,7,18,0.45) 100%)"
    : "radial-gradient(120% 85% at 50% 18%, rgba(16,185,129,0.09) 0%, rgba(6,182,212,0.05) 26%, rgba(226,232,240,0.2) 58%, rgba(248,250,252,0.7) 100%)";

  const particleOpacityClass = darkMode ? "opacity-70" : "opacity-45";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: baseGradient,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: overlayGradient,
        }}
      />

      <div className={`absolute inset-0 ${particleOpacityClass}`}>
        {STATIC_PARTICLES.map((particle, index) => (
          <span
            key={`light-particle-${index}`}
            className="absolute rounded-full"
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: particle.color,
              boxShadow: `0 0 5px ${particle.color}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export { LightBackground };
export default memo(LightBackground);