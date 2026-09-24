// npm run export: write the waitlist to a CSV (or JSON) file, straight from the database.
//
//   npm run export                      -> exports/cecil-waitlist-YYYY-MM-DD.csv
//   npm run export -- --json            -> the same as JSON
//   npm run export -- --out list.csv    -> a path of your choosing
//   WAITLIST_DB=/path/to/waitlist.db npm run export

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { WaitlistStore, toCsv } from "../server/store.js";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const { values } = parseArgs({ options: { json: { type: "boolean" }, out: { type: "string" } } });
const dbFile = process.env.WAITLIST_DB || fileURLToPath(new URL("../data/waitlist.db", import.meta.url));

if (!existsSync(dbFile)) {
  console.error(`No waitlist database at ${dbFile} yet. Start the server and sign up first, or set WAITLIST_DB.`);
  process.exit(1);
}

const store = new WaitlistStore(dbFile);
const rows = store.all();
store.close();

const day = new Date().toISOString().slice(0, 10);
const out = resolve(values.out ?? `exports/cecil-waitlist-${day}.${values.json ? "json" : "csv"}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, values.json ? `${JSON.stringify({ exportedAt: new Date().toISOString(), total: rows.length, signups: rows }, null, 2)}\n` : `﻿${toCsv(rows)}`);
console.log(`Exported ${rows.length} sign-up${rows.length === 1 ? "" : "s"} to ${out}`);
