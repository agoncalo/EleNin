// ── Earth Constructs (Earth ninja ability) ───────────────────

// ── EarthWall — trapezoid wall, blocks projectiles, can be punched to launch ──
class EarthWall {
  constructor(x, y, wave) {
    this.w = TILE; this.h = TILE * 3;
    this.x = x; this.y = y;
    this.wave = wave;
    this.hp = 6; this.maxHp = 6;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
    this.done = false;
    this.launched = false;
    this.damageCd = 0;
    this.hitSet = new Set();
    this.topW = TILE * 0.7;
    this.botW = TILE * 1.4;
    this.launchDmg = 5 * wave;
  }
  isCollidable() { return !this.launched; }
  takeDamage(amt) { if (this.damageCd <= 0) { this.hp -= amt; this.damageCd = 20; } }
  launch(facing) {
    this.vx = facing * 9;
    this.vy = -1;
    this.launched = true;
  }
  update(game) {
    if (this.damageCd > 0) this.damageCd--;
    // Block enemy projectiles while stationary
    if (!this.launched) {
      for (const p of game.projectiles) {
        if (p.done || p.owner === 'player') continue;
        if (rectOverlap(this, p)) {
          p.done = true;
          game.effects.push(new Effect(p.x, p.y, '#a87', 6, 2, 10));
        }
      }
    }
    // Gravity + movement
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.x += this.vx;
    this.y += this.vy;
    if (this.launched) this.vx *= 0.97;
    this.grounded = false;
    // Platform collision (including thin platforms for top landing)
    for (const p of game.platforms) {
      if (p.thin) {
        // Land on thin platforms from above
        if (this.vy > 0 && rectOverlap(this, p) && this.y + this.h - this.vy <= p.y + 2) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
        }
        continue;
      }
      if (rectOverlap(this, p)) {
        if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
        } else if (this.vx > 0 && this.x + this.w - this.vx <= p.x) {
          this.x = p.x - this.w; this.vx = 0;
        } else if (this.vx < 0 && this.x - this.vx >= p.x + p.w - 4) {
          this.x = p.x + p.w; this.vx = 0;
        }
      }
    }
    // Damage enemies when launched
    if (this.launched) {
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {
          e.takeDamage(this.launchDmg, game, this.x + this.w / 2, undefined, 'boulder');
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a87', 10, 3, 12));
          if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(2);
          this.hitSet.add(e);
          e.stunTimer = Math.max(e.stunTimer, 40);
        }
      }
      if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.launchDmg, game, this.x + this.w / 2, undefined, 'boulder');
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a87', 14, 4, 16));
        if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(3);
        this.hitSet.add(game.boss);
        game.boss.stunTimer = Math.max(game.boss.stunTimer, 25);
      }
      if (Math.abs(this.vx) < 0.5 && this.grounded) {
        this.launched = false;
        this.vx = 0;
      }
    }
    if (this.y > CANVAS_H + 200) this.done = true;
    if (this.hp <= 0) this.explode(game);
  }
  explode(game) {
    this.done = true;
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a87', 15, 5, 18));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c8a878', 10, 4, 14));
    damageInRadius(game, this.x + this.w / 2, this.y + this.h / 2, 70, 3 * this.wave);
    triggerHitstop(4);
  }
  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const cx = sx + this.w / 2;
    const topW = this.topW;
    const botW = this.botW;
    // Trapezoid body
    ctx.fillStyle = '#8b5e3c';
    ctx.beginPath();
    ctx.moveTo(cx - botW / 2, sy + this.h);
    ctx.lineTo(cx - topW / 2, sy);
    ctx.lineTo(cx + topW / 2, sy);
    ctx.lineTo(cx + botW / 2, sy + this.h);
    ctx.closePath();
    ctx.fill();
    // Stone texture lines
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const lw = topW + (botW - topW) * t;
      const ly = sy + this.h * t;
      ctx.beginPath();
      ctx.moveTo(cx - lw / 2, ly);
      ctx.lineTo(cx + lw / 2, ly);
      ctx.stroke();
    }
    // Top cap
    ctx.fillStyle = '#c8a878';
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, sy);
    ctx.lineTo(cx + topW / 2, sy);
    ctx.lineTo(cx + topW / 2 + 2, sy + 6);
    ctx.lineTo(cx - topW / 2 - 2, sy + 6);
    ctx.closePath();
    ctx.fill();
    // Green accent
    ctx.fillStyle = '#2e9e2e';
    ctx.fillRect(cx - topW / 2 + 2, sy + 2, topW - 4, 3);
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

// ── EarthBoulder — rises from ground, can be punched/jumped on/ground pounded ──
class EarthBoulder {
  constructor(x, groundY, targetY, wave) {
    const size = Math.round(TILE * 1.3);
    this.w = size; this.h = size;
    this.x = x - size / 2;
    this.y = groundY - size;
    this.wave = wave;
    this.hp = 8; this.maxHp = 8;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
    this.done = false;
    this.damageCd = 0;
    this.hitSet = new Set();
    this.targetY = targetY;
    this.rising = true;
    this.riseSpeed = 5;
    this.hovering = false;
    this.hoverTimer = 120;
    this.launched = false;
    this.pounded = false;
    this.launchDmg = 6 * wave;
  }
  isCollidable() { return this.hovering && !this.launched && !this.pounded; }
  takeDamage(amt) { if (this.damageCd <= 0) { this.hp -= amt; this.damageCd = 20; } }
  launchAt(tx, ty) {
    this.launched = true;
    this.rising = false;
    this.hovering = false;
    const dx = tx - (this.x + this.w / 2);
    const dy = ty - (this.y + this.h / 2);
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / d) * 10;
    this.vy = (dy / d) * 10;
    this.launchTimer = 0;
    SFX.hit();
  }
  groundPound() {
    this.pounded = true;
    this.rising = false;
    this.hovering = false;
    this.vx = 0;
    this.vy = 14;
    this.launchDmg = 8 * this.wave;
  }
  update(game) {
    if (this.damageCd > 0) this.damageCd--;
    // Destroy enemy projectiles on contact
    for (const p of game.projectiles) {
      if (p.done || p.owner === 'player') continue;
      if (rectOverlap(this, p)) {
        p.done = true;
        game.effects.push(new Effect(p.x, p.y, '#a87', 6, 2, 10));
      }
    }
    if (this.rising) {
      this.y -= this.riseSpeed;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.rising = false;
        this.hovering = true;
      }
      // Rising damage to enemies in the way
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {
          e.takeDamage(3 * this.wave, game, this.x + this.w / 2);
          const rDir = Math.sign(e.x + e.w / 2 - (this.x + this.w / 2)) || 1;
          e.vx += rDir * 10;
          e.vy = -6;
          e.knockbackTimer = Math.max(e.knockbackTimer, 14);
          this.hitSet.add(e);
          e.stunTimer = Math.max(e.stunTimer, 30);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a87', 8, 3, 10));
        }
      }
      // Check for merge with other hovering/rising boulders while rising
      for (const b of game.stoneBlocks) {
        if (b === this || b.done || !(b instanceof EarthBoulder)) continue;
        if (!(b.hovering || b.rising)) continue;
        if (rectOverlap(this, b)) {
          const newSize = Math.round(Math.sqrt(this.w * this.w + b.w * b.w));
          this.w = newSize; this.h = newSize;
          this.hp = Math.min(this.hp + b.hp, this.maxHp * 2);
          this.maxHp = Math.max(this.maxHp, this.hp);
          this.launchDmg = Math.round(this.launchDmg * 1.5);
          this.x = (this.x + b.x) / 2;
          this.y = (this.y + b.y) / 2;
          b.done = true;
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c8a878', 12, 4, 14));
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#2e9e2e', 8, 3, 10));
          triggerHitstop(3);
          SFX.hit();
          break;
        }
      }
      return;
    }
    if (this.hovering) {
      this.hoverTimer--;
      this.y += Math.sin(game.tick * 0.08) * 0.3;
      // Check for merge with other hovering/rising boulders
      for (const b of game.stoneBlocks) {
        if (b === this || b.done || !(b instanceof EarthBoulder)) continue;
        if (!(b.hovering || b.rising)) continue;
        if (rectOverlap(this, b)) {
          // Merge: absorb the other boulder
          const newSize = Math.round(Math.sqrt(this.w * this.w + b.w * b.w));
          this.w = newSize; this.h = newSize;
          this.hp = Math.min(this.hp + b.hp, this.maxHp * 2);
          this.maxHp = Math.max(this.maxHp, this.hp);
          this.launchDmg = Math.round(this.launchDmg * 1.5);
          this.hoverTimer = Math.max(this.hoverTimer, 80);
          this.x = (this.x + b.x) / 2;
          this.y = (this.y + b.y) / 2;
          b.done = true;
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c8a878', 12, 4, 14));
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#2e9e2e', 8, 3, 10));
          triggerHitstop(3);
          SFX.hit();
          break;
        }
      }
      if (this.hoverTimer <= 0) { this.hovering = false; }
      return;
    }
    if (this.launched) {
      this.launchTimer++;
      if (this.launchTimer > 20) {
        this.vy += GRAVITY;
        if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      }
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.99;
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {
          e.takeDamage(this.launchDmg, game, this.x + this.w / 2, undefined, 'boulder');
          // Extra boulder knockback on top of sword KB
          const bDir = Math.sign(this.vx) || Math.sign(e.x + e.w / 2 - (this.x + this.w / 2));
          e.vx += bDir * 8;
          e.knockbackTimer = Math.max(e.knockbackTimer, 14);
          e.stunTimer = Math.max(e.stunTimer, 40);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a87', 12, 4, 14));
          if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(2);
          this.hitSet.add(e);
          this.hp -= 2;
        }
      }
      if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.launchDmg, game, this.x + this.w / 2, undefined, 'boulder');
        const bDir = Math.sign(this.vx) || Math.sign(game.boss.x + game.boss.w / 2 - (this.x + this.w / 2));
        game.boss.vx += bDir * 6;
        game.boss.knockbackTimer = Math.max(game.boss.knockbackTimer, 14);
        game.boss.stunTimer = Math.max(game.boss.stunTimer, 25);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a87', 16, 5, 18));
        if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(3);
        this.hitSet.add(game.boss);
        this.hp -= 3;
      }
      // Hit platform — only crash on ground (thick platforms)
      // Falling boulders smash through thin platforms dealing damage
      if (!this._hitPlats) this._hitPlats = new Set();
      for (const p of game.platforms) {
        if (!rectOverlap(this, p)) continue;
        if (p.thin) {
          if (this.vy > 0 && !this._hitPlats.has(p)) {
            this._hitPlats.add(p);
            damageInRadius(game, this.x + this.w / 2, p.y, 60, this.launchDmg);
            game.effects.push(new Effect(this.x + this.w / 2, p.y, '#a87', 8, 3, 10));
            triggerScreenShake(2, 4);
          }
        } else {
          this.hp = 0; break;
        }
      }
      if (Math.abs(this.vx) < 1 && Math.abs(this.vy) < 1) this.hp = 0;
      if (this.y > CANVAS_H + 200 || this.x < -200 || this.x > game.levelW + 200) this.done = true;
      if (this.hp <= 0) this.explode(game);
      return;
    }
    // Natural fall (pounded or hover expired)
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.x += this.vx;
    this.y += this.vy;
    this.grounded = false;
    if (!this._poundedPlats) this._poundedPlats = new Set();
    for (const p of game.platforms) {
      if (!rectOverlap(this, p)) continue;
      if (this.pounded) {
        // Pounded boulders smash through thin platforms, explode on thick (ground)
        if (this.vy > 0 && !this._poundedPlats.has(p)) {
          this._poundedPlats.add(p);
          const impactX = this.x + this.w / 2;
          const impactY = p.y;
          damageInRadius(game, impactX, impactY, 80, this.launchDmg);
          game.effects.push(new Effect(impactX, impactY, '#a87', 14, 5, 16));
          game.effects.push(new EarthCrater(impactX, impactY, Math.ceil(this.launchDmg * 0.4), game));
          triggerScreenShake(4, 6);
          SFX.slam();
          if (p.y >= 480) {
            // Hit actual ground floor — explode
            triggerHitstop(5);
            this.hp = 0;
          }
        }
      } else {
        // Non-pounded: land normally on thick platforms
        if (p.thin) continue;
        if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          if (this.vy > 6) {
            damageInRadius(game, this.x + this.w / 2, this.y + this.h, 80, this.launchDmg);
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#a87', 14, 5, 16));
            triggerHitstop(5);
            triggerScreenShake(5, 8);
            SFX.slam();
            this.hp = 0;
          }
          this.vy = 0;
          this.grounded = true;
        }
      }
    }
    if (this.y > CANVAS_H + 200) this.done = true;
    if (this.hp <= 0) this.explode(game);
  }
  explode(game) {
    this.done = true;
    const radius = Math.max(80, this.w * 2);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a87', 15, 5, 18));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c8a878', 10, 4, 14));
    damageInRadius(game, this.x + this.w / 2, this.y + this.h / 2, radius, 3 * this.wave);
    triggerHitstop(4);
  }
  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const r = this.w / 2;
    const cx = sx + r;
    const cy = sy + r;
    // Boulder body
    ctx.fillStyle = '#8b5e3c';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Cracks
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.2, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.1, cy - r * 0.6);
    ctx.lineTo(cx - r * 0.1, cy);
    ctx.stroke();
    // Highlight
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#c8a878';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Green accent gem
    ctx.fillStyle = '#2e9e2e';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();
    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}

// ── IceBlock — crystal special, freezes enemies, deflects projectiles, shatterable ──
class IceBlock {
  constructor(x, y, facing, wave, baseDmg, midair) {
    this.w = Math.round(TILE * 1.4);
    this.h = Math.round(TILE * 1.4);
    this.x = x - this.w / 2;
    this.y = y - this.h;
    this.wave = wave;
    this.baseDmg = baseDmg;
    this.hp = 3; this.maxHp = 3;
    this.vx = 0; this.vy = 0;
    this.done = false;
    this.grounded = false;
    this.damageCd = 0;
    this.timer = 360; // 6 seconds lifetime
    this.frozenEnemies = new Set();
    this.falling = !!midair;
    this.facing = facing;
    this.landed = false;
    this.freezeCooldown = 0;
    this.shimmer = 0;
    this.hoverPause = midair ? 25 : 0;
  }

  isCollidable() { return this.landed; }

  playerHit(game) {
    if (this.damageCd > 0) return;
    this.hp--;
    this.damageCd = 15;
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 8, 3, 10));
    triggerHitstop(3);
    SFX.hit();
    if (this.hp <= 0) this.shatter(game);
  }

  shatter(game) {
    this.done = true;
    // Launch 3 DiamondShards from the ice block position
    if (!game.diamondShards) game.diamondShards = [];
    for (let i = 0; i < 3; i++) {
      const sx = this.x + this.w / 2;
      const sy = this.y + this.h / 2 + (i - 1) * 16;
      game.diamondShards.push(new DiamondShard(sx, sy, 'player', game));
    }
    // Visual explosion
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 18, 6, 18));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 12, 4, 14));
    triggerHitstop(4);
    triggerScreenShake(3, 5);
    SFX.parry();
    // Ice shards particles
    for (let i = 0; i < 8; i++) {
      game.effects.push(new Effect(
        this.x + this.w / 2 + (Math.random() - 0.5) * this.w,
        this.y + this.h / 2 + (Math.random() - 0.5) * this.h,
        '#cff', 4 + Math.random() * 4, 2, 12
      ));
    }
  }

  update(game) {
    if (this.damageCd > 0) this.damageCd--;
    if (this.freezeCooldown > 0) this.freezeCooldown--;
    this.shimmer += 0.06;
    this.timer--;

    // Deflect enemy projectiles
    for (const p of game.projectiles) {
      if (p.done || p.owner === 'player') continue;
      if (rectOverlap(this, p)) {
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.owner = 'player';
        p.reflected = true;
        p.color = '#aff';
        game.effects.push(new Effect(p.x, p.y, '#aff', 6, 2, 8));
        SFX.reflect();
      }
    }

    // Falling behavior (midair spawn — acts like boulder)
    if (this.falling) {
      // Brief hover before falling
      if (this.hoverPause > 0) {
        this.hoverPause--;
        this.vy = 0;
        this.vx = 0;
        return;
      }
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.x += this.vx;
      this.y += this.vy;

      // Freeze + damage enemies while falling
      for (const e of game.enemies) {
        if (e.dead || this.frozenEnemies.has(e)) continue;
        if (rectOverlap(this, e)) {
          e.takeDamage(this.baseDmg, game, this.x + this.w / 2);
          e.freezeTimer = Math.max(e.freezeTimer, 90);
          const dir = Math.sign(e.x + e.w / 2 - (this.x + this.w / 2)) || 1;
          e.vx += dir * 6;
          e.vy = -4;
          e.knockbackTimer = Math.max(e.knockbackTimer, 12);
          e.stunTimer = Math.max(e.stunTimer, 40);
          this.frozenEnemies.add(e);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#aff', 10, 4, 12));
        }
      }
      if (game.boss && !game.boss.dead && !this.frozenEnemies.has(game.boss) && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.baseDmg, game, this.x + this.w / 2);
        game.boss.freezeTimer = Math.max(game.boss.freezeTimer, 50);
        game.boss.stunTimer = Math.max(game.boss.stunTimer, 25);
        this.frozenEnemies.add(game.boss);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aff', 12, 4, 14));
      }

      // Land on platforms
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (rectOverlap(this, p) && this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          const impactVy = this.vy;
          this.y = p.y - this.h;
          this.vy = 0;
          this.vx = 0;
          this.falling = false;
          this.landed = true;
          this.grounded = true;
          if (impactVy > 6) {
            damageInRadius(game, this.x + this.w / 2, p.y, 70, this.baseDmg);
            triggerScreenShake(3, 5);
          }
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#aff', 10, 4, 12));
          SFX.slam();
          break;
        }
      }
      // Also land on thin platforms from above
      for (const p of game.platforms) {
        if (!p.thin) continue;
        if (rectOverlap(this, p) && this.vy > 0 && this.y + this.h - this.vy <= p.y + 2) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.vx = 0;
          this.falling = false;
          this.landed = true;
          this.grounded = true;
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#aff', 10, 4, 12));
          SFX.slam();
          break;
        }
      }

      if (this.y > CANVAS_H + 200) this.done = true;
      return;
    }

    // Grounded: if not landed yet (spawned on ground), snap to ground
    if (!this.landed) {
      // Apply gravity to settle
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.y += this.vy;
      for (const p of game.platforms) {
        if (rectOverlap(this, p) && this.vy >= 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.landed = true;
          this.grounded = true;
          break;
        }
      }
      if (this.y > CANVAS_H + 200) { this.done = true; return; }
    }

    // Freeze enemies on contact (grounded)
    if (this.landed && this.freezeCooldown <= 0) {
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (rectOverlap(this, e)) {
          e.freezeTimer = Math.max(e.freezeTimer, 60);
          e.stunTimer = Math.max(e.stunTimer, 30);
          this.frozenEnemies.add(e);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#aff', 4, 2, 6));
        }
      }
      if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
        game.boss.freezeTimer = Math.max(game.boss.freezeTimer, 40);
        game.boss.stunTimer = Math.max(game.boss.stunTimer, 20);
        this.frozenEnemies.add(game.boss);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aff', 4, 2, 6));
      }
      this.freezeCooldown = 30;
    }

    // Auto-shatter if all frozen enemies are dead (and at least one was frozen)
    if (this.frozenEnemies.size > 0 && !this.done) {
      let allDead = true;
      for (const e of this.frozenEnemies) {
        if (!e.dead) { allDead = false; break; }
      }
      if (allDead) this.shatter(game);
    }

    // Time expired
    if (this.timer <= 0 && !this.done) this.shatter(game);

    // Frost particles
    if (this.landed && this.timer > 30 && Math.random() < 0.3) {
      game.effects.push(new Effect(
        this.x + Math.random() * this.w,
        this.y + Math.random() * this.h,
        '#cff', 2, 1, 10
      ));
    }
  }

  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const pulse = Math.sin(this.shimmer) * 0.08;

    ctx.save();
    ctx.globalAlpha = 0.75 + pulse;
    // Main ice body
    ctx.fillStyle = '#88eeff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(sx + 2, sy + 2, this.w - 4, this.h - 4);
    ctx.shadowBlur = 0;

    // Glass-like highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(sx + 4, sy + 4, this.w * 0.4, this.h * 0.3);

    // Inner crystal lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.2, sy + this.h * 0.3);
    ctx.lineTo(sx + this.w * 0.5, sy + this.h * 0.6);
    ctx.lineTo(sx + this.w * 0.8, sy + this.h * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.35, sy + this.h * 0.7);
    ctx.lineTo(sx + this.w * 0.65, sy + this.h * 0.5);
    ctx.stroke();

    // Frost border
    ctx.strokeStyle = '#cff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, this.w - 2, this.h - 2);

    // Cracks for damage
    if (this.hp < this.maxHp) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      if (this.hp <= 2) {
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 10);
        ctx.lineTo(cx + 2, cy);
        ctx.lineTo(cx + 10, cy + 8);
        ctx.stroke();
      }
      if (this.hp <= 1) {
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy - 8);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.lineTo(cx - 10, cy + 12);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // Flashing when about to expire
    if (this.timer < 60 && Math.floor(this.timer / 6) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.restore();
    }

    if (this.hp < this.maxHp) renderHpBar(ctx, cam, this);
  }
}
