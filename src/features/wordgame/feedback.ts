"use client";
/** Tiny sound and vibration feedback for the games. Every call is best-effort: no sound, no vibration, no error. */

let ctx: AudioContext | null = null;

function tone(freq: number, ms: number, when = 0, type: OscillatorType = "sine", gain = 0.08) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {
    // no audio available or blocked
  }
}

const PREF = "learn-app:game-sound";
export function soundOn(): boolean {
  try {
    return localStorage.getItem(PREF) !== "0";
  } catch {
    return true;
  }
}
export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? "1" : "0");
  } catch {
    // ignore
  }
}

const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // not supported
  }
};

/** Short rising "ting"; the pitch climbs with the combo. */
export function playRight(combo = 0) {
  if (!soundOn()) return;
  const base = 660 + Math.min(combo, 8) * 40;
  tone(base, 110);
  tone(base * 1.5, 150, 0.08);
}

/** Low buzz and a vibration. */
export function playWrong() {
  buzz(70);
  if (!soundOn()) return;
  tone(160, 220, 0, "square", 0.05);
}

/** Fanfare for a win. */
export function playWin() {
  buzz([40, 40, 80]);
  if (!soundOn()) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 180, i * 0.11));
}
