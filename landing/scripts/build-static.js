// npm run build:static: a static copy of the site in dist/, ready to drag onto Netlify
// (or any static host). No server needed.
//
// The waitlist needs the Node server to save sign-ups, so this is a preview build:
// the form still checks addresses and shows Cecil's reply, but nothing is sent or
// saved, and a line says sign-ups open at launch. It's also kept out of search engines.
//
//   npm run build:static
//   SITE_URL=https://cecil.netlify.app npm run build:static   (absolute links for social previews)
//   npm run build:static -- --out some/folder
//
// On Netlify with Git, netlify.toml runs this for you and Netlify supplies the site's URL.

import { createHash } from "node:crypto";
import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { SECURITY_HEADERS, esc, noticePage } from "../server/pages.js";

const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));
// Files the page never loads: the trailer's grain texture, raw soundtrack and source clips, and the admin page's script.
const SKIP = new Set(["media/grain.png", "media/trailer-sound.wav", "media/trailer-src", "js/admin.js"]);

const { values } = parseArgs({ options: { out: { type: "string" } } });
const out = resolve(values.out ?? "dist");
const siteUrl = (process.env.SITE_URL || process.env.URL || "").trim().replace(/\/+$/, "");

rmSync(out, { recursive: true, force: true });
cpSync(PUBLIC, out, { recursive: true, filter: (src) => !SKIP.has(relative(PUBLIC, src).split("\\").join("/")) });

// ------------------------------------------------------------ the page, in preview mode

let html = readFileSync(resolve(PUBLIC, "index.html"), "utf8");
const edit = (from, to) => {
  if (!html.includes(from)) throw new Error(`build-static: couldn't find this in index.html, so the preview edits would be incomplete:\n${from}`);
  html = html.replace(from, to);
};

html = html.replaceAll("__SITE_URL__", esc(siteUrl));
edit('<meta name="theme-color" content="#07121c">', '<meta name="theme-color" content="#07121c">\n  <meta name="robots" content="noindex">');

// The form keeps its checks and Cecil's reply (main.js sees data-mode="preview") but never posts.
// Without names on the fields, even a browser with JavaScript off sends nothing.
edit(
  '<form class="invite-form" id="waitlist-form" action="/api/waitlist" method="post" novalidate>',
  '<form class="invite-form" id="waitlist-form" action="/preview.html" method="get" novalidate data-mode="preview">',
);
for (const name of ["name", "email", "website", "source"]) edit(` name="${name}"`, "");
edit(
  '<button class="btn dark big" type="submit"><span data-submit-label>Request my boarding pass</span></button>',
  '<button class="btn dark big" type="submit"><span data-submit-label>Request my boarding pass</span></button>\n              <p class="preview-note">Preview: sign-ups open at launch, so nothing you enter here is sent or saved.</p>',
);
edit('<p class="done-sign">Cecil</p>', '<p class="done-sign">Cecil</p>\n              <p class="preview-note" data-done-preview>Preview only: nothing was saved. Sign-ups open at launch.</p>');

// ------------------------------------------------------------ fingerprinted media
// Every /media/ address gets ?v=<fingerprint of the file>, so when a video or image changes, browsers
// fetch the new one instead of replaying a saved copy. Unchanged files keep their address and cache.

const media = resolve(out, "media");
const stamps = new Map(
  readdirSync(media, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = resolve(entry.parentPath, entry.name);
      return [relative(media, file).split("\\").join("/"), createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 10)];
    }),
);
const fingerprint = (text) => text.replace(/\/media\/([\w./-]+)/g, (m, f) => (stamps.has(f) ? `${m}?v=${stamps.get(f)}` : m));

writeFileSync(resolve(out, "index.html"), fingerprint(html));
for (const file of ["js/main.js", "styles.css"]) {
  const path = resolve(out, file);
  writeFileSync(path, fingerprint(readFileSync(path, "utf8")));
}

// ------------------------------------------------------------ small pages

writeFileSync(
  resolve(out, "preview.html"),
  noticePage({ heading: "Sign-ups open soon", message: "This is a preview of the site, so nothing was sent or saved. Cecil will be taking names at launch." }),
);
writeFileSync(resolve(out, "404.html"), noticePage({ status: "missing", message: "There is no such cabin aboard the Halcyon." }));

// ------------------------------------------------------------ Netlify headers

const lines = ["/*", ...Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`), "  X-Robots-Tag: noindex"];
for (const dir of ["/media/*", "/fonts/*"]) lines.push(dir, "  Cache-Control: public, max-age=604800");
writeFileSync(resolve(out, "_headers"), `${lines.join("\n")}\n`);

console.log(`Static preview built in ${out}${siteUrl ? ` (links point at ${siteUrl})` : ""}`);
