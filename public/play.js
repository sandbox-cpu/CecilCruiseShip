// The phone: join, private dossier, Cecil's whispers, clues, actions and the vote.
import { call, clock, Countdown, esc, lines, patch, PHASE_NAMES, storage } from "/shared.js";

const $ = (id) => document.getElementById(id);
const socket = io();
const saved = storage("cecil-player");
const params = new URLSearchParams(location.search);

let state = null;
let tab = "dossier";
let lastPhase = null;
let selectedGuest = null;
let overlayItem = null;
let audio = null;
const seenWhispers = new Set();
let firstState = true;

// ------------------------------------------------------------ joining

function show(screen) {
  for (const id of ["join", "waiting", "game"]) $(id).hidden = id !== screen;
}

function showJoin(message = "") {
  show("join");
  const code = params.get("room") || saved.get()?.code || "";
  if (!$("join-code").value) $("join-code").value = code.toUpperCase();
  if (!$("join-name").value) $("join-name").value = saved.get()?.name || "";
  $("join-error").textContent = message;
  ($("join-code").value ? $("join-name") : $("join-code")).focus();
}

socket.on("connect", async () => {
  const mine = saved.get();
  const room = (params.get("room") || "").toUpperCase();
  if (mine?.token && (!room || room === mine.code)) {
    const resumed = await call(socket, "player:resume", { code: mine.code, token: mine.token });
    if (resumed.ok) return;
    saved.set({ name: mine.name, code: mine.code });
  }
  showJoin();
});

socket.on("removed", () => {
  const mine = saved.get();
  saved.set({ name: mine?.name, code: mine?.code });
  state = null;
  showJoin("You've left the table. Join again with the code on the big screen.");
});

$("join-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  unlockAudio();
  const code = $("join-code").value.trim().toUpperCase();
  const name = $("join-name").value.trim();
  const result = await call(socket, "player:join", { code, name });
  if (!result.ok) {
    $("join-error").textContent = result.error;
    return;
  }
  saved.set({ code: result.code, token: result.token, name });
  history.replaceState(null, "", `/play?room=${result.code}`);
});

$("leave").addEventListener("click", async () => {
  await call(socket, "player:leave");
  const mine = saved.get();
  saved.set({ name: mine?.name, code: mine?.code });
  showJoin();
});

// ------------------------------------------------------------- state

socket.on("state", (next) => {
  state = next;
  if (state.phase !== lastPhase) {
    tab = defaultTab(state.phase);
    lastPhase = state.phase;
  }
  render();
  notifyWhispers();
  firstState = false;
});

function defaultTab(phase) {
  return { lobby: "dossier", prologue: "dossier", act1: "act", act2: "act", accusation: "accuse", reveal: "reveal" }[phase] || "dossier";
}

const countdown = new Countdown((ms) => {
  $("timer").textContent = ms === null ? "" : clock(ms);
  $("timer").classList.toggle("low", ms !== null && ms < 60000);
  const mission = document.querySelector("[data-mission-left]");
  if (mission && missionClock.base !== null) {
    const left = missionClock.remaining();
    mission.textContent = left > 0 ? `${clock(left)} left` : "Time's up. Did you manage it?";
  }
});
const missionClock = { base: null, at: 0, remaining() { return Math.max(0, this.base - (performance.now() - this.at)); } };

function render() {
  if (state.phase === "lobby") {
    show("waiting");
    $("waiting-title").textContent = `You're at the table, ${state.you.name}`;
    const seats = state.lineup.map((s) => `<li>${s.kind === "ai" ? "An AI guest" : esc(s.name)}${s.id === state.you.id ? " (you)" : ""}</li>`);
    patch($("waiting-seats"), seats.join(""));
    return;
  }
  show("game");
  countdown.set(state.timer);
  const c = state.character;
  $("me").textContent = c ? c.short : state.you.name;
  $("phase-label").textContent = `${PHASE_NAMES[state.phase] || ""}${state.timer.paused ? " · paused" : ""}`;

  renderTabs();
  renderDossier();
  renderWhispers();
  renderClues();
  renderActions();
  renderAccuse();
  renderReveal();
}

function renderTabs() {
  const accusing = state.phase === "accusation";
  const revealed = state.phase === "reveal";
  $("accuse-tab").hidden = !accusing;
  $("result-tab").hidden = !revealed;
  $("act-tab").hidden = accusing || revealed;
  const available = { dossier: true, whispers: true, clues: true, act: !accusing && !revealed, accuse: accusing, reveal: revealed };
  if (!available[tab]) tab = defaultTab(state.phase);
  for (const button of document.querySelectorAll("[data-tab]")) {
    button.setAttribute("aria-current", button.dataset.tab === tab ? "page" : "false");
  }
  for (const name of ["dossier", "whispers", "clues", "act", "accuse", "reveal"]) $(`tab-${name}`).hidden = name !== tab;
  const unread = state.inbox.filter((i) => !i.read && i.kind !== "answer").length;
  $("unread").hidden = unread === 0;
  $("unread").textContent = unread;
  $("clue-count").textContent = state.clues.length ? `(${state.clues.length})` : "";
}

document.querySelector("#tabbar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button || !state) return;
  tab = button.dataset.tab;
  if (tab === "whispers") {
    for (const item of state.inbox) if (!item.read && item.kind === "answer") call(socket, "player:read", { itemId: item.id });
  }
  render();
  window.scrollTo({ top: 0 });
});

function renderDossier() {
  const c = state.character;
  if (!c) return;
  const d = c.dossier;
  $("murderer-banner").hidden = !c.murderer;
  patch(
    $("dossier"),
    `<article class="card dossier-card">
      <p class="eyebrow">Your character</p>
      <h2>${esc(c.name)}</h2>
      <p class="bio">${esc(c.bio)}</p>
      <p>${esc(d.who)}</p>
      <h3>Your story</h3><p>${esc(d.story)}</p>
      <h3>${c.murderer ? "What really happened" : "What you're hiding"}</h3><p class="secret">${esc(d.secret)}</p>
      <h3>What you know</h3><ul>${d.knows.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
      <h3>How to play it</h3><p>${esc(d.howToPlay)}</p>
    </article>`,
  );
  const readyVisible = state.actions.ready.available;
  $("ready-btn").hidden = !readyVisible || state.actions.ready.done;
  $("ready-note").hidden = !readyVisible || !state.actions.ready.done;
}

function renderWhispers() {
  const items = [...state.inbox].reverse();
  patch(
    $("whispers"),
    items.length
      ? items.map((i) => `<li class="${i.read ? "" : "unread"}"><p class="title">${esc(i.title)}</p><p>${lines(i.text)}</p></li>`).join("")
      : `<li><p class="muted">Nothing yet. Cecil will be in touch.</p></li>`,
  );
}

const SOURCE = { search: "You found this", cecil: "Slipped to you by Cecil", envelope: "Envelope Two", dictaphone: "The dictaphone" };

function renderClues() {
  patch(
    $("clues"),
    state.clues.length
      ? state.clues.map((c) => `<article class="clue"><span class="src">${esc(SOURCE[c.source] || "")}</span><h3>${esc(c.title)}</h3><p>${lines(c.text)}</p></article>`).join("")
      : `<p class="muted">You haven't found anything yet. Search a room from the Act tab.</p>`,
  );
  patch(
    $("public-evidence"),
    state.evidence.length
      ? state.evidence.map((e) => `<article class="clue public"><span class="src">${esc(e.kind)}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`).join("")
      : `<p class="muted">Nothing on the table yet.</p>`,
  );
}

function renderActions() {
  const a = state.actions;
  const inAct = state.phase === "act1" || state.phase === "act2";

  // Cecil's secret task.
  const m = a.mission;
  if (m && m.status === "active") {
    missionClock.base = m.remainingMs;
    missionClock.at = performance.now();
    patch(
      $("mission"),
      `<article class="card action mission-card"><h2>A task from Cecil</h2><p>${esc(m.text)}</p>
        <p class="countdown" data-mission-left></p>
        <div class="mission-buttons"><button class="btn primary" data-act="mission-yes">I did it</button><button class="btn ghost" data-act="mission-no">I didn't manage it</button></div></article>`,
    );
  } else {
    missionClock.base = null;
    patch($("mission"), m && m.status !== "expired" ? `<p class="banner brass">Cecil's task: ${m.status === "success" ? "done. Nicely handled." : "not this time."}</p>` : "");
  }

  // Envelope Two.
  const env = a.envelope;
  if (env.assigned && !env.opened) {
    patch(
      $("envelope"),
      `<article class="card action envelope-card"><h2>Envelope Two</h2>
        <p>${env.physical ? "Open the real Envelope Two from the evidence pack, then tap below." : "Cecil has asked you to open Envelope Two."} The front goes on the big screen. The back is for your eyes only.</p>
        <button class="btn primary wide" data-act="envelope">Open Envelope Two</button></article>`,
    );
  } else if (env.assigned && env.opened) {
    const clue = state.clues.find((c) => c.id === "envelope2");
    patch($("envelope"), clue ? `<article class="clue"><span class="src">Envelope Two · only you can see the back</span><h3>${esc(clue.title)}</h3><p>${lines(clue.text)}</p></article>` : "");
  } else {
    patch($("envelope"), "");
  }

  // Searching.
  const s = a.search;
  const usedName = s.used && s.rooms.find((r) => r.id === s.used)?.name;
  $("search-note").textContent = !inAct
    ? "You can search when an act is under way."
    : s.used
      ? `You searched ${usedName} this act. You can search again next act.`
      : "One room per act. Only you will see what you find.";
  patch(
    $("rooms"),
    s.rooms
      .map((r) => `<button class="choice ${s.used === r.id ? "done" : ""}" data-act="search" data-room="${esc(r.id)}" ${s.available ? "" : "disabled"}>${esc(r.name)}${s.used === r.id ? "<small>searched</small>" : ""}</button>`)
      .join(""),
  );

  // Questions for Cecil.
  const ask = a.ask;
  $("ask-note").textContent = !inAct
    ? "You can question Cecil during the acts."
    : ask.pending
      ? "Cecil is considering your question…"
      : ask.available
        ? "One question per act. Anything he won't answer doesn't count."
        : "You've had your question this act. Ask again next act.";
  patch(
    $("ask-presets"),
    ask.presets.map((q) => `<button class="chip" data-act="ask" data-index="${q.index}" ${ask.available && !ask.pending ? "" : "disabled"}>${esc(q.text)}</button>`).join(""),
  );
  $("ask-form").hidden = !ask.freeText;
  $("ask-form").querySelector("button").disabled = !ask.available || ask.pending;
  patch(
    $("ask-history"),
    [...ask.history].reverse().slice(0, 4).map((h) => `<li><span class="q">You asked: ${esc(h.question)}</span>${h.verdict ? `<b>${h.verdict === "yes" ? "Yes." : "No."}</b> ` : ""}${esc(h.reply.replace(/^(yes|no)\b[.!,]?\s*/i, ""))}</li>`).join(""),
  );

  // AI guests.
  const g = a.guests;
  $("guest-card").hidden = g.list.length === 0;
  if (g.list.length) {
    if (!g.list.some((x) => x.seatId === selectedGuest)) selectedGuest = g.list[0].seatId;
    const guest = g.list.find((x) => x.seatId === selectedGuest);
    $("guest-note").textContent = !inAct
      ? "You can question the AI guests during the acts."
      : g.pending
        ? "They're answering on the big screen…"
        : g.available
          ? `Their answers are spoken aloud on the big screen. ${g.remaining} question${g.remaining === 1 ? "" : "s"} left this act.`
          : "You've asked enough for this act.";
    patch($("guest-pick"), g.list.map((x) => `<button class="chip" data-act="pick-guest" data-seat="${esc(x.seatId)}" aria-pressed="${x.seatId === selectedGuest}">${esc(x.name)}</button>`).join(""));
    patch(
      $("guest-presets"),
      guest.presets.map((p) => `<button class="chip" data-act="guest-ask" data-index="${p.index}" ${g.available && !g.pending ? "" : "disabled"}>${esc(p.text)}</button>`).join(""),
    );
    $("guest-form").hidden = !g.freeText;
    $("guest-form").querySelector("button").disabled = !g.available || g.pending;
  }

  // The desk drawer.
  const d = a.dictaphone;
  $("drawer-card").hidden = false;
  $("drawer-note").textContent = d.heard
    ? "You've heard Sir Edmund's last recording. It's in your clues."
    : d.available
      ? "A brass dial with three digits. Sir Edmund was a private man."
      : "Out of reach until Act Two.";
  $("drawer-form").hidden = d.heard;
  $("drawer-form").querySelector("button").disabled = !d.available;
}

function renderAccuse() {
  const v = state.actions.vote;
  patch(
    $("candidates"),
    v.candidates
      .map((c) => `<button class="choice ${v.choice === c.seatId ? "chosen" : ""}" data-act="vote" data-seat="${esc(c.seatId)}" ${v.available ? "" : "disabled"}>${esc(c.name)}${v.choice === c.seatId ? "<small>your accusation</small>" : ""}</button>`)
      .join(""),
  );
  $("vote-note").textContent = v.choice ? "Vote cast. You can change it until the reveal." : "Your vote is private. You can change it until the reveal.";
}

function renderReveal() {
  const r = state.reveal;
  if (!r) return;
  const mine = r.scores.find((s) => s.seatId === state.you.id);
  const killer = state.lineup.find((s) => s.id === r.killerSeatId);
  const youAreKiller = r.killerSeatId === state.you.id;
  const headline = youAreKiller ? (r.caught ? "They caught you." : "You got away with it.") : r.caught ? "The murderer was caught." : "The murderer escaped.";
  patch(
    $("reveal"),
    `<article class="card reveal-card">
      <p class="eyebrow">The reveal</p>
      <p class="big">${esc(headline)}</p>
      <p class="muted">The murderer was ${esc(killer?.character?.name || "")}${killer?.kind === "human" ? ` (${esc(killer.name)})` : ""}.</p>
      <p class="points">${mine ? mine.points : 0}</p>
      <p class="muted">points</p>
      <ul>${(mine?.lines || []).map(([l, p]) => `<li>${esc(l)} +${p}</li>`).join("")}</ul>
    </article>
    <article class="card dossier-card"><h3>What really happened</h3><ul>${r.truth.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></article>`,
  );
}

// ------------------------------------------------------------ whispers

function notifyWhispers() {
  const fresh = state.inbox.filter((i) => !i.read && i.kind !== "answer" && !seenWhispers.has(i.id));
  for (const item of fresh) seenWhispers.add(item.id);
  if (fresh.length && !firstState) buzz();
  showNextOverlay();
}

function showNextOverlay() {
  if (overlayItem) return;
  const next = state?.inbox.find((i) => !i.read && i.kind !== "answer");
  if (!next) {
    $("overlay").hidden = true;
    return;
  }
  overlayItem = next;
  $("overlay-title").textContent = next.title;
  $("overlay-title").hidden = next.title === "Cecil, privately";
  $("overlay-text").textContent = next.text;
  $("overlay").hidden = false;
  $("overlay-ok").focus();
}

$("overlay-ok").addEventListener("click", async () => {
  const item = overlayItem;
  $("overlay").hidden = true;
  if (item) {
    item.read = true;
    await call(socket, "player:read", { itemId: item.id });
    if (item.kind === "clue") tab = "clues";
    if (item.kind === "mission" || item.kind === "task") tab = "act";
    if (item.kind === "dossier") tab = "dossier";
  }
  overlayItem = null;
  if (state) render();
  showNextOverlay();
});

function unlockAudio() {
  if (audio) return;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
}

function buzz() {
  if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  if (!audio) return;
  // A soft two-note chime.
  const now = audio.currentTime;
  for (const [freq, at] of [[880, 0], [660, 0.16]]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.4);
  }
}

// --------------------------------------------------------------- actions

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}

async function act(event, payload, success) {
  const result = await call(socket, event, payload);
  if (!result.ok) toast(result.error);
  else if (success) toast(typeof success === "function" ? success(result) : success);
  return result;
}

document.addEventListener("click", async (event) => {
  unlockAudio();
  const el = event.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const kind = el.dataset.act;
  if (kind === "search") {
    const result = await act("player:search", { roomId: el.dataset.room }, (r) => `You found: ${r.clue.title}. It's in your clues.`);
    if (result.ok) tab = "clues";
  } else if (kind === "ask") {
    const result = await act("player:askPreset", { index: el.dataset.index });
    if (result.ok) toast(result.answer.verdict ? `Cecil: ${result.answer.verdict === "yes" ? "Yes." : "No."}` : "Cecil has replied.");
  } else if (kind === "pick-guest") {
    selectedGuest = el.dataset.seat;
    render();
  } else if (kind === "guest-ask") {
    await act("player:guestPreset", { guestSeatId: selectedGuest, index: el.dataset.index }, "Asked. Watch the big screen.");
  } else if (kind === "envelope") {
    await act("player:envelope", {}, "The photograph is on the big screen. Check the back.");
  } else if (kind === "mission-yes" || kind === "mission-no") {
    await act("player:mission", { success: kind === "mission-yes" }, kind === "mission-yes" ? "Cecil is impressed." : "Better luck next time.");
  } else if (kind === "vote") {
    await act("player:vote", { seatId: el.dataset.seat }, "Accusation recorded.");
  }
  if (state) render();
});

$("ready-btn").addEventListener("click", () => act("player:ready"));

$("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = $("ask-input").value.trim();
  if (!question) return;
  const result = await act("player:askFree", { question }, "Cecil is considering your question…");
  if (result.ok) $("ask-input").value = "";
});

$("guest-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = $("guest-input").value.trim();
  if (!question) return;
  const result = await act("player:guestFree", { guestSeatId: selectedGuest, question }, "Asked. Watch the big screen.");
  if (result.ok) $("guest-input").value = "";
});

$("drawer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("drawer-input").value.trim();
  const result = await call(socket, "player:code", { code });
  if (!result.ok) {
    $("drawer-error").textContent = result.error;
  } else if (!result.opened) {
    $("drawer-error").textContent = result.message;
  } else {
    $("drawer-error").textContent = "";
    $("drawer-input").value = "";
    tab = "clues";
    toast("The drawer opens. The dictaphone recording is in your clues.");
  }
  if (state) render();
});
