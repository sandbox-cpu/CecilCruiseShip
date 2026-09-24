// Cecil's voice through ElevenLabs text-to-speech (optional).
//
// Without ELEVENLABS_API_KEY this returns null, and the shared screen uses the
// browser's built-in speech instead. Audio is cached in memory, and the
// scripted narration is generated in the background when a game starts, so
// Cecil doesn't pause before his opening lines.

import crypto from "node:crypto";

const API = "https://api.elevenlabs.io/v1/text-to-speech";
// "George" from the ElevenLabs premade voice library: warm, mature, British.
// Swap in any voice from your library with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL = "eleven_multilingual_v2";
const MAX_CACHE = 300;

export function createVoice({ env = process.env, fetchImpl = globalThis.fetch, log = console } = {}) {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const modelId = env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL;
  const cache = new Map(); // text hash -> Promise<Buffer>
  let failures = 0;

  async function request(text) {
    const response = await fetchImpl(`${API}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.55, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 200)}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  function speak(text) {
    const key = crypto.createHash("sha1").update(`${voiceId}|${modelId}|${text}`).digest("hex");
    if (cache.has(key)) return cache.get(key);
    const promise = request(text).then(
      (audio) => {
        failures = 0;
        return audio;
      },
      (error) => {
        cache.delete(key);
        failures += 1;
        if (failures <= 3) log.warn(`[voice] ${error.message}`);
        throw error;
      },
    );
    cache.set(key, promise);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return promise;
  }

  // Pre-generate lines, two at a time, ignoring failures.
  async function warm(texts) {
    const queue = [...new Set(texts)];
    const worker = async () => {
      while (queue.length) {
        await speak(queue.shift()).catch(() => {});
      }
    };
    await Promise.all([worker(), worker()]);
  }

  return { provider: "elevenlabs", voiceId, modelId, speak, warm };
}

// Every scripted line Cecil might say, for warming the cache.
export function scriptedLines(scenario) {
  const n = scenario.narration;
  return [
    ...n.prologue,
    n.prologueDone,
    ...n.act1,
    n.act1Whispers,
    n.act1Warning,
    ...n.act2,
    ...(n.act2Without || []),
    n.codeHint1,
    n.codeHint2,
    n.act2Warning,
    ...n.accusation,
    // Reveal lines with a player's name in them can't be made in advance.
    ...n.reveal.filter((line) => !line.includes("{")),
    n.closing,
    n.dictaphoneOpened,
  ];
}
