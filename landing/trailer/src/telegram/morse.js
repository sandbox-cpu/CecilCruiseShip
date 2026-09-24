// International Morse code, and when each dit and dah sounds when a message is
// sent by hand at a steady speed. Plain JavaScript: the picture and the
// soundtrack (sound/telegram.mjs) both use it, so what you see is what you hear.

export const CODE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--",
  N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};

/**
 * Send `text` starting at `start`, one `unit` per dit (frames or seconds, whichever you pass).
 * A dah lasts three units; parts of a letter are one unit apart, letters three, words seven.
 * Returns every tone ({ from, to, dah }), every letter ({ char, from, to, marks }) and when it ends.
 */
export function transmit(text, start, unit) {
  const tones = [];
  const letters = [];
  let t = start;
  let first = true;
  for (const word of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    [...word].forEach((char, i) => {
      if (!first) t += unit * (i === 0 ? 7 : 3);
      first = false;
      const marks = CODE[char];
      if (!marks) throw new Error(`No Morse for "${char}"`);
      const from = t;
      [...marks].forEach((mark, j) => {
        if (j) t += unit;
        const dah = mark === "-";
        tones.push({ from: t, to: t + unit * (dah ? 3 : 1), dah, letter: letters.length });
        t += unit * (dah ? 3 : 1);
      });
      letters.push({ char, from, to: t, marks });
    });
  }
  return { tones, letters, end: t };
}
