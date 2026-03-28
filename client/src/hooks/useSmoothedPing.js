/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';

export default function useSmoothedPing(rawPing, alpha = 0.2) {
  const exactEmaRef = useRef(0);
  const [smoothedPing, setSmoothedPing] = useState(null);

  useEffect(() => {
    const numericRaw = Number(rawPing);
    if (!Number.isFinite(numericRaw)) {
      exactEmaRef.current = 0;
      setSmoothedPing(null);
      return;
    }

    const safeRaw = Math.max(0, numericRaw);

    // First sample after connect: snap immediately instead of easing from zero.
    if (exactEmaRef.current === 0) {
      exactEmaRef.current = safeRaw;
      setSmoothedPing(Math.round(safeRaw));
      return;
    }

    const safeAlpha = Number.isFinite(Number(alpha)) ? Number(alpha) : 0.2;
    const clampedAlpha = Math.min(1, Math.max(0, safeAlpha));
    const nextEma = (safeRaw * clampedAlpha) + (exactEmaRef.current * (1 - clampedAlpha));

    exactEmaRef.current = nextEma;
    setSmoothedPing(Math.round(nextEma));
  }, [rawPing, alpha]);

  return smoothedPing;
}
