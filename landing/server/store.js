// The waitlist: one SQLite file, using the SQLite that ships inside Node.
//
// Every sign-up is a row. Addresses are de-duplicated case-insensitively, so
// signing up twice is harmless. The file lives in data/ by default; point
// WAITLIST_DB somewhere persistent when you deploy.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { emailKey, normaliseEmail } from "../public/js/email.js";

// Bump when the promise next to the form changes, so each row records what that person agreed to.
export const CONSENT_VERSION = "early-access-v1";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS signups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    email_key   TEXT NOT NULL UNIQUE,
    name        TEXT,
    source      TEXT,
    consent     TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS signups_created ON signups (created_at);
`;

const COLUMNS = "id, email, name, source, consent, created_at AS createdAt";

export class WaitlistStore {
  constructor(file = ":memory:", { now = () => new Date() } = {}) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.file = file;
    this.now = now;
    this.db = new DatabaseSync(file);
    // WAL keeps reads (the admin page) from blocking writes (sign-ups).
    if (file !== ":memory:") this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(SCHEMA);

    this.sql = {
      insert: this.db.prepare(
        "INSERT INTO signups (email, email_key, name, source, consent, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email_key) DO NOTHING",
      ),
      byKey: this.db.prepare(`SELECT ${COLUMNS} FROM signups WHERE email_key = ?`),
      count: this.db.prepare("SELECT COUNT(*) AS n FROM signups"),
      page: this.db.prepare(`SELECT ${COLUMNS} FROM signups ORDER BY id DESC LIMIT ? OFFSET ?`),
      all: this.db.prepare(`SELECT ${COLUMNS} FROM signups ORDER BY id ASC`),
      remove: this.db.prepare("DELETE FROM signups WHERE id = ?"),
    };
  }

  /** Add an address. Returns { status: "added" | "exists", signup }. Assumes the address was already checked. */
  add({ email, name = null, source = null }) {
    const clean = normaliseEmail(email);
    const key = emailKey(clean);
    const result = this.sql.insert.run(clean, key, tidy(name, 60), tidy(source, 80), CONSENT_VERSION, this.now().toISOString());
    const signup = this.sql.byKey.get(key);
    return { status: result.changes ? "added" : "exists", signup: plain(signup) };
  }

  count() {
    return Number(this.sql.count.get().n);
  }

  /** Newest first, for the admin page. */
  list({ limit = 100, offset = 0 } = {}) {
    return this.sql.page.all(limit, offset).map(plain);
  }

  /** Oldest first, for exports. */
  all() {
    return this.sql.all.all().map(plain);
  }

  remove(id) {
    return this.sql.remove.run(Number(id)).changes > 0;
  }

  close() {
    this.db.close();
  }
}

function tidy(value, max) {
  if (value == null) return null;
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

// node:sqlite returns null-prototype objects; give callers ordinary ones.
function plain(row) {
  return row ? { ...row, id: Number(row.id) } : row;
}

/** Rows as CSV, guarded against spreadsheet formula injection. */
export function toCsv(rows) {
  const header = ["id", "email", "name", "source", "consent", "signed_up_utc"];
  const cell = (value) => {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = rows.map((r) => [r.id, r.email, r.name, r.source, r.consent, r.createdAt].map(cell).join(","));
  return `${[header.join(","), ...lines].join("\r\n")}\r\n`;
}
