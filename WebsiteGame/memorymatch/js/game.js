/* =====================================================
   game.js - Memory Match logic
   Levels, matching, combo, lives and score
   ===================================================== */

const MAX_LIVES = 5;

// symbol + color for each pair (16 different, 15 needed at most)
const SYMS = [
  ["★", "#ffd23f"],
  ["♥", "#ff5c7a"],
  ["♦", "#3df2e0"],
  ["♣", "#a0ff6b"],
  ["♠", "#b9b0f0"],
  ["●", "#ff9f43"],
  ["▲", "#ff5c7a"],
  ["■", "#3df2e0"],
  ["☾", "#ffd23f"],
  ["✿", "#ff8fd1"],
  ["♫", "#7fd0ff"],
  ["☀", "#ffb347"],
  ["✦", "#c8ff6b"],
  ["☂", "#9ad1ff"],
  ["✈", "#ff9a9a"],
  ["♞", "#d6c2ff"],
];

const S = {
  state: "menu", // menu | play | over
  level: 1,
  score: 0,
  lives: MAX_LIVES,
  combo: 0,
  tiles: [],
  pairs: 0,
  matched: 0,
  first: null,
  second: null,
  busy: false,
  mistakes: 0,
  t0: 0,
};

/* ---------- Difficulty (change numbers here) ---------- */
const pairsFor = (l) => [4, 6, 8, 10, 12, 15][Math.min(l, 6) - 1];
const colsFor = (p) => (p <= 8 ? 4 : p === 10 ? 5 : 6);
//const previewFor = (l) => Math.max(4000, 4000 - (l - 1) * 200); // ms cards are shown at the start
const previewFor = l => pairsFor(l) * 800 + 4000;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Run and level ---------- */
function newRun() {
  S.level = 1;
  S.score = 0;
  S.lives = MAX_LIVES;
  S.combo = 0;
  S.state = "play";
  hideOverlays();
  loadLevel();
}

function loadLevel() {
  S.pairs = pairsFor(S.level);
  S.matched = 0;
  S.mistakes = 0;
  S.first = S.second = null;
  S.combo = 0;
  const picks = shuffle(SYMS.map((_, i) => i)).slice(0, S.pairs);
  S.tiles = shuffle(picks.concat(picks)).map((sym) => ({
    sym,
    up: true,
    done: false,
  })); // start face up (preview)
  S.busy = true;
  renderBoard();
  updateAll();
  setStatus("Remember the cards...");
  setTimeout(() => {
    if (S.state !== "play") return;
    S.tiles.forEach((t) => (t.up = false));
    S.busy = false;
    S.t0 = performance.now();
    updateBoard();
    setStatus("Find the pairs!");
  }, previewFor(S.level));
}

/* ---------- Player taps a card ---------- */
function onTile(i) {
  if (S.state !== "play" || S.busy) return;
  const t = S.tiles[i];
  if (t.up || t.done) return;
  t.up = true;
  updateBoard();

  if (S.first === null) {
    S.first = i;
    return;
  }
  S.second = i;
  S.busy = true;

  const a = S.tiles[S.first],
    b = S.tiles[S.second];
  if (a.sym === b.sym) pairFound(a, b);
  else pairMissed(a, b);
}

function pairFound(a, b) {
  a.done = b.done = true;
  S.combo++;
  S.matched++;
  S.score += 10 * Math.min(S.combo, 5);
  S.first = S.second = null;
  updateAll();
  if (S.matched === S.pairs) setTimeout(levelClear, 450);
  else S.busy = false;
}

function pairMissed(a, b) {
  S.combo = 0;
  S.mistakes++;
  S.lives--;
  shakeBoard();
  updateHUD();
  setTimeout(() => {
    if (S.state !== "play") return;
    if (S.lives <= 0) {
      S.tiles.forEach((t) => (t.up = true)); // show all cards
      updateBoard();
      setStatus("Out of lives!");
      setTimeout(gameOver, 1200);
      return;
    }
    a.up = b.up = false;
    S.first = S.second = null;
    S.busy = false;
    updateBoard();
  }, 800);
}

function levelClear() {
  const sec = (performance.now() - S.t0) / 1000;
  let bonus = 50 + 10 * S.level + Math.max(0, Math.round(S.pairs * 6 - sec));
  if (S.mistakes === 0) bonus += 50;
  S.score += bonus;
  S.lives = Math.min(MAX_LIVES, S.lives + 1);
  toast(`Level ${S.level} clear! +${bonus}`);
  S.level++;
  updateHUD();
  S.busy = true;
  setTimeout(loadLevel, 1200);
}

function gameOver() {
  S.state = "over";
  const newBest = saveResult(S.score);
  refreshStats();
  showOver(newBest);
}
