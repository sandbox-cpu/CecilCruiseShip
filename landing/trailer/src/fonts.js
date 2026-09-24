// Load the landing page's own web fonts before any frame is captured.
import { continueRender, delayRender, staticFile } from "remotion";

const FACES = [
  ["Cormorant Garamond", "fonts/cormorant-garamond.woff2", "normal"],
  ["Cormorant Garamond", "fonts/cormorant-garamond-italic.woff2", "italic"],
  ["EB Garamond", "fonts/eb-garamond.woff2", "normal"],
  ["EB Garamond", "fonts/eb-garamond-italic.woff2", "italic"],
];

const handle = delayRender("Loading fonts");
Promise.all(
  FACES.map(([family, file, style]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { style, weight: "400 700" });
    document.fonts.add(face);
    return face.load();
  }),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
  });
