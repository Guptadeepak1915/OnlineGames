"use strict";

// Sound effects and shared game state.
/* ---------- 7. Sound (small beeps made by the browser, no files) ---------- */
let audioCtx = null;
function tone(freq, dur, type = "sine", vol = 0.09, slide = 0, delay = 0) {
  if (!prefs.sound) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime + delay,
      o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  } catch (e) {}
}
const sfx = {
  move() {
    tone(420 + Math.random() * 70, 0.08, "triangle", 0.1);
  },
  click() {
    tone(560, 0.05, "square", 0.035);
  },
  undo() {
    tone(340, 0.1, "triangle", 0.08, -90);
  },
  hint() {
    tone(620, 0.14, "sine", 0.08, 220);
  },
  error() {
    tone(170, 0.12, "sawtooth", 0.045);
  },
  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(f, 0.24, "sine", 0.1, 0, i * 0.11),
    );
  },
};

/* ---------- 8. Game state ---------- */
const game = {
  screen: "start", // start | game
  mode: "free", // free | daily
  n: 4,
  board: [],
  start: [],
  blank: 0,
  history: [],
  hints: 0,
  undos: 0,
  elapsed: 0,
  running: false,
  timerStart: 0,
  paused: false,
  won: false,
  palette: PALETTES[0],
  dailyKey: null,
  dailyNumber: 0,
  hintCache: null,
  hintTimer: 0,
  suppressClick: false,
  lastId: 0,
  tiles: new Map(),
};
let timerId = 0;
