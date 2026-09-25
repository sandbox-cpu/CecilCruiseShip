# Cecil: AI-hosted murder mysteries

**Multiplayer murder mysteries where everyone gets to play.**

Nobody has to be the game master. Cecil runs the evening. The laptop (or a TV plugged into it) is the shared screen: Cecil narrates, lays out the evidence, keeps the clock and conducts the final accusation. Every player's phone is private: it holds their character, their secrets, and anything Cecil whispers to them.

There are two cases. Pick one in the lobby.

| Case | The premise | Players | Time |
|---|---|---|---|
| **Dead Reckoning** *(new)* | The SS Halcyon, October 1961, three nights out of Madeira and four days from Barbados. At two o'clock the ship's clocks went back an hour. At twenty past one, the gossip columnist Mortimer Crane went over the side. Cecil is the ship's Chief Purser: he keeps the passenger list, the cabin keys and everyone's telegrams, and the Captain has asked him to find out, discreetly, what happened. | 3–4 | about 15–20 minutes |
| **A Nightcap at Ravensmere** | Ravensmere Hall, on the Yorkshire moors, November 1978. Sir Edmund rang for his port at eleven. By midnight he was dead. Cecil is the butler. | 3–4 | about 15 minutes |

Each is a short, complete mystery for **3–4 seats**. If only one or two people turn up, **AI guests fill the empty chairs**.

> **Playing it yourself?** The solutions live in `server/scenario/`. Don't open those files (or the tests) if you want to be surprised. This repository is public, so the same goes for anyone you invite.

## Running it

You need [Node.js](https://nodejs.org) 20 or newer on the laptop, and phones on the **same Wi-Fi**.

```bash
git clone https://github.com/sandbox-cpu/CecilCruiseShip.git
cd CecilCruiseShip
npm install
npm start
```

Then:

1. On the laptop, open **http://localhost:3000**. That's the shared screen; put it on a TV if you like.
2. Under **Tonight's mystery**, choose **Dead Reckoning** or **A Nightcap at Ravensmere**. (Dead Reckoning is chosen to start with. You can switch as often as you like until the evening begins; everyone who has joined stays seated.)
3. Everyone scans the QR code with their phone camera, or visits the address shown under it and enters the code.
4. Press **Begin the evening**, and click once anywhere so the browser lets Cecil speak.

**Other ways to pick the case:**

| | |
|---|---|
| `npm run halcyon` | Starts with Dead Reckoning chosen |
| `npm run ravensmere` | Starts with A Nightcap at Ravensmere chosen |
| `http://localhost:3000/?case=halcyon` or `?case=ravensmere` | Opens the shared screen on that case |
| `CECIL_CASE=ravensmere` in `.env` | Makes that case the default |

The first time, your computer may ask whether Node can accept connections on your network. Allow it on **private** networks, or the phones won't be able to connect. If the QR code shows the wrong address (VPNs can confuse it), set `PUBLIC_URL`.

**Printable evidence pack (optional):** the lobby's "evidence pack" link opens the pack for the chosen case (`/pack?case=halcyon` or `/pack?case=ravensmere`). Print it and tick "We've printed the evidence pack". Dead Reckoning's pack has place cards, a deck plan of the Halcyon, the ship's daily programme and a telegram to seal in an envelope. Without it, everything happens on screen.

**Demo tips:**

- `GAME_SPEED=2 npm start` runs everything at double speed.
- The top bar has **Pause**, **Skip** and **End evening** buttons. **End evening** stops the mystery part-way and goes back to the lobby with everyone still seated (it asks first). After the reveal, **Play again** does the same.
- To demo alone, open the join page in two different browsers, or a normal window plus a private one. Each one counts as a separate player.

### Playing over the internet

Friends somewhere else can play too, on a voice or video call. `npm run remote` starts the game and a free, temporary HTTPS link to it (a Cloudflare quick tunnel: no account, nothing to install beyond Node; the first run fetches it):

```bash
npm run remote                         # the default case
npm run remote -- --case=ravensmere    # A Nightcap at Ravensmere
```

1. It prints **Your link: https://…trycloudflare.com**. Open that link (not localhost) on your computer: that's the shared screen.
2. The lobby shows two addresses for your friends: the **watch link** (`…/?watch=CODE`), a read-only copy of the shared screen for their computer, which speaks Cecil's lines too; and the **join link** and code, for their private player screen, on a phone or in another browser window. Everyone, you included, needs a player screen.
3. Talk over your usual call; headphones stop Cecil echoing. Press Ctrl+C in the terminal to finish. Each run gets a new link, and it only works while that window is open.

Keep the link to the people you're playing with: anyone with it and the four-letter code can take a seat. If the link doesn't start, your network may be blocking Cloudflare's tunnel port (7844); a phone hotspot usually works.

### Cecil's brain and voice (optional)

Your existing `.env` works unchanged for both cases. The keys go in a file called `.env` in the game's main folder, the one with `package.json` in it (not `landing`). To make one on Windows, open PowerShell in that folder and run:

```powershell
copy .env.example .env
notepad .env
```

Put your key after the `=` on its line (for example `ELEVENLABS_API_KEY=` followed by the key, no spaces or quotes), save, and restart the game. The startup message names the settings file it read and says `Cecil's voice: ElevenLabs` when the key was found. If Notepad saved it as `.env.txt`, that works too.

| Setting | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on live Claude: players can ask Cecil and the AI guests anything in their own words, Cecil chooses his own mischief, and he gives closing remarks. Uses `claude-opus-5` by default (`CECIL_MODEL` to change). |
| `ELEVENLABS_API_KEY` | Cecil speaks with an ElevenLabs voice ("George" by default; set `ELEVENLABS_VOICE_ID` for another from your library). His scripted lines are generated in the background as the game starts, so he doesn't pause. |

With neither key the game is complete and fully playable. Cecil answers from a list of suggested questions, his mischief is chosen by rules, and he speaks with the browser's built-in voice. The startup message tells you which mode you're in, and so does the lobby screen.

## How an evening goes

| Part | What happens |
|---|---|
| **Arrivals** | The laptop shows a QR code and a four-letter code. Everyone scans it and types their name. The host chooses the case and can seat AI guests; empty chairs are filled automatically. |
| **Prologue** | Cecil explains the death. Every phone buzzes with a private dossier: who you are, the story you're telling, the secret you're hiding and what you know. One of you is the murderer, and only they know it. |
| **Act One** | Evidence goes up on the big screen. Each player searches one place (only they see what's there) and may put one yes/no question to Cecil. AI guests can be questioned; they answer out loud. Cecil starts whispering. |
| **Act Two** | Cecil asks someone to open a sealed item (an envelope or a telegram). The front goes on the big screen; the back is shown only to the opener. Somewhere there's a lock, and whoever opens it hears something nobody else does. |
| **The Accusation** | Everyone votes on their phone, in private. |
| **The Reveal** | Cecil explains what really happened, then shows the votes, the scores, everyone's secrets, and a list of every piece of mischief he got up to. |

Aboard the Halcyon, the ship matters: some places are crew only until Act Two, the ship's clocks and schedules are evidence in their own right, and the radio room and Purser's Bureau see a great deal of traffic.

### Cecil's mischief

Cecil knows everything about every player, and he uses it. At set moments he picks one move:

- **An extra clue:** a real clue slipped to one player. Misleading clues tend to go to the murderer, as ammunition.
- **A bluff:** "Look at Mr Quill and say: 'I know where you were when the clocks went back.' You don't."
- **A blank whisper:** your phone buzzes, the big screen says Cecil has had a word with you… and he's told you nothing. Look worried.
- **Gossip:** a true secret about someone else, and then he tells *them* he told you.
- **A secret mission:** "Within ninety seconds, get someone else to say the word 'overboard'."
- **Odd one out:** every phone buzzes except one. *"Interesting. Three of you have just received information. One of you hasn't."*
- **Who opened the lock:** told to one person, privately.

He also reacts to what happens. Search someone's place and they're told someone has been in there, but not who. If nobody has opened the lock, his hints get less subtle. And each case has a few private words of its own, timed for maximum discomfort.

## How the AI is kept honest

The design idea is that **the shared screen tells the story; your phone tells your story.**

- **Cecil is omniscient but bounded.** His prompt holds the complete truth: every dossier, every secret, and who did it. But the game engine decides what he may say, to whom and when:
  - When you ask a question, Claude only picks which fact in the engine's table you're asking about. The engine supplies the yes or no, and refuses outright if you haven't found the evidence yet or are asking who did it.
  - When he makes mischief, Claude chooses from the moves the engine offers. Every clue's text comes from the authored script, never from the AI, so Cecil can mislead through what he says but never plants fake evidence.
  - A fairness rule makes sure the people hunting the murderer get a key clue in Act Two if they have nothing to go on.
- **AI guests are players, not hosts.** Each one sees only its own character's dossier, the public evidence and what has happened to it tonight, exactly like a human at the table. The murderer, if it's an AI guest, lies within the rules written for that character.
- **A leak guard checks every line the AI writes** before anyone sees it. Each case lists its own danger words: naming the murderer alongside guilt, giving away the lock's code, mentioning the motive, or a guilty character confessing. Rejected lines are replaced with scripted ones.
- **Whispers use cover traffic.** When the lock is opened, everyone else gets a whisper, not just the murderer, so a glowing envelope on the big screen can't give them away.
- **Anything that goes wrong falls back to the script:** no key, a timeout, a refusal or a bad reply.

## Project layout

```
CecilCruiseShip/
├── server/
│   ├── index.js              # npm start: loads .env, picks AI, voice and the default case, starts the server
│   ├── app.js                # HTTP + Socket.IO: rooms, the case each room is playing, per-device views, the clock
│   ├── game.js               # the game engine and the information firewall (shared by every case)
│   ├── scenario/
│   │   ├── index.js          # the list of cases
│   │   ├── halcyon.js        # Dead Reckoning: the whole mystery, solution included (spoilers)
│   │   └── ravensmere.js     # A Nightcap at Ravensmere: likewise (spoilers)
│   ├── ai/cecil.js           # Claude: Cecil's answers and mischief, AI guests, closing words
│   ├── ai/guard.js           # the leak guard
│   └── voice.js              # ElevenLabs proxy and cache
├── public/
│   ├── host.html/.css/.js    # the shared screen, with the case picker
│   ├── play.html/.css/.js    # the phone
│   ├── pack.html             # A Nightcap at Ravensmere's printable evidence pack
│   ├── pack-halcyon.html     # Dead Reckoning's printable evidence pack
│   └── shared.js, theme.css  # helpers, and each case's colours
├── scripts/remote.js         # npm run remote: the game plus a temporary HTTPS link, for playing over a call
├── test/                     # engine, AI, server and browser tests for both cases (spoilers)
└── landing/                  # the Dead Reckoning coming-soon page, waitlist and trailers (see landing/README.md)
```

The engine is deterministic: time comes in through `tick()` and randomness from a seeded generator. That's why the tests can play whole evenings in milliseconds.

**Adding a case** is mostly a new scenario file plus a line in `server/scenario/index.js`. Besides the characters, clues, facts and narration, a scenario brings its own `labels` (what the screens call things: the lock, the envelope, the acts), its `cecil` role for the AI prompt, its leak-guard patterns and its colour theme. Optional features: `crewOnly` places and `crew` characters, timed `whispers`, and an `optional` fourth character. `test/halcyon.test.js` shows how to audit a case: every step of its solution names the evidence behind it, and the tests check that evidence exists, can be reached in play, and never shows up on the wrong screen.

## Tests

```bash
npm test                 # both cases: engine, evidence audit, information firewall, AI layer (fake Claude client), server
npm run test:browser     # a whole evening of each case in real browsers: shared screen + two phones
```

No test makes a paid model or voice call. The browser tests need Playwright's Chromium (`npx playwright install chromium`), or set `CECIL_CHROMIUM_PATH`. They skip themselves if no browser is available, and save screenshots to `test-results/`.

## Known limitations

- **Each case has one fixed solution.** Roles are dealt at random, but the answer doesn't change, so each case is a play-once experience.
- **Local network only.** Games live in the laptop's memory. There are no accounts or internet hosting, and restarting the server ends any game in progress. Phones that reload or sleep rejoin automatically.
- **English only, desktop browsers for the shared screen.** Chrome or Edge give the best built-in voices.
- **Phones:** iPhones don't vibrate for web pages, so they get a chime and the on-screen card instead.
- **Live AI adds a few seconds** to free-text questions and mischief. If Claude takes longer than `CECIL_AI_TIMEOUT_MS` (20 seconds), Cecil falls back to his script.
- **ElevenLabs** has only been tested against a stand-in from the build environment. Check it once on your own machine.
- **The printed pack shows the lock's code** (or how to work it out) to whoever prints it. The instructions ask them not to peek.
