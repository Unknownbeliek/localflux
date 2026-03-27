const CHORDS = [
  [220.0, 277.18, 329.63],
  [196.0, 246.94, 293.66],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
];

function createCtx() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  return new AudioCtx();
}

function playTone(ctx, destination, {
  freq,
  durationMs = 280,
  gain = 0.04,
  type = 'triangle',
  detune = 0,
}) {
  if (!ctx || !destination || !Number.isFinite(freq)) return;

  const startAt = ctx.currentTime;
  const stopAt = startAt + Math.max(0.05, durationMs / 1000);
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  osc.detune.setValueAtTime(detune, startAt);

  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startAt + 0.03);
  amp.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  osc.connect(amp);
  amp.connect(destination);
  osc.start(startAt);
  osc.stop(stopAt + 0.01);
}

export function createBgmEngine() {
  const ctx = createCtx();
  if (!ctx) {
    return {
      supported: false,
      isPlaying: false,
      async start() { return false; },
      stop() {},
      setVolume() {},
      destroy() {},
    };
  }

  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(ctx.destination);

  let intervalId = null;
  let step = 0;
  let volume = 0.5;
  let isPlaying = false;

  const tick = () => {
    const chord = CHORDS[step % CHORDS.length];
    const chordGain = 0.03 * volume;

    playTone(ctx, master, { freq: chord[0], durationMs: 320, gain: chordGain, type: 'triangle' });
    playTone(ctx, master, { freq: chord[1], durationMs: 290, gain: chordGain * 0.8, type: 'sine', detune: 4 });
    playTone(ctx, master, { freq: chord[2], durationMs: 260, gain: chordGain * 0.72, type: 'sine', detune: -3 });

    const bassFreq = chord[0] / 2;
    playTone(ctx, master, { freq: bassFreq, durationMs: 420, gain: 0.02 * volume, type: 'sawtooth' });

    step += 1;
  };

  return {
    supported: true,
    get isPlaying() {
      return isPlaying;
    },
    async start() {
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          return false;
        }
      }

      if (isPlaying) return true;

      isPlaying = true;
      tick();
      intervalId = window.setInterval(tick, 420);
      return true;
    },
    stop() {
      isPlaying = false;
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    },
    setVolume(nextVolume) {
      volume = Math.max(0, Math.min(1, Number(nextVolume) || 0));
      const target = 0.01 + volume * 0.14;
      master.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    },
    destroy() {
      this.stop();
      try {
        master.disconnect();
      } catch {
        // no-op
      }
      ctx.close().catch(() => {});
    },
  };
}
