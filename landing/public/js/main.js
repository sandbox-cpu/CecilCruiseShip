// The landing page: trailer loop, Cecil's answers, the waitlist form and a few flourishes.
// Everything here is progressive: the page reads and the form submits without it.

import { checkEmail, suggestEmail } from "./email.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const saveData = Boolean(navigator.connection?.saveData);
const calm = () => reduceMotion.matches;

// Two cuts of the trailer: the telegram (the default) and the classic first cut, which
// ?trailer=classic shows instead. To make the classic cut the default, change DEFAULT_CUT.
// Each loop starts on the frame its still shows, so the poster hands over to the video without a jump.
// (The addresses are written out in full so the static build can fingerprint them.)
const DEFAULT_CUT = "telegram";
const CUTS = {
  telegram: {
    heroSeconds: 214 / 30,
    still: "/media/still-hero.jpg",
    length: "About fifty seconds",
    h264: { loop: "/media/trailer-720.mp4", full: "/media/trailer-1080.mp4", calm: "/media/trailer-calm-720.mp4" },
    vp9: { loop: "/media/trailer-720.webm", full: "/media/trailer-720.webm", calm: "/media/trailer-calm-720.webm" },
  },
  classic: {
    heroSeconds: 380 / 30,
    still: "/media/still-classic.jpg",
    length: "About forty-five seconds",
    label:
      "Trailer, playing silently: the SS Halcyon at night on the Atlantic, Cecil bringing a telegram, the Boat Deck in the rain, a clock whose hands run back an hour, the shared screen and private phones, the four passengers, and Cecil’s whispers.",
    h264: { loop: "/media/trailer-classic-720.mp4", full: "/media/trailer-classic-1080.mp4", calm: "/media/trailer-classic-calm-720.mp4" },
    vp9: { loop: "/media/trailer-classic-720.webm", full: "/media/trailer-classic-720.webm", calm: "/media/trailer-classic-calm-720.webm" },
  },
};
const askedFor = new URLSearchParams(location.search).get("trailer");
const CUT = Object.hasOwn(CUTS, askedFor) ? CUTS[askedFor] : CUTS[DEFAULT_CUT];

// H.264 plays almost everywhere; a few open-source browser builds only have VP9.
const h264 = Boolean(document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028"'));
const MEDIA = { ...CUT[h264 ? "h264" : "vp9"], fullSmall: CUT[h264 ? "h264" : "vp9"].loop };

// ------------------------------------------------------------ motion

function applyMotionPreference() {
  document.documentElement.classList.toggle("motion", !calm());
}
applyMotionPreference();

function setupReveals() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
        el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 70}ms`;
        el.classList.add("in");
        io.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  items.forEach((el) => io.observe(el));
}

// ------------------------------------------------------------ the trailer loop in the hero

const film = $(".film");
const filmState = $("[data-film-state]");
const filmToggle = $("[data-film-toggle]");
let filmInView = false;
let filmPausedByUser = false;
let filmHeldForDialog = false;

function filmShouldPlay() {
  return !calm() && !saveData && filmInView && !filmPausedByUser && !filmHeldForDialog && !document.hidden;
}

function syncFilm() {
  if (!film) return;
  if (calm() || saveData) {
    film.pause();
    film.removeAttribute("src");
    film.load();
    filmToggle.hidden = true;
    filmState.textContent = calm() ? "A still from the trailer. Motion is reduced." : "A still from the trailer.";
    return;
  }
  if (!film.getAttribute("src")) {
    film.src = MEDIA.loop;
    film.addEventListener("loadedmetadata", () => (film.currentTime = CUT.heroSeconds), { once: true });
  }
  filmToggle.hidden = false;
  if (filmShouldPlay()) {
    film.play().catch(() => {});
  } else {
    film.pause();
  }
  filmToggle.textContent = filmPausedByUser ? "Play" : "Pause";
  filmToggle.setAttribute("aria-label", filmPausedByUser ? "Play the silent trailer loop" : "Pause the silent trailer loop");
  filmState.textContent = filmPausedByUser ? "The trailer, paused" : "The trailer, playing silently";
}

function setupFilm() {
  if (!film) return;
  // The page is written for the default cut; show the other cut's still if that one was asked for.
  if (film.getAttribute("poster") !== CUT.still) film.setAttribute("poster", CUT.still);
  if (CUT.label) film.setAttribute("aria-label", CUT.label);
  filmToggle.addEventListener("click", () => {
    filmPausedByUser = !filmPausedByUser;
    syncFilm();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        filmInView = entry.isIntersecting;
        syncFilm();
      },
      { threshold: 0.25 },
    ).observe(film);
  } else {
    filmInView = true;
  }
  document.addEventListener("visibilitychange", syncFilm);
  reduceMotion.addEventListener?.("change", () => {
    applyMotionPreference();
    syncFilm();
  });
  syncFilm();
}

// ------------------------------------------------------------ the trailer, with controls

function setupDialog() {
  const dialog = $("#trailer-dialog");
  const video = $(".dialog-video", dialog);
  const note = $("[data-dialog-note]", dialog);

  const open = () => {
    const small = matchMedia("(max-width: 900px)").matches;
    const src = calm() ? MEDIA.calm : small ? MEDIA.fullSmall : MEDIA.full;
    note.textContent = calm()
      ? `The reduced-motion cut: no camera moves or flicker. ${CUT.length}, best with the sound on.`
      : `${CUT.length}. Best with the sound on.`;

    if (typeof dialog.showModal !== "function") {
      window.open(src, "_blank", "noopener");
      return;
    }
    if (video.getAttribute("src") !== src) video.src = src;
    filmHeldForDialog = true;
    syncFilm();
    dialog.showModal();
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  $$("[data-trailer]").forEach((btn) => btn.addEventListener("click", open));
  dialog.addEventListener("close", () => {
    video.pause();
    filmHeldForDialog = false;
    syncFilm();
  });
  // Clicking the dim backdrop closes it too.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

// ------------------------------------------------------------ ask Cecil

// His replies are lines from the game's own script.
const ANSWERS = {
  who: "“I’m afraid that is rather the point of the voyage.”",
  cecil: "“I’m afraid not.”",
  trust: "“I shall answer truthfully, or not at all.”",
  case: "“He was a man who kept things.”",
  port: "“Our next port is Bridgetown, four days away.”",
  secret: "“That is a question for them, not for me.”",
};

function setupAsk() {
  const root = $("[data-ask]");
  if (!root) return;
  const out = $("[data-answer]", root);
  const sr = $("[data-answer-sr]", root);
  const chips = $$(".chip", root);
  let timer = null;

  chips.forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  root.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const text = ANSWERS[chip.dataset.q];
    if (!text) return;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    sr.textContent = `Cecil says: ${text}`;
    clearInterval(timer);
    if (calm()) {
      out.textContent = text;
      return;
    }
    let i = 0;
    out.textContent = "";
    out.classList.add("caret");
    timer = setInterval(() => {
      i += 1;
      out.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(timer);
        out.classList.remove("caret");
      }
    }, 32);
  });
}

// ------------------------------------------------------------ the waitlist

function sourceFromUrl() {
  const params = new URLSearchParams(location.search);
  const value = params.get("utm_source") || params.get("ref") || params.get("source") || "";
  return value.replace(/[^\w .:/@-]/g, "").slice(0, 80);
}

function setupWaitlist() {
  const form = $("#waitlist-form");
  if (!form) return;
  const email = $("#wl-email", form);
  const name = $("#wl-name", form);
  const msg = $("#wl-email-msg", form);
  const status = $(".form-status", form);
  const button = $("button[type=submit]", form);
  const label = $("[data-submit-label]", form);
  const done = $("#waitlist-done");
  // The static preview build (npm run build:static) has no server behind it: nothing is sent.
  const preview = form.dataset.mode === "preview";
  let offeredFor = "";

  $("#wl-source", form).value = sourceFromUrl();

  const clearError = () => {
    email.removeAttribute("aria-invalid");
    msg.className = "field-msg";
    msg.textContent = "";
  };

  const showError = (text) => {
    email.setAttribute("aria-invalid", "true");
    msg.className = "field-msg";
    msg.textContent = text;
  };

  const offerSuggestion = (suggestion) => {
    offeredFor = email.value.trim();
    msg.className = "field-msg hint";
    msg.textContent = "Did you mean ";
    const use = document.createElement("button");
    use.type = "button";
    use.className = "link-btn";
    use.textContent = suggestion;
    use.addEventListener("click", () => {
      email.value = suggestion;
      clearError();
      email.focus();
    });
    msg.append(use, "?");
  };

  email.addEventListener("input", () => {
    if (email.getAttribute("aria-invalid") === "true" && checkEmail(email.value).ok) clearError();
    if (msg.classList.contains("hint")) clearError();
  });

  email.addEventListener("blur", () => {
    if (!email.value.trim()) return;
    const check = checkEmail(email.value);
    if (!check.ok) return showError(check.message);
    const suggestion = suggestEmail(email.value);
    if (suggestion) offerSuggestion(suggestion);
  });

  const setBusy = (busy) => {
    button.disabled = busy;
    label.textContent = busy ? "Sending your request…" : "Request my boarding pass";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";

    const check = checkEmail(email.value);
    if (!check.ok) {
      showError(check.message);
      email.focus();
      return;
    }
    // One gentle nudge for a likely typo; a second press sends it as typed.
    const suggestion = suggestEmail(email.value);
    if (suggestion && offeredFor !== email.value.trim()) {
      offerSuggestion(suggestion);
      email.focus();
      return;
    }

    const firstName = name.value.trim();
    if (preview) {
      showDone("added", firstName);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: check.email,
          name: firstName,
          website: $("#wl-website", form).value,
          source: $("#wl-source", form).value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === "added" || data.status === "exists") {
        showDone(data.status, firstName);
      } else if (data.status === "invalid") {
        showError(data.message || "That email address doesn't look right.");
        email.focus();
      } else {
        status.textContent = data.message || "Something went wrong on our side. Please try again in a moment.";
      }
    } catch {
      status.textContent = "We couldn’t reach the ship. Check your connection and try again.";
    } finally {
      setBusy(false);
    }
  });

  function showDone(kind, firstName) {
    const title = $("[data-done-title]", done);
    const message = $("[data-done-msg]", done);
    if (kind === "added") {
      title.textContent = firstName ? `Very good, ${firstName}. You’re on the passenger list.` : "Very good. You’re on the passenger list.";
      message.textContent = "I shall write when your boarding pass is ready. In the meantime, do keep your hands inside the rail.";
    } else {
      title.textContent = "You’re already on the passenger list";
      message.textContent = "I never forget a passenger. Your boarding pass will arrive the moment early access opens.";
    }
    form.hidden = true;
    done.hidden = false;
    done.closest(".invite")?.classList.add("is-done");
    document.dispatchEvent(new CustomEvent("cecil:joined"));
    done.focus();
  }

  const shareBtn = $("[data-share]", done);
  const shareStatus = $("[data-share-status]", done);
  shareBtn.addEventListener("click", async () => {
    const url = `${location.origin}/`;
    const text = "At two o'clock the clocks went back an hour. At twenty past one, Mortimer Crane went over the side. Join the waitlist for Cecil: Dead Reckoning.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Cecil: Dead Reckoning", text, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = "Link copied. Send it to your table.";
    } catch {
      shareStatus.textContent = `Share this link: ${url}`;
    }
  });
}

// ------------------------------------------------------------ the floating invitation button

function setupFloatingCta() {
  const cta = $("[data-float-cta]");
  const hero = $(".hero");
  const invite = $("#invitation");
  const foot = $(".site-foot");
  if (!cta || !("IntersectionObserver" in window)) return;
  const seen = new Map([[hero, true]]);
  let joined = false;
  const update = () => {
    const show = !joined && !seen.get(hero) && !seen.get(invite) && !seen.get(foot);
    cta.classList.toggle("show", show);
    cta.tabIndex = show ? 0 : -1;
    cta.setAttribute("aria-hidden", String(!show));
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting));
    update();
  });
  [hero, invite, foot].forEach((el) => el && io.observe(el));
  // Once someone is on the list, stop inviting them.
  document.addEventListener("cecil:joined", () => {
    joined = true;
    update();
  });
  update();
}

setupReveals();
setupFilm();
setupDialog();
setupAsk();
setupWaitlist();
setupFloatingCta();
