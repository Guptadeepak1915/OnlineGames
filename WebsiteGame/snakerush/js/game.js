/* =====================================================
   Snake Rush - game.js
   Works with the page made by:  node tools/new-game.js "Snake Rush" ...
   It builds the board inside <div id="stage"> by itself.
   Styles are in css/game.css (already linked by index.html).

   Controls: Arrow keys / WASD, swipe on the board, or the
   on-screen arrows on phones. Space or P = pause.
   Best score is saved with the key "snakerush_best"
   (same key as bestKey in games-data.js).
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Settings (change numbers here) ---------- */
  const COLS = 20,
    ROWS = 20; // board size in squares
  const BASE_MS = 140; // time per move at level 1 (smaller = faster)
  const MIN_MS = 60; // fastest speed
  const SPEEDUP_MS = 8; // faster by this much each level
  const FOODS_PER_LEVEL = 4; // foods needed for next level
  const FOOD_PTS = 10,
    BONUS_PTS = 50;
  const BONUS_EVERY = 5; // golden food after every 5 foods
  const BONUS_SECONDS = 5; // golden food stays this long

  const BEST_KEY = "snakerush_best";
  const PLAYS_KEY = "snakerush_plays";

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
  };

  /* ---------- State ---------- */
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  let snake,
    dir,
    queue,
    food,
    bonus,
    eaten,
    score,
    shake,
    flash,
    particles,
    msgTimer;
  let best = +store.get(BEST_KEY, 0),
    plays = +store.get(PLAYS_KEY, 0),
    bestAtStart = best;
  let state = "ready"; // ready | play | paused | over
  let acc = 0,
    last = 0,
    SZ = 400,
    dpr = 1,
    finished = false;
  let canvas, ctx, scoreEl, bestEl, levelEl, msgEl, pauseBtn;
  const stage = document.getElementById("stage");
  const hdrBest = document.getElementById("hdrBest");

  const level = () => 1 + Math.floor(eaten / FOODS_PER_LEVEL);
  const tickMs = () => Math.max(MIN_MS, BASE_MS - (level() - 1) * SPEEDUP_MS);

  /* =====================================================
     BUILD THE PAGE (board, buttons, screens)
     ===================================================== */
  function buildUI() {
    stage.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-top">
          <div class="sn-box"><small>Score</small><b id="snScore">0</b></div>
          <div class="sn-box"><small>Best</small><b id="snBest">0</b></div>
          <div class="sn-box"><small>Level</small><b id="snLevel">1</b></div>
        </div>
        <div class="sn-bar"><button class="btn alt" id="snPause" type="button">Pause</button></div>
        <canvas class="sn-canvas" id="snCanvas" aria-label="Snake Rush board"></canvas>
        <p class="sn-msg" id="snMsg"></p>
        <div class="sn-dpad">
          <button class="up" data-dir="up" type="button" aria-label="Up">&#9650;</button>
          <button class="left" data-dir="left" type="button" aria-label="Left">&#9664;</button>
          <button class="down" data-dir="down" type="button" aria-label="Down">&#9660;</button>
          <button class="right" data-dir="right" type="button" aria-label="Right">&#9654;</button>
        </div>
        <p class="sn-hint">Arrow keys / WASD or swipe. Space to pause.</p>
      </div>

      <div class="overlay" id="snMenu">
        <div class="card">
          <h1>SNAKE RUSH</h1>
          <p>Eat food to grow and score. Do not hit the wall or yourself. The snake gets faster every level. Golden food gives 50 points but vanishes fast.</p>
          <div class="stats">
            <div class="stat"><small>Best</small><strong id="snMBest">0</strong></div>
            <div class="stat"><small>Plays</small><strong id="snMPlays">0</strong></div>
          </div>
          <button class="btn" id="snPlay" type="button">Play</button>
        </div>
      </div>

      <div class="overlay hidden" id="snPaused">
        <div class="card">
          <h2>Paused</h2>
          <button class="btn" id="snResume" type="button">Resume</button>
        </div>
      </div>

      <div class="overlay hidden" id="snOver">
        <div class="card">
          <h2 id="snOTitle">Game over</h2>
          <div class="big-score" id="snOScore">0</div>
          <div class="badge hidden" id="snOBadge">New best!</div>
          <p id="snOMsg"></p>
          <div class="stats">
            <div class="stat"><small>Best</small><strong id="snOBest">0</strong></div>
            <div class="stat"><small>Length</small><strong id="snOLen">3</strong></div>
          </div>
          <button class="btn" id="snAgain" type="button">Play again</button>
          <button class="btn alt" id="snShare" type="button">Share my score</button>
        </div>
      </div>`;
    canvas = document.getElementById("snCanvas");
    ctx = canvas.getContext("2d");
    scoreEl = document.getElementById("snScore");
    bestEl = document.getElementById("snBest");
    levelEl = document.getElementById("snLevel");
    msgEl = document.getElementById("snMsg");
    pauseBtn = document.getElementById("snPause");
  }

  const $ = (id) => document.getElementById(id);
  const show = (id) => $(id).classList.remove("hidden");
  const hide = (id) => $(id).classList.add("hidden");

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    SZ = canvas.clientWidth || 400;
    canvas.width = canvas.height = Math.round(SZ * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    levelEl.textContent = level();
    hdrBest && (hdrBest.textContent = best);
    $("snMBest").textContent = best;
    $("snMPlays").textContent = plays;
  }

  function say(t, ms = 1400) {
    msgEl.textContent = t;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => {
      msgEl.textContent = "";
    }, ms);
  }

  /* =====================================================
     GAME LOGIC
     ===================================================== */
  function reset() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dir = DIRS.right;
    queue = [];
    eaten = 0;
    score = 0;
    bonus = null;
    particles = [];
    shake = 0;
    flash = 0;
    bestAtStart = best;
    finished = false;
    acc = 0;
    placeFood();
  }

  function freeCells() {
    const taken = new Set(snake.map((s) => s.x + "," + s.y));
    if (food) taken.add(food.x + "," + food.y);
    if (bonus) taken.add(bonus.x + "," + bonus.y);
    const free = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!taken.has(x + "," + y)) free.push({ x, y });
    return free;
  }

  function placeFood() {
    food = null;
    const free = freeCells();
    if (!free.length) return false; // board full
    food = free[Math.floor(Math.random() * free.length)];
    return true;
  }

  function spawnBonus() {
    const free = freeCells();
    if (free.length)
      bonus = Object.assign(free[Math.floor(Math.random() * free.length)], {
        t: BONUS_SECONDS,
      });
  }

  function turn(nd) {
    if (state !== "play") return;
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if (
      (nd.x === ref.x && nd.y === ref.y) ||
      (nd.x === -ref.x && nd.y === -ref.y)
    )
      return; // same or reverse
    if (queue.length < 2) queue.push(nd);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS)
      return die();

    const eatFood = !!food && head.x === food.x && head.y === food.y;
    const eatBonus = !!bonus && head.x === bonus.x && head.y === bonus.y;
    const grow = eatFood || eatBonus;
    const body = grow ? snake : snake.slice(0, -1); // the tail moves away if we do not grow
    if (body.some((s) => s.x === head.x && s.y === head.y)) return die();

    snake.unshift(head);
    if (!grow) snake.pop();

    if (eatFood) {
      const oldLevel = level();
      eaten++;
      score += FOOD_PTS;
      burst(head, ["#ff5c7a", "#fff"]);
      if (eaten % BONUS_EVERY === 0 && !bonus) spawnBonus();
      if (!placeFood()) return finish("win");
      if (level() !== oldLevel) say(`Level ${level()}! Faster...`);
    }
    if (eatBonus) {
      score += BONUS_PTS;
      bonus = null;
      burst(head, ["#ffd23f", "#fff"]);
      say("Golden food! +" + BONUS_PTS);
    }
    updateHUD();
  }

  function die() {
    state = "over";
    shake = 12;
    flash = 0.5;
    burst(snake[0], ["#ff5c7a", "#ffd23f", "#fff"], 30);
    setTimeout(() => finish("over"), 650);
  }

  function finish(kind) {
    if (finished) return;
    finished = true;
    state = "over";
    plays++;
    store.set(PLAYS_KEY, plays);
    const newBest = score > bestAtStart;
    if (score > best) {
      best = score;
      store.set(BEST_KEY, best);
    }
    updateHUD();
    $("snOTitle").textContent =
      kind === "win" ? "You filled the board!" : "Game over";
    $("snOScore").textContent = score;
    $("snOBest").textContent = best;
    $("snOLen").textContent = snake.length;
    $("snOBadge").classList.toggle("hidden", !newBest);
    $("snOMsg").textContent =
      kind === "win"
        ? "Amazing! There was no space left to move."
        : newBest
          ? "That is your highest score ever!"
          : best - score <= 40
            ? `So close! Only ${best - score} points from your best.`
            : "Plan your path early and keep away from the walls.";
    show("snOver");
  }

  function start() {
    reset();
    state = "play";
    hide("snMenu");
    hide("snOver");
    hide("snPaused");
    pauseBtn.textContent = "Pause";
    msgEl.textContent = "";
    updateHUD();
  }

  function togglePause() {
    if (state === "play") {
      state = "paused";
      show("snPaused");
      pauseBtn.textContent = "Resume";
    } else if (state === "paused") {
      state = "play";
      hide("snPaused");
      pauseBtn.textContent = "Pause";
    }
  }

  /* =====================================================
     DRAWING
     ===================================================== */
  function burst(c, colors, n = 12) {
    const cs = SZ / COLS;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        sp = 40 + Math.random() * 120;
      particles.push({
        x: (c.x + 0.5) * cs,
        y: (c.y + 0.5) * cs,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5,
        max: 0.5,
        c: colors[i % colors.length],
        s: 2 + Math.random() * 3,
      });
    }
  }

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(time) {
    const cs = SZ / COLS;
    ctx.save();
    if (shake > 0.5)
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
      );

    // background and faint grid
    ctx.fillStyle = "#120d2b";
    ctx.fillRect(-10, -10, SZ + 20, SZ + 20);
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, SZ);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cs);
      ctx.lineTo(SZ, i * cs);
      ctx.stroke();
    }

    // food (pulses)
    if (food) {
      const p = 1 + Math.sin(time / 180) * 0.08;
      ctx.fillStyle = "#ff5c7a";
      ctx.shadowColor = "#ff5c7a";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * cs, (food.y + 0.5) * cs, cs * 0.36 * p, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // golden food with a shrinking ring
    if (bonus) {
      const cx = (bonus.x + 0.5) * cs,
        cy = (bonus.y + 0.5) * cs;
      ctx.fillStyle = "#ffd23f";
      ctx.shadowColor = "#ffd23f";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.34, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        cs * 0.46,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * Math.max(0, bonus.t / BONUS_SECONDS),
      );
      ctx.stroke();
    }

    // snake: head is bright cyan, tail fades to blue
    const n = snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const s = snake[i],
        t = n > 1 ? i / (n - 1) : 0,
        pad = cs * 0.07;
      ctx.fillStyle = `hsl(${170 + 60 * t},85%,${62 - 16 * t}%)`;
      if (i === 0) {
        ctx.shadowColor = "#3df2e0";
        ctx.shadowBlur = 12;
      }
      rrect(
        s.x * cs + pad,
        s.y * cs + pad,
        cs - pad * 2,
        cs - pad * 2,
        cs * 0.28,
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // eyes
    const h = snake[0],
      ex = dir.x,
      ey = dir.y,
      hx = (h.x + 0.5) * cs,
      hy = (h.y + 0.5) * cs;
    for (const side of [-1, 1]) {
      const ox = hx + ex * cs * 0.16 + -ey * side * cs * 0.17,
        oy = hy + ey * cs * 0.16 + ex * side * cs * 0.17;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ox, oy, cs * 0.1, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#120d2b";
      ctx.beginPath();
      ctx.arc(ox + ex * cs * 0.03, oy + ey * cs * 0.03, cs * 0.05, 0, 7);
      ctx.fill();
    }

    // sparks
    for (const q of particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x, q.y, q.s, q.s);
    }
    ctx.globalAlpha = 1;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`;
      ctx.fillRect(-10, -10, SZ + 20, SZ + 20);
    }
    ctx.restore();
  }

  /* =====================================================
     MAIN LOOP
     ===================================================== */
  function frame(t) {
    const dt = Math.min(100, t - (last || t));
    last = t;
    if (state === "play") {
      acc += dt;
      while (acc >= tickMs() && state === "play") {
        step();
        acc -= tickMs();
      }
      if (bonus) {
        bonus.t -= dt / 1000;
        if (bonus.t <= 0) bonus = null;
      }
    }
    // effects keep moving after a crash
    particles.forEach((q) => {
      q.life -= dt / 1000;
      q.x += (q.vx * dt) / 1000;
      q.y += (q.vy * dt) / 1000;
    });
    particles = particles.filter((q) => q.life > 0);
    shake *= 0.9;
    flash = Math.max(0, flash - dt / 600);
    draw(t);
    requestAnimationFrame(frame);
  }

  /* =====================================================
     INPUT
     ===================================================== */
  const KEYS = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code in KEYS && (state === "play" || state === "paused")) {
        e.preventDefault();
        turn(DIRS[KEYS[e.code]]);
      } else if (
        (e.code === "Space" || e.code === "KeyP") &&
        (state === "play" || state === "paused")
      ) {
        e.preventDefault();
        togglePause();
      }
    });

    // swipe on the board
    let sx = 0,
      sy = 0,
      tracking = false;
    canvas.addEventListener("pointerdown", (e) => {
      sx = e.clientX;
      sy = e.clientY;
      tracking = true;
    });
    window.addEventListener("pointermove", (e) => {
      if (!tracking) return;
      const dx = e.clientX - sx,
        dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      turn(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? DIRS.right
            : DIRS.left
          : dy > 0
            ? DIRS.down
            : DIRS.up,
      );
      sx = e.clientX;
      sy = e.clientY;
    });
    window.addEventListener("pointerup", () => {
      tracking = false;
    });
    window.addEventListener("pointercancel", () => {
      tracking = false;
    });

    // on-screen arrows
    document.querySelectorAll(".sn-dpad button").forEach((b) =>
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        turn(DIRS[b.dataset.dir]);
      }),
    );

    $("snPlay").onclick = start;
    $("snAgain").onclick = start;
    $("snResume").onclick = togglePause;
    pauseBtn.onclick = togglePause;
    $("snShare").onclick = async () => {
      const text = `I scored ${score} in Snake Rush! Can you beat me?`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Snake Rush",
            text,
            url: location.href,
          });
          return;
        }
        await navigator.clipboard.writeText(text + " " + location.href);
        $("snOMsg").textContent = "Copied! Paste it to your friends.";
      } catch (err) {}
    };
    window.addEventListener("resize", layout);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "play") togglePause();
    });
  }

  /* =====================================================
     START
     ===================================================== */
  buildUI();
  layout();
  reset();
  updateHUD();
  bindInput();
  requestAnimationFrame(frame);
})();
