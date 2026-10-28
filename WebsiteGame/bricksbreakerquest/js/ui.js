/* =====================================================
   ui.js - HTML screens (menu, quest card, level clear,
   pause, game over) and the numbers at the top
   ===================================================== */

const $ = id => document.getElementById(id);
const OVERLAYS = ['menu', 'intro', 'clear', 'pause', 'over'];

function hideOverlays(){ OVERLAYS.forEach(id => $(id).classList.add('hidden')); }
function show(id){ hideOverlays(); $(id).classList.remove('hidden'); }

function updateHUD(){
  $('hLevel').textContent = G.level;
  $('hScore').textContent = G.score;
  $('hLives').textContent = '♥'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, MAX_LIVES - G.lives));
  $('hCombo').textContent = 'x' + G.mult;
  $('pauseBtn').textContent = G.state === 'paused' ? 'Resume' : 'Pause';
}

function refreshStats(){
  $('hdrBest').textContent = best; $('mBest').textContent = best; $('mPlays').textContent = plays;
}

function updateSoundButton(){ $('soundBtn').textContent = muted ? 'Sound off' : 'Sound on'; }

/* ---------- Level quest card ---------- */
function showIntro(){
  $('iTitle').textContent = `Level ${G.level}`;
  $('iSub').textContent = G.name;
  $('iGoals').innerHTML = `
    <li><b>Quest:</b> break all ${G.breakable} bricks.</li>
    <li><b>★ Star 2:</b> finish without losing a life.</li>
    <li><b>★ Star 3:</b> finish in under ${G.par} seconds.</li>`;
  show('intro');
}

/* ---------- Level clear ---------- */
function showClear(r){
  $('cTitle').textContent = `Level ${G.level} clear!`;
  $('cStars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= G.stars ? 'on' : ''}">★</span>`).join('');
  $('cMsg').textContent = `+${r.bonus} bonus points. ` +
    (r.noLoss ? '' : 'You lost a life, so no star for that. ') + (r.fast ? '' : `Finish in under ${G.par}s for the 3rd star. `) + r.lifeMsg;
  $('cScore').textContent = G.score;
  $('cTime').textContent = Math.round(G.playTime) + 's';
  show('clear');
}

function showPause(on){ if(on) show('pause'); else hideOverlays(); }

/* ---------- Game over ---------- */
function showOver(newBest){
  $('oScore').textContent = G.score;
  $('oBest').textContent = best;
  $('oLevel').textContent = G.level;
  $('oBadge').classList.toggle('hidden', !newBest);
  $('oMsg').textContent = newBest ? 'That is your highest score ever!'
    : best - G.score <= 300 ? `So close! Only ${best - G.score} points from your best.`
    : 'Use the edge of the paddle to aim the ball and go for the gold bricks.';
  show('over');
}
