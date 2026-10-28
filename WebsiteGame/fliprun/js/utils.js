/* =====================================================
   utils.js  -  Small helper functions
   random numbers, particles (sparks), floating text
   ===================================================== */

const rand = (a, b) => a + Math.random() * (b - a);

// Spray small colored sparks. Used for coins, death, landing, confetti.
function burst(x, y, n, colors, spd = 260, life = 0.6, grav = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = rand(0.2, 1) * spd;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * rand(0.6, 1),
      max: life,
      c: colors[i % colors.length],
      s: rand(2, 5),
      g: grav,
    });
  }
}

// Text that floats up and fades (like +30, LEVEL 2)
function popup(x, y, t, c = "#fff") {
  texts.push({ x, y, t, c, life: 1 });
}
