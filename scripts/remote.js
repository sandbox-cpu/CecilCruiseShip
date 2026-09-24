// npm run remote: play with friends who aren't in the room.
//
// Starts the game exactly as `npm start` does, then opens a free, temporary HTTPS
// link to it with a Cloudflare quick tunnel (no account; npx fetches cloudflared the
// first time), and prints the link. Open that link, not localhost, for the shared
// screen, and the game hands out the same address to everyone else: the QR code,
// the join link and the watch link all follow it.
//
//   npm run remote                       the default case
//   npm run remote -- --case=ravensmere  a particular case
//
// The link lasts until you press Ctrl+C here. Each run gets a new one.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 3000;
const windows = process.platform === "win32";

const game = spawn(process.execPath, ["server/index.js", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });

// On Windows, npx is a .cmd script, which Node only runs through a shell.
const tunnelArgs = ["--yes", "cloudflared@latest", "tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`];
const tunnel = spawn(windows ? `npx ${tunnelArgs.join(" ")}` : "npx", windows ? [] : tunnelArgs, {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  shell: windows,
});

let link = null;
const log = [];
function listen(chunk) {
  const text = String(chunk);
  log.push(text);
  const found = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (found && !link) {
    link = found[0];
    console.log("");
    console.log("  ==============================================================");
    console.log(`  Your link:  ${link}`);
    console.log("  ==============================================================");
    console.log("");
    console.log("  1. On this computer, open the link above for the shared screen");
    console.log("     (not localhost), and choose tonight's mystery.");
    console.log("  2. Send your friends the link. The lobby shows two addresses:");
    console.log("     - the watch link, to see the shared screen on their computer;");
    console.log("     - the join link and code, for their private player screen");
    console.log("       (a phone, or another browser window).");
    console.log("  3. Talk over your usual voice call. Press Ctrl+C here to finish.");
    console.log("");
  }
}
tunnel.stdout.on("data", listen);
tunnel.stderr.on("data", listen);

tunnel.on("exit", (code) => {
  if (!link) {
    console.error("");
    console.error("  The HTTPS link didn't start. Here's what cloudflared said:");
    console.error(log.join("").trim().split("\n").slice(-12).map((l) => `    ${l}`).join("\n"));
    console.error("");
    console.error("  The game is still running for this network. Press Ctrl+C to stop it.");
  } else if (code !== null && code !== 0) {
    console.error(`  The link has closed (cloudflared exited with ${code}). Run npm run remote again for a new one.`);
  }
});

function stop() {
  tunnel.kill();
  game.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
game.on("exit", (code) => {
  tunnel.kill();
  process.exit(code ?? 0);
});
