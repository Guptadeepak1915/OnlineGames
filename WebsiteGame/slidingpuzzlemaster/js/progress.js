"use strict";

// Win records and daily challenge.
/* ---------- 12. Winning ---------- */
function onWin() {
  game.won = true;
  stopTimer();
  clearHint();
  const time = Math.max(1, Math.round(elapsedMs())),
    moves = game.history.length,
    badges = [];

  stats.solved++;
  stats.streak++;
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  saveStats();

  if (game.mode === "free") {
    // best time and fewest moves are saved for every size
    const b = best[game.n] || (best[game.n] = { time: null, moves: null });
    if (b.time == null) badges.push({ t: "First record set!", c: "blue" });
    else {
      if (time < b.time) badges.push({ t: "New best time!" });
      if (moves < b.moves)
        badges.push({ t: "New fewest moves!", c: "green" });
    }
    if (b.time == null || time < b.time) b.time = time;
    if (b.moves == null || moves < b.moves) b.moves = moves;
    store.set("best", best);
  } else {
    const old = daily[game.dailyKey];
    if (!old) badges.push({ t: "Daily challenge complete!", c: "green" });
    else if (time < old.time) badges.push({ t: "New daily best!" });
    if (!old || time < old.time)
      daily[game.dailyKey] = { size: game.n, time, moves };
    store.set("daily", daily);
    const ds = dailyStreak();
    if (ds > 1) badges.push({ t: `${ds}-day daily streak!`, c: "blue" });
  }
  if (stats.streak > 1)
    badges.push({
      t: `${stats.streak} wins in a row`,
      c: stats.streak === stats.bestStreak ? "" : "blue",
    });
  if (game.hints) badges.push({ t: `Hints used: ${game.hints}`, c: "blue" });

  game.lastId = Date.now();
  scores.push({
    id: game.lastId,
    name: prefs.name,
    size: game.n,
    time,
    moves,
    hints: game.hints,
    undos: game.undos,
    date: game.lastId,
    daily: game.mode === "daily",
    key: game.dailyKey,
  });
  if (scores.length > MAX_SCORES) scores = scores.slice(-MAX_SCORES);
  store.set("scores", scores);

  $("board").classList.add("won");
  sfx.win();
  confetti.start();
  updateHud();
  updateTiles();
  announce(`Solved in ${fmtTime(time)} with ${moves} moves!`);
  setTimeout(
    () => showWin(time, moves, badges),
    reducedMotion() ? 200 : 1100,
  );
}
function showWin(time, moves, badges) {
  $("winTitle").textContent =
    game.mode === "daily" ? "Daily challenge solved!" : "You solved it!";
  $("winStats").innerHTML =
    `<div><b>${fmtTime(time)}</b><span>Time</span></div><div><b>${moves}</b><span>Moves</span></div><div><b>${stats.streak}</b><span>Streak</span></div>`;
  $("winBadges").innerHTML = badges
    .map((b) => `<span class="badge ${b.c || ""}">${esc(b.t)}</span>`)
    .join("");
  openModal("winModal");
  $("btnPlayAgain").focus();
}

/* ---------- 13. Daily challenge ---------- */
const todayKey = () => dateKey(new Date());
function dailyConfig(key) {
  const rng = mulberry32(hashString("slide-numbers-" + key));
  const size = [3, 4, 4, 5][Math.floor(rng() * 4)];
  const palette = PALETTES[1 + Math.floor(rng() * (PALETTES.length - 1))]; // daily puzzles get their own colours
  const board = makeBoard(size, rng);
  const number =
    Math.floor(
      (Date.parse(key + "T00:00:00Z") - Date.UTC(2025, 0, 1)) / 864e5,
    ) + 1;
  return { key, size, palette, board, number };
}
function dailyStreak() {
  const d = new Date();
  if (!daily[dateKey(d)]) d.setDate(d.getDate() - 1); // today not finished yet: count up to yesterday
  let count = 0;
  while (daily[dateKey(d)]) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
function startDaily() {
  const cfg = dailyConfig(todayKey());
  startGame({
    mode: "daily",
    n: cfg.size,
    board: cfg.board,
    palette: cfg.palette,
    dailyKey: cfg.key,
    dailyNumber: cfg.number,
  });
}
