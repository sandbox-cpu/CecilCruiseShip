// A small synthesiser toolkit for the trailer's soundtrack: noise, oscillators,
// filters, envelopes, a stereo reverb and a WAV writer. No dependencies.

import { readFileSync, writeFileSync } from "node:fs";

export const SR = 48000;

// ------------------------------------------------------------ randomness (seeded, so every render is identical)

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function whiteNoise(n, rand) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
  return out;
}

export function brownNoise(n, rand) {
  const out = new Float32Array(n);
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = (v + (rand() * 2 - 1) * 0.02) * 0.998;
    out[i] = v * 3.5;
  }
  return out;
}

/** Read a 16-bit PCM WAV (mono, or the left channel of stereo) at SR. */
export function readWav(path) {
  const b = readFileSync(path);
  let off = 12;
  let channels = 1;
  let rate = SR;
  while (off < b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "fmt ") {
      channels = b.readUInt16LE(off + 10);
      rate = b.readUInt32LE(off + 12);
    }
    if (id === "data") {
      if (rate !== SR) throw new Error(`${path} is ${rate} Hz; convert it to ${SR} Hz first`);
      const n = size / 2 / channels;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(off + 8 + i * 2 * channels) / 32768;
      return out;
    }
    off += 8 + size;
  }
  throw new Error(`${path} has no audio data`);
}

// ------------------------------------------------------------ filters

/** RBJ cookbook biquad. bandpass has 0 dB peak gain. */
export class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q);
  }
  set(freq, q = this.q) {
    this.q = q;
    const w = (2 * Math.PI * Math.min(Math.max(freq, 10), SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === "lowpass") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (this.type === "highpass") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha];
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  step(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Filter a buffer in place. `freq` may be a number or a function of time in seconds. */
export function filter(buf, type, freq, q = 0.707) {
  const f = new Biquad(type, typeof freq === "function" ? freq(0) : freq, q);
  for (let i = 0; i < buf.length; i++) {
    if (typeof freq === "function" && i % 32 === 0) f.set(freq(i / SR), q);
    buf[i] = f.step(buf[i]);
  }
  return buf;
}

// ------------------------------------------------------------ oscillators and envelopes

function polyBlep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Band-limited sawtooth. `freq` may be a function of time for glides and vibrato. */
export function saw(n, freq, phase = 0) {
  const out = new Float32Array(n);
  let p = phase;
  for (let i = 0; i < n; i++) {
    const f = typeof freq === "function" ? freq(i / SR) : freq;
    const dt = f / SR;
    out[i] = 2 * p - 1 - polyBlep(p, dt);
    p += dt;
    if (p >= 1) p -= 1;
  }
  return out;
}

export function sine(n, freq, phase = 0) {
  const out = new Float32Array(n);
  let p = phase;
  for (let i = 0; i < n; i++) {
    const f = typeof freq === "function" ? freq(i / SR) : freq;
    out[i] = Math.sin(2 * Math.PI * p);
    p += f / SR;
  }
  return out;
}

/** Attack, then exponential decay with time constant tau (seconds). */
export function percEnv(n, attack, tau) {
  const out = new Float32Array(n);
  const a = Math.max(1, Math.round(attack * SR));
  for (let i = 0; i < n; i++) out[i] = i < a ? i / a : Math.exp(-(i - a) / SR / tau);
  return out;
}

/** Attack, hold, release (seconds), with smooth curves. */
export function areEnv(n, attack, release) {
  const out = new Float32Array(n);
  const a = Math.max(1, attack * SR);
  const r = Math.max(1, release * SR);
  for (let i = 0; i < n; i++) {
    const up = Math.min(1, i / a);
    const down = Math.min(1, (n - i) / r);
    out[i] = Math.sin((up * Math.PI) / 2) ** 2 * Math.sin((down * Math.PI) / 2) ** 2;
  }
  return out;
}

/** Fade the last `sec` seconds of a buffer to silence. */
export function tailFade(buf, sec) {
  const n = Math.min(buf.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n;
  return buf;
}

export function mul(a, b) {
  for (let i = 0; i < a.length; i++) a[i] *= typeof b === "number" ? b : b[i];
  return a;
}

export function add(into, from, gain = 1) {
  for (let i = 0; i < Math.min(into.length, from.length); i++) into[i] += from[i] * gain;
  return into;
}

/** A struck resonant object: decaying partials, each [ratio, amplitude, decay seconds]. */
export function modal(n, freq, partials, { detune = 0, rand } = {}) {
  const out = new Float32Array(n);
  for (const [ratio, amp, tau] of partials) {
    const f = freq * ratio * (1 + (rand ? (rand() - 0.5) * detune : 0));
    const k = (2 * Math.PI * f) / SR;
    for (let i = 0; i < n; i++) out[i] += amp * Math.sin(k * i) * Math.exp(-i / SR / tau);
  }
  return out;
}

// ------------------------------------------------------------ reverb (Freeverb)

class Comb {
  constructor(size) {
    this.buf = new Float32Array(size);
    this.i = 0;
    this.store = 0;
  }
  step(x, feedback, damp) {
    const y = this.buf[this.i];
    this.store = y * (1 - damp) + this.store * damp;
    this.buf[this.i] = x + this.store * feedback;
    this.i = (this.i + 1) % this.buf.length;
    return y;
  }
}

class Allpass {
  constructor(size) {
    this.buf = new Float32Array(size);
    this.i = 0;
  }
  step(x) {
    const b = this.buf[this.i];
    this.buf[this.i] = x + b * 0.5;
    this.i = (this.i + 1) % this.buf.length;
    return b - x;
  }
}

/** Mono in, stereo out: a large, dark room. */
export function reverb(input, { room = 0.86, damp = 0.45 } = {}) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const make = (spread) => ({
    combs: combs.map((c) => new Comb(Math.round((c + spread) * scale))),
    alls: alls.map((a) => new Allpass(Math.round((a + spread) * scale))),
  });
  const sides = [make(0), make(23)];
  const feedback = room * 0.28 + 0.7;
  const d = damp * 0.4;
  const L = new Float32Array(input.length);
  const R = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const x = input[i] * 0.015;
    [L, R].forEach((out, s) => {
      let y = 0;
      for (const c of sides[s].combs) y += c.step(x, feedback, d);
      for (const a of sides[s].alls) y = a.step(y);
      out[i] = y * 3;
    });
  }
  return [L, R];
}

// ------------------------------------------------------------ the mix

export class Mix {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
    this.send = new Float32Array(this.n);
  }
  /** Place a mono sound at `at` seconds. pan -1..1, send = how much goes to the reverb. */
  place(buf, at, { gain = 1, pan = 0, send = 0.2 } = {}) {
    buf = tailFade(Float32Array.from(buf), 0.01); // never end on a click
    const start = Math.round(at * SR);
    const angle = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(angle) * gain * Math.SQRT2;
    const gr = Math.sin(angle) * gain * Math.SQRT2;
    for (let i = 0; i < buf.length; i++) {
      const j = start + i;
      if (j < 0 || j >= this.n) continue;
      this.L[j] += buf[i] * gl;
      this.R[j] += buf[i] * gr;
      this.send[j] += buf[i] * gain * send;
    }
  }
  /** Place a stereo pair as-is. */
  placeStereo(l, r, at, { gain = 1, send = 0.2 } = {}) {
    const start = Math.round(at * SR);
    for (let i = 0; i < l.length; i++) {
      const j = start + i;
      if (j < 0 || j >= this.n) continue;
      this.L[j] += l[i] * gain;
      this.R[j] += r[i] * gain;
      this.send[j] += (l[i] + r[i]) * 0.5 * gain * send;
    }
  }
  finish({ fadeIn = 0.4, fadeOutFrom, peak = 0.89 } = {}) {
    const [rl, rr] = reverb(this.send);
    for (let i = 0; i < this.n; i++) {
      this.L[i] += rl[i];
      this.R[i] += rr[i];
    }
    // Gentle fades at each end, then normalise and soft-limit the peaks.
    const fi = fadeIn * SR;
    const fo = (fadeOutFrom ?? this.n / SR) * SR;
    for (let i = 0; i < this.n; i++) {
      let g = Math.min(1, i / fi);
      if (i > fo) g *= Math.max(0, 1 - (i - fo) / (this.n - fo));
      this.L[i] *= g;
      this.R[i] *= g;
    }
    let max = 0;
    for (let i = 0; i < this.n; i++) max = Math.max(max, Math.abs(this.L[i]), Math.abs(this.R[i]));
    const norm = (peak * 1.15) / max;
    for (let i = 0; i < this.n; i++) {
      this.L[i] = Math.tanh(this.L[i] * norm) * 0.97;
      this.R[i] = Math.tanh(this.R[i] * norm) * 0.97;
    }
    return this;
  }
  writeWav(path) {
    const n = this.n;
    const data = Buffer.alloc(n * 4);
    for (let i = 0; i < n; i++) {
      data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, this.L[i])) * 32767), i * 4);
      data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, this.R[i])) * 32767), i * 4 + 2);
    }
    const head = Buffer.alloc(44);
    head.write("RIFF", 0);
    head.writeUInt32LE(36 + data.length, 4);
    head.write("WAVE", 8);
    head.write("fmt ", 12);
    head.writeUInt32LE(16, 16);
    head.writeUInt16LE(1, 20); // PCM
    head.writeUInt16LE(2, 22); // stereo
    head.writeUInt32LE(SR, 24);
    head.writeUInt32LE(SR * 4, 28);
    head.writeUInt16LE(4, 32);
    head.writeUInt16LE(16, 34);
    head.write("data", 36);
    head.writeUInt32LE(data.length, 40);
    writeFileSync(path, Buffer.concat([head, data]));
  }
  /** Loudness per window, for checking the balance without listening. */
  report(windows) {
    return windows.map(([label, a, b]) => {
      let sum = 0;
      let pk = 0;
      const s = Math.round(a * SR);
      const e = Math.min(this.n, Math.round(b * SR));
      for (let i = s; i < e; i++) {
        const v = (this.L[i] + this.R[i]) / 2;
        sum += v * v;
        pk = Math.max(pk, Math.abs(this.L[i]), Math.abs(this.R[i]));
      }
      const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : "-inf");
      return `${label.padEnd(26)} rms ${db(Math.sqrt(sum / Math.max(1, e - s))).padStart(6)} dB   peak ${db(pk).padStart(6)} dB`;
    });
  }
}
