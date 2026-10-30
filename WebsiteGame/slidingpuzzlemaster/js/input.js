"use strict";

// Keyboard, pointer, and swipe input.
/* ---------- 17. Input: mouse, touch, keyboard ---------- */
function bindInput() {
  const board = $("board");
  board.addEventListener("click", (e) => {
    if (game.suppressClick) {
      game.suppressClick = false;
      return;
    }
    const t = e.target.closest(".tile");
    if (!t) return;
    trySlide(game.board.indexOf(+t.dataset.value));
  });

  let swipe = null; // swipe on the board = arrow key
  board.addEventListener("pointerdown", (e) => {
    swipe = { x: e.clientX, y: e.clientY };
  });
  board.addEventListener("pointerup", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x,
      dy = e.clientY - swipe.y,
      ax = Math.abs(dx),
      ay = Math.abs(dy);
    swipe = null;
    if (Math.max(ax, ay) < 32) return;
    game.suppressClick = true;
    setTimeout(() => {
      game.suppressClick = false;
    }, 60);
    moveByDir(ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  });
  board.addEventListener("pointercancel", () => {
    swipe = null;
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      if (modalOpen()) {
        const top = modalStack[modalStack.length - 1];
        if (top === "confirmModal") $("confirmNo").click();
        else if (top !== "winModal") closeModal(top);
      } else if (game.screen === "game") togglePause();
      return;
    }
    if (e.key === "Tab" && modalOpen()) {
      trapFocus(e);
      return;
    }
    if (modalOpen() || game.screen !== "game") return;
    const k = e.key.toLowerCase();
    const dirs = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
    };
    if (dirs[k]) {
      e.preventDefault();
      moveByDir(dirs[k]);
    } else if (k === "u") undo();
    else if (k === "h") hint();
    else if (k === "p") togglePause();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.screen === "game" && game.running) pause();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button");
    if (b && !b.classList.contains("tile")) sfx.click();
  });
}
