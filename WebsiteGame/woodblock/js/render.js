/* =====================================================
   render.js - draws the board, the tray, the score and the
   wood chip effects. It reads the game (G) but never changes it.
   ===================================================== */

const UI = { sel: null, cur: null, locked: false, drag: null }; // selected piece, keyboard cursor, input lock, drag in progress
let gridEl, trayEl, boardEl, popupEl, fxCanvas, fxCtx;
const lowPower = !!(
  window.matchMedia &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches
);
let cellEls = [],
  slotEls = [];
let ghostCells = [],
  clearCells = [],
  ghostKey = "",
  ghostValid = false;

function initRender() {
  gridEl = $("grid");
  trayEl = $("tray");
  boardEl = $("boardFrame");
  popupEl = $("popup");
  fxCanvas = $("fx");
  fxCtx = fxCanvas.getContext ? fxCanvas.getContext("2d") : null;
  gridEl.innerHTML = "";
  cellEls = [];
  for (let i = 0; i < N * N; i++) {
    const d = document.createElement("div");
    d.className = "cell";
    d.dataset.r = Math.floor(i / N);
    d.dataset.c = i % N;
    gridEl.appendChild(d);
    cellEls.push(d);
  }
  slotEls = [...trayEl.querySelectorAll(".slot")];
}

/* ---------- Board ---------- */
function renderGrid() {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const v = G.grid[r][c],
        el = cellEls[r * N + c];
      el.className = "cell" + (v ? " filled w" + v.wood : "");
      if (v) el.style.setProperty("--ga", v.angle + "deg");
      else el.style.removeProperty("--ga");
    }
}

// one block of a piece (used in the tray and in the piece you are dragging)
function pieceEl(piece, cellPx) {
  const el = document.createElement("div");
  el.className = "piece";
  el.style.setProperty("--pw", piece.w);
  el.style.setProperty("--ph", piece.h);
  if (cellPx) el.style.setProperty("--ps", cellPx + "px");
  piece.cells.forEach(([r, c]) => {
    const b = document.createElement("div");
    b.className = "pcell w" + piece.wood;
    b.style.gridRow = r + 1;
    b.style.gridColumn = c + 1;
    b.style.setProperty("--ga", piece.angle + "deg");
    el.appendChild(b);
  });
  return el;
}

function renderTray() {
  slotEls.forEach((slot, i) => {
    const p = G.tray[i];
    slot.innerHTML = "";
    if (p) slot.appendChild(pieceEl(p));
    slot.classList.toggle("empty", !p);
    slot.classList.toggle("nofit", !!p && !fitsAnywhere(G.grid, p));
    slot.classList.toggle("selected", UI.sel === i && !!p);
    slot.setAttribute(
      "aria-label",
      p
        ? `Block ${i + 1}, ${WOODS[p.wood].name}, ${p.size} squares${UI.sel === i ? ", selected" : ""}`
        : `Block ${i + 1}, used`,
    );
  });
}

/* ---------- Ghost preview (where the block would go) ---------- */
function clearGhost() {
  ghostCells.forEach((i) => cellEls[i].classList.remove("ghost"));
  clearCells.forEach((i) => cellEls[i].classList.remove("will-clear"));
  ghostCells = [];
  clearCells = [];
  ghostKey = "";
  ghostValid = false;
}
function showGhost(piece, r, c) {
  const key = `${piece.id}:${r}:${c}`;
  if (key === ghostKey) return ghostValid;
  clearGhost();
  ghostKey = key;
  if (!canPlace(G.grid, piece, r, c)) return false;
  ghostValid = true;
  piece.cells.forEach(([dr, dc]) => {
    const index = (r + dr) * N + c + dc;
    ghostCells.push(index);
    cellEls[index].classList.add("ghost");
  });
  const { rows, cols } = previewLines(G.grid, piece, r, c); // rows and columns that would clear glow
  rows.forEach((rr) => {
    for (let cc = 0; cc < N; cc++) {
      clearCells.push(rr * N + cc);
      cellEls[rr * N + cc].classList.add("will-clear");
    }
  });
  cols.forEach((cc) => {
    for (let rr = 0; rr < N; rr++) {
      clearCells.push(rr * N + cc);
      cellEls[rr * N + cc].classList.add("will-clear");
    }
  });
  return ghostValid;
}

/* ---------- Score ---------- */
let lastShown = 0;
function renderHud() {
  const sEl = $("score");
  sEl.textContent = G.score;
  if (G.score !== lastShown) {
    sEl.classList.remove("bump");
    void sEl.offsetWidth;
    sEl.classList.add("bump");
    lastShown = G.score;
  }
  const b = Math.max(best, G.score);
  $("best").textContent = b;
  $("hdrBest").textContent = b;
  $("combo").textContent = G.combo >= 2 ? "x" + Math.min(5, G.combo) : "-";
}
function renderAll() {
  renderGrid();
  renderTray();
  renderHud();
}

/* ---------- Text that floats up ("Great!  +45") ---------- */
function popup(title, sub) {
  const s = document.createElement("span");
  s.className = "pop";
  s.textContent = title;
  if (sub) {
    const b = document.createElement("small");
    b.textContent = sub;
    s.appendChild(b);
  }
  popupEl.appendChild(s);
  setTimeout(() => s.remove(), 1250);
}

function shakeBoard() {
  boardEl.classList.remove("shake");
  void boardEl.offsetWidth;
  boardEl.classList.add("shake");
  setTimeout(() => boardEl.classList.remove("shake"), 400);
}

/* ---------- Wood chips flying out of cleared lines ---------- */
const chips = [];
let chipRaf = 0,
  chipLast = 0;
function sizeFx() {
  const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 2),
    w = boardEl.clientWidth,
    h = boardEl.clientHeight;
  fxCanvas.width = Math.max(1, Math.round(w * dpr));
  fxCanvas.height = Math.max(1, Math.round(h * dpr));
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function spawnChips(cleared) {
  if (!fxCtx) return;
  const br = boardEl.getBoundingClientRect(),
    first = cellEls[0].getBoundingClientRect(),
    nextColumn = cellEls[1].getBoundingClientRect(),
    nextRow = cellEls[N].getBoundingClientRect(),
    cellSize = first.width,
    pitchX = nextColumn.left - first.left,
    pitchY = nextRow.top - first.top,
    originX = first.left - br.left,
    originY = first.top - br.top,
    maxChips = lowPower ? 72 : 420,
    chipsPerCell = lowPower ? 1 : 5;
  sizeFx();
  cleared.forEach(({ r, c, wood }) => {
    const cx = originX + c * pitchX + cellSize / 2,
      cy = originY + r * pitchY + cellSize / 2;
    for (let k = 0; k < chipsPerCell && chips.length < maxChips; k++) {
      const life = 0.8 + Math.random() * 0.6;
      chips.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 280,
        vy: -50 - Math.random() * 230,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 14,
        w: 4 + Math.random() * 7,
        h: 3 + Math.random() * 4,
        color: WOODS[wood].chip,
        life,
        max: life,
      });
    }
  });
  if (!chipRaf) {
    chipLast = performance.now();
    chipRaf = requestAnimationFrame(chipLoop);
  }
}
function chipLoop(now) {
  const dt = Math.min(0.05, (now - chipLast) / 1000);
  chipLast = now;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  for (let i = chips.length - 1; i >= 0; i--) {
    const p = chips[i];
    p.life -= dt;
    if (p.life <= 0) {
      chips.splice(i, 1);
      continue;
    }
    p.vy += 620 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    fxCtx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
    fxCtx.fillStyle = p.color;
    if (lowPower) {
      fxCtx.fillRect(p.x, p.y, p.w, p.h);
    } else {
      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      fxCtx.restore();
    }
  }
  if (chips.length) chipRaf = requestAnimationFrame(chipLoop);
  else {
    chipRaf = 0;
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
}
