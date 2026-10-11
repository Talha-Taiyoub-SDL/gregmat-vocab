import { WORDS, BY_ID } from "./words";

export const statusOf = (state, id) => {
  const p = state.progress[id];
  if (!p) return "new";
  return p.last === "k" ? "known" : "learning";
};

export function wordsForScope(scope, state) {
  switch (scope.kind) {
    case "set":
      return WORDS.filter((w) => w.set === scope.set);
    case "category": {
      const c = state.categories.find((c) => c.id === scope.cat);
      return c ? c.wordIds.map((id) => BY_ID[id]).filter(Boolean) : [];
    }
    case "custom":
      return (scope.ids || []).map((id) => BY_ID[id]).filter(Boolean);
    case "weak":
      return WORDS.filter((w) => statusOf(state, w.id) !== "known");
    default:
      return WORDS;
  }
}

export function shuffle(arr) {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const STATUS_LABEL = {
  new: "New",
  learning: "Learning",
  known: "Known",
};
