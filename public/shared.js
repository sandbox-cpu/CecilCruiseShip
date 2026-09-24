// Small helpers shared by the host screen and the phone.

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Multi-line text: escaped, with line breaks kept.
export function lines(value) {
  return esc(value).replace(/\n/g, "<br>");
}

// Replace an element's content only when it actually changed, so focus,
// scroll position and animations survive frequent state updates.
export function patch(element, html) {
  if (!element) return;
  if (element.__html !== html) {
    element.__html = html;
    element.innerHTML = html;
  }
}

export function clock(ms) {
  if (ms === null || ms === undefined) return "";
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export const PHASE_NAMES = {
  lobby: "Arrivals",
  prologue: "Prologue",
  act1: "Act One · The Study",
  act2: "Act Two · The Recording",
  accusation: "The Accusation",
  reveal: "The Reveal",
};

// The name of the current part of the evening; each case names its own acts.
export function phaseName(state) {
  return state?.case?.labels?.phases?.[state.phase] || PHASE_NAMES[state?.phase] || "";
}

// Dress the page for tonight's case (colours, title) the moment we know it.
export function applyCase(state, prefix = "Cecil") {
  const c = state?.case;
  if (!c) return;
  if (document.body.dataset.theme !== c.theme) document.body.dataset.theme = c.theme;
  const title = `${prefix} · ${c.title}`;
  if (document.title !== title) document.title = title;
}

// Emit with an acknowledgement, as a promise.
export function call(socket, event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(10000).emit(event, payload, (err, response) => {
      resolve(err ? { ok: false, error: "No answer from the laptop. Is it still running?" } : response);
    });
  });
}

// Counts down locally between server updates.
export class Countdown {
  constructor(onTick) {
    this.onTick = onTick;
    this.base = null;
    this.at = 0;
    this.paused = false;
    setInterval(() => this.onTick(this.remaining()), 250);
  }

  set(timer) {
    this.base = timer ? timer.remainingMs : null;
    this.paused = Boolean(timer && timer.paused);
    this.at = performance.now();
    this.onTick(this.remaining());
  }

  remaining() {
    if (this.base === null) return null;
    return this.paused ? this.base : Math.max(0, this.base - (performance.now() - this.at));
  }
}

export function storage(key) {
  return {
    get() {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* private browsing: fine, we just can't resume after a reload */
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
