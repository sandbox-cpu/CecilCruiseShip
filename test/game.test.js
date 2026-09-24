import { test } from "node:test";
import assert from "node:assert/strict";

import { Game, GameError } from "../server/game.js";
import { mischiefTaskAt, run, scenario, seatPlaying, secretsFor, startGame, toPhase } from "./helpers.js";

// ------------------------------------------------------------------ lobby

test("AI guests fill the table when only two people join", () => {
  const { game } = startGame({ humans: 2 });
  assert.equal(game.seats.length, 3);
  assert.equal(game.seats.filter((s) => s.kind === "ai").length, 1);
  assert.deepEqual(game.seats.map((s) => s.characterId).sort(), ["fenn", "hale", "vivienne"]);
});

test("a single human plays with two AI guests", () => {
  const { game } = startGame({ humans: 1 });
  assert.equal(game.seats.filter((s) => s.kind === "ai").length, 2);
});

test("four seats bring Captain Lyle into the cast", () => {
  const { game } = startGame({ humans: 4 });
  assert.deepEqual(game.seats.map((s) => s.characterId).sort(), ["fenn", "hale", "lyle", "vivienne"]);
  assert.equal(game.seats.every((s) => s.kind === "human"), true);
});

test("the host can seat a fourth AI guest", () => {
  const { game } = startGame({ humans: 2, guests: 2 });
  assert.equal(game.seats.length, 4);
  assert.ok(seatPlaying(game, "lyle"));
});

test("a latecomer takes an AI guest's seat when the table is full", () => {
  const game = new Game({ scenario, code: "T", seed: 1, now: 0 });
  game.addHuman("A", "a");
  game.addGuest();
  game.addGuest();
  game.addGuest();
  game.addHuman("B", "b");
  assert.equal(game.seats.length, 4);
  assert.equal(game.humans().length, 2);
});

test("lobby validation", () => {
  const game = new Game({ scenario, code: "T", seed: 1, now: 0 });
  assert.throws(() => game.start(0), GameError, "needs a human");
  assert.throws(() => game.addHuman("   ", "x"), /enter your name/);
  game.addHuman("Sam", "a");
  assert.throws(() => game.addHuman("sam", "b"), /already has that name/);
  for (const name of ["B", "C", "D"]) game.addHuman(name, name);
  assert.throws(() => game.addHuman("E", "e"), /full/);
  game.start(0);
  assert.throws(() => game.addHuman("F", "f"), /already started/);
});

test("the murderer's role can land on anyone, including an AI guest", () => {
  const killers = new Set();
  for (let seed = 1; seed <= 30; seed += 1) {
    const { game } = startGame({ humans: 2, seed });
    killers.add(game.killerSeat().kind);
  }
  assert.deepEqual([...killers].sort(), ["ai", "human"]);
});

// ------------------------------------------------------------------ flow

test("the prologue ends early once everyone has read their dossier", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  assert.equal(game.phase, "prologue");
  people.forEach((p) => game.markReady(p.id));
  run(game, clock, 4);
  assert.equal(game.phase, "act1");
});

test("phases follow the clock, and pausing stops it", () => {
  const { game, clock } = startGame({ humans: 2 });
  run(game, clock, scenario.durations.prologue);
  assert.equal(game.phase, "act1");
  game.pause();
  run(game, clock, 1000);
  assert.equal(game.phase, "act1");
  game.resume(clock.now);
  run(game, clock, scenario.durations.act1);
  assert.equal(game.phase, "act2");
  run(game, clock, scenario.durations.act2);
  assert.equal(game.phase, "accusation");
});

test("game speed scales every timer", () => {
  const clock = { now: 0 };
  const game = new Game({ scenario, code: "T", seed: 1, speed: 10, now: 0 });
  game.addHuman("A", "a");
  game.start(0);
  run(game, clock, Math.ceil(scenario.durations.prologue / 10));
  assert.equal(game.phase, "act1");
});

test("everyone gets a private dossier and Cecil's opening whisper", () => {
  const { game, clock } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  run(game, clock, 45);
  for (const seat of game.seats) {
    const texts = seat.inbox.map((i) => i.text);
    assert.ok(texts.some((t) => t.startsWith("You are ")), "dossier");
    assert.ok(texts.includes(scenario.mischief.openingWhisper[seat.characterId]), "opening whisper");
  }
});

// ---------------------------------------------------------------- actions

test("searching a room gives a private clue and warns the room's owner", () => {
  const { game, clock } = startGame({ humans: 3, seed: 3 });
  toPhase(game, clock, "act1");
  const fenn = seatPlaying(game, "fenn");
  const searcher = game.seats.find((s) => s !== fenn);
  const before = fenn.inbox.length;

  game.search(searcher.id, "office");

  assert.ok(searcher.clues.some((c) => c.id === "c_office"));
  assert.ok(fenn.inbox.slice(before).some((i) => i.text === "Someone has searched your office. You don't know who."));
  assert.ok(!JSON.stringify(game.hostView()).includes(searcher.name + " searched"));
  assert.throws(() => game.search(searcher.id, "hall"), /already searched/);
});

test("searches are allowed once per act", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  game.search(people[0].id, "hall");
  toPhase(game, clock, "act2");
  game.search(people[0].id, "office");
  assert.equal(people[0].clues.filter((c) => c.id.startsWith("c_")).length, 2);
});

test("Cecil answers suggested questions from the fact table", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  const questions = game.presetQuestions();
  const index = (fact) => questions.findIndex((q) => q.fact === fact);
  const [asker] = people;

  // Sealed, murderer and "look first" questions don't use up your question.
  assert.equal(game.askPreset(asker.id, index("f_who")).status, "killer");
  assert.equal(game.askPreset(asker.id, index("f_vivienne_conservatory")).status, "sealed");
  assert.equal(game.askPreset(asker.id, index("f_tablets_missing")).status, "locked");
  assert.equal(game.askPreset(asker.id, index("f_recording")).status, "later");

  const answer = game.askPreset(asker.id, index("f_tray"));
  assert.equal(answer.verdict, "yes");
  assert.ok(asker.inbox.at(-1).text.startsWith("Yes."));
  assert.throws(() => game.askPreset(asker.id, index("f_glass")), /had your question/);
});

test("clue-gated facts open up once you hold the clue", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  const [asker] = people;
  const fact = scenario.facts.find((f) => f.id === "f_tablets_missing");
  assert.equal(game.factStatus(asker, fact), "locked");
  game.search(asker.id, "office");
  assert.equal(game.factStatus(asker, fact), "yes");
});

test("free-text questions need the AI and are queued for it", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  assert.throws(() => game.askFree(people[0].id, "Was the tray unattended?"), /suggested questions/);

  const ai = startGame({ humans: 2, aiEnabled: true });
  toPhase(ai.game, ai.clock, "act1");
  const task = ai.game.askFree(ai.people[0].id, "Was the tray left alone?");
  assert.equal(ai.game.drainTasks().at(-1), task);
  const entry = ai.game.answerAsk(task.id, { factId: "f_tray", reply: "Yes, for a quarter of an hour." });
  assert.equal(entry.verdict, "yes");
  assert.equal(ai.people[0].inbox.at(-1).text, "Yes. For a quarter of an hour.");
});

test("the fact table overrides an AI reply that contradicts it", () => {
  const { game, clock, people } = startGame({ humans: 2, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = game.askFree(people[0].id, "Did you poison him, Cecil?");
  game.answerAsk(task.id, { factId: "f_cecil", reply: "Yes, with relish." });
  const text = people[0].inbox.at(-1).text;
  assert.ok(text.startsWith("No."), text);
  assert.ok(!/relish|yes/i.test(text), text);
});

test("the AI can't make Cecil confirm a fact the asker hasn't earned", () => {
  const { game, clock, people } = startGame({ humans: 2, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = game.askFree(people[0].id, "Are tablets missing?");
  const entry = game.answerAsk(task.id, { factId: "f_tablets_missing", reply: "Yes, twenty-five." });
  assert.equal(entry.status, "locked");
  assert.equal(entry.verdict, null);
  assert.equal(game.askAllowance(people[0]), 1, "question not used up");
});

test("AI guests answer suggested questions out loud", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act1");
  const guest = game.seats.find((s) => s.kind === "ai");
  const preset = scenario.characters.find((c) => c.id === guest.characterId).guest.presets[0];
  game.questionGuestPreset(people[0].id, guest.id, 0);
  assert.equal(game.narration.at(-1).text, preset.a);
  assert.equal(game.narration.at(-1).speaker, guest.id);
  assert.ok(guest.memory.some((m) => m.includes(preset.q)), "the guest remembers being asked");
  assert.throws(() => game.questionGuestPreset(people[0].id, people[1].id, 0), /sitting right there/);
});

test("Envelope Two goes to an innocent human; only they see the back", () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const { game, clock } = startGame({ humans: 3, seed });
    toPhase(game, clock, "act2");
    run(game, clock, scenario.envelope.at + 1);
    const opener = game.seat(game.envelope.openerSeatId);
    assert.equal(opener.kind, "human");
    assert.notEqual(opener.characterId, scenario.killer);
    assert.equal(game.hostView().envelope.front, null);

    game.openEnvelope(opener.id);
    assert.equal(game.hostView().envelope.front, scenario.envelope.front);
    assert.ok(!JSON.stringify(game.hostView()).includes(scenario.envelope.back));
    assert.ok(JSON.stringify(game.playerView(opener.id)).includes("Service No. 314"));
    for (const other of game.seats.filter((s) => s !== opener)) {
      assert.ok(!JSON.stringify(game.playerView(other.id)).includes("Service No. 314"));
      assert.throws(() => game.openEnvelope(other.id), /hasn't asked you/);
    }
  }
});

test("the envelope opens itself if nobody gets round to it", () => {
  const { game, clock } = startGame({ humans: 2 });
  toPhase(game, clock, "act2");
  run(game, clock, scenario.envelope.at + 61);
  assert.equal(game.envelope.opened, true);
});

test("the dictaphone code: act two only, wrong codes rejected, cover whispers for everyone", () => {
  const { game, clock, people } = startGame({ humans: 3, seed: 5 });
  toPhase(game, clock, "act1");
  assert.throws(() => game.enterCode(people[0].id, "314", clock.now), /Act Two/);
  toPhase(game, clock, "act2");

  const opener = game.seats.find((s) => s.characterId !== scenario.killer && s.kind === "human");
  assert.equal(game.enterCode(opener.id, "123", clock.now).opened, false);
  assert.throws(() => game.enterCode(opener.id, "314", clock.now + 1000), /a moment/);

  const before = new Map(game.seats.map((s) => [s.id, s.whispers]));
  assert.equal(game.enterCode(opener.id, "3-1-4", clock.now + 4000).opened, true);
  assert.ok(opener.clues.some((c) => c.id === "dictaphone"));
  // Every other seat gets exactly one whisper, so the killer's can't stand out.
  for (const seat of game.seats.filter((s) => s !== opener)) {
    assert.equal(seat.whispers, before.get(seat.id) + 1);
  }
  assert.ok(!JSON.stringify(game.hostView()).includes("signing my name"));
  assert.throws(() => game.enterCode(opener.id, "314", clock.now + 9000), /already heard/);
});

// --------------------------------------------------------------- mischief

test("Cecil makes three mischief moves across the two acts", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "accusation");
  assert.equal(game.mischiefLog.length, 3);
  assert.equal(new Set(game.mischiefLog.map((m) => m.type)).size, 3, "three different kinds of mischief");
});

test("fairness: late in the game Cecil must hand an innocent a key clue", () => {
  const { game, clock } = startGame({ humans: 2, seed: 9 });
  toPhase(game, clock, "act2");
  const moves = game.mischiefMoves("a2a");
  assert.ok(moves.length > 0);
  for (const move of moves) {
    assert.equal(move.type, "extra_clue");
    assert.equal(scenario.clues[move.clueId].strength, "key");
    assert.notEqual(game.seat(move.target).characterId, scenario.killer);
  }
});

test("a move chosen by the AI is applied, with its own wording", () => {
  const { game, clock } = startGame({ humans: 2, seed: 2, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = mischiefTaskAt(game, clock, 150);
  const blank = task.moves.find((m) => m.type === "blank");
  game.applyMischief(task.id, blank.id, { privateLine: "Not a word.", publicLine: "I've had a quiet word with someone." });
  const target = game.seat(blank.target);
  assert.ok(target.inbox.at(-1).text.startsWith("Not a word."));
  assert.equal(game.narration.at(-1).text, "I've had a quiet word with someone.");
});

test("an unknown move from the AI falls back to a legal one", () => {
  const { game, clock } = startGame({ humans: 2, seed: 2, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = mischiefTaskAt(game, clock, 150);
  const applied = game.applyMischief(task.id, "m999");
  assert.ok(task.moves.includes(applied));
});

test("gossip tells the target a true fact, and tells the subject they were gossiped about", () => {
  const { game, clock } = startGame({ humans: 2, seed: 4, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = mischiefTaskAt(game, clock, 150);
  const gossip = task.moves.find((m) => m.type === "gossip");
  game.applyMischief(task.id, gossip.id);
  const about = game.seat(gossip.other);
  const gossipText = scenario.characters.find((c) => c.id === about.characterId).gossip;
  assert.ok(game.seat(gossip.target).inbox.at(-1).text.includes(gossipText));
  assert.ok(about.inbox.at(-1).text.startsWith("I have just told"));
});

test("an AI guest told to bluff does it out loud", () => {
  const { game, clock } = startGame({ humans: 1, seed: 1, aiEnabled: true });
  toPhase(game, clock, "act1");
  const task = mischiefTaskAt(game, clock, 150);
  const bluff = task.moves.find((m) => m.type === "bluff");
  bluff.target = game.seats.find((s) => s.kind === "ai").id;
  game.applyMischief(task.id, bluff.id);
  const spoken = game.narration.find((n) => n.speaker === bluff.target && /where you were|told me about you|story changed/.test(n.text));
  assert.ok(spoken, "the guest said the bluff out loud");
});

// ------------------------------------------------------------ the verdict

function playToVerdict({ humans, accuse }) {
  const { game, clock } = startGame({ humans, seed: 7 });
  toPhase(game, clock, "accusation");
  run(game, clock, 6); // AI guests vote at five seconds
  const killer = game.killerSeat();
  for (const seat of game.humans()) {
    const target = accuse === "killer" && seat !== killer ? killer : game.seats.find((s) => s !== seat && s !== killer);
    game.vote(seat.id, target.id);
  }
  run(game, clock, 4);
  return game;
}

test("catching the murderer", () => {
  const game = playToVerdict({ humans: 4, accuse: "killer" });
  assert.equal(game.phase, "reveal");
  assert.equal(game.result.caught, true);
  const killerScore = game.result.scores.find((s) => s.seatId === game.killerSeat().id);
  assert.equal(killerScore.points, 0);
  for (const score of game.result.scores.filter((s) => s.seatId !== game.killerSeat().id)) {
    assert.equal(score.points, 3);
  }
});

test("the murderer escapes a split vote", () => {
  const game = playToVerdict({ humans: 4, accuse: "someone else" });
  assert.equal(game.result.caught, false);
  const killerScore = game.result.scores.find((s) => s.seatId === game.killerSeat().id);
  assert.ok(killerScore.points >= 3);
});

test("voting rules", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "act2");
  assert.throws(() => game.vote(people[0].id, people[1].id), /isn't time/);
  toPhase(game, clock, "accusation");
  assert.throws(() => game.vote(people[0].id, people[0].id), /accuse yourself/);
});

test("AI guests vote, and the reveal explains everything", () => {
  const { game, clock, people } = startGame({ humans: 2 });
  toPhase(game, clock, "accusation");
  run(game, clock, 6);
  assert.ok(game.seats.filter((s) => s.kind === "ai").every((s) => s.vote));
  people.forEach((p) => game.vote(p.id, game.seats.find((s) => s !== p).id));
  run(game, clock, 4);
  const reveal = game.hostView().reveal;
  assert.equal(reveal.killerSeatId, game.killerSeat().id);
  assert.equal(reveal.lies.length, 3);
  assert.ok(game.narration.some((n) => n.text === "Daisy Fenn poisoned Sir Edmund Ravensmere."));
  assert.ok(game.narration.at(-1).text.startsWith("Thank you all for coming"));
});

// ---------------------------------------------------- information firewall

test("the shared screen never shows a secret before the reveal", () => {
  for (const humans of [1, 2, 3, 4]) {
    for (let seed = 1; seed <= 4; seed += 1) {
      const { game, clock, people } = startGame({ humans, seed });
      const secrets = secretsFor(game.seats.map((s) => s.characterId));
      const check = () => {
        const view = JSON.stringify(game.hostView());
        for (const secret of secrets) assert.ok(!view.includes(JSON.stringify(secret).slice(1, -1)), `leaked: ${secret}`);
        assert.ok(!view.includes('"murderer"'));
      };
      people.forEach((p) => game.markReady(p.id));
      while (game.phase !== "reveal") {
        run(game, clock, 5);
        if (game.phase === "act1" || game.phase === "act2") {
          for (const p of people) {
            if (!p.searches[game.phase]) game.search(p.id, scenario.rooms[(seed + people.indexOf(p)) % 4].id);
          }
          if (game.phase === "act2" && !game.dictaphone.openedBy && game.phaseElapsedMs > 30000) {
            game.enterCode(people[0].id, "314", clock.now);
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

test("each phone only ever sees its own character's secrets", () => {
  const { game, clock, people } = startGame({ humans: 4, seed: 11 });
  people.forEach((p) => game.markReady(p.id));
  toPhase(game, clock, "accusation");
  for (const seat of game.seats) {
    const view = JSON.stringify(game.playerView(seat.id));
    for (const other of scenario.characters.filter((c) => c.id !== seat.characterId)) {
      assert.ok(!view.includes(JSON.stringify(other.dossier.secret).slice(1, -1)), `${seat.characterId} saw ${other.id}'s secret`);
    }
    assert.equal(game.playerView(seat.id).character.guilty, seat.characterId === scenario.killer);
  }
});
