export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const solvedBoard = (n) => {
  const board = Array.from({ length: n * n - 1 }, (_, i) => i + 1);
  board.push(0);
  return board;
};

export function isSolved(board) {
  const last = board.length - 1;
  for (let i = 0; i < last; i++) if (board[i] !== i + 1) return false;
  return board[last] === 0;
}

function inversions(board) {
  let inv = 0;
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    for (let j = i + 1; j < board.length; j++)
      if (board[j] && board[i] > board[j]) inv++;
  }
  return inv;
}

function isSolvable(board, n) {
  const inv = inversions(board);
  if (n % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(board.indexOf(0) / n);
  return rowFromBottom % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
}

export function manhattan(board, n) {
  let sum = 0;
  for (let i = 0; i < board.length; i++) {
    const value = board[i];
    if (!value) continue;
    sum +=
      Math.abs(Math.floor(i / n) - Math.floor((value - 1) / n)) +
      Math.abs((i % n) - ((value - 1) % n));
  }
  return sum;
}

export function makeBoard(n, rng = Math.random) {
  const minScatter = Math.max(6, Math.round(n * n * 0.6));
  let board;
  do {
    board = solvedBoard(n);
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
    if (!isSolvable(board, n)) {
      const idx = [];
      for (let k = 0; k < board.length && idx.length < 2; k++)
        if (board[k] !== 0) idx.push(k);
      [board[idx[0]], board[idx[1]]] = [board[idx[1]], board[idx[0]]];
    }
  } while (isSolved(board) || manhattan(board, n) < minScatter);
  return board;
}
