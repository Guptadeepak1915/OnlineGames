"use strict";

// Puzzle board rendering.
/* ---------- 9. Drawing the board ---------- */
const hueFor = (v) =>
  Math.round(
    game.palette.start +
      ((v - 1) / Math.max(1, game.n * game.n - 2)) * game.palette.span,
  );

function buildBoard() {
  const board = $("board"),
    n = game.n,
    N = n * n;
  board.innerHTML = "";
  board.style.setProperty("--n", n);
  const cells = document.createElement("div");
  cells.className = "cells";
  for (let i = 0; i < N; i++) {
    const c = document.createElement("div");
    c.className = "cell";
    cells.appendChild(c);
  }
  board.appendChild(cells);
  game.tiles.clear();
  for (let v = 1; v < N; v++) {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "tile";
    t.dataset.value = v;
    t.style.setProperty("--i", v - 1);
    t.style.setProperty("--h", hueFor(v));
    const face = document.createElement("span");
    face.className = "face";
    face.textContent = v;
    t.appendChild(face);
    board.appendChild(t);
    game.tiles.set(v, t);
  }
  game.board.forEach((v, idx) => {
    if (v) place(v, idx);
  });
  board.classList.remove("won", "shake");
  board.classList.add("enter");
  setTimeout(() => board.classList.remove("enter"), 900);
}
function place(v, idx) {
  const t = game.tiles.get(v),
    n = game.n;
  t.style.setProperty("--r", Math.floor(idx / n));
  t.style.setProperty("--c", idx % n);
}
// green dot on tiles that are already home, hover effect on tiles that can slide, screen reader labels
function updateTiles() {
  const n = game.n,
    b = game.blank,
    br = Math.floor(b / n),
    bc = b % n;
  game.board.forEach((v, idx) => {
    if (!v) return;
    const t = game.tiles.get(v),
      r = Math.floor(idx / n),
      c = idx % n,
      movable = (r === br) !== (c === bc);
    t.classList.toggle("ok", idx === v - 1);
    t.classList.toggle("movable", movable);
    t.setAttribute(
      "aria-label",
      `Tile ${v}, row ${r + 1}, column ${c + 1}${idx === v - 1 ? ", in place" : ""}${movable ? ", can slide" : ""}`,
    );
  });
}
function showScreen(name) {
  game.screen = name;
  $("startScreen").hidden = name !== "start";
  $("gameScreen").hidden = name !== "game";
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
}
