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
- [ ] Download the Higgsfield results into `landing/public/media` (blocked: this environment's network policy refuses `d8j0ntlcm91z4.cloudfront.net`)
- [ ] Kling moving shots for the trailer (after reviewing the stills)
- [ ] Render the trailer, calm cut, poster and social card; landing tests; landing README
- [ ] Final push
