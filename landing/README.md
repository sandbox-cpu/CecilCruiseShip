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

About 51 seconds, black to black, so it loops without a seam. It's built as a sequel's trailer: it doesn't reuse the first cut's structure or pictures. In the small hours Cecil walks into the ship's wireless room and dictates a telegram, and the trailer *is* that telegram. Each line he dictates comes up on telegram tape over the pictures. When he says "Send it", the operator keys the title in Morse code. The soundtrack's rhythm *is* the Morse: one cut per letter, and the title assembling on the tape as each letter lands.

1. Black, and a strip of tape typing itself out: *CECIL HAS TAKEN UP A NEW POSITION STOP*.
2. Cecil in the doorway of the wireless room, the form's header typing in beside him (*FROM CECIL, CHIEF PURSER · TO WHOM IT MAY CONCERN*): *"Sparks. Take a telegram, would you?"* Sparks answers "R" on the key.
3. The ship's wake at night: *"Regret to report. Mr Mortimer Crane went over the side at twenty past one."*
4. A pencilled chart of the North Atlantic. The track from Madeira reaches tonight's position, and brass dividers walk the four days still to run to Barbados: *"Nearest port, four days."* The chart closes in on the sounding under the ship, circled in red: *"Nearest land, three miles…"*
5. *"…Straight down."* Under the ship, looking up at her hull passing far overhead. *Dead reckoning: working out where you are from where you've been.*
6. A typed list headed *PERSONS ABOARD*: the four passengers' photographs, each stamped *ABOARD*: *"Murderer believed to be aboard."*
7. A storm at the porthole: *"Passengers will kindly not disembark."*
8. Close on Cecil: *"Send it."* Then the transmission: DEAD RECKONING in Morse, one picture per letter (the key, the porthole, the grand staircase, the ballroom after the gala, the wake, the hull, the ship, Cecil, and each passenger for a moment). The four faces get about the same time on screen.
9. The title: *A new case for Cecil · Dead Reckoning*. Cecil: *"Dinner will be served as usual."* It comes up on the tape as *DINNER AS USUAL STOP*, the stewards' dinner chimes play, and *Coming soon*.

Every word on screen is Cecil's dictation, the game's public premise or its cast list. It gives nothing away that the game's prologue doesn't show every player.

**The soundtrack.** Radio static and the hum of the wireless valves, the engines far below, the clatter of the teleprinter for every line of tape. A low drone on D gathers under Cecil's dictation, with a slow pulse under the chart. Everything drops away under the ship: a rush of water, a deep boom after "down", the screws turning overhead, the hull groaning, bubbles. Rubber stamps, a quicker heartbeat and thunder at the porthole; then near-silence for "Send it". The transmission is the score: Morse at 150 bpm (a dit is a sixteenth), a kick on every beat, the bass keyed with the Morse, a tom as each letter lands, and strings climbing D minor, B flat, G minor, A into the title hit. After Cecil's last line, the dinner chimes, in D major for once. The music ducks about 12 dB whenever Cecil speaks.

### The classic cut

About 45 seconds, in nine scenes: Cecil's monogram; the Halcyon at night (*Three nights out. Four days from the nearest port.*); Cecil walking the corridor with a telegram on a salver; the Boat Deck and a ship's clock that runs to two, spins back an hour and runs on to twenty past one (*At two o'clock the clocks went back an hour. At twenty past one, Mortimer Crane went over the side.*); a lifebuoy light on black water; the shared screen and private phones; the four passengers, one face per drum hit; Cecil's whispers; and the title, where Cecil speaks for the first time. Its soundtrack is footsteps, the Purser's desk bell, the clock, the ship's whistle, driving strings at 120 bpm and a music box.

### Files

| File | Used for |
|---|---|
| `public/media/trailer-720.mp4` (`.webm`) | The telegram as the page's loop, played muted. It starts on the same frame as its still, so there's no jump. Also "Watch the trailer" on phones. |
| `public/media/trailer-1080.mp4` | "Watch the trailer": the full version, with sound and controls. |
| `public/media/trailer-calm-720.mp4` (`.webm`) | The reduced-motion cut: no camera moves, flashes or shaking, and the montage cross-fades instead of cutting. Same soundtrack. |
| `public/media/still-hero.jpg` | The loop's still (Cecil in the wireless room), and all a reduced-motion visitor sees until they choose to play. |
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
| `wireless-key.jpg`, `hull-below.jpg`, `wake.jpg`, `porthole.jpg`, `staircase.jpg`, `ballroom-after.jpg` | The Morse key, the hull seen from far below, the wake, a porthole in a storm, the grand staircase, the ballroom after the gala (the telegram trailer) | Soul Cinema |

The trailers' moving shots in `public/media/trailer-src/` were animated from those stills with Kling 3.0: the ship, Cecil in the corridor and the lifebuoy for the classic cut; the Morse key and the hull overhead for the telegram. They're silent; the soundtracks supply the sound. Cecil's lines were generated with Seed Audio, using his lines from the Ravensmere trailer as the voice reference, so he sounds like the same Cecil. The telegram's eleven lines were recorded as one take and cut apart. Check that your Higgsfield plan allows commercial use before you use any of these in paid advertising.

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
