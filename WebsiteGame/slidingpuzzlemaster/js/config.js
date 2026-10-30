"use strict";

// Settings, helpers, and saved preferences.
/* ---------- 1. Settings ---------- */
const PREFIX = "slidenumbers:v1:";
const LEVELS = {
  3: { label: "Easy", tiles: 8 },
  4: { label: "Medium", tiles: 15 },
  5: { label: "Hard", tiles: 24 },
};
const PALETTES = [
  // tile colours: hue goes from "start" over "span" degrees
  { name: "Candy", start: 330, span: 300 },
  { name: "Ocean", start: 165, span: 95 },
  { name: "Sunset", start: 350, span: 80 },
  { name: "Forest", start: 75, span: 100 },
  { name: "Galaxy", start: 245, span: 110 },
  { name: "Citrus", start: 20, span: 70 },
];
const SOLVER = {
  // hint solver limits for each board size
  3: { weight: 1.2, maxNodes: 150000, maxMs: 350 },
  4: { weight: 3, maxNodes: 150000, maxMs: 350 },
  5: { weight: 5, maxNodes: 150000, maxMs: 350 },
};
const MAX_SCORES = 300;

/* ---------- 2. Helpers ---------- */
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
function fmtTime(ms) {
  const s = Math.floor(ms / 1000),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
const dateKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const fmtDateKey = (key) =>
  new Date(key + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const reducedMotion = () =>
  !!(
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

/* ---------- 3. Saved data (localStorage) ---------- */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch (e) {}
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {}
  },
};
const prefs = Object.assign(
  { theme: null, sound: true, size: 4, name: "Player", tipShown: false },
  store.get("prefs", {}),
);
if (!LEVELS[prefs.size]) prefs.size = 4;
prefs.name = String(prefs.name || "Player").slice(0, 14) || "Player";
const best = store.get("best", {}); // {size: {time, moves}}
const stats = Object.assign(
  { streak: 0, bestStreak: 0, solved: 0 },
  store.get("stats", {}),
);
let scores = store.get("scores", []);
if (!Array.isArray(scores)) scores = [];
const daily = store.get("daily", {}); // {'2026-10-29': {size, time, moves}}
const savePrefs = () => store.set("prefs", prefs);
const saveStats = () => store.set("stats", stats);
