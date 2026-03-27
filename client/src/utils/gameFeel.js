let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioCtx) audioCtx = new AudioCtor();
  return audioCtx;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function playTone(ctx, {
  freq = 440,
  durationMs = 90,
  gain = 0.05,
  type = 'sine',
  when = 0,
}) {
  const startAt = ctx.currentTime + Math.max(0, when);
  const stopAt = startAt + Math.max(0.02, durationMs / 1000);

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(80, freq), startAt);

  const safeGain = clamp01(gain);
  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, safeGain), startAt + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  osc.connect(amp);
  amp.connect(ctx.destination);

  osc.start(startAt);
  osc.stop(stopAt + 0.01);
}

export function playGameSfx(eventName, options = {}) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  const intensity = clamp01(options.intensity ?? 1);
  const baseGain = 0.04 + intensity * 0.03;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  switch (String(eventName || '').toLowerCase()) {
    case 'round_start':
      playTone(ctx, { freq: 420, durationMs: 85, gain: baseGain, type: 'triangle' });
      playTone(ctx, { freq: 560, durationMs: 95, gain: baseGain * 0.95, type: 'triangle', when: 0.09 });
      break;
    case 'correct':
      playTone(ctx, { freq: 620, durationMs: 90, gain: baseGain, type: 'triangle' });
      playTone(ctx, { freq: 820, durationMs: 110, gain: baseGain * 0.95, type: 'triangle', when: 0.1 });
      break;
    case 'streak':
      playTone(ctx, { freq: 520, durationMs: 70, gain: baseGain * 0.9, type: 'triangle' });
      playTone(ctx, { freq: 720, durationMs: 80, gain: baseGain, type: 'triangle', when: 0.08 });
      playTone(ctx, { freq: 980, durationMs: 90, gain: baseGain, type: 'triangle', when: 0.16 });
      break;
    case 'wrong':
      playTone(ctx, { freq: 220, durationMs: 120, gain: baseGain * 0.85, type: 'sawtooth' });
      break;
    case 'timer_warning':
      playTone(ctx, { freq: 760, durationMs: 60, gain: baseGain * 0.75, type: 'square' });
      break;
    default:
      playTone(ctx, { freq: 500, durationMs: 60, gain: baseGain * 0.7, type: 'triangle' });
      break;
  }

  return true;
}
