// The telegram trailer: about 65 seconds, black to black, so it loops without a seam.
// `calm` is the reduced-motion cut: no camera moves, flashes or shaking, and the
// montage cross-fades instead of cutting. Both carry the same soundtrack
// (sound/telegram.mjs); the page mutes the hero loop and plays sound only when
// someone opens the trailer.

import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import "../fonts.js";
import { Scene, Vignette } from "../parts.jsx";
import {
  Ashdown,
  CardFriends,
  CardMurderer,
  CardSecrets,
  ChartClose,
  Cecil,
  Deep,
  Dinner,
  EndCard,
  Guilty,
  Kingsley,
  Phones,
  Point,
  Quill,
  Sharks,
  Ship,
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
  cardFriends: CardFriends,
  phones: Phones,
  cardSecrets: CardSecrets,
  guilty: Guilty,
  cardMurderer: CardMurderer,
  cecil: Cecil,
  ship: Ship,
  wake: Wake,
  chart: ChartClose,
  deep: Deep,
  dinner: Dinner,
  whisperKingsley: WhisperKingsley,
  kingsley: Kingsley,
  whisperQuill: WhisperQuill,
  quill: Quill,
  whisperAshdown: WhisperAshdown,
  ashdown: Ashdown,
  thesis: Thesis,
  transmit: Transmit,
  title: Title,
  sharks: Sharks,
  point: Point,
  vote: Vote,
  endcard: EndCard,
};
/** The grade: a gamma lift that opens up the shadows and mid-tones of the night photographs without
 * clipping the candles and screens (CSS brightness would). Scenes apply it with filter: url(#lift). */
function Grade() {
  const channel = (exponent) => ["R", "G", "B"].map((c) => {
    const Func = `feFunc${c}`;
    return <Func key={c} type="gamma" amplitude="1" exponent={exponent} offset="0" />;
  });
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="lift" colorInterpolationFilters="sRGB">
          <feComponentTransfer>{channel(0.6)}</feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

// Hard cuts where the soundtrack hits: the cards and the phone between them, under the ship, the faces,
// the Morse, the title, and the vote going to black.
const CUT = new Set(["cardFriends", "phones", "cardSecrets", "guilty", "cardMurderer", "cecil", "deep", "kingsley", "quill", "ashdown", "transmit", "title", "vote"]);
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
      <Grade />
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
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
}
