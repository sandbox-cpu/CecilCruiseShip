// The whole page in a real browser: desktop, phone, reduced motion and no JavaScript,
// including the sign-up flow end to end. Screenshots go to test-results/.
//
// Needs a Chromium: Playwright's own (npx playwright install chromium) or set CHROMIUM_PATH.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { createApp } from "../../server/app.js";
import { WaitlistStore } from "../../server/store.js";

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

describe("the landing page in a browser", { skip: !chromium && "playwright is not installed" }, () => {
  let browser;
  let server;
  let store;
  let base;
  let dir;

  before(async () => {
    try {
      browser = await chromium.launch({ executablePath: findChromium() });
    } catch (err) {
      throw new Error(`No Chromium available (${err.message.split("\n")[0]}). Run "npx playwright install chromium" or set CHROMIUM_PATH.`);
    }
    dir = mkdtempSync(join(tmpdir(), "cecil-browser-"));
    store = new WaitlistStore(join(dir, "waitlist.db"));
    const app = createApp({ store, adminToken: "test-token", log: { info() {}, error() {} } });
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await browser?.close();
    server?.close();
    store?.close();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  async function open(options = {}) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => msg.type() === "error" && problems.push(`console: ${msg.text()}`));
    page.on("requestfailed", (req) => {
      // Media requests are aborted by design when the loop pauses or the dialog closes.
      if (!/\.(mp4|webm)$/.test(new URL(req.url()).pathname)) problems.push(`requestfailed: ${req.url()}`);
    });
    await page.goto(base, { waitUntil: "load" });
    // Playwright scrolls elements into view before clicking; the page's smooth scrolling can keep
    // them moving long enough for a click to time out, so the harness turns it off.
    await page.evaluate(() => document.documentElement.style.setProperty("scroll-behavior", "auto", "important"));
    await page.evaluate(() => document.fonts.ready);
    return { context, page, problems };
  }

  async function screenshotSections(page, prefix) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}${prefix}-hero.png` });
    // Reveal everything so a full-page screenshot shows the finished state.
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}${prefix}-full.png`, fullPage: true });
  }

  test("desktop: first impression, trailer loop and dialog", async () => {
    const { context, page, problems } = await open({ viewport: { width: 1440, height: 900 } });
    assert.equal(await page.textContent("h1"), "Dead Reckoning");
    assert.equal(await page.title(), "Cecil: Dead Reckoning · Coming soon");

    // The silent loop starts when its frame comes on screen, and can be paused.
    await page.locator("#trailer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => /trailer-720\.(mp4|webm)$/.test(document.querySelector(".film").getAttribute("src") ?? ""));
    await page.waitForFunction(() => !document.querySelector(".film").paused, null, { timeout: 20_000 });
    assert.equal(await page.textContent("[data-film-toggle]"), "Pause");
    await page.click("[data-film-toggle]");
    assert.equal(await page.evaluate(() => document.querySelector(".film").paused), true);
    assert.match(await page.textContent("[data-film-state]"), /paused/);
    await page.click("[data-film-toggle]");

    await page.waitForTimeout(1500);
    await screenshotSections(page, "desktop");

    // "With sound" opens the trailer with controls, and the loop waits behind it.
    await page.locator("#trailer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector(".film").paused, null, { timeout: 20_000 });
    await page.click(".film-open");
    await page.waitForSelector("#trailer-dialog[open]");
    assert.match(await page.getAttribute(".dialog-video", "src"), /trailer-(1080\.mp4|720\.webm)$/);
    assert.equal(await page.evaluate(() => document.querySelector(".film").paused), true, "the loop pauses behind the dialog");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}desktop-trailer-dialog.png` });
    await page.keyboard.press("Escape");
    await page.waitForSelector("#trailer-dialog:not([open])", { state: "attached" });
    await page.waitForFunction(() => !document.querySelector(".film").paused, null, { timeout: 20_000 });

    // The hero's button opens it too.
    await page.evaluate(() => scrollTo(0, 0));
    await page.click(".hero-copy [data-trailer]");
    await page.waitForSelector("#trailer-dialog[open]");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#trailer-dialog:not([open])", { state: "attached" });

    // Cecil answers from the script.
    await page.click('.chip[data-q="who"]');
    await page.waitForFunction(() => document.querySelector("[data-answer]").textContent.includes("rather the point of the evening"));
    assert.match(await page.textContent("[data-answer-sr]"), /rather the point of the evening/);

    assert.deepEqual(problems, []);
    await context.close();
  });

  test("desktop: the waitlist validates, suggests, saves and confirms", async () => {
    const { context, page, problems } = await open({ viewport: { width: 1440, height: 900 } });
    await page.click(".hero-copy a[href='#invitation']");
    await page.waitForTimeout(600);

    // Nothing, then something that isn't an address.
    await page.click("#waitlist-form button[type=submit]");
    assert.equal(await page.getAttribute("#wl-email", "aria-invalid"), "true");
    assert.match(await page.textContent("#wl-email-msg"), /email address/);
    await page.fill("#wl-email", "sam@example");
    await page.click("#waitlist-form button[type=submit]");
    assert.match(await page.textContent("#wl-email-msg"), /needs an ending/);
    await page.screenshot({ path: `${SHOTS}desktop-form-error.png` });

    // A likely typo gets a one-click fix.
    await page.fill("#wl-name", "Sam");
    await page.fill("#wl-email", "sam@gmial.com");
    await page.click("#waitlist-form button[type=submit]");
    await page.waitForSelector("#wl-email-msg.hint button");
    assert.match(await page.textContent("#wl-email-msg"), /Did you mean sam@gmail\.com\?/);
    await page.click("#wl-email-msg button");
    assert.equal(await page.inputValue("#wl-email"), "sam@gmail.com");

    await page.click("#waitlist-form button[type=submit]");
    await page.waitForSelector("#waitlist-done:not([hidden])");
    assert.equal(await page.textContent("[data-done-title]"), "Very good, Sam. You’re on the passenger list.");
    assert.equal(await page.evaluate(() => document.activeElement.id), "waitlist-done");
    assert.ok(await page.isHidden("#waitlist-form"));
    await page.waitForTimeout(900);
    await page.locator("#invitation").screenshot({ path: `${SHOTS}desktop-signup-success.png` });

    const row = store.all().find((r) => r.email === "sam@gmail.com");
    assert.ok(row, "the sign-up was saved");
    assert.equal(row.name, "Sam");

    // Signing up again is recognised.
    await page.reload();
    await page.fill("#wl-email", "SAM@gmail.com");
    await page.click("#waitlist-form button[type=submit]");
    await page.waitForSelector("#waitlist-done:not([hidden])");
    assert.equal(await page.textContent("[data-done-title]"), "You’re already on the passenger list");
    assert.equal(store.all().filter((r) => r.email.toLowerCase() === "sam@gmail.com").length, 1);

    // The saved row shows up in the admin export.
    const csv = await (await fetch(`${base}/admin/export.csv`, { headers: { Authorization: `Basic ${Buffer.from("admin:test-token").toString("base64")}` } })).text();
    assert.match(csv, /sam@gmail\.com,Sam/);

    assert.deepEqual(problems, []);
    await context.close();
  });

  test("phone: fits the screen and signs up", async () => {
    const { context, page, problems } = await open({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
    await page.waitForTimeout(1200);
    await screenshotSections(page, "phone");

    // Every tap target in the form is comfortably large.
    for (const sel of ["#wl-name", "#wl-email", "#waitlist-form button[type=submit]"]) {
      const box = await page.locator(sel).boundingBox();
      assert.ok(box.height >= 44, `${sel} is ${box.height}px tall`);
    }

    await page.locator("#invitation").scrollIntoViewIfNeeded();
    await page.fill("#wl-email", "priya@example.co.uk");
    await page.tap("#waitlist-form button[type=submit]");
    await page.waitForSelector("#waitlist-done:not([hidden])");
    assert.equal(await page.textContent("[data-done-title]"), "Very good. You’re on the passenger list.");
    await page.waitForTimeout(900);
    await page.locator("#invitation").screenshot({ path: `${SHOTS}phone-signup-success.png` });
    assert.ok(store.all().some((r) => r.email === "priya@example.co.uk"));

    assert.deepEqual(problems, []);
    await context.close();
  });

  test("reduced motion: a still instead of the loop, and the calm cut on request", async () => {
    const { context, page, problems } = await open({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await page.waitForTimeout(800);
    assert.equal(await page.getAttribute(".film", "src"), null);
    assert.equal(await page.getAttribute(".film", "poster"), "/media/still-deck.jpg");
    assert.match(await page.textContent("[data-film-state]"), /Motion is reduced/);
    assert.ok(await page.isHidden("[data-film-toggle]"));
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("motion")), false);
    // Content is visible without waiting for scroll animations.
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".acts li")).opacity), "1");
    await page.screenshot({ path: `${SHOTS}reduced-motion-hero.png` });

    await page.click(".hero-copy [data-trailer]");
    await page.waitForSelector("#trailer-dialog[open]");
    assert.match(await page.getAttribute(".dialog-video", "src"), /trailer-calm-720\.(mp4|webm)$/);
    assert.match(await page.textContent("[data-dialog-note]"), /reduced-motion cut/);

    // Cecil's answer appears at once rather than being typed out.
    await page.keyboard.press("Escape");
    await page.click('.chip[data-q="case"]');
    assert.equal(await page.textContent("[data-answer]"), "“He was a man who kept things.”");

    assert.deepEqual(problems, []);
    await context.close();
  });

  test("without JavaScript: the page reads and the form still works", async () => {
    const { context, page } = await open({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    assert.ok(await page.isVisible("#waitlist-form"));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".acts li")).opacity), "1");
    await page.fill("#wl-email", "nojs@example.com");
    // Enter in the field submits the form, exactly as a keyboard user would.
    await Promise.all([page.waitForURL(/\/api\/waitlist$/), page.press("#wl-email", "Enter")]);
    assert.match(await page.textContent("h1"), /on the passenger list/);
    assert.ok(store.all().some((r) => r.email === "nojs@example.com"));
    await context.close();
  });
});
