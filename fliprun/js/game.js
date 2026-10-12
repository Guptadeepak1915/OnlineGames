/* =====================================================
   game.js  -  Main game logic
   State, player physics, collisions, coins, score, levels
   ===================================================== */

/* ---------- Game state (all changing values live here) ---------- */
let state = 'menu';                    // 'menu' | 'play' | 'dead'
let p;                                 // player
let obstacles = [], coins = [], particles = [], texts = [];
let dist = 0, scroll = 0, speed = 290, spawnLeft = 380;
let shake = 0, flash = 0, lvl = 1, themeIdx = 0;
let bonus = 0, coinCount = 0, streak = 0, combo = 1;
let deadAt = 0, beatBestLive = false;

const stars = Array.from({length: 60}, () => ({
  x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .4, z: Math.random() * .8 + .2
}));

const theme = () => themes[themeIdx % themes.length];
const score = () => Math.floor(dist / 25) + bonus;

/* ---------- Start a fresh run ---------- */
function resetGame(){
  p = {y: H - BAND - SZ, vy: 0, dir: 1, rot: 0, grounded: true, squash: 0};
  obstacles = []; coins = []; particles = []; texts = [];
  dist = 0; speed = 290; spawnLeft = 380; shake = 0; flash = 0;
  bonus = 0; coinCount = 0; streak = 0; combo = 1; lvl = 1; themeIdx = 0; beatBestLive = false;
}
resetGame();

function start(){
  resetGame();
  state = 'play';
  hideOverlays();
  sfx.start();
}

/* ---------- Player action: flip gravity ---------- */
function flip(){
  p.dir *= -1;
  p.vy = p.dir * 260;
  p.grounded = false;
  sfx.flip();
  burst(PX + SZ / 2, p.y + SZ / 2, 6, [theme().glow, '#fff'], 140, .3);
}

/* ---------- Game over ---------- */
function die(){
  state = 'dead'; deadAt = performance.now();
  shake = 16; flash = .6;
  sfx.die();
  burst(PX + SZ / 2, p.y + SZ / 2, 46, [theme().acc, theme().glow, '#fff'], 420, .9);

  const s = score();
  const newBest = saveResult(s);       // storage.js
  refreshStats();                      // ui.js
  setTimeout(() => showGameOver(s, newBest), 550);
}

/* =====================================================
   UPDATE: runs every frame (about 60 times per second)
   ===================================================== */
function update(dt){
  updateBackground(dt);

  if(state === 'menu'){ p.y = H - BAND - SZ; return; }

  if(state === 'play'){
    speed = Math.min(640, 290 + dist * .012);   // game gets faster slowly
    dist += speed * dt;

    updatePlayer(dt);
    spawnLogic(dt);
    updateObstacles(dt);
    if(state === 'play') updateCoins(dt);       // skip if player just died
    updateLevel();
  }
  updateAnimations(dt);
}

/* ---- scrolling stars ---- */
function updateBackground(dt){
  const v = state === 'play' ? speed : 90;
  scroll += v * dt;
  stars.forEach(s => {
    s.x -= v * s.z * .12 * dt;
    if(s.x < 0){ s.x = W; s.y = Math.random() * H; }
  });
}

/* ---- player gravity, landing, trail ---- */
function updatePlayer(dt){
  p.vy += GRAV * p.dir * dt;
  p.vy = Math.max(-1000, Math.min(1000, p.vy));
  p.y += p.vy * dt;

  const wasAir = !p.grounded;
  if(p.y + SZ > H - BAND){ p.y = H - BAND - SZ; if(p.vy > 0) p.vy = 0; }   // floor
  if(p.y < BAND){ p.y = BAND; if(p.vy < 0) p.vy = 0; }                      // ceiling
  p.grounded = (p.dir === 1 && p.y + SZ >= H - BAND - .5) || (p.dir === -1 && p.y <= BAND + .5);

  if(wasAir && p.grounded){
    sfx.land(); p.squash = 1;
    burst(PX + SZ / 2, p.dir === 1 ? H - BAND : BAND, 8, ['#ffffff55', theme().glow], 120, .35);
  }

  // glowing trail behind player
  if(Math.random() < .8){
    particles.push({x: PX + 2, y: p.y + SZ / 2 + rand(-8, 8), vx: -speed * .5, vy: rand(-20, 20), life: .3, max: .3, c: theme().glow, s: rand(2, 4), g: 0});
  }
}

/* ---- create new obstacles when needed ---- */
function spawnLogic(dt){
  spawnLeft -= speed * dt;
  if(spawnLeft <= 0) spawn();                   // spawner.js
}

/* ---- move obstacles and check crash ---- */
function updateObstacles(dt){
  for(const o of obstacles){
    o.x -= speed * dt;
    const b = hitbox(o);
    const hit = PX + 4 < b.x + b.w && PX + SZ - 4 > b.x && p.y + 4 < b.y + b.h && p.y + SZ - 4 > b.y;
    if(hit){ die(); break; }
  }
  obstacles = obstacles.filter(o => o.x + o.w > -20);
}

/* ---- coins, combo and bonus points ---- */
function updateCoins(dt){
  for(const c of coins){
    c.x -= speed * dt;
    const touched = Math.hypot(c.x - (PX + SZ / 2), c.y - (p.y + SZ / 2)) < SZ / 2 + 11;

    if(!c.got && touched){
      c.got = true; coinCount++; streak++;
      combo = Math.min(5, 1 + Math.floor(streak / 3));   // every 3 coins = +1 multiplier
      const pts = 10 * combo;
      bonus += pts;
      sfx.coin(combo);
      burst(c.x, c.y, 10, ['#ffd23f', '#fff'], 200, .4);
      popup(c.x, c.y - 14, '+' + pts, '#ffd23f');
    } else if(!c.got && c.x < -20 && !c.missed){
      c.missed = true; streak = 0; combo = 1;              // missed a coin: combo resets
    }
  }
  coins = coins.filter(c => c.x > -30 && !c.got);
}

/* ---- level up and "new best" live celebration ---- */
function updateLevel(){
  const s = score(), L = 1 + Math.floor(s / 300);

  if(L !== lvl){
    lvl = L; themeIdx = (L - 1) % themes.length;
    flash = .35; sfx.level();
    popup(W / 2, H / 2 - 30, 'LEVEL ' + L, '#fff');
  }

  if(best > 0 && !beatBestLive && s > best){
    beatBestLive = true; sfx.best(); flash = .3;
    popup(W / 2, H / 2 - 60, 'NEW BEST!', '#ffd23f');
    burst(W / 2, 60, 60, ['#ff5c7a', '#3df2e0', '#ffd23f', '#fff'], 380, 1.2, 500);
  }
}

/* ---- rotation, shake, sparks, floating text ---- */
function updateAnimations(dt){
  const target = p.dir === 1 ? 0 : Math.PI;
  p.rot += (target - p.rot) * Math.min(1, dt * 14);
  p.squash = Math.max(0, p.squash - dt * 6);
  shake *= Math.pow(.02, dt);
  flash = Math.max(0, flash - dt * 1.6);

  particles.forEach(q => { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; });
  particles = particles.filter(q => q.life > 0);
  texts.forEach(t => { t.life -= dt; t.y -= 40 * dt; });
  texts = texts.filter(t => t.life > 0);
}
