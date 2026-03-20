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
    this.displayHp = 10;
    this.displayShield = 0;
    this.ninjaType = localStorage.getItem('elenin_lastNinja') || 'fire';
    this.invincibleTimer = 90;
    this.knockbackTimer = 0;
    this.bonusDamage = 0;
    this.bonusElemental = 0;
    this.bonusSpeed = 0;
    this.bonusReach = 0;
    this.bonusArmor = 0;
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
    this.earthAirHover = 0; // timer for midair hover when using air special

    // Bubble ultimate: bubbles on every enemy + underwater
    this.bubbleRide = null; // kept for switchNinja cleanup
    this.bubbleUlt = null; // { timer, trapped: [], underwaterAlpha, damageTick }

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

    // Mana system (pip-based)
    this.mana = 2;
    this.maxMana = 2; // default, set per ninja in switchNinja
    this.manaCost = 1; // cost per special use
    this.bonusMana = 0; // extra max from element orbs

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
    this._spinScythe = null;
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
    this.crystalCastle = false;
    this.crystalShatter = 0;
    this.crystalShards = null;

    // Wind ninja state
    this.windPower = 0;
    this.windFirstDodge = true;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.windTrails = [];
    this.windFullTrails = [];

    // Wind ultimate: giant bow + arrows
    this.windBow = null; // { timer, phase, arrows: [], bowAlpha, bowScale }

    // Storm ninja state
    this.stormChaining = false;
    this.stormChainTargets = [];
    this.stormChainTimer = 0;
    this.stormChainHit = new Set();
    this.stormAfterimages = [];
    this.stormRaindrops = []; // rain visual during ultimate
    this.stormLightningFlash = 0;
    this.stormSheathHits = 0;     // chain hit counter during ult
    this.stormSheathActive = false; // sheathing sword visible
    this.stormSheathFinisher = 0;  // finisher animation timer

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
    this.statusCurse = 0;    // ghost: DOT (curse)
    this.statusBleed = 0;    // spiky: DOT (bleed)
    this.curseCooldown = 0;  // cooldown before curse can reapply
    this.bleedCooldown = 0;  // cooldown before bleed can reapply
    this.freezeNudge = 0;   // visual nudge from mashing out of freeze
    this.maxShurikens = 3;
    this.shurikenLevel = 1;
    this.shurikenRechargeTimer = 0;

    // Death respawn delay
    this.deathTimer = 0;

    // Pending damage (highest prevails per frame)
    this._pendingDamage = null; // { amount, element, killerInfo }

    // Ground slam
    this.slamming = false;

    // Stop midair
    this.stopMidair = false;
    this.stopMidairTimer = 0;

    // Defeated boss/enemy tracking (for earth construct unlocks)
    this.defeatedBossTypes = new Set();
    this.defeatedDeflector = false;

    // Boss items inventory (per-run)
    this.items = {};
    this.deathsKeyUsed = false;
    this.autoSwingTimer = 0; // for The Code
    this.codeComboCount = 0; // 3-hit combo tracker for The Code
    this.evasionRng = Math.random; // for Leather Boots
  }

  // Hurtbox is slightly smaller than the rendered sprite
  getHurtbox() {
    return { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 4 };
  }

  get type() { return NINJA_TYPES[this.ninjaType]; }

  // Mecha hand punch hit detection
  _mechaHandHit(game, g, hand) {
    // Hitbox spans from golem body top down to hand position for full coverage
    const topY = Math.min(g.y, hand.y - 32);
    const botY = Math.max(g.y + g.h, hand.y + 32);
    const hitBox = { x: hand.x - 32, y: topY, w: 64, h: botY - topY };
    const dmg = (this.type.attackDamage + this.bonusElemental) * 3;
    const gcx = g.x + g.w / 2;
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(hitBox, e)) {
        e.takeDamage(dmg, game, gcx);
        const kbDir = Math.sign(e.x + e.w / 2 - gcx) || g.facing;
        e.vx = kbDir * 16; e.vy = -10;
        game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#4a8', 12, 4, 14));
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(hitBox, game.boss)) {
      game.boss.takeDamage(dmg, game, gcx);
      game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#4a8', 16, 5, 18));
    }
    SFX.hit();
    triggerHitstop(3);
  }

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
        // Summon shmup-boss mecha — big head + hand frame that follows
        this.ultimateTimer = 480; // 8 seconds
        {
        const hcx = this.x + this.w / 2, hcy = this.y - 20;
        this.earthGolem = {
          timer: 480,
          facing: this.facing,
          x: this.x - 24,
          y: this.y - 40,
          w: 112,
          h: 100,
          hp: 50,
          maxHp: 50,
          contactCd: 0,
          // Hand frame follows head with lag
          frameX: hcx,
          frameY: hcy + 140,
          leftHand:  { offX: 0, punchTimer: 0 },
          rightHand: { offX: 0, punchTimer: 0 },
          punchCooldown: 0,
          punchSide: 1,
          missileCooldown: 0,
          ballCooldown: 0,
        };
        }
        SFX.slam();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4a8', 25, 6, 20));
        break;

      case 'bubble':
        // Spawn a bubble on every enemy — float and damage them, underwater background
        this.ultimateTimer = 300; // 5 seconds
        {
          const trapped = [];
          for (const e of game.enemies) {
            if (!e.dead) {
              trapped.push({ enemy: e, floatY: e.y, baseY: e.y, bobPhase: Math.random() * Math.PI * 2 });
            }
          }
          if (game.boss && !game.boss.dead) {
            trapped.push({ enemy: game.boss, floatY: game.boss.y, baseY: game.boss.y, bobPhase: Math.random() * Math.PI * 2 });
          }
          this.bubbleUlt = {
            timer: 300,
            trapped,
            underwaterAlpha: 0,
            damageTick: 0,
            bubbleParticles: []
          };
        }
        SFX.special();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 25, 6, 20));
        break;

      case 'shadow':
        // Screen goes dark, glowing eyes appear + purple paralysis on all enemies
        this.ultimateTimer = 360; // 6 seconds of buff after cutscene
        this.shadowDarkness = 0;
        this.shadowEyesTimer = 60; // eyes visible for 60 frames
        this.shadowUltBuff = true;
        // Massive initial shadow strike around the player
        damageInRadius(game, this.x + this.w / 2, this.y + this.h / 2, 200, (this.type.attackDamage + this.bonusElemental) * 3);
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a4e', 40, 10, 30));
        this.shadowStealth = 300;
        this.backstabReady = true;
        // Apply purple paralysis to ALL enemies (including lightning elementals)
        for (const e of game.enemies) {
          if (!e.dead) {
            e.purpleParalyseTimer = 150; // ~2.5 seconds
            e.vx = 0;
            e.vy = 0;
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a040ff', 10, 3, 14));
          }
        }
        if (game.boss && !game.boss.dead) {
          game.boss.purpleParalyseTimer = 90; // shorter for boss
          game.boss.vx = 0;
          game.boss.vy = 0;
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a040ff', 14, 4, 16));
        }
        SFX.backstab();
        break;

      case 'crystal': {
        // Shatter glass effect + summon ice/crystal castle
        this.ultimateTimer = 240; // 4 seconds
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
        // Summon the crystal castle centered on player (fills the screen)
        const castleW = 300, castleH = 600;
        const castleX = this.x + this.w / 2 - castleW / 2;
        const castleY = this.y + this.h - castleH;
        this.crystalCastle = true;
        game.crystalCastle = new CrystalCastle(
          castleX, castleY, castleW, castleH,
          this.type.attackDamage + this.bonusElemental, this.wave || 1
        );
        // Lock ninja to castle center
        this.vx = 0; this.vy = 0;
        SFX.parry();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 30, 8, 25));
        break;
      }

      case 'wind':
        // Giant bow fires 5 arrows upward, they crash down on enemies
        this.ultimateTimer = 300; // 5 seconds total
        this.windPower = 10;
        this.windBow = {
          timer: 300,
          phase: 'bow',    // 'bow' -> 'fire' -> 'rain'
          bowAlpha: 0,
          bowScale: 0,
          bowTimer: 60,    // bow appears for 1 second
          arrows: [],
          arrowsFired: false,
          centerX: this.x + this.w / 2,
          centerY: this.y + this.h / 2
        };
        // Center camera on player
        game.camera.x = this.x + this.w / 2 - CANVAS_W / 2;
        game.camera.y = this.y + this.h / 2 - CANVAS_H / 2;
        SFX.bossSpawn();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 25, 6, 20));
        this.invincibleTimer = 300;
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
    if (this.ultCutscene || this.earthGolem || this.bubbleRide || this.bubbleUlt || this.windBow || this.crystalCastle) return; // Can't switch during ultimate cutscene, golem, bubble, wind bow, or crystal castle
    this.ninjaType = type;
    try { localStorage.setItem('elenin_lastNinja', type); } catch(e) {}
    this.comboMeter = 0;
    this.comboTimer = 0;
    this.fireArmor = false;
    this.fireArmorTimer = 0;
    this.bubbleBuffTimer = 0;
    this.backstabReady = false;
    this.shadowStealth = 0;
    this.chainStriking = false;
    if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
    this.parrying = false;
    this.parryCombo = 0;
    this.parryComboTimer = 0;
    this.crystalCastle = false;
    this.crystalShatter = 0;
    this.crystalShards = null;
    this.windPower = 0;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.stormChaining = false;
    this.stormChainHit = new Set();
    this.stormAfterimages = [];
    // Set mana capacity per ninja
    const manaCaps = { fire: 2, earth: 3, bubble: 2, shadow: 2, crystal: 2, wind: 2, storm: 2 };
    this.maxMana = (manaCaps[type] || 2) + this.bonusMana;
    this.mana = this.maxMana;
  }

  update(game) {
    // Apply highest pending damage from last frame
    this._applyPendingDamage(game);

    // Smooth display bars
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    this.displayShield = lerp(this.displayShield, this.shield, 0.12);

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
        this.statusParalyse = 0; this.statusStun = 0; this.statusCurse = 0; this.statusBleed = 0;
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
              damageInRadius(game, m.targetX, m.targetY, 150, (this.type.attackDamage + this.bonusElemental + 6) * 3, m.targetX);
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
              damageInRadius(game, m.targetX, m.targetY, 80, this.type.attackDamage + this.bonusElemental + 6, m.targetX);
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

      // Earth: update shmup-boss mecha with orbiting hands
      if (this.ninjaType === 'earth' && this.earthGolem) {
        const g = this.earthGolem;
        g.timer--;
        const cx = g.x + g.w / 2;
        const cy = g.y + g.h / 2;

        // Move mecha with input
        let moveX = 0, moveY = 0;
        if (keys['ArrowLeft'] || keys['KeyA'] || touchState.left || gpState.axes[0] < -0.3) moveX = -1;
        if (keys['ArrowRight'] || keys['KeyD'] || touchState.right || gpState.axes[0] > 0.3) moveX = 1;
        if (keys['ArrowUp'] || keys['KeyW'] || touchState.up || gpState.axes[1] < -0.3) moveY = -1;
        if (keys['ArrowDown'] || keys['KeyS'] || touchState.down || gpState.axes[1] > 0.3) moveY = 1;
        if (moveX !== 0) g.facing = moveX;
        g.x += moveX * 2.5;
        g.y += moveY * 2.5 + Math.sin(game.tick * 0.05) * 0.5;
        g.x = Math.max(0, Math.min(game.levelW - g.w, g.x));
        g.y = Math.max(-50, Math.min(480 - g.h, g.y));
        this.x = g.x + g.w / 2 - this.w / 2;
        this.y = g.y + g.h - this.h - 8;
        this.vy = 0;
        this.grounded = false;

        // Hand frame follows head with smooth lag
        const headCX = cx, headCY = g.y + 20;
        const frameTargX = headCX;
        const frameTargY = headCY + 140; // gap below head (2x scale)
        g.frameX += (frameTargX - g.frameX) * 0.08;
        g.frameY += (frameTargY - g.frameY) * 0.08;

        const lh = g.leftHand, rh = g.rightHand;
        const handSpacing = 140;

        // Punch offsets (lunge forward then return)
        if (lh.punchTimer > 0) {
          lh.punchTimer--;
          lh.offX = Math.sin((lh.punchTimer / 20) * Math.PI) * 160 * g.facing;
          if (lh.punchTimer === 10) {
            lh.x = g.frameX - handSpacing + lh.offX;
            lh.y = g.frameY;
            this._mechaHandHit(game, g, lh);
          }
        } else {
          lh.offX *= 0.7;
        }
        if (rh.punchTimer > 0) {
          rh.punchTimer--;
          rh.offX = Math.sin((rh.punchTimer / 20) * Math.PI) * 160 * g.facing;
          if (rh.punchTimer === 10) {
            rh.x = g.frameX + handSpacing + rh.offX;
            rh.y = g.frameY;
            this._mechaHandHit(game, g, rh);
          }
        } else {
          rh.offX *= 0.7;
        }
        // World positions for hands
        lh.x = g.frameX - handSpacing + lh.offX;
        lh.y = g.frameY;
        rh.x = g.frameX + handSpacing + rh.offX;
        rh.y = g.frameY;

        // Contact damage (body)
        if (g.contactCd > 0) g.contactCd--;
        if (g.contactCd <= 0) {
          const golemBox = { x: g.x, y: g.y, w: g.w, h: g.h };
          for (const e of game.enemies) {
            if (!e.dead && rectOverlap(golemBox, e)) {
              e.takeDamage(this.type.attackDamage + this.bonusElemental + 3, game, cx);
              const kbDir = Math.sign(e.x + e.w / 2 - cx) || 1;
              e.vx = kbDir * 14; e.vy = -8;
              g.contactCd = 15;
              break;
            }
          }
          if (g.contactCd <= 0 && game.boss && !game.boss.dead && rectOverlap({ x: g.x, y: g.y, w: g.w, h: g.h }, game.boss)) {
            game.boss.takeDamage(this.type.attackDamage + this.bonusElemental + 3, game, cx);
            g.contactCd = 15;
          }
        }

        // Punch: attack button — alternating hand lunges forward
        if (g.punchCooldown > 0) g.punchCooldown--;
        if (g.punchCooldown <= 0 && (consumePress('KeyZ') || consumePress('KeyJ') || justPressed['MouseAttack'] || gpJust[GP_ATTACK])) {
          const hand = g.punchSide > 0 ? rh : lh;
          hand.punchTimer = 20;
          g.punchCooldown = 24;
          g.punchSide *= -1; // alternate
          SFX.attack();
        }

        // Missiles: special button — 2 rockets in facing direction
        if (g.missileCooldown > 0) g.missileCooldown--;
        if (g.missileCooldown <= 0 && (consumePress('KeyX') || consumePress('KeyK') || justPressed['MouseSpecial'] || gpJust[GP_SPECIAL])) {
          g.missileCooldown = 28;
          const px = cx + g.facing * (g.w / 2 + 4);
          const dmg = this.type.attackDamage + this.bonusElemental + 5;
          const p1 = new Projectile(px, cy - 10, g.facing * 9, -1.5, '#f84', dmg, 'player');
          const p2 = new Projectile(px, cy + 10, g.facing * 9,  1.5, '#f84', dmg, 'player');
          p1.isMissile = true; p2.isMissile = true;
          p1.noPlat = true; p2.noPlat = true;
          game.projectiles.push(p1, p2);
          SFX.shuriken();
        }

        // Yellow ball burst: shuriken button — radial shmup-boss pattern
        if (g.ballCooldown > 0) g.ballCooldown--;
        if (g.ballCooldown <= 0 && (consumePress('KeyC') || consumePress('KeyL') || consumePress('MouseShuriken') || touchJust.shuriken || gpJust[GP_SHURIKEN])) {
          g.ballCooldown = 40;
          const count = 12;
          const dmg = this.type.attackDamage + this.bonusElemental + 2;
          for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i;
            const spd = 5;
            const bp = new Projectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, '#ff0', dmg, 'player');
            bp.noPlat = true;
            game.projectiles.push(bp);
          }
          SFX.slam();
          game.effects.push(new Effect(cx, cy, '#ff0', 16, 5, 16));
        }

        // Golem expires
        if (g.timer <= 0) {
          game.effects.push(new Effect(cx, cy, '#aaa', 20, 6, 20));
          SFX.slam();
          this.earthGolem = null;
        }
      }

      // Wind: giant bow fires arrows upward, they crash down
      if (this.ninjaType === 'wind' && this.windBow) {
        const wb = this.windBow;
        wb.timer--;
        // Keep player centered and frozen
        this.vx = 0;
        this.vy = 0;

        if (wb.phase === 'bow') {
          // Bow appears and grows
          wb.bowAlpha = Math.min(wb.bowAlpha + 0.04, 1);
          wb.bowScale = Math.min(wb.bowScale + 0.03, 1);
          wb.bowTimer--;
          // Wind particles around bow
          if (game.tick % 3 === 0) {
            game.effects.push(new Effect(
              wb.centerX + randInt(-60, 60),
              wb.centerY + randInt(-80, 80),
              '#bfb', 4, 2, 12
            ));
          }
          if (wb.bowTimer <= 0) {
            wb.phase = 'fire';
            // Create 30 arrows that launch upward in a wide volley
            for (let i = 0; i < 30; i++) {
              const spreadX = (i - 14.5) * 12 + randInt(-8, 8);
              wb.arrows.push({
                x: wb.centerX + spreadX * 0.4,
                y: wb.centerY - 60,
                vx: spreadX * 0.03,
                vy: -16 - Math.random() * 6,
                phase: 'up',    // 'up' -> 'pause' -> 'down'
                pauseTimer: 20 + Math.floor(i / 3) * 4 + randInt(0, 6),
                targetX: 0,
                targetY: 0,
                trail: [],
                done: false,
                hitSet: new Set(),
                size: 0.8 + Math.random() * 0.4
              });
            }
            SFX.shuriken();
          }
        } else if (wb.phase === 'fire') {
          // Update arrows
          let allDone = true;
          for (const a of wb.arrows) {
            if (a.done) continue;
            allDone = false;
            if (a.phase === 'up') {
              a.x += a.vx;
              a.y += a.vy;
              a.vy += 0.4; // decelerate
              a.trail.push({ x: a.x, y: a.y, life: 20 });
              // Wind trail particles
              if (game.tick % 2 === 0) {
                game.effects.push(new Effect(a.x, a.y, '#8d8', 2, 1, 8));
              }
              if (a.vy >= 0) {
                a.phase = 'pause';
                // Pick a target — pool enemies AND boss together
                const targets = [];
                for (const e of game.enemies) {
                  if (!e.dead) targets.push(e);
                }
                if (game.boss && !game.boss.dead) targets.push(game.boss);
                if (targets.length > 0) {
                  const target = targets[Math.floor(Math.random() * targets.length)];
                  a.targetX = target.x + target.w / 2 + randInt(-20, 20);
                  a.targetY = target.y + target.h / 2;
                } else {
                  a.targetX = wb.centerX + randInt(-100, 100);
                  a.targetY = wb.centerY + 60;
                }
              }
            } else if (a.phase === 'pause') {
              // Brief pause at apex
              a.pauseTimer--;
              a.size = Math.min(a.size + 0.05, 2); // arrow grows slightly
              if (a.pauseTimer <= 0) {
                a.phase = 'down';
                // Calculate velocity toward target
                const dx = a.targetX - a.x;
                const dy = a.targetY - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                a.vx = (dx / d) * 16;
                a.vy = (dy / d) * 16;
                SFX.attack();
              }
            } else if (a.phase === 'down') {
              a.x += a.vx;
              a.y += a.vy;
              a.vy += 0.3; // accelerate downward
              a.trail.push({ x: a.x, y: a.y, life: 15 });
              // Check impact with ground or near target
              if (a.y >= a.targetY - 5 || a.y > game.camera.y + CANVAS_H + 50) {
                a.done = true;
                // Impact damage in radius
                damageInRadius(game, a.targetX, a.targetY, 100, (this.type.attackDamage + this.bonusElemental + 6) * 4, a.targetX);
                game.effects.push(new Effect(a.targetX, a.targetY, '#bfb', 20, 7, 18));
                game.effects.push(new Effect(a.targetX, a.targetY, '#8d8', 15, 5, 14));
                game.effects.push(new Effect(a.targetX, a.targetY, '#fff', 10, 4, 10));
                SFX.slam();
                triggerHitstop(5);
              }
            }
            // Decay trails
            for (const t of a.trail) t.life--;
            a.trail = a.trail.filter(t => t.life > 0);
          }
          if (allDone || wb.timer <= 0) {
            wb.phase = 'done';
          }
        }
        // Expire
        if (wb.phase === 'done' || wb.timer <= 0) {
          this.windBow = null;
        }
      }

      // Bubble: enemies trapped in bubbles, floating + underwater
      if (this.ninjaType === 'bubble' && this.bubbleUlt) {
        const bu = this.bubbleUlt;
        bu.timer--;
        // Fade in underwater overlay
        bu.underwaterAlpha = Math.min(bu.underwaterAlpha + 0.02, 0.35);
        // Damage tick every 20 frames
        bu.damageTick++;
        const doDamage = bu.damageTick % 20 === 0;
        // Update trapped enemies — float upward with bob
        for (const t of bu.trapped) {
          if (t.enemy.dead) continue;
          t.bobPhase += 0.06;
          t.floatY -= 0.6; // float upward
          t.enemy.x += Math.sin(t.bobPhase * 0.7) * 0.3; // gentle sway
          t.enemy.y = t.floatY + Math.sin(t.bobPhase) * 4;
          t.enemy.vx = 0;
          t.enemy.vy = 0;
          t.enemy.freezeTimer = 2; // keep them immobile
          if (doDamage) {
            t.enemy.takeDamage(this.type.attackDamage + this.bonusElemental + 1, game, this.x + this.w / 2);
            game.effects.push(new Effect(t.enemy.x + t.enemy.w / 2, t.enemy.y + t.enemy.h / 2, '#4af', 6, 2, 10));
          }
        }
        // Spawn underwater bubble particles
        if (game.tick % 4 === 0) {
          bu.bubbleParticles.push({
            x: game.camera.x + Math.random() * CANVAS_W,
            y: game.camera.y + CANVAS_H + 10,
            speed: 0.5 + Math.random() * 1.5,
            size: 3 + Math.random() * 8,
            wobble: Math.random() * Math.PI * 2,
            life: 180
          });
        }
        for (const p of bu.bubbleParticles) {
          p.y -= p.speed;
          p.x += Math.sin(p.wobble) * 0.3;
          p.wobble += 0.04;
          p.life--;
        }
        bu.bubbleParticles = bu.bubbleParticles.filter(p => p.life > 0);
        // Expire
        if (bu.timer <= 0) {
          // Pop all bubbles with final burst damage
          for (const t of bu.trapped) {
            if (!t.enemy.dead) {
              t.enemy.freezeTimer = 0;
              t.enemy.takeDamage((this.type.attackDamage + this.bonusElemental) * 2, game, this.x + this.w / 2);
              game.effects.push(new Effect(t.enemy.x + t.enemy.w / 2, t.enemy.y + t.enemy.h / 2, '#4af', 14, 5, 16));
              game.effects.push(new Effect(t.enemy.x + t.enemy.w / 2, t.enemy.y + t.enemy.h / 2, '#8cf', 10, 3, 12));
            }
          }
          SFX.slam();
          this.bubbleUlt = null;
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
        } else if (this.ninjaType === 'wind' && this.windBow && this.windBow.phase !== 'done') {
          // keep running until arrows are done
        } else {
          this.ultimateActive = false;
          this.ultimateCharge = 0;
          this.ultimateReady = false;
          this.ultimateMax = Math.round(this.ultimateMax * 1.2);
          // Clean up type-specific state
          this.earthGolem = null;
          this.bubbleRide = null;
          this.bubbleUlt = null;
          this.windBow = null;
          this.fireMeteors = [];
          this.shadowUltBuff = false;
          this.shadowDarkness = 0;
          this.shadowEyesTimer = 0;
          this.stormRaindrops = [];
          // Crystal castle cleanup
          if (this.crystalCastle) {
            if (game.crystalCastle && !game.crystalCastle.done) {
              game.crystalCastle.explode(game);
            }
            game.crystalCastle = null;
            this.crystalCastle = false;
          }
        }
      }
    }

    // Ultimate activation input
    if (this.ultimateReady && !this.ultimateActive) {
      if (consumePress('KeyV') || consumePress('KeyM') || gpJust[3]) {
        this.activateUltimate(game);
      }
    }

    // Skip normal movement if in earth golem, wind bow, or crystal castle
    if (this.earthGolem || this.windBow || this.crystalCastle) {
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

    // Curse (ghost): DOT — drains HP over time, purple wisps
    if (this.statusCurse > 0) {
      this.statusCurse--;
      if (this.curseCooldown > 0) this.curseCooldown--;
      if (this.statusCurse % 40 === 0 && this.statusCurse > 0) {
        const curseDmg = Math.max(1, Math.round(this.maxHp * 0.03));
        this.hp -= curseDmg;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c8a', 5, 2, 8));
        game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, curseDmg, 'ghost'));
      }
      if (Math.random() < 0.2) {
        game.effects.push(new Effect(
          this.x + Math.random() * this.w,
          this.y + this.h - Math.random() * this.h * 0.5,
          '#b898d8', 2, 0.6, 14
        ));
      }
    }

    // Bleed (spiky): DOT — thorn damage over time, red particles
    if (this.statusBleed > 0) {
      this.statusBleed--;
      if (this.bleedCooldown > 0) this.bleedCooldown--;
      if (this.statusBleed % 30 === 0 && this.statusBleed > 0) {
        const bleedDmg = Math.max(1, Math.round(this.maxHp * 0.04));
        this.hp -= bleedDmg;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f64', 4, 2, 8));
        game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, bleedDmg, 'spiky'));
      }
      if (Math.random() < 0.25) {
        game.effects.push(new Effect(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          '#f86', 1.5, 0.8, 10
        ));
      }
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
          const burnDmg = Math.max(1, Math.round(this.maxHp * 0.05));
          this.hp -= burnDmg;
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 5, 2, 8));
        }
      }
      if (this.statusFreeze > 0) this.statusFreeze--;
      if (this.statusFloat > 0) this.statusFloat--;
      if (this.statusCurse > 0) this.statusCurse--;
      if (this.statusBleed > 0) this.statusBleed--;
      if (this.curseCooldown > 0) this.curseCooldown--;
      if (this.bleedCooldown > 0) this.bleedCooldown--;
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
      if (this.knockbackTimer > 0) {
        this.knockbackTimer--;
        this.vx *= 0.88;
      } else {
        const speedMult = (this.bubbleBuffTimer > 0) ? 1.35 : 1;
        const freezeMult = (this.statusFreeze > 0) ? 0.4 : 1;
        this.vx = moveX * (t.speed + this.bonusSpeed * 0.3) * speedMult * freezeMult;
      }
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

    // Earth air hover
    if (this.earthAirHover > 0) {
      this.earthAirHover--;
      this.vy = 0;
    }

    // Gravity
    let grav = (this.bubbleBuffTimer > 0) ? GRAVITY * 0.55 : GRAVITY;
    if (this.statusFloat > 0) grav *= 0.35;
    if (!this.slamming && !this.windDashing && !this.stopMidair && !this.fireDashing && this.earthAirHover <= 0) {
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
    const wasGrounded = this.grounded;
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
        } else if (this.vx > 0 && p.h > p.w) {
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
        } else if (this.vx < 0 && p.h > p.w) {
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

    for (const b of game.stoneBlocks) {
      if (b.done || !b.isCollidable()) continue;
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

    // Landing dust particles
    if (this.grounded && !wasGrounded && !this.slamming) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h;
      for (let i = 0; i < 4; i++) {
        game.effects.push(new Effect(cx + (Math.random() - 0.5) * 12, cy, '#aa9', 2, 1, 8));
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

    // Running footstep dust
    if (this.grounded && Math.abs(this.vx) > 1.5 && game.tick % 6 === 0) {
      game.effects.push(new Effect(
        this.x + this.w / 2 - this.facing * 4, this.y + this.h,
        '#998', 1, 0.8, 6
      ));
    }

    // Ground slam landing
    if (this.slamming && this.grounded) {
      this.slamming = false;
      triggerHitstop(8);
      triggerScreenShake(6, 10);
      SFX.slam();
      if (this.ninjaType === 'bubble') {
        for (const b of game.bubbles) {
          if (!b.done) b.pop(game);
        }
      }
      let slamDmg = t.attackDamage + this.bonusElemental + 2;
      const slamCX = this.x + this.w / 2;
      const slamCY = this.y + this.h;
      const slamColor = t.color;
      const slamAccent = t.accentColor;

      // Main slam burst in ninja's color
      game.effects.push(new Effect(slamCX, slamCY, slamColor, 16, 5, 18));
      game.effects.push(new Effect(slamCX, slamCY, slamAccent, 10, 4, 14));

      // Ground shockwave ring (SlamRing effect)
      game.effects.push(new SlamRing(slamCX, slamCY, slamColor, slamAccent));

      // Earth: ground pound nearby boulders, extra slam damage
      if (this.ninjaType === 'earth') {
        slamDmg = Math.ceil(slamDmg * 1.5);
        for (const b of game.stoneBlocks) {
          if (b.done) continue;
          if (b instanceof EarthBoulder && (b.hovering || b.rising)) {
            const bdx = (b.x + b.w / 2) - slamCX;
            const bdy = (b.y + b.h / 2) - slamCY;
            if (Math.sqrt(bdx * bdx + bdy * bdy) < 120) {
              b.groundPound();
              game.effects.push(new Effect(b.x + b.w / 2, b.y + b.h / 2, '#a87', 12, 4, 14));
            }
          }
        }
      }

      // Damage nearby enemies + apply ninja-specific effects
      for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = (e.x + e.w / 2) - slamCX;
        const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          e.takeDamage(slamDmg, game, slamCX, 'physical');
          e.vy = -5;
          e.vx = Math.sign(dx) * 4;

          // Per-ninja slam effects
          switch (this.ninjaType) {
            case 'fire':
              e.burnTimer = 150;
              this.comboMeter = Math.min(this.comboMeter + 1, 10);
              this.comboTimer = 180;
              if (this.comboMeter >= 10) e.burnTimer = 150;
              if (this.comboMeter >= 8 && !this.fireArmor) {
                this.fireArmor = true;
                this.fireArmorTimer = 300;
                SFX.armor();
                game.effects.push(new Effect(slamCX, this.y + this.h / 2, '#f93', 15, 4, 20));
              }
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#f80', 8, 3, 12));
              break;
            case 'bubble':
              // Make enemies lose gravity
              e.vy = -6;
              e.vx = Math.sign(dx) * 2;
              e.floatTimer = 90;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#4af', 10, 3, 16));
              game.effects.push(new Effect(e.x + e.w / 2, e.y, '#8cf', 6, 2, 12));
              break;
            case 'earth':
              // Extra knockback + stun
              e.vx = Math.sign(dx) * 6;
              e.vy = -3;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h, '#a67540', 8, 3, 10));
              break;
            case 'crystal':
              // Freeze + ice slide
              e.launchIceSlide(game, slamCX, slamDmg);
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#0ff', 6, 2, 10));
              break;
            case 'shadow':
              // Paralyze enemies
              e.purpleParalyseTimer = Math.max(e.purpleParalyseTimer, 60);
              e.vx = 0;
              e.vy = 0;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a040ff', 10, 3, 14));
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#a4e', 6, 2, 10));
              break;
            case 'storm':
              // Soak enemies
              e.soakTimer = Math.max(e.soakTimer, 300);
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#48f', 10, 3, 14));
              game.effects.push(new Effect(e.x + e.w / 2, e.y, '#fd0', 4, 5, 8));
              break;
            case 'wind':
              // Strong push away
              e.vx = Math.sign(dx) * 12;
              e.vy = -6;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#bfb', 10, 4, 14));
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#9e9', 6, 3, 10));
              break;
          }
        }
        slamDmg *= 0.9;
      }
      // Damage boss + apply ninja-specific effects
      if (game.boss && !game.boss.dead) {
        const dx = (game.boss.x + game.boss.w / 2) - slamCX;
        const dy = (game.boss.y + game.boss.h / 2) - (this.y + this.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          game.boss.takeDamage(slamDmg, game, slamCX, 'physical');
          switch (this.ninjaType) {
            case 'fire':
              game.boss.burnTimer = 150;
              this.comboMeter = Math.min(this.comboMeter + 1, 10);
              this.comboTimer = 180;
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 10, 4, 14));
              break;
            case 'bubble':
              game.boss.vy = -6;
              game.boss.vx = Math.sign(dx) * 3;
              game.boss.floatTimer = 45;
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#4af', 12, 3, 16));
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y, '#8cf', 8, 2, 12));
              break;
            case 'crystal':
              game.boss.launchIceSlide(game, slamCX, slamDmg);
              break;
            case 'shadow':
              game.boss.purpleParalyseTimer = Math.max(game.boss.purpleParalyseTimer, 40);
              game.boss.vx = 0;
              game.boss.vy = 0;
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#a040ff', 12, 4, 14));
              break;
            case 'storm':
              game.boss.soakTimer = Math.max(game.boss.soakTimer, 300);
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#48f', 12, 4, 14));
              break;
            case 'wind':
              game.boss.vx = Math.sign(dx) * 8;
              game.boss.vy = -4;
              game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#bfb', 12, 4, 14));
              break;
          }
        }
      }
    }

    // Spike collision
    for (const s of game.spikes) {
      if (rectOverlap(this, s)) {
        const spikeDmg = Math.max(1, Math.round(this.maxHp * 0.2));
        this.takeDamage(spikeDmg, game, 'spike', { type: 'spike' });
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
        const burnDmg = Math.max(1, Math.round(this.maxHp * 0.05));
        this.hp -= burnDmg;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 5, 2, 8));
        if (this.hp <= 0) {
          this.deathTimer = 180;
          this.vx = 0; this.vy = 0;
          const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
          game.effects.push(new Effect(cx, cy, '#fff', 20, 6, 25));
          game.effects.push(new Effect(cx, cy, this.type.color, 15, 5, 20));
          game.effects.push(new Effect(cx, cy, '#f44', 12, 4, 18));
          game.effects.push(new TextEffect(cx, cy - 20, 'K.O.', '#f44'));
          game.phraseText = '';
          game.phraseTimer = 0;
          game.ninjaResponseText = '';
          game.ninjaResponseTimer = 0;
          game.ninjaResponseActive = false;
          // Kill phrase from burn
          const burnKiller = { type: 'burn', element: 'fire', isBoss: false };
          const burnPhrase = getKillPhrase(burnKiller.type, this.ninjaType, burnKiller.element);
          if (burnPhrase) {
            game.killPhraseText = burnPhrase;
            game.killPhraseTimer = 90;
            game.killPhraseMaxTimer = 90;
            game.killPhraseColor = ELEMENT_COLORS['fire'] ? ELEMENT_COLORS['fire'].accent : '#f88';
            game.killPhrasePos = { x: this.x + this.w / 2, y: this.y - 20 };
          }
          game.deaths++;
          game.lives--;
          if (game.lives <= 0) {
            game.killerInfo = burnKiller;
            game.gameOverDelay = 120;
            game.phraseText = '';
            game.phraseTimer = 0;
            game.ninjaResponseText = '';
            game.ninjaResponseTimer = 0;
            game.ninjaResponseActive = false;
            // Override with boss phrase on game over
            if (game.bossActive && game.boss && !game.boss.dead) {
              const waveDef = WAVE_DEFS[game.wave - 1];
              const bossPhrase = getKillPhrase(waveDef.boss, this.ninjaType, game.boss.element);
              if (bossPhrase) {
                game.killPhraseText = bossPhrase;
                game.killPhraseTimer = 90;
                game.killPhraseMaxTimer = 90;
                game.killPhraseColor = game.boss.element && ELEMENT_COLORS[game.boss.element] ? ELEMENT_COLORS[game.boss.element].accent : '#f88';
                game.killPhrasePos = { x: game.boss.x + game.boss.w / 2, y: game.boss.y };
              }
            }
            recordGameOver(game.totalKills);
          }
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
    if (this.statusStun > 0) this.statusStun--;
    if (this.curseCooldown > 0) this.curseCooldown--;
    if (this.bleedCooldown > 0) this.bleedCooldown--;

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
          if (!e.dead && e.hitCooldown <= 0 && this.attackBox && rectOverlap(this.attackBox, e)) {
            let dmg = t.attackDamage + this.bonusDamage;
            if (this.ninjaType === 'shadow') {
              if (this.backstabReady || e.hp <= this.shadowKillThreshold) {
                dmg = 9999;
                SFX.backstab();
                if (this.backstabReady && !this.chainStriking) {
                  this.chainStriking = true;
                  this.chainTimer = 6;
                  this.chainLastHit = e;
                  this._spinScythe = new SpinningScythe(this, this.shadowUltBuff, game);
                  game.effects.push(this._spinScythe);
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
              dmg += this.crystalCastle ? 2 : 0;
            }
            if (this.ninjaType === 'wind') {
              dmg += this.windPower;
            }
            e.takeDamage(dmg, game, this.x + this.w / 2, 'steel', 'sword');
            // Vampire Teeth: heal 1% HP per hit (min 1)
            if (this.items.vampireTeeth) {
              const healAmt = Math.max(1, Math.round(this.maxHp * 0.01));
              this.hp = Math.min(this.hp + healAmt, this.maxHp);
            }
            if (!this.ultimateReady && !this.ultimateActive) {
              this.addUltimateCharge(4);
            }
            // Mana charge on hit
            this.mana = Math.min(this.mana + 0.25, this.maxMana);
            e.hitCooldown = 15;

            if (this.ninjaType === 'crystal') {
              e.launchIceSlide(game, this.x + this.w / 2, dmg);
              for (const other of game.enemies) {
                if (other !== e && !other.dead && other.freezeTimer >= 1) {
                  other.takeDamage(dmg * 0.75, game, this.x + this.w / 2);
                }
              }
            }

            // Storm: hitting a soaked enemy starts lightning chain
            if (this.ninjaType === 'storm' && e.soakTimer > 0 && !this.stormChaining) {
              this.stormChaining = true;
              this.stormChainTimer = 4;
              this.stormChainHit = new Set();
              this.stormChainHit.add(e);
              if (this.ultimateActive) {
                this.stormSheathActive = true;
                this.stormSheathHits = 1;
              }
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

        // Attack stone blocks — launch walls/boulders
        for (const b of game.stoneBlocks) {
          if (!b.done && this.attackBox && rectOverlap(this.attackBox, b)) {
            if (b instanceof EarthWall && !b.launched) {
              b.launch(this.facing);
              triggerHitstop(3);
            } else if (b instanceof EarthBoulder && (b.hovering || b.rising)) {
              let nearest = null, nd = Infinity;
              const bcx = b.x + b.w / 2;
              for (const e of game.enemies) {
                if (e.done) continue;
                const ex = e.x + e.w / 2;
                if ((ex - bcx) * this.facing < 0) continue;
                const d = Math.hypot(ex - bcx, e.y + e.h / 2 - b.y);
                if (d < nd) { nd = d; nearest = e; }
              }
              if (game.boss && !game.boss.done) {
                const bx = game.boss.x + game.boss.w / 2;
                if ((bx - bcx) * this.facing >= 0) {
                  const d = Math.hypot(bx - bcx, game.boss.y + game.boss.h / 2 - b.y);
                  if (d < nd) { nd = d; nearest = game.boss; }
                }
              }
              if (nearest) b.launchAt(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2);
              else b.launchAt(b.x + this.facing * 300, b.y);
              triggerHitstop(3);
            }
          }
        }
        // Destroy/deflect enemy projectiles with attack
        for (const p of game.projectiles) {
          if (!p.done && p.owner !== 'player' && p.owner !== 'boss' && this.attackBox && rectOverlap(this.attackBox, p)) {
            if (this.items.iaito) {
              // Deflect back at enemies
              p.vx = -p.vx * 1.3;
              p.vy = (Math.random() - 0.5) * 2;
              p.owner = 'player';
              p.damage = Math.max(p.damage, t.attackDamage + this.bonusDamage);
              p.color = '#eef';
              p.hitSet = new Set();
              game.effects.push(new Effect(p.x + p.w / 2, p.y + p.h / 2, '#eef', 8, 3, 10));
            } else {
              p.done = true;
              game.effects.push(new Effect(p.x + p.w / 2, p.y + p.h / 2, '#fff', 6, 2, 8));
            }
            SFX.parry();
          }
        }
        // Pop bubbles with attack
        for (const b of game.bubbles) {
          if (!b.done && this.attackBox && rectOverlap(this.attackBox, b)) {
            b.pop(game);
          }
        }
        // Hit boss
        if (game.boss && !game.boss.dead && game.boss.hitCooldown <= 0 && this.attackBox && rectOverlap(this.attackBox, game.boss)) {
          let dmg = t.attackDamage + this.bonusDamage;
          if (this.ninjaType === 'shadow' && this.backstabReady) {
            dmg = 9999;
            if (!this.chainStriking) {
              this.chainStriking = true;
              this.chainTimer = 6;
              this.chainLastHit = game.boss;
              this._spinScythe = new SpinningScythe(this, this.shadowUltBuff, game);
              game.effects.push(this._spinScythe);
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
          if (this.ninjaType === 'crystal') dmg += this.crystalCastle ? 2 : 0;
          if (this.ninjaType === 'wind') dmg += this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2, 'steel', 'sword');
          // Vampire Teeth: heal 1% HP per hit (min 1)
          if (this.items.vampireTeeth) {
            const healAmt = Math.max(1, Math.round(this.maxHp * 0.01));
            this.hp = Math.min(this.hp + healAmt, this.maxHp);
          }
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
            if (this.ultimateActive) {
              this.stormSheathActive = true;
              this.stormSheathHits = 1;
            }
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 15, 5, 15));
            SFX.backstab();
          }
          // Storm sword: apply electric paralysis to boss
          if (this.ninjaType === 'storm') {
            game.boss.paralyseTimer = Math.max(game.boss.paralyseTimer, 30);
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 8, 3, 12));
          }
          if (this.ninjaType === 'shadow') this.shadowAttackHit = true;
          if (this.ninjaType === 'crystal') game.boss.launchIceSlide(game, this.x + this.w / 2, dmg);
          game.boss.hitCooldown = 15;
          triggerHitstop(5);
        }
      }
    }

    if ((consumePress('KeyZ') || consumePress('KeyJ') || consumePress('MouseAttack') || touchJust.attack || gpJust[GP_ATTACK]) && !this.attacking && this.attackCooldown <= 0) {
      if (this.statusParalyse > 0) {
        this.statusStun = 30;
        this.statusParalyse = Math.max(0, this.statusParalyse - 30);
        const paraDmg = Math.max(1, Math.round(this.maxHp * 0.15));
        this.hp -= paraDmg;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STUNNED!', '#ff0'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 5, 2, 8));
        SFX.play(200, 'square', 0.2, 0.15, 0);
      } else {
        this.shadowAttackHit = false;
        this.attack(game);
        if (this.items.theCode) this.codeComboCount = 1;
      }
    }

    // The Code: hold attack for a 3-hit combo
    if (this.items.theCode && !this.attacking && this.attackCooldown <= 0 && this.statusParalyse <= 0 && this.statusStun <= 0) {
      const holdingAttack = keys['KeyZ'] || keys['KeyJ'] || keys['MouseAttack'] || touchState.attack || gpState.buttons[GP_ATTACK];
      if (holdingAttack && this.codeComboCount > 0 && this.codeComboCount < 3) {
        this.shadowAttackHit = false;
        this.attack(game);
        this.codeComboCount++;
      }
    }
    // Reset combo when attack released or combo finished
    if (this.codeComboCount >= 3 || !(keys['KeyZ'] || keys['KeyJ'] || keys['MouseAttack'] || touchState.attack || gpState.buttons[GP_ATTACK])) {
      this.codeComboCount = 0;
    }

    // Special ability
    if ((consumePress('KeyX') || consumePress('KeyK') || consumePress('MouseSpecial') || touchJust.special || gpJust[GP_SPECIAL]) && this.mana >= this.manaCost) {
      this.mana -= this.manaCost;
      this.useSpecial(game);
    }

    // Throw shuriken — recharge only starts when all shurikens are empty
    if (this.shurikens <= 0) {
      this.shurikenRechargeTimer++;
      const rechargeTime = this.items.tripleShuriken ? 75 : 150;
      if (this.shurikenRechargeTimer >= rechargeTime) {
        this.shurikens = this.maxShurikens;
        this.shurikenRechargeTimer = 0;
      }
    }
    if ((consumePress('KeyC') || consumePress('KeyL') || consumePress('MouseShuriken') || touchJust.shuriken || gpJust[GP_SHURIKEN]) && this.shurikens > 0) {
      if (this.statusParalyse > 0) {
        this.statusStun = 30;
        this.statusParalyse = Math.max(0, this.statusParalyse - 30);
        const paraDmg = Math.max(1, Math.round(this.maxHp * 0.15));
        this.hp -= paraDmg;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STUNNED!', '#ff0'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 5, 2, 8));
        SFX.play(200, 'square', 0.2, 0.15, 0);
      } else {
      SFX.shuriken();
      const isKunai = this.items.theKunai && this.shurikens === 1;
      this.shurikens--;
      const dmg = (t.attackDamage + this.bonusDamage) * (this.shurikenLevel);
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      const color = isKunai ? '#f66' : (this.ninjaType === 'fire') ? '#f93' : (this.ninjaType === 'crystal') ? '#aff' : (this.ninjaType === 'storm') ? '#48f' : '#ccc';
      const makeShuriken = (angleOffset) => {
        const sProj = fireProjectileAtNearestEnemy({
          x: cx, y: cy, game, speed: 8, color, damage: dmg, owner: 'player', width: 8, height: 6, facing: this.facing
        });
        if (sProj) {
          sProj.isShuriken = true;
          if (this.ninjaType === 'crystal') sProj.freezeDust = true;
          if (this.ninjaType === 'storm') sProj.soaking = true;
          if (this.ninjaType === 'shadow') sProj.shadowParalyse = true;
          if (this.items.homingShuriken) sProj.homing = true;
          if (isKunai) { sProj.isKunai = true; sProj.kunaiDmg = dmg * 2; sProj.kunaiMaxShurikens = this.maxShurikens; sProj.life = 30; }
          if (angleOffset !== 0) {
            const a = Math.atan2(sProj.vy, sProj.vx) + angleOffset;
            const sp = Math.sqrt(sProj.vx * sProj.vx + sProj.vy * sProj.vy);
            sProj.vx = Math.cos(a) * sp;
            sProj.vy = Math.sin(a) * sp;
          }
        }
        return sProj;
      };
      makeShuriken(0);
      if (this.items.tripleShuriken) {
        makeShuriken(0.25);
        makeShuriken(-0.25);
      }
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
          const dmg = t.attackDamage + this.bonusElemental + 2;
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
              e.takeDamage(this.type.attackDamage + this.bonusElemental, game);
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
              if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
              for (const a of this.afterimages) { if (a.chain) a.life = 20; }
              this.backstabReady = false;
              this.shadowStealth = 0;
              this.invincibleTimer = Math.max(this.invincibleTimer, 30);
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
          let dmg = this.type.attackDamage + this.bonusElemental;
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
          if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
          // Start fading chain afterimages now
          for (const a of this.afterimages) { if (a.chain) a.life = 20; }
          this.backstabReady = false;
          this.shadowStealth = 0;
          this.invincibleTimer = Math.max(this.invincibleTimer, 30);
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
              this.invincibleTimer = Math.max(this.invincibleTimer, 30);
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
          const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
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
          // Storm ult sheath tracking
          if (this.ultimateActive && this.stormSheathActive) {
            this.stormSheathHits++;
            if (this.stormSheathHits >= 20) {
              this._stormSheathFinisher(game);
            }
          }
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
                this.invincibleTimer = Math.max(this.invincibleTimer, 30);
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
            const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
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
            // Storm ult sheath tracking
            if (this.ultimateActive && this.stormSheathActive) {
              this.stormSheathHits++;
              if (this.stormSheathHits >= 20) {
                this._stormSheathFinisher(game);
              }
            }
          } else if (!this.stormChaining) {
            // Already stopped by resist
          } else {
            this.stormChaining = false;
            for (const a of this.stormAfterimages) a.life = 15;
            this.invincibleTimer = Math.max(this.invincibleTimer, 30);
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
      // Storm sheath finisher animation timer
      if (this.stormSheathFinisher > 0) this.stormSheathFinisher--;
      // Reset sheath when chain ends without finishing
      if (!this.stormChaining && this.stormSheathActive) {
        this.stormSheathActive = false;
        this.stormSheathHits = 0;
      }
    }

    // Shadow ninja: stealth accumulation
    if (this.ninjaType === 'shadow') {
      const now = game.tick;
      let smokeBoost = 0;
      for (const e of game.effects) {
        if (e instanceof SmokeGrenade && !e.done) {
          const dx = (this.x + this.w / 2) - e.x;
          const dy = (this.y + this.h / 2) - e.y;
          if (dx * dx + dy * dy < e.radius * e.radius) { smokeBoost = 3; break; }
        }
      }
      const stealthRate = (this.shadowUltBuff ? 5 : 1) + smokeBoost;
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
      // Castle: lock player to center
      if (this.crystalCastle && game.crystalCastle && !game.crystalCastle.done) {
        // Lock player to castle center
        const c = game.crystalCastle;
        this.x = c.x + c.w / 2 - this.w / 2;
        this.y = c.y + c.h - this.h - 8;
        this.vx = 0; this.vy = 0;
        this.invincibleTimer = 2;
      }
      // End crystal castle when ultimate expires or castle is done
      if (this.crystalCastle && (this.ultimateTimer <= 0 || !game.crystalCastle || game.crystalCastle.done)) {
        if (game.crystalCastle && !game.crystalCastle.done) {
          game.crystalCastle.explode(game);
        }
        game.crystalCastle = null;
        this.crystalCastle = false;
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
        if (!e.dead && e._contactDmgCd <= 0 && rectOverlap(this, e)) {
          const dmg = this.type.attackDamage + this.bonusElemental;
          e.takeDamage(dmg, game, this.x + this.w / 2);
          e._contactDmgCd = 8;
          e.burnTimer = Math.max(e.burnTimer || 0, 90);
          triggerHitstop(3);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#f80', 12, 4, 12));
        }
      }
      if (game.boss && !game.boss.dead && (game.boss._contactDmgCd || 0) <= 0 && rectOverlap(this, game.boss)) {
        const dmg = this.type.attackDamage + this.bonusElemental;
        game.boss.takeDamage(dmg, game, this.x + this.w / 2);
        game.boss._contactDmgCd = 8;
        game.boss.burnTimer = Math.max(game.boss.burnTimer || 0, 90);
        triggerHitstop(3);
        game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#f80', 14, 5, 14));
      }

      // Bombardment: drop fire projectiles at intervals during the dash
      if (this.fireDashTimer === 9 || this.fireDashTimer === 6 || this.fireDashTimer === 3) {
        const dmg = Math.max(1, Math.floor((this.type.attackDamage + this.bonusElemental) / 2));
        const px = this.x + this.w / 2;
        const py = this.y + this.h / 2;
        if (this.fireDashTimer === 3) {
          // Last one: homing missile
          const proj = new Projectile(px, py, this.facing * 6, 0, '#f40', dmg + 2, 'player');
          proj.w = 12; proj.h = 12;
          proj.isFireball = true;
          proj.homing = true;
          proj.piercing = true;
          proj.life = 80;
          game.projectiles.push(proj);
        } else {
          // Bombs: arc downward
          const proj = new Projectile(px, py, this.facing * 3, 2 + Math.random() * 2, '#f60', dmg, 'player');
          proj.w = 10; proj.h = 10;
          proj.isFireball = true;
          proj.life = 50;
          game.projectiles.push(proj);
        }
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
          if (!e.dead && e._contactDmgCd <= 0 && rectOverlap(this, e)) {
            const dmg = t.attackDamage + this.bonusElemental + this.windPower;
            e.takeDamage(dmg, game, this.x + this.w / 2);
            e._contactDmgCd = 8;
            e.hitCooldown = 15;
            triggerHitstop(4);
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#bfb', 10, 4, 12));
            if (e.element) this.applyElementalStatus(e.element, game);
          }
        }
        if (game.boss && !game.boss.dead && (game.boss._contactDmgCd || 0) <= 0 && rectOverlap(this, game.boss)) {
          const dmg = t.attackDamage + this.bonusElemental + this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2);
          game.boss._contactDmgCd = 8;
          game.boss.hitCooldown = 15;
          triggerHitstop(4);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#bfb', 12, 5, 14));
          if (game.boss.element) this.applyElementalStatus(game.boss.element, game);
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
      this.takeDamage(2, game, null, { type: 'pit' });
    }
  }

  attack(game) {
    // Earth: big stone fist punch
    if (this.ninjaType === 'earth') {
      this.attackCooldown = 10;
      SFX.attack();
      const t = this.type;
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      const dmg = Math.ceil((t.attackDamage + this.bonusDamage) * 2);
      const p = new Projectile(cx + this.facing * 6, cy - 8, this.facing * 12, 0, '#c8a878', dmg, 'player');
      p.w = 16; p.h = 16; p.life = 6; p.isEarthPunch = true; p.noPlat = true;
      game.projectiles.push(p);
      return;
    }

    this.attacking = true;
    this.attackTimer = 10;
    this.attackCooldown = 15;
    SFX.attack();

    if (this.ninjaType === 'wind' && !this.statusCurse && !this.statusFreeze) {
      this.windDashing = true;
      this.windDashTimer = 15;
      this.vx = this.facing * 15;
      this.vy = 0;
      this.invincibleTimer = 30;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 12, 5, 15));
    }

    if (this.ninjaType === 'bubble') {
      const bubDist = 80 + this.bonusReach * 4;
      for (let i = 0; i < 5; i++) {
        const offY = (i === 0 ? -6 : 8) + (Math.random() - 0.5) * 4;
        game.bubbles.push(new SmallBubble(
          this.x + this.w / 2 + this.facing * bubDist + Math.random() * 6,
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
      const proj = new Projectile(fx, fy, this.facing * 6, (Math.random() - 0.5) * 1.5, '#aff', this.type.attackDamage + this.bonusElemental, 'player');
      proj.w = 10; proj.h = 8;
      proj.freezeDust = true;
      proj.life = 60;
      game.projectiles.push(proj);
      game.effects.push(new Effect(fx, fy, '#aff', 4, 2, 6));
    }

    const shadowFullStealth = this.ninjaType === 'shadow' && this.shadowStealth >= 240;
    const shadowUltBonus = this.ninjaType === 'shadow' && this.shadowUltBuff;
    this._scytheAttack = shadowFullStealth || shadowUltBonus; // remember for render
    const stormReach = this.ninjaType === 'storm' ? 40 : 0;
    const reach = (stormReach || (shadowUltBonus ? 95 : (shadowFullStealth ? 68 : 36))) + this.bonusReach * 4;
    const isScythe = this._scytheAttack;
    // Derive hitbox from the crescent arc geometry
    const scytheBonus = isScythe ? (shadowUltBonus ? 20 : 12) : 0;
    const arcR = reach + this.w / 2 + 12 + scytheBonus;
    const startA = isScythe ? -Math.PI * 0.8 : -Math.PI * 0.65;
    const endA = startA + (isScythe ? Math.PI * 1.4 : Math.PI * 1.0);
    // Bounding box of the outer arc (check endpoints + cardinal crossings)
    let minX = Math.min(Math.cos(startA), Math.cos(endA)) * arcR;
    let maxX = Math.max(Math.cos(startA), Math.cos(endA)) * arcR;
    let minY = Math.min(Math.sin(startA), Math.sin(endA)) * arcR;
    let maxY = Math.max(Math.sin(startA), Math.sin(endA)) * arcR;
    // Arc crosses right (0): both katana and scythe
    maxX = arcR;
    // Arc crosses straight up (-π/2): both
    minY = -arcR;
    // Arc crosses straight down (π/2): only scythe (sweep > π)
    if (isScythe) maxY = arcR;
    // Generous padding
    const pad = 6;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    this.attackBox = {
      x: cx + (this.facing > 0 ? minX : -maxX) - pad,
      y: cy + minY - pad,
      w: (maxX - minX) + pad * 2,
      h: (maxY - minY) + pad * 2
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

  _stormSheathFinisher(game) {
    this.stormSheathActive = false;
    this.stormSheathFinisher = 90; // 1.5 second finisher animation
    this.stormChaining = false;
    for (const a of this.stormAfterimages) a.life = 15;
    this.stormLightningFlash = 60;
    SFX.bossSpawn();
    triggerHitstop(12);
    // Kill all enemies on screen
    for (const e of game.enemies) {
      if (!e.dead) {
        e.takeDamage(99999, game, e.x + e.w / 2);
        game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#ff0', 20, 6, 18));
      }
    }
    // Hit boss for massive damage
    if (game.boss && !game.boss.dead) {
      game.boss.takeDamage(99999, game, game.boss.x + game.boss.w / 2);
      game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#ff0', 30, 8, 25));
    }
    // Single centered gold kanji
    game.effects.push(new KanjiEffect(this.x + this.w / 2, this.y + this.h / 2, '#fd0', game.camera));
    this.invincibleTimer = Math.max(this.invincibleTimer, 90);
  }

  _launchFireball(game) {
    this.fireDashing = false;
    this.vx = 0;
    if (this._fireballPending) {
      // Spawn from player center so it continues seamlessly from the dash fireball
      const fx = this.x + this.w / 2;
      const fy = this.y + this.h / 2;
      const speed = 8 * this.facing;
      const proj = new Projectile(fx - 9, fy - 9, speed, 0, '#f80', this.type.attackDamage + this.bonusElemental + 4, 'player');
      proj.w = 18;
      proj.h = 18;
      proj.piercing = true;
      proj.isFireball = true;
      proj.homing = true;
      proj.life = 80;
      proj.fromSpecial = true;
      game.projectiles.push(proj);
      this._fireballPending = false;
    }
  }

  useSpecial(game) {
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
        const earthWave = game.wave || 1;
        // Enforce spawn limit: max active blocks = maxMana
        const activeBlocks = game.stoneBlocks.filter(b => !b.done);
        if (activeBlocks.length >= this.maxMana) {
          // Destroy oldest block
          activeBlocks[0].hp = 0;
          activeBlocks[0].explode(game);
        }
        if (this.grounded) {
          // Destroy existing walls when spawning a new one
          for (const b of game.stoneBlocks) {
            if (!b.done && b instanceof EarthWall) {
              b.hp = 0;
              b.explode(game);
            }
          }
          // Grounded: ground pound → spawn trapezoid wall in front
          const wallX = this.x + this.facing * 50;
          let groundY = this.y + this.h;
          for (const p of game.platforms) {
            if (wallX + TILE > p.x && wallX < p.x + p.w) {
              if (p.y >= this.y && p.y <= this.y + this.h + TILE) {
                groundY = p.y;
                break;
              }
            }
          }
          const wall = new EarthWall(wallX - TILE / 2, groundY - TILE * 3, earthWave);
          game.stoneBlocks.push(wall);
          game.effects.push(new Effect(wallX, groundY - TILE, '#a87', 12, 4, 14));
          game.effects.push(new Effect(wallX, groundY, '#c8a878', 8, 3, 10));
          triggerScreenShake(3, 6);
        } else {
          // Air: stop midair briefly, spawn boulder rising from ground
          this.vy = 0;
          this.earthAirHover = 20;
          this.jumpsLeft = this.maxJumps + (this.bubbleBuffTimer > 0 ? 1 : 0);
          const boulderX = this.x + this.w / 2 + this.facing * 30;
          let groundY = 480;
          for (const p of game.platforms) {
            if (boulderX + TILE > p.x && boulderX < p.x + p.w && p.y > this.y) {
              if (p.y < groundY) groundY = p.y;
            }
          }
          const boulder = new EarthBoulder(boulderX, groundY, this.y, earthWave);
          game.stoneBlocks.push(boulder);
          game.effects.push(new Effect(boulderX, groundY - TILE, '#a87', 10, 3, 12));
        }
        break;
      }
      case 'bubble':
        for (let i = 0; i < 3; i++) {
          const randOffX = randInt(-30, 30);
          const randOffY = randInt(-20, 20);
          const bub = new Bubble(
            this.x + this.facing * (50 + i * 50) + randOffX,
            this.y - 20 - i * 25 + randOffY,
            this.type.attackDamage + this.bonusElemental
          );
          bub.homing = true;
          game.bubbles.push(bub);
        }
        this.nextHitDouble = true;
        break;
      case 'shadow': {
        const oldX = this.x, oldY = this.y;
        const substitution = game.tick - this.lastDamageTick <= 60 && this.lastDamageAmount > 0;
        if (substitution) {
          this.hp = Math.min(this.hp + this.lastDamageAmount, this.maxHp);
          this.lastDamageAmount = 0;
          this.statusBurn = 0;
          this.statusFreeze = 0;
          this.statusFloat = 0;
          this.statusParalyse = 0;
          this.statusCurse = 0;
          this.statusStun = 0;
          game.effects.push(new SubstitutionLog(oldX, oldY, this.w, this.h));
          game.effects.push(new Effect(oldX + this.w / 2, oldY + this.h / 2, '#ccc', 10, 3, 15));
          game.effects.push(new TextEffect(oldX + this.w / 2, oldY - 10, 'SUBSTITUTION!', '#a4e'));
        }
        this.x += this.facing * 300;
        this.y -= 30;
        // Clamp to level bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > game.levelW) this.x = game.levelW - this.w;
        if (this.y < -100) this.y = -100;
        this.vy = 0;
        this.invincibleTimer = 30;
        this.stopMidair = true;
        this.stopMidairTimer = 20;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a4e', 12, 3, 12));
        // Drop two smoke grenades at random nearby positions
        for (let i = 0; i < 2; i++) {
          const gx = this.x + this.w / 2 + (Math.random() - 0.5) * 200;
          const gy = this.y + this.h;
          game.effects.push(new SmokeGrenade(gx, gy, game.platforms));
        }
        break;
      }
      case 'crystal': {
        // Spawn 3 diamond shards
        if (!game.diamondShards) game.diamondShards = [];
        for (let i = 0; i < 3; i++) {
          const sx = this.x + this.w / 2 + this.facing * 16;
          const sy = this.y + this.h / 2 + (i - 1) * 20;
          game.diamondShards.push(new DiamondShard(sx, sy, 'player', game));
        }
        SFX.special();
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#aff', 12, 4, 15));
        break;
      }
      case 'wind':
        if (!game.trimerangs) game.trimerangs = [];
        for (let i = 0; i < 3; i++) {
          const px = this.x + this.w / 2 + this.facing * 32;
          const py = this.y + this.h / 2 + (i - 1) * 18;
          const speed = 7 + this.windPower * 0.5;
          const vx = this.facing * speed;
          const vy = -3 + i * 3;
          game.trimerangs.push(new Trimerang(px, py, vx, vy, 'player'));
        }
        SFX.special();
        break;
      case 'storm': {
        // 3 homing soak balls that fly to enemies and soak in a large area
        const wsx = this.x + this.w / 2;
        const wsy = this.y + this.h / 2;
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          const proj = new Projectile(
            wsx + Math.cos(angle) * 30, wsy + Math.sin(angle) * 30,
            Math.cos(angle) * 5, Math.sin(angle) * 5,
            '#48f', this.type.attackDamage + this.bonusElemental, 'player'
          );
          proj.w = 16; proj.h = 16;
          proj.soaking = true;
          proj.piercing = true;
          proj.homing = true;
          proj.noPlat = true;
          proj.life = 240;
          proj.fromSpecial = true;
          game.projectiles.push(proj);
        }
        game.effects.push(new Effect(wsx, wsy, '#48f', 14, 5, 16));
        break;
      }
    }
  }

  applyElementalStatus(element, game) {
    if (!element) return;
    // Elemental Charms: immune to matching affliction
    const charmImmunity = {
      fire: 'charmFire', water: 'charmWater', crystal: 'charmCrystal',
      wind: 'charmWind', lightning: 'charmLightning', ghost: 'charmGhost', spiky: 'charmSpiky'
    };
    if (charmImmunity[element] && this.items[charmImmunity[element]]) return;
    // Protective Charm: halve duration
    const dMul = this.items.protectiveCharm ? 0.5 : 1;
    if (element === 'fire') {
      this.statusBurn = Math.round(180 * dMul);
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'BURN!', '#f80'));
    } else if (element === 'crystal' || element === 'water') {
      this.statusFreeze = Math.round(120 * dMul);
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'FREEZE!', '#0ff'));
    } else if (element === 'wind') {
      this.statusFloat = Math.round(150 * dMul);
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'FLOAT!', '#8f8'));
    } else if (element === 'lightning') {
      this.statusParalyse = Math.round(180 * dMul);
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'PARALYSE!', '#ff0'));
    } else if (element === 'ghost') {
      if (this.curseCooldown <= 0) {
        this.statusCurse = Math.round(150 * dMul);
        this.curseCooldown = 300;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'CURSE!', '#c8a'));
      }
    } else if (element === 'spiky') {
      if (this.bleedCooldown <= 0) {
        this.statusBleed = Math.round(120 * dMul);
        this.bleedCooldown = 300;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'BLEED!', '#f64'));
      }
    }
  }

  takeDamage(amount, game, element, killerInfo) {
    if (this.godMode) return;
    if (this.earthGolem) return;
    if (this.crystalCastle) return;
    if (this.bubbleRide) {
      this.bubbleRide.hp -= amount;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 6, 2, 8));
      game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, element || null));
      SFX.playerHurt();
      triggerHitstop(3);
      return;
    }
    if (this.invincibleTimer > 0) {
      if (!(this.windDashing && element)) return;
    }
    if (this.fireArmor || this.chainStriking || this.stormChaining) return;
    // Queue damage — highest prevails per frame
    if (!this._pendingDamage || amount > this._pendingDamage.amount) {
      this._pendingDamage = { amount, element, killerInfo };
    }
  }

  _applyPendingDamage(game) {
    if (!this._pendingDamage) return;
    let amount = this._pendingDamage.amount;
    const element = this._pendingDamage.element;
    const killerInfo = this._pendingDamage.killerInfo;
    this._pendingDamage = null;

    if (this.ninjaType === 'wind' && this.windPower >= 10 && (this.windFirstDodge || Math.random() < 0.5)) {
      this.windFirstDodge = false;
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'EVADE', '#8cf'));
      triggerHitstop(2);
      return;
    }
    // Leather Boots: 5% evasion
    if (this.items.leatherBoots && Math.random() < 0.05) {
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'DODGE', '#a86'));
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
        this.lastDamageAmount = absorbed;
        this.invincibleTimer = 45;
        this.lastDamageTick = game.tick;
        this.windPower = 0;
        SFX.playerHurt();
        triggerHitstop(6);
        game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, absorbed, element || null));
        this.applyElementalStatus(element, game);
        return;
      }
    }
    const bypassArmor = (element === 'spike' || element === 'fire' || element === 'lightning');
    // Elemental Charms: halve damage from matching element
    const charmMap = { fire:'charmFire', ghost:'charmGhost', water:'charmWater', crystal:'charmCrystal', wind:'charmWind', lightning:'charmLightning', spiky:'charmSpiky' };
    if (element && charmMap[element] && this.items[charmMap[element]]) {
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    if (!bypassArmor) amount = Math.max(1, amount - this.bonusArmor);
    this.hp -= amount;
    this.lastDamageAmount = amount;
    this.invincibleTimer = 45;
    this.lastDamageTick = game.tick;
    this.windPower = 0;
    // Knockback on damage — away from nearest threat
    {
      const pcx = this.x + this.w / 2, pcy = this.y + this.h / 2;
      let srcX = null, srcY = null, bestDist = Infinity;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const dx = (e.x + e.w / 2) - pcx, dy = (e.y + e.h / 2) - pcy;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; srcX = e.x + e.w / 2; srcY = e.y + e.h / 2; }
      }
      if (game.boss && !game.boss.dead) {
        const dx = (game.boss.x + game.boss.w / 2) - pcx, dy = (game.boss.y + game.boss.h / 2) - pcy;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { srcX = game.boss.x + game.boss.w / 2; srcY = game.boss.y + game.boss.h / 2; }
      }
      const kbH = 5 + Math.min(amount, 5);
      const kbV = -(3 + Math.min(amount, 4));
      if (srcX !== null) {
        const dir = Math.sign(pcx - srcX) || 1;
        this.vx = dir * kbH;
      } else {
        this.vx = -this.facing * kbH;
      }
      this.vy = kbV;
      this.grounded = false;
    }
    // Mana charge on taking damage
    this.mana = Math.min(this.mana + 0.5, this.maxMana);
    SFX.playerHurt();
    triggerHitstop(6);
    triggerScreenShake(4, 8);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 8, 3, 12));
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, element || null));
    this.applyElementalStatus(element, game);
    // Spiked Armor: damage all nearby enemies when taking damage
    if (this.items.spikedArmor) {
      const spikeDmg = amount;
      const sx = this.x + this.w / 2, sy = this.y + this.h / 2;
      game.effects.push(new Effect(sx, sy, '#f80', 18, 5, 15));
      for (const e of game.enemies) {
        if (!e.dead) {
          const edx = (e.x + e.w / 2) - sx, edy = (e.y + e.h / 2) - sy;
          const ed = Math.sqrt(edx * edx + edy * edy);
          if (ed < 80) {
            e.takeDamage(spikeDmg, game, sx);
            if (ed > 0) { e.vx += (edx / ed) * 5; e.vy += (edy / ed) * 3; }
          }
        }
      }
      if (game.boss && !game.boss.dead) {
        const bdx = (game.boss.x + game.boss.w / 2) - sx, bdy = (game.boss.y + game.boss.h / 2) - sy;
        const bd = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bd < 80) game.boss.takeDamage(spikeDmg, game, sx);
      }
    }
    if (this.hp <= 0) {
      // Death's Key: revive once per run
      if (this.items.deathsKey && !this.deathsKeyUsed) {
        this.deathsKeyUsed = true;
        this.hp = Math.round(this.maxHp * 0.5);
        this.invincibleTimer = 120;
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#a6f', 25, 6, 25));
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 20, "DEATH'S KEY!", '#a6f'));
        SFX.victory();
        return;
      }
      this.deathTimer = 180;
      this.vx = 0; this.vy = 0;
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      game.effects.push(new Effect(cx, cy, '#fff', 20, 6, 25));
      game.effects.push(new Effect(cx, cy, this.type.color, 15, 5, 20));
      game.effects.push(new Effect(cx, cy, '#f44', 12, 4, 18));
      game.effects.push(new TextEffect(cx, cy - 20, 'K.O.', '#f44'));
      game.phraseText = '';
      game.phraseTimer = 0;
      game.ninjaResponseText = '';
      game.ninjaResponseTimer = 0;
      game.ninjaResponseActive = false;
      // Kill phrase from the enemy
      if (killerInfo) {
        const kPhrase = getKillPhrase(killerInfo.type, this.ninjaType, killerInfo.element);
        if (kPhrase) {
          game.killPhraseText = kPhrase;
          game.killPhraseTimer = 90;
          game.killPhraseMaxTimer = 90;
          game.killPhraseColor = killerInfo.element && ELEMENT_COLORS[killerInfo.element] ? ELEMENT_COLORS[killerInfo.element].accent : '#f88';
          if (killerInfo.isBoss && game.boss) {
            game.killPhrasePos = { x: game.boss.x + game.boss.w / 2, y: game.boss.y };
          } else {
            let killerEnemy = null;
            let minDist = Infinity;
            for (const e of game.enemies) {
              if (e.type === killerInfo.type) {
                const dx = e.x - this.x, dy = e.y - this.y;
                const d = dx * dx + dy * dy;
                if (d < minDist) { minDist = d; killerEnemy = e; }
              }
            }
            if (killerEnemy) {
              game.killPhrasePos = { x: killerEnemy.x + killerEnemy.w / 2, y: killerEnemy.y };
            } else {
              game.killPhrasePos = { x: this.x + this.w / 2, y: this.y - 20 };
            }
          }
        }
      }
      game.deaths++;
      game.lives--;
      if (game.lives <= 0) {
        game.killerInfo = killerInfo || null;
        game.gameOverDelay = 120;
        game.phraseText = '';
        game.phraseTimer = 0;
        game.ninjaResponseText = '';
        game.ninjaResponseTimer = 0;
        game.ninjaResponseActive = false;
        // On game over, override kill phrase with boss if boss is active
        if (game.bossActive && game.boss && !game.boss.dead) {
          const waveDef = WAVE_DEFS[game.wave - 1];
          const bossPhrase = getKillPhrase(waveDef.boss, this.ninjaType, game.boss.element);
          if (bossPhrase) {
            game.killPhraseText = bossPhrase;
            game.killPhraseTimer = 90;
            game.killPhraseMaxTimer = 90;
            game.killPhraseColor = game.boss.element && ELEMENT_COLORS[game.boss.element] ? ELEMENT_COLORS[game.boss.element].accent : '#f88';
            game.killPhrasePos = { x: game.boss.x + game.boss.w / 2, y: game.boss.y };
          }
        }
        recordGameOver(game.totalKills);
      }
    }
  }

  render(ctx, cam) {
    // Hide player during death delay
    if (this.deathTimer > 0) return;
    // Hide player inside golem mecha
    if (this.earthGolem) return;

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
      // Draw yellow lightning lines between consecutive afterimages
      if (this.stormAfterimages.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.stormChaining ? 0.7 : 0.3;
        for (let i = 1; i < this.stormAfterimages.length; i++) {
          const prev = this.stormAfterimages[i - 1];
          const curr = this.stormAfterimages[i];
          const px1 = prev.x + this.w / 2 - cam.x, py1 = prev.y + this.h / 2 - cam.y;
          const px2 = curr.x + this.w / 2 - cam.x, py2 = curr.y + this.h / 2 - cam.y;
          // Jagged lightning: 3-segment zig-zag
          const mx1 = px1 + (px2 - px1) * 0.33 + (Math.random() - 0.5) * 12;
          const my1 = py1 + (py2 - py1) * 0.33 + (Math.random() - 0.5) * 12;
          const mx2 = px1 + (px2 - px1) * 0.66 + (Math.random() - 0.5) * 12;
          const my2 = py1 + (py2 - py1) * 0.66 + (Math.random() - 0.5) * 12;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.lineTo(px2, py2);
          ctx.stroke();
        }
        // Line from last afterimage to current player position
        const last = this.stormAfterimages[this.stormAfterimages.length - 1];
        const lx = last.x + this.w / 2 - cam.x, ly = last.y + this.h / 2 - cam.y;
        const plx = this.x + this.w / 2 - cam.x, ply = this.y + this.h / 2 - cam.y;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(plx, ply);
        ctx.stroke();
        ctx.restore();
      }
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
      // Draw purple lines between chain afterimages
      const chainImages = this.afterimages.filter(a => a.chain);
      if (chainImages.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#a4e';
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.chainStriking ? 0.6 : 0.25;
        for (let i = 1; i < chainImages.length; i++) {
          const prev = chainImages[i - 1];
          const curr = chainImages[i];
          ctx.beginPath();
          ctx.moveTo(prev.x + this.w / 2 - cam.x, prev.y + this.h / 2 - cam.y);
          ctx.lineTo(curr.x + this.w / 2 - cam.x, curr.y + this.h / 2 - cam.y);
          ctx.stroke();
        }
        // Line from last chain image to current player position
        const last = chainImages[chainImages.length - 1];
        ctx.beginPath();
        ctx.moveTo(last.x + this.w / 2 - cam.x, last.y + this.h / 2 - cam.y);
        ctx.lineTo(this.x + this.w / 2 - cam.x, this.y + this.h / 2 - cam.y);
        ctx.stroke();
        ctx.restore();
      }
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

      // Gradual eye glow — scales with stealth level
      if (stealthRatio > 0.15) {
        const glowStr = Math.min((stealthRatio - 0.15) / 0.85, 1); // 0→1 from 15%→100% stealth
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
        const pulse2 = 0.6 + 0.4 * Math.sin(Date.now() * 0.009 + 1);
        const eyeX = this.facing > 0 ? sx + 14 : sx + 4;
        ctx.save();
        // Outer eye glow halo
        ctx.globalAlpha = pulse * 0.3 * glowStr;
        ctx.fillStyle = '#a040ff';
        ctx.shadowColor = '#c060ff';
        ctx.shadowBlur = 20 * pulse * glowStr;
        ctx.beginPath();
        ctx.arc(eyeX + 3, sy + 10.5, 4 + 2 * glowStr, 0, Math.PI * 2);
        ctx.fill();
        // Main eye
        ctx.globalAlpha = pulse * glowStr;
        ctx.shadowBlur = 14 * pulse * glowStr;
        ctx.fillStyle = '#e080ff';
        ctx.fillRect(eyeX, sy + 8, 6, 5);
        // Inner glow (only at higher stealth)
        if (glowStr > 0.5) {
          ctx.globalAlpha = pulse2 * 0.6 * glowStr;
          ctx.fillStyle = '#d060ff';
          ctx.shadowBlur = 8 * glowStr;
          ctx.fillRect(eyeX + 1, sy + 9, 4, 3);
        }
        // Bright pupil
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = pulse * 0.95 * glowStr;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 4 * glowStr;
        ctx.fillRect(this.facing > 0 ? eyeX + 2 : eyeX + 1, sy + 9, 3, 3);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (shadowAlpha <= 0.01) {
        ctx.globalAlpha = 1;
        if (this.backstabReady) {
          ctx.fillStyle = '#f0f';
          ctx.font = '10px monospace';
          ctx.fillText('BACKSTAB!', sx - 8, sy - 8);
        }
        // Faint scythe silhouette when backstab ready (not attacking)
        if (this.backstabReady && !this.attacking) {
          const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
          const pulse2 = 0.6 + 0.4 * Math.sin(Date.now() * 0.009 + 1);
          ctx.save();
          ctx.globalAlpha = 0.25 * pulse;
          ctx.translate(sx + this.w / 2, sy + this.h / 2);
          if (this.facing < 0) ctx.scale(-1, 1);
          ctx.rotate(0.15);
          ctx.strokeStyle = '#c060ff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#a040ff';
          ctx.shadowBlur = 10 * pulse;
          ctx.beginPath();
          ctx.moveTo(-8, -1);
          ctx.lineTo(42, 3);
          ctx.stroke();
          ctx.fillStyle = '#c060ff';
          ctx.globalAlpha = 0.15 * pulse2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(6 + i * 14, 0.5 + i * 0.4, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 0.25 * pulse;
          ctx.strokeStyle = '#d080ff';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 12 * pulse;
          ctx.beginPath();
          ctx.moveTo(40, 1);
          ctx.bezierCurveTo(52, -10, 56, -24, 44, -38);
          ctx.stroke();
          ctx.strokeStyle = '#e0a0ff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.15 * pulse2;
          ctx.beginPath();
          ctx.moveTo(38, -1);
          ctx.bezierCurveTo(46, -10, 48, -20, 40, -32);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
        // When attacking or chain striking while fully stealthed, don't return — let weapon rendering happen below
        if (!this.attacking && !this.chainStriking) return;
        // Set low alpha for body but weapon will render at full
        ctx.globalAlpha = 0.05;
      } else {
        ctx.globalAlpha = shadowAlpha;
      }
    }

    // Blink when invincible
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 3) % 2) {
      ctx.globalAlpha = 0.3;
    }

    // Fire armor glow
    if (this.fireArmor) {
      const tick = game ? game.tick : 0;
      ctx.save();
      // Outer heat shimmer
      ctx.globalAlpha = 0.15 + 0.05 * Math.sin(tick * 0.15);
      ctx.fillStyle = '#f40';
      ctx.fillRect(sx - 5, sy - 5, this.w + 10, this.h + 10);
      // Inner core glow
      ctx.globalAlpha = 0.3 + 0.1 * Math.sin(tick * 0.2);
      ctx.fillStyle = '#fa0';
      ctx.fillRect(sx - 2, sy - 2, this.w + 4, this.h + 4);
      // Animated flame tongues
      for (let i = 0; i < 6; i++) {
        const fx = sx + (this.w * i / 5);
        const fh = 4 + 6 * Math.sin(tick * 0.3 + i * 1.8);
        const fw = 4 + 2 * Math.sin(tick * 0.25 + i);
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(tick * 0.35 + i * 2);
        ctx.fillStyle = i % 2 === 0 ? '#f80' : '#ff4';
        ctx.beginPath();
        ctx.moveTo(fx - fw / 2, sy);
        ctx.quadraticCurveTo(fx, sy - fh, fx + fw / 2, sy);
        ctx.fill();
        // Bottom flames
        const bh = 3 + 4 * Math.sin(tick * 0.28 + i * 1.5);
        ctx.globalAlpha = 0.4 + 0.15 * Math.sin(tick * 0.3 + i);
        ctx.fillStyle = i % 2 === 0 ? '#ff4' : '#f80';
        ctx.beginPath();
        ctx.moveTo(fx - fw / 2, sy + this.h);
        ctx.quadraticCurveTo(fx, sy + this.h + bh, fx + fw / 2, sy + this.h);
        ctx.fill();
      }
      // Side flame wisps
      for (let i = 0; i < 3; i++) {
        const fy = sy + (this.h * (i + 1) / 4);
        const fLen = 3 + 4 * Math.sin(tick * 0.32 + i * 2.1);
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(tick * 0.28 + i);
        ctx.fillStyle = '#f60';
        // Left
        ctx.beginPath();
        ctx.moveTo(sx, fy - 2);
        ctx.quadraticCurveTo(sx - fLen, fy, sx, fy + 2);
        ctx.fill();
        // Right
        ctx.beginPath();
        ctx.moveTo(sx + this.w, fy - 2);
        ctx.quadraticCurveTo(sx + this.w + fLen, fy, sx + this.w, fy + 2);
        ctx.fill();
      }
      ctx.restore();
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
      // Green wind bubble around player
      ctx.save();
      const bTick = this.statusFloat * 0.08;
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(bTick);
      ctx.strokeStyle = '#6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx + this.w / 2, sy + this.h / 2, this.w * 1.1 + Math.sin(bTick) * 3, this.h * 0.95 + Math.cos(bTick) * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.08 + 0.04 * Math.sin(bTick);
      ctx.fillStyle = '#8f8';
      ctx.fill();
      ctx.restore();
    }
    if (this.statusParalyse > 0) {
      // Shock bolts around player
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.statusParalyse * 0.5);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1.5;
      const st = this.statusParalyse * 0.25;
      // Left bolt
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + 4 + Math.sin(st) * 3);
      ctx.lineTo(sx + 2, sy + 10 + Math.sin(st + 1) * 2);
      ctx.lineTo(sx - 2, sy + 16 + Math.sin(st + 2) * 3);
      ctx.lineTo(sx + 4, sy + 22 + Math.sin(st + 3) * 2);
      ctx.stroke();
      // Right bolt
      ctx.beginPath();
      ctx.moveTo(sx + this.w + 4, sy + 6 + Math.cos(st) * 3);
      ctx.lineTo(sx + this.w - 2, sy + 12 + Math.cos(st + 1) * 2);
      ctx.lineTo(sx + this.w + 2, sy + 18 + Math.cos(st + 2) * 3);
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
    if (this.statusCurse > 0) {
      // Purple wisps around cursed player
    }
    if (this.statusBleed > 0) {
      // Red tint handled below
    }

    // Body — color changes for curse (purple tint) and bleed (red tint)
    let bodyColor = t.color;
    if (this.statusBleed > 0) bodyColor = '#a44';
    else if (this.statusCurse > 0) bodyColor = '#86a';
    ctx.fillStyle = bodyColor;
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

    // Small flower on hat for bubble, crystal, wind
    if (this.ninjaType === 'bubble' || this.ninjaType === 'crystal' || this.ninjaType === 'wind') {
      const fx = sx + this.w / 2 + 5;
      const fy = sy - 6;
      ctx.fillStyle = t.accentColor;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 2.5, fy + Math.sin(a) * 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fe8';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Belt / sash
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + this.h - 10, this.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx, sy + this.h - 9, this.w, 1);

    // Sheathed weapon on back (when not attacking)
    if (!this.attacking) {
      ctx.save();
      const backX = this.facing > 0 ? sx + 3 : sx + this.w - 3;
      const beltY = sy + this.h - 10;
      ctx.translate(backX, beltY);
      ctx.rotate(this.facing > 0 ? -0.45 : 0.45);

      if (this.ninjaType === 'shadow') {
        // Mini scythe on back
        // Handle
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-1.5, -24, 3, 28);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-1.5, -24, 1.5, 28);
        // Purple grip wraps
        ctx.fillStyle = '#a4e';
        for (let i = 0; i < 3; i++) ctx.fillRect(-2, -4 + i * 6, 4, 3);
        // Scythe blade at top
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
        ctx.restore();
        // Pommel gem
        ctx.fillStyle = '#c060ff';
        ctx.shadowColor = '#a040ff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(0, 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (this.ninjaType === 'bubble') {
        // Bubble wand on back
        // Stick
        ctx.fillStyle = '#3a7a9a';
        ctx.fillRect(-1.5, -26, 3, 30);
        ctx.fillStyle = '#5ab0d0';
        ctx.fillRect(-1.5, -26, 1.5, 30);
        // Grip wraps
        ctx.fillStyle = '#2a6888';
        for (let i = 0; i < 3; i++) ctx.fillRect(-2, -2 + i * 5, 4, 3);
        // Ring at top
        ctx.strokeStyle = '#60d8f8';
        ctx.shadowColor = '#40c0e0';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -30, 4, 0, Math.PI * 2);
        ctx.stroke();
        // Soap film
        ctx.fillStyle = 'rgba(100,220,255,0.2)';
        ctx.beginPath();
        ctx.arc(0, -30, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Pommel drip
        ctx.fillStyle = '#60d8f8';
        ctx.beginPath();
        ctx.arc(0, 5, 1.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (this.ninjaType === 'earth') {
        // Stone bracer on back
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(-3, -16, 6, 20);
        ctx.fillStyle = '#a8844a';
        ctx.fillRect(-3, -16, 3, 20);
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(-3, -16, 6, 20);
        // Knuckle studs at top
        ctx.fillStyle = '#e8d0b0';
        ctx.fillRect(-2, -18, 4, 3);
        ctx.fillRect(-3, -15, 2, 2);
        ctx.fillRect(1, -15, 2, 2);
        // Green accent band
        ctx.fillStyle = '#2e9e2e';
        ctx.fillRect(-3.5, -6, 7, 3);

      } else if (this.ninjaType === 'crystal') {
        // Crystal wand on back
        // Shaft
        ctx.fillStyle = '#4a8a9a';
        ctx.fillRect(-1.5, -24, 3, 28);
        ctx.fillStyle = '#6ab8c8';
        ctx.fillRect(-1.5, -24, 1.5, 28);
        // Grip wraps
        ctx.fillStyle = '#2a6878';
        for (let i = 0; i < 3; i++) ctx.fillRect(-2, -2 + i * 5, 4, 3);
        // Crystal shard at top
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
        // Inner facet
        ctx.fillStyle = '#2dd';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(2, 0);
        ctx.lineTo(0, 1.5);
        ctx.lineTo(-1, -0.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
        // Pommel gem
        ctx.fillStyle = '#2dd';
        ctx.shadowColor = '#0aa';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(0, 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (this.ninjaType === 'wind') {
        // Wind bow on back
        if (this.ultCutscene) return; // Don't render bow during ult cutscene to avoid weird layering issues with afterimages
        ctx.save();
        // Left limb (curves outward)
        ctx.strokeStyle = '#5a8a3a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.bezierCurveTo(-14, -6, -16, -18, -8, -28);
        ctx.stroke();
        // Right limb
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.bezierCurveTo(14, -6, 16, -18, 8, -28);
        ctx.stroke();
        // Left limb highlight
        ctx.strokeStyle = '#8d8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-12, -6, -14, -16, -7, -26);
        ctx.stroke();
        // Right limb highlight
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(12, -6, 14, -16, 7, -26);
        ctx.stroke();
        // Bowstring
        ctx.strokeStyle = '#bfb';
        ctx.shadowColor = '#bfb';
        ctx.shadowBlur = 3;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-8, -28);
        ctx.lineTo(8, -28);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Grip wrap
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(-2, -1, 4, 5);
        ctx.fillStyle = '#bfb';
        ctx.fillRect(-1.5, 0, 3, 1.5);
        ctx.fillRect(-1.5, 2, 3, 1.5);
        ctx.restore();

      } else {
        // Default katana scabbard (fire, storm)
        if (this.ninjaType === 'storm') { ctx.shadowColor = '#ff0'; ctx.shadowBlur = 6; }
        ctx.fillStyle = this.ninjaType === 'storm' ? '#332200' : '#2a2a2a';
        ctx.fillRect(-2, -28, 4, 32);
        ctx.fillStyle = '#444';
        ctx.fillRect(-2, 2, 4, 3);
        ctx.fillStyle = '#555';
        ctx.fillRect(-3, -6, 6, 2);
        ctx.fillStyle = t.accentColor;
        ctx.fillRect(-2, -36, 4, 9);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 3; i++) ctx.fillRect(-1, -35 + i * 3, 2, 1);
        ctx.fillStyle = '#aa8';
        ctx.fillRect(-3, -28, 6, 2);
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -38, 2, 3);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    // Backstab indicator
    if (this.ninjaType === 'shadow' && this.backstabReady) {
      ctx.fillStyle = '#f0f';
      ctx.font = '10px monospace';
      ctx.fillText('BACKSTAB!', sx - 8, sy - 8);
    }

    // Fire armor indicator — small rising flames above head
    if (this.fireArmor) {
      const tick = game ? game.tick : 0;
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const ox = sx + this.w * 0.15 + (this.w * 0.7 * i / 3);
        const rise = (tick * 0.8 + i * 17) % 16;
        const fy = sy - 4 - rise;
        const alpha = 0.7 * (1 - rise / 16);
        const sz = 2.5 - rise * 0.1;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 2 === 0 ? '#f80' : '#ff4';
        ctx.beginPath();
        ctx.arc(ox, fy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Crystal glow (during flyshooter ultimate)
    if (this.ninjaType === 'crystal' && this.ultimateTimer > 0) {
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

    // Attack — katana moon slash (or shadow scythe in stealth)
    if (this.attacking && this.attackBox) {
      const slashProgress = 1 - this.attackTimer / 12;
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      const dir = this.facing;
      const isScythe = !!this._scytheAttack;
      const isShadow = this.ninjaType === 'shadow';
      const isShadowUlt = isShadow && this.shadowUltBuff;
      const renderScythe = isScythe || isShadow; // shadow always shows scythe
      const isBubble = this.ninjaType === 'bubble';
      const isCrystal = this.ninjaType === 'crystal';
      const isEarth = this.ninjaType === 'earth';
      const isWind = this.ninjaType === 'wind';

      // Weapon swinging
      ctx.save();
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);
      const startA = isScythe ? -Math.PI * 0.8 : -Math.PI * 0.65;
      const sweep = isScythe ? Math.PI * 1.4 : Math.PI * 1.0;
      const curA = startA + sweep * slashProgress;
      ctx.rotate(curA);

      if (renderScythe) {
        // Scythe weapon — large, visible
        const sc = isShadowUlt ? 1.5 : (isScythe ? 1.2 : 1.0);
        // Long handle (thick, visible)
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(-8, -2.5);
        ctx.lineTo(40 * sc, -1.5);
        ctx.lineTo(40 * sc, 1.5);
        ctx.lineTo(-8, 2.5);
        ctx.closePath();
        ctx.fill();
        // Handle highlight
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(-8, -2.5);
        ctx.lineTo(40 * sc, -1.5);
        ctx.lineTo(40 * sc, 0);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        // Purple grip wraps
        ctx.fillStyle = '#a4e';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(1 + i * 9, -3, 5, 6);
        }
        ctx.fillStyle = '#726';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(2 + i * 9, -2.5, 3, 5);
        }
        // Blade — big crescent scythe head
        ctx.save();
        ctx.translate(38 * sc, 0);
        // Outer blade shape (large curved blade)
        ctx.beginPath();
        ctx.moveTo(2, -3);
        ctx.bezierCurveTo(16 * sc, -10 * sc, 20 * sc, -24 * sc, 6 * sc, -38 * sc);
        ctx.lineTo(2 * sc, -36 * sc);
        ctx.bezierCurveTo(12 * sc, -22 * sc, 10 * sc, -10 * sc, -2, -5);
        ctx.closePath();
        ctx.fillStyle = '#e0d0f8';
        ctx.shadowColor = '#c060ff';
        ctx.shadowBlur = 14;
        ctx.fill();
        // Inner blade darker fill for depth
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.bezierCurveTo(10 * sc, -12 * sc, 14 * sc, -22 * sc, 4 * sc, -34 * sc);
        ctx.lineTo(3 * sc, -32 * sc);
        ctx.bezierCurveTo(10 * sc, -20 * sc, 8 * sc, -12 * sc, -1, -6);
        ctx.closePath();
        ctx.fillStyle = '#b898d8';
        ctx.fill();
        // Sharp edge highlight
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(2, -3);
        ctx.bezierCurveTo(16 * sc, -10 * sc, 20 * sc, -24 * sc, 6 * sc, -38 * sc);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
        // Pommel gem
        ctx.fillStyle = '#c060ff';
        ctx.shadowColor = '#a040ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-8, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (isBubble) {
        // Bubble blower wand
        // Handle / stick
        ctx.fillStyle = '#3a7a9a';
        ctx.beginPath();
        ctx.moveTo(-6, -1.5);
        ctx.lineTo(26, -1);
        ctx.lineTo(26, 1);
        ctx.lineTo(-6, 1.5);
        ctx.closePath();
        ctx.fill();
        // Handle highlight
        ctx.fillStyle = '#5ab0d0';
        ctx.beginPath();
        ctx.moveTo(-6, -1.5);
        ctx.lineTo(26, -1);
        ctx.lineTo(26, 0);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        // Grip wraps
        ctx.fillStyle = '#2a6888';
        for (let i = 0; i < 3; i++) ctx.fillRect(-4 + i * 5, -2, 3, 4);
        // Ring (bubble loop) at tip
        ctx.save();
        ctx.translate(30, 0);
        ctx.strokeStyle = '#60d8f8';
        ctx.shadowColor = '#40c0e0';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring highlight
        ctx.strokeStyle = '#a0f0ff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 6, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Soap film shimmer inside the ring
        ctx.fillStyle = 'rgba(100,220,255,0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Pommel drip
        ctx.fillStyle = '#60d8f8';
        ctx.beginPath();
        ctx.arc(-7, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (isCrystal) {
        // Crystal wand — slender rod with shard on tip
        // Wand shaft
        ctx.fillStyle = '#4a8a9a';
        ctx.beginPath();
        ctx.moveTo(-6, -1.2);
        ctx.lineTo(28, -0.8);
        ctx.lineTo(28, 0.8);
        ctx.lineTo(-6, 1.2);
        ctx.closePath();
        ctx.fill();
        // Shaft highlight
        ctx.fillStyle = '#6ab8c8';
        ctx.beginPath();
        ctx.moveTo(-6, -1.2);
        ctx.lineTo(28, -0.8);
        ctx.lineTo(28, 0);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        // Grip wraps
        ctx.fillStyle = '#2a6878';
        for (let i = 0; i < 3; i++) ctx.fillRect(-4 + i * 5, -1.8, 3, 3.6);
        // Crystal shard at tip
        ctx.save();
        ctx.translate(30, 0);
        ctx.shadowColor = '#6ee';
        ctx.shadowBlur = 8;
        // Main shard (diamond shape, elongated)
        ctx.fillStyle = '#aff';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        // Inner facet
        ctx.fillStyle = '#2dd';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(2.5, 0);
        ctx.lineTo(0, 2);
        ctx.lineTo(-1, -1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Sharp edge highlight
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
        // Pommel gem
        ctx.fillStyle = '#2dd';
        ctx.shadowColor = '#0aa';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(-7, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (isEarth) {
        // Earth gauntlet — stone bracer with knuckle studs
        // Bracer base
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(-2, -4, 28, 8);
        // Bracer highlight
        ctx.fillStyle = '#a8844a';
        ctx.fillRect(-2, -4, 28, 4);
        // Stone border
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-2, -4, 28, 8);
        // Knuckle studs
        ctx.fillStyle = '#c8a878';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(20 + i * 0, -5 - i * 0.5, 5, 3);
        }
        ctx.fillStyle = '#e8d0b0';
        ctx.fillRect(22, -6, 4, 3);
        ctx.fillRect(22, 3, 4, 3);
        ctx.fillRect(28, -3, 4, 6);
        // Green accent band
        ctx.fillStyle = '#2e9e2e';
        ctx.fillRect(4, -4.5, 4, 9);
      } else if (isWind) {
        // Wind bow — used as melee weapon
        // Upper limb
        ctx.strokeStyle = '#5a8a3a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.bezierCurveTo(4, -28, 22, -30, 36, -16);
        ctx.stroke();
        // Lower limb
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.bezierCurveTo(4, 28, 22, 30, 36, 16);
        ctx.stroke();
        // Upper limb highlight
        ctx.strokeStyle = '#8d8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.bezierCurveTo(4, -26, 20, -28, 34, -14);
        ctx.stroke();
        // Lower limb highlight
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.bezierCurveTo(4, 26, 20, 28, 34, 14);
        ctx.stroke();
        // Bowstring
        ctx.strokeStyle = '#bfb';
        ctx.shadowColor = '#bfb';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, -16);
        ctx.lineTo(36, 16);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Grip wrap at center
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(-6, -3, 6, 6);
        ctx.fillStyle = '#bfb';
        ctx.fillRect(-5, -2, 4, 1.5);
        ctx.fillRect(-5, 0.5, 4, 1.5);
      } else {
        // Katana blade
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
      }
      ctx.restore();

      // Moon / crescent slash trail — sized to match the hitbox
      ctx.save();
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);
      const abW = this.attackBox.w;
      const abH = this.attackBox.h;
      const scytheBonus = isScythe ? (isShadowUlt ? 20 : 12) : 0;
      const outerR = Math.max(abW, abH) / 2 + scytheBonus;
      const innerR = outerR - (isScythe ? 16 : 10) - outerR * 0.15;
      const offsetX = -outerR * 0.2;
      const offsetY = -outerR * 0.1;
      const aStart = startA + sweep * Math.max(0, slashProgress - 0.5);
      const aEnd = startA + sweep * slashProgress;
      // Glow layer
      ctx.globalAlpha = (renderScythe ? 0.35 : 0.25) * (1 - slashProgress * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 4, aStart, aEnd, false);
      ctx.arc(offsetX, offsetY, Math.max(innerR - 4, 6), aEnd, aStart, true);
      ctx.closePath();
      ctx.fillStyle = renderScythe ? '#a040ff' : isBubble ? '#20a0d0' : isCrystal ? '#0aa' : isWind ? '#4a8a3a' : t.color;
      ctx.fill();
      // Main crescent
      const moonAlpha = (renderScythe ? 0.7 : 0.6) * (1 - slashProgress * 0.6);
      ctx.globalAlpha = moonAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, aStart, aEnd, false);
      ctx.arc(offsetX, offsetY, innerR, aEnd, aStart, true);
      ctx.closePath();
      ctx.fillStyle = renderScythe ? '#c8a0ff' : isBubble ? '#80e8ff' : isCrystal ? '#aff' : isWind ? '#bfb' : t.accentColor;
      ctx.fill();
      // Bright edge on the outer rim
      ctx.strokeStyle = renderScythe ? '#e8d8ff' : isBubble ? '#c0f4ff' : isCrystal ? '#dff' : isWind ? '#e0ffe0' : '#fff';
      ctx.lineWidth = renderScythe ? 2 : 1.5;
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

// ── CrystalCastle — Disney-style ice/crystal castle summoned by Crystal ultimate ──
class CrystalCastle {
  constructor(x, y, w, h, baseDamage, wave) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.baseDamage = baseDamage;
    this.wave = wave;
    this.done = false;
    this.timer = 210;
    this.hitCooldowns = new Map();
    this.trapped = new Set();  // enemies trapped inside the castle
    this.snowflakes = [];
    this.sparkles = [];
    // Disney-style towers: {ox, oy, tw, th, roofH, roofW} — ox relative to castle x
    this.towers = [
      { ox: w * 0.5, oy: -200, tw: 40, th: 150, roofH: 80, roofW: 56 },  // grand center tower
      { ox: w * 0.2, oy: -140, tw: 32, th: 110, roofH: 60, roofW: 44 },  // left-center
      { ox: w * 0.8, oy: -140, tw: 32, th: 110, roofH: 60, roofW: 44 },  // right-center
      { ox: w * 0.03, oy: -80, tw: 28, th: 90, roofH: 50, roofW: 38 },   // far left
      { ox: w * 0.97, oy: -80, tw: 28, th: 90, roofH: 50, roofW: 38 },   // far right
      { ox: w * 0.35, oy: -170, tw: 24, th: 80, roofH: 55, roofW: 34 },  // inner-left accent
      { ox: w * 0.65, oy: -170, tw: 24, th: 80, roofH: 55, roofW: 34 },  // inner-right accent
    ];
    // Spire collision boxes (simplified from towers)
    this.spires = this.towers.map(t => ({
      ox: t.ox, oy: t.oy - t.roofH, hw: t.roofW / 2, hh: t.roofH + t.th
    }));
    // Flag positions (on top of some towers)
    this.flags = [
      { towerIdx: 0, color: '#aef' },
      { towerIdx: 1, color: '#cff' },
      { towerIdx: 2, color: '#cff' },
    ];
  }
  update(game) {
    if (this.done) return;
    this.timer--;

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // First frame: trap any enemies already inside the castle
    if (this.timer === 209) {
      const hb = this._getFullHitbox();
      for (const e of game.enemies) {
        if (!e.dead && rectOverlap(e, hb)) this.trapped.add(e);
      }
      if (game.boss && !game.boss.dead && rectOverlap(game.boss, hb)) this.trapped.add(game.boss);
    }

    // Spawn snowflakes across the entire screen
    const camX = game.camera ? game.camera.x : this.x;
    const camY = game.camera ? game.camera.y : this.y - 200;
    for (let i = 0; i < 3; i++) {
      this.snowflakes.push({
        x: camX + Math.random() * CANVAS_W,
        y: camY - 10 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.5 + Math.random() * 1.5,
        size: 1.5 + Math.random() * 3,
        life: 120 + randInt(0, 60)
      });
    }
    for (const s of this.snowflakes) {
      s.x += s.vx + Math.sin(s.life * 0.06) * 0.4;
      s.y += s.vy;
      s.life--;
    }
    this.snowflakes = this.snowflakes.filter(s => s.life > 0);

    // Spawn sparkles on the castle
    if (this.timer % 8 === 0) {
      this.sparkles.push({
        x: this.x + 10 + Math.random() * (this.w - 20),
        y: this.y - 60 + Math.random() * (this.h + 40),
        size: 1 + Math.random() * 3,
        life: 20 + randInt(0, 15),
        maxLife: 20 + randInt(0, 15)
      });
    }
    this.sparkles = this.sparkles.filter(s => { s.life--; return s.life > 0; });

    // Decrease hit cooldowns
    for (const [e, cd] of this.hitCooldowns) {
      if (cd <= 1) this.hitCooldowns.delete(e);
      else this.hitCooldowns.set(e, cd - 1);
    }

    // Damage enemies touching castle — trap them inside
    for (const e of game.enemies) {
      if (e.dead) { this.trapped.delete(e); continue; }
      if (this._touchesCastle(e)) {
        this.trapped.add(e);
        if (!(this.hitCooldowns.get(e) > 0)) {
          const dmg = Math.floor(this.baseDamage * 1.2);
          e.takeDamage(dmg, game, cx);
          e.freezeTimer = Math.max(e.freezeTimer || 0, 90);
          this.hitCooldowns.set(e, 8);
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#8ff', 10, 4, 12));
          game.player.addUltimateCharge(1);
        }
      }
    }
    if (game.boss && !game.boss.dead) {
      if (this._touchesCastle(game.boss)) {
        this.trapped.add(game.boss);
        if (!(this.hitCooldowns.get(game.boss) > 0)) {
          const dmg = Math.floor(this.baseDamage * 0.6);
          game.boss.takeDamage(dmg, game, cx);
          game.boss.freezeTimer = Math.max(game.boss.freezeTimer || 0, 50);
          this.hitCooldowns.set(game.boss, 18);
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#8ff', 12, 4, 14));
          game.player.addUltimateCharge(2);
        }
      }
    }

    // Block enemy projectiles
    for (const p of game.projectiles) {
      if (p.done || p.owner === 'player' || p.owner === 'boss') continue;
      if (this._touchesCastleRect(p)) {
        p.done = true;
        game.effects.push(new Effect(p.x, p.y, '#aff', 5, 2, 8));
      }
    }

    // Contain trapped enemies inside the castle / block others from entering
    const hb = this._getFullHitbox();
    const margin = 4; // small inset so they don't sit exactly on the wall edge
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (this.trapped.has(e)) {
        // Keep trapped enemies contained inside
        if (e.x < hb.x + margin) { e.x = hb.x + margin; e.vx = Math.abs(e.vx) * 0.3; }
        if (e.x + e.w > hb.x + hb.w - margin) { e.x = hb.x + hb.w - margin - e.w; e.vx = -Math.abs(e.vx) * 0.3; }
        // Dampen horizontal movement so they stay centered-ish
        e.vx *= 0.85;
        // Ice particle on walls when they bump
        if (this.timer % 12 === 0) {
          game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#aef', 4, 2, 8));
        }
      } else if (rectOverlap(e, hb)) {
        // Non-trapped: push out
        const eCx = e.x + e.w / 2;
        if (eCx < cx) {
          e.x = hb.x - e.w;
          if (e.vx > 0) e.vx = 0;
        } else {
          e.x = hb.x + hb.w;
          if (e.vx < 0) e.vx = 0;
        }
      }
    }
    if (game.boss && !game.boss.dead) {
      if (this.trapped.has(game.boss)) {
        // Keep trapped boss contained inside
        if (game.boss.x < hb.x + margin) { game.boss.x = hb.x + margin; game.boss.vx = Math.abs(game.boss.vx) * 0.2; }
        if (game.boss.x + game.boss.w > hb.x + hb.w - margin) { game.boss.x = hb.x + hb.w - margin - game.boss.w; game.boss.vx = -Math.abs(game.boss.vx) * 0.2; }
        game.boss.vx *= 0.8;
        if (this.timer % 12 === 0) {
          game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aef', 5, 2, 10));
        }
      } else if (rectOverlap(game.boss, hb)) {
        const bCx = game.boss.x + game.boss.w / 2;
        if (bCx < cx) {
          game.boss.x = hb.x - game.boss.w;
          if (game.boss.vx > 0) game.boss.vx = 0;
        } else {
          game.boss.x = hb.x + hb.w;
          if (game.boss.vx < 0) game.boss.vx = 0;
        }
      }
    }

    if (this.timer <= 0) this.explode(game);
  }
  _getFullHitbox() {
    // Full column from far above castle to far below — matches visual
    return { x: this.x, y: this.y - 400, w: this.w, h: this.h + 800 };
  }
  _touchesCastle(entity) {
    return rectOverlap(entity, this._getFullHitbox());
  }
  _touchesCastleRect(entity) {
    return rectOverlap(entity, this._getFullHitbox());
  }
  explode(game) {
    if (this.done) return;
    this.done = true;
    const cx = this.x + this.w / 2;
    // Three explosion origins at different heights (top, middle, bottom)
    const camY = game.camera ? game.camera.y : this.y;
    const heights = [
      camY + CANVAS_H * 0.15,
      camY + CANVAS_H * 0.5,
      camY + CANVAS_H * 0.82
    ];
    if (!game.diamondShards) game.diamondShards = [];
    const colors = ['#fff', '#aff', '#0ff', '#8ef', '#cef', '#dff'];
    for (const ey of heights) {
      // Spawn DiamondShards flying outward from this height
      const shardCount = 14;
      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const dist = 20 + Math.random() * 40;
        const shard = new DiamondShard(
          cx + Math.cos(angle) * dist,
          ey + Math.sin(angle) * dist,
          'player', game
        );
        shard.dirX = Math.cos(angle);
        shard.dirY = Math.sin(angle);
        shard.angle = angle + Math.PI / 2;
        shard.speed = 4 + Math.random() * 3;
        shard.maxSpeed = 9;
        game.diamondShards.push(shard);
      }
      // Visual sparkle effects at this height
      for (let i = 0; i < 15; i++) {
        game.effects.push(new Effect(
          cx + (Math.random() - 0.5) * this.w,
          ey + (Math.random() - 0.5) * 80,
          colors[i % colors.length],
          4 + Math.random() * 14, 2 + Math.random() * 3, 15 + randInt(0, 10)
        ));
      }
      game.effects.push(new Effect(cx, ey, '#fff', 40, 10, 20));
    }
    // Damage + freeze all enemies in a large radius
    const explodeRadius = 500;
    const cy = camY + CANVAS_H * 0.5;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = (e.x + e.w / 2) - cx;
      const dy = (e.y + e.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < explodeRadius) {
        const falloff = 1 - (d / explodeRadius) * 0.5;
        e.takeDamage(Math.floor(this.baseDamage * 1.5 * falloff), game, cx);
        e.freezeTimer = Math.max(e.freezeTimer || 0, 150);
        if (d > 0) { e.vx += (dx / d) * 10; e.vy += (dy / d) * 6 - 4; }
      }
    }
    if (game.boss && !game.boss.dead) {
      const dx = (game.boss.x + game.boss.w / 2) - cx;
      const dy = (game.boss.y + game.boss.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < explodeRadius) {
        game.boss.takeDamage(Math.floor(this.baseDamage * 1.2), game, cx);
        game.boss.freezeTimer = Math.max(game.boss.freezeTimer || 0, 90);
      }
    }
    SFX.parry();
  }
  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x;
    const centerX = sx + this.w / 2;
    const pulse = Math.sin(this.timer * 0.05) * 0.06 + 0.94;

    // Always draw from screen top to screen bottom
    const screenH = CANVAS_H;

    // Snowflakes (behind castle)
    for (const s of this.snowflakes) {
      ctx.globalAlpha = Math.min(1, s.life / 20) * 0.6;
      ctx.fillStyle = '#eef';
      ctx.beginPath();
      ctx.arc(s.x - cam.x, s.y - cam.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft glow behind whole castle
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(this.timer * 0.03) * 0.06;
    const grd = ctx.createRadialGradient(centerX, screenH * 0.4, 10, centerX, screenH * 0.4, this.w * 1.5);
    grd.addColorStop(0, '#aff');
    grd.addColorStop(1, 'rgba(170,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(sx - this.w * 0.5, 0, this.w * 2, screenH);
    ctx.restore();

    // --- Main castle body (wall fills bottom ~65% of screen) ---
    const wallTop = screenH * 0.35;
    const wallBot = screenH;
    const wallL = sx + 6;
    const wallR = sx + this.w - 6;
    const wallGrd = ctx.createLinearGradient(wallL, wallTop, wallL, wallBot);
    wallGrd.addColorStop(0, `rgba(170,230,245,${0.9 * pulse})`);
    wallGrd.addColorStop(0.5, `rgba(130,210,235,${0.85 * pulse})`);
    wallGrd.addColorStop(1, `rgba(100,180,210,${0.8 * pulse})`);
    ctx.fillStyle = wallGrd;
    ctx.fillRect(wallL, wallTop, wallR - wallL, wallBot - wallTop);

    // Brick pattern
    ctx.strokeStyle = 'rgba(80,170,210,0.35)';
    ctx.lineWidth = 0.5;
    const brickH = (wallBot - wallTop) / 12;
    for (let row = 0; row < 12; row++) {
      const ry = wallTop + row * brickH;
      ctx.beginPath(); ctx.moveTo(wallL, ry); ctx.lineTo(wallR, ry); ctx.stroke();
      const offset = row % 2 === 0 ? 0 : 18;
      for (let col = offset; col < wallR - wallL; col += 36) {
        ctx.beginPath(); ctx.moveTo(wallL + col, ry); ctx.lineTo(wallL + col, ry + brickH); ctx.stroke();
      }
    }

    // Battlements (crenellations)
    const merW = 14, merH = 10, merGap = 8;
    ctx.fillStyle = `rgba(160,235,250,${0.9 * pulse})`;
    for (let bx = wallL; bx < wallR - merW; bx += merW + merGap) {
      ctx.fillRect(bx, wallTop - merH, merW, merH);
    }

    // --- Grand entrance arch ---
    const gateW = 44, gateH = 65;
    const gateX = centerX - gateW / 2;
    const gateY = wallBot - gateH;
    ctx.fillStyle = 'rgba(30,80,110,0.9)';
    ctx.fillRect(gateX, gateY, gateW, gateH);
    ctx.beginPath();
    ctx.arc(centerX, gateY, gateW / 2, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,255,0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gateX, wallBot);
    ctx.lineTo(gateX, gateY);
    ctx.arc(centerX, gateY, gateW / 2, Math.PI, 0);
    ctx.lineTo(gateX + gateW, wallBot);
    ctx.stroke();
    // Portcullis lines
    ctx.strokeStyle = 'rgba(140,200,220,0.5)';
    ctx.lineWidth = 1;
    for (let gx = gateX + 6; gx < gateX + gateW; gx += 8) {
      ctx.beginPath(); ctx.moveTo(gx, gateY - 6); ctx.lineTo(gx, wallBot); ctx.stroke();
    }

    // --- Balcony above gate ---
    const balcW = 64, balcH = 5;
    ctx.fillStyle = `rgba(180,240,255,${0.85 * pulse})`;
    ctx.fillRect(centerX - balcW / 2, wallTop - 2, balcW, balcH);
    ctx.strokeStyle = 'rgba(200,255,255,0.6)';
    ctx.lineWidth = 1;
    const railY = wallTop - 14;
    ctx.beginPath(); ctx.moveTo(centerX - balcW / 2, railY); ctx.lineTo(centerX + balcW / 2, railY); ctx.stroke();
    for (let rx = centerX - balcW / 2 + 6; rx < centerX + balcW / 2; rx += 10) {
      ctx.beginPath(); ctx.moveTo(rx, railY); ctx.lineTo(rx, wallTop - 2); ctx.stroke();
    }
    // Balcony window (arched)
    ctx.fillStyle = 'rgba(40,100,140,0.8)';
    const bWinW = 16, bWinH = 22;
    ctx.fillRect(centerX - bWinW / 2, wallTop - bWinH - 6, bWinW, bWinH);
    ctx.beginPath();
    ctx.arc(centerX, wallTop - bWinH - 6, bWinW / 2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,255,255,0.3)';
    ctx.fillRect(centerX - bWinW / 2 + 2, wallTop - bWinH - 4, bWinW - 4, bWinH - 2);

    // --- Side windows (multiple rows for tall wall) ---
    const winCols = [wallL + 18, wallR - 34];
    for (let row = 0; row < 3; row++) {
      for (const wx of winCols) {
        const wy = wallTop + 25 + row * 55;
        ctx.fillStyle = 'rgba(40,100,140,0.7)';
        ctx.fillRect(wx, wy, 14, 20);
        ctx.beginPath();
        ctx.arc(wx + 7, wy, 7, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(170,255,255,0.25)';
        ctx.fillRect(wx + 2, wy + 1, 10, 18);
      }
    }

    // --- Towers with conical roofs (screen-space, fill top portion) ---
    const towerDefs = [
      { ox: 0.5,  topFrac: 0.0,  tw: 44, thFrac: 0.17, roofFrac: 0.16, roofW: 60 },  // grand center
      { ox: 0.2,  topFrac: 0.05, tw: 36, thFrac: 0.14, roofFrac: 0.13, roofW: 50 },  // left-center
      { ox: 0.8,  topFrac: 0.05, tw: 36, thFrac: 0.14, roofFrac: 0.13, roofW: 50 },  // right-center
      { ox: 0.03, topFrac: 0.12, tw: 30, thFrac: 0.12, roofFrac: 0.10, roofW: 42 },  // far left
      { ox: 0.97, topFrac: 0.12, tw: 30, thFrac: 0.12, roofFrac: 0.10, roofW: 42 },  // far right
      { ox: 0.35, topFrac: 0.02, tw: 28, thFrac: 0.13, roofFrac: 0.14, roofW: 38 },  // inner-left
      { ox: 0.65, topFrac: 0.02, tw: 28, thFrac: 0.13, roofFrac: 0.14, roofW: 38 },  // inner-right
    ];
    for (const t of towerDefs) {
      const tx = sx + this.w * t.ox;
      const roofH = wallTop * t.roofFrac;
      const th = wallTop * t.thFrac;
      const towerTop = wallTop * t.topFrac + roofH;
      const towerBot = towerTop + th;
      const halfTw = t.tw / 2;

      // Tower body
      const tGrd = ctx.createLinearGradient(tx - halfTw, towerTop, tx + halfTw, towerTop);
      tGrd.addColorStop(0, `rgba(150,225,240,${0.88 * pulse})`);
      tGrd.addColorStop(0.4, `rgba(180,245,255,${0.92 * pulse})`);
      tGrd.addColorStop(1, `rgba(130,205,225,${0.85 * pulse})`);
      ctx.fillStyle = tGrd;
      ctx.fillRect(tx - halfTw, towerTop, t.tw, wallTop - towerTop);

      // Tower window
      if (th > 20) {
        ctx.fillStyle = 'rgba(40,100,140,0.7)';
        const twW = Math.max(5, t.tw * 0.35);
        const twH = twW * 1.5;
        const winY = towerTop + (wallTop - towerTop) * 0.3;
        ctx.fillRect(tx - twW / 2, winY, twW, twH);
        ctx.beginPath();
        ctx.arc(tx, winY, twW / 2, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(170,255,255,0.3)';
        ctx.fillRect(tx - twW / 2 + 1, winY + 1, twW - 2, twH - 2);
      }

      // Tower mini-battlements
      const mbW = 5, mbH = 4, mbGap = 4;
      ctx.fillStyle = `rgba(170,240,255,${0.85 * pulse})`;
      for (let mbx = tx - halfTw; mbx < tx + halfTw - mbW; mbx += mbW + mbGap) {
        ctx.fillRect(mbx, towerTop - mbH, mbW, mbH);
      }

      // Conical roof (pointy spire)
      const roofTip = towerTop - roofH;
      const halfRw = t.roofW / 2;
      const rGrd = ctx.createLinearGradient(tx - halfRw, roofTip, tx + halfRw, towerTop);
      rGrd.addColorStop(0, `rgba(200,255,255,${0.95 * pulse})`);
      rGrd.addColorStop(0.5, `rgba(140,220,240,${0.9 * pulse})`);
      rGrd.addColorStop(1, `rgba(120,200,225,${0.85 * pulse})`);
      ctx.fillStyle = rGrd;
      ctx.beginPath();
      ctx.moveTo(tx, roofTip);
      ctx.lineTo(tx - halfRw, towerTop - 2);
      ctx.lineTo(tx + halfRw, towerTop - 2);
      ctx.closePath();
      ctx.fill();
      // Roof highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(tx, roofTip);
      ctx.lineTo(tx - halfRw * 0.25, towerTop - 4);
      ctx.lineTo(tx + halfRw * 0.15, towerTop - roofH * 0.5);
      ctx.closePath();
      ctx.fill();
      // Roof edge
      ctx.strokeStyle = 'rgba(200,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, roofTip);
      ctx.lineTo(tx - halfRw, towerTop - 2);
      ctx.moveTo(tx, roofTip);
      ctx.lineTo(tx + halfRw, towerTop - 2);
      ctx.stroke();
    }

    // --- Flags on top towers ---
    const flagTowers = [
      { idx: 0, color: '#aef' },
      { idx: 1, color: '#cff' },
      { idx: 2, color: '#cff' },
    ];
    for (const f of flagTowers) {
      const t = towerDefs[f.idx];
      const tx = sx + this.w * t.ox;
      const roofTip = wallTop * t.topFrac;
      // Flagpole
      ctx.strokeStyle = 'rgba(220,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, roofTip);
      ctx.lineTo(tx, roofTip - 18);
      ctx.stroke();
      // Flag (waving)
      const wave = Math.sin(this.timer * 0.08 + f.idx * 2) * 3;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(tx, roofTip - 18);
      ctx.lineTo(tx + 12 + wave, roofTip - 15);
      ctx.lineTo(tx + 10 + wave * 0.5, roofTip - 10);
      ctx.lineTo(tx, roofTip - 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // --- Sparkles ---
    for (const sp of this.sparkles) {
      const alpha = Math.sin((sp.life / sp.maxLife) * Math.PI);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#fff';
      const ssz = sp.size;
      const spx = sp.x - cam.x, spy = sp.y - cam.y;
      ctx.beginPath();
      ctx.moveTo(spx, spy - ssz);
      ctx.lineTo(spx + ssz * 0.3, spy);
      ctx.lineTo(spx, spy + ssz);
      ctx.lineTo(spx - ssz * 0.3, spy);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(spx - ssz, spy);
      ctx.lineTo(spx, spy + ssz * 0.3);
      ctx.lineTo(spx + ssz, spy);
      ctx.lineTo(spx, spy - ssz * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ice shimmer
    ctx.globalAlpha = 0.05 + Math.sin(this.timer * 0.08) * 0.03;
    ctx.fillStyle = '#fff';
    ctx.fillRect(wallL, wallTop, this.w - 12, wallBot - wallTop);
    ctx.globalAlpha = 1;

    // Explosion warning: flicker near end
    if (this.timer < 60) {
      const freq = this.timer < 20 ? 0.8 : 0.4;
      const flicker = Math.sin(this.timer * freq) * 0.3 + 0.3;
      ctx.globalAlpha = flicker;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - 4, 0, this.w + 8, screenH);
      ctx.globalAlpha = 1;
    }
  }
}
