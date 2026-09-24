import { after, before, test } from "node:test";
import assert from "node:assert/strict";

import { io as connect } from "socket.io-client";

import { createApp } from "../server/app.js";
import scenario from "../server/scenario/ravensmere.js";

const quietLog = { warn() {}, error() {}, log() {} };
let server;
let base;
const sockets = [];

// A fake ElevenLabs voice that records what it was asked to say.
const spoken = [];
const voice = {
  provider: "elevenlabs",
  voiceId: "test",
  async speak(text) {
    spoken.push(text);
    return Buffer.from("ID3-fake-mp3");
  },
  async warm() {},
};

before(async () => {
  server = createApp({ speed: 50, voice, log: quietLog, publicUrl: "http://cecil.test:3000" });
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

function emit(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function latest(socket) {
  return socket.states.at(-1);
}

async function until(check, label = "condition", ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const value = check();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function hostWithPlayers(names) {
  const host = client();
  const created = await emit(host, "host:create");
  assert.equal(created.ok, true);
  const players = [];
  for (const name of names) {
    const socket = client();
    const joined = await emit(socket, "player:join", { code: created.code.toLowerCase(), name });
    assert.equal(joined.ok, true, joined.error);
    socket.token = joined.token;
    players.push(socket);
  }
  await until(() => latest(host)?.seats.length === names.length, "seats on host");
  return { host, players, code: created.code, hostToken: created.hostToken };
}

test("pages, QR code and the public pack data are served", async () => {
  for (const [path, type] of [["/", "text/html"], ["/join?room=ABCD", "text/html"], ["/pack", "text/html"], ["/socket.io/socket.io.js", "javascript"]]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get("content-type").includes(type), path);
  }
  const pack = await (await fetch(`${base}/api/pack`)).json();
  assert.equal(pack.title, scenario.title);
  assert.equal(pack.characters.length, 4);
  assert.ok(!JSON.stringify(pack).includes(scenario.characters[0].dossier.secret), "no secrets in the pack data");

  const { code } = await hostWithPlayers(["Qr"]);
  const qr = await fetch(`${base}/qr/${code}.svg`);
  assert.equal(qr.status, 200);
  assert.ok((await qr.text()).includes("<svg"));
  assert.equal((await fetch(`${base}/qr/ZZZZ.svg`)).status, 404);
});

test("the host sees the join link; joining needs a real code and a name", async () => {
  const { host, code } = await hostWithPlayers(["Sam"]);
  assert.equal(latest(host).joinUrl, `http://cecil.test:3000/join?room=${code}`);
  const stranger = client();
  assert.match((await emit(stranger, "player:join", { code: "QQQQ", name: "X" })).error, /no game with that code/);
  assert.match((await emit(stranger, "player:join", { code, name: " " })).error, /enter your name/);
});

test("a full game over sockets: private views, reconnect, and the reveal", async () => {
  const { host, players } = await hostWithPlayers(["Sam", "Priya"]);
  assert.equal((await emit(host, "host:start")).ok, true);
  await until(() => latest(host)?.phase === "prologue", "prologue");
  await until(() => players.every((p) => latest(p)?.character), "dossiers");

  // Each phone has its own character; the shared screen has none of their secrets.
  const hostJson = JSON.stringify(latest(host));
  for (const p of players) {
    const mine = latest(p).character;
    assert.ok(mine.dossier.secret);
    assert.ok(!hostJson.includes(JSON.stringify(mine.dossier.secret).slice(1, -1)));
    for (const other of players.filter((o) => o !== p)) {
      assert.ok(!JSON.stringify(latest(other)).includes(JSON.stringify(mine.dossier.secret).slice(1, -1)));
    }
  }

  // A phone that reloads gets its seat back with its token.
  const reloaded = client();
  assert.equal((await emit(reloaded, "player:resume", { code: latest(host).code, token: players[0].token })).ok, true);
  await until(() => latest(reloaded)?.you.id === latest(players[0]).you.id, "resumed view");
  assert.match((await emit(client(), "player:resume", { code: latest(host).code, token: "nope" })).error, /seat has gone/);

  // Play: ready up, search, then vote.
  for (const p of players) assert.equal((await emit(p, "player:ready")).ok, true);
  await until(() => latest(host).phase === "act1", "act one");
  const search = await emit(players[0], "player:search", { roomId: "office" });
  assert.equal(search.ok, true);
  assert.equal(search.clue.id, "c_office");
  assert.match((await emit(players[0], "player:search", { roomId: "hall" })).error, /already searched/);

  await emit(host, "host:skip");
  await until(() => latest(host).phase === "act2", "act two");
  await emit(host, "host:skip");
  await until(() => latest(host).phase === "accusation", "accusation");
  const view = latest(players[0]);
  for (const p of players) {
    const target = latest(p).actions.vote.candidates[0].seatId;
    assert.equal((await emit(p, "player:vote", { seatId: target })).ok, true);
  }
  await until(() => latest(host).phase === "reveal", "reveal", 10000);
  const reveal = latest(host).reveal;
  assert.ok(reveal.killerSeatId);
  assert.equal(reveal.lies.length, 3);
  assert.ok(view.actions.vote.candidates.length === 2);
  await until(() => latest(players[1]).reveal, "reveal on phones");

  // Play again: same code, same people, back in the lobby.
  assert.equal((await emit(host, "host:reset")).ok, true);
  await until(() => latest(host).phase === "lobby" && latest(host).seats.length === 2, "reset lobby");
  await until(() => latest(players[0]).phase === "lobby", "phones back in the lobby");
});

test("host controls need the host's screen", async () => {
  const { code, hostToken, players } = await hostWithPlayers(["Solo"]);
  assert.match((await emit(players[0], "host:start")).error, /isn't hosting/);
  const impostor = client();
  assert.match((await emit(impostor, "host:resume", { code, hostToken: "wrong" })).error, /another screen/);
  const rightful = client();
  assert.equal((await emit(rightful, "host:resume", { code, hostToken })).ok, true);
  assert.equal((await emit(rightful, "host:addGuest")).ok, true);
  await until(() => latest(rightful)?.seats.length === 2, "guest seated");
});

test("an AI guest can take over a player who has left", async () => {
  const { host, players } = await hostWithPlayers(["Stays", "Leaves"]);
  await emit(host, "host:start");
  await until(() => latest(host).phase === "prologue", "prologue");
  const leaverId = latest(players[1]).you.id;
  assert.match((await emit(host, "host:takeover", { seatId: leaverId })).error, /still connected/);
  players[1].close();
  await until(() => latest(host).seats.find((s) => s.id === leaverId && !s.connected), "shown as away");
  assert.equal((await emit(host, "host:takeover", { seatId: leaverId })).ok, true);
  await until(() => latest(host).seats.find((s) => s.id === leaverId)?.kind === "ai", "now an AI guest");
});

test("the voice proxy only speaks lines Cecil actually said", async () => {
  const { host, code } = await hostWithPlayers(["Voice"]);
  await emit(host, "host:start");
  const line = await until(() => latest(host).narration.find((n) => n.speaker === "cecil"), "a Cecil line");
  const audio = await fetch(`${base}/voice/${code}/${line.id}.mp3`);
  assert.equal(audio.status, 200);
  assert.equal(audio.headers.get("content-type"), "audio/mpeg");
  assert.ok(spoken.includes(line.text));
  assert.equal((await fetch(`${base}/voice/${code}/n99999.mp3`)).status, 404);
  assert.equal((await fetch(`${base}/voice/ZZZZ/${line.id}.mp3`)).status, 404);
});
