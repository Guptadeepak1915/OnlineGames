/* main.js - buttons, keyboard and start-up */
buildBoard();

document
  .querySelectorAll("[data-diff]")
  .forEach((b) => (b.onclick = () => startCpu(b.dataset.diff)));
$("twoBtn").onclick = startTwo;
$("againBtn").onclick = showMenu; // choose level again
$("nextBtn").onclick = nextRound;
$("endBtn").onclick = endGame;

$("board").addEventListener("click", (e) => {
  const el = e.target.closest(".col");
  if (el) columnClick(+el.dataset.c);
});

window.addEventListener("keydown", (e) => {
  if (G.state !== "play" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === "ArrowLeft") {
    e.preventDefault();
    moveSel(-1);
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    moveSel(1);
  } else if (
    e.code === "Space" ||
    e.code === "Enter" ||
    e.code === "ArrowDown"
  ) {
    if (
      document.activeElement &&
      document.activeElement.classList.contains("col") &&
      e.code !== "ArrowDown"
    )
      return; // a focused column handles its own click
    e.preventDefault();
    columnClick(G.sel);
  } else if (/^Digit[1-7]$/.test(e.code)) {
    columnClick(+e.code.slice(5) - 1);
  }
});

$("shareBtn").onclick = async () => {
  const text = `I scored ${G.score} in Four in a Row (${NAMES[G.diff]})! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Four in a Row",
        text,
        url: location.href,
      });
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    toast("Copied! Paste it to your friends");
  } catch (e) {}
};

updateAll();
refreshStats();
initAds();
