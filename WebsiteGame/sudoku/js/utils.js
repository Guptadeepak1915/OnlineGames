/* =====================================================
   utils.js - shared Sudoku display and grid helpers
   ===================================================== */
const $ = (id) => document.getElementById(id);

function rowOf(i) {
  return Math.floor(i / G.n);
}

function colOf(i) {
  return i % G.n;
}

function isPeer(a, b) {
  return (
    a !== b &&
    (rowOf(a) === rowOf(b) ||
      colOf(a) === colOf(b) ||
      (Math.floor(rowOf(a) / 3) === Math.floor(rowOf(b) / 3) &&
        Math.floor(colOf(a) / 3) === Math.floor(colOf(b) / 3)))
  );
}

function conflictSet() {
  const conflicts = new Set();
  for (let i = 0; i < G.vals.length; i++) {
    const value = G.vals[i];
    if (!value) continue;
    for (let j = i + 1; j < G.vals.length; j++) {
      if (G.vals[j] === value && isPeer(i, j)) {
        conflicts.add(i);
        conflicts.add(j);
      }
    }
  }
  return conflicts;
}

function remaining(value) {
  return G.n - G.vals.filter((v) => v === value).length;
}

function fmtTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
