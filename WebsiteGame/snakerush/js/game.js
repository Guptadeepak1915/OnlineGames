/* Snake Rush - starter code (tap counter demo). Replace with your game.
   Best score is saved with the key "snakerush_best", which the dashboard reads. */
const BEST_KEY = "snakerush_best";

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
let best = +store.get(BEST_KEY, 0);
let score = 0,
  left = 10,
  timer = null,
  running = false;
const $ = (id) => document.getElementById(id);

function show() {
  $("score").textContent = score;
  $("time").textContent = left;
  $("hdrBest").textContent = best;
}

function start() {
  score = 0;
  left = 10;
  running = true;
  show();
  $("tapBtn").textContent = "TAP!";
  $("msg").textContent = "Go go go!";
  timer = setInterval(() => {
    left--;
    show();
    if (left <= 0) end();
  }, 1000);
}
function end() {
  clearInterval(timer);
  running = false;
  const isBest = score > best;
  if (isBest) {
    best = score;
    store.set(BEST_KEY, best);
  }
  $("tapBtn").textContent = "Play again";
  $("msg").textContent =
    (isBest ? "New best! " : "") + "You tapped " + score + " times.";
  show();
}
$("tapBtn").onclick = () => {
  if (!running) start();
  else {
    score++;
    show();
  }
};
show();
