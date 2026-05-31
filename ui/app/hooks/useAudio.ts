"use client";

import { useCallback, useEffect, useState } from "react";

// Audio is now a single sound: a synthesized analog-keypad click on each
// keystroke. The old file-based device sounds (boot/submit/error/etc.) were
// removed. Mute is shared across the app and persisted in localStorage.

const MUTE_KEY = "als_muted";

function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

// --- Synthesized analog keypad click (Web Audio) ---
// A short, dry mechanical tick. Web Audio (not an audio file) so it fires
// instantly and overlaps cleanly during fast typing.
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function playKeystroke() {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    // ~12ms noise burst with decay baked into the buffer = a crisp tick.
    // No resonant filters (they ring/"ping") and no exponential ramps (they
    // throw near zero and would silently kill playback after one press).
    const dur = 0.012;
    const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const t = i / frames;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
    }

    const src = ac.createBufferSource();
    src.buffer = buf;

    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200 + Math.random() * 400; // crisp, plasticky
    hp.Q.value = 0.5; // low Q = no ringing

    const gain = ac.createGain();
    gain.gain.value = 0.22;

    src.connect(hp);
    hp.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + dur + 0.005);
  } catch {
    // never let one failed click break subsequent keystrokes
  }
}

// --- Sci-fi mechanical "chunk" for buttons / links / navigation ---
// Two quick layered components: a low thunk (square body) + a bright metallic
// transient (filtered noise), giving a satisfying electro-mechanical confirm.
export function playClick() {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;

  try {
    const now = ac.currentTime;

    // 1) Low mechanical body — short square thunk with a quick downward sweep.
    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.05);
    const oGain = ac.createGain();
    oGain.gain.value = 0.0;
    oGain.gain.setValueAtTime(0.14, now);
    oGain.gain.linearRampToValueAtTime(0.0, now + 0.06);
    osc.connect(oGain);
    oGain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.07);

    // 2) Bright metallic transient — short band-passed noise "tk".
    const dur = 0.03;
    const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const t = i / frames;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
    }
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 1.2;
    const nGain = ac.createGain();
    nGain.gain.value = 0.12;
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ac.destination);
    noise.start(now);
    noise.stop(now + dur + 0.005);
  } catch {
    // never let a failed click break interaction
  }
}

// Warm two-note "reveal" chime for opening a gift. Distinct from the dry
// keypad/click sounds: a soft rising sine pair with a gentle decay.
export function playGiftOpen() {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const notes = [523.25, 783.99]; // C5 -> G5, a friendly rising fifth
    notes.forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.linearRampToValueAtTime(0.0, t + 0.35);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // never let a failed chime break interaction
  }
}

// --- Looping rain ambience (file-based, gentle, tied to mute) ---
let rainEl: HTMLAudioElement | null = null;

function rainAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!rainEl) {
    rainEl = new Audio("/rain.mp3");
    rainEl.loop = true;
    rainEl.volume = 0.4;
  }
  return rainEl;
}

// Start rain if unmuted. Must be called from a user gesture (autoplay policy).
export function startRain() {
  if (isMuted()) return;
  const el = rainAudio();
  if (!el) return;
  void el.play().catch(() => {
    /* autoplay blocked until a gesture — caller retries on next gesture */
  });
}

function stopRain() {
  if (rainEl) rainEl.pause();
}

// Simple pub/sub so MuteToggle instances stay in sync.
const listeners = new Set<(muted: boolean) => void>();
function setMuted(muted: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }
  if (muted) stopRain();
  else startRain();
  listeners.forEach((fn) => fn(muted));
}

export function useAudio() {
  const [muted, setMutedState] = useState<boolean>(false);

  // Sync initial mute state (localStorage is browser-only, so it can't be the
  // useState initializer without a hydration mismatch) + subscribe to changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMutedState(isMuted());
    const fn = (m: boolean) => setMutedState(m);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const keystroke = useCallback(() => playKeystroke(), []);
  const click = useCallback(() => playClick(), []);
  const giftOpen = useCallback(() => playGiftOpen(), []);
  const toggleMute = useCallback(() => setMuted(!isMuted()), []);

  return { muted, keystroke, click, giftOpen, toggleMute };
}
