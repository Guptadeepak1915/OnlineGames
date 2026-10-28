/* main.js - buttons and start-up */
buildBoard();

document
  .querySelectorAll("[data-diff]")
  .forEach((b) => (b.onclick = () => startCpu(b.dataset.diff)));
$("twoBtn").onclick = startTwo;
$("againBtn").onclick = showMenu; // choose level again
$("nextBtn").onclick = nextRound;
$("endBtn").onclick = endGame;

$("board").addEventListener("click", (e) => {
  const el = e.target.closest(".sq");
  if (el) cellClick(+el.dataset.i);
});

$("shareBtn").onclick = async () => {
  const text = `I scored ${G.score} in Tic Tac Toe (${NAMES[G.diff]})! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Tic Tac Toe", text, url: location.href });
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    toast("Copied! Paste it to your friends");
  } catch (e) {}
};

updateAll();
refreshStats();
initAds();
