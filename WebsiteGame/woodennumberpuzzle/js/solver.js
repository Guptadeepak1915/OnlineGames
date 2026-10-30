const solvers = {};

export function getSolver(n) {
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
  const keyOf = (state) => String.fromCharCode.apply(null, state);

  function heuristic(state) {
    let h = 0;
    for (let i = 0; i < N; i++) {
      const value = state[i];
      if (value)
        h +=
          Math.abs(Math.floor(i / n) - gr[value]) +
          Math.abs((i % n) - gc[value]);
    }
    for (let r = 0; r < n; r++) {
      const line = [];
      for (let c = 0; c < n; c++) {
        const value = state[r * n + c];
        if (value && gr[value] === r) line.push(gc[value]);
      }
      h += 2 * conflictRemovals(line);
    }
    for (let c = 0; c < n; c++) {
      const line = [];
      for (let r = 0; r < n; r++) {
        const value = state[r * n + c];
        if (value && gc[value] === c) line.push(gr[value]);
      }
      h += 2 * conflictRemovals(line);
    }
    return h;
  }

  function conflictRemovals(goals) {
    const count = goals.length;
    if (count < 2) return 0;
    const conflicts = new Array(count).fill(0);
    for (let i = 0; i < count; i++)
      for (let j = i + 1; j < count; j++)
        if (goals[i] > goals[j]) {
          conflicts[i]++;
          conflicts[j]++;
        }
    let removed = 0;
    for (;;) {
      let max = 0,
        at = -1;
      for (let i = 0; i < count; i++)
        if (conflicts[i] > max) {
          max = conflicts[i];
          at = i;
        }
      if (at < 0) return removed;
      removed++;
      for (let j = 0; j < count; j++) {
        if (j === at) continue;
        if (
          (at < j && goals[at] > goals[j]) ||
          (j < at && goals[j] > goals[at])
        ) {
          if (conflicts[j] > 0) conflicts[j]--;
        }
      }
      conflicts[at] = 0;
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

  function solve(start, opts) {
    const { weight, maxNodes, maxMs } = opts,
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
        if (tile === cur.move) continue;
        const state = cur.s.slice();
        state[b] = tile;
        state[ti] = 0;
        const g = cur.g + 1,
          key = keyOf(state),
          old = seen.get(key);
        if (old !== undefined && old <= g) continue;
        seen.set(key, g);
        const h = heuristic(state);
        open.push({
          s: state,
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
    const path = [];
    for (let current = node; current && current.parent; current = current.parent)
      path.push(current.move);
    return path.reverse();
  }
  return { solve, heuristic };
}
