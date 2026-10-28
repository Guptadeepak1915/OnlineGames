/* =====================================================
   main.js  -  Starts everything. The game loop is here.
   ===================================================== */

let lastT = performance.now();

function loop(t) {
  const dt = Math.max(0, Math.min(0.033, (t - lastT) / 1000)); // time since last frame (0 to 33ms)
  lastT = t;
  update(dt); // game.js
  draw(); // render.js
  requestAnimationFrame(loop);
}

updateSoundButton();
refreshStats();
initAds();
requestAnimationFrame(loop);
