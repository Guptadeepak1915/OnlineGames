export async function shareScore(text) {
  const gameUrl = window.location.href;
  if (navigator.share) {
    await navigator.share({
      title: "My Puzzle Score",
      text,
      url: gameUrl,
    });
    return "shared";
  }
  await navigator.clipboard.writeText(`${text}\n🔗 Play: ${gameUrl}`);
  return "copied";
}
