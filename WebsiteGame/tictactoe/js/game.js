/* =====================================================
   game.js - Tic Tac Toe rules, rounds, score and run
   ===================================================== */

const BASE = {easy: 10, medium: 20, hard: 40};         // points for a win
const NAMES = {easy: 'Easy', medium: 'Medium', hard: 'Hard'};

const G = {
  state: 'menu',                 // menu | play | over
  mode: 'cpu',                   // cpu | two
  diff: 'easy',
  board: Array(9).fill(''),
  turn: 'X', over: false, busy: false, winLine: null,
  score: 0, streak: 0, round: 0, wins: 0,
  p2: {X: 0, O: 0, D: 0}
};

/* ---------- Start ---------- */
function startCpu(diff){
  G.mode = 'cpu'; G.diff = diff;
  G.score = 0; G.streak = 0; G.round = 0; G.wins = 0;
  G.state = 'play'; hideOverlays(); nextRound();
}
function startTwo(){
  G.mode = 'two'; G.p2 = {X: 0, O: 0, D: 0}; G.round = 0;
  G.state = 'play'; hideOverlays(); nextRound();
}

function nextRound(){
  G.round++;
  G.board = Array(9).fill('');
  G.over = false; G.busy = false; G.winLine = null;
  G.turn = G.round % 2 === 1 ? 'X' : 'O';              // who starts changes every round
  hideNext();
  updateAll();
  if(G.mode === 'cpu' && G.turn === 'O') cpuTurn();
}

/* ---------- Moves ---------- */
function cellClick(i){
  if(G.state !== 'play' || G.over || G.busy || G.board[i]) return;
  if(G.mode === 'cpu' && G.turn !== 'X') return;
  place(i);
}

function place(i){
  G.board[i] = G.turn;
  const r = winnerOf(G.board);
  if(r){ endRound(r); return; }
  G.turn = G.turn === 'X' ? 'O' : 'X';
  updateAll(i);
  if(G.mode === 'cpu' && G.turn === 'O') cpuTurn();
}

function cpuTurn(){
  G.busy = true; updateAll();
  setTimeout(() => {
    if(G.state !== 'play') return;
    G.busy = false;
    place(cpuMove(G.board, 'O', G.diff));
  }, 450);
}

/* ---------- End of a round ---------- */
function endRound(r){
  G.over = true; G.winLine = r.line;

  if(G.mode === 'two'){
    G.p2[r.w]++;
    updateAll();
    setStatus(r.w === 'D' ? 'Draw!' : `${r.w} wins this round!`);
    showNext('Next round');
    return;
  }

  if(r.w === 'X'){
    G.streak++; G.wins++;
    const pts = BASE[G.diff] + 5 * (G.streak - 1);
    G.score += pts;
    updateAll();
    setStatus(G.streak > 1 ? `You win! +${pts} (streak x${G.streak})` : `You win! +${pts}`);
    showNext('Next round');
  } else if(r.w === 'D'){
    G.streak = 0; G.score += 5;
    updateAll();
    setStatus('Draw. +5 points');
    showNext('Next round');
  } else {
    updateAll();
    setStatus('The computer wins this round!');
    setTimeout(() => finish(true), 1200);
  }
}

/* ---------- End of the run ---------- */
function finish(lost){
  if(G.state !== 'play') return;
  G.state = 'over';
  const newBest = saveResult(G.score);
  refreshStats();
  showOver(newBest, lost);
}

// "End game" button: finish the run (cpu) or go back to the menu (two players)
function endGame(){
  if(G.state !== 'play') return;
  if(G.mode === 'cpu') finish(false);
  else { G.state = 'menu'; showMenu(); }
}
