/* storage.js - saves best score and sound setting in the browser
   The key "bricksbreakerquest_best" must match bestKey in games-data.js
   so the dashboard card can show "Your best". */
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
let best = +store.get("bricksbreakerquest_best", 0);
let plays = +store.get("bricksbreakerquest_plays", 0);
let muted = !!store.get("bricksbreakerquest_muted", false);

// Call when a run ends. Returns true if it is a new best.
function saveResult(s) {
  const newBest = s > best;
  plays++;
  store.set("bricksbreakerquest_plays", plays);
  if (newBest) {
    best = s;
    store.set("bricksbreakerquest_best", best);
  }
  return newBest;
}
function saveMuted() {
  store.set("bricksbreakerquest_muted", muted);
}
