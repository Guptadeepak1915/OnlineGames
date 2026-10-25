/* =====================================================
   game.js - Word Fill rules, timer, score and lives
   ===================================================== */

/* ---------- Settings (change numbers here) ---------- */
const MODES = {
  easy:   {label: 'Easy',   sec: 15, mult: 1,   decoys: 3},    // sec = time for each word
  medium: {label: 'Medium', sec: 10, mult: 1.5, decoys: 4},    // mult = score multiplier
  hard:   {label: 'Hard',   sec: 5,  mult: 2,   decoys: 5}     // decoys = extra wrong letters
};
const START_LIVES = 3, START_HINTS = 2;
const EXTRA_SEC_PER_BLANK = 1;       // +1 second for every blank after the first
const WORDS_PER_STEP = 4;            // after every 4 solved words, 1 more blank (max 4)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const G = {
  state: 'menu',                     // menu | play | over
  cat: store.get('wordfill_cat', 'Mixed'),
  mode: store.get('wordfill_mode', 'medium'),
  word: '', curCat: '', slots: [], bank: [], sel: null,
  score: 0, lives: START_LIVES, streak: 0, solved: 0, hints: START_HINTS, num: 0,
  deadline: 0, total: 10, busy: false, seen: new Set(), lastWord: '', lost: false
};
if(G.cat !== 'Mixed' && !CATEGORIES[G.cat]) G.cat = 'Mixed';
if(!MODES[G.mode]) G.mode = 'medium';

const rand = n => Math.floor(Math.random() * n);
function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- Start a run ---------- */
function startRun(){
  store.set('wordfill_cat', G.cat); store.set('wordfill_mode', G.mode);
  G.score = 0; G.lives = START_LIVES; G.streak = 0; G.solved = 0; G.hints = START_HINTS; G.num = 0;
  G.seen = new Set(); G.lost = false; G.lastWord = '';
  G.state = 'play'; hideOverlays();
  nextWord();
}

/* ---------- Pick a word and make blanks ---------- */
function pickWord(){
  let pool = [];
  if(G.cat === 'Mixed') Object.keys(CATEGORIES).forEach(c => CATEGORIES[c].forEach(w => pool.push({w, c})));
  else CATEGORIES[G.cat].forEach(w => pool.push({w, c: G.cat}));
  let fresh = pool.filter(p => !G.seen.has(p.w));
  if(!fresh.length){ G.seen.clear(); fresh = pool; }
  const p = fresh[rand(fresh.length)];
  G.seen.add(p.w);
  return p;
}

function nextWord(){
  const {w, c} = pickWord();
  G.word = w; G.curCat = c; G.num++;

  // how many blanks: grows as you solve words (but at least 2 letters stay visible)
  const nb = Math.max(1, Math.min(1 + Math.floor(G.solved / WORDS_PER_STEP), 4, Math.floor(w.length / 2)));
  const pos = shuffle(w.split('').map((_, i) => i)).slice(0, nb);
  G.slots = w.split('').map((ch, i) => ({ch, blank: pos.includes(i), val: '', bi: -1, hinted: false, state: ''}));

  // letter bank: the missing letters + some wrong letters, shuffled
  const need = G.slots.filter(s => s.blank).map(s => s.ch);
  const decoys = shuffle(ALPHABET.filter(l => !need.includes(l))).slice(0, MODES[G.mode].decoys);
  G.bank = shuffle(need.concat(decoys)).map(ch => ({ch, used: false}));

  G.sel = G.slots.findIndex(s => s.blank);
  G.total = MODES[G.mode].sec + (nb - 1) * EXTRA_SEC_PER_BLANK;
  G.deadline = performance.now() + G.total * 1000;
  G.busy = false;
  setStatus('Fill the missing letters');
  render();
}

/* ---------- Player actions ---------- */
const blankIdx = () => G.slots.map((s, i) => s.blank ? i : -1).filter(i => i >= 0);
const firstEmpty = () => blankIdx().find(i => !G.slots[i].val);

function placeLetter(bi){
  if(G.state !== 'play' || G.busy) return;
  const item = G.bank[bi];
  if(!item || item.used) return;
  let t = (G.sel !== null && G.slots[G.sel].blank && !G.slots[G.sel].val) ? G.sel : firstEmpty();
  if(t === undefined) return;
  const s = G.slots[t];
  s.val = item.ch; s.bi = bi; item.used = true;
  const nxt = firstEmpty(); G.sel = nxt === undefined ? null : nxt;
  render();
  if(firstEmpty() === undefined) checkAnswer();
}

function tapSlot(i){
  if(G.state !== 'play' || G.busy) return;
  const s = G.slots[i];
  if(!s.blank || s.hinted) return;
  if(s.val){ G.bank[s.bi].used = false; s.val = ''; s.bi = -1; }
  G.sel = i;
  render();
}

function backspace(){
  if(G.state !== 'play' || G.busy) return;
  const filled = blankIdx().filter(i => G.slots[i].val && !G.slots[i].hinted);
  if(filled.length) tapSlot(filled[filled.length - 1]);
}

function typeLetter(ch){
  const bi = G.bank.findIndex(b => !b.used && b.ch === ch);
  if(bi >= 0) placeLetter(bi);
}

function useHint(){
  if(G.state !== 'play' || G.busy || G.hints <= 0) return;
  let t = (G.sel !== null && G.slots[G.sel].blank && !G.slots[G.sel].val) ? G.sel : firstEmpty();
  if(t === undefined){                                  // all full but wrong: fix the first wrong letter
    t = blankIdx().find(i => G.slots[i].val !== G.slots[i].ch && !G.slots[i].hinted);
    if(t === undefined) return;
  }
  const s = G.slots[t];
  if(s.val){ G.bank[s.bi].used = false; s.val = ''; s.bi = -1; }
  let bi = G.bank.findIndex(b => !b.used && b.ch === s.ch);
  if(bi < 0){                                           // the needed letter is sitting in a wrong box: take it back
    const other = G.slots.findIndex(x => x.blank && !x.hinted && x.val === s.ch);
    const o = G.slots[other]; G.bank[o.bi].used = false; o.val = ''; o.bi = -1;
    bi = G.bank.findIndex(b => !b.used && b.ch === s.ch);
  }
  s.val = s.ch; s.bi = bi; s.hinted = true; G.bank[bi].used = true;
  G.hints--;
  const nxt = firstEmpty(); G.sel = nxt === undefined ? null : nxt;
  render();
  if(firstEmpty() === undefined) checkAnswer();
}

/* ---------- Check the answer ---------- */
function checkAnswer(){
  const made = G.slots.map(s => s.blank ? s.val : s.ch).join('');
  if(made === G.word) correct(); else wrong('Not quite!');
}

function correct(){
  G.busy = true;
  const left = Math.max(0, (G.deadline - performance.now()) / 1000);
  const nb = G.slots.filter(s => s.blank).length;
  const pts = Math.round((10 * nb + Math.ceil(left) * 2 + Math.min(G.streak, 10) * 3) * MODES[G.mode].mult);
  G.score += pts; G.streak++; G.solved++;
  G.slots.forEach(s => { if(s.blank) s.state = 'ok'; });
  setStatus(`Correct! +${pts}` + (G.streak > 1 ? ` (streak x${G.streak})` : ''));
  render(); updateHUD();
  setTimeout(() => { if(G.state === 'play') nextWord(); }, 800);
}

function wrong(msg){
  G.busy = true; G.lives--; G.streak = 0; G.lastWord = G.word;
  G.slots.forEach(s => { if(s.blank){ s.state = s.val === s.ch ? 'ok' : 'bad'; s.val = s.ch; } });   // show the right word
  setStatus(`${msg} The word was ${G.word}`);
  render(); updateHUD(); shake();
  setTimeout(() => {
    if(G.state !== 'play') return;
    if(G.lives <= 0) finish(true); else nextWord();
  }, 1500);
}

function timeUp(){ if(G.state === 'play' && !G.busy) wrong("Time's up!"); }

/* ---------- Timer (called many times a second) ---------- */
function tick(){
  if(G.state !== 'play' || G.busy) return;
  const left = (G.deadline - performance.now()) / 1000;
  updateTimer(Math.max(0, left));
  if(left <= 0) timeUp();
}

// keep the clock fair when the tab is hidden
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ hiddenAt = performance.now(); }
  else if(hiddenAt && G.state === 'play' && !G.busy){ G.deadline += performance.now() - hiddenAt; hiddenAt = 0; }
});

/* ---------- End of the run ---------- */
function finish(lost){
  if(G.state !== 'play') return;
  G.state = 'over'; G.lost = !!lost;
  const newBest = saveResult(G.score);
  refreshStats();
  showOver(newBest);
}
function endGame(){ finish(false); }
