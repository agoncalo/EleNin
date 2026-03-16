// ── Stone Constructs (Earth ninja ability) ───────────────────
class StoneConstruct {
  constructor(x, y, w, h, hp = 3) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.hp = hp;
    this.maxHp = hp;
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
        if (this.vy > 4 && this.y + this.h - this.vy <= e.y + 4) {
          e.takeDamage(3, game, this.x + this.w/2);
          this.takeDamage(2);
          game.effects.push(new Effect(this.x + this.w/2, this.y + this.h, '#aaa', 8, 3, 10));
          this.vy = -2;
        } else {
          this.takeDamage(1);
          e.takeDamage(1, game, this.x + this.w/2);
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

    // Hard landing effects
    if (landedHard) {
      this.takeDamage(Math.max(1, Math.floor(landingVy / 4)));
      damageInRadius(game, this.x + this.w/2, this.y + this.h/2, 60, 2);
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
    const dmg = this.powered ? 5 : 3;
    damageInRadius(game, this.x + this.w/2, this.y + this.h/2, 80, dmg);
    triggerHitstop(4);
  }
  render(ctx, cam) {
    ctx.fillStyle = this.powered ? '#7ec850' : '#3a7a3a';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 3);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StonePillar extends StoneConstruct {
  constructor(x, y) {
    super(x, y - TILE, TILE, TILE * 3, 4);
  }
  render(ctx, cam) {
    ctx.fillStyle = '#4a8a4a';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = '#aee6a3';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 8);
    ctx.fillStyle = '#225522';
    ctx.fillRect(this.x - cam.x, this.y - cam.y + this.h - 8, this.w, 8);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StoneSpike extends StoneConstruct {
  constructor(x, y) {
    super(x, y, TILE, TILE, 6);
  }
  update(game) {
    super.update(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage(3, game);
        game.effects.push(new Effect(e.x + e.w/2, e.y + e.h, '#f33', 8, 2, 10));
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss) && game.boss.vy >= 0) {
      game.boss.takeDamage(3, game);
      game.effects.push(new Effect(game.boss.x + game.boss.w/2, game.boss.y + game.boss.h, '#f33', 12, 3, 14));
    }
  }
  render(ctx, cam) {
    ctx.fillStyle = '#6c8';
    ctx.beginPath();
    ctx.moveTo(this.x - cam.x, this.y + this.h - cam.y);
    ctx.lineTo(this.x + this.w/2 - cam.x, this.y - cam.y);
    ctx.lineTo(this.x + this.w - cam.x, this.y + this.h - cam.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.stroke();
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

class StoneGolem extends StoneConstruct {
  constructor(x, y, facing) {
    super(x, y, TILE, TILE, 4);
    this.facing = facing || 1;
    this.golemSpeed = 1.2;
  }
  update(game) {
    if (!this.thrown) this.vx = this.facing * this.golemSpeed;
    else this.vx *= 0.9;
    super.update(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage(4, game);
        game.effects.push(new Effect(e.x + e.w/2, e.y + e.h/2, '#f93', 10, 3, 12));
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      game.boss.takeDamage(4, game);
      game.effects.push(new Effect(game.boss.x + game.boss.w/2, game.boss.y + game.boss.h/2, '#f93', 14, 4, 16));
    }
  }
  explode(game) {
    this.done = true;
    game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#aaa', 10, 3, 12));
  }
  render(ctx, cam) {
    ctx.fillStyle = '#4a8a4a';
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
    ctx.fillStyle = '#225522';
    ctx.fillRect(this.x - cam.x + 8, this.y - cam.y + this.h - 12, this.w - 16, 10);
    ctx.fillStyle = '#aee6a3';
    ctx.fillRect(this.x - cam.x + 10, this.y - cam.y + 10, 8, 8);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}
