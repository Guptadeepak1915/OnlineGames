/* =====================================================
   audio.js  -  Sound effects (no mp3 files needed)
   Sounds are made by the browser using WebAudio.
   ===================================================== */

let AC = null;

function beep(freq, dur, type = 'square', vol = .08, slide = 0){
  if(muted) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if(AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    if(slide) o.frequency.linearRampToValueAtTime(freq + slide, AC.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  }catch(e){}
}

const sfx = {
  flip(){ beep(420, .09, 'square', .05, 260); },
  land(){ beep(120, .06, 'triangle', .07); },
  coin(c){ beep(660 + c * 90, .12, 'sine', .09, 220); },
  die(){ beep(220, .45, 'sawtooth', .1, -190); },
  best(){ [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .15, 'sine', .1), i * 90)); },
  level(){ beep(500, .12, 'triangle', .08, 500); },
  start(){ beep(380, .1, 'triangle', .08, 300); }
};
