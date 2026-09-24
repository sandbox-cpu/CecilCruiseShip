// Every case Cecil can host. Each scenario file holds one complete mystery,
// including its solution, so these are only ever read on the server.
import halcyon from "./halcyon.js";
import ravensmere from "./ravensmere.js";

export const SCENARIOS = { halcyon, ravensmere };

// The case a new table starts on, unless the host or CECIL_CASE says otherwise.
export const DEFAULT_CASE = "halcyon";

export function scenarioFor(id) {
  return SCENARIOS[String(id || "").toLowerCase()] || null;
}

// What the lobby shows when choosing tonight's mystery: nothing secret.
export function caseList() {
  return Object.values(SCENARIOS).map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle || null,
    tagline: s.tagline,
    setting: s.setting,
    seats: s.seats,
    minutes: Math.round(Object.values(s.durations).reduce((a, b) => a + b, 0) / 60) + 2,
  }));
}
