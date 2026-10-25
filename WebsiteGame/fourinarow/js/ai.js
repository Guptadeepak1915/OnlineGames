/* =====================================================
   ai.js - Board rules and the computer player
   Easy: random. Medium: win / block / stay safe.
   Hard: looks 5 moves ahead (minimax with alpha-beta).
   Board: 6 rows x 7 columns. Row 0 is the TOP row.
   Cells hold '' (empty), 'R' (red) or 'Y' (yellow).
   ===================================================== */

const ROWS = 6, COLS = 7;
const ORDER = [3, 2, 4, 1, 5, 0, 6];                       // centre columns first (better for search)
const DIRS4 = [[0, 1], [1, 0], [1, 1], [1, -1]];

const newBoard = () => Array.from({length: ROWS}, () => Array(COLS).fill(''));
const other = p => p === 'R' ? 'Y' : 'R';
const pick = a => a[Math.floor(Math.random() * a.length)];

const validCols = b => ORDER.filter(c => b[0][c] === '');
const isFull = b => b[0].every(v => v !== '');
function dropRow(b, c){ for(let r = ROWS - 1; r >= 0; r--) if(b[r][c] === '') return r; return -1; }

// Cells of the winning line through (r,c) for player p, or null
function winLine(b, r, c, p){
  for(const [dr, dc] of DIRS4){
    const cells = [[r, c]];
    for(const s of [1, -1]){
      let rr = r + dr * s, cc = c + dc * s;
      while(rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === p){
        cells.push([rr, cc]); rr += dr * s; cc += dc * s;
      }
    }
    if(cells.length >= 4) return cells;
  }
  return null;
}
const winAt = (b, r, c, p) => !!winLine(b, r, c, p);

// Column where player p can win right now (or -1)
function winningCol(b, p){
  for(const c of validCols(b)){
    const r = dropRow(b, c); b[r][c] = p;
    const w = winAt(b, r, c, p); b[r][c] = '';
    if(w) return c;
  }
  return -1;
}

// Is it safe for `me` to play column c? (opponent must not win straight away)
function isSafe(b, c, me){
  const r = dropRow(b, c); b[r][c] = me;
  const bad = winningCol(b, other(me)) >= 0;
  b[r][c] = '';
  return !bad;
}

/* ---------- Position score (used by Hard) ---------- */
function windowScore(cells, me){
  let m = 0, o = 0, e = 0;
  for(const v of cells){ if(v === me) m++; else if(v === '') e++; else o++; }
  if(m === 3 && e === 1) return 5;
  if(m === 2 && e === 2) return 2;
  if(o === 3 && e === 1) return -4;
  return 0;
}

function evaluate(b, me){
  let s = 0;
  for(let r = 0; r < ROWS; r++) if(b[r][3] === me) s += 3;                   // centre column is strong
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    for(const [dr, dc] of DIRS4){
      const er = r + dr * 3, ec = c + dc * 3;
      if(er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
      s += windowScore([b[r][c], b[r + dr][c + dc], b[r + dr * 2][c + dc * 2], b[er][ec]], me);
    }
  }
  return s;
}

// Minimax with alpha-beta. Score is from the point of view of `me`.
function search(b, depth, alpha, beta, turn, me){
  const cols = validCols(b);
  if(!cols.length) return 0;
  if(depth === 0) return evaluate(b, me);
  const maximizing = turn === me;
  let v = maximizing ? -Infinity : Infinity;
  for(const c of cols){
    const r = dropRow(b, c); b[r][c] = turn;
    const s = winAt(b, r, c, turn) ? (maximizing ? 100000 + depth : -(100000 + depth))
                                   : search(b, depth - 1, alpha, beta, other(turn), me);
    b[r][c] = '';
    if(maximizing){ v = Math.max(v, s); alpha = Math.max(alpha, v); }
    else { v = Math.min(v, s); beta = Math.min(beta, v); }
    if(alpha >= beta) break;
  }
  return v;
}

function bestMove(b, me, depth){
  let top = -Infinity, moves = [];
  for(const c of validCols(b)){
    const r = dropRow(b, c); b[r][c] = me;
    const s = winAt(b, r, c, me) ? 100000 + depth + 1 : search(b, depth - 1, -Infinity, Infinity, other(me), me);
    b[r][c] = '';
    if(s > top){ top = s; moves = [c]; } else if(s === top) moves.push(c);
  }
  return moves[0] === undefined ? pick(validCols(b)) : pick(moves);
}

/* Choose the computer move.
   blunder = chance (0 to 1) that Hard plays a safe random move, so a human can win sometimes */
function cpuMove(b, me, diff, blunder = 0.1){
  const cols = validCols(b);
  if(diff === 'easy') return pick(cols);

  const safe = cols.filter(c => isSafe(b, c, me));

  if(diff === 'medium'){
    let c = winningCol(b, me); if(c >= 0) return c;
    c = winningCol(b, other(me)); if(c >= 0) return c;
    const pool = safe.length ? safe : cols;
    const weights = [1, 2, 3, 5, 3, 2, 1], bag = [];
    pool.forEach(col => { for(let i = 0; i < weights[col]; i++) bag.push(col); });
    return pick(bag);
  }

  // hard
  if(Math.random() < blunder){
    const c = winningCol(b, me); if(c >= 0) return c;
    return pick(safe.length ? safe : cols);
  }
  return bestMove(b, me, 5);
}
