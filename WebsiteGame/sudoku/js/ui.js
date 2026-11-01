/* =====================================================
   ui.js - menu, level clear and game over screens
   ===================================================== */
const OVERLAYS = ["menu", "clear", "over"];
function showOverlay(id) {
  OVERLAYS.forEach((o) => $(o).classList.toggle("hidden", o !== id));
}
function hideOverlays() {
  OVERLAYS.forEach((o) => $(o).classList.add("hidden"));
}

function buildMenu() {
  const diffs = $("diffOpts");
  ["easy", "medium", "hard"].forEach((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt" + (d === prefs.diff ? " on" : "");
    b.dataset.diff = d;
    b.textContent = d[0].toUpperCase() + d.slice(1);
    diffs.appendChild(b);
  });
}
function refreshStats() {
  $("mBest").textContent = best;
  $("mPlays").textContent = plays;
  $("hdrBest").textContent = best;
}
function showMenu() {
  G.state = "menu";
  stopTimer();
  refreshStats();
  buildMenu();
  showOverlay("menu");
}

function showClear() {
  const level = G.mode === "level";
  $("cTitle").textContent = level ? `Level ${G.level} clear!` : "Solved!";
  $("cTime").textContent = fmtTime(G.elapsed);
  $("cMistakes").textContent = G.mistakes;
  $("cPoints").textContent = level ? "+" + G.lastPoints : "-";
  $("cMsg").textContent = level
    ? (G.mistakes === 0 ? "No mistakes! +100 bonus. " : "") +
      (G.hintsUsed ? `Hints used: ${G.hintsUsed}. ` : "") +
      (G.level % 3 === 0 && G.lives === MAX_LIVES ? "Lives are full. " : "") +
      `Next: ${planFor(G.level + 1)[0]}×${planFor(G.level + 1)[0]}.`
    : "Nicely done. Try a bigger grid or a harder level.";
  $("btnNext").textContent = level ? "Next level" : "New puzzle";
  refreshStats();
  showOverlay("clear");
}
function showOver() {
  $("oScore").textContent = G.score;
  $("oBest").textContent = best;
  $("oLevel").textContent = G.level;
  $("oBadge").classList.toggle("hidden", !G.newBest);
  $("oMsg").textContent = G.newBest
    ? "Your highest score ever!"
    : best - G.score <= 100
      ? `So close! Only ${best - G.score} points from your best.`
      : "Use the row and column highlight to find the number that is missing.";
  refreshStats();
  showOverlay("over");
}
