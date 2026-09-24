// HTTP: the landing page, the waitlist API and a small password-protected admin area.

import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { checkEmail } from "../public/js/email.js";
import { SECURITY_HEADERS, esc, noticePage, shell } from "./pages.js";
import { toCsv } from "./store.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

const MESSAGES = {
  added: "You're on the passenger list. Cecil will write when your boarding pass is ready.",
  exists: "You're already on the passenger list. Cecil never forgets a passenger.",
  slow: "Cecil is a little overwhelmed. Please try again in a few minutes.",
  error: "Something went wrong on our side. Please try again in a moment.",
};


/**
 * Build the app.
 * - store: a WaitlistStore
 * - adminToken: password for /admin (admin is off when empty)
 * - rateLimit: { max, windowMs } sign-up attempts per IP address
 * - trustProxy: Express "trust proxy" setting, for hosts that sit behind a load balancer
 * - siteUrl: the public address, e.g. https://cecil.example.com (used in link previews)
 */
export function createApp({
  store,
  adminToken = "",
  rateLimit = { max: 8, windowMs: 10 * 60_000 },
  trustProxy = false,
  siteUrl = "",
  log = console,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);

  app.use((req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
  });

  app.get("/healthz", (req, res) => res.json({ ok: true }));

  // ------------------------------------------------------------ waitlist

  const limiter = createLimiter(rateLimit);
  const body = [express.json({ limit: "4kb" }), express.urlencoded({ extended: false, limit: "4kb" })];

  app.post("/api/waitlist", body, (req, res) => {
    // A browser without JavaScript posts the form directly; answer it with a page instead of JSON.
    const fromForm = req.is("application/x-www-form-urlencoded");
    const reply = (status, payload) => {
      if (!fromForm) return res.status(status).json(payload);
      return res.status(status).type("html").send(noticePage(payload));
    };

    const input = req.body ?? {};

    // The hidden "website" field is invisible to people. Bots fill it in; pretend all went well.
    if (typeof input.website === "string" && input.website.trim()) {
      return reply(201, { status: "added", message: MESSAGES.added });
    }

    if (!limiter.allow(req.ip)) {
      res.set("Retry-After", String(Math.ceil(rateLimit.windowMs / 1000)));
      return reply(429, { status: "slow_down", message: MESSAGES.slow });
    }

    const check = checkEmail(typeof input.email === "string" ? input.email : "");
    if (!check.ok) return reply(400, { status: "invalid", reason: check.reason, message: check.message });

    try {
      const name = typeof input.name === "string" ? input.name : null;
      const source = typeof input.source === "string" ? input.source : null;
      const { status } = store.add({ email: check.email, name, source });
      if (status === "added") log.info?.(`[waitlist] new sign-up (${store.count()} in total)`);
      return reply(status === "added" ? 201 : 200, { status, message: MESSAGES[status] });
    } catch (err) {
      log.error?.("[waitlist] could not save a sign-up:", err);
      return reply(500, { status: "error", message: MESSAGES.error });
    }
  });

  // ------------------------------------------------------------ admin

  const admin = express.Router();
  admin.use((req, res, next) => {
    res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    if (!adminToken) {
      return res.status(503).type("text").send("The admin area is switched off. Set ADMIN_TOKEN and restart the server.");
    }
    if (!checkBasicAuth(req.get("authorization"), adminToken)) {
      res.set("WWW-Authenticate", 'Basic realm="Cecil waitlist", charset="UTF-8"');
      return res.status(401).type("text").send("Password required.");
    }
    next();
  });

  admin.get("/", (req, res) => {
    const perPage = 200;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const total = store.count();
    const rows = store.list({ limit: perPage, offset: (page - 1) * perPage });
    res.type("html").send(adminPage({ rows, total, page, pages: Math.max(1, Math.ceil(total / perPage)) }));
  });

  admin.get("/export.csv", (req, res) => {
    res.set("Content-Disposition", `attachment; filename="cecil-waitlist-${stamp()}.csv"`);
    res.type("text/csv; charset=utf-8").send(`﻿${toCsv(store.all())}`);
  });

  admin.get("/export.json", (req, res) => {
    res.set("Content-Disposition", `attachment; filename="cecil-waitlist-${stamp()}.json"`);
    res.json({ exportedAt: new Date().toISOString(), total: store.count(), signups: store.all() });
  });

  // Deleting needs a custom header, which a cross-site form can't send: a cheap guard against CSRF.
  admin.delete("/signups/:id", (req, res) => {
    if (req.get("x-cecil-admin") !== "1") return res.status(403).json({ ok: false });
    const removed = store.remove(req.params.id);
    res.status(removed ? 200 : 404).json({ ok: removed });
  });

  app.use("/admin", admin);

  // ------------------------------------------------------------ the page

  // The page carries absolute URLs for link previews; fill them in from SITE_URL or the request.
  const indexHtml = readFileSync(join(PUBLIC_DIR, "index.html"), "utf8");
  app.get(["/", "/index.html"], (req, res) => {
    const base = (siteUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
    res.set("Cache-Control", "no-cache");
    res.type("html").send(indexHtml.replaceAll("__SITE_URL__", esc(base)));
  });

  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      setHeaders(res, path) {
        // Fonts never change; everything else (including the trailer, which keeps its name when
        // re-rendered) is re-checked with the server each time, so updates show up at once.
        res.set("Cache-Control", /\.woff2$/.test(path) ? "public, max-age=604800" : "no-cache");
      },
    }),
  );

  app.use((req, res) => res.status(404).type("html").send(noticePage({ status: "missing", message: "There is no such cabin aboard the Halcyon." })));

  // Malformed or oversized request bodies, and anything unexpected: never show a stack trace.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) log.error?.("[server]", err);
    const message = status === 413 ? "That's rather more than Cecil needs. Just an email address will do." : status === 500 ? MESSAGES.error : "Cecil couldn't read that request.";
    if (req.path.startsWith("/api/") && !req.is("application/x-www-form-urlencoded")) {
      return res.status(status).json({ status: status === 500 ? "error" : "invalid", message });
    }
    return res.status(status).type("html").send(noticePage({ status: "error", message }));
  });

  return app;
}

// ------------------------------------------------------------ helpers

function createLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    allow(key = "unknown") {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep memory bounded on a long-running server.
      if (hits.size > 10_000) {
        for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k);
      }
      return true;
    },
  };
}

function checkBasicAuth(header, token) {
  const match = /^Basic\s+(.+)$/i.exec(header ?? "");
  if (!match) return false;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const password = decoded.slice(decoded.indexOf(":") + 1);
  const digest = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(password), digest(token));
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function adminPage({ rows, total, page, pages }) {
  const body = rows
    .map(
      (r) => `<tr data-id="${r.id}">
        <td>${r.id}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.name ?? "")}</td>
        <td>${esc(r.source ?? "")}</td>
        <td><time datetime="${esc(r.createdAt)}">${esc(r.createdAt.replace("T", " ").slice(0, 16))}</time></td>
        <td><button class="link-btn" data-delete="${r.id}" aria-label="Remove ${esc(r.email)}">Remove</button></td>
      </tr>`,
    )
    .join("");
  const nav =
    pages > 1
      ? `<p class="admin-pages">${page > 1 ? `<a href="?page=${page - 1}">Newer</a>` : ""} Page ${page} of ${pages} ${page < pages ? `<a href="?page=${page + 1}">Older</a>` : ""}</p>`
      : "";
  return shell(
    "Waitlist · Cecil admin",
    "admin-page",
    `<main class="admin">
    <header class="admin-head">
      <div>
        <p class="eyebrow">Cecil · early access</p>
        <h1><span id="total">${total}</span> ${total === 1 ? "guest" : "guests"} on the waitlist</h1>
      </div>
      <div class="admin-actions">
        <a class="btn primary" href="/admin/export.csv">Download CSV</a>
        <a class="btn" href="/admin/export.json">Download JSON</a>
      </div>
    </header>
    ${
      rows.length
        ? `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>#</th><th>Email</th><th>Name</th><th>Source</th><th>Signed up (UTC)</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>${nav}`
        : `<p class="admin-empty">Nobody yet. The decks are very quiet.</p>`
    }
  </main>
  <script src="/js/admin.js" type="module"></script>`,
  );
}
