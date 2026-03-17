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
    this.invincibleTimer = 90;
    this.bonusDamage = 0;
    this.godMode = false;

    // Ultimate system
    this.ultimateCharge = 0;
    this.ultimateMax = 500;
    this.ultimateReady = false;
    this.ultimateActive = false;
    this.ultimateTimer = 0;

    // Ultimate cutscene (Rondo of Blood style)
    this.ultCutscene = false;
    this.ultCutsceneTimer = 0;
    this.ultFloatY = 0; // target Y during float

    // Fire ultimate: meteors
    this.fireMeteors = [];
    this.fireMeteorTimer = 0;

    // Earth ultimate: stone golem mecha
    this.earthGolem = null; // { timer, facing, punchTimer, shootTimer, x, y, w, h, hp }

    // Bubble ultimate: ride inside a big bubble
    this.bubbleRide = null; // { timer, hp, maxHp, x, y, w, h, facing, contactCd, trailTimer }

    // Shadow ultimate: darkness + eyes
    this.shadowDarkness = 0;    // 0-1 overlay alpha
    this.shadowEyesTimer = 0;
    this.shadowUltBuff = false;  // enhanced stealth/chain after cutscene

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
    this.chainLastHit = null;
    this.shadowAttackHit = false;

    // Crystal ninja state
    this.parrying = false;
    this.parryTimer = 0;
    this.parryVisualTimer = 0;
    this.parryCombo = 0;
    this.parryComboTimer = 0;
    this.crystalClones = null;
    this.crystalShatter = 0;
    this.crystalShards = null;

    // Wind ninja state
    this.windPower = 0;
    this.windFirstDodge = true;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.windTrails = [];
    this.windFullTrails = [];

    // Storm ninja state
    this.stormChaining = false;
    this.stormChainTargets = [];
    this.stormChainTimer = 0;
    this.stormChainHit = new Set();
    this.stormAfterimages = [];
    this.stormRaindrops = []; // rain visual during ultimate
    this.stormLightningFlash = 0;

    // Next-hit-double system
    this.nextHitDouble = false;

    // Shadow instakill threshold (gradual, caps at 15)
    this.shadowKillThreshold = 0;

    // Shurikens (rechargeable)
    this.shurikens = 3;

    // Elemental status effects from enemy attacks
    this.statusBurn = 0;    // fire DOT timer
    this.statusFreeze = 0;  // crystal/water slow timer
    this.statusFloat = 0;   // wind reduced gravity timer
    this.statusParalyse = 0; // lightning: steel tools cause stun
    this.statusStun = 0;    // brief full-stop stun (from paralyse)
    this.statusHeavy = 0;   // earth: heavier gravity
    this.statusSteel = 0;   // steel: invulnerable but can't move
    this.freezeNudge = 0;   // visual nudge from mashing out of freeze
    this.maxShurikens = 3;
    this.shurikenLevel = 1;
    this.shurikenRechargeTimer = 0;

    // Death respawn delay
    this.deathTimer = 0;

    // Ground slam
    this.slamming = false;

    // Stop midair
    this.stopMidair = false;
    this.stopMidairTimer = 0;

    // Defeated boss/enemy tracking (for earth construct unlocks)
    this.defeatedBossTypes = new Set();
    this.defeatedDeflector = false;
  }

  get type() { return NINJA_TYPES[this.ninjaType]; }

  // Ultimate activation — starts the Rondo-of-Blood-style cutscene float
  activateUltimate(game) {
    this.ultimateActive = true;
    this.ultimateReady = false;
    this.ultCutscene = true;
    this.ultCutsceneTimer = 60; // ~1 second float-up before the effect
    this.ultFloatY = this.y - 60; // float up 60px
    this.vx = 0;
    this.vy = 0;
    this.invincibleTimer = 999; // invincible during cutscene
    SFX.victory();
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 30, 8, 30));
    recordUltimate(this.ninjaType);
  }

  // Called when float phase ends — triggers the actual ultimate effect
  triggerUltimateEffect(game) {
    this.ultCutscene = false;
    switch (this.ninjaType) {
      case 'fire':
        // Meteors rain from the sky — 12 meteors over 3 seconds + 1 big finisher
        this.ultimateTimer = 210;
        this.fireArmor = true;
        this.fireArmorTimer = 270;
        this.fireMeteors = [];
        this.fireMeteorTimer = 0;
        for (let i = 0; i < 12; i++) {
          const delay = i * 15;
          // Target enemies when possible, otherwise scatter randomly
          const aliveEnemies = game.enemies.filter(e => !e.dead);
          let targetX, targetY;
          if (aliveEnemies.length > 0 && i < 8) {
            const target = aliveEnemies[i % aliveEnemies.length];
            targetX = target.x + target.w / 2 + randInt(-30, 30);
            targetY = target.y + target.h / 2 + randInt(-10, 10);
          } else if (game.boss && !game.boss.dead && i >= 8) {
            targetX = game.boss.x + game.boss.w / 2 + randInt(-20, 20);
            targetY = game.boss.y + game.boss.h / 2 + randInt(-10, 10);
          } else {
            targetX = game.camera.x + randInt(100, CANVAS_W - 100);
            targetY = randInt(350, 480);
          }
          const fromLeft = Math.random() < 0.5;
          const offsetX = randInt(150, 300) * (fromLeft ? -1 : 1);
          const startX = targetX + offsetX;
          const startY = game.camera.y - randInt(40, 120);
          this.fireMeteors.push({
            delay,
            x: startX,
            y: startY,
            targetX,
            targetY,
            active: false,
            done: false,
            trail: [],
            speed: 6 + Math.random() * 3,
            size: 10 + randInt(0, 8),
            fromLeft
          });
        }
        // Big finisher meteor — targets center of action
        {
          const bigDelay = 12 * 15 + 20;
          let bigTargetX, bigTargetY;
          if (game.boss && !game.boss.dead) {
            bigTargetX = game.boss.x + game.boss.w / 2;
            bigTargetY = game.boss.y + game.boss.h / 2;
          } else {
            const alive = game.enemies.filter(e => !e.dead);
            if (alive.length > 0) {
              let cx = 0, cy = 0;
              for (const e of alive) { cx += e.x + e.w / 2; cy += e.y + e.h / 2; }
              bigTargetX = cx / alive.length;
              bigTargetY = cy / alive.length;
            } else {
              bigTargetX = this.x + this.w / 2;
              bigTargetY = this.y + this.h / 2 + 40;
            }
          }
          const bigFromLeft = Math.random() < 0.5;
          this.fireMeteors.push({
            delay: bigDelay,
            x: bigTargetX + randInt(200, 400) * (bigFromLeft ? -1 : 1),
            y: game.camera.y - randInt(80, 160),
            targetX: bigTargetX,
            targetY: bigTargetY,
            active: false,
            done: false,
            trail: [],
            speed: 4,
            size: 28,
            fromLeft: bigFromLeft,
            big: true
          });
        }
        SFX.bossSpawn();
        break;

      case 'earth':
        // Summon a Megaman X4-style stone golem mecha that the player rides
        this.ultimateTimer = 480; // 8 seconds
        this.earthGolem = {
          timer: 480,
          facing: this.facing,
          punchTimer: 0,
          punchCooldown: 0,
          shootTimer: 0,
          shootCooldown: 0,
          contactCd: 0,
          x: this.x - 20,
          y: this.y - 32,
          w: 64,
          h: 80,
          hp: 50,
          maxHp: 50,
          hovering: true,
          punchHit: false
        };
        SFX.slam();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4a8', 25, 6, 20));
        break;

      case 'bubble':
        // Ride inside a big bubble
        this.ultimateTimer = 420; // 7 seconds
        this.bubbleRide = {
          timer: 420,
          hp: 15,
          maxHp: 15,
          x: this.x - 26,
          y: this.y - 26,
          w: 76,
          h: 76,
          facing: this.facing,
          contactCd: 0,
          trailTimer: 0
        };
        SFX.special();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 25, 6, 20));
        break;

      case 'shadow':
        // Screen goes dark, glowing eyes appear
        this.ultimateTimer = 360; // 6 seconds of buff after cutscene
        this.shadowDarkness = 0;
        this.shadowEyesTimer = 60; // eyes visible for 60 frames
        this.shadowUltBuff = true;
        // Massive initial shadow strike around the player
        damageInRadius(game, this.x + this.w / 2, this.y + this.h / 2, 200, (this.type.attackDamage + this.bonusDamage) * 3);
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a4e', 40, 10, 30));
        this.shadowStealth = 300;
        this.backstabReady = true;
        SFX.backstab();
        break;

      case 'crystal':
        // Shatter glass effect + spawn two afterimage clones
        this.ultimateTimer = 480; // 8 seconds of clone action
        this.crystalShatter = 30; // 30 frames of shatter cutscene
        // Freeze all enemies during shatter
        for (const e of game.enemies) {
          if (!e.dead) e.freezeTimer = 90;
        }
        if (game.boss && !game.boss.dead) game.boss.freezeTimer = 60;
        // Create glass shards for visual
        this.crystalShards = [];
        for (let i = 0; i < 24; i++) {
          this.crystalShards.push({
            x: this.x + this.w / 2 + randInt(-40, 40),
            y: this.y + this.h / 2 + randInt(-40, 40),
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            size: 4 + Math.random() * 8,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.3,
            life: 30
          });
        }
        // Spawn two afterimage clones (floating side by side)
        this.crystalClones = [
          { offsetX: -60, offsetY: -10, alpha: 0.6 },
          { offsetX: 60, offsetY: -10, alpha: 0.6 }
        ];
        SFX.parry();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 30, 8, 25));
        break;

      case 'wind':
        this.ultimateTimer = 180;
        this.windPower = 10;
        if (!game.trimerangs) game.trimerangs = [];
        // Spawn +3 new trimerangs
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const px = this.x + this.w / 2 + Math.cos(angle) * 40;
          const py = this.y + this.h / 2 + Math.sin(angle) * 40;
          game.trimerangs.push(new Trimerang(px, py, Math.cos(angle) * 4, Math.sin(angle) * 4, 'player'));
        }
        // Set ALL active trimerangs to orbit mode
        const totalTrimerangs = game.trimerangs.length;
        for (let i = 0; i < totalTrimerangs; i++) {
          const t = game.trimerangs[i];
          if (t.done) continue;
          t.orbiting = true;
          t.orbitTimer = 90; // orbit for ~1.5 seconds
          t.orbitAngle = (i / totalTrimerangs) * Math.PI * 2;
          t.orbitRadius = 50 + (i % 3) * 20;
          t.burstAngle = (i / totalTrimerangs) * Math.PI * 2; // spread evenly outward
          t.hitSet.clear();
        }
        SFX.bossSpawn();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 25, 6, 20));
        this.invincibleTimer = 40;
        break;

      case 'storm':
        // Rain ultimate: soak all enemies, no damage
        this.ultimateTimer = 360; // 6 seconds of rain
        this.stormRaindrops = [];
        // Immediately soak all visible enemies
        for (const e of game.enemies) {
          if (!e.dead) e.soakTimer = 420;
        }
        if (game.boss && !game.boss.dead) game.boss.soakTimer = 420;
        SFX.special();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#48f', 25, 6, 20));
        break;
    }
    // End invincibility boost (set to just a brief window after cutscene)
    if (this.ninjaType !== 'wind') {
      this.invincibleTimer = 30;
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
    if (this.ultCutscene || this.earthGolem || this.bubbleRide) return; // Can't switch during ultimate cutscene, golem, or bubble ride
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
    this.crystalClones = null;
    this.crystalShatter = 0;
    this.crystalShards = null;
    this.windPower = 0;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.stormChaining = false;
    this.stormChainHit = new Set();
    this.stormAfterimages = [];
  }

  update(game) {
    // ── Ultimate cutscene float phase ──
    if (this.ultCutscene) {
      this.ultCutsceneTimer--;
      // Float upward smoothly
      this.y = lerp(this.y, this.ultFloatY, 0.08);
      this.vx = 0;
      this.vy = 0;
      // Sparkle effects during float
      if (this.ultCutsceneTimer % 6 === 0) {
        const col = this.type.color;
        game.effects.push(new Effect(
          this.x + this.w / 2 + randInt(-20, 20),
          this.y + this.h / 2 + randInt(-20, 20),
          col, 6, 2, 12
        ));
      }
      if (this.ultCutsceneTimer <= 0) {
        this.triggerUltimateEffect(game);
      }
      return; // Skip all normal update during cutscene
    }

    // ── Death respawn delay ──
    if (this.deathTimer > 0) {
      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.hp = this.maxHp;
        this.x = 100; this.y = 200;
        this.vx = 0; this.vy = 0;
        this.invincibleTimer = 90;
        this.statusBurn = 0; this.statusFreeze = 0; this.statusFloat = 0;
        this.statusParalyse = 0; this.statusStun = 0; this.statusHeavy = 0; this.statusSteel = 0;
      }
      return;
    }

    // ── Ultimate active updates ──
    if (this.ultimateActive) {
      this.ultimateTimer--;

      // Fire: update meteors
      if (this.ninjaType === 'fire') {
        this.fireMeteorTimer++;
        for (const m of this.fireMeteors) {
          if (m.done) continue;
          if (this.fireMeteorTimer < m.delay) continue;
          if (!m.active) {
            m.active = true;
            // Start from above at diagonal
            const offsetX = randInt(150, 300) * (m.fromLeft ? -1 : 1);
            m.x = m.targetX + offsetX;
            m.y = game.camera.y - randInt(40, 80);
          }
          // Move toward ground at angle
          const dx = m.targetX - m.x;
          const dy = m.targetY - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0) {
            m.x += (dx / d) * m.speed;
            m.y += (dy / d) * m.speed;
          }
          // Trail
          m.trail.push({ x: m.x, y: m.y, life: 15 });
          // Impact
          if (m.y >= m.targetY - 10 || d < 12) {
            m.done = true;
            if (m.big) {
              damageInRadius(game, m.targetX, m.targetY, 150, (this.type.attackDamage + this.bonusDamage + 6) * 3, m.targetX);
              if (game.boss && game.boss.health <= 0) {
                game.effects.push(new KanjiEffect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f33', game.camera));
              }
              game.effects.push(new Effect(m.targetX, m.targetY, '#fff', 30, 10, 24));
              game.effects.push(new Effect(m.targetX, m.targetY, '#f93', 40, 8, 22));
              game.effects.push(new Effect(m.targetX, m.targetY, '#f44', 25, 6, 18));
              for (let i = 0; i < 12; i++) {
                game.effects.push(new Effect(
                  m.targetX + randInt(-60, 60), m.targetY + randInt(-40, 20),
                  i % 2 === 0 ? '#f93' : '#f44', 8 + randInt(0, 6), 3, 14
                ));
              }
              SFX.bossSpawn();
              triggerHitstop(12);
            } else {
              damageInRadius(game, m.targetX, m.targetY, 80, this.type.attackDamage + this.bonusDamage + 6, m.targetX);
              game.effects.push(new Effect(m.targetX, m.targetY, '#f93', 20, 6, 18));
              game.effects.push(new Effect(m.targetX, m.targetY, '#f44', 14, 4, 12));
              SFX.slam();
              triggerHitstop(4);
            }
          }
        }
        // Decay trails
        for (const m of this.fireMeteors) {
          for (const t of m.trail) t.life--;
          m.trail = m.trail.filter(t => t.life > 0);
        }
      }

      // Earth: update golem mecha
      if (this.ninjaType === 'earth' && this.earthGolem) {
        const g = this.earthGolem;
        g.timer--;
        // Player is inside the golem — move golem with input
        let moveX = 0;
        let moveY = 0;
        if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left || gpState.axes[0] < -0.3) moveX = -1;
        if (keys['ArrowRight'] || keys['KeyD'] || touchState.right || gpState.axes[0] > 0.3) moveX = 1;
        if (keys['ArrowUp'] || keys['KeyW'] || touchState.up || gpState.axes[1] < -0.3) moveY = -1;
        if (keys['ArrowDown'] || keys['KeyS'] || touchState.down || gpState.axes[1] > 0.3) moveY = 1;
        if (moveX !== 0) g.facing = moveX;
        g.x += moveX * 2.5;
        g.y += moveY * 2.5 + Math.sin(game.tick * 0.05) * 0.5;
        // Keep golem within bounds
        g.x = Math.max(0, Math.min(game.levelW - g.w, g.x));
        g.y = Math.max(-50, Math.min(480 - g.h, g.y));
        // Player position follows golem center
        this.x = g.x + g.w / 2 - this.w / 2;
        this.y = g.y + g.h - this.h - 8;
        this.vy = 0;
        this.grounded = false;

        // Contact damage
        if (g.contactCd > 0) g.contactCd--;
        if (g.contactCd <= 0) {
          const golemBox = { x: g.x, y: g.y, w: g.w, h: g.h };
          for (const e of game.enemies) {
            if (!e.dead && rectOverlap(golemBox, e)) {
              e.takeDamage(this.type.attackDamage + this.bonusDamage + 3, game, g.x + g.w / 2);
              const kbDir = Math.sign(e.x + e.w / 2 - (g.x + g.w / 2)) || 1;
              e.vx = kbDir * 6;
              e.vy = -4;
              g.contactCd = 15;
              break;
            }
          }
          if (g.contactCd <= 0 && game.boss && !game.boss.dead && rectOverlap(golemBox, game.boss)) {
            game.boss.takeDamage(this.type.attackDamage + this.bonusDamage + 3, game, g.x + g.w / 2);
            g.contactCd = 15;
          }
        }

        // Punch attack (Z/J or mouse)
        if (g.punchCooldown > 0) g.punchCooldown--;
        if (g.punchTimer > 0) {
          g.punchTimer--;
          if (!g.punchHit && g.punchTimer < 10) {
            g.punchHit = true;
            const punchX = g.x + (g.facing > 0 ? g.w : -40);
            const punchY = g.y + 20;
            const punchBox = { x: punchX, y: punchY, w: 48, h: 40 };
            for (const e of game.enemies) {
              if (!e.dead && rectOverlap(punchBox, e)) {
                e.takeDamage((this.type.attackDamage + this.bonusDamage) * 3, game, g.x + g.w / 2);
                game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#4a8', 12, 4, 14));
              }
            }
            if (game.boss && !game.boss.dead && rectOverlap(punchBox, game.boss)) {
              game.boss.takeDamage((this.type.attackDamage + this.bonusDamage) * 3, game, g.x + g.w / 2);
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#4a8', 16, 5, 18));
            }
            SFX.hit();
            triggerHitstop(3);
          }
        }
        if (g.punchCooldown <= 0 && (consumePress('KeyZ') || consumePress('KeyJ') || justPressed['MouseAttack'] || gpJust[GP_ATTACK])) {
          g.punchTimer = 18;
          g.punchCooldown = 30;
          g.punchHit = false;
          SFX.attack();
        }

        // Shoot projectile (X/K or mouse right)
        if (g.shootCooldown > 0) g.shootCooldown--;
        if (g.shootCooldown <= 0 && (consumePress('KeyX') || consumePress('KeyK') || justPressed['MouseSpecial'] || gpJust[GP_SPECIAL])) {
          g.shootCooldown = 20;
          const px = g.x + (g.facing > 0 ? g.w + 4 : -12);
          const py = g.y + g.h / 2;
          const golemDmg = this.type.attackDamage + this.bonusDamage;
          game.projectiles.push(new Projectile(px, py, g.facing * 8, 0, '#a87040', golemDmg + 4, 'player'));
          game.projectiles.push(new Projectile(px, py, g.facing * 7, -2, '#a87040', golemDmg + 2, 'player'));
          game.projectiles.push(new Projectile(px, py, g.facing * 7, 2, '#a87040', golemDmg + 2, 'player'));
          SFX.shuriken();
        }

        // Golem expires
        if (g.timer <= 0) {
          game.effects.push(new Effect(g.x + g.w / 2, g.y + g.h / 2, '#aaa', 20, 6, 20));
          SFX.slam();
          this.earthGolem = null;
        }
      }

      // Bubble: ride inside big bubble
      if (this.ninjaType === 'bubble' && this.bubbleRide) {
        const b = this.bubbleRide;
        b.timer--;
        // Movement — hover like golem but faster
        let moveX = 0, moveY = 0;
        if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left || gpState.axes[0] < -0.3) moveX = -1;
        if (keys['ArrowRight'] || keys['KeyD'] || touchState.right || gpState.axes[0] > 0.3) moveX = 1;
        if (keys['ArrowUp'] || keys['KeyW'] || touchState.up || gpState.axes[1] < -0.3) moveY = -1;
        if (keys['ArrowDown'] || keys['KeyS'] || touchState.down || gpState.axes[1] > 0.3) moveY = 1;
        if (moveX !== 0) { b.facing = moveX; this.facing = moveX; }
        b.x += moveX * 4.5;
        b.y += moveY * 4.5 + Math.sin(game.tick * 0.06) * 0.6;
        b.x = Math.max(0, Math.min(game.levelW - b.w, b.x));
        b.y = Math.max(-50, Math.min(480 - b.h, b.y));
        // Player follows bubble center
        this.x = b.x + b.w / 2 - this.w / 2;
        this.y = b.y + b.h / 2 - this.h / 2;
        this.vy = 0;
        this.grounded = false;

        // Contact damage
        if (b.contactCd > 0) b.contactCd--;
        if (b.contactCd <= 0) {
          const bBox = { x: b.x, y: b.y, w: b.w, h: b.h };
          for (const e of game.enemies) {
            if (!e.dead && rectOverlap(bBox, e)) {
              e.takeDamage(this.type.attackDamage + this.bonusDamage + 2, game, b.x + b.w / 2);
              const kd = Math.sign(e.x + e.w / 2 - (b.x + b.w / 2)) || 1;
              e.vx = kd * 5;
              e.vy = -3;
              b.contactCd = 10;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#4af', 8, 3, 10));
              break;
            }
          }
          if (b.contactCd <= 0 && game.boss && !game.boss.dead && rectOverlap({ x: b.x, y: b.y, w: b.w, h: b.h }, game.boss)) {
            game.boss.takeDamage(this.type.attackDamage + this.bonusDamage + 2, game, b.x + b.w / 2);
            b.contactCd = 10;
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#4af', 12, 4, 14));
          }
        }

        // Trail bubbles
        b.trailTimer++;
        if (b.trailTimer % 12 === 0) {
          game.bubbles.push(new Bubble(
            b.x + b.w / 2 + randInt(-20, 20),
            b.y + b.h / 2 + randInt(-10, 10),
            this.type.attackDamage + this.bonusDamage
          ));
        }

        // Bubble expires
        if (b.timer <= 0 || b.hp <= 0) {
          // Burst
          SFX.slam();
          damageInRadius(game, b.x + b.w / 2, b.y + b.h / 2, 120, (this.type.attackDamage + this.bonusDamage) * 2, b.x + b.w / 2);
          game.effects.push(new Effect(b.x + b.w / 2, b.y + b.h / 2, '#4af', 30, 8, 22));
          game.effects.push(new Effect(b.x + b.w / 2, b.y + b.h / 2, '#8cf', 20, 6, 18));
          // Scatter trail bubbles on burst
          for (let i = 0; i < 6; i++) {
            game.bubbles.push(new Bubble(
              b.x + b.w / 2 + randInt(-80, 80),
              b.y + b.h / 2 + randInt(-60, 40),
              this.type.attackDamage + this.bonusDamage
            ));
          }
          this.bubbleRide = null;
        }
      }

      // Shadow: darkness decay and buff
      if (this.ninjaType === 'shadow') {
        if (this.shadowEyesTimer > 0) {
          this.shadowEyesTimer--;
          this.shadowDarkness = Math.min(this.shadowDarkness + 0.04, 0.7);
        } else {
          this.shadowDarkness = Math.max(this.shadowDarkness - 0.01, 0);
        }
        // Enhanced stealth regen during buff
        if (this.shadowUltBuff) {
          this.shadowStealth = Math.min(this.shadowStealth + 3, 300);
        }
      }

      // Storm: ongoing rain soaks enemies
      if (this.ninjaType === 'storm') {
        // Re-soak enemies every 30 frames
        if (game.tick % 30 === 0) {
          for (const e of game.enemies) {
            if (!e.dead) e.soakTimer = Math.max(e.soakTimer, 300);
          }
          if (game.boss && !game.boss.dead) game.boss.soakTimer = Math.max(game.boss.soakTimer, 300);
        }
        // Spawn rain particles
        for (let i = 0; i < 4; i++) {
          this.stormRaindrops.push({
            x: game.camera.x + Math.random() * CANVAS_W,
            y: game.camera.y - 10,
            speed: 8 + Math.random() * 6,
            life: 60
          });
        }
        // Update rain
        for (const r of this.stormRaindrops) {
          r.y += r.speed;
          r.life--;
        }
        this.stormRaindrops = this.stormRaindrops.filter(r => r.life > 0 && r.y < game.camera.y + CANVAS_H + 20);
      }

      // Ultimate expires
      if (this.ultimateTimer <= 0) {
        // Don't end fire ult while meteors are still in flight
        if (this.ninjaType === 'fire' && this.fireMeteors.some(m => !m.done)) {
          // keep running until all meteors land
        } else {
          this.ultimateActive = false;
          this.ultimateCharge = 0;
          this.ultimateReady = false;
          this.ultimateMax = Math.round(this.ultimateMax * 1.2);
          // Clean up type-specific state
          this.earthGolem = null;
          this.bubbleRide = null;
          this.fireMeteors = [];
          this.shadowUltBuff = false;
          this.shadowDarkness = 0;
          this.shadowEyesTimer = 0;
          this.stormRaindrops = [];
        }
      }
    }

    // Ultimate activation input
    if (this.ultimateReady && !this.ultimateActive) {
      if (consumePress('KeyV') || consumePress('KeyM') || gpJust[3]) {
        this.activateUltimate(game);
      }
    }

    // Skip normal movement if in earth golem
    if (this.earthGolem) {
      // Still allow invincibility, effects, etc. but skip movement/gravity/collision
      if (this.invincibleTimer > 0) this.invincibleTimer--;
      return;
    }
    const t = this.type;

    // Bubble buff decay
    if (this.bubbleBuffTimer > 0) this.bubbleBuffTimer--;

    // Frozen mash-out: pressing left/right rapidly sheds freeze faster
    if (this.statusFreeze > 0) {
      const mashL = consumePress('ArrowLeft') || consumePress('KeyA');
      const mashR = consumePress('ArrowRight') || consumePress('KeyD');
      if (mashL || mashR) {
        this.statusFreeze = Math.max(0, this.statusFreeze - 12);
        this.freezeNudge = 6;
      }
    }

    // Steel: invulnerable but can't move
    if (this.statusSteel > 0) {
      this.vx = 0;
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.y += this.vy;
      for (const p of game.platforms) {
        if (rectOverlap(this, p)) {
          if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h; this.vy = 0; this.grounded = true;
          }
        }
      }
      this.invincibleTimer = 2; // stay invulnerable while steel'd
      this.statusSteel--;
      if (this.statusBurn > 0) this.statusBurn--;
      if (this.statusFreeze > 0) this.statusFreeze--;
      if (this.statusFloat > 0) this.statusFloat--;
      if (this.statusHeavy > 0) this.statusHeavy--;
      if (this.statusParalyse > 0) this.statusParalyse--;
      // Metal gleam particles
      if (Math.random() < 0.3) {
        game.effects.push(new Effect(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          '#ccc', 2, 1, 8
        ));
      }
      return;
    }

    // Stun: can't move or act, only gravity applies
    if (this.statusStun > 0) {
      this.vx = 0;
      this.vy += GRAVITY;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.y += this.vy;
      // Platform collision during stun
      for (const p of game.platforms) {
        if (rectOverlap(this, p)) {
          if (this.vy > 0 && this.y + this.h - this.vy <= p.y + 4) {
            this.y = p.y - this.h; this.vy = 0; this.grounded = true;
          }
        }
      }
      // Tick timers during stun so they don't freeze
      if (this.invincibleTimer > 0) this.invincibleTimer--;
      this.statusStun--;
      if (this.statusParalyse > 0) this.statusParalyse--;
      if (this.statusBurn > 0) {
        this.statusBurn--;
        if (this.statusBurn % 30 === 0 && this.statusBurn > 0) {
          this.hp -= 1;
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 5, 2, 8));
        }
      }
      if (this.statusFreeze > 0) this.statusFreeze--;
      if (this.statusFloat > 0) this.statusFloat--;
      if (this.statusHeavy > 0) this.statusHeavy--;
      if (this.statusSteel > 0) this.statusSteel--;
      // Spark particles
      if (Math.random() < 0.4) {
        game.effects.push(new Effect(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          '#ff0', 2, 1.5, 8
        ));
      }
      return;
    }

    // Skip normal physics during bubble ride (attacks/shurikens still allowed below)
    if (!this.bubbleRide) {

    // Movement
    let moveX = 0;
    if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left || gpState.axes[0] < -0.3) moveX = -1;
    if (keys['ArrowRight'] || keys['KeyD'] || touchState.right || gpState.axes[0] > 0.3) moveX = 1;

    if (!this.windDashing && !this.fireDashing) {
      const speedMult = (this.bubbleBuffTimer > 0) ? 1.35 : 1;
      const freezeMult = (this.statusFreeze > 0) ? 0.4 : 1;
      this.vx = moveX * t.speed * speedMult * freezeMult;
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
    if (holdingDown && !this.grounded && !this.slamming && !(this.ninjaType === 'bubble' && this.ultimateActive)) {
      this.slamming = true;
      this.vx = 0;
    }
    if (this.slamming) {
      this.vy = 16;
    }

    // Gravity
    let grav = (this.bubbleBuffTimer > 0) ? GRAVITY * 0.55 : GRAVITY;
    if (this.statusFloat > 0) grav *= 0.35;
    if (this.statusHeavy > 0) grav *= 2.5;
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

    let maxFall = (this.bubbleBuffTimer > 0) ? MAX_FALL * 0.65 : MAX_FALL;
    if (this.statusFloat > 0) maxFall *= 0.4;
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
          if (this.windDashing) {
            this.windDashing = false;
            this.windDashTimer = 0;
            this.vx = 0;
            this.nextHitDouble = true;
            triggerHitstop(6);
            this.stopMidair = true;
            this.stopMidairTimer = 20;
            game.effects.push(new Effect(this.x + this.w, this.y + this.h / 2, '#bfb', 12, 5, 15));
          }
          if (this.fireDashing) {
            this._launchFireball(game);
            triggerHitstop(5);
            for (let i = 0; i < 8; i++) {
              game.effects.push(new Effect(this.x + this.w, this.y + Math.random() * this.h, '#f80', 8 + Math.random() * 6, 3, 12));
            }
          }
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
          this.onWall = -1;
          if (this.windDashing) {
            this.windDashing = false;
            this.windDashTimer = 0;
            this.vx = 0;
            this.nextHitDouble = true;
            triggerHitstop(6);
            this.stopMidair = true;
            this.stopMidairTimer = 20;
            game.effects.push(new Effect(this.x, this.y + this.h / 2, '#bfb', 12, 5, 15));
          }
          if (this.fireDashing) {
            this._launchFireball(game);
            triggerHitstop(5);
            for (let i = 0; i < 8; i++) {
              game.effects.push(new Effect(this.x, this.y + Math.random() * this.h, '#f80', 8 + Math.random() * 6, 3, 12));
            }
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
          e.takeDamage(slamDmg, game, this.x + this.w / 2, 'physical');
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
          game.boss.takeDamage(slamDmg, game, this.x + this.w / 2, 'physical');
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

    } // end if (!this.bubbleRide)

    // Timers
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;

    // Elemental status effects
    if (this.statusBurn > 0) {
      this.statusBurn--;
      if (this.statusBurn % 30 === 0) {
        this.hp -= 1;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 5, 2, 8));
        if (this.hp <= 0) {
          this.deathTimer = 180;
          this.vx = 0; this.vy = 0;
          const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
          game.effects.push(new Effect(cx, cy, '#fff', 20, 6, 25));
          game.effects.push(new Effect(cx, cy, this.type.color, 15, 5, 20));
          game.effects.push(new Effect(cx, cy, '#f44', 12, 4, 18));
          game.effects.push(new TextEffect(cx, cy - 20, 'K.O.', '#f44'));
          game.deaths++;
          game.lives--;
          if (game.lives <= 0) { game.gameOver = true; recordGameOver(game.totalKills); }
        }
      }
      // Fire particles
      if (Math.random() < 0.3) {
        game.effects.push(new Effect(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          Math.random() < 0.5 ? '#f80' : '#fa0', 2, 1, 10
        ));
      }
    }
    if (this.statusFreeze > 0) {
      this.statusFreeze--;
      if (this.freezeNudge > 0) this.freezeNudge--;
    } else {
      this.freezeNudge = 0;
    }
    if (this.statusFloat > 0) this.statusFloat--;
    if (this.statusParalyse > 0) this.statusParalyse--;
    if (this.statusHeavy > 0) this.statusHeavy--;
    if (this.statusStun > 0) this.statusStun--;

    // Attack
    if (this.attacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        if (this.ninjaType === 'shadow' && !this.shadowAttackHit && this.shadowStealth >= 180) {
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
                  this.chainLastHit = e;
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
              dmg += this.crystalClones ? 2 : 0;
            }
            if (this.ninjaType === 'wind') {
              dmg += this.windPower;
            }
            e.takeDamage(dmg, game, this.x + this.w / 2, 'steel');
            if (!this.ultimateReady && !this.ultimateActive) {
              this.addUltimateCharge(4);
            }
            e.hitCooldown = 15;

            if (this.ninjaType === 'crystal') {
              for (const other of game.enemies) {
                if (other !== e && !other.dead && other.freezeTimer >= 1) {
                  other.takeDamage(dmg * 0.75, game, this.x + this.w / 2, 'steel');
                }
              }
            }

            // Storm: hitting a soaked enemy starts lightning chain
            if (this.ninjaType === 'storm' && e.soakTimer > 0 && !this.stormChaining) {
              this.stormChaining = true;
              this.stormChainTimer = 4;
              this.stormChainHit = new Set();
              this.stormChainHit.add(e);
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#ff0', 15, 5, 15));
              SFX.backstab();
            }
            // Storm sword: apply electric paralysis
            if (this.ninjaType === 'storm') {
              if (e.element === 'lightning') {
                e.hp = Math.min(e.hp + 2, e.maxHp);
                game.effects.push(new TextEffect(e.x + e.w / 2, e.y - 10, '+2', '#ff0'));
              } else {
                e.paralyseTimer = Math.max(e.paralyseTimer, 45);
                game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#ff0', 8, 3, 12));
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
              this.chainLastHit = game.boss;
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
          if (this.ninjaType === 'crystal') dmg += this.crystalClones ? 2 : 0;
          if (this.ninjaType === 'wind') dmg += this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2, 'steel');
          if (game.boss.dead) {
            if (this.ninjaType === 'shadow') {
              game.effects.push(new KanjiEffect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a4e', game.camera));
            }
            if (this.ninjaType === 'storm') {
              this.stormLightningFlash = 35;
              game.effects.push(new KanjiEffect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', game.camera));
            }
          }
          if (!this.ultimateReady && !this.ultimateActive) {
            this.addUltimateCharge(6);
          }
          // Storm: hitting soaked boss starts lightning chain
          if (this.ninjaType === 'storm' && game.boss.soakTimer > 0 && !this.stormChaining) {
            this.stormChaining = true;
            this.stormChainTimer = 4;
            this.stormChainHit = new Set();
            this.stormChainHit.add(game.boss);
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 15, 5, 15));
            SFX.backstab();
          }
          // Storm sword: apply electric paralysis to boss
          if (this.ninjaType === 'storm') {
            game.boss.paralyseTimer = Math.max(game.boss.paralyseTimer, 30);
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 8, 3, 12));
          }
          if (this.ninjaType === 'shadow') this.shadowAttackHit = true;
          triggerHitstop(5);
        }
      }
    }

    if ((consumePress('KeyZ') || consumePress('KeyJ') || consumePress('MouseAttack') || touchJust.attack || gpJust[GP_ATTACK]) && !this.attacking && this.attackCooldown <= 0) {
      if (this.statusParalyse > 0) {
        this.statusStun = 30;
        this.statusParalyse = Math.max(0, this.statusParalyse - 30);
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STUNNED!', '#ff0'));
        SFX.play(200, 'square', 0.2, 0.15, 0);
      } else {
        this.shadowAttackHit = false;
        this.attack(game);
      }
    }

    // Special ability
    if ((consumePress('KeyX') || consumePress('KeyK') || consumePress('MouseSpecial') || touchJust.special || gpJust[GP_SPECIAL]) && this.specialCooldown <= 0) {
      this.useSpecial(game);
    }

    // Throw shuriken — recharge only starts when all shurikens are empty
    if (this.shurikens <= 0) {
      this.shurikenRechargeTimer++;
      if (this.shurikenRechargeTimer >= 150) {
        this.shurikens = this.maxShurikens;
        this.shurikenRechargeTimer = 0;
      }
    }
    if ((consumePress('KeyC') || consumePress('KeyL') || consumePress('MouseShuriken') || touchJust.shuriken || gpJust[GP_SHURIKEN]) && this.shurikens > 0) {
      if (this.statusParalyse > 0) {
        this.statusStun = 30;
        this.statusParalyse = Math.max(0, this.statusParalyse - 30);
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STUNNED!', '#ff0'));
        SFX.play(200, 'square', 0.2, 0.15, 0);
      } else {
      SFX.shuriken();
      this.shurikens--;
      const dmg = (t.attackDamage + this.bonusDamage) * (this.shurikenLevel);
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      const color = (this.ninjaType === 'fire') ? '#f93' : (this.ninjaType === 'crystal') ? '#aff' : (this.ninjaType === 'storm') ? '#48f' : '#ccc';
      const sProj = fireProjectileAtNearestEnemy({
        x: cx, y: cy, game, speed: 8, color, damage: dmg, owner: 'player', width: 8, height: 6, facing: this.facing
      });
      if (sProj && this.ninjaType === 'crystal') sProj.freezeDust = true;
      if (sProj && this.ninjaType === 'storm') sProj.soaking = true;
      if (sProj && this.ninjaType === 'shadow') sProj.shadowParalyse = true;
      game.effects.push(new Effect(cx, cy, '#ccc', 4, 2, 6));
      }
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
            x: cx, y: cy, game, speed: 8, color: '#f93', damage: dmg, owner: 'player', width: 14, height: 10, piercing: true, facing: this.facing
          });
          if (p) p.life = 120;
          game.effects.push(new Effect(cx, cy, '#f80', 4, 2, 6));
        }
        for (const e of game.enemies) {
          if (!e.dead && e.hitCooldown <= 0) {
            const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
            const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 50) {
              e.takeDamage(this.type.attackDamage + this.bonusDamage, game);
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
        let nearDist = this.shadowUltBuff ? 500 : 200; // Bigger radius during ult
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        for (const e of game.enemies) {
          if (e.dead || e === this.chainLastHit) continue;
          const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearDist = d; nearest = e; }
        }
        if (!nearest && game.boss && !game.boss.dead && game.boss !== this.chainLastHit) {
          const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearest = game.boss; }
        }
        if (nearest) {
          // Check element resist — stop chain if target resists
          const atkEl = NINJA_ATTACK_ELEMENTS[this.ninjaType];
          if (nearest.element && atkEl && ELEMENT_MATRIX[atkEl]) {
            let res = ELEMENT_MATRIX[atkEl][nearest.element];
            if (atkEl === 'steel' && res === 'heal') res = 'resist';
            if (res === 'resist' || res === 'heal') {
              game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'RESIST', nearest.elementColors.accent));
              game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, nearest.elementColors.accent, 8, 3, 12));
              this.chainStriking = false;
              for (const a of this.afterimages) { if (a.chain) a.life = 20; }
              this.backstabReady = false;
              this.shadowStealth = 0;
              nearest = null;
            }
          }
        }
        if (nearest) {
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          this.afterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 12, chain: true });
          let dmg = this.type.attackDamage + this.bonusDamage;
          if (this.backstabReady || (nearest.hp !== undefined && nearest.hp <= this.shadowKillThreshold)) {
            dmg = 9999;
          }
          nearest.takeDamage(dmg, game, this.x + this.w / 2);
          if (nearest === game.boss && nearest.dead) {
            game.effects.push(new KanjiEffect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a4e', game.camera));
          }
          this.chainLastHit = nearest;
          this._spawnChainCut(nearest);
          SFX.chain();
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a4e', 10, 4, 12));
          triggerHitstop(3);
          this.invincibleTimer = Math.max(this.invincibleTimer, 8);
          this.chainTimer = 6;
        } else if (!this.chainStriking) {
          // Already stopped by resist
        } else {
          this.chainStriking = false;
          // Start fading chain afterimages now
          for (const a of this.afterimages) { if (a.chain) a.life = 20; }
          this.backstabReady = false;
          this.shadowStealth = 0;
        }
      }
    }

    // Storm ninja: lightning chain strike (only soaked enemies, larger radius)
    if (this.ninjaType === 'storm' && this.stormChaining) {
      this.stormChainTimer--;
      if (this.stormChainTimer <= 0) {
        let nearest = null;
        let nearDist = 350; // Larger chain radius than shadow
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        for (const e of game.enemies) {
          if (e.dead || this.stormChainHit.has(e) || e.soakTimer <= 0) continue;
          const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearDist = d; nearest = e; }
        }
        if (!nearest && game.boss && !game.boss.dead && !this.stormChainHit.has(game.boss) && game.boss.soakTimer > 0) {
          const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearest = game.boss; }
        }
        if (nearest) {
          // Check element resist — stop chain if target resists
          const atkEl = 'lightning';
          if (nearest.element && ELEMENT_MATRIX[atkEl]) {
            let res = ELEMENT_MATRIX[atkEl][nearest.element];
            if (res === 'resist' || res === 'heal') {
              game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'RESIST', nearest.elementColors.accent));
              game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, nearest.elementColors.accent, 8, 3, 12));
              this.stormChaining = false;
              for (const a of this.stormAfterimages) a.life = 15;
              nearest = null;
            }
          }
        }
        if (nearest) {
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          this.stormAfterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 12 });
          const dmg = (this.type.attackDamage + this.bonusDamage) * 2;
          nearest.takeDamage(dmg, game, this.x + this.w / 2);
          if (nearest === game.boss && nearest.dead) {
            this.stormLightningFlash = 35;
            game.effects.push(new KanjiEffect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#ff0', game.camera));
          }
          this.stormChainHit.add(nearest);
          this._spawnChainCut(nearest);
          SFX.chain();
          // Lightning bolt effect between positions
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#ff0', 12, 5, 14));
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#8af', 8, 3, 10));
          triggerHitstop(3);
          this.invincibleTimer = Math.max(this.invincibleTimer, 8);
          this.stormChainTimer = 4;
        } else if (!this.stormChaining) {
          // Already stopped by resist
        } else {
          // No unvisited soaked enemies — loop back, but skip the last-hit target
          const lastHit = [...this.stormChainHit].pop();
          this.stormChainHit.clear();
          if (lastHit) this.stormChainHit.add(lastHit);
          let loopTarget = null;
          let loopDist = 350;
          for (const e of game.enemies) {
            if (e.dead || e.soakTimer <= 0 || this.stormChainHit.has(e)) continue;
            const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < loopDist) { loopDist = d; loopTarget = e; }
          }
          if (!loopTarget && game.boss && !game.boss.dead && game.boss.soakTimer > 0 && !this.stormChainHit.has(game.boss)) {
            const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < loopDist) { loopTarget = game.boss; }
          }
          if (loopTarget) {
            // Check element resist — stop chain if target resists
            if (loopTarget.element && ELEMENT_MATRIX['lightning']) {
              let res = ELEMENT_MATRIX['lightning'][loopTarget.element];
              if (res === 'resist' || res === 'heal') {
                game.effects.push(new TextEffect(loopTarget.x + loopTarget.w / 2 - 16, loopTarget.y - 10, 'RESIST', loopTarget.elementColors.accent));
                game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, loopTarget.elementColors.accent, 8, 3, 12));
                this.stormChaining = false;
                for (const a of this.stormAfterimages) a.life = 15;
                loopTarget = null;
              }
            }
          }
          if (loopTarget) {
            const behind = (loopTarget.x + loopTarget.w / 2) > cx ? -1 : 1;
            this.x = loopTarget.x + (behind > 0 ? loopTarget.w + 4 : -this.w - 4);
            this.y = loopTarget.y + loopTarget.h / 2 - this.h / 2;
            this.facing = -behind;
            this.vx = 0; this.vy = 0;
            this.stormAfterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 12 });
            const dmg = (this.type.attackDamage + this.bonusDamage) * 2;
            loopTarget.takeDamage(dmg, game, this.x + this.w / 2);
            if (loopTarget === game.boss && loopTarget.dead) {
              this.stormLightningFlash = 35;
              game.effects.push(new KanjiEffect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#ff0', game.camera));
            }
            this.stormChainHit.add(loopTarget);
            this._spawnChainCut(loopTarget);
            SFX.chain();
            game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#ff0', 12, 5, 14));
            game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#8af', 8, 3, 10));
            triggerHitstop(3);
            this.invincibleTimer = Math.max(this.invincibleTimer, 8);
            this.stormChainTimer = 4;
          } else if (!this.stormChaining) {
            // Already stopped by resist
          } else {
            this.stormChaining = false;
            for (const a of this.stormAfterimages) a.life = 15;
          }
        }
      }
    }
    // Storm afterimage decay
    if (this.ninjaType === 'storm') {
      this.stormAfterimages = this.stormAfterimages.filter(a => {
        if (this.stormChaining) return true;
        a.life--;
        return a.life > 0;
      });
    }

    // Shadow ninja: stealth accumulation
    if (this.ninjaType === 'shadow') {
      const now = game.tick;
      const stealthRate = this.shadowUltBuff ? 5 : 1; // Way faster during ult
      if (now - this.lastDamageTick > 60 && now - this.lastEnemyTouch > 60) {
        this.shadowStealth = Math.min(this.shadowStealth + stealthRate, 300);
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
      this.afterimages = this.afterimages.filter(a => {
        if (a.chain && this.chainStriking) return true; // persist during chain
        a.life--;
        return a.life > 0;
      });
      if (this.shadowLandTimer > 0) this.shadowLandTimer--;
      if (!this.grounded) {
        this.wasInAir = true;
      } else if (this.wasInAir) {
        this.wasInAir = false;
        this.shadowLandTimer = 12;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h, '#726', 6, 2, 10));
      }
    }

    // Crystal ninja: clone update + shatter
    if (this.ninjaType === 'crystal') {
      if (this.parryVisualTimer > 0) this.parryVisualTimer--;
      // Shatter glass shards animation
      if (this.crystalShatter > 0) {
        this.crystalShatter--;
        if (this.crystalShards) {
          for (const s of this.crystalShards) {
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.3;
            s.angle += s.spin;
            s.life--;
          }
          this.crystalShards = this.crystalShards.filter(s => s.life > 0);
        }
      }
      // Clone attack mirroring — clones deal damage when player attacks
      if (this.crystalClones && this.attacking && this.attackBox) {
        for (const clone of this.crystalClones) {
          const cloneX = this.x + clone.offsetX;
          const cloneY = this.y + clone.offsetY;
          const cloneBox = {
            x: this.facing > 0 ? cloneX + this.w : cloneX - this.attackBox.w,
            y: cloneY + 4,
            w: this.attackBox.w,
            h: this.attackBox.h
          };
          for (const e of game.enemies) {
            if (!e.dead && e.hitCooldown <= 0 && rectOverlap(cloneBox, e)) {
              const dmg = Math.floor((t.attackDamage + this.bonusDamage) * 0.6);
              e.takeDamage(dmg, game, cloneX + this.w / 2);
              e.hitCooldown = 15;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#aff', 6, 3, 8));
            }
          }
          if (game.boss && !game.boss.dead && rectOverlap(cloneBox, game.boss)) {
            const dmg = Math.floor((t.attackDamage + this.bonusDamage) * 0.6);
            game.boss.takeDamage(dmg, game, cloneX + this.w / 2);
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aff', 8, 3, 10));
          }
        }
      }
      // Clone special mirroring — clones also spawn diamond shards
      if (this.crystalClones && this._cloneSpecialTrigger) {
        for (const clone of this.crystalClones) {
          if (!game.diamondShards) game.diamondShards = [];
          const sx = this.x + clone.offsetX + this.w / 2;
          const sy = this.y + clone.offsetY + this.h / 2;
          game.diamondShards.push(new DiamondShard(sx, sy, 'player', game));
        }
        this._cloneSpecialTrigger = false;
      }
      // End clones when ultimate expires
      if (this.crystalClones && this.ultimateTimer <= 0) {
        this.crystalClones = null;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 15, 5, 15));
      }
      if (this.parryComboTimer > 0) this.parryComboTimer--;
      else this.parryCombo = 0;
    }

    // Fire Ninja dash logic
    if (this.ninjaType === 'fire' && this.fireDashing) {
      this.fireDashTimer--;
      const progress = 1 - this.fireDashTimer / this.fireDashMax;
      const dashSpeed = 13 * (1 - progress * 0.4);
      this.vx = this.facing * dashSpeed;
      this.vy *= 0.5;

      // Fire trail particles
      for (let i = 0; i < 3; i++) {
        const ox = -this.facing * (6 + Math.random() * 10);
        const oy = (Math.random() - 0.5) * this.h;
        const colors = ['#f80', '#f50', '#fa0', '#f33'];
        game.effects.push(new Effect(
          this.x + this.w / 2 + ox, this.y + this.h / 2 + oy,
          colors[Math.floor(Math.random() * colors.length)], 6 + Math.random() * 4, 2, 8
        ));
      }

      for (const e of game.enemies) {
        if (!e.dead && e.damageIframes <= 0 && rectOverlap(this, e)) {
          const dmg = this.type.attackDamage + this.bonusDamage;
          e.takeDamage(dmg, game, this.x + this.w / 2);
          e.burnTimer = Math.max(e.burnTimer || 0, 90);
          triggerHitstop(3);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#f80', 12, 4, 12));
        }
      }
      if (game.boss && !game.boss.dead && game.boss.damageIframes <= 0 && rectOverlap(this, game.boss)) {
        const dmg = this.type.attackDamage + this.bonusDamage;
        game.boss.takeDamage(dmg, game, this.x + this.w / 2);
        game.boss.burnTimer = Math.max(game.boss.burnTimer || 0, 90);
        triggerHitstop(3);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 14, 5, 14));
      }

      if (this.fireDashTimer <= 0) {
        this._launchFireball(game);
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
        if (game.boss && !game.boss.dead && game.boss.damageIframes <= 0 && rectOverlap(this, game.boss)) {
          const dmg = t.attackDamage + this.bonusDamage + this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2);
          game.boss.hitCooldown = 15;
          triggerHitstop(4);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#bfb', 12, 5, 14));
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
          this.facing,
          this.type.attackDamage
        ));
      }
    }

    // Crystal attack: shoot freeze dust
    if (this.ninjaType === 'crystal') {
      const fx = this.x + this.w / 2 + this.facing * 20;
      const fy = this.y + this.h / 2;
      const proj = new Projectile(fx, fy, this.facing * 6, (Math.random() - 0.5) * 1.5, '#aff', this.type.attackDamage + this.bonusDamage, 'player');
      proj.w = 10; proj.h = 8;
      proj.freezeDust = true;
      proj.life = 60;
      game.projectiles.push(proj);
      game.effects.push(new Effect(fx, fy, '#aff', 4, 2, 6));
    }

    const shadowFullStealth = this.ninjaType === 'shadow' && this.shadowStealth >= 240;
    const shadowUltBonus = this.ninjaType === 'shadow' && this.shadowUltBuff;
    const stormReach = this.ninjaType === 'storm' ? 40 : 0;
    const reach = stormReach || (shadowUltBonus ? 80 : (shadowFullStealth ? 50 : 30));
    const vertExtra = shadowUltBonus ? 20 : (shadowFullStealth ? 10 : (stormReach ? 6 : 0));
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

  _spawnChainCut(target) {
    const tx = target.x + target.w / 2;
    const ty = target.y + target.h / 2;
    if (!this._chainCuts) this._chainCuts = [];
    // Spawn 2-3 irregular slashes per hit
    const count = 2 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 20;
      const oy = (Math.random() - 0.5) * 16;
      const randA = Math.random() * Math.PI * 2 - Math.PI;
      const randSweep = Math.PI * (0.25 + Math.random() * 0.8);
      const r = 14 + Math.random() * 26;
      this._chainCuts.push({
        cx: tx + ox, cy: ty + oy,
        dir: Math.random() < 0.5 ? 1 : -1,
        cutR: r,
        startAngle: randA,
        endAngle: randA + randSweep,
        life: 18, maxLife: 18,
        color: this.type.accentColor
      });
    }
  }

  _launchFireball(game) {
    this.fireDashing = false;
    this.vx = 0;
    if (this._fireballPending) {
      // Spawn from player center so it continues seamlessly from the dash fireball
      const fx = this.x + this.w / 2;
      const fy = this.y + this.h / 2;
      const speed = 8 * this.facing;
      const proj = new Projectile(fx - 9, fy - 9, speed, 0, '#f80', this.type.attackDamage + this.bonusDamage + 4, 'player');
      proj.w = 18;
      proj.h = 18;
      proj.piercing = true;
      proj.isFireball = true;
      proj.life = 80;
      game.projectiles.push(proj);
      this._fireballPending = false;
    }
  }

  useSpecial(game) {
    this.specialCooldown = 60;
    SFX.special();
    switch (this.ninjaType) {
      case 'fire': {
        this.fireDashing = true;
        this.fireDashTimer = 12;
        this.fireDashMax = 12;
        this.vy = -1;
        this.invincibleTimer = 15;
        this._fireballPending = true;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 14, 5, 15));
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
        // Build pool of available construct types
        const earthPool = ['pillar', 'spike', 'golem'];
        if (this.defeatedBossTypes.has('shooter')) earthPool.push('shooter');
        if (this.defeatedBossTypes.has('flyer')) earthPool.push('flyer');
        if (this.defeatedDeflector && Math.random() < 0.15) earthPool.push('deflector');
        const pick = earthPool[Math.floor(Math.random() * earthPool.length)];
        const earthWave = game.wave || 1;
        let construct;
        if (pick === 'pillar') {
          let pillarY = supportY - TILE * 3;
          construct = new StonePillar(spawnX, pillarY + TILE, earthWave);
          game.stonePillars.push(construct);
        } else if (pick === 'spike') {
          construct = new StoneSpike(spawnX, supportY - TILE + 4, earthWave);
        } else if (pick === 'golem') {
          construct = new StoneGolem(spawnX, supportY - TILE, this.facing, earthWave);
        } else if (pick === 'shooter') {
          construct = new StoneShooter(spawnX, supportY - TILE, this.facing, earthWave);
        } else if (pick === 'flyer') {
          construct = new StoneFlyer(spawnX, supportY - TILE * 2, earthWave);
        } else if (pick === 'deflector') {
          construct = new StoneDeflector(spawnX, supportY - TILE, this.facing, earthWave);
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
            this.y - 20 - i * 25 + randOffY,
            this.type.attackDamage + this.bonusDamage
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
        // Spawn a diamond shard aimed at nearest enemy
        if (!game.diamondShards) game.diamondShards = [];
        const sx = this.x + this.w / 2 + this.facing * 16;
        const sy = this.y + this.h / 2;
        game.diamondShards.push(new DiamondShard(sx, sy, 'player', game));
        // Signal clones to also spawn shards
        if (this.crystalClones) this._cloneSpecialTrigger = true;
        SFX.special();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 12, 4, 15));
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
      case 'storm': {
        // Water orbs: 3 projectiles orbit the player in a circle, bypassing terrain
        const wsx = this.x + this.w / 2;
        const wsy = this.y + this.h / 2;
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          const proj = new Projectile(wsx, wsy, 0, 0, '#48f', this.type.attackDamage + this.bonusDamage, 'player');
          proj.w = 12; proj.h = 12;
          proj.soaking = true;
          proj.piercing = true;
          proj.life = 180;
          proj.orbiting = true;
          proj.orbitAngle = angle;
          proj.orbitRadius = 70;
          proj.orbitSpeed = 0.08;
          game.projectiles.push(proj);
        }
        game.effects.push(new Effect(wsx, wsy, '#48f', 14, 5, 16));
        break;
      }
    }
  }

  takeDamage(amount, game, element) {
    if (this.godMode) return;
    if (this.earthGolem) return;
    if (this.bubbleRide) {
      this.bubbleRide.hp -= amount;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 6, 2, 8));
      SFX.playerHurt();
      triggerHitstop(3);
      return;
    }
    if (this.invincibleTimer > 0) return;
    if (this.ninjaType === 'wind' && this.windPower >= 10 && (this.windFirstDodge || Math.random() < 0.5)) {
      this.windFirstDodge = false;
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
    if (this.fireArmor || this.chainStriking || this.stormChaining) return;
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
    // Apply elemental status effect
    if (element) {
      if (element === 'fire') {
        this.statusBurn = 180;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'BURN!', '#f80'));
      } else if (element === 'crystal' || element === 'water') {
        this.statusFreeze = 120;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'FREEZE!', '#0ff'));
      } else if (element === 'wind') {
        this.statusFloat = 150;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'FLOAT!', '#8f8'));
      } else if (element === 'lightning') {
        this.statusParalyse = 180;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'PARALYSE!', '#ff0'));
      } else if (element === 'earth') {
        this.statusHeavy = 150;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'HEAVY!', '#a84'));
      } else if (element === 'steel') {
        this.statusSteel = 120;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STEEL!', '#aaa'));
      }
    }
    if (this.hp <= 0) {
      this.deathTimer = 180;
      this.vx = 0; this.vy = 0;
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      game.effects.push(new Effect(cx, cy, '#fff', 20, 6, 25));
      game.effects.push(new Effect(cx, cy, this.type.color, 15, 5, 20));
      game.effects.push(new Effect(cx, cy, '#f44', 12, 4, 18));
      game.effects.push(new TextEffect(cx, cy - 20, 'K.O.', '#f44'));
      game.deaths++;
      game.lives--;
      if (game.lives <= 0) {
        game.gameOver = true;
        recordGameOver(game.totalKills);
      }
    }
  }

  render(ctx, cam) {
    // Hide player during death delay
    if (this.deathTimer > 0) return;

    const t = this.type;
    let sx = this.x - cam.x;
    const sy = this.y - cam.y;

    // Freeze mash nudge offset
    if (this.freezeNudge > 0) {
      sx += (this.freezeNudge % 2 === 0 ? 3 : -3);
    }
    // Stun shake
    if (this.statusStun > 0) {
      sx += (this.statusStun % 4 < 2 ? 2 : -2);
    }

    // Fire dash: player inside fireball
    if (this.fireDashing) {
      ctx.save();
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      const progress = 1 - this.fireDashTimer / this.fireDashMax;
      // Trailing flame tail (elongated behind)
      const tailLen = 20 + progress * 16;
      const grad = ctx.createLinearGradient(
        cx - this.facing * tailLen, cy, cx + this.facing * 8, cy
      );
      grad.addColorStop(0, 'rgba(255,80,0,0)');
      grad.addColorStop(0.4, 'rgba(255,120,0,0.4)');
      grad.addColorStop(1, 'rgba(255,200,50,0.6)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx - this.facing * tailLen * 0.3, cy, tailLen, 14 + progress * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Outer fireball glow
      const r = 18 + Math.sin(this.fireDashTimer * 1.2) * 3;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#f50';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.fill();
      // Main fireball
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright core
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fe4';
      ctx.beginPath();
      ctx.arc(cx + this.facing * 3, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Storm afterimages (during lightning chain)
    if (this.ninjaType === 'storm' && this.stormAfterimages.length > 0) {
      for (const a of this.stormAfterimages) {
        const alpha = this.stormChaining ? 0.5 : (a.life / 15) * 0.4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#8af';
        ctx.fillRect(a.x - cam.x, a.y - cam.y, this.w, this.h);
        // Lightning spark on afterimage
        ctx.fillStyle = '#ff0';
        ctx.globalAlpha = alpha * 0.7;
        const eyeX = this.facing > 0 ? a.x + 14 : a.x + 4;
        ctx.fillRect(eyeX - cam.x, a.y + 8 - cam.y, 6, 4);
      }
      ctx.globalAlpha = 1;
    }

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
        if (a.chain) {
          // Chain afterimages: bright and persistent, fade only after chain ends
          const alpha = (a.chain && this.chainStriking) ? 0.5 : (a.life / 20) * 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#a4e';
          ctx.fillRect(a.x - cam.x, a.y - cam.y, this.w, this.h);
          // Eyes on chain afterimage
          ctx.fillStyle = '#f0f';
          ctx.globalAlpha = alpha * 0.8;
          const eyeX = this.facing > 0 ? a.x + 14 : a.x + 4;
          ctx.fillRect(eyeX - cam.x, a.y + 8 - cam.y, 6, 4);
        } else {
          ctx.globalAlpha = (a.life / 20) * 0.2 * stealthFade;
          ctx.fillStyle = '#527';
          ctx.fillRect(a.x - cam.x, a.y - cam.y, this.w, this.h);
        }
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

    // Status effect overlays
    if (this.statusBurn > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.1 * Math.sin(this.statusBurn * 0.3);
      ctx.fillStyle = '#f60';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      ctx.restore();
    }
    if (this.statusFreeze > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.statusFreeze * 0.2);
      ctx.fillStyle = '#0ef';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      // Ice crystals
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#aff';
      ctx.fillRect(sx - 3, sy + 2, 3, 5);
      ctx.fillRect(sx + this.w, sy + 8, 3, 5);
      ctx.fillRect(sx + 8, sy - 3, 5, 3);
      ctx.restore();
    }
    if (this.statusFloat > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.08 * Math.sin(this.statusFloat * 0.15);
      ctx.fillStyle = '#8f8';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      // Swirl lines
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#bfb';
      ctx.lineWidth = 1;
      const angle = this.statusFloat * 0.1;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, this.w * 0.7, angle, angle + 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.statusParalyse > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.1 * Math.sin(this.statusParalyse * 0.4);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      // Spark bolts
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1;
      const t1 = this.statusParalyse * 0.2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + Math.sin(t1) * 6 + 10);
      ctx.lineTo(sx + 10, sy + Math.sin(t1 + 1) * 4 + 16);
      ctx.lineTo(sx + 6, sy + Math.sin(t1 + 2) * 5 + 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + this.w - 4, sy + Math.cos(t1) * 5 + 8);
      ctx.lineTo(sx + this.w - 10, sy + Math.cos(t1 + 1) * 4 + 14);
      ctx.stroke();
      ctx.restore();
    }
    if (this.statusStun > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.statusStun * 0.6);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
      // Stars around head
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ff0';
      ctx.font = '10px monospace';
      const starAngle = this.statusStun * 0.3;
      for (let i = 0; i < 3; i++) {
        const a = starAngle + i * 2.094;
        const starX = sx + this.w / 2 + Math.cos(a) * 14;
        const starY = sy - 6 + Math.sin(a) * 5;
        ctx.fillText('*', starX, starY);
      }
      ctx.restore();
    }
    if (this.statusHeavy > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.statusHeavy * 0.15);
      ctx.fillStyle = '#a84';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      // Down arrows
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#862';
      ctx.font = '10px monospace';
      const hOff = this.statusHeavy % 20;
      ctx.fillText('v', sx + 2, sy + this.h + 4 + hOff * 0.3);
      ctx.fillText('v', sx + this.w - 6, sy + this.h + 4 + hOff * 0.3);
      ctx.restore();
    }
    if (this.statusSteel > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(this.statusSteel * 0.2);
      ctx.fillStyle = '#bbb';
      ctx.fillRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
      // Metallic shine line
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      const shineY = sy + (this.statusSteel % 30) * (this.h / 30);
      ctx.beginPath();
      ctx.moveTo(sx - 2, shineY);
      ctx.lineTo(sx + this.w + 2, shineY - 4);
      ctx.stroke();
      ctx.restore();
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

    // Pointy farmer hat (kasa)
    ctx.fillStyle = t.accentColor;
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy + 2);
    ctx.lineTo(sx + this.w / 2, sy - 14);
    ctx.lineTo(sx + this.w + 6, sy + 2);
    ctx.closePath();
    ctx.fill();
    // Brim
    ctx.fillStyle = t.color;
    ctx.fillRect(sx - 6, sy, this.w + 12, 3);

    // Belt / sash
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + this.h - 10, this.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx, sy + this.h - 9, this.w, 1);

    // Katana sheathed on back (when not attacking)
    if (!this.attacking) {
      ctx.save();
      // Position on the back (opposite side of facing), tucked into belt
      const backX = this.facing > 0 ? sx + 3 : sx + this.w - 3;
      const beltY = sy + this.h - 10;
      ctx.translate(backX, beltY);
      // Angled diagonally across back, handle over shoulder
      ctx.rotate(this.facing > 0 ? -0.45 : 0.45);
      // Scabbard (dark, extends down from belt and up past shoulder)
      if (this.ninjaType === 'storm') { ctx.shadowColor = '#ff0'; ctx.shadowBlur = 6; }
      ctx.fillStyle = this.ninjaType === 'storm' ? '#332200' : '#2a2a2a';
      ctx.fillRect(-2, -28, 4, 32);
      // Scabbard tip
      ctx.fillStyle = '#444';
      ctx.fillRect(-2, 2, 4, 3);
      // Scabbard mouth band
      ctx.fillStyle = '#555';
      ctx.fillRect(-3, -6, 6, 2);
      // Handle wrap (extends above scabbard)
      ctx.fillStyle = t.accentColor;
      ctx.fillRect(-2, -36, 4, 9);
      // Handle wrap diamonds
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 3; i++) ctx.fillRect(-1, -35 + i * 3, 2, 1);
      // Tsuba (guard)
      ctx.fillStyle = '#aa8';
      ctx.fillRect(-3, -28, 6, 2);
      // Pommel
      ctx.fillStyle = '#888';
      ctx.fillRect(-1, -38, 2, 3);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

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

    // Crystal glow (during clone ultimate)
    if (this.ninjaType === 'crystal' && this.crystalClones) {
      const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 0.4;
      ctx.strokeStyle = `rgba(170,255,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 4, sy - 4, this.w + 8, this.h + 8);
    }

    // Storm ultimate glow
    if (this.ninjaType === 'storm' && this.ultimateActive) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 0.4;
      ctx.strokeStyle = `rgba(80,160,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
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

    // Attack — katana moon slash
    if (this.attacking && this.attackBox) {
      const slashProgress = 1 - this.attackTimer / 12;
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      const dir = this.facing;

      // Katana blade swinging
      ctx.save();
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);
      const startA = -Math.PI * 0.65;
      const sweep = Math.PI * 1.0;
      const curA = startA + sweep * slashProgress;
      ctx.rotate(curA);

      // Blade
      const isLightning = this.ninjaType === 'storm';
      ctx.fillStyle = isLightning ? '#ff0' : '#dde';
      if (isLightning) { ctx.shadowColor = '#ff0'; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.moveTo(6, -1.5);
      ctx.lineTo(32, -0.8);
      ctx.lineTo(36, 0);
      ctx.lineTo(32, 0.8);
      ctx.lineTo(6, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isLightning ? '#ff8' : '#fff';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(8, -1);
      ctx.lineTo(34, 0);
      ctx.stroke();
      if (isLightning) ctx.shadowBlur = 0;
      // Tsuba
      ctx.fillStyle = '#aa8';
      ctx.fillRect(4, -3.5, 3, 7);
      // Handle
      ctx.fillStyle = t.accentColor;
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 3; i++) ctx.fillRect(-4 + i * 3, -2, 1, 4);
      ctx.restore();

      // Moon / crescent slash trail — sized to attack hitbox
      ctx.save();
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);
      const abW = this.attackBox.w;
      const abH = this.attackBox.h;
      const outerR = Math.max(abW, abH / 2) + 8;
      const innerR = outerR - 10 - abW * 0.15;
      const offsetX = -outerR * 0.2;
      const offsetY = -outerR * 0.1;
      const aStart = startA + sweep * Math.max(0, slashProgress - 0.5);
      const aEnd = startA + sweep * slashProgress;
      // Glow layer
      ctx.globalAlpha = 0.25 * (1 - slashProgress * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 4, aStart, aEnd, false);
      ctx.arc(offsetX, offsetY, Math.max(innerR - 4, 6), aEnd, aStart, true);
      ctx.closePath();
      ctx.fillStyle = t.color;
      ctx.fill();
      // Main crescent
      const moonAlpha = 0.6 * (1 - slashProgress * 0.6);
      ctx.globalAlpha = moonAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, aStart, aEnd, false);
      ctx.arc(offsetX, offsetY, innerR, aEnd, aStart, true);
      ctx.closePath();
      ctx.fillStyle = t.accentColor;
      ctx.fill();
      // Bright edge on the outer rim
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = moonAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, aStart, aEnd, false);
      ctx.stroke();
      ctx.restore();

      // Spawn a lingering white cut line at peak of swing
      if (slashProgress > 0.5 && !this._cutSpawned) {
        this._cutSpawned = true;
        const cutR = outerR + 6;
        const chaining = this.chainStriking || this.stormChaining;
        const randA = chaining ? (Math.random() * Math.PI * 2 - Math.PI) : (startA - sweep * 0.1);
        const randSweep = chaining ? (Math.PI * (0.4 + Math.random() * 0.5)) : (sweep * 0.85);
        const randR = chaining ? (cutR * (0.7 + Math.random() * 0.6)) : cutR;
        this._slashCut = {
          cx: cx - sx + this.x, cy: cy - sy + this.y, // world coords
          dir: chaining ? (Math.random() < 0.5 ? 1 : -1) : dir,
          cutR: randR,
          startAngle: randA,
          endAngle: randA + randSweep,
          life: 18, maxLife: 18,
          color: t.accentColor
        };
      }
      if (slashProgress >= 0.99) this._cutSpawned = false;
    }
    if (!this.attacking) this._cutSpawned = false;

    // Lingering slash cut lines
    // During chain striking, accumulate cuts; they all fade when chain ends
    if (this.chainStriking || this.stormChaining) {
      if (!this._chainCuts) this._chainCuts = [];
      if (this._slashCut && this._slashCut.life > 0) {
        if (!this._chainCuts.includes(this._slashCut)) this._chainCuts.push(this._slashCut);
      }
    } else if (this._chainCuts && this._chainCuts.length > 0) {
      // Chain ended — move all to fading
      if (!this._fadingCuts) this._fadingCuts = [];
      for (const c of this._chainCuts) this._fadingCuts.push(c);
      this._chainCuts = null;
    }

    // Render chain cuts (held at full opacity during chain)
    if (this._chainCuts) {
      for (const c of this._chainCuts) {
        const ccx = c.cx - cam.x + this.w / 2;
        const ccy = c.cy - cam.y + this.h / 2 - 8;
        ctx.save();
        ctx.translate(ccx, ccy);
        if (c.dir < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, c.cutR, c.startAngle, c.endAngle, false);
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, c.cutR - 1.5, c.startAngle, c.endAngle, false);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Fading cuts (after chain ends)
    if (this._fadingCuts) {
      for (let i = this._fadingCuts.length - 1; i >= 0; i--) {
        const c = this._fadingCuts[i];
        c.life--;
        if (c.life <= 0) { this._fadingCuts.splice(i, 1); continue; }
        const fade = c.life / c.maxLife;
        const ccx = c.cx - cam.x + this.w / 2;
        const ccy = c.cy - cam.y + this.h / 2 - 8;
        ctx.save();
        ctx.translate(ccx, ccy);
        if (c.dir < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 * fade + 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, c.cutR, c.startAngle, c.endAngle, false);
        ctx.stroke();
        ctx.globalAlpha = fade * fade;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5 * fade;
        ctx.beginPath();
        ctx.arc(0, 0, c.cutR - 1.5, c.startAngle, c.endAngle, false);
        ctx.stroke();
        ctx.restore();
      }
      if (this._fadingCuts.length === 0) this._fadingCuts = null;
    }

    // Single slash cut line (non-chain)
    if (this._slashCut && this._slashCut.life > 0 && !this._chainCuts) {
      const c = this._slashCut;
      c.life--;
      const fade = c.life / c.maxLife;
      const ccx = c.cx - cam.x + this.w / 2;
      const ccy = c.cy - cam.y + this.h / 2 - 8;
      ctx.save();
      ctx.translate(ccx, ccy);
      if (c.dir < 0) ctx.scale(-1, 1);
      // White cut line
      ctx.globalAlpha = fade * 0.85;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * fade + 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.cutR, c.startAngle, c.endAngle, false);
      ctx.stroke();
      // Thinner bright core
      ctx.globalAlpha = fade * fade;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.5 * fade;
      ctx.beginPath();
      ctx.arc(0, 0, c.cutR - 1.5, c.startAngle, c.endAngle, false);
      ctx.stroke();
      ctx.restore();
    }
  }
}
