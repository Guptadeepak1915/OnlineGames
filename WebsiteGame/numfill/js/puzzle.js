/* =====================================================
   puzzle.js - Makes a puzzle that has exactly ONE answer
   Used by game.js. Difficulty is set in sizeForLevel()
   and blanksForLevel().
   ===================================================== */

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Bigger grid and more blanks as level grows
function sizeForLevel(l) {
  return l <= 2 ? 3 : l <= 4 ? 4 : 5;
}
function blanksForLevel(l) {
  if (l <= 2) return 2 + l; // 3, 4
  if (l <= 4) return 3 + l; // 6, 7  (4x4)
  return Math.min(9, 6 + Math.floor((l - 5) / 2)); // 6..9 (5x5)
}

// Clue for one line. "sum ÷ d = q" if sum divides by 2..9, else plain sum.
function makeClue(sum) {
  const ds = [];
  for (let d = 2; d <= 9; d++) if (sum % d === 0) ds.push(d);
  if (!ds.length) return { sum, d: 0, q: sum };
  const d = ds[rnd(0, ds.length - 1)];
  return { sum, d, q: sum / d };
}

// Count solutions (stops at 2). g has 0 for blank cells.
function countSolutions(n, g, rowT, colT) {
  const blanks = [];
  const rs = Array(n).fill(0),
    cs = Array(n).fill(0),
    rr = Array(n).fill(0),
    cr = Array(n).fill(0);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (g[r][c] === 0) {
        blanks.push([r, c]);
        rr[r]++;
        cr[c]++;
      } else {
        rs[r] += g[r][c];
        cs[c] += g[r][c];
      }
    }
  let count = 0,
    nodes = 0;
  function dfs(i) {
    if (count > 1 || nodes > 150000) return;
    if (i === blanks.length) {
      count++;
      return;
    }
    const [r, c] = blanks[i];
    rr[r]--;
    cr[c]--;
    for (let v = 1; v <= 9; v++) {
      nodes++;
      const nr = rs[r] + v,
        nc = cs[c] + v;
      if (nr + rr[r] > rowT[r] || nr + rr[r] * 9 < rowT[r]) continue;
      if (nc + cr[c] > colT[c] || nc + cr[c] * 9 < colT[c]) continue;
      rs[r] = nr;
      cs[c] = nc;
      dfs(i + 1);
      rs[r] -= v;
      cs[c] -= v;
      if (count > 1) break;
    }
    rr[r]++;
    cr[c]++;
  }
  dfs(0);
  return nodes > 150000 ? 2 : count;
}

function makePuzzle(level) {
  const n = sizeForLevel(level);
  for (let k = blanksForLevel(level); k >= 1; k--) {
    for (let t = 0; t < 150; t++) {
      const sol = Array.from({ length: n }, () =>
        Array.from({ length: n }, () => rnd(1, 9)),
      );
      const rowT = sol.map((r) => r.reduce((a, b) => a + b, 0));
      const colT = Array.from({ length: n }, (_, c) =>
        sol.reduce((a, r) => a + r[c], 0),
      );

      const cells = [];
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) cells.push([r, c]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = rnd(0, i);
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }

      const given = sol.map((r) => r.slice());
      cells.slice(0, k).forEach(([r, c]) => (given[r][c] = 0));

      if (countSolutions(n, given, rowT, colT) === 1) {
        return {
          n,
          sol,
          given,
          rows: rowT.map(makeClue),
          cols: colT.map(makeClue),
          blanks: k,
        };
      }
    }
  }
}
