// American pronunciation: a recorded US voice from the free Dictionary API when one exists,
// otherwise the browser's built-in en-US speech voice.
const KEY = 'vocab-pron-v1'

let cache = null
const readCache = () => {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    cache = {}
  }
  return cache
}
const writeCache = (word, info) => {
  readCache()[word] = info
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage full or blocked: skip caching */
  }
}

const pending = new Map()

// Returns { ipa, audio }. `audio` is only ever a US recording (file name ends in -us.mp3).
export function lookup(word) {
  const key = word.toLowerCase()
  const hit = readCache()[key]
  if (hit) return Promise.resolve(hit)
  if (pending.has(key)) return pending.get(key)

  const p = (async () => {
    try {
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`)
      if (r.status === 404) {
        const none = { ipa: null, audio: null }
        writeCache(key, none)
        return none
      }
      if (!r.ok) return { ipa: null, audio: null }
      const data = await r.json()
      let ipa = null
      let audio = null
      for (const entry of Array.isArray(data) ? data : []) {
        for (const ph of entry.phonetics || []) {
          if (!ipa && ph.text) ipa = ph.text
          if (!audio && ph.audio && /-us\.mp3$/i.test(ph.audio)) {
            audio = ph.audio
            if (ph.text) ipa = ph.text // prefer the spelling that goes with the US recording
          }
        }
      }
      if (!ipa && data[0]?.phonetic) ipa = data[0].phonetic
      const info = { ipa, audio }
      writeCache(key, info)
      return info
    } catch {
      // Offline or blocked: don't cache, so it is retried next time.
      return { ipa: null, audio: null }
    } finally {
      pending.delete(key)
    }
  })()
  pending.set(key, p)
  return p
}

function speak(word) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.85
  const voices = window.speechSynthesis.getVoices()
  const us = voices.find((v) => v.lang === 'en-US' || v.lang === 'en_US')
  if (us) u.voice = us
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

let current = null
export function playWord(word, info) {
  if (current) {
    current.pause()
    current = null
  }
  if (info?.audio) {
    const a = new Audio(info.audio)
    current = a
    a.play().catch(() => speak(word))
  } else {
    speak(word)
  }
}
