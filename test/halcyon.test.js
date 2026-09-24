// Dead Reckoning: the second case. These tests check that the case can be
// played to the end, that the evidence really supports the solution, and that
// nothing private leaks to the wrong screen. Test names stay spoiler-free,
// because they print whenever anyone runs `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { Game, GameError } from "../server/game.js";
import { halcyon, mischiefTaskAt, run, seatPlaying, secretsFor, startGame, toPhase } from "./helpers.js";

const S = halcyon;
const play = (options = {}) => startGame({ scenario: S, ...options });
const onScreen = (view, text) => JSON.stringify(view).includes(JSON.stringify(text).slice(1, -1));

// ------------------------------------------------------------------ casting

test("Dead Reckoning: three seats cast the core characters; a fourth adds the optional one", () => {
  const three = play({ humans: 2 }).game;
  assert.deepEqual(three.seats.map((s) => s.characterId).sort(), S.characters.filter((c) => c.core).map((c) => c.id).sort());
  const four = play({ humans: 4 }).game;
  assert.deepEqual(four.seats.map((s) => s.characterId).sort(), S.characters.map((c) => c.id).sort());
  assert.ok(seatPlaying(four, S.optional));
});

test("Dead Reckoning: any role can land on a person or an AI guest", () => {
  const kinds = new Map(S.characters.filter((c) => c.core).map((c) => [c.id, new Set()]));
  for (let seed = 1; seed <= 40; seed += 1) {
    const { game } = play({ humans: 2, seed });
    for (const seat of game.seats) kinds.get(seat.characterId).add(seat.kind);
  }
  for (const [id, set] of kinds) assert.deepEqual([...set].sort(), ["ai", "human"], id);
});

// ------------------------------------------------------- the evidence audit

// Where each named source can be read in play, and whether a three-seat game has it.
function source(ref) {
  if (ref === "dictaphone") return { text: S.dictaphone.transcript.join(" "), core: true, how: "the locked case" };
  if (ref === "envelope.front") return { text: S.envelope.front, core: true, how: "the telegram, on the big screen" };
  if (ref === "envelope.back") return { text: S.envelope.back, core: true, how: "the telegram, opener only" };
  if (ref.startsWith("knows:")) {
    const c = S.characters.find((x) => x.id === ref.slice(6));
    return c && { text: c.dossier.knows.join(" ") + " " + c.dossier.secret, core: c.core, how: "a dossier" };
  }
  const pub = S.publicEvidence.find((e) => e.id === ref);
  if (pub) return { text: pub.text, core: true, how: "public evidence" };
  const clue = S.clues[ref];
  if (!clue) return null;
  if (clue.extra) return { text: clue.text, core: !clue.extra.about || S.characters.find((c) => c.id === clue.extra.about).core, how: "Cecil's mischief" };
  const room = S.rooms.find((r) => r.clue === ref);
  return room && { text: clue.text, core: true, how: "searching a room" };
}

test("Dead Reckoning: every step of the solution is backed by evidence that exists", () => {
  assert.ok(S.solution.steps.length >= 6);
  for (const step of S.solution.steps) {
    assert.ok(step.evidence.length >= 2, `only one piece of evidence for: ${step.claim}`);
    for (const [ref, phrase] of step.evidence) {
      const found = source(ref);
      assert.ok(found, `unknown evidence source ${ref}`);
      assert.ok(found.text.includes(phrase), `${ref} doesn't say "${phrase}"`);
    }
    // Each step must still be provable when the optional fourth character isn't at the table.
    const core = step.evidence.filter(([ref]) => source(ref).core);
    assert.ok(core.length >= 2, `step leans on the optional character: ${step.claim}`);
  }
});

test("Dead Reckoning: the lock's code can be worked out from the telegram, and nothing else gives it away", () => {
  // Read the cabin number off the public front, then follow the private back's instruction.
  const cabin = S.envelope.front.match(/Cabin A(\d{3})/)[1];
  assert.match(S.envelope.back, /CABIN NUMBER BACK TO FRONT/);
  assert.equal([...cabin].reverse().join(""), S.dictaphone.code);
  // No public evidence, dossier or room clue prints the code itself.
  const everything = [
    ...S.publicEvidence.map((e) => e.text),
    ...Object.values(S.clues).map((c) => c.text),
    ...S.characters.flatMap((c) => [c.dossier.secret, ...c.dossier.knows, c.dossier.story]),
  ].join(" ");
  assert.ok(!everything.includes(S.dictaphone.code));
});

test("Dead Reckoning: the scenario is internally consistent", () => {
  const ids = new Set(S.characters.map((c) => c.id));
  assert.ok(ids.has(S.killer) && ids.has(S.decoy) && ids.has(S.optional));
  assert.notEqual(S.killer, S.decoy);
  for (const id of [S.killer, S.decoy]) assert.ok(S.characters.find((c) => c.id === id).core, `${id} must always be cast`);
  assert.equal(S.characters.at(-1).id, S.optional, "the optional character comes last");
  for (const room of S.rooms) {
    assert.ok(S.clues[room.clue], room.id);
    if (room.owner) assert.ok(ids.has(room.owner), room.id);
  }
  for (const [id, clue] of Object.entries(S.clues)) {
    assert.ok(["key", "support", "herring"].includes(clue.strength), id);
    if (clue.extra?.about) assert.ok(ids.has(clue.extra.about), id);
  }
  const clueIds = new Set([...Object.keys(S.clues), "dictaphone"]);
  for (const fact of S.facts) if (fact.requires) assert.ok(clueIds.has(fact.requires), fact.id);
  const factIds = new Set(S.facts.map((f) => f.id));
  for (const q of S.presetQuestions) assert.ok(factIds.has(q.fact), q.text);
  for (const c of S.characters) {
    assert.ok(S.mischief.openingWhisper[c.id], c.id);
    assert.equal(c.guest.presets.length, 4, c.id);
    for (const suspect of c.guest.suspects) assert.ok(ids.has(suspect) && suspect !== c.id, c.id);
  }
  for (const w of S.whispers) assert.ok(ids.has(w.to), w.key);
  for (const key of ["guilt", "motive", "code", "confession", "secrets"]) assert.doesNotThrow(() => new RegExp(S.guard[key], "i"));
  assert.equal(S.dictaphone.code.length, S.labels.lock.digits);
});

test("Dead Reckoning: both cases give the screens the same kinds of wording", async () => {
  const { default: ravensmere } = await import("../server/scenario/ravensmere.js");
  const shape = (o) => (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : typeof o);
  assert.deepEqual(shape(S.labels), shape(ravensmere.labels));
  for (const key of Object.keys(ravensmere.narration)) assert.ok(key in S.narration, key);
});

// ------------------------------------------------------------ playing it

// Play a whole evening the way a careful table would: search the key places,
// open the telegram, work out the code from it, open the case, and vote.
function detectiveEvening({ humans = 3, seed = 1, accuseKiller = true } = {}) {
  const { game, clock, people } = play({ humans, seed });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "act1");
  const order = ["cabin", "radio", "smoking", "boat"];
  people.forEach((p, i) => {
    const room = order[i % order.length];
    game.search(p.id, room);
  });
  toPhase(game, clock, "act2");
  run(game, clock, S.envelope.at + 1);
  const opener = game.seat(game.envelope.openerSeatId);
  game.openEnvelope(opener.id);
  // The opener reads the telegram and works the code out.
  const telegram = opener.clues.find((c) => c.id === "envelope2").text;
  const cabin = telegram.match(/Cabin A(\d{3})/)[1];
  assert.match(telegram, /BACK TO FRONT/);
  const code = [...cabin].reverse().join("");
  const outcome = game.enterCode(opener.id, code, clock.now);
  assert.equal(outcome.opened, true, "the worked-out code opens the case");
  people.forEach((p) => {
    if (!p.searches.act2) game.search(p.id, p.searches.act1 === "alleyway" ? "cabin" : "alleyway");
  });
  toPhase(game, clock, "accusation");
  run(game, clock, 6);
  const killer = game.killerSeat();
  for (const p of people) {
    const target = accuseKiller && p !== killer ? killer : game.seats.find((s) => s !== p && s !== killer);
    game.vote(p.id, target.id);
  }
  run(game, clock, 4);
  return { game, people, opener };
}

test("Dead Reckoning: a careful table can finish the case and catch the murderer", () => {
  for (const humans of [1, 2, 3, 4]) {
    for (let seed = 1; seed <= 6; seed += 1) {
      const { game } = detectiveEvening({ humans, seed });
      assert.equal(game.phase, "reveal");
      assert.ok(game.result.caught || humans === 1, `humans=${humans} seed=${seed}`);
      assert.ok(game.narration.some((n) => n.text === S.narration.reveal.at(-2)));
      assert.ok(game.narration.at(-1).text.startsWith("Thank you all for sailing"));
    }
  }
});

test("Dead Reckoning: by the vote, the table holds evidence for every step of the solution", () => {
  const { game, people } = detectiveEvening({ humans: 3, seed: 2 });
  const held = new Set(people.flatMap((p) => p.clues.map((c) => c.id)));
  for (const e of game.evidence) held.add(e.id);
  for (const p of people) held.add(`knows:${p.characterId}`);
  held.add("envelope.front");
  held.add("envelope.back");
  for (const step of S.solution.steps) {
    assert.ok(step.evidence.some(([ref]) => held.has(ref)), `nobody could show: ${step.claim}`);
  }
});

test("Dead Reckoning: the reveal and scores follow the votes", () => {
  const caught = detectiveEvening({ humans: 4, seed: 3 }).game;
  assert.equal(caught.result.caught, true);
  const escaped = detectiveEvening({ humans: 4, seed: 3, accuseKiller: false }).game;
  assert.equal(escaped.result.caught, false);
  const killerScore = escaped.result.scores.find((s) => s.seatId === escaped.killerSeat().id);
  assert.ok(killerScore.points >= 3);
  const reveal = caught.hostView().reveal;
  assert.equal(reveal.lies.length, 4);
  assert.ok(reveal.twist);
});

test("Dead Reckoning: the special scoring line pays out for escaping blame and for a correct accusation", () => {
  const { game } = detectiveEvening({ humans: 4, seed: 5 });
  const special = game.result.scores.find((s) => s.seatId === game.decoySeat().id);
  const labels = special.lines.map(([l]) => l);
  assert.ok(labels.includes("Nobody pinned it on you"));
  assert.ok(labels.includes("Accused the real murderer"));
  assert.equal(special.points, 4);
});

test("Dead Reckoning: the reveal names the right seats in its narration", () => {
  const { game } = detectiveEvening({ humans: 3, seed: 4 });
  const line = game.narration.find((n) => n.text.includes("put him over") || n.text.includes("who put him"));
  assert.ok(line);
  assert.ok(line.text.includes(game.label(game.decoySeat())));
  assert.ok(!game.narration.some((n) => n.text.includes("{decoy}")));
});

// --------------------------------------------------------- ship's rules

test("Dead Reckoning: crew-only places are closed to passengers until Act Two", () => {
  for (let seed = 1; seed <= 8; seed += 1) {
    const { game, clock } = play({ humans: 4, seed });
    toPhase(game, clock, "act1");
    const crew = game.seats.filter((s) => S.characters.find((c) => c.id === s.characterId).crew);
    const passengers = game.seats.filter((s) => !crew.includes(s));
    assert.ok(crew.length >= 1 && passengers.length >= 1);
    const view = game.playerView(passengers[0].id).actions.search.rooms.find((r) => r.id === "alleyway");
    assert.equal(view.open, false);
    assert.ok(view.note);
    assert.throws(() => game.search(passengers[0].id, "alleyway"), GameError);
    assert.equal(game.playerView(crew[0].id).actions.search.rooms.find((r) => r.id === "alleyway").open, true);
    game.search(crew[0].id, "alleyway");
    toPhase(game, clock, "act2");
    assert.equal(game.playerView(passengers[0].id).actions.search.rooms.find((r) => r.id === "alleyway").open, true);
    game.search(passengers[0].id, "alleyway");
  }
});

test("Dead Reckoning: searching someone's place warns them, but never says who", () => {
  const { game, clock } = play({ humans: 3, seed: 3 });
  toPhase(game, clock, "act1");
  const owner = seatPlaying(game, "quill");
  const searcher = game.seats.find((s) => s !== owner);
  const before = owner.inbox.length;
  game.search(searcher.id, "smoking");
  const warning = owner.inbox.slice(before).find((i) => i.text.startsWith("Someone has searched"));
  assert.ok(warning);
  assert.ok(!warning.text.includes(searcher.name));
});

test("Dead Reckoning: Cecil's timed private word arrives in Act Two", () => {
  const { game, clock } = play({ humans: 3, seed: 1 });
  toPhase(game, clock, "act2");
  const [w] = S.whispers;
  const target = seatPlaying(game, w.to);
  run(game, clock, w.at - 2);
  assert.ok(!target.inbox.some((i) => i.text === w.text));
  run(game, clock, 3);
  assert.ok(target.inbox.some((i) => i.text === w.text));
  for (const other of game.seats.filter((s) => s !== target)) assert.ok(!other.inbox.some((i) => i.text === w.text));
});

test("Dead Reckoning: the telegram goes to someone who can use it", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const { game, clock } = play({ humans: 3, seed });
    toPhase(game, clock, "act2");
    run(game, clock, S.envelope.at + 1);
    const opener = game.seat(game.envelope.openerSeatId);
    assert.equal(opener.kind, "human");
    assert.ok(![S.killer, S.decoy].includes(opener.characterId));
  }
});

test("Dead Reckoning: late in the game Cecil must hand a real clue to someone hunting the murderer", () => {
  const { game, clock } = play({ humans: 3, seed: 9 });
  toPhase(game, clock, "act2");
  const moves = game.mischiefMoves("a2a");
  assert.ok(moves.length > 0);
  for (const move of moves) {
    assert.equal(move.type, "extra_clue");
    assert.equal(S.clues[move.clueId].strength, "key");
    assert.ok(![S.killer, S.decoy].includes(game.seat(move.target).characterId));
  }
});

test("Dead Reckoning: Cecil makes three different kinds of mischief across the two acts", () => {
  const { game, clock, people } = play({ humans: 2 });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "accusation");
  assert.equal(game.mischiefLog.length, 3);
  assert.equal(new Set(game.mischiefLog.map((m) => m.type)).size, 3);
});

test("Dead Reckoning: Cecil's answers follow the fact table, and locked facts stay locked", () => {
  const { game, clock, people } = play({ humans: 2, seed: 2 });
  toPhase(game, clock, "act1");
  const q = game.presetQuestions();
  const index = (fact) => q.findIndex((x) => x.fact === fact);
  const [asker] = people;
  assert.equal(game.askPreset(asker.id, index("f_who")).status, "killer");
  assert.equal(game.askPreset(asker.id, index("f_kingsley_cabin")).status, "sealed");
  assert.equal(game.askPreset(asker.id, index("f_alive_overboard")).status, "locked");
  assert.equal(game.askPreset(asker.id, index("f_recording")).status, "later");
  assert.equal(game.askPreset(asker.id, index("f_clocks")).verdict, "yes");
  assert.throws(() => game.askPreset(asker.id, index("f_second")), /had your question/);
});

test("Dead Reckoning: every suggested question gets a proper answer from each seat's point of view", () => {
  const { game, clock, people } = play({ humans: 4, seed: 6 });
  toPhase(game, clock, "act2");
  for (const q of game.presetQuestions()) {
    const fact = S.facts.find((f) => f.id === q.fact);
    for (const p of people) assert.ok(["yes", "no", "sealed", "killer", "locked", "later"].includes(game.factStatus(p, fact)));
  }
});

test("Dead Reckoning: AI guests answer, and vote, in character", () => {
  const { game, clock, people } = play({ humans: 1, seed: 4 });
  toPhase(game, clock, "act1");
  for (const guest of game.seats.filter((s) => s.kind === "ai")) {
    const c = S.characters.find((x) => x.id === guest.characterId);
    game.questionGuestPreset(people[0].id, guest.id, 0);
    assert.equal(game.narration.at(-1).text, c.guest.presets[0].a);
  }
  toPhase(game, clock, "accusation");
  run(game, clock, 6);
  assert.ok(game.seats.filter((s) => s.kind === "ai").every((s) => s.vote));
});

// ---------------------------------------------------- information firewall

test("Dead Reckoning: the shared screen never shows a secret before the reveal", () => {
  for (const humans of [1, 2, 3, 4]) {
    for (let seed = 1; seed <= 4; seed += 1) {
      const { game, clock, people } = play({ humans, seed });
      const secrets = secretsFor(game.seats.map((s) => s.characterId), S);
      const check = () => {
        const view = game.hostView();
        for (const secret of secrets) assert.ok(!onScreen(view, secret), `leaked: ${secret.slice(0, 40)}`);
        assert.ok(!JSON.stringify(view).includes('"guilty"'));
        assert.ok(!JSON.stringify(view).includes("decoy"));
      };
      people.forEach((p) => game.markReady(p.id));
      while (game.phase !== "reveal") {
        run(game, clock, 5);
        if (game.phase === "act1" || game.phase === "act2") {
          for (const p of people) {
            const room = S.rooms[(seed + people.indexOf(p)) % S.rooms.length];
            if (!p.searches[game.phase] && game.canEnter(p, room)) game.search(p.id, room.id);
          }
          if (game.phase === "act2" && !game.dictaphone.openedBy && game.phaseElapsedMs > 30000) {
            game.enterCode(people[0].id, S.dictaphone.code, clock.now);
          }
        }
        if (game.phase === "accusation") {
          for (const p of people) if (!p.vote) game.vote(p.id, game.seats.find((s) => s !== p).id);
        }
        if (game.phase !== "reveal") check();
      }
    }
  }
});

test("Dead Reckoning: each phone only ever sees its own character's secrets", () => {
  const { game, clock, people } = play({ humans: 4, seed: 11 });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "accusation");
  for (const seat of game.seats) {
    const view = game.playerView(seat.id);
    for (const other of S.characters.filter((c) => c.id !== seat.characterId)) {
      assert.ok(!onScreen(view, other.dossier.secret), `${seat.characterId} saw ${other.id}'s secret`);
      for (const k of other.dossier.knows) assert.ok(!onScreen(view, k), `${seat.characterId} saw ${other.id}'s knowledge`);
    }
  }
});

test("Dead Reckoning: before the reveal, a phone's data says no more than its own dossier", () => {
  for (let seed = 1; seed <= 6; seed += 1) {
    const { game, clock, people } = play({ humans: 4, seed });
    people.forEach((p) => game.markReady(p.id));
    const killer = game.killerSeat();
    const special = game.decoySeat();
    const keys = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o).sort().join(",") : typeof o);
    for (const phase of ["prologue", "act1", "act2", "accusation"]) {
      toPhase(game, clock, phase);
      const kv = game.playerView(killer.id);
      const sv = game.playerView(special.id);
      // Same shape, same flags: nothing in the data tells these two phones apart.
      assert.equal(keys(sv.character), keys(kv.character));
      assert.equal(sv.character.guilty, true);
      assert.equal(kv.character.guilty, true);
      const json = JSON.stringify(sv);
      for (const text of [S.twist.headline, S.twist.detail, S.banners.killer, "decoy", "murderer\":", "killerSeatId"]) {
        assert.ok(!json.includes(text), `${phase}: ${text}`);
      }
      assert.ok(!JSON.stringify(kv).includes(S.banners.decoy));
      for (const p of game.seats.filter((s) => s !== killer && s !== special)) {
        const pv = game.playerView(p.id);
        assert.equal(pv.character.guilty, false);
        assert.equal(pv.character.banner, null);
      }
    }
  }
});

test("Dead Reckoning: special reveal text is only sent once the votes are in", () => {
  const { game, clock, people } = play({ humans: 3, seed: 2 });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "accusation");
  assert.equal(game.hostView().reveal, null);
  run(game, clock, 6);
  for (const p of people) if (!p.vote) game.vote(p.id, game.seats.find((s) => s !== p).id);
  run(game, clock, 4);
  assert.equal(game.phase, "reveal");
  const reveal = game.playerView(people[0].id).reveal;
  assert.deepEqual(reveal.twist, S.twist);
  assert.equal(reveal.decoySeatId, game.decoySeat().id);
});

test("Dead Reckoning: the case's recording and telegram back stay with whoever found them", () => {
  const { game, clock, people } = play({ humans: 3, seed: 5 });
  toPhase(game, clock, "act2");
  run(game, clock, S.envelope.at + 1);
  const opener = game.seat(game.envelope.openerSeatId);
  game.openEnvelope(opener.id);
  assert.ok(onScreen(game.hostView(), S.envelope.front));
  assert.ok(!onScreen(game.hostView(), S.envelope.back));
  const listener = people.find((p) => p !== opener);
  assert.equal(game.enterCode(listener.id, S.dictaphone.code, clock.now).opened, true);
  const line = S.dictaphone.transcript[3];
  assert.ok(onScreen(game.playerView(listener.id), line));
  for (const other of game.seats.filter((s) => s !== listener)) assert.ok(!onScreen(game.playerView(other.id), line));
  assert.ok(!onScreen(game.hostView(), line));
});

test("Dead Reckoning: a latecomer can still join a full table by replacing an AI guest", () => {
  const game = new Game({ scenario: S, code: "T", seed: 1, now: 0 });
  game.addHuman("A", "a");
  game.addGuest();
  game.addGuest();
  game.addGuest();
  game.addHuman("B", "b");
  assert.equal(game.seats.length, 4);
  game.start(0);
  assert.ok(seatPlaying(game, S.optional));
});

test("Dead Reckoning: an AI guest told to bluff says it out loud", () => {
  const { game, clock } = play({ humans: 1, seed: 1, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = mischiefTaskAt(game, clock, 150);
  const bluff = task.moves.find((m) => m.type === "bluff");
  bluff.target = game.seats.find((s) => s.kind === "ai").id;
  game.applyMischief(task.id, bluff.id);
  assert.ok(game.narration.some((n) => n.speaker === bluff.target));
});
