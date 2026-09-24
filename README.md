# Cecil: A Nightcap at Ravensmere

**An AI-hosted multiplayer murder mystery where everyone gets to play.**

Nobody has to be the game master. Cecil, the butler, runs the evening. The laptop (or a TV plugged into it) is the shared screen: Cecil narrates, lays out the evidence, keeps the clock and conducts the final accusation. Every player's phone is private: it holds their character, their secrets, and anything Cecil whispers to them.

> *"Good evening. I am Cecil, butler at Ravensmere Hall these forty years, and I shall be your host tonight. Regrettably, Sir Edmund Ravensmere is dead."*

This is a demo slice: one short mystery for **3–4 seats, about 15 minutes**. If only one or two people turn up, **AI guests fill the empty chairs**.

## How an evening goes

| Part | What happens |
|---|---|
| **Arrivals** | The laptop shows a QR code and a four-letter code. Everyone scans it and types their name. The host can seat AI guests; empty chairs are filled automatically. |
| **Prologue** | Cecil explains the death. Every phone buzzes with a private dossier: who you are, the story you're telling, the secret you're hiding and what you know. One of you is the murderer, and only they know it. |
| **Act One: The Study** | Evidence goes up on the big screen. Each player searches one room (only they see what's there) and may put one yes/no question to Cecil. AI guests can be questioned; they answer out loud. Cecil starts whispering. |
| **Act Two: The Recording** | Cecil asks someone to open **Envelope Two**. The photograph goes on the big screen, but the back, with a number on it, is shown only to the opener. That number opens Sir Edmund's desk drawer and his dictaphone. Whoever opens it hears his last recording, privately. |
| **The Accusation** | Everyone votes on their phone, in private. |
| **The Reveal** | Cecil explains what really happened, then shows the votes, the scores, everyone's secrets, and a list of every piece of mischief he got up to. |

### Cecil's mischief

Cecil knows everything about every player, and he uses it. At set moments he picks one move:

- **An extra clue:** a real clue slipped to one player. Misleading clues tend to go to the murderer, as ammunition.
- **A bluff:** "Look at Dr Hale and say: 'I know where you were at ten past eleven.' You don't."
- **A blank whisper:** your phone buzzes, the big screen says Cecil has had a word with you… and he's told you nothing. Look worried.
- **Gossip:** a true secret about someone else, and then he tells *them* he told you.
- **A secret mission:** "Within ninety seconds, get someone else to say the word 'port'."
- **Odd one out:** every phone buzzes except one. *"Interesting. Three of you have just received information. One of you hasn't."*
- **Who opened the dictaphone:** told to one person, privately.

He also reacts to what happens. If you search Miss Fenn's office, she's told someone has been in there, but not who. If nobody has opened the drawer, his hints get less subtle.

## Running it

You need [Node.js](https://nodejs.org) 20 or newer on the laptop, and phones on the **same Wi-Fi**.

```bash
git clone https://github.com/sandbox-cpu/cecil-mystery.git
cd cecil-mystery
npm install
npm start
```

Then:

1. On the laptop, open **http://localhost:3000**. That's the shared screen; put it on a TV if you like.
2. Everyone scans the QR code with their phone camera, or visits the address shown under it and enters the code.
3. Press **Begin the evening**, and click once anywhere so the browser lets Cecil speak.

The first time, your computer may ask whether Node can accept connections on your network. Allow it on **private** networks, or the phones won't be able to connect. If the QR code shows the wrong address (VPNs can confuse it), set `PUBLIC_URL`.

**Printable evidence pack (optional):** open **http://localhost:3000/pack** and print it. It has place cards, a house plan, the dinner menu and Envelope Two. Tick "We've printed the evidence pack" in the lobby. Without it, everything happens on screen.

**Demo tips:**

- `GAME_SPEED=2 npm start` runs a seven-minute evening.
- The top bar has **Pause** and **Skip** buttons.
- To demo alone, open the join page in two different browsers, or a normal window plus a private one. Each one counts as a separate player.

### Cecil's brain and voice (optional)

Copy `.env.example` to `.env` and add whichever keys you have:

| Setting | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on live Claude: players can ask Cecil and the AI guests anything in their own words, Cecil chooses his own mischief, and he gives closing remarks. Uses `claude-opus-5` by default (`CECIL_MODEL` to change). |
| `ELEVENLABS_API_KEY` | Cecil speaks with an ElevenLabs voice ("George" by default; set `ELEVENLABS_VOICE_ID` for another from your library). His scripted lines are generated in the background as the game starts, so he doesn't pause. |

With neither key the game is complete and fully playable. Cecil answers from a list of suggested questions, his mischief is chosen by rules, and he speaks with the browser's built-in voice. The startup message tells you which mode you're in, and so does the lobby screen.

## How the AI is kept honest

The design idea is that **the shared screen tells the story; your phone tells your story.**

- **Cecil is omniscient but bounded.** His prompt holds the complete truth: every dossier, every secret, and who did it. But the game engine decides what he may say, to whom and when:
  - When you ask a question, Claude only picks which fact in the engine's table you're asking about. The engine supplies the yes or no, and refuses outright if you haven't found the evidence yet or are asking who did it.
  - When he makes mischief, Claude chooses from the moves the engine offers. Every clue's text comes from the authored script, never from the AI, so Cecil can mislead through what he says but never plants fake evidence.
  - A fairness rule makes sure the innocents get a key clue in Act Two if they have nothing to go on.
- **AI guests are players, not hosts.** Each one sees only its own character's dossier, the public evidence and what has happened to it tonight, exactly like a human at the table. The murderer, if it's an AI guest, lies within the rules written for that character.
- **A leak guard checks every line the AI writes** before anyone sees it. It rejects anything that names the murderer alongside guilt, gives away the drawer code, mentions the murderer's motive, or has the murderer confess. Rejected lines are replaced with scripted ones.
- **Whispers use cover traffic.** When the dictaphone is opened, everyone else gets a whisper, not just the murderer, so a glowing envelope on the big screen can't give them away.
- **Anything that goes wrong falls back to the script:** no key, a timeout, a refusal or a bad reply.

## Project layout

```
cecil-mystery/
├── server/
│   ├── index.js              # npm start: loads .env, picks AI and voice, starts the server
│   ├── app.js                # HTTP + Socket.IO: rooms, per-device views, the game clock
│   ├── game.js               # the game engine and the information firewall
│   ├── scenario/ravensmere.js# the mystery: every character, clue, line and mischief
│   ├── ai/cecil.js           # Claude: Cecil's answers and mischief, AI guests, closing words
│   ├── ai/guard.js           # the leak guard
│   └── voice.js              # ElevenLabs proxy and cache
├── public/
│   ├── host.html/.css/.js    # the shared screen
│   ├── play.html/.css/.js    # the phone
│   ├── pack.html             # the printable evidence pack
│   └── shared.js, theme.css
└── test/                     # engine, AI, server and browser tests
```

The engine is deterministic: time comes in through `tick()` and randomness from a seeded generator. That's why the tests can play whole evenings in milliseconds. A new mystery is mostly a new scenario file.

## Tests

```bash
npm test                 # engine, information firewall, AI layer (fake Claude client), server
npm run test:browser     # a whole evening in real browsers: shared screen + two phones
```

The browser test needs Playwright's Chromium (`npx playwright install chromium`), or set `CECIL_CHROMIUM_PATH`. It skips itself if no browser is available, and saves screenshots to `test-results/`.

## Known limitations

- **One mystery with a fixed solution.** Roles are dealt at random, but Miss Fenn is always the murderer, so it's a play-once experience for now.
- **Local network only.** Games live in the laptop's memory. There are no accounts or internet hosting, and restarting the server ends any game in progress. Phones that reload or sleep rejoin automatically.
- **English only, desktop browsers for the shared screen.** Chrome or Edge give the best built-in voices.
- **Phones:** iPhones don't vibrate for web pages, so they get a chime and the on-screen card instead.
- **Live AI adds a few seconds** to free-text questions and mischief. If Claude takes longer than `CECIL_AI_TIMEOUT_MS` (20 seconds), Cecil falls back to his script.
- **ElevenLabs** couldn't be tested from the build environment (its network blocked the service), so it has only been tested against a stand-in. Check it once on your own machine.
- **The printed pack shows the drawer code** to whoever prints it. The instructions ask them not to peek.
