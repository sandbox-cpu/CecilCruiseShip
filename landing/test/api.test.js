import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { createApp } from "../server/app.js";
import { WaitlistStore } from "../server/store.js";

const quiet = { info() {}, error() {} };
const TOKEN = "correct horse battery staple";

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

describe("waitlist API", () => {
  let store;
  let server;
  let base;

  before(async () => {
    store = new WaitlistStore();
    server = await listen(createApp({ store, adminToken: TOKEN, siteUrl: "https://cecil.example", rateLimit: { max: 1000, windowMs: 60_000 }, log: quiet }));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => {
    server.close();
    store.close();
  });
  beforeEach(() => {
    for (const row of store.all()) store.remove(row.id);
  });

  const post = (body, headers = { "Content-Type": "application/json" }) =>
    fetch(`${base}/api/waitlist`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

  test("saves a new sign-up and confirms it", async () => {
    const res = await post({ email: " Sam@Example.com ", name: "Sam", source: "twitter" });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.status, "added");
    assert.match(data.message, /on the passenger list/);
    const [row] = store.all();
    assert.equal(row.email, "Sam@example.com");
    assert.equal(row.name, "Sam");
    assert.equal(row.source, "twitter");
  });

  test("a second sign-up with the same address is recognised, not duplicated", async () => {
    await post({ email: "sam@example.com" });
    const res = await post({ email: "SAM@example.com" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "exists");
    assert.equal(store.count(), 1);
  });

  test("rejects bad addresses with a helpful message", async () => {
    for (const email of ["", "nope", "sam@example", "sam@@example.com"]) {
      const res = await post({ email });
      assert.equal(res.status, 400, email);
      const data = await res.json();
      assert.equal(data.status, "invalid");
      assert.ok(data.message);
    }
    const res = await post({ email: 12345 });
    assert.equal(res.status, 400);
    assert.equal(store.count(), 0);
  });

  test("quietly ignores bots that fill in the hidden field", async () => {
    const res = await post({ email: "bot@example.com", website: "http://spam.example" });
    assert.equal(res.status, 201);
    assert.equal(store.count(), 0);
  });

  test("works without JavaScript: a plain form post gets a page back", async () => {
    const res = await post(new URLSearchParams({ email: "form@example.com", name: "Form" }).toString(), {
      "Content-Type": "application/x-www-form-urlencoded",
    });
    assert.equal(res.status, 201);
    assert.match(res.headers.get("content-type"), /html/);
    assert.match(await res.text(), /on the passenger list/);
    assert.equal(store.all()[0].email, "form@example.com");
  });

  test("rejects oversized and malformed bodies without leaking internals", async () => {
    const big = await post({ email: "a@example.com", name: "x".repeat(10_000) });
    assert.equal(big.status, 413);
    assert.equal((await big.json()).status, "invalid");
    const broken = await post("{not json");
    assert.equal(broken.status, 400);
    const text = await broken.text();
    assert.doesNotMatch(text, /at .*\.js|node_modules/);
    assert.equal(JSON.parse(text).status, "invalid");
    assert.equal(store.count(), 0);
  });

  test("serves the page with absolute preview URLs and security headers", async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<h1 id="hero-title">Dead Reckoning<\/h1>/);
    assert.match(html, /content="https:\/\/cecil\.example\/media\/social-card\.jpg"/);
    assert.doesNotMatch(html, /__SITE_URL__/);
    assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await fetch(`${base}/js/email.js`)).status, 200);
    // The trailer keeps its file name when re-rendered, so browsers must re-check it rather than replay a saved copy.
    assert.equal((await fetch(`${base}/media/poster.jpg`)).headers.get("cache-control"), "no-cache");
    assert.match((await fetch(`${base}/fonts/eb-garamond.woff2`)).headers.get("cache-control"), /max-age=604800/);
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    const missing = await fetch(`${base}/secret-passage`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /no such cabin/);
  });

  test("never serves the database or server code", async () => {
    for (const path of ["/data/waitlist.db", "/server/app.js", "/../server/app.js", "/.env"]) {
      assert.equal((await fetch(`${base}${path}`)).status, 404, path);
    }
  });

  describe("admin", () => {
    const auth = (password) => ({ Authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}` });

    test("asks for the password, and refuses the wrong one", async () => {
      const none = await fetch(`${base}/admin`);
      assert.equal(none.status, 401);
      assert.match(none.headers.get("www-authenticate"), /Basic/);
      assert.equal((await fetch(`${base}/admin`, { headers: auth("wrong") })).status, 401);
      assert.equal((await fetch(`${base}/admin/export.csv`, { headers: auth("wrong") })).status, 401);
    });

    test("lists sign-ups and exports them as CSV and JSON", async () => {
      await post({ email: "sam@example.com", name: "<b>Sam</b>" });
      await post({ email: "priya@example.com" });

      const page = await fetch(`${base}/admin`, { headers: auth(TOKEN) });
      assert.equal(page.status, 200);
      assert.equal(page.headers.get("cache-control"), "no-store");
      const html = await page.text();
      assert.match(html, /<span id="total">2<\/span> guests on the waitlist/);
      assert.match(html, /&lt;b&gt;Sam&lt;\/b&gt;/);
      assert.doesNotMatch(html, /<b>Sam<\/b>/);

      const csv = await fetch(`${base}/admin/export.csv`, { headers: auth(TOKEN) });
      assert.match(csv.headers.get("content-type"), /text\/csv/);
      assert.match(csv.headers.get("content-disposition"), /attachment; filename="cecil-waitlist-\d{4}-\d\d-\d\d\.csv"/);
      const text = await csv.text();
      assert.match(text, /sam@example\.com/);
      assert.match(text, /priya@example\.com/);

      const json = await (await fetch(`${base}/admin/export.json`, { headers: auth(TOKEN) })).json();
      assert.equal(json.total, 2);
      assert.deepEqual(json.signups.map((s) => s.email), ["sam@example.com", "priya@example.com"]);
    });

    test("removes a sign-up only with the admin header", async () => {
      await post({ email: "gone@example.com" });
      const [row] = store.all();
      const bare = await fetch(`${base}/admin/signups/${row.id}`, { method: "DELETE", headers: auth(TOKEN) });
      assert.equal(bare.status, 403);
      const ok = await fetch(`${base}/admin/signups/${row.id}`, { method: "DELETE", headers: { ...auth(TOKEN), "X-Cecil-Admin": "1" } });
      assert.equal(ok.status, 200);
      assert.equal(store.count(), 0);
    });
  });
});

test("admin is switched off when no password is set", async () => {
  const store = new WaitlistStore();
  const server = await listen(createApp({ store, log: quiet }));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/admin/export.csv`);
    assert.equal(res.status, 503);
  } finally {
    server.close();
    store.close();
  }
});

test("rate-limits repeated sign-up attempts from one address", async () => {
  const store = new WaitlistStore();
  const server = await listen(createApp({ store, rateLimit: { max: 3, windowMs: 60_000 }, log: quiet }));
  const url = `http://127.0.0.1:${server.address().port}/api/waitlist`;
  try {
    const codes = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `p${i}@example.com` }) });
      codes.push(res.status);
    }
    assert.deepEqual(codes, [201, 201, 201, 429, 429]);
    assert.equal(store.count(), 3);
  } finally {
    server.close();
    store.close();
  }
});
