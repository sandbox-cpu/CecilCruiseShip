import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { CONSENT_VERSION, WaitlistStore, toCsv } from "../server/store.js";

test("sign-ups survive a restart and are de-duplicated case-insensitively", () => {
  const dir = mkdtempSync(join(tmpdir(), "cecil-store-"));
  const file = join(dir, "nested", "waitlist.db");
  try {
    const store = new WaitlistStore(file);
    assert.equal(store.add({ email: "Sam@Example.com", name: "Sam", source: "newsletter" }).status, "added");
    assert.equal(store.add({ email: "sam@example.com" }).status, "exists");
    assert.equal(store.add({ email: "priya@example.com" }).status, "added");
    store.close();

    const reopened = new WaitlistStore(file);
    const rows = reopened.all();
    assert.equal(reopened.count(), 2);
    assert.deepEqual(
      rows.map((r) => [r.email, r.name, r.source, r.consent]),
      [
        ["Sam@example.com", "Sam", "newsletter", CONSENT_VERSION],
        ["priya@example.com", null, null, CONSENT_VERSION],
      ],
    );
    assert.match(rows[0].createdAt, /^\d{4}-\d\d-\d\dT/);
    assert.deepEqual(reopened.list({ limit: 1 }).map((r) => r.email), ["priya@example.com"]);
    assert.equal(reopened.remove(rows[0].id), true);
    assert.equal(reopened.remove(rows[0].id), false);
    assert.equal(reopened.count(), 1);
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("names and sources are tidied and capped", () => {
  const store = new WaitlistStore();
  const { signup } = store.add({ email: "a@example.com", name: "  Lady\n\tVivienne   " + "x".repeat(100), source: "   " });
  assert.equal(signup.name.startsWith("Lady Vivienne x"), true);
  assert.equal(signup.name.length, 60);
  assert.equal(signup.source, null);
  store.close();
});

test("CSV export quotes properly and defuses spreadsheet formulas", () => {
  const csv = toCsv([
    { id: 1, email: "a@example.com", name: '=HYPERLINK("x")', source: "ref,with comma", consent: "v1", createdAt: "2026-09-24T10:00:00.000Z" },
    { id: 2, email: "b@example.com", name: null, source: "+44", consent: "v1", createdAt: "2026-09-24T11:00:00.000Z" },
  ]);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], "id,email,name,source,consent,signed_up_utc");
  assert.equal(lines[1], `1,a@example.com,"'=HYPERLINK(""x"")","ref,with comma",v1,2026-09-24T10:00:00.000Z`);
  assert.equal(lines[2], "2,b@example.com,,'+44,v1,2026-09-24T11:00:00.000Z");
});
