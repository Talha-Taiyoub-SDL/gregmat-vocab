import { useEffect, useState } from "react";
import { useStore } from "./store";
import { lookup, playWord } from "./pronounce";
import { SETS } from "./words";
import { STATUS_LABEL, statusOf } from "./lib";

export function Meaning({ word }) {
  return (
    <div className="meaning" aria-live="polite">
      {word.image && (
        <img
          className="pic"
          src={word.image}
          alt={`Illustration for ${word.word}`}
        />
      )}
      {word.defs.length > 1 ? (
        <ol className="defs">
          {word.defs.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ol>
      ) : (
        <p className="defs">{word.defs[0]}</p>
      )}
    </div>
  );
}

export function StatusChip({ id }) {
  const { state } = useStore();
  const s = statusOf(state, id);
  return <span className={`chip chip-${s}`}>{STATUS_LABEL[s]}</span>;
}

// "Add to category" dropdown. Picking a category toggles the word in or out of it.
export function AddToCategory({ wordId }) {
  const { state, createCategory, setInCategory } = useStore();
  const mine = state.categories.filter((c) => c.wordIds.includes(wordId));

  const onChange = (e) => {
    const v = e.target.value;
    e.target.value = "";
    if (v === "__new") {
      const name = window.prompt("Name for the new category");
      if (name && name.trim()) createCategory(name, wordId);
      return;
    }
    const cat = state.categories.find((c) => c.id === v);
    if (cat) setInCategory(cat.id, wordId, !cat.wordIds.includes(wordId));
  };

  return (
    <div className="addto">
      <select value="" onChange={onChange} aria-label="Add to category">
        <option value="">Add to category…</option>
        {state.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.wordIds.includes(wordId)
              ? `✓ ${c.name} (tap to remove)`
              : c.name}
          </option>
        ))}
        <option value="__new">+ New category…</option>
      </select>
      {mine.length > 0 && (
        <ul className="tags">
          {mine.map((c) => (
            <li key={c.id}>
              {c.name}
              <button
                aria-label={`Remove from ${c.name}`}
                onClick={() => setInCategory(c.id, wordId, false)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Choose which words to study: everything, one set, one category, or only words not yet known.
export function ScopePicker({ scope, onChange }) {
  const { state } = useStore();
  const setKind = (kind) => {
    if (kind === "set") onChange({ kind, set: SETS[0] });
    else if (kind === "category")
      onChange({ kind, cat: state.categories[0]?.id || "" });
    else onChange({ kind });
  };
  return (
    <div className="scope">
      <select
        value={scope.kind}
        onChange={(e) => setKind(e.target.value)}
        aria-label="Which words"
      >
        <option value="all">All words</option>
        <option value="weak">Not known yet</option>
        <option value="set">One set</option>
        <option value="category">One category</option>
        {scope.kind === "custom" && (
          <option value="custom">Filtered words ({scope.ids.length})</option>
        )}
      </select>
      {scope.kind === "set" && (
        <select
          value={scope.set}
          onChange={(e) =>
            onChange({ kind: "set", set: Number(e.target.value) })
          }
          aria-label="Set"
        >
          {SETS.map((n) => (
            <option key={n} value={n}>
              Set {n}
            </option>
          ))}
        </select>
      )}
      {scope.kind === "category" &&
        (state.categories.length ? (
          <select
            value={scope.cat}
            onChange={(e) =>
              onChange({ kind: "category", cat: e.target.value })
            }
            aria-label="Category"
          >
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.wordIds.length})
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">
            No categories yet. Create one in the Categories tab.
          </span>
        ))}
    </div>
  );
}

// Speaker button plus the IPA spelling. `auto` plays the word as soon as it is ready.
export function Pronounce({ word, auto = false }) {
  const [res, setRes] = useState(null);
  // Only trust a lookup that belongs to the word currently shown.
  const info = res && res.word === word ? res.info : null;

  useEffect(() => {
    let live = true;
    lookup(word).then((i) => live && setRes({ word, info: i }));
    return () => {
      live = false;
    };
  }, [word]);

  // Starts right away: the bundled audio does not need the dictionary lookup to finish first.
  useEffect(() => {
    if (auto) playWord(word, info);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, word]);

  return (
    <div className="pron">
      <button
        className="speak"
        aria-label={`Hear “${word}” in American English`}
        onClick={(e) => {
          e.stopPropagation();
          playWord(word, info);
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      </button>
      {info?.ipa && <span className="ipa">{info.ipa}</span>}
    </div>
  );
}
