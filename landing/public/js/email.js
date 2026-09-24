// Email checks shared by the browser form and the server.
//
// Deliberately practical rather than RFC-perfect: it accepts every address a
// real mailbox is likely to have, rejects the typing mistakes people actually
// make, and suggests a fix for common misspelt domains.

const MAX_LENGTH = 254;
const MAX_LOCAL = 64;

// Letters, digits and the punctuation mail providers allow before the @.
const LOCAL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
// Each domain label: letters/digits/hyphens (or punycode), no leading or trailing hyphen.
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i;

// Misspellings seen often enough to be worth a gentle "did you mean".
const DOMAIN_FIXES = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com",
  "googlemail.co": "googlemail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co.k": "hotmail.co.uk",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outloo.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co.k": "yahoo.co.uk",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
  "icoud.com": "icloud.com",
  "btinternet.con": "btinternet.com",
  "live.con": "live.com",
};

/** Trim, drop stray whitespace and lower-case the domain (the part mail servers treat case-insensitively). */
export function normaliseEmail(raw) {
  const trimmed = String(raw ?? "").trim().replace(/\s+/g, "");
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return trimmed;
  return `${trimmed.slice(0, at)}@${trimmed.slice(at + 1).toLowerCase()}`;
}

/** Key used to spot duplicates: the whole address lower-cased. */
export function emailKey(raw) {
  return normaliseEmail(raw).toLowerCase();
}

/**
 * Check an address. Returns { ok: true, email } or { ok: false, reason, message }.
 * Messages are written for the person filling in the form.
 */
export function checkEmail(raw) {
  const email = normaliseEmail(raw);
  const fail = (reason, message) => ({ ok: false, reason, message });

  if (!email) return fail("empty", "Cecil will need an email address.");
  if (email.length > MAX_LENGTH) return fail("too_long", "That address is too long to be real.");

  const parts = email.split("@");
  if (parts.length !== 2) {
    return parts.length < 2
      ? fail("no_at", "An email address needs an @.")
      : fail("many_at", "That address has more than one @.");
  }

  const [local, domain] = parts;
  if (!local) return fail("no_local", "Something is missing before the @.");
  if (!domain) return fail("no_domain", "Something is missing after the @.");
  if (local.length > MAX_LOCAL) return fail("local_too_long", "The part before the @ is too long.");
  if (!LOCAL.test(local)) return fail("bad_local", "The part before the @ contains a character email doesn't allow.");
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return fail("bad_dots", "Check the dots before the @.");
  }

  const labels = domain.split(".");
  if (labels.length < 2) return fail("no_tld", `"${domain}" needs an ending, such as .com or .co.uk.`);
  if (labels.some((l) => !l)) return fail("bad_dots", "Check the dots after the @.");
  if (!labels.every((l) => LABEL.test(l))) return fail("bad_domain", "The part after the @ doesn't look like a real domain.");
  if (!TLD.test(labels.at(-1))) return fail("bad_tld", `".${labels.at(-1)}" isn't a domain ending.`);

  return { ok: true, email };
}

/** A corrected address if the domain looks like a common misspelling, otherwise null. */
export function suggestEmail(raw) {
  const email = normaliseEmail(raw);
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const fix = DOMAIN_FIXES[email.slice(at + 1)];
  return fix ? `${email.slice(0, at)}@${fix}` : null;
}
