// The scenes of the telegram trailer. Every word on screen is the game's own: Cecil's
// lines and whispers as the game sends them, its public premise and its cast list.
// Nothing here gives the solution away, and no scene points at one character more
// than the others.

import { AbsoluteFill, Img, Sequence, getInputProps, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { Eyebrow, Monogram, Photo, Reveal, Shot, ease } from "../parts.jsx";
import { C, F } from "../theme.js";
import { CAST, HIT, LETTER_SHOTS, MORSE, PHONES, SCREENS, TAPES, THESIS, UNIT, WHISPERS } from "./timing.js";

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

/** Is the operator's key down at global frame `f`? */
const keyDown = (tones, f) => tones.some((t) => f >= t.from && f < t.to);

// ------------------------------------------------------------------ the table, and its shared screen

const TABLE = "media/photos/table-night.jpg";
// The TV at the end of the table, in the photograph's 1920×1080 frame. The game's shared screen goes on it.
const TV = { x: 703, y: 178, w: 536, h: 326 };
const TV_CENTRE = `${((TV.x + TV.w / 2) / 1920) * 100}% ${((TV.y + TV.h / 2) / 1080) * 100}%`;

/** The shared screen as the game draws it: the case, the act and its clock, and Cecil's latest words. `f` is the scene's frame. */
function SharedScreen({ screen, f }) {
  const timer = screen.countdown != null ? `0:${String(Math.max(0, screen.countdown - Math.floor(f / 30))).padStart(2, "0")}` : screen.timer;
  return (
    <div style={{ width: "100%", height: "100%", background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 100%)`, color: C.ink, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, padding: "0 14px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.serif, fontStyle: "italic", fontSize: 14, color: C.muted }}>
          <Monogram size={22} at={0} calm />
          Dead Reckoning
        </div>
        <div style={{ fontFamily: F.serif, fontSize: 15 }}>{screen.phase}</div>
        <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 21, color: C.brass2, fontVariantNumeric: "tabular-nums" }}>{timer}</div>
      </div>
      <div style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Monogram size={34} at={0} calm />
          <div>
            <div style={{ fontFamily: F.sans, fontSize: 11, letterSpacing: "0.2em", color: C.brass }}>CECIL</div>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: C.muted }}>Chief Purser, your host</div>
          </div>
        </div>
        <div style={{ fontFamily: F.display, fontSize: 30, lineHeight: 1.16, marginTop: 14, borderLeft: `3px solid ${C.brass}`, paddingLeft: 14 }}>{screen.line}</div>
      </div>
    </div>
  );
}

/** Friends round a dinner table, the shared screen on the TV at the end. */
function TableShot({ calm, screen, from = 1, to = 1.06, origin = "50% 45%" }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = calm ? from : interpolate(frame, [0, durationInFrames], [from, to], { easing: ease });
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        <Img src={staticFile(TABLE)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {screen && (
          <div style={{ position: "absolute", left: TV.x, top: TV.y, width: TV.w, height: TV.h, boxShadow: "0 0 70px 12px rgba(70, 120, 200, 0.26)" }}>
            <SharedScreen screen={screen} f={frame} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(155deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 38%)" }} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** The table out of focus, for the phones to sit in front of. */
function TableBlur({ brightness = 0.4 }) {
  return (
    <Img
      src={staticFile(TABLE)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.2)", filter: `blur(24px) brightness(${brightness})` }}
    />
  );
}

// ------------------------------------------------------------------ the phones

/** A phone, face up. Its screen is `children`; `glow` lights the room around it. */
function PhoneFrame({ children, width = 470, height = 940, glow = 0, style }) {
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        borderRadius: width * 0.14,
        background: "#05090d",
        border: "2px solid #22384b",
        padding: width * 0.034,
        boxShadow: `0 50px 120px rgba(0,0,0,0.85), 0 0 ${120 * glow}px rgba(231, 203, 134, ${0.3 * glow})`,
        ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.11, overflow: "hidden", background: C.bg, position: "relative" }}>{children}</div>
    </div>
  );
}

const small = { fontFamily: F.sans, fontSize: 15, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brass };

function Redacted({ w }) {
  return <div style={{ height: 14, width: w, background: "#1c3a52", borderRadius: 3, margin: "9px 0" }} />;
}

/** A dossier on a small phone: bars of hidden text, or the line one of them gets. */
function Dossier({ guilty }) {
  return (
    <div style={{ padding: "54px 22px 22px", fontFamily: F.serif, color: C.ink }}>
      <div style={small}>Your dossier</div>
      {guilty ? (
        <div style={{ marginTop: 18, background: "rgba(178,58,54,0.24)", border: `1px solid ${C.blood}`, borderRadius: 14, padding: 16, fontFamily: F.display, fontSize: 27, lineHeight: 1.18, color: "#f6d4cf" }}>
          You killed him. Nobody else knows. Keep it that way.
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <Redacted w="90%" />
          <Redacted w="70%" />
          <Redacted w="84%" />
        </div>
      )}
      <div style={{ ...small, marginTop: 28 }}>Your secret</div>
      <Redacted w="94%" />
      <Redacted w="78%" />
      <Redacted w="60%" />
    </div>
  );
}

/** Cecil's private word, as the phone shows it. */
function WhisperCard({ title, text, size = 34 }) {
  return (
    <AbsoluteFill style={{ background: "rgba(3, 8, 13, 0.86)", alignItems: "center", justifyContent: "center", padding: 22 }}>
      <div style={{ width: "100%", padding: "26px 24px", borderRadius: 22, background: `linear-gradient(180deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.brass}`, boxShadow: "0 0 60px rgba(227, 198, 127, 0.25)" }}>
        <div style={{ ...small, fontSize: 14 }}>Cecil, privately</div>
        {title && <div style={{ fontFamily: F.serif, fontSize: size * 0.72, color: C.ink, marginTop: 8 }}>{title}</div>}
        <div style={{ fontFamily: F.serif, fontSize: size, lineHeight: 1.36, color: C.ink, marginTop: 12 }}>{text}</div>
        <div style={{ marginTop: 22, borderRadius: 12, background: C.brass, color: C.paperInk, textAlign: "center", padding: "12px 0", fontFamily: F.sans, fontWeight: 700, fontSize: 17 }}>Understood</div>
      </div>
    </AbsoluteFill>
  );
}

/** A buzz: a few frames of shaking after `at`. None when calm. */
const buzz = (calm, f, at, amount = 6) => (calm || f < at || f > at + 12 ? 0 : Math.sin((f - at) * 3.3) * amount);

// ------------------------------------------------------------------ 1. one of you

export function Table({ calm }) {
  return <TableShot calm={calm} screen={SCREENS.prologue} from={1.0} to={1.07} origin="50% 40%" />;
}

export function Phones({ calm, from }) {
  const f = useCurrentFrame() + from;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <TableBlur brightness={0.28} />
      {PHONES.map((at, i) => {
        const on = interpolate(f, [at, at + 5], [0, 1], clamp);
        const guilty = i === PHONES.length - 1;
        const shake = buzz(calm, f, at, 5);
        return (
          <PhoneFrame
            key={i}
            width={300}
            height={600}
            glow={on * (guilty ? 1.2 : 0.6)}
            style={{ left: 180 + i * 410, top: 240 + [0, -30, 20, -10][i], transform: `rotate(${[-7, 4, -3, 6][i]}deg) translateX(${shake}px)` }}
          >
            <div style={{ opacity: on, height: "100%" }}>
              <Dossier guilty={guilty} />
            </div>
          </PhoneFrame>
        );
      })}
    </AbsoluteFill>
  );
}

export function Cecil({ calm }) {
  const frame = useCurrentFrame();
  const valves = calm ? 0.5 : 0.5 + 0.2 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37 + 1);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/cecil-wireless.jpg" calm={calm} from={1.06} to={1.18} origin="74% 26%" />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 22% 58%, rgba(255,170,80,${0.18 * valves}) 0%, rgba(255,170,80,0) 55%)`, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,8,13,0.8) 0%, rgba(3,8,13,0.15) 42%, rgba(3,8,13,0) 58%)" }} />
      <Reveal at={14} calm={calm} style={{ position: "absolute", left: 130, bottom: 140 }}>
        <Eyebrow style={{ fontSize: 30 }}>Cecil</Eyebrow>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 46, color: C.ink, marginTop: 8, textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>Chief Purser of the SS Halcyon, and your host</div>
      </Reveal>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 2. nowhere to go

export function Ship({ calm, from }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Shot clip={clip("ship")} photo="media/photos/ship.jpg" calm={calm} from={1.02} to={1.1} origin="55% 55%" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 50%, rgba(3,8,13,0.75) 100%)" }} />
      <TapeLines tapes={[TAPES.crane]} from={from} />
    </AbsoluteFill>
  );
}

export function Wake({ calm, from }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Photo src="media/photos/wake.jpg" calm={calm} from={1.03} to={1.12} origin="50% 28%" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 45%, rgba(3,8,13,0.7) 100%)" }} />
      <TapeLines tapes={[TAPES.crane]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ the chart

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

// The chart's own drawing order, in its frames: the close view below starts after it has all been drawn.
const CHART = { track: [6, 40], run: [30, 56], days: [44, 84], sounding: 112, ring: [122, 142] };

/** Close on tonight's position on the chart; the depth under the keel is circled as he says it. */
export function ChartClose({ calm, from }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = 2.6 * (calm ? 1 : interpolate(frame, [0, durationInFrames], [1, 1.06]));
  const t = [960 - HERE[0] * s, 470 - HERE[1] * s];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #efe6cb 0%, #e3d6b2 60%, #cdbd92 100%)", overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <ChartBody frame={CHART.sounding - 8 + frame} s={s} t={t} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(40,28,10,0.35) 100%)" }} />
      <TapeLines tapes={[TAPES.land]} from={from} />
    </AbsoluteFill>
  );
}

export function Deep({ calm, from }) {
  return (
    <AbsoluteFill style={{ background: "#01060b", overflow: "hidden" }}>
      <Shot clip={clip("deep")} photo="media/photos/hull-below.jpg" calm={calm} from={1.02} to={1.08} style={{ filter: "brightness(1.35) contrast(1.05)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,20,32,0) 40%, rgba(1,6,11,0.8) 100%)" }} />
      <TapeLines tapes={[TAPES.land, TAPES.down]} from={from} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 3. dinner, as usual

export function Dinner({ calm }) {
  return <TableShot calm={calm} screen={SCREENS.act1} from={1.0} to={1.3} origin={TV_CENTRE} />;
}

/** A private word from Cecil arriving on your phone, with the friend it's about just behind it, out of focus. `from` is the scene's first frame. */
function WhisperScene({ whisper, behind, calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const on = interpolate(f, [whisper.at, whisper.at + 6], [0, 1], clamp);
  const rise = calm ? 0 : (1 - interpolate(f, [whisper.at + 2, whisper.at + 12], [0, 1], { ...clamp, easing: ease })) * 30;
  const drift = calm ? 1.08 : interpolate(frame, [0, 80], [1.08, 1.13]);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      {behind ? (
        <Img src={staticFile(behind.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: behind.position, transform: `scale(${drift})`, filter: "blur(7px) brightness(0.62)" }} />
      ) : (
        <TableBlur brightness={0.42} />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,8,13,0) 35%, rgba(3,8,13,0.55) 70%)" }} />
      <PhoneFrame width={540} height={1080} glow={on} style={{ left: 1200, top: 40, transform: `rotate(-3deg) translateX(${buzz(calm, f, whisper.at)}px)` }}>
        <div style={{ opacity: on, transform: `translateY(${rise}px)`, height: "100%" }}>
          <WhisperCard title={whisper.title} text={whisper.text} size={40} />
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
}

export const WhisperKingsley = (props) => <WhisperScene whisper={WHISPERS.kingsley} behind={{ src: "media/photos/table-glance.jpg", position: "10% 40%" }} {...props} />;
export const WhisperQuill = (props) => <WhisperScene whisper={WHISPERS.quill} behind={{ src: "media/photos/table-stare.jpg", position: "30% 45%" }} {...props} />;
export const WhisperAshdown = (props) => <WhisperScene whisper={WHISPERS.ashdown} {...props} />;

export function Glance({ calm }) {
  return <Photo src="media/photos/table-glance.jpg" calm={calm} from={1.04} to={1.14} origin="54% 40%" />;
}

export function Stare({ calm }) {
  return <Photo src="media/photos/table-stare.jpg" calm={calm} from={1.03} to={1.12} origin="50% 44%" />;
}

/** Who a friend is playing tonight. */
function Glimpse({ id, calm }) {
  const c = CAST[id];
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 900, overflow: "hidden" }}>
        <Photo src={`media/photos/${id}.jpg`} calm={calm} from={1.04} to={1.12} origin="50% 30%" style={{ objectPosition: "50% 22%" }} />
        <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(3,8,13,0) 55%, ${C.night} 100%)` }} />
      </div>
      <Reveal at={3} calm={calm} style={{ position: "absolute", left: 960, top: 330, width: 860 }}>
        <div style={{ fontFamily: F.tape, fontWeight: 700, fontSize: 28, letterSpacing: "0.12em", color: C.brass }}>{`${c.player.toUpperCase()} IS PLAYING`}</div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 92, lineHeight: 1.02, marginTop: 16, color: C.ink }}>{c.name}</div>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 44, lineHeight: 1.2, marginTop: 18, color: C.brass2 }}>{c.bio}</div>
      </Reveal>
    </AbsoluteFill>
  );
}

export const Kingsley = (props) => <Glimpse id="kingsley" {...props} />;
export const Quill = (props) => <Glimpse id="quill" {...props} />;
export const Ashdown = (props) => <Glimpse id="ashdown" {...props} />;

// ------------------------------------------------------------------ 4. only one of you

export function Thesis({ calm, from }) {
  const f = useCurrentFrame() + from;
  const hit = calm ? interpolate(f, [THESIS.second, THESIS.second + 14], [0, 1], clamp) : spring({ frame: f - THESIS.second, fps: 30, config: { damping: 14, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <TableBlur brightness={0.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 160px" }}>
        <Reveal at={THESIS.at - from} calm={calm}>
          <Eyebrow style={{ fontSize: 28 }}>Cecil, to the table</Eyebrow>
        </Reveal>
        <Reveal at={THESIS.at - from + 4} calm={calm}>
          <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 64, lineHeight: 1.15, color: C.ink, marginTop: 26 }}>More than one of you has lied to this table about last night.</div>
        </Reveal>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 500,
            fontSize: 100,
            lineHeight: 1.05,
            color: C.brass2,
            marginTop: 30,
            opacity: f >= THESIS.second ? Math.min(1, hit * 1.4) : 0,
            transform: `scale(${1.1 - 0.1 * hit})`,
            textShadow: "0 6px 40px rgba(0,0,0,0.8)",
          }}
        >
          Only one of you is lying about murder.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 5. the transmission

const NAMES = { kingsley: "MISS KINGSLEY · PRIYA", quill: "MR QUILL · JONAH", ashdown: "MISS ASHDOWN · ELLIE" };

/** One picture of the montage. Each lives in its own <Sequence>, so clips start where they should. */
function LetterShot({ name, calm, index }) {
  switch (name) {
    case "key":
      return <Shot clip={clip("key")} photo="media/photos/wireless-key.jpg" calm={calm} startFrom={index === 0 ? 12 : 96} from={1.04} to={1.1} />;
    case "banner":
      return (
        <AbsoluteFill style={{ background: C.night }}>
          <TableBlur brightness={0.25} />
          <PhoneFrame width={420} height={840} glow={1.2} style={{ left: 750, top: 120, transform: "rotate(2deg)" }}>
            <Dossier guilty />
          </PhoneFrame>
        </AbsoluteFill>
      );
    case "whisper":
      return (
        <AbsoluteFill style={{ background: C.night }}>
          <TableBlur brightness={0.3} />
          <PhoneFrame width={420} height={840} glow={1} style={{ left: 760, top: 120, transform: "rotate(-3deg)" }}>
            <WhisperCard text="I have nothing for you. But the others don’t know that. Do look worried." size={30} />
          </PhoneFrame>
        </AbsoluteFill>
      );
    case "glance":
      return <Photo src="media/photos/table-glance.jpg" calm={calm} from={1.16} to={1.22} origin="54% 40%" />;
    case "stare":
      return <Photo src="media/photos/table-stare.jpg" calm={calm} from={1.14} to={1.2} origin="50% 44%" />;
    case "table":
      return <TableShot calm={calm} screen={SCREENS.act2} from={1.2} to={1.26} origin={TV_CENTRE} />;
    case "cecil":
      return <Photo src="media/photos/cecil-wireless.jpg" calm={calm} from={1.9} to={2.02} origin="79% 13%" />;
    case "deep":
      return <Shot clip={clip("deep")} photo="media/photos/hull-below.jpg" calm={calm} startFrom={70} from={1.04} to={1.08} style={{ filter: "brightness(1.35)" }} />;
    case "ship":
      return <Shot clip={clip("ship")} photo="media/photos/ship.jpg" calm={calm} startFrom={60} from={1.04} to={1.1} />;
    default:
      // A character: tight on the eyes, name typed small in the corner.
      return (
        <AbsoluteFill>
          <Photo src={`media/photos/${name}.jpg`} calm={calm} from={1.02} to={1.08} origin="50% 30%" style={{ objectPosition: "50% 27%" }} />
          <div style={{ position: "absolute", left: 130, top: 110, fontFamily: F.tape, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: C.ink, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
            {NAMES[name]}
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

// ------------------------------------------------------------------ 6. the title

export function Title({ calm }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = calm ? interpolate(frame, [0, 18], [0, 1], clamp) : spring({ frame, fps, config: { damping: 15, mass: 0.6 } });
  const shake = calm ? 0 : Math.max(0, 1 - frame / 14) * Math.sin(frame * 3.1) * 7;
  return (
    <AbsoluteFill style={{ background: "#01060b", overflow: "hidden" }}>
      <Img src={staticFile("media/photos/hull-below.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7, transform: "scale(1.12)", filter: "brightness(1.3)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(1,6,11,0.5) 0%, rgba(1,6,11,0.88) 70%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", transform: `translateX(${shake}px)` }}>
        <Reveal at={4} calm={calm}>
          <Eyebrow style={{ fontSize: 32 }}>A new case for Cecil</Eyebrow>
        </Reveal>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 196, lineHeight: 1, color: C.ink, marginTop: 18, opacity: Math.min(1, slam * 1.4), transform: `scale(${1.1 - 0.1 * slam})`, textShadow: "0 6px 50px rgba(0,0,0,0.85)" }}>
          Dead Reckoning
        </div>
        <Reveal at={24} calm={calm}>
          <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 50, color: C.muted, marginTop: 24 }}>An AI-hosted murder mystery at sea, for three or four</div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 7. the vote

/** The clock runs down on the shared screen. */
export function Sharks({ calm }) {
  return <TableShot calm={calm} screen={SCREENS.act2} from={1.45} to={1.85} origin={TV_CENTRE} />;
}

const CANDIDATES = ["Miss Kingsley (Priya)", "Mr Quill (Jonah)", "Miss Ashdown (Ellie)"];

/** Your phone at the accusation: your thumb moving from name to name, faster and faster, then lifting.
 * Nobody is picked, and nobody is under it when the picture cuts. */
export function Vote({ calm }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const beat = calm ? 0 : Math.max(0, Math.sin(frame * 0.42)) ** 8 * 3;
  const lifted = frame >= durationInFrames - 16;
  const hovering = frame < 34 || lifted ? -1 : Math.floor(((frame - 34) / 14) ** 1.3) % CANDIDATES.length;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <TableBlur brightness={0.34} />
      <PhoneFrame width={560} height={1120} glow={0.8} style={{ left: 680, top: 30, transform: `scale(${1 + beat * 0.004})` }}>
        <div style={{ padding: "84px 34px 30px", fontFamily: F.serif, color: C.ink }}>
          <div style={{ ...small, fontSize: 17 }}>The accusation</div>
          <div style={{ fontFamily: F.display, fontSize: 60, lineHeight: 1.06, marginTop: 14 }}>Who killed Mortimer Crane?</div>
          <div style={{ fontFamily: F.serif, fontSize: 23, lineHeight: 1.35, color: C.muted, marginTop: 14 }}>Your vote is private. You can change it until the reveal.</div>
          <div style={{ display: "grid", gap: 16, marginTop: 34 }}>
            {CANDIDATES.map((name, i) => (
              <div
                key={name}
                style={{
                  padding: "24px 22px",
                  borderRadius: 16,
                  background: i === hovering ? "rgba(231,203,134,0.12)" : C.panel,
                  border: `1px solid ${i === hovering ? C.brass2 : C.line}`,
                  boxShadow: i === hovering ? `0 0 26px ${C.brass}55` : "none",
                  fontSize: 33,
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
}

export function EndCard({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <Reveal at={2} calm={calm}>
        <Eyebrow style={{ fontSize: 28 }}>A new case for Cecil</Eyebrow>
      </Reveal>
      <Reveal at={6} calm={calm}>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 132, lineHeight: 1, color: C.ink, marginTop: 16 }}>Dead Reckoning</div>
      </Reveal>
      <Reveal at={16} calm={calm}>
        <div style={{ marginTop: 40, fontFamily: F.serif, fontSize: 30, letterSpacing: "0.36em", textTransform: "uppercase", color: C.brass2, border: `1px solid ${C.brass}`, padding: "14px 34px 14px 44px", borderRadius: 999 }}>
          Coming soon
        </div>
      </Reveal>
    </AbsoluteFill>
  );
}
