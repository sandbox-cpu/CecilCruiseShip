import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/build-static.js", import.meta.url));

describe("the static preview build", () => {
  let dir;
  let out;
  let html;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "cecil-build-"));
    out = join(dir, "site");
    execFileSync(process.execPath, [SCRIPT, "--out", out], { env: { ...process.env, SITE_URL: "https://cecil.example/", URL: "" }, stdio: "pipe" });
    html = readFileSync(join(out, "index.html"), "utf8");
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test("has everything the page loads, and nothing it doesn't", () => {
    for (const file of ["styles.css", "favicon.svg", "js/main.js", "js/email.js", "fonts/eb-garamond.woff2", "media/trailer-720.mp4", "media/trailer-720.webm", "media/trailer-1080.mp4", "media/trailer-calm-720.mp4", "media/still-hero.jpg", "media/trailer-classic-720.mp4", "media/trailer-classic-720.webm", "media/trailer-classic-1080.mp4", "media/trailer-classic-calm-720.mp4", "media/still-classic.jpg", "media/poster.jpg", "media/social-card.jpg", "media/photos/ship.jpg", "media/photos/cecil-portrait.jpg", "media/photos/kingsley.jpg"]) {
      assert.ok(existsSync(join(out, file)), file);
    }
    assert.equal(existsSync(join(out, "media/grain.png")), false);
    assert.equal(existsSync(join(out, "media/trailer-sound.wav")), false);
    assert.equal(existsSync(join(out, "media/trailer-classic-sound.wav")), false);
    assert.equal(existsSync(join(out, "fonts/courier-prime-bold.woff2")), false, "only the trailer uses the tape typeface");
    assert.equal(existsSync(join(out, "media/trailer-src")), false, "the trailer's source clips stay behind");
    assert.equal(existsSync(join(out, "js/admin.js")), false);
    // Every local file the page refers to exists.
    for (const [, path] of html.matchAll(/(?:src|href|poster)="(\/[^"#?]+)/g)) {
      assert.ok(existsSync(join(out, path)), path);
    }
    for (const [, path] of readFileSync(join(out, "styles.css"), "utf8").matchAll(/url\("(\/[^"#?]+)/g)) {
      assert.ok(existsSync(join(out, path)), path);
    }
  });

  test("fingerprints every media address, so a changed video is never replaced by a saved copy", () => {
    const stamp = (file) => createHash("sha1").update(readFileSync(join(out, "media", file))).digest("hex").slice(0, 10);
    const js = readFileSync(join(out, "js/main.js"), "utf8");
    const css = readFileSync(join(out, "styles.css"), "utf8");
    for (const text of [html, js, css]) {
      const refs = [...text.matchAll(/\/media\/([\w./-]+)(\?v=([0-9a-f]+))?/g)];
      assert.ok(refs.length > 0);
      for (const [ref, file, , v] of refs) assert.equal(v, stamp(file), ref);
    }
    assert.match(js, /\/media\/trailer-1080\.mp4\?v=[0-9a-f]{10}/);
    assert.match(js, /\/media\/trailer-classic-1080\.mp4\?v=[0-9a-f]{10}/);
    assert.match(html, /poster="\/media\/still-hero\.jpg\?v=[0-9a-f]{10}"/);
    assert.match(html, /src="\/media\/photos\/ship\.jpg\?v=[0-9a-f]{10}"/);
    assert.match(css, /url\("\/media\/photos\/ballroom\.jpg\?v=[0-9a-f]{10}"\)/);
  });

  test("uses the site's address for link previews", () => {
    assert.match(html, /<meta property="og:image" content="https:\/\/cecil\.example\/media\/social-card\.jpg\?v=[0-9a-f]{10}">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/cecil\.example\/">/);
    assert.doesNotMatch(html, /__SITE_URL__/);
  });

  test("the form is in preview mode and can't send anything", () => {
    assert.match(html, /<form class="invite-form" id="waitlist-form" action="\/preview\.html" method="get" novalidate data-mode="preview">/);
    const form = html.slice(html.indexOf('<form class="invite-form"'), html.indexOf("</form>"));
    assert.doesNotMatch(form, /\sname="/, "no field would be submitted");
    assert.match(html, /Preview: sign-ups open at launch/);
    assert.match(html, /data-done-preview/);
  });

  test("stays out of search engines and keeps the security headers", () => {
    assert.match(html, /<meta name="robots" content="noindex">/);
    const headers = readFileSync(join(out, "_headers"), "utf8");
    assert.match(headers, /^\/\*\n {2}Content-Security-Policy: default-src 'self'/);
    assert.match(headers, /X-Robots-Tag: noindex/);
    assert.match(headers, /\/media\/\*\n {2}Cache-Control: public, max-age=604800/);
    assert.match(readFileSync(join(out, "404.html"), "utf8"), /no such cabin/);
    assert.match(readFileSync(join(out, "preview.html"), "utf8"), /Sign-ups open soon/);
  });
});
