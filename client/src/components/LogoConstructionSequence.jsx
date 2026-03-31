import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const FONT_LINK_HREF =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&family=Satisfy&display=swap';

function ensureFontsLoaded() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-logo-construction-fonts="true"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_LINK_HREF;
  link.setAttribute('data-logo-construction-fonts', 'true');
  document.head.appendChild(link);
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 72 48" className="h-10 w-14" fill="none" aria-hidden="true">
      <motion.rect
        x="6"
        y="8"
        width="60"
        height="32"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }}
      />
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.rect
          key={i}
          x={10 + i * 12}
          y="12"
          width="6"
          height="4"
          fill="currentColor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.8 + i * 0.05, duration: 0.25 }}
        />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.rect
          key={`b-${i}`}
          x={10 + i * 12}
          y="32"
          width="6"
          height="4"
          fill="currentColor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.95 + i * 0.05, duration: 0.25 }}
        />
      ))}
    </svg>
  );
}

function EyesIcon() {
  return (
    <svg viewBox="0 0 96 48" className="h-10 w-16" fill="none" aria-hidden="true">
      <motion.path
        d="M8 24C15 14 24 10 34 10C44 10 53 14 60 24C53 34 44 38 34 38C24 38 15 34 8 24Z"
        stroke="currentColor"
        strokeWidth="1.7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.05, delay: 0.65, ease: 'easeInOut' }}
      />
      <motion.path
        d="M36 24C43 14 52 10 62 10C72 10 81 14 88 24C81 34 72 38 62 38C52 38 43 34 36 24Z"
        stroke="currentColor"
        strokeWidth="1.7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.05, delay: 0.82, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="34"
        cy="24"
        r="3.2"
        fill="currentColor"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.32 }}
      />
      <motion.circle
        cx="62"
        cy="24"
        r="3.2"
        fill="currentColor"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.22, duration: 0.32 }}
      />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" fill="none" aria-hidden="true">
      <motion.rect
        x="24"
        y="11"
        width="16"
        height="28"
        rx="8"
        stroke="currentColor"
        strokeWidth="1.7"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.75, delay: 0.7, ease: 'easeOut' }}
      />
      <motion.path
        d="M18 30C18 37 23 42 32 42C41 42 46 37 46 30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.95 }}
      />
      <motion.path
        d="M32 42V52"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay: 1.05 }}
      />
      <motion.path
        d="M24 52H40"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay: 1.12 }}
      />
      <motion.path
        d="M50 20C54 24 54 32 50 36"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.55, delay: 1.15 }}
      />
      <motion.path
        d="M56 16C62 22 62 34 56 40"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 0.55, delay: 1.28 }}
      />
    </svg>
  );
}

function NetworkLayer() {
  const nodePulse = {
    scale: [1, 1.3, 1],
    opacity: [0.35, 1, 0.35],
  };

  return (
    <motion.svg
      viewBox="0 0 640 320"
      className="pointer-events-none absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9 }}
      aria-hidden="true"
    >
      <motion.path
        d="M72 190L180 128L292 180L368 120L470 160L574 110"
        stroke="rgba(51, 255, 233, 0.25)"
        strokeWidth="1.4"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.35, delay: 0.15, ease: 'easeOut' }}
      />
      <motion.path
        d="M66 244L156 212L256 240L336 198L430 238L542 206"
        stroke="rgba(42, 202, 191, 0.22)"
        strokeWidth="1.15"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.95 }}
        transition={{ duration: 1.5, delay: 0.32, ease: 'easeOut' }}
      />

      {[
        [72, 190, 0.25],
        [180, 128, 0.38],
        [292, 180, 0.54],
        [368, 120, 0.78],
        [470, 160, 1.05],
        [574, 110, 1.22],
        [156, 212, 0.42],
        [336, 198, 0.88],
        [542, 206, 1.18],
      ].map(([x, y, delay], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3.6"
          fill="rgba(84, 255, 235, 0.9)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ ...nodePulse }}
          transition={{
            delay,
            duration: 2.4,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.svg>
  );
}

const scriptReveal = {
  hidden: { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0.2 },
  visible: {
    clipPath: 'inset(0% 0% 0% 0%)',
    opacity: 1,
    transition: { duration: 2.25, delay: 1.35, ease: 'easeInOut' },
  },
};

function toReverseOrderDelay(index, total, start = 0.9, step = 0.08) {
  return start + (total - 1 - index) * step;
}

export default function LogoConstructionSequence({ className = '' }) {
  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  const letters = useMemo(() => 'LOCALFLUX'.split(''), []);

  return (
    <motion.div
      className={`relative isolate overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#07111f] px-8 py-10 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{
        boxShadow: 'inset 0 0 120px rgba(10, 132, 155, 0.12), 0 18px 60px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* Schematic network in darkness (builds first, then keeps pulsing). */}
      <NetworkLayer />

      {/* Ambient scanline for a premium "digital lab" look. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgba(44,197,190,0.0) 0px, rgba(44,197,190,0.0) 8px, rgba(44,197,190,0.03) 9px)',
        }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mx-auto w-fit">
        <motion.p
          className="mb-2 text-center text-[11px] font-semibold tracking-[0.34em] text-teal-300/55"
          style={{ fontFamily: 'Montserrat, Poppins, sans-serif' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          LOCAL MULTIPLAYER QUIZ
        </motion.p>

        <div className="relative inline-block">
          {/* Main geometric sans letters assemble in reverse order to feel engineered. */}
          <h1
            className="relative m-0 whitespace-nowrap text-center text-5xl font-black tracking-[0.08em] text-cyan-200 md:text-7xl"
            style={{
              fontFamily: 'Montserrat, Poppins, sans-serif',
              textShadow:
                '0 0 10px rgba(89, 255, 244, 0.55), 0 0 24px rgba(25, 189, 210, 0.35), 0 0 46px rgba(25, 189, 210, 0.2)',
            }}
          >
            {letters.map((ch, index) => (
              <motion.span
                key={`${ch}-${index}`}
                className="inline-block"
                initial={{
                  opacity: 0,
                  y: index % 2 === 0 ? -16 : 16,
                  x: index % 3 === 0 ? 10 : -10,
                  filter: 'blur(8px)',
                  scale: 0.84,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                }}
                transition={{
                  duration: 0.52,
                  ease: 'easeOut',
                  delay: toReverseOrderDelay(index, letters.length),
                }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>

          {/* Script accent writes itself over the Flux region. */}
          <motion.span
            className="pointer-events-none absolute right-[2%] top-[40%] text-4xl text-teal-300 md:text-6xl"
            style={{
              fontFamily: 'Satisfy, cursive',
              textShadow:
                '0 0 7px rgba(96, 255, 224, 0.55), 0 0 15px rgba(26, 219, 182, 0.35), 0 0 26px rgba(26, 219, 182, 0.22)',
            }}
            variants={scriptReveal}
            initial="hidden"
            animate="visible"
          >
            Flux
          </motion.span>
        </div>

        {/* Multimedia icon ring around logo: frame, eyes, voice with line-draw build. */}
        <div className="pointer-events-none absolute -left-10 top-[58%] flex -translate-y-1/2 flex-col gap-4 text-teal-300/90">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
            <FilmIcon />
          </motion.div>
        </div>

        <div className="pointer-events-none absolute left-[44%] top-[106%] -translate-x-1/2 text-teal-300/90">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.45 }}>
            <EyesIcon />
          </motion.div>
        </div>

        <div className="pointer-events-none absolute -right-10 top-[60%] flex -translate-y-1/2 flex-col gap-4 text-teal-300/90">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.95, duration: 0.45 }}>
            <VoiceIcon />
          </motion.div>
        </div>
      </div>

      {/* Final completed-logo aura pulse. */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.15, 0.38, 0.15],
          boxShadow: [
            'inset 0 0 24px rgba(72, 247, 255, 0.08)',
            'inset 0 0 52px rgba(72, 247, 255, 0.2)',
            'inset 0 0 24px rgba(72, 247, 255, 0.08)',
          ],
        }}
        transition={{ delay: 2.05, duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
