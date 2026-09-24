// Every moment the picture and the soundtrack share, in frames at 30 fps.
// Plain JavaScript, so the Remotion scenes and sound/telegram.mjs both import it.
//
// The arc: a dinner table of friends, every phone lighting up, and Cecil telling
// them one of them did it (and that he knows which). Where they are: four days
// from port, three miles of water under the keel, dinner as usual. Then the
// table itself, and Cecil's mischief: a private word to you about each friend in
// turn, and what each friend is playing tonight. "Only one of you is lying about
// murder." The title goes out in Morse, faster and faster towards the vote, and
// the trailer stops with your thumb over the names.

import { transmit } from "./morse.js";

export const FPS = 30;
export const seconds = (frame) => frame / FPS;

// Cecil's lines. `at` is when the file starts; `speech` is where the words start and end inside it, in seconds.
export const VOICE = {
  one: { file: "voice/telegram/one.wav", at: 26, speech: [0.07, 2.39] }, // "One of you killed Mortimer Crane."
  know: { file: "voice/telegram/know.wav", at: 186, speech: [0.07, 3.69] }, // "And I know... exactly which one."
  dreadful: { file: "voice/telegram/dreadful.wav", at: 300, speech: [0.07, 1.71] }, // "He was a dreadful man."
  passenger: { file: "voice/telegram/passenger.wav", at: 362, speech: [0.07, 2.33] }, // "But he was my passenger."
  land: { file: "voice/telegram/land.wav", at: 444, speech: [0.06, 1.99] }, // "Nearest land, three miles."
  down: { file: "voice/telegram/down.wav", at: 506, speech: [0.07, 0.81] }, // "Straight down."
  dinner: { file: "voice/telegram/dinner.wav", at: 578, speech: [0.07, 1.93] }, // "Dinner will be served as usual."
  tellme: { file: "voice/telegram/tellme.wav", at: 1634, speech: [0.07, 4.39] }, // "Tell me, privately. Who killed Mortimer Crane?"
};

// Telegram tape: the facts, typed out. `cps` is characters per second.
export const TAPES = {
  crane: { text: "MR MORTIMER CRANE OVER THE SIDE 0120 STOP", at: 300, cps: 18 },
  land: { text: "NEAREST LAND THREE MILES", at: 446, cps: 14 },
  down: { text: "STRAIGHT DOWN STOP", at: 508, cps: 18 },
};

// The four phones in the cold open light up one by one; the last is the one that says it.
export const PHONES = [112, 124, 136, 150];

// The dinner chimes, after "Dinner will be served as usual."
export const CHIMES = 640;

// What the shared screen (the TV at the end of the table) is showing.
export const SCREENS = {
  prologue: { phase: "Prologue", timer: "1:12", line: "Regrettably, Mr Mortimer Crane is no longer with us." },
  act1: { phase: "Act One · The Boat Deck", timer: "4:31", line: "I have had a private word with each of you. The Purser’s Bureau never really closes." },
  act2: { phase: "Act Two · The Recording", countdown: 59, line: "One minute. I’d start deciding whom to throw to the sharks." },
};

// Cecil's mischief, word for word as the game sends it: the friend's name in brackets after
// their character's. Each whisper comes in as its phone buzzes.
export const WHISPERS = {
  kingsley: { at: 676, text: "I have just told Miss Kingsley (Priya) something about you. Something true." },
  quill: { at: 808, text: "Ask Mr Quill (Jonah), in front of everyone, why their story has changed. It hasn’t. Yet." },
  ashdown: { at: 940, title: "A task from Cecil", text: "Within ninety seconds, get two other people to agree that Miss Ashdown (Ellie) looks seasick." },
};

// Who each friend is playing tonight, from the game's cast list.
export const CAST = {
  kingsley: { player: "Priya", name: "Miss Coral Kingsley", bio: "‘Britain’s sweetheart of 1949’, sailing for a Hollywood comeback." },
  quill: { player: "Jonah", name: "Mr Laurence Quill", bio: "A gentleman of independent means, travelling alone." },
  ashdown: { player: "Ellie", name: "Miss Penelope Ashdown", bio: "The Halcyon’s Social Hostess. Knows everyone’s name." },
};

// Cecil to the whole table, as the game has him say it.
export const THESIS = { at: 1044, second: 1082 };

// The transmission: "DEAD RECKONING" in Morse, one unit (a dit) every three frames: 150 bpm, a dit to a sixteenth.
export const UNIT = 3;
export const MORSE = transmit("DEAD RECKONING", 1136, UNIT);
export const HIT = MORSE.end + 9; // the title lands
// The picture for each letter, cut in as the letter starts. The three characters' faces go on
// letters of similar length, so nobody gets a longer look than the others.
export const LETTER_SHOTS = ["key", "banner", "glance", "table", "stare", "cecil", "quill", "ashdown", "kingsley", "deep", "whisper", "ship", "key"];

// The vote: the names under your thumb, then black, and a question mark in Morse.
export const VOTE = { from: 1628, to: 1776 };
export const QUESTION = transmit("?", 1784, UNIT);
export const END = 1900;
export const HERO = 612; // the page's still, and where its silent loop starts

// Where each scene sits, [from, to) in frames. Neighbours overlap by a short cross-fade.
export const SCENES = {
  table: [14, 112],
  phones: [104, 192],
  cecil: [184, 300],
  ship: [292, 374],
  wake: [366, 446],
  chart: [438, 508],
  deep: [506, 584],
  dinner: [576, 680],
  whisperKingsley: [672, 744],
  glance: [738, 776],
  kingsley: [770, 812],
  whisperQuill: [804, 876],
  stare: [870, 908],
  quill: [902, 944],
  whisperAshdown: [936, 1008],
  ashdown: [1002, 1046],
  thesis: [1038, MORSE.letters[0].from],
  transmit: [MORSE.letters[0].from - 6, HIT + 4],
  title: [HIT, 1572],
  sharks: [1566, VOTE.from + 6],
  vote: [VOTE.from, VOTE.to],
  endcard: [1826, END],
};
