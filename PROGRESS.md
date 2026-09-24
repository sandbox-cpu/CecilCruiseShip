# Build progress: Cecil murder-mystery demo

This file lets a new session pick up the build exactly where the last one stopped. Tick each item as it's committed.

Repo: `sandbox-cpu/cecil-mystery` (branch `main`). It was built on `cshatherley/lightstream` (branch `claude/murder-mystery-demo`, folder `cecil/`) and moved here with its history.

## Brief (from the user)

- Asymmetric murder mystery. The AI butler **Cecil** is the host.
- The laptop is the shared screen. Each player joins privately on their phone (QR code plus room code).
- Cecil knows everything about every player. The engine decides what he may reveal, to whom and when.
- Cecil DMs individual players to cause havoc. He can send an extra clue, trick someone, or be sneaky.
- 3–4 seats, about 15 minutes. AI guests fill empty seats when only 1–2 humans join.
- Hybrid AI: the story beats and solution are scripted, Claude adds live lines and choices, and the game falls back to scripted lines when there's no API key.
- ElevenLabs voice for Cecil (optional, `ELEVENLABS_API_KEY`), with the browser's built-in voice as fallback.
- Printable evidence pack (the physical/digital layer): an envelope holds a code that unlocks the dictaphone.

## Architecture

- Node 20+ (ESM), Express, Socket.IO, and `@anthropic-ai/sdk`. Plain HTML/CSS/JS frontends with no build step.
- `server/scenario/ravensmere.js`: all authored content (characters, clues, facts, mischief content, narration).
- `server/game.js`: deterministic game engine with an injected clock and RNG, plus views that act as the information firewall.
- `server/ai/`: Cecil (omniscient, bounded by the engine's permission table), AI guests (who only see their own dossier), the leak guard, and the scripted fallback.
- `server/tts.js`: ElevenLabs proxy and cache.
- `server/index.js`: HTTP, Socket.IO, rooms, tick loop, QR/LAN URL.
- `public/`: `host.html` (shared screen), `play.html` (phone), `pack.html` (printable evidence pack).

## Checklist

- [x] Scaffold, dependencies, this file
- [x] Scenario content
- [x] Game engine and views (firewall), with 34 engine tests
- [x] AI layer (Cecil, guests, guard, fallback), 18 AI tests with a fake client
- [x] Server (rooms, sockets, reconnect, QR, voice proxy)
- [x] Host screen UI
- [x] Phone UI
- [x] Printable pack
- [x] Tests: engine, firewall, AI adapter (fake client), socket integration (58 passing)
- [x] Browser playthrough (Playwright, 1 host + 2 phones, lobby to reveal), screenshots reviewed
- [x] README and .env.example
- [ ] Live Claude test with the user's key (don't commit the key)
- [ ] Final push
