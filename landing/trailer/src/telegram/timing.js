// Every moment the picture and the soundtrack share, in frames at 30 fps.
// Plain JavaScript, so the Remotion scenes and sound/telegram.mjs both import it.
//
// The arc: a dinner table of friends, every phone lighting up. Four friends,
// four secrets, one murderer, and Cecil knows which. Where they are: three miles
// of water under the keel, dinner as usual. Then the table itself, and Cecil's
// mischief: a private word to you about each friend in turn, and who each friend
// is playing tonight. "Only one of you is lying about murder." The title goes out
// in Morse, faster and faster towards the vote, and the trailer stops with your
// thumb over the names.
//
// The trailer is built as a run of beats, each with a length; everything inside a
// beat is timed from its start. Change a length and everything after it moves.

import { transmit } from "./morse.js";

export const FPS = 30;
export const seconds = (frame) => frame / FPS;
export const UNIT = 3; // one Morse dit, in frames: 150 bpm, a dit to a sixteenth

const OVERLAP = 8; // each scene runs this far into the next, for the cross-fade

// The beats, in order, and how long each is on screen (frames).
const BEATS = [
  ["black", 18],
  ["table", 86],
  ["cardFriends", 24],
  ["phones", 46],
  ["cardSecrets", 24],
  ["guilty", 42],
  ["cardMurderer", 26],
  ["cecil", 124],
  ["ship", 62],
  ["wake", 74],
  ["chart", 62],
  ["deep", 60],
  ["dinner", 104],
  ["whisperKingsley", 72],
  ["kingsley", 44],
  ["whisperQuill", 72],
  ["quill", 44],
  ["whisperAshdown", 72],
  ["ashdown", 44],
  ["thesis", 84],
  ["transmit", 6 + 363 + 9], // a lead-in, "DEAD RECKONING" in Morse, a breath
  ["title", 56],
  ["sharks", 48],
  ["point", 40],
  ["vote", 148],
  ["hush", 44],
  ["endcard", 62],
];

/** Where each beat starts (frames). */
export const START = {};
{
  let t = 0;
  for (const [name, length] of BEATS) {
    START[name] = t;
    t += length;
  }
  START.end = t;
}
export const END = START.end;

// Where each scene sits, [from, to) in frames: its beat, plus a short overlap into the next.
// "black" and "hush" are empty, so they have no scene.
export const SCENES = {};
BEATS.forEach(([name, length], i) => {
  if (name === "black" || name === "hush") return;
  const last = i === BEATS.length - 1;
  SCENES[name] = [START[name], START[name] + length + (last ? 0 : OVERLAP)];
});

// The three cards in the cold open.
export const CARDS = { cardFriends: "Four friends.", cardSecrets: "Four secrets.", cardMurderer: "One murderer." };

// Phone buzzes in the dark, before the first picture.
export const BUZZES = [4, 12];
// Three phones light up one by one; then the fourth, on its own, is the one that says it.
export const PHONES = [4, 16, 28].map((f) => START.phones + f);
export const GUILTY = START.guilty + 3;

// Cecil's lines. `at` is when the file starts; `speech` is where the words start and end inside it, in seconds.
export const VOICE = {
  one: { file: "voice/telegram/one.wav", at: START.table + 8, speech: [0.07, 2.39] }, // "One of you killed Mortimer Crane."
  know: { file: "voice/telegram/know.wav", at: START.cecil + 6, speech: [0.07, 3.69] }, // "And I know... exactly which one."
  dreadful: { file: "voice/telegram/dreadful.wav", at: START.ship + 4, speech: [0.07, 1.71] }, // "He was a dreadful man."
  passenger: { file: "voice/telegram/passenger.wav", at: START.wake + 2, speech: [0.07, 2.33] }, // "But he was my passenger."
  land: { file: "voice/telegram/land.wav", at: START.chart + 2, speech: [0.06, 1.99] }, // "Nearest land, three miles."
  down: { file: "voice/telegram/down.wav", at: START.deep, speech: [0.07, 0.81] }, // "Straight down."
  dinner: { file: "voice/telegram/dinner.wav", at: START.dinner + 2, speech: [0.07, 1.93] }, // "Dinner will be served as usual."
  tellme: { file: "voice/telegram/tellme.wav", at: START.vote + 6, speech: [0.07, 4.39] }, // "Tell me, privately. Who killed Mortimer Crane?"
};

// Telegram tape: the facts, typed out. `cps` is characters per second.
export const TAPES = {
  crane: { text: "MR MORTIMER CRANE OVER THE SIDE 0120 STOP", at: START.ship + 2, cps: 20 },
  land: { text: "NEAREST LAND THREE MILES", at: START.chart + 4, cps: 14 },
  down: { text: "STRAIGHT DOWN STOP", at: START.deep + 2, cps: 18 },
};

// The dinner chimes, after "Dinner will be served as usual."
export const CHIMES = START.dinner + 64;

// What the shared screen (the TV at the end of the table) is showing.
export const SCREENS = {
  prologue: { phase: "Prologue", timer: "1:12", line: "Regrettably, Mr Mortimer Crane is no longer with us." },
  act1: { phase: "Act One · The Boat Deck", timer: "4:31", line: "I have had a private word with each of you. The Purser’s Bureau never really closes." },
  act2: { phase: "Act Two · The Recording", countdown: 59, line: "One minute. I’d start deciding whom to throw to the sharks." },
};

// Cecil's mischief, word for word as the game sends it: the friend's name in brackets after
// their character's. Each whisper comes in as its phone buzzes.
export const WHISPERS = {
  kingsley: { at: START.whisperKingsley + 4, text: "I have just told Miss Kingsley (Priya) something about you. Something true." },
  quill: { at: START.whisperQuill + 4, text: "Ask Mr Quill (Jonah), in front of everyone, why their story has changed. It hasn’t. Yet." },
  ashdown: { at: START.whisperAshdown + 4, title: "A task from Cecil", text: "Within ninety seconds, get two other people to agree that Miss Ashdown (Ellie) looks seasick." },
};

// Who each friend is playing tonight, from the game's cast list.
export const CAST = {
  kingsley: { player: "Priya", name: "Miss Coral Kingsley", bio: "‘Britain’s sweetheart of 1949’, sailing for a Hollywood comeback." },
  quill: { player: "Jonah", name: "Mr Laurence Quill", bio: "A gentleman of independent means, travelling alone." },
  ashdown: { player: "Ellie", name: "Miss Penelope Ashdown", bio: "The Halcyon’s Social Hostess. Knows everyone’s name." },
};

// Cecil to the whole table, as the game has him say it.
export const THESIS = { at: START.thesis + 6, second: START.thesis + 42 };

// The transmission: "DEAD RECKONING" in Morse.
export const MORSE = transmit("DEAD RECKONING", START.transmit + 6, UNIT);
export const HIT = START.title; // the title lands
// The picture for each letter, cut in as the letter starts. The three characters' faces go on
// letters of similar length, so nobody gets a longer look than the others.
export const LETTER_SHOTS = ["key", "banner", "glance", "table", "stare", "cecil", "quill", "ashdown", "kingsley", "deep", "whisper", "ship", "key"];

// The vote: the names under your thumb, then nothing, and a question mark in Morse.
export const VOTE = { from: START.vote, to: START.hush };
export const QUESTION = transmit("?", START.hush + 6, UNIT);
export const HERO = START.dinner + 36; // the page's still, and where its silent loop starts
