# Cecil: Dead Reckoning · coming-soon page

The landing page and early-access waitlist for **Dead Reckoning**, Cecil's second case: a murder aboard the SS Halcyon. It lives in the game's repository (`landing/`) but is a separate project: nothing here touches the game's code or its solution, and the page gives nothing away that every player doesn't learn in the prologue and first act.

- **The page** (`public/`): plain HTML, CSS and JavaScript with no build step. It opens on the Halcyon at night. Below that come the trailer (a silent loop, with its soundtrack when opened), Cecil as Chief Purser, the night of the man overboard, the "two screens" explanation of how the game plays, Cecil's mischief, the four passengers' faces, a FAQ and the waitlist form. It works on phones and desktops, respects reduced-motion settings, and the form still works with JavaScript switched off.
- **The waitlist** (`server/`): a small Node server. Each sign-up is saved as a row in a SQLite file, and a password-protected admin page lets you view, export and remove sign-ups.
- **The trailer** (`trailer/`): a [Remotion](https://www.remotion.dev) project that renders two cuts of the trailer (the telegram, and the classic first cut), each with a reduced-motion version, plus the still images, into `public/media/`.

## Run it

You need [Node.js](https://nodejs.org) 22.13 or newer (it uses Node's built-in SQLite).

```bash
cd landing
npm install
cp .env.example .env        # then set ADMIN_TOKEN to a long random password
npm start
```

Open **http://localhost:4000**. The startup message tells you where sign-ups are being saved and whether the admin page is on.

## Show it now: a static preview (no sign-ups yet)

For showing the site before the waitlist is hosted, there's a static build that needs no server. Everything looks and plays the same, including the trailer, Ask Cecil and the form's checks and Cecil's reply. The form sends and saves nothing, though, and says so ("Preview: sign-ups open at launch"). The preview is also kept out of search engines.

**Netlify, drag and drop:**

```bash
npm install --omit=dev
npm run build:static
```

Then log in at [app.netlify.com/drop](https://app.netlify.com/drop) and drag the new `dist` folder onto the page. To update it later, rebuild and drag the folder onto your site's **Deploys** tab.

**Netlify, connected to GitHub:** choose Add new site → Import an existing project → GitHub → CecilCruiseShip, and set **Base directory** to `landing`. `landing/netlify.toml` already holds the build settings, so just press Deploy. Netlify rebuilds on every push and fills in the site's address for link previews.

When you're ready to take real sign-ups, the waitlist needs a host that keeps its database (see [Publish it](#publish-it)), or a Netlify Function with Netlify Blobs in place of the SQLite file.

## Where sign-ups go

Every sign-up is saved to **`data/waitlist.db`**, a single SQLite file (set `WAITLIST_DB` to put it somewhere else). Each row holds:

| Column | What it is |
|---|---|
| `email` | The address as typed, tidied. Duplicates are caught regardless of capitalisation. |
| `name` | The optional "What should Cecil call you?" answer. |
| `source` | Where they came from, if the link had `?ref=…` or `?utm_source=…`. |
| `consent` | Which version of the promise under the form they agreed to (`early-access-v1`). |
| `created_at` | When they signed up (UTC). |

No IP addresses or other tracking data are stored.

**To see or export the list:**

- **Admin page:** `/admin` (for example http://localhost:4000/admin). Use any username; the password is your `ADMIN_TOKEN`. It shows the count and every sign-up, has **Download CSV** and **Download JSON** buttons, and lets you remove someone who asks to be taken off the list.
- **Direct downloads:** `curl -u admin:$ADMIN_TOKEN https://your-site/admin/export.csv -o waitlist.csv`
- **From the command line:** `npm run export` writes `exports/cecil-waitlist-YYYY-MM-DD.csv` straight from the database, with or without the server running. Add `-- --json` for JSON.
- **Any SQLite tool:** `sqlite3 data/waitlist.db "select * from signups"`

CSV exports open cleanly in Excel, Google Sheets and Numbers, and import into Mailchimp, Buttondown, ConvertKit and similar tools. Cells that start with `=`, `+`, `-` or `@` are prefixed with `'` so a spreadsheet won't run them as formulas.

**Back it up** by copying the `.db` file, or run `sqlite3 data/waitlist.db ".backup waitlist-backup.db"` while the server is running.

## How the form behaves

- **Checks as you go.** The same rules run in the browser and on the server (`public/js/email.js`): a missing `@`, a missing ending such as `.com`, doubled dots, characters email doesn't allow, and so on. Each problem gets a plain-English message.
- **Catches likely typos.** Mistakes such as `gmial.com` or `hotmail.con` get a one-click "Did you mean…?". Pressing submit again sends the address as typed.
- **Confirms clearly.** On success the form is replaced by Cecil's reply ("Very good, Sam. You're on the passenger list.") and focus moves to it for screen readers. Signing up twice says "You're already on the passenger list" instead of adding a duplicate. There's also a button to share the page with friends.
- **Blocks spam.** A hidden field catches bots, and each IP address is limited to 8 attempts per 10 minutes.
- **Works without JavaScript.** The form posts normally and gets a confirmation page back.

The promise under the form reads: *"We'll only email you about early access, we never share your address, and you can ask to be removed at any time by replying to any of our emails."* If that changes, update the text in `public/index.html` and bump `CONSENT_VERSION` in `server/store.js`.

## Publish it

The site is one small Node process plus one file on disk, so it needs a host that runs Node **and keeps files between restarts**. Static-only or serverless hosting (GitHub Pages, Netlify, Vercel functions) won't do: the database would be wiped on each deploy.

Hosts that fit, from simplest:

- **Render:** a Web Service from this repo with **Root directory** `landing` (build `npm install`, start `npm start`) and a persistent disk mounted at `/var/data`.
- **Railway** or **Fly.io:** deploy `landing/Dockerfile` (with `landing` as the build context) and attach a volume at `/data`.
- **Any VPS:** `npm install && npm start` behind Caddy or nginx for HTTPS, with a process manager such as systemd or pm2.

Set these environment variables on the host:

| Variable | Value |
|---|---|
| `ADMIN_TOKEN` | A long random password (`openssl rand -base64 24`). |
| `WAITLIST_DB` | A path on the persistent disk, e.g. `/var/data/waitlist.db` (the Docker image already uses `/data/waitlist.db`). |
| `SITE_URL` | The public address, e.g. `https://cecil.example.com`, so link previews show the social card. |
| `TRUST_PROXY` | `1`, so rate limiting sees real visitors behind the host's load balancer. |

The host usually provides `PORT`; the server picks it up automatically.

**Before you announce it:**

1. **Domain and HTTPS.** Point your domain at the host; the hosts above provide certificates automatically.
2. **Who's collecting the data.** Add your name or company and a contact address (a footer line or a short privacy page). If you're in the UK or EU, UK GDPR/GDPR applies: the promise under the form covers purpose and consent, but people also need to know who you are and how to reach you.
3. **An email tool for the launch message.** This site only collects addresses. When invitations go out, export the CSV into Mailchimp, Buttondown or similar. They handle unsubscribe links and deliverability.
4. **Backups.** Snapshot the disk or copy the `.db` file on a schedule.
5. **Remotion licence.** Remotion is free for individuals and companies of up to three people. Larger companies need a [company licence](https://www.remotion.pro/license) to render with it. This only affects re-rendering the trailer; the rendered video files don't need a licence.

## The trailer

There are two cuts. The page plays **the telegram** by default; **the classic cut** (the first trailer) is kept as an alternative. Add `?trailer=classic` to the page's address to watch it there (the static preview too). To make it the default, set `DEFAULT_CUT = "classic"` in `public/js/main.js`.

### The telegram (the default)

About 65 seconds, black to black, so it loops without a seam. It sells what playing is like: sitting at a table with your friends, one of whom did it, while Cecil stirs the pot. It doesn't reuse the first cut's structure; its rhythm is Morse code.

1. **One of you.** Friends round a dinner table, faces lit by their phones; the game's shared screen is on the TV at the end. Cecil: *"One of you killed Mortimer Crane."* Cards slam in between the phones: *FOUR FRIENDS.* Three phones light up with dossiers. *FOUR SECRETS.* The fourth, on its own, reads *You killed him. Nobody else knows. Keep it that way.* *ONE MURDERER.* Cecil, in the dark of the ship's wireless room: *"And I know... exactly which one."*
2. **Nowhere to go.** The Halcyon at night, the fact typed on telegram tape (*MR MORTIMER CRANE OVER THE SIDE 0120 STOP*). Cecil: *"He was a dreadful man. But he was my passenger."* The chart, close on tonight's position, the depth circled: *"Nearest land, three miles."* Under the ship: *"Straight down."*
3. **Dinner as usual.** *"Dinner will be served as usual."* The stewards' chimes, and we're back at the table, where the shared screen says *I have had a private word with each of you. The Purser's Bureau never really closes.*
4. **Cecil's mischief.** Three private words pop up on your phone as it buzzes, word for word as the game sends them, each about a different friend, with that friend just behind the phone. Then who that friend is playing tonight:
   - *I have just told Miss Kingsley (Priya) something about you. Something true.* **Miss Coral Kingsley**, Britain's sweetheart of 1949.
   - *Ask Mr Quill (Jonah), in front of everyone, why their story has changed. It hasn't. Yet.* **Mr Laurence Quill**, travelling alone.
   - *A task from Cecil: within ninety seconds, get two other people to agree that Miss Ashdown (Ellie) looks seasick.* **Miss Penelope Ashdown**, the Social Hostess.
5. **Only one of you.** Cecil to the table: *More than one of you has lied to this table about last night.* A hit: *Only one of you is lying about murder.*
6. **The transmission.** DEAD RECKONING goes out in Morse, one picture per letter, the title assembling on the tape: the key, the guilty phone, Priya, the shared screen, Jonah, Cecil, the three characters, the hull, a blank whisper (*Do look worried*), the ship. The three faces get about the same time on screen.
7. **The title**, and then the vote. The shared screen's clock runs down: *One minute. I'd start deciding whom to throw to the sharks.* The table. Your phone: *Who killed Mortimer Crane?* Cecil: *"Tell me, privately. Who killed Mortimer Crane?"* Your thumb moves from name to name, faster, and lifts. Black. A question mark in Morse. *Coming soon.*

Every word on screen is the game's own: Cecil's lines and whispers as the game sends them, its public premise and its cast list. The whispers are real mischief from the game (a bluff, a secret task, and the line Cecil sends when he's told someone a secret about you); none of them hints at the answer, and the friends' names are examples. Nothing in it points at the solution or at one character more than the others.

**The picture.** The night photographs get a gamma lift (an SVG filter, `#lift`, defined in `Trailer.jsx`) that opens up their shadows without clipping candles and screens; the phones and type don't. Cecil and the shot under the ship are left dark on purpose. There's no added film grain, and photographs are never enlarged much past their own resolution. The table shots can be moving clips: `table-lookup`, `table-smile`, `table-squirm`, `table-toast` and `table-point` in `public/media/trailer-src/` are used when they exist (the render reports which), and until then each falls back to its still.

**The soundtrack.** Phones buzzing on a table, a hit on each card, each harder than the last, a sting on the guilty phone, and Cecil close and quiet. A sly plucked figure under "exactly which one". Sea, engines and a sad string chord for "my passenger"; a rush of water and a deep boom under the ship; the dinner chimes, in D major. Cecil's mischief gets a pizzicato ostinato that grows with each private word, a pulse that gets heavier, and a thump as each character is revealed. The music stops for "More than one of you has lied" and hits on "only one of you". The transmission is the score: Morse at 150 bpm (a dit is a sixteenth), a kick on every beat, the bass keyed with the Morse and strings climbing D minor, B flat, G minor, A into the title hit. Then the shared screen's clock ticks, a heartbeat quickens under the vote, and everything stops dead. A question mark in Morse, and the music is left on A, unresolved. It ducks about 12 dB whenever Cecil speaks.

### The classic cut

About 45 seconds, in nine scenes: Cecil's monogram; the Halcyon at night (*Three nights out. Four days from the nearest port.*); Cecil walking the corridor with a telegram on a salver; the Boat Deck and a ship's clock that runs to two, spins back an hour and runs on to twenty past one (*At two o'clock the clocks went back an hour. At twenty past one, Mortimer Crane went over the side.*); a lifebuoy light on black water; the shared screen and private phones; the four passengers, one face per drum hit; Cecil's whispers; and the title, where Cecil speaks for the first time. Its soundtrack is footsteps, the Purser's desk bell, the clock, the ship's whistle, driving strings at 120 bpm and a music box.

### Files

| File | Used for |
|---|---|
| `public/media/trailer-720.mp4` (`.webm`) | The telegram as the page's loop, played muted. It starts on the same frame as its still, so there's no jump. Also "Watch the trailer" on phones. |
| `public/media/trailer-1080.mp4` | "Watch the trailer": the full version, with sound and controls. |
| `public/media/trailer-calm-720.mp4` (`.webm`) | The reduced-motion cut: no camera moves, flashes or shaking, and the montage cross-fades instead of cutting. Same soundtrack. |
| `public/media/still-hero.jpg` | The loop's still (the dinner table, the shared screen on the TV), and all a reduced-motion visitor sees until they choose to play. |
| `public/media/trailer-sound.wav` | The soundtrack on its own, as the videos are built from it. The page never loads it. |
| `public/media/trailer-classic-*.mp4` (`.webm`), `still-classic.jpg`, `trailer-classic-sound.wav` | The same set for the classic cut. |
| `public/media/poster.jpg` | The poster for the full trailer (either cut). |
| `public/media/social-card.jpg` | The preview image when the link is shared (1200×630). |
| `public/media/trailer-src/` | The moving shots the trailers are cut from. Only the trailers use them; the static build leaves them out. A shot whose clip is missing falls back to its photograph. |

**How the page uses them:** the loop is always muted; sound plays only when someone opens the trailer. The loop plays only while it's on screen and can be paused. It doesn't autoplay for anyone who has asked their device to reduce motion, or who has Data Saver on; they get the still and a button to watch.

**To change and re-render:**

```bash
cd landing/trailer
npm install
npm run studio          # live preview in the browser (both cuts)
npm run sound           # just the telegram's soundtrack (a few seconds), with a level report per section
npm run render          # both cuts: soundtracks, videos and stills into ../public/media (a while)
npm run render:full     # just the telegram (also render:calm, render:stills, render:classic)
```

Each cut has its own folder: `trailer/src/telegram/` (the scenes, the Morse code in `morse.js` and the shared timings in `timing.js`) and `trailer/src/classic/`. The soundtracks are synthesised in code (`trailer/sound/telegram.mjs` and `trailer/sound/classic.mjs`, with a small toolkit in `trailer/sound/dsp.mjs`), not recorded, so they re-render with the picture. Every cue is a frame number in the cut's `timing.js`, which its scenes use too, so sound and picture can't drift apart. Cecil's lines are the only recordings, in `trailer/voice/telegram/` and `trailer/voice/classic/`. To swap one, replace the file and update its `at` and `speech` times in `timing.js`. The telegram tape is set in Courier Prime (`public/fonts/courier-prime-bold.woff2`, which only the trailer loads). The film grain is a tile made by `npm run grain` (`public/media/grain.png`). Remotion downloads its own headless Chrome the first time; set `REMOTION_BROWSER` to use one you already have.

## The pictures

The ship, its rooms, Cecil and the four passengers were made with [Higgsfield](https://higgsfield.ai) to match the game's setting: a British ocean liner on an autumn cruise to the Caribbean in 1961, lit like a film of the period. None of them is a real person. They're in `public/media/photos/`, and the page and the trailer share them.

| File | What it shows | Model |
|---|---|---|
| `ship.jpg` | The SS Halcyon at night on the Atlantic (the hero, the trailer's title) | Soul Cinema |
| `cecil.jpg`, `cecil-portrait.jpg` | Cecil as Chief Purser, with a telegram (the host card, the trailer) | GPT Image 2.5, from Cecil's Ravensmere portrait |
| `boat-deck.jpg` | No. 7 lifeboat on the Boat Deck in the rain | Soul Cinema |
| `lifebuoy.jpg` | A lifebuoy light on black water | Soul Cinema |
| `cabin.jpg` | Cabin A128 and the locked attaché case | Soul Cinema |
| `ballroom.jpg`, `smoking.jpg` | The ballroom and the Smoking Room (section backgrounds) | Soul Cinema |
| `kingsley.jpg`, `quill.jpg`, `ashdown.jpg`, `pryce.jpg` | The four passengers | Soul Cinema |
| `cecil-wireless.jpg` | Cecil in the doorway of the wireless room (the telegram trailer) | GPT Image 2.5, from the Chief Purser still |
| `wireless-key.jpg`, `hull-below.jpg`, `wake.jpg` | The Morse key, the hull seen from far below, the wake (the telegram trailer) | Soul Cinema |
| `table-night.jpg`, `table-glance.jpg`, `table-stare.jpg` | Friends playing round a dinner table; one glancing across it; one being stared at (the telegram trailer). The trailer puts the game's shared screen on the TV. | Soul Cinema |

The trailers' moving shots in `public/media/trailer-src/` were animated from those stills with Kling 3.0: the ship, Cecil in the corridor and the lifebuoy for the classic cut; the Morse key and the hull overhead for the telegram. They're silent; the soundtracks supply the sound. Cecil's lines were generated with Seed Audio, using his lines from the Ravensmere trailer as the voice reference, so he sounds like the same Cecil. The telegram's lines were recorded in two takes and cut apart. Check that your Higgsfield plan allows commercial use before you use any of these in paid advertising.

To swap a picture, keep the file name and roughly the same framing, then re-render the trailer if it appears there. The static build fingerprints every file in `public/media/`, so a new version is picked up straight away.

## Tests

```bash
npm test                  # email rules, the database, the API and admin (fast)
npm run test:browser      # the real page in Chromium: desktop, phone, reduced motion, no JavaScript
```

The browser test fills in the form end to end: it triggers errors, uses the typo suggestion, signs up, signs up again, and checks the saved row in the database and the CSV export. It saves screenshots to `test-results/`. It needs Playwright's Chromium (`npx playwright install chromium`), or set `CHROMIUM_PATH`.

## What the page says, and doesn't

The page sells the parts of the game that are real today: 3–4 players in the same room, about 15–20 minutes, one shared screen plus private phones, AI guests in empty chairs, Cecil's whispers and mischief, and an optional printed evidence pack. It doesn't promise online play or replayability. The FAQ says plainly that the mystery has a single solution.

It never reveals the solution. It shows only what every player learns in the prologue and the first act (Cecil's account of the night, the clocks going back, the man overboard at No. 7 lifeboat, the locked attaché case), plus the cast list from the printable pack. The mock phone that reads "You killed him" has no character name on it, and none of the example whispers point at anyone in particular.

## Project layout

```
server/
  index.js        npm start: reads .env, opens the database, starts the server
  app.js          routes: the page, POST /api/waitlist, /admin and exports, security headers
  store.js        the SQLite waitlist and the CSV export
public/
  index.html      the page
  styles.css      the game's palette and type, plus layout
  js/main.js      trailer loop, dialog, Ask Cecil, the form
  js/email.js     email checks, shared by the browser and the server
  js/admin.js     the admin page's Remove button
  media/          the trailers and their stills
  media/photos/   the ship, its rooms, Cecil and the passengers
  media/trailer-src/  the trailers' moving shots (not deployed)
  fonts/          Cormorant Garamond and EB Garamond, self-hosted (and Courier Prime, for the trailer)
scripts/export.js npm run export
scripts/build-static.js  npm run build:static: the static preview in dist/
netlify.toml      Netlify build settings for the static preview
trailer/          the Remotion project: both cuts of the trailer
test/             unit, API and browser tests
```
