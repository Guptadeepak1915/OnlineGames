/**
 * Fruit Slice Master - Main Game Engine & Controller
 * Integrates:
 * - audio.js (Web Audio API sound synthesis)
 * - particles.js (Juice droplet physics)
 * - fruit.js (Fruit entities & bomb physics)
 * - share.js (Social bragging & score sharing)
 */
(function () {
  "use strict";

  class FruitSliceGame {
    constructor() {
      // Audio Synthesizer
      const SoundConstructor = window.SoundFX || SoundFX;
      this.sound = new SoundConstructor();

      // Canvases
      this.sliceCanvas = document.getElementById("sliceCanvas");
      this.sliceCtx = this.sliceCanvas.getContext("2d");
      this.splatCanvas = document.getElementById("splatterCanvas");
      this.splatCtx = this.splatCanvas.getContext("2d");

      // HUD & Overlays
      this.hudScore = document.getElementById("hudScore");
      this.hdrBest = document.getElementById("hdrBest");
      this.pauseBtn = document.getElementById("pauseBtn");
      this.soundToggleBtn = document.getElementById("soundToggleBtn");
      this.soundIcon = document.getElementById("soundIcon");
      this.hdrShareBtn = document.getElementById("hdrShareBtn");
      this.strikeSlots = [
        document.getElementById("strike0"),
        document.getElementById("strike1"),
        document.getElementById("strike2"),
      ];

      // Banners & Popups
      this.comboBanner = document.getElementById("comboBanner");
      this.comboText = document.getElementById("comboText");
      this.comboBonus = document.getElementById("comboBonus");
      this.criticalBanner = document.getElementById("criticalBanner");
      this.toast = document.getElementById("toast");

      // Modals
      this.startModal = document.getElementById("startModal");
      this.playBtn = document.getElementById("playBtn");
      this.startBestScore = document.getElementById("startBestScore");
      this.startMaxCombo = document.getElementById("startMaxCombo");

      this.pauseModal = document.getElementById("pauseModal");
      this.resumeBtn = document.getElementById("resumeBtn");
      this.restartBtn = document.getElementById("restartBtn");

      this.gameOverModal = document.getElementById("gameOverModal");
      this.finalScore = document.getElementById("finalScore");
      this.overBestScore = document.getElementById("overBestScore");
      this.overMaxCombo = document.getElementById("overMaxCombo");
      this.overAccuracy = document.getElementById("overAccuracy");
      this.newBestBadge = document.getElementById("newBestBadge");
      this.shareScoreBtn = document.getElementById("shareScoreBtn");
      this.playAgainBtn = document.getElementById("playAgainBtn");

      // Share Modal
      this.shareDialogModal = document.getElementById("shareDialogModal");
      this.closeShareModalBtn = document.getElementById("closeShareModalBtn");
      this.shareQuotePreview = document.getElementById("shareQuotePreview");
      this.shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
      this.shareTwitterBtn = document.getElementById("shareTwitterBtn");
      this.shareCopyBtn = document.getElementById("shareCopyBtn");
      this.resetStatsBtn = document.getElementById("resetStatsBtn");

      // Game State
      this.score = 0;
      this.bestScore = parseInt(
        localStorage.getItem("fruitslice_best") || "0",
        10,
      );
      this.maxCombo = parseInt(
        localStorage.getItem("fruitslice_maxcombo") || "0",
        10,
      );
      this.strikes = 0;
      this.maxStrikes = 3;
      this.totalFruitsSpawned = 0;
      this.totalFruitsSliced = 0;

      this.isPlaying = false;
      this.isPaused = false;

      // Entities
      this.fruits = [];
      this.particles = [];
      this.bladeTrail = []; // [{ x, y, time }]
      this.currentStrokeSlices = 0;
      this.comboTimer = null;
      this.critTimer = null;
      this.toastTimer = null;

      // Spawning timer
      this.spawnTimer = 0;
      this.spawnInterval = 85; // Frames between spawns

      this.initCanvasSize();
      this.updateHudBest();
      this.bindEvents();
      this.startLoop();
    }

    initCanvasSize() {
      const resize = () => {
        const rect = this.sliceCanvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width;
        const h = rect.height;

        this.width = w;
        this.height = h;

        [this.sliceCanvas, this.splatCanvas].forEach((c) => {
          c.width = w * dpr;
          c.height = h * dpr;
          c.style.width = `${w}px`;
          c.style.height = `${h}px`;
        });

        this.sliceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.splatCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      window.addEventListener("resize", resize);
      setTimeout(resize, 40);
    }

    updateHudBest() {
      this.hdrBest.textContent = this.bestScore;
      this.startBestScore.textContent = this.bestScore;
      this.startMaxCombo.textContent = `${this.maxCombo}x`;
    }

    bindEvents() {
      // Unified Blade Input Handling (Mouse & Touch)
      let isPointerDown = false;

      const getPos = (e) => {
        const rect = this.sliceCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      };

      const onDown = (e) => {
        if (!this.isPlaying || this.isPaused) return;
        isPointerDown = true;
        const p = getPos(e);
        this.bladeTrail = [{ x: p.x, y: p.y, time: Date.now() }];
        this.currentStrokeSlices = 0;
      };

      const onMove = (e) => {
        if (!this.isPlaying || this.isPaused || !isPointerDown) return;
        const p = getPos(e);
        const now = Date.now();

        // Calculate speed to trigger whoosh sound
        if (this.bladeTrail.length > 0) {
          const last = this.bladeTrail[this.bladeTrail.length - 1];
          const dist = Math.hypot(p.x - last.x, p.y - last.y);
          if (dist > 35) {
            this.sound.playSwoosh();
          }

          // Test line intersection with fruits
          this.testSlice(last, p);
        }

        this.bladeTrail.push({ x: p.x, y: p.y, time: now });
      };

      const onUp = () => {
        if (!isPointerDown) return;
        isPointerDown = false;
        this.checkComboEnd();
      };

      this.sliceCanvas.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);

      this.sliceCanvas.addEventListener("touchstart", onDown, {
        passive: false,
      });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);

      // Buttons
      this.playBtn.addEventListener("click", () => this.startGame());
      this.playAgainBtn.addEventListener("click", () => this.startGame());

      this.pauseBtn.addEventListener("click", () => this.pauseGame());
      this.resumeBtn.addEventListener("click", () => this.resumeGame());
      this.restartBtn.addEventListener("click", () => {
        this.hideModal(this.pauseModal);
        this.startGame();
      });

      this.soundToggleBtn.addEventListener("click", () => {
        const enabled = this.sound.toggle();
        this.soundIcon.textContent = enabled ? "🔊" : "🔇";
      });

      // Share Score Handlers
      this.shareScoreBtn.addEventListener("click", () => this.openShareFlow());
      this.hdrShareBtn.addEventListener("click", () => this.openShareFlow());
      this.closeShareModalBtn.addEventListener("click", () =>
        this.hideModal(this.shareDialogModal),
      );
      this.shareCopyBtn.addEventListener("click", () => this.copyScoreText());

      this.resetStatsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Reset your best score and combo records?")) {
          localStorage.removeItem("fruitslice_best");
          localStorage.removeItem("fruitslice_maxcombo");
          this.bestScore = 0;
          this.maxCombo = 0;
          this.updateHudBest();
          this.showToast("Best score reset!");
        }
      });
    }

    startGame() {
      this.score = 0;
      this.strikes = 0;
      this.currentStrokeSlices = 0;
      this.totalFruitsSpawned = 0;
      this.totalFruitsSliced = 0;
      this.fruits = [];
      this.particles = [];
      this.bladeTrail = [];

      this.hudScore.textContent = "0";
      this.updateStrikesUI();

      this.hideModal(this.startModal);
      this.hideModal(this.gameOverModal);
      this.hideModal(this.pauseModal);
      this.hideModal(this.shareDialogModal);

      // Clear splatter canvas
      this.splatCtx.clearRect(0, 0, this.width, this.height);

      this.isPlaying = true;
      this.isPaused = false;
      this.sound.init();
    }

    pauseGame() {
      if (!this.isPlaying) return;
      this.isPaused = true;
      this.showModal(this.pauseModal);
    }

    resumeGame() {
      this.isPaused = false;
      this.hideModal(this.pauseModal);
    }

    /* ==========================================================================
       Blade Slicing & Collision Detection
       ========================================================================== */
    testSlice(p1, p2) {
      const cutAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      this.fruits.forEach((f) => {
        if (f.sliced || f.missed) return;

        // Line-segment to fruit circle distance test
        const dist = this.distToSegment(f.x, f.y, p1.x, p1.y, p2.x, p2.y);
        if (dist <= f.radius) {
          if (f.type.isBomb) {
            // DETONATE BOMB!
            f.slice(cutAngle);
            this.sound.playExplosion();
            this.triggerScreenFlash();
            this.addStrike(true); // Immediate Game Over / strike
          } else {
            // Sliced Fruit!
            f.slice(cutAngle);
            this.sound.playSlice();
            this.totalFruitsSliced++;
            this.currentStrokeSlices++;

            // Random Critical Slash (10% chance)
            const isCritical = Math.random() < 0.1;
            const pts = isCritical ? 10 : 1;
            this.score += pts;
            this.hudScore.textContent = this.score;

            if (isCritical) {
              this.showCriticalFlash();
            }

            // Juice Splatter Decal on Wooden Board
            this.addJuiceStain(f.x, f.y, f.type.juiceColor, f.radius);

            // Flying Juice Particles
            const ParticleClass = window.Particle || Particle;
            for (let i = 0; i < 20; i++) {
              this.particles.push(new ParticleClass(f.x, f.y, f.type.juiceColor));
            }
          }
        }
      });
    }

    distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    checkComboEnd() {
      if (this.currentStrokeSlices >= 3) {
        const bonus =
          this.currentStrokeSlices >= 5
            ? 8
            : this.currentStrokeSlices >= 4
              ? 5
              : 3;
        this.score += bonus;
        this.hudScore.textContent = this.score;

        if (this.currentStrokeSlices > this.maxCombo) {
          this.maxCombo = this.currentStrokeSlices;
          localStorage.setItem("fruitslice_maxcombo", this.maxCombo);
        }

        this.sound.playCombo(this.currentStrokeSlices);
        this.showComboBanner(this.currentStrokeSlices, bonus);
      }
      this.currentStrokeSlices = 0;
    }

    addJuiceStain(x, y, color, radius) {
      const ctx = this.splatCtx;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = color;

      // Organic splatter shape
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = radius * (0.8 + Math.random() * 0.9);
        const sr = 3 + Math.random() * 6;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(ang) * d,
          y + Math.sin(ang) * d,
          sr,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();
    }

    addStrike(isInstantBomb = false) {
      if (!this.isPlaying) return;

      this.strikes = isInstantBomb ? this.maxStrikes : this.strikes + 1;
      this.sound.playStrike();
      this.updateStrikesUI();

      if (this.strikes >= this.maxStrikes) {
        setTimeout(() => this.gameOver(), 350);
      }
    }

    updateStrikesUI() {
      this.strikeSlots.forEach((slot, idx) => {
        if (idx < this.strikes) {
          slot.classList.add("active");
        } else {
          slot.classList.remove("active");
        }
      });
    }

    triggerScreenFlash() {
      const originalBg = this.sliceCanvas.parentElement.style.backgroundColor;
      this.sliceCanvas.parentElement.style.backgroundColor = "#ff2a48";
      setTimeout(() => {
        this.sliceCanvas.parentElement.style.backgroundColor = originalBg;
      }, 100);
    }

    showComboBanner(slices, bonus) {
      this.comboText.textContent = `COMBO x${slices}!`;
      this.comboBonus.textContent = `+${bonus} PTS`;
      this.comboBanner.classList.remove("hidden");

      clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        this.comboBanner.classList.add("hidden");
      }, 800);
    }

    showCriticalFlash() {
      this.criticalBanner.classList.remove("hidden");
      clearTimeout(this.critTimer);
      this.critTimer = setTimeout(() => {
        this.criticalBanner.classList.add("hidden");
      }, 700);
    }

    gameOver() {
      this.isPlaying = false;
      this.sound.playGameOver();

      const isNewBest = this.score > this.bestScore;
      if (isNewBest) {
        this.bestScore = this.score;
        localStorage.setItem("fruitslice_best", this.bestScore);
        this.newBestBadge.classList.remove("hidden");
      } else {
        this.newBestBadge.classList.add("hidden");
      }

      this.finalScore.textContent = this.score;
      this.overBestScore.textContent = this.bestScore;
      this.overMaxCombo.textContent = `${this.maxCombo}x`;

      const accuracy =
        this.totalFruitsSpawned > 0
          ? Math.min(
              100,
              Math.round(
                (this.totalFruitsSliced / this.totalFruitsSpawned) * 100,
              ),
            )
          : 100;
      this.overAccuracy.textContent = `${accuracy}%`;

      this.updateHudBest();
      this.showModal(this.gameOverModal);
    }

    /* ==========================================================================
       Share Score Feature (Powered by share.js)
       ========================================================================== */
    openShareFlow() {
      const Share = window.FruitSliceShare || FruitSliceShare;
      Share.openShareFlow(this.score, this.maxCombo, () => {
        this.openShareModal();
      });
    }

    openShareModal() {
      const Share = window.FruitSliceShare || FruitSliceShare;
      Share.populateShareModal({
        score: this.score,
        maxCombo: this.maxCombo,
        previewEl: this.shareQuotePreview,
        waBtn: this.shareWhatsAppBtn,
        twBtn: this.shareTwitterBtn,
      });

      this.showModal(this.shareDialogModal);
    }

    copyScoreText() {
      const Share = window.FruitSliceShare || FruitSliceShare;
      Share.copyScoreText(this.score, this.maxCombo, (msg) => {
        this.showToast(msg);
      });
    }

    showToast(msg) {
      this.toast.textContent = msg;
      this.toast.classList.remove("hidden");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast.classList.add("hidden");
      }, 2400);
    }

    showModal(modal) {
      modal.classList.remove("hidden");
    }

    hideModal(modal) {
      modal.classList.add("hidden");
    }

    /* ==========================================================================
       Game Loop & Rendering
       ========================================================================== */
    startLoop() {
      const loop = () => {
        this.update();
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    update() {
      if (!this.isPlaying || this.isPaused) return;

      // Spawn fruits
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        // Spawn 1 to 3 fruits at once
        const count =
          1 +
          (Math.random() < 0.4 ? 1 : 0) +
          (this.score > 25 && Math.random() < 0.3 ? 1 : 0);
        
        const FruitClass = window.Fruit || Fruit;
        for (let i = 0; i < count; i++) {
          this.fruits.push(new FruitClass(this.width, this.height));
          this.totalFruitsSpawned++;
        }
      }

      // Update fruits
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const f = this.fruits[i];
        f.update();

        // Check if un-sliced fruit fell off screen (adds strike)
        if (f.missed && !f.type.isBomb) {
          this.addStrike(false);
          this.fruits.splice(i, 1);
        } else if (f.isDead()) {
          this.fruits.splice(i, 1);
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update();
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Prune blade trail older than 180ms
      const now = Date.now();
      this.bladeTrail = this.bladeTrail.filter((pt) => now - pt.time < 180);
    }

    render() {
      const ctx = this.sliceCtx;
      ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw Fruits
      this.fruits.forEach((f) => f.draw(ctx));

      // 2. Draw Flying Juice Particles
      this.particles.forEach((p) => p.draw(ctx));

      // 3. Draw Glowing Katana Blade Trail
      this.drawBladeTrail(ctx);
    }

    drawBladeTrail(ctx) {
      if (this.bladeTrail.length < 2) return;

      const now = Date.now();
      ctx.save();

      // Outer Cyan-White Glow
      ctx.strokeStyle = "rgba(147, 197, 253, 0.55)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.bladeTrail[0].x, this.bladeTrail[0].y);
      for (let i = 1; i < this.bladeTrail.length; i++) {
        ctx.lineTo(this.bladeTrail[i].x, this.bladeTrail[i].y);
      }
      ctx.stroke();

      // Razor-Sharp Core Blade
      for (let i = 1; i < this.bladeTrail.length; i++) {
        const p1 = this.bladeTrail[i - 1];
        const p2 = this.bladeTrail[i];
        const age = (now - p2.time) / 180;
        const width = (1 - age) * 7.5;

        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - age})`;
        ctx.lineWidth = Math.max(1, width);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // Initialize on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new FruitSliceGame());
  } else {
    new FruitSliceGame();
  }
})();
