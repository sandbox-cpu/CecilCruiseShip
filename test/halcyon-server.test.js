// Choosing a case and playing Dead Reckoning over real sockets.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { io as connect } from "socket.io-client";

import { createApp } from "../server/app.js";
import halcyon from "../server/scenario/halcyon.js";
import ravensmere from "../server/scenario/ravensmere.js";

const quietLog = { warn() {}, error() {}, log() {} };
let server;
let base;
const sockets = [];

before(async () => {
  server = createApp({ speed: 50, log: quietLog, publicUrl: "http://cecil.test:3000" });
  await new Promise((resolve) => server.server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.server.address().port}`;
});

after(async () => {
  for (const s of sockets) s.close();
  await server.close();
});

function client() {
  const socket = connect(base, { transports: ["websocket"], forceNew: true });
  socket.states = [];
  socket.on("state", (s) => socket.states.push(s));
  sockets.push(socket);
  return socket;
}

const emit = (socket, event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve));
const latest = (socket) => socket.states.at(-1);

async function until(check, label = "condition", ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const value = check();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function table(names, caseId) {
  const host = client();
  const created = await emit(host, "host:create", caseId ? { caseId } : {});
  assert.equal(created.ok, true);
  const players = [];
  for (const name of names) {
    const socket = client();
    const joined = await emit(socket, "player:join", { code: created.code, name });
    assert.equal(joined.ok, true, joined.error);
    players.push(socket);
  }
  await until(() => latest(host)?.seats.length === names.length, "seats");
  return { host, players, code: created.code };
}

test("the lobby offers both cases, and a new table starts on Dead Reckoning", async () => {
  const { host } = await table(["Sam"]);
  const view = latest(host);
  assert.equal(view.case.id, "halcyon");
  assert.equal(view.title, halcyon.title);
  assert.deepEqual(view.cases.map((c) => c.id).sort(), ["halcyon", "ravensmere"]);
  for (const c of view.cases) assert.ok(c.title && c.tagline && c.setting && c.minutes > 10);
  // The case list carries nothing that belongs to the solution.
  const json = JSON.stringify(view.cases);
  for (const s of [halcyon, ravensmere]) {
    assert.ok(!json.includes(s.characters.find((c) => c.id === s.killer).dossier.secret));
    assert.ok(!json.includes(s.dictaphone.code));
  }
});

test("the host can switch case in the lobby, keeping everyone seated, but not mid-game", async () => {
  const { host, players } = await table(["Sam", "Priya"], "halcyon");
  assert.equal((await emit(host, "host:case", { caseId: "ravensmere" })).ok, true);
  await until(() => latest(host).case.id === "ravensmere" && latest(host).seats.length === 2, "switched");
  await until(() => latest(players[0])?.case?.id === "ravensmere", "phones switched");
  assert.equal(latest(host).title, ravensmere.title);
  assert.match((await emit(host, "host:case", { caseId: "atlantis" })).error, /no such mystery/);
  assert.equal((await emit(host, "host:case", { caseId: "halcyon" })).ok, true);
  await until(() => latest(host).case.id === "halcyon", "switched back");
  await emit(host, "host:start");
  await until(() => latest(host).phase === "prologue", "prologue");
  assert.match((await emit(host, "host:case", { caseId: "ravensmere" })).error, /Finish this mystery first/);
});

test("?case= picks the case for a new table", async () => {
  const { host } = await table(["Ana"], "ravensmere");
  assert.equal(latest(host).case.id, "ravensmere");
});

test("each case has its own printable pack, and the pack data has no secrets", async () => {
  for (const [id, s] of [["halcyon", halcyon], ["ravensmere", ravensmere]]) {
    const page = await fetch(`${base}/pack?case=${id}`);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes(`/api/pack?case=${id}`));
    const data = await (await fetch(`${base}/api/pack?case=${id}`)).json();
    assert.equal(data.title, s.title);
    assert.equal(data.characters.length, 4);
    const json = JSON.stringify(data);
    for (const c of s.characters) assert.ok(!json.includes(c.dossier.secret), `${id}: ${c.id}`);
    assert.ok(!json.includes(s.truth[0]));
  }
});

test("scenario files are never served to browsers", async () => {
  for (const path of ["/server/scenario/halcyon.js", "/scenario/halcyon.js", "/halcyon.js", "/../server/scenario/halcyon.js"]) {
    const response = await fetch(base + path);
    const body = await response.text();
    assert.ok(!body.includes(halcyon.truth[1]), path);
  }
});

test("Dead Reckoning over sockets: private phones, crew-only places, and the reveal", async () => {
  const { host, players } = await table(["Sam", "Priya", "Jonah"], "halcyon");
  await emit(host, "host:start");
  await until(() => players.every((p) => latest(p)?.character), "dossiers");
  const hostJson = JSON.stringify(latest(host));
  for (const p of players) {
    const mine = latest(p).character;
    assert.ok(!hostJson.includes(JSON.stringify(mine.dossier.secret).slice(1, -1)));
    for (const other of players.filter((o) => o !== p)) {
      assert.ok(!JSON.stringify(latest(other)).includes(JSON.stringify(mine.dossier.secret).slice(1, -1)));
    }
  }
  for (const p of players) await emit(p, "player:ready");
  await until(() => latest(host).phase === "act1", "act one");

  // Passengers can't get into the crew alleyway yet; crew can.
  for (const p of players) {
    const alley = latest(p).actions.search.rooms.find((r) => r.id === "alleyway");
    const result = await emit(p, "player:search", { roomId: "alleyway" });
    assert.equal(result.ok, alley.open, result.error);
    if (!alley.open) assert.match(result.error, /crew only/);
  }

  await emit(host, "host:skip");
  await until(() => latest(host).phase === "act2", "act two");
  await until(() => latest(host).envelope.requested, "telegram requested", 10000);
  await emit(host, "host:skip");
  await until(() => latest(host).phase === "accusation", "accusation");
  for (const p of players) {
    const target = latest(p).actions.vote.candidates[0].seatId;
    assert.equal((await emit(p, "player:vote", { seatId: target })).ok, true);
  }
  await until(() => latest(host).phase === "reveal", "reveal", 10000);
  const reveal = latest(host).reveal;
  assert.ok(reveal.killerSeatId && reveal.decoySeatId && reveal.twist);
  assert.equal(reveal.lies.length, 3);
});
