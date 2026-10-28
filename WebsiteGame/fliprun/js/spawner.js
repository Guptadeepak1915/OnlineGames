/* =====================================================
   spawner.js  -  Creates obstacles and coins
   How hard the game is depends on this file.
   ===================================================== */

// One obstacle: spike group or block, on floor or ceiling
function makeObstacle(x, side) {
  if (Math.random() < 0.45) {
    const n = 1 + Math.floor(Math.random() * 3); // 1 to 3 spikes
    return { x, w: n * 34, h: 34, side, kind: "spike", n };
  }
  return { x, w: rand(38, 66), h: rand(50, 125), side, kind: "block" };
}

// Called again and again while playing. Adds new obstacle + coins.
function spawn() {
  const x = W + 50; // just outside right edge
  const side = Math.random() < 0.5 ? "floor" : "ceil";
  const o = makeObstacle(x, side);
  obstacles.push(o);
  let width = o.w;

  // After 3000 distance, sometimes add a second obstacle on the opposite side
  if (dist > 3000 && Math.random() < 0.25) {
    const off = speed * 0.85;
    const o2 = makeObstacle(x + off, side === "floor" ? "ceil" : "floor");
    obstacles.push(o2);
    width = off + o2.w;
  }

  // Gap before the next obstacle (bigger gap = easier)
  const gap = speed * rand(0.85, 1.45);
  spawnLeft = width + gap;

  // 75% chance: a row of 3 coins in the gap
  if (Math.random() < 0.75) {
    const lanes = [BAND + 30, H / 2, H - BAND - 30]; // top, middle, bottom
    const y = lanes[Math.floor(Math.random() * 3)];
    const cx = x + width + gap / 2;
    for (let i = -1; i <= 1; i++) coins.push({ x: cx + i * 38, y, got: false });
  }
}

// The area where the player can get hurt (a bit smaller than the picture)
function hitbox(o) {
  const y = o.side === "floor" ? H - BAND - o.h : BAND;
  if (o.kind === "spike")
    return {
      x: o.x + 8,
      w: o.w - 16,
      y: o.side === "floor" ? y + 12 : y,
      h: o.h - 12,
    };
  return { x: o.x + 2, w: o.w - 4, y, h: o.h };
}
