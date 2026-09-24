import { Composition, Still } from "remotion";

import { Poster } from "./Stills.jsx";
import { FPS } from "./theme.js";
import { TRAILER_FRAMES, Trailer } from "./Trailer.jsx";

export function Root() {
  return (
    <>
      <Composition id="Trailer" component={Trailer} durationInFrames={TRAILER_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: false }} />
      <Composition id="TrailerCalm" component={Trailer} durationInFrames={TRAILER_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ calm: true }} />
      <Still id="Poster" component={Poster} width={1920} height={1080} defaultProps={{ social: false }} />
      <Still id="Social" component={Poster} width={1200} height={630} defaultProps={{ social: true }} />
    </>
  );
}
