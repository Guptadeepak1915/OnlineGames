/* =====================================================
   ui.js - Draws the board, numbers, overlays and messages
   ===================================================== */

const $ = (id) => document.getElementById(id);
let sqEls = [];

function buildBoard() {
  const board = $("board");
  board.innerHTML = "";
  sqEls = [];
  for (let i = 0; i < 9; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sq";
    b.dataset.i = i;
    board.appendChild(b);
    sqEls.push(b);
  }
}

// justPlaced = index of the square that was just filled (for a small pop animation)
function updateAll(justPlaced) {
  for (let i = 0; i < 9; i++) {
    const v = G.board[i],
      el = sqEls[i];
    el.textContent = v;
    el.className =
      "sq" +
      (v ? " " + v.toLowerCase() : "") +
      (G.winLine && G.winLine.includes(i) ? " win" : "") +
      (i === justPlaced ? " pop" : "");
    el.disabled =
      !!v ||
      G.over ||
      G.busy ||
      G.state !== "play" ||
      (G.mode === "cpu" && G.turn !== "X");
    el.setAttribute(
      "aria-label",
      v ? "Square " + (i + 1) + ": " + v : "Square " + (i + 1) + ": empty",
    );
  }
  updateHUD();
  if (!G.over && G.state === "play") {
    setStatus(
      G.mode === "cpu"
        ? G.turn === "X"
          ? "Your turn (X)"
          : "Computer is thinking..."
        : `${G.turn}'s turn`,
    );
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
    $("l1").textContent = "X wins";
    $("h1").textContent = G.p2.X;
    $("l2").textContent = "O wins";
    $("h2").textContent = G.p2.O;
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
    : G.score > 0 && best - G.score <= 20
      ? `So close! Only ${best - G.score} points from your best.`
      : lost
        ? "Take the centre or a corner first, and block two in a row."
        : "Nice run. Come back and beat your best.";
  $("over").classList.remove("hidden");
}
