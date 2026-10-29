/* =====================================================
   Slide Numbers - game.js
   1 Settings      2 Helpers        3 Saved data     4 Seeded random
   5 Puzzle rules  6 Hint solver    7 Sound          8 Game state
   9 Drawing      10 Moves, undo, hint, pause        11 Timer and HUD
  12 Winning      13 Daily challenge                 14 Modals, toast
  15 Leaderboard  16 Confetti       17 Input         18 Start screen
   ===================================================== */
(() => {
  "use strict";

  /* ---------- 1. Settings ---------- */
  const PREFIX = "slidenumbers:v1:";
  const LEVELS = {
    3: { label: "Easy", tiles: 8 },
    4: { label: "Medium", tiles: 15 },
    5: { label: "Hard", tiles: 24 },
  };
  const PALETTES = [
    // tile colours: hue goes from "start" over "span" degrees
    { name: "Candy", start: 330, span: 300 },
    { name: "Ocean", start: 165, span: 95 },
    { name: "Sunset", start: 350, span: 80 },
    { name: "Forest", start: 75, span: 100 },
    { name: "Galaxy", start: 245, span: 110 },
    { name: "Citrus", start: 20, span: 70 },
  ];
  const SOLVER = {
    // hint solver limits for each board size
    3: { weight: 1.2, maxNodes: 150000, maxMs: 350 },
    4: { weight: 3, maxNodes: 150000, maxMs: 350 },
    5: { weight: 5, maxNodes: 150000, maxMs: 350 },
  };
  const MAX_SCORES = 300;

  /* ---------- 2. Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000),
      h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }
  const dateKey = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const fmtDateKey = (key) =>
    new Date(key + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const reducedMotion = () =>
    !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

  /* ---------- 3. Saved data (localStorage) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(val));
      } catch (e) {}
    },
    remove(key) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (e) {}
    },
  };
  const prefs = Object.assign(
    { theme: null, sound: true, size: 4, name: "Player", tipShown: false },
    store.get("prefs", {}),
  );
  if (!LEVELS[prefs.size]) prefs.size = 4;
  prefs.name = String(prefs.name || "Player").slice(0, 14) || "Player";
  const best = store.get("best", {}); // {size: {time, moves}}
  const stats = Object.assign(
    { streak: 0, bestStreak: 0, solved: 0 },
    store.get("stats", {}),
  );
  let scores = store.get("scores", []);
  if (!Array.isArray(scores)) scores = [];
  const daily = store.get("daily", {}); // {'2026-10-29': {size, time, moves}}
  const savePrefs = () => store.set("prefs", prefs);
  const saveStats = () => store.set("stats", stats);

  /* ---------- 4. Seeded random (same daily puzzle for everyone) ---------- */
  function hashString(str) {
    // xmur3
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 5. Puzzle rules ---------- */
  // A board is a flat list. 0 is the empty space. Solved = 1, 2, 3 ... N-1, 0
  const solvedBoard = (n) => {
    const a = Array.from({ length: n * n - 1 }, (_, i) => i + 1);
    a.push(0);
    return a;
  };

  function isSolved(b) {
    const last = b.length - 1;
    for (let i = 0; i < last; i++) if (b[i] !== i + 1) return false;
    return b[last] === 0;
  }
  function inversions(b) {
    let inv = 0;
    for (let i = 0; i < b.length; i++) {
      if (!b[i]) continue;
      for (let j = i + 1; j < b.length; j++) if (b[j] && b[i] > b[j]) inv++;
    }
    return inv;
  }
  // Half of all shuffles can never be solved. This is the standard rule that tells them apart.
  function isSolvable(b, n) {
    const inv = inversions(b);
    if (n % 2 === 1) return inv % 2 === 0;
    const rowFromBottom = n - Math.floor(b.indexOf(0) / n);
    return rowFromBottom % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
  }
  function manhattan(b, n) {
    let sum = 0;
    for (let i = 0; i < b.length; i++) {
      const v = b[i];
      if (!v) continue;
      sum +=
        Math.abs(Math.floor(i / n) - Math.floor((v - 1) / n)) +
        Math.abs((i % n) - ((v - 1) % n));
    }
    return sum;
  }
  // Always returns a solvable board that is not (nearly) solved already.
  function makeBoard(n, rng = Math.random) {
    const minScatter = Math.max(6, Math.round(n * n * 0.6));
    let b;
    do {
      b = solvedBoard(n);
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      if (!isSolvable(b, n)) {
        // swapping two tiles flips the answer
        const idx = [];
        for (let k = 0; k < b.length && idx.length < 2; k++)
          if (b[k] !== 0) idx.push(k);
        [b[idx[0]], b[idx[1]]] = [b[idx[1]], b[idx[0]]];
      }
    } while (isSolved(b) || manhattan(b, n) < minScatter);
    return b;
  }

  /* ---------- 6. Hint solver (weighted A*, Manhattan distance + linear conflict) ---------- */
  const solvers = {};
  function getSolver(n) {
    return solvers[n] || (solvers[n] = createSolver(n));
  }

  function createSolver(n) {
    const N = n * n,
      gr = new Int8Array(N + 1),
      gc = new Int8Array(N + 1);
    for (let v = 1; v < N; v++) {
      gr[v] = Math.floor((v - 1) / n);
      gc[v] = (v - 1) % n;
    }
    const keyOf = (s) => String.fromCharCode.apply(null, s);

    function heuristic(s) {
      let h = 0;
      for (let i = 0; i < N; i++) {
        const v = s[i];
        if (v)
          h += Math.abs(Math.floor(i / n) - gr[v]) + Math.abs((i % n) - gc[v]);
      }
      for (let r = 0; r < n; r++) {
        // two tiles in their own row but in the wrong order cost 2 extra moves
        const line = [];
        for (let c = 0; c < n; c++) {
          const v = s[r * n + c];
          if (v && gr[v] === r) line.push(gc[v]);
        }
        h += 2 * conflictRemovals(line);
      }
      for (let c = 0; c < n; c++) {
        const line = [];
        for (let r = 0; r < n; r++) {
          const v = s[r * n + c];
          if (v && gc[v] === c) line.push(gr[v]);
        }
        h += 2 * conflictRemovals(line);
      }
      return h;
    }
    function conflictRemovals(goals) {
      const m = goals.length;
      if (m < 2) return 0;
      const cnt = new Array(m).fill(0);
      for (let i = 0; i < m; i++)
        for (let j = i + 1; j < m; j++)
          if (goals[i] > goals[j]) {
            cnt[i]++;
            cnt[j]++;
          }
      let removed = 0;
      for (;;) {
        let mx = 0,
          at = -1;
        for (let i = 0; i < m; i++)
          if (cnt[i] > mx) {
            mx = cnt[i];
            at = i;
          }
        if (at < 0) return removed;
        removed++;
        for (let j = 0; j < m; j++) {
          if (j === at) continue;
          if (
            (at < j && goals[at] > goals[j]) ||
            (j < at && goals[j] > goals[at])
          ) {
            if (cnt[j] > 0) cnt[j]--;
          }
        }
        cnt[at] = 0;
      }
    }

    class Heap {
      constructor() {
        this.a = [];
      }
      get size() {
        return this.a.length;
      }
      less(x, y) {
        return x.f < y.f || (x.f === y.f && x.h < y.h);
      }
      push(x) {
        const a = this.a;
        a.push(x);
        let i = a.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (!this.less(a[i], a[p])) break;
          [a[i], a[p]] = [a[p], a[i]];
          i = p;
        }
      }
      pop() {
        const a = this.a,
          top = a[0],
          last = a.pop();
        if (a.length) {
          a[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1,
              r = l + 1;
            let m = i;
            if (l < a.length && this.less(a[l], a[m])) m = l;
            if (r < a.length && this.less(a[r], a[m])) m = r;
            if (m === i) break;
            [a[i], a[m]] = [a[m], a[i]];
            i = m;
          }
        }
        return top;
      }
    }

    // Returns {path: [tile numbers to slide, in order], solved, nodes}. If the limits are hit, path leads to the best position found.
    function solve(start, opts) {
      const weight = opts.weight,
        maxNodes = opts.maxNodes,
        maxMs = opts.maxMs,
        t0 = Date.now();
      const h0 = heuristic(start);
      const root = {
        s: start.slice(),
        g: 0,
        h: h0,
        f: h0 * weight,
        parent: null,
        move: 0,
        blank: start.indexOf(0),
      };
      const open = new Heap();
      open.push(root);
      const seen = new Map();
      seen.set(keyOf(root.s), 0);
      let bestNode = root,
        nodes = 0;
      while (open.size) {
        const cur = open.pop();
        if (cur.h === 0) return { path: trace(cur), solved: true, nodes };
        if (cur.h < bestNode.h || (cur.h === bestNode.h && cur.g < bestNode.g))
          bestNode = cur;
        if (
          ++nodes > maxNodes ||
          ((nodes & 255) === 0 && Date.now() - t0 > maxMs)
        )
          break;
        const b = cur.blank,
          br = Math.floor(b / n),
          bc = b % n;
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
            tile = cur.s[ti];
          if (tile === cur.move) continue; // never undo the move just made
          const s = cur.s.slice();
          s[b] = tile;
          s[ti] = 0;
          const g = cur.g + 1,
            k = keyOf(s),
            old = seen.get(k);
          if (old !== undefined && old <= g) continue;
          seen.set(k, g);
          const h = heuristic(s);
          open.push({
            s,
            g,
            h,
            f: g + h * weight,
            parent: cur,
            move: tile,
            blank: ti,
          });
        }
      }
      return { path: trace(bestNode), solved: false, nodes };
    }
    function trace(node) {
      const p = [];
      for (let x = node; x && x.parent; x = x.parent) p.push(x.move);
      return p.reverse();
    }
    return { solve, heuristic };
  }

  /* ---------- 7. Sound (small beeps made by the browser, no files) ---------- */
  let audioCtx = null;
  function tone(freq, dur, type = "sine", vol = 0.09, slide = 0, delay = 0) {
    if (!prefs.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t = audioCtx.currentTime + delay,
        o = audioCtx.createOscillator(),
        g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  const sfx = {
    move() {
      tone(420 + Math.random() * 70, 0.08, "triangle", 0.1);
    },
    click() {
      tone(560, 0.05, "square", 0.035);
    },
    undo() {
      tone(340, 0.1, "triangle", 0.08, -90);
    },
    hint() {
      tone(620, 0.14, "sine", 0.08, 220);
    },
    error() {
      tone(170, 0.12, "sawtooth", 0.045);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone(f, 0.24, "sine", 0.1, 0, i * 0.11),
      );
    },
  };

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

  /* ---------- 16. Confetti ---------- */
  const confetti = (() => {
    const canvas = $("confetti"),
      ctx = canvas.getContext ? canvas.getContext("2d") : null;
    const COLORS = [
      "#ff5d8f",
      "#ffd43b",
      "#12b886",
      "#4dabf7",
      "#8f6cff",
      "#ff922b",
    ];
    let parts = [],
      raf = 0,
      t0 = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function start() {
      if (!ctx) return;
      cancelAnimationFrame(raf);
      resize();
      const count = reducedMotion() ? 40 : innerWidth < 600 ? 120 : 200;
      parts = [];
      for (let i = 0; i < count; i++) {
        const kind = i % 3,
          w = innerWidth,
          h = innerHeight;
        const p = {
          w: 6 + Math.random() * 8,
          h: 8 + Math.random() * 10,
          rot: Math.random() * 6.28,
          vr: (Math.random() - 0.5) * 0.35,
          c: COLORS[i % COLORS.length],
        };
        if (kind === 0) {
          p.x = 0;
          p.y = h * 0.75;
          p.vx = 5 + Math.random() * 7;
          p.vy = -(9 + Math.random() * 9);
        } // cannon on the left
        else if (kind === 1) {
          p.x = w;
          p.y = h * 0.75;
          p.vx = -(5 + Math.random() * 7);
          p.vy = -(9 + Math.random() * 9);
        } // cannon on the right
        else {
          p.x = Math.random() * w;
          p.y = -20 - Math.random() * h * 0.4;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = 2 + Math.random() * 3;
        } // rain from the top
        parts.push(p);
      }
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.16;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < innerHeight + 30) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (alive && now - t0 < 7000) raf = requestAnimationFrame(tick);
      else stop();
    }
    function stop() {
      cancelAnimationFrame(raf);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = [];
    }
    return { start, stop };
  })();

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
        if (navigator.share) {
          await navigator.share({
            title: "My Puzzle Score",
            text: scoreText,
          });
        } else {
          await navigator.clipboard.writeText(scoreText);
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
