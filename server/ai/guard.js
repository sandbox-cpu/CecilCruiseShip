// The leak guard: every line the AI writes is checked here before any player
// sees it. A rejected line (null) makes the caller fall back to scripted text.
//
// Cecil knows the whole truth, so the guard looks for the ways that knowledge
// could escape: naming the murderer alongside guilt, giving away the drawer
// code, or mentioning the murderer's motive. It's deliberately conservative:
// a false positive only costs a less witty line.

const MAX_LENGTH = 320;
const GUILT = /\b(poison\w*|murder\w*|kill\w*|guilt\w*|culprit|did it|forg\w*|cheques?|embezzl\w*|crush\w*|stirr?\w*|tablets?)\b/i;
const NAMED_CULPRIT = /\b(the\s+)?(murderer|killer|culprit|poisoner)\s+(is|was)\b/i;
const MOTIVE = /\b(forg\w*|cheques?|embezzl\w*|signing (his|my) name)\b/i;
const CODE = /\b3\s*[-,.]?\s*1\s*[-,.]?\s*4\b|three[\s,-]+one[\s,-]+four/i;
const CONFESSION = /\b(i|we)\b[^.!?]{0,40}\b(poison\w*|kill\w*|murder\w*|crush\w*|stirr?ed|forg\w*|put (it|them|something) in)\b|\b(i did it|it was me|i confess)\b/i;

function tidy(text) {
  if (typeof text !== "string") return null;
  let clean = text.replace(/\s+/g, " ").trim().replace(/^["“']+|["”']+$/g, "").trim();
  if (!clean) return null;
  if (clean.length > MAX_LENGTH) {
    const cut = clean.slice(0, MAX_LENGTH);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    clean = end > 40 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  }
  return clean;
}

function sentences(text) {
  return text.split(/(?<=[.!?])\s+/);
}

function killerNames(scenario) {
  const killer = scenario.characters.find((c) => c.id === scenario.killer);
  const words = new Set([killer.short, ...killer.name.split(" ").filter((w) => !/^(miss|mr|mrs|dr|lady|sir|captain)$/i.test(w))]);
  return new RegExp(`\\b(${[...words].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
}

// A line Cecil will say, publicly or privately, before the reveal.
export function vetCecilLine(text, scenario) {
  const clean = tidy(text);
  if (!clean) return null;
  const names = killerNames(scenario);
  if (NAMED_CULPRIT.test(clean) || MOTIVE.test(clean) || CODE.test(clean)) return null;
  if (sentences(clean).some((s) => names.test(s) && GUILT.test(s))) return null;
  return clean;
}

// A line an AI guest says out loud, in character.
export function vetGuestLine(text, { isKiller }) {
  const clean = tidy(text);
  if (!clean) return null;
  if (CODE.test(clean)) return null;
  if (isKiller && (CONFESSION.test(clean) || MOTIVE.test(clean))) return null;
  return clean;
}

// Closing remarks after the reveal: the truth is out, so only tidy them.
export function vetClosing(text) {
  return tidy(text);
}
