import { Composition, Still } from "remotion";

import { TRAILER_FRAMES as CLASSIC_FRAMES, Trailer as ClassicTrailer } from "./classic/Trailer.jsx";
import { Poster } from "./Stills.jsx";
import { TRAILER_FRAMES, Trailer } from "./telegram/Trailer.jsx";
import { FPS } from "./theme.js";

// Two cuts of the trailer: the telegram (the page's default) and the classic first cut, kept as an alternative.
export function Root() {
  return (
    <>
      <Composition id="Trailer" component={Trailer} durationInFrames={TRAILER_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: false }} />
      <Composition id="TrailerCalm" component={Trailer} durationInFrames={TRAILER_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: true }} />
      <Composition id="TrailerClassic" component={ClassicTrailer} durationInFrames={CLASSIC_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: false }} />
      <Composition id="TrailerClassicCalm" component={ClassicTrailer} durationInFrames={CLASSIC_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: true }} />
      <Still id="Poster" component={Poster} width={1920} height={1080} defaultProps={{ social: false }} />
      <Still id="Social" component={Poster} width={1200} height={630} defaultProps={{ social: true }} />
    </>
  );
}
