/* =====================================================
   render.js - draws the board, number pad and numbers at the top.
   It reads the game (G) but never changes it.
   ===================================================== */
let boardEl,
  padEl,
  cellEls = [],
  keyEls = [];

function initRender() {
  boardEl = $("board");
  padEl = $("pad");
}

// build the squares and the number buttons for the current grid size
function buildBoard() {
  const n = G.n;
  boardEl.style.setProperty("--n", n);
  boardEl.style.setProperty("--nc", 3);
  boardEl.innerHTML = "";
  cellEls = [];
  for (let i = 0; i < n * n; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    if ((i % n) % 3 === 2 && i % n !== n - 1) b.classList.add("box-right");
    if (Math.floor(i / n) % 3 === 2 && Math.floor(i / n) !== n - 1)
      b.classList.add("box-bottom");
    b.dataset.i = i;
    const val = document.createElement("span");
    val.className = "val";
    const notes = document.createElement("span");
    notes.className = "notes";
    for (let v = 1; v <= n; v++) {
      const s = document.createElement("i");
      s.textContent = v;
      notes.appendChild(s);
    }
    b.appendChild(val);
    b.appendChild(notes);
    boardEl.appendChild(b);
    cellEls.push(b);
  }
  padEl.innerHTML = "";
  keyEls = [];
  for (let v = 1; v <= n; v++) {
    const k = document.createElement("button");
    k.type = "button";
    k.className = "key";
    k.dataset.v = v;
    k.innerHTML = `<b>${v}</b><span class="left"></span>`;
    padEl.appendChild(k);
    keyEls.push(k);
  }
}

function renderBoard() {
  const n = G.n,
    conf = conflictSet(),
    selVal = G.sel !== null ? G.vals[G.sel] : 0;
  cellEls.forEach((el, i) => {
    const v = G.vals[i],
      r = rowOf(i),
      c = colOf(i);
    let cls = "cell";
    if (G.given[i]) cls += " given";
    else if (v) cls += " mine";
    if (G.hinted[i]) cls += " hinted";
    if (G.bad[i]) cls += " wrong";
    if (conf.has(i)) cls += " conflict";
    if (c % 3 === 2 && c !== n - 1) cls += " box-right";
    if (r % 3 === 2 && r !== n - 1) cls += " box-bottom";
    if (G.sel !== null) {
      if (i === G.sel) cls += " sel";
      else if (isPeer(G.sel, i)) cls += " peer"; // the row and column of the chosen square light up
      if (selVal && v === selVal && i !== G.sel) cls += " same"; // other squares with the same number
    }
    el.className = cls;
    el.firstChild.textContent = v || "";
    const notes = el.lastChild.children;
    for (let k = 0; k < n; k++)
      notes[k].style.visibility =
        !v && G.notes[i] & (1 << k) ? "visible" : "hidden";
    el.setAttribute(
      "aria-label",
      `Row ${r + 1}, column ${c + 1}, ${v ? "number " + v : "empty"}${G.given[i] ? ", given" : ""}${G.bad[i] ? ", wrong" : ""}`,
    );
  });
  keyEls.forEach((k, idx) => {
    const left = remaining(idx + 1);
    k.querySelector(".left").textContent = left > 0 ? left : "✓";
    k.classList.toggle("done", left <= 0);
  });
}

function renderHud() {
  $("hLevel").textContent = G.mode === "level" ? G.level : "Free";
  $("hScore").textContent = G.mode === "level" ? G.score : "-";
  $("hLives").textContent =
    G.mode === "level"
      ? "♥".repeat(Math.max(0, G.lives)) +
        "♡".repeat(Math.max(0, MAX_LIVES - G.lives))
      : "∞";
  $("hTime").textContent = fmtTime(elapsedMs());
  $("goal").textContent =
    `Sudoku · ${G.diff}. Fill every row, column, and 3×3 box with 1–9 without repeating a number.`;
  $("btnNotes").textContent = G.notesMode ? "Notes: on" : "Notes: off";
  $("btnNotes").classList.toggle("on", G.notesMode);
  $("btnUndo").disabled = !G.history.length || G.state !== "play";
  $("btnHint").textContent = G.mode === "level" ? `Hint (${G.hints})` : "Hint";
  $("btnHint").disabled =
    G.state !== "play" || (G.mode === "level" && G.hints <= 0);
}
function renderAll() {
  renderBoard();
  renderHud();
}

function flash(i, cls) {
  const el = cellEls[i];
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 450);
}
