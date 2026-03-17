// ── Enemy base ───────────────────────────────────────────────
class Enemy {
  constructor(x, y, type, big, wave) {
    const base = ENEMY_STATS[type];
    this.type = type;
    this.big = !!big;
    this.wave = wave || 1;
    this.w = big ? 42 : 28;
    this.h = big ? 42 : 28;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    const hpBonus = Math.floor((this.wave - 1) * 1.5);
    this.hp = (big ? base.hp * 2 : base.hp) + hpBonus;
    this.maxHp = this.hp;
    this.contactDmg = (big ? base.dmg + 2 : base.dmg) + Math.floor((this.wave - 1) * 0.5);
    this.color = base.color;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.dead = false;
    this.hitCooldown = 0;
    this.shootTimer = randInt(0, 40);
    this.jumpTimer = randInt(0, 40);
    this.patrolLeft = x - 100;
    this.patrolRight = x + 100;
    this.flashTimer = 0;
    this.damageIframes = 0;
    this.burnTimer = 0;
    this.soakTimer = 0;
    this.flying = (type === 'flyer' || type === 'flyshooter' || type === 'attacker');
    this.shieldHp = (type === 'shielded') ? (big ? 5 : 3) : 0;
    this.shieldMax = this.shieldHp;
    this.hoverPhase = Math.random() * Math.PI * 2;
    this.edgeAware = (type === 'walker' || type === 'shooter' || type === 'shielded' || type === 'bouncer' || type === 'deflector' || type === 'protector');
    this.onPlatform = null;
    this.freezeTimer = 0;
    // Deflector state
    this.deflectReady = (type === 'deflector');
    this.deflectTimer = 0;
    this.swordDrawn = (type === 'deflector');
    this.shurikenTimer = 0;
    // Deflector: miniboss size
    if (type === 'deflector') {
      this.w = big ? 52 : 40;
      this.h = big ? 52 : 40;
    }
    // Protector aura — always huge miniboss size
    this.auraRadius = (type === 'protector') ? (big ? 260 : 200) : 0;
    // Attacker state
    this.attackerInvulnerable = (type === 'attacker');
    // Protector: always huge
    if (type === 'protector') {
      this.w = big ? 64 : 52;
      this.h = big ? 64 : 52;
    }
    // Attacker: large orb, stationary
    if (type === 'attacker') {
      this.w = big ? 44 : 36;
      this.h = big ? 44 : 36;
      this.attackerAuraRadius = big ? 240 : 180;
    }
  }

  update(game) {
    if (this.dead) return;
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      this.vx = 0;
      if (!this.flying) {
        this.vy += GRAVITY;
        if (this.vy > MAX_FALL) this.vy = MAX_FALL;
        this.y += this.vy;
        for (const p of game.platforms) {
          if (!p.thin && rectOverlap(this, p)) {
            if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
              this.y = p.y - this.h;
              this.vy = 0;
            }
          }
        }
      } else {
        this.vy = 0;
      }
      if (this.damageIframes > 0) this.damageIframes--;
      if (this.flashTimer > 0) this.flashTimer--;
      return;
    }
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.damageIframes > 0) this.damageIframes--;

    // Burn DOT
    if (this.burnTimer > 0) {
      this.burnTimer--;
      if (this.burnTimer % 5 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f63', 6, 2, 10));
      }
      if (this.burnTimer % 30 === 0) {
        this.hp -= 1;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 4, 2, 8));
        if (this.hp <= 0) {
          this.dead = true;
          if (this.burnTimer > 0 || (game.player && game.player.ninjaType === 'fire')) {
            for (let i = 0; i < 5; i++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = 10 + Math.random() * 18;
              const fx = this.x + this.w / 2 + Math.cos(angle) * dist;
              const fy = this.y + this.h / 2 + Math.sin(angle) * dist;
              game.effects.push(new Effect(fx, fy, '#f93', 16, 4, 18));
            }
          }
          this.onDeath(game);
        }
      }
    }

    // Soak decay
    if (this.soakTimer > 0) this.soakTimer--;

    const speed = this.big ? 2.4 : 1.9;
    const playerStealthed = game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    const px = playerStealthed ? (this.x + this.facing * 100) : (game.player.x + game.player.w / 2);
    const py = playerStealthed ? (this.y) : (game.player.y + game.player.h / 2);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Gravity (not for flyers)
    if (!this.flying) {
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    }

    // Wind power resistance
    let windResist = 1;
    if (game.player.ninjaType === 'wind' && game.player.windPower >= 10) {
      const towardPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
      if (towardPlayer) windResist = 0.45;
    }

    switch (this.type) {
      case 'walker':
        this.vx = this.facing * speed * windResist;
        if (this.x <= this.patrolLeft) this.facing = 1;
        if (this.x >= this.patrolRight) this.facing = -1;
        break;
      case 'shooter':
        this.vx = this.facing * speed * 0.5 * windResist;
        if (this.x <= this.patrolLeft) this.facing = 1;
        if (this.x >= this.patrolRight) this.facing = -1;
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 70 : 90)) {
          this.shootTimer = 0;
          const dx = px - cx, dy = py - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 400 && d > 0) {
            game.projectiles.push(new Projectile(cx, cy, (dx / d) * 4, (dy / d) * 4, '#ff4', 2 + Math.floor((this.wave - 1) * 0.5), 'enemy'));
          }
        }
        break;
      case 'jumper':
        this.vx = this.facing * speed * 1.2 * windResist;
        if (this.x <= this.patrolLeft) this.facing = 1;
        if (this.x >= this.patrolRight) this.facing = -1;
        this.jumpTimer++;
        if (this.jumpTimer >= (this.big ? 55 : 75) && this.vy < 1) {
          this.vy = this.big ? -11 : -9;
          this.jumpTimer = 0;
        }
        break;
      case 'bouncer':
        this.vx = this.facing * speed * 0.6 * windResist;
        if (this.x <= this.patrolLeft) this.facing = 1;
        if (this.x >= this.patrolRight) this.facing = -1;
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 80 : 100)) {
          this.shootTimer = 0;
          const dx = px - cx, dy = py - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 450 && d > 0) {
            const p = new Projectile(cx, cy, (dx / d) * 3.5, (dy / d) * 3 - 2, '#f6f', 2 + Math.floor((this.wave - 1) * 0.5), 'enemy');
            p.bouncy = true;
            game.projectiles.push(p);
          }
        }
        break;
      case 'shielded': {
        this.facing = px > cx ? 1 : -1;
        // Walk toward the player, shield first
        this.vx = this.facing * speed * 0.7 * windResist;
        break;
      }
      case 'deflector': {
        // Miniboss samurai — faces player with dead zone to prevent flipping
        if (Math.abs(px - cx) > 8) this.facing = px > cx ? 1 : -1;
        const distToPlayer = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
        this.jumpTimer++;
        if (distToPlayer > 60) {
          this.vx = this.facing * speed * 0.3 * windResist;
        } else {
          this.vx *= 0.85;
        }
        // Jump toward player
        if (this.jumpTimer >= (this.big ? 90 : 120) && this.vy < 1 && distToPlayer < 250) {
          this.vy = this.big ? -10 : -8;
          this.vx = this.facing * speed * 2.5 * windResist;
          this.jumpTimer = 0;
        }
        // Always deflect when grounded (not mid-jump)
        this.deflectReady = (this.vy >= -1 && this.vy <= 1);
        // Shuriken throw
        this.shurikenTimer++;
        const shurikenRate = this.big ? 150 : 200;
        if (this.shurikenTimer >= shurikenRate && distToPlayer < 400 && distToPlayer > 40) {
          this.shurikenTimer = 0;
          const sdx = px - cx, sdy = py - cy;
          const sd = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sd > 0) {
            const baseVx = (sdx / sd) * 5, baseVy = (sdy / sd) * 5;
            const spreadAngles = [-0.2, 0, 0.2];
            for (const ang of spreadAngles) {
              const cos = Math.cos(ang), sin = Math.sin(ang);
              const svx = baseVx * cos - baseVy * sin;
              const svy = baseVx * sin + baseVy * cos;
              const sh = new Projectile(cx, cy, svx, svy, '#ccc', this.contactDmg, 'enemy');
              sh.w = 8; sh.h = 8;
              sh.isShuriken = true;
              sh.life = 120;
              game.projectiles.push(sh);
            }
          }
        }
        break;
      }
      case 'protector': {
        // Slow, tanky, walks toward player with shield held
        this.vx = this.facing * speed * 0.4 * windResist;
        if (this.x <= this.patrolLeft) this.facing = 1;
        if (this.x >= this.patrolRight) this.facing = -1;
        if (Math.abs(px - cx) < 200) this.facing = px > cx ? 1 : -1;
        break;
      }
      case 'attacker': {
        // Floating orb — seeks hover height above ground, bobs gently
        this.hoverPhase += 0.04;
        this.vx *= 0.9;
        const hoverTarget = 350;
        const hoverDist = hoverTarget - this.y;
        if (Math.abs(hoverDist) > 4) {
          this.vy += Math.sign(hoverDist) * 0.15;
          this.vy *= 0.92;
        } else {
          this.vy = Math.sin(this.hoverPhase) * 0.6;
        }
        this.facing = px > cx ? 1 : -1;
        // Count alive non-attacker enemies in aura
        const auraCx = this.x + this.w / 2;
        const auraCy = this.y + this.h / 2;
        const aR = this.attackerAuraRadius || 100;
        let nearbyAlive = 0;
        for (const other of game.enemies) {
          if (other === this || other.dead || other.type === 'attacker') continue;
          const odx = (other.x + other.w / 2) - auraCx;
          const ody = (other.y + other.h / 2) - auraCy;
          if (Math.sqrt(odx * odx + ody * ody) <= aR) nearbyAlive++;
        }
        this.attackerInvulnerable = nearbyAlive > 0;
        // Shoot fast piercing projectiles when invulnerable (enemies nearby)
        if (this.attackerInvulnerable) {
          this.shootTimer++;
          const shootRate = this.big ? 25 : 35;
          if (this.shootTimer >= shootRate) {
            this.shootTimer = 0;
            const sdx = px - auraCx, sdy = py - auraCy;
            const sd = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sd > 0 && sd < 500) {
              const p = new Projectile(auraCx, auraCy, (sdx / sd) * 7, (sdy / sd) * 7, '#f44', this.contactDmg, 'enemy');
              p.piercing = true;
              p.w = 6; p.h = 6;
              p.life = 90;
              game.projectiles.push(p);
              game.effects.push(new Effect(auraCx, auraCy, '#f66', 6, 2, 8));
            }
          }
        }
        break;
      }
      case 'flyer': {
        this.hoverPhase += 0.03;
        const fdx = px - cx, fdy = py - cy;
        const fd = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fd > 50) {
          let flyResist = windResist;
          if (!(game.player.ninjaType === 'wind' && game.player.windPower >= 10 && ((fdx > 0 && px > cx) || (fdx < 0 && px < cx)))) flyResist = 1;
          this.vx = (fdx / fd) * speed * 1.6 * flyResist;
          this.vy = (fdy / fd) * speed * 1.6 * flyResist + Math.sin(this.hoverPhase) * 0.5;
        } else {
          this.vx *= 0.92; this.vy = Math.sin(this.hoverPhase) * 1.5;
        }
        this.facing = fdx > 0 ? 1 : -1;
        break;
      }
      case 'flyshooter': {
        this.hoverPhase += 0.025;
        const sdx = px - cx, sdy = (py - 80) - cy;
        const sd = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sd > 40) {
          let flyResist = windResist;
          if (!(game.player.ninjaType === 'wind' && game.player.windPower >= 10 && ((sdx > 0 && px > cx) || (sdx < 0 && px < cx)))) flyResist = 1;
          this.vx = (sdx / sd) * speed * 1.2 * flyResist;
          this.vy = (sdy / sd) * speed * 1.2 * flyResist + Math.sin(this.hoverPhase) * 0.4;
        } else {
          this.vx *= 0.92; this.vy = Math.sin(this.hoverPhase) * 1;
        }
        this.facing = sdx > 0 ? 1 : -1;
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 60 : 80)) {
          this.shootTimer = 0;
          const adx = px - cx, ady = py - cy;
          const ad = Math.sqrt(adx * adx + ady * ady);
          if (ad < 500 && ad > 0) {
            game.projectiles.push(new Projectile(cx, cy, (adx / ad) * 4, (ady / ad) * 4, '#fa4', 2 + Math.floor((this.wave - 1) * 0.5), 'enemy'));
          }
        }
        break;
      }
    }

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision (ground enemies only)
    if (!this.flying) {
      this.onPlatform = null;
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (rectOverlap(this, p)) {
          if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.onPlatform = p;
          }
        }
      }
      if (this.edgeAware && this.onPlatform && this.onPlatform.w >= 80) {
        const p = this.onPlatform;
        if (this.type === 'shielded') {
          // Stop at edges but keep facing player
          if (this.x + this.w / 2 < p.x + 8) { this.x = p.x + 8 - this.w / 2; this.vx = Math.max(0, this.vx); }
          if (this.x + this.w / 2 > p.x + p.w - 8) { this.x = p.x + p.w - 8 - this.w / 2; this.vx = Math.min(0, this.vx); }
        } else {
          if (this.x + this.w / 2 < p.x + 8) this.facing = 1;
          if (this.x + this.w / 2 > p.x + p.w - 8) this.facing = -1;
        }
      }
    } else {
      if (this.y < -50) this.y = -50;
      if (this.y > 460) this.y = 460;
    }

    // Keep in level bounds
    if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); this.facing = 1; }
    if (this.x + this.w > game.levelW) { this.x = game.levelW - this.w; this.vx = -Math.abs(this.vx); this.facing = -1; }

    // Fell off bottom
    if (this.y > 700) {
      if (game.levelType === 'tower') {
        // Tower: falling into spikes kills enemy
        this.hp = 0;
        this.dead = true;
        game.effects.push(new Effect(this.x + this.w / 2, 500, '#f44', 10, 4, 12));
        return;
      }
      this.y = -40; this.vy = 0; this.x = Math.max(40, Math.min(game.levelW - 60, this.x)); return;
    }

    // Contact damage
    if (this.hitCooldown <= 0 && this.type !== 'attacker' && rectOverlap(this, game.player) && !this.slamming) {
      const kbDir = Math.sign(game.player.x + game.player.w / 2 - (this.x + this.w / 2)) || 1;
      const kbStr = this.big ? 9 : 5;
      game.player.vx = kbDir * kbStr;
      game.player.vy = this.big ? -5 : -4;
      game.player.takeDamage(this.contactDmg, game);
      this.hitCooldown = 30;
    }
  }

  takeDamage(amount, game, fromX) {
    if (this.dead) return;
    if (this.damageIframes > 0) return;
    // Attacker: invulnerable while enemies are in its aura
    if (this.type === 'attacker' && this.attackerInvulnerable) {
      this.flashTimer = 4;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f88', 5, 2, 6));
      return;
    }
    // Protector aura: non-protector enemies near a protector can't be damaged
    if (this.type !== 'protector' && this.type !== 'attacker' && game) {
      for (const other of game.enemies) {
        if (other.dead || other.type !== 'protector' || other === this) continue;
        const dx = (this.x + this.w / 2) - (other.x + other.w / 2);
        const dy = (this.y + this.h / 2) - (other.y + other.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) <= other.auraRadius) {
          this.flashTimer = 4;
          game.effects.push(new Effect(this.x + this.w / 2, this.y - 4, '#4f8', 5, 2, 6));
          return;
        }
      }
    }
    // Shielded: frontal hits absorbed by shield
    if (this.shieldHp > 0 && fromX !== undefined) {
      const hitFromFront = (fromX > this.x + this.w / 2) === (this.facing === 1);
      if (hitFromFront) {
        this.shieldHp -= amount;
        this.flashTimer = 4;
        game.effects.push(new Effect(
          this.x + (this.facing > 0 ? this.w : 0), this.y + this.h / 2, '#5ff', 5, 2, 8
        ));
        if (this.shieldHp < 0) this.shieldHp = 0;
        return;
      }
    }
    this.hp -= amount;
    this.flashTimer = 6;
    this.damageIframes = 15;
    const kbBase = { walker: 5, shooter: 6, jumper: 4, bouncer: 3, shielded: 2, deflector: 3, protector: 1, attacker: 8, flyer: 7, flyshooter: 7 };
    let kb = (kbBase[this.type] || 4) * (this.big ? 0.5 : 1);
    const dir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : this.facing * -1;
    this.vx = dir * kb;
    if (!this.flying) this.vy = -2;
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath(game);
    }
  }

  onDeath(game) {
    game.waveKills++;
    game.totalKills++;
    // Track deflector kill for earth construct unlock
    if (this.type === 'deflector') game.player.defeatedDeflector = true;
    SFX.enemyDie();
    triggerHitstop(this.big ? 7 : 5);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, this.color, this.big ? 18 : 12, 4, 18));
    // Crystal shatter: scatter diamond shards on kill
    if (game.player.ninjaType === 'crystal') {
      if (!game.diamondShards) game.diamondShards = [];
      const frozen = this.freezeTimer > 0;
      const count = frozen ? (this.big ? 4 : 2) : (this.big ? 2 : 1);
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      for (let i = 0; i < count; i++) {
        const shard = new DiamondShard(cx, cy, 'player', game);
        // Override with random scatter direction
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        shard.angle = a + Math.PI / 2;
        shard.dirX = Math.cos(a);
        shard.dirY = Math.sin(a);
        shard.speed = 2;
        shard.maxSpeed = 6;
        game.diamondShards.push(shard);
      }
      game.effects.push(new Effect(cx, cy, '#aff', 14, 5, 15));
    }
    // Drop orb
    const r = Math.random();
    if (r < 0.35) {
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'heal'));
    } else if (r < 0.48) {
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'maxhp'));
    } else if (r < 0.58) {
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'damage'));
    } else if (r < 0.66) {
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'shield'));
    } else if (r < 0.78) {
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'shuriken'));
    }
  }

  render(ctx, cam, game) {
    // Wind trail afterimage effect
    if (this.windTrails && this.windTrails.length && this.facingPlayer) {
      for (let i = 0; i < this.windTrails.length; ++i) {
        const t = this.windTrails[i];
        ctx.save();
        const alpha = 0.13 * (t.life / 22);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#bff';
        ctx.beginPath();
        ctx.ellipse(t.x - cam.x, t.y - cam.y, t.w * 0.7, t.h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this.windTrails = this.windTrails.filter(t => { t.life--; return t.life > 0; });
    }
    if (this.dead) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    if (this.damageIframes > 0 && Math.floor(this.damageIframes / 3) % 2) return;

    // Main body
    if (this.type === 'attacker') {
      // Orb body
      const orbCx = sx + this.w / 2;
      const orbCy = sy + this.h / 2;
      const orbR = this.w / 2;
      // Outer glow
      ctx.globalAlpha = this.attackerInvulnerable ? (0.4 + 0.15 * Math.sin((game ? game.tick : 0) * 0.08)) : 0.2;
      ctx.fillStyle = '#f44';
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Core
      ctx.fillStyle = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : (this.attackerInvulnerable ? '#c22' : '#644'));
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR, 0, Math.PI * 2);
      ctx.fill();
      // Inner eye
      ctx.fillStyle = this.attackerInvulnerable ? '#f88' : '#866';
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : this.color);
      ctx.fillRect(sx, sy, this.w, this.h);
    }

    // Freeze effect overlay
    if (this.freezeTimer > 0) {
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.freezeTimer * 0.2);
      ctx.fillStyle = '#aaf';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    // Burn effect overlay
    if (this.burnTimer > 0) {
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.burnTimer * 0.3);
      ctx.fillStyle = '#f93';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    // Soak effect overlay
    if (this.soakTimer > 0) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.soakTimer * 0.15);
      ctx.fillStyle = '#48f';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
      // Drip particles
      if (Math.random() < 0.15) {
        game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#48f', 3, 1, 8));
      }
    }

    // Big border
    if (this.big) {
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, this.w - 2, this.h - 2);
    }

    // Eyes
    const eo = this.big ? 6 : 4;
    const es = this.big ? 7 : 5;
    ctx.fillStyle = '#fff';
    const eyeX = this.facing > 0 ? sx + this.w - eo - es : sx + eo;
    ctx.fillRect(eyeX, sy + eo + 2, es, es);
    ctx.fillStyle = '#200';
    const ps = this.big ? 4 : 3;
    ctx.fillRect(this.facing > 0 ? eyeX + es - ps : eyeX, sy + eo + 4, ps, ps);

    // Type accents
    switch (this.type) {
      case 'shooter':
        ctx.fillStyle = '#ff4';
        ctx.fillRect(this.facing > 0 ? sx + this.w : sx - 6, sy + this.h / 2 - 2, 6, 4);
        break;
      case 'jumper':
        ctx.fillStyle = '#ff0';
        ctx.fillRect(sx + 4, sy + this.h - 3, 6, 5);
        ctx.fillRect(sx + this.w - 10, sy + this.h - 3, 6, 5);
        break;
      case 'bouncer':
        ctx.fillStyle = '#f6f';
        ctx.fillRect(sx + 2, sy, this.w - 4, 3);
        ctx.fillRect(this.facing > 0 ? sx + this.w : sx - 8, sy + this.h / 2 - 3, 8, 6);
        break;
      case 'shielded':
        if (this.shieldHp > 0) {
          ctx.fillStyle = `rgba(100,220,255,${0.4 + 0.2 * (this.shieldHp / this.shieldMax)})`;
          ctx.fillRect(this.facing > 0 ? sx + this.w - 3 : sx, sy - 2, 5, this.h + 4);
        }
        ctx.fillStyle = '#5a8';
        ctx.fillRect(sx + 2, sy, this.w - 4, 3);
        break;
      case 'deflector': {
        // Kasa (farmer hat) — bigger than player's
        ctx.fillStyle = '#aac';
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy + 3);
        ctx.lineTo(sx + this.w / 2, sy - 20);
        ctx.lineTo(sx + this.w + 10, sy + 3);
        ctx.closePath();
        ctx.fill();
        // Brim
        ctx.fillStyle = '#889';
        ctx.fillRect(sx - 10, sy, this.w + 20, 4);

        // Headband
        ctx.fillStyle = '#aac';
        ctx.fillRect(sx + 2, sy + 4, this.w - 4, 3);

        // Belt / sash
        ctx.fillStyle = '#aac';
        ctx.fillRect(sx + 2, sy + this.h - 12, this.w - 4, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(sx + 2, sy + this.h - 11, this.w - 4, 1);

        // Katana held in front, angled upward
        const bLen = this.big ? 48 : 38;
        ctx.save();
        const gripX = this.facing > 0 ? sx + this.w - 2 : sx + 2;
        const gripY = sy + this.h * 0.45;
        ctx.translate(gripX, gripY);
        ctx.rotate(this.facing > 0 ? -Math.PI * 0.35 : (-Math.PI + Math.PI * 0.35));
        // Blade
        ctx.fillStyle = this.deflectReady ? '#dde' : '#889';
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(6 + bLen, -0.8);
        ctx.lineTo(6 + bLen + 5, 0);
        ctx.lineTo(6 + bLen, 0.8);
        ctx.lineTo(6, 2);
        ctx.closePath();
        ctx.fill();
        // Edge highlight
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(8, -1.5);
        ctx.lineTo(6 + bLen + 3, 0);
        ctx.stroke();
        // Tsuba (guard)
        ctx.fillStyle = '#aa8';
        ctx.fillRect(3, -5, 4, 10);
        // Handle
        ctx.fillStyle = '#aac';
        ctx.fillRect(-6, -2.5, 10, 5);
        ctx.fillStyle = '#222';
        for (let i = 0; i < 3; i++) ctx.fillRect(-5 + i * 3, -2.5, 1, 5);
        ctx.restore();

        // Ready indicator — glow when can deflect
        if (this.deflectReady) {
          ctx.globalAlpha = 0.3 + 0.15 * Math.sin(game ? game.tick * 0.1 : 0);
          ctx.fillStyle = '#aaf';
          ctx.beginPath();
          ctx.arc(gripX, gripY - bLen * 0.25, bLen * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'flyer':
        ctx.fillStyle = '#bdb';
        ctx.fillRect(sx - 5, sy + 4, 5, this.h - 8);
        ctx.fillRect(sx + this.w, sy + 4, 5, this.h - 8);
        break;
      case 'flyshooter':
        ctx.fillStyle = '#dba';
        ctx.fillRect(sx - 5, sy + 4, 5, this.h - 8);
        ctx.fillRect(sx + this.w, sy + 4, 5, this.h - 8);
        ctx.fillStyle = '#fa4';
        ctx.fillRect(this.facing > 0 ? sx + this.w : sx - 6, sy + this.h / 2 - 2, 6, 4);
        break;
      case 'protector': {
        // --- Armored Knight ---
        // Helmet with visor
        ctx.fillStyle = '#5a7';
        ctx.fillRect(sx - 2, sy - 6, this.w + 4, 10);
        // Visor slit
        ctx.fillStyle = '#1a3';
        ctx.fillRect(sx + 4, sy - 3, this.w - 8, 3);
        // Glowing eyes behind visor
        const eyePulse = 0.7 + 0.3 * Math.sin((game ? game.tick : 0) * 0.1);
        ctx.save();
        ctx.shadowColor = '#4f8';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(100,255,150,${eyePulse})`;
        ctx.fillRect(sx + 8, sy - 3, 5, 3);
        ctx.fillRect(sx + this.w - 13, sy - 3, 5, 3);
        // Bright pupil centers
        ctx.fillStyle = `rgba(200,255,220,${eyePulse})`;
        ctx.fillRect(sx + 9, sy - 2, 3, 1);
        ctx.fillRect(sx + this.w - 12, sy - 2, 3, 1);
        ctx.shadowBlur = 0;
        ctx.restore();
        // Helmet crest/plume
        ctx.fillStyle = '#3d8';
        ctx.fillRect(sx + this.w / 2 - 2, sy - 12, 4, 8);
        ctx.fillRect(sx + this.w / 2 - 4, sy - 12, 8, 3);

        // Shoulder pauldrons
        ctx.fillStyle = '#4a7';
        ctx.fillRect(sx - 6, sy + 4, 8, 10);
        ctx.fillRect(sx + this.w - 2, sy + 4, 8, 10);
        // Pauldron rivets
        ctx.fillStyle = '#8d8';
        ctx.fillRect(sx - 4, sy + 6, 2, 2);
        ctx.fillRect(sx + this.w, sy + 6, 2, 2);

        // Chest plate (over body)
        ctx.fillStyle = '#4a7';
        ctx.fillRect(sx + 2, sy + 4, this.w - 4, this.h - 14);
        // Chest plate highlight
        ctx.fillStyle = '#6c9';
        ctx.fillRect(sx + 3, sy + 5, this.w - 6, 3);
        // Center line
        ctx.fillStyle = '#3a6';
        ctx.fillRect(sx + this.w / 2 - 1, sy + 8, 2, this.h - 22);

        // Belt / waist
        ctx.fillStyle = '#2a5';
        ctx.fillRect(sx, sy + this.h - 14, this.w, 4);
        // Belt buckle
        ctx.fillStyle = '#8d8';
        ctx.fillRect(sx + this.w / 2 - 3, sy + this.h - 14, 6, 4);

        // Greaves (leg armor)
        ctx.fillStyle = '#4a7';
        ctx.fillRect(sx + 2, sy + this.h - 10, this.w / 2 - 3, 10);
        ctx.fillRect(sx + this.w / 2 + 1, sy + this.h - 10, this.w / 2 - 3, 10);
        // Knee guards
        ctx.fillStyle = '#6c9';
        ctx.fillRect(sx + 3, sy + this.h - 10, this.w / 2 - 5, 2);
        ctx.fillRect(sx + this.w / 2 + 2, sy + this.h - 10, this.w / 2 - 5, 2);

        // Large tower shield in facing direction
        const shX = this.facing > 0 ? sx + this.w - 2 : sx - 7;
        ctx.fillStyle = '#3b7';
        ctx.fillRect(shX, sy - 6, 9, this.h + 12);
        // Shield border
        ctx.strokeStyle = '#2a5';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(shX + 0.5, sy - 5.5, 8, this.h + 11);
        // Shield emblem (cross)
        ctx.fillStyle = '#8d8';
        ctx.fillRect(shX + 3, sy + 2, 3, this.h - 2);
        ctx.fillRect(shX + 1, sy + this.h / 2 - 3, 7, 3);
        // Shield rivets
        ctx.fillStyle = '#5a7';
        ctx.fillRect(shX + 1, sy - 2, 2, 2);
        ctx.fillRect(shX + 6, sy - 2, 2, 2);
        ctx.fillRect(shX + 1, sy + this.h + 2, 2, 2);
        ctx.fillRect(shX + 6, sy + this.h + 2, 2, 2);

        // Aura circle
        if (this.auraRadius > 0) {
          ctx.save();
          ctx.globalAlpha = 0.08 + 0.04 * Math.sin((game ? game.tick : 0) * 0.04);
          ctx.strokeStyle = '#4f8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx + this.w / 2, sy + this.h / 2, this.auraRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.03;
          ctx.fillStyle = '#4f8';
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'attacker': {
        // Aura circle (red/negative)
        const aR = this.attackerAuraRadius || 100;
        ctx.save();
        ctx.globalAlpha = this.attackerInvulnerable ? (0.1 + 0.05 * Math.sin((game ? game.tick : 0) * 0.06)) : 0.04;
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, sy + this.h / 2, aR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.4;
        ctx.fillStyle = '#f44';
        ctx.fill();
        ctx.restore();
        break;
      }
    }

    // Melee sword
    if (this.hitCooldown > 20 && this.type !== 'shooter' && this.type !== 'flyshooter' && this.type !== 'attacker') {
      const sl = this.big ? 16 : 12;
      const sw = this.big ? 4 : 3;
      const swordX = this.facing > 0 ? sx + this.w : sx - sl;
      const swordY = sy + this.h / 2 - sw / 2;
      ctx.fillStyle = '#ccd';
      ctx.fillRect(swordX, swordY, sl, sw);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.facing > 0 ? sx + this.w - 2 : sx, swordY - 2, 3, sw + 4);
    }

    // HP bar
    if (this.hp < this.maxHp) {
      ctx.fillStyle = '#400';
      ctx.fillRect(sx, sy - 8, this.w, 4);
      ctx.fillStyle = '#f44';
      ctx.fillRect(sx, sy - 8, this.w * (this.hp / this.maxHp), 4);
    }

    // Shield pips
    if (this.type === 'shielded' && this.shieldMax > 0) {
      for (let i = 0; i < this.shieldMax; i++) {
        ctx.fillStyle = i < this.shieldHp ? '#5ff' : '#234';
        ctx.fillRect(sx + i * 7 + 2, sy - 14, 5, 3);
      }
    }

    // Protector aura protection indicator — small shield above protected enemies
    if (this.type !== 'protector' && this.type !== 'attacker' && game) {
      for (const other of game.enemies) {
        if (other.dead || other.type !== 'protector' || other === this) continue;
        const dx = (this.x + this.w / 2) - (other.x + other.w / 2);
        const dy = (this.y + this.h / 2) - (other.y + other.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) <= other.auraRadius) {
          // Small green shield icon above head
          const iconX = sx + this.w / 2 - 4;
          const iconY = sy - (this.hp < this.maxHp ? 18 : 12);
          ctx.fillStyle = '#4f8';
          ctx.fillRect(iconX, iconY, 8, 6);
          ctx.fillRect(iconX + 1, iconY + 6, 6, 2);
          ctx.fillRect(iconX + 2, iconY + 8, 4, 1);
          break;
        }
      }
    }
  }
}

// ── Boss (extends Enemy) ─────────────────────────────────────
class Boss extends Enemy {
  constructor(x, y, bossType, wave) {
    // Call Enemy constructor with boss type, not big, and wave
    super(x, y, bossType, false, wave);
    this.bossType = bossType;
    // Override dimensions — boss is bigger than any regular enemy
    this.w = 56; this.h = 56;
    // Override HP — boss has its own scaling
    this.hp = 25 + wave * 15;
    this.maxHp = this.hp;
    // Override contact damage
    this.contactDmg = 4 + Math.floor((wave - 1) * 0.5);
    // Boss-specific state
    this.phase = 1;
    this.actionTimer = 0;
    this.state = 'chase';
    this.stateTimer = 0;
    this.grounded = false;
    this.hoverPhase = 0;
    this.shieldHp = (bossType === 'shielded') ? 6 : 0;
    this.shieldMax = this.shieldHp;
    this.stuckTimer = 0;
    this.phaseThrough = 0;
    this.lastX = x;
    this.lastY = y;
    const colors = {
      walker: '#c33', shooter: '#cc5', jumper: '#c8c',
      bouncer: '#c5c', shielded: '#5cc', flyer: '#8c5', flyshooter: '#c85'
    };
    this.color = colors[bossType] || '#c33';
    this.name = (BOSS_NAMES[bossType] || 'BIG') + ' BOSS';
    // Boss shouldn't use patrol/edge logic
    this.edgeAware = false;
  }

  update(game) {
    if (this.dead) return;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.damageIframes > 0) this.damageIframes--;
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      this.vx = 0;
      if (!this.flying) {
        this.vy += GRAVITY;
        if (this.vy > MAX_FALL) this.vy = MAX_FALL;
        this.y += this.vy;
        for (const p of game.platforms) {
          if (rectOverlap(this, p)) {
            if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
              this.y = p.y - this.h;
              this.vy = 0;
            }
          }
        }
      } else {
        this.vy = 0;
      }
      if (this.damageIframes > 0) this.damageIframes--;
      if (this.flashTimer > 0) this.flashTimer--;
      return;
    }
    this.phase = this.hp <= this.maxHp / 2 ? 2 : 1;
    const speed = (this.phase === 2 ? 3.2 : 2.2) + this.wave * 0.25;

    if (this.flying) {
      this.hoverPhase += 0.03;
    } else {
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    }

    // Burn DOT (reuse parent pattern)
    if (this.burnTimer > 0) {
      this.burnTimer--;
      if (this.burnTimer % 5 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f63', 6, 2, 10));
      }
      if (this.burnTimer % 30 === 0) {
        this.hp -= 1;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 4, 2, 8));
        if (this.hp <= 0) { this.dead = true; this.onDeath(game); }
      }
    }

    // Soak decay
    if (this.soakTimer > 0) this.soakTimer--;

    const px = game.player.x + game.player.w / 2;
    const py = game.player.y + game.player.h / 2;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    this.facing = dx > 0 ? 1 : -1;
    this.stateTimer++;
    this.actionTimer++;

    const canShoot = (this.bossType === 'shooter' || this.bossType === 'bouncer' || this.bossType === 'flyshooter');
    const isJumpy = (this.bossType === 'jumper');

    if (this.flying) {
      // Flying boss AI
      switch (this.state) {
        case 'chase': {
          const tdx = dx, tdy = (py - (this.bossType === 'flyshooter' ? 90 : 30)) - cy;
          const td = Math.sqrt(tdx * tdx + tdy * tdy);
          if (td > 30) {
            this.vx = (tdx / td) * speed;
            this.vy = (tdy / td) * speed + Math.sin(this.hoverPhase) * 0.5;
          } else {
            this.vx *= 0.9; this.vy = Math.sin(this.hoverPhase) * 1.5;
          }
          if (this.actionTimer > 100) {
            this.state = canShoot ? 'shoot' : 'swoop';
            this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
        }
        case 'swoop':
          if (this.stateTimer === 1) { this.vx = this.facing * 8; this.vy = 5; }
          if (this.stateTimer > 30) {
            this.vy = -3;
            if (this.stateTimer > 45) {
              this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
            }
          }
          break;
        case 'shoot':
          this.vx *= 0.9; this.vy = Math.sin(this.hoverPhase) * 1;
          if (this.stateTimer === 15 || this.stateTimer === 30 || (this.phase === 2 && this.stateTimer === 45)) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) {
              const p = new Projectile(cx, cy, (dx / d) * 5, (dy / d) * 5, '#f44', 3 + Math.floor((this.wave - 1) * 0.5), 'boss');
              if (this.bossType === 'bouncer') p.bouncy = true;
              game.projectiles.push(p);
            }
          }
          if (this.stateTimer > 60) {
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
      }
      if (this.y < -80) this.y = -80;
      if (this.y > 440) this.y = 440;
    } else {
      // Ground boss AI
      switch (this.state) {
        case 'chase':
          this.vx = this.facing * speed;
          if (this.actionTimer > (isJumpy ? 60 : 110) && this.grounded) {
            const r = Math.random();
            if (canShoot && r < 0.4) this.state = 'shoot';
            else this.state = 'jump';
            this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
        case 'jump':
          if (this.stateTimer === 1) {
            this.vy = isJumpy ? -14 : -12;
            this.vx = this.facing * (isJumpy ? 7 : 5);
          }
          if (this.stateTimer > 10 && this.grounded) {
            game.effects.push(new Effect(cx, this.y + this.h, '#f84', 15, 5, 15));
            if (Math.abs(dx) < 80 && Math.abs(dy) < 60) {
              const kbDir = Math.sign(game.player.x - cx) || 1;
              game.player.vx = kbDir * 10;
              game.player.vy = -5;
              game.player.takeDamage(4 + Math.floor((this.wave - 1) * 0.5), game);
            }
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
        case 'shoot':
          this.vx = 0;
          if (this.stateTimer === 15 || this.stateTimer === 35 || (this.phase === 2 && this.stateTimer === 50)) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) {
              const p = new Projectile(cx, cy, (dx / d) * 5, (dy / d) * 5, '#f44', 3 + Math.floor((this.wave - 1) * 0.5), 'boss');
              if (this.bossType === 'bouncer') p.bouncy = true;
              game.projectiles.push(p);
            }
          }
          if (this.stateTimer > 65) {
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
      }
    }

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Stuck detection
    if (this.phaseThrough > 0) this.phaseThrough--;
    if (!this.flying) {
      const movedX = Math.abs(this.x - this.lastX);
      const movedY = Math.abs(this.y - this.lastY);
      if (movedX < 1 && movedY < 1 && this.state === 'chase') {
        this.stuckTimer++;
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - 2);
      }
      if (this.stuckTimer > 120) {
        this.phaseThrough = 60;
        this.stuckTimer = 0;
      }
      this.lastX = this.x;
      this.lastY = this.y;
    }

    // Platform collision (ground bosses)
    if (!this.flying) {
      this.grounded = false;
      for (const p of game.platforms) {
        if (rectOverlap(this, p)) {
          if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.grounded = true;
          } else if (this.phaseThrough > 0) {
            // Skip side/ceiling collisions to unstick
          }
        }
      }
    }

    // Keep boss in level bounds
    if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); this.facing = 1; }
    if (this.x + this.w > game.levelW) { this.x = game.levelW - this.w; this.vx = -Math.abs(this.vx); this.facing = -1; }
    if (this.y > 700) { this.y = -40; this.vy = 0; }

    // Contact damage
    if (this.hitCooldown <= 0 && rectOverlap(this, game.player)) {
      const kbDir = Math.sign(game.player.x + game.player.w / 2 - (this.x + this.w / 2)) || 1;
      game.player.vx = kbDir * 10;
      game.player.vy = -5;
      game.player.takeDamage(this.contactDmg, game);
      this.hitCooldown = 45;
    }
  }

  takeDamage(amount, game, fromX) {
    if (this.dead) return;
    if (this.damageIframes > 0) return;
    // Shield check
    if (this.shieldHp > 0 && fromX !== undefined) {
      const hitFromFront = (fromX > this.x + this.w / 2) === (this.facing === 1);
      if (hitFromFront) {
        this.shieldHp -= amount;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + (this.facing > 0 ? this.w : 0), this.y + this.h / 2, '#5ff', 6, 3, 10));
        if (this.shieldHp < 0) this.shieldHp = 0;
        return;
      }
    }
    this.hp -= amount;
    this.flashTimer = 8;
    this.damageIframes = 12;
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f88', 6, 3, 10));
    // Boss knockback (slight — bosses are heavy)
    const bDir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : this.facing * -1;
    this.vx += bDir * 2;
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath(game);
    }
  }

  onDeath(game) {
    SFX.bossDie();
    triggerHitstop(10);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 30, 6, 30));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 20, 5, 25));
    // Boss death does NOT count as a waveKill or drop orbs
  }

  render(ctx, cam, game) {
    if (this.dead) return;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // Aura
    ctx.fillStyle = this.phase === 2 ? 'rgba(255,50,50,0.25)' : 'rgba(200,50,50,0.12)';
    ctx.fillRect(sx - 6, sy - 6, this.w + 12, this.h + 12);

    // Body
    ctx.fillStyle = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : (this.phase === 2 ? '#d11' : this.color));
    ctx.fillRect(sx, sy, this.w, this.h);

    // Freeze effect overlay
    if (this.freezeTimer > 0) {
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.freezeTimer * 0.2);
      ctx.fillStyle = '#aaf';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    // Soak effect overlay
    if (this.soakTimer > 0) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.soakTimer * 0.15);
      ctx.fillStyle = '#48f';
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    // Flying wings
    if (this.flying) {
      ctx.fillStyle = this.color;
      ctx.fillRect(sx - 8, sy + 6, 8, this.h - 12);
      ctx.fillRect(sx + this.w, sy + 6, 8, this.h - 12);
    }

    // Shield
    if (this.shieldHp > 0) {
      ctx.fillStyle = `rgba(100,220,255,${0.5 + 0.2 * (this.shieldHp / this.shieldMax)})`;
      ctx.fillRect(this.facing > 0 ? sx + this.w - 4 : sx, sy - 4, 6, this.h + 8);
    }

    // Eyes
    ctx.fillStyle = '#ff0';
    const eyeX = this.facing > 0 ? sx + 28 : sx + 6;
    ctx.fillRect(eyeX, sy + 14, 8, 8);
    ctx.fillRect(eyeX + 14, sy + 14, 8, 8);
    ctx.fillStyle = '#200';
    ctx.fillRect(eyeX + 2, sy + 17, 4, 4);
    ctx.fillRect(eyeX + 16, sy + 17, 4, 4);

    // Crown / horns
    ctx.fillStyle = '#ff0';
    ctx.fillRect(sx + 8, sy - 6, 6, 8);
    ctx.fillRect(sx + this.w - 14, sy - 6, 6, 8);
    ctx.fillRect(sx + this.w / 2 - 3, sy - 10, 6, 12);

    if (this.phase === 2) {
      ctx.fillStyle = '#f44';
      ctx.font = '10px monospace';
      ctx.fillText('ENRAGED!', sx + this.w / 2 - 28, sy - 14);
    }

    // Crystal ninja: melee warning "!"
    if (game && game.player && game.player.ninjaType === 'crystal') {
      const dx = (this.x + this.w / 2) - (game.player.x + game.player.w / 2);
      const dy = (this.y + this.h / 2) - (game.player.y + game.player.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100 && this.hitCooldown <= 0) {
        const pulse = Math.sin(game.tick * 0.3) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('!', sx + this.w / 2 - 5, sy - 18);
        ctx.globalAlpha = 1;
      }
    }

    // Boss melee sword
    if (this.hitCooldown > 30) {
      const sl = 24;
      const sw = 5;
      const swordX = this.facing > 0 ? sx + this.w : sx - sl;
      const swordY = sy + this.h / 2 - sw / 2;
      ctx.fillStyle = '#dde';
      ctx.fillRect(swordX, swordY, sl, sw);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.facing > 0 ? sx + this.w - 3 : sx, swordY - 3, 4, sw + 6);
    }
  }
}
