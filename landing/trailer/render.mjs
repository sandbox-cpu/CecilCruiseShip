// Render the trailers and the stills into ../public/media.
//
//   npm run render            everything, both cuts
//   npm run render:full       the telegram trailer (1080p, and the 720p loop in MP4 and WebM)
//   npm run render:calm       its reduced-motion cut
//   npm run render:stills     the hero still, the poster and the social card
//   npm run render:classic    the classic first cut, its calm cut and its hero still
//
// Remotion downloads its own headless Chrome the first time. To use one you
// already have, set REMOTION_BROWSER=/path/to/chrome-headless-shell.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

import { HERO } from "./src/telegram/timing.js";

const only = process.argv[2] ?? "all";
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = (name) => here(`../public/media/${name}`);

const guess = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = process.env.REMOTION_BROWSER || (existsSync(guess) ? guess : null);

// The soundtracks are generated, not recorded: make them fresh so they always match their timing.js.
const sound = (cut) => execFileSync(process.execPath, [here(`./sound/${cut}.mjs`)], { stdio: "inherit" });
if (["all", "full", "calm", "webm"].includes(only)) sound("telegram");
if (["all", "classic"].includes(only)) sound("classic");

console.log("Bundling…");
const serveUrl = await bundle({ entryPoint: here("./src/index.jsx"), publicDir: here("../public") });
// Which moving shots exist; a scene without one uses its photograph.
const clips = Object.fromEntries(
  Object.entries({
    ship: "ship-push.mp4",
    cecil: "cecil-walk.mp4",
    sea: "sea-buoy.mp4",
    key: "wireless-key.mp4",
    deep: "hull-below.mp4",
    lookup: "table-lookup.mp4",
    smile: "table-smile.mp4",
    squirm: "table-squirm.mp4",
    toast: "table-toast.mp4",
    point: "table-point.mp4",
  }).map(([id, file]) => [id, existsSync(out(`trailer-src/${file}`))]),
);
console.log(`Moving shots: ${Object.entries(clips).map(([id, ok]) => `${id} ${ok ? "yes" : "(still)"}`).join(", ")}`);
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
    crf: 19,
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

// The hero's stills. Each page loop starts on the same frame as its still, so the
// poster hands over to the video without a jump (public/js/main.js has the same numbers).
export const HERO_FRAME = { telegram: HERO, classic: 380 };

// npm run render -- preview 40 200 400: single frames of the trailer, as JPEGs in out/ (COMP=TrailerClassic for the other cut).
if (only === "preview") {
  const composition = await selectComposition({ ...common, id: process.env.COMP || "Trailer" });
  for (const frame of process.argv.slice(3).map(Number)) {
    const output = here(`./out/frame-${frame}.jpg`);
    await renderStill({ ...common, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
    console.log(output);
  }
  process.exit(0);
}

const cuts = [
  ...(["all", "full", "calm", "webm", "stills"].includes(only) ? [{ id: "Trailer", prefix: "trailer", still: "still-hero.jpg", hero: HERO_FRAME.telegram }] : []),
  ...(["all", "classic"].includes(only) ? [{ id: "TrailerClassic", prefix: "trailer-classic", still: "still-classic.jpg", hero: HERO_FRAME.classic }] : []),
];
const wants = (part) => only === "all" || only === "classic" || only === part;

for (const cut of cuts) {
  if (wants("full")) {
    await video(cut.id, `${cut.prefix}-1080.mp4`);
    await video(cut.id, `${cut.prefix}-720.mp4`, { scale: 2 / 3, crf: 21 });
  }
  // For browsers without H.264 (some open-source builds): VP9 in WebM.
  if (wants("full") || only === "webm") await video(cut.id, `${cut.prefix}-720.webm`, { scale: 2 / 3, codec: "vp9", crf: 31 });
  if (wants("calm")) {
    await video(`${cut.id}Calm`, `${cut.prefix}-calm-720.mp4`, { scale: 2 / 3, crf: 21 });
    await video(`${cut.id}Calm`, `${cut.prefix}-calm-720.webm`, { scale: 2 / 3, codec: "vp9", crf: 31 });
  }
  if (wants("stills")) await still(cut.id, cut.still, cut.hero, 2 / 3);
}
if (only === "all" || only === "stills") {
  await still("Poster", "poster.jpg");
  await still("Social", "social-card.jpg");
}
console.log("Done.");
