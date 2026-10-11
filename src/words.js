import raw from './data/words.json'

export const WORDS = raw.map((e) => ({
  id: e.id,
  set: e.set,
  num: e.num,
  word: e.word,
  defs: e.defs,
  image: e.images[0] ? `/images/${e.images[0]}` : null,
}))

export const BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]))
export const SETS = [...new Set(WORDS.map((w) => w.set))]
