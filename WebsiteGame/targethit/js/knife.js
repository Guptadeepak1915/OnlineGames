/**
 * Target Hit - Active Knife Controller
 * Handles flying knife motion, deflection ricochet physics, and launchpad state.
 */
"use strict";

class KnifeController {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.launchX = canvasWidth / 2;
    this.launchY = canvasHeight - 110;

    this.flyingKnife = null;
    this.deflectedKnife = null;

    this.readyGlow = 0;
    this.throwCooldown = 0;
  }

  reset(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.launchX = canvasWidth / 2;
    this.launchY = canvasHeight - 110;
    this.flyingKnife = null;
    this.deflectedKnife = null;
    this.throwCooldown = 0;
  }

  canThrow() {
    return !this.flyingKnife && !this.deflectedKnife && this.throwCooldown <= 0;
  }

  throwKnife(weaponId) {
    if (!this.canThrow()) return false;

    this.flyingKnife = {
      x: this.launchX,
      y: this.launchY,
      vy: -2600, // Very fast and responsive
      weaponId: weaponId || "classic",
      trail: [],
    };
    this.throwCooldown = 0.12;
    return true;
  }

  triggerDeflection(knife, contactX, contactY) {
    // Deflect bouncing backward down with angular spin
    this.flyingKnife = null;
    this.deflectedKnife = {
      x: contactX,
      y: contactY,
      vx: (Math.random() - 0.5) * 320,
      vy: 450 + Math.random() * 200,
      rot: 0,
      vrot: (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 6),
      weaponId: knife.weaponId,
      alpha: 1,
    };
  }

  update(dt, target, onHitTarget, onDeflect) {
    if (this.throwCooldown > 0) {
      this.throwCooldown -= dt;
    }

    this.readyGlow = (this.readyGlow + dt * 4) % (Math.PI * 2);

    // Update flying knife
    if (this.flyingKnife) {
      const fk = this.flyingKnife;
      fk.y += fk.vy * dt;

      // Add trail point
      fk.trail.push({ x: fk.x, y: fk.y, alpha: 0.7 });
      if (fk.trail.length > 5) fk.trail.shift();

      // Check if knife tip has reached target bottom rim
      // Target contact position is target.y + target.radius
      const contactY = target.y + target.radius;

      if (fk.y <= contactY) {
        // Knife tip has arrived! Check collision in target
        const result = target.checkKnifeCollision(fk.weaponId);

        if (result.deflected) {
          this.triggerDeflection(fk, result.contactX, result.contactY);
          if (onDeflect) onDeflect(result.contactX, result.contactY);
        } else if (result.hit) {
          this.flyingKnife = null;
          if (onHitTarget) {
            onHitTarget(result.contactX, result.contactY, result.appleSliced);
          }
        }
      }
    }

    // Update deflected knife
    if (this.deflectedKnife) {
      const dk = this.deflectedKnife;
      dk.x += dk.vx * dt;
      dk.y += dk.vy * dt;
      dk.vy += 1200 * dt; // Fast gravity
      dk.rot += dk.vrot * dt;

      if (dk.y > this.canvasHeight + 100) {
        this.deflectedKnife = null;
      }
    }
  }

  draw(ctx, weaponsDrawer, remainingKnives, equippedWeapon) {
    ctx.save();

    // 1. Draw Ready Knife on launchpad (if knives remain and none is currently flying)
    if (remainingKnives > 0 && !this.flyingKnife && !this.deflectedKnife) {
      const glowAlpha = 0.25 + 0.15 * Math.sin(this.readyGlow);
      ctx.save();
      // Subtle glow circle behind ready knife
      const grad = ctx.createRadialGradient(
        this.launchX,
        this.launchY + 25,
        2,
        this.launchX,
        this.launchY + 25,
        45
      );
      grad.addColorStop(0, `rgba(61, 242, 224, ${glowAlpha})`);
      grad.addColorStop(1, "rgba(61, 242, 224, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.launchX, this.launchY + 25, 45, 0, Math.PI * 2);
      ctx.fill();

      // Ready weapon
      weaponsDrawer(ctx, this.launchX, this.launchY, 0, equippedWeapon, false);
      ctx.restore();
    }

    // 2. Draw Flying Knife with speed trail
    if (this.flyingKnife) {
      const fk = this.flyingKnife;
      // Motion trail
      ctx.save();
      fk.trail.forEach((pt, idx) => {
        const a = (idx / fk.trail.length) * 0.35;
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, pt.y + 35);
        ctx.stroke();
      });
      ctx.restore();

      // Knife
      weaponsDrawer(ctx, fk.x, fk.y, 0, fk.weaponId, false);
    }

    // 3. Draw Deflected Knife
    if (this.deflectedKnife) {
      const dk = this.deflectedKnife;
      weaponsDrawer(ctx, dk.x, dk.y, dk.rot, dk.weaponId, false);
    }

    ctx.restore();
  }
}

window.KnifeController = KnifeController;
