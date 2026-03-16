// ── Trimerang (Wind Ninja special) ───────────────────────────
class Trimerang {
  constructor(x, y, vx, vy, owner) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner = owner;
    this.radius = 18;
    this.angle = 0;
    this.spin = 0.22 + Math.random() * 0.08;
    this.life = 9999;
    this.done = false;
    this.hitSet = new Set();
    this.turnSpeed = 0.012 + Math.random() * 0.008;
    this.turnDir = Math.random() < 0.5 ? 1 : -1;
  }
  update(game) {
    // Slow turning
    let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    // Air drag: slow down gradually
    speed *= 0.985;
    // Always accelerate toward player
    const pl = game.player;
    const dx = (pl.x + pl.w / 2) - this.x;
    const dy = (pl.y + pl.h / 2) - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const accel = Math.min(0.18, dist / 900);
    const ax = (dx / dist) * accel;
    const ay = (dy / dist) * accel;
    this.vx += ax;
    this.vy += ay;
    // Cap speed
    const maxSpeed = 10;
    const newSpd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (newSpd > maxSpeed) {
      this.vx *= maxSpeed / newSpd;
      this.vy *= maxSpeed / newSpd;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.spin;
    this.life--;
    // Damage enemies
    for (const e of game.enemies) {
      if (!e.dead && !this.hitSet.has(e) && Math.hypot((e.x + e.w / 2) - this.x, (e.y + e.h / 2) - this.y) < this.radius + Math.max(e.w, e.h) / 2) {
        e.takeDamage(3 + game.player.windPower, game, this.x);
        this.hitSet.add(e);
        game.effects.push(new Effect(this.x, this.y, '#bfb', 8, 3, 10));
      }
    }
    // Damage boss
    if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && Math.hypot((game.boss.x + game.boss.w / 2) - this.x, (game.boss.y + game.boss.h / 2) - this.y) < this.radius + Math.max(game.boss.w, game.boss.h) / 2) {
      game.boss.takeDamage(3 + game.player.windPower, game, this.x);
      this.hitSet.add(game.boss);
      game.effects.push(new Effect(this.x, this.y, '#bfb', 10, 4, 12));
    }
    // If player touches it, end
    if (Math.hypot((pl.x + pl.w / 2) - this.x, (pl.y + pl.h / 2) - this.y) < this.radius + Math.max(pl.w, pl.h) / 2) {
      this.done = true;
      game.effects.push(new Effect(this.x, this.y, '#fff', 12, 4, 16));
    }
    // If destroyed by other means, push effect once
    if (!this._destroyEffect && this.done) {
      game.effects.push(new Effect(this.x, this.y, '#bff', 14, 4, 18));
      this._destroyEffect = true;
    }
  }
  render(ctx, cam) {
    ctx.save();
    ctx.translate(this.x - cam.x, this.y - cam.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    let a = 0;
    ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
    for (let i = 1; i <= 3; i++) {
      a = (i * Math.PI * 2) / 3;
      ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
    }
    ctx.closePath();
    ctx.fillStyle = '#bfb';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Projectile ───────────────────────────────────────────────
class Projectile {
  constructor(x, y, vx, vy, color, damage, owner) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.w = 8; this.h = 6;
    this.color = color;
    this.damage = damage;
    this.owner = owner; // 'player' or 'enemy'
    this.done = false;
    this.life = 180;
    this.reflected = false;
    this.bouncy = false;
    this.piercing = false;
    this.hitSet = new Set();
  }
  update(game) {
    if (this.bouncy) this.vy += 0.15;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) { this.done = true; return; }
    // Hit platforms (skip thin platforms)
    if (this.owner !== 'boss') {
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (rectOverlap(this, p)) {
          if (this.bouncy && this.life > 30) {
            if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 6) {
              this.y = p.y - this.h; this.vy = -this.vy * 0.75;
            } else if (this.vy < 0) {
              this.vy = -this.vy * 0.75;
            } else {
              this.vx = -this.vx * 0.75;
            }
            this.life -= 25;
            return;
          }
          this.done = true;
          game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 10));
          return;
        }
      }
    }
    // Hit stone blocks (power them up)
    if (this.owner === 'enemy' || this.owner === 'boss') {
      for (const b of game.stoneBlocks) {
        if (!b.done && rectOverlap(this, b)) {
          b.powered = true;
          this.done = true;
          game.effects.push(new Effect(this.x, this.y, '#ff0', 6, 2, 12));
          return;
        }
      }
    }
    if (this.owner === 'player') {
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {
          e.takeDamage(this.damage, game, this.x);
          // Pushback effect
          const dx = e.x + e.w / 2 - (this.x + this.w / 2);
          const dy = e.y + e.h / 2 - (this.y + this.h / 2);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pushStrength = 6;
          e.vx += (dx / dist) * pushStrength;
          e.vy += (dy / dist) * (pushStrength * 0.3);
          this.hitSet.add(e);
          if (game.player.ninjaType === 'fire') {
            e.burnTimer = 150;
            game.player.comboMeter = Math.min(game.player.comboMeter + 1, 10);
            game.player.comboTimer = 180;
            if (game.player.comboMeter >= 10) {
              e.burnTimer = 150;
            }
            if (game.player.comboMeter >= 8 && !game.player.fireArmor) {
              game.player.fireArmor = true;
              game.player.fireArmorTimer = 300;
              SFX.armor();
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 15, 4, 20));
            }
          }
          // Ultimate charge gain: projectile hit
          if (!game.player.ultimateReady && !game.player.ultimateActive) {
            game.player.addUltimateCharge(2);
          }
          if (!this.piercing) { this.done = true; return; }
          game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 8));
        }
      }
      // Hit boss
      if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.damage, game, this.x);
        this.hitSet.add(game.boss);
        // Ultimate charge gain: projectile hit boss
        if (!game.player.ultimateReady && !game.player.ultimateActive) {
          game.player.addUltimateCharge(3);
        }
        if (!this.piercing) { this.done = true; return; }
        game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 8));
        if (game.player.ninjaType === 'fire') {
          game.boss.burnTimer = 150;
          game.player.comboMeter = Math.min(game.player.comboMeter + 1, 10);
          game.player.comboTimer = 180;
          if (game.player.comboMeter >= 10) {
            game.boss.burnTimer = 150;
          }
          if (game.player.comboMeter >= 8 && !game.player.fireArmor) {
            game.player.fireArmor = true;
            game.player.fireArmorTimer = 300;
            SFX.armor();
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 15, 4, 20));
          }
        }
      }
    } else {
      const pl = game.player;
      if (rectOverlap(this, pl)) {
        pl.takeDamage(this.damage, game);
        this.done = true;
      }
    }
  }
  render(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.piercing) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = this.color;
    ctx.fillRect(sx, sy, this.w, this.h);
    // trail
    ctx.globalAlpha = 0.4;
    ctx.fillRect(this.x - this.vx - cam.x, this.y - this.vy - cam.y, this.w, this.h);
    if (this.piercing) {
      ctx.globalAlpha = 0.2;
      ctx.fillRect(this.x - this.vx * 2 - cam.x, this.y - this.vy * 2 - cam.y, this.w, this.h);
    }
    ctx.globalAlpha = 1;
  }
}
