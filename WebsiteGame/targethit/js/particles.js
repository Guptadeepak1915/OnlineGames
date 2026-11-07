/**
 * Target Hit - Particle System
 * High performance physics-based visual feedback: splinters, sparks, apple halves, and shattering target chunks.
 */
"use strict";

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shatterFragments = [];
    this.appleHalves = [];
  }

  reset() {
    this.particles = [];
    this.shatterFragments = [];
    this.appleHalves = [];
  }

  // Splinters emitted when knife hits wood
  emitSplinters(x, y, color = "#dfad6c") {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 120 + Math.random() * 220;
      this.particles.push({
        type: "splinter",
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 14,
        size: 2 + Math.random() * 3,
        length: 6 + Math.random() * 8,
        color: Math.random() > 0.4 ? color : "#8a5327",
        alpha: 1,
        life: 0.45 + Math.random() * 0.3,
        age: 0,
      });
    }
  }

  // Intense sparks emitted when knife deflects off another knife
  emitSparks(x, y) {
    const count = 22 + Math.floor(Math.random() * 12);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 350;
      this.particles.push({
        type: "spark",
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 80,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.3 ? "#fff" : "#ffd23f",
        alpha: 1,
        life: 0.25 + Math.random() * 0.25,
        age: 0,
      });
    }
  }

  // Apple juice and cut halves
  emitAppleSlice(x, y, angle) {
    // 2 Halves flying left and right
    const perp1 = angle + Math.PI / 2;
    const perp2 = angle - Math.PI / 2;
    const speed = 160;

    this.appleHalves.push({
      x: x,
      y: y,
      vx: Math.cos(perp1) * speed + (Math.random() - 0.5) * 40,
      vy: Math.sin(perp1) * speed - 60,
      rot: angle,
      vrot: -6 + (Math.random() - 0.5) * 2,
      scale: 1,
      alpha: 1,
      life: 0.9,
      age: 0,
      side: "left",
    });

    this.appleHalves.push({
      x: x,
      y: y,
      vx: Math.cos(perp2) * speed + (Math.random() - 0.5) * 40,
      vy: Math.sin(perp2) * speed - 60,
      rot: angle,
      vrot: 6 + (Math.random() - 0.5) * 2,
      scale: 1,
      alpha: 1,
      life: 0.9,
      age: 0,
      side: "right",
    });

    // Juice droplets
    for (let i = 0; i < 16; i++) {
      const dropAngle = Math.random() * Math.PI * 2;
      const dropSpeed = 80 + Math.random() * 200;
      this.particles.push({
        type: "juice",
        x: x,
        y: y,
        vx: Math.cos(dropAngle) * dropSpeed,
        vy: Math.sin(dropAngle) * dropSpeed,
        size: 2.5 + Math.random() * 3,
        color: Math.random() > 0.2 ? "#ff3355" : "#ff7788",
        alpha: 1,
        life: 0.4 + Math.random() * 0.3,
        age: 0,
      });
    }
  }

  // Shatters the target into wedge polygon chunks flying radially
  createTargetShatter(
    targetX,
    targetY,
    targetRadius,
    targetColor1,
    targetColor2,
    embeddedKnives,
    equippedWeapon,
  ) {
    const slices = 10;
    const angleStep = (Math.PI * 2) / slices;

    for (let i = 0; i < slices; i++) {
      const a1 = i * angleStep;
      const a2 = (i + 1) * angleStep;
      const midAngle = (a1 + a2) / 2;
      const speed = 240 + Math.random() * 160;

      this.shatterFragments.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(midAngle) * speed,
        vy: Math.sin(midAngle) * speed - 80,
        rot: 0,
        vrot: (Math.random() - 0.5) * 8,
        radius: targetRadius,
        a1: a1,
        a2: a2,
        color1: targetColor1,
        color2: targetColor2,
        alpha: 1,
        life: 0.9,
        age: 0,
      });
    }

    // Fling all embedded knives outward
    embeddedKnives.forEach((k) => {
      const kAngle = k.angle;
      const speed = 280 + Math.random() * 200;
      this.particles.push({
        type: "flying_knife",
        x: targetX + Math.cos(kAngle) * (targetRadius + 15),
        y: targetY + Math.sin(kAngle) * (targetRadius + 15),
        vx: Math.cos(kAngle) * speed,
        vy: Math.sin(kAngle) * speed - 60,
        rot: kAngle + Math.PI / 2,
        vrot: (Math.random() - 0.5) * 16,
        weaponId: k.weaponId || equippedWeapon,
        alpha: 1,
        life: 1.0,
        age: 0,
      });
    });

    // Flash dust shockwave
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 260;
      this.particles.push({
        type: "dust",
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color: "rgba(255, 230, 180, 0.7)",
        alpha: 0.8,
        life: 0.45 + Math.random() * 0.25,
        age: 0,
      });
    }
  }

  // Confetti burst for Boss victory
  emitConfetti(width, height) {
    const colors = ["#ffd23f", "#3df2e0", "#ff5c7a", "#a0ff6b", "#fff"];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        type: "confetti",
        x: Math.random() * width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 140,
        vy: 180 + Math.random() * 220,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 12,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1.8 + Math.random() * 0.8,
        age: 0,
      });
    }
  }

  update(dt) {
    // Normal particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (
        p.type === "splinter" ||
        p.type === "flying_knife" ||
        p.type === "confetti"
      ) {
        p.vy += 650 * dt; // gravity
        p.rot += p.vrot * dt;
      } else if (p.type === "juice") {
        p.vy += 450 * dt;
      } else if (p.type === "spark") {
        p.vy += 300 * dt;
      }
      p.alpha = 1 - p.age / p.life;
    }

    // Apple halves
    for (let i = this.appleHalves.length - 1; i >= 0; i--) {
      const a = this.appleHalves[i];
      a.age += dt;
      if (a.age >= a.life) {
        this.appleHalves.splice(i, 1);
        continue;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += 600 * dt; // gravity
      a.rot += a.vrot * dt;
      a.alpha = 1 - a.age / a.life;
    }

    // Shatter chunks
    for (let i = this.shatterFragments.length - 1; i >= 0; i--) {
      const f = this.shatterFragments[i];
      f.age += dt;
      if (f.age >= f.life) {
        this.shatterFragments.splice(i, 1);
        continue;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 500 * dt;
      f.rot += f.vrot * dt;
      f.alpha = 1 - f.age / f.life;
    }
  }

  draw(ctx, weaponsDrawer) {
    ctx.save();

    // Shatter fragments
    this.shatterFragments.forEach((f) => {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, f.radius, f.a1, f.a2);
      ctx.closePath();

      ctx.fillStyle = f.color1;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = f.color2;
      ctx.stroke();

      ctx.restore();
    });

    // Apple halves
    this.appleHalves.forEach((a) => {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      ctx.beginPath();
      if (a.side === "left") {
        ctx.arc(0, 0, 14, Math.PI * 0.5, Math.PI * 1.5, false);
      } else {
        ctx.arc(0, 0, 14, -Math.PI * 0.5, Math.PI * 0.5, false);
      }
      ctx.closePath();
      ctx.fillStyle = "#ff2244";
      ctx.fill();

      // Inside flesh
      ctx.beginPath();
      if (a.side === "left") {
        ctx.arc(-2, 0, 9, Math.PI * 0.5, Math.PI * 1.5, false);
      } else {
        ctx.arc(2, 0, 9, -Math.PI * 0.5, Math.PI * 0.5, false);
      }
      ctx.closePath();
      ctx.fillStyle = "#fffce6";
      ctx.fill();

      // Tiny black seed
      ctx.fillStyle = "#331100";
      ctx.beginPath();
      ctx.arc(a.side === "left" ? -4 : 4, 1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === "splinter") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.length / 2, p.size, p.length);
      } else if (p.type === "spark") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "juice") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "dust") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - p.alpha)), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "confetti") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      } else if (p.type === "flying_knife" && weaponsDrawer) {
        weaponsDrawer(ctx, p.x, p.y, p.rot, p.weaponId, false);
      }

      ctx.restore();
    });

    ctx.restore();
  }
}

window.ParticleSystem = ParticleSystem;
