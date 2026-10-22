/* =====================================================
   ui.js - Draws the board, HUD, overlays and toast
   ===================================================== */

const $ = id => document.getElementById(id);
let cellEls = [], rowEls = [], colEls = [];

function renderBoard(){
  const n = S.P.n, board = $('board');
  board.style.gridTemplateColumns = `repeat(${n}, var(--cell)) auto`;
  board.innerHTML = '';
  cellEls = []; rowEls = []; colEls = [];

  for(let r = 0; r < n; r++){
    cellEls[r] = [];
    for(let c = 0; c < n; c++){
      const b = document.createElement('button');
      b.className = 'cell'; b.dataset.r = r; b.dataset.c = c;
      board.appendChild(b); cellEls[r][c] = b;
    }
    const clue = document.createElement('div');
    clue.className = 'clue row'; clue.innerHTML = clueHTML(S.P.rows[r]);
    board.appendChild(clue); rowEls[r] = clue;
  }
  for(let c = 0; c < n; c++){
    const clue = document.createElement('div');
    clue.className = 'clue col'; clue.innerHTML = clueHTML(S.P.cols[c]);
    board.appendChild(clue); colEls[c] = clue;
  }
  const corner = document.createElement('div'); corner.className = 'clue corner'; board.appendChild(corner);
}

function clueHTML(cl){
  return cl.d ? `<small>sum ÷ ${cl.d}</small><b>= ${cl.q}</b>` : `<small>sum</small><b>= ${cl.sum}</b>`;
}

function updateBoard(){
  const n = S.P.n, ls = lineStatus();
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++){
    const el = cellEls[r][c], v = S.vals[r][c], locked = S.locked[r][c];
    el.textContent = v || '';
    el.className = 'cell'
      + (locked ? '' : ' blank')
      + (S.hinted.has(r + ',' + c) ? ' hinted' : '')
      + (S.sel && S.sel[0] === r && S.sel[1] === c ? ' sel' : '')
      + (!locked && v && (ls.rows[r] === 'bad' || ls.cols[c] === 'bad') ? ' bad' : '');
  }
  for(let i = 0; i < n; i++){
    rowEls[i].className = 'clue row ' + ls.rows[i];
    colEls[i].className = 'clue col ' + ls.cols[i];
  }
}

function updateHUD(){
  $('hLevel').textContent = S.level;
  $('hScore').textContent = S.score;
  $('hLives').textContent = '♥'.repeat(Math.max(0, S.lives)) + '♡'.repeat(Math.max(0, 3 - S.lives));
  $('hintBtn').textContent = `Hint (${S.hints} left)`;
  $('hintBtn').disabled = S.hints <= 0;
}
function updateAll(){ updateBoard(); updateHUD(); }

function updateTime(){
  if(S.state !== 'play' || S.busy) return;
  const s = Math.floor(elapsed());
  $('hTime').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

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
  $('oLevel').textContent = Math.max(1, S.level);
  $('oBadge').classList.toggle('hidden', !newBest);
  $('oMsg').textContent = newBest ? 'That is your highest score ever!'
    : best - S.score <= 50 ? `So close! Only ${best - S.score} points from your best.`
    : 'Start with lines that have only one empty box.';
  $('over').classList.remove('hidden');
}
