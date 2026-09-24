// A small, faint clock that fades in and out over the screens and whispers,
// showing the night run on while the Halcyon searches. Its second hand ticks on
// the beat, in time with the ticking on the soundtrack. When calm, it doesn't tick.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { C, F } from "../theme.js";
import { BEAT, CLOCK_SHOWINGS, DOWNBEAT, HIT } from "./timing.js";

const SIZE = 150;

function Face({ hour, minute, second }) {
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  return (
    <svg width={SIZE} height={SIZE} viewBox="-100 -100 200 200">
      <circle r="96" fill="rgba(3,8,13,0.45)" stroke={C.brass} strokeWidth="3" />
      <circle r="88" fill="none" stroke={C.brass} strokeOpacity="0.35" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="-2" y="-84" width="4" height={i % 3 === 0 ? 16 : 9} fill={C.brass2} transform={`rotate(${i * 30})`} />
      ))}
      <rect x="-4" y="-50" width="8" height="56" rx="4" fill={C.ink} transform={`rotate(${hourAngle})`} />
      <rect x="-2.5" y="-76" width="5" height="84" rx="2.5" fill={C.ink} transform={`rotate(${minuteAngle})`} />
      <rect x="-1" y="-80" width="2" height="96" fill={C.blood2} transform={`rotate(${second})`} />
      <circle r="6" fill={C.brass} />
    </svg>
  );
}

export function ClockOverlay({ calm }) {
  const frame = useCurrentFrame();
  const showing = CLOCK_SHOWINGS.find((s) => frame >= s.from && frame < s.to + 12);
  if (!showing) return null;

  const fade = calm ? 18 : 10;
  const last = showing === CLOCK_SHOWINGS.at(-1);
  // The last showing slips away quickly as the title lands.
  const out = last ? [HIT, HIT + 9] : [showing.to - fade, showing.to];
  const opacity = interpolate(frame, [showing.from, showing.from + fade, out[0], out[1]], [0, 0.62, 0.62, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;

  const ticks = Math.floor((frame - DOWNBEAT) / BEAT);
  const second = calm ? 0 : (ticks * 6) % 360;
  const label = `${showing.hour}.${String(showing.minute).padStart(2, "0")}am`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 46, right: 60, opacity, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Face hour={showing.hour} minute={showing.minute} second={second} />
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 34, color: C.brass2, letterSpacing: "0.04em", fontVariantNumeric: "lining-nums tabular-nums", textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
}
