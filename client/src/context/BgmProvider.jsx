import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createBgmEngine } from '../utils/bgmEngine';

const BGM_ENABLED_KEY = 'lf_bgm_enabled';
const BGM_VOLUME_KEY = 'lf_bgm_volume';
const BGM_FALLBACK_SRC = '/audio/bgm.mp3';
const BGM_TRACKS = {
  lobby: '/audio/bgm.mp3',
  gameplay: '/audio/bgm2.mp3',
  podium: '/audio/bgm3.mp3',
};

function createFileBgmEngine(trackMap, fallbackSrc) {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return {
      supported: false,
      async start() { return false; },
      stop() {},
      setVolume() {},
      setTrack() {},
      destroy() {},
    };
  }

  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.playsInline = true;
  let activeTrack = 'lobby';
  let currentSrc = '';
  let shouldResume = false;
  const fallbackUsedForTrack = new Set();

  const getTrackSrc = (track) => trackMap[track] || fallbackSrc;

  const pickSrcForTrack = (track) => {
    const primary = getTrackSrc(track);
    if (primary !== fallbackSrc && fallbackUsedForTrack.has(track)) {
      return fallbackSrc;
    }
    return primary;
  };

  const applyTrackSource = (track) => {
    const nextSrc = pickSrcForTrack(track);
    if (!nextSrc || nextSrc === currentSrc) return;
    currentSrc = nextSrc;
    audio.src = nextSrc;
    audio.load();
  };

  const onError = () => {
    if (currentSrc !== fallbackSrc) {
      fallbackUsedForTrack.add(activeTrack);
      currentSrc = '';
      applyTrackSource(activeTrack);
      if (shouldResume) {
        audio.play().catch(() => {});
      }
    }
  };

  audio.addEventListener('error', onError);

  return {
    supported: true,
    async start() {
      shouldResume = true;
      applyTrackSource(activeTrack);
      if (!audio.paused && !audio.ended) return true;

      try {
        await audio.play();
        return true;
      } catch {
        return false;
      }
    },
    stop() {
      shouldResume = false;
      audio.pause();
    },
    setVolume(nextVolume) {
      const clamped = Math.max(0, Math.min(1, Number(nextVolume) || 0));
      audio.volume = clamped;
    },
    setTrack(nextTrack) {
      const normalized = String(nextTrack || 'lobby').trim();
      activeTrack = Object.prototype.hasOwnProperty.call(trackMap, normalized) ? normalized : 'lobby';
      applyTrackSource(activeTrack);

      if (shouldResume) {
        audio.play().catch(() => {});
      }
    },
    destroy() {
      audio.pause();
      audio.removeEventListener('error', onError);
      audio.src = '';
    },
  };
}

const BgmContext = createContext(null);

export function BgmProvider({ children }) {
  const engineRef = useRef(null);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(BGM_ENABLED_KEY) !== 'false';
  });
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.7;
    const raw = Number(window.localStorage.getItem(BGM_VOLUME_KEY));
    if (!Number.isFinite(raw)) return 0.7;
    return Math.max(0, Math.min(1, raw));
  });
  const [supported, setSupported] = useState(true);
  const [musicPhase, setMusicPhase] = useState('lobby');

  useEffect(() => {
    const fileEngine = createFileBgmEngine(BGM_TRACKS, BGM_FALLBACK_SRC);
    const synthEngine = createBgmEngine();

    const engine = {
      supported: Boolean(fileEngine.supported || synthEngine.supported),
      async start() {
        if (fileEngine.supported) {
          const played = await fileEngine.start();
          if (played) {
            synthEngine.stop();
            return true;
          }
        }

        if (synthEngine.supported) {
          return synthEngine.start();
        }

        return false;
      },
      stop() {
        fileEngine.stop();
        synthEngine.stop();
      },
      setVolume(nextVolume) {
        fileEngine.setVolume(nextVolume);
        synthEngine.setVolume(nextVolume);
      },
      setTrack(nextTrack) {
        fileEngine.setTrack(nextTrack);
      },
      destroy() {
        fileEngine.destroy();
        synthEngine.destroy();
      },
    };

    engineRef.current = engine;
    setSupported(Boolean(engine.supported));
    engine.setVolume(volume);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setTrack(musicPhase);
  }, [musicPhase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(BGM_ENABLED_KEY, String(enabled));
  }, [enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(BGM_VOLUME_KEY, String(volume));
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.supported) return;

    const ensurePlayback = async () => {
      if (enabled) {
        await engine.start();
        return;
      }
      engine.stop();
    };

    const onFirstInteract = () => {
      void ensurePlayback();
    };

    window.addEventListener('pointerdown', onFirstInteract, { passive: true });
    window.addEventListener('keydown', onFirstInteract, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onFirstInteract);
      window.removeEventListener('keydown', onFirstInteract);
    };
  }, [enabled]);

  const value = useMemo(() => ({
    enabled,
    setEnabled,
    volume,
    setVolume,
    supported,
    musicPhase,
    setMusicPhase,
    async toggleEnabled() {
      const next = !enabled;
      setEnabled(next);
      if (!next) {
        engineRef.current?.stop();
        return;
      }
      await engineRef.current?.start();
    },
  }), [enabled, volume, supported]);

  return <BgmContext.Provider value={value}>{children}</BgmContext.Provider>;
}

export function useBgm() {
  const value = useContext(BgmContext);
  if (!value) {
    throw new Error('useBgm must be used inside BgmProvider');
  }
  return value;
}
