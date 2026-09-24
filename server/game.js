// The game engine: a deterministic state machine for one room.
//
// It never talks to the network or the AI. Time comes in through tick(now) and
// action arguments; randomness comes from a seeded RNG. Work that needs the AI
// (free-text questions, mischief choices, closing remarks) is queued in
// `tasks` for the server to resolve. Every task also has a scripted fallback,
// so the game runs identically without an API key.
//
// Information firewall: hostView() is safe for the shared screen and
// playerView(seat) contains only what that seat may see. Nothing secret is
// sent anywhere else.

import { createRng } from "./rng.js";

export const PHASES = ["lobby", "prologue", "act1", "act2", "accusation", "reveal"];
const ACTS = ["act1", "act2"];
const MAX_FEED = 40;
const MAX_NARRATION = 60;

export class GameError extends Error {}

export class Game {
  constructor({ scenario, code, seed = Date.now(), speed = 1, aiEnabled = false, now = Date.now() }) {
    this.scenario = scenario;
    this.code = code;
    this.rng = createRng(seed);
    this.speed = speed;
    this.aiEnabled = aiEnabled;
    this.phase = "lobby";
    this.paused = false;
    this.version = 0;
    this.seats = [];
    this.nextId = 1;
    this.feed = [];
    this.narration = [];
    this.evidence = [];
    this.tasks = [];
    this.pending = new Map(); // task id -> task, awaiting the server
    this.mischiefLog = [];
    this.usedMischief = { bluff: 0, missions: new Set(), clues: new Set(), teases: 0, types: [] };
    this.envelope = { requested: false, openerSeatId: null, opened: false, requestedAtMs: null };
    this.dictaphone = { openedBy: null, heardBy: new Set(), toldOpener: new Set() };
    this.searchedRooms = new Set();
    this.physicalPack = false;
    this.phaseElapsedMs = 0;
    this.lastTickAt = now;
    this.events = [];
    this.fired = new Set();
    this.closing = null;
    this.result = null;
  }

  // ---------------------------------------------------------------- helpers

  touch() {
    this.version += 1;
  }

  id(prefix) {
    return `${prefix}${this.nextId++}`;
  }

  ms(seconds) {
    return (seconds * 1000) / this.speed;
  }

  seat(seatId) {
    const seat = this.seats.find((s) => s.id === seatId);
    if (!seat) throw new GameError("That seat doesn't exist.");
    return seat;
  }

  character(characterId) {
    return this.scenario.characters.find((c) => c.id === characterId);
  }

  seatFor(characterId) {
    return this.seats.find((s) => s.characterId === characterId) || null;
  }

  killerSeat() {
    return this.seatFor(this.scenario.killer);
  }

  humans() {
    return this.seats.filter((s) => s.kind === "human");
  }

  label(seat) {
    const character = this.character(seat.characterId);
    if (!character) return seat.name;
    return seat.kind === "human" ? `${character.short} (${seat.name})` : character.short;
  }

  pick(list) {
    return list[Math.floor(this.rng() * list.length)];
  }

  shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
  }

  // -------------------------------------------------------------- narration

  say(text, { speaker = "cecil", speakerName = this.scenario.host } = {}) {
    const item = { id: this.id("n"), text, speaker, speakerName, at: this.phaseElapsedMs, phase: this.phase };
    this.narration.push(item);
    if (this.narration.length > MAX_NARRATION) this.narration.shift();
    this.post({ kind: "speech", text, speaker, speakerName });
    return item;
  }

  post(entry) {
    this.feed.push({ id: this.id("f"), phase: this.phase, ...entry });
    if (this.feed.length > MAX_FEED) this.feed.shift();
    this.touch();
  }

  whisper(seat, { kind = "whisper", title = "Cecil, privately", text, clueId = null, quiet = false }) {
    const item = { id: this.id("w"), kind, title, text, clueId, phase: this.phase, read: false };
    seat.inbox.push(item);
    if (!quiet) {
      seat.whispers += 1;
      seat.lastWhisper = this.version + 1;
    }
    if (seat.kind === "ai") seat.memory.push(`Cecil told you privately: ${text}`);
    this.touch();
    return item;
  }

  giveClue(seat, clueId, source, extraText) {
    if (seat.clues.some((c) => c.id === clueId)) return false;
    const clue = this.clueCard(clueId);
    seat.clues.push({ ...clue, source, ...(extraText ? { text: extraText } : {}) });
    if (seat.kind === "ai") seat.memory.push(`You now know: ${clue.title}. ${extraText || clue.text}`);
    this.touch();
    return true;
  }

  clueCard(clueId) {
    if (clueId === "dictaphone") {
      const d = this.scenario.dictaphone;
      return { id: "dictaphone", title: d.title, text: d.transcript.join("\n"), strength: "key" };
    }
    if (clueId === "envelope2") {
      const e = this.scenario.envelope;
      return { id: "envelope2", title: e.title, text: `${e.front}\n\n${e.back}`, strength: "support" };
    }
    const clue = this.scenario.clues[clueId];
    return { id: clueId, title: clue.title, text: clue.text, strength: clue.strength };
  }

  // ------------------------------------------------------------------ lobby

  requireLobby() {
    if (this.phase !== "lobby") throw new GameError("The game has already started.");
  }

  addHuman(name, token) {
    this.requireLobby();
    const clean = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (!clean) throw new GameError("Please enter your name.");
    if (this.seats.length >= this.scenario.seats.max) {
      // Make room by dropping an AI guest if there is one.
      const guest = [...this.seats].reverse().find((s) => s.kind === "ai");
      if (!guest) throw new GameError("Sorry, this table is full.");
      this.seats = this.seats.filter((s) => s !== guest);
    }
    if (this.seats.some((s) => s.kind === "human" && s.name.toLowerCase() === clean.toLowerCase())) {
      throw new GameError("Someone at the table already has that name. Try another.");
    }
    const seat = this.newSeat("human", clean);
    seat.token = token;
    this.seats.push(seat);
    this.touch();
    return seat;
  }

  addGuest() {
    this.requireLobby();
    if (this.seats.length >= this.scenario.seats.max) throw new GameError("The table is full.");
    const seat = this.newSeat("ai", "AI guest");
    this.seats.push(seat);
    this.touch();
    return seat;
  }

  removeSeat(seatId) {
    this.requireLobby();
    this.seat(seatId);
    this.seats = this.seats.filter((s) => s.id !== seatId);
    this.touch();
  }

  newSeat(kind, name) {
    return {
      id: this.id("s"),
      kind,
      name,
      token: null,
      connected: kind === "ai",
      characterId: null,
      ready: kind === "ai",
      inbox: [],
      clues: [],
      whispers: 0,
      lastWhisper: 0,
      searches: {},
      asks: {},
      askHistory: [],
      guestQuestions: {},
      mission: null,
      missionsDone: 0,
      vote: null,
      memory: [],
      codeCooldownUntil: 0,
    };
  }

  setPhysicalPack(value) {
    this.requireLobby();
    this.physicalPack = Boolean(value);
    this.touch();
  }

  start(now = Date.now()) {
    this.requireLobby();
    const { min, max } = this.scenario.seats;
    if (this.humans().length === 0) throw new GameError("At least one person needs to join from a phone.");
    while (this.seats.length < min) this.seats.push(this.newSeat("ai", "AI guest"));
    if (this.seats.length > max) throw new GameError(`This mystery seats at most ${max}.`);

    const cast = this.scenario.characters.filter((c, i) => c.core || i < this.seats.length);
    const characters = this.shuffle(cast.slice(0, this.seats.length).map((c) => c.id));
    this.seats.forEach((seat, i) => {
      seat.characterId = characters[i];
    });
    for (const seat of this.seats.filter((s) => s.kind === "ai")) {
      seat.name = `AI guest`;
    }
    this.enterPhase("prologue", now);
  }

  // --------------------------------------------------------------- the clock

  enterPhase(phase, now = this.lastTickAt) {
    this.phase = phase;
    this.phaseElapsedMs = 0;
    this.lastTickAt = now;
    this.fired = new Set();
    this.events = this.schedule(phase);
    this.touch();
    this.runDueEvents();
  }

  duration(phase = this.phase) {
    const seconds = this.scenario.durations[phase];
    return seconds ? this.ms(seconds) : null;
  }

  remainingMs() {
    const total = this.duration();
    return total === null ? null : Math.max(0, total - this.phaseElapsedMs);
  }

  tick(now = Date.now()) {
    const delta = Math.max(0, now - this.lastTickAt);
    this.lastTickAt = now;
    if (this.paused || this.phase === "lobby" || this.phase === "reveal") return;
    this.phaseElapsedMs += delta;
    this.expireMissions();
    this.runDueEvents();
    const total = this.duration();
    if (total !== null && this.phaseElapsedMs >= total) this.advance();
  }

  runDueEvents() {
    const events = this.events;
    for (const event of events) {
      if (this.events !== events) return; // an event moved us into the next phase
      if (!this.fired.has(event.key) && event.atMs <= this.phaseElapsedMs) {
        this.fired.add(event.key);
        event.run();
      }
    }
  }

  // Jump straight to the next phase (end of timer, host "skip", everyone ready).
  advance() {
    const next = { prologue: "act1", act1: "act2", act2: "accusation", accusation: "reveal" }[this.phase];
    if (!next) return;
    if (next === "reveal") this.finish();
    else this.enterPhase(next, this.lastTickAt);
  }

  // Finish the phase a couple of seconds from now (everyone ready or voted).
  advanceSoon() {
    const key = `soon-${this.phase}`;
    if (this.fired.has(key) || this.events.some((e) => e.key === key)) return;
    const at = this.phaseElapsedMs + this.ms(3);
    this.events.push({ key, atMs: at, run: () => this.advance() });
  }

  pause() {
    if (this.phase === "lobby" || this.phase === "reveal") return;
    this.paused = true;
    this.touch();
  }

  resume(now = Date.now()) {
    this.paused = false;
    this.lastTickAt = now;
    this.touch();
  }

  schedule(phase) {
    const s = this.scenario;
    const events = [];
    const at = (seconds, key, run) => events.push({ key, atMs: this.ms(seconds), run });
    const hasLyle = Boolean(this.seatFor("lyle"));

    if (phase === "prologue") {
      at(0, "intro", () => {
        s.narration.prologue.forEach((line) => this.say(line));
        for (const seat of this.seats) {
          const c = this.character(seat.characterId);
          this.whisper(seat, { kind: "dossier", title: "Your dossier", text: `You are ${c.name}. ${c.bio}` });
        }
      });
    }

    if (phase === "act1") {
      at(0, "open", () => {
        s.narration.act1.forEach((line) => this.say(line));
        this.releaseEvidence("act1");
      });
      at(8, "guests", () => this.guestStatements("act1"));
      at(40, "opening-whispers", () => {
        for (const seat of this.seats) {
          const text = s.mischief.openingWhisper[seat.characterId];
          if (text) this.whisper(seat, { text });
        }
        this.say(s.narration.act1Whispers);
      });
      at(150, "mischief-a1", () => this.requestMischief("a1"));
      at(s.durations.act1 - 60, "warning", () => this.say(s.narration.act1Warning));
    }

    if (phase === "act2") {
      at(0, "open", () => {
        (hasLyle ? s.narration.act2WithLyle : s.narration.act2WithoutLyle).forEach((line) => this.say(line));
        this.releaseEvidence("act2");
      });
      at(8, "guests", () => this.guestStatements("act2"));
      at(s.envelope.at, "envelope", () => this.requestEnvelope());
      at(s.envelope.at + 60, "envelope-auto", () => this.autoOpenEnvelope());
      at(100, "mischief-a2a", () => this.requestMischief("a2a"));
      at(150, "hint-1", () => this.stuckHint(1));
      at(190, "mischief-a2b", () => this.requestMischief("a2b"));
      at(220, "hint-2", () => this.stuckHint(2));
      at(s.durations.act2 - 60, "warning", () => this.say(s.narration.act2Warning));
    }

    if (phase === "accusation") {
      at(0, "open", () => s.narration.accusation.forEach((line) => this.say(line)));
      at(5, "guest-votes", () => this.guestVotes());
    }

    return events;
  }

  releaseEvidence(phase) {
    for (const item of this.scenario.publicEvidence.filter((e) => e.phase === phase)) {
      if (item.id === "p_billiards" && !this.seatFor("lyle")) {
        this.evidence.push({ ...item, text: item.text.replace("say they", "(per Captain Lyle, absent) say they") });
      } else {
        this.evidence.push(item);
      }
    }
    this.touch();
  }

  guestStatements(act) {
    for (const seat of this.seats.filter((s) => s.kind === "ai")) {
      const c = this.character(seat.characterId);
      const line = c.guest.statements[act];
      if (line) this.say(line, { speaker: seat.id, speakerName: c.short });
    }
  }

  stuckHint(level) {
    const n = this.scenario.narration;
    if (!this.dictaphone.openedBy) {
      this.say(level === 1 ? n.codeHint1 : n.codeHint2);
      return;
    }
    if (level === 1) {
      const keyRoom = this.scenario.rooms.find((r) => this.scenario.clues[r.clue].strength === "key");
      if (keyRoom && !this.searchedRooms.has(keyRoom.id)) this.say(n.unsearchedHint);
    }
  }

  // ------------------------------------------------------------ player acts

  requireActive(seat) {
    if (this.paused) throw new GameError("Cecil has paused the game.");
    if (!seat.characterId) throw new GameError("The game hasn't started yet.");
  }

  requireAct(seat) {
    this.requireActive(seat);
    if (!ACTS.includes(this.phase)) throw new GameError("You can't do that right now.");
  }

  markRead(seatId, itemId) {
    const item = this.seat(seatId).inbox.find((i) => i.id === itemId);
    if (item && !item.read) {
      item.read = true;
      this.touch();
    }
  }

  markReady(seatId) {
    const seat = this.seat(seatId);
    if (this.phase !== "prologue") return;
    seat.ready = true;
    this.touch();
    if (this.humans().every((s) => s.ready)) {
      this.say(this.scenario.narration.prologueDone);
      this.advanceSoon();
    }
  }

  search(seatId, roomId) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    if (seat.searches[this.phase]) throw new GameError("You've already searched a room this act.");
    const room = this.scenario.rooms.find((r) => r.id === roomId);
    if (!room) throw new GameError("There's no such room.");
    seat.searches[this.phase] = roomId;
    const firstVisit = !this.searchedRooms.has(roomId);
    this.searchedRooms.add(roomId);
    this.giveClue(seat, room.clue, "search");
    this.post({ kind: "event", text: "Someone has searched a room." });

    // Sneaky Cecil: tell the owner their room was searched (never who by).
    const owner = room.owner && this.seatFor(room.owner);
    if (firstVisit && owner && owner !== seat) {
      this.whisper(owner, { text: `Someone has searched ${room.ownerRef}. You don't know who.` });
    }
    return this.clueCard(room.clue);
  }

  askAllowance(seat) {
    return 1 - (seat.asks[this.phase] || 0);
  }

  // How Cecil may treat a fact for this seat right now.
  factStatus(seat, fact) {
    if (fact.killerQuestion) return "killer";
    if (fact.sealed) return "sealed";
    if (fact.phase === "act2" && this.phase === "act1") return "later";
    if (fact.requires === "dictaphone" && !this.dictaphone.heardBy.has(seat.id)) return "locked";
    if (fact.requires && fact.requires !== "dictaphone" && !seat.clues.some((c) => c.id === fact.requires)) {
      return "locked";
    }
    return fact.answer;
  }

  presetQuestions() {
    return this.scenario.presetQuestions.filter((q) => !q.needsCharacter || this.seatFor(q.needsCharacter));
  }

  // A question picked from the suggested list: answered from the fact table alone.
  askPreset(seatId, index) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    if (this.askAllowance(seat) <= 0) throw new GameError("You've had your question this act.");
    const preset = this.presetQuestions()[index];
    if (!preset) throw new GameError("There's no such question.");
    const fact = this.scenario.facts.find((f) => f.id === preset.fact);
    return this.recordAnswer(seat, preset.text, fact, null);
  }

  // A free-text question: needs the AI to map it onto the fact table.
  askFree(seatId, question) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    if (!this.aiEnabled) throw new GameError("Cecil can only answer the suggested questions tonight.");
    const text = String(question || "").trim().slice(0, 200);
    if (!text) throw new GameError("Ask Cecil something first.");
    if (this.askAllowance(seat) <= 0) throw new GameError("You've had your question this act.");
    if ([...this.pending.values()].some((t) => t.type === "ask" && t.seatId === seat.id)) {
      throw new GameError("Cecil is still considering your last question.");
    }
    const task = { id: this.id("t"), type: "ask", seatId: seat.id, question: text, phase: this.phase };
    this.queue(task);
    return task;
  }

  // Resolve an AI-classified question. factId may be null (unclear).
  answerAsk(taskId, { factId = null, reply = null } = {}) {
    const task = this.pending.get(taskId);
    if (!task) return null;
    this.pending.delete(taskId);
    const seat = this.seat(task.seatId);
    const fact = factId ? this.scenario.facts.find((f) => f.id === factId) : null;
    if (task.phase !== this.phase) {
      this.whisper(seat, { kind: "answer", title: "Cecil replies", text: "Time moved on before I could answer. Ask me again." });
      return null;
    }
    return this.recordAnswer(seat, task.question, fact, reply);
  }

  recordAnswer(seat, question, fact, aiReply) {
    const status = fact ? this.factStatus(seat, fact) : "unclear";
    const replies = this.scenario.cecilReplies;
    const scripted = {
      yes: replies.yes, no: replies.no, sealed: replies.sealed, killer: replies.killer,
      locked: replies.locked, later: replies.later, unclear: replies.unclear,
    }[status];
    const verdict = status === "yes" || status === "no" ? status : null;
    // Wording that contradicts the fact table (or answers a question Cecil
    // mustn't) is thrown away in favour of a scripted line.
    const opener = aiReply && (aiReply.trim().match(/^(yes|no)\b/i) || [])[1];
    const contradicts = opener && opener.toLowerCase() !== verdict;
    const reply = aiReply && !contradicts ? aiReply : this.pick(scripted);
    if (verdict) seat.asks[this.phase] = (seat.asks[this.phase] || 0) + 1;
    const entry = { question, verdict, reply, factId: fact ? fact.id : null, status };
    seat.askHistory.push(entry);
    let text = reply;
    if (verdict) {
      // Lead with the verdict from the fact table, whatever the wording says.
      const rest = reply.replace(/^(yes|no)\b[.!,]?\s*/i, "");
      const flourish = rest.charAt(0).toUpperCase() + rest.slice(1);
      text = `${verdict === "yes" ? "Yes." : "No."} ${/^(yes|no)\.?$/i.test(reply.trim()) ? "" : flourish}`.trim();
    }
    this.whisper(seat, { kind: "answer", title: `You asked: ${question}`, text, quiet: true });
    if (verdict) this.post({ kind: "event", text: `${this.label(seat)} put a question to Cecil.` });
    return entry;
  }

  guestAllowance(seat) {
    return 2 - (seat.guestQuestions[this.phase] || 0);
  }

  guestSeat(guestSeatId) {
    const guest = this.seat(guestSeatId);
    if (guest.kind !== "ai") throw new GameError("You can ask them yourself. They're sitting right there.");
    return guest;
  }

  questionGuestPreset(seatId, guestSeatId, index) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    const guest = this.guestSeat(guestSeatId);
    if (this.guestAllowance(seat) <= 0) throw new GameError("You've asked the guests enough for this act.");
    const preset = this.character(guest.characterId).guest.presets[index];
    if (!preset) throw new GameError("There's no such question.");
    seat.guestQuestions[this.phase] = (seat.guestQuestions[this.phase] || 0) + 1;
    return this.recordGuestAnswer(seat, guest, preset.q, preset.a);
  }

  questionGuestFree(seatId, guestSeatId, question) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    if (!this.aiEnabled) throw new GameError("Pick one of the suggested questions.");
    const guest = this.guestSeat(guestSeatId);
    const text = String(question || "").trim().slice(0, 200);
    if (!text) throw new GameError("Ask them something first.");
    if (this.guestAllowance(seat) <= 0) throw new GameError("You've asked the guests enough for this act.");
    if ([...this.pending.values()].some((t) => t.type === "guest" && t.seatId === seat.id)) {
      throw new GameError("They're still answering your last question.");
    }
    seat.guestQuestions[this.phase] = (seat.guestQuestions[this.phase] || 0) + 1;
    const task = { id: this.id("t"), type: "guest", seatId: seat.id, guestSeatId: guest.id, question: text, phase: this.phase };
    this.post({ kind: "question", text, from: this.label(seat), to: this.label(guest) });
    this.queue(task);
    return task;
  }

  answerGuest(taskId, answer) {
    const task = this.pending.get(taskId);
    if (!task) return null;
    this.pending.delete(taskId);
    const seat = this.seat(task.seatId);
    const guest = this.seat(task.guestSeatId);
    return this.recordGuestAnswer(seat, guest, task.question, answer, { alreadyPosted: true });
  }

  // Fallback answer for a free-text guest question when the AI fails.
  guestFallback(guestSeatId, question) {
    const guest = this.seat(guestSeatId);
    const { presets, persona } = this.character(guest.characterId).guest;
    const words = new Set(String(question).toLowerCase().match(/[a-z]+/g) || []);
    let best = null;
    let bestScore = 0;
    for (const preset of presets) {
      const score = (preset.q.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3 && words.has(w)).length;
      if (score > bestScore) {
        best = preset;
        bestScore = score;
      }
    }
    return best ? best.a : `I've nothing to add to that. ${persona.split(".")[0]}, you understand.`;
  }

  recordGuestAnswer(seat, guest, question, answer, { alreadyPosted = false } = {}) {
    const c = this.character(guest.characterId);
    if (!alreadyPosted) this.post({ kind: "question", text: question, from: this.label(seat), to: c.short });
    guest.memory.push(`${this.label(seat)} asked you: "${question}" You answered: "${answer}"`);
    this.say(answer, { speaker: guest.id, speakerName: c.short });
    return { question, answer };
  }

  openEnvelope(seatId) {
    const seat = this.seat(seatId);
    this.requireAct(seat);
    if (!this.envelope.requested || this.envelope.openerSeatId !== seat.id) {
      throw new GameError("Cecil hasn't asked you to open an envelope.");
    }
    if (this.envelope.opened) return;
    this.doOpenEnvelope();
  }

  requestEnvelope() {
    const humans = this.humans();
    const innocents = humans.filter((s) => s.characterId !== this.scenario.killer);
    const opener = this.pick(innocents.length ? innocents : humans);
    this.envelope.requested = true;
    this.envelope.openerSeatId = opener.id;
    this.say(this.fill(this.scenario.narration.envelope, { opener: this.label(opener) }));
    this.whisper(opener, {
      kind: "task",
      title: "Envelope Two",
      text: this.physicalPack
        ? "Cecil would like you to open Envelope Two from the evidence pack. Tap 'Open Envelope Two' when you do, and keep the back to yourself unless you choose to share it."
        : "Cecil would like you to open Envelope Two. Tap 'Open Envelope Two'. The front goes on the big screen; the back is for your eyes only.",
    });
  }

  autoOpenEnvelope() {
    if (!this.envelope.requested || this.envelope.opened) return;
    this.say("Allow me.");
    this.doOpenEnvelope();
  }

  doOpenEnvelope() {
    this.envelope.opened = true;
    const opener = this.seat(this.envelope.openerSeatId);
    this.giveClue(opener, "envelope2", "envelope");
    this.evidence.push({ id: "p_envelope", title: this.scenario.envelope.title, kind: "photo", text: this.scenario.envelope.front });
    this.post({ kind: "event", text: `${this.label(opener)} opened Envelope Two.` });
  }

  enterCode(seatId, code, now = this.lastTickAt) {
    const seat = this.seat(seatId);
    this.requireActive(seat);
    if (this.phase !== "act2") throw new GameError("The drawer is out of reach until Act Two.");
    if (this.dictaphone.heardBy.has(seat.id)) throw new GameError("You've already heard the recording.");
    if (now < seat.codeCooldownUntil) throw new GameError("Give the dial a moment.");
    const clean = String(code || "").replace(/\D/g, "");
    if (clean !== this.scenario.dictaphone.code) {
      seat.codeCooldownUntil = now + 3000;
      this.post({ kind: "event", text: "Someone tried the desk drawer. It did not budge." });
      return { opened: false, message: this.scenario.narration.wrongCode };
    }
    this.dictaphone.heardBy.add(seat.id);
    this.giveClue(seat, "dictaphone", "dictaphone");
    if (!this.dictaphone.openedBy) {
      this.dictaphone.openedBy = seat.id;
      this.say(this.scenario.narration.dictaphoneOpened);
      // Everyone else hears about it, so a whisper to the killer alone can't give them away.
      for (const other of this.seats.filter((s) => s !== seat)) {
        const text =
          other.characterId === this.scenario.killer
            ? "Someone has just opened Sir Edmund's dictaphone. You don't know what's on it. They do."
            : "Someone has just opened Sir Edmund's dictaphone. It wasn't you. Perhaps ask around.";
        this.whisper(other, { text });
      }
    }
    return { opened: true };
  }

  reportMission(seatId, success) {
    const seat = this.seat(seatId);
    const mission = seat.mission;
    if (!mission || mission.status !== "active") throw new GameError("You don't have a mission on the go.");
    mission.status = success ? "success" : "failed";
    if (success) seat.missionsDone += 1;
    this.post({ kind: "event", text: `${this.label(seat)} ${success ? "completed" : "failed"} a secret task from Cecil.` });
  }

  expireMissions() {
    for (const seat of this.seats) {
      const m = seat.mission;
      if (m && m.status === "active" && this.phaseElapsedMs > m.deadlineMs + this.ms(20)) {
        m.status = "expired";
        this.touch();
      }
      if (m && m.phase !== this.phase && m.status === "active") {
        m.status = "expired";
        this.touch();
      }
    }
  }

  vote(seatId, targetSeatId) {
    const seat = this.seat(seatId);
    this.requireActive(seat);
    if (this.phase !== "accusation") throw new GameError("It isn't time to accuse anyone yet.");
    if (targetSeatId === seat.id) throw new GameError("You can't accuse yourself. Well, you could. Don't.");
    this.seat(targetSeatId);
    seat.vote = targetSeatId;
    this.post({ kind: "event", text: `${this.label(seat)} has cast a vote.` });
    if (this.seats.every((s) => s.vote)) this.advanceSoon();
  }

  guestVotes() {
    const evidenceSurfaced =
      Boolean(this.dictaphone.openedBy) ||
      this.searchedRooms.has("office") ||
      this.seats.some((s) => s.clues.some((c) => c.strength === "key"));
    for (const seat of this.seats.filter((s) => s.kind === "ai" && !s.vote)) {
      const c = this.character(seat.characterId);
      const inPlay = (id) => id !== seat.characterId && this.seatFor(id);
      let targetCharacter;
      if (seat.characterId === this.scenario.killer) {
        targetCharacter = c.guest.suspects.find(inPlay);
      } else if (evidenceSurfaced && inPlay(this.scenario.killer)) {
        targetCharacter = this.scenario.killer;
      } else {
        targetCharacter = c.guest.suspects.find(inPlay);
      }
      const target = this.seatFor(targetCharacter) || this.seats.find((s) => s !== seat);
      this.vote(seat.id, target.id);
    }
  }

  // ---------------------------------------------------------------- mischief

  requestMischief(slot) {
    const moves = this.mischiefMoves(slot);
    if (!moves.length) return;
    const task = { id: this.id("t"), type: "mischief", slot, moves, phase: this.phase };
    this.queue(task);
  }

  queue(task) {
    this.pending.set(task.id, task);
    this.tasks.push(task);
    this.touch();
  }

  drainTasks() {
    const tasks = this.tasks;
    this.tasks = [];
    return tasks;
  }

  // Resolve every queued task with the scripted fallback (no AI).
  resolveWithFallback() {
    for (const task of this.drainTasks()) this.fallback(task);
  }

  fallback(task) {
    if (task.type === "ask") return this.answerAsk(task.id, {});
    if (task.type === "guest") return this.answerGuest(task.id, this.guestFallback(task.guestSeatId, task.question));
    if (task.type === "mischief") return this.applyMischief(task.id, this.fallbackMove(task).id);
    if (task.type === "closing") return this.setClosing(task.id, null);
    return null;
  }

  // Mischief targets: humans before AI guests (it's more fun for the people at
  // the table), and the least-harassed first.
  byAttention(seats) {
    const tiebreak = new Map(seats.map((s) => [s.id, this.rng()]));
    return [...seats].sort(
      (a, b) =>
        (a.kind === "ai") - (b.kind === "ai") || a.whispers - b.whispers || tiebreak.get(a.id) - tiebreak.get(b.id),
    );
  }

  otherThan(seat) {
    return this.byAttention(this.seats.filter((s) => s !== seat))[0];
  }

  // The legal moves for a mischief slot. Cecil (AI or fallback) picks one.
  mischiefMoves(slot) {
    const s = this.scenario;
    const moves = [];
    const add = (move) => moves.push({ id: `m${moves.length + 1}`, slot, ...move });
    const killer = this.killerSeat();
    const innocents = this.seats.filter((x) => x !== killer);
    const humans = this.byAttention(this.humans());

    // Fairness: if the innocents still hold nothing that points at the truth
    // late in the game, Cecil must hand one of them a key clue.
    const innocentsHaveKey =
      innocents.some((x) => x.clues.some((c) => c.strength === "key")) || Boolean(this.dictaphone.openedBy);
    const mustHelp = slot !== "a1" && !innocentsHaveKey;

    const extras = Object.entries(s.clues).filter(([id, clue]) => {
      if (!clue.extra || this.usedMischief.clues.has(id)) return false;
      if (clue.extra.phase === "act2" && this.phase !== "act2") return false;
      if (clue.extra.afterEnvelope && !this.envelope.opened) return false;
      if (clue.extra.about && !this.seatFor(clue.extra.about)) return false;
      return true;
    });
    for (const [clueId, clue] of extras) {
      if (mustHelp && clue.strength !== "key") continue;
      const candidates = this.byAttention(
        this.seats.filter((x) => {
          if (x.characterId === clue.extra.about) return false;
          if (clue.strength === "key" || clue.strength === "support") return x !== killer;
          return true;
        }),
      );
      // Herrings: sneakiest in the killer's hands (ammunition); otherwise anyone.
      const target = clue.strength === "herring" && killer && killer.characterId !== clue.extra.about ? killer : candidates[0];
      if (target) {
        add({
          type: "extra_clue",
          target: target.id,
          clueId,
          describe: `Slip ${this.label(target)} an extra ${clue.strength} clue: "${clue.title}".`,
        });
      }
    }

    if (!mustHelp) {
      const bluffTarget = humans[0] || this.byAttention(this.seats)[0];
      if (bluffTarget) {
        const other = this.otherThan(bluffTarget);
        add({
          type: "bluff",
          target: bluffTarget.id,
          other: other.id,
          line: s.mischief.bluffs[this.usedMischief.bluff % s.mischief.bluffs.length],
          describe: `Tell ${this.label(bluffTarget)} to bluff ${this.label(other)}.`,
        });
      }
      if (humans[0]) {
        add({ type: "blank", target: humans[0].id, describe: `Whisper nothing at all to ${this.label(humans[0])}, but make the table think it was something.` });
      }
      const gossipTarget = humans[0];
      if (gossipTarget) {
        const about = this.otherThan(gossipTarget);
        add({
          type: "gossip",
          target: gossipTarget.id,
          other: about.id,
          describe: `Tell ${this.label(gossipTarget)} a true minor secret about ${this.label(about)}, and tell ${this.label(about)} you did.`,
        });
      }
      const missionTarget = humans.find((x) => !x.mission || x.mission.status !== "active");
      const mission = s.mischief.missions.find((m) => !this.usedMischief.missions.has(m.id));
      if (missionTarget && mission) {
        add({
          type: "mission",
          target: missionTarget.id,
          other: this.otherThan(missionTarget).id,
          missionId: mission.id,
          describe: `Give ${this.label(missionTarget)} a secret timed challenge: ${mission.text}`,
        });
      }
      if (this.seats.length >= 3) {
        // Leave out a human: being the only phone that didn't buzz is the point.
        const left = this.byAttention(this.humans()).at(-1) || this.byAttention(this.seats).at(-1);
        add({ type: "odd_one_out", target: left.id, describe: `Whisper to everyone except ${this.label(left)}, then point out that one person got nothing.` });
      }
      if (this.dictaphone.openedBy) {
        const openedBy = this.seat(this.dictaphone.openedBy);
        const target = this.byAttention(this.seats.filter((x) => x !== openedBy && !this.dictaphone.toldOpener.has(x.id)))[0];
        if (target) {
          add({ type: "reveal_opener", target: target.id, other: openedBy.id, describe: `Tell ${this.label(target)} that it was ${this.label(openedBy)} who opened the dictaphone.` });
        }
      }
      if (this.usedMischief.teases < s.mischief.teases.length) {
        add({ type: "tease", line: s.mischief.teases[this.usedMischief.teases], describe: "Say something unsettling to the whole room, and whisper to no one." });
      }
    }
    return moves;
  }

  fallbackMove(task) {
    const { moves } = task;
    const used = this.usedMischief.types;
    const preference = {
      a1: ["odd_one_out", "gossip", "mission", "bluff", "blank", "extra_clue", "tease"],
      a2a: ["extra_clue", "mission", "bluff", "gossip", "blank", "tease", "odd_one_out"],
      a2b: ["reveal_opener", "extra_clue", "blank", "bluff", "tease", "gossip", "mission"],
    }[task.slot] || [];
    const fresh = moves.filter((m) => !used.includes(m.type));
    const pool = fresh.length ? fresh : moves;
    for (const type of preference) {
      const options = pool.filter((m) => m.type === type);
      if (options.length) {
        // Prefer a key clue to an innocent when one is on offer.
        return options.find((m) => m.clueId && this.scenario.clues[m.clueId].strength === "key") || options[0];
      }
    }
    return pool[0];
  }

  // Apply the chosen move. lines = { privateLine, publicLine } from the AI (optional, already vetted).
  applyMischief(taskId, moveId, lines = {}) {
    const task = this.pending.get(taskId);
    if (!task) return null;
    this.pending.delete(taskId);
    const move = task.moves.find((m) => m.id === moveId) || this.fallbackMove(task);
    const s = this.scenario;
    const target = move.target ? this.seat(move.target) : null;
    const other = move.other ? this.seat(move.other) : null;
    const intro = lines.privateLine ? `${lines.privateLine}\n\n` : "";
    let publicLine = lines.publicLine || null;
    const values = { target: target && this.label(target), other: other && this.label(other) };

    switch (move.type) {
      case "extra_clue": {
        const clue = this.clueCard(move.clueId);
        this.usedMischief.clues.add(move.clueId);
        this.giveClue(target, move.clueId, "cecil");
        this.whisper(target, { kind: "clue", title: `Cecil slips you something: ${clue.title}`, text: `${intro}${clue.text}`, clueId: move.clueId });
        publicLine ||= `I've just slipped ${values.target} something. Whether it helps anyone is entirely up to them.`;
        break;
      }
      case "bluff": {
        this.usedMischief.bluff += 1;
        this.whisper(target, { kind: "mission", text: `${intro}${this.fill(move.line.text, values)}` });
        if (target.kind === "ai") {
          // An AI guest carries out the bluff out loud, straight away.
          const c = this.character(target.characterId);
          const spoken = this.fill(move.line.spoken, { other: this.character(other.characterId).short });
          this.say(spoken, { speaker: target.id, speakerName: c.short });
        }
        publicLine ||= `A private word with ${values.target}.`;
        break;
      }
      case "blank": {
        this.whisper(target, { text: `${intro}${s.mischief.blank.private}` });
        publicLine ||= this.fill(s.mischief.blank.public, values);
        break;
      }
      case "gossip": {
        const secret = this.character(other.characterId).gossip;
        this.whisper(target, { text: `${intro}Something you may not know about ${values.other}: ${secret}` });
        this.whisper(other, { text: `I have just told ${values.target} something about you. Something true.` });
        publicLine ||= `I've just told ${values.target} something about one of you. Something true.`;
        break;
      }
      case "mission": {
        const mission = s.mischief.missions.find((m) => m.id === move.missionId);
        this.usedMischief.missions.add(mission.id);
        const text = this.fill(mission.text, values);
        target.mission = { id: mission.id, text, phase: this.phase, deadlineMs: this.phaseElapsedMs + this.ms(mission.seconds), seconds: mission.seconds, status: "active" };
        this.whisper(target, { kind: "mission", title: "A task from Cecil", text: `${intro}${text}` });
        publicLine ||= `A private word with ${values.target}.`;
        break;
      }
      case "odd_one_out": {
        const recipients = this.seats.filter((x) => x !== target);
        recipients.forEach((seat, i) => {
          const pool = this.seats.filter((x) => x !== seat);
          const about = pool[i % pool.length];
          this.whisper(seat, { text: `${intro}A little something about ${this.label(about)}: ${this.character(about.characterId).gossip}` });
        });
        const count = ["None", "One", "Two", "Three"][recipients.length] || String(recipients.length);
        publicLine ||= `Interesting. ${count} of you have just received information. One of you hasn't.`;
        break;
      }
      case "reveal_opener": {
        this.dictaphone.toldOpener.add(target.id);
        this.whisper(target, { text: `${intro}It was ${values.other} who opened Sir Edmund's dictaphone. I thought you should know.` });
        publicLine ||= `A private word with ${values.target}.`;
        break;
      }
      case "tease": {
        this.usedMischief.teases += 1;
        publicLine = lines.publicLine || move.line;
        break;
      }
      default:
        return null;
    }
    this.usedMischief.types.push(move.type);
    this.say(publicLine);
    this.mischiefLog.push({ type: move.type, describe: move.describe, phase: task.phase });
    return move;
  }

  // ------------------------------------------------------------------ finish

  finish() {
    this.phase = "reveal";
    this.phaseElapsedMs = 0;
    this.events = [];
    this.result = this.score();
    const n = this.scenario.narration;
    const { caught, top } = this.result;
    const killer = this.killerSeat();
    if (caught) this.say(`The votes are in. You have accused ${this.label(killer)}. Let me tell you what really happened.`);
    else if (top.length === 1) this.say(`The votes are in. You have accused ${this.label(this.seat(top[0]))}. Let me tell you what really happened.`);
    else this.say("The votes are in, and you can't agree. Let me tell you what really happened.");
    n.reveal.forEach((line) => this.say(line));
    this.say(caught ? "Well done. Justice, of a sort, is served." : "Which means, I'm sorry to say, that a murderer walks free tonight.");
    const task = { id: this.id("t"), type: "closing", phase: "reveal" };
    this.queue(task);
    this.touch();
  }

  setClosing(taskId, text) {
    if (!this.pending.has(taskId)) return;
    this.pending.delete(taskId);
    this.closing = text;
    if (text) this.say(text);
    this.say(this.scenario.narration.closing);
  }

  score() {
    const killer = this.killerSeat();
    const tally = new Map(this.seats.map((s) => [s.id, 0]));
    for (const seat of this.seats) if (seat.vote) tally.set(seat.vote, tally.get(seat.vote) + 1);
    const max = Math.max(...tally.values());
    const top = max > 0 ? [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id) : [];
    const caught = top.length === 1 && top[0] === killer.id;
    const scores = this.seats.map((seat) => {
      const lines = [];
      if (seat === killer) {
        if (!caught) lines.push(["Got away with murder", 3]);
        const misled = this.seats.filter((s) => s !== killer && s.vote && s.vote !== killer.id).length;
        if (misled) lines.push([`Misled ${misled} ${misled === 1 ? "person" : "people"}`, misled]);
      } else {
        if (seat.vote === killer.id) lines.push(["Accused the murderer", 2]);
        if (caught) lines.push(["The murderer was caught", 1]);
      }
      if (seat.missionsDone) lines.push([`Completed Cecil's secret task`, seat.missionsDone]);
      return { seatId: seat.id, points: lines.reduce((sum, [, p]) => sum + p, 0), lines };
    });
    return {
      killerSeatId: killer.id,
      caught,
      top,
      tally: [...tally.entries()].map(([seatId, votes]) => ({ seatId, votes })),
      votes: this.seats.map((s) => ({ voter: s.id, target: s.vote })),
      scores: scores.sort((a, b) => b.points - a.points),
    };
  }

  // ------------------------------------------------------------------- views

  timer() {
    return { remainingMs: this.remainingMs(), totalMs: this.duration(), paused: this.paused };
  }

  publicSeat(seat) {
    const c = this.character(seat.characterId);
    return {
      id: seat.id,
      kind: seat.kind,
      name: seat.name,
      connected: seat.connected,
      ready: seat.ready,
      voted: Boolean(seat.vote),
      whispers: seat.whispers,
      lastWhisper: seat.lastWhisper,
      character: c ? { id: c.id, name: c.name, short: c.short, bio: c.bio } : null,
    };
  }

  revealView() {
    if (this.phase !== "reveal") return null;
    const r = this.result;
    return {
      ...r,
      truth: this.scenario.truth,
      lies: this.seats.map((s) => ({ seatId: s.id, text: this.character(s.characterId).reveal })),
      mischief: this.mischiefLog.map((m) => m.describe),
      closing: this.closing,
    };
  }

  hostView() {
    const s = this.scenario;
    return {
      code: this.code,
      title: s.title,
      tagline: s.tagline,
      setting: s.setting,
      phase: this.phase,
      version: this.version,
      timer: this.timer(),
      aiEnabled: this.aiEnabled,
      physicalPack: this.physicalPack,
      seats: this.seats.map((seat) => this.publicSeat(seat)),
      lobby: {
        min: s.seats.min,
        max: s.seats.max,
        humans: this.humans().length,
        guestsNeeded: Math.max(0, s.seats.min - this.seats.length),
      },
      narration: this.narration,
      feed: this.feed,
      evidence: this.evidence,
      envelope: {
        requested: this.envelope.requested,
        opened: this.envelope.opened,
        opener: this.envelope.openerSeatId,
        front: this.envelope.opened ? s.envelope.front : null,
      },
      dictaphoneOpened: Boolean(this.dictaphone.openedBy),
      reveal: this.revealView(),
    };
  }

  playerView(seatId) {
    const seat = this.seat(seatId);
    const s = this.scenario;
    const c = this.character(seat.characterId);
    const inAct = ACTS.includes(this.phase) && !this.paused;
    const guests = this.seats.filter((x) => x.kind === "ai" && x !== seat);
    const pendingAsk = [...this.pending.values()].some((t) => t.type === "ask" && t.seatId === seat.id);
    const pendingGuest = [...this.pending.values()].some((t) => t.type === "guest" && t.seatId === seat.id);
    const mission = seat.mission && {
      text: seat.mission.text,
      status: seat.mission.status,
      remainingMs: Math.max(0, seat.mission.deadlineMs - this.phaseElapsedMs),
    };
    return {
      code: this.code,
      title: s.title,
      phase: this.phase,
      version: this.version,
      timer: this.timer(),
      aiEnabled: this.aiEnabled,
      you: { id: seat.id, name: seat.name, kind: seat.kind },
      character: c
        ? { id: c.id, name: c.name, short: c.short, bio: c.bio, dossier: c.dossier, murderer: c.id === s.killer }
        : null,
      lineup: this.seats.map((x) => this.publicSeat(x)),
      inbox: seat.inbox,
      clues: seat.clues,
      evidence: this.evidence,
      actions: {
        ready: { available: this.phase === "prologue", done: seat.ready },
        search: {
          available: inAct && !seat.searches[this.phase],
          used: seat.searches[this.phase] || null,
          rooms: s.rooms.map((r) => ({ id: r.id, name: r.name })),
        },
        ask: {
          available: inAct && this.askAllowance(seat) > 0,
          pending: pendingAsk,
          freeText: this.aiEnabled,
          presets: this.presetQuestions().map((q, index) => ({ index, text: q.text })),
          history: seat.askHistory,
        },
        guests: {
          available: inAct && guests.length > 0 && this.guestAllowance(seat) > 0,
          remaining: this.guestAllowance(seat),
          pending: pendingGuest,
          freeText: this.aiEnabled,
          list: guests.map((g) => {
            const gc = this.character(g.characterId);
            return { seatId: g.id, name: gc ? gc.short : g.name, presets: gc ? gc.guest.presets.map((p, index) => ({ index, text: p.q })) : [] };
          }),
        },
        envelope: {
          assigned: this.envelope.openerSeatId === seat.id,
          opened: this.envelope.opened,
          physical: this.physicalPack,
        },
        dictaphone: {
          available: this.phase === "act2" && !this.paused,
          heard: this.dictaphone.heardBy.has(seat.id),
        },
        mission,
        vote: {
          available: this.phase === "accusation" && !this.paused,
          choice: seat.vote,
          candidates: this.seats.filter((x) => x !== seat).map((x) => ({ seatId: x.id, name: this.label(x) })),
        },
      },
      reveal: this.revealView(),
    };
  }

  // ---------------------------------------------------------- AI briefings

  // Everything Cecil knows. Stable for the whole game, so it caches well.
  cecilBrief() {
    const s = this.scenario;
    const characters = s.characters.map((c) =>
      [
        `## ${c.name} (${c.id})${c.id === s.killer ? " — THE MURDERER" : ""}`,
        `Public: ${c.bio}`,
        `Tells everyone: ${c.dossier.story}`,
        `Secret: ${c.dossier.secret}`,
        `Knows: ${c.dossier.knows.join(" ")}`,
      ].join("\n"),
    );
    const clues = Object.entries(s.clues).map(([id, c]) => `- ${id} [${c.strength}] ${c.title}: ${c.text}`);
    return [
      `# ${s.title}`,
      s.setting,
      `Victim: ${s.victim.name}. ${s.victim.summary}`,
      "",
      "# What really happened",
      ...s.truth.map((t) => `- ${t}`),
      "",
      "# The guests",
      ...characters,
      "",
      "# Clues",
      ...clues,
      `- envelope2: ${s.envelope.front} ${s.envelope.back}`,
      `- dictaphone (code ${s.dictaphone.code}): ${s.dictaphone.transcript.join(" ")}`,
    ].join("\n");
  }

  // The live situation, for Cecil's decisions.
  stateSummary() {
    const lines = [`Phase: ${this.phase}. Time left in phase: ${Math.round((this.remainingMs() || 0) / 1000)}s.`];
    for (const seat of this.seats) {
      const c = this.character(seat.characterId);
      lines.push(
        `- ${this.label(seat)} [${seat.kind === "ai" ? "AI guest" : "human"}; plays ${c.id}]: ` +
          `holds ${seat.clues.map((x) => x.id).join(", ") || "no clues"}; ` +
          `searched ${Object.values(seat.searches).join(", ") || "nothing"}; ` +
          `whispers received ${seat.whispers}; ` +
          `heard dictaphone: ${this.dictaphone.heardBy.has(seat.id) ? "yes" : "no"}.`,
      );
    }
    lines.push(`Envelope Two: ${this.envelope.opened ? "opened" : this.envelope.requested ? "requested" : "not yet"}.`);
    lines.push(`Dictaphone opened by: ${this.dictaphone.openedBy ? this.label(this.seat(this.dictaphone.openedBy)) : "nobody yet"}.`);
    lines.push(`Recent: ${this.feed.slice(-8).map((f) => f.text).join(" | ")}`);
    return lines.join("\n");
  }

  // What a guest seat is allowed to know: its own dossier plus public facts.
  guestBrief(seatId) {
    const seat = this.seat(seatId);
    const c = this.character(seat.characterId);
    const s = this.scenario;
    const others = this.seats.filter((x) => x !== seat).map((x) => `${this.label(x)}: ${this.character(x.characterId).bio}`);
    return [
      `You are ${c.name}, a guest at ${s.title.replace("A Nightcap at ", "")} tonight. ${c.dossier.who}`,
      `Victim: ${s.victim.name}. ${s.victim.summary}`,
      `Your public story: ${c.dossier.story}`,
      `The truth only you know: ${c.dossier.secret}`,
      `What you know: ${c.dossier.knows.join(" ")}`,
      `How you behave: ${c.guest.persona}`,
      `Your rules: ${c.guest.rules}`,
      `Others at the table: ${others.join(" | ")}`,
      `Public evidence so far: ${this.evidence.map((e) => `${e.title}: ${e.text}`).join(" | ")}`,
      `Your memory of tonight so far: ${seat.memory.slice(-12).join(" | ") || "nothing yet."}`,
    ].join("\n");
  }

  // The fact table as it applies to one seat right now.
  askBrief(seatId) {
    const seat = this.seat(seatId);
    return this.scenario.facts.map((fact) => ({ id: fact.id, statement: fact.statement, status: this.factStatus(seat, fact) }));
  }
}
