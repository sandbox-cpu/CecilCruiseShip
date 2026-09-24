// npm start: open the waitlist database and serve the landing page.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { WaitlistStore } from "./store.js";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env.PORT) || 4000;
const dbFile = process.env.WAITLIST_DB || fileURLToPath(new URL("../data/waitlist.db", import.meta.url));
const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
// Behind a hosting provider's load balancer, trust its X-Forwarded-For so rate limiting sees real visitors.
const trustProxy = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY ?? "") ? 1 : false;

const store = new WaitlistStore(dbFile);
const siteUrl = process.env.SITE_URL?.trim() ?? "";
const app = createApp({ store, adminToken, trustProxy, siteUrl });

const server = app.listen(port, () => {
  console.log(`\n  Cecil's landing page is open at http://localhost:${port}`);
  console.log(`  Sign-ups are saved to ${dbFile} (${store.count()} so far)`);
  console.log(
    adminToken
      ? `  Admin and exports: http://localhost:${port}/admin (any username, password = ADMIN_TOKEN)\n`
      : "  Admin is off: set ADMIN_TOKEN in .env to open /admin. `npm run export` works either way.\n",
  );
});

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
