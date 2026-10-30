import { LEVELS, PALETTES, SOLVER, MAX_SCORES } from "./config.js";
import {
  $,
  esc,
  fmtTime,
  dateKey,
  fmtDate,
  fmtDateKey,
  reducedMotion,
} from "./utils.js";
import { store } from "./storage.js";
import { hashString, mulberry32, makeBoard, isSolved } from "./puzzle.js";
import { getSolver } from "./solver.js";
import { createSound } from "./audio.js";
import { createConfetti } from "./confetti.js";
import { shareScore } from "./share.js";

(() => {
  const prefs = Object.assign(
    { theme: null, sound: true, size: 4, name: "Player", tipShown: false },
    store.get("prefs", {}),
  );
  if (!LEVELS[prefs.size]) prefs.size = 4;
  prefs.name = String(prefs.name || "Player").slice(0, 14) || "Player";
  const best = store.get("best", {});
  const stats = Object.assign(
    { streak: 0, bestStreak: 0, solved: 0 },
    store.get("stats", {}),
  );
  let scores = store.get("scores", []);
  if (!Array.isArray(scores)) scores = [];
  const daily = store.get("daily", {});
  const savePrefs = () => store.set("prefs", prefs);
  const saveStats = () => store.set("stats", stats);
  const sfx = createSound(() => prefs.sound);

  /* ---------- 8. Game state ---------- */
  const game = {
    screen: "start", // start | game
    mode: "free", // free | daily
    n: 4,
    board: [],
    start: [],
    blank: 0,
    history: [],
    hints: 0,
    undos: 0,
    elapsed: 0,
    running: false,
    timerStart: 0,
    paused: false,
    won: false,
    palette: PALETTES[0],
    dailyKey: null,
    dailyNumber: 0,
    hintCache: null,
    hintTimer: 0,
    suppressClick: false,
    lastId: 0,
    tiles: new Map(),
  };
  let timerId = 0;

  /* ---------- 9. Drawing the board ---------- */
  const hueFor = (v) =>
    Math.round(
      game.palette.start +
        ((v - 1) / Math.max(1, game.n * game.n - 2)) * game.palette.span,
    );

  function buildBoard() {
    const board = $("board"),
      n = game.n,
      N = n * n;
    board.innerHTML = "";
    board.style.setProperty("--n", n);
    const cells = document.createElement("div");
    cells.className = "cells";
    for (let i = 0; i < N; i++) {
      const c = document.createElement("div");
      c.className = "cell";
      cells.appendChild(c);
    }
    board.appendChild(cells);
    game.tiles.clear();
    for (let v = 1; v < N; v++) {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tile";
      t.dataset.value = v;
      t.style.setProperty("--i", v - 1);
      t.style.setProperty("--h", hueFor(v));
      const face = document.createElement("span");
      face.className = "face";
      face.textContent = v;
      t.appendChild(face);
      board.appendChild(t);
      game.tiles.set(v, t);
    }
    game.board.forEach((v, idx) => {
      if (v) place(v, idx);
    });
    board.classList.remove("won", "shake");
    board.classList.add("enter");
    setTimeout(() => board.classList.remove("enter"), 900);
  }
  function place(v, idx) {
    const t = game.tiles.get(v),
      n = game.n;
    t.style.setProperty("--r", Math.floor(idx / n));
    t.style.setProperty("--c", idx % n);
  }
  // green dot on tiles that are already home, hover effect on tiles that can slide, screen reader labels
  function updateTiles() {
    const n = game.n,
      b = game.blank,
      br = Math.floor(b / n),
      bc = b % n;
    game.board.forEach((v, idx) => {
      if (!v) return;
      const t = game.tiles.get(v),
        r = Math.floor(idx / n),
        c = idx % n,
        movable = (r === br) !== (c === bc);
      t.classList.toggle("ok", idx === v - 1);
      t.classList.toggle("movable", movable);
      t.setAttribute(
        "aria-label",
        `Tile ${v}, row ${r + 1}, column ${c + 1}${idx === v - 1 ? ", in place" : ""}${movable ? ", can slide" : ""}`,
      );
    });
  }
  function showScreen(name) {
    game.screen = name;
    $("startScreen").hidden = name !== "start";
    $("gameScreen").hidden = name !== "game";
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
  }

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

  /* ---------- 14. Modals, confirm, toast ---------- */
  const modalStack = [];
  let lastFocus = null;
  const modalOpen = () => modalStack.length > 0;
  function openModal(id) {
    const m = $(id);
    if (!m || !m.hidden) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    modalStack.push(id);
    const f = m.querySelector(".btn.primary") || m.querySelector("button");
    if (f) f.focus();
  }
  function closeModal(id) {
    const m = $(id);
    if (!m || m.hidden) return;
    m.hidden = true;
    const i = modalStack.lastIndexOf(id);
    if (i > -1) modalStack.splice(i, 1);
    if (id === "helpModal") {
      prefs.tipShown = true;
      savePrefs();
    }
    if (
      !modalStack.length &&
      lastFocus &&
      lastFocus.focus &&
      document.contains(lastFocus)
    )
      lastFocus.focus();
  }
  function confirmAsk({ title, text, yes, no }) {
    return new Promise((resolve) => {
      $("confirmTitle").textContent = title;
      $("confirmText").textContent = text;
      $("confirmYes").textContent = yes;
      $("confirmNo").textContent = no;
      const done = (v) => {
        closeModal("confirmModal");
        $("confirmYes").onclick = $("confirmNo").onclick = null;
        resolve(v);
      };
      $("confirmYes").onclick = () => done(true);
      $("confirmNo").onclick = () => done(false);
      openModal("confirmModal");
      $("confirmNo").focus();
    });
  }
  function trapFocus(e) {
    const top = $(modalStack[modalStack.length - 1]);
    const items = [
      ...top.querySelectorAll("button:not([disabled]), input, [href]"),
    ].filter(
      (x) =>
        (!x.hidden && x.offsetParent !== null) || x === document.activeElement,
    );
    if (!items.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!top.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  }
  let toastTimer = 0;
  function toast(msg, ms = 2400) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }
  function announce(msg) {
    const l = $("live");
    l.textContent = "";
    setTimeout(() => {
      l.textContent = msg;
    }, 30);
  }

  /* ---------- 15. Leaderboard ---------- */
  let lbTab = "4";
  function renderLeaderboard(tab) {
    lbTab = String(tab);
    document
      .querySelectorAll("#lbTabs .tab")
      .forEach((t) =>
        t.setAttribute("aria-selected", String(t.dataset.tab === lbTab)),
      );
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || i + 1;
    const help = (s) => (s.hints ? `💡${s.hints}` : "-");
    let html = "";
    if (lbTab === "daily") {
      const byDay = {};
      scores
        .filter((s) => s.daily && s.key)
        .forEach((s) => {
          const cur = byDay[s.key];
          if (!cur || s.time < cur.time) byDay[s.key] = s;
        });
      const rows = Object.values(byDay)
        .sort((a, b) => (a.key < b.key ? 1 : -1))
        .slice(0, 10);
      html = rows.length
        ? `<table class="lb-table"><thead><tr><th>Day</th><th>Name</th><th>Size</th><th>Time</th><th>Moves</th><th>Help</th></tr></thead><tbody>${rows
            .map(
              (s) =>
                `<tr class="${s.id === game.lastId ? "me" : ""}"><td>${fmtDateKey(s.key)}</td><td>${esc(s.name)}</td><td>${s.size}×${s.size}</td><td>${fmtTime(s.time)}</td><td>${s.moves}</td><td>${help(s)}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : '<p class="empty">No daily challenges finished yet.<br>Play today\'s Daily Challenge!</p>';
    } else {
      const rows = scores
        .filter((s) => !s.daily && s.size === +lbTab)
        .sort((a, b) => a.time - b.time || a.moves - b.moves)
        .slice(0, 10);
      html = rows.length
        ? `<table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>Time</th><th>Moves</th><th>Date</th><th>Help</th></tr></thead><tbody>${rows
            .map(
              (s, i) =>
                `<tr class="${s.id === game.lastId ? "me" : ""}"><td>${medal(i)}</td><td>${esc(s.name)}</td><td>${fmtTime(s.time)}</td><td>${s.moves}</td><td>${fmtDate(s.date)}</td><td>${help(s)}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : `<p class="empty">No ${lbTab}×${lbTab} scores yet.<br>Solve a puzzle to get on the board!</p>`;
    }
    $("lbBody").innerHTML = html;
  }
  function openLeaderboard() {
    renderLeaderboard(
      game.screen === "game"
        ? game.mode === "daily"
          ? "daily"
          : game.n
        : prefs.size,
    );
    openModal("boardModal");
  }

const confetti = createConfetti($("confetti"));

  /* ---------- 17. Input: mouse, touch, keyboard ---------- */
  function bindInput() {
    const board = $("board");
    board.addEventListener("click", (e) => {
      if (game.suppressClick) {
        game.suppressClick = false;
        return;
      }
      const t = e.target.closest(".tile");
      if (!t) return;
      trySlide(game.board.indexOf(+t.dataset.value));
    });

    let swipe = null; // swipe on the board = arrow key
    board.addEventListener("pointerdown", (e) => {
      swipe = { x: e.clientX, y: e.clientY };
    });
    board.addEventListener("pointerup", (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe.x,
        dy = e.clientY - swipe.y,
        ax = Math.abs(dx),
        ay = Math.abs(dy);
      swipe = null;
      if (Math.max(ax, ay) < 32) return;
      game.suppressClick = true;
      setTimeout(() => {
        game.suppressClick = false;
      }, 60);
      moveByDir(ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    });
    board.addEventListener("pointercancel", () => {
      swipe = null;
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (modalOpen()) {
          const top = modalStack[modalStack.length - 1];
          if (top === "confirmModal") $("confirmNo").click();
          else if (top !== "winModal") closeModal(top);
        } else if (game.screen === "game") togglePause();
        return;
      }
      if (e.key === "Tab" && modalOpen()) {
        trapFocus(e);
        return;
      }
      if (modalOpen() || game.screen !== "game") return;
      const k = e.key.toLowerCase();
      const dirs = {
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
      };
      if (dirs[k]) {
        e.preventDefault();
        moveByDir(dirs[k]);
      } else if (k === "u") undo();
      else if (k === "h") hint();
      else if (k === "p") togglePause();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.screen === "game" && game.running) pause();
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("button");
      if (b && !b.classList.contains("tile")) sfx.click();
    });
  }

  /* ---------- 18. Start screen, theme, sound, buttons ---------- */
  function applyTheme() {
    const dark = prefs.theme
      ? prefs.theme === "dark"
      : !!(
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
        );
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#17123a" : "#6c5ce7";
    $("btnTheme").setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode",
    );
  }
  function applySound() {
    $("btnSound").classList.toggle("is-off", !prefs.sound);
    $("btnSound").setAttribute("aria-pressed", String(prefs.sound));
    $("btnSound").setAttribute(
      "aria-label",
      prefs.sound ? "Sound on, tap to mute" : "Sound off, tap to turn on",
    );
  }
  function renderStart() {
    document.querySelectorAll(".level").forEach((b) => {
      const on = +b.dataset.size === prefs.size;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    [3, 4, 5].forEach((n) => {
      const b = best[n],
        el = document.querySelector(`[data-best="${n}"]`);
      el.textContent =
        b && b.time != null
          ? `Best ${fmtTime(b.time)} · ${b.moves} moves`
          : "No record yet";
    });
    $("statStreak").textContent = stats.streak;
    $("statBestStreak").textContent = stats.bestStreak;
    $("statSolved").textContent = stats.solved;
    $("statDailyStreak").textContent = dailyStreak();
    const key = todayKey(),
      cfg = dailyConfig(key),
      done = daily[key];
    $("dailyInfo").textContent = done
      ? `Done ✓ ${fmtTime(done.time)} · ${done.moves} moves`
      : `#${cfg.number} · ${cfg.size}×${cfg.size} · ${cfg.palette.name}`;
    if (document.activeElement !== $("playerName"))
      $("playerName").value = prefs.name === "Player" ? "" : prefs.name;
  }

  function bindUi() {
    // difficulty radio group (mouse, touch and arrow keys)
    const group = $("levelGroup");
    group.addEventListener("click", (e) => {
      const b = e.target.closest(".level");
      if (!b) return;
      prefs.size = +b.dataset.size;
      savePrefs();
      renderStart();
    });
    group.addEventListener("keydown", (e) => {
      const sizes = [3, 4, 5],
        i = sizes.indexOf(prefs.size);
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        prefs.size = sizes[(i + 1) % 3];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        prefs.size = sizes[(i + 2) % 3];
      else return;
      e.preventDefault();
      savePrefs();
      renderStart();
      document.querySelector(`.level[data-size="${prefs.size}"]`).focus();
    });
    $("playerName").addEventListener("input", (e) => {
      prefs.name =
        e.target.value.replace(/[<>]/g, "").trim().slice(0, 14) || "Player";
      savePrefs();
    });

    $("btnPlay").addEventListener("click", () => newFreeGame(prefs.size));
    $("btnDaily").addEventListener("click", startDaily);
    $("btnBack").addEventListener("click", goMenu);
    $("brand").addEventListener("click", () => {
      if (game.screen === "game") goMenu();
    });
    $("btnHint").addEventListener("click", hint);
    $("btnUndo").addEventListener("click", undo);
    $("btnPause").addEventListener("click", togglePause);
    $("btnResume").addEventListener("click", resume);
    $("btnRestart").addEventListener("click", restart);

    $("btnHelp").addEventListener("click", () => openModal("helpModal"));
    $("btnHelp2").addEventListener("click", () => openModal("helpModal"));
    $("btnBoard").addEventListener("click", openLeaderboard);
    $("lbTabs").addEventListener("click", (e) => {
      const t = e.target.closest(".tab");
      if (t) renderLeaderboard(t.dataset.tab);
    });
    $("btnClearScores").addEventListener("click", () => {
      confirmAsk({
        title: "Clear all scores?",
        text: "This removes every leaderboard entry saved on this device. Your best times stay.",
        yes: "Clear",
        no: "Cancel",
      }).then((ok) => {
        if (ok) {
          scores = [];
          store.set("scores", scores);
          renderLeaderboard(lbTab);
          toast("Leaderboard cleared");
        }
      });
    });

    document.querySelectorAll(".modal").forEach((m) => {
      m.addEventListener("mousedown", (e) => {
        if (e.target !== m) return;
        if (m.id === "confirmModal") $("confirmNo").click();
        else if (m.id !== "winModal") closeModal(m.id);
      });
      m.querySelectorAll("[data-close]").forEach((b) =>
        b.addEventListener("click", () => closeModal(m.id)),
      );
    });

    $("btnPlayAgain").addEventListener("click", () => {
      closeModal("winModal");
      confetti.stop();
      newFreeGame(game.n);
    });
    $("btnReplay").addEventListener("click", () => {
      closeModal("winModal");
      confetti.stop();
      replaySame();
    });
    $("btnShareScore").addEventListener("click", async () => {
      const scoreText = [
        "🪵 Wooden Number Slide Puzzle",
        "🏆 I solved the puzzle!",
        `🎮 Difficulty: ${game.n}×${game.n}`,
        `👣 Moves: ${game.history.length}`,
        `⏱️ Time: ${$("hudTime").textContent}`,
        "",
        "Can you beat my score?",
      ].join("\n");

      try {
        const method = await shareScore(scoreText);
        if (method === "copied") {
          toast("Score copied! Share it with your friends.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          toast("Unable to share score.");
        }
      }
    });
    $("btnWinMenu").addEventListener("click", () => {
      closeModal("winModal");
      confetti.stop();
      showScreen("start");
      renderStart();
    });

    $("btnTheme").addEventListener("click", () => {
      prefs.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      savePrefs();
      applyTheme();
    });
    $("btnSound").addEventListener("click", () => {
      prefs.sound = !prefs.sound;
      savePrefs();
      applySound();
      if (prefs.sound) sfx.click();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && game.screen === "start") renderStart();
    }); // new day = new daily puzzle
  }

  /* ---------- Start ---------- */
  applyTheme();
  applySound();
  bindInput();
  bindUi();
  showScreen("start");
  renderStart();
})();
