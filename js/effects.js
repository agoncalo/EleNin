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
