// Dead Reckoning and the AI layer, with a fake Claude client: no network, no
// paid calls. Cecil's prompt, the guests' prompts and the leak guard.

import { test } from "node:test";
import assert from "node:assert/strict";

import { CecilAi, cecilRules, resolveTask } from "../server/ai/cecil.js";
import { vetCecilLine, vetGuestLine } from "../server/ai/guard.js";
import { halcyon as S, mischiefTaskAt, startGame, toPhase } from "./helpers.js";

function fakeClient(...replies) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        async create(params) {
          requests.push(params);
          const next = replies.shift();
          if (next instanceof Error) throw next;
          const text = typeof next === "string" ? next : JSON.stringify(next);
          return { stop_reason: "end_turn", content: [{ type: "text", text }] };
        },
      },
    },
  };
}

const quietLog = { warn() {} };
const aiGame = (options = {}) => {
  const setup = startGame({ scenario: S, humans: 2, aiEnabled: true, ...options });
  toPhase(setup.game, setup.clock, "act1");
  return setup;
};

test("Dead Reckoning: Cecil's prompt casts him as Chief Purser, with this case's extra rules", async () => {
  const rules = cecilRules(S);
  assert.ok(rules.startsWith("You are Cecil, the Chief Purser of the SS Halcyon"));
  for (const rule of S.cecil.rules) assert.ok(rules.includes(rule));
  assert.ok(rules.includes(S.cecil.never));

  const { game, people } = aiGame();
  const client = fakeClient({ fact_id: "none", reply: "I beg your pardon?" });
  await resolveTask(game, game.askFree(people[0].id, "Hmm?"), new CecilAi({ client }), quietLog);
  const system = client.requests[0].system[0].text;
  for (const c of S.characters) assert.ok(system.includes(c.dossier.secret), c.id);
  assert.ok(system.includes("THE MURDERER"));
  assert.ok(system.includes(S.dictaphone.code));
});

test("Dead Reckoning: an AI guest's prompt holds its own secrets and nobody else's", async () => {
  for (let seed = 1; seed <= 6; seed += 1) {
    const { game, people } = aiGame({ humans: 1, seed });
    for (const guest of game.seats.filter((s) => s.kind === "ai")) {
      const client = fakeClient({ answer: "I was on deck, admiring the rain." });
      const task = game.questionGuestFree(people[0].id, guest.id, "Where were you?");
      await resolveTask(game, task, new CecilAi({ client }), quietLog);
      const everything = JSON.stringify(client.requests[0]);
      const own = S.characters.find((c) => c.id === guest.characterId);
      assert.ok(everything.includes(JSON.stringify(own.dossier.secret).slice(1, -1)));
      assert.ok(everything.includes("aboard the SS Halcyon"));
      for (const other of S.characters.filter((c) => c.id !== own.id)) {
        assert.ok(!everything.includes(JSON.stringify(other.dossier.secret).slice(1, -1)), `${own.id} saw ${other.id}`);
      }
      for (const word of ["THE MURDERER", "decoy", "DECOY", S.twist.headline]) assert.ok(!everything.includes(word), word);
    }
  }
});

test("Dead Reckoning: guilty AI guests who confess are overruled by the script", async () => {
  const confessions = {
    [S.killer]: "Fine. I hit him with the ashtray and moved him in the trolley.",
    [S.decoy]: "Very well, darling. I pushed him over the rail.",
  };
  for (const [characterId, line] of Object.entries(confessions)) {
    let checked = false;
    for (let seed = 1; seed <= 60 && !checked; seed += 1) {
      const { game, people } = aiGame({ humans: 1, seed });
      const guest = game.seats.find((s) => s.kind === "ai" && s.characterId === characterId);
      if (!guest) continue;
      const client = fakeClient({ answer: line });
      const task = game.questionGuestFree(people[0].id, guest.id, "Where were you at twenty past one?");
      await resolveTask(game, task, new CecilAi({ client }), quietLog);
      const said = game.narration.at(-1).text;
      assert.notEqual(said, line);
      assert.equal(said, S.characters.find((c) => c.id === characterId).guest.presets[0].a);
      checked = true;
    }
    assert.ok(checked, `no seed cast ${characterId} as an AI guest`);
  }
});

test("Dead Reckoning: the leak guard", () => {
  const v = (line) => vetCecilLine(line, S);
  // Naming the murderer next to guilt, the motive, the code, or the twist: all rejected.
  assert.equal(v("Miss Ashdown struck him down."), null);
  assert.equal(v("Penelope moved the body, you know."), null);
  assert.equal(v("Ask yourselves about the Hartley affair."), null);
  assert.equal(v("Try eight, two, one."), null);
  assert.equal(v("The case opens on 821."), null);
  assert.equal(v("Mr Crane was already dead, of course."), null);
  assert.equal(v("The murderer is among you."), null);
  // Harmless lines pass.
  assert.equal(v("Miss Ashdown takes her gin with a twist of lemon."), "Miss Ashdown takes her gin with a twist of lemon.");
  assert.equal(v("The sea keeps its own counsel."), "The sea keeps its own counsel.");

  const g = (line, who) => vetGuestLine(line, { ...who, scenario: S });
  assert.equal(g("I pushed him, if you must know.", { isDecoy: true }), null);
  assert.equal(g("It was me.", { isKiller: true }), null);
  assert.equal(g("I was dancing, darling.", { isDecoy: true }), "I was dancing, darling.");
  assert.equal(g("The code is 821.", {}), null);
  assert.equal(g("I heard a woman in his cabin.", {}), "I heard a woman in his cabin.");
});

test("Dead Reckoning: an AI reply that gives the twist away is replaced, but the verdict stands", async () => {
  const { game, people } = aiGame();
  const asker = people[0];
  // Let this player hold the recording, so the fact is unlocked.
  game.dictaphone.heardBy.add(asker.id);
  const client = fakeClient({ fact_id: "f_alive_overboard", reply: "No. He was already dead when he went over." });
  await resolveTask(game, game.askFree(asker.id, "Was he alive?"), new CecilAi({ client }), quietLog);
  const text = asker.inbox.at(-1).text;
  assert.ok(text.startsWith("No."), text);
  assert.ok(!/already dead/i.test(text), text);
});

test("Dead Reckoning: mischief chosen by the AI is applied with its own words, vetted", async () => {
  const { game, clock } = aiGame();
  const task = mischiefTaskAt(game, clock, 150);
  const blank = task.moves.find((m) => m.type === "blank");
  const client = fakeClient({ move_id: blank.id, private_line: "Say nothing.", public_line: "Somebody here looks a little green about the gills." });
  await resolveTask(game, task, new CecilAi({ client }), quietLog);
  assert.ok(game.seat(blank.target).inbox.at(-1).text.startsWith("Say nothing."));
  assert.equal(game.narration.at(-1).text, "Somebody here looks a little green about the gills.");
});
