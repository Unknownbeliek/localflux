import { memo } from "react";

const STATIC_PARTICLES = [
  { top: "12%", left: "18%", size: 2, color: "rgba(16,185,129,0.75)" },
  { top: "22%", left: "76%", size: 2, color: "rgba(6,182,212,0.72)" },
  { top: "36%", left: "58%", size: 1.8, color: "rgba(16,185,129,0.68)" },
  { top: "48%", left: "14%", size: 2.2, color: "rgba(6,182,212,0.7)" },
  { top: "62%", left: "82%", size: 1.8, color: "rgba(16,185,129,0.65)" },
  { top: "74%", left: "39%", size: 2, color: "rgba(6,182,212,0.68)" },
  { top: "84%", left: "64%", size: 1.8, color: "rgba(16,185,129,0.62)" },
];

function LightBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #030712 0%, #020617 50%, #030712 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 22%, rgba(16,185,129,0.09) 0%, rgba(6,182,212,0.06) 32%, rgba(3,7,18,0.12) 58%, rgba(3,7,18,0.45) 100%)",
        }}
      />

      <div className="absolute inset-0">
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
              boxShadow: `0 0 8px ${particle.color}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export { LightBackground };
export default memo(LightBackground);