let audioCtx: AudioContext | null = null;
let muted = false;

export function setSoundsMuted(next: boolean): void {
  muted = next;
}

export function isSoundsMuted(): boolean {
  return muted;
}

function getCtx(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType, gainVal: number, endFreq?: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore autoplay errors
  }
}

export function playMoveSound(captured: boolean, isCheck: boolean): void {
  if (isCheck) {
    playTone(580, 0.14, 'triangle', 0.12, 420);
    return;
  }
  if (captured) {
    playTone(230, 0.08, 'square', 0.08, 95);
    return;
  }
  playTone(170, 0.06, 'sine', 0.1, 105);
}

export function playGameEndSound(): void {
  playTone(440, 0.18, 'triangle', 0.1, 660);
}
