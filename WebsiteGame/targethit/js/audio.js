/**
 * Target Hit - Procedural Web Audio Synthesizer
 * High-performance, zero-asset, procedural sound effects using Web Audio API
 */
"use strict";

class TargetHitAudio {
  constructor() {
    this.ctx = null;
    try {
      this.enabled = localStorage.getItem("targethit_sound") !== "false";
    } catch (e) {
      this.enabled = true;
    }
  }

  init() {
    try {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {}
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("targethit_sound", this.enabled);
    } catch (e) {}
    return this.enabled;
  }

  // Quick whoosh as a knife is launched
  playThrow() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // Satisfying solid thunk when knife embeds in wood/target
  playHitTarget() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Body punch
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(260, t);
      osc1.frequency.exponentialRampToValueAtTime(55, t + 0.14);

      gain1.gain.setValueAtTime(0.35, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.14);

      // Wood resonance click
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(680, t);
      osc2.frequency.exponentialRampToValueAtTime(180, t + 0.08);

      gain2.gain.setValueAtTime(0.2, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.08);
    } catch (e) {}
  }

  // Sharp metallic clank/deflect when knife hits an existing knife
  playHitKnife() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Two detuned high square/sine tones for metal chime
      const freqs = [1420, 2180, 2950];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.35);

        gain.gain.setValueAtTime(0.25 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (e) {}
  }

  // Crunchy slice + bell chime when apple/gem is hit
  playHitApple() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // High bell chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {}
  }

  // Big shattering explosion when target breaks
  playTargetShatter() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Deep rumble
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.45);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);

      // Noise blast
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.35);
    } catch (e) {}
  }

  // Ascending triumph arpeggio for Stage Clear
  playStageClear() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.25);
      });
    } catch (e) {}
  }

  // Dramatic brass horn for Boss Stage
  playBossIntro() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      [130.81, 164.81, 196.0].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    } catch (e) {}
  }

  // Game over descending stinger
  playGameOver() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [392.0, 369.99, 349.23, 293.66]; // G4, F#4, F4, D4

      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.24, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.22);
      });
    } catch (e) {}
  }

  // Simple UI button click
  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }
}

window.TargetHitAudio = TargetHitAudio;
