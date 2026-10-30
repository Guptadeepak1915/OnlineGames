"use strict";

// Moves, controls, timer, and HUD.
/* ---------- 10. Starting, moving, undo, hint, pause ---------- */
function startGame(opts) {
  stopTimer();
  clearHint();
  Object.assign(game, {
    mode: opts.mode,
    n: opts.n,
    board: opts.board.slice(),
    start: opts.board.slice(),
    history: [],
    hints: 0,
    undos: 0,
    elapsed: 0,
    running: false,
    paused: false,
    won: false,
    palette: opts.palette || PALETTES[0],
    dailyKey: opts.dailyKey || null,
    dailyNumber: opts.dailyNumber || 0,
    hintCache: null,
  });
  game.blank = game.board.indexOf(0);
  $("pauseOverlay").hidden = true;
  $("board").removeAttribute("inert");
  $("hintText").textContent = "";
  buildBoard();
  showScreen("game");
  $("gameTitle").textContent =
    game.mode === "daily"
      ? `Daily #${game.dailyNumber} · ${game.n}×${game.n}`
      : `${game.n}×${game.n} ${LEVELS[game.n].label}`;
  updateTiles();
  updateHud();
  announce(`New ${game.n} by ${game.n} puzzle. Slide the tiles into order.`);
  if (!prefs.tipShown) {
    prefs.tipShown = true;
    savePrefs();
    toast("Tap a tile next to the empty space to slide it");
  }
}
const newFreeGame = (n) =>
  startGame({ mode: "free", n, board: makeBoard(n), palette: PALETTES[0] });
const replaySame = () =>
  startGame({
    mode: game.mode,
    n: game.n,
    board: game.start,
    palette: game.palette,
    dailyKey: game.dailyKey,
    dailyNumber: game.dailyNumber,
  });

const canPlay = () =>
  game.screen === "game" && !game.won && !game.paused && !modalOpen();

function slideAt(idx) {
  // one tile next to the empty space
  const v = game.board[idx],
    from = idx,
    to = game.blank;
  game.board[to] = v;
  game.board[from] = 0;
  game.blank = from;
  game.history.push({ v, from, to });
  place(v, to);
}

function trySlide(idx) {
  if (!canPlay() || idx === game.blank || idx < 0) return false;
  const n = game.n,
    b = game.blank,
    r = Math.floor(idx / n),
    c = idx % n,
    br = Math.floor(b / n),
    bc = b % n;
  if (r !== br && c !== bc) {
    rejectMove(game.board[idx]);
    return false;
  }
  const step = r === br ? (idx < b ? 1 : -1) : idx < b ? n : -n; // direction from the tile towards the empty space
  startTimer();
  const moved = [];
  for (let k = b - step; ; k -= step) {
    moved.push(game.board[k]);
    slideAt(k);
    if (k === idx) break;
  }
  afterMove(moved);
  return true;
}

function rejectMove(v) {
  const t = game.tiles.get(v);
  if (!t) return;
  t.classList.remove("nudge");
  void t.offsetWidth;
  t.classList.add("nudge");
  setTimeout(() => t.classList.remove("nudge"), 320);
  sfx.error();
}

// arrow keys and swipes: the tile slides in the direction you press
const DIR_OFFSET = {
  left: [0, 1],
  right: [0, -1],
  up: [1, 0],
  down: [-1, 0],
}; // where the moving tile is, compared with the empty space
function moveByDir(dir) {
  if (!canPlay()) return false;
  const n = game.n,
    [dr, dc] = DIR_OFFSET[dir],
    r = Math.floor(game.blank / n) + dr,
    c = (game.blank % n) + dc;
  if (r < 0 || c < 0 || r >= n || c >= n) {
    sfx.error();
    return false;
  }
  return trySlide(r * n + c);
}

function afterMove(moved) {
  sfx.move();
  clearHint();
  if (game.hintCache) {
    // keep the hint path in step with the player
    const p = game.hintCache.path;
    if (moved.length === 1 && p[0] === moved[0]) {
      p.shift();
      game.hintCache.key = game.board.join(",");
    } else game.hintCache = null;
  }
  updateTiles();
  updateHud(true);
  announce(`${game.history.length} moves`);
  if (isSolved(game.board)) onWin();
}

function undo() {
  if (!canPlay() || !game.history.length) {
    return;
  }
  const m = game.history.pop();
  game.board[m.from] = m.v;
  game.board[m.to] = 0;
  game.blank = m.to;
  place(m.v, m.from);
  game.undos++;
  game.hintCache = null;
  clearHint();
  sfx.undo();
  updateTiles();
  updateHud(true);
  announce("Move undone");
}

function computeHintPath() {
  const solver = getSolver(game.n),
    res = solver.solve(game.board, SOLVER[game.n]);
  if (res.path.length) return res.path;
  // fallback: the single slide that gives the lowest "distance from solved"
  const n = game.n,
    b = game.blank,
    br = Math.floor(b / n),
    bc = b % n,
    last = game.history.length ? game.history[game.history.length - 1].v : 0;
  let bestMove = 0,
    bestH = Infinity;
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const r = br + dr,
      c = bc + dc;
    if (r < 0 || c < 0 || r >= n || c >= n) continue;
    const ti = r * n + c,
      s = game.board.slice();
    s[b] = s[ti];
    s[ti] = 0;
    const h = solver.heuristic(s) + (s[b] === last ? 3 : 0);
    if (h < bestH) {
      bestH = h;
      bestMove = game.board[ti];
    }
  }
  return [bestMove];
}

function hint() {
  if (!canPlay()) return;
  const key = game.board.join(",");
  let path;
  if (
    game.hintCache &&
    game.hintCache.key === key &&
    game.hintCache.path.length
  )
    path = game.hintCache.path;
  else {
    path = computeHintPath();
    game.hintCache = { key, path };
  }
  const tile = path[0];
  if (!tile) return;
  game.hints++;
  clearHint();
  const idx = game.board.indexOf(tile),
    b = game.blank,
    n = game.n;
  const way =
    idx === b - 1
      ? "right"
      : idx === b + 1
        ? "left"
        : idx === b - n
          ? "down"
          : "up";
  const el = game.tiles.get(tile);
  el.classList.add("hint");
  $("hintText").textContent = `Hint: slide tile ${tile} ${way}`;
  announce(`Hint: slide tile ${tile} ${way}`);
  game.hintTimer = setTimeout(clearHint, 4500);
  sfx.hint();
  updateHud();
}
function clearHint() {
  clearTimeout(game.hintTimer);
  game.tiles.forEach((t) => t.classList.remove("hint"));
  const ht = $("hintText");
  if (ht) ht.textContent = "";
}

function pause() {
  if (game.screen !== "game" || game.won || game.paused) return;
  game.paused = true;
  stopTimer();
  $("pauseOverlay").hidden = false;
  $("board").setAttribute("inert", "");
  $("btnPause").querySelector("span").textContent = "Resume";
  const r = $("btnResume");
  if (r) r.focus();
  updateHud();
}
function resume() {
  if (!game.paused) return;
  game.paused = false;
  $("pauseOverlay").hidden = true;
  $("board").removeAttribute("inert");
  $("btnPause").querySelector("span").textContent = "Pause";
  if (game.history.length) startTimer(); // the clock only runs after the first move
  updateHud();
}
const togglePause = () => (game.paused ? resume() : pause());

/* leaving a puzzle you already started resets the win streak (after asking) */
const hasProgress = () =>
  game.screen === "game" && !game.won && game.history.length > 0;
function resetStreak() {
  if (stats.streak) {
    stats.streak = 0;
    saveStats();
  }
}
function guardAbandon(action) {
  if (hasProgress() && stats.streak > 0) {
    confirmAsk({
      title: "Leave this puzzle?",
      text: `Your win streak of ${stats.streak} will be reset.`,
      yes: "Leave",
      no: "Keep playing",
    }).then((ok) => {
      if (ok) {
        resetStreak();
        action();
      }
    });
  } else action();
}
function restart() {
  guardAbandon(() =>
    game.mode === "daily" ? replaySame() : newFreeGame(game.n),
  );
}
function goMenu() {
  guardAbandon(() => {
    stopTimer();
    clearHint();
    $("pauseOverlay").hidden = true;
    game.paused = false;
    showScreen("start");
    renderStart();
  });
}

/* ---------- 11. Timer and dashboard ---------- */
const elapsedMs = () =>
  game.elapsed + (game.running ? performance.now() - game.timerStart : 0);
function startTimer() {
  if (game.running || game.won) return;
  game.running = true;
  game.timerStart = performance.now();
  clearInterval(timerId);
  timerId = setInterval(() => {
    $("hudTime").textContent = fmtTime(elapsedMs());
  }, 200);
}
function stopTimer() {
  if (game.running) {
    game.elapsed += performance.now() - game.timerStart;
    game.running = false;
  }
  clearInterval(timerId);
}

function bestText() {
  const rec = game.mode === "daily" ? daily[game.dailyKey] : best[game.n];
  return rec && rec.time != null
    ? `${fmtTime(rec.time)} · ${rec.moves}`
    : "-";
}
function updateHud(bump) {
  const moves = game.history.length,
    N = game.n * game.n;
  const mEl = $("hudMoves");
  mEl.textContent = moves;
  if (bump) {
    mEl.classList.remove("bump");
    void mEl.offsetWidth;
    mEl.classList.add("bump");
  }
  $("hudTime").textContent = fmtTime(elapsedMs());
  $("hudBest").textContent = bestText();
  let correct = 0;
  for (let i = 0; i < N - 1; i++) if (game.board[i] === i + 1) correct++;
  const pct = Math.floor((correct / (N - 1)) * 100);
  $("progressBar").style.width = pct + "%";
  $("progressText").textContent = pct + "%";
  $("progress").setAttribute("aria-valuenow", pct);
  $("hintCount").textContent = game.hints;
  $("hintCount").hidden = game.hints === 0;
  $("btnUndo").disabled = !game.history.length || game.won || game.paused;
  $("btnHint").disabled = game.won;
  $("btnPause").disabled = game.won;
  $("chipStreak").textContent = `🔥 ${stats.streak}`;
}
