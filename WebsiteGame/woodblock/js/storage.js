/* storage.js - saves best score, play count, sound setting and the running game.
   The key "woodblock_best" must match bestKey in games-data.js
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
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
};
const STATE_KEY = "woodblock_state";
let best = +store.get("woodblock_best", 0);
let plays = +store.get("woodblock_plays", 0);
let muted = !!store.get("woodblock_muted", false);

function saveBest(score) {
  // returns true if this is a new best
  if (score <= best) return false;
  best = score;
  store.set("woodblock_best", best);
  return true;
}
function countPlay() {
  plays++;
  store.set("woodblock_plays", plays);
}
function saveMuted() {
  store.set("woodblock_muted", muted);
}
