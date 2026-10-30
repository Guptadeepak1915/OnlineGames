"use strict";

// Start screen, UI event bindings, and application startup.
/* ---------- 18. Start screen, theme, sound, buttons ---------- */
function applyTheme() {
  const dark = prefs.theme
    ? prefs.theme === "dark"
    : !!(
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#17123a" : "#6c5ce7";
  $("btnTheme").setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
}
function applySound() {
  $("btnSound").classList.toggle("is-off", !prefs.sound);
  $("btnSound").setAttribute("aria-pressed", String(prefs.sound));
  $("btnSound").setAttribute(
    "aria-label",
    prefs.sound ? "Sound on, tap to mute" : "Sound off, tap to turn on",
  );
}
function renderStart() {
  document.querySelectorAll(".level").forEach((b) => {
    const on = +b.dataset.size === prefs.size;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  [3, 4, 5].forEach((n) => {
    const b = best[n],
      el = document.querySelector(`[data-best="${n}"]`);
    el.textContent =
      b && b.time != null
        ? `Best ${fmtTime(b.time)} · ${b.moves} moves`
        : "No record yet";
  });
  $("statStreak").textContent = stats.streak;
  $("statBestStreak").textContent = stats.bestStreak;
  $("statSolved").textContent = stats.solved;
  $("statDailyStreak").textContent = dailyStreak();
  const key = todayKey(),
    cfg = dailyConfig(key),
    done = daily[key];
  $("dailyInfo").textContent = done
    ? `Done ✓ ${fmtTime(done.time)} · ${done.moves} moves`
    : `#${cfg.number} · ${cfg.size}×${cfg.size} · ${cfg.palette.name}`;
  if (document.activeElement !== $("playerName"))
    $("playerName").value = prefs.name === "Player" ? "" : prefs.name;
}

function bindUi() {
  // difficulty radio group (mouse, touch and arrow keys)
  const group = $("levelGroup");
  group.addEventListener("click", (e) => {
    const b = e.target.closest(".level");
    if (!b) return;
    prefs.size = +b.dataset.size;
    savePrefs();
    renderStart();
  });
  group.addEventListener("keydown", (e) => {
    const sizes = [3, 4, 5],
      i = sizes.indexOf(prefs.size);
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      prefs.size = sizes[(i + 1) % 3];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      prefs.size = sizes[(i + 2) % 3];
    else return;
    e.preventDefault();
    savePrefs();
    renderStart();
    document.querySelector(`.level[data-size="${prefs.size}"]`).focus();
  });
  $("playerName").addEventListener("input", (e) => {
    prefs.name =
      e.target.value.replace(/[<>]/g, "").trim().slice(0, 14) || "Player";
    savePrefs();
  });

  $("btnPlay").addEventListener("click", () => newFreeGame(prefs.size));
  $("btnDaily").addEventListener("click", startDaily);
  $("btnBack").addEventListener("click", goMenu);
  $("brand").addEventListener("click", () => {
    if (game.screen === "game") goMenu();
  });
  $("btnHint").addEventListener("click", hint);
  $("btnUndo").addEventListener("click", undo);
  $("btnPause").addEventListener("click", togglePause);
  $("btnResume").addEventListener("click", resume);
  $("btnRestart").addEventListener("click", restart);

  $("btnHelp").addEventListener("click", () => openModal("helpModal"));
  $("btnHelp2").addEventListener("click", () => openModal("helpModal"));
  $("btnBoard").addEventListener("click", openLeaderboard);
  $("lbTabs").addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (t) renderLeaderboard(t.dataset.tab);
  });
  $("btnClearScores").addEventListener("click", () => {
    confirmAsk({
      title: "Clear all scores?",
      text: "This removes every leaderboard entry saved on this device. Your best times stay.",
      yes: "Clear",
      no: "Cancel",
    }).then((ok) => {
      if (ok) {
        scores = [];
        store.set("scores", scores);
        renderLeaderboard(lbTab);
        toast("Leaderboard cleared");
      }
    });
  });

  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("mousedown", (e) => {
      if (e.target !== m) return;
      if (m.id === "confirmModal") $("confirmNo").click();
      else if (m.id !== "winModal") closeModal(m.id);
    });
    m.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => closeModal(m.id)),
    );
  });

  $("btnPlayAgain").addEventListener("click", () => {
    closeModal("winModal");
    confetti.stop();
    newFreeGame(game.n);
  });
  $("btnReplay").addEventListener("click", () => {
    closeModal("winModal");
    confetti.stop();
    replaySame();
  });
  $("btnWinMenu").addEventListener("click", () => {
    closeModal("winModal");
    confetti.stop();
    showScreen("start");
    renderStart();
  });

  $("btnTheme").addEventListener("click", () => {
    prefs.theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    savePrefs();
    applyTheme();
  });
  $("btnSound").addEventListener("click", () => {
    prefs.sound = !prefs.sound;
    savePrefs();
    applySound();
    if (prefs.sound) sfx.click();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && game.screen === "start") renderStart();
  }); // new day = new daily puzzle
}

/* ---------- Start ---------- */
applyTheme();
applySound();
bindInput();
bindUi();
showScreen("start");
renderStart();
