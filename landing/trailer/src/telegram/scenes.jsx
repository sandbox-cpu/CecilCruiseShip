// The scenes of the telegram trailer. Every word on screen is Cecil's dictation,
// the game's public premise or its cast list, and nothing here gives the solution away.

import { AbsoluteFill, Img, Sequence, getInputProps, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { Eyebrow, Photo, Reveal, Shot, ease } from "../parts.jsx";
import { C, F } from "../theme.js";
import { CHART, COMING_SOON, DEFINITION, HIT, LETTER_SHOTS, LIGHTNING, MORSE, ROGER, STAMPS, TAPES, UNIT } from "./timing.js";

// The moving shots, animated from the stills with Higgsfield (Kling). A shot
// whose clip is missing falls back to its photograph.
export const CLIPS = {
  key: "media/trailer-src/wireless-key.mp4",
  deep: "media/trailer-src/hull-below.mp4",
  ship: "media/trailer-src/ship-push.mp4",
};
// render.mjs says which clips exist; the Studio assumes they all do.
const available = getInputProps().clips;
const clip = (id) => (!available || available[id] ? CLIPS[id] : null);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const INK = "#1b1712";
const RED = "#a8322d";

// ------------------------------------------------------------------ telegram tape

// The torn ends of a strip of tape.
const TORN = "polygon(0% 10%, 0.9% 0%, 99.1% 0%, 100% 12%, 99.3% 34%, 100% 55%, 99.2% 77%, 100% 91%, 99% 100%, 1% 100%, 0% 88%, 0.8% 67%, 0% 45%, 0.7% 23%)";

/** Teleprinter type sits a little unevenly on the tape. */
const jitter = (i) => (((i * 37) % 7) - 3) * 0.5;

/** How much of `tape` has been typed by global frame `f`. */
const typed = (tape, f) => Math.max(0, Math.min(tape.text.length, Math.floor(((f - tape.at) / 30) * tape.cps)));

export function TapeStrip({ text, size = 44, style }) {
  if (!text) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: size * 1.6,
        padding: `0 ${size * 0.62}px`,
        background: "linear-gradient(180deg, #f5edd7 0%, #e8dcbd 100%)",
        color: INK,
        fontFamily: F.tape,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.05em",
        whiteSpace: "pre",
        clipPath: TORN,
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.55))",
        ...style,
      }}
    >
      {[...text].map((ch, i) => (
        <span key={i} style={{ display: "inline-block", transform: `translateY(${jitter(i)}px)`, opacity: 0.84 + 0.04 * ((i * 7) % 5) }}>
          {ch}
        </span>
      ))}
    </div>
  );
}

/** Tape lines typed out one under another, pasted at the lower left like a telegram form. `from` is the scene's first frame. */
function TapeLines({ tapes, from, size = 44, style }) {
  const f = useCurrentFrame() + from;
  return (
    <div style={{ position: "absolute", left: 150, bottom: 96, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, ...style }}>
      {tapes.map((tape, i) => (
        <TapeStrip key={i} text={tape.text.slice(0, typed(tape, f))} size={size} style={{ transform: `rotate(${i % 2 ? 0.5 : -0.6}deg)` }} />
      ))}
    </div>
  );
}

/** Plain typed text (no tape), for printed forms. */
function Typed({ text, at, cps = 28, style }) {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.min(text.length, Math.floor(((frame - at) / 30) * cps)));
  return <div style={{ fontFamily: F.tape, fontWeight: 700, whiteSpace: "pre", ...style }}>{text.slice(0, shown) || " "}</div>;
}

/** Is the operator's key down at global frame `f`? */
const keyDown = (tones, f) => tones.some((t) => f >= t.from && f < t.to);

// ------------------------------------------------------------------ 1. a new position

export function Opening({ from }) {
  const f = useCurrentFrame() + from;
  const tape = TAPES.position;
  // Centre the finished line; the tape feeds out to the right as it's typed.
  const width = tape.text.length * 52 * 0.63 + 2 * 52 * 0.62;
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <div style={{ position: "absolute", top: 500, left: (1920 - width) / 2 }}>
        <TapeStrip text={tape.text.slice(0, typed(tape, f))} size={52} />
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 2. the wireless room

export function Wireless({ calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const valves = calm ? 0.5 : 0.5 + 0.2 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37 + 1);
  const roger = !calm && keyDown(ROGER.tones, f) ? 0.1 : 0;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/cecil-wireless.jpg" calm={calm} from={1.04} to={1.12} origin="72% 32%" />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 22% 58%, rgba(255,170,80,${0.18 * valves + roger}) 0%, rgba(255,170,80,0) 55%)`, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,8,13,0.78) 0%, rgba(3,8,13,0.15) 42%, rgba(3,8,13,0) 58%)" }} />
      <div style={{ position: "absolute", left: 130, top: 120, display: "flex", flexDirection: "column", gap: 16 }}>
        <Typed text="SS HALCYON · SHIP'S TELEGRAM" at={146 - from} style={{ fontSize: 30, letterSpacing: "0.2em", color: C.brass2 }} />
        <Typed text="FROM  CECIL, CHIEF PURSER" at={160 - from} style={{ fontSize: 40, color: C.ink }} />
        <Typed text="TO    WHOM IT MAY CONCERN" at={178 - from} style={{ fontSize: 40, color: C.ink }} />
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 3. over the side

export function Wake({ calm, from }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/wake.jpg" calm={calm} from={1.03} to={1.13} origin="50% 28%" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 45%, rgba(3,8,13,0.7) 100%)" }} />
      <TapeLines tapes={[TAPES.regret, TAPES.crane]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 4. the chart

const W = 1920;
const H = 1080;
const LON = [-66, -8];
const LAT = [6, 40];
const P = (lat, lon) => [((lon - LON[0]) / (LON[1] - LON[0])) * W, ((LAT[1] - lat) / (LAT[1] - LAT[0])) * H];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const MADEIRA = P(32.75, -16.95);
const BARBADOS = P(13.15, -59.55);
const HERE = lerp(MADEIRA, BARBADOS, 0.43); // three nights out, four days to run

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small island: a smooth, irregular blob. */
function island(lat, lon, r, squash, seed) {
  const [cx, cy] = P(lat, lon);
  const rand = seeded(seed);
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const k = r * (0.72 + rand() * 0.5);
    return [cx + Math.cos(a) * k * squash, cy + Math.sin(a) * k];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[8], pts[0]).join(" ")}`;
  pts.forEach((p, i) => (d += ` Q${p.join(" ")} ${mid(p, pts[(i + 1) % 9]).join(" ")}`));
  return `${d} Z`;
}

const ISLANDS = [
  [32.75, -16.95, 14, 1.8], [33.06, -16.33, 5, 1], // Madeira, Porto Santo
  [28.7, -17.9, 6, 0.8], [27.75, -18.0, 5, 1], [28.1, -17.2, 5, 1], [28.3, -16.6, 12, 1.4], [27.95, -15.6, 10, 1], [28.4, -14.0, 12, 0.6], [29.0, -13.6, 9, 0.8], // Canaries
  [37.75, -25.5, 9, 1.8], [38.5, -28.3, 6, 1.6], [38.65, -27.2, 5, 1], [39.45, -31.2, 4, 1], // Azores
  [32.3, -64.75, 4, 1], // Bermuda
  [18.2, -66.3, 10, 3], [17.07, -61.8, 4, 1], [16.2, -61.5, 8, 1.2], [15.4, -61.35, 6, 0.7], [14.65, -61.0, 8, 0.8], [13.9, -60.97, 5, 0.7], [13.25, -61.2, 4, 0.8], [12.1, -61.7, 4, 0.8], [13.15, -59.55, 6, 0.8], [11.25, -60.7, 5, 1.4], [10.45, -61.3, 16, 1.3], // the Antilles
];

const AFRICA = [[40, -8.9], [38.7, -9.5], [37.0, -8.9], [37.2, -7.4], [36.4, -6.2], [35.8, -5.9], [34.0, -6.8], [33.5, -7.6], [32.3, -9.2], [31.5, -9.8], [30.4, -9.6], [29.0, -10.9], [28.0, -12.9], [27.0, -13.4], [26.0, -14.5], [24.5, -15.6], [23.5, -16.0], [21.3, -16.9], [20.8, -17.05], [19.0, -16.3], [16.0, -16.5], [14.7, -17.4], [12.0, -16.8], [10.0, -14.5], [8.0, -13.2], [6.0, -10.5]].map(([a, b]) => P(a, b));
const AMERICA = [[10.6, -66], [10.65, -64], [10.7, -62.5], [10.1, -62], [9.8, -61.6], [8.9, -60.6], [8.4, -59.8], [7.6, -58.6], [6.8, -58.1], [6.0, -57.2]].map(([a, b]) => P(a, b));

const SOUNDINGS = [
  [36, -45, "2890"], [34, -38, "2510"], [31, -30, "2300"], [29, -24, "2640"], [26, -44, "2980"], [22, -40, "3100"], [20, -33, "2860"], [18, -47, "3050"],
  [15, -38, "2760"], [12, -50, "2600"], [24, -54, "3210"], [30, -50, "2940"], [35, -55, "2750"], [21, -27, "2690"], [17, -24, "2480"], [27, -31, "2820"], [33, -24, "2410"], [9, -44, "2570"],
];

const pencil = "#3b3f46";
const label = { fontFamily: F.serif, fill: "#5b4d35", letterSpacing: "0.18em", fontSize: 17 };

/** The chart itself, drawn at scale `s` and shifted by `t`. `frame` is the scene's frame. */
function ChartBody({ frame, s, t }) {
  const at = (a, b) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: ease });
  const track = at(...CHART.track);
  const run = at(...CHART.run);
  const ring = at(...CHART.ring);
  const sounding = at(CHART.sounding, CHART.sounding + 10);
  const trackLen = Math.hypot(HERE[0] - MADEIRA[0], HERE[1] - MADEIRA[1]);
  const day = (i) => lerp(MADEIRA, HERE, (i + 1) / 3.3);

  // The dividers walk the run to Barbados, a day at a time: `walk` goes from 1 to 4.
  const stepAt = (k) => lerp(HERE, BARBADOS, k / 4);
  const raw = interpolate(frame, CHART.days, [0, 3], clamp);
  const whole = Math.min(2, Math.floor(raw));
  const within = raw >= 3 ? 1 : ease(raw - whole);
  const walk = 1 + whole + within;
  const legs = [stepAt(walk - 1), stepAt(walk)];
  const lift = 30 * Math.sin(within * Math.PI);
  const apex = [(legs[0][0] + legs[1][0]) / 2 + 40, (legs[0][1] + legs[1][1]) / 2 - 150 - lift];
  const dividers = interpolate(frame, [CHART.days[0] - 6, CHART.days[0], CHART.days[1] + 4, CHART.days[1] + 14], [0, 1, 1, 0], clamp);
  const hand = { fontFamily: F.display, fontStyle: "italic", fontWeight: 600, fill: RED };

  return (
    <g transform={`translate(${t[0]} ${t[1]}) scale(${s})`}>
      {/* graticule */}
      {Array.from({ length: 12 }, (_, i) => -65 + i * 5).map((lon) => (
        <line key={`lo${lon}`} x1={P(0, lon)[0]} x2={P(0, lon)[0]} y1={0} y2={H} stroke="#8a7a55" strokeOpacity={lon % 10 === 0 ? 0.45 : 0.22} strokeWidth={1} />
      ))}
      {Array.from({ length: 7 }, (_, i) => 10 + i * 5).map((lat) => (
        <line key={`la${lat}`} y1={P(lat, 0)[1]} y2={P(lat, 0)[1]} x1={0} x2={W} stroke="#8a7a55" strokeOpacity={lat % 10 === 0 ? 0.45 : 0.22} strokeWidth={1} />
      ))}
      {[10, 20, 30].map((lat) => (
        <text key={lat} x={40} y={P(lat, 0)[1] - 8} {...label} fontSize={16}>{`${lat}°N`}</text>
      ))}
      {[-60, -50, -40, -30, -20].map((lon) => (
        <text key={lon} x={P(0, lon)[0] + 8} y={H - 36} {...label} fontSize={16}>{`${-lon}°W`}</text>
      ))}

      {/* land */}
      <path d={`M${AFRICA.map((p) => p.join(" ")).join(" L")} L${W + 40} ${H + 40} L${W + 40} -40 Z`} fill="#d7c69c" stroke="#6d5b3a" strokeWidth={2} />
      <path d={`M${AMERICA.map((p) => p.join(" ")).join(" L")} L-40 ${H + 40} Z`} fill="#d7c69c" stroke="#6d5b3a" strokeWidth={2} />
      {ISLANDS.map(([lat, lon, r, sq], i) => (
        <path key={i} d={island(lat, lon, r, sq, 11 + i * 7)} fill="#d7c69c" stroke="#6d5b3a" strokeWidth={1.6} />
      ))}
      <text x={P(20, -12.5)[0]} y={P(20, -12.5)[1]} {...label} fontSize={22}>AFRICA</text>
      <text x={MADEIRA[0] - 150} y={MADEIRA[1] - 22} {...label}>MADEIRA</text>
      <text x={P(26.6, -20)[0]} y={P(26.6, -20)[1]} {...label}>CANARY IS.</text>
      <text x={P(36.6, -31)[0]} y={P(36.6, -31)[1]} {...label}>AZORES</text>
      <text x={P(31.2, -64)[0]} y={P(31.2, -64)[1]} {...label}>BERMUDA</text>
      <text x={BARBADOS[0] + 22} y={BARBADOS[1] + 6} {...label}>BARBADOS</text>

      {/* soundings, in fathoms */}
      {SOUNDINGS.map(([lat, lon, d]) => (
        <text key={d + lat} x={P(lat, lon)[0]} y={P(lat, lon)[1]} fontFamily={F.serif} fontStyle="italic" fontSize={17} fill="#6e6049" opacity={0.8}>{d}</text>
      ))}

      {/* compass rose */}
      <g transform={`translate(${P(12, -26).join(" ")})`} opacity={0.75}>
        <circle r={118} fill="none" stroke="#7a6a48" strokeWidth={1.5} />
        <circle r={104} fill="none" stroke="#7a6a48" strokeWidth={1} />
        {Array.from({ length: 32 }, (_, i) => (
          <line key={i} y1={-104} y2={i % 4 === 0 ? -88 : -97} stroke="#7a6a48" strokeWidth={1} transform={`rotate(${i * 11.25})`} />
        ))}
        {[0, 90, 180, 270].map((a) => (
          <polygon key={a} points="0,-100 12,-12 0,0 -12,-12" fill={a === 0 ? RED : "#7a6a48"} transform={`rotate(${a})`} />
        ))}
        {[45, 135, 225, 315].map((a) => (
          <polygon key={a} points="0,-62 8,-8 0,0 -8,-8" fill="#9c8a62" transform={`rotate(${a})`} />
        ))}
        <text y={-126} textAnchor="middle" {...label} fontSize={18} letterSpacing="0">N</text>
      </g>

      {/* the track so far, in pencil, with a mark each noon */}
      <line x1={MADEIRA[0]} y1={MADEIRA[1]} x2={HERE[0]} y2={HERE[1]} stroke={pencil} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={trackLen} strokeDashoffset={trackLen * (1 - track)} />
      {[0, 1, 2].map((i) => {
        const [x, y] = day(i);
        const on = interpolate(track, [(i + 1) / 3.3 - 0.02, (i + 1) / 3.3 + 0.04], [0, 1], clamp);
        return (
          <g key={i} opacity={on}>
            <path d={`M${x - 11} ${y} A11 11 0 0 1 ${x + 11} ${y}`} fill="none" stroke={pencil} strokeWidth={2} />
            <text x={x + 14} y={y - 12} fontFamily={F.display} fontStyle="italic" fontSize={24} fill={pencil}>{`Day ${i + 1}`}</text>
          </g>
        );
      })}
      {/* tonight's position */}
      <g opacity={interpolate(track, [0.9, 1], [0, 1], clamp)}>
        <line x1={HERE[0] - 13} y1={HERE[1] - 13} x2={HERE[0] + 13} y2={HERE[1] + 13} stroke={RED} strokeWidth={3.4} strokeLinecap="round" />
        <line x1={HERE[0] + 13} y1={HERE[1] - 13} x2={HERE[0] - 13} y2={HERE[1] + 13} stroke={RED} strokeWidth={3.4} strokeLinecap="round" />
        <text x={HERE[0] - 20} y={HERE[1] - 24} textAnchor="end" {...hand} fontSize={26}>0120</text>
      </g>

      {/* four days to run */}
      <line x1={HERE[0]} y1={HERE[1]} x2={HERE[0] + (BARBADOS[0] - HERE[0]) * run} y2={HERE[1] + (BARBADOS[1] - HERE[1]) * run} stroke={pencil} strokeWidth={2.4} strokeDasharray="14 12" strokeLinecap="round" opacity={0.85} />
      {[1, 2, 3, 4].map((k) => {
        const [x, y] = stepAt(k);
        return (
          <text key={k} x={x - 8} y={y + 36} {...hand} fontSize={28} opacity={interpolate(walk, [k - 0.15, k], [0, 1], clamp) * (frame >= CHART.days[0] ? 1 : 0)}>
            {k}
          </text>
        );
      })}
      <text x={BARBADOS[0] + 22} y={BARBADOS[1] + 40} {...hand} fontSize={30} opacity={interpolate(walk, [3.9, 4], [0, 1], clamp)}>
        four days
      </text>

      {/* the dividers, walking */}
      <g opacity={dividers}>
        <line x1={apex[0]} y1={apex[1]} x2={legs[0][0]} y2={legs[0][1]} stroke="#8c6a2a" strokeWidth={5} strokeLinecap="round" />
        <line x1={apex[0]} y1={apex[1]} x2={legs[1][0]} y2={legs[1][1]} stroke="#b08a3c" strokeWidth={5} strokeLinecap="round" />
        <circle cx={apex[0]} cy={apex[1]} r={11} fill={C.brass} stroke="#6b5020" strokeWidth={2} />
      </g>

      {/* how deep it is here */}
      <g opacity={sounding}>
        <text x={HERE[0] + 34} y={HERE[1] + 44} fontFamily={F.serif} fontStyle="italic" fontSize={24} fill="#4b3f2c">2700</text>
        <ellipse cx={HERE[0] + 62} cy={HERE[1] + 36} rx={46} ry={24} fill="none" stroke={RED} strokeWidth={2.6} strokeDasharray={230} strokeDashoffset={230 * (1 - ring)} transform={`rotate(-8 ${HERE[0] + 62} ${HERE[1] + 36})`} />
        <text x={HERE[0] + 118} y={HERE[1] + 44} {...hand} fontSize={20} opacity={interpolate(frame, [CHART.ring[1] - 6, CHART.ring[1] + 6], [0, 1], clamp)}>
          fathoms: three miles
        </text>
      </g>
    </g>
  );
}

export function Chart({ calm, from }) {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, CHART.zoom, [0, 1], { ...clamp, easing: ease });
  // Close in on tonight's position. When calm, cross-fade to the close view instead of moving.
  const near = 2.6;
  const target = [960, 470];
  const view = (z) => {
    const s = (calm ? 1 : 1 + 0.03 * interpolate(frame, [0, CHART.zoom[0]], [0, 1], clamp)) * (1 + (near - 1) * z);
    return { s, t: [z * (target[0] - HERE[0] * s), z * (target[1] - HERE[1] * s)] };
  };
  const far = view(calm ? 0 : zoom);
  const close = view(1);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #efe6cb 0%, #e3d6b2 60%, #cdbd92 100%)", overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <g opacity={calm ? 1 - zoom : 1}>
          <ChartBody frame={frame} s={far.s} t={far.t} />
        </g>
        {calm && (
          <g opacity={zoom}>
            <ChartBody frame={frame} s={close.s} t={close.t} />
          </g>
        )}
        {/* the chart's cartouche */}
        <g opacity={1 - zoom}>
          <rect x={60} y={56} width={560} height={150} fill="rgba(239,230,203,0.9)" stroke="#6d5b3a" strokeWidth={2} />
          <rect x={68} y={64} width={544} height={134} fill="none" stroke="#6d5b3a" strokeWidth={1} />
          <text x={340} y={112} textAnchor="middle" fontFamily={F.display} fontWeight={600} fontSize={34} letterSpacing="0.16em" fill="#3f3322">NORTH ATLANTIC OCEAN</text>
          <text x={340} y={146} textAnchor="middle" fontFamily={F.display} fontStyle="italic" fontSize={24} fill="#4d3f2a">Madeira to the Windward Islands</text>
          <text x={340} y={178} textAnchor="middle" {...label} fontSize={14}>SOUNDINGS IN FATHOMS</text>
        </g>
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(40,28,10,0.35) 100%)" }} />
      <TapeLines tapes={[TAPES.port, TAPES.land]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 5. straight down

export function Deep({ calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const tapeGone = interpolate(f, [DEFINITION - 10, DEFINITION], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#01060b", overflow: "hidden" }}>
      <Shot clip={clip("deep")} photo="media/photos/hull-below.jpg" calm={calm} from={1.02} to={1.08} style={{ filter: "brightness(1.25) contrast(1.05)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,20,32,0) 40%, rgba(1,6,11,0.8) 100%)" }} />
      <div style={{ opacity: tapeGone }}>
        <TapeLines tapes={[TAPES.down]} from={from} />
      </div>
      <Reveal at={DEFINITION - from} calm={calm} style={{ position: "absolute", left: 150, bottom: 150, maxWidth: 1600 }}>
        <Eyebrow style={{ fontSize: 28 }}>Dead reckoning</Eyebrow>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 500, fontSize: 66, lineHeight: 1.12, color: C.ink, marginTop: 12, textShadow: "0 2px 30px rgba(0,0,0,0.9)" }}>
          Working out where you are <span style={{ color: C.brass2 }}>from where you’ve been.</span>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 6. persons aboard

const GUESTS = [
  { photo: "media/photos/kingsley.jpg", name: "MISS C. KINGSLEY", role: "‘Britain’s sweetheart of 1949’" },
  { photo: "media/photos/quill.jpg", name: "MR L. QUILL", role: "a gentleman, travelling alone" },
  { photo: "media/photos/ashdown.jpg", name: "MISS P. ASHDOWN", role: "the ship’s Social Hostess" },
  { photo: "media/photos/pryce.jpg", name: "MR O. PRYCE", role: "the ship’s Radio Officer" },
];

function Stamp({ at, rotate, calm }) {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = interpolate(frame, [at, at + (calm ? 10 : 3)], [0, 1], clamp);
  const scale = calm ? 1 : 1.45 - 0.45 * p;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 372,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`,
        opacity: 0.86 * p,
        border: `5px solid ${RED}`,
        borderRadius: 6,
        color: RED,
        fontFamily: F.tape,
        fontWeight: 700,
        fontSize: 50,
        letterSpacing: "0.14em",
        padding: "2px 16px 2px 22px",
        mixBlendMode: "multiply",
      }}
    >
      ABOARD
    </div>
  );
}

export function Aboard({ calm, from }) {
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #24323b 0%, #070d13 72%)", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 170,
          top: 60,
          width: 1580,
          height: 720,
          padding: "46px 90px",
          background: "linear-gradient(170deg, #f3ead2 0%, #e6d9b8 100%)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.7)",
          transform: "rotate(-0.8deg)",
          color: INK,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
          <Typed text="SS HALCYON" at={708 - from} cps={30} style={{ fontSize: 34, letterSpacing: "0.12em" }} />
          <Typed text="PERSONS ABOARD" at={714 - from} cps={30} style={{ fontSize: 34, letterSpacing: "0.12em" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 44 }}>
          {GUESTS.map((g, i) => (
            <div key={g.name} style={{ position: "relative", width: 300 }}>
              <div style={{ width: 300, height: 380, padding: 10, background: "#fbf7ec", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", transform: `rotate(${[-1.5, 1, -0.6, 1.4][i]}deg)` }}>
                <Img src={staticFile(g.photo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", filter: "grayscale(1) sepia(0.35) contrast(1.08)" }} />
              </div>
              <div style={{ fontFamily: F.tape, fontWeight: 700, fontSize: 25, marginTop: 22 }}>{g.name}</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 23, marginTop: 4, color: "#4a4032" }}>{g.role}</div>
              <Stamp at={STAMPS[i] - from} rotate={[-9, 6, -4, 8][i]} calm={calm} />
            </div>
          ))}
        </div>
      </div>
      <TapeLines tapes={[TAPES.murderer]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 7. nowhere to go

export function Porthole({ calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const flash = calm ? 0 : interpolate(f, [LIGHTNING, LIGHTNING + 2, LIGHTNING + 5, LIGHTNING + 7, LIGHTNING + 9, LIGHTNING + 20], [0, 0.55, 0.1, 0.4, 0.2, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/porthole.jpg" calm={calm} from={1.02} to={1.12} origin="46% 50%" style={{ filter: `brightness(${1 + flash * 1.4})` }} />
      <AbsoluteFill style={{ background: "#cfe0ff", opacity: flash * 0.18, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 50%, rgba(3,8,13,0.7) 100%)" }} />
      <TapeLines tapes={[TAPES.passengers]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 8. "Send it."

export function SendIt({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/cecil-wireless.jpg" calm={calm} from={1.5} to={1.64} origin="79% 12%" />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(3,8,13,0) 35%, rgba(3,8,13,0.8) 100%)" }} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 9. the transmission

const FACES = { kingsley: "Miss Coral Kingsley", quill: "Mr Laurence Quill", ashdown: "Miss Penelope Ashdown", pryce: "Mr Owen Pryce" };

/** One picture of the montage. Each lives in its own <Sequence>, so clips start where they should. */
function LetterShot({ name, calm, index }) {
  switch (name) {
    case "key":
      return <Shot clip={clip("key")} photo="media/photos/wireless-key.jpg" calm={calm} startFrom={index === 0 ? 12 : 96} from={1.04} to={1.1} />;
    case "deep":
      return <Shot clip={clip("deep")} photo="media/photos/hull-below.jpg" calm={calm} startFrom={70} from={1.04} to={1.08} style={{ filter: "brightness(1.3)" }} />;
    case "ship":
      return <Shot clip={clip("ship")} photo="media/photos/ship.jpg" calm={calm} startFrom={60} from={1.04} to={1.1} />;
    case "cecil":
      return <Photo src="media/photos/cecil-wireless.jpg" calm={calm} from={1.9} to={2.02} origin="79% 13%" />;
    case "porthole":
      return <Photo src="media/photos/porthole.jpg" calm={calm} from={1.12} to={1.2} origin="46% 50%" />;
    case "staircase":
      return <Photo src="media/photos/staircase.jpg" calm={calm} from={1.06} to={1.14} />;
    case "ballroom":
      return <Photo src="media/photos/ballroom-after.jpg" calm={calm} from={1.06} to={1.14} origin="50% 60%" />;
    case "wake":
      return <Photo src="media/photos/wake.jpg" calm={calm} from={1.08} to={1.16} origin="50% 30%" />;
    default:
      // A suspect: tight on the eyes, name typed small in the corner.
      return (
        <AbsoluteFill>
          <Photo src={`media/photos/${name}.jpg`} calm={calm} from={1.02} to={1.08} origin="50% 30%" style={{ objectPosition: "50% 27%" }} />
          <div style={{ position: "absolute", left: 130, top: 110, fontFamily: F.tape, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: C.ink, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
            {FACES[name].toUpperCase()}
          </div>
        </AbsoluteFill>
      );
  }
}

/** The dots and dashes of the letter being sent, lighting up as they sound. */
function Marks({ f }) {
  const index = MORSE.letters.findIndex((l) => f >= l.from && f < l.to + 9);
  if (index < 0) return null;
  const letter = MORSE.letters[index];
  const fade = interpolate(f, [letter.to + 1, letter.to + 8], [1, 0], clamp);
  const tones = MORSE.tones.filter((t) => t.letter === index && t.from <= f);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", height: 26, opacity: fade }}>
      {tones.map((t) => {
        const on = f < t.to;
        return <div key={t.from} style={{ width: t.dah ? 70 : 24, height: 24, borderRadius: 12, background: on ? C.amber : C.brass, boxShadow: on ? `0 0 26px ${C.amber}` : "none" }} />;
      })}
    </div>
  );
}

const TITLE = "DEAD RECKONING";

/** Fade in and out over `fade` frames, or less if the shot is too short for both. */
const crossFade = (t, dur, fade) => {
  const f = Math.max(1, Math.min(fade, Math.floor((dur - 1) / 2)));
  return interpolate(t, [0, f, dur - f, dur], [0, 1, 1, 0], clamp);
};

export function Transmit({ calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const letters = MORSE.letters;

  // Each picture runs from its letter's first tone to the next letter's; the gap between the words is black.
  const shots = letters.map((l, i) => {
    const next = letters[i + 1]?.from ?? HIT;
    const end = next - l.to > UNIT * 5 ? l.to + 2 : next;
    const start = i === 0 ? from : l.from;
    return { name: LETTER_SHOTS[i], start: start - from, dur: end - start };
  });

  // The title so far, one letter each time a letter is complete.
  const done = letters.filter((l) => f >= l.to).length;
  let text = "";
  let n = 0;
  for (const ch of TITLE) {
    if (ch === " ") text += done > n ? " " : "";
    else if (n < done) {
      text += ch;
      n++;
    }
  }
  const glow = !calm && keyDown(MORSE.tones, f) ? 0.07 : 0;
  const fade = calm ? 8 : 0;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {shots.map((s, i) => (
        <Sequence key={i} from={s.start} durationInFrames={s.dur} name={`${TITLE.replace(" ", "")[i]} · ${s.name}`}>
          <AbsoluteFill style={{ opacity: fade ? crossFade(frame - s.start, s.dur, fade) : 1, overflow: "hidden" }}>
            <LetterShot name={s.name} calm={calm} index={i} />
          </AbsoluteFill>
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: C.amber, opacity: glow, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)" }} />
      <div style={{ position: "absolute", left: 150, bottom: 96, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
        <Marks f={f} />
        <TapeStrip text={text} size={64} style={{ transform: "rotate(-0.6deg)" }} />
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 10. title

/** `from` is the frame the title scene starts at. */
export function Title({ calm, from }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const slam = calm ? interpolate(frame, [0, 18], [0, 1], clamp) : spring({ frame, fps, config: { damping: 15, mass: 0.6 } });
  const shake = calm ? 0 : Math.max(0, 1 - frame / 14) * Math.sin(frame * 3.1) * 7;
  const drift = calm ? 0 : interpolate(frame, [0, durationInFrames], [0, 1]);
  const f = frame + from;
  const dinner = TAPES.dinner;
  return (
    <AbsoluteFill style={{ background: "#01060b", overflow: "hidden" }}>
      <Img
        src={staticFile("media/photos/hull-below.jpg")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.75, transform: `scale(${1.12 + drift * 0.05}) translateY(${-drift * 24}px)`, filter: "brightness(1.3)" }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(1,6,11,0.55) 0%, rgba(1,6,11,0.88) 70%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", transform: `translateX(${shake}px)` }}>
        <Reveal at={6} calm={calm}>
          <Eyebrow style={{ fontSize: 32 }}>A new case for Cecil</Eyebrow>
        </Reveal>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 500,
            fontSize: 196,
            lineHeight: 1,
            color: C.ink,
            marginTop: 18,
            opacity: Math.min(1, slam * 1.4),
            transform: `scale(${1.1 - 0.1 * slam})`,
            textShadow: "0 6px 50px rgba(0,0,0,0.85)",
          }}
        >
          Dead Reckoning
        </div>
        <Reveal at={30} calm={calm}>
          <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 50, color: C.muted, marginTop: 24 }}>An AI-hosted murder mystery at sea, for three or four</div>
        </Reveal>
        <div style={{ height: 110, marginTop: 34, display: "flex", alignItems: "center" }}>
          <TapeStrip text={dinner.text.slice(0, typed(dinner, f))} size={38} style={{ transform: "rotate(-0.8deg)" }} />
        </div>
        <Reveal at={COMING_SOON - from} calm={calm}>
          <div style={{ marginTop: 14, fontFamily: F.serif, fontSize: 30, letterSpacing: "0.36em", textTransform: "uppercase", color: C.brass2, border: `1px solid ${C.brass}`, padding: "14px 34px 14px 44px", borderRadius: 999 }}>
            Coming soon
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
