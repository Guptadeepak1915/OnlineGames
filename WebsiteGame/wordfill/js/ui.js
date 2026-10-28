/* =====================================================
   ui.js - Draws the word, letters, timer, menu and messages
   ===================================================== */

const $ = (id) => document.getElementById(id);

/* ---------- Word and letters ---------- */
function render() {
  $("catLine").textContent = `${G.curCat}  ·  Word ${G.num}`;

  const wordEl = $("word");
  wordEl.style.setProperty("--n", G.slots.length);
  wordEl.innerHTML = "";
  G.slots.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.i = i;
    b.className =
      "tile" +
      (s.blank ? " blank" : "") +
      (s.val ? " filled" : "") +
      (s.hinted ? " hint" : "") +
      (G.sel === i && !G.busy ? " sel" : "") +
      (s.state ? " " + s.state : "");
    b.textContent = s.blank ? s.val : s.ch;
    b.disabled = !s.blank || s.hinted || G.busy;
    b.setAttribute(
      "aria-label",
      s.blank
        ? s.val
          ? "Letter " + s.val + ", tap to remove"
          : "Empty blank"
        : "Letter " + s.ch,
    );
    wordEl.appendChild(b);
  });

  const bankEl = $("bank");
  bankEl.innerHTML = "";
  G.bank.forEach((k, bi) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "key";
    b.dataset.bi = bi;
    b.textContent = k.ch;
    b.disabled = k.used || G.busy;
    b.setAttribute("aria-label", "Choose letter " + k.ch);
    bankEl.appendChild(b);
  });
  updateHUD();
}

function updateHUD() {
  $("hScore").textContent = G.score;
  $("hLives").textContent =
    "♥".repeat(Math.max(0, G.lives)) +
    "♡".repeat(Math.max(0, START_LIVES - G.lives));
  $("hStreak").textContent = G.streak;
  $("hintBtn").textContent = `Hint (${G.hints})`;
  $("hintBtn").disabled = G.hints <= 0 || G.busy || G.state !== "play";
}

// left = seconds remaining
function updateTimer(left) {
  $("hTime").textContent = Math.ceil(left);
  $("bar").style.width =
    (G.total > 0 ? Math.max(0, Math.min(100, (left / G.total) * 100)) : 0) +
    "%";
  $("timebar").classList.toggle("low", left <= G.total * 0.3);
}

function setStatus(t) {
  $("status").textContent = t;
}

function shake() {
  const w = $("word");
  w.classList.remove("shake");
  void w.offsetWidth;
  w.classList.add("shake");
}

function toast(t) {
  const el = $("toast");
  el.textContent = t;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1400);
}

/* ---------- Menu and screens ---------- */
function buildMenu() {
  const cats = ["Mixed"].concat(Object.keys(CATEGORIES));
  const catBox = $("catOpts");
  catBox.innerHTML = "";
  cats.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt" + (c === G.cat ? " on" : "");
    b.textContent = c;
    b.dataset.cat = c;
    catBox.appendChild(b);
  });
  const modeBox = $("modeOpts");
  modeBox.innerHTML = "";
  Object.keys(MODES).forEach((m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt" + (m === G.mode ? " on" : "");
    b.dataset.mode = m;
    b.textContent = `${MODES[m].label} ${MODES[m].sec}s`;
    modeBox.appendChild(b);
  });
}

function hideOverlays() {
  $("menu").classList.add("hidden");
  $("over").classList.add("hidden");
}
function showMenu() {
  refreshStats();
  buildMenu();
  $("over").classList.add("hidden");
  $("menu").classList.remove("hidden");
}

function refreshStats() {
  $("hdrBest").textContent = best;
  $("mBest").textContent = best;
  $("mPlays").textContent = plays;
}

function showOver(newBest) {
  $("oTitle").textContent = G.lost ? "Out of lives" : "Run ended";
  $("oScore").textContent = G.score;
  $("oBest").textContent = best;
  $("oSolved").textContent = G.solved;
  $("oBadge").classList.toggle("hidden", !newBest);
  let msg = newBest
    ? "That is your highest score ever!"
    : G.score > 0 && best - G.score <= 40
      ? `So close! Only ${best - G.score} points from your best.`
      : G.lost
        ? "Use a hint when you are stuck."
        : "Nice run. Come back and beat your best.";
  if (G.lost && G.lastWord) msg += ` The last word was ${G.lastWord}.`;
  $("oMsg").textContent = msg;
  $("over").classList.remove("hidden");
}
