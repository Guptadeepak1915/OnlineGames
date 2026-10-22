/* =====================================================
   tools/new-game.js - Creates a new game folder and adds it
   to the dashboard and sitemap automatically.

   Usage (run inside the WebsiteGame folder):
     node tools/new-game.js "Snake Rush" Arcade "Eat, grow and do not hit the wall."

   It makes:  snakerush/index.html, css/game.css, js/game.js
   (a tiny working demo you can replace with your real game)
   ===================================================== */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const [name, category = "Arcade", ...rest] = process.argv.slice(2);
const desc = rest.join(" ") || "A new free browser game.";

function fail(msg) {
  console.error("Error: " + msg);
  process.exit(1);
}
if (!name)
  fail('Usage: node tools/new-game.js "Game Name" [Category] [Description]');

const slug = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "")
  .slice(0, 24);
if (!slug) fail("Please use letters or numbers in the game name.");
const dir = path.join(root, slug);
if (fs.existsSync(dir)) fail(`Folder "${slug}" already exists.`);

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const art =
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();
const palettes = [
  ["#ff9f43", "#6b1b4e"],
  ["#a0ff6b", "#0b5a6b"],
  ["#ffd23f", "#3b1b6b"],
  ["#3df2e0", "#2a0f2e"],
  ["#ff5c7a", "#0f2a1a"],
];
const [c1, c2] = palettes[Math.floor(Math.random() * palettes.length)];

fs.mkdirSync(path.join(dir, "css"), { recursive: true });
fs.mkdirSync(path.join(dir, "js"), { recursive: true });

/* ---------- index.html ---------- */
fs.writeFileSync(
  path.join(dir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} - Free online game</title>
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:wght@600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css">
<link rel="stylesheet" href="css/game.css">
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">${esc(name.toUpperCase())}</div>
    <div class="hdr-right">
      <div class="pill">Best<b id="hdrBest">0</b></div>
      <a class="icon-btn" href="../index.html" style="text-decoration:none">All games</a>
    </div>
  </header>

  <div class="ad-slot" data-slot="">Ad space (banner)</div>

  <!-- GAME AREA: replace this demo with your real game -->
  <div class="stage" id="stage">
    <div class="demo">
      <div class="stats">
        <div class="stat"><small>Score</small><strong id="score">0</strong></div>
        <div class="stat"><small>Time</small><strong id="time">10</strong></div>
      </div>
      <button class="btn" id="tapBtn">Start</button>
      <p id="msg">Tap as many times as you can in 10 seconds.</p>
    </div>
  </div>

  <section class="info">
    <h2>How to play ${esc(name)}</h2>
    <p>${esc(desc)} Write the rules, scoring and tips for your game here. A clear text section helps visitors and search engines.</p>
  </section>

  <div class="ad-slot" data-slot="">Ad space (banner)</div>

  <footer>
    <a href="../index.html">Games</a><a href="../blog/">Blog</a><a href="../privacy.html">Privacy Policy</a><a href="../about.html">About</a><a href="../contact.html">Contact</a>
  </footer>
</div>
<script src="../assets/js/site-config.js"></script>
<script src="js/game.js"></script>
<script src="../assets/js/ads.js"></script>
<script>initAds();</script>
</body>
</html>
`,
);

/* ---------- css/game.css ---------- */
fs.writeFileSync(
  path.join(dir, "css/game.css"),
  `/* Styles only for ${name}. Shared theme is in ../assets/css/style.css */
.stage{background:var(--panel);padding:24px 16px;min-height:320px}
.demo{max-width:360px;margin:0 auto;text-align:center}
.demo .btn{font-size:26px;padding:26px 14px}
`,
);

/* ---------- js/game.js (tiny demo: tap counter) ---------- */
fs.writeFileSync(
  path.join(dir, "js/game.js"),
  `/* ${name} - starter code (tap counter demo). Replace with your game.
   Best score is saved with the key "${slug}_best", which the dashboard reads. */
const BEST_KEY = '${slug}_best';

const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
let best = +store.get(BEST_KEY, 0);
let score = 0, left = 10, timer = null, running = false;
const $ = id => document.getElementById(id);

function show(){ $('score').textContent = score; $('time').textContent = left; $('hdrBest').textContent = best; }

function start(){
  score = 0; left = 10; running = true; show();
  $('tapBtn').textContent = 'TAP!'; $('msg').textContent = 'Go go go!';
  timer = setInterval(() => { left--; show(); if(left <= 0) end(); }, 1000);
}
function end(){
  clearInterval(timer); running = false;
  const isBest = score > best;
  if(isBest){ best = score; store.set(BEST_KEY, best); }
  $('tapBtn').textContent = 'Play again';
  $('msg').textContent = (isBest ? 'New best! ' : '') + 'You tapped ' + score + ' times.';
  show();
}
$('tapBtn').onclick = () => { if(!running) start(); else { score++; show(); } };
show();
`,
);

/* ---------- register on dashboard ---------- */
const gdPath = path.join(root, "assets/js/games-data.js");
let gd = fs.readFileSync(gdPath, "utf8");
const marker = "  // ADD NEW GAMES ABOVE THIS LINE";
if (!gd.includes(marker))
  fail("Marker line not found in assets/js/games-data.js");
const q = (s) => JSON.stringify(String(s));
gd = gd.replace(
  marker,
  `  {
    id: ${q(slug)},
    name: ${q(name)},
    folder: ${q(slug + "/")},
    category: ${q(category)},
    desc: ${q(desc)},
    bestKey: ${q(slug + "_best")},
    art: ${q(art)}, c1: '${c1}', c2: '${c2}',
    isNew: true
  },
` + marker,
);
fs.writeFileSync(gdPath, gd);

/* ---------- add to sitemap ---------- */
const smPath = path.join(root, "sitemap.xml");
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, "utf8");
  const m = sm.match(/<loc>(https?:\/\/[^/<]+)\//);
  if (m && !sm.includes(`/${slug}/<`))
    sm = sm.replace(
      "</urlset>",
      `  <url><loc>${m[1]}/${slug}/</loc></url>\n</urlset>`,
    );
  fs.writeFileSync(smPath, sm);
}

console.log(`Done! Created folder "${slug}" and added it to the dashboard.`);
console.log(`Open ${slug}/index.html to see the starter game.`);
