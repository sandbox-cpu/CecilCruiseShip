// Render the trailer, its reduced-motion cut and the stills into ../public/media.
//
//   npm run render            everything
//   npm run render:full       just the trailer (1080p and the 720p loop)
//   npm run render:calm       just the reduced-motion cut
//   npm run render:stills     just the poster and social card
//
// Remotion downloads its own headless Chrome the first time. To use one you
// already have, set REMOTION_BROWSER=/path/to/chrome-headless-shell.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const only = process.argv[2] ?? "all";
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = (name) => here(`../public/media/${name}`);

const guess = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = process.env.REMOTION_BROWSER || (existsSync(guess) ? guess : null);

// The soundtrack is generated, not recorded: make it fresh so it always matches src/timing.js.
if (only !== "stills") execFileSync(process.execPath, [here("./make-sound.mjs")], { stdio: "inherit" });

console.log("Bundling…");
const serveUrl = await bundle({ entryPoint: here("./src/index.jsx"), publicDir: here("../public") });
// Which moving shots exist; a scene without one uses its photograph.
const clips = Object.fromEntries(
  Object.entries({ ship: "ship-push.mp4", cecil: "cecil-walk.mp4", sea: "sea-buoy.mp4" }).map(([id, file]) => [id, existsSync(out(`trailer-src/${file}`))]),
);
// Chrome's default software compositing is several times faster here than forcing a GL backend.
const common = { serveUrl, browserExecutable, concurrency: 4, inputProps: { clips } };

async function video(id, file, extra = {}) {
  const composition = await selectComposition({ ...common, id });
  console.log(`Rendering ${id} → ${file}`);
  let last = -1;
  await renderMedia({
    ...common,
    composition,
    codec: "h264",
    crf: 24,
    pixelFormat: "yuv420p",
    // Standard limited-range BT.709, which every phone and browser decodes the same way.
    colorSpace: "bt709",
    ...(extra.codec && extra.codec !== "h264" ? {} : { x264Preset: "medium" }),
    // The soundtrack rides along in every file; the page mutes the hero loop.
    audioBitrate: "160k",
    outputLocation: out(file),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) process.stdout.write(`${(last = pct)}% `);
    },
    ...extra,
  });
  process.stdout.write("\n");
}

async function still(id, file, frame = 0, scale = 1) {
  const composition = await selectComposition({ ...common, id });
  console.log(`Rendering ${id} → ${file}`);
  await renderStill({ ...common, composition, frame, scale, output: out(file), imageFormat: "jpeg", jpegQuality: 86 });
}

// The hero's still: the clock over No. 7 lifeboat, on the second twenty past one. The
// page starts the loop on this same frame, so the poster hands over to the video without a jump.
export const HERO_FRAME = 380;

// npm run render -- preview 40 200 400: single frames of the trailer, as JPEGs in out/.
if (only === "preview") {
  const composition = await selectComposition({ ...common, id: process.env.COMP || "Trailer" });
  for (const frame of process.argv.slice(3).map(Number)) {
    const output = here(`./out/frame-${frame}.jpg`);
    await renderStill({ ...common, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
    console.log(output);
  }
  process.exit(0);
}

if (only === "all" || only === "full") {
  await video("Trailer", "trailer-1080.mp4");
  await video("Trailer", "trailer-720.mp4", { scale: 2 / 3, crf: 26 });
}
// For browsers without H.264 (some open-source builds): VP9 in WebM.
if (only === "all" || only === "full" || only === "webm") {
  await video("Trailer", "trailer-720.webm", { scale: 2 / 3, codec: "vp9", crf: 36 });
}
if (only === "all" || only === "calm") {
  await video("TrailerCalm", "trailer-calm-720.mp4", { scale: 2 / 3, crf: 26 });
}
if (only === "all" || only === "calm" || only === "webm") {
  await video("TrailerCalm", "trailer-calm-720.webm", { scale: 2 / 3, codec: "vp9", crf: 36 });
}
if (only === "all" || only === "stills") {
  await still("Trailer", "still-deck.jpg", HERO_FRAME, 2 / 3);
  await still("Poster", "poster.jpg");
  await still("Social", "social-card.jpg");
}
console.log("Done.");
