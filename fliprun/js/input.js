/* =====================================================
   input.js  -  Touch, mouse and keyboard controls
   One action() works for all three.
   ===================================================== */

function action(){
  if(state === 'menu') start();
  else if(state === 'play') flip();
  else if(state === 'dead' && performance.now() - deadAt > 600) start();  // small delay so a late tap does not skip Game Over
}

// Touch / mouse on the game area (ignore taps on buttons)
$('stage').addEventListener('pointerdown', e => {
  if(e.target.closest('button')) return;
  e.preventDefault();
  action();
});

// Keyboard: Space, Up, Down, W
window.addEventListener('keydown', e => {
  if(['Space', 'ArrowUp', 'ArrowDown', 'KeyW'].includes(e.code)){
    e.preventDefault();
    if(!e.repeat) action();
  }
});
