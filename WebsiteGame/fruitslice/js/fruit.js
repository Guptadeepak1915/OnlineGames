/**
 * Fruit Slice Master - Fruit Archetypes & Physics Entity Class
 */
"use strict";

const FRUIT_TYPES = {
  WATERMELON: {
    name: "Watermelon",
    radius: 38,
    skinColor: "#2d6a4f",
    rindColor: "#b7e4c7",
    fleshColor: "#ff2a55",
    juiceColor: "#ff2a55",
    seeds: true,
    points: 1,
  },
  ORANGE: {
    name: "Orange",
    radius: 34,
    skinColor: "#f97316",
    rindColor: "#fed7aa",
    fleshColor: "#ea580c",
    juiceColor: "#f97316",
    segments: true,
    points: 1,
  },
  STRAWBERRY: {
    name: "Strawberry",
    radius: 28,
    skinColor: "#e11d48",
    rindColor: "#fda4af",
    fleshColor: "#be123c",
    juiceColor: "#e11d48",
    seeds: true,
    points: 1,
  },
  BANANA: {
    name: "Banana",
    radius: 32,
    skinColor: "#facc15",
    rindColor: "#fef08a",
    fleshColor: "#fef9c3",
    juiceColor: "#facc15",
    points: 1,
  },
  PINEAPPLE: {
    name: "Pineapple",
    radius: 40,
    skinColor: "#b45309",
    rindColor: "#fde047",
    fleshColor: "#eab308",
    juiceColor: "#eab308",
    pineappleCore: true,
    points: 1,
  },
  COCONUT: {
    name: "Coconut",
    radius: 35,
    skinColor: "#451a03",
    rindColor: "#78350f",
    fleshColor: "#ffffff",
    juiceColor: "rgba(255, 255, 255, 0.9)",
    points: 1,
  },
  BOMB: {
    name: "Bomb",
    radius: 32,
    isBomb: true,
    points: 0,
  },
};

class Fruit {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth && canvasWidth > 0 ? canvasWidth : 360;
    this.canvasHeight = canvasHeight && canvasHeight > 0 ? canvasHeight : 480;

    // Select random fruit or bomb (~18% chance of bomb after score > 5)
    const keys = Object.keys(FRUIT_TYPES);
    const isBomb = Math.random() < 0.16;
    this.type = isBomb
      ? FRUIT_TYPES.BOMB
      : FRUIT_TYPES[keys[Math.floor(Math.random() * (keys.length - 1))]];

    this.radius = this.type.radius;
    this.x = canvasWidth * 0.15 + Math.random() * (canvasWidth * 0.7);
    this.y = canvasHeight + this.radius + 10;

    // Trajectory physics
    const targetX = canvasWidth * 0.2 + Math.random() * (canvasWidth * 0.6);
    this.vx = (targetX - this.x) * 0.024 + (Math.random() * 2 - 1);
    this.vy = -(canvasHeight * 0.021 + Math.random() * 3.5);
    this.gravity = 0.28;

    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = Math.random() * 0.08 - 0.04;

    // State
    this.sliced = false;
    this.missed = false;
    this.halves = [];
    this.fuseSparkTimer = 0;
  }

  update() {
    if (!this.sliced) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.rotation += this.rotationSpeed;

      // Check if fell off screen without being sliced
      if (this.y > this.canvasHeight + 70 && this.vy > 0) {
        this.missed = true;
      }
    } else {
      // Update severed halves
      this.halves.forEach((h) => {
        h.x += h.vx;
        h.y += h.vy;
        h.vy += this.gravity;
        h.rotation += h.rotationSpeed;
      });
    }
  }

  slice(cutAngle) {
    if (this.sliced) return;
    this.sliced = true;

    if (this.type.isBomb) return; // Bombs detonate

    // Spawn 2 severed halves separating perpendicular to cut line
    const pushSpeed = 4.5 + Math.random() * 2;
    const normalAngle = cutAngle + Math.PI / 2;

    this.halves = [
      {
        x: this.x,
        y: this.y,
        vx: this.vx + Math.cos(normalAngle) * pushSpeed,
        vy: this.vy + Math.sin(normalAngle) * pushSpeed - 1.5,
        rotation: this.rotation,
        rotationSpeed: this.rotationSpeed - 0.08,
        side: -1,
      },
      {
        x: this.x,
        y: this.y,
        vx: this.vx - Math.cos(normalAngle) * pushSpeed,
        vy: this.vy - Math.sin(normalAngle) * pushSpeed - 1.5,
        rotation: this.rotation,
        rotationSpeed: this.rotationSpeed + 0.08,
        side: 1,
      },
    ];
  }

  isDead() {
    if (!this.sliced) return this.missed;
    if (this.type.isBomb) return true;
    return this.halves.every((h) => h.y > this.canvasHeight + 100);
  }

  draw(ctx) {
    if (!this.sliced) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      if (this.type.isBomb) {
        this.drawBomb(ctx);
      } else {
        this.drawWholeFruit(ctx);
      }
      ctx.restore();
    } else {
      this.halves.forEach((h) => {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);
        this.drawHalfFruit(ctx, h.side);
        ctx.restore();
      });
    }
  }

  drawWholeFruit(ctx) {
    const r = this.radius;
    // Drop Shadow
    ctx.beginPath();
    ctx.arc(4, 6, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();

    // Outer Skin
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = this.type.skinColor;
    ctx.fill();

    // Watermelon stripes
    if (this.type === FRUIT_TYPES.WATERMELON) {
      ctx.strokeStyle = "#1b4332";
      ctx.lineWidth = 4;
      for (let a = -r + 10; a <= r - 10; a += 16) {
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.asin(a / r), Math.PI - Math.asin(a / r));
        ctx.stroke();
      }
    }

    // Specular 3D highlight
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    grad.addColorStop(0.5, "transparent");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.3)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Stem or leaf for orange/strawberry/pineapple
    if (
      this.type === FRUIT_TYPES.ORANGE ||
      this.type === FRUIT_TYPES.STRAWBERRY
    ) {
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(0, -r, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHalfFruit(ctx, side) {
    const r = this.radius;
    ctx.save();
    ctx.beginPath();
    // Clip to semi-circle based on severed side
    if (side < 0) {
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.clip();

    // Outer Rind
    ctx.fillStyle = this.type.skinColor;
    ctx.fill();

    // Inner Rind boundary
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.fillStyle = this.type.rindColor;
    ctx.fill();

    // Juicy Pulp Core
    ctx.beginPath();
    ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
    ctx.fillStyle = this.type.fleshColor;
    ctx.fill();

    // Watermelon / Strawberry seeds
    if (this.type.seeds) {
      ctx.fillStyle = "#1c1917";
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI + (side > 0 ? 0 : Math.PI);
        const dist = r * 0.55;
        ctx.beginPath();
        ctx.arc(
          Math.cos(ang) * dist,
          Math.sin(ang) * dist,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();

    // Flat cut line edge
    ctx.strokeStyle = this.type.rindColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
  }

  drawBomb(ctx) {
    const r = this.radius;
    // Shadow
    ctx.beginPath();
    ctx.arc(4, 6, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    // Obsidian Iron Body
    const bombGrad = ctx.createRadialGradient(
      -r * 0.35,
      -r * 0.35,
      2,
      0,
      0,
      r,
    );
    bombGrad.addColorStop(0, "#52525b");
    bombGrad.addColorStop(0.5, "#18181b");
    bombGrad.addColorStop(1, "#09090b");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bombGrad;
    ctx.fill();

    // Bomb Cap
    ctx.fillStyle = "#71717a";
    ctx.fillRect(-6, -r - 5, 12, 6);

    // Sizzling Fuse Rope
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r - 5);
    ctx.quadraticCurveTo(8, -r - 16, 4, -r - 22);
    ctx.stroke();

    // Animated Flying Sparks
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(4, -r - 22, 4 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      4 + (Math.random() * 6 - 3),
      -r - 22 + (Math.random() * 6 - 3),
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Skull Mark / Hazard Cross
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("☠", 0, 0);
  }
}

window.FRUIT_TYPES = FRUIT_TYPES;
window.Fruit = Fruit;
