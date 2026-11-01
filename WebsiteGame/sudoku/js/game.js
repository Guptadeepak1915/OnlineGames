/* =====================================================
   game.js - Sudoku game state and actions
   ===================================================== */
const MAX_LIVES = 3;
const MAX_HINTS = 3;
const G = {
  n: 9,
  solution: [],
  vals: [],
  given: [],
  hinted: [],
  bad: [],
  notes: [],
  sel: null,
  notesMode: false,
  mode: "level",
  diff: "hard",
  level: 1,
  score: 0,
  lives: MAX_LIVES,
  hints: MAX_HINTS,
  hintsUsed: 0,
  mistakes: 0,
  elapsed: 0,
  lastPoints: 0,
  newBest: false,
  state: "menu",
  history: [],
};

let timerStartedAt = 0;

function planFor(level) {
  return [9, level < 3 ? "easy" : level < 5 ? "medium" : "hard"];
}

function loadPuzzle(n, diff) {
  const puzzle = createPuzzle(n, diff);
  Object.assign(G, {
    n,
    solution: puzzle.solution,
    vals: puzzle.values,
    given: puzzle.given,
    hinted: Array(n * n).fill(false),
    bad: Array(n * n).fill(false),
    notes: Array(n * n).fill(0),
    sel: null,
    notesMode: false,
    diff,
    hintsUsed: 0,
    mistakes: 0,
    elapsed: 0,
    lastPoints: 0,
    newBest: false,
    history: [],
  });
}

function beginPuzzle(n, diff) {
  loadPuzzle(n, diff);
  G.state = "play";
  startTimer();
}

function startLevels() {
  G.mode = "level";
  G.level = 1;
  G.score = 0;
  G.lives = MAX_LIVES;
  G.hints = MAX_HINTS;
  recordPlay();
  const [n, diff] = planFor(G.level);
  beginPuzzle(n, diff);
}

function nextLevel() {
  G.level++;
  if (G.level % 3 === 0) {
    if (G.lives < MAX_LIVES) G.lives++;
    else G.hints++;
  }
  const [n, diff] = planFor(G.level);
  beginPuzzle(n, diff);
}

function startPractice(n, diff) {
  G.mode = "practice";
  G.level = 1;
  G.score = 0;
  G.lives = MAX_LIVES;
  G.hints = 0;
  recordPlay();
  beginPuzzle(n, diff);
}

function nextPractice() {
  startPractice(9, prefs.diff);
}

function selectCell(i) {
  if (G.state === "play" && Number.isInteger(i) && i >= 0 && i < G.n * G.n)
    G.sel = i;
}

function moveSel(dr, dc) {
  if (G.state !== "play") return;
  const i = G.sel === null ? 0 : G.sel;
  const r = Math.max(0, Math.min(G.n - 1, rowOf(i) + dr));
  const c = Math.max(0, Math.min(G.n - 1, colOf(i) + dc));
  G.sel = r * G.n + c;
}

function saveHistory() {
  G.history.push({
    vals: G.vals.slice(),
    notes: G.notes.slice(),
    hinted: G.hinted.slice(),
    bad: G.bad.slice(),
    mistakes: G.mistakes,
    lives: G.lives,
    hints: G.hints,
    hintsUsed: G.hintsUsed,
    score: G.score,
  });
  if (G.history.length > 100) G.history.shift();
}

function undo() {
  if (G.state !== "play" || !G.history.length) return;
  const previous = G.history.pop();
  Object.assign(G, previous);
}

function toggleNotes() {
  if (G.state === "play") G.notesMode = !G.notesMode;
}

function inputNumber(value) {
  if (
    G.state !== "play" ||
    G.sel === null ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > G.n ||
    G.given[G.sel]
  )
    return null;

  const i = G.sel;
  if (G.notesMode) {
    if (G.vals[i]) return null;
    saveHistory();
    G.notes[i] ^= 1 << (value - 1);
    return { kind: "note", i };
  }
  if (G.vals[i] === value) return null;

  if (!isLogicalMove(G.vals, i, value))
    return { kind: "logic", i };

  saveHistory();
  G.bad[i] = false;
  if (G.solution[i] !== value) {
    G.mistakes++;
    if (G.mode === "level") G.lives--;
    G.bad[i] = true;
    if (G.mode === "level" && G.lives <= 0) finishRun();
    return { kind: "wrong", i };
  }

  placeValue(i, value, false);
  if (isSolved()) finishPuzzle();
  return { kind: G.state === "clear" ? "solved" : "placed", i };
}

function placeValue(i, value, hinted) {
  G.vals[i] = value;
  G.notes[i] = 0;
  G.bad[i] = false;
  G.hinted[i] = hinted;
  const noteBit = ~(1 << (value - 1));
  for (let peer = 0; peer < G.n * G.n; peer++) {
    if (isPeer(i, peer)) G.notes[peer] &= noteBit;
  }
}

function erase() {
  if (
    G.state !== "play" ||
    G.sel === null ||
    G.given[G.sel] ||
    (!G.vals[G.sel] && !G.notes[G.sel] && !G.bad[G.sel])
  )
    return null;
  saveHistory();
  G.vals[G.sel] = 0;
  G.notes[G.sel] = 0;
  G.hinted[G.sel] = false;
  G.bad[G.sel] = false;
  return { kind: "erased", i: G.sel };
}

function hint() {
  if (G.state !== "play" || (G.mode === "level" && G.hints <= 0)) return null;
  const move = findLogicalMove(G.vals);
  if (!move) return null;

  saveHistory();
  if (G.mode === "level") {
    G.hints--;
    G.score = Math.max(0, G.score - 25);
  }
  G.hintsUsed++;
  placeValue(move.i, move.value, true);
  if (isSolved()) finishPuzzle();
  return { kind: G.state === "clear" ? "solved" : "hint", i: move.i };
}

function isSolved() {
  return G.vals.every((value) => value > 0);
}

function finishPuzzle() {
  stopTimer();
  G.state = "clear";
  if (G.mode !== "level") return;

  const speedBonus = Math.max(0, 120 - Math.floor(G.elapsed / 1000));
  const points =
    100 + G.n * 10 + speedBonus + (G.mistakes === 0 ? 100 : 0);
  G.lastPoints = points;
  G.score += points;
  G.newBest = saveBest(G.score);
}

function finishRun() {
  stopTimer();
  G.state = "over";
  G.newBest = saveBest(G.score);
}

function leaveRun() {
  stopTimer();
  G.state = "menu";
}

function startTimer() {
  if (G.state === "play" && !timerStartedAt) timerStartedAt = Date.now();
}

function stopTimer() {
  if (timerStartedAt) {
    G.elapsed += Date.now() - timerStartedAt;
    timerStartedAt = 0;
  }
}

function elapsedMs() {
  return G.elapsed + (timerStartedAt ? Date.now() - timerStartedAt : 0);
}
