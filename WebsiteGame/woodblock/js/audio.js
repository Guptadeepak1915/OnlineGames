/* =====================================================
   audio.js - wooden "knock" sounds made by the browser
   (no sound files needed). Turn off with the Sound button.
   ===================================================== */
let AC = null;
function audioCtx() {
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return null;
  AC = AC || new A();
  if (AC.state === "suspended") AC.resume();
  return AC;
}

// one wooden knock: a short low thud plus a tiny click of noise
function knock(freq = 160, vol = 0.25, dur = 0.1, delay = 0) {
  if (muted) return;
  try {
    const a = audioCtx();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);

    const len = Math.floor(a.sampleRate * 0.03),
      buf = a.createBuffer(1, len, a.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = a.createBufferSource();
    n.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq * 6;
    const ng = a.createGain();
    ng.gain.value = vol * 0.5;
    n.connect(f);
    f.connect(ng);
    ng.connect(a.destination);
    n.start(t);
  } catch (e) {}
}

const sfx = {
  pick() {
    knock(260, 0.12, 0.05);
  },
  place() {
    knock(150, 0.3, 0.1);
  },
  clear(lines) {
    for (let i = 0; i <= Math.min(lines, 4); i++)
      knock(190 + i * 75, 0.22, 0.11, i * 0.07);
  },
  bad() {
    knock(90, 0.2, 0.12);
  },
  over() {
    [0, 1, 2].forEach((i) => knock(150 - i * 25, 0.28, 0.16, i * 0.16));
  },
};
