// HTTP + Socket.IO server: rooms, per-device views, the game clock and AI work.
//
// The laptop opens "/" (the shared screen) and creates a room. Phones scan the
// QR code, open "/join?room=CODE" and get a private token that lets them
// reconnect if the page reloads or the phone sleeps.

import crypto from "node:crypto";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import QRCode from "qrcode";
import { Server } from "socket.io";

import { resolveTask } from "./ai/cecil.js";
import { Game, GameError } from "./game.js";
import { DEFAULT_CASE, caseList, scenarioFor } from "./scenario/index.js";
import { scriptedLines } from "./voice.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "..", "public");
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

export function lanAddress() {
  const candidates = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses || []) {
      if (a.family === "IPv4" && !a.internal) candidates.push(a.address);
    }
  }
  const privateRange = (ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return candidates.find(privateRange) || candidates[0] || "localhost";
}

/** The address a browser used to reach us, when that isn't this machine itself: through an HTTPS
 * tunnel, the tunnel's address. Null for localhost, so the LAN address is used instead. */
export function originOf(socket) {
  const headers = socket.handshake.headers;
  const host = String(headers["x-forwarded-host"] || headers.host || "").split(",")[0].trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(host) || /^(localhost|127\.|0\.0\.0\.0)/.test(host)) return null;
  const proto = String(headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  return `${proto === "https" ? "https" : "http"}://${host}`;
}

export function createApp({ ai = null, voice = null, speed = 1, publicUrl = null, port = 3000, defaultCase = DEFAULT_CASE, log = console } = {}) {
  const startingCase = scenarioFor(defaultCase) ? defaultCase : DEFAULT_CASE;
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { serveClient: true });
  const rooms = new Map();

  // Where phones should go. PUBLIC_URL wins; otherwise the address the shared screen itself was opened
  // at (so a game hosted through an HTTPS tunnel hands out the tunnel's address), or the laptop's LAN address.
  const baseUrl = (room) => publicUrl || room?.origin || `http://${lanAddress()}:${server.address()?.port || port}`;
  const joinUrl = (room) => `${baseUrl(room)}/join?room=${room.code}`;
  // A read-only copy of the shared screen, for players who aren't in the room (over a video or voice call).
  const watchUrl = (room) => `${baseUrl(room)}/?watch=${room.code}`;

  // ------------------------------------------------------------------ pages

  app.disable("x-powered-by");
  app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "host.html")));
  app.get(["/join", "/play"], (req, res) => res.sendFile(path.join(PUBLIC_DIR, "play.html")));
  // Each case has its own printable pack; ?case= picks it (the default case otherwise).
  app.get("/pack", (req, res) => {
    const id = scenarioFor(req.query.case)?.id || startingCase;
    res.sendFile(path.join(PUBLIC_DIR, id === "ravensmere" ? "pack.html" : `pack-${id}.html`));
  });
  app.use(express.static(PUBLIC_DIR, { index: false }));

  app.get("/qr/:code.svg", async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    if (!room) return res.status(404).end();
    const svg = await QRCode.toString(joinUrl(room), { type: "svg", margin: 1, color: { dark: "#1b1410", light: "#f4ecd8" } });
    res.type("image/svg+xml").send(svg);
  });

  // Public scenario facts for the printable pack (nothing secret).
  app.get("/api/pack", (req, res) => {
    const scenario = scenarioFor(req.query.case) || scenarioFor(startingCase);
    res.json({
      id: scenario.id,
      title: scenario.title,
      tagline: scenario.tagline,
      setting: scenario.setting,
      characters: scenario.characters.map((c) => ({ name: c.name, short: c.short, bio: c.bio, core: c.core })),
      envelope: { title: scenario.envelope.title, front: scenario.envelope.front, back: scenario.envelope.back },
      rooms: scenario.rooms.map((r) => r.name),
    });
  });

  // Cecil's voice. Only lines the game actually spoke can be voiced, so the
  // API key can't be used to read out arbitrary text.
  app.get("/voice/:code/:lineId.mp3", async (req, res) => {
    const room = rooms.get(String(req.params.code).toUpperCase());
    const line = room && room.game.narration.find((n) => n.id === req.params.lineId);
    if (!voice || !line || line.speaker !== "cecil") return res.status(404).end();
    try {
      const audio = await voice.speak(line.text);
      res.type("audio/mpeg").set("Cache-Control", "private, max-age=3600").send(audio);
    } catch {
      res.status(502).end();
    }
  });

  // ------------------------------------------------------------------ rooms

  function newCode() {
    for (;;) {
      const code = Array.from({ length: 4 }, () => CODE_LETTERS[crypto.randomInt(CODE_LETTERS.length)]).join("");
      if (!rooms.has(code)) return code;
    }
  }

  function newGame(code, caseId) {
    const scenario = scenarioFor(caseId) || scenarioFor(startingCase);
    return new Game({ scenario, code, seed: crypto.randomInt(2 ** 31), speed, aiEnabled: Boolean(ai) });
  }

  function createRoom(caseId) {
    const code = newCode();
    const room = { code, hostToken: crypto.randomBytes(16).toString("hex"), game: newGame(code, caseId), sentVersion: -1, touchedAt: Date.now(), warmed: false };
    rooms.set(code, room);
    return room;
  }

  // A fresh game in the same room, keeping everyone who has joined.
  function restart(room, caseId = room.game.scenario.id) {
    const humans = room.game.humans();
    const physical = room.game.physicalPack;
    room.game = newGame(room.code, caseId);
    for (const seat of humans) room.game.addHuman(seat.name, seat.token);
    room.game.setPhysicalPack(physical);
    room.warmed = false;
    room.sentVersion = -1; // the new game's version numbers start again
    refreshConnections(room);
  }

  function roomFor(code) {
    const room = rooms.get(String(code || "").trim().toUpperCase());
    if (!room) throw new GameError("There's no game with that code. Check the code on the big screen.");
    room.touchedAt = Date.now();
    return room;
  }

  function seatByToken(room, token) {
    return room.game.seats.find((s) => s.kind === "human" && s.token && s.token === token) || null;
  }

  function refreshConnections(room) {
    const connected = new Set();
    for (const socket of io.sockets.adapter.rooms.get(`players:${room.code}`) || []) {
      const s = io.sockets.sockets.get(socket);
      if (s?.data.token) connected.add(s.data.token);
    }
    for (const seat of room.game.humans()) {
      const now = connected.has(seat.token);
      if (seat.connected !== now) {
        seat.connected = now;
        room.game.touch();
      }
    }
  }

  // What the shared screen shows. Watchers get exactly the same view as the host's screen.
  function screenView(room) {
    return { ...room.game.hostView(), joinUrl: joinUrl(room), watchUrl: watchUrl(room), voice: voice ? voice.provider : "browser", cases: caseList() };
  }

  function broadcast(room, force = false) {
    const { game } = room;
    if (!force && room.sentVersion === game.version) return;
    room.sentVersion = game.version;
    io.to(`host:${room.code}`).emit("state", screenView(room));
    for (const id of io.sockets.adapter.rooms.get(`players:${room.code}`) || []) {
      const socket = io.sockets.sockets.get(id);
      const seat = socket && seatByToken(room, socket.data.token);
      if (seat) socket.emit("state", game.playerView(seat.id));
      else if (socket) socket.emit("removed");
    }
  }

  function runTasks(room) {
    for (const task of room.game.drainTasks()) {
      resolveTask(room.game, task, ai, log)
        .catch((error) => log.error("[cecil] task failed", error))
        .finally(() => broadcast(room));
    }
  }

  function afterChange(room) {
    runTasks(room);
    if (voice && !room.warmed && room.game.phase !== "lobby") {
      room.warmed = true;
      voice.warm(scriptedLines(room.game.scenario)).catch(() => {});
    }
    broadcast(room);
  }

  // The game clock: tick every room, resolve AI work, push changes.
  const clock = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (now - room.touchedAt > ROOM_TTL_MS) {
        rooms.delete(room.code);
        continue;
      }
      room.game.tick(now);
      afterChange(room);
    }
  }, 250);
  const resync = setInterval(() => {
    for (const room of rooms.values()) broadcast(room, true);
  }, 5000);

  // ---------------------------------------------------------------- sockets

  // Wrap a handler so errors come back to the caller as { ok: false, error }.
  function handle(socket, event, fn) {
    socket.on(event, async (payload = {}, ack = () => {}) => {
      if (typeof payload === "function") [payload, ack] = [{}, payload];
      if (typeof ack !== "function") ack = () => {};
      try {
        const result = await fn(payload || {});
        ack({ ok: true, ...(result || {}) });
      } catch (error) {
        if (!(error instanceof GameError)) log.error(`[socket] ${event}`, error);
        ack({ ok: false, error: error instanceof GameError ? error.message : "Something went wrong. Please try again." });
      }
    });
  }

  io.on("connection", (socket) => {
    // ------------------------------------------------------------- host
    const hostRoom = () => {
      const room = roomFor(socket.data.hostCode);
      return room;
    };
    const asHost = (event, fn) =>
      handle(socket, event, async (payload) => {
        if (!socket.data.hostCode) throw new GameError("This screen isn't hosting a game.");
        const room = hostRoom();
        const result = await fn(room, payload);
        afterChange(room);
        return result;
      });

    handle(socket, "host:create", async ({ caseId } = {}) => {
      const room = createRoom(caseId);
      room.origin = originOf(socket);
      socket.data.hostCode = room.code;
      socket.join(`host:${room.code}`);
      broadcast(room, true);
      return { code: room.code, hostToken: room.hostToken, joinUrl: joinUrl(room) };
    });

    handle(socket, "host:resume", async ({ code, hostToken }) => {
      const room = roomFor(code);
      if (!hostToken || hostToken !== room.hostToken) throw new GameError("That game belongs to another screen.");
      room.origin = originOf(socket) || room.origin;
      socket.data.hostCode = room.code;
      socket.join(`host:${room.code}`);
      broadcast(room, true);
      return { code: room.code, joinUrl: joinUrl(room) };
    });

    // Watch the shared screen from another computer. Read-only: the host's buttons all check
    // socket.data.hostCode, which a watcher never gets.
    handle(socket, "screen:watch", async ({ code }) => {
      const room = roomFor(code);
      socket.join(`host:${room.code}`);
      socket.emit("state", screenView(room));
      return { code: room.code };
    });

    asHost("host:addGuest", (room) => void room.game.addGuest());
    asHost("host:removeSeat", (room, { seatId }) => void room.game.removeSeat(seatId));
    asHost("host:physical", (room, { value }) => void room.game.setPhysicalPack(value));
    asHost("host:start", (room) => void room.game.start(Date.now()));
    asHost("host:pause", (room) => void room.game.pause());
    asHost("host:resume", (room) => void room.game.resume(Date.now()));
    asHost("host:skip", (room) => {
      room.game.tick(Date.now());
      room.game.advance();
    });
    // Same room and code; everyone who played goes back to the lobby.
    asHost("host:reset", (room) => restart(room));
    // Choose tonight's mystery. Only before the evening begins.
    asHost("host:case", (room, { caseId }) => {
      if (room.game.phase !== "lobby") throw new GameError("Finish this mystery first, then choose another.");
      if (!scenarioFor(caseId)) throw new GameError("There's no such mystery.");
      if (room.game.scenario.id !== scenarioFor(caseId).id) restart(room, caseId);
    });
    // Let an AI guest take over a player who has left mid-game.
    asHost("host:takeover", (room, { seatId }) => {
      const seat = room.game.seat(seatId);
      if (seat.kind !== "human") throw new GameError("That seat is already an AI guest.");
      if (seat.connected) throw new GameError("That player is still connected.");
      seat.kind = "ai";
      seat.name = "AI guest";
      seat.token = null;
      seat.ready = true;
      seat.connected = true;
      room.game.touch();
    });

    // ----------------------------------------------------------- players
    const asPlayer = (event, fn) =>
      handle(socket, event, async (payload) => {
        const room = roomFor(socket.data.code);
        const seat = seatByToken(room, socket.data.token);
        if (!seat) throw new GameError("You're not seated in this game.");
        const result = await fn(room, seat, payload);
        afterChange(room);
        return result;
      });

    const attach = (room, token) => {
      socket.data.code = room.code;
      socket.data.token = token;
      socket.join(`players:${room.code}`);
      refreshConnections(room);
    };

    handle(socket, "player:join", async ({ code, name }) => {
      const room = roomFor(code);
      const token = crypto.randomBytes(16).toString("hex");
      room.game.addHuman(name, token);
      attach(room, token);
      afterChange(room);
      return { code: room.code, token };
    });

    handle(socket, "player:resume", async ({ code, token }) => {
      const room = roomFor(code);
      if (!seatByToken(room, token)) throw new GameError("Your seat has gone. Please join again.");
      attach(room, token);
      broadcast(room, true);
      return { code: room.code };
    });

    handle(socket, "player:leave", async () => {
      const room = roomFor(socket.data.code);
      const seat = seatByToken(room, socket.data.token);
      if (seat && room.game.phase === "lobby") room.game.removeSeat(seat.id);
      socket.leave(`players:${room.code}`);
      socket.data.token = null;
      afterChange(room);
    });

    asPlayer("player:ready", (room, seat) => void room.game.markReady(seat.id));
    asPlayer("player:read", (room, seat, { itemId }) => void room.game.markRead(seat.id, itemId));
    asPlayer("player:search", (room, seat, { roomId }) => ({ clue: room.game.search(seat.id, roomId) }));
    asPlayer("player:askPreset", (room, seat, { index }) => ({ answer: room.game.askPreset(seat.id, Number(index)) }));
    asPlayer("player:askFree", (room, seat, { question }) => void room.game.askFree(seat.id, question));
    asPlayer("player:guestPreset", (room, seat, { guestSeatId, index }) => void room.game.questionGuestPreset(seat.id, guestSeatId, Number(index)));
    asPlayer("player:guestFree", (room, seat, { guestSeatId, question }) => void room.game.questionGuestFree(seat.id, guestSeatId, question));
    asPlayer("player:envelope", (room, seat) => void room.game.openEnvelope(seat.id));
    asPlayer("player:code", (room, seat, { code }) => room.game.enterCode(seat.id, code, Date.now()));
    asPlayer("player:mission", (room, seat, { success }) => void room.game.reportMission(seat.id, Boolean(success)));
    asPlayer("player:vote", (room, seat, { seatId }) => void room.game.vote(seat.id, seatId));

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (room) {
        refreshConnections(room);
        broadcast(room);
      }
    });
  });

  function close() {
    clearInterval(clock);
    clearInterval(resync);
    io.close();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  return { app, server, io, rooms, close };
}
