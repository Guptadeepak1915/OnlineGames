/* =====================================================
   game.js - Bricks Breaker Quest: physics, bricks, power-ups,
   lives, score and level quests. No drawing here (see render.js)
   ===================================================== */

/* ---------- Settings (change numbers here) ---------- */
const W = 480,
  H = 640; // game size (the canvas scales to the screen)
const PADDLE_Y = 588,
  PADDLE_H = 14,
  BASE_PADDLE = 84,
  BALL_R = 7;
const BW = 54,
  BH = 22,
  GAP = 4,
  TOP = 64,
  LEFT = 10; // brick size and position
const START_LIVES = 3,
  MAX_LIVES = 5;
const SPEED_START = 340,
  SPEED_STEP = 16,
  SPEED_MAX = 620; // ball speed (pixels per second)
const DROP_CHANCE = 0.1; // chance that a normal brick drops a power-up
const BRICK_COLORS = [
  "#ff5c7a",
  "#ff9f43",
  "#ffd23f",
  "#a0ff6b",
  "#3df2e0",
  "#b9b0f0",
];
const POWER = {
  // power-ups: weight = how often it drops
  W: { weight: 30, color: "#3df2e0", label: "W" },
  M: { weight: 20, color: "#ffd23f", label: "M" },
  S: { weight: 20, color: "#7fb0ff", label: "S" },
  F: { weight: 15, color: "#ff9f43", label: "F" },
  L: { weight: 10, color: "#ff5c7a", label: "♥" },
};

const G = {
  state: "menu", // menu | intro | ready | play | paused | clear | over
  level: 1,
  score: 0,
  lives: START_LIVES,
  combo: 0,
  mult: 1,
  bricks: [],
  balls: [],
  drops: [],
  parts: [],
  texts: [],
  paddle: { x: W / 2, w: BASE_PADDLE, tx: W / 2 },
  fx: { wide: 0, slow: 0, fire: 0 },
  playTime: 0,
  par: 60,
  lostLevel: false,
  breakable: 0,
  shake: 0,
  flash: 0,
  name: "",
  stars: 0,
  keys: { l: false, r: false },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- Sound (tiny beeps made by the browser) ---------- */
let AC = null;
function beep(f, d, type = "square", v = 0.05, slide = 0) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type;
    o.frequency.value = f;
    if (slide)
      o.frequency.linearRampToValueAtTime(f + slide, AC.currentTime + d);
    g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g);
    g.connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch (e) {}
}
const sfx = {
  paddle() {
    beep(300, 0.05, "triangle", 0.07);
  },
  hit() {
    beep(520, 0.05);
  },
  brk() {
    beep(700, 0.08, "square", 0.06, 200);
  },
  steel() {
    beep(180, 0.05, "sawtooth", 0.05);
  },
  power() {
    beep(500, 0.15, "sine", 0.08, 500);
  },
  lose() {
    beep(260, 0.4, "sawtooth", 0.08, -200);
  },
  clear() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => beep(f, 0.14, "sine", 0.09), i * 100),
    );
  },
};

/* =====================================================
   LEVELS
   ===================================================== */
function levelInfo(L) {
  const base = LEVELS[(L - 1) % LEVELS.length];
  const round = Math.floor((L - 1) / LEVELS.length);
  return {
    rows: base.rows,
    name: round ? `${base.name} (round ${round + 1})` : base.name,
    tough: Math.min(0.7, 0.3 * round),
  };
}

function buildBricks(L) {
  const info = levelInfo(L),
    bricks = [];
  info.rows.forEach((row, r) => {
    row.split("").forEach((ch, c) => {
      if (ch === ".") return;
      let type = "n",
        hp = 1,
        color = "#fff",
        pts = 10;
      if (ch >= "1" && ch <= "6") {
        color = BRICK_COLORS[+ch - 1];
        if (Math.random() < info.tough) {
          type = "T";
          hp = 2;
          pts = 20;
          color = "#8fa3d9";
        }
      } else if (ch === "T") {
        type = "T";
        hp = 2;
        pts = 20;
        color = "#8fa3d9";
      } else if (ch === "X") {
        type = "X";
        pts = 15;
        color = "#ff7a3d";
      } else if (ch === "P") {
        type = "P";
        pts = 15;
        color = "#ffd23f";
      } else if (ch === "S") {
        type = "S";
        hp = Infinity;
        pts = 0;
        color = "#6d6a85";
      }
      bricks.push({
        x: LEFT + c * (BW + GAP),
        y: TOP + r * (BH + GAP),
        w: BW,
        h: BH,
        row: r,
        col: c,
        type,
        hp,
        maxhp: hp,
        pts,
        color,
        alive: true,
        flash: 0,
      });
    });
  });
  return { bricks, name: info.name };
}

const aliveBreakable = () =>
  G.bricks.filter((b) => b.alive && b.type !== "S").length;

/* ---------- Game flow ---------- */
function newRun() {
  G.level = 1;
  G.score = 0;
  G.lives = START_LIVES;
  loadLevel();
}

function loadLevel() {
  const { bricks, name } = buildBricks(G.level);
  G.bricks = bricks;
  G.name = name;
  G.breakable = aliveBreakable();
  G.par = Math.round(20 + G.breakable * 1.5); // target time for the 3rd star (seconds)
  G.playTime = 0;
  G.lostLevel = false;
  resetBall();
  G.drops = [];
  G.parts = [];
  G.texts = [];
  G.state = "intro";
  showIntro();
  updateHUD();
}

function resetBall() {
  G.balls = [
    {
      x: G.paddle.x,
      y: PADDLE_Y - BALL_R - 1,
      vx: 0,
      vy: 0,
      stuck: true,
      trail: [],
    },
  ];
  G.fx.wide = G.fx.slow = G.fx.fire = 0;
  G.combo = 0;
  G.mult = 1;
}

function startLevel() {
  G.state = "ready";
  hideOverlays();
  updateHUD();
}

function launch() {
  if (G.state !== "ready") return;
  const b = G.balls[0],
    sp = ballSpeed();
  const a = rnd(-0.25, 0.25);
  b.vx = Math.sin(a) * sp;
  b.vy = -Math.cos(a) * sp;
  b.stuck = false;
  G.state = "play";
}

function togglePause() {
  if (G.state === "play" || G.state === "ready") {
    G.prevState = G.state;
    G.state = "paused";
    showPause(true);
  } else if (G.state === "paused") {
    G.state = G.prevState || "play";
    showPause(false);
  }
  updateHUD();
}

const ballSpeed = () =>
  Math.min(SPEED_MAX, SPEED_START + (G.level - 1) * SPEED_STEP) *
  (G.fx.slow > 0 ? 0.7 : 1);

/* =====================================================
   UPDATE (runs every frame)
   ===================================================== */
function update(dt) {
  const p = G.paddle;
  if (G.state === "ready" || G.state === "play") {
    if (G.keys.l) p.tx -= 520 * dt;
    if (G.keys.r) p.tx += 520 * dt;
    const target = BASE_PADDLE * (G.fx.wide > 0 ? 1.6 : 1);
    p.w += (target - p.w) * Math.min(1, dt * 8);
    p.tx = clamp(p.tx, p.w / 2, W - p.w / 2);
    p.x = p.tx;
  }
  if (G.state === "ready") {
    const b = G.balls[0];
    b.x = p.x;
    b.y = PADDLE_Y - BALL_R - 1;
  }

  if (G.state === "play") {
    G.playTime += dt;
    for (const k of ["wide", "slow", "fire"])
      if (G.fx[k] > 0) G.fx[k] = Math.max(0, G.fx[k] - dt);

    const steps = Math.max(1, Math.ceil(dt / (1 / 120))),
      h = dt / steps; // small steps so fast balls never skip a brick
    for (let i = 0; i < steps && G.state === "play"; i++) {
      G.balls = G.balls.filter((b) => !stepBall(b, h));
      if (G.state !== "play") break;
      if (!G.balls.length) {
        loseLife();
        break;
      }
    }
    updateDrops(dt);
  }

  // effects keep moving
  G.parts.forEach((q) => {
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 300 * dt;
  });
  G.parts = G.parts.filter((q) => q.life > 0);
  G.texts.forEach((t) => {
    t.life -= dt;
    t.y -= 30 * dt;
  });
  G.texts = G.texts.filter((t) => t.life > 0);
  G.bricks.forEach((b) => {
    if (b.flash > 0) b.flash -= dt;
  });
  G.shake *= Math.pow(0.01, dt);
  G.flash = Math.max(0, G.flash - dt * 2);
}

/* Moves one ball for time h. Returns true if the ball fell out of the board. */
function stepBall(b, h) {
  if (b.stuck) return false;
  const sp = ballSpeed(),
    m = Math.hypot(b.vx, b.vy) || 1;
  b.vx = (b.vx / m) * sp;
  b.vy = (b.vy / m) * sp;
  b.x += b.vx * h;
  b.y += b.vy * h;

  if (b.x < BALL_R) {
    b.x = BALL_R;
    b.vx = Math.abs(b.vx);
  } else if (b.x > W - BALL_R) {
    b.x = W - BALL_R;
    b.vx = -Math.abs(b.vx);
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    b.vy = Math.abs(b.vy);
  }

  paddleHit(b, sp);
  brickHit(b);
  fixAngle(b);

  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 8) b.trail.shift();
  return b.y - BALL_R > H;
}

// the ball must never become almost flat (it would take forever to come down)
function fixAngle(b) {
  const sp = Math.hypot(b.vx, b.vy) || 1,
    minVy = sp * 0.25;
  if (Math.abs(b.vy) < minVy) {
    b.vy = (b.vy < 0 ? -1 : 1) * minVy;
    b.vx = Math.sign(b.vx || 1) * Math.sqrt(Math.max(0, sp * sp - b.vy * b.vy));
  }
}

function paddleHit(b, sp) {
  const p = G.paddle;
  if (
    b.vy > 0 &&
    b.y + BALL_R >= PADDLE_Y &&
    b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
    b.x >= p.x - p.w / 2 - BALL_R &&
    b.x <= p.x + p.w / 2 + BALL_R
  ) {
    b.y = PADDLE_Y - BALL_R;
    const hit = clamp((b.x - p.x) / (p.w / 2), -1, 1);
    const ang = hit * (Math.PI / 3) + rnd(-0.05, 0.05); // up to 60 degrees, plus a tiny random change so the ball never loops in one straight line
    b.vx = Math.sin(ang) * sp;
    b.vy = -Math.cos(ang) * sp;
    G.combo = 0;
    G.mult = 1;
    updateHUD();
    sfx.paddle();
  }
}

/* ---------- Bricks ---------- */
function brickHit(b) {
  const fire = G.fx.fire > 0;
  for (const br of G.bricks) {
    if (!br.alive) continue;
    const cx = clamp(b.x, br.x, br.x + br.w),
      cy = clamp(b.y, br.y, br.y + br.h);
    const dx = b.x - cx,
      dy = b.y - cy;
    if (dx * dx + dy * dy >= BALL_R * BALL_R) continue;

    const passes = fire && br.type !== "S"; // a fireball goes through breakable bricks
    if (!passes) {
      const oL = b.x + BALL_R - br.x,
        oR = br.x + br.w - (b.x - BALL_R);
      const oT = b.y + BALL_R - br.y,
        oB = br.y + br.h - (b.y - BALL_R);
      const m = Math.min(oL, oR, oT, oB);
      if (m === oL) {
        b.x -= oL;
        b.vx = -Math.abs(b.vx);
      } else if (m === oR) {
        b.x += oR;
        b.vx = Math.abs(b.vx);
      } else if (m === oT) {
        b.y -= oT;
        b.vy = -Math.abs(b.vy);
      } else {
        b.y += oB;
        b.vy = Math.abs(b.vy);
      }
    }
    damage(br, passes ? 99 : 1);
    if (!passes) break;
  }
}

function addScore(n) {
  G.score += n;
  updateHUD();
}

function damage(br, amount) {
  G.combo++;
  G.mult = Math.min(5, 1 + Math.floor(G.combo / 3));
  br.flash = 0.12;
  if (br.type === "S") {
    sfx.steel();
    return;
  }
  br.hp -= amount;
  if (br.hp > 0) {
    sfx.hit();
    addScore(5);
    return;
  }
  destroy(br);
  if (br.type === "X") explode(br);
  checkClear();
}

function destroy(br) {
  br.alive = false;
  const pts = br.pts * G.mult;
  addScore(pts);
  G.texts.push({ x: br.x + br.w / 2, y: br.y, t: "+" + pts, life: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = rnd(0, Math.PI * 2),
      s = rnd(40, 160);
    G.parts.push({
      x: br.x + br.w / 2,
      y: br.y + br.h / 2,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 0.5,
      max: 0.5,
      c: br.color,
      s: rnd(2, 4),
    });
  }
  sfx.brk();
  if (br.type === "P") spawnDrop(br);
  else if (Math.random() < DROP_CHANCE) spawnDrop(br);
}

// explosive brick: damages the 8 bricks around it (chains if they are explosive too)
function explode(first) {
  const queue = [first];
  G.shake = Math.max(G.shake, 8);
  G.flash = 0.25;
  while (queue.length) {
    const cur = queue.pop();
    for (const n of G.bricks) {
      if (!n.alive || n === cur || n.type === "S") continue;
      if (Math.abs(n.row - cur.row) > 1 || Math.abs(n.col - cur.col) > 1)
        continue;
      n.hp--;
      n.flash = 0.12;
      if (n.hp <= 0) {
        destroy(n);
        if (n.type === "X") queue.push(n);
      }
    }
  }
}

/* ---------- Power-ups ---------- */
function spawnDrop(br) {
  const keys = Object.keys(POWER),
    total = keys.reduce((s, k) => s + POWER[k].weight, 0);
  let r = Math.random() * total,
    type = keys[0];
  for (const k of keys) {
    r -= POWER[k].weight;
    if (r <= 0) {
      type = k;
      break;
    }
  }
  G.drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type, vy: 150 });
}

function updateDrops(dt) {
  const p = G.paddle;
  for (const d of G.drops) {
    d.y += d.vy * dt;
    if (
      d.y + 10 >= PADDLE_Y &&
      d.y - 10 <= PADDLE_Y + PADDLE_H &&
      Math.abs(d.x - p.x) <= p.w / 2 + 12
    ) {
      d.got = true;
      applyPower(d.type);
    }
  }
  G.drops = G.drops.filter((d) => !d.got && d.y < H + 20);
}

function applyPower(type) {
  sfx.power();
  G.texts.push({
    x: G.paddle.x,
    y: PADDLE_Y - 24,
    t: { W: "WIDE!", M: "MULTI!", S: "SLOW!", F: "FIREBALL!", L: "+1 LIFE" }[
      type
    ],
    life: 0.9,
  });
  if (type === "W") G.fx.wide = 12;
  else if (type === "S") G.fx.slow = 8;
  else if (type === "F") G.fx.fire = 6;
  else if (type === "L") {
    G.lives = Math.min(MAX_LIVES, G.lives + 1);
    updateHUD();
  } else if (type === "M") {
    const extra = [];
    G.balls.forEach((b) => {
      if (b.stuck) return;
      [-0.4, 0.4].forEach((a) => {
        const c = Math.cos(a),
          s = Math.sin(a);
        extra.push({
          x: b.x,
          y: b.y,
          vx: b.vx * c - b.vy * s,
          vy: b.vx * s + b.vy * c,
          stuck: false,
          trail: [],
        });
      });
    });
    G.balls = G.balls.concat(extra).slice(0, 6);
  }
}

/* ---------- Lives and level end ---------- */
function loseLife() {
  G.lives--;
  G.lostLevel = true;
  G.shake = 10;
  G.flash = 0.3;
  G.drops = [];
  sfx.lose();
  if (G.lives <= 0) {
    gameOver();
    return;
  }
  resetBall();
  G.state = "ready";
  updateHUD();
}

function checkClear() {
  if (G.state !== "play" || aliveBreakable() > 0) return;
  G.state = "clear";
  const noLoss = !G.lostLevel,
    fast = G.playTime <= G.par;
  G.stars = 1 + (noLoss ? 1 : 0) + (fast ? 1 : 0);
  const bonus = 100 * G.level + (G.stars - 1) * 300;
  G.score += bonus;
  let lifeMsg = "";
  if (G.level % 3 === 0 && G.lives < MAX_LIVES) {
    G.lives++;
    lifeMsg = " You won an extra life!";
  }
  sfx.clear();
  showClear({ bonus, noLoss, fast, lifeMsg });
  updateHUD();
}

function nextLevel() {
  G.level++;
  loadLevel();
}

function gameOver() {
  G.state = "over";
  const newBest = saveResult(G.score);
  refreshStats();
  showOver(newBest);
}
