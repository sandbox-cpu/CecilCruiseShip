// A whole evening in real browsers: the shared screen plus two phones, from
// the lobby to the reveal. Skipped if Playwright can't launch Chromium.
// Set CECIL_CHROMIUM_PATH to use a particular Chromium build.
// Screenshots land in test-results/ for a visual check.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { createApp } from "../../server/app.js";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  chromium = null;
}

const SHOTS = new URL("../../test-results/", import.meta.url).pathname;
const quietLog = { warn() {}, error() {}, log() {} };
let app;
let browser;
let base;
let skipReason = null;

before(async () => {
  if (!chromium) {
    skipReason = "Playwright is not installed";
    return;
  }
  try {
    browser = await chromium.launch({ executablePath: process.env.CECIL_CHROMIUM_PATH || undefined });
  } catch (error) {
    skipReason = `Chromium is not available: ${error.message.split("\n")[0]}`;
    return;
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  app = createApp({ speed: 12, log: quietLog });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${app.server.address().port}`;
});

after(async () => {
  await browser?.close();
  await app?.close();
});

function watch(page, label, errors) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${label}: ${m.text()}`));
}

// Dismiss any whispers from Cecil that are covering the phone.
async function clearWhispers(phone) {
  for (let i = 0; i < 20 && (await phone.isVisible("#overlay")); i += 1) {
    await phone.click("#overlay-ok");
    await phone.waitForTimeout(120);
  }
}

async function tap(phone, selector) {
  await clearWhispers(phone);
  await phone.click(selector);
}

test("a full evening: lobby, acts, envelope, dictaphone, accusation and reveal", async (t) => {
  if (skipReason) return t.skip(skipReason);
  const errors = [];
  const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  watch(host, "host", errors);
  host.on("dialog", (d) => d.accept());
  await host.goto(base);
  await host.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector("#room-code").textContent));
  const code = await host.textContent("#room-code");
  const room = () => app.rooms.get(code);

  const phones = [];
  for (const name of ["Sam", "Priya"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await context.newPage();
    watch(phone, name, errors);
    await phone.goto(`${base}/join?room=${code}`);
    await phone.waitForSelector("#join:not([hidden])");
    assert.equal(await phone.inputValue("#join-code"), code, "code prefilled from the QR link");
    await phone.fill("#join-name", name);
    await phone.click("button[type=submit]");
    await phone.waitForSelector("#waiting:not([hidden])");
    phones.push(phone);
  }
  await host.waitForSelector("#seats li:nth-child(2)");
  assert.match(await host.textContent("#seat-hint"), /seat 1 AI guest/);
  await host.screenshot({ path: `${SHOTS}01-lobby.png` });

  // Begin: everyone gets a dossier, and an AI guest fills the third chair.
  await host.click("#start");
  for (const phone of phones) {
    await phone.waitForSelector("#game:not([hidden])");
    await phone.waitForSelector("#overlay:not([hidden])");
  }
  await phones[0].screenshot({ path: `${SHOTS}02-phone-first-whisper.png` });
  assert.equal(await host.locator(".suspect").count(), 3);
  assert.equal(await host.locator(".suspect .pill.ai").count(), 1);
  for (const phone of phones) await tap(phone, "#ready-btn");

  // Act One: search, ask Cecil, question the AI guest.
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Act One"));
  await tap(phones[0], "[data-tab=act]");
  await tap(phones[0], "[data-act=search][data-room=office]");
  await phones[0].waitForSelector("#clues .clue");
  assert.match(await phones[0].textContent("#clues"), /You count thirty-one/);
  await tap(phones[1], "[data-tab=act]");
  await tap(phones[1], "[data-act=ask] >> nth=0");
  await phones[1].waitForFunction(() => document.querySelector("#ask-history").textContent.includes("Yes."));
  await tap(phones[1], "[data-act=guest-ask] >> nth=0");
  await host.waitForFunction(() => document.querySelector("#feed").textContent.includes("asks"));
  await host.waitForSelector(".exhibit:not(.empty)");
  await phones[1].screenshot({ path: `${SHOTS}03-phone-act.png`, fullPage: true });
  await host.screenshot({ path: `${SHOTS}04-host-act-one.png` });

  // Act Two: the envelope and the dictaphone.
  await host.click("[data-action=skip]");
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Act Two"));
  await host.waitForFunction(() => true);
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (room().game.envelope.requested) resolve(clearInterval(check));
    }, 50);
  });
  const openerId = room().game.envelope.openerSeatId;
  const opener = phones.find((_, i) => room().game.humans()[i].id === openerId);
  const other = phones.find((p) => p !== opener);
  await tap(opener, "[data-tab=act]");
  await tap(opener, "[data-act=envelope]");
  await host.waitForSelector(".exhibit.photo");
  await opener.waitForFunction(() => document.body.textContent.includes("Service No. 314"));
  assert.ok(!(await host.textContent("body")).includes("Service No. 314"), "the back stays private");

  await tap(other, "[data-tab=act]");
  await other.fill("#drawer-input", "111");
  await other.click("#drawer-form button");
  await other.waitForFunction(() => document.querySelector("#drawer-error").textContent.includes("does not budge"));
  await other.waitForTimeout(3100 / 1); // the dial's cool-down
  await clearWhispers(other);
  await other.fill("#drawer-input", "314");
  await other.click("#drawer-form button");
  await other.waitForFunction(() => document.querySelector("#clues").textContent.includes("Miss Fenn has been signing my name"));
  await other.screenshot({ path: `${SHOTS}05-phone-recording.png`, fullPage: true });
  await host.screenshot({ path: `${SHOTS}06-host-act-two.png` });

  // The accusation: both humans accuse the real murderer (or, if one of them is, someone else).
  await host.click("[data-action=skip]");
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Accusation"));
  const killerId = room().game.killerSeat().id;
  for (const [i, phone] of phones.entries()) {
    const me = room().game.humans()[i];
    await clearWhispers(phone);
    await phone.waitForSelector("#tab-accuse:not([hidden])");
    const target = me.id === killerId ? room().game.seats.find((s) => s.id !== killerId && s !== me).id : killerId;
    await tap(phone, `[data-act=vote][data-seat="${target}"]`);
    await phone.waitForSelector(`[data-act=vote][data-seat="${target}"].chosen`);
  }
  await phones[0].screenshot({ path: `${SHOTS}07-phone-accuse.png` });

  // The reveal, on every screen.
  await host.waitForSelector("#reveal:not([hidden])", { timeout: 15000 });
  await host.waitForSelector("#scores li");
  assert.match(await host.textContent("#lies"), /Miss Fenn/);
  for (const phone of phones) {
    await phone.waitForSelector("#tab-reveal:not([hidden])");
    assert.match(await phone.textContent("#reveal"), /points/);
  }
  await host.screenshot({ path: `${SHOTS}08-host-reveal.png`, fullPage: true });
  await phones[0].screenshot({ path: `${SHOTS}09-phone-reveal.png`, fullPage: true });

  // Play again brings everyone back to the lobby.
  await host.click("[data-action=reset]");
  await host.waitForSelector("#lobby:not([hidden])");
  for (const phone of phones) await phone.waitForSelector("#waiting:not([hidden])");

  assert.deepEqual(errors, []);
});
