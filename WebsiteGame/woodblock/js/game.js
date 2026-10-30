/* =====================================================
   game.js - all the rules of Wood Block Puzzle.
   No drawing here. render.js and input.js use these functions.
   ===================================================== */

const N = 8; // board is 8 x 8
const TRAY_SIZE = 3; // 3 blocks to choose from

const G = {
  grid: null, // 8 x 8, each cell is null or {wood, angle}
  tray: [null, null, null], // pieces waiting to be placed
  score: 0,
  combo: 0,
  lines: 0,
  moves: 0,
  perfects: 0,
  state: "menu", // menu | play | over
  bestAtStart: 0,
};

const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(null));

/* ---------- Checking the board ---------- */
function canPlace(grid, piece, r, c) {
  return piece.cells.every(([dr, dc]) => {
    const rr = r + dr,
      cc = c + dc;
    return rr >= 0 && cc >= 0 && rr < N && cc < N && !grid[rr][cc];
  });
}
function fitsAnywhere(grid, piece) {
  for (let r = 0; r <= N - piece.h; r++)
    for (let c = 0; c <= N - piece.w; c++)
      if (canPlace(grid, piece, r, c)) return true;
  return false;
}
const anyFits = (grid, tray) => tray.some((p) => p && fitsAnywhere(grid, p));

function fullLines(grid) {
  const rows = [],
    cols = [];
  for (let r = 0; r < N; r++) if (grid[r].every(Boolean)) rows.push(r);
  for (let c = 0; c < N; c++) if (grid.every((row) => row[c])) cols.push(c);
  return { rows, cols };
}
// which rows and columns would be cleared if this piece was placed here (used for the glow preview)
function previewLines(grid, piece, r, c) {
  const filled = grid.map((row) => row.map(Boolean));
  piece.cells.forEach(([dr, dc]) => {
    filled[r + dr][c + dc] = true;
  });
  const rows = [],
    cols = [];
  for (let i = 0; i < N; i++) {
    if (filled[i].every(Boolean)) rows.push(i);
    if (filled.every((row) => row[i])) cols.push(i);
  }
  return { rows, cols };
}
function occupancy(grid) {
  let n = 0;
  grid.forEach((row) =>
    row.forEach((v) => {
      if (v) n++;
    }),
  );
  return n / (N * N);
}

/* ---------- Choosing the next 3 blocks (always fair: at least one can be placed) ---------- */
function makeTray(grid) {
  const need = occupancy(grid) > 0.5 ? 2 : 1; // a crowded board gets more helpful blocks
  let bestSet = null,
    bestFit = -1;
  for (let t = 0; t < 40; t++) {
    const set = [randomPiece(), randomPiece(), randomPiece()];
    if (set[0].id === set[1].id && set[1].id === set[2].id) continue;
    const fit = set.filter((p) => fitsAnywhere(grid, p)).length;
    if (fit >= need) return set;
    if (fit > bestFit) {
      bestFit = fit;
      bestSet = set;
    }
  }
  if (bestFit >= 1) return bestSet;
  return ["dot", "h2", "v2"].map((id) =>
    makePiece(id, rnd(WOODS.length), 84 + rnd(13)),
  ); // emergency: tiny blocks
}

/* ---------- Game flow ---------- */
function newGame() {
  G.grid = emptyGrid();
  G.score = 0;
  G.combo = 0;
  G.lines = 0;
  G.moves = 0;
  G.perfects = 0;
  G.bestAtStart = best;
  G.tray = makeTray(G.grid);
  G.state = "play";
}

/* Put tray piece i with its top-left corner at row r, column c.
   Returns null if it does not fit, otherwise a result object that the screen uses for animations. */
function place(i, r, c) {
  const piece = G.tray[i];
  if (G.state !== "play" || !piece || !canPlace(G.grid, piece, r, c))
    return null;

  piece.cells.forEach(([dr, dc]) => {
    G.grid[r + dr][c + dc] = { wood: piece.wood, angle: piece.angle };
  });
  G.moves++;
  let points = piece.size; // 1 point for every block placed

  const { rows, cols } = fullLines(G.grid),
    lines = rows.length + cols.length,
    cleared = [];
  let lineBonus = 0,
    perfect = false;
  if (lines) {
    const keys = new Set();
    rows.forEach((rr) => {
      for (let cc = 0; cc < N; cc++) keys.add(rr * N + cc);
    });
    cols.forEach((cc) => {
      for (let rr = 0; rr < N; rr++) keys.add(rr * N + cc);
    });
    keys.forEach((k) => {
      const rr = Math.floor(k / N),
        cc = k % N;
      cleared.push({ r: rr, c: cc, wood: G.grid[rr][cc].wood });
      G.grid[rr][cc] = null;
    });
    G.combo++;
    G.lines += lines;
    lineBonus = 10 * lines * lines * Math.min(5, G.combo); // more lines at once and longer combos give much more
    points += lineBonus;
    if (G.grid.every((row) => row.every((v) => !v))) {
      perfect = true;
      points += 300;
      G.perfects++;
    }
  } else G.combo = 0; // a move without a clear ends the combo

  G.score += points;
  G.tray[i] = null;
  let refilled = false;
  if (G.tray.every((p) => !p)) {
    G.tray = makeTray(G.grid);
    refilled = true;
  }
  const over = !anyFits(G.grid, G.tray);
  if (over) G.state = "over";
  return {
    i,
    r,
    c,
    piece,
    lines,
    rows,
    cols,
    cleared,
    points,
    lineBonus,
    perfect,
    combo: G.combo,
    refilled,
    over,
  };
}

/* ---------- Save and load the running game ---------- */
function serialize() {
  return {
    v: 1,
    grid: G.grid.map((row) => row.map((c) => (c ? [c.wood, c.angle] : null))),
    tray: G.tray.map((p) =>
      p ? { id: p.id, wood: p.wood, angle: p.angle } : null,
    ),
    score: G.score,
    combo: G.combo,
    lines: G.lines,
    moves: G.moves,
    perfects: G.perfects,
    bestAtStart: G.bestAtStart,
  };
}
function restore(s) {
  try {
    if (
      !s ||
      s.v !== 1 ||
      !Array.isArray(s.grid) ||
      s.grid.length !== N ||
      !Array.isArray(s.tray) ||
      s.tray.length !== TRAY_SIZE
    )
      return false;
    const woodOk = (w) => Number.isInteger(w) && w >= 0 && w < WOODS.length;
    const grid = s.grid.map((row) => {
      if (!Array.isArray(row) || row.length !== N) throw new Error("bad row");
      return row.map((c) => {
        if (c === null) return null;
        if (!Array.isArray(c) || !woodOk(c[0]) || typeof c[1] !== "number")
          throw new Error("bad cell");
        return { wood: c[0], angle: c[1] };
      });
    });
    const tray = s.tray.map((p) => {
      if (p === null) return null;
      if (!SHAPE_BY_ID[p.id] || !woodOk(p.wood) || typeof p.angle !== "number")
        throw new Error("bad piece");
      return makePiece(p.id, p.wood, p.angle);
    });
    if (!(Number.isInteger(s.score) && s.score >= 0)) return false;
    G.grid = grid;
    G.tray = tray;
    G.score = s.score;
    G.combo = s.combo | 0;
    G.lines = s.lines | 0;
    G.moves = s.moves | 0;
    G.perfects = s.perfects | 0;
    G.bestAtStart = Number.isInteger(s.bestAtStart) ? s.bestAtStart : best;
    if (G.tray.every((p) => !p)) G.tray = makeTray(G.grid);
    G.state = anyFits(G.grid, G.tray) ? "play" : "over";
    return G.state === "play";
  } catch (e) {
    return false;
  }
}
function saveGame() {
  if (G.state === "play") store.set(STATE_KEY, serialize());
  else store.del(STATE_KEY);
}
