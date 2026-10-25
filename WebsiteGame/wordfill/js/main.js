/* main.js - buttons, keyboard and start-up */

// menu choices
$('catOpts').addEventListener('click', e => {
  const b = e.target.closest('.opt'); if(!b) return;
  G.cat = b.dataset.cat;
  document.querySelectorAll('#catOpts .opt').forEach(x => x.classList.toggle('on', x === b));
});
$('modeOpts').addEventListener('click', e => {
  const b = e.target.closest('.opt'); if(!b) return;
  G.mode = b.dataset.mode;
  document.querySelectorAll('#modeOpts .opt').forEach(x => x.classList.toggle('on', x === b));
});

$('playBtn').onclick  = startRun;
$('againBtn').onclick = showMenu;            // change category / time, then play again
$('hintBtn').onclick  = useHint;
$('endBtn').onclick   = endGame;

// tap a blank to remove its letter / tap a letter to place it
$('word').addEventListener('click', e => { const t = e.target.closest('.tile'); if(t) tapSlot(+t.dataset.i); });
$('bank').addEventListener('click', e => { const k = e.target.closest('.key'); if(k) placeLetter(+k.dataset.bi); });

// keyboard: type letters, Backspace removes
window.addEventListener('keydown', e => {
  if(G.state !== 'play' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key === 'Backspace'){ e.preventDefault(); backspace(); }
  else if(/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
});

$('shareBtn').onclick = async () => {
  const text = `I scored ${G.score} in Word Fill (${G.cat}, ${MODES[G.mode].label})! Can you beat me?`;
  try{
    if(navigator.share){ await navigator.share({title: 'Word Fill', text, url: location.href}); return; }
    await navigator.clipboard.writeText(text + ' ' + location.href);
    toast('Copied! Paste it to your friends');
  }catch(e){}
};

setInterval(tick, 50);      // timer
buildMenu();
refreshStats();
initAds();
