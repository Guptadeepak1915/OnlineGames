/* main.js - controls (touch, mouse, keyboard), buttons and the game loop */

layout();
window.addEventListener("resize", layout);

/* ---------- Move the paddle with finger or mouse ---------- */
function pointerX(e) {
  const r = cv.getBoundingClientRect();
  return ((e.clientX - r.left) / r.width) * W;
}
cv.addEventListener("pointermove", (e) => {
  if (G.state === "ready" || G.state === "play") G.paddle.tx = pointerX(e);
});
cv.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (G.state === "ready" || G.state === "play") G.paddle.tx = pointerX(e);
  if (G.state === "ready") launch();
});

/* ---------- Keyboard ---------- */
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const playing = ["ready", "play", "paused"].includes(G.state);
  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    G.keys.l = true;
    if (playing) e.preventDefault();
  } else if (e.code === "ArrowRight" || e.code === "KeyD") {
    G.keys.r = true;
    if (playing) e.preventDefault();
  } else if (e.code === "Space" && playing) {
    e.preventDefault();
    if (G.state === "ready") launch();
  } else if (e.code === "KeyP" && playing) {
    togglePause();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") G.keys.l = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") G.keys.r = false;
});

/* ---------- Buttons ---------- */
$("playBtn").onclick = newRun;
$("againBtn").onclick = newRun;
$("startBtn").onclick = startLevel;
$("nextBtn").onclick = nextLevel;
$("resumeBtn").onclick = togglePause;
$("pauseBtn").onclick = () => {
  if (["ready", "play", "paused"].includes(G.state)) togglePause();
};
$("soundBtn").onclick = () => {
  muted = !muted;
  saveMuted();
  updateSoundButton();
};
$("shareBtn").onclick = async () => {
  const text = `I scored ${G.score} (level ${G.level}) in Bricks Breaker Quest! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Bricks Breaker Quest",
        text,
        url: location.href,
      });
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    $("oMsg").textContent = "Copied! Paste it to your friends.";
  } catch (e) {}
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && G.state === "play") togglePause();
});

/* ---------- Game loop ---------- */
let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - (last || t)) / 1000);
  last = t;
  update(dt);
  draw(t);
  requestAnimationFrame(frame);
}

updateSoundButton();
updateHUD();
refreshStats();
initAds();
requestAnimationFrame(frame);
