// The telegram trailer: about 63 seconds, black to black, so it loops without a seam.
// `calm` is the reduced-motion cut: no camera moves, flashes or shaking, and the
// montage cross-fades instead of cutting. Both carry the same soundtrack
// (sound/telegram.mjs); the page mutes the hero loop and plays sound only when
// someone opens the trailer.

import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import "../fonts.js";
import { Grain, Scene, Vignette } from "../parts.jsx";
import {
  Ashdown,
  ChartClose,
  Cecil,
  Deep,
  Dinner,
  EndCard,
  Glance,
  Kingsley,
  Phones,
  Quill,
  Sharks,
  Ship,
  Stare,
  Table,
  Thesis,
  Title,
  Transmit,
  Vote,
  Wake,
  WhisperAshdown,
  WhisperKingsley,
  WhisperQuill,
} from "./scenes.jsx";
import { END, SCENES as AT } from "./timing.js";

const X = 8; // cross-fade overlap, in frames

const COMPONENTS = {
  table: Table,
  phones: Phones,
  cecil: Cecil,
  ship: Ship,
  wake: Wake,
  chart: ChartClose,
  deep: Deep,
  dinner: Dinner,
  whisperKingsley: WhisperKingsley,
  glance: Glance,
  kingsley: Kingsley,
  whisperQuill: WhisperQuill,
  stare: Stare,
  quill: Quill,
  whisperAshdown: WhisperAshdown,
  ashdown: Ashdown,
  thesis: Thesis,
  transmit: Transmit,
  title: Title,
  sharks: Sharks,
  vote: Vote,
  endcard: EndCard,
};
// Hard cuts where the soundtrack hits: under the ship, the Morse, the title, and the vote going to black.
const CUT = new Set(["deep", "transmit", "title", "vote"]);
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
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      <AbsoluteFill style={{ opacity: master }}>
        {SCENES.map(({ id, Component, from, dur }) => (
          <Sequence key={id} from={from} durationInFrames={dur} name={id}>
            <Scene fade={calm ? 14 : CUT.has(id) ? 1 : X}>
              <Component calm={calm} from={from} />
            </Scene>
          </Sequence>
        ))}
      </AbsoluteFill>
      <Audio src={staticFile("media/trailer-sound.wav")} />
      <Vignette />
      <Grain calm={calm} />
    </AbsoluteFill>
  );
}
