// The classic trailer's soundtrack, made from scratch: npm run sound:classic
// Writes ../public/media/trailer-classic-sound.wav, which the TrailerClassic composition plays.
//
// Act one is told in sound effects over a quiet, uneasy score: the sea and the
// rain, Cecil's footsteps down the corridor and the bell on the Purser's counter,
// then a clock that ticks faster and faster to two o'clock, spins back an hour
// and ticks on to twenty past one, when the ship's whistle sounds and something
// goes into the sea.
// Act two turns dramatic as the screens appear: driving low strings at 120 bpm,
// timpani, a rising line and the clock ticking on the beat, into a hit as the
// title lands with two strokes of the ship's bell.
//
// Then, over the title, Cecil finally speaks (voice/classic/), with the music ducking
// under him, and the music box resolves at last.
//
// Every cue comes from src/classic/timing.js, which the picture uses too.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Mix, SR, add, areEnv, brownNoise, filter, modal, mul, percEnv, readWav, rng, saw, sine, tailFade, whiteNoise } from "./dsp.mjs";
import * as T from "../src/classic/timing.js";

const s = T.seconds;
const LENGTH = T.END / T.FPS;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// While Cecil speaks, the music steps back (by about 13 dB), easing in and out.
const speaking = Object.values(T.VOICE).map((v) => [s(v.at) + v.speech[0] - 0.12, s(v.at) + v.speech[1] + 0.2]);
function duck(t) {
  let g = 1;
  for (const [a, b] of speaking) {
    const ramp = 0.18;
    if (t > a - ramp && t < b + ramp) g = Math.min(g, t < a ? 1 - (0.78 * (t - (a - ramp))) / ramp : t > b ? 0.22 + (0.78 * (t - b)) / ramp : 0.22);
  }
  return g;
}
/** Apply the duck to a buffer that starts at `at` seconds. */
function ducked(buf, at) {
  for (let i = 0; i < buf.length; i++) buf[i] *= duck(at + i / SR);
  return buf;
}
const rand = rng(1961);
const mix = new Mix(LENGTH);

const N = {
  G1: 49.0, A1: 55.0, Bb1: 58.27, D2: 73.42, Eb2: 77.78, Eb3: 155.56, G3: 196.0, G2: 98.0, A2: 110.0, Bb2: 116.54, Cs3: 138.59, D3: 146.83, E3: 164.81,
  F3: 174.61, A3: 220.0, D4: 293.66, A4: 440.0, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.26, F5: 698.46,
  G5: 783.99, A5: 880.0, Bb5: 932.33, D6: 1174.66,
};

const len = (sec) => Math.round(sec * SR);
function normalise(buf, peak = 1) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  return m ? mul(buf, peak / m) : buf;
}
function burst(sec, tau, type, freq, q) {
  const b = whiteNoise(len(sec), rand);
  mul(b, percEnv(b.length, 0.0008, tau));
  return filter(b, type, freq, q);
}

// ------------------------------------------------------------ sound effects

function footstep(near) {
  const out = new Float32Array(len(0.5));
  add(out, burst(0.06, 0.012, "bandpass", 480 + near * 320, 1.1), 1.4); // heel
  const thump = sine(len(0.16), (t) => 96 - 36 * Math.min(1, t / 0.05));
  add(out, mul(thump, percEnv(thump.length, 0.002, 0.035)), 0.9);
  const sole = burst(0.1, 0.022, "bandpass", 1400 + rand() * 400, 0.9); // the sole rolling through
  const off = len(0.055 + rand() * 0.02);
  for (let i = 0; i < sole.length && off + i < out.length; i++) out[off + i] += sole[i] * 0.5;
  filter(out, "lowpass", 900 + near * 3600, 0.7); // farther away sounds darker
  return normalise(out);
}

function tray() {
  const out = modal(len(1.2), 1, [[410, 0.5, 0.18], [987, 0.35, 0.12], [1733, 0.25, 0.09], [2560, 0.18, 0.06], [3890, 0.1, 0.04]], { detune: 0.02, rand });
  add(out, burst(0.04, 0.008, "lowpass", 1200, 0.7), 1.6);
  const wood = sine(len(0.14), 118);
  add(out, mul(wood, percEnv(wood.length, 0.001, 0.03)), 0.8);
  return normalise(mul(out, percEnv(out.length, 0.001, 0.2)));
}

function clink(freq) {
  const out = modal(len(1.4), freq, [[1, 1, 0.55], [1.002, 0.7, 0.5], [2.32, 0.45, 0.3], [4.25, 0.22, 0.16], [6.63, 0.1, 0.08]], { detune: 0.004, rand });
  add(out, filter(whiteNoise(len(0.004), rand), "highpass", 4000), 0.5);
  return normalise(mul(out, percEnv(out.length, 0.0005, 0.6)));
}

function clockTick(tock) {
  const out = new Float32Array(len(0.12));
  const pitch = tock ? 0.84 : 1;
  for (const [f, q, g] of [[2400, 25, 1], [3900, 30, 0.7], [6100, 20, 0.4], [950, 8, 0.6]]) {
    const imp = new Float32Array(out.length);
    imp.set([1, -0.6, 0.3]);
    add(out, normalise(filter(imp, "bandpass", f * pitch, q)), g);
  }
  return normalise(out);
}

function bell(prime) {
  // A clock bell: hum, prime, minor-third tierce, quint, nominal and upper partials, some in beating pairs.
  const partials = [
    [0.5, 0.55, 6.0], [1.0, 0.6, 4.0], [1.003, 0.35, 3.6], [1.183, 0.5, 3.0], [1.506, 0.3, 2.4], [2.0, 0.75, 2.2],
    [2.005, 0.4, 2.0], [2.514, 0.3, 1.4], [2.662, 0.22, 1.2], [3.011, 0.25, 1.0], [4.166, 0.15, 0.7], [5.433, 0.08, 0.45],
  ];
  const out = modal(len(9), prime, partials);
  add(out, burst(0.012, 0.004, "bandpass", 3000, 0.8), 0.4); // the hammer
  mul(out, percEnv(out.length, 0.001, 30));
  return normalise(tailFade(out, 3));
}

function phoneBuzz(pattern) {
  // A phone vibrating on a wooden table: a motor hum with a little rattle.
  const total = pattern.reduce((a, [on, off]) => a + on + off, 0);
  const out = new Float32Array(len(total + 0.05));
  let t = 0;
  for (const [on, off] of pattern) {
    const n = len(on);
    const hum = sine(n, 172);
    add(hum, sine(n, 516), 0.4);
    add(hum, sine(n, 860), 0.2);
    for (let i = 0; i < n; i++) hum[i] = Math.tanh(hum[i] * 2.2) * (0.75 + 0.25 * Math.sin((2 * Math.PI * 31 * i) / SR));
    mul(hum, areEnv(n, 0.012, 0.02));
    for (let i = 0; i < n; i++) out[len(t) + i] += hum[i];
    t += on + off;
  }
  return normalise(filter(out, "bandpass", 420, 0.6));
}

function deskBell() {
  // The little brass bell on the Purser's counter.
  const out = modal(len(2.2), 2150, [[1, 1, 1.4], [2.76, 0.45, 0.8], [5.4, 0.22, 0.4], [8.93, 0.1, 0.2]], { detune: 0.003, rand });
  add(out, burst(0.01, 0.003, "highpass", 3000, 0.7), 0.3);
  return normalise(mul(out, percEnv(out.length, 0.0005, 1.2)));
}

function rain(sec) {
  // Rain on the deck: a hiss, with scattered drops.
  const n = len(sec);
  const out = filter(whiteNoise(n, rand), "highpass", 2400, 0.6);
  mul(out, 0.35);
  for (let k = 0; k < sec * 90; k++) {
    const drop = burst(0.02, 0.003 + rand() * 0.004, "bandpass", 1800 + rand() * 4000, 2);
    const at = Math.floor(rand() * (n - drop.length));
    for (let i = 0; i < drop.length; i++) out[at + i] += drop[i] * (0.2 + rand() * 0.5);
  }
  return normalise(mul(out, areEnv(n, 1.2, 1.6)));
}

function rewind(sec) {
  // The hour running backwards: a sucked-in, reversed swell.
  const n = len(sec);
  const out = whiteNoise(n, rand);
  filter(out, "bandpass", (t) => 3000 * 0.08 ** (t / sec), 1.6);
  add(out, sine(n, (t) => 880 * 0.25 ** (t / sec)), 0.12);
  for (let i = 0; i < n; i++) out[i] *= Math.sin((Math.PI * i) / n) ** 1.5;
  return normalise(out);
}

function shipWhistle(sec) {
  // A liner's steam whistle: a deep, breathy chord that swells, holds and dies away.
  const n = len(sec + 1.4);
  const out = new Float32Array(n);
  for (const [f, g] of [[N.D2 * 1.0, 1], [N.A2 * 0.998, 0.7], [N.D3 * 1.003, 0.45], [N.F3 * 1.002, 0.25]]) {
    const v = saw(n, (t) => f * (1 + 0.004 * Math.sin(2 * Math.PI * 3.1 * t) - 0.01 * Math.exp(-t / 0.2)), rand());
    add(out, v, g);
  }
  const breath = filter(whiteNoise(n, rand), "bandpass", 700, 0.8);
  add(out, breath, 0.25);
  filter(out, "lowpass", 1400, 0.7);
  const env = areEnv(n, 0.22, 1.1);
  for (let i = 0; i < n; i++) if (i > len(sec)) env[i] *= Math.exp(-(i - len(sec)) / len(0.35));
  return normalise(mul(out, env));
}

function splash() {
  // A heavy body into the sea, some way below and behind.
  const out = new Float32Array(len(2.4));
  const hit = filter(whiteNoise(len(1.6), rand), "lowpass", 2200, 0.7);
  mul(hit, percEnv(hit.length, 0.004, 0.32));
  add(out, hit, 1);
  const thump = sine(len(0.4), (t) => 70 - 30 * Math.min(1, t / 0.2));
  add(out, mul(thump, percEnv(thump.length, 0.003, 0.09)), 0.8);
  const spray = filter(whiteNoise(len(2.2), rand), "highpass", 2500, 0.7);
  mul(spray, areEnv(spray.length, 0.08, 1.8));
  const off = len(0.12);
  for (let i = 0; i < spray.length && off + i < out.length; i++) out[off + i] += spray[i] * 0.35;
  return normalise(filter(out, "lowpass", 3200, 0.7));
}

// ------------------------------------------------------------ instruments

function musicBox(freq) {
  const out = modal(len(3.2), freq, [[1, 1, 1.4], [2, 0.28, 0.8], [3, 0.12, 0.45], [4.1, 0.07, 0.25], [5.4, 0.04, 0.15]]);
  mul(out, percEnv(out.length, 0.002, 30));
  tailFade(out, 1);
  add(out, filter(whiteNoise(len(0.003), rand), "highpass", 5000), 0.15);
  return normalise(out);
}

/** A string section: four detuned, gently vibrating saws per note, spread left and right. */
function strings(freqs, dur, { attack = 0.8, release = 1.2, cutoff = 1800, vibrato = 0.0012 } = {}) {
  const n = len(dur);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const cents = [-9, -3, 4, 10];
  for (const f of freqs) {
    cents.forEach((c, k) => {
      const rate = 4.6 + rand() * 1.2;
      const ph = rand();
      const fr = f * 2 ** (c / 1200);
      const v = saw(n, (t) => fr * (1 + vibrato * Math.sin(2 * Math.PI * (rate * t + ph))), rand());
      const pan = (k % 2 ? 1 : -1) * (0.25 + 0.15 * (k >> 1));
      const gl = Math.cos(((pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let i = 0; i < n; i++) {
        L[i] += v[i] * gl;
        R[i] += v[i] * gr;
      }
    });
  }
  const env = areEnv(n, attack, release);
  for (const ch of [L, R]) {
    filter(ch, "lowpass", cutoff, 0.6);
    filter(ch, "lowpass", typeof cutoff === "function" ? (t) => cutoff(t) * 1.4 : cutoff * 1.4, 0.6);
    mul(ch, env);
    mul(ch, 1 / (freqs.length * cents.length));
  }
  return [L, R];
}

function staccato(freq, accent) {
  const n = len(0.4);
  const out = saw(n, freq * 2 ** (-6 / 1200), rand());
  add(out, saw(n, freq * 2 ** (6 / 1200), rand()));
  filter(out, "lowpass", 700 + accent * 600, 1.2);
  return mul(out, percEnv(n, 0.006, 0.085 + accent * 0.03));
}

function boom() {
  const out = sine(len(1.8), (t) => 40 + 45 * Math.exp(-t / 0.12));
  mul(out, percEnv(out.length, 0.003, 0.45));
  add(out, burst(0.03, 0.01, "lowpass", 1500, 0.7), 0.5);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.8); // a little grit so small speakers hear it
  return normalise(out);
}

function riser(dur) {
  const n = len(dur);
  const out = whiteNoise(n, rand);
  filter(out, "bandpass", (t) => 250 * 18 ** (t / dur), 2);
  add(out, sine(n, (t) => 110 * 3 ** (t / dur)), 0.08);
  for (let i = 0; i < n; i++) out[i] *= (i / n) ** 2.2;
  mul(out, areEnv(n, 0.01, 0.02));
  return normalise(out);
}

function cymbal() {
  const out = whiteNoise(len(3), rand);
  filter(out, "highpass", 4500, 0.7);
  return normalise(tailFade(mul(out, percEnv(out.length, 0.002, 0.9)), 0.8));
}

/** A slowly changing level, from [seconds, level] points. */
function automation(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      const [t0, v0] = points[i - 1];
      if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
    return points.at(-1)[1];
  };
}

// ============================================================ act one: the ship, Cecil, the hour that happened twice

// The sea under everything: a long, slow swell, the rumble of the engines and a low drone on D.
{
  const room = brownNoise(mix.n, rand);
  mix.place(filter(room, "lowpass", 300), 0, { gain: 0.08, send: 0 });

  const swellLevel = automation([[0, 0.3], [2.6, 1], [s(T.CECIL_CUT), 0.55], [s(T.WHISTLE), 0.7], [s(T.SPLASH) + 0.5, 1.1], [s(T.DOWNBEAT), 0.35], [s(T.HIT), 0.2], [LENGTH, 0.1]]);
  for (const [pan, phase] of [[-0.6, 0], [0.6, 0.37]]) {
    const w = brownNoise(mix.n, rand);
    filter(w, "lowpass", (t) => 380 + 260 * Math.sin(2 * Math.PI * (0.11 * t + phase)) ** 2, 0.7);
    for (let i = 0; i < mix.n; i++) {
      const t = i / SR;
      w[i] *= swellLevel(t) * duck(t) * (0.35 + 0.65 * Math.sin(Math.PI * (0.11 * t + phase)) ** 4);
    }
    mix.place(w, 0, { gain: 0.34, pan, send: 0.25 });
  }

  const engines = sine(mix.n, 41);
  add(engines, sine(mix.n, 82.3), 0.3);
  for (let i = 0; i < mix.n; i++) {
    const t = i / SR;
    engines[i] *= duck(t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 1.6 * t)) * Math.min(1, t / 2);
  }
  mix.place(engines, 0, { gain: 0.05, send: 0 });

  const level = automation([[0, 0], [2.5, 0.7], [7.3, 0.6], [8.8, 0.9], [s(T.WHISTLE), 1], [s(T.DOWNBEAT), 0.6], [s(T.HIT) - 0.2, 0.5], [s(T.HIT), 0.9], [LENGTH, 0]]);
  const d = sine(mix.n, N.D2);
  add(d, sine(mix.n, N.A2), 0.35);
  add(d, sine(mix.n, N.D3 * 1.001), 0.25);
  for (let i = 0; i < mix.n; i++) {
    const t = i / SR;
    d[i] *= level(t) * duck(t) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.13 * t));
  }
  mix.place(d, 0, { gain: 0.1, send: 0.1 });
}

// Wind and rain across the Boat Deck while we see the ship, and again at the rail.
for (const [at, dur, gain] of [[2.4, 5.8, 0.09], [s(T.CLOCK.start), s(T.SCENES_SEA_END) - s(T.CLOCK.start), 0.07]]) {
  for (const pan of [-0.7, 0.7]) {
    const w = whiteNoise(len(dur), rand);
    filter(w, "bandpass", (t) => 420 + 260 * Math.sin(2 * Math.PI * (0.19 * t + (pan > 0 ? 0.4 : 0))), 1.2);
    mix.place(mul(w, areEnv(w.length, 1.6, 2.2)), at, { gain, pan, send: 0.2 });
  }
  mix.place(rain(dur), at, { gain: gain * 1.4, send: 0.15 });
}

// The score: a slow minor-key pad and a music box that never quite resolves.
[
  [[N.D3, N.F3, N.A3], 3.0, 2.7],
  [[N.Bb2, N.D3, N.F3], 5.0, 2.7],
  [[N.A2, N.Cs3, N.E3], 7.0, 1.7], // fades before the bell on the counter
].forEach(([chord, at, dur]) => {
  const [L, R] = strings(chord, dur, { attack: 1.1, release: 1.1, cutoff: 1300 });
  mix.placeStereo(L, R, at, { gain: 0.32, send: 0.35 });
});
[[1.0, N.A4], [1.6, N.D5], [2.2, N.F5], [2.8, N.E5], [3.4, N.D5], [4.0, N.Cs5]].forEach(([at, f]) => mix.place(musicBox(f), at, { gain: 0.09, pan: -0.25, send: 0.45 }));
[[5.0, N.A5], [5.6, N.G5], [6.2, N.F5], [6.8, N.E5], [7.4, N.Cs5]].forEach(([at, f]) => mix.place(musicBox(f), at, { gain: 0.06, pan: 0.2, send: 0.5 }));

// Measured footsteps down the corridor, coming closer, stopping at the Purser's counter.
T.FOOTSTEPS.forEach((frame, i) => {
  const near = i / (T.FOOTSTEPS.length - 1);
  mix.place(footstep(near), s(frame) + (rand() - 0.5) * 0.012, { gain: 0.42 + 0.5 * near, pan: 0.35 - 0.3 * near, send: 0.35 - 0.17 * near });
});
mix.place(footstep(1), s(T.FEET_TOGETHER), { gain: 0.3, pan: 0.05, send: 0.18 });

// The brass bell on the counter: one bright ring.
mix.place(deskBell(), s(T.DESK_BELL), { gain: 0.34, pan: -0.1, send: 0.3 });

// The clock over No. 7 boat, ticking faster and faster towards two.
T.CLOCK_TICKS.forEach((frame, i) => mix.place(clockTick(i % 2 === 1), s(frame), { gain: 0.45 + 0.05 * i, pan: -0.2, send: 0.2 }));

// Two o'clock strikes, twice...
mix.place(bell(N.D4), s(T.CLOCK.two), { gain: 0.36, send: 0.4 });
mix.place(bell(N.D4), s(T.CLOCK.two) + 0.42, { gain: 0.3, send: 0.4 });
// ...and the hour runs backwards.
mix.place(rewind(s(T.CLOCK.rewindTo) - s(T.CLOCK.rewindFrom)), s(T.CLOCK.rewindFrom), { gain: 0.3, send: 0.35 });
{
  const n = 14;
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    const at = s(T.CLOCK.rewindFrom) + (s(T.CLOCK.rewindTo) - s(T.CLOCK.rewindFrom)) * (1 - (1 - u) ** 1.7);
    mix.place(clockTick(k % 2 === 1), at, { gain: 0.22 * (1 - 0.5 * u), pan: 0.2 - 0.4 * u, send: 0.3 });
  }
}
// One o'clock again: the ticks come back, slower.
T.CLOCK_TICKS_AGAIN.forEach((frame, i) => mix.place(clockTick(i % 2 === 1), s(frame), { gain: 0.5, pan: -0.2, send: 0.2 }));

// A thin, high discord rising under the ticking, cut dead by the whistle.
{
  const from = s(T.CLOCK.start);
  const dur = s(T.WHISTLE) - from;
  for (const [f, pan] of [[N.A5, -0.3], [N.Bb5, 0.3]]) {
    const n = len(dur);
    const v = sine(n, (t) => f * (1 + 0.0018 * Math.sin(2 * Math.PI * 5.2 * t)));
    for (let i = 0; i < n; i++) v[i] *= ((i / n) ** 2) * Math.min(1, (n - i) / len(0.025));
    mix.place(v, from, { gain: 0.05, pan, send: 0.3 });
  }
}

// Twenty past one, the second time: the ship's whistle, and something goes into the sea.
mix.place(shipWhistle(2.6), s(T.WHISTLE), { gain: 0.62, send: 0.55 });
mix.place(boom(), s(T.WHISTLE), { gain: 0.26, send: 0.2 });
mix.place(splash(), s(T.SPLASH), { gain: 0.4, pan: 0.25, send: 0.45 });

// ============================================================ act two: the screens, the suspects, the whispers

const beatAt = (n) => s(T.beat(n));
const riseBeat = (T.RISE - T.DOWNBEAT) / T.BEAT; // 26
const hitBeat = (T.HIT - T.DOWNBEAT) / T.BEAT; // 30

// The harmony, by beat: D minor, B flat, G minor, E flat as the suspects appear, back to G minor, then A to the hit.
const sections = [
  { at: 0, root: N.D2, chord: [N.D3, N.F3, N.A3], cutoff: 1400 },
  { at: 4, root: N.Bb1, chord: [N.Bb2, N.D3, N.F3], cutoff: 1600 },
  { at: 8, root: N.G1, chord: [N.G2, N.Bb2, N.D3], cutoff: 1800 },
  { at: 12, root: N.Eb2, chord: [N.Bb2, N.Eb3, N.G3], cutoff: 2000 },
  { at: 16, root: N.G1, chord: [N.G2, N.Bb2, N.D3], cutoff: 2200 },
  { at: 20, root: N.A1, chord: [N.A2, N.Cs3, N.E3], cutoff: 2600 }, // held into the silence before the hit
];
const sectionAt = (b) => [...sections].reverse().find((sec) => b >= sec.at);

// Driving low strings: eighths in a 3+3+2 pattern, sixteenths through the rise.
for (let b = 0; b < hitBeat; b += 0.5) {
  const rising = b >= riseBeat;
  const steps = rising ? 2 : 1; // sixteenths: two notes per half-beat
  for (let k = 0; k < steps; k++) {
    const at = beatAt(b) + k * 0.125; // a sixteenth is an eighth of a second at 120 bpm
    if (at > s(T.HIT) - 0.3) break;
    const e = Math.round((b % 4) * 2); // eighth within the bar
    const sec = sectionAt(b);
    const octave = rising ? k : [0, 0, 1, 0, 0, 1, 0, 1][e];
    const accent = rising ? (k === 0 && b % 1 === 0 ? 1 : 0) : [1, 0, 0, 1, 0, 0, 1, 0][e];
    const build = 1 + (b / hitBeat) * 0.7;
    const gain = (0.07 + 0.03 * accent) * build * (rising ? 0.8 + (0.6 * (b - riseBeat)) / (hitBeat - riseBeat) : 1);
    mix.place(staccato(sec.root * (octave ? 2 : 1), accent), at, { gain, pan: e % 2 || k ? 0.15 : -0.15, send: 0.12 });
  }
}

// Sustained strings over each section, opening up as it builds; the last chord holds to the silence before the hit.
sections.forEach((sec, i) => {
  const last = i === sections.length - 1;
  const dur = last ? s(T.HIT) - 0.12 - beatAt(sec.at) : beatAt(sections[i + 1].at) - beatAt(sec.at) + 0.25;
  const [L, R] = strings(sec.chord, dur, { attack: 0.35, release: last ? 0.1 : 0.5, cutoff: sec.cutoff });
  mix.placeStereo(L, R, beatAt(sec.at), { gain: 0.32 + i * 0.035, send: 0.3 });
});

// A high line creeping up by half-steps: D, E flat, E, F, then back to E and held.
[[8, N.D5], [12, N.Eb5], [16, N.E5], [20, N.F5], [24, N.E5]].forEach(([b, f], i, all) => {
  const end = i === all.length - 1 ? s(T.HIT) - 0.12 : beatAt(all[i + 1][0]) + 0.08;
  const [L, R] = strings([f], end - beatAt(b), { attack: 0.18, release: 0.1, cutoff: 3600, vibrato: 0.004 });
  mix.placeStereo(L, R, beatAt(b), { gain: 0.16, send: 0.4 });
});

// Timpani: on the downbeats, then on every face and every whisper, gathering pace into the hit.
const suspectBeats = T.SUSPECTS.map((f) => (f - T.DOWNBEAT) / T.BEAT);
const lineupBeat = (T.LINEUP - T.DOWNBEAT) / T.BEAT;
[0, 4, 8, ...suspectBeats, lineupBeat, 21, 23, 25, 26, 27, 28, 29].forEach((b) => mix.place(boom(), beatAt(b), { gain: 0.3 + 0.012 * b, send: 0.2 }));

// The clock again, faint and on the beat, keeping time with the one on screen.
for (let b = 0; b < hitBeat; b++) mix.place(clockTick(b % 2 === 1), beatAt(b), { gain: 0.13, pan: 0.55, send: 0.15 });

// Phones buzzing as Cecil whispers.
T.PHONE_BUZZES.forEach((frame, i) => mix.place(phoneBuzz(i === 0 ? [[0.22, 0.09], [0.22, 0]] : [[0.26, 0]]), s(frame), { gain: 0.16, pan: i === 0 ? 0.45 : -0.1, send: 0.12 }));

// A rise into a moment of silence, then the hit.
mix.place(riser(s(T.HIT) - 0.15 - s(T.RISE)), s(T.RISE), { gain: 0.16, send: 0.25 });

// ============================================================ the title: the ship's bell, and Cecil speaks

{
  const hit = s(T.HIT);
  mix.place(ducked(boom(), hit), hit, { gain: 0.85, send: 0.2 });
  const brass = strings([N.D3, N.F3, N.A3, N.D4], 6, { attack: 0.03, release: 3.2, cutoff: (t) => 700 + 3000 * Math.exp(-t / 0.5) });
  mix.placeStereo(ducked(brass[0], hit), ducked(brass[1], hit), hit, { gain: 0.55, send: 0.35 });
  const low = strings([N.D2, N.A2], LENGTH - hit, { attack: 0.02, release: 3, cutoff: 900 });
  mix.placeStereo(ducked(low[0], hit), ducked(low[1], hit), hit, { gain: 0.3, send: 0.2 });
  mix.place(ducked(cymbal(), hit), hit, { gain: 0.13, send: 0.25 });
  // Two strokes of the ship's bell.
  mix.place(ducked(bell(N.D4), hit + 0.02), hit + 0.02, { gain: 0.4, send: 0.4 });
  mix.place(ducked(bell(N.D4), hit + 0.44), hit + 0.44, { gain: 0.34, send: 0.4 });
  const shimmer = sine(len(LENGTH - hit), (t) => N.D6 * (1 + 0.003 * Math.sin(2 * Math.PI * 5 * t)));
  mix.place(ducked(mul(shimmer, areEnv(shimmer.length, 0.6, 2.5)), hit), hit, { gain: 0.02, send: 0.6 });
}

// Cecil: "Good evening. I am Cecil, Chief Purser of the Halcyon, and I shall be your host this evening."
// Then: "Do find your seat, and keep your hands inside the rail."
// (NO_VOICE=1 npm run sound:classic leaves him out, for checking how the music sits underneath.)
for (const line of process.env.NO_VOICE ? [] : Object.values(T.VOICE)) {
  if (!existsSync(here(`../${line.file}`))) {
    console.warn(`(No ${line.file} yet: leaving that line out.)`);
    continue;
  }
  const voice = filter(readWav(here(`../${line.file}`)), "highpass", 70, 0.7);
  mix.place(voice, s(line.at), { gain: 1.6, send: 0.1 });
}

// Under the last line the music box returns to its opening notes, and this time it comes home to D.
{
  const seat = s(T.VOICE.seat.at);
  [[0.3, N.A4], [0.9, N.D5], [1.5, N.F5], [2.1, N.E5]].forEach(([dt, f]) => mix.place(musicBox(f), seat + dt, { gain: 0.045, pan: -0.25, send: 0.5 }));
  mix.place(musicBox(N.D5), seat + T.VOICE.seat.speech[1] + 0.3, { gain: 0.09, pan: -0.1, send: 0.55 });
}

// ============================================================ out

mix.finish({ fadeIn: 0.4, fadeOutFrom: LENGTH - 0.8 });
const out = fileURLToPath(new URL("../../public/media/trailer-classic-sound.wav", import.meta.url));
mix.writeWav(out);
console.log(`Wrote ${out}`);
console.log(
  mix
    .report([
      ["opening", 0, 2.7],
      ["ship + rain", 2.7, s(T.CECIL_CUT)],
      ["footsteps", s(T.CECIL_CUT), s(T.DESK_BELL)],
      ["desk bell", s(T.DESK_BELL), s(T.DESK_BELL) + 0.6],
      ["clock to two", s(T.CLOCK.start), s(T.CLOCK.two)],
      ["two strikes + rewind", s(T.CLOCK.two), s(T.CLOCK.rewindTo)],
      ["one again", s(T.CLOCK.rewindTo), s(T.WHISTLE)],
      ["whistle + splash", s(T.WHISTLE), s(T.SPLASH) + 1],
      ["the sea", s(T.SPLASH) + 1, s(T.DOWNBEAT)],
      ["screens", s(T.DOWNBEAT), s(T.SUSPECTS[0])],
      ["suspects", s(T.SUSPECTS[0]), beatAt(21)],
      ["whispers", beatAt(21), s(T.RISE)],
      ["rise", s(T.RISE), s(T.HIT)],
      ["title hit", s(T.HIT), s(T.VOICE.host.at)],
      ["Cecil: host line", s(T.VOICE.host.at), s(T.VOICE.host.at) + T.VOICE.host.speech[1]],
      ["Cecil: seat line", s(T.VOICE.seat.at), s(T.VOICE.seat.at) + T.VOICE.seat.speech[1]],
      ["resolution", s(T.VOICE.seat.at) + T.VOICE.seat.speech[1], LENGTH],
    ])
    .join("\n"),
);
