// American pronunciation: a recorded US voice from the free Dictionary API when one exists,
// otherwise the browser's built-in en-US speech voice.
const KEY = "vocab-pron-v1";

let cache = null;
const readCache = () => {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    cache = {};
  }
  return cache;
};
const writeCache = (word, info) => {
  readCache()[word] = info;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked: skip caching */
  }
};

// Audio files are downloaded ahead of time, so tapping play starts instantly.
const audioEls = new Map();
function preloadAudio(url) {
  let a = audioEls.get(url);
  if (!a) {
    a = new Audio();
    a.preload = "auto";
    a.src = url;
    a.load();
    audioEls.set(url, a);
    if (audioEls.size > 12) audioEls.delete(audioEls.keys().next().value);
  }
  return a;
}

const pending = new Map();

// Returns { ipa, audio }. `audio` is only ever a US recording (file name ends in -us.mp3).
export function lookup(word) {
  const key = word.toLowerCase();
  const hit = readCache()[key];
  if (hit) {
    if (hit.audio) preloadAudio(hit.audio);
    return Promise.resolve(hit);
  }
  if (pending.has(key)) return pending.get(key);

  const p = (async () => {
    try {
      const r = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
      );
      if (r.status === 404) {
        const none = { ipa: null, audio: null };
        writeCache(key, none);
        return none;
      }
      if (!r.ok) return { ipa: null, audio: null };
      const data = await r.json();
      let ipa = null;
      let audio = null;
      for (const entry of Array.isArray(data) ? data : []) {
        for (const ph of entry.phonetics || []) {
          if (!ipa && ph.text) ipa = ph.text;
          if (!audio && ph.audio && /-us\.mp3$/i.test(ph.audio)) {
            audio = ph.audio;
            if (ph.text) ipa = ph.text; // prefer the spelling that goes with the US recording
          }
        }
      }
      if (!ipa && data[0]?.phonetic) ipa = data[0].phonetic;
      const info = { ipa, audio };
      writeCache(key, info);
      if (audio) preloadAudio(audio);
      return info;
    } catch {
      // Offline or blocked: don't cache, so it is retried next time.
      return { ipa: null, audio: null };
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, p);
  return p;
}

// Find the en-US voice once, so speaking doesn't wait on a voice search.
let usVoice = null;
function pickVoice() {
  if (
    usVoice ||
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  )
    return usVoice;
  usVoice =
    window.speechSynthesis
      .getVoices()
      .find((v) => v.lang === "en-US" || v.lang === "en_US") || null;
  return usVoice;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

function speak(word) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.9;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

let current = null;
function stopAll() {
  if (current) {
    current.pause();
    current = null;
  }
  // Only cancel when something is actually queued; cancelling an idle engine adds lag in some browsers.
  if (
    "speechSynthesis" in window &&
    (window.speechSynthesis.speaking || window.speechSynthesis.pending)
  ) {
    window.speechSynthesis.cancel();
  }
}

// Bundled audio lives in public/audio/<word>.mp3 (made by scripts/generate_audio.py).
// This must match slug() in scripts/generate_audio.py.
const slug = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const localUrl = (w) => `/audio/${slug(w)}.mp3`;

export function preloadWord(word) {
  preloadAudio(localUrl(word));
}

function fallback(word, info) {
  if (info?.audio) {
    const b = preloadAudio(info.audio);
    current = b;
    b.play().catch(() => speak(word));
  } else {
    speak(word);
  }
}

export function playWord(word, info) {
  stopAll();
  const a = preloadAudio(localUrl(word));
  current = a;
  try {
    a.currentTime = 0;
  } catch {
    /* not loaded yet: it will start from the beginning anyway */
  }
  a.play().catch(() => fallback(word, info));
}
