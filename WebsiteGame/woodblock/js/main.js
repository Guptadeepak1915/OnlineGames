/* main.js - start-up and the buttons */

initRender();
bindInput();

// continue a saved game if there is one
let hasSave = false;
const saved = store.get(STATE_KEY, null);
if (saved && restore(saved)) hasSave = true;
else {
  store.del(STATE_KEY);
  newGame();
}
renderAll();
refreshStats();
updateSoundButton();
$("btnContinue").classList.toggle("hidden", !hasSave);
$("btnPlay").textContent = hasSave ? "New game" : "Play";
showOverlay("menu");

function startNew() {
  abandonRun();
  newGame();
  UI.sel = null;
  UI.cur = null;
  UI.locked = false;
  renderAll();
  refreshStats();
  saveGame();
  hideOverlays();
}

$("btnPlay").addEventListener("click", startNew);
$("btnContinue").addEventListener("click", hideOverlays);
$("btnAgain").addEventListener("click", startNew);
$("btnNew").addEventListener("click", () => {
  if (G.state === "play" && G.moves > 0) showOverlay("confirm");
  else startNew();
});
$("btnConfirmYes").addEventListener("click", startNew);
$("btnConfirmNo").addEventListener("click", hideOverlays);
$("btnSound").addEventListener("click", () => {
  muted = !muted;
  saveMuted();
  updateSoundButton();
  if (!muted) sfx.pick();
});
$("btnShare").addEventListener("click", async () => {
  const text = `I scored ${G.score} in Wood Block Puzzle! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Wood Block Puzzle",
        text,
        url: location.href,
      });
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    $("oMsg").textContent = "Copied! Paste it to your friends.";
  } catch (e) {}
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("confirm").classList.contains("hidden"))
    hideOverlays();
});

initAds();
