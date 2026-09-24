// The scenes of the trailer. Every line of text is taken from the game's own
// script, public evidence or cast list, and nothing here gives the solution away.

import { AbsoluteFill, Img, getInputProps, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { Caption, Eyebrow, Monogram, Photo, Reveal, Shot, ease, useProgress } from "../parts.jsx";
import { C, F } from "../theme.js";
import { CLOCK, COMING_SOON, LINEUP, SUSPECTS } from "./timing.js";

// The moving shots, animated from the stills with Higgsfield (Kling). A scene
// whose clip is missing falls back to a slow push on its photograph.
export const CLIPS = {
  ship: "media/trailer-src/ship-push.mp4",
  cecil: "media/trailer-src/cecil-walk.mp4",
  sea: "media/trailer-src/sea-buoy.mp4",
};
// render.mjs says which clips exist; the Studio assumes they all do.
const available = getInputProps().clips;
const clip = (id) => (!available || available[id] ? CLIPS[id] : null);

// ------------------------------------------------------------------ 1. opening

export function Opening({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
        <Monogram size={210} at={4} calm={calm} drawFrames={40} />
        <Reveal at={40} calm={calm}>
          <Eyebrow style={{ fontSize: 34 }}>SS Halcyon · Mid-Atlantic · October 1961</Eyebrow>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 2. the ship

export function Ship({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Shot clip={clip("ship")} photo="media/photos/ship.jpg" calm={calm} from={1.02} to={1.12} origin="55% 55%" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 55%, rgba(3,8,13,0.78) 100%)" }} />
      <Caption at={20} calm={calm}>
        Three nights out. <span style={{ color: C.brass2 }}>Four days from the nearest port.</span>
      </Caption>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 3. Cecil, bringing a telegram

export function CecilWalk({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Shot clip={clip("cecil")} photo="media/photos/cecil.jpg" calm={calm} startFrom={10} style={{ filter: "brightness(1.1)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,8,13,0.86) 0%, rgba(3,8,13,0.25) 45%, rgba(3,8,13,0) 62%)" }} />
      <Reveal at={10} calm={calm} style={{ position: "absolute", left: 120, bottom: 150 }}>
        <Eyebrow style={{ fontSize: 30 }}>Cecil</Eyebrow>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 46, color: C.ink, marginTop: 8, textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>
          Chief Purser of the SS Halcyon these twenty-two years
        </div>
      </Reveal>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 4. the hour that happened twice

/** A brass ship's clock, drawn over the photograph. `minutes` counts from midnight. */
function ClockFace({ minutes, size = 250 }) {
  const minuteAngle = (minutes % 60) * 6;
  const hourAngle = ((minutes / 60) % 12) * 30;
  return (
    <svg width={size} height={size} viewBox="-130 -130 260 260">
      <defs>
        <radialGradient id="faceShade" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle r="126" fill="#1b140c" />
      <circle r="118" fill="#3a2d1b" stroke={C.brass} strokeWidth="6" />
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} r="4" cx={Math.sin((i * Math.PI) / 4) * 110} cy={-Math.cos((i * Math.PI) / 4) * 110} fill={C.brass2} />
      ))}
      <circle r="98" fill="#eee6cf" />
      <circle r="98" fill="url(#faceShade)" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="-2.5" y="-92" width="5" height={i % 3 === 0 ? 18 : 10} fill="#17222c" transform={`rotate(${i * 30})`} />
      ))}
      <rect x="-4" y="-54" width="8" height="60" rx="4" fill="#0f1720" transform={`rotate(${hourAngle})`} />
      <rect x="-2.5" y="-84" width="5" height="92" rx="2.5" fill="#0f1720" transform={`rotate(${minuteAngle})`} />
      <circle r="7" fill={C.brass} />
    </svg>
  );
}

/** Where the hands are, in minutes past midnight, at a frame of this scene. `from` is the scene's first frame. */
export function clockMinutes(frame, from) {
  const f = frame + from;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
  if (f < CLOCK.two) return interpolate(f, [CLOCK.start, CLOCK.two], [65, 120], { ...clamp, easing: (t) => t ** 1.6 });
  if (f < CLOCK.rewindFrom) return 120;
  if (f < CLOCK.rewindTo) return interpolate(f, [CLOCK.rewindFrom, CLOCK.rewindTo], [120, 60], { ...clamp, easing: ease });
  return interpolate(f, [CLOCK.rewindTo, CLOCK.twenty], [60, 80], clamp);
}

export function TheHour({ calm, from }) {
  const frame = useCurrentFrame();
  const f = frame + from;
  const minutes = clockMinutes(frame, from);
  const shown = Math.round(minutes);
  const hour = Math.floor(shown / 60) || 12;
  const stamp = `${hour}.${String(shown % 60).padStart(2, "0")}am`;
  const second = f >= CLOCK.rewindTo;
  const rewinding = f >= CLOCK.rewindFrom && f < CLOCK.rewindTo;
  const shake = calm || !rewinding ? 0 : Math.sin(f * 2.6) * 3;
  const flash = calm ? 0 : interpolate(f, [CLOCK.two, CLOCK.two + 4, CLOCK.two + 16], [0, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const whistle = interpolate(f, [CLOCK.twenty, CLOCK.twenty + 3, CLOCK.twenty + 30], [0, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#040a11", overflow: "hidden" }}>
      <Photo src="media/photos/boat-deck.jpg" calm={calm} from={1.04} to={1.16} origin="40% 55%" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0.2) 35%, rgba(3,8,13,0.85) 100%)" }} />
      <AbsoluteFill style={{ background: C.brass2, opacity: flash * 0.5, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "#dfe8ee", opacity: calm ? 0 : whistle * 0.35 }} />

      <Reveal at={2} calm={calm} style={{ position: "absolute", top: 100, left: 110, display: "flex", alignItems: "center", gap: 40, transform: `translateX(${shake}px)` }}>
        <ClockFace minutes={minutes} />
        <div>
          <div style={{ fontFamily: F.serif, fontSize: 24, letterSpacing: "0.3em", textTransform: "uppercase", color: C.brass, marginBottom: 6 }}>
            {second ? "The second time" : "Ship's time"}
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 118, lineHeight: 1, color: second ? C.brass2 : C.ink, textShadow: "0 4px 40px rgba(0,0,0,0.9)", fontVariantNumeric: "lining-nums tabular-nums" }}>
            {stamp}
          </div>
        </div>
      </Reveal>
      <Caption at={8} calm={calm} size={64} style={{ bottom: 150 }}>
        At two o’clock the clocks went back an hour.
      </Caption>
      <Caption at={CLOCK.twenty - from} calm={calm} size={64} style={{ bottom: 70 }}>
        <span style={{ color: C.brass2 }}>At twenty past one, Mortimer Crane went over the side.</span>
      </Caption>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 5. the sea

export function Sea({ calm }) {
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Shot clip={clip("sea")} photo="media/photos/lifebuoy.jpg" calm={calm} from={1.02} to={1.1} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0) 50%, rgba(3,8,13,0.8) 100%)" }} />
      <Caption at={10} calm={calm} size={62} style={{ bottom: 150 }}>
        The Halcyon searched until dawn.
      </Caption>
      <Caption at={52} calm={calm} size={62} style={{ bottom: 70 }}>
        <span style={{ color: C.brass2 }}>The sea did not give him back.</span>
      </Caption>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 6. two kinds of screen

function Laptop({ children, style }) {
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{ width: 980, height: 612, background: C.night, borderRadius: 26, padding: 22, boxShadow: "0 40px 120px rgba(0,0,0,0.8)", border: "2px solid #1c3348" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", background: C.bg, position: "relative" }}>{children}</div>
      </div>
      <div style={{ width: 1140, height: 30, marginLeft: -80, background: "linear-gradient(#1f3346, #0b1622)", borderRadius: "0 0 30px 30px" }} />
    </div>
  );
}

function Phone({ children, style, tilt = 0 }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 330,
        height: 680,
        borderRadius: 52,
        background: C.night,
        border: "2px solid #1f3346",
        padding: 14,
        boxShadow: "0 40px 90px rgba(0,0,0,0.85)",
        transform: `rotate(${tilt}deg)`,
        ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 40, overflow: "hidden", background: C.bg, padding: "46px 26px 26px", fontFamily: F.serif, color: C.ink }}>
        {children}
      </div>
    </div>
  );
}

const small = { fontFamily: F.serif, fontSize: 17, letterSpacing: "0.2em", textTransform: "uppercase", color: C.brass };

function Redacted({ w }) {
  return <div style={{ height: 18, width: w, background: "#1c3a52", borderRadius: 3, margin: "10px 0" }} />;
}

export function Screens({ calm }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (at) =>
    calm ? interpolate(frame, [at, at + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : spring({ frame: frame - at, fps, config: { damping: 16, mass: 0.9 } });
  const laptopIn = enter(4);
  const phones = [enter(64), enter(76), enter(88)];
  const buzz = (at) => (calm || frame < at || frame > at + 12 ? 0 : Math.sin((frame - at) * 3.2) * 5);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 40%, #0f2233 0%, #040a11 70%)` }}>
      <Laptop style={{ left: 120, top: 150, opacity: laptopIn, transform: `translateY(${(1 - laptopIn) * 40}px)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F.serif, fontStyle: "italic", color: C.muted, fontSize: 22 }}>
            <Monogram size={40} at={0} calm />
            Dead Reckoning
          </div>
          <div style={{ fontFamily: F.serif, fontSize: 26, color: C.ink }}>Prologue</div>
          <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 30, color: C.brass2 }}>1:12</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, padding: 22 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Monogram size={56} at={0} calm />
              <div>
                <div style={{ ...small, fontSize: 16 }}>Cecil</div>
                <div style={{ fontStyle: "italic", color: C.muted, fontSize: 18, fontFamily: F.serif }}>Chief Purser, your host</div>
              </div>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 40, lineHeight: 1.15, marginTop: 20, color: C.ink, borderLeft: `3px solid ${C.brass}`, paddingLeft: 18 }}>
              Regrettably, Mr Mortimer Crane is no longer with us.
            </div>
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
            <div style={{ ...small, fontSize: 15, marginBottom: 12 }}>At the table</div>
            {["Sam", "Priya", "Jonah", "AI guest"].map((name, i) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 8, background: C.panel2, border: `1px solid ${i === 1 && frame >= 99 ? C.brass : C.line}`, borderRadius: 10, fontSize: 20, fontFamily: F.serif, boxShadow: i === 1 && frame >= 99 ? `0 0 24px ${C.brass}55` : "none" }}>
                {name}
                <span style={{ fontSize: 18, opacity: i === 1 && frame >= 99 ? 1 : 0, color: C.brass2 }}>✉</span>
              </div>
            ))}
          </div>
        </div>
      </Laptop>

      <Phone tilt={-4} style={{ left: 1090, top: 250, opacity: phones[0], transform: `translateY(${(1 - phones[0]) * 120}px) rotate(-4deg)` }}>
        <div style={small}>Your dossier</div>
        <div style={{ fontFamily: F.display, fontSize: 34, marginTop: 8 }}>The story you're telling</div>
        <Redacted w="92%" />
        <Redacted w="70%" />
        <div style={{ ...small, marginTop: 26 }}>Your secret</div>
        <Redacted w="96%" />
        <Redacted w="84%" />
        <Redacted w="60%" />
        <div style={{ ...small, marginTop: 26 }}>What you know</div>
        <Redacted w="88%" />
        <Redacted w="74%" />
      </Phone>
      <Phone tilt={2} style={{ left: 1330, top: 200, opacity: phones[1], transform: `translateY(${(1 - phones[1]) * 120}px) rotate(${2 + buzz(99)}deg)` }}>
        <div style={small}>A private word</div>
        <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.brass}88`, borderRadius: 16, padding: 20, fontFamily: F.display, fontSize: 30, lineHeight: 1.2 }}>
          Look at Mr Quill and say: <em>“I know where you were when the clocks went back.”</em>
          <div style={{ marginTop: 14, color: C.brass2, fontStyle: "italic" }}>You don’t.</div>
        </div>
      </Phone>
      <Phone tilt={6} style={{ left: 1570, top: 290, opacity: phones[2], transform: `translateY(${(1 - phones[2]) * 120}px) rotate(6deg)` }}>
        <div style={small}>Your dossier</div>
        <div style={{ marginTop: 18, background: "rgba(178,58,54,0.22)", border: `1px solid ${C.blood}`, borderRadius: 16, padding: 20, fontFamily: F.display, fontSize: 30, lineHeight: 1.2, color: "#f6d4cf" }}>
          You killed him. Nobody else knows. Keep it that way.
        </div>
        <Redacted w="90%" />
        <Redacted w="72%" />
      </Phone>

      <Caption at={10} calm={calm} size={62} style={{ bottom: 150 }}>
        One screen tells the story.
      </Caption>
      <Caption at={80} calm={calm} size={62} style={{ bottom: 70 }}>
        <span style={{ color: C.brass2 }}>Every phone tells a different one.</span>
      </Caption>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 7. the passengers

const GUESTS = [
  { photo: "media/photos/kingsley.jpg", name: "Miss Coral Kingsley", role: "‘Britain’s sweetheart of 1949’" },
  { photo: "media/photos/quill.jpg", name: "Mr Laurence Quill", role: "a gentleman, travelling alone" },
  { photo: "media/photos/ashdown.jpg", name: "Miss Penelope Ashdown", role: "the ship’s Social Hostess" },
  { photo: "media/photos/pryce.jpg", name: "Mr Owen Pryce", role: "the ship’s Radio Officer" },
];

/** A face on each drum hit, alternating sides, then all four together. `from` is the scene's first frame. */
export function Suspects({ calm, from }) {
  const frame = useCurrentFrame();
  const starts = SUSPECTS.map((f) => f - from);
  const lineup = LINEUP - from;
  const cut = calm ? 10 : 4;

  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      {GUESTS.map((g, i) => {
        const start = starts[i];
        const end = i < GUESTS.length - 1 ? starts[i + 1] : lineup;
        if (frame < start - cut || frame >= end + cut) return null;
        const opacity = interpolate(frame, [start - cut, start, end, end + cut], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const zoom = calm ? 1.02 : interpolate(frame, [start, end + cut], [1.02, 1.1]);
        const right = i % 2 === 0;
        return (
          <AbsoluteFill key={g.name} style={{ opacity }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, width: 900, [right ? "right" : "left"]: 80, overflow: "hidden" }}>
              <Img src={staticFile(g.photo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", transform: `scale(${zoom})`, transformOrigin: "50% 30%" }} />
              <AbsoluteFill style={{ background: `linear-gradient(${right ? 90 : 270}deg, ${C.night} 0%, rgba(3,8,13,0) 30%, rgba(3,8,13,0) 80%, ${C.night} 100%)` }} />
            </div>
            <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [right ? "left" : "right"]: 150, width: 760, textAlign: right ? "left" : "right" }}>
              <Eyebrow style={{ fontSize: 26 }}>At the table</Eyebrow>
              <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 92, lineHeight: 1.02, color: C.ink, marginTop: 14 }}>{g.name}</div>
              <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 50, color: C.brass2, marginTop: 14 }}>{g.role}</div>
            </div>
          </AbsoluteFill>
        );
      })}

      {frame >= lineup - cut && (
        <AbsoluteFill style={{ opacity: interpolate(frame, [lineup - cut, lineup], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {/* Narrow enough to leave the corner clock clear. */}
          <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 24 }}>
            {GUESTS.map((g) => (
              <div key={g.name} style={{ width: 340, height: 454, overflow: "hidden", borderRadius: 4, boxShadow: `0 0 0 2px ${C.brass}88, 0 30px 60px rgba(0,0,0,0.7)` }}>
                <Img src={staticFile(g.photo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", transform: `scale(${calm ? 1 : interpolate(frame, [lineup, lineup + 60], [1.08, 1], { extrapolateRight: "clamp" })})` }} />
              </div>
            ))}
          </div>
          <Caption at={lineup + 4} calm={calm} size={66} style={{ bottom: 150 }}>
            Everyone has something to hide.
          </Caption>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 8. whispers

const WHISPERS = [
  { at: 8, text: "I have nothing for you. But the others don't know that. Do look worried." },
  { at: 38, text: "Within ninety seconds, get someone else to say the word ‘overboard’." },
  { at: 68, text: "Interesting. Three of you have just received information. One of you hasn't." },
];

export function Whispers({ calm }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#040a11", overflow: "hidden" }}>
      <Img src={staticFile("media/photos/smoking.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.3 }} />
      <div style={{ position: "absolute", left: 250, top: 150, width: 1420, display: "flex", flexDirection: "column", gap: 28 }}>
        {WHISPERS.map((w, i) => {
          const p = calm
            ? interpolate(frame, [w.at, w.at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : spring({ frame: frame - w.at, fps, config: { damping: 15 } });
          const shake = calm || frame < w.at || frame > w.at + 10 ? 0 : Math.sin((frame - w.at) * 3.4) * 6;
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `translateX(${(1 - p) * 80 + shake}px)`,
                marginLeft: i * 90,
                display: "flex",
                gap: 26,
                alignItems: "center",
                background: "rgba(15,34,51,0.94)",
                border: `1px solid ${C.brass}77`,
                borderRadius: 26,
                padding: "26px 34px",
                boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
                maxWidth: 1180,
              }}
            >
              <Monogram size={78} at={0} calm />
              <div>
                <div style={{ ...small, fontSize: 20 }}>Cecil · a private word</div>
                <div style={{ fontFamily: F.display, fontSize: 46, lineHeight: 1.15, color: C.ink, marginTop: 6 }}>{w.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Caption at={84} calm={calm} size={62} style={{ bottom: 80 }}>
        Cecil keeps everyone’s secrets. <span style={{ color: C.brass2 }}>He shares a few.</span>
      </Caption>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 9. title card

/** `from` is the frame the title scene starts at, so "Coming soon" can wait for Cecil's last line. */
export function Title({ calm, from }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const glow = useProgress(0, 50);
  const push = calm ? 0 : interpolate(frame, [0, durationInFrames], [0, 1]);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <Img
        src={staticFile("media/photos/ship.jpg")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 * glow, transform: `scale(${1.08 + push * 0.04})`, transformOrigin: "50% 70%" }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0.2) 0%, rgba(3,8,13,0.75) 60%, rgba(3,8,13,0.95) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Monogram size={150} at={2} calm={calm} drawFrames={30} />
        <Reveal at={16} calm={calm}>
          <Eyebrow style={{ fontSize: 34, marginTop: 30 }}>Cecil</Eyebrow>
        </Reveal>
        <Reveal at={22} calm={calm}>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 168, lineHeight: 1, color: C.ink, marginTop: 14, letterSpacing: "-0.005em" }}>
            Dead Reckoning
          </div>
        </Reveal>
        <Reveal at={34} calm={calm}>
          <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 50, color: C.muted, marginTop: 26 }}>
            An AI-hosted murder mystery at sea, for three or four
          </div>
        </Reveal>
        <Reveal at={COMING_SOON - from} calm={calm}>
          <div style={{ marginTop: 44, fontFamily: F.serif, fontSize: 30, letterSpacing: "0.36em", textTransform: "uppercase", color: C.brass2, border: `1px solid ${C.brass}`, padding: "14px 34px 14px 44px", borderRadius: 999 }}>
            Coming soon
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
