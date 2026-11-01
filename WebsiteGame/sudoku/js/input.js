/* =====================================================
   input.js - tap, buttons and keyboard
   ===================================================== */
// run after every action: redraw, show feedback, open screens when needed
function afterAction(result) {
  renderAll();
  if (!result) return;
  if (result.kind === "logic") {
    $("logicMsg").textContent =
      "Use the row, column, and 3×3 box clues to find a forced number. Guessing is not allowed.";
    return;
  }
  $("logicMsg").textContent = "";
  if (result.kind === "wrong" && G.sel !== null) flash(G.sel, "shake");
  if (result.kind === "hint" || result.kind === "solved")
    if (result.i !== undefined) flash(result.i, "pop");
  if (G.state === "clear")
    setTimeout(() => {
      if (G.state === "clear") showClear();
    }, 450);
  if (G.state === "over")
    setTimeout(() => {
      if (G.state === "over") showOver();
    }, 700);
}
const act = (fn) => {
  const r = fn();
  afterAction(r);
  return r;
};

function startPuzzle(startFn) {
  startFn();
  buildBoard();
  renderAll();
  hideOverlays();
}

function bindInput() {
  $("board").addEventListener("click", (e) => {
    const c = e.target.closest(".cell");
    if (c) {
      selectCell(+c.dataset.i);
      renderAll();
    }
  });
  $("pad").addEventListener("click", (e) => {
    const k = e.target.closest(".key");
    if (k) act(() => inputNumber(+k.dataset.v));
  });
  $("btnNotes").addEventListener("click", () => {
    toggleNotes();
    renderAll();
  });
  $("btnUndo").addEventListener("click", () => {
    undo();
    renderAll();
  });
  $("btnErase").addEventListener("click", () => act(erase));
  $("btnHint").addEventListener("click", () => act(hint));

  document.addEventListener("keydown", (e) => {
    if (
      G.state !== "play" ||
      (e.ctrlKey && e.key.toLowerCase() !== "z") ||
      e.metaKey ||
      e.altKey
    )
      return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      act(() => inputNumber(+k));
      return;
    }
    const dirs = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (dirs[k]) {
      e.preventDefault();
      moveSel(dirs[k][0], dirs[k][1]);
      renderAll();
    } else if (k === "Backspace" || k === "Delete" || k === "0") {
      e.preventDefault();
      act(erase);
    } else if (k.toLowerCase() === "n") {
      toggleNotes();
      renderAll();
    } else if (
      k.toLowerCase() === "u" ||
      (e.ctrlKey && k.toLowerCase() === "z")
    ) {
      e.preventDefault();
      undo();
      renderAll();
    } else if (k.toLowerCase() === "h") act(hint);
  });
  document.addEventListener("visibilitychange", () => {
    // the clock stops while you are away
    if (G.state !== "play") return;
    if (document.hidden) stopTimer();
    else startTimer();
  });
}
