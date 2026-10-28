/* =====================================================
   config.js  -  All settings and fixed numbers
   Change difficulty, size, colors, ad id from here.
   ===================================================== */

// Link used in the Share button
const GAME_URL = location.href;

// Game size and player settings
const W = 720; // canvas width
const H = 480; // canvas height
const BAND = 44; // thickness of floor and ceiling
const SZ = 30; // player size
const PX = 120; // player x position (fixed)
const GRAV = 2400; // gravity strength

// Color themes. Theme changes every level (every 300 points)
const themes = [
  { bg1: "#1a1240", bg2: "#3b1b6b", acc: "#ff5c7a", glow: "#3df2e0" },
  { bg1: "#07243a", bg2: "#0b5a6b", acc: "#ffd23f", glow: "#ff5c7a" },
  { bg1: "#2a0f2e", bg2: "#6b1b4e", acc: "#3df2e0", glow: "#ffd23f" },
  { bg1: "#0f2a1a", bg2: "#1b6b4e", acc: "#ff9f43", glow: "#a0ff6b" },
];
