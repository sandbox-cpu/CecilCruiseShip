// The shared screen: lobby with QR code, Cecil's narration, the table, evidence and the reveal.
import { applyCase, call, clock, Countdown, esc, lines, patch, phaseName, storage } from "/shared.js";

const $ = (id) => document.getElementById(id);
const socket = io();
const saved = storage("cecil-host");
const prefs = storage("cecil-host-prefs");

let state = null;
let soundOn = prefs.get()?.soundOn ?? true;
let audioUnlocked = false;
let firstState = true;
const played = new Set();
const queue = [];
let speaking = false;
let lastWhisper = new Map();

// ------------------------------------------------------------ connection

// "/?case=halcyon" opens a new table on that mystery; otherwise the last one
// this screen chose, or the server's default.
const askedCase = new URLSearchParams(location.search).get("case");
// "/?watch=CODE" is a read-only copy of another screen's game, for players who aren't in the
// same room (on a video or voice call). It shows and speaks everything; it can't run the evening.
const watchCode = new URLSearchParams(location.search).get("watch");
document.body.classList.toggle("watching", Boolean(watchCode));

async function connect() {
  if (watchCode) {
    const watched = await call(socket, "screen:watch", { code: watchCode });
    if (!watched.ok) {
      $("lobby").hidden = false;
      $("lobby-cecil").textContent = watched.error;
    }
    return;
  }
  const previous = saved.get();
  if (previous) {
    const resumed = await call(socket, "host:resume", previous);
    if (resumed.ok) {
      if (askedCase) call(socket, "host:case", { caseId: askedCase });
      return;
    }
  }
  const created = await call(socket, "host:create", { caseId: askedCase || prefs.get()?.caseId });
  if (created.ok) saved.set({ code: created.code, hostToken: created.hostToken });
}

socket.on("connect", connect);
socket.on("state", (next) => {
  state = next;
  render();
  queueNarration(firstState);
  firstState = false;
});

// ----------------------------------------------------------------- timer

const countdown = new Countdown((ms) => {
  const el = $("timer");
  if (!el) return;
  el.textContent = ms === null ? "" : clock(ms);
  el.classList.toggle("low", ms !== null && ms < 60000);
});

// ----------------------------------------------------------------- render

function render() {
  const phase = state.phase;
  applyCase(state);
  $("lobby").hidden = phase !== "lobby";
  $("stage").hidden = phase === "lobby" || phase === "reveal";
  $("reveal").hidden = phase !== "reveal";
  countdown.set(state.timer);
  if (phase === "lobby") renderLobby();
  else if (phase === "reveal") renderReveal();
  else renderStage();
}

function statusPills() {
  const brain = state.aiEnabled ? `<span class="pill ai">Cecil's brain: Claude</span>` : `<span class="pill">Cecil's brain: scripted</span>`;
  const voice = state.voice === "elevenlabs" ? `<span class="pill ai">Voice: ElevenLabs</span>` : `<span class="pill">Voice: browser</span>`;
  return brain + voice;
}

function renderLobby() {
  $("lobby-title").textContent = state.title;
  $("lobby-tagline").textContent = state.tagline;
  $("lobby-cecil").textContent = state.case.lobbyLine;
  $("pack-link").href = `/pack?case=${encodeURIComponent(state.case.id)}`;
  patch(
    $("case-options"),
    (state.cases || [])
      .map(
        (c) => `<button type="button" class="case-option" data-action="case" data-case="${esc(c.id)}" aria-pressed="${c.id === state.case.id}">
          <span class="case-title">${esc(c.title)}</span>
          <span class="case-setting">${esc(c.setting)}</span>
          <span class="case-meta">${c.seats.min}–${c.seats.max} players · about ${c.minutes} minutes</span>
        </button>`,
      )
      .join(""),
  );
  $("qr").src = `/qr/${state.code}.svg`;
  $("join-url").textContent = state.joinUrl.replace(/\?room=.*$/, "");
  $("room-code").textContent = state.code;
  $("watch-url").textContent = watchCode
    ? "You're watching the shared screen. Join from your phone, or in another window, to play."
    : `Playing over a call? Friends elsewhere can watch this screen at ${state.watchUrl}`;
  patch($("lobby-status"), statusPills());

  const { min, max } = state.lobby;
  const seats = state.seats.map((s) => {
    if (s.kind === "ai") {
      return `<li><span><span class="pill ai">AI</span> An AI guest</span><button class="x" data-action="remove-seat" data-seat="${esc(s.id)}" aria-label="Remove this AI guest">Remove</button></li>`;
    }
    return `<li><span><span class="dot ${s.connected ? "" : "away"}"></span>${esc(s.name)}</span></li>`;
  });
  for (let i = state.seats.length; i < min; i += 1) {
    seats.push(`<li class="empty">An empty chair. Cecil will seat an AI guest.</li>`);
  }
  patch($("seats"), seats.join(""));
  $("seat-count").textContent = `(${state.seats.length}/${max})`;

  const humans = state.lobby.humans;
  const needed = state.lobby.guestsNeeded;
  $("seat-hint").textContent =
    humans === 0
      ? "Waiting for the first guest to join from their phone."
      : needed > 0
        ? `Best with ${min}–${max}. Cecil will seat ${needed} AI guest${needed === 1 ? "" : "s"} to fill the table.`
        : `Everyone's here? ${state.seats.length === max ? "The table is full." : "One more chair is free."}`;
  $("add-guest").disabled = state.seats.length >= max;
  $("start").disabled = humans === 0;
  $("physical").checked = state.physicalPack;
}

const ENVELOPE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`;

function renderStage() {
  $("phase-name").textContent = phaseName(state);
  $("stage-title").textContent = state.title;
  $("whisper-note").textContent = state.case.labels.whisperNote;
  $("paused").hidden = !state.timer.paused;
  $("pause-btn").textContent = state.timer.paused ? "Resume" : "Pause";
  $("voice-btn").textContent = soundOn ? "Voice on" : "Voice off";

  // Lineup, with the whisper glow for anyone Cecil has just spoken to.
  const glowing = new Set();
  for (const seat of state.seats) {
    const before = lastWhisper.get(seat.id);
    if (before !== undefined && seat.lastWhisper !== before) glowing.add(seat.id);
    lastWhisper.set(seat.id, seat.lastWhisper);
  }
  const lineup = state.seats
    .map((s) => {
      const c = s.character;
      const who = s.kind === "ai" ? `<span class="pill ai">AI guest</span>` : `${s.connected ? "" : "⚠ away · "}${esc(s.name)}`;
      let tick = "";
      if (state.phase === "prologue" && s.ready) tick = `<span class="tick">ready</span>`;
      if (state.phase === "accusation" && s.voted) tick = `<span class="tick">voted</span>`;
      const takeover =
        s.kind === "human" && !s.connected
          ? `<button class="icon-btn" data-action="takeover" data-seat="${esc(s.id)}">Let an AI guest take over</button>`
          : "";
      return `<li class="suspect" data-seat="${esc(s.id)}">
        <span class="who">${esc(c ? c.short : s.name)}</span>
        <span class="marks">${tick}<span class="envelope" title="Whispers from Cecil">${ENVELOPE_ICON}${s.whispers}</span></span>
        <span class="player">${who}</span>
        <span class="bio">${esc(c ? c.bio : "")} ${takeover}</span>
      </li>`;
    })
    .join("");
  patch($("lineup"), lineup);
  for (const id of glowing) {
    const card = document.querySelector(`.suspect[data-seat="${CSS.escape(id)}"]`);
    if (!card) continue;
    card.classList.remove("whispered");
    void card.offsetWidth; // restart the animation
    card.classList.add("whispered");
    setTimeout(() => card.classList.remove("whispered"), 3600);
  }

  // Evidence board.
  const tilts = ["-1.2deg", "0.8deg", "-0.4deg", "1.3deg", "-0.9deg"];
  const evidence = state.evidence.length
    ? state.evidence
        .map(
          (e, i) => `<article class="exhibit ${e.kind === "photo" ? "photo" : ""}" style="--tilt:${tilts[i % tilts.length]}">
            <span class="kind">${esc(e.kind)}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`,
        )
        .join("")
    : `<article class="exhibit empty"><p>${esc(state.case.labels.evidenceEmpty)}</p></article>`;
  patch($("evidence"), evidence);

  renderFeed();
}

function renderFeed() {
  // Only what has already been said: not the line on screen, nor lines still queued.
  const unsaid = new Set([currentItem, ...queue].filter(Boolean).map((n) => n.text));
  const items = state.feed
    .filter((f) => !(f.kind === "speech" && unsaid.has(f.text)))
    .slice(-8)
    .reverse()
    .map((f) => {
      if (f.kind === "speech") return `<li><b>${esc(f.speakerName)}:</b> ${esc(f.text)}</li>`;
      if (f.kind === "question") return `<li class="question"><b>${esc(f.from)}</b> asks <b>${esc(f.to)}</b>: “${esc(f.text)}”</li>`;
      return `<li>${esc(f.text)}</li>`;
    })
    .join("");
  patch($("feed"), items);
}

function renderReveal() {
  const r = state.reveal;
  if (!r) return;
  const seat = (id) => state.seats.find((s) => s.id === id);
  const name = (id) => {
    const s = seat(id);
    return s ? `${s.character.short}${s.kind === "human" ? ` (${s.name})` : ""}` : "";
  };
  $("verdict").textContent = r.caught ? `${name(r.killerSeatId)} is caught.` : `${name(r.killerSeatId)} got away with it.`;
  const max = Math.max(1, ...r.tally.map((t) => t.votes));
  patch(
    $("tally"),
    r.tally
      .map(
        (t) => `<li class="${t.seatId === r.killerSeatId ? "killer" : ""}"><span>${esc(name(t.seatId))}${t.seatId === r.killerSeatId ? " 🗡" : ""}</span>
          <span class="bar"><span style="width:${(100 * t.votes) / max}%"></span></span><span>${t.votes}</span></li>`,
      )
      .join(""),
  );
  patch(
    $("scores"),
    r.scores
      .map((s) => `<li><span>${esc(name(s.seatId))}<small>${esc(s.lines.map(([l, p]) => `${l} (+${p})`).join(" · ") || "No points tonight")}</small></span><b>${s.points}</b></li>`)
      .join(""),
  );
  const role = (id) => (id === r.killerSeatId ? "killer" : id === r.decoySeatId ? "decoy" : "");
  const tag = (id) => (id === r.decoySeatId && r.twist ? ` <small class="tag">${esc(r.twist.tag)}</small>` : "");
  patch($("lies"), r.lies.map((l) => `<li class="${role(l.seatId)}"><b>${esc(name(l.seatId))}.</b>${tag(l.seatId)} ${esc(l.text)}</li>`).join(""));
  patch($("mischief"), (r.mischief.length ? r.mischief : ["Cecil behaved himself. Mostly."]).map((m) => `<li>${esc(m)}</li>`).join(""));
}

// -------------------------------------------------------------- narration

function queueNarration(initial) {
  for (const item of state.narration) {
    if (played.has(item.id)) continue;
    played.add(item.id);
    // After a reload, don't replay the whole evening: just show the latest line.
    if (initial) continue;
    queue.push(item);
  }
  if (initial) {
    const last = state.narration.at(-1);
    if (last) showLine(last, true);
  }
  pump();
}

let currentItem = null;

async function pump() {
  if (speaking) return;
  // Lines from a part of the evening that has already ended stay in the feed
  // but aren't read out, so the screen never lags behind the game.
  while (queue.length && state && queue[0].phase !== state.phase) queue.shift();
  const item = queue.shift();
  if (!item) {
    currentItem = null;
    renderFeedIfStage();
    return;
  }
  speaking = true;
  currentItem = item;
  try {
    // If lines have piled up (a burst of events), skim them so Cecil catches up
    // with the game, and save his voice for the most recent ones.
    await present(item, queue.length >= 3);
  } finally {
    speaking = false;
    pump();
  }
}

function renderFeedIfStage() {
  if (state && !["lobby", "reveal"].includes(state.phase)) renderFeed();
}

function showLine(item, instant = false) {
  const target = state.phase === "reveal" ? $("reveal-line") : $("line");
  const isCecil = item.speaker === "cecil";
  $("speaker-name").textContent = isCecil ? "Cecil" : item.speakerName;
  $("speaker-sub").textContent = isCecil ? state.case?.host.sub || "your host" : "an AI guest, speaking";
  $("speaker-mark").textContent = isCecil ? "C" : item.speakerName.replace(/^(Lady|Dr|Miss|Mrs|Mr|Captain|Sir)\s+/, "").charAt(0);
  $("speaker-mark").parentElement.classList.toggle("guest", !isCecil);
  if (instant) {
    target.innerHTML = lines(item.text);
    return Promise.resolve();
  }
  // Typewriter.
  return new Promise((resolve) => {
    const text = item.text;
    const step = Math.max(12, Math.min(34, 2600 / text.length));
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      target.innerHTML = `${esc(text.slice(0, i))}<span class="cursor">▍</span>`;
      if (i >= text.length) {
        clearInterval(timer);
        target.innerHTML = lines(text);
        resolve();
      }
    }, step);
  });
}

async function present(item, fast = false) {
  if (fast) {
    await showLine(item, true);
    renderFeedIfStage();
    await wait(900);
    return;
  }
  const typing = showLine(item);
  renderFeedIfStage();
  const speech = soundOn ? speak(item) : Promise.resolve(false);
  const spoke = await speech;
  await typing;
  // Leave the line up long enough to read if nobody said it out loud.
  if (!spoke) await wait(Math.max(1800, item.text.length * 45));
  else await wait(500);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function speak(item) {
  if (!audioUnlocked) {
    $("sound-gate").hidden = false;
    return false;
  }
  if (item.speaker === "cecil" && state.voice === "elevenlabs") {
    const ok = await playAudio(`/voice/${state.code}/${item.id}.mp3`);
    if (ok) return true;
  }
  return browserSpeak(item);
}

function playAudio(url) {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    const done = (ok) => {
      audio.onended = audio.onerror = null;
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.play().catch(() => done(false));
    setTimeout(() => done(!audio.paused), 30000);
  });
}

function voices() {
  const all = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const british = all.filter((v) => /en-GB/i.test(v.lang));
  return british.length ? british : all.filter((v) => /^en/i.test(v.lang));
}

// Each speaker gets a consistent voice and pitch.
function voiceFor(speaker) {
  const list = voices();
  if (speaker === "cecil") {
    const preferred = list.find((v) => /daniel|arthur|george|male/i.test(v.name));
    return { voice: preferred || list[0], pitch: 0.85, rate: 0.93 };
  }
  let hash = 0;
  for (const ch of speaker) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { voice: list[hash % Math.max(1, list.length)], pitch: 0.9 + (hash % 5) * 0.1, rate: 1.0 };
}

function browserSpeak(item) {
  if (!window.speechSynthesis) return Promise.resolve(false);
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(item.text);
    const { voice, pitch, rate } = voiceFor(item.speaker);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-GB";
    utterance.pitch = pitch;
    utterance.rate = rate;
    const finish = (ok) => resolve(ok);
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);
    speechSynthesis.speak(utterance);
    setTimeout(() => finish(false), 30000);
  });
}

// ---------------------------------------------------------------- actions

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  unlockAudio();
  const action = button.dataset.action;
  const seatId = button.dataset.seat;
  const actions = {
    case: () => {
      prefs.set({ ...prefs.get(), caseId: button.dataset.case });
      return call(socket, "host:case", { caseId: button.dataset.case });
    },
    "add-guest": () => call(socket, "host:addGuest"),
    "remove-seat": () => call(socket, "host:removeSeat", { seatId }),
    start: () => call(socket, "host:start"),
    pause: () => call(socket, state.timer.paused ? "host:resume" : "host:pause"),
    skip: () => (confirm("Skip to the next part of the evening?") ? call(socket, "host:skip") : { ok: true }),
    reset: () => call(socket, "host:reset"),
    takeover: () => call(socket, "host:takeover", { seatId }),
    voice: () => {
      soundOn = !soundOn;
      prefs.set({ ...prefs.get(), soundOn });
      if (!soundOn && window.speechSynthesis) speechSynthesis.cancel();
      render();
      return { ok: true };
    },
    "enable-sound": () => ({ ok: true }),
  };
  const run = actions[action];
  if (!run) return;
  button.disabled = true;
  const result = await run();
  button.disabled = false;
  if (result && !result.ok) {
    if (state?.phase === "lobby") $("lobby-error").textContent = result.error;
    else alert(result.error);
  } else if (state?.phase === "lobby") {
    $("lobby-error").textContent = "";
  }
});

$("physical").addEventListener("change", (event) => {
  call(socket, "host:physical", { value: event.target.checked });
});

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  $("sound-gate").hidden = true;
  // Prime speech synthesis inside the user gesture so later lines can play.
  if (window.speechSynthesis) {
    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    speechSynthesis.speak(primer);
  }
}

if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
