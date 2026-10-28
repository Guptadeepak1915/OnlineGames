/* =====================================================
   ui.js - Draws the board, numbers, overlays and messages
   ===================================================== */

const $ = (id) => document.getElementById(id);
let colEls = [],
  slotEls = [];

function buildBoard() {
  const board = $("board");
  board.innerHTML = "";
  colEls = [];
  slotEls = [];
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement("button");
    col.type = "button";
    col.className = "col";
    col.dataset.c = c;
    slotEls[c] = [];
    for (let r = 0; r < ROWS; r++) {
      const s = document.createElement("div");
      s.className = "slot";
      col.appendChild(s);
      slotEls[c][r] = s;
    }
    board.appendChild(col);
    colEls.push(col);
  }
}

// justPlaced = {r, c} of the disc that was just dropped (it gets the fall animation)
function updateAll(justPlaced) {
  const winKey = new Set((G.winCells || []).map(([r, c]) => r + "," + c));
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const v = G.board[r][c],
        slot = slotEls[c][r];
      let disc = slot.firstChild;
      if (!v) {
        if (disc) slot.removeChild(disc);
        continue;
      }
      if (!disc) {
        disc = document.createElement("div");
        slot.appendChild(disc);
      }
      const falling = justPlaced && justPlaced.r === r && justPlaced.c === c;
      disc.className =
        "disc " +
        v.toLowerCase() +
        (falling ? " fall" : "") +
        (winKey.has(r + "," + c) ? " win" : "");
      disc.style.setProperty("--r", r);
    }
    const col = colEls[c];
    col.disabled =
      G.state !== "play" ||
      G.over ||
      G.busy ||
      !humanTurn() ||
      G.board[0][c] !== "";
    col.className = "col" + (c === G.sel && !col.disabled ? " sel" : "");
    col.setAttribute(
      "aria-label",
      "Column " + (c + 1) + (G.board[0][c] !== "" ? " (full)" : ""),
    );
  }
  updateHUD();
  if (!G.over && G.state === "play") {
    const cls = G.turn === "R" ? "r" : "y";
    const who =
      G.mode === "cpu"
        ? G.turn === "R"
          ? "Your turn"
          : "Computer is thinking..."
        : G.turn === "R"
          ? "Red's turn"
          : "Yellow's turn";
    $("status").innerHTML = `<span class="dot ${cls}"></span>${who}`;
  }
  $("endBtn").textContent = G.mode === "cpu" ? "End game" : "Change mode";
}

function updateHUD() {
  if (G.mode === "cpu") {
    $("l1").textContent = "Level";
    $("h1").textContent = NAMES[G.diff];
    $("l2").textContent = "Score";
    $("h2").textContent = G.score;
    $("l3").textContent = "Streak";
    $("h3").textContent = G.streak;
  } else {
    $("l1").textContent = "Red wins";
    $("h1").textContent = G.p2.R;
    $("l2").textContent = "Yellow wins";
    $("h2").textContent = G.p2.Y;
    $("l3").textContent = "Draws";
    $("h3").textContent = G.p2.D;
  }
  $("h4").textContent = G.round;
}

function setStatus(t) {
  $("status").textContent = t;
}
function showNext(label) {
  $("nextBtn").textContent = label;
  $("nextBtn").classList.remove("hidden");
}
function hideNext() {
  $("nextBtn").classList.add("hidden");
}

function toast(t) {
  const el = $("toast");
  el.textContent = t;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1400);
}

function hideOverlays() {
  $("menu").classList.add("hidden");
  $("over").classList.add("hidden");
}
function showMenu() {
  refreshStats();
  $("over").classList.add("hidden");
  $("menu").classList.remove("hidden");
}

function refreshStats() {
  $("hdrBest").textContent = best;
  $("mBest").textContent = best;
  $("mPlays").textContent = plays;
}

function showOver(newBest, lost) {
  $("oTitle").textContent = lost ? "You lost" : "Run ended";
  $("oScore").textContent = G.score;
  $("oBest").textContent = best;
  $("oWins").textContent = G.wins;
  $("oBadge").classList.toggle("hidden", !newBest);
  $("oMsg").textContent = newBest
    ? "That is your highest score ever!"
    : G.score > 0 && best - G.score <= 30
      ? `So close! Only ${best - G.score} points from your best.`
      : lost
        ? "Start in the middle column and watch the diagonals."
        : "Nice run. Come back and beat your best.";
  $("over").classList.remove("hidden");
}
