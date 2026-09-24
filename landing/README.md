# Cecil: A Nightcap at Ravensmere · coming-soon page

The landing page and early-access waitlist for [Cecil](https://github.com/sandbox-cpu/cecil-mystery), the AI-hosted murder mystery. It's a separate project from the game: nothing here touches the game's code or its solution.

- **The page** (`public/`): plain HTML, CSS and JavaScript with no build step. It opens on the house at night. Below that come the trailer (a silent loop, with its soundtrack when opened), Cecil himself, the night of the murder, the "two screens" explanation of how the game plays, Cecil's mischief, the four suspects' faces, a FAQ and the waitlist form. It works on phones and desktops, respects reduced-motion settings, and the form still works with JavaScript switched off.
- **The waitlist** (`server/`): a small Node server. Each sign-up is saved as a row in a SQLite file, and a password-protected admin page lets you view, export and remove sign-ups.
- **The trailer** (`trailer/`): a [Remotion](https://www.remotion.dev) project that renders the trailer, a reduced-motion cut and the still images into `public/media/`.

## Run it

You need [Node.js](https://nodejs.org) 22.13 or newer (it uses Node's built-in SQLite).

```bash
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

**Netlify, connected to GitHub:** choose Add new site → Import an existing project → GitHub → CecilLanding. `netlify.toml` already holds the build settings, so just press Deploy. Netlify rebuilds on every push and fills in the site's address for link previews.

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
- **Confirms clearly.** On success the form is replaced by Cecil's reply ("Very good, Sam. You're on the list.") and focus moves to it for screen readers. Signing up twice says "You're already on the list" instead of adding a duplicate. There's also a button to share the page with friends.
- **Blocks spam.** A hidden field catches bots, and each IP address is limited to 8 attempts per 10 minutes.
- **Works without JavaScript.** The form posts normally and gets a confirmation page back.

The promise under the form reads: *"We'll only email you about early access, we never share your address, and you can ask to be removed at any time by replying to any of our emails."* If that changes, update the text in `public/index.html` and bump `CONSENT_VERSION` in `server/store.js`.

## Publish it

The site is one small Node process plus one file on disk, so it needs a host that runs Node **and keeps files between restarts**. Static-only or serverless hosting (GitHub Pages, Netlify, Vercel functions) won't do: the database would be wiped on each deploy.

Hosts that fit, from simplest:

- **Render:** a Web Service from this repo (build `npm install`, start `npm start`) with a persistent disk mounted at `/var/data`.
- **Railway** or **Fly.io:** deploy the included `Dockerfile` and attach a volume at `/data`.
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

The trailer runs 38 seconds and fades from black to black, so it loops without a seam. Its eight scenes:

1. Cecil's monogram, and *Ravensmere Hall · Yorkshire · November 1978*.
2. The camera drifts towards the house on the moor, one window lit: *Sir Edmund rang for his port at eleven.*
3. Cecil walks the hall with the tray, on the beat of his own footsteps.
4. The tray of port outside the study door, where a clock runs from 11.05 to 11.20: *By midnight he was dead.*
5. The shared screen and three private phones: *One screen tells the story. Every phone tells a different one.*
6. The suspects, one face on each drum hit: Lady Vivienne, Dr Hale, Miss Fenn and Captain Lyle, then all four together: *Everyone has something to hide.*
7. Three of Cecil's whispers arriving. From scene 5 on, a small, faint clock fades in and out in the corner: 11.30, 11.38, 11.45, 11.52, 11.59.
8. The title card, landing at midnight. Cecil speaks for the first time: *"Good evening. I am Cecil, and I shall be your host tonight."* Then, as *Coming soon* appears: *"Do find a seat, and try not to touch anything."*

Every line in it comes from the game's own script or README. It gives nothing away that the game's prologue and first act don't show every player.

**The soundtrack** tells the story before anyone speaks. Measured footsteps come down the hall and stop outside the study door. A tray is set down with a faint clink of glass. The clock ticks while its hands run from 11.05 to 11.20, then the chime lands on *By midnight he was dead*, and the ticking stops with it. Under all this runs a quiet, uneasy score: a low drone, a slow minor-key string pad, and a music box that never resolves. When the screens appear the music turns dramatic: driving low strings at 120 bpm, a timpani hit under each suspect's face, a high line creeping up by half-steps, phones buzzing as Cecil whispers and the corner clock ticking on the beat. A rise and a beat of silence lead into the hit and the bell's second stroke of midnight on the title. Only then does anyone speak: Cecil's two lines, in his ElevenLabs voice, with the music ducking about 13 dB beneath him. Under the last line, the music box plays its opening notes again and finally resolves.

The soundtrack is synthesised in code (`trailer/make-sound.mjs`, with a small toolkit in `trailer/sound/dsp.mjs`), not recorded, so it re-renders along with the picture. Cecil's lines are the only recordings: `trailer/voice/cecil-host.wav` and `cecil-seat.wav`, decoded from the ElevenLabs MP3s at 48 kHz. To swap a line, replace the file and update its `at` and `speech` times in `timing.js`. Every cue, from each footstep to the hit, is a frame number in `trailer/src/timing.js`, which the scenes use too, so sound and picture can't drift apart.

| File | Used for |
|---|---|
| `public/media/trailer-720.mp4` (`.webm`) | The hero loop, played muted. It starts on the same frame as the still, so there's no jump. Also "Watch the trailer" on phones. |
| `public/media/trailer-1080.mp4` | "Watch the trailer": the full version, with sound and controls. |
| `public/media/trailer-calm-720.mp4` (`.webm`) | The reduced-motion cut: no camera moves, flicker or shaking, just slow cross-fades. Same soundtrack. |
| `public/media/trailer-sound.wav` | The soundtrack on its own, as the videos are built from it. The page never loads it. |
| `public/media/still-corridor.jpg` | The hero's still image, and all a reduced-motion visitor sees until they choose to play. |
| `public/media/poster.jpg` | The poster for the full trailer. |
| `public/media/social-card.jpg` | The preview image when the link is shared (1200×630). |
| `public/media/trailer-src/` | The two moving shots the trailer is cut from. Only the trailer uses them; the static build leaves them out. |

**How the page uses them:** the hero loop is always muted; sound plays only when someone opens the trailer. The loop plays only while it's on screen and can be paused. It doesn't autoplay for anyone who has asked their device to reduce motion, or who has Data Saver on; they get the still and a button to watch.

**To change and re-render it:**

```bash
cd trailer
npm install
npm run studio        # live preview in the browser
npm run sound         # just the soundtrack (a few seconds), with a level report per section
npm run render        # soundtrack, videos and stills into ../public/media (a few minutes)
```

The scenes are in `trailer/src/scenes.jsx`, the corner clock in `trailer/src/ClockOverlay.jsx`, and the shared timings in `trailer/src/timing.js`. The photographs are in `public/media/photos/`, which the page and the trailer share (see [The pictures](#the-pictures)). The film grain is a tile made by `npm run grain` (`public/media/grain.png`); only the trailer uses it. Remotion downloads its own headless Chrome the first time; set `REMOTION_BROWSER` to use one you already have.

## The pictures

The house, the rooms, Cecil and the four suspects were made with [Higgsfield](https://higgsfield.ai) to match the game's setting: an English country house on the Yorkshire moors in November 1978, lit like a film of the period. None of them is a real person. They're in `public/media/photos/`, brightened and cropped for the web, and the page and the trailer share them.

| File | What it shows | Model |
|---|---|---|
| `house.jpg` | Ravensmere Hall at night, one window lit (the hero, the trailer's title) | Soul Cinema |
| `cecil.jpg`, `cecil-portrait.jpg` | Cecil with his tray (the host card) | Soul Cinema |
| `corridor.jpg` | The tray of port outside the study door | Soul Cinema |
| `study.jpg` | Sir Edmund's desk, the diary and the locked drawer | Soul Cinema |
| `envelope.jpg` | Envelope Two, sealed | GPT Image 2.5 |
| `vivienne.jpg`, `hale.jpg`, `fenn.jpg`, `lyle.jpg` | The four suspects | Soul Cinema |
| `entrance.jpg`, `dining.jpg` | The hall and the dining room (section backgrounds) | Soul Cinema |

The trailer's two moving shots, `public/media/trailer-src/house-push.mp4` (towards the house) and `cecil-walk.mp4` (Cecil down the hall), were animated from the house and Cecil stills with Kling 3.0. They're silent; the trailer's soundtrack supplies the footsteps. Check that your Higgsfield plan allows commercial use before you use any of these in paid advertising.

To swap a picture, keep the file name and roughly the same framing, then re-render the trailer if it appears there. The static build fingerprints every file in `public/media/`, so a new version is picked up straight away.

## Tests

```bash
npm test                  # email rules, the database, the API and admin (fast)
npm run test:browser      # the real page in Chromium: desktop, phone, reduced motion, no JavaScript
```

The browser test fills in the form end to end: it triggers errors, uses the typo suggestion, signs up, signs up again, and checks the saved row in the database and the CSV export. It saves screenshots to `test-results/`. It needs Playwright's Chromium (`npx playwright install chromium`), or set `CHROMIUM_PATH`.

## What the page says, and doesn't

The page sells the parts of the game that are real today: 3–4 players in the same room, about 15 minutes, one shared screen plus private phones, AI guests in empty chairs, Cecil's whispers and mischief, and an optional printed evidence pack. It doesn't promise online play, more mysteries or replayability. The FAQ says plainly that the mystery has a single solution.

It never reveals the solution. It shows only what every player learns in the prologue and the first act, plus the cast list from the printable pack. The mock phone that reads "You are the murderer" has no character name on it, and none of the example whispers point at the culprit.

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
  media/          the trailer and its stills
  media/photos/   the house, the rooms, Cecil and the suspects
  media/trailer-src/  the trailer's two moving shots (not deployed)
  fonts/          Cormorant Garamond and EB Garamond, self-hosted
scripts/export.js npm run export
scripts/build-static.js  npm run build:static: the static preview in dist/
netlify.toml      Netlify build settings for the static preview
trailer/          the Remotion project
test/             unit, API and browser tests
```
