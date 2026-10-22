/* =====================================================
   game.js - NumFill game logic
   State, input, checking, score, lives, hints
   ===================================================== */

const S = {
  state: 'menu',          // menu | play | over
  level: 1, score: 0, lives: 3, hints: 3,
  P: null,                // current puzzle
  vals: null,             // numbers on board (0 = empty)
  locked: null,           // true for given cells and hinted cells
  hinted: new Set(),
  sel: null,              // selected cell [r, c]
  t0: 0, mistakes: 0, hintsLvl: 0, busy: false
};

function newRun(){
  S.level = 1; S.score = 0; S.lives = 3; S.hints = 3; S.state = 'play';
  hideOverlays();
  loadLevel();
}

function loadLevel(){
  S.P = makePuzzle(S.level);
  S.vals = S.P.given.map(r => r.slice());
  S.locked = S.P.given.map(r => r.map(v => v !== 0));
  S.hinted = new Set();
  S.mistakes = 0; S.hintsLvl = 0; S.busy = false;
  S.sel = nextBlank(-1, 0);
  S.t0 = performance.now();
  renderBoard(); updateAll();
}

/* ---------- Helpers ---------- */
function nextBlank(){                       // first cell the player can edit
  for(let r = 0; r < S.P.n; r++) for(let c = 0; c < S.P.n; c++) if(!S.locked[r][c]) return [r, c];
  return null;
}
function isFull(){ return S.vals.every(row => row.every(v => v > 0)); }

// 'ok' / 'bad' / '' for every row and column
function lineStatus(){
  const n = S.P.n, rows = [], cols = [];
  for(let i = 0; i < n; i++){
    const rv = S.vals[i], cv = S.vals.map(r => r[i]);
    rows.push(rv.every(v => v > 0) ? (rv.reduce((a, b) => a + b, 0) === S.P.rows[i].sum ? 'ok' : 'bad') : '');
    cols.push(cv.every(v => v > 0) ? (cv.reduce((a, b) => a + b, 0) === S.P.cols[i].sum ? 'ok' : 'bad') : '');
  }
  return {rows, cols};
}
const elapsed = () => (performance.now() - S.t0) / 1000;

/* ---------- Player actions ---------- */
function selectCell(r, c){
  if(S.state !== 'play' || S.busy || S.locked[r][c]) return;
  S.sel = [r, c]; updateBoard();
}

function moveSel(dr, dc){
  if(!S.sel) return;
  let [r, c] = S.sel;
  r += dr; c += dc;
  while(r >= 0 && c >= 0 && r < S.P.n && c < S.P.n){
    if(!S.locked[r][c]){ S.sel = [r, c]; updateBoard(); return; }
    r += dr; c += dc;
  }
}

function setValue(v){
  if(S.state !== 'play' || S.busy || !S.sel) return;
  const [r, c] = S.sel;
  if(S.locked[r][c]) return;
  S.vals[r][c] = v;
  updateBoard();
  if(v > 0 && isFull()) checkFull();
}

function checkFull(){
  const ls = lineStatus();
  const ok = ls.rows.every(s => s === 'ok') && ls.cols.every(s => s === 'ok');
  if(ok) levelClear(); else wrongBoard();
}

function wrongBoard(){
  S.lives--; S.mistakes++;
  shakeBoard(); updateHUD();
  if(S.lives <= 0){ S.busy = true; setTimeout(gameOver, 700); }
}

function levelClear(){
  S.busy = true;
  const sec = elapsed();
  let pts = 100 + 20 * S.level + Math.max(0, Math.round(60 - sec)) - 25 * S.hintsLvl;
  if(S.mistakes === 0) pts += 50;
  pts = Math.max(20, pts);
  S.score += pts;
  toast(`Level ${S.level} clear! +${pts}`);
  if(S.level % 3 === 0 && S.lives < 3){ S.lives++; }     // bonus life every 3 levels
  S.level++;
  updateHUD();
  setTimeout(loadLevel, 1000);
}

function useHint(){
  if(S.state !== 'play' || S.busy || S.hints <= 0) return;
  let t = null;
  if(S.sel && !S.locked[S.sel[0]][S.sel[1]]) t = S.sel;
  if(!t) t = nextBlank();
  if(!t) return;
  const [r, c] = t;
  S.vals[r][c] = S.P.sol[r][c];
  S.locked[r][c] = true; S.hinted.add(r + ',' + c);
  S.hints--; S.hintsLvl++;
  S.sel = nextBlank();
  updateBoard(); updateHUD();
  if(isFull()) checkFull();
}

function gameOver(){
  S.state = 'over';
  const newBest = saveResult(S.score);
  refreshStats();
  showOver(newBest);
}
