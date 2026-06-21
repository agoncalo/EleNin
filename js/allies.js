class AllyNinja {
  constructor(x, y, ninjaType, power, slot) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 32;
    this.vx = 0;
    this.vy = 0;
    this.facing = slot % 2 === 0 ? 1 : -1;
    this.ninjaType = NINJA_TYPES[ninjaType] ? ninjaType : 'fire';
    this.power = power || 1;
    this.slot = slot || 0;
    this.friendly = true;
    this.isAllyNinja = true;
    this.grounded = false;
    this.onWall = 0;
    this.jumpsLeft = 2;
    this.maxJumps = 2;
    this.wallJumpCooldown = 0;
    this.attackCooldown = 35 + slot * 8;
    this.specialCooldown = 110 + slot * 25;
    this.attackTimer = 0;
    this.attackBox = null;
    this.swingHitSet = new Set();
    this.invincibleTimer = 45;
    this.flashTimer = 0;
    this.knockbackTimer = 0;
    this.displayHp = this.hp = this.maxHp = 32;
    this.dead = false;
    this._cutSpawned = false;
    this._nextThink = 0;
    this._target = null;
  }

  get type() { return NINJA_TYPES[this.ninjaType] || NINJA_TYPES.fire; }
  getHurtbox() { return this; }

  _centerX() { return this.x + this.w / 2; }
  _centerY() { return this.y + this.h / 2; }

  _nearestTarget(game, maxDist) {
    let best = null;
    let bestDist = maxDist === undefined ? Infinity : maxDist * maxDist;
    for (const e of game.enemies) {
      if (!e || e.dead || e.friendly) continue;
      const dx = (e.x + e.w / 2) - this._centerX();
      const dy = (e.y + e.h / 2) - this._centerY();
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = e; }
    }
    if (game.boss && !game.boss.dead && !game.boss.friendly) {
      const dx = (game.boss.x + game.boss.w / 2) - this._centerX();
      const dy = (game.boss.y + game.boss.h / 2) - this._centerY();
      const d = dx * dx + dy * dy;
      if (d < bestDist) best = game.boss;
    }
    return best;
  }

  _damageForSword() {
    return Math.max(2, this.type.attackDamage + Math.floor(this.power / 4));
  }

  _damageForSpecial() {
    return Math.max(2, this.type.attackDamage + 1 + Math.floor(this.power / 5));
  }

  _startAttack(game) {
    this.attackCooldown = 56 + this.slot * 4;
    this.attackTimer = 12;
    this.swingHitSet.clear();
    const reach = this.ninjaType === 'earth' ? 58 : this.ninjaType === 'storm' ? 62 : 48;
    const cx = this._centerX();
    const cy = this._centerY();
    this.attackBox = {
      x: this.facing > 0 ? cx - 4 : cx - reach + 4,
      y: cy - 24,
      w: reach,
      h: 48
    };
    game.effects.push(new Effect(cx + this.facing * 22, cy, this.type.accentColor, 5, 2, 8));
    if (typeof SFX !== 'undefined' && SFX.attack) SFX.attack();
  }

  _applyAttackHits(game) {
    if (!this.attackBox) return;
    const dmg = this._damageForSword();
    for (const e of game.enemies) {
      if (e.dead || e.friendly || this.swingHitSet.has(e) || !rectOverlap(this.attackBox, e)) continue;
      e.takeDamage(dmg, game, this._centerX(), 'steel', 'sword', this);
      this.swingHitSet.add(e);
      game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, this.type.accentColor, 8, 3, 10));
      triggerHitstop(2);
    }
    if (game.boss && !game.boss.dead && !this.swingHitSet.has(game.boss) && rectOverlap(this.attackBox, game.boss)) {
      game.boss.takeDamage(dmg, game, this._centerX(), 'steel', 'sword', this);
      this.swingHitSet.add(game.boss);
      game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, this.type.accentColor, 10, 3, 12));
      triggerHitstop(2);
    }
  }

  _useSpecial(game, target) {
    if (!target) return;
    this.specialCooldown = 170 + this.slot * 35 + (this.power % 4) * 12;
    const cx = this._centerX();
    const cy = this._centerY();
    const tx = target.x + target.w / 2;
    const ty = target.y + target.h / 2;
    const dx = tx - cx;
    const dy = ty - cy;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const dmg = this._damageForSpecial();
    const accent = this.type.accentColor;

    if (this.ninjaType === 'earth') {
      damageInRadius(game, cx + this.facing * 34, this.y + this.h, 80, dmg + 1, cx);
      game.effects.push(new SlamRing(cx + this.facing * 34, this.y + this.h, this.type.color, accent));
      triggerScreenShake(3, 6);
      return;
    }

    if (this.ninjaType === 'shadow') {
      this.x = target.x + (tx > cx ? -this.w - 6 : target.w + 6);
      this.y = target.y + target.h / 2 - this.h / 2;
      this.facing = tx > cx ? 1 : -1;
      target.paralyseTimer = Math.max(target.paralyseTimer || 0, 35);
      target.takeDamage(dmg + 1, game, this._centerX(), 'steel', 'sword', this);
      game.effects.push(new Effect(target.x + target.w / 2, target.y + target.h / 2, '#a4e', 12, 4, 14));
      return;
    }

    const speed = this.ninjaType === 'storm' ? 9 : this.ninjaType === 'wind' ? 10 : 7;
    const p = new Projectile(cx - 4, cy - 3, (dx / d) * speed, (dy / d) * speed, accent, dmg, 'ally');
    p.sourceActor = this;
    p.fromSpecial = true;
    p.element = NINJA_ATTACK_ELEMENTS[this.ninjaType] || null;
    p.life = 95;
    if (this.ninjaType === 'fire') {
      p.w = 16; p.h = 12; p.isFireball = true; p.homing = true;
    } else if (this.ninjaType === 'bubble') {
      p.w = 14; p.h = 14; p.soaking = true;
    } else if (this.ninjaType === 'crystal') {
      p.w = 12; p.h = 10; p.freezeDust = true;
    } else if (this.ninjaType === 'wind') {
      p.w = 18; p.h = 8; p.piercing = true;
    } else if (this.ninjaType === 'storm') {
      p.w = 12; p.h = 8; p.soaking = true; p.shadowParalyse = true;
    }
    game.projectiles.push(p);
    game.effects.push(new Effect(cx, cy, accent, 8, 3, 10));
  }

  _tryJump(game, target) {
    const canWallJump = this.onWall !== 0 && !this.grounded && this.wallJumpCooldown <= 0;
    if (this.jumpsLeft <= 0 && !canWallJump) return;
    const needsHeight = target && (target.y + target.h / 2) < this.y - 26;
    const blockedAhead = this._blockedAhead(game);
    if (!needsHeight && !blockedAhead) return;
    if (canWallJump) {
      this.vy = this.type.jumpPower * 0.9;
      this.vx = -this.onWall * 6;
      this.facing = -this.onWall;
      this.jumpsLeft = Math.max(this.jumpsLeft - 1, 1);
      this.onWall = 0;
      this.wallJumpCooldown = 18;
      game.effects.push(new Effect(this._centerX(), this._centerY(), '#fff', 4, 2, 7));
      return;
    }
    this.vy = this.type.jumpPower * (this.grounded ? 1 : 0.84);
    this.grounded = false;
    this.jumpsLeft--;
    game.effects.push(new Effect(this._centerX(), this.y + this.h, '#fff', 4, 2, 7));
  }

  _blockedAhead(game) {
    const probe = {
      x: this.facing > 0 ? this.x + this.w + 1 : this.x - 9,
      y: this.y + 6,
      w: 8,
      h: this.h - 8
    };
    for (const p of game.platforms) {
      if (!p.thin && rectOverlap(probe, p)) return true;
    }
    for (const b of game.stoneBlocks) {
      if (!b.done && b.isCollidable && b.isCollidable() && rectOverlap(probe, b)) return true;
    }
    return false;
  }

  _physics(game) {
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    this.x += this.vx;
    this.y += this.vy;

    const wasGrounded = this.grounded;
    this.grounded = false;
    this.onWall = 0;
    for (const p of game.platforms) {
      if (!rectOverlap(this, p)) continue;
      if (p.thin) {
        if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
          this.jumpsLeft = this.maxJumps;
        }
        continue;
      }
      if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.jumpsLeft = this.maxJumps;
      } else if (this.vx > 0 && this.x + this.w - this.vx <= p.x + 4) {
        this.x = p.x - this.w;
        this.vx = 0;
        if (p.h > p.w) this.onWall = 1;
      } else if (this.vx < 0 && this.x - this.vx >= p.x + p.w - 4) {
        this.x = p.x + p.w;
        this.vx = 0;
        if (p.h > p.w) this.onWall = -1;
      }
    }

    for (const b of game.stoneBlocks) {
      if (b.done || !b.isCollidable || !b.isCollidable() || !rectOverlap(this, b)) continue;
      if (this.vy > 0 && this.y + this.h - this.vy <= b.y + 4) {
        this.y = b.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.jumpsLeft = this.maxJumps;
      } else if (this.vx > 0) {
        this.x = b.x - this.w;
        this.vx = 0;
        this.onWall = 1;
      } else if (this.vx < 0) {
        this.x = b.x + b.w;
        this.vx = 0;
        this.onWall = -1;
      }
    }

    if (this.onWall !== 0 && !this.grounded && this.vy > 0) {
      this.vy = Math.min(this.vy, 2);
      this.jumpsLeft = this.maxJumps;
      if (game.tick % 8 === 0) {
        game.effects.push(new Effect(
          this.x + (this.onWall > 0 ? this.w : 0),
          this.y + this.h / 2,
          '#aaa', 2, 1, 6
        ));
      }
    }

    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      if (!this.grounded) this.onWall = -1;
    }
    if (this.x + this.w > game.levelW) {
      this.x = game.levelW - this.w;
      this.vx = -Math.abs(this.vx);
      if (!this.grounded) this.onWall = 1;
    }
    if (this.y > 820) {
      this.takeDamage(4, game, 'pit', { type: 'pit' });
      this.x = Math.max(40, Math.min(game.levelW - 80, game.player.x + 60 + this.slot * 36));
      this.y = Math.max(-40, game.player.y - 90);
      this.vx = 0;
      this.vy = 0;
    }
    if (this.grounded && !wasGrounded) {
      game.effects.push(new Effect(this._centerX(), this.y + this.h, '#aaa', 2, 1, 5));
    }
  }

  update(game) {
    if (this.dead) return;
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;
    if (this.knockbackTimer > 0) this.knockbackTimer--;
    if (this.wallJumpCooldown > 0) this.wallJumpCooldown--;
    this.displayHp = lerp(this.displayHp, this.hp, 0.16);

    const target = this._nearestTarget(game, 640);
    this._target = target;
    if (target && this.knockbackTimer <= 0) {
      const dx = (target.x + target.w / 2) - this._centerX();
      const dy = (target.y + target.h / 2) - this._centerY();
      if (Math.abs(dx) > 8) this.facing = dx > 0 ? 1 : -1;
      const desired = this.ninjaType === 'wind' ? 62 : 48;
      if (Math.abs(dx) > desired) {
        this.vx = this.facing * (this.type.speed * 0.76);
      } else {
        this.vx *= 0.78;
      }
      if ((this.grounded || this.jumpsLeft > 0 || this.onWall !== 0) && (Math.abs(dx) < 190 || this._blockedAhead(game))) {
        this._tryJump(game, target);
      }
      if (this.attackCooldown <= 0 && Math.abs(dx) < 62 && Math.abs(dy) < 48) {
        this._startAttack(game);
      }
      if (this.specialCooldown <= 0 && Math.abs(dx) < 470 && Math.abs(dy) < 260) {
        this._useSpecial(game, target);
      }
    } else if (this.knockbackTimer <= 0) {
      const homeX = game.player.x + 48 + this.slot * 42;
      const dx = homeX - this.x;
      if (Math.abs(dx) > 80) {
        this.facing = dx > 0 ? 1 : -1;
        this.vx = this.facing * (this.type.speed * 0.55);
        if ((this.grounded || this.jumpsLeft > 0 || this.onWall !== 0) && this._blockedAhead(game)) {
          this._tryJump(game, null);
        }
      } else {
        this.vx *= 0.82;
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer--;
      this._applyAttackHits(game);
      if (this.attackTimer <= 0) this.attackBox = null;
    }

    this._physics(game);
  }

  takeDamage(amount, game, element, killerInfo) {
    if (this.dead || this.invincibleTimer > 0) return false;
    amount = Math.max(1, Math.round(amount || 1));
    this.hp -= amount;
    this.flashTimer = 10;
    this.invincibleTimer = 22;
    if (game) {
      game.effects.push(new DamageNumber(this._centerX(), this.y, amount, element || null));
      game.effects.push(new Effect(this._centerX(), this._centerY(), '#fff', 5, 2, 8));
      if (typeof SFX !== 'undefined' && SFX.playerHurt) SFX.playerHurt();
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (game) {
        game.effects.push(new TextEffect(this._centerX(), this.y - 12, 'ALLY DOWN', '#f66'));
        game.effects.push(new Effect(this._centerX(), this._centerY(), this.type.accentColor, 18, 5, 18));
        triggerScreenShake(4, 10);
      }
    }
    return true;
  }

  render(ctx, cam) {
    if (this.dead) return;
    const t = this.type;
    if (Math.floor(this.flashTimer / 2) % 2 === 1) return;

    const scale = 0.86;
    const screenCx = this.x + this.w / 2 - cam.x;
    const screenFootY = this.y + this.h - cam.y;
    const screenTopY = screenFootY - this.h * scale;

    ctx.save();
    if (this.invincibleTimer > 0) ctx.globalAlpha = 0.72;

    renderHpBar(ctx, cam, this, this.w);
    ctx.fillStyle = '#4f4';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALLY', screenCx, screenTopY - 4);
    ctx.textAlign = 'left';

    ctx.translate(screenCx, screenFootY);
    ctx.scale(scale, scale);
    const sx = -this.w / 2;
    const sy = -this.h;

    // Same base ninja sprite as the player, with the kasa hat intentionally omitted.
    ctx.fillStyle = t.color;
    ctx.fillRect(sx, sy, this.w, this.h);

    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx - 0.5, sy - 0.5, this.w + 1, this.h + 1);

    ctx.fillStyle = '#fff';
    const eyeX = this.facing > 0 ? sx + 14 : sx + 4;
    ctx.fillRect(eyeX, sy + 8, 6, 6);
    ctx.fillStyle = '#222';
    ctx.fillRect(this.facing > 0 ? eyeX + 3 : eyeX, sy + 10, 3, 3);

    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + 5, this.w, 3);

    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + this.h - 10, this.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx, sy + this.h - 9, this.w, 1);

    if (this.invincibleTimer > 0) {
      ctx.strokeStyle = t.accentColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha *= 0.55;
      ctx.strokeRect(sx + 3, sy + 3, 18, 28);
      ctx.globalAlpha = this.invincibleTimer > 0 ? 0.72 : 1;
    }

    if (this.attackTimer <= 0) {
      this._renderBackWeapon(ctx, sx, sy, t);
    } else {
      this._renderAttackWeapon(ctx, sx, sy, t);
    }
    ctx.restore();
  }

  _renderBackWeapon(ctx, sx, sy, t) {
    ctx.save();
    const backX = this.facing > 0 ? sx + 3 : sx + this.w - 3;
    const beltY = sy + this.h - 10;
    ctx.translate(backX, beltY);
    ctx.rotate(this.facing > 0 ? -0.45 : 0.45);

    if (this.ninjaType === 'shadow') {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-1.5, -24, 3, 28);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(-1.5, -24, 1.5, 28);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-1.5, -24, 3, 28);
      ctx.fillStyle = '#a4e';
      for (let i = 0; i < 3; i++) ctx.fillRect(-2, -4 + i * 6, 4, 3);
      ctx.save();
      ctx.translate(0, -24);
      ctx.beginPath();
      ctx.moveTo(1, -1);
      ctx.bezierCurveTo(6, -4, 8, -10, 3, -16);
      ctx.lineTo(1, -14);
      ctx.bezierCurveTo(5, -9, 4, -4, -1, -2);
      ctx.closePath();
      ctx.fillStyle = '#e0d0f8';
      ctx.shadowColor = '#c060ff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#c060ff';
      ctx.beginPath();
      ctx.arc(0, 5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.ninjaType === 'bubble') {
      ctx.fillStyle = '#3a7a9a';
      ctx.fillRect(-1.5, -26, 3, 30);
      ctx.fillStyle = '#5ab0d0';
      ctx.fillRect(-1.5, -26, 1.5, 30);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-1.5, -26, 3, 30);
      ctx.fillStyle = '#2a6888';
      for (let i = 0; i < 3; i++) ctx.fillRect(-2, -2 + i * 5, 4, 3);
      ctx.strokeStyle = '#60d8f8';
      ctx.shadowColor = '#40c0e0';
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -30, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(100,220,255,0.2)';
      ctx.beginPath();
      ctx.arc(0, -30, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.ninjaType === 'earth') {
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(-3, -16, 6, 20);
      ctx.fillStyle = '#a8844a';
      ctx.fillRect(-3, -16, 3, 20);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-3, -16, 6, 20);
      ctx.fillStyle = '#e8d0b0';
      ctx.fillRect(-2, -18, 4, 3);
      ctx.fillRect(-3, -15, 2, 2);
      ctx.fillRect(1, -15, 2, 2);
      ctx.fillStyle = '#2e9e2e';
      ctx.fillRect(-3.5, -6, 7, 3);
    } else if (this.ninjaType === 'crystal') {
      ctx.fillStyle = '#4a8a9a';
      ctx.fillRect(-1.5, -24, 3, 28);
      ctx.fillStyle = '#6ab8c8';
      ctx.fillRect(-1.5, -24, 1.5, 28);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-1.5, -24, 3, 28);
      ctx.fillStyle = '#2a6878';
      for (let i = 0; i < 3; i++) ctx.fillRect(-2, -2 + i * 5, 4, 3);
      ctx.save();
      ctx.translate(0, -28);
      ctx.shadowColor = '#6ee';
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#aff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(3, 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else {
      if (this.ninjaType === 'storm') {
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = this.ninjaType === 'storm' ? '#332200' : '#2a2a2a';
      ctx.fillRect(-2, -28, 4, 32);
      ctx.fillStyle = '#444';
      ctx.fillRect(-2, 2, 4, 3);
      ctx.fillStyle = '#555';
      ctx.fillRect(-3, -6, 6, 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-2.5, -28.5, 5, 34);
      ctx.fillStyle = t.accentColor;
      ctx.fillRect(-2, -36, 4, 9);
      ctx.strokeRect(-2.5, -36.5, 5, 10);
      ctx.fillStyle = '#aa8';
      ctx.fillRect(-3, -28, 6, 2);
      ctx.fillStyle = '#888';
      ctx.fillRect(-1, -38, 2, 3);
    }
    ctx.restore();
  }

  _renderAttackWeapon(ctx, sx, sy, t) {
    const slashProgress = 1 - this.attackTimer / 12;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const dir = this.facing;

    if (this.ninjaType === 'earth') {
      const punchExt = Math.sin(slashProgress * Math.PI) * 48;
      const fistW = 26;
      const fistH = 38;
      const fx = cx + dir * (8 + punchExt);
      const fy = cy - fistH / 2 - 4;
      ctx.save();
      ctx.fillStyle = '#c8a878';
      ctx.fillRect(fx - (dir > 0 ? 0 : fistW), fy, fistW, fistH);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx - (dir > 0 ? 0 : fistW) - 0.5, fy - 0.5, fistW + 1, fistH + 1);
      ctx.fillStyle = '#e8d0b0';
      const kx = dir > 0 ? fx + fistW - 5 : fx - fistW + 1;
      for (let i = 1; i <= 4; i++) ctx.fillRect(kx, fy + (fistH / 5) * i - 2, 4, 4);
      ctx.fillStyle = '#2e9e2e';
      ctx.fillRect(dir > 0 ? fx + 3 : fx - fistW + 3, fy + 2, 4, fistH - 4);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    if (dir < 0) ctx.scale(-1, 1);
    const isShadow = this.ninjaType === 'shadow';
    const startA = isShadow ? -Math.PI * 0.8 : -Math.PI * 0.65;
    const sweep = isShadow ? Math.PI * 1.25 : Math.PI;
    ctx.rotate(startA + sweep * slashProgress);

    if (isShadow) {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-8, -2, 48, 4);
      ctx.fillStyle = '#a4e';
      for (let i = 0; i < 4; i++) ctx.fillRect(1 + i * 9, -3, 5, 6);
      ctx.save();
      ctx.translate(38, 0);
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.bezierCurveTo(16, -10, 20, -24, 6, -38);
      ctx.lineTo(2, -36);
      ctx.bezierCurveTo(12, -22, 10, -10, -2, -5);
      ctx.closePath();
      ctx.fillStyle = '#e0d0f8';
      ctx.shadowColor = '#c060ff';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else {
      const bladeLen = this.ninjaType === 'storm' ? 54 : 44;
      if (this.ninjaType === 'storm') {
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = '#d8d8e8';
      ctx.fillRect(0, -2, bladeLen, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(3, -2, bladeLen - 8, 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = t.accentColor;
      ctx.fillRect(-6, -3, 12, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6.5, -3.5, bladeLen + 7, 7);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = t.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, this.ninjaType === 'storm' ? 56 : 46, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }
}
