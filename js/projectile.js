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
    // Orbit state for ultimate
    this.orbiting = false;
    this.orbitTimer = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = 60 + Math.random() * 30;
    this.burstAngle = 0;
    this.burstPhase = 0;
  }
  update(game) {
    const pl = game.player;

    // Orbiting mode: circle the player before bursting outward
    if (this.orbiting) {
      this.orbitTimer--;
      this.orbitAngle += 0.12;
      // Orbit around player
      const targetX = pl.x + pl.w / 2 + Math.cos(this.orbitAngle) * this.orbitRadius;
      const targetY = pl.y + pl.h / 2 + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.x = lerp(this.x, targetX, 0.3);
      this.y = lerp(this.y, targetY, 0.3);
      this.angle += this.spin * 1.5;
      // Still damage enemies while orbiting
      this._damageEnemies(game);
      if (this.orbitTimer <= 0) {
        // Burst outward
        this.orbiting = false;
        this.hitSet.clear();
        const burstSpeed = 12;
        this.vx = Math.cos(this.burstAngle) * burstSpeed;
        this.vy = Math.sin(this.burstAngle) * burstSpeed;
        this.life = 180;
        this.burstPhase = 60; // fly straight before homing
        game.effects.push(new Effect(this.x, this.y, '#bfb', 10, 4, 12));
      }
      return;
    }

    // Burst phase: fly straight, no homing, no player catch
    if (this.burstPhase > 0) {
      this.burstPhase--;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.97;
      this.vy *= 0.97;
      this.angle += this.spin;
      this.life--;
      if (this.life <= 0) { this.done = true; return; }
      this._damageEnemies(game);
      return;
    }

    // Normal homing behavior
    let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    speed *= 0.985;
    let tx, ty;
    if (this.homingEnemy) {
      // Home toward nearest enemy
      let best = null, bestDist = Infinity;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = Math.hypot((e.x + e.w / 2) - this.x, (e.y + e.h / 2) - this.y);
        if (d < bestDist) { bestDist = d; best = e; }
      }
      if (game.boss && !game.boss.dead) {
        const d = Math.hypot((game.boss.x + game.boss.w / 2) - this.x, (game.boss.y + game.boss.h / 2) - this.y);
        if (d < bestDist) { bestDist = d; best = game.boss; }
      }
      if (best) { tx = best.x + best.w / 2; ty = best.y + best.h / 2; }
      else { tx = this.x + this.vx; ty = this.y + this.vy; }
    } else {
      tx = pl.x + pl.w / 2;
      ty = pl.y + pl.h / 2;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const accel = Math.min(0.18, dist / 900);
    const ax = (dx / dist) * accel;
    const ay = (dy / dist) * accel;
    this.vx += ax;
    this.vy += ay;
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
    if (this.life <= 0) { this.done = true; return; }
    this._damageEnemies(game);
    // If player touches it, end (only for player-homing trimerangs)
    if (!this.homingEnemy && Math.hypot((pl.x + pl.w / 2) - this.x, (pl.y + pl.h / 2) - this.y) < this.radius + Math.max(pl.w, pl.h) / 2) {
      this.done = true;
      game.effects.push(new Effect(this.x, this.y, '#fff', 12, 4, 16));
    }
    if (!this._destroyEffect && this.done) {
      game.effects.push(new Effect(this.x, this.y, '#bff', 14, 4, 18));
      this._destroyEffect = true;
    }
  }
  _damageEnemies(game) {
    for (const e of game.enemies) {
      if (!e.dead && !this.hitSet.has(e) && Math.hypot((e.x + e.w / 2) - this.x, (e.y + e.h / 2) - this.y) < this.radius + Math.max(e.w, e.h) / 2) {
        e.takeDamage(game.player.type.attackDamage + game.player.bonusElemental + game.player.windPower, game, this.x, undefined, 'shuriken');
        this.hitSet.add(e);
        if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(2);
        game.effects.push(new Effect(this.x, this.y, '#bfb', 8, 3, 10));
      }
    }
    if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && Math.hypot((game.boss.x + game.boss.w / 2) - this.x, (game.boss.y + game.boss.h / 2) - this.y) < this.radius + Math.max(game.boss.w, game.boss.h) / 2) {
      game.boss.takeDamage(game.player.type.attackDamage + game.player.bonusElemental + game.player.windPower, game, this.x, undefined, 'shuriken');
      this.hitSet.add(game.boss);
      if (!game.player.ultimateReady && !game.player.ultimateActive) game.player.addUltimateCharge(3);
      game.effects.push(new Effect(this.x, this.y, '#bfb', 10, 4, 12));
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

// ── DiamondShard (Crystal Ninja special) ─────────────────────
class DiamondShard {
  constructor(x, y, owner, game) {
    this.x = x; this.y = y;
    this.owner = owner;
    this.w = 20; this.h = 20;
    this.radius = 14;
    this.done = false;
    this.life = 300;
    this.hitSet = new Set();
    // Aim at nearest enemy on spawn — fixed direction, no rotation
    this.maxSpeed = 7;
    this.speed = 0; // starts frozen, builds momentum
    let target = null;
    let minDist = Infinity;
    const pFacing = game && game.player ? game.player.facing : 1;
    if (game) {
      for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = (e.x + e.w / 2) - x;
        const dy = (e.y + e.h / 2) - y;
        // Skip enemies directly behind the ninja (within ~90° cone behind)
        if (dx * pFacing < 0 && Math.abs(dy) < Math.abs(dx)) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) { minDist = d; target = e; }
      }
      if (game.boss && !game.boss.dead) {
        const dx = (game.boss.x + game.boss.w / 2) - x;
        const dy = (game.boss.y + game.boss.h / 2) - y;
        if (!(dx * pFacing < 0 && Math.abs(dy) < Math.abs(dx))) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) { minDist = d; target = game.boss; }
        }
      }
    }
    if (target) {
      const dx = (target.x + target.w / 2) - x;
      const dy = (target.y + target.h / 2) - y;
      this.angle = Math.atan2(dy, dx) + Math.PI / 2; // point tip toward enemy
    } else {
      const facing = game && game.player ? game.player.facing : 1;
      this.angle = facing > 0 ? Math.PI / 2 + Math.PI / 2 : -Math.PI / 2 + Math.PI / 2;
    }
    this.dirX = Math.sin(this.angle); // travel direction from angle
    this.dirY = -Math.cos(this.angle);
  }
  update(game) {
    // Build momentum gradually
    if (this.speed < this.maxSpeed) {
      this.speed += 0.25;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    }
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;
    this.life--;
    if (this.life <= 0) { this.done = true; return; }
    // Deflect enemy projectiles on contact
    for (const p of game.projectiles) {
      if (p.done || p.owner === 'player' || p.owner === 'boss') continue;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.radius + 10) {
        p.vx = -p.vx;
        p.vy = -p.vy;
        p.owner = 'player';
        p.reflected = true;
        p.color = '#aff';
        game.effects.push(new Effect(p.x, p.y, '#aff', 6, 2, 8));
        SFX.reflect();
      }
    }
    // Damage enemies — disappear on impact, slow them down
    for (const e of game.enemies) {
      if (!e.dead && !this.hitSet.has(e)) {
        const dx = (e.x + e.w / 2) - this.x;
        const dy = (e.y + e.h / 2) - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < this.radius + Math.max(e.w, e.h) / 2) {
          const dmg = game.player.type.attackDamage + game.player.bonusElemental + 1;
          if (e.takeDamage(dmg, game, this.x)) {
            e.launchIceSlide(game, this.x, dmg);
          }
          game.effects.push(new Effect(this.x, this.y, '#aff', 8, 3, 10));
          triggerHitstop(3);
          this.done = true;
          return;
        }
      }
    }
    // Damage boss — disappear on impact, slow them down
    if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss)) {
      const dx = (game.boss.x + game.boss.w / 2) - this.x;
      const dy = (game.boss.y + game.boss.h / 2) - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.radius + Math.max(game.boss.w, game.boss.h) / 2) {
        const dmg = game.player.type.attackDamage + game.player.bonusElemental + 1;
        if (game.boss.takeDamage(dmg, game, this.x)) {
          game.boss.launchIceSlide(game, this.x, dmg);
        }
        game.effects.push(new Effect(this.x, this.y, '#aff', 10, 4, 12));
        triggerHitstop(3);
        this.done = true;
        return;
      }
    }
    // Done when off-screen far
    if (this.x < game.camera.x - 200 || this.x > game.camera.x + CANVAS_W + 200 ||
        this.y < game.camera.y - 200 || this.y > game.camera.y + CANVAS_H + 200) {
      this.done = true;
    }
  }
  render(ctx, cam) {
    ctx.save();
    ctx.translate(this.x - cam.x, this.y - cam.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.7 + (this.speed / this.maxSpeed) * 0.25;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.6, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius * 0.6, 0);
    ctx.closePath();
    ctx.fillStyle = '#aff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner facet
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.5);
    ctx.lineTo(this.radius * 0.25, 0);
    ctx.lineTo(0, this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.25, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
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
  _dropOrDie() { this.done = true; }
  update(game) {
    // Orbiting mode: circle the player, bypass terrain
    if (this.orbiting) {
      const pl = game.player;
      this.orbitAngle += this.orbitSpeed;
      this.x = pl.x + pl.w / 2 + Math.cos(this.orbitAngle) * this.orbitRadius - this.w / 2;
      this.y = pl.y + pl.h / 2 + Math.sin(this.orbitAngle) * this.orbitRadius - this.h / 2;
      this.life--;
      if (this.life <= 0) { this.done = true; return; }
      // Water trail particles
      if (this.life % 3 === 0) {
        game.effects.push(new Effect(
          this.x + this.w / 2 + (Math.random() - 0.5) * 6,
          this.y + this.h / 2 + (Math.random() - 0.5) * 6,
          '#48f', 3, 1.2, 8
        ));
      }
      // Hit enemies while orbiting
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {
          e.takeDamage(this.damage, game, this.x);
          if (this.soaking) {
            e.soakTimer = Math.max(e.soakTimer, 300);
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#48f', 8, 3, 12));
          }
          this.hitSet.add(e);
          if (!game.player.ultimateReady && !game.player.ultimateActive) {
            game.player.addUltimateCharge(2);
          }
        }
      }
      // Hit boss while orbiting
      if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && rectOverlap(this, game.boss)) {
        game.boss.takeDamage(this.damage, game, this.x);
        if (this.soaking) {
          game.boss.soakTimer = Math.max(game.boss.soakTimer, 300);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#48f', 10, 4, 14));
        }
        this.hitSet.add(game.boss);
        if (!game.player.ultimateReady && !game.player.ultimateActive) {
          game.player.addUltimateCharge(3);
        }
      }
      return;
    }
    if (this.bouncy) this.vy += 0.15 * (this.gravScale || 1);
    // Homing shuriken: gently steer toward nearest enemy
    if (this.homing && this.owner === 'player') {
      const target = findNearestTarget(this.x, this.y, game, 0);
      if (target) {
        const tdx = (target.x + target.w / 2) - (this.x + this.w / 2);
        const tdy = (target.y + target.h / 2) - (this.y + this.h / 2);
        const td = Math.sqrt(tdx * tdx + tdy * tdy);
        if (td > 0) {
          const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 8;
          this.vx += (tdx / td) * 0.6;
          this.vy += (tdy / td) * 0.6;
          const ns = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (ns > 0) { this.vx = (this.vx / ns) * sp; this.vy = (this.vy / ns) * sp; }
        }
      }
    }
    this.x += this.vx;
    this.y += this.vy;
    // Dropped shuriken: fall with gravity, sit on platforms, wait for pickup
    if (this.dropped) {
      this.dropLife--;
      if (this.dropLife <= 0) { this.done = true; return; }
      this.vy += GRAVITY * 0.5;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.y += this.vy;
      // Land on platforms
      for (const p of game.platforms) {
        if (p.thin && this.vy < 0) continue;
        if (this.x + this.w > p.x && this.x < p.x + p.w && this.y + this.h > p.y && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          this.vy = 0;
          break;
        }
      }
      return;
    }
    this.life--;
    if (this.life <= 0) {
      if (this.isKunai && this.owner === 'player') this._kunaiExplode(game);
      // Player shurikens drop instead of disappearing
      if (this.isShuriken && this.owner === 'player' && !this.isKunai) {
        this.dropped = true;
        this.dropLife = 300; // 5 seconds to pick up
        this.vx = 0;
        this.vy = 0;
        return;
      }
      this.done = true; return;
    }
    if (this.isFireball && this.life % 2 === 0) {
      game.effects.push(new Effect(
        this.x + this.w / 2 + (Math.random() - 0.5) * 6,
        this.y + this.h / 2 + (Math.random() - 0.5) * 6,
        Math.random() > 0.5 ? '#f80' : '#f50', 4, 1.5, 6
      ));
    }
    // Fire projectiles leave flame trails on the ground
    if (this.isFireball && this.owner === 'player' && this.life % 8 === 0) {
      const flameDmg = Math.max(1, Math.floor(this.damage / 3));
      game.flamePools.push(new FlamePool(this.x + this.w / 2 - 14, this.y + this.h / 2, flameDmg));
    }
    // Hit platforms (skip thin platforms; bouncy only collides downward)
    if (this.owner !== 'boss' || (this.bouncy && this.bouncesLeft > 0)) {
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (this.isKunai || this.noPlat) continue; // Kunai/mecha projectiles pass through platforms
        if (rectOverlap(this, p)) {
          if (this.bouncy && (this.bouncesLeft > 0 || this.life > 30)) {
            // Only bounce off the top of platforms (falling down onto them)
            if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 6) {
              this.y = p.y - this.h; this.vy = -this.vy * 0.75;
              if (this.bouncesLeft > 0) this.bouncesLeft--;
              this.life -= 25;
            }
            return;
          }
          this._dropOrDie();
          if (this.isKunai && this.owner === 'player') this._kunaiExplode(game);
          if (this.done) game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 10));
          return;
        }
      }
    }
    // bounce off level walls and floor (not ceiling)
    if (this.owner === 'boss' && this.bouncy && this.bouncesLeft > 0) {
      if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx) * 0.85; this.bouncesLeft--; }
      if (this.x + this.w > game.levelW) { this.x = game.levelW - this.w; this.vx = -Math.abs(this.vx) * 0.85; this.bouncesLeft--; }
      if (this.y + this.h > 480) { this.y = 480 - this.h; this.vy = -Math.abs(this.vy) * 0.75; this.bouncesLeft--; }
    }
    // Enemy/boss projectiles blocked by earth constructs
    if ((this.owner === 'enemy' || this.owner === 'boss') && !this.fromConstruct) {
      for (const b of game.stoneBlocks) {
        if (!b.done && rectOverlap(this, b)) {
          this.done = true;
          game.effects.push(new Effect(this.x, this.y, '#a87', 6, 2, 10));
          return;
        }
      }
    }
    if (this.owner === 'player') {
      for (const e of game.enemies) {
        if (!e.dead && !this.hitSet.has(e) && rectOverlap(this, e)) {

          // Kunai is unblockable — skip all shield/deflect checks
          if (!this.isKunai) {
            // Shielded: block projectiles within shield arc (stops even piercing, no pip loss)
            if (e.type === 'shielded' && e.shieldHp > 0 && e._shieldBlocks(this.x, undefined, game)) {
              e.shieldFlash = 6;
              e.shieldBump = 6;
              const shAng = e.shieldAngle;
              game.effects.push(new Effect(
                e.x + e.w / 2 + Math.cos(shAng) * e.w * 0.6, e.y + e.h / 2 + Math.sin(shAng) * e.w * 0.6, '#5ff', 8, 3, 10
              ));
              this._dropOrDie();
              return;
            }
            // Protector: block projectiles within shield arc (stops even piercing, no pip loss)
            if (e.type === 'protector' && e.shieldHp > 0 && e._shieldBlocks(this.x, undefined, game)) {
              e.shieldFlash = 6;
              e.shieldBump = 6;
              const shAng = e.shieldAngle;
              game.effects.push(new Effect(
                e.x + e.w / 2 + Math.cos(shAng) * e.w * 0.6, e.y + e.h / 2 + Math.sin(shAng) * e.w * 0.6, '#4f8', 8, 3, 10
              ));
              this._dropOrDie();
              return;
            }

            // Deflector: deflect projectiles back (always deflects when ready, any direction)
            if (e.type === 'deflector' && e.deflectReady && !e.freezeTimer) {
              e.deflectReady = false;
              e.deflectTimer = e.big ? 50 : 80;
              e.deflectFlash = 12;
              this.vx = -this.vx * 1.2;
              this.vy = (Math.random() - 0.5) * 2;
              this.owner = 'enemy';
              this.damage = Math.max(this.damage, 3);
              this.color = '#aaf';
              this.hitSet.clear();
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h * 0.4, '#eef', 10, 4, 12));
              SFX.hit();
              triggerHitstop(4);
              return;
            }
          }

          const _srcType = (this.isShuriken || this.isKunai) ? 'shuriken' : undefined;
          const _dmgHit = e.takeDamage(this.damage, game, this.x, undefined, _srcType);
          if (!this.fromSpecial) game.player.mana = Math.min(game.player.mana + 0.25, game.player.maxMana);
          // Kunai explosion: AoE blast on impact
          if (this.isKunai) {
            this._kunaiExplode(game, e);
          }
          // Freeze dust: freeze + ice slide on hit (skip if healed/resisted)
          if (this.freezeDust && _dmgHit) {
            e.launchIceSlide(game, this.x, this.damage);
          }
          // Soaking: apply soak on hit
          if (this.soaking) {
            e.soakTimer = Math.max(e.soakTimer, 300);
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#48f', 8, 3, 12));
          }
          // Shadow paralyse: electric stun on hit
          if (this.shadowParalyse) {
            if (e.element === 'lightning') {
              e.hp = Math.min(e.hp + 2, e.maxHp);
              game.effects.push(new TextEffect(e.x + e.w / 2, e.y - 10, '+2', '#ff0'));
            } else {
              e.paralyseTimer = Math.max(e.paralyseTimer, 45);
              e.vx = 0;
              e.vy = 0;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#ff0', 8, 3, 12));
            }
          }
          // Pushback effect (skip if ice sliding)
          if (!this.freezeDust) {
            const dx = e.x + e.w / 2 - (this.x + this.w / 2);
            const dy = e.y + e.h / 2 - (this.y + this.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const pushStrength = 6;
            e.vx += (dx / dist) * pushStrength;
            e.vy += (dy / dist) * (pushStrength * 0.3);
          }
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
          if (!this.piercing) { this._dropOrDie(); return; }
          game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 8));
        }
      }
      // Hit boss
      if (game.boss && !game.boss.dead && !this.hitSet.has(game.boss) && rectOverlap(this, game.boss)) {
        // Kunai is unblockable — skip all shield/deflect checks for bosses
        if (!this.isKunai) {
          // Shielded boss: block projectiles within shield arc (no pip loss)
          if (game.boss.bossType === 'shielded' && game.boss.shieldHp > 0 && game.boss._shieldBlocks(this.x, undefined, game)) {
            game.boss.shieldFlash = 6;
            game.boss.shieldBump = 8;
            const shAng = game.boss.shieldAngle;
            game.effects.push(new Effect(
              game.boss.x + game.boss.w / 2 + Math.cos(shAng) * game.boss.w * 0.7, game.boss.y + game.boss.h / 2 + Math.sin(shAng) * game.boss.w * 0.7, '#5ff', 8, 3, 10
            ));
            this._dropOrDie();
            return;
          }
          // Protector boss: block projectiles within shield arc (no pip loss)
          if (game.boss.bossType === 'protector' && game.boss.shieldHp > 0 && game.boss._shieldBlocks(this.x, undefined, game)) {
            game.boss.shieldFlash = 6;
            game.boss.shieldBump = 8;
            const shAng = game.boss.shieldAngle;
            game.effects.push(new Effect(
              game.boss.x + game.boss.w / 2 + Math.cos(shAng) * game.boss.w * 0.7, game.boss.y + game.boss.h / 2 + Math.sin(shAng) * game.boss.w * 0.7, '#4f8', 8, 3, 10
            ));
            this._dropOrDie();
            return;
          }
          // Deflector boss: deflect projectiles back when ready
          if (game.boss.bossType === 'deflector' && game.boss.deflectReady && !game.boss.freezeTimer) {
            game.boss.deflectReady = false;
            game.boss.deflectFlash = 12;
            this.vx = -this.vx * 1.2;
            this.vy = (Math.random() - 0.5) * 2;
            this.owner = 'enemy';
            this.damage = Math.max(this.damage, 3);
            this.color = '#aaf';
            this.hitSet.clear();
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h * 0.4, '#eef', 10, 4, 12));
            SFX.hit();
            triggerHitstop(4);
            return;
          }
        }
        const _bossSrcType = (this.isShuriken || this.isKunai) ? 'shuriken' : undefined;
        const _bossDmgHit = game.boss.takeDamage(this.damage, game, this.x, undefined, _bossSrcType);
        if (!this.fromSpecial) game.player.mana = Math.min(game.player.mana + 0.25, game.player.maxMana);
        // Kunai explosion on boss hit
        if (this.isKunai) {
          this._kunaiExplode(game);
        }
        // Freeze dust: freeze + slide boss on hit (skip if healed/resisted)
        if (this.freezeDust && _bossDmgHit) {
          game.boss.launchIceSlide(game, this.x, this.damage);
        }
        // Soaking: apply soak on boss hit
        if (this.soaking) {
          game.boss.soakTimer = Math.max(game.boss.soakTimer, 300);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#48f', 10, 4, 14));
        }
        // Shadow paralyse: electric stun boss on hit
        if (this.shadowParalyse) {
          game.boss.paralyseTimer = Math.max(game.boss.paralyseTimer, 30);
          game.boss.vx = 0;
          game.boss.vy = 0;
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 10, 4, 14));
        }
        this.hitSet.add(game.boss);
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
        // Ultimate charge gain: projectile hit boss
        if (!game.player.ultimateReady && !game.player.ultimateActive) {
          game.player.addUltimateCharge(3);
        }
        if (!this.piercing) { this._dropOrDie(); return; }
        game.effects.push(new Effect(this.x, this.y, this.color, 4, 2, 8));
      }
    } else {
      const pl = game.player;
      if (rectOverlap(this, pl.getHurtbox())) {
        const isBoss = this.owner === 'boss';
        let srcType = this.sourceType || null;
        if (!srcType && isBoss && game.boss) srcType = game.boss.bossType;
        const ki = { type: srcType || 'enemy', element: this.element || null, isBoss: isBoss };
        pl.takeDamage(this.damage, game, this.element || null, ki);
        this.done = true;
      }
    }
  }

  _kunaiExplode(game, skipEnemy) {
    if (this._kunaiExploded) return;
    this._kunaiExploded = true;
    const kx = this.x + this.w / 2, ky = this.y + this.h / 2;
    const maxShur = this.kunaiMaxShurikens || 3;
    const radius = 50 + maxShur * 10;
    const dmg = Math.round((this.kunaiDmg || this.damage) * (1 + maxShur * 0.15));
    // Massive multi-layered explosion
    game.effects.push(new Effect(kx, ky, '#fff', 12, 10, 18));
    game.effects.push(new Effect(kx, ky, '#f44', 25, 8, 25));
    game.effects.push(new Effect(kx, ky, '#fa3', 20, 6, 22));
    game.effects.push(new Effect(kx, ky, '#ff0', 15, 5, 20));
    game.effects.push(new Effect(kx, ky, '#f66', 10, 3, 30));
    // Ring of sparks
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2;
      const rx = kx + Math.cos(angle) * radius * 0.4;
      const ry = ky + Math.sin(angle) * radius * 0.4;
      game.effects.push(new Effect(rx, ry, a % 2 === 0 ? '#f80' : '#ff0', 4, 3, 14));
    }
    // Shockwave ring effect
    game.effects.push(new Effect(kx, ky, '#f88', 30, 12, 12));
    SFX.hit();
    SFX.play(80, 'sawtooth', 0.4, 0.3, 0);
    SFX.play(150, 'square', 0.2, 0.2, 0.05);
    triggerHitstop(6);
    for (const e2 of game.enemies) {
      if (!e2.dead && e2 !== skipEnemy) {
        const edx = (e2.x + e2.w / 2) - kx, edy = (e2.y + e2.h / 2) - ky;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed < radius) {
          e2.takeDamage(dmg, game, kx);
          const push = 12 * (1 - ed / radius);
          if (ed > 0) { e2.vx += (edx / ed) * push; e2.vy -= 4 * (1 - ed / radius); }
        }
      }
    }
    if (game.boss && !game.boss.dead) {
      const bdx = (game.boss.x + game.boss.w / 2) - kx, bdy = (game.boss.y + game.boss.h / 2) - ky;
      const bd = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bd < radius) game.boss.takeDamage(dmg, game, kx);
    }
  }

  render(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;

    if (this.freezeDust) {
      // Sparkly dust cloud
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#aff';
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = 6;
      for (let i = 0; i < 4; i++) {
        const ox = Math.sin(this.life * 0.3 + i * 1.5) * 4;
        const oy = Math.cos(this.life * 0.4 + i * 1.2) * 3;
        ctx.fillRect(sx + ox, sy + oy, 3, 3);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }
    if (this.isFireball) {
      ctx.save();
      const cx = sx + this.w / 2, cy = sy + this.h / 2;
      const r = this.w / 2 + 2;
      // Trailing flame tail
      const tailLen = 20;
      const dir = this.vx > 0 ? 1 : -1;
      const grad = ctx.createLinearGradient(
        cx - dir * tailLen, cy, cx + dir * 8, cy
      );
      grad.addColorStop(0, 'rgba(255,80,0,0)');
      grad.addColorStop(0.4, 'rgba(255,120,0,0.4)');
      grad.addColorStop(1, 'rgba(255,200,50,0.6)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx - dir * tailLen * 0.3, cy, tailLen, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Outer glow
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#f50';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6 + Math.sin(this.life * 1.2) * 3, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(cx, cy, r + Math.sin(this.life * 1.2) * 3, 0, Math.PI * 2);
      ctx.fill();
      // Hot center
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fe4';
      ctx.beginPath();
      ctx.arc(cx + dir * 3, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (this.piercing) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.isShuriken) {
      ctx.save();
      const scx = sx + this.w / 2, scy = sy + this.h / 2;
      ctx.translate(scx, scy);
      if (this.dropped) {
        // Dropped: blink when expiring soon, no spin, add glow
        if (this.dropLife < 60 && Math.floor(this.dropLife / 4) % 2 === 0) { ctx.restore(); return; }
        ctx.globalAlpha = Math.min(1, this.dropLife / 60);
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 6;
      } else {
        ctx.rotate(this.life * 0.4);
      }
      ctx.fillStyle = '#ccc';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-1, -5, 2, 5);
        ctx.rotate(Math.PI / 2);
      }
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
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
