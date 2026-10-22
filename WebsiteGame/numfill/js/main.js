/* =====================================================
   main.js - Buttons, keyboard and start-up
   ===================================================== */

$('playBtn').onclick  = newRun;
$('againBtn').onclick = newRun;
$('hintBtn').onclick  = useHint;

$('board').addEventListener('click', e => {
  const el = e.target.closest('.cell');
  if(el) selectCell(+el.dataset.r, +el.dataset.c);
});
$('pad').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(b) setValue(+b.dataset.v);
});

window.addEventListener('keydown', e => {
  if(S.state !== 'play') return;
  if(e.key >= '0' && e.key <= '9'){ setValue(+e.key); return; }
  if(e.key === 'Backspace' || e.key === 'Delete'){ e.preventDefault(); setValue(0); return; }
  const mv = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]}[e.key];
  if(mv){ e.preventDefault(); moveSel(mv[0], mv[1]); }
});

$('shareBtn').onclick = async () => {
  const text = `I reached level ${S.level} with ${S.score} points in NumFill! Can you beat me?`;
  try{
    if(navigator.share){ await navigator.share({title: 'NumFill', text, url: location.href}); return; }
    await navigator.clipboard.writeText(text + ' ' + location.href);
    toast('Copied! Paste it to your friends');
  }catch(e){}
};

setInterval(updateTime, 250);
refreshStats();
initAds();
