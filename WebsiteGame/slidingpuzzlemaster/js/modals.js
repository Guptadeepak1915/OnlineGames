"use strict";

// Dialogs and leaderboard.
/* ---------- 14. Modals, confirm, toast ---------- */
const modalStack = [];
let lastFocus = null;
const modalOpen = () => modalStack.length > 0;
function openModal(id) {
  const m = $(id);
  if (!m || !m.hidden) return;
  lastFocus = document.activeElement;
  m.hidden = false;
  modalStack.push(id);
  const f = m.querySelector(".btn.primary") || m.querySelector("button");
  if (f) f.focus();
}
function closeModal(id) {
  const m = $(id);
  if (!m || m.hidden) return;
  m.hidden = true;
  const i = modalStack.lastIndexOf(id);
  if (i > -1) modalStack.splice(i, 1);
  if (id === "helpModal") {
    prefs.tipShown = true;
    savePrefs();
  }
  if (
    !modalStack.length &&
    lastFocus &&
    lastFocus.focus &&
    document.contains(lastFocus)
  )
    lastFocus.focus();
}
function confirmAsk({ title, text, yes, no }) {
  return new Promise((resolve) => {
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmYes").textContent = yes;
    $("confirmNo").textContent = no;
    const done = (v) => {
      closeModal("confirmModal");
      $("confirmYes").onclick = $("confirmNo").onclick = null;
      resolve(v);
    };
    $("confirmYes").onclick = () => done(true);
    $("confirmNo").onclick = () => done(false);
    openModal("confirmModal");
    $("confirmNo").focus();
  });
}
function trapFocus(e) {
  const top = $(modalStack[modalStack.length - 1]);
  const items = [
    ...top.querySelectorAll("button:not([disabled]), input, [href]"),
  ].filter(
    (x) =>
      (!x.hidden && x.offsetParent !== null) || x === document.activeElement,
  );
  if (!items.length) return;
  const first = items[0],
    last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!top.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}
let toastTimer = 0;
function toast(msg, ms = 2400) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}
function announce(msg) {
  const l = $("live");
  l.textContent = "";
  setTimeout(() => {
    l.textContent = msg;
  }, 30);
}

/* ---------- 15. Leaderboard ---------- */
let lbTab = "4";
function renderLeaderboard(tab) {
  lbTab = String(tab);
  document
    .querySelectorAll("#lbTabs .tab")
    .forEach((t) =>
      t.setAttribute("aria-selected", String(t.dataset.tab === lbTab)),
    );
  const medal = (i) => ["🥇", "🥈", "🥉"][i] || i + 1;
  const help = (s) => (s.hints ? `💡${s.hints}` : "-");
  let html = "";
  if (lbTab === "daily") {
    const byDay = {};
    scores
      .filter((s) => s.daily && s.key)
      .forEach((s) => {
        const cur = byDay[s.key];
        if (!cur || s.time < cur.time) byDay[s.key] = s;
      });
    const rows = Object.values(byDay)
      .sort((a, b) => (a.key < b.key ? 1 : -1))
      .slice(0, 10);
    html = rows.length
      ? `<table class="lb-table"><thead><tr><th>Day</th><th>Name</th><th>Size</th><th>Time</th><th>Moves</th><th>Help</th></tr></thead><tbody>${rows
          .map(
            (s) =>
              `<tr class="${s.id === game.lastId ? "me" : ""}"><td>${fmtDateKey(s.key)}</td><td>${esc(s.name)}</td><td>${s.size}×${s.size}</td><td>${fmtTime(s.time)}</td><td>${s.moves}</td><td>${help(s)}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : '<p class="empty">No daily challenges finished yet.<br>Play today\'s Daily Challenge!</p>';
  } else {
    const rows = scores
      .filter((s) => !s.daily && s.size === +lbTab)
      .sort((a, b) => a.time - b.time || a.moves - b.moves)
      .slice(0, 10);
    html = rows.length
      ? `<table class="lb-table"><thead><tr><th>#</th><th>Name</th><th>Time</th><th>Moves</th><th>Date</th><th>Help</th></tr></thead><tbody>${rows
          .map(
            (s, i) =>
              `<tr class="${s.id === game.lastId ? "me" : ""}"><td>${medal(i)}</td><td>${esc(s.name)}</td><td>${fmtTime(s.time)}</td><td>${s.moves}</td><td>${fmtDate(s.date)}</td><td>${help(s)}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : `<p class="empty">No ${lbTab}×${lbTab} scores yet.<br>Solve a puzzle to get on the board!</p>`;
  }
  $("lbBody").innerHTML = html;
}
function openLeaderboard() {
  renderLeaderboard(
    game.screen === "game"
      ? game.mode === "daily"
        ? "daily"
        : game.n
      : prefs.size,
  );
  openModal("boardModal");
}
