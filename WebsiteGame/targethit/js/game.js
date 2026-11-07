/**
 * Target Hit - Core Game Orchestrator & Loop
 */
"use strict";

(function () {
  const BEST_KEY = "targethit_best";
  const BEST_STAGE_KEY = "targethit_best_stage";

  class Game {
    constructor() {
      this.initElements();
      this.initSystems();
      this.bindEvents();
      this.resizeCanvas();

      this.gameState = "MENU"; // 'MENU', 'PLAYING', 'PAUSED', 'STAGE_CLEAR', 'GAME_OVER'
      this.score = 0;
      this.stage = 1;
      this.requiredKnives = 7;
      this.remainingKnives = 7;
      this.applesCollectedThisRun = 0;

      this.screenShake = 0;
      this.vignetteFlash = 0;
      this.lastTime = performance.now();

      this.loadHighScores();
      this.updateHud();
      this.openStartMenu();

      // Start loop
      requestAnimationFrame((t) => this.loop(t));
    }

    initElements() {
      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.boardArea = document.getElementById("boardArea");
      this.phoneFrame = document.getElementById("phoneFrame");

      // HUD elements
      this.hdrBestEl = document.getElementById("hdrBest");
      this.hudScoreEl = document.getElementById("hudScore");
      this.hudStageEl = document.getElementById("hudStage");
      this.hudApplesEl = document.getElementById("hudApples");
      this.knifeRackEl = document.getElementById("knifeRack");
      this.throwBtn = document.getElementById("throwBtn");
      this.pauseBtn = document.getElementById("pauseBtn");
      this.soundToggleBtn = document.getElementById("soundToggleBtn");
      this.soundIcon = document.getElementById("soundIcon");

      // Modals
      this.startModal = document.getElementById("startModal");
      this.playBtn = document.getElementById("playBtn");
      this.shopBtn = document.getElementById("shopBtn");
      this.startBestScore = document.getElementById("startBestScore");
      this.startBestStage = document.getElementById("startBestStage");
      this.startApples = document.getElementById("startApples");

      this.pauseModal = document.getElementById("pauseModal");
      this.resumeBtn = document.getElementById("resumeBtn");
      this.restartBtn = document.getElementById("restartBtn");

      this.gameOverModal = document.getElementById("gameOverModal");
      this.finalScoreEl = document.getElementById("finalScore");
      this.overBestScore = document.getElementById("overBestScore");
      this.overStage = document.getElementById("overStage");
      this.overApples = document.getElementById("overApples");
      this.newBestBadge = document.getElementById("newBestBadge");
      this.playAgainBtn = document.getElementById("playAgainBtn");
      this.shareScoreBtn = document.getElementById("shareScoreBtn");
      this.shopOverBtn = document.getElementById("shopOverBtn");

      this.shopModal = document.getElementById("shopModal");
      this.closeShopBtn = document.getElementById("closeShopBtn");
      this.shopApplesCount = document.getElementById("shopApplesCount");
      this.weaponsGrid = document.getElementById("weaponsGrid");

      // Banners
      this.stageBanner = document.getElementById("stageBanner");
      this.stageBannerTitle = document.getElementById("stageBannerTitle");
      this.stageBannerSub = document.getElementById("stageBannerSub");
    }

    initSystems() {
      this.audio = new window.TargetHitAudio();
      this.particles = new window.ParticleSystem();
      this.weapons = new window.WeaponsManager();
      this.share = new window.ShareManager();

      this.updateSoundIcon();
    }

    updateSoundIcon() {
      if (this.soundIcon) {
        this.soundIcon.textContent = this.audio.enabled ? "🔊" : "🔇";
      }
    }

    loadHighScores() {
      try {
        this.bestScore = parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
        this.bestStage = parseInt(localStorage.getItem(BEST_STAGE_KEY), 10) || 1;
      } catch (e) {
        this.bestScore = 0;
        this.bestStage = 1;
      }
      if (this.hdrBestEl) this.hdrBestEl.textContent = this.bestScore;
      if (this.startBestScore) this.startBestScore.textContent = this.bestScore;
      if (this.startBestStage) this.startBestStage.textContent = this.bestStage;
      if (this.startApples) this.startApples.textContent = this.weapons.apples;
      if (this.hudApplesEl) this.hudApplesEl.textContent = this.weapons.apples;
    }

    saveHighScores() {
      let isNew = false;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        try {
          localStorage.setItem(BEST_KEY, this.bestScore);
        } catch (e) {}
        isNew = true;
      }
      if (this.stage > this.bestStage) {
        this.bestStage = this.stage;
        try {
          localStorage.setItem(BEST_STAGE_KEY, this.bestStage);
        } catch (e) {}
      }
      if (this.hdrBestEl) this.hdrBestEl.textContent = this.bestScore;
      return isNew;
    }

    resizeCanvas() {
      if (!this.boardArea || !this.canvas) return;
      const rect = this.boardArea.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.ctx.resetTransform?.();
        this.ctx.scale(dpr, dpr);
      }

      this.viewWidth = displayWidth;
      this.viewHeight = displayHeight;

      if (this.knifeCtrl) {
        this.knifeCtrl.launchX = this.viewWidth / 2;
        this.knifeCtrl.launchY = this.viewHeight - 100;
        this.knifeCtrl.canvasWidth = this.viewWidth;
        this.knifeCtrl.canvasHeight = this.viewHeight;
      }

      if (this.target) {
        this.target.canvasWidth = this.viewWidth;
        this.target.canvasHeight = this.viewHeight;
        this.target.x = this.viewWidth / 2;
        this.target.y = this.viewHeight * 0.31;
        this.target.baseY = this.target.y;
        this.target.radius = Math.min(this.viewWidth * 0.23, 86);
      }
    }

    bindEvents() {
      window.addEventListener("resize", () => this.resizeCanvas());

      // Throw inputs: click / tap on canvas or boardArea
      const handleThrow = (e) => {
        if (this.gameState === "PLAYING") {
          e.preventDefault();
          this.performThrow();
        }
      };

      if (this.boardArea) {
        this.boardArea.addEventListener("pointerdown", (e) => {
          // If clicking a modal or button, ignore
          if (e.target.closest(".modal-overlay") || e.target.closest("button")) return;
          handleThrow(e);
        });
      }

      if (this.throwBtn) {
        this.throwBtn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          handleThrow(e);
        });
      }

      // Keyboard support
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
          if (this.gameState === "PLAYING") {
            e.preventDefault();
            this.performThrow();
          }
        } else if (e.code === "KeyP" || e.code === "Escape") {
          if (this.gameState === "PLAYING") this.pauseGame();
          else if (this.gameState === "PAUSED") this.resumeGame();
        }
      });

      // Buttons
      if (this.playBtn) this.playBtn.addEventListener("click", () => this.startGame());
      if (this.pauseBtn) this.pauseBtn.addEventListener("click", () => this.pauseGame());
      if (this.resumeBtn) this.resumeBtn.addEventListener("click", () => this.resumeGame());
      if (this.restartBtn) this.restartBtn.addEventListener("click", () => this.startGame());
      if (this.playAgainBtn) this.playAgainBtn.addEventListener("click", () => this.startGame());

      if (this.soundToggleBtn) {
        this.soundToggleBtn.addEventListener("click", () => {
          this.audio.toggle();
          this.updateSoundIcon();
        });
      }

      // Weapons shop
      if (this.shopBtn) this.shopBtn.addEventListener("click", () => this.openShop());
      if (this.shopOverBtn) this.shopOverBtn.addEventListener("click", () => this.openShop());
      if (this.closeShopBtn) this.closeShopBtn.addEventListener("click", () => this.closeShop());

      // Share button
      if (this.shareScoreBtn) {
        this.shareScoreBtn.addEventListener("click", () => {
          this.share.open(this.score, this.stage, this.applesCollectedThisRun);
        });
      }

      // Quick Nav Back button
      const backBtn = document.getElementById("backBtn");
      if (backBtn) {
        backBtn.addEventListener("click", () => {
          if (window.history.length > 1) window.history.back();
          else window.location.href = "../index.html";
        });
      }
    }

    openStartMenu() {
      this.gameState = "MENU";
      this.startModal.classList.remove("hidden");
      this.pauseModal.classList.add("hidden");
      this.gameOverModal.classList.add("hidden");
      this.shopModal.classList.add("hidden");

      if (this.startApples) this.startApples.textContent = this.weapons.apples;
      if (this.startBestScore) this.startBestScore.textContent = this.bestScore;
      if (this.startBestStage) this.startBestStage.textContent = this.bestStage;

      this.setupStage(1);
    }

    startGame() {
      this.audio.playClick();
      this.audio.init();

      this.score = 0;
      this.stage = 1;
      this.applesCollectedThisRun = 0;
      this.particles.reset();

      this.startModal.classList.add("hidden");
      this.pauseModal.classList.add("hidden");
      this.gameOverModal.classList.add("hidden");
      this.shopModal.classList.add("hidden");

      this.setupStage(1);
      this.gameState = "PLAYING";
      this.showStageBanner("STAGE 1", "READY... AIM!");
    }

    pauseGame() {
      if (this.gameState !== "PLAYING") return;
      this.audio.playClick();
      this.gameState = "PAUSED";
      this.pauseModal.classList.remove("hidden");
    }

    resumeGame() {
      if (this.gameState !== "PAUSED") return;
      this.audio.playClick();
      this.pauseModal.classList.add("hidden");
      this.gameState = "PLAYING";
    }

    setupStage(stageNumber) {
      this.stage = stageNumber;
      const isBoss = stageNumber % 5 === 0;

      // Knives needed for this stage
      if (isBoss) {
        this.requiredKnives = 10 + Math.min(Math.floor(stageNumber / 5), 4);
      } else {
        this.requiredKnives = Math.min(6 + Math.floor(stageNumber / 2), 11);
      }
      this.remainingKnives = this.requiredKnives;

      this.target = new window.Target(this.viewWidth, this.viewHeight, stageNumber);
      if (!this.knifeCtrl) {
        this.knifeCtrl = new window.KnifeController(this.viewWidth, this.viewHeight);
      } else {
        this.knifeCtrl.reset(this.viewWidth, this.viewHeight);
      }

      this.updateHud();
      this.renderKnifeRack();
    }

    updateHud() {
      if (this.hudScoreEl) this.hudScoreEl.textContent = this.score;
      if (this.hudApplesEl) this.hudApplesEl.textContent = this.weapons.apples;

      if (this.hudStageEl) {
        const isBoss = this.stage % 5 === 0;
        if (isBoss) {
          this.hudStageEl.innerHTML = `<span class="boss-tag">BOSS</span> STAGE ${this.stage}`;
          this.hudStageEl.classList.add("boss-stage");
        } else {
          this.hudStageEl.textContent = `STAGE ${this.stage}`;
          this.hudStageEl.classList.remove("boss-stage");
        }
      }
    }

    renderKnifeRack() {
      if (!this.knifeRackEl) return;
      this.knifeRackEl.innerHTML = "";

      for (let i = 0; i < this.requiredKnives; i++) {
        const slot = document.createElement("div");
        slot.className = "knife-slot";
        if (i < this.remainingKnives) {
          slot.classList.add("active");
        } else {
          slot.classList.add("used");
        }
        slot.innerHTML = `<span class="knife-slot-icon">🗡️</span>`;
        this.knifeRackEl.appendChild(slot);
      }
    }

    showStageBanner(title, sub) {
      if (!this.stageBanner || !this.stageBannerTitle) return;
      this.stageBannerTitle.textContent = title;
      this.stageBannerSub.textContent = sub || "";
      this.stageBanner.classList.remove("hidden");
      this.stageBanner.classList.add("pop-in");

      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => {
        this.stageBanner.classList.add("hidden");
        this.stageBanner.classList.remove("pop-in");
      }, 1400);
    }

    performThrow() {
      if (!this.knifeCtrl.canThrow() || this.remainingKnives <= 0) return;

      const equippedWeapon = this.weapons.equipped;
      const thrown = this.knifeCtrl.throwKnife(equippedWeapon);
      if (thrown) {
        this.audio.playThrow();
      }
    }

    onHitTarget(contactX, contactY, appleSliced) {
      this.audio.playHitTarget();

      try {
        if (navigator.vibrate) navigator.vibrate(15);
      } catch (e) {}

      // Splinters
      const colors = this.target.getTargetColors();
      this.particles.emitSplinters(contactX, contactY, colors[0]);

      this.score++;
      this.remainingKnives--;
      this.updateHud();
      this.renderKnifeRack();

      // Check apple hit
      if (appleSliced) {
        this.audio.playHitApple();
        this.particles.emitAppleSlice(appleSliced.x, appleSliced.y, appleSliced.angle);
        this.weapons.addApples(2);
        this.applesCollectedThisRun += 2;
        this.updateHud();
      }

      // Check if stage is completed!
      if (this.remainingKnives <= 0) {
        this.completeStage();
      }
    }

    completeStage() {
      this.gameState = "STAGE_CLEAR";
      const isBoss = this.target.isBoss;

      this.audio.playTargetShatter();
      this.audio.playStageClear();

      // Shatter target chunks
      const colors = this.target.getTargetColors();
      this.particles.createTargetShatter(
        this.target.x,
        this.target.y,
        this.target.radius,
        colors[0],
        colors[1],
        this.target.embeddedKnives,
        this.weapons.equipped
      );

      if (isBoss) {
        this.particles.emitConfetti(this.viewWidth, this.viewHeight);
      }

      this.screenShake = 8;

      const nextStageNum = this.stage + 1;
      const isNextBoss = nextStageNum % 5 === 0;

      setTimeout(() => {
        if (isBoss) {
          this.showStageBanner("BOSS DEFEATED!", "OUTSTANDING SHOT!");
        } else if (isNextBoss) {
          this.audio.playBossIntro();
          this.showStageBanner(`BOSS INCOMING!`, `STAGE ${nextStageNum}`);
        } else {
          this.showStageBanner(`STAGE ${nextStageNum}`, "KEEP IT UP!");
        }

        setTimeout(() => {
          this.setupStage(nextStageNum);
          this.gameState = "PLAYING";
        }, 600);
      }, 700);
    }

    onDeflect(contactX, contactY) {
      this.audio.playHitKnife();
      this.audio.playGameOver();

      try {
        if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
      } catch (e) {}

      this.particles.emitSparks(contactX, contactY);
      this.screenShake = 14;
      this.vignetteFlash = 1.0;

      this.triggerGameOver();
    }

    triggerGameOver() {
      this.gameState = "GAME_OVER";
      const isNewBest = this.saveHighScores();

      setTimeout(() => {
        if (this.finalScoreEl) this.finalScoreEl.textContent = this.score;
        if (this.overBestScore) this.overBestScore.textContent = this.bestScore;
        if (this.overStage) this.overStage.textContent = this.stage;
        if (this.overApples) this.overApples.textContent = this.applesCollectedThisRun;

        if (this.newBestBadge) {
          if (isNewBest) this.newBestBadge.classList.remove("hidden");
          else this.newBestBadge.classList.add("hidden");
        }

        this.gameOverModal.classList.remove("hidden");
      }, 800);
    }

    // Weapons Shop Logic
    openShop() {
      this.audio.playClick();
      if (this.shopApplesCount) {
        this.shopApplesCount.textContent = this.weapons.apples;
      }
      this.renderShopGrid();
      this.shopModal.classList.remove("hidden");
    }

    closeShop() {
      this.audio.playClick();
      this.shopModal.classList.add("hidden");
      if (this.startApples) this.startApples.textContent = this.weapons.apples;
      if (this.hudApplesEl) this.hudApplesEl.textContent = this.weapons.apples;
    }

    renderShopGrid() {
      if (!this.weaponsGrid) return;
      this.weaponsGrid.innerHTML = "";

      window.WEAPONS_DATA.forEach((w) => {
        const isUnlocked = this.weapons.isUnlocked(w.id);
        const isEquipped = this.weapons.equipped === w.id;

        const card = document.createElement("div");
        card.className = `shop-item-card ${isEquipped ? "equipped" : ""} ${isUnlocked ? "unlocked" : "locked"}`;

        card.innerHTML = `
          <div class="shop-item-icon">${w.icon}</div>
          <h4 class="shop-item-name">${w.name}</h4>
          <p class="shop-item-desc">${w.desc}</p>
          <div class="shop-item-actions">
            ${
              isEquipped
                ? `<span class="badge-equipped">EQUIPPED</span>`
                : isUnlocked
                ? `<button class="btn-shop-select" data-id="${w.id}">EQUIP</button>`
                : `<button class="btn-shop-buy" data-id="${w.id}">
                    <span class="apple-tag">🍎 ${w.price}</span> UNLOCK
                   </button>`
            }
          </div>
        `;

        this.weaponsGrid.appendChild(card);
      });

      // Bind equip / buy clicks
      this.weaponsGrid.querySelectorAll(".btn-shop-select").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          this.weapons.equip(id);
          this.audio.playClick();
          this.renderShopGrid();
        });
      });

      this.weaponsGrid.querySelectorAll(".btn-shop-buy").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const ok = this.weapons.unlock(id);
          if (ok) {
            this.audio.playHitApple();
            this.share.showToast("Weapon unlocked & equipped! ⚔️");
            if (this.shopApplesCount) this.shopApplesCount.textContent = this.weapons.apples;
            this.renderShopGrid();
          } else {
            this.share.showToast("Not enough apples! 🍎");
          }
        });
      });
    }

    // Main Animation Frame Loop
    loop(currentTime) {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      if (this.gameState === "PLAYING" || this.gameState === "STAGE_CLEAR" || this.gameState === "MENU") {
        if (this.target) {
          this.target.update(dt);
        }

        if (this.knifeCtrl && this.gameState === "PLAYING") {
          this.knifeCtrl.update(
            dt,
            this.target,
            (cx, cy, apple) => this.onHitTarget(cx, cy, apple),
            (cx, cy) => this.onDeflect(cx, cy)
          );
        }
      }

      this.particles.update(dt);

      // Screenshake damping
      if (this.screenShake > 0) {
        this.screenShake -= 28 * dt;
        if (this.screenShake < 0) this.screenShake = 0;
      }

      // Vignette flash damping
      if (this.vignetteFlash > 0) {
        this.vignetteFlash -= 2.2 * dt;
        if (this.vignetteFlash < 0) this.vignetteFlash = 0;
      }
    }

    render() {
      const ctx = this.ctx;
      const w = this.viewWidth;
      const h = this.viewHeight;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Screenshake transform
      if (this.screenShake > 0) {
        const sx = (Math.random() - 0.5) * this.screenShake;
        const sy = (Math.random() - 0.5) * this.screenShake;
        ctx.translate(sx, sy);
      }

      const weaponsDrawer = (c, x, y, angle, wid, isEmb) =>
        this.weapons.drawWeapon(c, x, y, angle, wid, isEmb);

      // 1. Draw Target (if active or not shattered)
      if (this.target && this.gameState !== "STAGE_CLEAR") {
        this.target.draw(ctx, weaponsDrawer);
      }

      // 2. Draw Particles (splinters, sparks, apple halves, shattering fragments)
      this.particles.draw(ctx, weaponsDrawer);

      // 3. Draw Knife on launchpad and flying knife
      if (this.knifeCtrl && (this.gameState === "PLAYING" || this.gameState === "STAGE_CLEAR")) {
        this.knifeCtrl.draw(
          ctx,
          weaponsDrawer,
          this.remainingKnives,
          this.weapons.equipped
        );
      }

      // 4. Red clash vignette flash on collision
      if (this.vignetteFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 40, 70, ${Math.min(this.vignetteFlash * 0.4, 0.55)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // Initialize once DOM is loaded
  window.addEventListener("DOMContentLoaded", () => {
    window.gameInstance = new Game();
  });
})();
