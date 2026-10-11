import { useState } from 'react'
import { useStore } from './store'
import { BY_ID } from './words'
import { statusOf } from './lib'
import { StatusChip } from './ui'

export default function Categories({ onStudy, onQuiz }) {
  const { state, createCategory, renameCategory, deleteCategory, setInCategory } = useStore()
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState(null)

  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setOpenId(createCategory(name))
    setName('')
  }

  return (
    <section>
      <form className="newcat" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Tricky ones" aria-label="New category name" />
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          Create
        </button>
      </form>

      {state.categories.length === 0 && (
        <p className="empty">No categories yet. Create one above, then add words from the flashcards, quiz or word list.</p>
      )}

      <ul className="cats">
        {state.categories.map((c) => {
          const isOpen = openId === c.id
          const known = c.wordIds.filter((id) => statusOf(state, id) === 'known').length
          return (
            <li key={c.id} className={isOpen ? 'open' : ''}>
              <button className="catrow" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : c.id)}>
                <b>{c.name}</b>
                <span className="muted">
                  {c.wordIds.length} words · {known} known
                </span>
              </button>
              {isOpen && (
                <div className="catbody">
                  <div className="row">
                    <button className="btn primary" disabled={!c.wordIds.length} onClick={() => onStudy({ kind: 'category', cat: c.id })}>
                      Flashcards
                    </button>
                    <button className="btn" disabled={!c.wordIds.length} onClick={() => onQuiz({ kind: 'category', cat: c.id })}>
                      Quiz
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const n = window.prompt('Rename category', c.name)
                        if (n && n.trim()) renameCategory(c.id, n)
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn bad-btn"
                      onClick={() => {
                        if (window.confirm(`Delete “${c.name}”? The words themselves stay in the app.`)) deleteCategory(c.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {c.wordIds.length === 0 && <p className="empty small">Empty. Add words using “Add to category” on any card.</p>}
                  <ul className="inner">
                    {c.wordIds.map((id) => {
                      const w = BY_ID[id]
                      if (!w) return null
                      return (
                        <li key={id}>
                          <b>{w.word}</b>
                          <span className="preview">{w.defs[0]}</span>
                          <StatusChip id={id} />
                          <button className="x" aria-label={`Remove ${w.word} from ${c.name}`} onClick={() => setInCategory(c.id, id, false)}>
                            ×
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
