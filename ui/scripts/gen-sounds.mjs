// Procedurally synthesize the app's 6 UI sound effects as mechanical /
// electromechanical / retro-terminal SFX (NOT melodic tones) and write them as
// WAV into public/sounds/. Zero external API.
//
//   node scripts/gen-sounds.mjs           (write all)
//   node scripts/gen-sounds.mjs --force   (overwrite)
//
// Design goal: old-phone relays, tactile clicks, DTMF-ish blips, harsh buzzes —
// electronic device feel, not Nokia ringtones.
import { writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const SR = 44100;
const OUT_DIR = path.resolve("public/sounds");
const FORCE = process.argv.includes("--force");

// ---------- tiny DSP toolkit (all return Float32 mono buffers, range ~[-1,1]) ----------
const len = (sec) => Math.max(1, Math.round(sec * SR));
const mk = (sec) => new Float32Array(len(sec));

function mix(target, src, offsetSec = 0, gain = 1) {
  const off = Math.round(offsetSec * SR);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j >= 0 && j < target.length) target[j] += src[i] * gain;
  }
  return target;
}

// Square wave with optional pitch glide from f0->f1, plus an exponential decay env.
function square(sec, f0, f1 = f0, { decay = 8, duty = 0.5, gain = 0.5 } = {}) {
  const b = mk(sec);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    const f = f0 + (f1 - f0) * t;
    phase += f / SR;
    phase -= Math.floor(phase);
    const s = phase < duty ? 1 : -1;
    const env = Math.exp(-decay * t);
    b[i] = s * env * gain;
  }
  return b;
}

// Filtered noise burst — used for relay thunks and click transients.
function noise(sec, { decay = 30, gain = 0.5, lp = 0.4 } = {}) {
  const b = mk(sec);
  let prev = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    const n = Math.random() * 2 - 1;
    prev = prev + lp * (n - prev); // simple one-pole low-pass
    b[i] = prev * Math.exp(-decay * t) * gain;
  }
  return b;
}

// A very short hard click (mechanical tick).
function click(sec = 0.012, gain = 0.9) {
  const b = mk(sec);
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    b[i] = (Math.random() * 2 - 1) * Math.exp(-60 * t) * gain;
  }
  // sharp leading impulse
  b[0] = gain;
  b[1] = gain * 0.8;
  return b;
}

// DTMF-style dual sine blip (telephone feel), with gate envelope.
function dtmf(sec, fa, fb, { gain = 0.35 } = {}) {
  const b = mk(sec);
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    const gate = Math.min(1, t * 40) * Math.min(1, (1 - t) * 40); // fast attack/release
    b[i] = (Math.sin(2 * Math.PI * fa * (i / SR)) + Math.sin(2 * Math.PI * fb * (i / SR))) * 0.5 * gate * gain;
  }
  return b;
}

// ---------- soft clip + normalize ----------
function finalize(buf, peak = 0.9) {
  let max = 1e-9;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) {
    let v = buf[i] * g;
    // gentle tanh soft-clip for analog grit
    v = Math.tanh(v * 1.4) / Math.tanh(1.4);
    buf[i] = v;
  }
  return buf;
}

// ---------- WAV (16-bit PCM mono) ----------
function toWav(buf) {
  const n = buf.length;
  const data = Buffer.alloc(44 + n * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, buf[i]));
    data.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return data;
}

// ---------- the 6 sound designs ----------
const SOUNDS = {
  // Power-on: relay thunk -> low square rising sweep -> tiny confirm tick.
  boot() {
    const b = mk(1.1);
    mix(b, noise(0.09, { decay: 35, gain: 0.7, lp: 0.25 }), 0.0, 1); // relay thunk
    mix(b, square(0.55, 70, 180, { decay: 3.5, gain: 0.45, duty: 0.5 }), 0.06, 1);
    mix(b, square(0.18, 360, 360, { decay: 9, gain: 0.25, duty: 0.35 }), 0.62, 1); // confirm
    mix(b, click(), 0.0, 0.6);
    return b;
  },
  // Terminal confirm: crisp DTMF-ish dual-tone blip + click.
  submit() {
    const b = mk(0.34);
    mix(b, click(), 0, 0.7);
    mix(b, dtmf(0.16, 697, 1209, { gain: 0.5 }), 0.01, 1);
    return b;
  },
  // State change: deep descending square, weighty.
  shift() {
    const b = mk(0.7);
    mix(b, square(0.55, 220, 90, { decay: 4, gain: 0.55, duty: 0.5 }), 0, 1);
    mix(b, noise(0.05, { decay: 40, gain: 0.3, lp: 0.2 }), 0, 1); // attack body
    return b;
  },
  // Button under tension: sharp mechanical click + short high tick.
  push() {
    const b = mk(0.22);
    mix(b, click(0.02, 1.0), 0, 1);
    mix(b, square(0.07, 900, 700, { decay: 22, gain: 0.4, duty: 0.25 }), 0.005, 1);
    mix(b, noise(0.04, { decay: 60, gain: 0.4, lp: 0.6 }), 0, 1);
    return b;
  },
  // Repetition: square blip with two decaying echoes.
  loop() {
    const b = mk(1.0);
    const blip = () => square(0.1, 520, 520, { decay: 14, gain: 0.45, duty: 0.3 });
    mix(b, blip(), 0.0, 1.0);
    mix(b, blip(), 0.22, 0.55); // echo 1
    mix(b, blip(), 0.44, 0.3); // echo 2
    mix(b, blip(), 0.64, 0.16); // echo 3
    return b;
  },
  // Rejection: two harsh descending low square buzzes.
  error() {
    const b = mk(0.5);
    mix(b, square(0.13, 160, 120, { decay: 7, gain: 0.6, duty: 0.5 }), 0.0, 1);
    mix(b, square(0.16, 120, 80, { decay: 6, gain: 0.6, duty: 0.5 }), 0.18, 1);
    return b;
  },
};

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [name, fn] of Object.entries(SOUNDS)) {
    const out = path.join(OUT_DIR, `${name}.wav`);
    if (!FORCE && (await exists(out))) {
      console.log(`= skip ${name}.wav (exists; --force to overwrite)`);
      continue;
    }
    const buf = finalize(fn());
    await writeFile(out, toWav(buf));
    console.log(`+ ${name}.wav (${(buf.length / SR).toFixed(2)}s)`);
  }
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
