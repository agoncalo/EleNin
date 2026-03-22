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
    this.hp = (big ? base.hp * 4 : base.hp) * this.wave;
    this.maxHp = this.hp;
    this.displayHp = this.hp;
    // Balanced damage: normal enemies ~10 hits to kill, big ~5, per-type variation
    const _ehp = [0,16,24,34,46,60,73,89,107,127,148][Math.min(this.wave, 10)] || 148;
    const _arm = [0,1,2,4,6,8,10,13,15,18,21][Math.min(this.wave, 10)] || 21;
    const _hitsN = {walker:12,shooter:12,jumper:10,bouncer:10,shielded:10,deflector:7,protector:12,attacker:6,flyer:8,flyshooter:8};
    const _hitsB = {walker:6,shooter:6,jumper:5,bouncer:5,shielded:5,deflector:4,protector:6,attacker:3,flyer:4,flyshooter:4};
    const _hits = big ? (_hitsB[type] || 5) : (_hitsN[type] || 10);
    this.contactDmg = Math.max(1, Math.round(_ehp / _hits + _arm));
    this.color = base.color;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.dead = false;
    this.contactTick = 0;
    this.shootTimer = randInt(0, 40);
    this.jumpTimer = randInt(0, 40);
    this.patrolLeft = x - 100;
    this.patrolRight = x + 100;
    this.flashTimer = 0;
    this.damageIframes = 0;
    this._slideDmgCd = 0;
    this._contactDmgCd = 0;
    this.resistTimer = 0;
    this.burnTimer = 0;
    this.soakTimer = 0;
    this.flying = (type === 'flyer' || type === 'flyshooter' || type === 'attacker');
    this.shieldHp = (type === 'shielded') ? (big ? 5 : 3) : (type === 'protector') ? (big ? 10 : 8) : 0;
    this.shieldMax = this.shieldHp;
    this.shieldBump = 0;
    this.shieldFlash = 0;
    this.shieldAngle = (type === 'shielded' || type === 'protector') ? (Math.random() < 0.5 ? 0 : Math.PI) : 0;
    // Shield charge state
    this.chargeState = 'idle';
    this.chargeTimer = 0;
    this.chargeStartX = x;
    this.chargeCooldown = 0;
    this.chargeTrails = [];
    this.hoverPhase = Math.random() * Math.PI * 2;
    // Per-instance preferred range offset so ranged enemies spread out
    this.rangeOffset = (type === 'shooter' || type === 'bouncer') ? Math.floor(Math.random() * 80) - 40 : 0;
    this.edgeAware = (type === 'walker' || type === 'shooter' || type === 'shielded' || type === 'bouncer' || type === 'deflector' || type === 'protector');
    this.onPlatform = null;
    this.freezeTimer = 0;
    this.iceSliding = false;
    this.iceSlideDmg = 0;
    this.spawnTimer = 15;
    this.floatTimer = 0;
    this.paralyseTimer = 0;
    this.purpleParalyseTimer = 0;
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
    this.deflectFlash = 0;
    // Flyer dash state
    this.flyerDashState = 'idle';
    this.flyerDashTimer = 0;
    this.flyerDashCooldown = 0;
    this._dashVx = 0;
    this._dashVy = 0;
    this.knockbackTimer = 0;
    this.stunTimer = 0;
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
    // Elemental variant
    this.element = null;
    this.elementColors = null;
    this.baseColor = this.color; // preserve original type color
    this.juggleState = false;
  }

  update(game) {
    if (this.dead) return;
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    if (this.grounded) this.juggleState = false;
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      // Ice sliding: frozen enemy was hit, slides and hits others
      // Frozen contact damage: 10% of this enemy's max HP, min 1
      const frozenDmg = Math.max(1, Math.round(this.maxHp * 0.1));
      if (this.iceSliding) {
        this.vx *= 0.96;
        if (Math.abs(this.vx) < 0.3) { this.iceSliding = false; this.vx = 0; }
        this.x += this.vx;
        // Gravity + vertical collision (but NO edge awareness — they fall off)
        if (!this.flying) {
          this.vy += GRAVITY;
          if (this.vy > MAX_FALL) this.vy = MAX_FALL;
          this.y += this.vy;
          for (const p of game.platforms) {
            if (p.thin) continue;
            if (rectOverlap(this, p)) {
              if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
                this.y = p.y - this.h;
                this.vy = 0;
              }
            }
          }
        }
        // Hit other enemies while sliding
        const slideCX = this.x + this.w / 2;
        for (const other of game.enemies) {
          if (other === this || other.dead || other._slideDmgCd > 0) continue;
          if (rectOverlap(this, other)) {
            other.takeDamage(frozenDmg, game, slideCX);
            other._slideDmgCd = 10;
            other.vx = Math.sign(this.vx) * 6;
            other.vy = -3;
            // If the other is also frozen, launch it too
            if (other.freezeTimer > 0 && !other.iceSliding) {
              other.iceSliding = true;
              other.vx = Math.sign(this.vx) * 8;
            }
            game.effects.push(new Effect(other.x + other.w / 2, other.y + other.h / 2, '#aff', 8, 3, 12));
            SFX.hit();
          }
        }
        // Hit boss while sliding
        if (game.boss && !game.boss.dead && game.boss !== this && rectOverlap(this, game.boss)) {
          game.boss.takeDamage(frozenDmg, game, slideCX);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aff', 10, 3, 14));
          this.vx *= -0.5; // bounce back off boss
        }
        // Ice trail particles
        if (Math.random() < 0.4) {
          game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#cef', 3, 1, 8));
        }
      } else {
        // Stationary frozen: still deal contact damage to overlapping enemies
        for (const other of game.enemies) {
          if (other === this || other.dead || other._slideDmgCd > 0 || other.freezeTimer > 0) continue;
          if (rectOverlap(this, other)) {
            other.takeDamage(frozenDmg, game, this.x + this.w / 2);
            other._slideDmgCd = 10;
            const kbDir = Math.sign(other.x + other.w / 2 - (this.x + this.w / 2)) || 1;
            other.vx = kbDir * 4;
            other.vy = -2;
            game.effects.push(new Effect(other.x + other.w / 2, other.y + other.h / 2, '#aff', 6, 2, 10));
          }
        }
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
      }
      if (this.damageIframes > 0) this.damageIframes--;
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this.contactTick > 0) this.contactTick--;
      if (this.flashTimer > 0) this.flashTimer--;
      if (this.shieldFlash > 0) this.shieldFlash--;
      if (this.paralyseTimer > 0) this.paralyseTimer--;
      if (this.purpleParalyseTimer > 0) this.purpleParalyseTimer--;
      return;
    } else {
      this.iceSliding = false;
    }
    if (this.paralyseTimer > 0) {
      this.paralyseTimer--;
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
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this.flashTimer > 0) this.flashTimer--;
      // Electric sparks
      if (Math.random() < 0.5) {
        const sx = this.x + Math.random() * this.w;
        const sy = this.y + Math.random() * this.h;
        game.effects.push(new Effect(sx, sy, Math.random() < 0.5 ? '#ff0' : '#fff', 2, 1.5, 8));
      }
      // Paralysis DOT — 15% maxHp every 30 ticks
      if (this.paralyseTimer % 30 === 0) {
        const pdmg = Math.max(1, Math.round(this.maxHp * 0.15));
        this.hp -= pdmg;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 4, 2, 8));
        if (this.hp <= 0) { this.dead = true; this.onDeath(game); }
      }
      return;
    }
    // Purple paralysis (shadow ultimate) — affects ALL enemies including lightning
    if (this.purpleParalyseTimer > 0) {
      this.purpleParalyseTimer--;
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
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this.flashTimer > 0) this.flashTimer--;
      // Purple electric sparks
      if (Math.random() < 0.5) {
        const sx = this.x + Math.random() * this.w;
        const sy = this.y + Math.random() * this.h;
        game.effects.push(new Effect(sx, sy, Math.random() < 0.5 ? '#a040ff' : '#d0a0ff', 2, 1.5, 8));
      }
      return;
    }
    if (this.contactTick > 0) this.contactTick--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.shieldFlash > 0) this.shieldFlash--;
    if (this.damageIframes > 0) this.damageIframes--;
    if (this._slideDmgCd > 0) this._slideDmgCd--;
    if (this._contactDmgCd > 0) this._contactDmgCd--;
    if (this.resistTimer > 0) this.resistTimer--;
    if (this.shieldBump > 0) this.shieldBump--;
    // Slow shield angle tracking
    if (this.shieldHp > 0) {
      const target = this._shieldAngle(game);
      let diff = target - this.shieldAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.shieldAngle += diff * 0.06;
    }

    // Burn DOT
    if (this.burnTimer > 0) {
      // Water: immune to burn; Fire: burn heals instead
      if (this.element === 'water') { this.burnTimer = 0; }
      else if (this.element === 'fire') {
        this.burnTimer = 0;
        const healAmt = Math.min(2, this.maxHp - this.hp);
        if (healAmt > 0) { this.hp += healAmt; game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f4', 4, 2, 8)); }
      }
      else {
      this.burnTimer--;
      if (this.burnTimer % 5 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f63', 6, 2, 10));
      }
      if (this.burnTimer % 30 === 0) {
        const bdmg = Math.max(1, Math.round(this.maxHp * 0.01));
        this.hp -= bdmg;
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
    }

    // Soak decay
    if (this.soakTimer > 0) this.soakTimer--;

    const speed = this.big ? 2.4 : 1.9;
    const playerStealthed = game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    const px = playerStealthed ? (this.x + this.facing * 100) : (game.player.x + game.player.w / 2);
    const py = playerStealthed ? (this.y) : (game.player.y + game.player.h / 2);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Gravity (not for flyers, not for floating)
    if (this.floatTimer > 0) {
      this.floatTimer--;
      this.vy -= 0.15; // gentle upward drift
      if (this.vy < -3) this.vy = -3;
    } else if (!this.flying) {
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    }

    // Wind power resistance
    let windResist = 1;
    if (game.player.ninjaType === 'wind' && game.player.windPower >= 10) {
      const towardPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
      if (towardPlayer) windResist = 0.45;
    }

    if (this.stunTimer > 0) { this.stunTimer--; this.vx *= 0.9; }
    else switch (this.type) {
      case 'walker':
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        this.vx = this.facing * speed * windResist;
        if (this.vy >= 0 && this.vy < 1) {
          if (this.x <= this.patrolLeft) this.facing = 1;
          if (this.x >= this.patrolRight) this.facing = -1;
        }
        // Lunge at player if facing them and close
        if (this.vy >= 0 && this.vy < 1 && !playerStealthed) {
          const wDist = Math.abs(px - cx);
          const facingPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
          if (facingPlayer && wDist < 80 && Math.abs(py - cy) < 40) {
            this.vy = -8;
            this.vx = this.facing * speed * 2.5;
          }
        }
        break;
      case 'shooter': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        const sDist = Math.abs(px - cx);
        if (this.vy >= 0 && this.vy < 1) this.facing = px > cx ? 1 : -1;
        const sRetreat = 160 + this.rangeOffset;
        const sComfort = 250 + this.rangeOffset;
        const sBuf = 20;
        if (!this._rangeState) this._rangeState = 'comfort';
        if (this._rangeState === 'comfort') {
          if (sDist < sRetreat - sBuf) this._rangeState = 'retreat';
          else if (sDist > sComfort + sBuf) this._rangeState = 'approach';
        } else if (this._rangeState === 'retreat') {
          if (sDist > sRetreat + sBuf) this._rangeState = 'comfort';
        } else {
          if (sDist < sComfort - sBuf) this._rangeState = 'comfort';
        }
        if (this._rangeState === 'retreat') {
          this.vx = -this.facing * speed * 0.9 * windResist;
        } else if (this._rangeState === 'comfort') {
          const tick = game ? game.tick : 0;
          this.vx = Math.sin((tick + this.rangeOffset * 10) * 0.04) * speed * 0.3 * windResist;
        } else {
          this.vx = this.facing * speed * 0.5 * windResist;
        }
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 70 : 90)) {
          this.shootTimer = 0;
          const dx = px - cx, dy = py - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 400 && d > 0) {
            const p = new Projectile(cx, cy, (dx / d) * 4, (dy / d) * 4, this.element ? this.elementColors.accent : '#ff4', this.contactDmg, 'enemy');
            if (this.element) p.element = this.element;
            game.projectiles.push(p);
          }
        }
        break;
      }
      case 'jumper':
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        this.vx = this.facing * speed * 1.2 * windResist;
        if (this.vy >= 0 && this.vy < 1) {
          if (this.x <= this.patrolLeft) this.facing = 1;
          if (this.x >= this.patrolRight) this.facing = -1;
        }
        this.jumpTimer++;
        if (this.jumpTimer >= (this.big ? 55 : 75) && this.vy < 1) {
          this.vy = this.big ? -11 : -9;
          this.jumpTimer = 0;
        }
        break;
      case 'bouncer': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        const bDist = Math.abs(px - cx);
        if (this.vy >= 0 && this.vy < 1) this.facing = px > cx ? 1 : -1;
        const bRetreat = 180 + this.rangeOffset;
        const bComfort = 280 + this.rangeOffset;
        const bBuf = 20;
        if (!this._rangeState) this._rangeState = 'comfort';
        if (this._rangeState === 'comfort') {
          if (bDist < bRetreat - bBuf) this._rangeState = 'retreat';
          else if (bDist > bComfort + bBuf) this._rangeState = 'approach';
        } else if (this._rangeState === 'retreat') {
          if (bDist > bRetreat + bBuf) this._rangeState = 'comfort';
        } else {
          if (bDist < bComfort - bBuf) this._rangeState = 'comfort';
        }
        if (this._rangeState === 'retreat') {
          this.vx = -this.facing * speed * 0.85 * windResist;
        } else if (this._rangeState === 'comfort') {
          const tick = game ? game.tick : 0;
          this.vx = Math.sin((tick + this.rangeOffset * 10) * 0.04) * speed * 0.3 * windResist;
        } else {
          this.vx = this.facing * speed * 0.6 * windResist;
        }
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 60 : 80)) {
          this.shootTimer = 0;
          const d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
          if (d < 500 && d > 0) {
            // High-angle mortar aimed at player with spread
            const dx = px - cx;
            const dy = py - cy;
            const spread = (Math.random() - 0.5) * 1.2;
            const lobSpd = (5.5 + Math.random() * 1.5) * 0.65;
            const aimAngle = Math.atan2(dy, Math.abs(dx));
            // Bias upward: use an angle between aimed and -70°
            const highAngle = Math.min(aimAngle, -Math.PI * 0.25) - Math.PI * 0.1;
            const dir = dx > 0 ? 1 : -1;
            const shots = this.big ? 2 : 1;
            for (let si = 0; si < shots; si++) {
              const sSpread = (spread + si * dir * 0.8) * 0.65;
              const p = new Projectile(cx + dir * 6, cy - 4, dir * Math.cos(highAngle) * lobSpd + sSpread, Math.sin(highAngle) * (lobSpd + si * 0.5 * 0.65), this.element ? this.elementColors.accent : '#f6f', this.contactDmg, 'enemy');
              p.bouncy = true;
              p.gravScale = 0.42;
              if (this.element) p.element = this.element;
              game.projectiles.push(p);
            }
          }
        }
        break;
      }
      case 'shielded': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        if (this.shieldHp > 0) {
          // Shield charge behavior
          if (this.vy >= 0 && this.vy < 1) this.facing = px > cx ? 1 : -1;
          if (this.chargeCooldown > 0) this.chargeCooldown--;
          const shDist = Math.abs(px - cx);
          if (this.chargeState === 'prepare') {
            this.vx = Math.sin(this.chargeTimer * 1.5) * 2;
            this.chargeTimer++;
            if (this.chargeTimer >= 25) {
              this.chargeState = 'charging';
              this.chargeTimer = 0;
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#5ff', 8, 4, 12));
            }
          } else if (this.chargeState === 'charging') {
            this.vx = this._chargeVx * windResist;
            this.vy = this._chargeVy;
            this.chargeTimer++;
            if (this.chargeTimer >= 18) {
              this.chargeState = 'sliding';
              this.chargeTimer = 0;
              this.chargeCooldown = 140;
            }
          } else if (this.chargeState === 'sliding') {
            this.vx *= 0.88;
            this.chargeTimer++;
            if (this.chargeTimer >= 20 || Math.abs(this.vx) < 0.5) {
              this.chargeState = 'stunned';
              this.chargeTimer = 0;
              this.vx = 0;
            }
          } else if (this.chargeState === 'stunned') {
            this.vx = 0;
            this.chargeTimer++;
            if (this.chargeTimer >= 180) {
              this.chargeState = 'idle';
              this.chargeCooldown = 140;
            }
          } else if (this.chargeState === 'recoil') {
            const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
            this.vx = backDir * speed * 2.5;
            this.chargeTimer++;
            if (this.chargeTimer >= 15 || Math.abs(this.x - this.chargeStartX) < 10) {
              this.chargeState = 'idle';
              this.chargeCooldown = 140;
              this.vx = 0;
            }
          } else {
            // idle — walk toward player
            if (this.vy >= 0 && this.vy < 1) this.vx = this.facing * speed * 0.5 * windResist;
            if (shDist < 120 && Math.abs(py - cy) < 60 && this.chargeCooldown <= 0 && this.vy >= 0 && this.vy < 1 && !playerStealthed) {
              this.chargeState = 'prepare';
              this.chargeTimer = 0;
              this.chargeStartX = this.x;
              const cdx = px - cx, cdy = py - cy;
              const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
              this._chargeVx = (cdx / cd) * speed * 5;
              this._chargeVy = (cdy / cd) * speed * 5;
              this.vx = 0;
            }
          }
        } else {
          // Shield broken — behave like walker
          if (this.vy >= 0 && this.vy < 1) this.vx = this.facing * speed * windResist;
          if (this.vy >= 0 && this.vy < 1) {
            if (this.x <= this.patrolLeft) this.facing = 1;
            if (this.x >= this.patrolRight) this.facing = -1;
          }
          if (this.vy >= 0 && this.vy < 1 && !playerStealthed) {
            const wDist = Math.abs(px - cx);
            const facingPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
            if (facingPlayer && wDist < 80 && Math.abs(py - cy) < 40) {
              this.vy = -8;
              this.vx = this.facing * speed * 2.5;
            }
          }
        }
        break;
      }
      case 'deflector': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        // A Friend's Letter: deflector becomes friendly
        if (game.player.items.friendsLetter) {
          this.friendly = true;
          // Face nearest non-friendly enemy
          let nearDist = Infinity, nearE = null;
          for (const other of game.enemies) {
            if (other === this || other.dead || other.friendly) continue;
            const od = Math.sqrt((other.x + other.w / 2 - cx) ** 2 + (other.y + other.h / 2 - cy) ** 2);
            if (od < nearDist) { nearDist = od; nearE = other; }
          }
          if (nearE) {
            const tx = nearE.x + nearE.w / 2;
            this.facing = tx > cx ? 1 : -1;
            if (nearDist > 40) this.vx = this.facing * speed * 0.4 * windResist;
            else this.vx *= 0.85;
            this.jumpTimer++;
            if (this.jumpTimer >= (this.big ? 90 : 120) && this.vy < 1 && nearDist < 250) {
              this.vy = this.big ? -10 : -8;
              this.vx = this.facing * speed * 2.5 * windResist;
              this.jumpTimer = 0;
            }
            // Attack nearby enemies
            if (nearDist < 50) {
              nearE.takeDamage(this.contactDmg, game, cx);
              nearE._contactDmgCd = Math.max(nearE._contactDmgCd, 20);
            }
          } else {
            this.vx *= 0.9;
          }
          this.deflectReady = (this.vy >= -1 && this.vy <= 1);
          break;
        }
        // Miniboss samurai — faces player with dead zone to prevent flipping
        if (this.vy >= 0 && this.vy < 1 && Math.abs(px - cx) > 8) this.facing = px > cx ? 1 : -1;
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
              const sh = new Projectile(cx, cy, svx, svy, this.element ? this.elementColors.accent : '#ccc', this.contactDmg, 'enemy');
              sh.w = 8; sh.h = 8;
              sh.isShuriken = true;
              sh.life = 120;
              if (this.element) sh.element = this.element;
              game.projectiles.push(sh);
            }
          }
        }
        break;
      }
      case 'protector': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        if (this.shieldHp > 0) {
          // Shield charge behavior (slower, tankier)
          if (this.vy >= 0 && this.vy < 1 && Math.abs(px - cx) < 200) this.facing = px > cx ? 1 : -1;
          else if (this.vy >= 0 && this.vy < 1) {
            if (this.x <= this.patrolLeft) this.facing = 1;
            if (this.x >= this.patrolRight) this.facing = -1;
          }
          if (this.chargeCooldown > 0) this.chargeCooldown--;
          const pDist = Math.abs(px - cx);
          if (this.chargeState === 'prepare') {
            this.vx = Math.sin(this.chargeTimer * 1.5) * 2;
            this.chargeTimer++;
            if (this.chargeTimer >= 35) {
              this.chargeState = 'charging';
              this.chargeTimer = 0;
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f8', 8, 4, 12));
            }
          } else if (this.chargeState === 'charging') {
            this.vx = this._chargeVx * windResist;
            this.vy = this._chargeVy;
            this.chargeTimer++;
            if (this.chargeTimer >= 20) {
              this.chargeState = 'sliding';
              this.chargeTimer = 0;
              this.chargeCooldown = 160;
            }
          } else if (this.chargeState === 'sliding') {
            this.vx *= 0.88;
            this.chargeTimer++;
            if (this.chargeTimer >= 20 || Math.abs(this.vx) < 0.5) {
              this.chargeState = 'stunned';
              this.chargeTimer = 0;
              this.vx = 0;
            }
          } else if (this.chargeState === 'stunned') {
            this.vx = 0;
            this.chargeTimer++;
            if (this.chargeTimer >= 180) {
              this.chargeState = 'idle';
              this.chargeCooldown = 160;
            }
          } else if (this.chargeState === 'recoil') {
            const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
            this.vx = backDir * speed * 2;
            this.chargeTimer++;
            if (this.chargeTimer >= 18 || Math.abs(this.x - this.chargeStartX) < 10) {
              this.chargeState = 'idle';
              this.chargeCooldown = 160;
              this.vx = 0;
            }
          } else {
            // idle — walk slowly toward player
            if (this.vy >= 0 && this.vy < 1) this.vx = this.facing * speed * 0.4 * windResist;
            if (pDist < 140 && Math.abs(py - cy) < 60 && this.chargeCooldown <= 0 && this.vy >= 0 && this.vy < 1 && !playerStealthed) {
              this.chargeState = 'prepare';
              this.chargeTimer = 0;
              this.chargeStartX = this.x;
              const cdx = px - cx, cdy = py - cy;
              const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
              this._chargeVx = (cdx / cd) * speed * 4.5;
              this._chargeVy = (cdy / cd) * speed * 4.5;
              this.vx = 0;
            }
          }
        } else {
          // Shield broken — behave like walker
          if (this.vy >= 0 && this.vy < 1) this.vx = this.facing * speed * windResist;
          if (this.vy >= 0 && this.vy < 1) {
            if (this.x <= this.patrolLeft) this.facing = 1;
            if (this.x >= this.patrolRight) this.facing = -1;
          }
          if (this.vy >= 0 && this.vy < 1 && !playerStealthed) {
            const wDist = Math.abs(px - cx);
            const facingPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
            if (facingPlayer && wDist < 80 && Math.abs(py - cy) < 40) {
              this.vy = -8;
              this.vx = this.facing * speed * 2.5;
            }
          }
        }
        break;
      }
      case 'attacker': {
        // Floating orb — seeks hover height above ground, bobs gently
        this.hoverPhase += 0.04;
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; this.vy *= 0.92; break; }
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
              const p = new Projectile(auraCx, auraCy, (sdx / sd) * 7, (sdy / sd) * 7, this.element ? this.elementColors.accent : '#f44', this.contactDmg, 'enemy');
              p.piercing = true;
              p.w = 6; p.h = 6;
              p.life = 90;
              if (this.element) p.element = this.element;
              game.projectiles.push(p);
              game.effects.push(new Effect(auraCx, auraCy, '#f66', 6, 2, 8));
            }
          }
        }
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
              const p = new Projectile(auraCx, auraCy, (sdx / sd) * 7, (sdy / sd) * 7, this.element ? this.elementColors.accent : '#f44', this.contactDmg, 'enemy');
              p.piercing = true;
              p.w = 6; p.h = 6;
              p.life = 90;
              if (this.element) p.element = this.element;
              game.projectiles.push(p);
              game.effects.push(new Effect(auraCx, auraCy, '#f66', 6, 2, 8));
            }
          }
        }
        // Defensive projectile dodge dash
        if (this.flyerDashCooldown > 0) this.flyerDashCooldown--;
        if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0) {
          for (const proj of game.projectiles) {
            if (proj.owner === 'enemy' || proj.owner === 'boss' || proj.done) continue;
            const pdx = proj.x - cx, pdy = proj.y - cy;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist > 120) continue;
            const dot = pdx * proj.vx + pdy * proj.vy;
            if (dot < 0) {
              const pLen = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) || 1;
              const perpX = -proj.vy / pLen, perpY = proj.vx / pLen;
              const side = (perpX * (px - cx) + perpY * (py - cy)) > 0 ? 1 : -1;
              this.flyerDashState = 'dashing';
              this.flyerDashTimer = 0;
              this._dashVx = perpX * side * speed * 5;
              this._dashVy = perpY * side * speed * 5;
              game.effects.push(new Effect(cx, cy, '#f88', 6, 3, 10));
              break;
            }
          }
        }
        if (this.flyerDashState === 'dashing') {
          this.vx = this._dashVx;
          this.vy = this._dashVy;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 10) {
            this.flyerDashState = 'recovering';
            this.flyerDashTimer = 0;
          }
        } else if (this.flyerDashState === 'recovering') {
          this.vx *= 0.85;
          this.vy *= 0.85;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 12) {
            this.flyerDashState = 'idle';
            this.flyerDashCooldown = this.big ? 500 : 300;
          }
        }
        break;
      }
      case 'flyer': {
        this.hoverPhase += 0.03;
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; this.vy *= 0.92; break; }
        const fdx = px - cx, fdy = py - cy;
        const fd = Math.sqrt(fdx * fdx + fdy * fdy);
        this.facing = fdx > 0 ? 1 : -1;
        if (this.flyerDashCooldown > 0) this.flyerDashCooldown--;

        // Projectile dodge detection
        if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0) {
          for (const p of game.projectiles) {
            if (p.owner === 'enemy' || p.owner === 'boss' || p.done) continue;
            const pdx = p.x - cx, pdy = p.y - cy;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist > 120) continue;
            // Check if projectile is heading toward us
            const dot = pdx * p.vx + pdy * p.vy;
            if (dot < 0) {
              // Dodge perpendicular to projectile direction
              const pLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
              const perpX = -p.vy / pLen, perpY = p.vx / pLen;
              const side = (perpX * fdx + perpY * fdy) > 0 ? 1 : -1;
              this.flyerDashState = 'dashing';
              this.flyerDashTimer = 0;
              this._dashDefensive = true;
              this._dashVx = perpX * side * speed * 3.5;
              this._dashVy = perpY * side * speed * 3.5;
              game.effects.push(new Effect(cx, cy, '#bfb', 6, 3, 10));
              break;
            }
          }
        }

        // Aggressive dash toward player
        if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0 && fd < 200 && fd > 40) {
          this.flyerDashState = 'prepare';
          this.flyerDashTimer = 0;
          this._dashDefensive = false;
          const cdx = px - cx, cdy = py - cy;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
          this._dashVx = (cdx / cd) * speed * 5;
          this._dashVy = (cdy / cd) * speed * 5;
        }

        if (this.flyerDashState === 'prepare') {
          this.vx *= 0.7; this.vy *= 0.7;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 25) {
            this.flyerDashState = 'dashing';
            this.flyerDashTimer = 0;
            game.effects.push(new Effect(cx, cy, '#bfb', 8, 4, 12));
          }
        } else if (this.flyerDashState === 'dashing') {
          this.vx = this._dashVx;
          this.vy = this._dashVy;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= (this._dashDefensive ? 8 : 12)) {
            this.flyerDashState = 'recovering';
            this.flyerDashTimer = 0;
          }
        } else if (this.flyerDashState === 'recovering') {
          this.vx *= 0.85;
          this.vy *= 0.85;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 15) {
            this.flyerDashState = 'idle';
            this.flyerDashCooldown = this.big ? 500 : 300;
          }
        } else {
          // Normal flyer movement
          if (fd > 50) {
            let flyResist = windResist;
            if (!(game.player.ninjaType === 'wind' && game.player.windPower >= 10 && ((fdx > 0 && px > cx) || (fdx < 0 && px < cx)))) flyResist = 1;
            this.vx = (fdx / fd) * speed * 1.6 * flyResist;
            this.vy = (fdy / fd) * speed * 1.6 * flyResist + Math.sin(this.hoverPhase) * 0.5;
          } else {
            this.vx *= 0.92; this.vy = Math.sin(this.hoverPhase) * 1.5;
          }
        }
        break;
      }
      case 'flyshooter': {
        this.hoverPhase += 0.025;
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; this.vy *= 0.92; break; }
        const sdx = px - cx, sdy = (py - 80) - cy;
        const sd = Math.sqrt(sdx * sdx + sdy * sdy);
        this.facing = sdx > 0 ? 1 : -1;
        if (this.flyerDashCooldown > 0) this.flyerDashCooldown--;

        // Projectile dodge
        if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0) {
          for (const p of game.projectiles) {
            if (p.owner === 'enemy' || p.owner === 'boss' || p.done) continue;
            const pdx = p.x - cx, pdy = p.y - cy;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDist > 120) continue;
            const dot = pdx * p.vx + pdy * p.vy;
            if (dot < 0) {
              const pLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
              const perpX = -p.vy / pLen, perpY = p.vx / pLen;
              const side = (perpX * sdx + perpY * sdy) > 0 ? 1 : -1;
              this.flyerDashState = 'dashing';
              this.flyerDashTimer = 0;
              this._dashDefensive = true;
              this._dashVx = perpX * side * speed * 3.5;
              this._dashVy = perpY * side * speed * 3.5;
              game.effects.push(new Effect(cx, cy, '#db8', 6, 3, 10));
              break;
            }
          }
        }

        if (this.flyerDashState === 'dashing') {
          this.vx = this._dashVx;
          this.vy = this._dashVy;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 7) {
            this.flyerDashState = 'recovering';
            this.flyerDashTimer = 0;
          }
        } else if (this.flyerDashState === 'recovering') {
          this.vx *= 0.85;
          this.vy *= 0.85;
          this.flyerDashTimer++;
          if (this.flyerDashTimer >= 12) {
            this.flyerDashState = 'idle';
            this.flyerDashCooldown = this.big ? 50 : 70;
          }
        } else {
          // Normal flyshooter movement
          if (sd > 40) {
            let flyResist = windResist;
            if (!(game.player.ninjaType === 'wind' && game.player.windPower >= 10 && ((sdx > 0 && px > cx) || (sdx < 0 && px < cx)))) flyResist = 1;
            this.vx = (sdx / sd) * speed * 1.2 * flyResist;
            this.vy = (sdy / sd) * speed * 1.2 * flyResist + Math.sin(this.hoverPhase) * 0.4;
          } else {
            this.vx *= 0.92; this.vy = Math.sin(this.hoverPhase) * 1;
          }
        }
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 60 : 80)) {
          this.shootTimer = 0;
          const adx = px - cx, ady = py - cy;
          const ad = Math.sqrt(adx * adx + ady * ady);
          if (ad < 500 && ad > 0) {
            const p = new Projectile(cx, cy, (adx / ad) * 4, (ady / ad) * 4, this.element ? this.elementColors.accent : '#fa4', this.contactDmg, 'enemy');
            if (this.element) p.element = this.element;
            game.projectiles.push(p);
          }
        }
        break;
      }
    }

    // Charge dash trails
    if ((this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging') {
      this.chargeTrails.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 12 });
    }
    if (this.type === 'flyer' && this.flyerDashState === 'dashing') {
      this.chargeTrails.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 10 });
    }
    if ((this.type === 'flyshooter' || this.type === 'attacker') && this.flyerDashState === 'dashing') {
      this.chargeTrails.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 10 });
    }
    if (this.chargeTrails.length) this.chargeTrails = this.chargeTrails.filter(t => --t.life > 0);

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision (ground enemies only)
    const isChargeDashing = (this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging';
    if (!this.flying) {
      this.onPlatform = null;
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (isChargeDashing && p.y < 460) continue;
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
        const isRanged = (this.type === 'shooter' || this.type === 'bouncer');
        const retreating = isRanged && Math.sign(this.vx) !== this.facing && Math.abs(this.vx) > 0.1;
        if (this.type === 'shielded' || this.type === 'protector') {
          const atLeftEdge = this.x + this.w / 2 < p.x + 8;
          const atRightEdge = this.x + this.w / 2 > p.x + p.w - 8;
          if ((atLeftEdge && this.vx < 0) || (atRightEdge && this.vx > 0)) {
            if (this.shieldHp > 0) {
              // Shield up: stop at edge, cancel charge if needed
              if (this.chargeState === 'charging') {
                this.chargeState = 'recoil';
                this.chargeTimer = 0;
              }
              this.vx = 0;
              if (atLeftEdge) this.x = p.x + 8 - this.w / 2;
              if (atRightEdge) this.x = p.x + p.w - 8 - this.w / 2;
            } else {
              // Shield broken — stop at edge, turn around
              this.vx = 0;
              this.facing = -this.facing;
            }
          }
        } else if (isRanged) {
          // Ranged: always face player; stop at forward edge, jump off backward edge when retreating (bouncer only)
          const atLeftEdge = this.x + this.w / 2 < p.x + 10;
          const atRightEdge = this.x + this.w / 2 > p.x + p.w - 10;
          if ((atLeftEdge && this.vx < 0) || (atRightEdge && this.vx > 0)) {
            if (retreating && this.type === 'bouncer' && this.vy >= 0 && this.vy < 1) {
              // Bouncer: jump backward off ledge
              this.vy = -7;
              this.vx = -this.facing * speed * 1.5;
            } else {
              // Stop and clamp position at edge
              this.vx = 0;
              if (atLeftEdge) this.x = p.x + 10 - this.w / 2;
              if (atRightEdge) this.x = p.x + p.w - 10 - this.w / 2;
            }
          }
        } else if (this.type === 'walker') {
          // Walkers: jump off ledge toward player instead of turning
          const atLeftEdge = this.x + this.w / 2 < p.x + 8;
          const atRightEdge = this.x + this.w / 2 > p.x + p.w - 8;
          const facingPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
          if ((atLeftEdge && this.vx < 0) || (atRightEdge && this.vx > 0)) {
            if (!playerStealthed && facingPlayer && this.vy >= 0 && this.vy < 1) {
              this.vy = -8;
              this.vx = this.facing * speed * 2.5;
            } else {
              this.facing = -this.facing;
            }
          }
        } else {
          if (this.x + this.w / 2 < p.x + 8) this.facing = 1;
          if (this.x + this.w / 2 > p.x + p.w - 8) this.facing = -1;
        }
      }
    } else {
      if (this.y < -50) this.y = -50;
      if (this.y > 460) this.y = 460;
    }

    // Stone block collision — enemies inside a block can't move
    for (const b of game.stoneBlocks) {
      if (b.done || !b.isCollidable()) continue;
      if (rectOverlap(this, b)) {
        this.vx = 0;
        if (!this.flying) {
          if (this.vy > 0 && this.y + this.h - this.vy <= b.y + 4) {
            this.y = b.y - this.h;
            this.vy = 0;
          }
        }
      }
    }

    // Keep in level bounds
    if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); this.facing = 1; }
    if (this.x + this.w > game.levelW) { this.x = game.levelW - this.w; this.vx = -Math.abs(this.vx); this.facing = -1; }

    // Fell off bottom — respawn at top
    if (this.y > 700) {
      this.y = -40; this.vy = 0; this.x = Math.max(40, Math.min(game.levelW - 60, this.x)); return;
    }

    // Contact damage
    if (this.contactTick <= 0 && this.type !== 'attacker' && !this.friendly && rectOverlap(this, game.player.getHurtbox()) && !this.slamming && !game.player.slamming) {
      const kbDir = Math.sign(game.player.x + game.player.w / 2 - (this.x + this.w / 2)) || 1;
      const isCharging = (this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging';
      const kbStr = isCharging ? 14 : (this.big ? 9 : 5);
      game.player.vx = kbDir * kbStr;
      game.player.vy = isCharging ? -3 : (this.big ? -5 : -4);
      if (isCharging) game.player.knockbackTimer = 10;
      const dmg = isCharging ? Math.round(this.contactDmg * 1.5) : this.contactDmg;
      const spikyMul = this.element === 'spiky' ? 1.5 : 1;
      game.player.takeDamage(Math.round(dmg * spikyMul), game, this.element || null, { type: this.type, element: this.element, isBoss: false });
      this.contactTick = 30;
      if (isCharging) {
        this.chargeState = 'recoil';
        this.chargeTimer = 0;
        this.vx = -this.facing * speed * 3;
        this.vy = -6;
      }
    }
  }

  takeDamage(amount, game, fromX, attackElement, sourceType) {
    if (this.dead) return false;
    if (this.friendly) return false;
    // Ghost: immune to blade & shuriken (only abilities/elemental can hurt)
    if (this.element === 'ghost' && (sourceType === 'sword' || sourceType === 'shuriken')) {
      this.flashTimer = 4;
      if (this.resistTimer <= 0) {
        game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'IMMUNE', '#6f6'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#8f8', 6, 2, 10));
        this.resistTimer = 20;
      }
      return false;
    }
    // Spiky: reflect sword damage back to player
    if (this.element === 'spiky' && sourceType === 'sword' && game && game.player) {
      const reflDmg = Math.max(1, Math.round(amount * 0.5));
      game.player.takeDamage(reflDmg, game, 'spike', { type: this.type, element: 'spiky', isBoss: false });
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'REFLECT', '#f86'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f64', 8, 3, 10));
      this.flashTimer = 6;
      // still take half damage from the sword
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    // Shock: sword attacks get electrified
    if (this.element === 'lightning' && sourceType === 'sword' && game && game.player) {
      game.player.statusParalyse = 120;
      game.effects.push(new TextEffect(this.x + this.w / 2 - 24, this.y - 10, 'PARALYSED', '#6ff'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#6ff', 8, 3, 12));
    }

    // Elemental interaction — checked early so heals/resists bypass iframes
    if (this.element && game) {
      const atkEl = attackElement || (game.player ? NINJA_ATTACK_ELEMENTS[game.player.ninjaType] : null);
      if (atkEl && ELEMENT_MATRIX[atkEl]) {
        let result = ELEMENT_MATRIX[atkEl][this.element];
        // Steel (sword) attacks never heal — downgrade to resist
        if (atkEl === 'steel' && result === 'heal') result = 'resist';
        if (result === 'resist') {
          // Colored shield pop — no damage
          this.flashTimer = 6;
          if (this.resistTimer <= 0) {
            const col = this.elementColors.accent;
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, col, 8, 3, 12));
            game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'RESIST', col));
            this.resistTimer = 30;
          }
          return false;
        }
        if (result === 'heal') {
          // Heal enemy instead of damaging
          const healAmt = Math.min(amount, this.maxHp - this.hp);
          if (healAmt > 0) {
            this.hp += healAmt;
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f4', 6, 2, 10));
            game.effects.push(new TextEffect(this.x + this.w / 2 - 8, this.y - 10, '+' + Math.round(healAmt), '#4f4'));
          } else {
            // Already full HP — show absorb text
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f4', 6, 2, 10));
            game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'ABSORB', '#4f4'));
          }
          return false;
        }
      }
    }
    // Attacker: invulnerable while enemies are in its aura
    if (this.type === 'attacker' && this.attackerInvulnerable) {
      this.flashTimer = 4;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f88', 5, 2, 6));
      return false;
    }
    // Protector aura: non-protector enemies near a protector can't be damaged
    if (this.type !== 'protector' && this.type !== 'attacker' && game) {
      for (const other of game.enemies) {
        if (other.dead || other.type !== 'protector' || other === this) continue;
        const dx = (this.x + this.w / 2) - (other.x + other.w / 2);
        const dy = (this.y + this.h / 2) - (other.y + other.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) <= other.auraRadius) {
          this.flashTimer = 4;
          other.deflectFlash = 0;
          game.effects.push(new Effect(this.x + this.w / 2, this.y - 4, '#4f8', 5, 2, 6));
          return false;
        }
      }
    }
    // Shielded / Protector: swords and boulders remove shield pips
    let shieldBlocked = false;
    if ((sourceType === 'sword' || sourceType === 'boulder') && this._shieldBlocks(fromX, undefined, game)) {
      shieldBlocked = true;
      const pickaxeHits = (game && game.player && game.player.items.pickaxe) ? 2 : 1;
      this.shieldHp -= pickaxeHits;
      this.shieldFlash = 6;
      this.shieldBump = 6;
      const shieldColor = (this.type === 'protector' || this.bossType === 'protector') ? '#4f8' : '#5ff';
      const shAng = this.shieldAngle;
      game.effects.push(new Effect(
        this.x + this.w / 2 + Math.cos(shAng) * this.w * 0.6, this.y + this.h / 2 + Math.sin(shAng) * this.w * 0.6, shieldColor, 5, 2, 8
      ));
      if (this.shieldHp <= 0) {
        this.shieldHp = 0;
        this.stunTimer = Math.max(this.stunTimer, 90);
        this.chargeSt
        
        ate = 'idle';
        this.chargeTimer = 0;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'SHIELD BREAK', shieldColor));
      }
      amount = Math.max(1, Math.round(amount * 0.25));
    }
    if (this.juggleState) {
      amount = Math.ceil(amount * 1.5);
      const dir = Math.sign((this.x + this.w / 2) - (this.x + this.w / 2)) || (game && game.player ? game.player.facing : 1);
      this.vx = dir * 2;
      this.vy = -5;
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'JUGGLE', '#ff8'));
    }

    this.hp -= amount;
    if (!shieldBlocked) this.flashTimer = 6;
    const atkEl = attackElement || (game && game.player ? NINJA_ATTACK_ELEMENTS[game.player.ninjaType] : null);
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, atkEl));
    // Weight system: heavier enemies resist knockback more
    const weightBase = { walker: 1, shooter: 0.9, jumper: 0.8, bouncer: 1.2, shielded: 1.6, deflector: 1.3, protector: 2.5, attacker: 0.7, flyer: 0.5, flyshooter: 0.5 };
    const isBoss = this instanceof Boss;
    let weight = (weightBase[this.type] || 1) * (this.big ? 2 : 1) * (isBoss ? 3.5 : 1);
    const dir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : this.facing * -1;
    if (sourceType === 'sword' || sourceType === 'boulder') {
      // Sword/boulder hits: heavy knockback scaled inversely by weight
      const swordKB = 14 / weight;
      this.vx = dir * swordKB;
      this.knockbackTimer = Math.max(this.knockbackTimer, Math.ceil(10 / weight));
      if (!this.flying) this.vy = -7 / weight;
      if (this.flying) {
        this.vy = -swordKB * 0.3;
        this.flyerDashState = 'idle';
        this.flyerDashTimer = 0;
      }
    } else {
      const kbBase = { walker: 5, shooter: 6, jumper: 4, bouncer: 3, shielded: 2, deflector: 3, protector: 1, attacker: 8, flyer: 20, flyshooter: 20 };
      let kb = (kbBase[this.type] || 4) * (this.big ? 0.5 : 1);
      this.vx = dir * kb;
      this.knockbackTimer = Math.max(this.knockbackTimer, 6);
      if (!this.flying) this.vy = -2;
      if (this.flying) {
        this.vy = -kb * 0.3;
        this.flyerDashState = 'idle';
        this.flyerDashTimer = 0;
      }
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath(game);
    }
    return true;
  }

  // Crystal ninja: freeze + launch into ice slide
  launchIceSlide(game, fromX, dmg) {
    if (this.dead || this.flying) return;
    this.freezeTimer = Math.max(this.freezeTimer, 60);
    this.iceSliding = true;
    this.iceSlideDmg = Math.max(1, Math.round(dmg * 0.8));
    const dir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : 1;
    this.vx = dir * 12;
    this.vy = -3;
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 10, 4, 14));
  }

  onDeath(game) {
    game.waveKills++;
    game.totalKills++;
    // Track kill for achievements & bestiary
    recordKill(game.player.ninjaType);
    recordBestiaryKill(this.type, this.big, false, this.element);
    // Track deflector kill for earth construct unlock
    if (this.type === 'deflector') game.player.defeatedDeflector = true;
    // Elemental Charm: 10% heal on kill of matching element
    if (this.element) {
      const charmMap = { fire:'charmFire', ghost:'charmGhost', water:'charmWater', crystal:'charmCrystal', wind:'charmWind', lightning:'charmLightning', spiky:'charmSpiky' };
      const charmKey = charmMap[this.element];
      if (charmKey && game.player.items[charmKey]) {
        const healAmt = Math.max(1, Math.round(game.player.maxHp * 0.1));
        game.player.hp = Math.min(game.player.hp + healAmt, game.player.maxHp);
        game.effects.push(new TextEffect(game.player.x + game.player.w / 2, game.player.y - 10, '+' + healAmt, '#4f4'));
      }
    }
    SFX.enemyDie();
    triggerHitstop(this.big ? 7 : 5);
    triggerScreenShake(this.big ? 4 : 2, this.big ? 8 : 5);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, this.color, this.big ? 18 : 12, 4, 18));

    // ── Elemental death effects — spawn projectiles/objects ──
    if (this.element) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      const count = this.big ? 5 : 3;
      const dmg = Math.max(1, Math.ceil(2 * this.wave));

      switch (this.element) {
        case 'fire': {
          // Scatter fire projectiles (like fire special bombardment)
          for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
            const spd = 3 + Math.random() * 2;
            const proj = new Projectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, '#f60', dmg, 'player');
            proj.w = 10; proj.h = 10;
            proj.isFireball = true;
            proj.life = 50;
            game.projectiles.push(proj);
          }
          game.effects.push(new Effect(cx, cy, '#f60', 16, 5, 16));
          game.effects.push(new Effect(cx, cy, '#fa3', 10, 3, 12));
          break;
        }
        case 'water': {
          // Scatter homing soaking bubbles
          for (let i = 0; i < count; i++) {
            const offX = (Math.random() - 0.5) * 40;
            const offY = (Math.random() - 0.5) * 30;
            const bub = new Bubble(cx + offX - 16, cy + offY - 16, dmg);
            bub.homing = true;
            bub.soaking = true;
            bub.life = 240;
            game.bubbles.push(bub);
          }
          game.effects.push(new Effect(cx, cy, '#6af', 16, 5, 16));
          game.effects.push(new Effect(cx, cy, '#38d', 10, 6, 12));
          break;
        }
        case 'lightning': {
          // 3 homing shock balls
          for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i + (Math.random() - 0.5) * 0.5;
            const spd = 2 + Math.random();
            const proj = new Projectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, '#ff4', dmg, 'player');
            proj.w = 10; proj.h = 10;
            proj.homing = true;
            proj.shadowParalyse = true;
            proj.life = 120;
            game.projectiles.push(proj);
          }
          game.effects.push(new Effect(cx, cy, '#ff8', 14, 5, 14));
          game.effects.push(new Effect(cx, cy, '#ff4', 8, 7, 10));
          break;
        }
        case 'wind': {
          // Scatter trimerangs
          if (!game.trimerangs) game.trimerangs = [];
          for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
            const spd = 3 + Math.random() * 2;
            const t = new Trimerang(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, 'player');
            t.life = 150;
            t.homingEnemy = true;
            game.trimerangs.push(t);
          }
          game.effects.push(new Effect(cx, cy, '#bfb', 14, 6, 18));
          game.effects.push(new Effect(cx, cy, '#9e9', 10, 4, 14));
          break;
        }
        case 'ghost': {
          // Ghostly wisps: homing ethereal orbs that phase through walls
          for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const spd = 2 + Math.random() * 1.5;
            const proj = new Projectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, '#6f6', dmg, 'player');
            proj.w = 8; proj.h = 8;
            proj.homing = true;
            proj.noPlat = true;
            proj.life = 100;
            game.projectiles.push(proj);
          }
          game.effects.push(new Effect(cx, cy, '#8f8', 16, 5, 18));
          game.effects.push(new Effect(cx, cy, '#3a5', 10, 4, 14));
          break;
        }
        case 'crystal': {
          // Scatter diamond shards
          if (!game.diamondShards) game.diamondShards = [];
          for (let i = 0; i < count; i++) {
            const shard = new DiamondShard(cx, cy, 'player', game);
            const a = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            shard.angle = a + Math.PI / 2;
            shard.dirX = Math.cos(a);
            shard.dirY = Math.sin(a);
            shard.speed = 2 + Math.random() * 2;
            shard.maxSpeed = 7;
            game.diamondShards.push(shard);
          }
          game.effects.push(new Effect(cx, cy, '#aff', 16, 5, 16));
          game.effects.push(new Effect(cx, cy, '#0dd', 10, 4, 18));
          break;
        }
        case 'spiky': {
          // Scatter spiky shrapnel in all directions
          const sCount = this.big ? 8 : 5;
          for (let i = 0; i < sCount; i++) {
            const a = (Math.PI * 2 / sCount) * i;
            const spd = 5 + Math.random() * 2;
            const proj = new Projectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, '#f64', dmg + 1, 'player');
            proj.w = 6; proj.h = 6;
            proj.life = 45;
            game.projectiles.push(proj);
          }
          game.effects.push(new Effect(cx, cy, '#f86', 16, 6, 14));
          game.effects.push(new Effect(cx, cy, '#c33', 10, 4, 10));
          break;
        }
      }
      triggerHitstop(this.big ? 4 : 2);
    }

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
    // Drop orb — tiered rarity
    const r = Math.random();
    if (r < 0.30) {                                          // T1: heal 30%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'heal'));
    } else if (r < 0.48) {                                   // T2: shield 18%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'shield'));
    } else if (r < 0.58) {                                   // T3: maxhp 10%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'maxhp'));
    } else if (r < 0.62) {                                   // T3: shuriken 4%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'shuriken'));
    } else if (r < 0.78) {                                   // T3: ultcharge 16%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'ultcharge'));
    } else if (r < 0.84) {                                   // T4: damage 6%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'damage'));
    } else if (r < 0.87) {                                   // T4: elDmg 3%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'elDmg'));
    } else if (r < 0.91) {                                   // T4: speed 4%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'speed'));
    } else if (r < 0.95) {                                   // T4: reach 4%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'reach'));
    } else if (r < 0.98) {                                   // T4: armor 3%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'armor'));
    } else {                                                  // T4: element 2%
      game.orbs.push(new Orb(this.x + this.w / 2 - 5, this.y, 'element'));
    }
  }

  // Compute shield angle toward player (or facing fallback when stealthed)
  _shieldAngle(game) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const stealthed = game && game.player && game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    if (!stealthed && game && game.player) {
      const px = game.player.x + game.player.w / 2;
      const py = game.player.y + game.player.h / 2;
      return Math.atan2(py - cy, px - cx);
    }
    return this.facing > 0 ? 0 : Math.PI;
  }

  // Check if attack comes from shield side (within 90° arc of shield direction)
  _shieldBlocks(fromX, fromY, game) {
    if (this.shieldHp <= 0) return false;
    if (fromX === undefined) return false;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const shAngle = this.shieldAngle;
    const hitAngle = Math.atan2((fromY !== undefined ? fromY : cy) - cy, fromX - cx);
    let diff = hitAngle - shAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < Math.PI / 2;
  }

  render(ctx, cam, game) {
    // Charge dash trails
    if (this.chargeTrails && this.chargeTrails.length) {
      const trailColor = this.type === 'protector' ? '#4f8' : (this.type === 'flyer' || this.type === 'flyshooter') ? '#8c8' : this.type === 'attacker' ? '#f88' : '#5ff';
      for (const t of this.chargeTrails) {
        ctx.save();
        ctx.globalAlpha = (t.life / 12) * 0.4;
        ctx.fillStyle = trailColor;
        ctx.fillRect(t.x - cam.x, t.y - cam.y, t.w, t.h);
        ctx.restore();
      }
    }

    // Ghost aura renders in the back
    if (this.element && this.elementColors) {
      const tick = game ? game.tick : 0;
      if (this.element === 'ghost') {
        // Ghost: greenish scary aura + wisp particles
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(tick * 0.07);
        ctx.shadowColor = '#0f0';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#3a5';
        ctx.fillRect(this.x - cam.x - 4, this.y - cam.y - 4, this.w + 8, this.h + 8);
        ctx.restore();
        // Eerie green wisp trails rising upward
        if (Math.random() < 0.4) {
          const px = this.x + Math.random() * this.w;
          const py = this.y + this.h * 0.5 + Math.random() * this.h * 0.3;
          game.effects.push(new Effect(px, py, '#8f8', 2, 0.6, 18));
        }
      }
    }

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

    // Spawn pop-in scale
    const spawning = this.spawnTimer > 0;
    if (spawning) {
      const t = 1 - this.spawnTimer / 15;
      const scale = t * (2 - t); // ease-out quad
      ctx.save();
      ctx.translate(sx + this.w / 2, sy + this.h);
      ctx.scale(scale, scale);
      ctx.translate(-(sx + this.w / 2), -(sy + this.h));
      ctx.globalAlpha = t;
    }

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
      // Ghost: transparent body
      if (this.element === 'ghost') {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin((game ? game.tick : 0) * 0.08);
      }
      ctx.fillStyle = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : this.color);
      ctx.fillRect(sx, sy, this.w, this.h);
      if (this.element === 'ghost') ctx.restore();
    }

    // Soak drip particles
    if (this.soakTimer > 0 && Math.random() < 0.15) {
      game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#48f', 3, 1, 8));
    }

    // Elemental aura
    if (this.element && this.elementColors) {
      const tick = game ? game.tick : 0;

      if (this.element === 'spiky') {
        // Spiky: thorns protruding from body
        ctx.save();
        ctx.fillStyle = this.elementColors.accent;
        ctx.globalAlpha = 0.9;
        const thornLen = this.big ? 7 : 5;
        const thornW = this.big ? 3 : 2;
        const cx = sx + this.w / 2;
        const cy = sy + this.h / 2;
        // 8 thorns around the body
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 / 8) * i + Math.sin(tick * 0.04) * 0.1;
          const bx = cx + Math.cos(a) * (this.w * 0.45);
          const by = cy + Math.sin(a) * (this.h * 0.45);
          const tx = cx + Math.cos(a) * (this.w * 0.45 + thornLen);
          const ty = cy + Math.sin(a) * (this.h * 0.45 + thornLen);
          ctx.beginPath();
          ctx.moveTo(bx - Math.sin(a) * thornW, by + Math.cos(a) * thornW);
          ctx.lineTo(tx, ty);
          ctx.lineTo(bx + Math.sin(a) * thornW, by - Math.cos(a) * thornW);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        // Spark particles from thorns
        if (Math.random() < 0.2) {
          const px = this.x + Math.random() * this.w;
          const py = this.y + Math.random() * this.h;
          game.effects.push(new Effect(px, py, '#f64', 1, 0.8, 10));
        }
      } else {
        // Standard elemental aura: pulsing outer glow
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(tick * 0.06);
        ctx.fillStyle = this.elementColors.glow;
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Ambient element particles
        if (Math.random() < 0.25) {
          const px = this.x + Math.random() * this.w;
          const py = this.y + this.h * 0.3 + Math.random() * this.h * 0.5;
          game.effects.push(new Effect(px, py, this.elementColors.particle, 1, 0.8, 12));
        }
      }
      // Small element pip (diamond) above head
      const pipX = sx + this.w / 2;
      const pipY = sy - 5;
      ctx.fillStyle = this.elementColors.accent;
      ctx.beginPath();
      ctx.moveTo(pipX, pipY - 4);
      ctx.lineTo(pipX + 3, pipY);
      ctx.lineTo(pipX, pipY + 4);
      ctx.lineTo(pipX - 3, pipY);
      ctx.closePath();
      ctx.fill();
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
      case 'bouncer': {
        // Cannon barrel
        const cannonColor = this.element ? this.elementColors.body : '#c5c';
        const muzzleColor = this.element ? this.elementColors.accent : '#f6f';
        const bDir = this.facing;
        const cannonAngle = -(Math.PI * 0.35); // ~55° upward
        const barrelLen = this.big ? 16 : 12;
        const barrelW = this.big ? 5 : 3;
        const bx = sx + (bDir > 0 ? this.w - 2 : 2);
        const by = sy + this.h * 0.35;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(bDir > 0 ? cannonAngle : Math.PI - cannonAngle);
        // Barrel
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -barrelW, barrelLen, barrelW * 2);
        // Muzzle ring
        ctx.fillStyle = muzzleColor;
        ctx.fillRect(barrelLen - 3, -barrelW - 1, 3, barrelW * 2 + 2);
        ctx.restore();
        // Base mount
        ctx.fillStyle = '#666';
        ctx.fillRect(bx - 3, by - 1, 6, 4);
        // Headband
        ctx.fillStyle = cannonColor;
        ctx.fillRect(sx + 2, sy, this.w - 4, 3);
        break;
      }
      case 'shielded': {
        // Floating shield that tracks toward player
        const shAng = this.shieldAngle;
        const shDist = this.w * 0.6 + (this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.2) * 3 : 0);
        const ecx = sx + this.w / 2, ecy = sy + this.h / 2;
        if (this.shieldHp > 0) {
          ctx.save();
          ctx.translate(ecx + Math.cos(shAng) * shDist, ecy + Math.sin(shAng) * shDist);
          ctx.rotate(shAng);
          const shAlpha = 0.4 + 0.2 * (this.shieldHp / this.shieldMax) + (this.shieldBump > 0 ? 0.2 : 0);
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : `rgba(100,220,255,${shAlpha})`;
          ctx.fillRect(-2, -(this.h * 0.55), 5, this.h * 1.1);
          // Edge glow
          ctx.strokeStyle = this.shieldFlash > 0 ? '#fff' : `rgba(150,240,255,${shAlpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-2, -(this.h * 0.55), 5, this.h * 1.1);
          ctx.restore();
          // Charge visual indicators
          if (this.chargeState === 'prepare') {
            const pulse = Math.sin(this.chargeTimer * 0.4) * 0.4 + 0.6;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('!', sx + this.w / 2 - 3, sy - 8);
            ctx.globalAlpha = 1;
          } else if (this.chargeState === 'stunned') {
            // Dizzy stars
            const scx = sx + this.w / 2, scy = sy - 4;
            ctx.save();
            ctx.font = '10px monospace';
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < 3; i++) {
              const a = (game.tick * 0.08) + i * (Math.PI * 2 / 3);
              ctx.globalAlpha = 0.6 + 0.3 * Math.sin(game.tick * 0.15 + i);
              ctx.fillText('*', scx + Math.cos(a) * 12 - 3, scy + Math.sin(a) * 6);
            }
            ctx.restore();
          } else if (this.chargeState === 'charging') {
            const wcx = sx + this.w / 2, wcy = sy + this.h / 2;
            const ang = Math.atan2(this._chargeVy, this._chargeVx);
            ctx.save();
            ctx.translate(wcx, wcy);
            ctx.rotate(ang);
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#5ff';
            ctx.beginPath();
            ctx.arc(this.w * 0.5, 0, this.h, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.lineTo(this.w * 0.5, 0);
            ctx.fill();
            ctx.globalAlpha = 0.7 + 0.2 * Math.sin(this.chargeTimer * 0.8);
            ctx.strokeStyle = '#aff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.w * 0.5, 0, this.h, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#dff';
            ctx.lineWidth = 2;
            for (let i = -3; i <= 3; i++) {
              const oy = i * 6;
              ctx.beginPath();
              ctx.moveTo(-this.w * 0.8, oy);
              ctx.lineTo(this.w * 0.3, oy);
              ctx.stroke();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        }
        ctx.fillStyle = '#5a8';
        ctx.fillRect(sx + 2, sy, this.w - 4, 3);
        break;
      }
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
        if (this.flyerDashState === 'prepare') {
          const pulse = Math.sin(this.flyerDashTimer * 0.5) * 0.4 + 0.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ff0';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('!', sx + this.w / 2 - 3, sy - 8);
          ctx.globalAlpha = 1;
        }
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

        // Floating tower shield that tracks toward player
        const pShAng = this.shieldAngle;
        const pShDist = this.w * 0.7 + (this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.2) * 4 : 0);
        const pEcx = sx + this.w / 2, pEcy = sy + this.h / 2;
        const pShX = pEcx + Math.cos(pShAng) * pShDist;
        const pShY = pEcy + Math.sin(pShAng) * pShDist;
        if (this.shieldHp > 0) {
          const shieldAlpha = 0.5 + 0.5 * (this.shieldHp / this.shieldMax);
          ctx.save();
          ctx.translate(pShX, pShY);
          ctx.rotate(pShAng);
          ctx.globalAlpha = shieldAlpha;
          const pShFlash = this.shieldFlash > 0;
          // Shield body
          ctx.fillStyle = pShFlash ? '#fff' : '#3b7';
          ctx.fillRect(-2, -(this.h * 0.6 + 3), 9, this.h * 1.2 + 6);
          // Shield border
          ctx.strokeStyle = pShFlash ? '#fff' : '#2a5';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-1.5, -(this.h * 0.6 + 2.5), 8, this.h * 1.2 + 5);
          // Shield emblem (cross)
          ctx.fillStyle = pShFlash ? '#fff' : '#8d8';
          ctx.fillRect(1, -(this.h * 0.35), 3, this.h * 0.7);
          ctx.fillRect(-1, -1.5, 7, 3);
          // Shield rivets
          ctx.fillStyle = pShFlash ? '#fff' : '#5a7';
          ctx.fillRect(-1, -(this.h * 0.55), 2, 2);
          ctx.fillRect(4, -(this.h * 0.55), 2, 2);
          ctx.fillRect(-1, this.h * 0.45, 2, 2);
          ctx.fillRect(4, this.h * 0.45, 2, 2);
          ctx.restore();
        } else {
          // Broken shield stub
          ctx.save();
          ctx.translate(pShX, pShY);
          ctx.rotate(pShAng);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#2a5';
          ctx.fillRect(-1, -4, 7, 8);
          ctx.restore();
          ctx.globalAlpha = 1;
        }

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
        // Charge visual indicators
        if (this.shieldHp > 0) {
          if (this.chargeState === 'prepare') {
            const pulse = Math.sin(this.chargeTimer * 0.4) * 0.4 + 0.6;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('!', sx + this.w / 2 - 3, sy - 16);
            ctx.globalAlpha = 1;
          } else if (this.chargeState === 'charging') {
            // Windshield arc effect
            const wcx = sx + this.w / 2, wcy = sy + this.h / 2;
            const ang = Math.atan2(this._chargeVy, this._chargeVx);
            ctx.save();
            ctx.translate(wcx, wcy);
            ctx.rotate(ang);
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#4f8';
            ctx.beginPath();
            ctx.arc(this.w * 0.5, 0, this.h, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.lineTo(this.w * 0.5, 0);
            ctx.fill();
            ctx.globalAlpha = 0.7 + 0.2 * Math.sin(this.chargeTimer * 0.8);
            ctx.strokeStyle = '#afa';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.w * 0.5, 0, this.h, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#dfd';
            ctx.lineWidth = 2;
            for (let i = -3; i <= 3; i++) {
              const oy = i * 6;
              ctx.beginPath();
              ctx.moveTo(-this.w * 0.8, oy);
              ctx.lineTo(this.w * 0.3, oy);
              ctx.stroke();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
          }
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
    if (this.contactTick > 20 && this.type !== 'shooter' && this.type !== 'flyshooter' && this.type !== 'attacker') {
      const sl = this.big ? 16 : 12;
      const sw = this.big ? 4 : 3;
      const swordX = this.facing > 0 ? sx + this.w : sx - sl;
      const swordY = sy + this.h / 2 - sw / 2;
      ctx.fillStyle = '#ccd';
      ctx.fillRect(swordX, swordY, sl, sw);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.facing > 0 ? sx + this.w - 2 : sx, swordY - 2, 3, sw + 4);
    }

    // HP bar (floating above head)
    if (this.hp < this.maxHp) {
      const barW = this.w + 6;
      const barX = sx + this.w / 2 - barW / 2;
      const barY = sy - 10;
      ctx.fillStyle = '#400';
      ctx.fillRect(barX, barY, barW, 4);
      const displayRatio = this.displayHp / this.maxHp;
      const hpRatio = this.hp / this.maxHp;
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f84';
        ctx.fillRect(barX, barY, barW * displayRatio, 4);
      }
      ctx.fillStyle = '#f44';
      ctx.fillRect(barX, barY, barW * hpRatio, 4);
    }

    // Shield pips
    if ((this.type === 'shielded' || this.type === 'protector') && this.shieldMax > 0) {
      const pipColor = this.type === 'protector' ? '#4f8' : '#5ff';
      const pipW = this.type === 'protector' ? 3 : 5;
      const pipGap = this.type === 'protector' ? 5 : 7;
      const totalW = this.shieldMax * pipGap;
      const pipBump = this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.5) * 2 : 0;
      const pipStartX = sx + this.w / 2 - totalW / 2 + pipBump;
      for (let i = 0; i < this.shieldMax; i++) {
        ctx.fillStyle = i < this.shieldHp ? pipColor : '#234';
        ctx.fillRect(pipStartX + i * pipGap, sy - 16, pipW, 3);
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
    // General stun stars (boulders, slams, meteors, etc.)
    if (this.stunTimer > 0) {
      const scx = sx + this.w / 2, scy = sy - 4;
      ctx.save();
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ff0';
      for (let i = 0; i < 3; i++) {
        const a = (game.tick * 0.08) + i * (Math.PI * 2 / 3);
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(game.tick * 0.15 + i);
        ctx.fillText('*', scx + Math.cos(a) * 12 - 3, scy + Math.sin(a) * 6);
      }
      ctx.restore();
    }
    if (spawning) ctx.restore();
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
    // Override HP — based on mob's base HP
    this.hp = ENEMY_STATS[bossType].hp * 10 * wave;
    if (bossType === 'attacker') this.hp = Math.max(this.hp, 500);
    if (bossType === 'flyshooter') this.hp = Math.max(this.hp, 1000);
    this.maxHp = this.hp;
    this.displayHp = this.hp;
    // Override contact damage — boss takes 3 hits to kill player
    const _ehp = [0,16,24,34,46,60,73,89,107,127,148][Math.min(wave, 10)] || 148;
    const _arm = [0,1,2,4,6,8,10,13,15,18,21][Math.min(wave, 10)] || 21;
    this.contactDmg = Math.max(1, Math.round(_ehp / 3 + _arm));
    this._bossEhp = _ehp;
    this._bossArm = _arm;
    // Boss-specific state
    this.phase = 1;
    this.actionTimer = 0;
    this.state = 'chase';
    this.stateTimer = 0;
    this.grounded = false;
    this.hoverPhase = 0;
    this.shieldHp = (bossType === 'shielded') ? 12 : (bossType === 'protector') ? 15 : 0;
    this.shieldMax = this.shieldHp;
    this.stuckTimer = 0;
    this.phaseThrough = 0;
    this.dropThrough = 0;
    this.dropCooldown = 0;
    this.lastX = x;
    this.lastY = y;
    const colors = {
      walker: '#c33', shooter: '#cc5', jumper: '#c8c',
      bouncer: '#c5c', shielded: '#5cc', deflector: '#88a',
      protector: '#4a6', attacker: '#a44', flyer: '#8c5', flyshooter: '#c85'
    };
    this.color = colors[bossType] || '#c33';
    this.name = (BOSS_NAMES[bossType] || 'BIG') + ' BOSS';
    // Boss shouldn't use patrol/edge logic
    this.edgeAware = false;
    // Deflector boss (Ronin): deflects projectiles, throws shurikens
    if (bossType === 'deflector') {
      this.deflectReady = true;
      this.swordDrawn = true;
      this.shurikenTimer = 0;
    }
    // Protector boss (Aegis): aura that buffs nearby enemies
    if (bossType === 'protector') {
      this.auraRadius = 220;
    }
    // Attacker boss (Nemesis): floats, invulnerable when enemies nearby
    if (bossType === 'attacker') {
      this.flying = true;
      this.attackerInvulnerable = false;
      this.attackerAuraRadius = 200;
      this.shootTimer = 0;
    }
  }

  update(game) {
    if (this.dead) return;
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    if (this.contactTick > 0) this.contactTick--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.shieldFlash > 0) this.shieldFlash--;
    if (this.damageIframes > 0) this.damageIframes--;
    if (this._contactDmgCd > 0) this._contactDmgCd--;
    if (this._slideDmgCd > 0) this._slideDmgCd--;
    if (this.shieldBump > 0) this.shieldBump--;
    // Slow shield angle tracking
    if (this.shieldHp > 0) {
      const target = this._shieldAngle(game);
      let diff = target - this.shieldAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.shieldAngle += diff * 0.06;
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.iceSliding) {
        this.vx *= 0.92;
        if (Math.abs(this.vx) < 0.3) { this.iceSliding = false; this.vx = 0; }
        this.x += this.vx;
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
        }
        if (Math.random() < 0.4) {
          game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#cef', 3, 1, 8));
        }
      } else {
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
      }
      if (this.damageIframes > 0) this.damageIframes--;
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this.flashTimer > 0) this.flashTimer--;
      if (this.paralyseTimer > 0) this.paralyseTimer--;
      if (this.purpleParalyseTimer > 0) this.purpleParalyseTimer--;
      return;
    }
    if (this.paralyseTimer > 0) {
      this.paralyseTimer--;
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
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this.flashTimer > 0) this.flashTimer--;
      if (Math.random() < 0.5) {
        const sx = this.x + Math.random() * this.w;
        const sy = this.y + Math.random() * this.h;
        game.effects.push(new Effect(sx, sy, Math.random() < 0.5 ? '#ff0' : '#fff', 2, 1.5, 8));
      }
      // Paralysis DOT — 15% maxHp every 30 ticks
      if (this.paralyseTimer % 30 === 0) {
        const pdmg = Math.max(1, Math.round(this.maxHp * 0.15));
        this.hp -= pdmg;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 4, 2, 8));
        if (this.hp <= 0) { this.dead = true; this.onDeath(game); }
      }
      return;
    }
    // Purple paralysis (shadow ultimate) — affects ALL bosses including lightning
    if (this.purpleParalyseTimer > 0) {
      this.purpleParalyseTimer--;
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
      if (this._contactDmgCd > 0) this._contactDmgCd--;
      if (this._slideDmgCd > 0) this._slideDmgCd--;
      if (this.flashTimer > 0) this.flashTimer--;
      // Purple electric sparks
      if (Math.random() < 0.5) {
        const sx = this.x + Math.random() * this.w;
        const sy = this.y + Math.random() * this.h;
        game.effects.push(new Effect(sx, sy, Math.random() < 0.5 ? '#a040ff' : '#d0a0ff', 2, 1.5, 8));
      }
      return;
    }
    this.phase = this.hp <= this.maxHp / 2 ? 2 : 1;
    const speed = (this.phase === 2 ? 3.2 : 2.2) + this.wave * 0.25;

    if (this.flying) {
      this.hoverPhase += 0.03;
    } else if (this.floatTimer > 0) {
      this.floatTimer--;
      this.vy -= 0.1;
      if (this.vy < -2) this.vy = -2;
    } else {
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    }

    // Burn DOT — respects elemental affinity
    if (this.burnTimer > 0) {
      if (this.element === 'water') { this.burnTimer = 0; }
      else if (this.element === 'fire') {
        this.burnTimer = 0;
        const healAmt = Math.min(2, this.maxHp - this.hp);
        if (healAmt > 0) { this.hp += healAmt; game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f4', 4, 2, 8)); }
      }
      else {
      this.burnTimer--;
      if (this.burnTimer % 5 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f63', 6, 2, 10));
      }
      if (this.burnTimer % 30 === 0) {
        const bdmg = Math.max(1, Math.round(this.maxHp * 0.01));
        this.hp -= bdmg;
        this.flashTimer = 4;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 4, 2, 8));
        if (this.hp <= 0) { this.dead = true; this.onDeath(game); }
      }
      }
    }

    // Soak decay
    if (this.soakTimer > 0) this.soakTimer--;

    const playerStealthed = game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    const px = playerStealthed ? (this.x + this.facing * 100) : (game.player.x + game.player.w / 2);
    const py = playerStealthed ? this.y : (game.player.y + game.player.h / 2);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    if (!playerStealthed) this.facing = dx > 0 ? 1 : -1;
    this.stateTimer++;
    this.actionTimer++;

    const canShoot = (this.bossType === 'shooter' || this.bossType === 'bouncer' || this.bossType === 'flyshooter');
    const isJumpy = (this.bossType === 'jumper');

    if (this.flying) {
      // Flying boss AI
      const isAttacker = (this.bossType === 'attacker');
      if (isAttacker) {
        // Attacker boss: floats, invulnerable when enemies nearby, shoots fast
        this.hoverPhase += 0.04;
        const hoverTarget = 200;
        const hoverDist = hoverTarget - this.y;
        if (Math.abs(hoverDist) > 10) {
          this.vy += Math.sign(hoverDist) * 0.12;
          this.vy *= 0.92;
        } else {
          this.vy = Math.sin(this.hoverPhase) * 0.6;
        }
        // Drift toward player horizontally
        if (Math.abs(dx) > 80) {
          this.vx += this.facing * 0.15;
          this.vx = Math.max(-speed, Math.min(speed, this.vx));
        } else {
          this.vx *= 0.92;
        }
        // Check for nearby alive non-boss enemies
        const aR = this.attackerAuraRadius;
        let nearbyAlive = 0;
        for (const other of game.enemies) {
          if (other.dead || other.type === 'attacker') continue;
          const odx = (other.x + other.w / 2) - cx;
          const ody = (other.y + other.h / 2) - cy;
          if (Math.sqrt(odx * odx + ody * ody) <= aR) nearbyAlive++;
        }
        this.attackerInvulnerable = nearbyAlive > 0;
        // Shoot fast piercing projectiles when invulnerable
        if (this.attackerInvulnerable) {
          this.shootTimer++;
          const shootRate = this.phase === 2 ? 20 : 30;
          if (this.shootTimer >= shootRate) {
            this.shootTimer = 0;
            const sd = Math.sqrt(dx * dx + dy * dy);
            if (sd > 0 && sd < 600) {
              const p = new Projectile(cx, cy, (dx / sd) * 7, (dy / sd) * 7, this.element ? this.elementColors.accent : '#f44', this.contactDmg, 'boss');
              p.piercing = true;
              p.w = 6; p.h = 6;
              p.life = 90;
              if (this.element) p.element = this.element;
              game.projectiles.push(p);
              game.effects.push(new Effect(cx, cy, '#f66', 6, 2, 8));
            }
          }
        }
      } else {
      if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; this.vy *= 0.92; }
      else if (this.stunTimer > 0) { this.stunTimer--; this.vx *= 0.9; this.vy *= 0.9; }
      else {
      if (this.flyerDashCooldown > 0) this.flyerDashCooldown--;

      // Boss flyer projectile dodge
      if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0 && (this.bossType === 'flyer' || this.bossType === 'flyshooter')) {
        for (const p of game.projectiles) {
          if (p.owner === 'enemy' || p.owner === 'boss' || p.done) continue;
          const pdx = p.x - cx, pdy = p.y - cy;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pDist > 150) continue;
          const dot = pdx * p.vx + pdy * p.vy;
          if (dot < 0) {
            const pLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
            const perpX = -p.vy / pLen, perpY = p.vx / pLen;
            const side = (perpX * dx + perpY * dy) > 0 ? 1 : -1;
            this.flyerDashState = 'dashing';
            this.flyerDashTimer = 0;
            this._dashDefensive = true;
            this._dashVx = perpX * side * speed * 3.5;
            this._dashVy = perpY * side * speed * 3.5;
            game.effects.push(new Effect(cx, cy, '#bfb', 8, 4, 10));
            break;
          }
        }
      }

      // Boss flyer aggressive dash
      if (this.flyerDashState === 'idle' && this.flyerDashCooldown <= 0 && this.state === 'chase' && (this.bossType === 'flyer' || this.bossType === 'flyshooter')) {
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < 280 && dd > 50) {
          this.flyerDashState = 'prepare';
          this.flyerDashTimer = 0;
          this._dashDefensive = false;
          this._dashVx = (dx / dd) * speed * 4.5;
          this._dashVy = (dy / dd) * speed * 4.5;
        }
      }

      if (this.flyerDashState === 'prepare') {
        this.vx *= 0.7; this.vy *= 0.7;
        this.flyerDashTimer++;
        if (this.flyerDashTimer >= 30) {
          this.flyerDashState = 'dashing';
          this.flyerDashTimer = 0;
          game.effects.push(new Effect(cx, cy, '#bfb', 10, 5, 14));
        }
      } else if (this.flyerDashState === 'dashing') {
        this.vx = this._dashVx;
        this.vy = this._dashVy;
        this.flyerDashTimer++;
        if (this.flyerDashTimer >= (this._dashDefensive ? 8 : 14)) {
          this.flyerDashState = 'recovering';
          this.flyerDashTimer = 0;
        }
      } else if (this.flyerDashState === 'recovering') {
        this.vx *= 0.85;
        this.vy *= 0.85;
        this.flyerDashTimer++;
        if (this.flyerDashTimer >= 18) {
          this.flyerDashState = 'idle';
          this.flyerDashCooldown = this.phase === 2 ? 50 : 70;
        }
      } else {
      switch (this.state) {
        case 'chase': {
          const tdx = dx, tdy = (py - (this.bossType === 'flyshooter' ? 135 : 45)) - cy;
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
              if (this.bossType === 'bouncer') {
                // Bouncer boss (flying): high-arc mortar with big bouncy projectiles
                const bDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 3 : 2;
                for (let si = 0; si < shots; si++) {
                  const spread = (si - (shots - 1) / 2) * 0.2;
                  const dir = dx > 0 ? 1 : -1;
                  const lobSpd = (6 + Math.random() * 1.5) * 0.65;
                  const highAngle = -Math.PI * 0.38 - Math.random() * 0.1;
                  const bvx = dir * Math.cos(highAngle) * lobSpd + spread * 0.65;
                  const bvy = Math.sin(highAngle) * lobSpd;
                  const p = new Projectile(cx + dir * 8, cy - 6, bvx, bvy, this.element ? this.elementColors.accent : '#f6f', bDmg, 'boss');
                  p.bouncy = true;
                  p.gravScale = 0.42;
                  p.w = 8; p.h = 8;
                  p.bouncesLeft = this.phase === 2 ? 5 : 3;
                  p.life = 200;
                  if (this.element) p.element = this.element;
                  game.projectiles.push(p);
                }
              } else if (this.bossType === 'shooter') {
                // Shooter boss: bullet spread
                const sDmg = Math.max(1, Math.round(this._bossEhp / 6 + this._bossArm));
                const count = this.phase === 2 ? 5 : 3;
                const arc = this.phase === 2 ? 0.5 : 0.35;
                for (let si = 0; si < count; si++) {
                  const angle = (si - (count - 1) / 2) * (arc / (count - 1));
                  const cos = Math.cos(angle), sin = Math.sin(angle);
                  const bvx = (dx / d) * 5, bvy = (dy / d) * 5;
                  const p = new Projectile(cx, cy, bvx * cos - bvy * sin, bvx * sin + bvy * cos, this.element ? this.elementColors.accent : '#f44', sDmg, 'boss');
                  if (this.element) p.element = this.element;
                  game.projectiles.push(p);
                }
              } else {
                const p = new Projectile(cx, cy, (dx / d) * 5, (dy / d) * 5, this.element ? this.elementColors.accent : '#f44', Math.max(1, Math.round(this._bossEhp / 4 + this._bossArm)), 'boss');
                if (this.element) p.element = this.element;
                game.projectiles.push(p);
              }
            }
          }
          if (this.stateTimer > 60) {
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
      }
      } // end else (normal state machine, not dashing)
      } // end knockback check
      }
      if (this.y < -80) this.y = -80;
      if (this.y > 440) this.y = 440;
    } else {
      // Ground boss AI — type-specific behavior
      if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; }
      else if (this.stunTimer > 0) { this.stunTimer--; this.vx *= 0.9; }
      else {
      const isDeflector = (this.bossType === 'deflector');
      const isProtector = (this.bossType === 'protector');
      const isShielded = (this.bossType === 'shielded');

      if (isDeflector) {
        // A Friend's Letter: deflector boss fades out peacefully
        if (game.player.items.friendsLetter && !this.friendly) {
          this.friendly = true;
          this.friendlyFade = 120;
          this.vx = 0;
          game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 20, 'FRIEND!', '#fda'));
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fda', 25, 6, 25));
          recordBestiaryKill(this.bossType, false, true);
        }
        if (this.friendly && this.friendlyFade > 0) {
          this.friendlyFade--;
          this.vx = 0;
          if (this.friendlyFade <= 0) {
            this.dead = true;
          }
          return;
        }
        // Ronin boss: faces player, deflects projectiles, jumps, throws shuriken spreads
        if (Math.abs(dx) > 8) this.facing = dx > 0 ? 1 : -1;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distToPlayer > 80) {
          this.vx = this.facing * speed * 0.7;
        } else {
          this.vx *= 0.85;
        }
        // Deflect readiness (when grounded)
        this.deflectReady = this.grounded;
        // Jump toward player
        this.jumpTimer++;
        const jumpRate = this.phase === 2 ? 70 : 100;
        if (this.jumpTimer >= jumpRate && this.grounded && distToPlayer < 300) {
          this.vy = -11;
          this.vx = this.facing * speed * 3;
          this.jumpTimer = 0;
          this.deflectReady = false;
        }
        // Shuriken spread attack
        this.shurikenTimer++;
        const shurikenRate = this.phase === 2 ? 80 : 120;
        if (this.shurikenTimer >= shurikenRate && distToPlayer < 500 && distToPlayer > 40) {
          this.shurikenTimer = 0;
          const sd = Math.sqrt(dx * dx + dy * dy);
          if (sd > 0) {
            const baseVx = (dx / sd) * 6, baseVy = (dy / sd) * 6;
            const angles = this.phase === 2 ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.2, 0, 0.2];
            for (const ang of angles) {
              const cos = Math.cos(ang), sin = Math.sin(ang);
              const svx = baseVx * cos - baseVy * sin;
              const svy = baseVx * sin + baseVy * cos;
              const sh = new Projectile(cx, cy, svx, svy, this.element ? this.elementColors.accent : '#ccc', this.contactDmg, 'boss');
              sh.w = 10; sh.h = 10;
              sh.isShuriken = true;
              sh.life = 120;
              if (this.element) sh.element = this.element;
              game.projectiles.push(sh);
            }
            game.effects.push(new Effect(cx, cy, '#eef', 10, 4, 12));
          }
        }
      } else if (isShielded && this.shieldHp > 0) {
        // Shielded boss: shield charge behavior
        this.facing = dx > 0 ? 1 : -1;
        if (this.chargeCooldown > 0) this.chargeCooldown--;
        const absDist = Math.abs(dx);
        if (this.chargeState === 'prepare') {
          this.vx = Math.sin(this.chargeTimer * 1.5) * 3;
          this.chargeTimer++;
          if (this.chargeTimer >= 30) {
            this.chargeState = 'charging';
            this.chargeTimer = 0;
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#5ff', 10, 5, 14));
          }
        } else if (this.chargeState === 'charging') {
          this.vx = this._chargeVx;
          this.vy = this._chargeVy;
          this.chargeTimer++;
          if (this.chargeTimer >= 22) {
            this.chargeState = 'sliding';
            this.chargeTimer = 0;
            this.chargeCooldown = 70;
          }
        } else if (this.chargeState === 'sliding') {
          this.vx *= 0.88;
          this.chargeTimer++;
          if (this.chargeTimer >= 20 || Math.abs(this.vx) < 0.5) {
            this.chargeState = 'stunned';
            this.chargeTimer = 0;
            this.vx = 0;
          }
        } else if (this.chargeState === 'stunned') {
          this.chargeTimer++;
          if (this.chargeTimer >= 180) {
            this.chargeState = 'idle';
            this.chargeCooldown = 70;
          }
        } else if (this.chargeState === 'recoil') {
          const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
          this.vx = backDir * speed * 2.5;
          this.chargeTimer++;
          if (this.chargeTimer >= 18 || Math.abs(this.x - this.chargeStartX) < 15) {
            this.chargeState = 'idle';
            this.chargeCooldown = 70;
            this.vx = 0;
          }
        } else {
          // idle — walk toward player
          if (this.grounded) this.vx = this.facing * speed * 0.5;
          if (absDist < 160 && Math.abs(dy) < 80 && this.chargeCooldown <= 0 && this.grounded) {
            this.chargeState = 'prepare';
            this.chargeTimer = 0;
            this.chargeStartX = this.x;
            const cdx = px - cx, cdy = py - cy;
            const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
            this._chargeVx = (cdx / cd) * speed * 5;
            this._chargeVy = Math.max((cdy / cd) * speed * 5, -3);
            this.vx = 0;
          }
        }
      } else if (isProtector && this.shieldHp > 0) {
        // Protector boss: shield charge + aura healing
        this.facing = dx > 0 ? 1 : -1;
        if (this.chargeCooldown > 0) this.chargeCooldown--;
        // Aura heals nearby enemies
        if (this.actionTimer % 60 === 0) {
          for (const e of game.enemies) {
            if (e.dead || e === this) continue;
            const edx = (e.x + e.w / 2) - cx;
            const edy = (e.y + e.h / 2) - cy;
            if (Math.sqrt(edx * edx + edy * edy) <= this.auraRadius) {
              e.hp = Math.min(e.hp + 1, e.maxHp);
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#4f4', 4, 1.5, 6));
            }
          }
        }
        const pAbsDist = Math.abs(dx);
        if (this.chargeState === 'prepare') {
          this.vx = Math.sin(this.chargeTimer * 1.5) * 3;
          this.chargeTimer++;
          if (this.chargeTimer >= 35) {
            this.chargeState = 'charging';
            this.chargeTimer = 0;
            game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4f8', 10, 5, 14));
          }
        } else if (this.chargeState === 'charging') {
          this.vx = this._chargeVx;
          this.vy = this._chargeVy;
          this.chargeTimer++;
          if (this.chargeTimer >= 25) {
            this.chargeState = 'sliding';
            this.chargeTimer = 0;
            this.chargeCooldown = 90;
          }
        } else if (this.chargeState === 'sliding') {
          this.vx *= 0.88;
          this.chargeTimer++;
          if (this.chargeTimer >= 20 || Math.abs(this.vx) < 0.5) {
            this.chargeState = 'stunned';
            this.chargeTimer = 0;
            this.vx = 0;
          }
        } else if (this.chargeState === 'stunned') {
          this.chargeTimer++;
          if (this.chargeTimer >= 180) {
            this.chargeState = 'idle';
            this.chargeCooldown = 90;
          }
        } else if (this.chargeState === 'recoil') {
          const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
          this.vx = backDir * speed * 2;
          this.chargeTimer++;
          if (this.chargeTimer >= 20 || Math.abs(this.x - this.chargeStartX) < 15) {
            this.chargeState = 'idle';
            this.chargeCooldown = 90;
            this.vx = 0;
          }
        } else {
          // idle — walk toward player
          if (this.grounded) this.vx = this.facing * speed * 0.4;
          if (pAbsDist < 180 && Math.abs(dy) < 80 && this.chargeCooldown <= 0 && this.grounded) {
            this.chargeState = 'prepare';
            this.chargeTimer = 0;
            this.chargeStartX = this.x;
            const cdx = px - cx, cdy = py - cy;
            const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
            this._chargeVx = (cdx / cd) * speed * 4;
            this._chargeVy = Math.max((cdy / cd) * speed * 4, -3);
            this.vx = 0;
          }
        }
      } else {
        // Default ground boss AI (walker, shooter, jumper, bouncer, shielded/protector without shield)
      switch (this.state) {
        case 'chase': {
          const absDist = Math.abs(dx);
          if (canShoot && absDist < 180) {
            // Ranged boss: retreat when player is close
            this.vx = -this.facing * speed * 0.8;
          } else if (canShoot && absDist < 300) {
            // Comfortable range — slow down
            this.vx = this.facing * speed * 0.3;
          } else {
            this.vx = this.facing * speed;
          }
          if (this.actionTimer > (isJumpy ? 60 : 110) && this.grounded) {
            const r = Math.random();
            if (canShoot && r < 0.4) this.state = 'shoot';
            else this.state = 'jump';
            this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
        }
        case 'jump':
          if (this.stateTimer === 1) {
            this.vy = isJumpy ? -14 : -12;
            this.vx = this.facing * (isJumpy ? 7 : 5);
          }
          if (this.stateTimer > 10 && this.grounded) {
            game.effects.push(new Effect(cx, this.y + this.h, '#f84', 15, 5, 15));
            if (Math.abs(dx) < 80 && Math.abs(dy) < 60) {
              const kbDir = Math.sign(game.player.x - cx) || 1;
              game.player.vx = kbDir * 18;
              game.player.vy = -9;
              game.player.knockbackTimer = 12;
              if (!game.player.slamming) game.player.takeDamage(4 + Math.floor((this.wave - 1) * 0.5), game, this.element || null, { type: this.bossType, element: this.element, isBoss: true });
            }
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
        case 'shoot':
          this.vx = 0;
          if (this.stateTimer === 15 || this.stateTimer === 35 || (this.phase === 2 && this.stateTimer === 50)) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 0) {
              if (this.bossType === 'bouncer') {
                // Bouncer boss (ground): high-arc mortar with big bouncy projectiles
                const bDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 3 : 2;
                for (let si = 0; si < shots; si++) {
                  const spread = (si - (shots - 1) / 2) * 0.2;
                  const dir = dx > 0 ? 1 : -1;
                  const lobSpd = (6 + Math.random() * 1.5) * 0.65;
                  const highAngle = -Math.PI * 0.38 - Math.random() * 0.1;
                  const bvx = dir * Math.cos(highAngle) * lobSpd + spread * 0.65;
                  const bvy = Math.sin(highAngle) * lobSpd;
                  const p = new Projectile(cx + dir * 8, cy - 6, bvx, bvy, this.element ? this.elementColors.accent : '#f6f', bDmg, 'boss');
                  p.bouncy = true;
                  p.gravScale = 0.42;
                  p.w = 8; p.h = 8;
                  p.bouncesLeft = this.phase === 2 ? 5 : 3;
                  p.life = 200;
                  if (this.element) p.element = this.element;
                  game.projectiles.push(p);
                }
              } else if (this.bossType === 'shooter') {
                // Shooter boss: bullet spread
                const sDmg = Math.max(1, Math.round(this._bossEhp / 6 + this._bossArm));
                const count = this.phase === 2 ? 5 : 3;
                const arc = this.phase === 2 ? 0.5 : 0.35;
                for (let si = 0; si < count; si++) {
                  const angle = (si - (count - 1) / 2) * (arc / (count - 1));
                  const cos = Math.cos(angle), sin = Math.sin(angle);
                  const bvx = (dx / d) * 5, bvy = (dy / d) * 5;
                  const p = new Projectile(cx, cy, bvx * cos - bvy * sin, bvx * sin + bvy * cos, this.element ? this.elementColors.accent : '#f44', sDmg, 'boss');
                  if (this.element) p.element = this.element;
                  game.projectiles.push(p);
                }
              } else {
                const p = new Projectile(cx, cy, (dx / d) * 5, (dy / d) * 5, this.element ? this.elementColors.accent : '#f44', Math.max(1, Math.round(this._bossEhp / 4 + this._bossArm)), 'boss');
                if (this.element) p.element = this.element;
                game.projectiles.push(p);
              }
            }
          }
          if (this.stateTimer > 65) {
            this.state = 'chase'; this.stateTimer = 0; this.actionTimer = 0;
          }
          break;
      }
      }
    }
    } // end knockbackTimer else

    // Descend platforms if player is below
    if (this.dropThrough > 0) this.dropThrough--;
    if (this.dropCooldown > 0) this.dropCooldown--;
    if (!this.flying && this.grounded && this.dropCooldown <= 0 && dy > 60) {
      // Check if standing on a platform (not ground floor)
      let onPlatform = false;
      for (const p of game.platforms) {
        if (Math.abs(this.y + this.h - p.y) < 4 && this.x + this.w > p.x && this.x < p.x + p.w) {
          // Only drop through platforms that aren't the ground floor
          if (p.y < 480) { onPlatform = true; break; }
        }
      }
      if (onPlatform) {
        this.dropThrough = 12;
        this.dropCooldown = 90;
        this.y += 4;
        this.vy = 2;
        this.grounded = false;
      }
    }

    // Charge dash trails
    if ((this.bossType === 'shielded' || this.bossType === 'protector') && this.chargeState === 'charging') {
      this.chargeTrails.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 12 });
    }
    if ((this.bossType === 'flyer' || this.bossType === 'flyshooter') && this.flyerDashState === 'dashing') {
      this.chargeTrails.push({ x: this.x, y: this.y, w: this.w, h: this.h, life: 10 });
    }
    if (this.chargeTrails.length) this.chargeTrails = this.chargeTrails.filter(t => --t.life > 0);

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
    const isChargeDashing = (this.bossType === 'shielded' || this.bossType === 'protector') && this.chargeState === 'charging';
    if (!this.flying) {
      this.grounded = false;
      for (const p of game.platforms) {
        if (isChargeDashing && p.y < 460) continue;
        if (rectOverlap(this, p)) {
          if (this.dropThrough > 0) {
            // Falling through platform intentionally
          } else if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.grounded = true;
          } else if (this.phaseThrough > 0) {
            // Skip side/ceiling collisions to unstick
          }
        }
      }
    }

    // Stone block collision — boss inside a block can't move
    for (const b of game.stoneBlocks) {
      if (b.done || !b.isCollidable()) continue;
      if (rectOverlap(this, b)) {
        this.vx = 0;
        if (!this.flying) {
          if (this.vy > 0 && this.y + this.h - this.vy <= b.y + 4) {
            this.y = b.y - this.h;
            this.vy = 0;
          }
        }
      }
    }

    // Keep boss in level bounds
    if (this.x < 0) {
      this.x = 0; this.vx = Math.abs(this.vx); this.facing = 1;
      if (this.chargeState === 'charging') { this.chargeState = 'recoil'; this.chargeTimer = 0; }
    }
    if (this.x + this.w > game.levelW) {
      this.x = game.levelW - this.w; this.vx = -Math.abs(this.vx); this.facing = -1;
      if (this.chargeState === 'charging') { this.chargeState = 'recoil'; this.chargeTimer = 0; }
    }
    if (this.y > 700) { this.y = -40; this.vy = 0; }
    if (!this.flying && this.y < -60) { this.y = -60; this.vy = 0; }

    // Contact damage
    if (this.contactTick <= 0 && !game.player.slamming && rectOverlap(this, game.player.getHurtbox())) {
      const kbDir = Math.sign(game.player.x + game.player.w / 2 - (this.x + this.w / 2)) || 1;
      const isCharging = (this.bossType === 'shielded' || this.bossType === 'protector') && this.chargeState === 'charging';
      if (isCharging) {
        game.player.vx = kbDir * 22;
        game.player.vy = -5;
        game.player.knockbackTimer = 14;
        const chargeDmg = Math.round(this.contactDmg * 1.5);
        game.player.takeDamage(chargeDmg, game, this.element || null, { type: this.bossType, element: this.element, isBoss: true });
        this.chargeState = 'recoil';
        this.chargeTimer = 0;
        this.vx = -this.facing * speed * 3;
        this.vy = -8;
      } else {
        game.player.vx = kbDir * 18;
        game.player.vy = -9;
        game.player.knockbackTimer = 12;
        game.player.takeDamage(this.contactDmg, game, this.element || null, { type: this.bossType, element: this.element, isBoss: true });
      }
      this.contactTick = 45;
    }
  }

  takeDamage(amount, game, fromX, attackElement, sourceType) {
    if (this.dead) return false;
    if (this.friendly) return false;
    // Ghost: immune to blade & shuriken
    if (this.element === 'ghost' && (sourceType === 'sword' || sourceType === 'shuriken')) {
      this.flashTimer = 4;
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'IMMUNE', '#6f6'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#8f8', 6, 2, 10));
      return false;
    }
    // Spiky: reflect sword damage back to player
    if (this.element === 'spiky' && sourceType === 'sword' && game && game.player) {
      const reflDmg = Math.max(1, Math.round(amount * 0.5));
      game.player.takeDamage(reflDmg, game, 'spike', { type: this.bossType, element: 'spiky', isBoss: true });
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'REFLECT', '#f86'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f64', 8, 3, 10));
      this.flashTimer = 6;
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    // Attacker boss: invulnerable when enemies nearby
    if (this.attackerInvulnerable) {
      this.flashTimer = 4;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 6, 2, 8));
      return false;
    }
    // Shield check — only swords remove shield pips
    let shieldBlocked = false;
    if (sourceType === 'sword' && this._shieldBlocks(fromX, undefined, game)) {
      shieldBlocked = true;
      const pickaxeHits = (game && game.player && game.player.items.pickaxe) ? 2 : 1;
      this.shieldHp -= pickaxeHits;
      this.shieldFlash = 6;
      this.shieldBump = 8;
      const shieldColor = this.bossType === 'protector' ? '#4f8' : '#5ff';
      const shAng = this.shieldAngle;
      game.effects.push(new Effect(this.x + this.w / 2 + Math.cos(shAng) * this.w * 0.7, this.y + this.h / 2 + Math.sin(shAng) * this.w * 0.7, shieldColor, 6, 3, 10));
      if (this.shieldHp <= 0) {
        this.shieldHp = 0;
        this.stunTimer = Math.max(this.stunTimer, 120);
        this.chargeState = 'idle';
        this.chargeTimer = 0;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'SHIELD BREAK', shieldColor));
      }
      amount = Math.max(1, Math.round(amount * 0.25));
    }
    this.hp -= amount;
    this.hp = Math.round(this.hp);
    if (!shieldBlocked) this.flashTimer = 8;
    const atkEl = game && game.player ? NINJA_ATTACK_ELEMENTS[game.player.ninjaType] : null;
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, atkEl));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f88', 6, 3, 10));
    // Boss knockback (slight — bosses are heavy, flyer/flyshooter get more)
    const bDir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : this.facing * -1;
    const bossKb = (this.bossType === 'flyer' || this.bossType === 'flyshooter') ? 12 : 2;
    this.vx += bDir * bossKb;
    if (this.bossType === 'flyer' || this.bossType === 'flyshooter') {
      this.vy = -bossKb * 0.3;
      this.knockbackTimer = 10;
      this.flyerDashState = 'idle';
      this.flyerDashTimer = 0;
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath(game);
    }
    return true;
  }

  // Boss version: weaker slide (bosses are heavy)
  launchIceSlide(game, fromX, dmg) {
    if (this.dead) return;
    this.freezeTimer = Math.max(this.freezeTimer, 30);
    this.iceSliding = true;
    this.iceSlideDmg = 0;
    const dir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : 1;
    this.vx = dir * 5;
    if (!this.flying) this.vy = -2;
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 10, 4, 14));
  }

  onDeath(game) {
    SFX.bossDie();
    triggerHitstop(10);
    triggerScreenShake(8, 15);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 30, 6, 30));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 20, 5, 25));
    // Track boss kill for bestiary
    recordBestiaryKill(this.bossType, false, true);
    // Auto-grant boss item (shown in bucket choice menu)
    const allItemIds = Object.keys(BOSS_ITEMS);
    const pl = game.player;
    const uncollected = allItemIds.filter(id => !pl.items[id]);
    if (uncollected.length > 0) {
      const itemId = uncollected[Math.floor(Math.random() * uncollected.length)];
      pl.items[itemId] = true;
      if (itemId === 'deathsKey') pl.deathsKeyUsed = false;
      game.bossRewardItem = itemId;
      recordItemFound(itemId);
    } else {
      game.bossRewardItem = null;
    }
  }

  render(ctx, cam, game) {
    // Charge dash trails
    if (this.chargeTrails && this.chargeTrails.length) {
      const trailColor = this.bossType === 'protector' ? '#4f8' : (this.bossType === 'flyer' || this.bossType === 'flyshooter') ? '#8c8' : '#5ff';
      for (const t of this.chargeTrails) {
        ctx.save();
        ctx.globalAlpha = (t.life / 12) * 0.4;
        ctx.fillStyle = trailColor;
        ctx.fillRect(t.x - cam.x, t.y - cam.y, t.w, t.h);
        ctx.restore();
      }
    }
    if (this.dead) return;
    // Friendly fade alpha
    const _fading = this.friendlyFade > 0 && this.friendlyFade < 120;
    if (_fading) ctx.save();
    if (_fading) ctx.globalAlpha = this.friendlyFade / 120;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // Aura glow
    ctx.fillStyle = this.phase === 2 ? 'rgba(255,50,50,0.25)' : 'rgba(200,50,50,0.12)';
    ctx.fillRect(sx - 6, sy - 6, this.w + 12, this.h + 12);

    if (this.element && this.elementColors) {
      const tick = game ? game.tick : 0;
      if (this.element === 'ghost') {
        // Ghost boss: greenish scary aura
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(tick * 0.07);
        ctx.shadowColor = '#0f0';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#3a5';
        ctx.fillRect(sx - 6, sy - 6, this.w + 12, this.h + 12);
        ctx.restore();
        if (Math.random() < 0.35) {
          const px = this.x + Math.random() * this.w;
          const py = this.y + this.h * 0.3 + Math.random() * this.h * 0.5;
          game.effects.push(new Effect(px, py, '#8f8', 2, 0.8, 14));
        }
      }
    }

    const bodyColor = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : (this.phase === 2 ? '#d11' : this.color));

    // Ghost boss: transparent body
    if (this.element === 'ghost') {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin((game ? game.tick : 0) * 0.08);
    }

    // --- Type-specific body rendering ---
    if (this.bossType === 'attacker') {
      // Orb body (like regular attacker, but bigger)
      const orbCx = sx + this.w / 2;
      const orbCy = sy + this.h / 2;
      const orbR = this.w / 2;
      ctx.globalAlpha = this.attackerInvulnerable ? (0.4 + 0.15 * Math.sin((game ? game.tick : 0) * 0.08)) : 0.2;
      ctx.fillStyle = '#f44';
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : (this.attackerInvulnerable ? '#c22' : '#644'));
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR, 0, Math.PI * 2);
      ctx.fill();
      // Inner eye
      ctx.fillStyle = this.attackerInvulnerable ? '#f88' : '#866';
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Crown horns on orb
      ctx.fillStyle = '#ff0';
      ctx.fillRect(sx + 8, sy - 6, 6, 8);
      ctx.fillRect(sx + this.w - 14, sy - 6, 6, 8);
      ctx.fillRect(sx + this.w / 2 - 3, sy - 10, 6, 12);
    } else if (this.bossType === 'protector') {
      // Armored knight body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx, sy, this.w, this.h);
      // Helmet with visor
      ctx.fillStyle = '#5a7';
      ctx.fillRect(sx - 3, sy - 8, this.w + 6, 14);
      // Visor slit
      ctx.fillStyle = '#1a3';
      ctx.fillRect(sx + 6, sy - 4, this.w - 12, 5);
      // Glowing eyes behind visor
      const eyePulse = 0.7 + 0.3 * Math.sin((game ? game.tick : 0) * 0.1);
      ctx.save();
      ctx.shadowColor = '#4f8';
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(100,255,150,${eyePulse})`;
      ctx.fillRect(sx + 12, sy - 4, 7, 4);
      ctx.fillRect(sx + this.w - 19, sy - 4, 7, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
      // Helmet crest/plume
      ctx.fillStyle = '#3d8';
      ctx.fillRect(sx + this.w / 2 - 3, sy - 16, 6, 10);
      ctx.fillRect(sx + this.w / 2 - 5, sy - 16, 10, 4);
      // Shoulder pauldrons
      ctx.fillStyle = '#4a7';
      ctx.fillRect(sx - 8, sy + 6, 10, 14);
      ctx.fillRect(sx + this.w - 2, sy + 6, 10, 14);
      ctx.fillStyle = '#8d8';
      ctx.fillRect(sx - 6, sy + 9, 3, 3);
      ctx.fillRect(sx + this.w + 1, sy + 9, 3, 3);
      // Chest plate
      ctx.fillStyle = '#4a7';
      ctx.fillRect(sx + 3, sy + 6, this.w - 6, this.h - 18);
      ctx.fillStyle = '#6c9';
      ctx.fillRect(sx + 4, sy + 7, this.w - 8, 4);
      ctx.fillStyle = '#3a6';
      ctx.fillRect(sx + this.w / 2 - 1, sy + 11, 2, this.h - 28);
      // Belt
      ctx.fillStyle = '#2a5';
      ctx.fillRect(sx, sy + this.h - 16, this.w, 5);
      ctx.fillStyle = '#8d8';
      ctx.fillRect(sx + this.w / 2 - 4, sy + this.h - 16, 8, 5);
      // Greaves
      ctx.fillStyle = '#4a7';
      ctx.fillRect(sx + 3, sy + this.h - 11, this.w / 2 - 5, 11);
      ctx.fillRect(sx + this.w / 2 + 2, sy + this.h - 11, this.w / 2 - 5, 11);
      // Floating tower shield that tracks toward player
      const bpAng = this.shieldAngle;
      const bpDist = this.w * 0.7 + (this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.2) * 5 : 0);
      const bpEcx = sx + this.w / 2, bpEcy = sy + this.h / 2;
      const bpShX = bpEcx + Math.cos(bpAng) * bpDist;
      const bpShY = bpEcy + Math.sin(bpAng) * bpDist;
      if (this.shieldHp > 0) {
        const shieldAlpha = 0.5 + 0.5 * (this.shieldHp / this.shieldMax);
        ctx.save();
        ctx.translate(bpShX, bpShY);
        ctx.rotate(bpAng);
        ctx.globalAlpha = shieldAlpha;
        const bpShFlash = this.shieldFlash > 0;
        // Shield body
        ctx.fillStyle = bpShFlash ? '#fff' : '#3b7';
        ctx.fillRect(-3, -(this.h * 0.6 + 4), 11, this.h * 1.2 + 8);
        // Shield border
        ctx.strokeStyle = bpShFlash ? '#fff' : '#2a5';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-2.5, -(this.h * 0.6 + 3.5), 10, this.h * 1.2 + 7);
        // Shield emblem (cross)
        ctx.fillStyle = bpShFlash ? '#fff' : '#8d8';
        ctx.fillRect(1, -(this.h * 0.35), 3, this.h * 0.7);
        ctx.fillRect(-2, -1.5, 9, 3);
        ctx.restore();
      } else {
        // Broken shield stub
        ctx.save();
        ctx.translate(bpShX, bpShY);
        ctx.rotate(bpAng);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#2a5';
        ctx.fillRect(-1, -5, 7, 10);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // Boss protector charge indicators
      if (this.shieldHp > 0) {
        if (this.chargeState === 'prepare') {
          const pulse = Math.sin(this.chargeTimer * 0.4) * 0.4 + 0.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ff0';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('!', sx + this.w / 2 - 5, sy - 20);
          ctx.globalAlpha = 1;
        } else if (this.chargeState === 'stunned') {
          const scx = sx + this.w / 2, scy = sy - 12;
          ctx.save();
          ctx.font = '14px monospace';
          ctx.fillStyle = '#ff0';
          for (let i = 0; i < 3; i++) {
            const a = (game.tick * 0.08) + i * (Math.PI * 2 / 3);
            ctx.globalAlpha = 0.6 + 0.3 * Math.sin(game.tick * 0.15 + i);
            ctx.fillText('*', scx + Math.cos(a) * 16 - 4, scy + Math.sin(a) * 8);
          }
          ctx.restore();
        } else if (this.chargeState === 'charging') {
          // Windshield arc effect
          const wcx = sx + this.w / 2, wcy = sy + this.h / 2;
          const ang = Math.atan2(this._chargeVy, this._chargeVx);
          ctx.save();
          ctx.translate(wcx, wcy);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#4f8';
          ctx.beginPath();
          ctx.arc(this.w * 0.4, 0, this.h * 0.7, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.lineTo(this.w * 0.4, 0);
          ctx.fill();
          ctx.globalAlpha = 0.7 + 0.2 * Math.sin(this.chargeTimer * 0.8);
          ctx.strokeStyle = '#afa';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(this.w * 0.4, 0, this.h * 0.7, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.stroke();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#dfd';
          ctx.lineWidth = 2.5;
          for (let i = -4; i <= 4; i++) {
            const oy = i * 8;
            ctx.beginPath();
            ctx.moveTo(-this.w * 0.7, oy);
            ctx.lineTo(this.w * 0.3, oy);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
    } else if (this.bossType === 'deflector') {
      // Ronin samurai body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx, sy, this.w, this.h);
      // Kasa (farmer hat)
      ctx.fillStyle = '#aac';
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy + 4);
      ctx.lineTo(sx + this.w / 2, sy - 26);
      ctx.lineTo(sx + this.w + 14, sy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#889';
      ctx.fillRect(sx - 14, sy + 1, this.w + 28, 5);
      // Headband
      ctx.fillStyle = '#aac';
      ctx.fillRect(sx + 3, sy + 6, this.w - 6, 4);
      // Belt / sash
      ctx.fillStyle = '#aac';
      ctx.fillRect(sx + 3, sy + this.h - 14, this.w - 6, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(sx + 3, sy + this.h - 13, this.w - 6, 1);
      // Eyes
      ctx.fillStyle = '#ff0';
      const reyeX = this.facing > 0 ? sx + 28 : sx + 6;
      ctx.fillRect(reyeX, sy + 14, 8, 8);
      ctx.fillRect(reyeX + 14, sy + 14, 8, 8);
      ctx.fillStyle = '#200';
      ctx.fillRect(reyeX + 2, sy + 17, 4, 4);
      ctx.fillRect(reyeX + 16, sy + 17, 4, 4);
      // Katana held in front, angled upward
      const bLen = 52;
      ctx.save();
      const gripX = this.facing > 0 ? sx + this.w - 2 : sx + 2;
      const gripY = sy + this.h * 0.45;
      ctx.translate(gripX, gripY);
      ctx.rotate(this.facing > 0 ? -Math.PI * 0.35 : (-Math.PI + Math.PI * 0.35));
      ctx.fillStyle = this.deflectReady ? '#dde' : '#889';
      ctx.beginPath();
      ctx.moveTo(6, -2.5);
      ctx.lineTo(6 + bLen, -1);
      ctx.lineTo(6 + bLen + 6, 0);
      ctx.lineTo(6 + bLen, 1);
      ctx.lineTo(6, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(6 + bLen + 4, 0);
      ctx.stroke();
      ctx.fillStyle = '#aa8';
      ctx.fillRect(3, -6, 5, 12);
      ctx.fillStyle = '#aac';
      ctx.fillRect(-7, -3, 11, 6);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 3; i++) ctx.fillRect(-5 + i * 3, -3, 1, 6);
      ctx.restore();
      // Deflect glow
      if (this.deflectReady) {
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(game ? game.tick * 0.1 : 0);
        ctx.fillStyle = '#aaf';
        ctx.beginPath();
        ctx.arc(gripX, gripY - bLen * 0.25, bLen * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Boss deflect flash — full body pulse when deflecting
      if (this.deflectFlash > 0) {
        this.deflectFlash--;
        ctx.save();
        const df = this.deflectFlash / 12;
        ctx.globalAlpha = 0.6 * df;
        ctx.fillStyle = '#aaf';
        ctx.fillRect(sx - 6, sy - 6, this.w + 12, this.h + 12);
        ctx.globalAlpha = 0.5 * df;
        ctx.strokeStyle = '#ccf';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * (1.5 - df), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Default boss body (walker, shooter, jumper, bouncer, shielded, flyer, flyshooter)
      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx, sy, this.w, this.h);

      // Flying wings
      if (this.flying) {
        ctx.fillStyle = this.color;
        ctx.fillRect(sx - 8, sy + 6, 8, this.h - 12);
        ctx.fillRect(sx + this.w, sy + 6, 8, this.h - 12);
        if (this.flyerDashState === 'prepare') {
          const pulse = Math.sin(this.flyerDashTimer * 0.4) * 0.4 + 0.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ff0';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('!', sx + this.w / 2 - 5, sy - 14);
          ctx.globalAlpha = 1;
        }
      }

      // Floating shield that tracks toward player
      if (this.shieldHp > 0) {
        const bsAng = this.shieldAngle;
        const bsDist = this.w * 0.65 + (this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.2) * 4 : 0);
        const bsEcx = sx + this.w / 2, bsEcy = sy + this.h / 2;
        const shieldAlpha = 0.4 + 0.3 * (this.shieldHp / this.shieldMax) + (this.shieldBump > 0 ? 0.2 : 0);
        ctx.save();
        ctx.translate(bsEcx + Math.cos(bsAng) * bsDist, bsEcy + Math.sin(bsAng) * bsDist);
        ctx.rotate(bsAng);
        ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : `rgba(100,220,255,${shieldAlpha})`;
        ctx.fillRect(-3, -(this.h * 0.55), 6, this.h * 1.1);
        ctx.strokeStyle = this.shieldFlash > 0 ? '#fff' : `rgba(150,240,255,${shieldAlpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-3, -(this.h * 0.55), 6, this.h * 1.1);
        ctx.restore();
        // Shielded boss charge indicators
        if (this.chargeState === 'prepare') {
          const pulse = Math.sin(this.chargeTimer * 0.4) * 0.4 + 0.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ff0';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('!', sx + this.w / 2 - 5, sy - 14);
          ctx.globalAlpha = 1;
        } else if (this.chargeState === 'stunned') {
          const scx = sx + this.w / 2, scy = sy - 8;
          ctx.save();
          ctx.font = '14px monospace';
          ctx.fillStyle = '#ff0';
          for (let i = 0; i < 3; i++) {
            const a = (game.tick * 0.08) + i * (Math.PI * 2 / 3);
            ctx.globalAlpha = 0.6 + 0.3 * Math.sin(game.tick * 0.15 + i);
            ctx.fillText('*', scx + Math.cos(a) * 16 - 4, scy + Math.sin(a) * 8);
          }
          ctx.restore();
        } else if (this.chargeState === 'charging') {
          const wcx = sx + this.w / 2, wcy = sy + this.h / 2;
          const ang = Math.atan2(this._chargeVy, this._chargeVx);
          ctx.save();
          ctx.translate(wcx, wcy);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#5ff';
          ctx.beginPath();
          ctx.arc(this.w * 0.4, 0, this.h * 0.7, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.lineTo(this.w * 0.4, 0);
          ctx.fill();
          ctx.globalAlpha = 0.7 + 0.2 * Math.sin(this.chargeTimer * 0.8);
          ctx.strokeStyle = '#aff';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(this.w * 0.4, 0, this.h * 0.7, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.stroke();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#dff';
          ctx.lineWidth = 2.5;
          for (let i = -4; i <= 4; i++) {
            const oy = i * 8;
            ctx.beginPath();
            ctx.moveTo(-this.w * 0.7, oy);
            ctx.lineTo(this.w * 0.3, oy);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
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

      // Shooter boss: gun barrel
      if (this.bossType === 'shooter') {
        const gunColor = this.element ? this.elementColors.accent : '#ff4';
        const bDir = this.facing;
        const barrelLen = 18;
        const barrelW = 4;
        const gx = sx + (bDir > 0 ? this.w : 0);
        const gy = sy + this.h * 0.45;
        // Barrel
        ctx.fillStyle = '#555';
        ctx.fillRect(bDir > 0 ? gx : gx - barrelLen, gy - barrelW, barrelLen, barrelW * 2);
        // Muzzle
        ctx.fillStyle = gunColor;
        ctx.fillRect(bDir > 0 ? gx + barrelLen - 4 : gx - barrelLen, gy - barrelW - 1, 4, barrelW * 2 + 2);
        // Mount
        ctx.fillStyle = '#666';
        ctx.fillRect(gx - 3, gy - 2, 6, 5);
        // Headband
        ctx.fillStyle = gunColor;
        ctx.fillRect(sx + 4, sy + 2, this.w - 8, 4);
      }

      // Bouncer boss: mortar cannon
      if (this.bossType === 'bouncer') {
        const cannonColor = this.element ? this.elementColors.body : '#c5c';
        const muzzleColor = this.element ? this.elementColors.accent : '#f6f';
        const bDir = this.facing;
        const cannonAngle = -(Math.PI * 0.35);
        const barrelLen = 22;
        const barrelW = 5;
        const bx = sx + (bDir > 0 ? this.w - 4 : 4);
        const by = sy + this.h * 0.3;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(bDir > 0 ? cannonAngle : Math.PI - cannonAngle);
        // Barrel
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -barrelW, barrelLen, barrelW * 2);
        // Muzzle ring
        ctx.fillStyle = muzzleColor;
        ctx.fillRect(barrelLen - 4, -barrelW - 2, 4, barrelW * 2 + 4);
        ctx.restore();
        // Base mount
        ctx.fillStyle = '#666';
        ctx.fillRect(bx - 4, by - 2, 8, 5);
        // Headband
        ctx.fillStyle = cannonColor;
        ctx.fillRect(sx + 4, sy + 2, this.w - 8, 4);
      }
    }

    // Restore ghost transparency
    if (this.element === 'ghost') ctx.restore();

    // Soak drip particles
    if (this.soakTimer > 0 && Math.random() < 0.15) {
      game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#48f', 3, 1, 8));
    }

    // Elemental aura (matches Enemy render)
    if (this.element && this.elementColors) {
      const tick = game ? game.tick : 0;
      if (this.element !== 'ghost') {
        {
          ctx.save();
          ctx.globalAlpha = 0.18 + 0.08 * Math.sin(tick * 0.06);
          ctx.fillStyle = this.elementColors.glow;
          ctx.beginPath();
          ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (Math.random() < 0.25) {
            const px = this.x + Math.random() * this.w;
            const py = this.y + this.h * 0.3 + Math.random() * this.h * 0.5;
            game.effects.push(new Effect(px, py, this.elementColors.particle, 1, 0.8, 12));
          }
        }
        const pipX = sx + this.w / 2;
        const pipY = sy - 36;
        ctx.fillStyle = this.elementColors.accent;
        ctx.beginPath();
        ctx.moveTo(pipX, pipY - 4);
        ctx.lineTo(pipX + 3, pipY);
        ctx.lineTo(pipX, pipY + 4);
        ctx.lineTo(pipX - 3, pipY);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (this.phase === 2) {
      ctx.fillStyle = '#f44';
      ctx.font = '10px monospace';
      ctx.fillText('ENRAGED!', sx + this.w / 2 - 28, sy - 34);
    }

    // Crystal ninja: melee warning "!"
    if (game && game.player && game.player.ninjaType === 'crystal') {
      const dx = (this.x + this.w / 2) - (game.player.x + game.player.w / 2);
      const dy = (this.y + this.h / 2) - (game.player.y + game.player.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100 && this.contactTick <= 0) {
        const pulse = Math.sin(game.tick * 0.3) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('!', sx + this.w / 2 - 5, sy - 18);
        ctx.globalAlpha = 1;
      }
    }

    // Boss melee sword (not for deflector — has its own katana)
    if (this.contactTick > 30 && this.bossType !== 'deflector' && this.bossType !== 'attacker') {
      const sl = 24;
      const sw = 5;
      const swordX = this.facing > 0 ? sx + this.w : sx - sl;
      const swordY = sy + this.h / 2 - sw / 2;
      ctx.fillStyle = '#dde';
      ctx.fillRect(swordX, swordY, sl, sw);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.facing > 0 ? sx + this.w - 3 : sx, swordY - 3, 4, sw + 6);
    }

    // Shield pips for boss (match HP bar width)
    if (this.shieldMax > 0) {
      const pipColor = this.bossType === 'protector' ? '#4f8' : '#5ff';
      const barW = this.w + 20;
      const pipW = Math.max(2, Math.floor(barW / this.shieldMax) - 1);
      const pipGap = barW / this.shieldMax;
      const bpipBump = this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.5) * 3 : 0;
      const pipStartX = sx + this.w / 2 - barW / 2 + bpipBump;
      for (let i = 0; i < this.shieldMax; i++) {
        ctx.fillStyle = i < this.shieldHp ? pipColor : '#234';
        ctx.fillRect(pipStartX + i * pipGap, sy - 32, pipW, 3);
      }
    }

    // Protector boss: healing aura ring
    if (this.bossType === 'protector' && this.auraRadius > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.05 * Math.sin((game ? game.tick : 0) * 0.05);
      ctx.strokeStyle = '#4f4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, this.auraRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,200,80,0.06)';
      ctx.fill();
      ctx.restore();
    }

    // Attacker boss: invulnerability aura
    if (this.bossType === 'attacker') {
      ctx.save();
      const aR = this.attackerAuraRadius;
      if (this.attackerInvulnerable) {
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin((game ? game.tick : 0) * 0.08);
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 3;
      } else {
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, aR, 0, Math.PI * 2);
      ctx.stroke();
      if (this.attackerInvulnerable) {
        ctx.fillStyle = 'rgba(255,80,80,0.06)';
        ctx.fill();
      }
      ctx.restore();
    }

    // Boss HP bar (above head)
    {
      const barW = this.w + 20;
      const barH = 6;
      const barX = sx + this.w / 2 - barW / 2;
      const barY = sy - 24;
      ctx.fillStyle = '#400';
      ctx.fillRect(barX, barY, barW, barH);
      const displayRatio = this.displayHp / this.maxHp;
      const hpRatio = this.hp / this.maxHp;
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f84';
        ctx.fillRect(barX, barY, barW * displayRatio, barH);
      }
      ctx.fillStyle = this.phase === 2 ? '#f22' : '#e44';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    // General stun stars (boulders, slams, meteors, etc.)
    if (this.stunTimer > 0) {
      const scx = sx + this.w / 2, scy = sy - 8;
      ctx.save();
      ctx.font = '14px monospace';
      ctx.fillStyle = '#ff0';
      for (let i = 0; i < 3; i++) {
        const a = (game.tick * 0.08) + i * (Math.PI * 2 / 3);
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(game.tick * 0.15 + i);
        ctx.fillText('*', scx + Math.cos(a) * 16 - 4, scy + Math.sin(a) * 8);
      }
      ctx.restore();
    }
    // Restore fade alpha
    if (_fading) ctx.restore();
  }
}
