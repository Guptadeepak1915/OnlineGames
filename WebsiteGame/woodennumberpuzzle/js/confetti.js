import { reducedMotion } from "./utils.js";

export function createConfetti(canvas) {
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
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
        width = innerWidth,
        height = innerHeight;
      const part = {
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.35,
        c: COLORS[i % COLORS.length],
      };
      if (kind === 0) {
        part.x = 0;
        part.y = height * 0.75;
        part.vx = 5 + Math.random() * 7;
        part.vy = -(9 + Math.random() * 9);
      } else if (kind === 1) {
        part.x = width;
        part.y = height * 0.75;
        part.vx = -(5 + Math.random() * 7);
        part.vy = -(9 + Math.random() * 9);
      } else {
        part.x = Math.random() * width;
        part.y = -20 - Math.random() * height * 0.4;
        part.vx = (Math.random() - 0.5) * 2;
        part.vy = 2 + Math.random() * 3;
      }
      parts.push(part);
    }
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const part of parts) {
      part.vy += 0.16;
      part.vx *= 0.995;
      part.x += part.vx;
      part.y += part.vy;
      part.rot += part.vr;
      if (part.y < innerHeight + 30) {
        alive++;
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate(part.rot);
        ctx.fillStyle = part.c;
        ctx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
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
}
