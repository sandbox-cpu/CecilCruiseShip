// The telegram trailer's soundtrack, made from scratch: npm run sound
// Writes ../public/media/trailer-sound.wav, which the Trailer composition plays.
//
// A dinner party: phones buzzing on the table, one after another, and a sting
// on the last. Cecil, close and quiet. The sea and the engines for the ship; a
// rush of water and a deep boom under it; the dinner chimes, in D major, as the
// table comes back. Then Cecil's mischief: a sly pizzicato figure that grows as
// each private word buzzes in, a thump as each friend's character appears, and
// a hit on "Only one of you is lying about murder."
//
// The transmission is the score. The title goes out in Morse at 150 bpm, a dit
// to a sixteenth, with a kick on every beat, the bass keyed with the Morse and
// strings climbing D minor, B flat, G minor, A, into the title hit. Then the
// clock on the shared screen ticks, a heartbeat quickens under the vote, and
// everything stops dead. A question mark in Morse; the music is left on A,
// unresolved.
//
// Every cue comes from src/telegram/timing.js, which the picture uses too.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as T from "../src/telegram/timing.js";
import { Mix, SR, add, areEnv, brownNoise, filter, modal, mul, percEnv, readWav, rng, saw, sine, tailFade, whiteNoise } from "./dsp.mjs";

const s = T.seconds;
const LENGTH = T.END / T.FPS;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const rand = rng(1961 + 2);
const mix = new Mix(LENGTH);

const N = {
  D1: 36.71, G1: 49.0, A1: 55.0, Bb1: 58.27, D2: 73.42, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, Cs3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
  Fs3: 185.0, G3: 196.0, A3: 220.0, Bb3: 233.08, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, Ab4: 415.3, A4: 440.0, D5: 587.33, Fs5: 739.99, A5: 880.0, D6: 1174.66,
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

// While Cecil speaks, the music steps back (by about 12 dB), easing in and out.
const speaking = Object.values(T.VOICE).map((v) => [s(v.at) + v.speech[0] - 0.1, s(v.at) + v.speech[1] + 0.15]);
function duck(t) {
  let g = 1;
  for (const [a, b] of speaking) {
    const ramp = 0.15;
    if (t > a - ramp && t < b + ramp) g = Math.min(g, t < a ? 1 - (0.75 * (t - (a - ramp))) / ramp : t > b ? 0.25 + (0.75 * (t - b)) / ramp : 0.25);
  }
  return g;
}
/** Apply a level (a function of time) to a buffer that starts at `at` seconds. */
function shape(buf, at, level) {
  for (let i = 0; i < buf.length; i++) buf[i] *= level(at + i / SR);
  return buf;
}

// ------------------------------------------------------------ sound effects

/** One character on the teleprinter: a type-bar strike and a little rattle. */
function typeBar(pitch = 1) {
  const out = new Float32Array(len(0.09));
  add(out, burst(0.02, 0.004, "bandpass", 2600 * pitch + rand() * 600, 1.4), 1);
  add(out, burst(0.05, 0.012, "bandpass", 900 * pitch + rand() * 200, 1.2), 0.5);
  add(out, modal(len(0.09), 3100 * pitch, [[1, 0.3, 0.02], [1.6, 0.2, 0.012]], { detune: 0.08, rand }), 0.6);
  return normalise(out);
}

/** A tape line typed out at `cps`: one strike per character, over the machine's motor. */
function teleprinter(tape, { gain = 0.2, pitch = 1, pan = -0.15 } = {}) {
  const at = s(tape.at);
  const dur = tape.text.length / tape.cps;
  [...tape.text].forEach((ch, i) => {
    if (ch === " ") return;
    mix.place(typeBar(pitch), at + i / tape.cps + (rand() - 0.5) * 0.008, { gain: gain * (0.8 + rand() * 0.4), pan, send: 0.08 });
  });
  const motor = sine(len(dur + 0.3), 50);
  add(motor, sine(motor.length, 100), 0.6);
  add(motor, filter(whiteNoise(motor.length, rand), "bandpass", 300, 1.2), 0.4);
  mix.place(mul(motor, areEnv(motor.length, 0.05, 0.15)), at - 0.05, { gain: gain * 0.2, pan, send: 0 });
}

/** The operator's key: a Morse tone with a mechanical click at each end. */
function morseTone(sec, freq = N.D5) {
  const n = len(sec + 0.01);
  const out = sine(n, freq);
  add(out, sine(n, freq * 2), 0.08);
  add(out, sine(n, freq * 3), 0.03);
  return mul(out, areEnv(n, 0.004, 0.006));
}
function keyClick(down) {
  const out = burst(0.02, down ? 0.003 : 0.002, "bandpass", down ? 1800 : 2600, 2);
  add(out, modal(len(0.02), down ? 420 : 610, [[1, 0.5, 0.006]]), 0.6);
  return normalise(out);
}
function sendMorse(tones, { gain = 0.3, freq = N.D5, radio = false } = {}) {
  for (const tone of tones) {
    const a = s(tone.from);
    const b = s(tone.to);
    let beep = morseTone(b - a, freq);
    if (radio) beep = filter(beep, "bandpass", freq, 1.2);
    mix.place(beep, a, { gain, send: 0.12 });
    mix.place(keyClick(true), a - 0.004, { gain: gain * 0.35, pan: 0.2, send: 0.05 });
    mix.place(keyClick(false), b, { gain: gain * 0.2, pan: 0.2, send: 0.05 });
  }
}

function pencil(sec) {
  const n = len(sec);
  const out = filter(whiteNoise(n, rand), "bandpass", 3800, 0.9);
  for (let i = 0; i < n; i++) out[i] *= 0.5 + 0.5 * Math.abs(Math.sin(i / SR * 2 * Math.PI * 7 + Math.sin(i / SR * 13)));
  return normalise(mul(out, areEnv(n, 0.03, 0.06)));
}

function bubble() {
  const n = len(0.12);
  const f0 = 350 + rand() * 500;
  const out = sine(n, (t) => f0 * (1 + t * 6));
  return mul(out, percEnv(n, 0.002, 0.03));
}

// ------------------------------------------------------------ instruments

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

function kick(accent = 1) {
  const out = sine(len(0.45), (t) => 44 + 90 * Math.exp(-t / 0.03));
  mul(out, percEnv(out.length, 0.002, 0.16 + accent * 0.05));
  add(out, burst(0.01, 0.003, "lowpass", 3000, 0.7), 0.3);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.5);
  return normalise(out);
}

function tom(freq) {
  const out = sine(len(0.6), (t) => freq * (1 + 0.5 * Math.exp(-t / 0.02)));
  mul(out, percEnv(out.length, 0.002, 0.18));
  add(out, burst(0.03, 0.008, "bandpass", 1200, 1), 0.25);
  return normalise(out);
}

function shaker() {
  return normalise(burst(0.06, 0.018, "highpass", 6500, 0.7));
}

function boom(depth = 1) {
  const out = sine(len(4), (t) => 28 + 60 * Math.exp(-t / (0.15 * depth)));
  mul(out, percEnv(out.length, 0.004, 0.9 * depth));
  add(out, burst(0.05, 0.02, "lowpass", 1200, 0.7), 0.5);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.8); // a little grit so small speakers hear it
  return normalise(tailFade(out, 1));
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

function crash() {
  const out = whiteNoise(len(3.5), rand);
  filter(out, "highpass", 3800, 0.7);
  return normalise(tailFade(mul(out, percEnv(out.length, 0.002, 1.1)), 0.8));
}

/** The stewards' dinner chimes: a small, bright metallophone. */
function chime(freq) {
  const out = modal(len(2.6), freq, [[1, 1, 1.3], [2.76, 0.32, 0.5], [5.4, 0.12, 0.2], [0.5, 0.15, 0.9]], { detune: 0.002, rand });
  add(out, burst(0.006, 0.002, "highpass", 5000, 0.7), 0.2);
  return normalise(tailFade(mul(out, percEnv(out.length, 0.001, 30)), 0.6));
}

function phoneBuzz(pattern = [[0.34, 0.12], [0.34, 0]]) {
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

/** Lub-dub. */
function heartbeat() {
  const out = new Float32Array(len(0.6));
  for (const [at, f, g] of [[0, 58, 1], [0.2, 50, 0.7]]) {
    const thump = sine(len(0.25), (t) => f + 30 * Math.exp(-t / 0.02));
    mul(thump, percEnv(thump.length, 0.004, 0.06));
    add(out.subarray(len(at)), thump, g);
  }
  return normalise(filter(out, "lowpass", 180, 0.7));
}

/** A plucked string, short and dry: the mischief. */
function pluck(freq, accent = 0) {
  const n = len(0.5);
  const out = saw(n, freq, rand());
  add(out, saw(n, freq * 2.003, rand()), 0.3);
  filter(out, "lowpass", (t) => 300 + (1800 + accent * 1200) * Math.exp(-t / 0.05), 1.2);
  return mul(out, percEnv(n, 0.002, 0.09 + accent * 0.03));
}

/** A thump and a breath of brass: someone's character, revealed. */
function reveal() {
  const out = new Float32Array(len(1.6));
  add(out, tom(70), 0.9);
  const brass = saw(len(1.4), N.D3, rand());
  add(brass, saw(brass.length, N.A3 * 1.002, rand()), 0.7);
  filter(brass, "lowpass", (t) => 300 + 900 * Math.exp(-t / 0.25), 0.9);
  mul(brass, areEnv(brass.length, 0.02, 1.1));
  add(out, brass, 0.35);
  return normalise(out);
}

// ------------------------------------------------------------ key moments, in seconds

const PHONES = T.PHONES.map(s);
const [SHIP, CHART, DEEP] = [T.SCENES.ship[0], T.SCENES.chart[0], T.SCENES.deep[0]].map(s);
const DINNER = s(T.SCENES.dinner[0]);
const TABLE_AGAIN = s(T.WHISPERS.kingsley.at) - 0.3; // the mischief begins
const THESIS = s(T.SCENES.thesis[0]);
const THESIS_HIT = s(T.THESIS.second);
const MORSE0 = s(T.MORSE.letters[0].from);
const MORSE1 = s(T.MORSE.end);
const HIT = s(T.HIT);
const GAP = [s(T.MORSE.letters[3].to), s(T.MORSE.letters[4].from)]; // between DEAD and RECKONING
const BEAT = (T.UNIT * 4) / T.FPS; // a crotchet at 150 bpm: four dits
const SHARKS = s(T.SCENES.sharks[0]);
const VOTE = [s(T.VOTE.from), s(T.VOTE.to)];
const QUESTION = s(T.QUESTION.letters[0].from);
const DOWN_END = s(T.VOICE.down.at) + T.VOICE.down.speech[1];

// ============================================================ beds under everything

// A dinner party's room: a low murmur of warm noise, with the odd knife on a plate. Gone at sea and at the end.
{
  const level = automation([[0, 0], [0.4, 0.8], [SHIP, 0.8], [SHIP + 0.4, 0], [DINNER, 0], [DINNER + 0.5, 0.8], [MORSE0, 0.6], [MORSE0 + 0.5, 0.15], [HIT, 0.15], [SHARKS, 0.2], [SHARKS + 0.4, 0.55], [VOTE[1] - 0.02, 0.55], [VOTE[1], 0], [LENGTH, 0]]);
  const room = brownNoise(mix.n, rand);
  filter(room, "bandpass", 380, 0.6);
  shape(room, 0, (t) => level(t) * duck(t) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.21 * t)));
  mix.place(room, 0, { gain: 0.12, send: 0.2 });
  for (const at of [1.2, 2.9, 4.4, 21.6, 24.8, 27.9, 31.2, 33.5]) {
    mix.place(modal(len(0.6), 2900 + rand() * 900, [[1, 1, 0.12], [2.3, 0.4, 0.06]], { detune: 0.02, rand }), at, { gain: 0.03, pan: rand() * 1.6 - 0.8, send: 0.4 });
  }
}

// The sea and the engines, for the ship, the wake and the chart.
{
  const level = automation([[0, 0], [SHIP - 0.2, 0], [SHIP + 0.3, 1], [CHART, 0.6], [DEEP - 0.05, 0.5], [DEEP, 0], [LENGTH, 0]]);
  for (const [pan, phase] of [[-0.6, 0], [0.6, 0.37]]) {
    const w = brownNoise(mix.n, rand);
    filter(w, "lowpass", (t) => 420 + 280 * Math.sin(2 * Math.PI * (0.13 * t + phase)) ** 2, 0.7);
    shape(w, 0, (t) => level(t) * duck(t) * (0.35 + 0.65 * Math.sin(Math.PI * (0.13 * t + phase)) ** 4));
    mix.place(w, 0, { gain: 0.3, pan, send: 0.2 });
  }
  const rumble = brownNoise(mix.n, rand);
  filter(rumble, "lowpass", 110, 0.7);
  shape(rumble, 0, (t) => level(t) * duck(t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 1.35 * t)));
  mix.place(rumble, 0, { gain: 0.2, send: 0.05 });
}

// Radio static and the hum of the valves, for the transmission and the question mark.
{
  const level = automation([[0, 0], [MORSE0 - 0.4, 0], [MORSE0, 0.7], [HIT - 0.3, 0.5], [HIT, 0], [QUESTION - 0.25, 0], [QUESTION, 0.8], [LENGTH - 1, 0.3], [LENGTH, 0]]);
  const hiss = filter(whiteNoise(mix.n, rand), "bandpass", 2400, 0.35);
  for (let k = 0; k < 500; k++) {
    const i = Math.round(rand() * LENGTH * SR);
    add(hiss.subarray(i), burst(0.004 + rand() * 0.01, 0.001 + rand() * 0.003, "highpass", 1500, 0.7), 2 + rand() * 6);
  }
  shape(hiss, 0, level);
  mix.place(hiss, 0, { gain: 0.05, pan: 0.1, send: 0.05 });
}

// ============================================================ one of you

// Two buzzes in the dark; then the four phones, one after another, and a sting on the last.
mix.place(phoneBuzz(), s(6), { gain: 0.22, pan: -0.3, send: 0.1 });
mix.place(phoneBuzz(), s(18), { gain: 0.2, pan: 0.35, send: 0.1 });
PHONES.forEach((at, i) => mix.place(phoneBuzz([[0.22, 0]]), at, { gain: 0.2, pan: -0.6 + i * 0.4, send: 0.1 }));
{
  const at = PHONES.at(-1);
  mix.place(boom(0.7), at, { gain: 0.45, send: 0.3 });
  const [L, R] = strings([N.D3, N.Eb3, N.A3, N.D4], 2.6, { attack: 0.02, release: 2.2, cutoff: 1400 });
  mix.placeStereo(L, R, at, { gain: 0.45, send: 0.45 });
}
// A low drone on D from the first word, and under "exactly which one", a sly figure on plucked strings.
{
  const [L, R] = strings([N.D2, N.A2], SHIP + 0.3, { attack: 3, release: 0.5, cutoff: 320 });
  mix.placeStereo(shape(L, 0, duck), shape(R, 0, duck), 0, { gain: 0.45, send: 0.3 });
  const at = s(T.VOICE.know.at);
  [N.D4, N.F4, N.A4, N.Ab4, N.G4, N.F4, N.E4, N.D4].forEach((f, i) => mix.place(pluck(f, i === 3 ? 1 : 0), at + 0.25 + i * 0.4, { gain: 0.06, pan: 0.3, send: 0.35 }));
}

// ============================================================ nowhere to go

// "He was a dreadful man. But he was my passenger." Strings, sadder than he'd admit.
{
  const [L, R] = strings([N.D3, N.F3, N.A3], CHART - SHIP + 0.6, { attack: 1.2, release: 0.6, cutoff: 900 });
  mix.placeStereo(shape(L, SHIP, duck), shape(R, SHIP, duck), SHIP, { gain: 0.3, send: 0.4 });
  const [L2, R2] = strings([N.Bb2, N.D3, N.F3], DEEP - CHART + 0.2, { attack: 0.6, release: 0.2, cutoff: 800 });
  mix.placeStereo(shape(L2, CHART, duck), shape(R2, CHART, duck), CHART, { gain: 0.3, send: 0.4 });
}
for (const key of ["crane", "land", "down"]) teleprinter(T.TAPES[key], { gain: 0.12 });
mix.place(pencil(0.7), CHART + s(18), { gain: 0.12, pan: 0.25, send: 0.05 });

// Under the ship: a rush of water on "Straight", a deep boom after "down", the screws overhead, bubbles.
{
  const plunge = filter(whiteNoise(len(1.2), rand), "lowpass", (t) => 2400 * Math.exp(-t / 0.25) + 120, 0.8);
  mix.place(mul(plunge, areEnv(plunge.length, 0.02, 0.8)), DEEP - 0.05, { gain: 0.25, send: 0.4 });
  mix.place(boom(1.4), DOWN_END + 0.05, { gain: 0.6, send: 0.35 });
  const dur = DINNER - DEEP + 0.4;
  const n = len(dur);
  const screws = brownNoise(n, rand);
  filter(screws, "lowpass", 160, 0.8);
  for (let i = 0; i < n; i++) screws[i] *= (0.35 + 0.65 * Math.max(0, Math.sin(2 * Math.PI * 2.2 * (i / SR))) ** 3) * duck(DEEP + i / SR);
  mix.place(mul(screws, areEnv(n, 0.4, 0.3)), DEEP, { gain: 0.45, send: 0.3 });
  for (let k = 0; k < 10; k++) mix.place(bubble(), DEEP + 0.3 + rand() * (dur - 0.6), { gain: 0.02 + rand() * 0.03, pan: rand() * 1.6 - 0.8, send: 0.5 });
}

// "Dinner will be served as usual." The stewards' chimes, in D major, and the table comes back.
[N.D6, N.A5, N.Fs5, N.D5].forEach((f, i) => mix.place(chime(f), s(T.CHIMES) + i * 0.3, { gain: 0.16, pan: 0.3 - i * 0.2, send: 0.45 }));

// ============================================================ the table: Cecil's mischief

// The sly figure comes back as an ostinato, a little louder with each private word.
{
  const figure = [N.D3, N.A3, N.F3, N.A3, N.D3, N.Bb3, N.F3, N.Bb3];
  const step = BEAT / 2; // quavers at 150 bpm
  let k = 0;
  for (let t = TABLE_AGAIN; t < THESIS - 0.1; t += step, k++) {
    const grow = 0.1 + 0.1 * Math.min(1, (t - TABLE_AGAIN) / (THESIS - TABLE_AGAIN));
    mix.place(pluck(figure[k % figure.length] * (k % 16 >= 8 ? 1.12246 : 1), k % 4 === 0 ? 1 : 0), t, { gain: grow * duck(t), pan: k % 2 ? 0.25 : -0.25, send: 0.25 });
  }
  const chords = [
    [TABLE_AGAIN, [N.D3, N.F3, N.A3]],
    [s(T.WHISPERS.quill.at) - 0.3, [N.Bb2, N.D3, N.F3]],
    [s(T.WHISPERS.ashdown.at) - 0.3, [N.G2, N.Bb2, N.D3]],
  ];
  chords.forEach(([at, freqs], i) => {
    const end = i < chords.length - 1 ? chords[i + 1][0] : THESIS;
    const [L, R] = strings(freqs, end - at + 0.3, { attack: 0.5, release: 0.3, cutoff: 700 + i * 250 });
    mix.placeStereo(L, R, at, { gain: 0.34 + i * 0.06, send: 0.35 });
  });
}
// A pulse under it, on every other beat, getting heavier towards the table's verdict.
for (let t = TABLE_AGAIN; t < THESIS - 0.2; t += BEAT * 2) {
  const grow = Math.min(1, (t - TABLE_AGAIN) / (THESIS - TABLE_AGAIN));
  mix.place(kick(grow), t, { gain: 0.12 + 0.16 * grow, send: 0.08 });
}
for (const w of Object.values(T.WHISPERS)) {
  mix.place(phoneBuzz(), s(w.at) - 0.02, { gain: 0.3, pan: 0.45, send: 0.1 });
  mix.place(chime(N.A5 * 2), s(w.at) + 0.08, { gain: 0.04, pan: 0.45, send: 0.3 });
}
for (const id of ["kingsley", "quill", "ashdown"]) mix.place(reveal(), s(T.SCENES[id][0]) + 0.1, { gain: 0.5, send: 0.35 });

// "Only one of you is lying about murder." The music stops for the first line, and hits on the second.
{
  mix.place(boom(1), THESIS_HIT, { gain: 0.55, send: 0.35 });
  const [L, R] = strings([N.D2, N.A2, N.D3, N.F3, N.Bb3], MORSE0 - THESIS_HIT + 0.1, { attack: 0.01, release: 1.1, cutoff: 1800 });
  mix.placeStereo(L, R, THESIS_HIT, { gain: 0.5, send: 0.4 });
  const hold = sine(len(THESIS_HIT - THESIS), (t) => N.A5 * (1 + 0.0025 * Math.sin(2 * Math.PI * 5.2 * t)));
  mix.place(mul(hold, areEnv(hold.length, 0.3, 0.05)), THESIS, { gain: 0.03, send: 0.6 });
}

// ============================================================ the transmission: DEAD RECKONING, 150 bpm

sendMorse(T.MORSE.tones, { gain: 0.24 });
{
  // The chords change every few bars; the bass plays the root, keyed with the Morse.
  const CHORDS = [
    [MORSE0, [N.D2, N.D3, N.F3, N.A3], N.D2],
    [GAP[1], [N.Bb2, N.D3, N.F3, N.Bb3], N.Bb1],
    [MORSE0 + 6.4, [N.G2, N.D3, N.G3, N.Bb3], N.G1],
    [MORSE0 + 9.6, [N.A2, N.Cs3, N.E3, N.A3], N.A1],
  ];
  const chordAt = (t) => CHORDS.filter(([at]) => t >= at).at(-1);

  for (const tone of T.MORSE.tones) {
    const a = s(tone.from);
    const b = s(tone.to);
    const root = chordAt(a)[2];
    const n = len(b - a + 0.06);
    const bass = saw(n, root, rand());
    add(bass, saw(n, root * 2 * 1.003, rand()), 0.5);
    filter(bass, "lowpass", 380 + (a - MORSE0) * 45, 1.1);
    mix.place(mul(bass, areEnv(n, 0.005, 0.05)), a, { gain: 0.3, send: 0.08 });
  }
  // Kick on every beat (resting between the words), a shaker on the offbeats once RECKONING starts.
  for (let t = MORSE0; t < MORSE1 + 0.01; t += BEAT) {
    if (t > GAP[0] - 0.05 && t < GAP[1] - 0.05) continue;
    mix.place(kick(1), t, { gain: 0.38, send: 0.08 });
    if (t >= GAP[1]) mix.place(shaker(), t + BEAT / 2, { gain: 0.05, pan: 0.35, send: 0.05 });
  }
  // A low tom as each letter lands on the tape; a buzz under the phones in the montage.
  T.MORSE.letters.forEach((l, i) => mix.place(tom(i % 2 ? 98 : 82), s(l.to), { gain: 0.22, pan: i % 2 ? 0.2 : -0.2, send: 0.2 }));
  T.LETTER_SHOTS.forEach((shot, i) => {
    if (shot === "banner" || shot === "whisper") mix.place(phoneBuzz([[0.25, 0]]), s(T.MORSE.letters[i].from), { gain: 0.18, pan: 0.3, send: 0.1 });
  });
  // The pause between the words: a deep boom, then RECKONING.
  mix.place(boom(0.8), GAP[0] + 0.02, { gain: 0.55, send: 0.3 });

  CHORDS.forEach(([at, freqs], i) => {
    const end = i < CHORDS.length - 1 ? CHORDS[i + 1][0] : HIT;
    if (i === 0) {
      const [L, R] = strings(freqs, GAP[0] - at + 0.3, { attack: 0.3, release: 0.25, cutoff: 900 });
      mix.placeStereo(L, R, at, { gain: 0.32, send: 0.3 });
      return;
    }
    const [L, R] = strings(freqs, end - at + 0.15, { attack: 0.15, release: 0.12, cutoff: (t) => 900 + i * 500 + t * 300 });
    mix.placeStereo(L, R, at, { gain: 0.3 + i * 0.08, send: 0.3 });
  });
  mix.place(riser(HIT - (MORSE1 - 2.2)), MORSE1 - 2.2, { gain: 0.2, send: 0.4 });
}

// ============================================================ the title, and the vote

mix.place(boom(1.6), HIT, { gain: 0.72, send: 0.4 });
mix.place(crash(), HIT, { gain: 0.18, send: 0.5 });
{
  const [L, R] = strings([N.D1 * 2, N.A1 * 2, N.D2 * 2, N.F2 * 2, N.A2 * 2], SHARKS - HIT + 1.2, { attack: 0.01, release: 1.6, cutoff: (t) => 1500 * Math.exp(-t / 1.4) + 250 });
  mix.placeStereo(L, R, HIT, { gain: 0.6, send: 0.45 });
}

// The shared screen's clock, a second at a time, and a heartbeat that quickens under the vote.
{
  for (let t = SHARKS + 0.1, k = 0; t < VOTE[1] - 0.05; t += 1, k++) mix.place(clockTick(k % 2 === 1), t, { gain: 0.1, pan: -0.2, send: 0.25 });
  let t = SHARKS + 0.3;
  let gap = 0.9;
  while (t < VOTE[1] - 0.15) {
    mix.place(heartbeat(), t, { gain: 0.4 * duck(t) + 0.12, send: 0.1 });
    t += gap;
    gap = Math.max(0.42, gap * 0.93);
  }
  const tremolo = saw(len(VOTE[1] - SHARKS), (t) => N.A4 * (1 + 0.003 * Math.sin(2 * Math.PI * 5.5 * t)), rand());
  for (let i = 0; i < tremolo.length; i++) tremolo[i] *= 0.6 + 0.4 * Math.sin(2 * Math.PI * 11 * (i / SR));
  filter(tremolo, "lowpass", 2200, 0.7);
  mix.place(shape(mul(tremolo, areEnv(tremolo.length, 1.5, 0.01)), SHARKS, duck), SHARKS, { gain: 0.05, pan: 0.2, send: 0.5 });
  const rise = riser(VOTE[1] - VOTE[0]);
  mix.place(mul(rise, 0.5), VOTE[0], { gain: 0.14, send: 0.3 });
}
// Your thumb moving over the names: a tiny tick each time it lands on one.
{
  const step = (f) => (f < 34 ? -1 : Math.floor(((f - 34) / 14) ** 1.3));
  const frames = T.VOTE.to - T.VOTE.from - 16;
  for (let f = 1; f < frames; f++) if (step(f) !== step(f - 1) && step(f) >= 0) mix.place(clockTick(false), s(T.VOTE.from + f), { gain: 0.035, pan: 0.2, send: 0.1 });
}

// Black. A question mark in Morse, and the music left hanging on A.
sendMorse(T.QUESTION.tones, { gain: 0.22, radio: true });
{
  const at = s(T.SCENES.endcard[0]);
  const [L, R] = strings([N.A1 * 2, N.E3, N.A3], LENGTH - at, { attack: 0.8, release: 1.2, cutoff: 900 });
  mix.placeStereo(L, R, at, { gain: 0.3, send: 0.5 });
}

// Cecil's lines.
// (NO_VOICE=1 npm run sound leaves him out, for checking how the music sits underneath.)
for (const line of process.env.NO_VOICE ? [] : Object.values(T.VOICE)) {
  if (!existsSync(here(`../${line.file}`))) {
    console.warn(`(No ${line.file} yet: leaving that line out.)`);
    continue;
  }
  const voice = filter(readWav(here(`../${line.file}`)), "highpass", 70, 0.7);
  mix.place(voice, s(line.at), { gain: 2.1, send: 0.08 });
}

// ============================================================ out

// Nothing at all between the vote and the question mark.
for (let i = Math.round(VOTE[1] * SR); i < Math.round((QUESTION - 0.02) * SR); i++) mix.L[i] = mix.R[i] = mix.send[i] = 0;
mix.finish({ fadeIn: 0.3, fadeOutFrom: LENGTH - 0.8 });
const out = fileURLToPath(new URL("../../public/media/trailer-sound.wav", import.meta.url));
mix.writeWav(out);
console.log(`Wrote ${out}`);
console.log(
  mix
    .report([
      ["Cecil: one of you", s(T.VOICE.one.at), PHONES[0]],
      ["the phones", PHONES[0], s(T.VOICE.know.at)],
      ["Cecil: which one", s(T.VOICE.know.at), SHIP],
      ["ship: dreadful man", SHIP, CHART],
      ["chart: three miles", CHART, DEEP],
      ["under the ship", DEEP, DINNER],
      ["dinner, chimes", DINNER, TABLE_AGAIN],
      ["whispers and faces", TABLE_AGAIN, THESIS],
      ["only one of you", THESIS, MORSE0],
      ["transmission", MORSE0, HIT],
      ["title", HIT, SHARKS],
      ["clock, vote", SHARKS, VOTE[1]],
      ["question mark, end", QUESTION, LENGTH],
    ])
    .join("\n"),
);
