// The static preview build (npm run build:static) in a real browser, served the way
// Netlify serves it: plain files, its security headers, no server behind the form.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import express from "express";

import { SECURITY_HEADERS } from "../../server/pages.js";

const SCRIPT = fileURLToPath(new URL("../../scripts/build-static.js", import.meta.url));
const SHOTS = new URL("../../test-results/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = "/opt/pw-browsers";
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    const bin = join(root, dir, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  chromium = null;
}

describe("the static preview in a browser", { skip: !chromium && "playwright is not installed" }, () => {
  let browser;
  let server;
  let base;
  let dir;
  const posts = [];

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), "cecil-preview-"));
    const out = join(dir, "site");
    execFileSync(process.execPath, [SCRIPT, "--out", out], { env: { ...process.env, SITE_URL: "", URL: "" }, stdio: "pipe" });

    const app = express();
    app.use((req, res, next) => {
      res.set(SECURITY_HEADERS);
      if (req.method !== "GET" && req.method !== "HEAD") posts.push(`${req.method} ${req.path}`);
      next();
    });
    app.use(express.static(out, { extensions: ["html"] }));
    app.use((req, res) => res.status(404).sendFile(join(out, "404.html")));
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: findChromium() });
  });

  after(async () => {
    await browser?.close();
    server?.close();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  test("looks and plays like the real thing, and the form sends nothing", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const problems = [];
    const requests = [];
    page.on("pageerror", (err) => problems.push(err.message));
    page.on("console", (msg) => msg.type() === "error" && problems.push(msg.text()));
    page.on("request", (req) => requests.push(`${req.method()} ${new URL(req.url()).pathname}`));

    await page.goto(base, { waitUntil: "load" });
    await page.evaluate(() => document.documentElement.style.setProperty("scroll-behavior", "auto", "important"));
    assert.equal(await page.textContent("h1"), "Dead Reckoning");
    await page.locator("#trailer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector(".film").paused, null, { timeout: 20_000 });

    // "With sound" opens the fingerprinted trailer, and it really plays audio.
    await page.click(".film-open");
    await page.waitForSelector("#trailer-dialog[open]");
    assert.match(await page.getAttribute(".dialog-video", "src"), /\/media\/trailer-[\w-]+\.(mp4|webm)\?v=[0-9a-f]{10}$/);
    await page.waitForFunction(() => {
      const v = document.querySelector(".dialog-video");
      return !v.paused && !v.muted && v.volume > 0 && v.webkitAudioDecodedByteCount > 0;
    }, null, { timeout: 20_000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector("#trailer-dialog:not([open])", { state: "attached" });

    // The checks still work.
    await page.fill("#wl-email", "sam@gmial.com");
    await page.click("#waitlist-form button[type=submit]");
    await page.waitForSelector("#wl-email-msg.hint button");
    await page.click("#wl-email-msg button");
    assert.equal(await page.inputValue("#wl-email"), "sam@gmail.com");

    // Cecil replies, the page says plainly that it was a preview, and nothing left the browser.
    await page.fill("#wl-name", "Sam");
    await page.click("#waitlist-form button[type=submit]");
    await page.waitForSelector("#waitlist-done:not([hidden])");
    assert.equal(await page.textContent("[data-done-title]"), "Very good, Sam. You’re on the passenger list.");
    assert.ok(await page.isVisible("[data-done-preview]"));
    assert.equal(await page.evaluate(() => document.querySelector("[data-float-cta]").classList.contains("show")), false, "no more nudges to join");
    await page.evaluate(() => scrollTo(0, 2000));
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.querySelector("[data-float-cta]").classList.contains("show")), false, "not even further up the page");
    await page.locator("#invitation").scrollIntoViewIfNeeded();
    assert.deepEqual(requests.filter((r) => !r.startsWith("GET ")), []);
    assert.deepEqual(posts, []);
    await page.waitForTimeout(900);
    await page.locator("#invitation").screenshot({ path: `${SHOTS}preview-signup.png` });

    assert.deepEqual(problems, []);
    await context.close();
  });

  test("without JavaScript, submitting lands on the preview page with nothing in the address", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(base);
    await page.fill("#wl-email", "nojs@example.com");
    await Promise.all([page.waitForURL(/\/preview\.html/), page.press("#wl-email", "Enter")]);
    assert.doesNotMatch(page.url(), /nojs|example\.com/);
    assert.match(await page.textContent("h1"), /Sign-ups open soon/);
    await context.close();
  });
});
