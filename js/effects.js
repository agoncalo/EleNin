// ── Substitution Log (shadow ninja) ──────────────────────────
class SubstitutionLog {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.life = 90;
    this.maxLife = 90;
    this.vy = -1.5;
    this.rot = (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.03);
    this.angle = 0;
    this.cloudPuffs = [];
    for (let i = 0; i < 6; i++) {
      this.cloudPuffs.push({
        ox: (Math.random() - 0.5) * 24,
        oy: (Math.random() - 0.5) * 20,
        r: 6 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.3 - Math.random() * 0.8,
        life: 25 + Math.random() * 15
      });
    }
    this.done = false;
  }
  update() {
    this.life--;
    this.vy += 0.12;
    this.y += this.vy;
    this.angle += this.rot;
    if (this.life <= 0) this.done = true;
  }
  render(ctx, cam) {
    const fade = Math.min(1, this.life / 20);
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const logW = this.w + 6;
    const logH = this.h + 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    const lx = -logW / 2;
    const ly = -logH / 2;
    // Shadow
    ctx.globalAlpha = fade * 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, logH / 2 + 2, logW / 2 + 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main log body (rounded rect)
    ctx.globalAlpha = fade * 0.95;
    ctx.fillStyle = '#9B6B3D';
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(lx + r, ly);
    ctx.lineTo(lx + logW - r, ly);
    ctx.quadraticCurveTo(lx + logW, ly, lx + logW, ly + r);
    ctx.lineTo(lx + logW, ly + logH - r);
    ctx.quadraticCurveTo(lx + logW, ly + logH, lx + logW - r, ly + logH);
    ctx.lineTo(lx + r, ly + logH);
    ctx.quadraticCurveTo(lx, ly + logH, lx, ly + logH - r);
    ctx.lineTo(lx, ly + r);
    ctx.quadraticCurveTo(lx, ly, lx + r, ly);
    ctx.fill();
    // Darker edges
    ctx.globalAlpha = fade * 0.4;
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(lx + 1, ly, logW - 2, 3);
    ctx.fillRect(lx + 1, ly + logH - 3, logW - 2, 3);
    // Wood grain lines
    ctx.globalAlpha = fade * 0.3;
    ctx.strokeStyle = '#5C3A1E';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const gy = ly + 5 + i * (logH / 5);
      ctx.beginPath();
      ctx.moveTo(lx + 3, gy);
      ctx.bezierCurveTo(lx + logW * 0.3, gy - 1.5, lx + logW * 0.6, gy + 1.5, lx + logW - 3, gy);
      ctx.stroke();
    }
    // Top end (cross-section ellipse with rings)
    ctx.globalAlpha = fade * 0.7;
    ctx.fillStyle = '#C4965A';
    ctx.beginPath();
    ctx.ellipse(0, ly + 2, logW / 2 - 1, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * 0.4;
    ctx.strokeStyle = '#8B6B3D';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, ly + 2, logW / 2 - 5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, ly + 2, logW / 2 - 9, 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Small knot
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = '#5C3A1E';
    ctx.beginPath();
    ctx.ellipse(-3 + logW * 0.15, logH * 0.45 - logH / 2, 2.5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // White smoke cloud
    const cloudCx = this.x + this.w / 2 - cam.x;
    const cloudCy = this.y + this.h / 2 - cam.y;
    for (const p of this.cloudPuffs) {
      p.ox += p.vx;
      p.oy += p.vy;
      p.r += 0.3;
      p.life--;
      if (p.life <= 0) continue;
      const a = Math.min(1, p.life / 10) * fade * 0.45;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cloudCx + p.ox, cloudCy + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ── Smoke Grenade (shadow ninja) ─────────────────────────────
class SmokeGrenade {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = -3 - Math.random() * 2;
    this.graceTimer = 20;
    this.landed = false;
    this.life = 300; // 5 seconds
    this.maxLife = 300;
    this.radius = 60;
    this.done = false;
    this.puffs = [];
  }
  update() {
    if (!this.landed) {
      this.vy += 0.18;
      this.x += this.vx;
      this.y += this.vy;
      this.graceTimer--;
      if (this.graceTimer <= 0 && this.vy > 0) {
        this.landed = true;
        this.vy = 0;
        this.vx = 0;
      }
      return;
    }
    this.life--;
    if (this.life <= 0) this.done = true;
    // Spawn smoke puffs
    if (this.life > 30 && Math.random() < 0.4) {
      this.puffs.push({
        ox: (Math.random() - 0.5) * this.radius * 1.2,
        oy: (Math.random() - 0.5) * 20 - 5,
        r: 4 + Math.random() * 8,
        vy: -0.2 - Math.random() * 0.5,
        life: 20 + Math.random() * 15
      });
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.oy += p.vy;
      p.r += 0.15;
      p.life--;
      if (p.life <= 0) this.puffs.splice(i, 1);
    }
  }
  render(ctx, cam) {
    const fade = Math.min(1, this.life / 30);
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    // Ground haze
    ctx.globalAlpha = fade * 0.15;
    ctx.fillStyle = '#c8b8d8';
    ctx.beginPath();
    ctx.ellipse(sx, sy, this.radius, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Smoke puffs
    for (const p of this.puffs) {
      const a = Math.min(1, p.life / 8) * fade * 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.arc(sx + p.ox, sy + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ── Effect (particles) ───────────────────────────────────────
class Effect {
  constructor(x, y, color, count, speed, life) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        life: life + Math.random() * life * 0.5,
        color,
        size: randInt(2, 5)
      });
    }
    this.done = false;
  }
  update() {
    let alive = 0;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      if (p.life > 0) alive++;
    }
    if (alive === 0) this.done = true;
  }
  render(ctx, cam) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.min(1, p.life / 10);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam.x, p.y - cam.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

class KanjiEffect {
  constructor(x, y, color, cam) {
    this.sx = x - (cam ? cam.x : 0);
    this.sy = y - (cam ? cam.y : 0);
    this.color = color;
    this.life = 80; this.maxLife = 80; this.done = false;
  }
  update() { this.life--; if (this.life <= 0) this.done = true; }
  render(ctx, cam) {
    const progress = 1 - this.life / this.maxLife;
    const scale = progress < 0.15 ? progress / 0.15 : 1;
    const alpha = this.life < 30 ? this.life / 30 : 1;
    const cx = this.sx;
    const cy = this.sy - progress * 20;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.floor(60 * scale)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('死', cx, cy);
    ctx.fillStyle = this.color;
    ctx.fillText('死', cx, cy);
    ctx.restore();
  }
}

class TextEffect {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 40; this.done = false;
  }
  update() { this.y -= 1.2; this.life--; if (this.life <= 0) this.done = true; }
  render(ctx, cam) {
    ctx.globalAlpha = Math.min(1, this.life / 15);
    ctx.fillStyle = this.color;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(this.text, this.x - cam.x, this.y - cam.y);
    ctx.globalAlpha = 1;
  }
}

// ── Orb (item drop) ──────────────────────────────────────────
class Orb {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.w = 10; this.h = 10;
    this.vy = -3;
    this.type = type; // 'heal', 'maxhp', 'damage', 'shield', 'shuriken'
    this.life = 480;
    this.done = false;
    this.grounded = false;
    this.vx = 0;
  }
  update(game) {
    if (this.done) return;
    this.life--;
    if (this.life <= 0) { this.done = true; return; }

    // Attraction to player if nearby
    const pl = game.player;
    const px = pl.x + pl.w / 2;
    const py = pl.y + pl.h / 2;
    const ox = this.x + this.w / 2;
    const oy = this.y + this.h / 2;
    const dx = px - ox;
    const dy = py - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 64) {
      const attractStrength = 0.7;
      this.vx += (dx / dist) * attractStrength;
      this.vy += (dy / dist) * attractStrength * 0.5;
      const maxSpeed = 6;
      const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
      if (speed > maxSpeed) {
        this.vx = this.vx * maxSpeed / speed;
        this.vy = this.vy * maxSpeed / speed;
      }
      this.x += this.vx;
      this.y += this.vy;
    }

    // Pickup
    if (rectOverlap(this, game.player)) {
      this.done = true;
      SFX.pickup();
      const pl = game.player;
      if (!pl.ultimateReady && !pl.ultimateActive) {
        pl.addUltimateCharge(5);
      }
      switch (this.type) {
        case 'heal':
          pl.hp = Math.min(pl.hp + 3, pl.maxHp);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#f44', 6, 2, 10));
          break;
        case 'maxhp':
          pl.maxHp += 1;
          pl.hp = Math.min(pl.hp + 1, pl.maxHp);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#4f4', 8, 3, 12));
          break;
        case 'damage':
          pl.bonusDamage += 1;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#f80', 8, 3, 12));
          break;
        case 'shield':
          pl.maxShield += 3;
          pl.shield = pl.maxShield;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#4af', 8, 3, 12));
          break;
        case 'shuriken':
          pl.maxShurikens += 1;
          pl.shurikens = Math.min(pl.shurikens + 1, pl.maxShurikens);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#ccc', 6, 2, 10));
          break;
      }
    }
  }
  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const flash = this.life < 90 && Math.floor(this.life / 6) % 2;
    if (flash) return;
    const colors = { heal: '#f44', maxhp: '#4f4', damage: '#f80', shield: '#4af', shuriken: '#ccc' };
    ctx.fillStyle = colors[this.type];
    ctx.beginPath();
    ctx.arc(sx + 5, sy + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(sx + 5, sy + 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    const icons = { heal: '♥', maxhp: '+', damage: '!', shield: '◆', shuriken: '✦' };
    ctx.fillText(icons[this.type], sx + 1, sy + 9);
  }
}
