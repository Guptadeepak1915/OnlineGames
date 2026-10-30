"use strict";

// Win confetti animation.
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
