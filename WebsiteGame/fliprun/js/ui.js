/* =====================================================
   ui.js  -  HTML screens and buttons (not the canvas)
   Menu, Game Over card, stats numbers, share, sound toggle
   ===================================================== */

const $ = id => document.getElementById(id);
const menu = $('menu'), over = $('over');

function hideOverlays(){
  menu.classList.add('hidden');
  over.classList.add('hidden');
}

// Update Best / Today / Plays numbers on screen
function refreshStats(){
  $('hdrBest').textContent = best;
  $('mBest').textContent   = best;
  $('mToday').textContent  = getToday();
  $('mPlays').textContent  = plays;
}

// Show the Game Over card with score and a motivating message
function showGameOver(s, newBest){
  $('oScore').textContent = s;
  $('oBest').textContent  = best;
  $('oCoins').textContent = coinCount;
  $('oBadge').classList.toggle('hidden', !newBest);

  let msg;
  if(newBest) msg = 'That is your highest score ever. Can you push it further?';
  else if(best - s <= 30) msg = `So close! Only ${best - s} points away from your best.`;
  else msg = [
    'One more try?',
    'You were doing great. Go again!',
    'Time your flips early next time.',
    'Grab the middle coins for a bigger combo.'
  ][Math.floor(Math.random() * 4)];
  $('oMsg').textContent = msg;

  over.classList.remove('hidden');
  if(newBest) sfx.best();
}

function toast(t){
  const el = $('toast');
  el.textContent = t; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

function updateSoundButton(){
  $('soundBtn').textContent = muted ? 'Sound off' : 'Sound on';
}

/* ---------- Buttons ---------- */
$('playBtn').onclick  = start;
$('againBtn').onclick = start;

$('soundBtn').onclick = () => {
  muted = !muted;
  saveMuted();
  updateSoundButton();
};

$('shareBtn').onclick = async () => {
  const text = `I scored ${score()} in FlipRun! Can you beat me?`;
  try{
    if(navigator.share){ await navigator.share({title: 'FlipRun', text, url: GAME_URL}); return; }
    await navigator.clipboard.writeText(text + ' ' + GAME_URL);
    toast('Copied! Paste it to your friends');
  }catch(e){}
};
