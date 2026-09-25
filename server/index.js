// Start Cecil on this computer: `npm start`, then open the printed address.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAi } from "./ai/cecil.js";
import { createApp, lanAddress } from "./app.js";
import { DEFAULT_CASE, SCENARIOS, scenarioFor } from "./scenario/index.js";
import { createVoice } from "./voice.js";

// Load settings from a .env file next to package.json, if there is one.
// Variables already set in the environment win. Windows Notepad likes to save
// it as .env.txt, so that name works too. Returns the file used, or null.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadEnvFile() {
  const file = [".env", ".env.txt"].map((name) => path.join(root, name)).find((f) => fs.existsSync(f));
  if (!file) return null;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!match || line.trim().startsWith("#")) continue;
    const quoted = match[2].match(/^(['"])(.*)\1$/);
    const value = quoted ? quoted[2] : match[2].replace(/\s+#.*$/, "");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
  return file;
}

const envFile = loadEnvFile();

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const speed = Number(process.env.GAME_SPEED) || 1;
const ai = createAi();
const voice = createVoice();
// `npm run halcyon`, `npm run ravensmere`, `node server/index.js --case=halcyon` or CECIL_CASE.
const caseArg = process.argv.slice(2).join("=").match(/--case=+(\w+)/);
const requestedCase = caseArg ? caseArg[1] : process.env.CECIL_CASE;
if (requestedCase && !scenarioFor(requestedCase)) {
  console.warn(`  "${requestedCase}" isn't a mystery I know. Try: ${Object.keys(SCENARIOS).join(", ")}.`);
}
const defaultCase = scenarioFor(requestedCase)?.id || DEFAULT_CASE;
const { server } = createApp({ ai, voice, speed, port, defaultCase, publicUrl: process.env.PUBLIC_URL || null });

server.listen(port, host, () => {
  const lan = process.env.PUBLIC_URL || `http://${lanAddress()}:${port}`;
  console.log("");
  console.log("  Cecil is ready to receive guests.");
  console.log("");
  console.log(`  Shared screen (open on this laptop):  http://localhost:${port}`);
  console.log(`  Phones join via the QR code, or:     ${lan}/join`);
  console.log("");
  console.log("  Tonight's mystery (switch on the lobby screen, or open one of these):");
  for (const s of Object.values(SCENARIOS)) {
    const mark = s.id === defaultCase ? "*" : " ";
    console.log(`   ${mark} ${s.title.padEnd(26)} http://localhost:${port}/?case=${s.id}`);
  }
  console.log(`  Printable evidence pack:             http://localhost:${port}/pack?case=${defaultCase}`);
  console.log("");
  console.log(`  Cecil's brain:  ${ai ? `Claude (${ai.model})` : "scripted (set ANTHROPIC_API_KEY for live AI)"}`);
  console.log(`  Cecil's voice:  ${voice ? `ElevenLabs (voice ${voice.voiceId})` : "browser speech (set ELEVENLABS_API_KEY for ElevenLabs)"}`);
  if (speed !== 1) console.log(`  Game speed:     ${speed}x`);
  console.log(`  Settings file:  ${envFile || `none yet. For keys, copy .env.example to .env in ${root}`}`);
  console.log("");
});
