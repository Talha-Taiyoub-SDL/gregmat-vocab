import { useState } from "react";
import { useStore } from "./store";
import { WORDS } from "./words";
import { statusOf } from "./lib";
import Flashcards from "./Flashcards";
import Quiz from "./Quiz";
import Browse from "./Browse";
import Categories from "./Categories";

const TABS = [
  ["cards", "Flashcards"],
  ["quiz", "Quiz"],
  ["words", "Words"],
  ["cats", "Categories"],
];

const SYNC_TEXT = {
  local: "Saved on this device",
  "signed-out": "Saved on this device",
  saving: "Saving…",
  synced: "Synced",
  error: "Could not sync. Changes are kept on this device.",
};

export default function App() {
  const store = useStore();
  const [view, setView] = useState("cards");
  // `launch` carries a preselected scope (from a category) and remounts the screen.
  const [launch, setLaunch] = useState({ n: 0, scope: null });

  const go = (v, scope = null) => {
    setLaunch((l) => ({ n: l.n + 1, scope }));
    setView(v);
  };

  const counts = { known: 0, learning: 0, new: 0 };
  for (const w of WORDS) counts[statusOf(store.state, w.id)]++;

  return (
    <div className="app">
      <header>
        <div className="top">
          <h1>GregMAT Vocab</h1>
          <div className="auth">
            {store.hasBackend &&
              (store.session ? (
                <>
                  <span className="muted email">
                    {store.session.user.email}
                  </span>
                  <button className="link" onClick={store.signOut}>
                    Sign out
                  </button>
                </>
              ) : (
                <button className="btn small signin" onClick={store.signIn}>
                  Sign in with Google to sync
                </button>
              ))}
            {/* <span className={`muted sync sync-${store.sync}`}>
              {SYNC_TEXT[store.sync]}
            </span> */}
            <span className={`muted sync sync-${store.sync}`}>
              {store.sync === "synced" && (
                <svg
                  className="tick"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {SYNC_TEXT[store.sync]}
            </span>
          </div>
        </div>
        <div
          className="progress"
          title={`${counts.known} known, ${counts.learning} learning, ${counts.new} new`}
        >
          <i className="p-known" style={{ flex: counts.known }} />
          <i className="p-learning" style={{ flex: counts.learning }} />
          <i className="p-new" style={{ flex: counts.new }} />
        </div>
        <p className="muted legend">
          {counts.known} known · {counts.learning} learning · {counts.new} new
          of {WORDS.length}
        </p>
        <nav>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "on" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {view === "cards" && (
          <Flashcards key={launch.n} initialScope={launch.scope} />
        )}
        {view === "quiz" && <Quiz key={launch.n} initialScope={launch.scope} />}
        {view === "words" && <Browse />}
        {view === "cats" && (
          <Categories
            onStudy={(s) => go("cards", s)}
            onQuiz={(s) => go("quiz", s)}
          />
        )}
      </main>
      <footer className="footer">
        Made by{" "}
        <a
          href="https://www.linkedin.com/in/talha-taiyoub/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Talha Taiyoub
        </a>
      </footer>
    </div>
  );
}
