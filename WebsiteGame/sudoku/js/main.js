/* main.js - menu buttons and start-up */
initRender();
bindInput();

$("diffOpts").addEventListener("click", (e) => {
  const b = e.target.closest(".opt");
  if (!b) return;
  prefs.diff = b.dataset.diff;
  savePrefs();
  document
    .querySelectorAll("#diffOpts .opt")
    .forEach((x) => x.classList.toggle("on", x === b));
});

$("btnLevels").addEventListener("click", () => startPuzzle(startLevels));
$("btnPractice").addEventListener("click", () =>
  startPuzzle(() => startPractice(9, prefs.diff)),
);
$("btnNext").addEventListener("click", () =>
  startPuzzle(G.mode === "level" ? nextLevel : nextPractice),
);
$("btnAgain").addEventListener("click", () => startPuzzle(startLevels));
$("btnOverMenu").addEventListener("click", () => {
  showMenu();
});
async function shareScore(statusId) {
  const text =
    G.mode === "level"
      ? `I ${G.state === "clear" ? "cleared level" : "reached level"} ${G.level} in Sudoku! Score: ${G.score} points.${G.state === "clear" ? ` I earned ${G.lastPoints} points this level.` : ""} Can you beat me?`
      : `I solved a Sudoku puzzle in ${fmtTime(G.elapsed)} with ${G.mistakes} mistakes! Can you beat me?`;
  const status = $(statusId);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Sudoku",
        text,
        url: location.href,
      });
      return;
    }
    if (!navigator.clipboard) {
      status.textContent = "Sharing and clipboard are unavailable in this browser.";
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    status.textContent = "Copied! Paste it to your friends.";
  } catch (error) {
    if (error.name !== "AbortError")
      status.textContent = "Could not share right now. Please try again.";
  }
}
$("btnClearShare").addEventListener("click", () => shareScore("cShareStatus"));
$("btnShare").addEventListener("click", () => shareScore("oShareStatus"));

setInterval(() => {
  if (G.state === "play") $("hTime").textContent = fmtTime(elapsedMs());
}, 250);

// first screen: an example board behind the menu
G.mode = "practice";
loadPuzzle(9, "hard");
stopTimer();
G.state = "menu";
buildBoard();
renderAll();
refreshStats();
showMenu();
initAds();
