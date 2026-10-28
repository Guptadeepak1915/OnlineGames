/* =====================================================
   render.js - Draws everything on the canvas.
   This file only draws. It does not change game state.
   ===================================================== */

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

function layout(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || W;
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * H / W);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}

function rr(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function draw(time){
  ctx.save();
  if(G.shake > .5) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1240'); g.addColorStop(1, '#2a0f2e');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for(let x = 0; x <= W; x += 40){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for(let y = 0; y <= H; y += 40){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  G.bricks.forEach(drawBrick);
  drawDrops();
  drawBalls();
  drawPaddle();

  // sparks
  G.parts.forEach(q => { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, q.s, q.s); });
  ctx.globalAlpha = 1;

  // floating text
  ctx.textAlign = 'center'; ctx.font = '16px Bungee, Impact, sans-serif';
  G.texts.forEach(t => { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = '#fff'; ctx.fillText(t.t, t.x, t.y); });
  ctx.globalAlpha = 1;

  drawStatus();
  if(G.state === 'ready'){
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '18px Nunito, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Tap or press Space to launch', W / 2, H / 2 + 120);
  }
  if(G.flash > 0){ ctx.fillStyle = `rgba(255,255,255,${G.flash * .5})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
  ctx.restore();
}

function drawBrick(br){
  if(!br.alive) return;
  ctx.fillStyle = br.flash > 0 ? '#ffffff' : br.color;
  rr(br.x, br.y, br.w, br.h, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(br.x + 2, br.y + 2, br.w - 4, 6, 3); ctx.fill();       // shine
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(br.x + 3, br.y + br.h - 5, br.w - 6, 3);          // shadow
  ctx.textAlign = 'center'; ctx.font = '14px Bungee, Impact, sans-serif';
  if(br.type === 'X'){ ctx.fillStyle = '#4a1500'; ctx.fillText('X', br.x + br.w / 2, br.y + br.h - 6); }
  else if(br.type === 'P'){ ctx.fillStyle = '#5a4200'; ctx.fillText('+', br.x + br.w / 2, br.y + br.h - 6); }
  else if(br.type === 'S'){ ctx.fillStyle = '#9d9ab5'; [8, br.w - 8].forEach(x => { ctx.beginPath(); ctx.arc(br.x + x, br.y + br.h / 2, 2.5, 0, 7); ctx.fill(); }); }
  else if(br.type === 'T' && br.hp < br.maxhp){                                                       // cracks after the first hit
    ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(br.x + 14, br.y + 2); ctx.lineTo(br.x + 22, br.y + 11); ctx.lineTo(br.x + 17, br.y + br.h - 2);
    ctx.moveTo(br.x + 22, br.y + 11); ctx.lineTo(br.x + 36, br.y + 14); ctx.stroke();
  }
}

function drawDrops(){
  G.drops.forEach(d => {
    const P = POWER[d.type];
    ctx.fillStyle = P.color; ctx.shadowColor = P.color; ctx.shadowBlur = 12;
    rr(d.x - 14, d.y - 10, 28, 20, 10); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#120d2b'; ctx.font = '14px Bungee, Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(P.label, d.x, d.y + 5);
  });
}

function drawBalls(){
  const fire = G.fx.fire > 0, col = fire ? '#ff9f43' : '#ffffff';
  G.balls.forEach(b => {
    b.trail.forEach((t, i) => {                       // trail
      ctx.globalAlpha = (i + 1) / b.trail.length * .35; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * (i + 1) / b.trail.length, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.shadowColor = fire ? '#ff5c2a' : '#3df2e0'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  });
}

function drawPaddle(){
  const p = G.paddle, x = p.x - p.w / 2;
  const g = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H); g.addColorStop(0, '#7ffbf0'); g.addColorStop(1, '#1c9d92');
  ctx.fillStyle = g; ctx.shadowColor = '#3df2e0'; ctx.shadowBlur = 14;
  rr(x, PADDLE_Y, p.w, PADDLE_H, 7); ctx.fill(); ctx.shadowBlur = 0;
}

// small badges for active power-ups, top left
function drawStatus(){
  const items = [['WIDE', G.fx.wide, '#3df2e0'], ['SLOW', G.fx.slow, '#7fb0ff'], ['FIRE', G.fx.fire, '#ff9f43']].filter(i => i[1] > 0);
  ctx.textAlign = 'left'; ctx.font = '12px Nunito, Arial, sans-serif';
  items.forEach((it, i) => {
    const x = 8 + i * 72, y = H - 20;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x, y - 12, 66, 18, 9); ctx.fill();
    ctx.fillStyle = it[2]; ctx.fillText(`${it[0]} ${Math.ceil(it[1])}s`, x + 8, y + 1);
  });
}
