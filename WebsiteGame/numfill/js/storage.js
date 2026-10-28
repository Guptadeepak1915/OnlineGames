/* storage.js - save best score in the browser (localStorage) */
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
let best = +store.get("numfill_best", 0);
let plays = +store.get("numfill_plays", 0);

// Call when a run ends. Returns true if new best.
function saveResult(s) {
  const newBest = s > best;
  plays++;
  store.set("numfill_plays", plays);
  if (newBest) {
    best = s;
    store.set("numfill_best", best);
  }
  return newBest;
}
