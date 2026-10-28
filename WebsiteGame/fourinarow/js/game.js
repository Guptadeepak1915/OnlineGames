/* =====================================================
   game.js - Four in a Row rules, rounds, score and run
   Red ('R') = you / player 1.  Yellow ('Y') = computer / player 2.
   ===================================================== */

const BASE = { easy: 20, medium: 40, hard: 80 }; // base points for a win
const NAMES = { easy: "Easy", medium: "Medium", hard: "Hard" };

const G = {
  state: "menu", // menu | play | over
  mode: "cpu", // cpu | two
  diff: "easy",
  board: newBoard(),
  turn: "R",
  over: false,
  busy: false,
  winCells: null,
  last: null,
  score: 0,
  streak: 0,
  round: 0,
  wins: 0,
  myMoves: 0,
  sel: 3, // column chosen with the keyboard
  p2: { R: 0, Y: 0, D: 0 },
};

/* ---------- Start ---------- */
function startCpu(diff) {
  G.mode = "cpu";
  G.diff = diff;
  G.score = 0;
  G.streak = 0;
  G.round = 0;
  G.wins = 0;
  G.state = "play";
  hideOverlays();
  nextRound();
}
function startTwo() {
  G.mode = "two";
  G.p2 = { R: 0, Y: 0, D: 0 };
  G.round = 0;
  G.state = "play";
  hideOverlays();
  nextRound();
}

function nextRound() {
  G.round++;
  G.board = newBoard();
  G.over = false;
  G.busy = false;
  G.winCells = null;
  G.last = null;
  G.myMoves = 0;
  G.sel = 3;
  G.turn = G.round % 2 === 1 ? "R" : "Y"; // who starts changes every round
  hideNext();
  updateAll();
  if (G.mode === "cpu" && G.turn === "Y") cpuTurn();
}

/* ---------- Moves ---------- */
function humanTurn() {
  return G.mode === "two" || G.turn === "R";
}

function columnClick(c) {
  if (G.state !== "play" || G.over || G.busy || !humanTurn()) return;
  drop(c);
}

function drop(c) {
  const r = dropRow(G.board, c);
  if (r < 0) return; // column is full
  G.board[r][c] = G.turn;
  G.last = { r, c };
  if (G.mode === "cpu" && G.turn === "R") G.myMoves++;

  const line = winLine(G.board, r, c, G.turn);
  if (line) {
    G.winCells = line;
    endRound(G.turn);
    return;
  }
  if (isFull(G.board)) {
    endRound("D");
    return;
  }

  G.turn = other(G.turn);
  updateAll(G.last);
  if (G.mode === "cpu" && G.turn === "Y") cpuTurn();
}

function cpuTurn() {
  G.busy = true;
  updateAll();
  setTimeout(() => {
    if (G.state !== "play") return;
    G.busy = false;
    drop(cpuMove(G.board, "Y", G.diff));
  }, 650);
}

/* ---------- End of a round ---------- */
function endRound(w) {
  G.over = true;

  if (G.mode === "two") {
    G.p2[w]++;
    updateAll(G.last);
    setStatus(
      w === "D" ? "Draw!" : `${w === "R" ? "Red" : "Yellow"} wins this round!`,
    );
    showNext("Next round");
    return;
  }

  if (w === "R") {
    G.streak++;
    G.wins++;
    const speed = 2 * Math.max(0, 21 - G.myMoves);
    const pts = BASE[G.diff] + 10 * (G.streak - 1) + speed;
    G.score += pts;
    updateAll(G.last);
    setStatus(
      G.streak > 1
        ? `You win! +${pts} (streak x${G.streak})`
        : `You win! +${pts}`,
    );
    showNext("Next round");
  } else if (w === "D") {
    G.streak = 0;
    G.score += 10;
    updateAll(G.last);
    setStatus("Draw. +10 points");
    showNext("Next round");
  } else {
    updateAll(G.last);
    setStatus("The computer wins this round!");
    setTimeout(() => finish(true), 1400);
  }
}

/* ---------- End of the run ---------- */
function finish(lost) {
  if (G.state !== "play") return;
  G.state = "over";
  const newBest = saveResult(G.score);
  refreshStats();
  showOver(newBest, lost);
}

// "End game" button: finish the run (cpu) or go back to the menu (two players)
function endGame() {
  if (G.state !== "play") return;
  if (G.mode === "cpu") finish(false);
  else {
    G.state = "menu";
    showMenu();
  }
}

/* ---------- Keyboard column selection ---------- */
function moveSel(d) {
  if (G.state !== "play" || G.over) return;
  G.sel = Math.min(COLS - 1, Math.max(0, G.sel + d));
  updateAll();
}
