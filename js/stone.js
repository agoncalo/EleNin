// ── Stone Constructs (Earth ninja ability) ───────────────────
class StoneConstruct {
  constructor(x, y, w, h, hp = 3, wave = 1) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.wave = wave;
    this.hp = hp;
    this.maxHp = this.hp;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
    this.done = false;
    this.thrown = false;
    this.powered = false;
    this.hitCooldown = 0;
  }
  takeDamage(amt) { if (this.hitCooldown <= 0) { this.hp -= amt; this.hitCooldown = 30; } }
  canBeThrown() { return true; }
  blockProjectiles() { return true; }
  update(game) {
    let landedHard = false;
    let landingVy = 0;

    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.9;
    this.grounded = false;
    if (this.hitCooldown > 0) this.hitCooldown--;

    // Collide with platforms
    for (const p of game.platforms) {
      if (rectOverlap(this, p)) {
        if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          if (this.vy > 4) { landedHard = true; landingVy = this.vy; }
          this.vy = 0;
          this.grounded = true;
          if (Math.abs(this.vx) < 0.5) this.thrown = false;
        }
      }
    }
    // Collide with other constructs
    for (const other of game.stoneBlocks) {
      if (other === this || other.done) continue;
      if (rectOverlap(this, other)) {
        if (this.vy > 0 && this.y + this.h - this.vy <= other.y + 4) {
          this.y = other.y - this.h;
          if (this.vy > 4) { landedHard = true; landingVy = this.vy; }
          this.vy = 0;
          this.grounded = true;
          if (Math.abs(this.vx) < 0.5) this.thrown = false;
        }
        else if (this.vx > 0 && this.x + this.w - this.vx <= other.x + 4) {
          this.x = other.x - this.w;
          this.vx = 0;
        } else if (this.vx < 0 && this.x - this.vx >= other.x + other.w - 4) {
          this.x = other.x + other.w;
          this.vx = 0;
        }
      }
    }

    // Deal and take damage when falling on enemies
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        if (this.contactDamage === false && !this.thrown) {
          // No contact damage (pillar) — just push enemy away
          if (!(this instanceof StoneSpike)) {
            const overlapLeft = (e.x + e.w) - this.x;
            const overlapRight = (this.x + this.w) - e.x;
            if (overlapLeft < overlapRight) {
              e.x = this.x - e.w - 1;
              e.vx = -2;
            } else {
              e.x = this.x + this.w + 1;
              e.vx = 2;
            }
          }
        } else if (this.vy > 4 && this.y + this.h - this.vy <= e.y + 4) {
          e.takeDamage(3 * this.wave, game, this.x + this.w/2);
          this.takeDamage(2);
          game.effects.push(new Effect(this.x + this.w/2, this.y + this.h, '#aaa', 8, 3, 10));
          this.vy = -2;
        } else {
          this.takeDamage(1);
          e.takeDamage(1 * this.wave, game, this.x + this.w/2);
        }
        // Push enemy horizontally away (non-spike constructs)
        if (!(this instanceof StoneSpike)) {
          const overlapLeft = (e.x + e.w) - this.x;
          const overlapRight = (this.x + this.w) - e.x;
          if (overlapLeft < overlapRight) {
            e.x = this.x - e.w - 1;
            e.vx = -2;
          } else {
            e.x = this.x + this.w + 1;
            e.vx = 2;
          }
        }
      }
    }

    // Take damage from boss contact
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      if (this.contactDamage !== false || this.thrown) this.takeDamage(2);
    }

    // Hard landing effects
    if (landedHard) {
      this.takeDamage(Math.max(1, Math.floor(landingVy / 4)));
      damageInRadius(game, this.x + this.w/2, this.y + this.h/2, 60, 2 * this.wave);
      game.effects.push(new Effect(this.x + this.w/2, this.y + this.h, '#aaa', 10, 3, 10));
      triggerHitstop(2);
    }

    if (this.y > CANVAS_H + 100) this.done = true;
    if (this.hp <= 0) this.explode(game);
  }
  explode(game) {
    this.done = true;
    game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#a87', 15, 5, 18));
    game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#f93', 10, 4, 14));
    const dmg = (this.powered ? 5 : 3) * this.wave;
    damageInRadius(game, this.x + this.w/2, this.y + this.h/2, 80, dmg);
    triggerHitstop(4);
  }
  render(ctx, cam) {
    ctx.fillStyle = this.powered ? '#c8a050' : '#7a5a3a';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 3);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StonePillar extends StoneConstruct {
  constructor(x, y, wave) {
    super(x, y - TILE, TILE, TILE * 3, 4, wave);
    this.contactDamage = false;
  }
  render(ctx, cam) {
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 8);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(this.x - cam.x, this.y - cam.y + this.h - 8, this.w, 8);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StoneSpike extends StoneConstruct {
  constructor(x, y, wave) {
    super(x, y, TILE, TILE, 6, wave);
  }
  update(game) {
    super.update(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage((3 * this.wave), game);
        game.effects.push(new Effect(e.x + e.w/2, e.y + e.h, '#f33', 8, 2, 10));
        game.player.addUltimateCharge(1);
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss) && game.boss.vy >= 0) {
      game.boss.takeDamage((3 * this.wave), game);
      game.effects.push(new Effect(game.boss.x + game.boss.w/2, game.boss.y + game.boss.h, '#f33', 12, 3, 14));
      game.player.addUltimateCharge(2);
    }
  }
  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    // Brown spike body
    ctx.fillStyle = '#a0622a';
    ctx.beginPath();
    ctx.moveTo(sx, sy + this.h);
    ctx.lineTo(sx + this.w/2, sy);
    ctx.lineTo(sx + this.w, sy + this.h);
    ctx.closePath();
    ctx.fill();
    // Green accent tip
    ctx.fillStyle = '#2e9e2e';
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.3, sy + this.h * 0.5);
    ctx.lineTo(sx + this.w/2, sy);
    ctx.lineTo(sx + this.w * 0.7, sy + this.h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a3a1a';
    ctx.stroke();
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StoneGolem extends StoneConstruct {
  constructor(x, y, facing, wave) {
    super(x, y, TILE, TILE, 4, wave);
    this.facing = facing || 1;
    this.golemSpeed = 1.2;
  }
  update(game) {
    if (!this.thrown) this.vx = this.facing * this.golemSpeed;
    else this.vx *= 0.9;
    super.update(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage((4 * this.wave), game);
        game.effects.push(new Effect(e.x + e.w/2, e.y + e.h/2, '#f93', 10, 3, 12));
        if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(1);
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      game.boss.takeDamage((4 * this.wave), game);
      game.effects.push(new Effect(game.boss.x + game.boss.w/2, game.boss.y + game.boss.h/2, '#f93', 14, 4, 16));
      if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(2);
    }
  }
  explode(game) {
    this.done = true;
    game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#aaa', 10, 3, 12));
  }
  render(ctx, cam) {
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(this.x - cam.x + 8, this.y - cam.y + this.h - 12, this.w - 16, 10);
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(this.x - cam.x + 10, this.y - cam.y + 10, 8, 8);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

// ── StoneShooter — shoots projectiles at nearest enemy ──
class StoneShooter extends StoneConstruct {
  constructor(x, y, facing, wave) {
    super(x, y, TILE, TILE, 4, wave);
    this.facing = facing || 1;
    this.shootTimer = 0;
  }
  update(game) {
    super.update(game);
    this.shootTimer++;
    if (this.shootTimer >= 70) {
      this.shootTimer = 0;
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      let nearest = null, bestDist = 400;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; nearest = e; }
      }
      if (!nearest && game.boss && !game.boss.dead) {
        const dx = (game.boss.x + game.boss.w / 2) - cx;
        const dy = (game.boss.y + game.boss.h / 2) - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 400) nearest = game.boss;
      }
      if (nearest) {
        const dx = (nearest.x + nearest.w / 2) - cx;
        const dy = (nearest.y + nearest.h / 2) - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0) {
          const p = new Projectile(cx, cy, (dx / d) * 5, (dy / d) * 5, '#b8864e', (3 * this.wave), 'player');
          p.w = 6; p.h = 6; p.life = 90;
          p.fromConstruct = true;
          game.projectiles.push(p);
        }
      }
    }
  }
  render(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Body
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(sx, sy, this.w, this.h);
    // Top highlight
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(sx, sy, this.w, 4);
    // Barrel
    ctx.fillStyle = '#5a3a1a';
    const bx = this.facing > 0 ? sx + this.w - 2 : sx - 6;
    ctx.fillRect(bx, sy + this.h / 2 - 3, 8, 6);
    // Barrel accent
    ctx.fillStyle = '#b8864e';
    ctx.fillRect(bx + 1, sy + this.h / 2 - 1, 6, 2);
    // Eye
    ctx.fillStyle = '#2e9e2e';
    ctx.fillRect(sx + (this.facing > 0 ? 12 : 6), sy + 8, 6, 6);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

// ── StoneFlyer — flies toward nearest enemy ──
class StoneFlyer extends StoneConstruct {
  constructor(x, y, wave) {
    super(x, y, TILE, TILE, 3, wave);
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.flying = true;
  }
  update(game) {
    this.hoverPhase += 0.03;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    let nearest = null, bestDist = 500;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    if (!nearest && game.boss && !game.boss.dead) {
      const dx = (game.boss.x + game.boss.w / 2) - cx;
      const dy = (game.boss.y + game.boss.h / 2) - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 500) nearest = game.boss;
    }
    if (nearest) {
      const dx = (nearest.x + nearest.w / 2) - cx;
      const dy = (nearest.y + nearest.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 30) {
        this.vx = (dx / d) * 2.2;
        this.vy = (dy / d) * 2.2 + Math.sin(this.hoverPhase) * 0.5;
      } else {
        this.vx *= 0.9;
        this.vy = Math.sin(this.hoverPhase) * 1.2;
      }
    } else {
      this.vx *= 0.95;
      this.vy = Math.sin(this.hoverPhase) * 0.8;
    }
    // No gravity — override the super update for position only
    this.x += this.vx;
    this.y += this.vy;
    if (this.hitCooldown > 0) this.hitCooldown--;
    // Damage enemies on contact
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage((3 * this.wave), game, this.x + this.w / 2);
        this.takeDamage(1);
        game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#b8864e', 8, 2, 10));
        game.player.addUltimateCharge(1);
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      game.boss.takeDamage((1 * this.wave), game);
      this.takeDamage(1);
      game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#b8864e', 10, 3, 12));
      game.player.addUltimateCharge(2);
    }
    if (this.y > CANVAS_H + 100 || this.y < -400) this.done = true;
    if (this.hp <= 0) this.explode(game);
  }
  render(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Body
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(sx + 4, sy + 4, this.w - 8, this.h - 8);
    // Highlight
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(sx + 4, sy + 4, this.w - 8, 3);
    // Wings
    ctx.fillStyle = '#a0622a';
    ctx.fillRect(sx - 4, sy + 8, 6, this.h - 16);
    ctx.fillRect(sx + this.w - 2, sy + 8, 6, this.h - 16);
    // Wing accents
    ctx.fillStyle = '#b8864e';
    ctx.fillRect(sx - 3, sy + 9, 4, 3);
    ctx.fillRect(sx + this.w - 1, sy + 9, 4, 3);
    // Eye
    ctx.fillStyle = '#2e9e2e';
    ctx.fillRect(sx + this.w / 2 - 3, sy + 8, 6, 6);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

// ── StoneDeflector — walks toward enemies, deflects enemy projectiles ──
class StoneDeflector extends StoneConstruct {
  constructor(x, y, facing, wave) {
    super(x, y, TILE, TILE, 6, wave);
    this.facing = facing || 1;
    this.deflectReady = true;
  }
  update(game) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    // Find nearest enemy
    let nearest = null, bestDist = 300;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    if (!nearest && game.boss && !game.boss.dead) {
      const dx = (game.boss.x + game.boss.w / 2) - cx;
      const dy = (game.boss.y + game.boss.h / 2) - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 300) nearest = game.boss;
    }
    if (nearest) {
      this.facing = (nearest.x + nearest.w / 2) > cx ? 1 : -1;
      if (bestDist > 40) this.vx = this.facing * 1.0;
      else this.vx *= 0.85;
    }
    super.update(game);
    // Deflect enemy projectiles
    this.deflectReady = this.grounded;
    if (this.deflectReady) {
      for (const p of game.projectiles) {
        if (p.done || p.owner === 'player' || p.owner === 'boss') continue;
        if (rectOverlap(this, p)) {
          p.vx = -p.vx * 1.5;
          p.vy = -p.vy * 1.5;
          p.owner = 'player';
          p.reflected = true;
          p.damage = Math.max(p.damage, (4 * this.wave));
          game.effects.push(new Effect(p.x, p.y, '#c8a878', 8, 2, 10));
        }
      }
    }
    // Contact damage to enemies
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage((4 * this.wave), game, this.x + this.w / 2);
        game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#c8a878', 10, 3, 12));
        game.player.addUltimateCharge(1);
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      game.boss.takeDamage((4 * this.wave), game);
      game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#c8a878', 12, 3, 14));
      game.player.addUltimateCharge(2);
    }
  }
  render(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    // Body
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(sx, sy, this.w, this.h);
    // Top highlight
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(sx, sy, this.w, 4);
    // Bottom shadow
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(sx, sy + this.h - 4, this.w, 4);
    // Katana
    ctx.save();
    const gx = this.facing > 0 ? sx + this.w - 2 : sx + 2;
    const gy = sy + this.h * 0.4;
    ctx.translate(gx, gy);
    ctx.rotate(this.facing > 0 ? -0.4 : (Math.PI + 0.4));
    ctx.fillStyle = this.deflectReady ? '#dde' : '#889';
    ctx.fillRect(4, -1.5, 20, 3);
    ctx.fillStyle = '#aa8';
    ctx.fillRect(2, -3, 3, 6);
    ctx.fillStyle = '#b8864e';
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
    // Kasa hat
    ctx.fillStyle = '#2e9e2e';
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy + 2);
    ctx.lineTo(sx + this.w / 2, sy - 10);
    ctx.lineTo(sx + this.w + 4, sy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a0622a';
    ctx.fillRect(sx - 4, sy, this.w + 8, 2);
    // Deflect ready glow
    if (this.deflectReady) {
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.1 * Math.sin(Date.now() * 0.008);
      ctx.fillStyle = '#b8864e';
      ctx.beginPath();
      ctx.arc(gx, gy - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}
