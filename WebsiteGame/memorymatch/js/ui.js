/* =====================================================
   ui.js - Draws cards, HUD, overlays and messages
   ===================================================== */

const $ = id => document.getElementById(id);
let tileEls = [];

function renderBoard(){
  const board = $('board');
  board.style.setProperty('--cols', colsFor(S.pairs));
  board.innerHTML = '';
  tileEls = S.tiles.map((t, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.i = i;
    b.innerHTML = '<span class="face back">?</span><span class="face front"></span>';
    const front = b.querySelector('.front');
    front.textContent = SYMS[t.sym][0]; front.style.color = SYMS[t.sym][1];
    board.appendChild(b);
    return b;
  });
  updateBoard();
}

function updateBoard(){
  S.tiles.forEach((t, i) => {
    const el = tileEls[i]; if(!el) return;
    el.className = 'tile' + (t.up ? ' up' : '') + (t.done ? ' done' : '');
    el.setAttribute('aria-label', t.up || t.done ? 'Card ' + SYMS[t.sym][0] : 'Hidden card');
  });
}

function updateHUD(){
  $('hLevel').textContent = S.level;
  $('hScore').textContent = S.score;
  $('hLives').textContent = '♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, MAX_LIVES - S.lives));
  $('hCombo').textContent = 'x' + Math.min(5, Math.max(1, S.combo));
}
function updateAll(){ updateBoard(); updateHUD(); }

function setStatus(t){ $('status').textContent = t; }

function shakeBoard(){
  const b = $('board'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
}

function toast(t){
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1400);
}

function hideOverlays(){ $('menu').classList.add('hidden'); $('over').classList.add('hidden'); }

function refreshStats(){
  $('hdrBest').textContent = best; $('mBest').textContent = best; $('mPlays').textContent = plays;
}

function showOver(newBest){
  $('oScore').textContent = S.score;
  $('oBest').textContent = best;
  $('oLevel').textContent = S.level;
  $('oBadge').classList.toggle('hidden', !newBest);
  $('oMsg').textContent = newBest ? 'That is your highest score ever!'
    : best - S.score <= 50 ? `So close! Only ${best - S.score} points from your best.`
    : 'Try flipping cards in a fixed order to remember them better.';
  $('over').classList.remove('hidden');
}
