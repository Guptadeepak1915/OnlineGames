/* =====================================================
   ui.js - what happens on screen after a move, plus the
   menu, game over and "new game?" screens
   ===================================================== */

const OVERLAYS = ['menu', 'over', 'confirm'];
function showOverlay(id){ OVERLAYS.forEach(o => $(o).classList.toggle('hidden', o !== id)); }
function hideOverlays(){ OVERLAYS.forEach(o => $(o).classList.add('hidden')); }

const PHRASES = ['', 'Nice!', 'Great!', 'Excellent!', 'Incredible!'];

// called after every successful move
function afterPlace(res){
  renderGrid();
  res.piece.cells.forEach(([dr, dc]) => cellEls[(res.r + dr) * N + res.c + dc].classList.add('placed'));   // small "thunk" animation

  if(res.lines){
    UI.locked = true;
    res.cleared.forEach(({r, c, wood}) => {                      // keep the blocks visible while they break
      const el = cellEls[r * N + c];
      el.className = 'cell filled clearing w' + wood;
    });
    spawnChips(res.cleared);
    sfx.clear(res.lines);
    if(res.lines >= 2 || res.perfect) shakeBoard();
    let title = res.perfect ? 'PERFECT CLEAR!' : PHRASES[Math.min(res.lines, 4)];
    if(res.combo >= 2 && !res.perfect) title += `  Combo x${Math.min(5, res.combo)}`;
    popup(title, '+' + res.points);
    setTimeout(() => { renderGrid(); UI.locked = false; }, 360);
  }else sfx.place();

  renderTray(); renderHud();
  if(saveBest(G.score)) renderHud();
  saveGame();
  $('live').textContent = `Score ${G.score}`;
  if(res.over) setTimeout(finishRun, res.lines ? 1000 : 650);
}

/* ---------- End of a run ---------- */
function finishRun(){
  if(G.state !== 'over') return;
  const newBest = G.score > G.bestAtStart && G.score > 0;
  countPlay(); saveBest(G.score); store.del(STATE_KEY);
  sfx.over();
  $('oScore').textContent = G.score;
  $('oBest').textContent = best;
  $('oLines').textContent = G.lines;
  $('oMoves').textContent = G.moves;
  $('oBadge').classList.toggle('hidden', !newBest);
  $('oMsg').textContent = newBest ? 'A new personal best. Fine woodwork!'
    : best - G.score <= 50 ? `So close! Only ${best - G.score} points from your best.`
    : 'No more room for these blocks. Clear lines early to keep space free.';
  refreshStats(); showOverlay('over');
}

// ends a run that was left half way (new game button) so the play count and best stay correct
function abandonRun(){
  if(G.state === 'play' && G.moves > 0){ countPlay(); saveBest(G.score); }
}

function refreshStats(){
  $('mBest').textContent = best; $('mPlays').textContent = plays;
  $('best').textContent = Math.max(best, G.score); $('hdrBest').textContent = Math.max(best, G.score);
}
function updateSoundButton(){ $('btnSound').textContent = muted ? 'Sound off' : 'Sound on'; }
