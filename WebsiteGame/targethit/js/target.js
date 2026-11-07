/**
 * Target Hit - Rotating Target & Collision Logic
 * Handles target rendering, rotation patterns, embedded knives, and collision detection.
 */
"use strict";

const SAFE_KNIFE_ANGLE = 0.24; // ~13.7 degrees minimum clearance between knives
const APPLE_COLLIDE_ANGLE = 0.2; // Clearance to slice an apple

class Target {
  constructor(canvasWidth, canvasHeight, stageNumber = 1) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.setup(stageNumber);
  }

  setup(stageNumber) {
    this.stage = stageNumber;
    this.isBoss = stageNumber % 5 === 0;

    // Dimensions
    this.radius = Math.min(this.canvasWidth * 0.23, 86);
    this.x = this.canvasWidth / 2;
    this.y = this.canvasHeight * 0.31;
    this.baseY = this.y;
    this.recoilY = 0;
    this.flashTimer = 0;

    // Rotation state
    this.angle = 0;
    this.time = 0;

    // Embedded Knives and Apples
    this.embeddedKnives = [];
    this.apples = [];

    // Select theme and rotation pattern
    this.selectThemeAndPattern(stageNumber);

    // Initial pre-embedded knives on harder stages (stage 3 onwards, but not stage 1 or 2)
    this.spawnInitialObstacles(stageNumber);

    // Spawn bonus apples
    this.spawnApples(stageNumber);
  }

  selectThemeAndPattern(stage) {
    if (this.isBoss) {
      const bossTypes = ["shield", "citrus", "cyber", "gold"];
      const bossIdx = (Math.floor(stage / 5) - 1) % bossTypes.length;
      this.theme = bossTypes[bossIdx];
      this.pattern = "BOSS_CHAOS";
      this.baseSpeed = 2.4 + Math.min(stage * 0.05, 1.2);
    } else {
      this.theme = "wood";
      const patterns = ["CONSTANT", "ACCEL_DECEL", "REVERSING", "STUTTER"];
      if (stage === 1) {
        this.pattern = "CONSTANT";
        this.baseSpeed = 1.6;
      } else if (stage === 2) {
        this.pattern = "ACCEL_DECEL";
        this.baseSpeed = 2.0;
      } else {
        const randPattern =
          patterns[(stage + Math.floor(Math.random() * 2)) % patterns.length];
        this.pattern = randPattern;
        this.baseSpeed = 1.8 + Math.min(stage * 0.08, 1.6);
      }
    }

    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.currentSpeed = this.baseSpeed * this.direction;
  }

  spawnInitialObstacles(stage) {
    if (stage <= 2) return;

    // Certain stages start with 1, 2, or 3 knives already lodged in the target!
    let obstacleCount = 0;
    if (this.isBoss) {
      obstacleCount = 1 + (stage >= 15 ? 1 : 0);
    } else if (stage >= 4 && stage % 2 === 0) {
      obstacleCount = Math.min(1 + Math.floor((stage - 4) / 4), 3);
    }

    const occupiedAngles = [];
    for (let i = 0; i < obstacleCount; i++) {
      let attempts = 0;
      while (attempts < 50) {
        attempts++;
        const candidate = Math.random() * Math.PI * 2;
        // Keep clear of the very bottom (where first throw aims)
        const bottomAngle = Math.PI / 2;
        const diffBottom = Math.abs(this.angleDiff(candidate, bottomAngle));
        if (diffBottom < 0.45) continue;

        const tooClose = occupiedAngles.some(
          (a) =>
            Math.abs(this.angleDiff(candidate, a)) < SAFE_KNIFE_ANGLE * 1.5,
        );
        if (!tooClose) {
          occupiedAngles.push(candidate);
          this.embeddedKnives.push({
            angle: candidate,
            weaponId: "classic",
          });
          break;
        }
      }
    }
  }

  spawnApples(stage) {
    // 50% chance of spawning an apple on the target
    if (Math.random() < 0.55 || stage === 1) {
      const appleCount = stage > 10 && Math.random() > 0.6 ? 2 : 1;
      for (let i = 0; i < appleCount; i++) {
        let attempts = 0;
        while (attempts < 40) {
          attempts++;
          const cand = Math.random() * Math.PI * 2;
          const tooCloseKnives = this.embeddedKnives.some(
            (k) => Math.abs(this.angleDiff(cand, k.angle)) < 0.35,
          );
          const tooCloseApples = this.apples.some(
            (a) => Math.abs(this.angleDiff(cand, a.angle)) < 0.5,
          );
          if (!tooCloseKnives && !tooCloseApples) {
            this.apples.push({
              angle: cand,
              sliced: false,
            });
            break;
          }
        }
      }
    }
  }

  // Calculate smallest angular difference in [-PI, PI]
  angleDiff(a, b) {
    let diff = (a - b) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  update(dt) {
    this.time += dt;

    // Calculate current rotation speed based on active pattern
    switch (this.pattern) {
      case "ACCEL_DECEL":
        this.currentSpeed =
          this.direction *
          (this.baseSpeed + Math.sin(this.time * 2.2) * (this.baseSpeed * 0.7));
        break;

      case "REVERSING":
        // Oscillates and flips direction every ~2.5 seconds
        const revPhase = Math.sin(this.time * 1.4);
        this.currentSpeed = this.baseSpeed * revPhase * 1.3;
        break;

      case "STUTTER":
        // Quick burst, micro freeze, quick burst
        const stCycle = (this.time * 1.8) % 3;
        if (stCycle < 1.4) {
          this.currentSpeed = this.direction * this.baseSpeed * 1.6;
        } else if (stCycle < 1.9) {
          this.currentSpeed = this.direction * 0.2; // Slow crawl
        } else {
          this.currentSpeed = -this.direction * this.baseSpeed * 1.2; // Quick counter twitch
        }
        break;

      case "BOSS_CHAOS":
        // Dynamic boss rhythm that scales with knives embedded
        const knifeBonus = this.embeddedKnives.length * 0.12;
        const wave1 = Math.sin(this.time * 2.8);
        const wave2 = Math.cos(this.time * 1.1);
        this.currentSpeed =
          this.direction *
          (this.baseSpeed + knifeBonus) *
          (0.8 + 0.9 * wave1 * wave2);
        break;

      case "CONSTANT":
      default:
        this.currentSpeed = this.baseSpeed * this.direction;
        break;
    }

    this.angle = (this.angle + this.currentSpeed * dt) % (Math.PI * 2);

    // Recoil spring dampening
    if (this.recoilY < 0) {
      this.recoilY += 120 * dt;
      if (this.recoilY > 0) this.recoilY = 0;
    }
    this.y = this.baseY + this.recoilY;

    // Flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
  }

  // Trigger recoil punch upward when hit
  hitRecoil() {
    this.recoilY = -12;
    this.flashTimer = 0.08;
  }

  /**
   * Collision check for newly arriving knife.
   * A knife thrown upwards from bottom contacts target at position x = target.x, y = target.y + target.radius.
   * In target-relative coordinates, this contact point corresponds to an angle relative to target rotation:
   * relativeAngle = (Math.PI / 2 - target.angle) normalized.
   */
  checkKnifeCollision(weaponId) {
    // Bottom point in target coordinates
    const contactAngle = this.normalizeAngle(Math.PI / 2 - this.angle);

    // 1. Check collision against all already-embedded knives
    for (let i = 0; i < this.embeddedKnives.length; i++) {
      const k = this.embeddedKnives[i];
      const diff = Math.abs(this.angleDiff(contactAngle, k.angle));
      if (diff < SAFE_KNIFE_ANGLE) {
        // DEFLECT / COLLISION!
        return {
          hit: false,
          deflected: true,
          contactX: this.x,
          contactY: this.y + this.radius,
          deflectedAngle: k.angle,
        };
      }
    }

    // 2. Safe hit! Embed knife into target
    this.embeddedKnives.push({
      angle: contactAngle,
      weaponId: weaponId || "classic",
    });

    this.hitRecoil();

    // 3. Check if knife hit any apple
    let appleSliced = null;
    for (let i = 0; i < this.apples.length; i++) {
      const app = this.apples[i];
      if (!app.sliced) {
        const diff = Math.abs(this.angleDiff(contactAngle, app.angle));
        if (diff < APPLE_COLLIDE_ANGLE) {
          app.sliced = true;
          // Calculate world position of apple
          const worldAngle = app.angle + this.angle;
          appleSliced = {
            index: i,
            x: this.x + Math.cos(worldAngle) * (this.radius + 8),
            y: this.y + Math.sin(worldAngle) * (this.radius + 8),
            angle: worldAngle,
          };
          break;
        }
      }
    }

    return {
      hit: true,
      deflected: false,
      contactX: this.x,
      contactY: this.y + this.radius,
      appleSliced: appleSliced,
    };
  }

  normalizeAngle(a) {
    let res = a % (Math.PI * 2);
    if (res < 0) res += Math.PI * 2;
    return res;
  }

  draw(ctx, weaponsDrawer) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw embedded knives first so they rotate with the target
    this.embeddedKnives.forEach((k) => {
      ctx.save();
      ctx.rotate(this.angle + k.angle);
      // Origin at target center; knife is drawn embedded at radius
      weaponsDrawer(ctx, 0, this.radius, 0, k.weaponId, true);
      ctx.restore();
    });

    // Draw attached apples
    this.apples.forEach((a) => {
      if (!a.sliced) {
        ctx.save();
        ctx.rotate(this.angle + a.angle);
        this.drawApple(ctx, 0, this.radius + 6);
        ctx.restore();
      }
    });

    // Draw the rotating core target
    ctx.rotate(this.angle);

    switch (this.theme) {
      case "shield":
        this.drawShieldTarget(ctx);
        break;
      case "citrus":
        this.drawCitrusTarget(ctx);
        break;
      case "cyber":
        this.drawCyberTarget(ctx);
        break;
      case "gold":
        this.drawGoldTarget(ctx);
        break;
      case "wood":
      default:
        this.drawWoodTarget(ctx);
        break;
    }

    // Flash hit overlay
    if (this.flashTimer > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw classic timber log target
  drawWoodTarget(ctx) {
    const r = this.radius;

    // Bark rim
    ctx.fillStyle = "#4a2511";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner wood surface
    ctx.fillStyle = "#c89456";
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
    ctx.fill();

    // Concentric growth rings
    ctx.strokeStyle = "rgba(90, 50, 20, 0.35)";
    ctx.lineWidth = 2.5;

    [0.28, 0.52, 0.76].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(0, 0, (r - 8) * ratio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Wood radial crack lines
    ctx.strokeStyle = "rgba(70, 35, 15, 0.45)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r * 0.15), Math.sin(a) * (r * 0.15));
      ctx.lineTo(Math.cos(a) * (r * 0.8), Math.sin(a) * (r * 0.8));
      ctx.stroke();
    }

    // Bullseye center knot
    ctx.fillStyle = "#633214";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw iron combat shield boss target
  drawShieldTarget(ctx) {
    const r = this.radius;

    // Spiked steel outer rim
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner bronze ring
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
    ctx.fill();

    // Iron center plate
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.fill();

    // Steel rivets around border
    ctx.fillStyle = "#e2e8f0";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a) * (r - 12),
        Math.sin(a) * (r - 12),
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Boss cross crest
    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(-6, -r + 24, 12, (r - 24) * 2);
    ctx.fillRect(-r + 24, -6, (r - 24) * 2, 12);

    // Center steel boss dome
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw citrus wheel boss target
  drawCitrusTarget(ctx) {
    const r = this.radius;

    // Green/Orange rind
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // White pith
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
    ctx.fill();

    // Citrus pulp wedges
    const segments = 8;
    const segAngle = (Math.PI * 2) / segments;
    ctx.fillStyle = "#f97316";

    for (let i = 0; i < segments; i++) {
      const a1 = i * segAngle + 0.08;
      const a2 = (i + 1) * segAngle - 0.08;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 12, a1, a2);
      ctx.closePath();
      ctx.fill();
    }

    // Core
    ctx.fillStyle = "#fffbeb";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw cyber pulse boss target
  drawCyberTarget(ctx) {
    const r = this.radius;

    // Dark titanium casing
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Glowing cyan plasma ring
    ctx.strokeStyle = "#3df2e0";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#3df2e0";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sector circuit spokes
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.lineTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
      ctx.stroke();
    }

    // Core pulsing reactor
    ctx.fillStyle = "#3df2e0";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw gilded vault boss target
  drawGoldTarget(ctx) {
    const r = this.radius;

    // Outer gear teeth
    ctx.fillStyle = "#b45309";
    const teeth = 12;
    for (let i = 0; i < teeth; i++) {
      const a = (i * Math.PI * 2) / teeth;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-6, -r, 12, 10);
      ctx.restore();
    }

    // Golden face
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Engraved ring
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.stroke();

    // Ruby Centerpiece
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw apple on target rim
  drawApple(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Apple Red Body
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(-3, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(3, -15, 4, -18);
    ctx.stroke();

    // Green Leaf
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(5, -15, 4, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getTargetColors() {
    switch (this.theme) {
      case "shield":
        return ["#1e293b", "#334155"];
      case "citrus":
        return ["#ea580c", "#f97316"];
      case "cyber":
        return ["#0f172a", "#3df2e0"];
      case "gold":
        return ["#ffd23f", "#b45309"];
      case "wood":
      default:
        return ["#c89456", "#4a2511"];
    }
  }
}

window.Target = Target;
window.SAFE_KNIFE_ANGLE = SAFE_KNIFE_ANGLE;
