import { useEffect, useState } from "react";
import { useStore } from "./store";
import { BY_ID } from "./words";
import { shuffle, wordsForScope } from "./lib";
import {
  AddToCategory,
  Meaning,
  Pronounce,
  ScopePicker,
  StatusChip,
} from "./ui";
import { lookup, preloadWord } from "./pronounce";

export default function Flashcards({ initialScope }) {
  const store = useStore();
  const [scope, setScope] = useState(initialScope || { kind: "all" });
  const [deck, setDeck] = useState(() =>
    shuffle(wordsForScope(scope, store.state)).map((w) => w.id),
  );
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [tally, setTally] = useState({ k: 0, u: 0 });
  const [auto, setAuto] = useState(
    () => localStorage.getItem("vocab-autoplay") === "1",
  );
  const toggleAuto = (on) => {
    setAuto(on);
    localStorage.setItem("vocab-autoplay", on ? "1" : "0");
  };

  const build = (s) => {
    setScope(s);
    setDeck(shuffle(wordsForScope(s, store.state)).map((w) => w.id));
    setI(0);
    setShown(false);
    setTally({ k: 0, u: 0 });
  };

  const word = BY_ID[deck[i]];
  const next = () => {
    setI((n) => n + 1);
    setShown(false);
  };
  const answer = (ok) => {
    store.record(word.id, ok);
    setTally((t) => (ok ? { ...t, k: t.k + 1 } : { ...t, u: t.u + 1 }));
    next();
  };

  // Get the next few cards ready: pictures, pronunciation lookups and audio files.
  useEffect(() => {
    for (const id of deck.slice(i + 1, i + 5)) {
      const n = BY_ID[id];
      if (!n) continue;
      if (n.image) new Image().src = n.image;
      preloadWord(n.word);
      lookup(n.word);
    }
  }, [deck, i]);

  // Keyboard: space reveals; once revealed, left = didn't know, right = knew it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target !== document.body || !word) return;
      if (!shown && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (!shown && e.key === "ArrowRight") next();
      else if (shown && e.key === "ArrowLeft") answer(false);
      else if (shown && e.key === "ArrowRight") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section>
      <ScopePicker scope={scope} onChange={build} />
      <label className="check">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => toggleAuto(e.target.checked)}
        />
        Play the pronunciation when a card appears
      </label>

      {deck.length === 0 && (
        <p className="empty">No words in this selection yet.</p>
      )}

      {deck.length > 0 && !word && (
        <div className="done">
          <h2>Deck finished</h2>
          <p>
            You knew {tally.k} and missed {tally.u} out of {deck.length}.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => build(scope)}>
              Shuffle and go again
            </button>
            {tally.u > 0 && (
              <button className="btn" onClick={() => build({ kind: "weak" })}>
                Study words not known yet
              </button>
            )}
          </div>
        </div>
      )}

      {word && (
        <>
          <div className="meter" aria-label={`Card ${i + 1} of ${deck.length}`}>
            <div style={{ width: `${(i / deck.length) * 100}%` }} />
          </div>
          <div className="meta">
            <span>
              {i + 1} / {deck.length}
            </span>
            <span>
              <b className="good">{tally.k}</b> knew ·{" "}
              <b className="bad">{tally.u}</b> missed
            </span>
          </div>

          <div
            className={`card${shown ? " shown" : ""}`}
            onClick={() => !shown && setShown(true)}
            role={shown ? undefined : "button"}
            tabIndex={shown ? undefined : 0}
            onKeyDown={(e) => {
              if (!shown && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setShown(true);
              }
            }}
          >
            <div className="card-top">
              <StatusChip id={word.id} />
              <span className="muted">Set {word.set}</span>
            </div>
            <div className="card-word">{word.word}</div>
            <Pronounce word={word.word} auto={auto} />
            {shown ? (
              <Meaning word={word} />
            ) : (
              <div className="hint">Say what it means, then tap the card</div>
            )}
          </div>

          {shown ? (
            <div className="row two">
              <button className="btn bad-btn" onClick={() => answer(false)}>
                Didn’t know
              </button>
              <button className="btn good-btn" onClick={() => answer(true)}>
                Knew it
              </button>
            </div>
          ) : (
            <div className="row two">
              <button className="btn" onClick={next}>
                Skip
              </button>
              <button className="btn primary" onClick={() => setShown(true)}>
                Show meaning
              </button>
            </div>
          )}

          <AddToCategory wordId={word.id} />
        </>
      )}
    </section>
  );
}
