// Dead Reckoning in real browsers: the shared screen plus two phones, from
// choosing the case in the lobby to the reveal. Skipped if Playwright can't
// launch Chromium (set CECIL_CHROMIUM_PATH to use a particular build).
// Screenshots land in test-results/ as halcyon-*.png.
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
  // Start on the other case, so the test has to choose Dead Reckoning in the lobby.
  app = createApp({ speed: 12, log: quietLog, defaultCase: "ravensmere" });
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

test("Dead Reckoning, a full evening: choose the case, acts, telegram, the locked case, accusation and reveal", async (t) => {
  if (skipReason) return t.skip(skipReason);
  const errors = [];
  const host = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  watch(host, "host", errors);
  host.on("dialog", (d) => d.accept());
  await host.goto(base);
  await host.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector("#room-code").textContent));
  const code = await host.textContent("#room-code");
  const room = () => app.rooms.get(code);

  // Choose tonight's mystery.
  await host.click('[data-action=case][data-case="halcyon"]');
  await host.waitForFunction(() => document.querySelector("#lobby-title").textContent === "Dead Reckoning");
  assert.equal(await host.getAttribute("body", "data-theme"), "halcyon");
  assert.match(await host.getAttribute("#pack-link", "href"), /case=halcyon/);

  const phones = [];
  for (const name of ["Sam", "Priya"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await context.newPage();
    watch(phone, name, errors);
    await phone.goto(`${base}/join?room=${code}`);
    await phone.waitForSelector("#join:not([hidden])");
    await phone.fill("#join-name", name);
    await phone.click("button[type=submit]");
    await phone.waitForSelector("#waiting:not([hidden])");
    phones.push(phone);
  }
  await host.waitForSelector("#seats li:nth-child(2)");
  await host.screenshot({ path: `${SHOTS}halcyon-01-lobby.png` });

  await host.click("#start");
  for (const phone of phones) {
    await phone.waitForSelector("#game:not([hidden])");
    await phone.waitForSelector("#overlay:not([hidden])");
    assert.equal(await phone.getAttribute("body", "data-theme"), "halcyon");
  }
  await clearWhispers(phones[0]);
  await phones[0].screenshot({ path: `${SHOTS}halcyon-02-phone-dossier.png`, fullPage: true });
  for (const phone of phones) await tap(phone, "#ready-btn");

  // Act One.
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Boat Deck"));
  const humans = room().game.humans();
  const isCrew = (i) => room().game.scenario.characters.find((c) => c.id === humans[i].characterId).crew;
  for (const [i, phone] of phones.entries()) {
    await tap(phone, "[data-tab=act]");
    assert.equal(await phone.textContent("#search-title"), "Search a place aboard");
    const disabled = await phone.isDisabled("[data-act=search][data-room=alleyway]");
    assert.equal(disabled, !isCrew(i), "the crew alleyway is closed to passengers in Act One");
  }
  await tap(phones[0], "[data-act=search][data-room=cabin]");
  await phones[0].waitForSelector("#clues .clue");
  assert.match(await phones[0].textContent("#clues"), /travelling clock/);
  await tap(phones[1], "[data-tab=act]");
  await tap(phones[1], "[data-act=ask] >> nth=0");
  await phones[1].waitForFunction(() => document.querySelector("#ask-history").textContent.includes("Yes."));
  await tap(phones[1], "[data-act=guest-ask] >> nth=0");
  await host.waitForFunction(() => document.querySelector("#feed").textContent.includes("asks"));
  await host.waitForSelector(".exhibit:not(.empty)");
  await phones[1].screenshot({ path: `${SHOTS}halcyon-03-phone-act.png`, fullPage: true });
  await host.screenshot({ path: `${SHOTS}halcyon-04-host-act-one.png` });

  // Act Two: the telegram, then the locked case, opened with a code worked out from it.
  await host.click("[data-action=skip]");
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Act Two"));
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (room().game.envelope.requested) resolve(clearInterval(check));
    }, 50);
  });
  const openerId = room().game.envelope.openerSeatId;
  const opener = phones.find((_, i) => humans[i].id === openerId);
  const other = phones.find((p) => p !== opener);
  await tap(opener, "[data-tab=act]");
  await tap(opener, "[data-act=envelope]");
  await host.waitForSelector(".exhibit.photo");
  const front = await host.textContent(".exhibit.photo");
  const back = await opener.textContent("#envelope");
  assert.match(back, /BACK TO FRONT/);
  assert.ok(!(await host.textContent("body")).includes("BACK TO FRONT"), "the back stays private");
  const combination = [...front.match(/Cabin A(\d{3})/)[1]].reverse().join("");

  await tap(other, "[data-tab=act]");
  assert.equal(await other.textContent("#drawer-title"), "Mr Crane's attaché case");
  await other.fill("#drawer-input", "111");
  await other.click("#drawer-form button");
  await other.waitForFunction(() => document.querySelector("#drawer-error").textContent.includes("stays shut"));
  await other.waitForTimeout(3100);
  await clearWhispers(other);
  await other.fill("#drawer-input", combination);
  await other.click("#drawer-form button");
  await other.waitForFunction(() => document.querySelector("#clues").textContent.includes("Twelve thirty-four"));
  await other.screenshot({ path: `${SHOTS}halcyon-05-phone-recording.png`, fullPage: true });
  await host.screenshot({ path: `${SHOTS}halcyon-06-host-act-two.png` });

  // The accusation: accuse the murderer (or, if you are them, someone else).
  await host.click("[data-action=skip]");
  await host.waitForFunction(() => document.querySelector("#phase-name").textContent.includes("Accusation"));
  const killerId = room().game.killerSeat().id;
  for (const [i, phone] of phones.entries()) {
    const me = humans[i];
    await clearWhispers(phone);
    await phone.waitForSelector("#tab-accuse:not([hidden])");
    assert.equal(await phone.textContent("#accuse-title"), "Who killed Mortimer Crane?");
    const target = me.id === killerId ? room().game.seats.find((s) => s.id !== killerId && s !== me).id : killerId;
    await tap(phone, `[data-act=vote][data-seat="${target}"]`);
    await phone.waitForSelector(`[data-act=vote][data-seat="${target}"].chosen`);
  }

  // The reveal, on every screen.
  await host.waitForSelector("#reveal:not([hidden])", { timeout: 15000 });
  await host.waitForSelector("#scores li");
  await host.waitForSelector("#lies li.decoy .tag");
  const decoyId = room().game.decoySeat().id;
  for (const [i, phone] of phones.entries()) {
    await phone.waitForSelector("#tab-reveal:not([hidden])");
    assert.match(await phone.textContent("#reveal"), /points/);
    if (humans[i].id === decoyId) await phone.waitForSelector(".reveal-card.twist");
  }
  await host.screenshot({ path: `${SHOTS}halcyon-07-host-reveal.png`, fullPage: true });
  await phones[0].screenshot({ path: `${SHOTS}halcyon-08-phone-reveal.png`, fullPage: true });

  // Play again keeps the case.
  await host.click("[data-action=reset]");
  await host.waitForSelector("#lobby:not([hidden])");
  assert.equal(await host.textContent("#lobby-title"), "Dead Reckoning");

  assert.deepEqual(errors, []);
});
