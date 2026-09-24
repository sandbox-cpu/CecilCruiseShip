// Small building blocks shared by every scene.

import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { C, F } from "./theme.js";

export const ease = Easing.bezier(0.33, 0, 0.2, 1);

/** Fade a scene in and out over `fade` frames. Place inside a <Sequence>. */
export function Scene({ children, fade = 14, style }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, fade, durationInFrames - fade, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity, ...style }}>{children}</AbsoluteFill>;
}

/** 0 → 1 between two frames, eased. */
export function useProgress(from, to, easing = ease) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Text that rises gently into place (or simply fades, when calm). */
export function Reveal({ at = 0, dur = 18, calm, rise = 18, children, style }) {
  const p = useProgress(at, at + (calm ? dur * 1.6 : dur));
  return (
    <div style={{ opacity: p, transform: calm ? "none" : `translateY(${(1 - p) * rise}px)`, ...style }}>{children}</div>
  );
}

/** Film grain: a pre-made noise tile, jumped to a new offset every frame. Static when calm. */
export function Grain({ calm, opacity = 0.08 }) {
  const frame = useCurrentFrame();
  const step = calm ? 0 : frame % 12;
  const x = (step * 173) % 512;
  const y = (step * 311) % 512;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("media/grain.png")})`,
        backgroundSize: "512px 512px",
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: "overlay",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

export function Vignette({ strength = 0.85 }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(2,6,10,${strength}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
}

/** Cecil's monogram: a brass ring that draws itself, then the italic C. */
export function Monogram({ size = 180, at = 0, calm, drawFrames = 40 }) {
  const ring = useProgress(at, at + (calm ? drawFrames * 1.4 : drawFrames));
  const letter = useProgress(at + drawFrames * 0.55, at + drawFrames * 1.2);
  const r = 46;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="mono-fill" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={C.brass2} stopOpacity="0.2" />
          <stop offset="1" stopColor={C.brass2} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="url(#mono-fill)" opacity={letter} />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={C.brass}
        strokeWidth="2.2"
        strokeDasharray={circ}
        strokeDashoffset={calm ? 0 : circ * (1 - ring)}
        opacity={calm ? ring : 1}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="67"
        textAnchor="middle"
        fontFamily={F.display}
        fontStyle="italic"
        fontWeight="500"
        fontSize="54"
        fill={C.brass2}
        opacity={letter}
      >
        C
      </text>
    </svg>
  );
}

export function Eyebrow({ children, style }) {
  return (
    <div
      style={{
        fontFamily: F.serif,
        fontSize: 30,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: C.brass,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A caption line at the foot of the frame, in Cormorant italic. */
export function Caption({ children, at = 0, calm, size = 76, style }) {
  return (
    <Reveal at={at} calm={calm} style={{ position: "absolute", left: 0, right: 0, bottom: 118, textAlign: "center", ...style }}>
      <div
        style={{
          display: "inline-block",
          maxWidth: 1500,
          fontFamily: F.display,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: size,
          lineHeight: 1.12,
          color: C.ink,
          textShadow: "0 2px 30px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)",
        }}
      >
        {children}
      </div>
    </Reveal>
  );
}

/** Drifting mist bands. Still when calm. */
export function Mist({ calm, top = "62%", opacity = 1 }) {
  const frame = useCurrentFrame();
  const drift = calm ? 0 : frame;
  const band = (i, speed, y, w, o) => (
    <div
      key={i}
      style={{
        position: "absolute",
        top: `calc(${top} + ${y}px)`,
        left: `${-40 + ((drift * speed) % 60)}%`,
        width: `${w}%`,
        height: 180,
        background: `radial-gradient(ellipse at center, rgba(200,216,226,${o}) 0%, rgba(200,216,226,0) 70%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {band(1, 0.05, 0, 110, 0.1)}
      {band(2, 0.08, 70, 90, 0.08)}
      {band(3, 0.035, -60, 120, 0.06)}
    </AbsoluteFill>
  );
}
