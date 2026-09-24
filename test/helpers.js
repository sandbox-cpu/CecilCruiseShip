import { Game } from "../server/game.js";
import halcyon from "../server/scenario/halcyon.js";
import scenario from "../server/scenario/ravensmere.js";

// `scenario` is A Nightcap at Ravensmere, the case the original tests were written for.
export { halcyon, scenario };

// A started game with `humans` people (AI guests fill to three seats).
export function startGame({ humans = 2, seed = 1, aiEnabled = false, guests = 0, scenario: s = scenario } = {}) {
  const clock = { now: 0 };
  const game = new Game({ scenario: s, code: "TEST", seed, aiEnabled, now: clock.now });
  const people = [];
  for (let i = 0; i < humans; i += 1) people.push(game.addHuman(`Player ${i + 1}`, `token${i + 1}`));
  for (let i = 0; i < guests; i += 1) game.addGuest();
  game.start(clock.now);
  return { game, clock, people };
}

// Advance the game clock second by second, resolving AI work with the scripted fallback.
export function run(game, clock, seconds) {
  for (let i = 0; i < seconds; i += 1) {
    clock.now += 1000;
    game.tick(clock.now);
    game.resolveWithFallback();
  }
}

// Advance to `seconds` into the current phase and return the mischief task
// queued there, without letting the fallback resolve it.
export function mischiefTaskAt(game, clock, seconds) {
  run(game, clock, seconds - 1);
  clock.now += 1000;
  game.tick(clock.now);
  return game.drainTasks().find((t) => t.type === "mischief");
}

export function toPhase(game, clock, phase) {
  for (let i = 0; i < 2000 && game.phase !== phase; i += 1) run(game, clock, 1);
  if (game.phase !== phase) throw new Error(`never reached ${phase}`);
}

export function seatPlaying(game, characterId) {
  return game.seats.find((s) => s.characterId === characterId);
}

// Every piece of text that must never reach the shared screen before the reveal.
export function secretsFor(characterIds, s = scenario) {
  const texts = [];
  for (const c of s.characters.filter((x) => characterIds.includes(x.id))) {
    texts.push(c.dossier.secret, ...c.dossier.knows, c.reveal, c.gossip);
  }
  for (const clue of Object.values(s.clues)) texts.push(clue.text);
  texts.push(s.envelope.back, ...s.dictaphone.transcript.filter((l) => !l.startsWith("[")));
  for (const line of Object.values(s.mischief.openingWhisper)) texts.push(line);
  for (const w of s.whispers || []) texts.push(w.text);
  if (s.twist) texts.push(s.twist.headline, s.twist.detail);
  for (const banner of Object.values(s.banners || {})) texts.push(banner);
  return texts;
}
