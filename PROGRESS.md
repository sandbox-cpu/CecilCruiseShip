# Build progress: Cecil, second case

This file lets a new session pick up the build where the last one stopped.

Repo: `sandbox-cpu/CecilCruiseShip`, branch `claude/cecil-cruise-mystery-6kjt7d`. The game framework and A Nightcap at Ravensmere came unchanged from `sandbox-cpu/cecil-mystery@914a9d0` (first commit); the landing page started from `sandbox-cpu/CecilLanding`.

## Brief (from the user)

- A second Cecil mystery on a luxury cruise ship, built on the Ravensmere framework, with Ravensmere kept intact and playable.
- Cecil is the ship's Chief Purser: he oversees the passengers, knows every cabin, and has access to rather more information than he admits.
- New title, cast and solution; the next port is far enough away that the people aboard must deal with it themselves; the ship should matter (access, crew routes, cabins, decks, schedules, sounds, communications).
- One character has an asymmetric feel: a surprise. **The user must not be told the culprit, method, motive, twist, puzzle answers or revealing implementation details** in chat. The truth lives only in `server/scenario/halcyon.js`.
- Same systems: shared screen and private phones, AI guests, Cecil's private interventions, accusations, voice, scripted fallbacks. Keep the user's existing configuration.
- Verify with scripted checks only (no paid model or voice calls), and say what still needs a human playtest.
- A landing page like CecilLanding's, with a Remotion trailer and Higgsfield visuals (48 credits available), in a cruise theme.

## Checklist

- [x] Import the framework and Ravensmere; all tests green as imported
- [x] Design the case (server-only)
- [x] Generalise the engine: case registry, lobby picker, per-case labels, theme, Cecil role, leak guard; crew-only places, timed whispers, per-case banners, reveal-only twist block
- [x] Scenario `halcyon.js`, Halcyon theme, printable pack with deck plan
- [x] Tests: evidence audit, scripted evenings, firewall, AI layer, sockets, browser playthroughs of both cases (97 + 2 browser)
- [x] Higgsfield stills and Cecil's lines generated (job IDs in the session; results live on Higgsfield's CDN)
- [x] Download the Higgsfield results into `landing/public/media` (needed the environment's network access set to Full)
- [x] Kling moving shots for the trailer: the ship, Cecil in the corridor, the sea (`landing/public/media/trailer-src/`)
- [x] Render the trailer, calm cut, poster and social card; landing tests; landing README
- [x] Final push

## Second trailer (user's follow-up)

The user asked for a fresh trailer, because the first was a reskin of the Ravensmere one and this is a sequel, with the first kept as a second option.

- [x] The first trailer kept as "the classic cut": `landing/trailer/src/classic/`, `sound/classic.mjs`, `voice/classic/`, renders renamed `trailer-classic-*` and `still-classic.jpg`; the page plays it with `?trailer=classic` (`DEFAULT_CUT` in `landing/public/js/main.js`)
- [x] New material from Higgsfield: seven stills, two Kling clips (the Morse key, the hull from below), one take of Cecil's new lines cut into eleven files
- [x] "The telegram": `landing/trailer/src/telegram/` (Morse timing in `morse.js`), soundtrack `sound/telegram.mjs`
- [x] Render, landing tests (including a browser test for the classic cut), README, push

## Third pass on the trailer (user's follow-up)

The telegram cut felt like a report of something already over. Re-cut around the table: friends at dinner, one of them did it, Cecil knows which, nobody can leave, Cecil's real mischief (whispers, a bluff, a secret task) about each friend, "Only one of you is lying about murder", the Morse title as the run-up to the vote, and an ending on the vote with nobody chosen.

- [x] New material (1.56 of the last 1.65 Higgsfield credits): three stills of friends round a dinner table, one take of four new Cecil lines
- [x] `landing/trailer/src/telegram/` and `sound/telegram.mjs` rewritten; the game's shared screen composited onto the TV in the table shot
- [x] Render, landing tests, README, push; still the page's default cut (the classic cut unchanged)

## Fourth pass (brighter, punchier), and what's parked

- [x] Gamma lift on the photographs (not the phones or type), no added grain, no heavy enlarging, better encoding
- [x] Cold-open cards (four friends, four secrets, one murderer), the guilty phone on its own, punch-ins, a table beat before the vote; Cecil's "which one" kept on the darker wireless-room still (the user's call)
- [x] Timeline is a run of beats with lengths (`landing/trailer/src/telegram/timing.js`), so beats can grow without re-timing the rest
- [ ] Parked until Higgsfield is topped up (about 40 credits; the balance is 0.09): five moving table shots made with Kling from the table stills (`table-lookup`, `table-smile`, `table-squirm`, `table-toast`, `table-point`, 5 s each, locked-off camera so the TV overlay stays put) saved to `landing/public/media/trailer-src/`, which the trailer picks up automatically; and Cecil speaking the three whispers (one Seed Audio take, voice reference as before), which means lengthening the three whisper beats to fit
