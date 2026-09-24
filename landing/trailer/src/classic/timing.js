// Every moment the picture and the soundtrack share, in frames at 30 fps.
// Plain JavaScript, so the Remotion scenes and sound/classic.mjs both import it.
//
// Act one is told in sound over a quiet score: the sea, Cecil's footsteps, the
// bell on the Purser's desk, then a clock that runs to two and back to one, and
// the ship's whistle at twenty past one, the second time.
//
// The music then runs at 120 bpm: one beat every 15 frames. The dramatic section's
// first downbeat is DOWNBEAT, and everything that ticks, buzzes or cuts in act two
// lands on that grid, so the clock, the music and the pictures stay locked together.

export const FPS = 30;
export const BEAT = 15;
export const DOWNBEAT = 508;
export const beat = (n) => DOWNBEAT + n * BEAT;
export const seconds = (frame) => frame / FPS;

// Act one: the ship, Cecil, the hour that happened twice, the sea.
export const FOOTSTEPS = [138, 157, 176, 195, 214, 231]; // measured steps down the corridor, stopping at the Bureau
export const CECIL_CUT = FOOTSTEPS[1]; // we cut to Cecil walking on his second step
export const FEET_TOGETHER = 237;
export const DESK_BELL = 243; // the brass bell on the Purser's counter

// The clock over No. 7 lifeboat: from 1.05 it runs to two, strikes, spins back an hour, and runs on to twenty past one.
export const CLOCK = {
  start: 232, // hands begin at 1.05
  two: 298, // 2.00: the clocks go back
  rewindFrom: 306,
  rewindTo: 328, // back at 1.00
  twenty: 364, // 1.20, the second time
};
export const CLOCK_TICKS = [240, 256, 269, 280, 289, 295]; // gathering pace towards two
export const CLOCK_TICKS_AGAIN = [336, 350]; // slower, the second time through
export const WHISTLE = CLOCK.twenty; // the ship's whistle: man overboard
export const SPLASH = WHISTLE + 20;

// Act two: the screens, the suspects, the whispers.
export const SUSPECTS = [11, 13, 15, 17].map(beat); // a face on each drum hit
export const LINEUP = beat(19); // all four together: "Everyone has something to hide."
export const PHONE_BUZZES = [beat(6), beat(21), beat(23), beat(25)];
export const RISE = beat(26);
export const HIT = beat(30); // the title lands

// The small clock that fades in and out over act two: the search, through the night.
export const CLOCK_SHOWINGS = [
  { from: beat(0) + 3, to: beat(4) + 12, hour: 1, minute: 30 },
  { from: beat(5) + 12, to: beat(10) + 6, hour: 2, minute: 30 },
  { from: beat(11) + 6, to: beat(15) + 12, hour: 3, minute: 30 },
  { from: beat(16) + 6, to: beat(20) + 6, hour: 4, minute: 30 },
  { from: beat(21) + 6, to: HIT, hour: 5, minute: 30 },
];

// The title: Cecil speaks, at last. Each line's `at` is when its file starts playing;
// `speech` is where the words start and end inside the file, in seconds.
export const VOICE = {
  host: { file: "voice/classic/cecil-host.wav", at: HIT + 30, speech: [0.05, 6.6] }, // "Good evening. I am Cecil, Chief Purser of the Halcyon, and I shall be your host this evening."
  seat: { file: "voice/classic/cecil-seat.wav", at: HIT + 250, speech: [0.05, 3.59] }, // "Do find your seat, and keep your hands inside the rail."
};
export const COMING_SOON = VOICE.seat.at; // the "Coming soon" card appears with the invitation
export const END = VOICE.seat.at + Math.round((VOICE.seat.speech[1] + 1.6) * FPS); // a breath after the last word

export const SCENES_SEA_END = DOWNBEAT + 5;

// Where each scene sits, [from, to) in frames. Neighbours overlap by a short cross-fade.
export const SCENES = {
  opening: [0, 96],
  ship: [82, CECIL_CUT + 14],
  cecil: [CECIL_CUT, 246],
  clock: [232, 398],
  sea: [384, SCENES_SEA_END],
  screens: [DOWNBEAT - 9, DOWNBEAT + 171],
  suspects: [SUSPECTS[0] - 7, beat(21) + 6],
  whispers: [beat(21) - 8, HIT - 7 + 14],
  title: [HIT - 7, END],
};
