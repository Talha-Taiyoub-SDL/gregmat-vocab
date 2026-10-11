import { useMemo, useState } from 'react'
import { useStore } from './store'
import { SETS, WORDS } from './words'
import { statusOf } from './lib'
import { AddToCategory, Meaning, Pronounce, StatusChip } from './ui'

const PAGE = 40

export default function Browse() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [setF, setSetF] = useState('all')
  const [statusF, setStatusF] = useState('all')
  const [catF, setCatF] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState(null)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const catIds = catF === 'all' ? null : new Set(state.categories.find((c) => c.id === catF)?.wordIds || [])
    return WORDS.filter((w) => {
      if (setF !== 'all' && w.set !== Number(setF)) return false
      if (statusF !== 'all' && statusOf(state, w.id) !== statusF) return false
      if (catIds && !catIds.has(w.id)) return false
      if (term && !w.word.toLowerCase().includes(term) && !w.defs.some((d) => d.toLowerCase().includes(term))) return false
      return true
    })
  }, [q, setF, statusF, catF, state])

  const reset = (fn) => (e) => {
    fn(e.target.value)
    setLimit(PAGE)
  }

  return (
    <section>
      <input
        className="search"
        type="search"
        placeholder="Search a word or part of a meaning"
        value={q}
        onChange={reset(setQ)}
        aria-label="Search words"
      />
      <div className="scope">
        <select value={setF} onChange={reset(setSetF)} aria-label="Set">
          <option value="all">All sets</option>
          {SETS.map((n) => (
            <option key={n} value={n}>
              Set {n}
            </option>
          ))}
        </select>
        <select value={statusF} onChange={reset(setStatusF)} aria-label="Status">
          <option value="all">Any status</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="known">Known</option>
        </select>
        <select value={catF} onChange={reset(setCatF)} aria-label="Category">
          <option value="all">Any category</option>
          {state.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <p className="muted count">{list.length} words</p>

      <ul className="wordlist">
        {list.slice(0, limit).map((w) => {
          const isOpen = open === w.id
          return (
            <li key={w.id} className={isOpen ? 'open' : ''}>
              <button className="wordrow" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)}>
                <b>{w.word}</b>
                <span className="preview">{w.defs[0]}</span>
                <StatusChip id={w.id} />
              </button>
              {isOpen && (
                <div className="wordbody">
                  <Pronounce word={w.word} />
                  <Meaning word={w} />
                  <AddToCategory wordId={w.id} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {list.length === 0 && <p className="empty">Nothing matches those filters.</p>}
      {list.length > limit && (
        <button className="btn wide" onClick={() => setLimit((n) => n + PAGE)}>
          Show more
        </button>
      )}
    </section>
  )
}
