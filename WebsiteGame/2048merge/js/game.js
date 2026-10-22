/* =====================================================
   2048 Merge - game.js
   Works with the page made by:  node tools/new-game.js "2048 Merge" ...
   It builds the board inside <div id="stage"> by itself.
   Styles are in css/game.css (already linked by index.html).

   Controls: swipe on the board, or Arrow keys / WASD.
   Best score is saved with the key "2048merge_best"
   (same key as bestKey in games-data.js).
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Settings ---------- */
  const SIZE = 4; // 4x4 board
  const GAP = 10; // space between tiles (px)
  const START_UNDOS = 3; // undo moves per game
  const SLIDE_MS = 110; // slide animation time

  const BEST_KEY = "2048merge_best";
  const PLAYS_KEY = "2048merge_plays";
  const STATE_KEY = "2048merge_state";

  /* ---------- Safe storage ---------- */
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v === null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    },
    del(k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    },
  };

  /* ---------- Colors for each tile value ---------- */
  const COLORS = {
    2: ["#2a2063", "#f5f2ff"],
    4: ["#3a2d7a", "#f5f2ff"],
    8: ["#ff9f43", "#2a1500"],
    16: ["#ff7a45", "#2a0f00"],
    32: ["#ff5c7a", "#fff"],
    64: ["#e83e6b", "#fff"],
    128: ["#ffd23f", "#3a2b00"],
    256: ["#f5c518", "#3a2b00"],
    512: ["#a0ff6b", "#0f2a05"],
    1024: ["#3df2e0", "#07332f"],
    2048: ["linear-gradient(135deg,#ffd23f,#ff5c7a)", "#fff"],
  };
  const colorOf = (v) => COLORS[v] || ["#b9b0f0", "#120d2b"];

  /* ---------- State ---------- */
  let tiles = []; // {id, v, r, c, el}
  let nextId = 1,
    ts = 80; // ts = tile size in px
  let score = 0,
    best = +store.get(BEST_KEY, 0),
    plays = +store.get(PLAYS_KEY, 0);
  let undosLeft = START_UNDOS,
    prev = null;
  let won = false,
    over = false,
    busy = false,
    moves = 0,
    bestAtStart = best;
  let boardEl, cellsEl, overEl, scoreEl, bestEl, topEl, undoBtn;
  const stage = document.getElementById("stage");
  const hdrBest = document.getElementById("hdrBest");

  /* =====================================================
     BUILD THE PAGE (board + buttons)
     ===================================================== */
  function buildUI() {
    stage.innerHTML = `
      <div class="g2-wrap">
        <div class="g2-top">
          <div class="g2-box"><small>Score</small><b id="g2Score">0</b></div>
          <div class="g2-box"><small>Best</small><b id="g2Best">0</b></div>
          <div class="g2-box"><small>Top tile</small><b id="g2Top">2</b></div>
        </div>
        <div class="g2-bar">
          <button class="btn alt" id="g2New" type="button">New game</button>
          <button class="btn alt" id="g2Undo" type="button">Undo (3)</button>
        </div>
        <div class="g2-board" id="g2Board" aria-label="2048 board"></div>
        <p class="g2-hint">Swipe or use arrow keys / WASD. Merge equal tiles to reach 2048.</p>
      </div>
      <div class="overlay hidden" id="g2Over">
        <div class="card">
          <h2 id="g2OTitle">Game over</h2>
          <div class="big-score" id="g2OScore">0</div>
          <div class="badge hidden" id="g2OBadge">New best!</div>
          <p id="g2OMsg"></p>
          <div class="stats">
            <div class="stat"><small>Best</small><strong id="g2OBest">0</strong></div>
            <div class="stat"><small>Top tile</small><strong id="g2OTop">2</strong></div>
          </div>
          <button class="btn" id="g2Again" type="button">Play again</button>
          <button class="btn alt" id="g2Keep" type="button">Keep going</button>
          <button class="btn alt" id="g2Share" type="button">Share my score</button>
        </div>
      </div>`;
    boardEl = document.getElementById("g2Board");
    boardEl.style.setProperty("--slide", SLIDE_MS + "ms"); // CSS reads this for the slide animation
    overEl = document.getElementById("g2Over");
    scoreEl = document.getElementById("g2Score");
    bestEl = document.getElementById("g2Best");
    topEl = document.getElementById("g2Top");
    undoBtn = document.getElementById("g2Undo");

    // background cells
    cellsEl = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement("div");
      c.className = "g2-cell";
      boardEl.appendChild(c);
      cellsEl.push(c);
    }
  }

  /* =====================================================
     LAYOUT AND DRAWING
     ===================================================== */
  const px = (n) => GAP + n * (ts + GAP);

  function layout() {
    const w = boardEl.clientWidth;
    ts = w > 0 ? (w - GAP * (SIZE + 1)) / SIZE : 80;
    boardEl.style.setProperty("--ts", ts + "px");
    cellsEl.forEach((c, i) => {
      c.style.transform = `translate(${px(i % SIZE)}px, ${px(Math.floor(i / SIZE))}px)`;
    });
    tiles.forEach(place);
  }

  function place(t) {
    t.el.style.transform = `translate(${px(t.c)}px, ${px(t.r)}px)`;
  }

  function paint(t) {
    const [bg, fg] = colorOf(t.v);
    t.el.textContent = t.v;
    t.el.style.background = bg;
    t.el.style.color = fg;
    t.el.className =
      t.el.className.replace(/\bd\d\b/g, "").trim() + " d" + String(t.v).length;
  }

  function makeTile(v, r, c, cls) {
    const el = document.createElement("div");
    el.className = "g2-tile" + (cls ? " " + cls : "");
    const t = { id: nextId++, v, r, c, el };
    paint(t);
    place(t);
    boardEl.appendChild(el);
    tiles.push(t);
    return t;
  }

  function clearTiles() {
    tiles.forEach((t) => t.el.remove());
    tiles = [];
  }

  function topTile() {
    return tiles.reduce((m, t) => Math.max(m, t.v), 0);
  }

  function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    hdrBest && (hdrBest.textContent = best);
    topEl.textContent = topTile() || 2;
    undoBtn.textContent = `Undo (${undosLeft})`;
    undoBtn.disabled = !prev || undosLeft <= 0 || busy;
  }

  /* =====================================================
     GAME LOGIC
     ===================================================== */
  function gridOf() {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    tiles.forEach((t) => {
      g[t.r][t.c] = t;
    });
    return g;
  }

  function spawn() {
    const g = gridOf(),
      free = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (!g[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    makeTile(Math.random() < 0.9 ? 2 : 4, r, c, "new");
  }

  function canMove() {
    const g = gridOf();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (!g[r][c]) return true;
        if (c + 1 < SIZE && g[r][c + 1] && g[r][c + 1].v === g[r][c].v)
          return true;
        if (r + 1 < SIZE && g[r + 1][c] && g[r + 1][c].v === g[r][c].v)
          return true;
      }
    return false;
  }

  const snap = () => ({
    tiles: tiles.map((t) => ({ v: t.v, r: t.r, c: t.c })),
    score,
  });

  /* dir: 0 up, 1 right, 2 down, 3 left */
  function move(dir) {
    if (busy || over) return;
    const before = snap();
    const g = gridOf();
    let moved = false,
      gain = 0;

    for (let i = 0; i < SIZE; i++) {
      // cells of this line, starting from the wall the tiles move towards
      const idx = [];
      for (let k = 0; k < SIZE; k++) {
        idx.push(
          dir === 3
            ? [i, k]
            : dir === 1
              ? [i, SIZE - 1 - k]
              : dir === 0
                ? [k, i]
                : [SIZE - 1 - k, i],
        );
      }
      const line = idx.map(([r, c]) => g[r][c]).filter(Boolean);
      const out = [];
      for (const t of line) {
        const last = out[out.length - 1];
        if (last && !last.locked && last.v === t.v) {
          t.into = last;
          last.v *= 2;
          last.locked = true;
          gain += last.v;
        } else out.push(t);
      }
      for (const t of line) {
        const pos = idx[out.indexOf(t.into || t)];
        if (t.r !== pos[0] || t.c !== pos[1]) moved = true;
        t.r = pos[0];
        t.c = pos[1];
      }
    }
    if (!moved) return; // nothing changed: no new tile

    busy = true;
    prev = before;
    moves++;
    score += gain;
    tiles.forEach(place); // slide animation

    setTimeout(() => {
      tiles
        .filter((t) => t.into)
        .forEach((t) => {
          // merged tile disappears into its partner
          t.el.remove();
          t.into.el.classList.remove("merge");
          void t.into.el.offsetWidth;
          paint(t.into);
          t.into.el.classList.add("merge");
        });
      tiles = tiles.filter((t) => !t.into);
      tiles.forEach((t) => {
        t.locked = false;
      });
      spawn();
      busy = false;
      if (score > best) {
        best = score;
        store.set(BEST_KEY, best);
      }
      updateHUD();
      saveState();
      afterMove();
    }, SLIDE_MS);
  }

  function afterMove() {
    if (!won && topTile() >= 2048) {
      won = true;
      showOverlay("win");
      return;
    }
    if (!canMove()) gameOver();
  }

  /* ---------- Undo ---------- */
  function undo() {
    if (!prev || undosLeft <= 0 || busy || over) return;
    restore(prev);
    undosLeft--;
    prev = null;
    updateHUD();
    saveState();
  }

  function restore(sn) {
    clearTiles();
    sn.tiles.forEach((t) => makeTile(t.v, t.r, t.c));
    score = sn.score;
  }

  /* ---------- New game / game over ---------- */
  function finishRun() {
    if (moves > 0) {
      plays++;
      store.set(PLAYS_KEY, plays);
    }
    moves = 0;
  }

  function newGame() {
    if (!over) finishRun();
    clearTiles();
    score = 0;
    undosLeft = START_UNDOS;
    prev = null;
    won = false;
    over = false;
    busy = false;
    moves = 0;
    bestAtStart = best;
    hideOverlay();
    spawn();
    spawn();
    updateHUD();
    saveState();
  }

  function gameOver() {
    over = true;
    finishRun();
    store.del(STATE_KEY);
    showOverlay("over");
  }

  /* ---------- Overlay ---------- */
  function showOverlay(mode) {
    const isWin = mode === "win";
    const newBest = score > bestAtStart && score > 0;
    document.getElementById("g2OTitle").textContent = isWin
      ? "You made 2048!"
      : "Game over";
    document.getElementById("g2OScore").textContent = score;
    document.getElementById("g2OBest").textContent = best;
    document.getElementById("g2OTop").textContent = topTile();
    document.getElementById("g2OBadge").classList.toggle("hidden", !newBest);
    document.getElementById("g2OMsg").textContent = isWin
      ? "Great job! Keep going to reach a bigger tile, or start a new game."
      : newBest
        ? "That is your highest score ever!"
        : best - score <= 200
          ? `So close! Only ${best - score} points from your best.`
          : "Keep your biggest tile in a corner and build next to it.";
    document.getElementById("g2Keep").classList.toggle("hidden", !isWin);
    document.getElementById("g2Again").textContent = isWin
      ? "New game"
      : "Play again";
    overEl.classList.remove("hidden");
  }
  function hideOverlay() {
    overEl.classList.add("hidden");
  }

  /* ---------- Save and load a running game ---------- */
  function saveState() {
    store.set(STATE_KEY, {
      tiles: tiles.map((t) => ({ v: t.v, r: t.r, c: t.c })),
      score,
      undosLeft,
      won,
      bestAtStart,
      moves,
    });
  }

  function loadState() {
    const s = store.get(STATE_KEY, null);
    if (!s || !Array.isArray(s.tiles) || !s.tiles.length) return false;
    const seen = new Set();
    for (const t of s.tiles) {
      const ok =
        Number.isInteger(t.r) &&
        Number.isInteger(t.c) &&
        t.r >= 0 &&
        t.c >= 0 &&
        t.r < SIZE &&
        t.c < SIZE &&
        Number.isInteger(t.v) &&
        t.v >= 2 &&
        (t.v & (t.v - 1)) === 0;
      if (!ok || seen.has(t.r + "," + t.c)) return false;
      seen.add(t.r + "," + t.c);
    }
    s.tiles.forEach((t) => makeTile(t.v, t.r, t.c));
    score = +s.score || 0;
    undosLeft = Number.isInteger(s.undosLeft) ? s.undosLeft : START_UNDOS;
    won = !!s.won;
    bestAtStart = +s.bestAtStart || best;
    moves = +s.moves || 0;
    return true;
  }

  /* =====================================================
     INPUT: keyboard, swipe, buttons
     ===================================================== */
  const KEYS = {
    ArrowUp: 0,
    KeyW: 0,
    ArrowRight: 1,
    KeyD: 1,
    ArrowDown: 2,
    KeyS: 2,
    ArrowLeft: 3,
    KeyA: 3,
  };

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code in KEYS) {
        e.preventDefault();
        if (!overEl.classList.contains("hidden")) return;
        move(KEYS[e.code]);
      }
    });

    let sx = 0,
      sy = 0,
      tracking = false;
    boardEl.addEventListener("pointerdown", (e) => {
      sx = e.clientX;
      sy = e.clientY;
      tracking = true;
    });
    window.addEventListener("pointerup", (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx,
        dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
    });
    window.addEventListener("pointercancel", () => {
      tracking = false;
    });

    document.getElementById("g2New").onclick = newGame;
    document.getElementById("g2Undo").onclick = undo;
    document.getElementById("g2Again").onclick = newGame;
    document.getElementById("g2Keep").onclick = hideOverlay;
    document.getElementById("g2Share").onclick = async () => {
      const text = `I scored ${score} in 2048 Merge! Can you beat me?`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: "2048 Merge",
            text,
            url: location.href,
          });
          return;
        }
        await navigator.clipboard.writeText(text + " " + location.href);
        document.getElementById("g2OMsg").textContent =
          "Copied! Paste it to your friends.";
      } catch (err) {}
    };
    window.addEventListener("resize", layout);
  }

  /* =====================================================
     START
     ===================================================== */
  buildUI();
  layout();
  bindInput();
  if (loadState()) {
    updateHUD();
    if (!canMove()) gameOver();
  } else newGame();
})();
