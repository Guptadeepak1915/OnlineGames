"use strict";

// Puzzle generation, rules, and hint solver.
/* ---------- 4. Seeded random (same daily puzzle for everyone) ---------- */
function hashString(str) {
  // xmur3
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 5. Puzzle rules ---------- */
// A board is a flat list. 0 is the empty space. Solved = 1, 2, 3 ... N-1, 0
const solvedBoard = (n) => {
  const a = Array.from({ length: n * n - 1 }, (_, i) => i + 1);
  a.push(0);
  return a;
};

function isSolved(b) {
  const last = b.length - 1;
  for (let i = 0; i < last; i++) if (b[i] !== i + 1) return false;
  return b[last] === 0;
}
function inversions(b) {
  let inv = 0;
  for (let i = 0; i < b.length; i++) {
    if (!b[i]) continue;
    for (let j = i + 1; j < b.length; j++) if (b[j] && b[i] > b[j]) inv++;
  }
  return inv;
}
// Half of all shuffles can never be solved. This is the standard rule that tells them apart.
function isSolvable(b, n) {
  const inv = inversions(b);
  if (n % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(b.indexOf(0) / n);
  return rowFromBottom % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
}
function manhattan(b, n) {
  let sum = 0;
  for (let i = 0; i < b.length; i++) {
    const v = b[i];
    if (!v) continue;
    sum +=
      Math.abs(Math.floor(i / n) - Math.floor((v - 1) / n)) +
      Math.abs((i % n) - ((v - 1) % n));
  }
  return sum;
}
// Always returns a solvable board that is not (nearly) solved already.
function makeBoard(n, rng = Math.random) {
  const minScatter = Math.max(6, Math.round(n * n * 0.6));
  let b;
  do {
    b = solvedBoard(n);
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    if (!isSolvable(b, n)) {
      // swapping two tiles flips the answer
      const idx = [];
      for (let k = 0; k < b.length && idx.length < 2; k++)
        if (b[k] !== 0) idx.push(k);
      [b[idx[0]], b[idx[1]]] = [b[idx[1]], b[idx[0]]];
    }
  } while (isSolved(b) || manhattan(b, n) < minScatter);
  return b;
}

/* ---------- 6. Hint solver (weighted A*, Manhattan distance + linear conflict) ---------- */
const solvers = {};
function getSolver(n) {
  return solvers[n] || (solvers[n] = createSolver(n));
}

function createSolver(n) {
  const N = n * n,
    gr = new Int8Array(N + 1),
    gc = new Int8Array(N + 1);
  for (let v = 1; v < N; v++) {
    gr[v] = Math.floor((v - 1) / n);
    gc[v] = (v - 1) % n;
  }
  const keyOf = (s) => String.fromCharCode.apply(null, s);

  function heuristic(s) {
    let h = 0;
    for (let i = 0; i < N; i++) {
      const v = s[i];
      if (v)
        h += Math.abs(Math.floor(i / n) - gr[v]) + Math.abs((i % n) - gc[v]);
    }
    for (let r = 0; r < n; r++) {
      // two tiles in their own row but in the wrong order cost 2 extra moves
      const line = [];
      for (let c = 0; c < n; c++) {
        const v = s[r * n + c];
        if (v && gr[v] === r) line.push(gc[v]);
      }
      h += 2 * conflictRemovals(line);
    }
    for (let c = 0; c < n; c++) {
      const line = [];
      for (let r = 0; r < n; r++) {
        const v = s[r * n + c];
        if (v && gc[v] === c) line.push(gr[v]);
      }
      h += 2 * conflictRemovals(line);
    }
    return h;
  }
  function conflictRemovals(goals) {
    const m = goals.length;
    if (m < 2) return 0;
    const cnt = new Array(m).fill(0);
    for (let i = 0; i < m; i++)
      for (let j = i + 1; j < m; j++)
        if (goals[i] > goals[j]) {
          cnt[i]++;
          cnt[j]++;
        }
    let removed = 0;
    for (;;) {
      let mx = 0,
        at = -1;
      for (let i = 0; i < m; i++)
        if (cnt[i] > mx) {
          mx = cnt[i];
          at = i;
        }
      if (at < 0) return removed;
      removed++;
      for (let j = 0; j < m; j++) {
        if (j === at) continue;
        if (
          (at < j && goals[at] > goals[j]) ||
          (j < at && goals[j] > goals[at])
        ) {
          if (cnt[j] > 0) cnt[j]--;
        }
      }
      cnt[at] = 0;
    }
  }

  class Heap {
    constructor() {
      this.a = [];
    }
    get size() {
      return this.a.length;
    }
    less(x, y) {
      return x.f < y.f || (x.f === y.f && x.h < y.h);
    }
    push(x) {
      const a = this.a;
      a.push(x);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!this.less(a[i], a[p])) break;
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
      }
    }
    pop() {
      const a = this.a,
        top = a[0],
        last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1,
            r = l + 1;
          let m = i;
          if (l < a.length && this.less(a[l], a[m])) m = l;
          if (r < a.length && this.less(a[r], a[m])) m = r;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]];
          i = m;
        }
      }
      return top;
    }
  }

  // Returns {path: [tile numbers to slide, in order], solved, nodes}. If the limits are hit, path leads to the best position found.
  function solve(start, opts) {
    const weight = opts.weight,
      maxNodes = opts.maxNodes,
      maxMs = opts.maxMs,
      t0 = Date.now();
    const h0 = heuristic(start);
    const root = {
      s: start.slice(),
      g: 0,
      h: h0,
      f: h0 * weight,
      parent: null,
      move: 0,
      blank: start.indexOf(0),
    };
    const open = new Heap();
    open.push(root);
    const seen = new Map();
    seen.set(keyOf(root.s), 0);
    let bestNode = root,
      nodes = 0;
    while (open.size) {
      const cur = open.pop();
      if (cur.h === 0) return { path: trace(cur), solved: true, nodes };
      if (cur.h < bestNode.h || (cur.h === bestNode.h && cur.g < bestNode.g))
        bestNode = cur;
      if (
        ++nodes > maxNodes ||
        ((nodes & 255) === 0 && Date.now() - t0 > maxMs)
      )
        break;
      const b = cur.blank,
        br = Math.floor(b / n),
        bc = b % n;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const r = br + dr,
          c = bc + dc;
        if (r < 0 || c < 0 || r >= n || c >= n) continue;
        const ti = r * n + c,
          tile = cur.s[ti];
        if (tile === cur.move) continue; // never undo the move just made
        const s = cur.s.slice();
        s[b] = tile;
        s[ti] = 0;
        const g = cur.g + 1,
          k = keyOf(s),
          old = seen.get(k);
        if (old !== undefined && old <= g) continue;
        seen.set(k, g);
        const h = heuristic(s);
        open.push({
          s,
          g,
          h,
          f: g + h * weight,
          parent: cur,
          move: tile,
          blank: ti,
        });
      }
    }
    return { path: trace(bestNode), solved: false, nodes };
  }
  function trace(node) {
    const p = [];
    for (let x = node; x && x.parent; x = x.parent) p.push(x.move);
    return p.reverse();
  }
  return { solve, heuristic };
}
