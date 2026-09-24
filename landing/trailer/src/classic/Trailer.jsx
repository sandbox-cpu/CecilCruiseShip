// The classic trailer (the first cut): about 45 seconds, black to black, so it loops without a seam.
// `calm` is the reduced-motion cut: no camera moves, drift, flicker or shaking,
// just slow cross-fades. Both carry the same soundtrack (sound/classic.mjs); the page
// mutes the hero loop and plays sound only when someone opens the trailer.

import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { ClockOverlay } from "./ClockOverlay.jsx";
import "../fonts.js";
import { Grain, Scene, Vignette } from "../parts.jsx";
import { CecilWalk, Opening, Screens, Sea, Ship, Suspects, TheHour, Title, Whispers } from "./scenes.jsx";
import { END, SCENES as AT } from "./timing.js";

const X = 14; // cross-fade overlap, in frames

const COMPONENTS = { opening: Opening, ship: Ship, cecil: CecilWalk, clock: TheHour, sea: Sea, screens: Screens, suspects: Suspects, whispers: Whispers, title: Title };
export const SCENES = Object.entries(AT).map(([id, [from, to]]) => ({ id, Component: COMPONENTS[id], from, dur: to - from }));

export const TRAILER_FRAMES = END;

export function Trailer({ calm = false }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Fade up from black and back down, so the loop point is invisible.
  const master = interpolate(frame, [0, 10, durationInFrames - 16, durationInFrames - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fade = calm ? 24 : X;
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      <AbsoluteFill style={{ opacity: master }}>
        {SCENES.map(({ id, Component, from, dur }) => (
          <Sequence key={id} from={from} durationInFrames={dur} name={id}>
            <Scene fade={id === "opening" ? 1 : fade}>
              <Component calm={calm} from={from} />
            </Scene>
          </Sequence>
        ))}
        <ClockOverlay calm={calm} />
      </AbsoluteFill>
      <Audio src={staticFile("media/trailer-classic-sound.wav")} />
      <Vignette />
      <Grain calm={calm} />
    </AbsoluteFill>
  );
}
