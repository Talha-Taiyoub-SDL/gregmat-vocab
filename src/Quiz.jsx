import { useState } from 'react'
import { useStore } from './store'
import { WORDS } from './words'
import { shuffle, wordsForScope } from './lib'
import { AddToCategory, Meaning, Pronounce, ScopePicker } from './ui'

const COUNTS = [10, 20, 50]

function buildQuestions(pool, count, dir) {
  const picked = shuffle(pool).slice(0, count)
  const distractorSource = pool.length >= 4 ? pool : WORDS
  return picked.map((w) => {
    const text = (x) => (dir === 'meaning' ? x.defs[0] : x.word)
    const others = shuffle(distractorSource.filter((x) => x.id !== w.id && text(x) !== text(w))).slice(0, 3)
    const options = shuffle([w, ...others])
    return { word: w, options, answer: options.findIndex((o) => o.id === w.id) }
  })
}

export default function Quiz({ initialScope }) {
  const store = useStore()
  const [scope, setScope] = useState(initialScope || { kind: 'all' })
  const [count, setCount] = useState(10)
  const [dir, setDir] = useState('meaning') // 'meaning': see the word, pick its meaning. 'word': see the meaning, pick the word.
  const [qs, setQs] = useState(null)
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState(null)
  const [missed, setMissed] = useState([])
  const [score, setScore] = useState(0)

  const start = (pool) => {
    if (!pool.length) return
    setQs(buildQuestions(pool, count, dir))
    setQi(0)
    setPicked(null)
    setMissed([])
    setScore(0)
  }
  const pool = wordsForScope(scope, store.state)

  if (!qs) {
    return (
      <section>
        <ScopePicker scope={scope} onChange={setScope} />
        <div className="field">
          <span>Questions</span>
          <div className="seg">
            {COUNTS.map((n) => (
              <button key={n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Show me</span>
          <div className="seg">
            <button className={dir === 'meaning' ? 'on' : ''} onClick={() => setDir('meaning')}>
              A word, pick the meaning
            </button>
            <button className={dir === 'word' ? 'on' : ''} onClick={() => setDir('word')}>
              A meaning, pick the word
            </button>
          </div>
        </div>
        {pool.length === 0 ? (
          <p className="empty">No words in this selection yet.</p>
        ) : (
          <button className="btn primary wide" onClick={() => start(pool)}>
            Start quiz ({Math.min(count, pool.length)} questions)
          </button>
        )}
      </section>
    )
  }

  if (qi >= qs.length) {
    return (
      <section className="done">
        <h2>
          {score} / {qs.length}
        </h2>
        <p>{missed.length === 0 ? 'No misses. Nice.' : 'Words you missed:'}</p>
        <ul className="missed">
          {missed.map((w) => (
            <li key={w.id}>
              <b>{w.word}</b>
              <Meaning word={w} />
              <AddToCategory wordId={w.id} />
            </li>
          ))}
        </ul>
        <div className="row">
          {missed.length > 0 && (
            <button className="btn primary" onClick={() => start(missed)}>
              Retry missed words
            </button>
          )}
          <button className="btn" onClick={() => setQs(null)}>
            New quiz
          </button>
        </div>
      </section>
    )
  }

  const q = qs[qi]
  const answered = picked !== null
  const choose = (idx) => {
    if (answered) return
    setPicked(idx)
    const ok = idx === q.answer
    store.record(q.word.id, ok)
    if (ok) setScore((n) => n + 1)
    else setMissed((m) => [...m, q.word])
  }
  const next = () => {
    setQi((n) => n + 1)
    setPicked(null)
  }

  return (
    <section>
      <div className="meter">
        <div style={{ width: `${(qi / qs.length) * 100}%` }} />
      </div>
      <div className="meta">
        <span>
          Question {qi + 1} of {qs.length}
        </span>
        <span>{score} correct so far</span>
      </div>
      <div className="card quiz-q">
        {dir === 'meaning' ? (
          <div className="card-word">{q.word.word}</div>
        ) : (
          <p className="defs big">{q.word.defs[0]}</p>
        )}
      </div>
      <div className="options">
        {q.options.map((o, idx) => {
          let cls = 'opt'
          if (answered && idx === q.answer) cls += ' right'
          else if (answered && idx === picked) cls += ' wrong'
          return (
            <button key={o.id} className={cls} onClick={() => choose(idx)} disabled={answered && idx !== q.answer && idx !== picked}>
              {dir === 'meaning' ? o.defs[0] : o.word}
            </button>
          )
        })}
      </div>
      {answered && (
        <>
          <div className="reveal">
            <b>{q.word.word}</b>
            <Pronounce word={q.word.word} />
            <Meaning word={q.word} />
          </div>
          <AddToCategory wordId={q.word.id} />
          <button className="btn primary wide" onClick={next} autoFocus>
            {qi + 1 === qs.length ? 'See results' : 'Next question'}
          </button>
        </>
      )}
    </section>
  )
}
