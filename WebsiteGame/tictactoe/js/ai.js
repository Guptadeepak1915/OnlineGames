/* =====================================================
   ai.js - Computer player for Tic Tac Toe
   Easy: random. Medium: win/block. Hard: minimax (plans ahead)
   Pure functions only. No page code here.
   ===================================================== */

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// Returns {w:'X'|'O', line} if someone won, {w:'D'} for draw, or null if game continues
function winnerOf(b){
  for(const l of LINES){
    if(b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return {w: b[l[0]], line: l};
  }
  return b.includes('') ? null : {w: 'D', line: null};
}

const emptyCells = b => b.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
const pick = a => a[Math.floor(Math.random() * a.length)];

// Square where `p` can win right now (or -1)
function winningSquare(b, p){
  for(const i of emptyCells(b)){
    b[i] = p; const r = winnerOf(b); b[i] = '';
    if(r && r.w === p) return i;
  }
  return -1;
}

// Score of a position for player `me` (higher is better). Faster wins score higher.
// A cache (memo) remembers positions already solved, so Hard answers instantly.
const memo = new Map();
function minimax(b, turn, me){
  const key = b.join('|') + turn + me;
  if(memo.has(key)) return memo.get(key);

  const filled = b.filter(v => v).length;
  let result;
  const r = winnerOf(b);
  if(r) result = r.w === 'D' ? 0 : (r.w === me ? 10 - filled : filled - 10);
  else {
    const next = turn === 'X' ? 'O' : 'X';
    result = turn === me ? -Infinity : Infinity;
    for(const i of emptyCells(b)){
      b[i] = turn;
      const s = minimax(b, next, me);
      b[i] = '';
      result = turn === me ? Math.max(result, s) : Math.min(result, s);
    }
  }
  memo.set(key, result);
  return result;
}

function bestMove(b, me){
  const other = me === 'X' ? 'O' : 'X';
  let top = -Infinity, moves = [];
  for(const i of emptyCells(b)){
    b[i] = me;
    const s = minimax(b, other, me);
    b[i] = '';
    if(s > top){ top = s; moves = [i]; } else if(s === top) moves.push(i);
  }
  const strong = moves.filter(i => [4, 0, 2, 6, 8].includes(i));   // prefer centre and corners
  return pick(strong.length ? strong : moves);
}

/* Choose the computer move.
   blunder = chance (0 to 1) that Hard plays a random move (so a human can win sometimes) */
function cpuMove(b, me, diff, blunder = 0.12){
  const other = me === 'X' ? 'O' : 'X';
  const free = emptyCells(b);
  if(diff === 'easy') return pick(free);

  if(diff === 'medium'){
    let m = winningSquare(b, me); if(m >= 0) return m;
    m = winningSquare(b, other);  if(m >= 0) return m;
    if(b[4] === '') return 4;
    const corners = [0, 2, 6, 8].filter(i => b[i] === '');
    return corners.length ? pick(corners) : pick(free);
  }

  // hard
  if(Math.random() < blunder) return pick(free);
  return bestMove(b, me);
}
