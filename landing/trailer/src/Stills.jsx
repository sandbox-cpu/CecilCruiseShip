// Still images: the video poster (also the reduced-motion hero) and the social share card.

import { AbsoluteFill, Img, staticFile } from "remotion";

import "./fonts.js";
import { Eyebrow, Grain, Monogram, Vignette } from "./parts.jsx";
import { C, F } from "./theme.js";

const SHIP = staticFile("media/photos/ship.jpg");

export function Poster({ social = false }) {
  const s = social ? 0.62 : 1;
  return (
    <AbsoluteFill style={{ background: "#03080d", overflow: "hidden" }}>
      <Img src={SHIP} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,8,13,0.55) 0%, rgba(3,8,13,0.1) 38%, rgba(3,8,13,0.2) 62%, rgba(3,8,13,0.92) 100%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: social ? 60 : 110, textAlign: "center" }}>
        <Monogram size={120 * s} at={-100} calm />
        <Eyebrow style={{ fontSize: 30 * s, marginTop: 22 * s }}>Cecil · Coming soon</Eyebrow>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 132 * s, lineHeight: 1, color: C.ink, marginTop: 16 * s, textShadow: "0 4px 40px rgba(0,0,0,0.8)" }}>
          Dead Reckoning
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: social ? 44 : 90, textAlign: "center" }}>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontSize: 56 * s, color: C.ink, textShadow: "0 2px 30px rgba(0,0,0,0.9)" }}>
          At two o’clock the clocks went back an hour. <span style={{ color: C.brass2, display: "block" }}>At twenty past one, Mortimer Crane went over the side.</span>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.7} />
      <Grain calm opacity={0.07} />
    </AbsoluteFill>
  );
}
