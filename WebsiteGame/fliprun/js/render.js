/* =====================================================
   render.js  -  Everything you SEE on the canvas
   This file only draws. It does not change game state.
   ===================================================== */

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2); // sharp on phones
cv.width = W * dpr;
cv.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// rounded rectangle helper
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Draw one full frame ---------- */
function draw() {
  const th = theme();
  ctx.save();
  if (shake > 0.5) ctx.translate(rand(-shake, shake), rand(-shake, shake));

  drawBackground(th);
  drawBands(th);
  drawCoins();
  drawObstacles(th);
  drawParticles();
  drawPlayer(th);
  drawTexts();
  drawHUD();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`;
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  ctx.restore();
}

function drawBackground(th) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.bg1);
  g.addColorStop(1, th.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  ctx.fillStyle = "#fff";
  stars.forEach((s) => {
    ctx.globalAlpha = 0.25 + s.z * 0.5;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  });
  ctx.globalAlpha = 1;
}

// floor and ceiling
function drawBands(th) {
  for (const top of [0, H - BAND]) {
    ctx.fillStyle = "rgba(8,5,25,.78)";
    ctx.fillRect(-20, top, W + 40, BAND);
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 2;
    const off = scroll % 48;
    for (let x = -off; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - 14, top + BAND);
      ctx.stroke();
    }
    ctx.fillStyle = th.acc;
    ctx.shadowColor = th.acc;
    ctx.shadowBlur = 12;
    ctx.fillRect(-20, top === 0 ? BAND - 3 : H - BAND, W + 40, 3);
    ctx.shadowBlur = 0;
  }
}

function drawCoins() {
  coins.forEach((c) => {
    const pulse = 1 + Math.sin((scroll + c.x) * 0.02) * 0.12;
    ctx.fillStyle = "#ffd23f";
    ctx.shadowColor = "#ffd23f";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9 * pulse, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b88a00";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4 * pulse, 0, 7);
    ctx.fill();
  });
}

function drawObstacles(th) {
  obstacles.forEach((o) => {
    const floor = o.side === "floor";
    ctx.fillStyle = th.acc;
    ctx.shadowColor = th.acc;
    ctx.shadowBlur = 14;

    if (o.kind === "spike") {
      for (let i = 0; i < o.n; i++) {
        const x = o.x + i * 34;
        ctx.beginPath();
        if (floor) {
          ctx.moveTo(x, H - BAND);
          ctx.lineTo(x + 17, H - BAND - o.h);
          ctx.lineTo(x + 34, H - BAND);
        } else {
          ctx.moveTo(x, BAND);
          ctx.lineTo(x + 17, BAND + o.h);
          ctx.lineTo(x + 34, BAND);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else {
      const y = floor ? H - BAND - o.h : BAND;
      rr(o.x, y, o.w, o.h, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(o.x + 8, y + (floor ? 10 : o.h - 16), o.w - 16, 6);
    }
  });
}

function drawParticles() {
  particles.forEach((q) => {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.c;
    ctx.fillRect(q.x, q.y, q.s, q.s);
  });
  ctx.globalAlpha = 1;
}

// the cube with eyes (hidden after crash, sparks show instead)
function drawPlayer(th) {
  if (state === "dead") return;
  const cx = PX + SZ / 2,
    cy = p.y + SZ / 2,
    sq = p.squash * 0.25;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(p.rot);
  ctx.scale(1 + sq, 1 - sq);
  ctx.fillStyle = th.glow;
  ctx.shadowColor = th.glow;
  ctx.shadowBlur = 18;
  rr(-SZ / 2, -SZ / 2, SZ, SZ, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.fillRect(2, -8, 8, 9);
  ctx.fillRect(-8, -8, 8, 9);
  ctx.fillStyle = "#120d2b";
  ctx.fillRect(6, -6, 4, 6);
  ctx.fillRect(-4, -6, 4, 6);
  ctx.restore();
}

function drawTexts() {
  ctx.textAlign = "center";
  ctx.font = "22px Bungee, Impact, sans-serif";
  texts.forEach((t) => {
    ctx.globalAlpha = Math.min(1, t.life * 1.5);
    ctx.fillStyle = t.c;
    ctx.fillText(t.t, t.x, t.y);
  });
  ctx.globalAlpha = 1;
}

// score, "points to beat best", combo, progress bar
function drawHUD() {
  if (state === "menu") return;

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "26px Bungee, Impact, sans-serif";
  ctx.fillText(score(), 16, 31);

  ctx.textAlign = "right";
  ctx.font = "15px Nunito, Arial, sans-serif";
  ctx.fillStyle = "#cfc9f5";
  const toBest = best - score();
  ctx.fillText(
    best > 0
      ? toBest > 0
        ? `${toBest} to beat your best`
        : "Beating your best!"
      : "Set your first score",
    W - 16,
    20,
  );

  if (combo > 1) {
    ctx.fillStyle = "#ffd23f";
    ctx.font = "18px Bungee, Impact, sans-serif";
    ctx.fillText("x" + combo, W - 16, 38);
  }
  if (best > 0) {
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(0, 0, W * Math.min(1, score() / best), 4);
  }
}
