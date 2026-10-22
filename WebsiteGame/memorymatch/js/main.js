/* main.js - buttons and start-up */
$("playBtn").onclick = newRun;
$("againBtn").onclick = newRun;

$("board").addEventListener("click", (e) => {
  const el = e.target.closest(".tile");
  if (el) onTile(+el.dataset.i);
});

$("shareBtn").onclick = async () => {
  const text = `I reached level ${S.level} with ${S.score} points in Memory Match! Can you beat me?`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Memory Match",
        text,
        url: location.href,
      });
      return;
    }
    await navigator.clipboard.writeText(text + " " + location.href);
    toast("Copied! Paste it to your friends");
  } catch (e) {}
};

refreshStats();
initAds();
