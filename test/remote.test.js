// Playing with friends who aren't in the room: the join and watch links follow the address
// the shared screen was opened at (an HTTPS tunnel, say), and a watching screen sees the
// shared screen but can't run the evening.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { io as connect } from "socket.io-client";

import { createApp, lanAddress } from "../server/app.js";
import ravensmere from "../server/scenario/ravensmere.js";

const quietLog = { warn() {}, error() {}, log() {} };
let server;
let base;
const sockets = [];

before(async () => {
  // No PUBLIC_URL, so the links come from wherever each shared screen was opened.
  server = createApp({ speed: 50, log: quietLog, defaultCase: "ravensmere" });
  await new Promise((resolve) => server.server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.server.address().port}`;
});

after(async () => {
  for (const s of sockets) s.close();
  await server.close();
});

function client(headers = {}) {
  const socket = connect(base, { transports: ["websocket"], forceNew: true, extraHeaders: headers });
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

const TUNNEL = { "x-forwarded-proto": "https", "x-forwarded-host": "fox-and-hounds.trycloudflare.com" };

test("a game hosted through an HTTPS tunnel hands out the tunnel's address", async () => {
  const host = client(TUNNEL);
  const created = await emit(host, "host:create");
  assert.equal(created.ok, true);
  assert.equal(created.joinUrl, `https://fox-and-hounds.trycloudflare.com/join?room=${created.code}`);
  const view = await until(() => latest(host), "state");
  assert.equal(view.joinUrl, `https://fox-and-hounds.trycloudflare.com/join?room=${created.code}`);
  assert.equal(view.watchUrl, `https://fox-and-hounds.trycloudflare.com/?watch=${created.code}`);
});

test("a screen opened on this computer, or with a strange address, hands out the LAN address", async () => {
  for (const headers of [{}, { "x-forwarded-host": "evil.example/<script>" }]) {
    const host = client(headers);
    const created = await emit(host, "host:create");
    assert.ok(created.joinUrl.startsWith(`http://${lanAddress()}:`), created.joinUrl);
  }
});

test("a watching screen sees the shared screen, and can't run the evening", async () => {
  const host = client(TUNNEL);
  const { code } = await emit(host, "host:create");
  const player = client();
  assert.equal((await emit(player, "player:join", { code, name: "Gabriel" })).ok, true);

  const watcher = client();
  const watched = await emit(watcher, "screen:watch", { code: code.toLowerCase() });
  assert.equal(watched.ok, true);
  await until(() => latest(watcher)?.seats.some((s) => s.name === "Gabriel"), "watcher sees Gabriel");
  assert.equal(latest(watcher).code, code);

  for (const event of ["host:start", "host:skip", "host:pause", "host:addGuest", "host:reset"]) {
    assert.match((await emit(watcher, event)).error, /isn't hosting/, event);
  }
  assert.match((await emit(watcher, "host:case", { caseId: "halcyon" })).error, /isn't hosting/);
  assert.equal(latest(host).phase, "lobby");

  assert.equal((await emit(host, "host:start")).ok, true);
  await until(() => latest(watcher).phase === "prologue", "watcher follows the evening");
  // Exactly what the host's screen shows, and so nothing private.
  const shown = JSON.stringify(latest(watcher));
  assert.ok(!shown.includes(ravensmere.characters.find((c) => c.id === ravensmere.killer).dossier.secret));
  assert.ok(!shown.includes(ravensmere.dictaphone.code));
});

test("watching a code that doesn't exist says so", async () => {
  const watcher = client();
  assert.match((await emit(watcher, "screen:watch", { code: "ZZZZ" })).error, /no game with that code/);
});
