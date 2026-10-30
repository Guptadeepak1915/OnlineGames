/* =====================================================
   input.js - drag and drop (mouse and touch), tap to place,
   and keyboard controls
   ===================================================== */

// where the board is on the screen (cell size and distance between cell starts)
function geometry() {
  const a = cellEls[0].getBoundingClientRect(),
    b = cellEls[1].getBoundingClientRect();
  const cw = a.width || 44,
    pitch = b.left - a.left || cw + 4;
  return { ox: a.left, oy: a.top, cw, pitch };
}

/* ---------- Placing ---------- */
function doPlace(i, r, c) {
  if (UI.locked || G.state !== "play") return false;
  const res = place(i, r, c);
  if (!res) {
    sfx.bad();
    return false;
  }
  UI.sel = null;
  UI.cur = null;
  clearGhost();
  afterPlace(res);
  return true;
}
function selectPiece(i) {
  if (UI.locked || G.state !== "play" || !G.tray[i]) return;
  UI.sel = UI.sel === i ? null : i;
  UI.cur = null;
  clearGhost();
  sfx.pick();
  renderTray();
}

/* ---------- Drag and drop ---------- */
function startDrag(i, e) {
  const piece = G.tray[i];
  if (!piece || UI.locked || G.state !== "play") return;
  const g = geometry(),
    gap = g.pitch - g.cw;
  const el = pieceEl(piece, g.cw);
  el.classList.add("drag");
  el.style.setProperty("--pgap", gap + "px");
  document.body.appendChild(el);
  const pw = piece.w * g.cw + (piece.w - 1) * gap,
    ph = piece.h * g.cw + (piece.h - 1) * gap;
  UI.drag = {
    i,
    piece,
    el,
    g,
    pw,
    ph,
    sx: e.clientX,
    sy: e.clientY,
    moved: false,
    touch: e.pointerType !== "mouse",
    tr: 0,
    tc: 0,
    valid: false,
  };
  slotEls[i].classList.add("dragging");
  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
  document.addEventListener("pointercancel", onDragCancel);
  moveDrag(e);
}
function moveDrag(e) {
  const d = UI.drag;
  if (!d) return;
  if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.moved = true;
  // on a touch screen the block floats above the finger so you can see where it goes
  const x = e.clientX - d.pw / 2,
    y = e.clientY - d.ph / 2 - (d.touch ? d.ph / 2 + 46 : 0);
  d.el.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
  d.tc = Math.round((x - d.g.ox) / d.g.pitch);
  d.tr = Math.round((y - d.g.oy) / d.g.pitch);
  d.valid = showGhost(d.piece, d.tr, d.tc);
  const near = d.tr > -2 && d.tc > -2 && d.tr < N + 1 && d.tc < N + 1;
  d.el.classList.toggle("invalid", near && !d.valid);
}
function onDragMove(e) {
  const d = UI.drag;
  if (!d) return;
  d.latestEvent = e;
  if (d.moveFrame) return;
  d.moveFrame = requestAnimationFrame(() => {
    d.moveFrame = 0;
    if (UI.drag === d) moveDrag(d.latestEvent);
  });
}
function endDrag() {
  const d = UI.drag;
  if (!d) return null;
  if (d.moveFrame) cancelAnimationFrame(d.moveFrame);
  d.moveFrame = 0;
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("pointercancel", onDragCancel);
  d.el.remove();
  slotEls[d.i].classList.remove("dragging");
  clearGhost();
  UI.drag = null;
  return d;
}
function onDragEnd(e) {
  if (UI.drag && e) moveDrag(e);
  const d = endDrag();
  if (!d) return;
  if (!d.moved) {
    selectPiece(d.i);
    return;
  } // a tap, not a drag: select the block
  if (d.valid) doPlace(d.i, d.tr, d.tc);
  else {
    const near = d.tr > -2 && d.tc > -2 && d.tr < N + 1 && d.tc < N + 1;
    if (near) sfx.bad();
    slotEls[d.i].classList.remove("shake-no");
    void slotEls[d.i].offsetWidth;
    slotEls[d.i].classList.add("shake-no");
  }
}
function onDragCancel() {
  endDrag();
}

/* ---------- Tap a block, then tap the board ---------- */
function topLeftFromCell(piece, cell) {
  return [
    +cell.dataset.r - Math.floor((piece.h - 1) / 2),
    +cell.dataset.c - Math.floor((piece.w - 1) / 2),
  ];
}

function bindInput() {
  trayEl.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const slot = e.target.closest(".slot");
    if (!slot || slot.classList.contains("empty")) return;
    e.preventDefault();
    startDrag(+slot.dataset.i, e);
  });

  gridEl.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell || UI.sel === null || UI.locked) return;
    const p = G.tray[UI.sel];
    if (!p) return;
    const [r, c] = topLeftFromCell(p, cell);
    doPlace(UI.sel, r, c);
  });
  gridEl.addEventListener("pointermove", (e) => {
    // preview for the selected block when hovering with a mouse
    if (UI.sel === null || UI.drag || e.pointerType !== "mouse") return;
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const p = G.tray[UI.sel];
    if (!p) return;
    const [r, c] = topLeftFromCell(p, cell);
    showGhost(p, r, c);
  });
  gridEl.addEventListener("pointerleave", () => {
    if (!UI.drag && UI.cur === null) clearGhost();
  });

  // keyboard: 1 2 3 choose a block, arrows move it, Enter or Space puts it down, Esc lets go
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || G.state !== "play" || UI.locked)
      return;
    if (
      !$("menu").classList.contains("hidden") ||
      !$("over").classList.contains("hidden") ||
      !$("confirm").classList.contains("hidden")
    )
      return;
    if (/^[1-3]$/.test(e.key)) {
      selectPiece(+e.key - 1);
      if (UI.sel !== null) moveCursor(0, 0);
      return;
    }
    if (e.key === "Escape") {
      if (UI.sel !== null) {
        UI.sel = null;
        UI.cur = null;
        clearGhost();
        renderTray();
      }
      return;
    }
    if (UI.sel === null) {
      if (
        (e.key === "Enter" || e.key === " ") &&
        e.target.classList &&
        e.target.classList.contains("slot")
      ) {
        e.preventDefault();
        selectPiece(+e.target.dataset.i);
        if (UI.sel !== null) moveCursor(0, 0);
      }
      return;
    }
    const dirs = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    if (dirs[e.key]) {
      e.preventDefault();
      moveCursor(dirs[e.key][0], dirs[e.key][1]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (UI.cur) doPlace(UI.sel, UI.cur[0], UI.cur[1]);
    }
  });
}
function moveCursor(dr, dc) {
  const p = G.tray[UI.sel];
  if (!p) return;
  if (!UI.cur) UI.cur = [Math.floor((N - p.h) / 2), Math.floor((N - p.w) / 2)];
  UI.cur = [
    clamp(UI.cur[0] + dr, 0, N - p.h),
    clamp(UI.cur[1] + dc, 0, N - p.w),
  ];
  showGhost(p, UI.cur[0], UI.cur[1]);
}
