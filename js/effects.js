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
  constructor(x, y, platforms) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -4 - Math.random() * 3;
    this.landed = false;
    this.platforms = platforms;
    this.life = 300; // 5 seconds
    this.maxLife = 300;
    this.radius = 60;
    this.done = false;
    this.puffs = [];
  }
  update() {
    if (!this.landed) {
      this.vy += 0.35;
      this.x += this.vx;
      this.y += this.vy;
      // Check platform collision when falling
      if (this.vy > 0) {
        for (const p of this.platforms) {
          if (this.x > p.x && this.x < p.x + p.w &&
              this.y >= p.y && this.y - this.vy < p.y + 4) {
            this.y = p.y;
            this.landed = true;
            break;
          }
        }
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
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // Draw the grenade body while airborne
    if (!this.landed) {
      const spin = this.graceTimer * 0.3;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(spin);
      // Body
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // Top cap
      ctx.fillStyle = '#555';
      ctx.fillRect(-2, -8, 4, 4);
      // Fuse spark
      ctx.fillStyle = '#fa0';
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(0, -9, 2 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }

    const fade = Math.min(1, this.life / 30);
    // Ground haze
    ctx.globalAlpha = fade * 0.15;
    ctx.fillStyle = '#c8b8d8';
    ctx.beginPath();
    ctx.ellipse(sx, sy, this.radius, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Landed grenade body (fading)
    if (this.life > this.maxLife - 30) {
      const gFade = (this.life - (this.maxLife - 30)) / 30;
      ctx.globalAlpha = gFade * 0.8;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(sx, sy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#555';
      ctx.fillRect(sx - 2, sy - 11, 4, 4);
    }
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

// ── FlamePool (fire ninja ground flame) ──────────────────────
class FlamePool {
  constructor(x, y, damage) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 12;
    this.damage = damage;
    this.life = 180;
    this.maxLife = 180;
    this.done = false;
    this.hitTimer = 0;
  }
  update(game) {
    this.life--;
    if (this.life <= 0) { this.done = true; return; }
    if (this.hitTimer > 0) this.hitTimer--;
    if (this.hitTimer <= 0) {
      for (const e of game.enemies) {
        if (!e.dead && rectOverlap(this, e)) {
          e.takeDamage(this.damage, game, this.x + this.w / 2);
          e.burnTimer = Math.max(e.burnTimer || 0, 60);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h, '#f80', 4, 2, 8));
          this.hitTimer = 20;
        }
      }
      if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.damage, game, this.x + this.w / 2);
        game.boss.burnTimer = Math.max(game.boss.burnTimer || 0, 60);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h, '#f80', 4, 2, 8));
        this.hitTimer = 20;
      }
    }
  }
  render(ctx, cam) {
    const alpha = Math.min(1, this.life / 30);
    const cx = this.x + this.w / 2 - cam.x;
    const cy = this.y + this.h / 2 - cam.y;
    // Flickering flame glow
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#f80';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 14 + Math.sin(this.life * 0.3) * 3, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#fc3';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 8 + Math.sin(this.life * 0.5) * 2, 0, Math.PI * 2);
    ctx.fill();
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

    // Full-screen dark overlay for dramatic contrast
    const overlayAlpha = alpha * 0.4;
    ctx.save();
    ctx.globalAlpha = overlayAlpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    const fontSize = Math.floor(60 * scale);
    ctx.font = `bold ${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25 + 10 * Math.sin(Date.now() * 0.01);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText('死', cx, cy);
    ctx.fillStyle = this.color;
    ctx.fillText('死', cx, cy);
    // Second pass for extra glow intensity
    ctx.globalAlpha = alpha * 0.5;
    ctx.shadowBlur = 40;
    ctx.fillText('死', cx, cy);
    ctx.shadowBlur = 0;
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
    this.type = type; // 'heal', 'maxhp', 'damage', 'shield', 'shuriken', 'speed', 'reach', 'ultcharge', 'armor'
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

    // Collectors: chain strikes, golems, trimerangs, bubbles attract orbs to player
    const magnetRange = pl.items && pl.items.redMagnet ? 240 : 64;
    let attracted = dist < magnetRange;
    if (!attracted) {
      // Chain strikes auto-grab
      if (pl.chainStriking || pl.stormChaining) {
        if (dist < 200) {
          this.done = true;
          SFX.pickup();
          if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(5);
          const _m = (pl.items && pl.items.x2Orb) ? 2 : 1;
          switch (this.type) {
            case 'heal': pl.hp = Math.min(pl.hp + 3 * _m, pl.maxHp); game.effects.push(new Effect(ox, oy, '#f44', 6, 2, 10)); break;
            case 'maxhp': pl.maxHp += 1 * _m; pl.hp = Math.min(pl.hp + 1 * _m, pl.maxHp); game.effects.push(new Effect(ox, oy, '#4f4', 8, 3, 12)); break;
            case 'damage': pl.bonusDamage += 1 * _m; game.effects.push(new Effect(ox, oy, '#f80', 8, 3, 12)); break;
            case 'shield': pl.maxShield += 2 * _m; pl.shield = Math.min(pl.shield + 3 * _m, pl.maxShield); game.effects.push(new Effect(ox, oy, '#4af', 8, 3, 12)); break;
            case 'shuriken': pl.maxShurikens += 1 * _m; pl.shurikens = Math.min(pl.shurikens + 1 * _m, pl.maxShurikens); game.effects.push(new Effect(ox, oy, '#ccc', 6, 2, 10)); break;
            case 'speed': pl.bonusSpeed += 1 * _m; game.effects.push(new Effect(ox, oy, '#0f0', 8, 3, 12)); break;
            case 'reach': pl.bonusReach += 1 * _m; game.effects.push(new Effect(ox, oy, '#fa0', 8, 3, 12)); break;
            case 'ultcharge': if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(50 * _m); game.effects.push(new Effect(ox, oy, '#ff0', 8, 3, 12)); break;
            case 'armor': pl.bonusArmor += 1 * _m; game.effects.push(new Effect(ox, oy, '#88f', 8, 3, 12)); break;
            case 'element': pl.bonusMana += 1 * _m; pl.maxMana += 1 * _m; pl.mana = pl.maxMana; game.effects.push(new Effect(ox, oy, '#f0f', 8, 3, 12)); break;
          }
          return;
        }
      }
    }

    if (attracted) {
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
      const _m = (pl.items && pl.items.x2Orb) ? 2 : 1;
      switch (this.type) {
        case 'heal':
          pl.hp = Math.min(pl.hp + 3 * _m, pl.maxHp);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#f44', 6, 2, 10));
          break;
        case 'maxhp':
          pl.maxHp += 1 * _m;
          pl.hp = Math.min(pl.hp + 1 * _m, pl.maxHp);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#4f4', 8, 3, 12));
          break;
        case 'damage':
          pl.bonusDamage += 1 * _m;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#f80', 8, 3, 12));
          break;
        case 'shield':
          pl.maxShield += 2 * _m;
          pl.shield = Math.min(pl.shield + 3 * _m, pl.maxShield);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#4af', 8, 3, 12));
          break;
        case 'shuriken':
          pl.maxShurikens += 1 * _m;
          pl.shurikens = Math.min(pl.shurikens + 1 * _m, pl.maxShurikens);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#ccc', 6, 2, 10));
          break;
        case 'speed':
          pl.bonusSpeed += 1 * _m;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#0f0', 8, 3, 12));
          break;
        case 'reach':
          pl.bonusReach += 1 * _m;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#fa0', 8, 3, 12));
          break;
        case 'ultcharge':
          if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(50 * _m);
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#ff0', 8, 3, 12));
          break;
        case 'armor':
          pl.bonusArmor += 1 * _m;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#88f', 8, 3, 12));
          break;
        case 'element':
          pl.bonusMana += 1 * _m;
          pl.maxMana += 1 * _m;
          pl.mana = pl.maxMana;
          game.effects.push(new Effect(pl.x + pl.w/2, pl.y + pl.h/2, '#f0f', 8, 3, 12));
          break;
      }
    }

    // Collector pickups: golems, trimerangs, bubbles grab orbs for the player
    if (!this.done) {
      let collected = false;
      let cx = ox, cy = oy;
      // Golems (earth)
      if (pl.ninjaType === 'earth') {
        for (const s of game.stoneBlocks) {
          if (s.done || !(s instanceof StoneGolem)) continue;
          if (rectOverlap(this, s)) { collected = true; cx = s.x + s.w / 2; cy = s.y + s.h / 2; break; }
        }
      }
      // Trimerangs (wind)
      if (!collected && pl.ninjaType === 'wind' && game.trimerangs) {
        for (const t of game.trimerangs) {
          if (t.done) continue;
          const td = Math.sqrt((t.x - ox) ** 2 + (t.y - oy) ** 2);
          if (td < t.radius + 8) { collected = true; cx = t.x; cy = t.y; break; }
        }
      }
      // Bubbles (bubble)
      if (!collected && pl.ninjaType === 'bubble') {
        for (const b of game.bubbles) {
          if (b.done) continue;
          if (rectOverlap(this, b)) { collected = true; cx = b.x + b.w / 2; cy = b.y + b.h / 2; break; }
        }
      }
      if (collected) {
        this.done = true;
        SFX.pickup();
        if (!pl.ultimateReady && !pl.ultimateActive) {
          pl.addUltimateCharge(5);
        }
        switch (this.type) {
          case 'heal':
            pl.hp = Math.min(pl.hp + 3, pl.maxHp);
            game.effects.push(new Effect(cx, cy, '#f44', 6, 2, 10));
            break;
          case 'maxhp':
            pl.maxHp += 1;
            pl.hp = Math.min(pl.hp + 1, pl.maxHp);
            game.effects.push(new Effect(cx, cy, '#4f4', 8, 3, 12));
            break;
          case 'damage':
            pl.bonusDamage += 1;
            game.effects.push(new Effect(cx, cy, '#f80', 8, 3, 12));
            break;
          case 'shield':
            pl.maxShield += 2;
            pl.shield = Math.min(pl.shield + 3, pl.maxShield);
            game.effects.push(new Effect(cx, cy, '#4af', 8, 3, 12));
            break;
          case 'shuriken':
            pl.maxShurikens += 1;
            pl.shurikens = Math.min(pl.shurikens + 1, pl.maxShurikens);
            game.effects.push(new Effect(cx, cy, '#ccc', 6, 2, 10));
            break;
          case 'speed':
            pl.bonusSpeed += 1;
            game.effects.push(new Effect(cx, cy, '#0f0', 8, 3, 12));
            break;
          case 'reach':
            pl.bonusReach += 1;
            game.effects.push(new Effect(cx, cy, '#fa0', 8, 3, 12));
            break;
          case 'ultcharge':
            if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(50);
            game.effects.push(new Effect(cx, cy, '#ff0', 8, 3, 12));
            break;
          case 'armor':
            pl.bonusArmor += 1;
            game.effects.push(new Effect(cx, cy, '#88f', 8, 3, 12));
            break;
          case 'element':
            pl.bonusMana += 1;
            pl.maxMana += 1;
            pl.mana = pl.maxMana;
            game.effects.push(new Effect(cx, cy, '#f0f', 8, 3, 12));
            break;
        }
      }
    }
  }
  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const flash = this.life < 90 && Math.floor(this.life / 6) % 2;
    if (flash) return;
    const colors = { heal: '#f44', maxhp: '#4f4', damage: '#f80', shield: '#4af', shuriken: '#ccc', speed: '#0f0', reach: '#fa0', ultcharge: '#ff0', armor: '#88f', element: '#f0f' };
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
    const icons = { heal: '♥', maxhp: '+', damage: '!', shield: '◆', shuriken: '✦', speed: '»', reach: '↔', ultcharge: '★', armor: '■', element: '◈' };
    ctx.fillText(icons[this.type], sx + 1, sy + 9);
  }
}

// ── BossItem (boss drop pickup) ──────────────────────────────
class BossItem {
  constructor(x, y, itemId) {
    this.x = x; this.y = y;
    this.w = 16; this.h = 16;
    this.vy = -4;
    this.vx = 0;
    this.itemId = itemId;
    this.def = BOSS_ITEMS[itemId];
    this.life = 9999; // doesn't expire
    this.done = false;
    this.grounded = false;
    this.bobTimer = 0;
  }
  update(game) {
    if (this.done) return;
    this.bobTimer++;
    // Gravity until grounded
    if (!this.grounded) {
      this.vy += 0.3;
      this.y += this.vy;
      this.x += this.vx;
      for (const p of game.platforms) {
        if (this.vy > 0 && this.y + this.h > p.y && this.y + this.h - this.vy <= p.y &&
            this.x + this.w > p.x && this.x < p.x + p.w) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }
    // Attraction to player
    const pl = game.player;
    const px = pl.x + pl.w / 2, py = pl.y + pl.h / 2;
    const ox = this.x + this.w / 2, oy = this.y + this.h / 2;
    const dx = px - ox, dy = py - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) {
      const s = 1.2;
      this.x += (dx / dist) * s;
      this.y += (dy / dist) * s;
    }
    // Pickup
    if (rectOverlap(this, pl)) {
      this.done = true;
      SFX.victory();
      triggerHitstop(8);
      pl.items[this.itemId] = true;
      if (this.itemId === 'deathsKey') pl.deathsKeyUsed = false;
      // A Friend's Letter: if RONIN boss is active, make it friendly (fade handled in boss update)
      if (this.itemId === 'friendsLetter' && game.boss && !game.boss.dead && game.boss.bossType === 'deflector') {
        game.boss.friendly = true;
        game.boss.friendlyFade = 120;
        game.boss.vx = 0;
        game.effects.push(new TextEffect(game.boss.x + game.boss.w / 2, game.boss.y - 20, 'FRIEND!', '#fda'));
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#fda', 25, 6, 25));
        recordBestiaryKill(game.boss.bossType, false, true);
      }
      game.itemPickupOverlay = { itemId: this.itemId, timer: 180 };
      game.effects.push(new Effect(ox, oy, this.def.color, 20, 5, 25));
      game.effects.push(new Effect(ox, oy, '#fff', 12, 3, 20));
      // Record vault discovery
      recordItemFound(this.itemId);
    }
  }
  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y + Math.sin(this.bobTimer * 0.06) * 4;
    const cx = sx + this.w / 2, cy = sy + this.h / 2;
    // Outer glow ring
    const glowA = 0.25 + Math.sin(this.bobTimer * 0.08) * 0.15;
    ctx.globalAlpha = glowA;
    const rGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 22);
    rGrad.addColorStop(0, this.def.color);
    rGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    // Rotating sparkle rays
    ctx.globalAlpha = glowA * 0.6;
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 1;
    const angle = this.bobTimer * 0.04;
    for (let i = 0; i < 4; i++) {
      const a = angle + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
      ctx.lineTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      ctx.stroke();
    }
    // Box with gradient
    ctx.globalAlpha = 1;
    const bGrad = ctx.createLinearGradient(sx, sy, sx, sy + this.h);
    bGrad.addColorStop(0, '#333');
    bGrad.addColorStop(1, '#111');
    ctx.fillStyle = bGrad;
    ctx.fillRect(sx, sy, this.w, this.h);
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, this.w, this.h);
    // Icon
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 6;
    drawItemIcon(ctx, this.itemId, cx, cy, this.w * 0.8, this.def.color);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// ── SlamRing (ground slam shockwave) ─────────────────────────
class SlamRing {
  constructor(x, y, color, accentColor) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.accentColor = accentColor;
    this.radius = 8;
    this.maxRadius = 100;
    this.life = 20;
    this.maxLife = 20;
    this.done = false;
  }
  update() {
    this.life--;
    this.radius += (this.maxRadius - 8) / this.maxLife;
    if (this.life <= 0) this.done = true;
  }
  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const alpha = this.life / this.maxLife;
    // Outer ring
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy, this.radius, this.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Inner ring
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = this.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, this.radius * 0.7, this.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── SpinningScythe (orbiting scythe during shadow chain strike) ──
class SpinningScythe {
  constructor(owner, isUlt, game) {
    this.owner = owner;
    this.game = game;
    this.sc = isUlt ? 1.5 : 1.2;
    this.damage = owner.type.attackDamage + owner.bonusDamage;
    // World position — starts offset from owner
    const angle = Math.random() * Math.PI * 2;
    this.x = owner.x + owner.w / 2 + Math.cos(angle) * 60;
    this.y = owner.y + owner.h / 2 + Math.sin(angle) * 40;
    // Hitbox size for collision
    this.w = 48 * this.sc;
    this.h = 48 * this.sc;
    // Drift velocity — wanders on its own
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.driftTimer = 0;
    this.spinAngle = 0;
    this.spinSpeed = 0.3;
    this.done = false;
    this.fadeAlpha = 1;
    this.life = 180; // minimum 3 seconds at 60fps
    this.chaining = true; // extends life while true
    this.returning = false;
    this.returnTimer = 0;
    this.hitCooldowns = new Map(); // target -> frames until can hit again
  }
  recall() {
    this.chaining = false;
    // Don't start fading until minimum life expires
  }
  update() {
    // While chaining, reset life to at least 180 so it persists
    if (this.chaining) {
      this.life = Math.max(this.life, 180);
    } else {
      this.life--;
    }
    // Start return fade in last 25 frames
    if (!this.chaining && this.life <= 25) {
      this.returning = true;
      this.returnTimer = this.life;
      this.fadeAlpha = Math.max(0, this.life / 25);
      this.spinSpeed = 0.45;
    }
    if (this.life <= 0) { this.done = true; return; }

    // Wander — change drift direction periodically
    this.driftTimer--;
    if (this.driftTimer <= 0) {
      this.driftTimer = 30 + Math.random() * 40;
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = (Math.random() - 0.5) * 2;
    }
    this.x += this.vx;
    this.y += this.vy;

    // Soft leash — gently pulled toward owner if too far
    const ox = this.owner.x + this.owner.w / 2;
    const oy = this.owner.y + this.owner.h / 2;
    const dx = ox - this.x, dy = oy - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const leashDist = this.chaining ? 120 : 80;
    if (dist > leashDist) {
      const pull = 0.03 * (dist - leashDist) / dist;
      this.vx += dx * pull;
      this.vy += dy * pull;
    }
    // Dampen velocity
    this.vx *= 0.97;
    this.vy *= 0.97;

    // Bob up and down slowly
    this.y += Math.sin(Date.now() * 0.004) * 0.3;

    this.spinAngle += this.spinSpeed;

    // Hit detection — damage enemies and boss
    // Hitbox centered on scythe position
    const hb = { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
    // Tick down cooldowns
    for (const [target, cd] of this.hitCooldowns) {
      if (cd <= 1) this.hitCooldowns.delete(target);
      else this.hitCooldowns.set(target, cd - 1);
    }
    const game = this.game;
    if (game) {
      for (const e of game.enemies) {
        if (!e.dead && !this.hitCooldowns.has(e) && rectOverlap(hb, e)) {
          e.takeDamage(this.damage, game, this.x);
          this.hitCooldowns.set(e, 20);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a4e', 8, 3, 10));
          triggerHitstop(2);
        }
      }
      if (game.boss && !game.boss.dead && !this.hitCooldowns.has(game.boss) && rectOverlap(hb, game.boss)) {
        game.boss.takeDamage(this.damage, game, this.x);
        this.hitCooldowns.set(game.boss, 20);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a4e', 10, 4, 12));
        triggerHitstop(2);
      }
    }
  }
  render(ctx, cam) {
    if (this.done) return;
    const px = this.x - cam.x;
    const py = this.y - cam.y;
    const sc = this.sc;
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
    ctx.save();
    ctx.globalAlpha = 0.9 * this.fadeAlpha;
    ctx.translate(px, py);
    ctx.rotate(this.spinAngle);
    // Purple spin trail
    ctx.globalAlpha = 0.12 * this.fadeAlpha;
    ctx.fillStyle = '#a040ff';
    ctx.shadowColor = '#c060ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.9 * this.fadeAlpha;
    // Handle
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.moveTo(-20 * sc, -2);
    ctx.lineTo(20 * sc, -1);
    ctx.lineTo(20 * sc, 1);
    ctx.lineTo(-20 * sc, 2);
    ctx.closePath();
    ctx.fill();
    // Grip wraps
    ctx.fillStyle = '#6a2a8a';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-14 + i * 9, -2.5, 4, 5);
    }
    // Blade 1
    ctx.fillStyle = '#ddd';
    ctx.shadowColor = '#a040ff';
    ctx.shadowBlur = 14 * pulse;
    ctx.beginPath();
    ctx.moveTo(18 * sc, -2);
    ctx.bezierCurveTo(28 * sc, -10 * sc, 32 * sc, -24 * sc, 20 * sc, -36 * sc);
    ctx.bezierCurveTo(16 * sc, -22 * sc, 18 * sc, -11 * sc, 18 * sc, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(160,64,255,0.35)';
    ctx.fill();
    // Blade 2 (opposite)
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 2);
    ctx.bezierCurveTo(-28 * sc, 10 * sc, -32 * sc, 24 * sc, -20 * sc, 36 * sc);
    ctx.bezierCurveTo(-16 * sc, 22 * sc, -18 * sc, 11 * sc, -18 * sc, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(160,64,255,0.35)';
    ctx.fill();
    // Edge glow
    ctx.strokeStyle = '#c080ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18 * sc, -2);
    ctx.bezierCurveTo(28 * sc, -10 * sc, 32 * sc, -24 * sc, 20 * sc, -36 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18 * sc, 2);
    ctx.bezierCurveTo(-28 * sc, 10 * sc, -32 * sc, 24 * sc, -20 * sc, 36 * sc);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Center gem
    ctx.fillStyle = '#c060ff';
    ctx.shadowColor = '#e080ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
