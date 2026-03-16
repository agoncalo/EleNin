// ── Player ───────────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 32;
    this.vx = 0; this.vy = 0;
    this.facing = 1; // 1 right, -1 left
    this.grounded = false;
    this.hp = 10;
    this.maxHp = 10;
    this.shield = 0;
    this.maxShield = 0;
    this.ninjaType = 'fire';
    this.invincibleTimer = 0;
    this.bonusDamage = 0;

    // Ultimate system
    this.ultimateCharge = 0;
    this.ultimateMax = 500;
    this.ultimateReady = false;
    this.ultimateActive = false;
    this.ultimateTimer = 0;

    // Double jump
    this.jumpsLeft = 2;
    this.maxJumps = 2;

    // Wall climb / slide
    this.onWall = 0; // -1 left wall, 1 right wall, 0 none
    this.wallSlideTimer = 0;

    // Attack state
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackBox = null;

    // Special state
    this.specialCooldown = 0;

    // Fire ninja state
    this.comboMeter = 0;
    this.comboTimer = 0;
    this.fireArmor = false;
    this.fireArmorTimer = 0;
    this.countsTowardCombo = true;

    // Bubble ninja state
    this.bubbleBuffTimer = 0;

    // Shadow ninja state
    this.shadowStealth = 0;
    this.backstabReady = false;
    this.afterimages = [];
    this.lastDamageTick = 0;
    this.lastEnemyTouch = 0;
    this.wasInAir = false;
    this.shadowLandTimer = 0;
    this.chainStriking = false;
    this.chainTargets = [];
    this.chainTimer = 0;
    this.chainHit = new Set();
    this.shadowAttackHit = false;

    // Crystal ninja state
    this.parrying = false;
    this.parryTimer = 0;
    this.parryVisualTimer = 0;
    this.parryCombo = 0;
    this.parryComboTimer = 0;

    // Wind ninja state
    this.windPower = 0;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.windTrails = [];
    this.windFullTrails = [];

    // Next-hit-double system
    this.nextHitDouble = false;

    // Shadow instakill threshold (gradual, caps at 15)
    this.shadowKillThreshold = 0;

    // Shurikens (rechargeable)
    this.shurikens = 3;
    this.maxShurikens = 3;
    this.shurikenLevel = 1;

    // Ground slam
    this.slamming = false;

    // Stop midair
    this.stopMidair = false;
    this.stopMidairTimer = 0;
  }

  get type() { return NINJA_TYPES[this.ninjaType]; }

  // Ultimate activation logic
  activateUltimate(game) {
    this.ultimateActive = true;
    this.ultimateReady = false;
    this.ultimateTimer = 180; // 3 seconds default
    SFX.victory();
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 30, 8, 30));
    switch (this.ninjaType) {
      case 'fire':
        this.fireArmor = true;
        this.fireArmorTimer = 240;
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 60;
            const fx = this.x + this.w / 2 + Math.cos(angle) * dist;
            const fy = this.y + this.h / 2 + Math.sin(angle) * dist;
            fireProjectileAtNearestEnemy({
              x: fx, y: fy, game, speed: 7, color: '#f93', damage: 4, owner: 'player', width: 14, height: 10, piercing: true
            });
          }, i * 120);
        }
        break;
      case 'earth':
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const px = this.x + this.w / 2 + Math.cos(angle) * 90;
          const py = this.y + this.h / 2 + Math.sin(angle) * 60;
          game.stonePillars.push(new StonePillar(px, py));
        }
        break;
      case 'bubble':
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const bx = this.x + this.w / 2 + Math.cos(angle) * 70;
          const by = this.y + this.h / 2 + Math.sin(angle) * 40;
          game.bubbles.push(new Bubble(bx, by));
        }
        break;
      case 'shadow':
        this.shadowStealth = 300;
        this.backstabReady = true;
        this.chainStriking = true;
        this.chainTimer = 6;
        this.chainHit = new Set();
        break;
      case 'crystal':
        this.parrying = true;
        this.parryTimer = 60;
        for (const e of game.enemies) {
          if (!e.dead) e.freezeTimer = 90;
        }
        if (game.boss && !game.boss.dead) game.boss.freezeTimer = 60;
        break;
      case 'wind':
        this.windPower = 10;
        for (let i = 0; i < 3; i++) {
          const px = this.x + this.w / 2 + (i - 1) * 40;
          const py = this.y + this.h / 2;
          const speed = 10;
          const vx = (i - 1) * speed;
          const vy = -2 + Math.random() * 4;
          if (!game.trimerangs) game.trimerangs = [];
          game.trimerangs.push(new Trimerang(px, py, vx, vy, 'player'));
        }
        this.windDashing = true;
        this.windDashTimer = 30;
        this.vx = this.facing * 18;
        this.vy = 0;
        this.invincibleTimer = 40;
        break;
    }
  }

  addUltimateCharge(amount) {
    if (!this.ultimateReady && !this.ultimateActive) {
      this.ultimateCharge = Math.min(this.ultimateCharge + amount, this.ultimateMax);
      if (this.ultimateCharge >= this.ultimateMax) {
        this.ultimateCharge = this.ultimateMax;
        this.ultimateReady = true;
      }
    }
  }

  switchNinja(type) {
    if (this.ninjaType === type) return;
    this.ninjaType = type;
    this.comboMeter = 0;
    this.comboTimer = 0;
    this.fireArmor = false;
    this.fireArmorTimer = 0;
    this.bubbleBuffTimer = 0;
    this.backstabReady = false;
    this.shadowStealth = 0;
    this.chainStriking = false;
    this.parrying = false;
    this.parryCombo = 0;
    this.parryComboTimer = 0;
    this.windPower = 0;
    this.windDashing = false;
    this.windDashTimer = 0;
  }

  update(game) {
    // Reset ultimate after use
    if (this.ultimateActive) {
      this.ultimateTimer--;
      if (this.ultimateTimer <= 0) {
        this.ultimateActive = false;
        this.ultimateCharge = 0;
        this.ultimateReady = false;
        this.ultimateMax = Math.round(this.ultimateMax * 1.2);
      }
    }
    // Ultimate activation input
    if (this.ultimateReady && !this.ultimateActive) {
      if (consumePress('KeyV') || consumePress('KeyM') || gpJust[3]) {
        this.activateUltimate(game);
      }
    }
    const t = this.type;

    // Bubble buff decay
    if (this.bubbleBuffTimer > 0) this.bubbleBuffTimer--;

    // Movement
    let moveX = 0;
    if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left || gpState.axes[0] < -0.3) moveX = -1;
    if (keys['ArrowRight'] || keys['KeyD'] || touchState.right || gpState.axes[0] > 0.3) moveX = 1;

    if (!this.windDashing && !this.fireDashing) {
      const speedMult = (this.bubbleBuffTimer > 0) ? 1.35 : 1;
      this.vx = moveX * t.speed * speedMult;
      if (moveX !== 0) this.facing = moveX;
    }

    // Jump (double jump + bubble bonus jump)
    const maxJ = this.maxJumps + (this.bubbleBuffTimer > 0 ? 1 : 0);
    const jumpPress = consumePress('ArrowUp') || consumePress('KeyW') || consumePress('Space') || touchJust.up || gpJust[GP_JUMP];
    if (jumpPress && this.jumpsLeft > 0) {
      SFX.jump();
      if (this.onWall !== 0 && !this.grounded) {
        this.vy = t.jumpPower * 0.9;
        this.vx = -this.onWall * 6;
        this.facing = -this.onWall;
        this.jumpsLeft = Math.max(this.jumpsLeft - 1, 1);
        this.onWall = 0;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 4, 2, 6));
      } else {
        const isDoubleJump = !this.grounded && this.jumpsLeft < maxJ;
        this.vy = t.jumpPower * (isDoubleJump ? 0.85 : 1);
        this.grounded = false;
        this.jumpsLeft--;
        if (isDoubleJump) {
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#fff', 5, 2, 8));
        }
      }
    }

    // Ground slam
    const holdingDown = keys['ArrowDown'] || keys['KeyS'] || touchState.down || gpState.buttons[GP_SLAM] || gpState.axes[1] > 0.7;
    if (holdingDown && !this.grounded && !this.slamming) {
      this.slamming = true;
      this.vx = 0;
    }
    if (this.slamming) {
      this.vy = 16;
    }

    // Gravity
    const grav = (this.bubbleBuffTimer > 0) ? GRAVITY * 0.55 : GRAVITY;
    if (!this.slamming && !this.windDashing && !this.stopMidair && !this.fireDashing) {
      this.vy += grav;
    }
    if (this.stopMidair) {
      this.vy += GRAVITY * 0.1;
      this.stopMidairTimer--;
      if (this.stopMidairTimer <= 0) {
        this.stopMidair = false;
      }
    }

    const maxFall = (this.bubbleBuffTimer > 0) ? MAX_FALL * 0.65 : MAX_FALL;
    if (this.vy > maxFall && !this.slamming) this.vy = maxFall;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision
    this.grounded = false;
    this.onWall = 0;
    for (const p of game.platforms) {
      if (rectOverlap(this, p)) {
        if (p.thin) {
          if (this.vy > 0 && !holdingDown && !this.slamming && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.grounded = true;
            this.jumpsLeft = maxJ;
          }
          continue;
        }
        if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
          this.jumpsLeft = maxJ;
        } else if (this.vy < 0 && this.y - this.vy >= p.y + p.h - 4) {
          this.y = p.y + p.h;
          this.vy = 0;
        } else if (this.vx > 0) {
          this.x = p.x - this.w;
          this.onWall = 1;
          if (this.windDashing || this.fireDashing) {
            this.windDashing = false;
            this.fireDashing = false;
            this.windDashTimer = 0;
            this.vx = 0;
            this.nextHitDouble = true;
            triggerHitstop(6);
            this.stopMidair = true;
            this.stopMidairTimer = 20;
            game.effects.push(new Effect(this.x + this.w, this.y + this.h / 2, '#bfb', 12, 5, 15));
          }
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.onWall = -1;
          if (this.windDashing || this.fireDashing) {
            this.windDashing = false;
            this.fireDashing = false;
            this.windDashTimer = 0;
            this.vx = 0;
            this.nextHitDouble = true;
            triggerHitstop(6);
            this.stopMidair = true;
            this.stopMidairTimer = 20;
            game.effects.push(new Effect(this.x, this.y + this.h / 2, '#bfb', 12, 5, 15));
          }
        }
      }
    }

    for (const b of game.stonePillars) {
      if (b.done) continue;
      if (rectOverlap(this, b)) {
        if (this.vy > 0 && this.y + this.h - this.vy <= b.y + 4) {
          this.y = b.y - this.h;
          this.vy = 0;
          this.grounded = true;
          this.jumpsLeft = maxJ;
        } else if (this.vy < 0 && this.y - this.vy >= b.y + b.h - 4) {
          this.y = b.y + b.h;
          this.vy = 0;
        } else if (this.vx > 0) {
          this.x = b.x - this.w;
          this.onWall = 1;
        } else if (this.vx < 0) {
          this.x = b.x + b.w;
          this.onWall = -1;
        }
      }
    }

    // Wall slide
    if (this.onWall !== 0 && !this.grounded && this.vy > 0) {
      const holdingToward = (this.onWall === 1 && moveX > 0) || (this.onWall === -1 && moveX < 0);
      if (holdingToward) {
        this.vy = Math.min(this.vy, 2);
        this.jumpsLeft = maxJ;
        if (game.tick % 8 === 0) {
          game.effects.push(new Effect(
            this.x + (this.onWall > 0 ? this.w : 0), this.y + this.h / 2,
            '#aaa', 2, 1, 6
          ));
        }
      }
    }

    // Ground slam landing
    if (this.slamming && this.grounded) {
      this.slamming = false;
      triggerHitstop(8);
      SFX.slam();
      if (this.ninjaType === 'bubble') {
        for (const b of game.bubbles) {
          if (!b.done) b.pop(game);
        }
      }
      let slamDmg = t.attackDamage + this.bonusDamage + 2;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#fa0', 16, 5, 18));

      // Damage nearby enemies
      for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
        const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          e.takeDamage(slamDmg, game, this.x + this.w / 2);
          e.vy = -5;
          e.vx = Math.sign(dx) * 4;
          if (this.ninjaType === 'fire') {
            e.burnTimer = 150;
          }
          if (this.ninjaType === 'fire') {
            this.comboMeter = Math.min(this.comboMeter + 1, 10);
            this.comboTimer = 180;
            if (this.comboMeter >= 10) {
              e.burnTimer = 150;
            }
            if (this.comboMeter >= 8 && !this.fireArmor) {
              this.fireArmor = true;
              this.fireArmorTimer = 300;
              SFX.armor();
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 15, 4, 20));
            }
          }
        }
        slamDmg *= 0.9;
      }
      // Damage boss
      if (game.boss && !game.boss.dead) {
        const dx = (game.boss.x + game.boss.w / 2) - (this.x + this.w / 2);
        const dy = (game.boss.y + game.boss.h / 2) - (this.y + this.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          game.boss.takeDamage(slamDmg, game, this.x + this.w / 2);
        }
      }
    }

    // Spike collision
    for (const s of game.spikes) {
      if (rectOverlap(this, s)) {
        this.takeDamage(2, game);
        this.vy = -8;
        break;
      }
    }

    // Bubble buff collision
    for (const b of game.bubbles) {
      if (!b.done && !b.consumed && rectOverlap(this, b)) {
        b.consumed = true;
        b.life = Math.min(b.life, 90);
        this.bubbleBuffTimer = 240;
        this.jumpsLeft = Math.min(this.jumpsLeft + 1, maxJ);
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#6af', 8, 3, 12));
        if (!this.ultimateReady && !this.ultimateActive) {
          this.addUltimateCharge(3);
        }
      }
    }

    // Timers
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;

    // Attack
    if (this.attacking) {
      if (!this.ultimateReady && !this.ultimateActive) {
        this.addUltimateCharge(2);
      }
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        if (this.ninjaType === 'shadow' && !this.shadowAttackHit) {
          this.shadowStealth = 0;
          this.backstabReady = false;
          game.effects.push(new TextEffect(this.x + this.w / 2 - 14, this.y - 10, 'MISS!', '#f55'));
          SFX.miss();
        }
        this.attacking = false;
        this.attackBox = null;
        this.countsTowardCombo = true;
      } else {
        // Check hits against enemies
        for (const e of game.enemies) {
          if (!e.dead && this.attackBox && rectOverlap(this.attackBox, e)) {
            let dmg = t.attackDamage + this.bonusDamage;
            if (this.ninjaType === 'shadow') {
              if (this.backstabReady || e.hp <= this.shadowKillThreshold) {
                dmg = 9999;
                SFX.backstab();
                if (this.backstabReady && !this.chainStriking) {
                  this.chainStriking = true;
                  this.chainTimer = 6;
                  this.chainHit = new Set();
                  this.chainHit.add(e);
                }
                this.backstabReady = false;
                this.shadowStealth = 0;
                game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a4e', 20, 5, 20));
              }
            }
            if (this.ninjaType === 'fire') {
              e.burnTimer = 150;
            }
            if (this.ninjaType === 'fire' && e.burnTimer > 0) {
              dmg *= 2;
            }
            if (this.nextHitDouble) {
              dmg *= 2;
              this.nextHitDouble = false;
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 8, 3, 10));
            }
            if (this.bubbleBuffTimer > 0) {
              dmg += 1;
            }
            if (this.ninjaType === 'crystal') {
              dmg += Math.floor(this.parryCombo / 2);
            }
            if (this.ninjaType === 'wind') {
              dmg += this.windPower;
            }
            e.takeDamage(dmg, game, this.x + this.w / 2);
            if (!this.ultimateReady && !this.ultimateActive) {
              this.addUltimateCharge(4);
            }
            e.hitCooldown = 15;

            if (this.ninjaType === 'crystal') {
              for (const other of game.enemies) {
                if (other !== e && !other.dead && other.freezeTimer >= 1) {
                  other.takeDamage(dmg * 0.75, game, this.x + this.w / 2);
                }
              }
            }

            if (this.ninjaType === 'shadow') this.shadowAttackHit = true;
            SFX.hit();
            triggerHitstop(4);
            if (this.ninjaType === 'fire' && this.countsTowardCombo) {
              this.comboMeter = Math.min(this.comboMeter + 1, 10);
              this.countsTowardCombo = false;
              this.comboTimer = 180;
              if (this.comboMeter >= 10) {
                e.burnTimer = 150;
              }
              if (this.comboMeter >= 8 && !this.fireArmor) {
                this.fireArmor = true;
                this.fireArmorTimer = 300;
                SFX.armor();
                game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 15, 4, 20));
              }
            }
          }
        }

        // Attack stone blocks
        for (const b of game.stoneBlocks) {
          if (!b.done && this.attackBox && rectOverlap(this.attackBox, b)) {
            b.vx = this.facing * 8;
            b.vy = -2;
            b.thrown = true;
            b.takeDamage(1, game);
            this.nextHitDouble = true;
          }
        }
        // Pop bubbles with attack
        for (const b of game.bubbles) {
          if (!b.done && this.attackBox && rectOverlap(this.attackBox, b)) {
            b.pop(game);
          }
        }
        // Hit boss
        if (game.boss && !game.boss.dead && this.attackBox && rectOverlap(this.attackBox, game.boss)) {
          let dmg = t.attackDamage + this.bonusDamage;
          if (this.ninjaType === 'shadow' && this.backstabReady) {
            dmg = 9999;
            if (!this.chainStriking) {
              this.chainStriking = true;
              this.chainTimer = 6;
              this.chainHit = new Set();
              this.chainHit.add(game.boss);
            }
            this.backstabReady = false;
            this.shadowStealth = 0;
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a4e', 20, 5, 20));
          }
          if (this.ninjaType === 'fire') {
            if (game.boss.burnTimer > 0) dmg *= 2;
            game.boss.burnTimer = 150;
          }
          if (this.nextHitDouble) { dmg *= 2; this.nextHitDouble = false; game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 8, 3, 10)); }
          if (this.bubbleBuffTimer > 0) dmg += 1;
          if (this.ninjaType === 'crystal') dmg += Math.floor(this.parryCombo / 2);
          if (this.ninjaType === 'wind') dmg += this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2);
          if (!this.ultimateReady && !this.ultimateActive) {
            this.addUltimateCharge(6);
          }
          if (this.ninjaType === 'shadow') this.shadowAttackHit = true;
          triggerHitstop(5);
        }
      }
    }

    if ((consumePress('KeyZ') || consumePress('KeyJ') || consumePress('MouseAttack') || touchJust.attack || gpJust[GP_ATTACK]) && !this.attacking && this.attackCooldown <= 0) {
      this.shadowAttackHit = false;
      this.attack(game);
    }

    // Special ability
    if ((consumePress('KeyX') || consumePress('KeyK') || consumePress('MouseSpecial') || touchJust.special || gpJust[GP_SPECIAL]) && this.specialCooldown <= 0) {
      this.useSpecial(game);
    }

    // Throw shuriken
    if (this.shurikens < this.maxShurikens && game.tick % 150 === 0) {
      this.shurikens = this.maxShurikens;
    }
    if ((consumePress('KeyC') || consumePress('KeyL') || consumePress('MouseShuriken') || touchJust.shuriken || gpJust[GP_SHURIKEN]) && this.shurikens > 0) {
      SFX.shuriken();
      this.shurikens--;
      const dmg = (t.attackDamage + this.bonusDamage) * (this.shurikenLevel);
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      const color = (this.ninjaType === 'fire') ? '#f93' : '#ccc';
      fireProjectileAtNearestEnemy({
        x: cx, y: cy, game, speed: 8, color, damage: dmg, owner: 'player', width: 8, height: 6
      });
      game.effects.push(new Effect(cx, cy, '#ccc', 4, 2, 6));
    }

    // Fire ninja: combo decay & fire armor
    if (this.ninjaType === 'fire') {
      if (this.comboTimer > 0) this.comboTimer--;
      else if (this.comboMeter > 0) { this.comboMeter--; this.comboTimer = 60; }
      if (this.fireArmor) {
        this.fireArmorTimer--;
        if (this.fireArmorTimer <= 0) { this.fireArmor = false; this.comboMeter = 0; }
        if (this.fireArmorTimer % 20 === 0) {
          const t = this.type;
          const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
          const dmg = t.attackDamage + this.bonusDamage + 2;
          const p = fireProjectileAtNearestEnemy({
            x: cx, y: cy, game, speed: 8, color: '#f93', damage: dmg, owner: 'player', width: 14, height: 10, piercing: true
          });
          if (p) p.life = 120;
          game.effects.push(new Effect(cx, cy, '#f80', 4, 2, 6));
        }
        for (const e of game.enemies) {
          if (!e.dead && e.hitCooldown <= 0) {
            const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
            const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 50) {
              e.takeDamage(1, game);
              e.hitCooldown = 30;
            }
          }
        }
      }
    }

    // Shadow ninja: chain strike
    if (this.ninjaType === 'shadow' && this.chainStriking) {
      this.chainTimer--;
      if (this.chainTimer <= 0) {
        let nearest = null;
        let nearDist = 200;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        for (const e of game.enemies) {
          if (e.dead || this.chainHit.has(e)) continue;
          const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearDist = d; nearest = e; }
        }
        if (!nearest && game.boss && !game.boss.dead && !this.chainHit.has(game.boss)) {
          const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearest = game.boss; }
        }
        if (nearest) {
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          this.afterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 12 });
          let dmg = this.type.attackDamage + this.bonusDamage;
          if (this.backstabReady || (nearest.hp !== undefined && nearest.hp <= this.shadowKillThreshold)) {
            dmg = 9999;
          }
          nearest.takeDamage(dmg, game, this.x + this.w / 2);
          this.chainHit.add(nearest);
          SFX.chain();
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a4e', 10, 4, 12));
          triggerHitstop(3);
          this.invincibleTimer = Math.max(this.invincibleTimer, 8);
          this.chainTimer = 6;
        } else {
          this.chainStriking = false;
          this.backstabReady = false;
          this.shadowStealth = 0;
        }
      }
    }

    // Shadow ninja: stealth accumulation
    if (this.ninjaType === 'shadow') {
      const now = game.tick;
      if (now - this.lastDamageTick > 60 && now - this.lastEnemyTouch > 60) {
        this.shadowStealth = Math.min(this.shadowStealth + 1, 300);
        if (this.shadowStealth % 60 === 0 && this.shadowKillThreshold < 15) {
          this.shadowKillThreshold++;
        }
        if (this.shadowStealth > 240 && !this.backstabReady) {
          this.backstabReady = true;
          game.effects.push(new Effect(this.x + this.w / 2, this.y, '#a4e', 10, 3, 15));
        }
      } else {
        this.shadowStealth = 0;
        this.backstabReady = false;
        this.shadowKillThreshold = 0;
      }
      for (const e of game.enemies) {
        if (!e.dead && rectOverlap(this, e)) {
          this.lastEnemyTouch = now;
        }
      }
      if (this.shadowStealth < 180 && (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 1)) {
        this.afterimages.push({ x: this.x, y: this.y, life: 8 });
      }
      this.afterimages = this.afterimages.filter(a => { a.life--; return a.life > 0; });
      if (this.shadowLandTimer > 0) this.shadowLandTimer--;
      if (!this.grounded) {
        this.wasInAir = true;
      } else if (this.wasInAir) {
        this.wasInAir = false;
        this.shadowLandTimer = 12;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#726', 6, 2, 10));
      }
    }

    // Crystal ninja: parry state
    if (this.ninjaType === 'crystal') {
      if (this.parryVisualTimer > 0) this.parryVisualTimer--;
      if (this.parrying) {
        this.parryTimer--;
        if (this.parryTimer <= 0) this.parrying = false;
        for (const proj of game.projectiles) {
          if (proj.owner === 'enemy' && !proj.reflected && !proj.done) {
            const parryBox = {
              x: this.x - 12, y: this.y - 8,
              w: this.w + 24, h: this.h + 16
            };
            if (rectOverlap(proj, parryBox)) {
              let nearestE = null;
              let nearestDist = Infinity;
              for (const e of game.enemies) {
                if (e.dead) continue;
                const edx = (e.x + e.w / 2) - (this.x + this.w / 2);
                const edy = (e.y + e.h / 2) - (this.y + this.h / 2);
                const ed = Math.sqrt(edx * edx + edy * edy);
                if (ed < nearestDist) { nearestDist = ed; nearestE = e; }
              }
              if (game.boss && !game.boss.dead) {
                const bdx = (game.boss.x + game.boss.w / 2) - (this.x + this.w / 2);
                const bdy = (game.boss.y + game.boss.h / 2) - (this.y + this.h / 2);
                const bd = Math.sqrt(bdx * bdx + bdy * bdy);
                if (bd < nearestDist) { nearestDist = bd; nearestE = game.boss; }
              }
              const reflectSpeed = 6;
              if (nearestE) {
                const tdx = (nearestE.x + nearestE.w / 2) - proj.x;
                const tdy = (nearestE.y + nearestE.h / 2) - proj.y;
                const td = Math.sqrt(tdx * tdx + tdy * tdy);
                proj.vx = (tdx / td) * reflectSpeed;
                proj.vy = (tdy / td) * reflectSpeed;
              } else {
                proj.vx = this.facing * reflectSpeed;
                proj.vy = -1;
              }
              proj.owner = 'player';
              proj.damage += this.parryCombo;
              proj.reflected = true;
              proj.color = '#0ff';
              SFX.reflect();
              this.parryCombo++;
              this.parryComboTimer = 300;
              this.nextHitDouble = true;
              game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 12, 4, 15));
            }
          }
        }
      }
      if (this.parryComboTimer > 0) this.parryComboTimer--;
      else this.parryCombo = 0;
    }

    // Fire Ninja dash logic
    if (this.ninjaType === 'fire' && this.fireDashing) {
      this.fireDashTimer--;
      this.vx = this.facing * 15;
      this.vy = 0;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 12, 5, 15));

      for (const e of game.enemies) {
        if (!e.dead && e.damageIframes <= 0 && rectOverlap(this, e)) {
          const t = this.type;
          const dmg = t.attackDamage + this.bonusDamage;
          e.takeDamage(dmg, game, this.x + this.w / 2);
          e.hitCooldown = 15;
          triggerHitstop(4);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#f93', 10, 4, 12));
        }
      }

      if (this.fireDashTimer <= 0) {
        this.fireDashing = false;
        this.vx = 0;
        if (this._fireballPending) {
          const fx = this.x + this.facing * (this.w + 12);
          const fy = this.y + this.h / 2;
          const speed = 12 * this.facing;
          const proj = new Projectile(fx, fy, speed, 0, '#f93', 6, 'player');
          proj.w = 22;
          proj.h = 14;
          proj.piercing = true;
          game.projectiles.push(proj);
          game.effects.push(new Effect(fx, fy, '#f80', 10, 3, 14));
          this._fireballPending = false;
        }
      }
    }

    // Wind ninja: passive power buildup & dash tracking
    if (this.ninjaType === 'wind') {
      if (this.windDashTimer > 0) this.windDashTimer--;
      if (this.windDashing && this.windDashTimer <= 0) {
        this.windDashing = false;
        this.stopMidair = true;
        this.stopMidairTimer = 20;
        this.nextHitDouble = true;
      }
      if (game.tick - this.lastDamageTick > 60) {
        if (game.tick % 120 === 0) {
          this.windPower = Math.min(this.windPower + 1, 10);
        }
      }
      if (this.windDashing) {
        this.windTrails.push({ x: this.x, y: this.y, life: 15 });
        for (const e of game.enemies) {
          if (!e.dead && e.damageIframes <= 0 && rectOverlap(this, e)) {
            const dmg = t.attackDamage + this.bonusDamage + this.windPower;
            e.takeDamage(dmg, game, this.x + this.w / 2);
            e.hitCooldown = 15;
            triggerHitstop(4);
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#bfb', 10, 4, 12));
          }
        }
      } else if (Math.abs(this.vx) > 3) {
        this.windTrails.push({ x: this.x, y: this.y, life: 8 });
      }
      this.windTrails = this.windTrails.filter(t => { t.life--; return t.life > 0; });
      if (this.windPower >= 10) {
        const angle = Math.random() * Math.PI * 2;
        this.windFullTrails.push({
          x: this.x + this.w / 2,
          y: this.y + this.h / 2,
          angle: angle,
          age: 0,
          life: 22
        });
        if (this.windFullTrails.length > 16) this.windFullTrails.shift();
      } else {
        this.windFullTrails = [];
      }
      for (const t of this.windFullTrails) t.life--;
      this.windFullTrails = this.windFullTrails.filter(t => t.life > 0);
    }

    // Fall into pit
    if (this.y > 2000) {
      this.x = 100; this.y = 200;
      this.vx = 0; this.vy = 0;
      this.takeDamage(2, game);
    }
  }

  attack(game) {
    this.attacking = true;
    this.attackTimer = 10;
    this.attackCooldown = 15;
    SFX.attack();

    if (this.ninjaType === 'wind') {
      this.windDashing = true;
      this.windDashTimer = 15;
      this.vx = this.facing * 15;
      this.vy = 0;
      this.invincibleTimer = 30;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 12, 5, 15));
    }

    if (this.ninjaType === 'bubble') {
      for (let i = 0; i < 5; i++) {
        const offY = (i === 0 ? -6 : 8) + (Math.random() - 0.5) * 4;
        game.bubbles.push(new SmallBubble(
          this.x + this.w / 2 + this.facing * 80 + Math.random() * 6,
          this.y + this.h / 2 + offY,
          this.facing
        ));
      }
    }

    const shadowFullStealth = this.ninjaType === 'shadow' && this.shadowStealth >= 240;
    const reach = shadowFullStealth ? 50 : 30;
    const vertExtra = shadowFullStealth ? 10 : 0;
    this.attackBox = {
      x: this.facing > 0 ? this.x + this.w : this.x - reach,
      y: this.y + 4 - vertExtra,
      w: reach,
      h: this.h - 8 + vertExtra * 2
    };
    game.effects.push(new Effect(
      this.attackBox.x + (this.facing > 0 ? reach / 2 : reach / 2),
      this.attackBox.y + (this.h - 8) / 2,
      this.type.accentColor, 5, 3, 8
    ));
  }

  useSpecial(game) {
    this.specialCooldown = 60;
    SFX.special();
    switch (this.ninjaType) {
      case 'fire': {
        this.fireDashing = true;
        this.fireDashTimer = 10;
        this.vx = this.facing * 15;
        this.vy = 0;
        this.invincibleTimer = 30;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f93', 12, 5, 15));
        this._fireballPending = true;
        break;
      }
      case 'earth': {
        let spawnX = this.x + this.facing * 40;
        let baseY = this.y;
        let supportY = null;
        let minDist = TILE * 1.5;
        for (const other of game.stoneBlocks) {
          if (!other.done && Math.abs(other.x - spawnX) < TILE) {
            let dist = Math.abs(other.y - baseY);
            if (dist < minDist) {
              minDist = dist;
              supportY = other.y;
            }
          }
        }
        for (const p of game.platforms) {
          if (!p.thin && spawnX + TILE > p.x && spawnX < p.x + p.w) {
            let dist = Math.abs(p.y - baseY);
            if (dist < minDist) {
              minDist = dist;
              supportY = p.y;
            }
          }
        }
        if (supportY === null) supportY = baseY;
        let constructType = Math.floor(Math.random() * 3);
        let construct;
        if (constructType === 0) {
          let pillarY = supportY - TILE * 3;
          construct = new StonePillar(spawnX, pillarY + TILE);
          game.stonePillars.push(construct);
        } else if (constructType === 1) {
          construct = new StoneSpike(spawnX, supportY - TILE + 4);
        } else {
          construct = new StoneGolem(spawnX, supportY - TILE, this.facing);
        }
        game.stoneBlocks.push(construct);
        game.effects.push(new Effect(spawnX + TILE / 2, supportY, '#a87', 8, 2, 12));
        break;
      }
      case 'bubble':
        for (let i = 0; i < 3; i++) {
          const randOffX = randInt(-30, 30);
          const randOffY = randInt(-20, 20);
          game.bubbles.push(new Bubble(
            this.x + this.facing * (50 + i * 50) + randOffX,
            this.y - 20 - i * 25 + randOffY
          ));
        }
        this.nextHitDouble = true;
        break;
      case 'shadow':
        this.x += this.facing * 300;
        this.y -= 30;
        this.vy = 0;
        this.invincibleTimer = 15;
        this.stopMidair = true;
        this.stopMidairTimer = 20;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a4e', 12, 3, 12));
        break;
      case 'crystal': {
        let canParry = false;
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (e.type === 'shooter' || e.type === 'flyshooter') continue;
          const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
          const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
          if (Math.sqrt(dx * dx + dy * dy) < 80 && e.hitCooldown <= 0) { canParry = true; break; }
        }
        if (!canParry && game.boss && !game.boss.dead) {
          const dx = (game.boss.x + game.boss.w / 2) - (this.x + this.w / 2);
          const dy = (game.boss.y + game.boss.h / 2) - (this.y + this.h / 2);
          if (Math.sqrt(dx * dx + dy * dy) < 100 && game.boss.hitCooldown <= 0) canParry = true;
        }
        this.parryVisualTimer = 20;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, canParry ? '#aff' : '#889', 12, 4, 15));
        if (!canParry) { SFX.parryFail(); break; }
        SFX.parry();
        this.parrying = true;
        this.parryTimer = 20;
        this.nextHitDouble = true;
        for (const e of game.enemies) {
          if (e.dead) continue;
          const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
          const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const pushDir = dx >= 0 ? 1 : -1;
            e.vx = pushDir * 14;
            e.vy = -6;
            e.freezeTimer = 45;
            this.parryCombo++;
            this.parryComboTimer = 300;
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#0ff', 6, 3, 10));
          }
        }
        if (game.boss && !game.boss.dead) {
          const dx = (game.boss.x + game.boss.w / 2) - (this.x + this.w / 2);
          const dy = (game.boss.y + game.boss.h / 2) - (this.y + this.h / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            game.boss.vx = (dx >= 0 ? 1 : -1) * 10;
            game.boss.vy = -4;
            game.boss.freezeTimer = 30;
            this.parryCombo++;
            this.parryComboTimer = 300;
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#0ff', 8, 3, 12));
          }
        }
        break;
      }
      case 'wind':
        if (!game.trimerangs) game.trimerangs = [];
        const px = this.x + this.w / 2 + this.facing * 32;
        const py = this.y + this.h / 2;
        const speed = 7 + this.windPower * 0.5;
        const vx = this.facing * speed;
        const vy = -2 + Math.random() * 4;
        game.trimerangs.push(new Trimerang(px, py, vx, vy, 'player'));
        SFX.special();
        break;
    }
  }

  takeDamage(amount, game) {
    if (this.invincibleTimer > 0) return;
    if (this.ninjaType === 'wind' && this.windPower >= 10 && Math.random() < 0.5) {
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'EVADE', '#8cf'));
      triggerHitstop(2);
      return;
    }
    if (this.ninjaType === 'wind' && this.windPower >= 10 && typeof SFX !== 'undefined' && SFX.play) {
      SFX.play(80, 'sawtooth', 0.18, 0.22, -60);
      SFX.noise(0.18, 0.18);
    }
    if (this.ninjaType === 'wind' && game.trimerangs) {
      for (const t of game.trimerangs) t.done = true;
    }
    if (this.ninjaType === 'crystal' && this.parrying) return;
    if (this.fireArmor || this.chainStriking) return;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 6, 2, 10));
      if (amount <= 0) {
        this.invincibleTimer = 45;
        this.lastDamageTick = game.tick;
        this.windPower = 0;
        triggerHitstop(4);
        return;
      }
    }
    this.hp -= amount;
    this.invincibleTimer = 45;
    this.lastDamageTick = game.tick;
    this.windPower = 0;
    SFX.playerHurt();
    triggerHitstop(6);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 8, 3, 12));
    if (this.hp <= 0) {
      this.hp = this.maxHp;
      this.x = 100; this.y = 200;
      this.vx = 0; this.vy = 0;
      game.deaths++;
      game.lives--;
      if (game.lives <= 0) {
        game.gameOver = true;
      }
    }
  }

  render(ctx, cam) {
    const t = this.type;
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // Wind trails
    if (this.ninjaType === 'wind') {
      for (const wt of this.windTrails) {
        ctx.globalAlpha = wt.life / 15 * 0.4;
        ctx.fillStyle = '#bfb';
        ctx.fillRect(wt.x - cam.x, wt.y - cam.y, this.w, this.h);
      }
      if (this.windPower >= 10 && this.windFullTrails && this.windFullTrails.length > 0) {
        for (const t of this.windFullTrails) {
          t.age = (t.age || 0) + 1;
          const progress = t.age / 22;
          const maxOutward = 480;
          const outwardX = t.x + Math.cos(t.angle) * maxOutward * progress;
          const outwardY = t.y + Math.sin(t.angle) * maxOutward * progress;
          ctx.save();
          ctx.globalAlpha = 0.07 * (t.life / 22);
          ctx.fillStyle = '#bff';
          ctx.fillRect(
            outwardX - cam.x - this.w / 2,
            outwardY - cam.y - this.h / 2,
            this.w,
            this.h
          );
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Shadow afterimages
    if (this.ninjaType === 'shadow') {
      const stealthFade = Math.max(0, 1 - this.shadowStealth / 200);
      for (const a of this.afterimages) {
        ctx.globalAlpha = (a.life / 20) * 0.2 * stealthFade;
        ctx.fillStyle = '#527';
        ctx.fillRect(a.x - cam.x, a.y - cam.y, this.w, this.h);
      }
      ctx.globalAlpha = 1;
    }

    // Shadow progressive invisibility
    if (this.ninjaType === 'shadow') {
      const stealthRatio = Math.min(this.shadowStealth / 300, 1);
      let shadowAlpha = 0.6 * (1 - stealthRatio);
      if (this.shadowLandTimer > 0) {
        shadowAlpha = Math.max(shadowAlpha, 0.25 * (this.shadowLandTimer / 12));
      }
      if (shadowAlpha <= 0.01) {
        ctx.globalAlpha = 1;
        if (this.backstabReady) {
          ctx.fillStyle = '#f0f';
          ctx.font = '10px monospace';
          ctx.fillText('BACKSTAB!', sx - 8, sy - 8);
        }
        if (this.attacking && this.attackBox) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = this.type.accentColor;
          ctx.fillRect(this.attackBox.x - cam.x, this.attackBox.y - cam.y, this.attackBox.w, this.attackBox.h);
          ctx.globalAlpha = 1;
        }
        return;
      }
      ctx.globalAlpha = shadowAlpha;
    }

    // Blink when invincible
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 3) % 2) {
      ctx.globalAlpha = 0.3;
    }

    // Fire armor glow
    if (this.fireArmor) {
      ctx.fillStyle = 'rgba(255,150,50,0.35)';
      ctx.fillRect(sx - 4, sy - 4, this.w + 8, this.h + 8);
    }

    // Bubble buff glow
    if (this.bubbleBuffTimer > 0) {
      ctx.fillStyle = 'rgba(80,160,255,0.25)';
      ctx.fillRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
    }

    // Body
    ctx.fillStyle = t.color;
    ctx.fillRect(sx, sy, this.w, this.h);

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeX = this.facing > 0 ? sx + 14 : sx + 4;
    ctx.fillRect(eyeX, sy + 8, 6, 6);
    ctx.fillStyle = '#222';
    ctx.fillRect(this.facing > 0 ? eyeX + 3 : eyeX, sy + 10, 3, 3);

    // Headband
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + 5, this.w, 3);

    // Backstab indicator
    if (this.ninjaType === 'shadow' && this.backstabReady) {
      ctx.fillStyle = '#f0f';
      ctx.font = '10px monospace';
      ctx.fillText('BACKSTAB!', sx - 8, sy - 8);
    }

    // Fire armor indicator
    if (this.fireArmor) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#f93';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ARMOR!', sx - 4, sy - 8);
      ctx.globalAlpha = 1;
    }

    // Wind power indicator
    if (this.ninjaType === 'wind' && this.windPower > 0) {
      ctx.strokeStyle = `rgba(180,255,180,${0.3 + this.windPower * 0.07})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
    }

    // Parry shield
    if (this.ninjaType === 'crystal' && this.parryVisualTimer > 0) {
      ctx.strokeStyle = this.parrying ? '#0ff' : '#667';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - 8, sy - 4, this.w + 16, this.h + 8);
    }

    // Wall slide indicator
    if (this.onWall !== 0 && !this.grounded && this.vy > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const wx = this.onWall > 0 ? sx + this.w - 2 : sx;
      ctx.fillRect(wx, sy + 4, 3, this.h - 8);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(200,200,200,0.3)';
        ctx.fillRect(wx, sy + 6 + i * 9, 2, 5);
      }
    }

    ctx.globalAlpha = 1;

    // Attack slash
    if (this.attacking && this.attackBox) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const arcCx = this.attackBox.x - cam.x + this.attackBox.w / 2;
      const arcCy = this.attackBox.y - cam.y + this.attackBox.h / 2;
      ctx.translate(arcCx, arcCy);
      if (!this._arcRandomized || !this.attacking) {
        this._lastArcAngle = (Math.random() - 0.5) * 1.2;
        this._arcRandomized = true;
      }
      if (!this.attacking) this._arcRandomized = false;
      ctx.rotate((this.facing > 0 ? -0.25 : Math.PI + 0.25) + this._lastArcAngle);
      const arcStart = Math.PI * 0.15;
      const arcEnd = Math.PI * 0.85;
      const arcR = this.attackBox.w * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, arcStart, arcEnd, false);
      ctx.arc(0, 0, this.attackBox.w * 0.45, arcEnd, arcStart, true);
      ctx.closePath();
      ctx.fillStyle = t.accentColor;
      ctx.shadowColor = t.accentColor;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Katana blade
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.rotate(0);
      ctx.beginPath();
      ctx.moveTo(-8, -2.5);
      ctx.quadraticCurveTo(2, -7, 18, 0);
      ctx.lineTo(18, 0.8);
      ctx.quadraticCurveTo(2, 6, -8, 2.5);
      ctx.closePath();
      ctx.fillStyle = '#e0e0e0';
      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, -1.2);
      ctx.quadraticCurveTo(2, -5, 17, 0.2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
      // Hilt
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.rotate(0);
      ctx.fillStyle = t.accentColor;
      ctx.fillRect(-12, -7, 6, 14);
      ctx.restore();
      ctx.restore();
    }
  }
}
