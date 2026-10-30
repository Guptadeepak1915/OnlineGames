export function createSound(isEnabled) {
  let audioCtx = null;

  function tone(freq, dur, type = "sine", vol = 0.09, slide = 0, delay = 0) {
    if (!isEnabled()) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t = audioCtx.currentTime + delay,
        oscillator = audioCtx.createOscillator(),
        gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, t);
      if (slide)
        oscillator.frequency.linearRampToValueAtTime(freq + slide, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start(t);
      oscillator.stop(t + dur + 0.03);
    } catch (error) {}
  }

  return {
    move() {
      tone(420 + Math.random() * 70, 0.08, "triangle", 0.1);
    },
    click() {
      tone(560, 0.05, "square", 0.035);
    },
    undo() {
      tone(340, 0.1, "triangle", 0.08, -90);
    },
    hint() {
      tone(620, 0.14, "sine", 0.08, 220);
    },
    error() {
      tone(170, 0.12, "sawtooth", 0.045);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
        tone(freq, 0.24, "sine", 0.1, 0, i * 0.11),
      );
    },
  };
}
