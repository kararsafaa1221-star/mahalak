/**
 * Lightweight Web Audio SFX for the lucky wheel (no external assets).
 * Tick rate eases out to match the CSS spin deceleration.
 */

type SpinSoundController = {
  stop: () => void;
};

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

async function resumeContext(ctx: AudioContext) {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* autoplay / policy */
    }
  }
}

function playClick(
  ctx: AudioContext,
  opts: { freq?: number; gain?: number; duration?: number; type?: OscillatorType } = {},
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type || 'triangle';
  osc.frequency.setValueAtTime(opts.freq ?? 720, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.07, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (opts.duration ?? 0.045));
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + (opts.duration ?? 0.05) + 0.02);
}

/** Continuous tick SFX while the wheel spins (faster → slower). */
export function startSpinWheelSound(durationMs: number): SpinSoundController {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => undefined };

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const startedAt = performance.now();

  void resumeContext(ctx).then(() => {
    if (stopped) return;

    // Soft whoosh at start
    playClick(ctx, { freq: 180, gain: 0.05, duration: 0.12, type: 'sine' });
    playClick(ctx, { freq: 320, gain: 0.04, duration: 0.1, type: 'sine' });

    const scheduleNext = () => {
      if (stopped) return;
      const elapsed = performance.now() - startedAt;
      if (elapsed >= durationMs - 40) return;

      const progress = Math.min(1, elapsed / durationMs);
      // Ease-out tick spacing (matches CSS ease-out feel)
      const eased = progress * progress;
      const interval = 38 + eased * 320;

      playClick(ctx, {
        freq: 640 + Math.random() * 160 - eased * 180,
        gain: 0.055 + (1 - eased) * 0.025,
        duration: 0.035,
        type: 'triangle',
      });

      timer = setTimeout(scheduleNext, interval);
    };

    timer = setTimeout(scheduleNext, 50);
  });

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

/** Short chime when a prize lands (points / promo / external). */
export function playSpinWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void resumeContext(ctx).then(() => {
    playClick(ctx, { freq: 523, gain: 0.08, duration: 0.1, type: 'sine' });
    setTimeout(() => playClick(ctx, { freq: 659, gain: 0.09, duration: 0.12, type: 'sine' }), 90);
    setTimeout(() => playClick(ctx, { freq: 784, gain: 0.1, duration: 0.18, type: 'sine' }), 180);
  });
}

/** Soft tone when landing on "better luck". */
export function playSpinMissSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  void resumeContext(ctx).then(() => {
    playClick(ctx, { freq: 280, gain: 0.06, duration: 0.14, type: 'sine' });
    setTimeout(() => playClick(ctx, { freq: 220, gain: 0.05, duration: 0.18, type: 'sine' }), 110);
  });
}
