import { useEffect } from 'react';
import { motion } from 'framer-motion';

const CALLIGRAPHY_FONT_NAME = 'Dancing Script';
const CALLIGRAPHY_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap';

const writingVariants = {
  initial: {
    clipPath: 'inset(0% 100% 0% 0%)',
  },
  animate: {
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: {
      duration: 3.6,
      ease: 'easeInOut',
    },
  },
};

function ensureCalligraphyFont() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-opening-sequence-font="true"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CALLIGRAPHY_FONT_URL;
  link.setAttribute('data-opening-sequence-font', 'true');
  document.head.appendChild(link);
}

export default function OpeningSequence({
  text = 'LocalFlux',
  className = '',
  baseClassName = 'font-black tracking-tight title-glow',
  baseStyle,
  calligraphyColor = '#7fffd4',
}) {
  useEffect(() => {
    ensureCalligraphyFont();
  }, []);

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={baseClassName} style={baseStyle}>
        {text}
      </span>

      <motion.span
        variants={writingVariants}
        initial="initial"
        animate="animate"
        className="pointer-events-none absolute left-0 top-0"
        style={{
          fontFamily: `${CALLIGRAPHY_FONT_NAME}, cursive`,
          color: calligraphyColor,
          textShadow:
            '0 0 6px rgba(127, 255, 212, 0.55), 0 0 14px rgba(16, 185, 129, 0.35), 0 0 24px rgba(16, 185, 129, 0.2)',
          willChange: 'clip-path',
        }}
      >
        {text}
      </motion.span>
    </div>
  );
}
