// Every moment the picture and the soundtrack share, in frames at 30 fps.
// Plain JavaScript, so the Remotion scenes and sound/telegram.mjs both import it.
//
// The trailer is a telegram. In the small hours Cecil walks into the wireless
// room and dictates one, line by line; each line comes up on telegram tape over
// the pictures. When he says "Send it", the operator keys the title in Morse, one
// cut per letter, and the soundtrack's pulse is the Morse itself: a dit is one
// sixteenth at 150 bpm.

import { transmit } from "./morse.js";

export const FPS = 30;
export const seconds = (frame) => frame / FPS;

// Tape: typed lines of the telegram. `cps` is characters per second.
export const TAPES = {
  position: { text: "CECIL HAS TAKEN UP A NEW POSITION STOP", at: 12, cps: 20 },
  regret: { text: "REGRET TO REPORT", at: 246, cps: 13 },
  crane: { text: "MR MORTIMER CRANE OVER THE SIDE 0120 STOP", at: 292, cps: 13 },
  port: { text: "NEAREST PORT FOUR DAYS STOP", at: 422, cps: 16 },
  land: { text: "NEAREST LAND THREE MILES", at: 496, cps: 14 },
  down: { text: "STRAIGHT DOWN STOP", at: 568, cps: 18 },
  murderer: { text: "MURDERER BELIEVED TO BE ABOARD STOP", at: 722, cps: 17 },
  passengers: { text: "PASSENGERS WILL KINDLY NOT DISEMBARK STOP", at: 808, cps: 17 },
  dinner: { text: "DINNER AS USUAL STOP", at: 1382, cps: 12 },
};
/** The frame a tape line finishes typing. */
export const typedBy = (tape) => tape.at + Math.ceil((tape.text.length / tape.cps) * FPS);

// Cecil's lines. `at` is when the file starts; `speech` is where the words start and end inside it, in seconds.
export const VOICE = {
  sparks: { file: "voice/telegram/sparks.wav", at: 104, speech: [0.09, 0.76] }, // "Sparks."
  take: { file: "voice/telegram/take.wav", at: 140, speech: [0.08, 1.86] }, // "Take a telegram, would you?"
  regret: { file: "voice/telegram/regret.wav", at: 244, speech: [0.07, 1.23] }, // "Regret to report."
  crane: { file: "voice/telegram/crane.wav", at: 290, speech: [0.07, 3.29] }, // "Mr Mortimer Crane went over the side at twenty past one."
  port: { file: "voice/telegram/port.wav", at: 420, speech: [0.07, 1.86] }, // "Nearest port, four days."
  land: { file: "voice/telegram/land.wav", at: 494, speech: [0.06, 1.99] }, // "Nearest land, three miles."
  down: { file: "voice/telegram/down.wav", at: 566, speech: [0.07, 0.81] }, // "Straight down."
  murderer: { file: "voice/telegram/murderer.wav", at: 720, speech: [0.07, 1.98] }, // "Murderer believed to be aboard."
  passengers: { file: "voice/telegram/passengers.wav", at: 806, speech: [0.06, 2.56] }, // "Passengers will kindly not disembark."
  send: { file: "voice/telegram/send.wav", at: 918, speech: [0.06, 0.55] }, // "Send it."
  dinner: { file: "voice/telegram/dinner.wav", at: 1380, speech: [0.07, 1.93] }, // "Dinner will be served as usual."
};

// Sparks acknowledges the order with an "R" (received) on the key.
export const ROGER = transmit("R", 206, 3);

// The chart: the pencil track to tonight's position, four days to run, then the depth under the keel.
export const CHART = { from: 396, track: [6, 40], run: [30, 56], days: [44, 84], zoom: [92, 140], sounding: 112, ring: [122, 142] };
export const DEEP = 566; // "Straight down": under the ship
export const DEFINITION = 606; // what dead reckoning means

// Persons aboard: a stamp on each face.
export const STAMPS = [728, 740, 752, 764];
export const LIGHTNING = 814;
export const THUNDER = 832;

// The transmission: "DEAD RECKONING" in Morse, one unit (a dit) every three frames.
export const UNIT = 3;
export const MORSE = transmit("DEAD RECKONING", 950, UNIT);
export const HIT = MORSE.end + 9; // the title lands
export const CHIMES = 1448; // the stewards' dinner chimes
export const COMING_SOON = 1446;
export const END = 1540;
export const HERO = 214; // the page's still, and where its silent loop starts

// Where each scene sits, [from, to) in frames. Neighbours overlap by a short cross-fade.
export const SCENES = {
  opening: [0, 118],
  wireless: [100, 238],
  wake: [228, 404],
  chart: [CHART.from, DEEP + 6],
  deep: [DEEP, 712],
  aboard: [706, 800],
  porthole: [794, 906],
  send: [900, 952],
  transmit: [944, HIT + 4],
  title: [HIT, END],
};

// The picture for each letter of the transmission, cut in as the letter starts. Letters last
// different lengths, so the four faces go on letters of similar length: nobody gets the longest look.
export const LETTER_SHOTS = ["key", "porthole", "staircase", "ballroom", "kingsley", "wake", "cecil", "quill", "deep", "ashdown", "ship", "pryce", "key"];
