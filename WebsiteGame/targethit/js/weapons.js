/**
 * Target Hit - Weapons Locker & Procedural Blade Renderer
 * Unlocks, custom blades, apple economy, and canvas drawing routines.
 */
"use strict";

const WEAPONS_DATA = [
  {
    id: "classic",
    name: "Hunter Dagger",
    desc: "Balanced steel blade with leather wrap grip.",
    price: 0,
    icon: "🗡️",
    bladeColor: "#e6e8eb",
    handleColor: "#3d2314",
    accentColor: "#9ca3af",
  },
  {
    id: "kunai",
    name: "Shadow Kunai",
    desc: "Aerodynamic ninja dart with a ring pommel.",
    price: 20,
    icon: "⚔️",
    bladeColor: "#94a3b8",
    handleColor: "#1e293b",
    accentColor: "#38bdf8",
  },
  {
    id: "axe",
    name: "Viking Tomahawk",
    desc: "Heavy bearded axe head for devastating precision.",
    price: 50,
    icon: "🪓",
    bladeColor: "#cbd5e1",
    handleColor: "#5c3317",
    accentColor: "#64748b",
  },
  {
    id: "golden",
    name: "Golden Sovereign",
    desc: "Gilded damascus steel with an engraved guard.",
    price: 80,
    icon: "✨",
    bladeColor: "#ffd23f",
    handleColor: "#801228",
    accentColor: "#ff9f43",
  },
  {
    id: "cyber",
    name: "Cyber Plasma",
    desc: "High-voltage energised laser blade from 2099.",
    price: 120,
    icon: "⚡",
    bladeColor: "#3df2e0",
    handleColor: "#0f172a",
    accentColor: "#a855f7",
  },
  {
    id: "dragon",
    name: "Dragon Fang",
    desc: "Forged in magma, burns with perpetual dragonfire.",
    price: 180,
    icon: "🔥",
    bladeColor: "#ff4d6d",
    handleColor: "#2b0914",
    accentColor: "#ffa94d",
  },
];

class WeaponsManager {
  constructor() {
    this.apples = this.loadApples();
    this.unlocked = this.loadUnlocked();
    this.equipped = this.loadEquipped();
  }

  loadApples() {
    try {
      const val = parseInt(localStorage.getItem("targethit_apples"), 10);
      return isNaN(val) ? 0 : val;
    } catch (e) {
      return 0;
    }
  }

  saveApples() {
    try {
      localStorage.setItem("targethit_apples", this.apples);
    } catch (e) {}
  }

  addApples(count) {
    this.apples += count;
    this.saveApples();
    return this.apples;
  }

  spendApples(count) {
    if (this.apples >= count) {
      this.apples -= count;
      this.saveApples();
      return true;
    }
    return false;
  }

  loadUnlocked() {
    try {
      const data = JSON.parse(localStorage.getItem("targethit_unlocked"));
      if (Array.isArray(data) && data.includes("classic")) return data;
    } catch (e) {}
    return ["classic"];
  }

  saveUnlocked() {
    try {
      localStorage.setItem("targethit_unlocked", JSON.stringify(this.unlocked));
    } catch (e) {}
  }

  loadEquipped() {
    try {
      const eq = localStorage.getItem("targethit_equipped");
      if (eq && WEAPONS_DATA.some((w) => w.id === eq)) return eq;
    } catch (e) {}
    return "classic";
  }

  saveEquipped() {
    try {
      localStorage.setItem("targethit_equipped", this.equipped);
    } catch (e) {}
  }

  isUnlocked(id) {
    return this.unlocked.includes(id);
  }

  unlock(id) {
    const weapon = WEAPONS_DATA.find((w) => w.id === id);
    if (!weapon || this.isUnlocked(id)) return false;
    if (this.spendApples(weapon.price)) {
      this.unlocked.push(id);
      this.saveUnlocked();
      this.equipped = id;
      this.saveEquipped();
      return true;
    }
    return false;
  }

  equip(id) {
    if (this.isUnlocked(id)) {
      this.equipped = id;
      this.saveEquipped();
      return true;
    }
    return false;
  }

  getEquippedData() {
    return WEAPONS_DATA.find((w) => w.id === this.equipped) || WEAPONS_DATA[0];
  }

  /**
   * Procedural drawing for each weapon type on canvas
   * Origin (0,0) is the tip or embed contact point. Blade extends downwards when angle=0.
   */
  drawWeapon(ctx, x, y, angle, weaponId, isEmbedded) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const wid = weaponId || this.equipped || "classic";

    // Embedded knife is slightly buried into the target wood
    const offsetY = isEmbedded ? -12 : 0;
    ctx.translate(0, offsetY);

    switch (wid) {
      case "kunai":
        this.drawKunai(ctx);
        break;
      case "axe":
        this.drawAxe(ctx);
        break;
      case "golden":
        this.drawGolden(ctx);
        break;
      case "cyber":
        this.drawCyber(ctx);
        break;
      case "dragon":
        this.drawDragon(ctx);
        break;
      case "classic":
      default:
        this.drawClassic(ctx);
        break;
    }

    ctx.restore();
  }

  drawClassic(ctx) {
    // Blade
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(0, 0); // Tip
    ctx.lineTo(8, 30);
    ctx.lineTo(6, 42);
    ctx.lineTo(-6, 42);
    ctx.lineTo(-8, 30);
    ctx.closePath();
    ctx.fill();

    // Blade bevel highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7, 30);
    ctx.lineTo(0, 42);
    ctx.closePath();
    ctx.fill();

    // Crossguard
    ctx.fillStyle = "#334155";
    ctx.fillRect(-12, 42, 24, 6);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(-12, 42, 24, 2);

    // Grip
    ctx.fillStyle = "#4a2612";
    ctx.fillRect(-5, 48, 10, 26);
    // Wrap bands
    ctx.fillStyle = "#2e1507";
    ctx.fillRect(-5, 53, 10, 2);
    ctx.fillRect(-5, 59, 10, 2);
    ctx.fillRect(-5, 65, 10, 2);

    // Pommel
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(0, 77, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawKunai(ctx) {
    // Sharp diamond blade
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 28);
    ctx.lineTo(2, 44);
    ctx.lineTo(-2, 44);
    ctx.lineTo(-10, 28);
    ctx.closePath();
    ctx.fill();

    // Cyan edge sheen
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center groove
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 40);
    ctx.stroke();

    // Cord wrap handle
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-4, 44, 8, 24);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, 44, 8, 24);

    // Pommel Ring
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 75, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawAxe(ctx) {
    // Tomahawk head
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(24, 6, 26, 32);
    ctx.quadraticCurveTo(8, 26, 4, 34);
    ctx.lineTo(-4, 34);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();

    // Sharp edge highlight
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(24, 6, 26, 32);
    ctx.stroke();

    // Wooden shaft
    ctx.fillStyle = "#6c3b1a";
    ctx.fillRect(-4, 6, 8, 72);
    ctx.fillStyle = "#45220c";
    ctx.fillRect(-4, 6, 3, 72);

    // Leather binds
    ctx.fillStyle = "#d97706";
    ctx.fillRect(-5, 24, 10, 6);
  }

  drawGolden(ctx) {
    // Gilded blade
    ctx.fillStyle = "#ffd23f";
    ctx.shadowColor = "#ff9f43";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(9, 28);
    ctx.lineTo(6, 42);
    ctx.lineTo(-6, 42);
    ctx.lineTo(-9, 28);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center Damascus line
    ctx.fillStyle = "#fff4a3";
    ctx.fillRect(-1.5, 6, 3, 34);

    // Regal Guard
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-14, 42, 28, 7, 3) : ctx.rect(-14, 42, 28, 7);
    ctx.fill();

    // Velvet Crimson Grip
    ctx.fillStyle = "#881337";
    ctx.fillRect(-5, 49, 10, 24);
    // Gold filigree ring
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(-5, 60, 10, 2);

    // Ruby Pommel
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    ctx.arc(0, 78, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawCyber(ctx) {
    // Glowing neon cyan blade
    ctx.fillStyle = "#0ff";
    ctx.shadowColor = "#3df2e0";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 24);
    ctx.lineTo(5, 42);
    ctx.lineTo(-5, 42);
    ctx.lineTo(-8, 24);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pure white energy core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(2, 38);
    ctx.lineTo(-2, 38);
    ctx.closePath();
    ctx.fill();

    // Hilt / Emitter
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-10, 42, 20, 8);
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-8, 45, 16, 2);

    // Cyber Grip
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-5, 50, 10, 24);
    ctx.fillStyle = "#3df2e0";
    ctx.fillRect(-3, 56, 6, 12);

    // Power Cell
    ctx.fillStyle = "#a855f7";
    ctx.fillRect(-6, 74, 12, 4);
  }

  drawDragon(ctx) {
    // Curved Magma Fang
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "#ff2a5f";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(12, 18, 11, 42);
    ctx.lineTo(-8, 42);
    ctx.quadraticCurveTo(-2, 20, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Flame Core
    ctx.fillStyle = "#ffa94d";
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(6, 22, 5, 38);
    ctx.lineTo(-3, 38);
    ctx.closePath();
    ctx.fill();

    // Bone Guard
    ctx.fillStyle = "#2b0914";
    ctx.beginPath();
    ctx.moveTo(-13, 42);
    ctx.lineTo(13, 42);
    ctx.lineTo(8, 48);
    ctx.lineTo(-8, 48);
    ctx.closePath();
    ctx.fill();

    // Obsidian Grip
    ctx.fillStyle = "#16050b";
    ctx.fillRect(-5, 48, 10, 26);
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, 48, 10, 26);

    // Fang Pommel
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.moveTo(-5, 74);
    ctx.lineTo(5, 74);
    ctx.lineTo(0, 84);
    ctx.closePath();
    ctx.fill();
  }
}

window.WEAPONS_DATA = WEAPONS_DATA;
window.WeaponsManager = WeaponsManager;
