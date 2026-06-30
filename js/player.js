// ── Player ───────────────────────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 32;
    this.vx = 0; this.vy = 0;
    this.facing = 1; // 1 right, -1 left
    this.grounded = false;
    this.hp = 20;
    this.maxHp = 20;
    this.shield = 0;
    this.maxShield = 0;
    this.displayHp = 20;
    this.displayShield = 0;
    this.ninjaType = 'basic';
    this.heldItem = 'flamethrower';
    this.itemAmmo = Math.ceil(WEAPON_ITEMS.flamethrower.ammoMax * 0.5);
    this.itemAmmoMax = WEAPON_ITEMS.flamethrower.ammoMax;
    this.lastHeldItem = this.heldItem;
    this.itemUseFlash = 0;
    this.itemCrashPalette = null;
    this.weaponPickupCooldown = 0;
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
    this.ultimateMax = 750;
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
    this.iceHover = 0; // timer for midair hover when using crystal special

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
    this.swingHitSet = new Set();

    // Special state
    this.specialCooldown = 0;
    this.actionChargeMax = 3;
    this.actionRechargeMax = 180;
    this.attackCharges = this.actionChargeMax;
    this.specialCharges = this.actionChargeMax;
    this.attackRechargeTimer = 0;
    this.specialRechargeTimer = 0;
    this.attackFocus = 1;
    this.attackFocusDrop = 0.30;
    this.attackFocusMin = 0.10;
    this.attackFocusRechargeMax = 300;
    this._attackDamageMult = 1;

    // Mana system (pip-based)
    this.maxMana = MANA_CAPS[this.ninjaType]; // default, set per ninja in switchNinja
    this.mana = this.maxMana;
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
    this.shadowChainFirstHop = false;
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

    // Stagger chain state (any ninja type)
    this.staggerChaining = false;
    this.staggerChainTimer = 0;
    this.staggerChainHit = new Set();
    this.staggerChainDmg = 0;
    this.staggerChainSegments = [];
    this.staggerChainEchoes = [];
    this.staggerChainMarks = [];
    this.staggerChainCombo = 0;
    this.staggerChainComboTimer = 0;
    this.staggerChainComboPop = 0;

    // Next-hit-double system
    this.nextHitDouble = false;

    // Shadow instakill threshold (gradual, caps at 15)
    this.shadowKillThreshold = 0;

    // Shurikens (rechargeable, auto-fire)
    this.shurikens = 3;
    this.shurikenFireCooldown = 0;

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

    // Former focus regen timer kept for save/runtime compatibility.
    this.focusRegenTimer = 0;

    // Bubble shield orb — temporary damage block
    this.bubbleShieldTimer = 0;
    this.bubbleShieldMax = 300; // 5 seconds
    this.elementalArmor = 0;
    this.elementalArmorMax = 100;
    this.elementalArmorBlockCost = 28;
    this.elementalArmorPerDamage = 5;

    // Pending damage (highest prevails per frame)
    this._pendingDamage = null; // { amount, element, killerInfo }
    this.oneShotProtectionUsed = false;

    // Ground slam
    this.slamming = false;
    this.dropThroughSlamLock = false;

    // Stop midair
    this.stopMidair = false;
    this.stopMidairTimer = 0;

    // Defeated boss/enemy tracking (for earth construct unlocks)
    this.defeatedBossTypes = new Set();
    this.defeatedDeflector = false;

    // Boss items inventory (per-run)
    this.items = {};
    this.unlockedItems = {};
    this.itemAttrBonuses = { mind: 0, vigor: 0, dexterity: 0 };
    this._itemAttrApplied = { mind: 0, vigor: 0, dexterity: 0 };
    this.deathsKeyUsed = false;
    this.autoSwingTimer = 0; // for The Code
    this.codeComboCount = 0; // 3-hit combo tracker for The Code
    this.codeCounterMax = 600; // ~10 seconds at 60fps
    this.codeCounterCharge = this.codeCounterMax; // start fully charged
    this.evasionRng = Math.random; // for Leather Boots
    this.x2OrbCounter = 0; // orbs collected while x2 Orb active (breaks at 100)
    this.x2OrbBreaking = 0; // visual timer for break animation
  }

  // Hurtbox is slightly smaller than the rendered sprite
  getHurtbox() {
    return { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 4 };
  }

  get type() { return NINJA_TYPES[this.ninjaType]; }

  _updateActionCharges() {
    const max = this.actionChargeMax || 3;
    const recharge = this.actionRechargeMax || 180;
    if (this.attackCharges === undefined) this.attackCharges = max;
    if (this.specialCharges === undefined) this.specialCharges = max;
    this.attackCharges = max;
    this.attackRechargeTimer = 0;
    if (this.attackFocus === undefined) this.attackFocus = 1;
    if (this.attackFocus < 1) {
      const drop = this.attackFocusDrop || 0.30;
      const focusRecharge = this.attackFocusRechargeMax || 300;
      this.attackFocus = Math.min(1, this.attackFocus + drop / focusRecharge);
    } else {
      this.attackFocus = 1;
    }
    if (this.specialCharges < max) {
      this.specialRechargeTimer = (this.specialRechargeTimer || 0) + 1;
      if (this.specialRechargeTimer >= recharge) {
        this.specialRechargeTimer = 0;
        this.specialCharges = Math.min(max, this.specialCharges + 1);
      }
    } else {
      this.specialRechargeTimer = 0;
    }
  }

  _spendActionCharge(kind, game) {
    if (kind === 'attack') return true;
    const prop = kind === 'special' ? 'specialCharges' : 'attackCharges';
    if (this[prop] === undefined) this[prop] = this.actionChargeMax || 3;
    if (this[prop] <= 0) {
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'COOLDOWN', '#aaa'));
      if (typeof SFX !== 'undefined' && SFX.miss) SFX.miss();
      return false;
    }
    this[prop]--;
    return true;
  }

  _consumeAttackFocus() {
    if (this.attackFocus === undefined) this.attackFocus = 1;
    this._attackDamageMult = Math.max(this.attackFocusMin || 0.10, Math.min(1, this.attackFocus));
    this.attackFocus = Math.max(this.attackFocusMin || 0.10, this.attackFocus - (this.attackFocusDrop || 0.30));
  }

  _applyAttackFocusDamage(dmg) {
    const mult = Math.max(this.attackFocusMin || 0.10, Math.min(1, this._attackDamageMult || this.attackFocus || 1));
    return Math.max(1, Math.ceil(dmg * mult));
  }

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

  _getAimVector(game, opts = {}) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const rx = gpState.axes[2] || 0;
    const ry = gpState.axes[3] || 0;
    const rLen = Math.hypot(rx, ry);
    if (opts.gamepad && rLen > 0.35) return { x: rx / rLen, y: ry / rLen };
    if (opts.mouse && canvasMouseX >= 0 && canvasMouseY >= 0 && game && game.camera) {
      const dx = game.camera.x + canvasMouseX - cx;
      const dy = game.camera.y + canvasMouseY - cy;
      const d = Math.hypot(dx, dy);
      if (d > 6) return { x: dx / d, y: dy / d };
    }
    return { x: this.facing || 1, y: 0 };
  }

  _applyAimFacing(game, opts = {}) {
    const aim = this._getAimVector(game, opts);
    if (Math.abs(aim.x) > 0.12) this.facing = aim.x >= 0 ? 1 : -1;
    return aim;
  }

  _aimLocal(game, forward, side = 0, opts = {}) {
    const aim = this._getAimVector(game, opts);
    const px = -aim.y;
    const py = aim.x;
    return {
      x: aim.x * forward + px * side,
      y: aim.y * forward + py * side
    };
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
    const palette = this.currentPaletteDef();
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palette ? (palette.accentColor || palette.color || '#fff') : '#fff', 30, 8, 30));
    recordUltimate(this.ninjaType);
  }

  // Called when float phase ends — triggers the actual ultimate effect
  triggerUltimateEffect(game) {
    this.ultCutscene = false;
    const palette = this.currentPaletteDef();
    const palColor = palette ? (palette.color || palette.bodyColor || this.type.color) : this.type.color;
    const palAccent = palette ? (palette.accentColor || palette.color || this.type.accentColor) : this.type.accentColor;
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
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 25, 6, 20));
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
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 25, 6, 20));
        break;

      case 'shadow':
        // Screen goes dark, glowing eyes appear + purple paralysis on all enemies
        this.ultimateTimer = 360; // 6 seconds of buff after cutscene
        this.shadowDarkness = 0;
        this.shadowEyesTimer = 60; // eyes visible for 60 frames
        this.shadowUltBuff = true;
        // Massive initial shadow strike around the player
        damageInRadius(game, this.x + this.w / 2, this.y + this.h / 2, 200, (this.type.attackDamage + this.bonusElemental) * 3);
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 40, 10, 30));
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
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 30, 8, 25));
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
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 25, 6, 20));
        this.invincibleTimer = 45;
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
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, palAccent, 25, 6, 20));
        break;
    }
    // End invincibility boost (set to just a brief window after cutscene)
    if (this.ninjaType !== 'wind') {
      this.invincibleTimer = 30;
    }
  }

  addUltimateCharge(amount) {
    this.addAmmo(Math.max(1, Math.round((amount || 1) / 5)));
    const def = this.currentWeaponDef();
    if (!def || !def.crashPower || this.ultimateActive) return;
    this.ultimateCharge = Math.min(this.ultimateMax, (this.ultimateCharge || 0) + Math.max(1, Math.round((amount || 1) * 0.75)));
    this.ultimateReady = this.ultimateCharge >= this.ultimateMax;
  }

  currentWeaponDef() {
    return (this.heldItem && WEAPON_ITEMS[this.heldItem]) ? WEAPON_ITEMS[this.heldItem] : null;
  }

  currentPaletteDef() {
    return this.currentWeaponDef() || ((this.ultimateActive || this.ultCutscene) ? this.itemCrashPalette : null);
  }

  _clearItemMotionState() {
    this.fireDashing = false;
    this.fireDashTimer = 0;
    this._fireballPending = false;
    this.windDashing = false;
    this.windDashTimer = 0;
    this.earthAirHover = 0;
    this.iceHover = 0;
    this.stopMidair = false;
    this.stopMidairTimer = 0;
    this.parrying = false;
    this.parryTimer = 0;
  }

  _isChainInvulnerable() {
    return !!(this.chainStriking || this.stormChaining || this.staggerChaining);
  }

  _setChainInvulnerability(frames = 60) {
    this.invincibleTimer = Math.max(this.invincibleTimer || 0, frames);
    this._pendingDamage = null;
  }

  _maintainChainInvulnerability() {
    if (!this._isChainInvulnerable()) return;
    this._setChainInvulnerability(2);
  }

  _sanitizeInvulnerabilityState() {
    const protectedByUltimate = this.ultCutscene || this.ultimateActive || this.earthGolem || this.bubbleRide || this.bubbleUlt || this.windBow || this.crystalCastle;
    const protectedByChain = this._isChainInvulnerable();
    const staleLongInvuln = this.invincibleTimer > 180 && !protectedByUltimate && !protectedByChain && this.deathTimer <= 0;
    if (staleLongInvuln) this.invincibleTimer = 0;
  }

  _ensureDeathState(game) {
    if (this.hp > 0 || this.deathTimer > 0) return;
    this.hp = 0;
    this.invincibleTimer = 0;
    this.deathTimer = 180;
    this.vx = 0;
    this.vy = 0;
    if (typeof SFX !== 'undefined' && SFX.playerDie) SFX.playerDie();
    if (game && game.effects) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      game.effects.push(new Effect(cx, cy, '#fff', 20, 6, 25));
      game.effects.push(new Effect(cx, cy, '#f44', 12, 4, 18));
      game.effects.push(new TextEffect(cx, cy - 20, 'K.O.', '#f44'));
    }
  }

  _legacyBossItemsEnabled() {
    return typeof LEGACY_BOSS_ITEMS_ENABLED === 'undefined' || !!LEGACY_BOSS_ITEMS_ENABLED;
  }

  equipWeapon(weaponId, game, opts = {}) {
    const def = WEAPON_ITEMS[weaponId];
    if (!def) return false;
    const duringUltimate = this.ultCutscene || this.ultimateActive;
    if ((duringUltimate && !opts.allowDuringUltimate) || (!duringUltimate && (this.earthGolem || this.bubbleRide || this.bubbleUlt || this.windBow || this.crystalCastle))) return false;
    const oldType = this.ninjaType;
    const oldUltimateReady = this.ultimateReady;
    const oldUltimateCharge = this.ultimateCharge;
    if (!duringUltimate) this._clearItemMotionState();
    this.heldItem = weaponId;
    this.lastHeldItem = weaponId;
    this.itemCrashPalette = null;
    this.itemAmmoMax = def.ammoMax || 0;
    const defaultAmmo = Math.ceil((def.ammoMax || 0) * 0.5);
    const pickedAmmo = opts.ammo === undefined ? defaultAmmo : opts.ammo;
    this.itemAmmo = Math.max(0, Math.min(this.itemAmmoMax, Math.round(pickedAmmo)));
    if (duringUltimate) {
      this.ninjaType = oldType;
      this.ultimateCharge = oldUltimateCharge;
      this.ultimateReady = oldUltimateReady;
    } else {
      this.ninjaType = 'basic';
      this.ultimateCharge = 0;
      this.ultimateReady = false;
    }
    if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 34, def.name.toUpperCase(), def.accentColor || def.color));
    return true;
  }

  addAmmo(amount, game) {
    const def = this.currentWeaponDef();
    if (!def) return 0;
    const max = def.ammoMax || this.itemAmmoMax || 0;
    const gain = amount || def.ammoPickup || Math.max(4, Math.ceil(max * 0.25));
    const before = this.itemAmmo || 0;
    this.itemAmmoMax = max;
    this.itemAmmo = Math.min(max, before + gain);
    return this.itemAmmo - before;
  }

  _spendItemAmmo(game) {
    const def = this.currentWeaponDef();
    if (!def) {
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'NO ITEM', '#aaa'));
      if (typeof SFX !== 'undefined' && SFX.miss) SFX.miss();
      return null;
    }
    const cost = def.ammoCost || 1;
    if ((this.itemAmmo || 0) < cost) {
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'NO AMMO', '#ffd86b'));
      if (typeof SFX !== 'undefined' && SFX.miss) SFX.miss();
      return null;
    }
    this.itemAmmo -= cost;
    return def;
  }

  useHeldItem(game, aimOpts = {}) {
    const def = this._spendItemAmmo(game);
    if (!def) return;
    this.itemUseFlash = 12;
    if ((def.family || def.crashPower) === 'bubble') {
      this.statusFloat = Math.max(this.statusFloat || 0, 90);
      if (game) {
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 18, 'FLOAT', def.accentColor || def.color || '#aef'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, def.accentColor || '#aef', 10, 3, 14));
      }
    }
    if (def.power && def.power !== 'basic') {
      const oldType = this.ninjaType;
      this.ninjaType = def.power;
      this.useSpecial(game);
      if (def.power !== 'fire') this.ninjaType = oldType === 'fire' ? 'basic' : oldType;
      return;
    }
    this.fireBasicWeapon(game, def, aimOpts);
  }

  fireBasicWeapon(game, def, aimOpts = {}) {
    SFX.special();
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const aim = this._applyAimFacing(game, aimOpts);
    const dir = this.facing || 1;
    const aimOffset = (forward, side = 0) => this._aimLocal(game, forward, side, aimOpts);
    const kind = def.kind || 'pistol';
    const family = def.family || def.crashPower || 'basic';
    const color = def.color || '#e8e8e8';
    const accent = def.accentColor || color;
    const applyProjectileTheme = (p) => {
      p.fromSpecial = true;
      p.weaponFamily = family;
      p.element = family === 'fire' ? 'fire'
        : family === 'crystal' ? 'crystal'
        : family === 'storm' ? 'lightning'
        : family === 'shadow' ? 'shadow'
        : family === 'earth' ? 'physical'
        : undefined;
      if (family === 'fire') {
        p.isFireball = true;
        p.burnWeapon = true;
      } else if (family === 'bubble') {
        p.soaking = true;
        p.homing = true;
        p.homingStrength = 0.34;
      } else if (family === 'shadow') {
        p.shadowParalyse = true;
      } else if (family === 'crystal') {
        p.freezeDust = true;
      } else if (family === 'storm') {
        p.soaking = true;
        p.shadowParalyse = true;
        p.stormStrike = true;
      } else if (family === 'earth') {
        p.earthImpact = true;
      }
      return p;
    };
    if (family === 'wind') {
      if (!game.trimerangs) game.trimerangs = [];
      const spawnTri = (ox, oy, vx, vy, opts = {}) => {
        const t = new Trimerang(cx + ox, cy + oy, vx, vy, 'player');
        t.homingEnemy = true;
        t.life = opts.life || 150;
        t.radius = opts.radius || 15;
        t.spin = opts.spin || (0.34 + Math.random() * 0.08);
        t.burstPhase = opts.burstPhase || 0;
        t.turnSpeed = opts.turnSpeed || t.turnSpeed;
        t.turnDir = opts.turnDir || t.turnDir;
        t.damage = this.type.attackDamage + this.bonusElemental + (opts.damageBonus || 2);
        t.color = color;
        t.accentColor = accent;
        t.weaponWeave = opts.weave || 0.035;
        game.trimerangs.push(t);
      };
      if (kind === 'pistol') {
        const off = aimOffset(16, -3);
        const vel = aimOffset(10, -2.8);
        spawnTri(off.x, off.y, vel.x, vel.y, { life: 120, radius: 13, burstPhase: 18, weave: 0.055, damageBonus: 1 });
      } else if (kind === 'crossbow') {
        const off1 = aimOffset(14, -8);
        const vel1 = aimOffset(8.5, -4.2);
        const off2 = aimOffset(14, 6);
        const vel2 = aimOffset(8.5, 3.3);
        spawnTri(off1.x, off1.y, vel1.x, vel1.y, { life: 150, radius: 14, burstPhase: 24, turnDir: 1, weave: 0.04, damageBonus: 2 });
        spawnTri(off2.x, off2.y, vel2.x, vel2.y, { life: 150, radius: 14, burstPhase: 24, turnDir: -1, weave: -0.04, damageBonus: 2 });
      } else {
        for (let i = -1; i <= 1; i++) {
          const off = aimOffset(10, i * 8);
          const vel = aimOffset(7.8 - Math.abs(i) * 0.4, i * 3.2);
          spawnTri(off.x, off.y, vel.x, vel.y, { life: 180, radius: 15 + Math.abs(i), burstPhase: 34 + Math.abs(i) * 8, weave: 0.05 * (i || 1), damageBonus: 3 });
        }
      }
      game.effects.push(new Effect(cx + aim.x * 20, cy + aim.y * 20, accent, 14, 4, 12));
      triggerScreenShake(1, 3);
      return;
    }
    if (kind === 'shotgun') {
      for (let i = -2; i <= 2; i++) {
        const off = aimOffset(14, -2);
        const vel = aimOffset(8.5 - Math.abs(i) * 0.4, i * 1.15);
        const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 2, 'player');
        p.w = 10; p.h = 5; p.life = 46; p.piercing = false;
        game.projectiles.push(applyProjectileTheme(p));
      }
      triggerScreenShake(2, 4);
    } else if (kind === 'rpg') {
      const off = aimOffset(18, -4);
      const vel = aimOffset(5.2, -0.2);
      const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 8, 'player');
      p.w = 18; p.h = 10; p.life = 120; p.explosive = true; p.explosionRadius = family === 'earth' ? 90 : 105;
      game.projectiles.push(applyProjectileTheme(p));
      triggerScreenShake(3, 5);
    } else if (kind === 'crossbow') {
      const off = aimOffset(17, -4);
      const vel = aimOffset(11.5, -0.1);
      const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 3, 'player');
      p.w = 16; p.h = 4; p.life = 72; p.piercing = true;
      game.projectiles.push(applyProjectileTheme(p));
    } else if (kind === 'staff') {
      const off = aimOffset(16, -8);
      const vel = aimOffset(7.6, -0.35);
      const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, accent, this.type.attackDamage + this.bonusElemental + 4, 'player');
      p.w = 13; p.h = 13; p.life = 86; p.homing = family === 'storm' || family === 'crystal';
      game.projectiles.push(applyProjectileTheme(p));
    } else if (kind === 'grenade') {
      const off = aimOffset(14, -10);
      const vel = aimOffset(5.3, -5.2);
      const g = new Grenade(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 5, 'player', {
        element: family === 'storm' ? 'lightning' : undefined,
        gravScale: 0.9, fuseTimer: 54, bouncesLeft: 1, explodeRadius: 76
      });
      g.w = 14; g.h = 14;
      g.weaponFamily = family;
      g.accentColor = accent;
      game.grenades.push(g);
      triggerScreenShake(2, 4);
    } else if (kind === 'hammer') {
      const off = aimOffset(12, 4);
      const vel = aimOffset(4.8, 2.4);
      const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 6, 'player');
      p.w = 18; p.h = 14; p.life = 58; p.explosive = true; p.explosionRadius = 70;
      game.projectiles.push(applyProjectileTheme(p));
      triggerScreenShake(2, 5);
    } else {
      const off = aimOffset(16, -3);
      const vel = aimOffset(10, 0);
      const p = new Projectile(cx + off.x, cy + off.y, vel.x, vel.y, color, this.type.attackDamage + this.bonusElemental + 1, 'player');
      p.w = 9; p.h = 5; p.life = 80;
      game.projectiles.push(applyProjectileTheme(p));
    }
    game.effects.push(new Effect(cx + aim.x * 20, cy + aim.y * 20, accent, 7, 3, 8));
  }

  activateItemCrash(game) {
    const def = this.currentWeaponDef();
    if (!def || !def.crashPower) {
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'NO CRASH', '#aaa'));
      if (typeof SFX !== 'undefined' && SFX.miss) SFX.miss();
      return false;
    }
    if (this.ultCutscene || this.ultimateActive) return false;
    if ((this.ultimateCharge || 0) < (this.ultimateMax || 1)) {
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'CRASH NOT READY', def.accentColor || def.color));
      if (typeof SFX !== 'undefined' && SFX.miss) SFX.miss();
      return false;
    }
    const consumed = this.heldItem;
    this.itemCrashPalette = Object.assign({}, def);
    this.heldItem = null;
    this.itemAmmo = 0;
    this.itemAmmoMax = 0;
    this.ninjaType = def.crashPower;
    this.ultimateReady = true;
    if (game && game._liveWeaponPickups && game._spawnEmergencyWeaponPickup && game._liveWeaponPickups().length <= 0) {
      game._spawnEmergencyWeaponPickup(0);
    }
    this.activateUltimate(game);
    if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 52, def.shortName + ' CRASH', def.accentColor || def.color));
    this.lastHeldItem = consumed;
    return true;
  }

  switchNinja(type) {
    const weapon = WEAPON_ORDER.find(id => WEAPON_ITEMS[id] && WEAPON_ITEMS[id].power === type);
    if (weapon) return this.equipWeapon(weapon);
    if (type !== 'basic') return false;
    if (this.ninjaType === type) return false;
    if (this.ultCutscene || this.earthGolem || this.bubbleRide || this.bubbleUlt || this.windBow || this.crystalCastle) return false; // Can't switch during ultimate cutscene, golem, bubble, wind bow, or crystal castle
    this.ninjaType = type;
    this.comboMeter = 0;
    this.comboTimer = 0;
    this.fireArmor = false;
    this.fireArmorTimer = 0;
    this._clearItemMotionState();
    this.bubbleBuffTimer = 0;
    this.backstabReady = false;
    this.shadowStealth = 0;
    this.chainStriking = false;
    this.shadowChainFirstHop = false;
    if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
    this.parrying = false;
    this.parryCombo = 0;
    this.parryComboTimer = 0;
    this.crystalCastle = false;
    this.crystalShatter = 0;
    this.crystalShards = null;
    this.windPower = 0;
    this.stormChaining = false;
    this.stormChainHit = new Set();
    this.stormAfterimages = [];
    this.staggerChaining = false;
    this.staggerChainHit = new Set();
    this.staggerChainSegments = [];
    this.staggerChainEchoes = [];
    this.staggerChainMarks = [];
    this.staggerChainCombo = 0;
    this.staggerChainComboTimer = 0;
    this.staggerChainComboPop = 0;
    // Set mana capacity per ninja
    this.maxMana = (MANA_CAPS[type] || 2) + this.bonusMana;
    this.mana = this.maxMana;
    return true;
  }

  _applyStaggerChainStatus(target, game) {
    if (!target || target.dead || !game) return;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    switch (this.ninjaType) {
      case 'fire':
        target.burnTimer = Math.max(target.burnTimer || 0, target === game.boss || target.bossType ? 150 : 210);
        game.effects.push(new Effect(cx, cy, '#f80', 10, 3, 14));
        break;
      case 'bubble':
        target.chainBubbleTimer = Math.max(target.chainBubbleTimer || 0, target === game.boss || target.bossType ? 70 : 110);
        target.freezeTimer = Math.max(target.freezeTimer || 0, 20);
        target.vx = 0;
        target.vy = -1.2;
        game.effects.push(new Effect(cx, cy, '#8cf', 14, 4, 18));
        game.effects.push(new Effect(cx, cy, '#4af', 10, 3, 16));
        break;
      case 'crystal':
        target.freezeTimer = Math.max(target.freezeTimer || 0, target === game.boss || target.bossType ? 70 : 120);
        target.iceSliding = false;
        target.vx = 0;
        game.effects.push(new Effect(cx, cy, '#aff', 12, 4, 16));
        break;
      case 'wind':
        target.floatTimer = Math.max(target.floatTimer || 0, target === game.boss || target.bossType ? 55 : 110);
        target.vy = Math.min(target.vy || 0, -3);
        game.effects.push(new Effect(cx, cy, '#bfb', 12, 4, 16));
        break;
      case 'storm':
        target.soakTimer = Math.max(target.soakTimer || 0, 360);
        game.effects.push(new Effect(cx, cy, '#48f', 12, 4, 16));
        break;
    }
  }

  _addStaggerChainCutMark(target) {
    if (!target) return;
    if (!this.staggerChainMarks) this.staggerChainMarks = [];
    this.staggerChainMarks.push({
      x: target.x + target.w / 2,
      y: target.y + target.h / 2,
      w: target.w,
      h: target.h,
      angleA: Math.random() * Math.PI,
      angleB: Math.random() * Math.PI,
      offsetA: (Math.random() - 0.5) * Math.max(target.w, target.h) * 0.45,
      offsetB: (Math.random() - 0.5) * Math.max(target.w, target.h) * 0.45,
      scale: 2.4 + Math.random() * 1.4,
      thick: 10 + Math.random() * 8,
      widthA: 1.1 + Math.random() * 0.45,
      widthB: 0.95 + Math.random() * 0.45,
      color: '#8b0505',
      life: 90,
      maxLife: 90
    });
  }

  _recordChainHop(fromCx, fromCy, toCx, toCy, target, opts) {
    opts = opts || {};
    const life = opts.life || 90;
    if (!this.staggerChainEchoes) this.staggerChainEchoes = [];
    if (!this.staggerChainSegments) this.staggerChainSegments = [];
    this.staggerChainEchoes.push({
      x: fromCx - this.w / 2,
      y: fromCy - this.h / 2,
      facing: this.facing,
      life,
      maxLife: life
    });
    this.staggerChainSegments.push({
      x1: fromCx, y1: fromCy, x2: toCx, y2: toCy,
      life,
      maxLife: life,
      j1: (Math.random() - 0.5) * (opts.jitter || 18),
      j2: (Math.random() - 0.5) * (opts.jitter || 18),
      j3: (Math.random() - 0.5) * (opts.jitter || 18),
      j4: (Math.random() - 0.5) * (opts.jitter || 18)
    });
    if (target) this._addStaggerChainCutMark(target);
  }

  _renderStaggerChainMarks(ctx, cam, chainMarks) {
    for (const mark of chainMarks || []) {
      const fade = (this.staggerChaining || this.chainStriking || this.stormChaining) ? 1 : Math.max(0, mark.life / (mark.maxLife || 90));
      const mx = mark.x - cam.x;
      const my = mark.y - cam.y;
      const len = Math.max(mark.w || 24, mark.h || 24) * (mark.scale || 3);
      const angleA = mark.angleA !== undefined ? mark.angleA : Math.random() * Math.PI;
      const angleB = mark.angleB !== undefined ? mark.angleB : Math.random() * Math.PI;
      const ax = mx - Math.sin(angleA) * (mark.offsetA || 0);
      const ay = my + Math.cos(angleA) * (mark.offsetA || 0);
      const bx = mx - Math.sin(angleB) * (mark.offsetB || 0);
      const by = my + Math.cos(angleB) * (mark.offsetB || 0);
      const drawCut = (cx, cy, angle, widthScale) => {
        const w = (mark.thick || 12) * widthScale;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.92 * fade;
        ctx.shadowBlur = 0;
        const grad = ctx.createLinearGradient(-len * 0.52, 0, len * 0.52, 0);
        grad.addColorStop(0, 'rgba(80,0,0,0)');
        grad.addColorStop(0.10, 'rgba(120,0,0,0.95)');
        grad.addColorStop(0.5, 'rgba(210,8,8,1)');
        grad.addColorStop(0.90, 'rgba(115,0,0,0.95)');
        grad.addColorStop(1, 'rgba(80,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-len * 0.52, 0);
        ctx.lineTo(-len * 0.24, -w * 0.28);
        ctx.lineTo(-len * 0.04, -w * 0.58);
        ctx.lineTo(len * 0.34, -w * 0.22);
        ctx.lineTo(len * 0.52, 0);
        ctx.lineTo(len * 0.28, w * 0.2);
        ctx.lineTo(len * 0.02, w * 0.54);
        ctx.lineTo(-len * 0.32, w * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.62 * fade;
        ctx.fillStyle = '#2a0000';
        ctx.beginPath();
        ctx.moveTo(-len * 0.34, -w * 0.08);
        ctx.lineTo(len * 0.42, -w * 0.03);
        ctx.lineTo(len * 0.22, w * 0.08);
        ctx.lineTo(-len * 0.42, w * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawCut(ax, ay, angleA, mark.widthA || 1.25);
      drawCut(bx, by, angleB, mark.widthB || 1.05);
    }
  }

  update(game) {
    // Apply highest pending damage from last frame
    this._applyPendingDamage(game);
    this._ensureDeathState(game);
    this._updateActionCharges();
    this._maintainChainInvulnerability();
    this._sanitizeInvulnerabilityState();

    // HP no longer fuels actions; attack and magic use separate recharge pips.
    this.focusRegenTimer = 0;

    // Bubble shield countdown
    if (this.bubbleShieldTimer > 0) this.bubbleShieldTimer--;
    if (this.weaponPickupCooldown > 0) this.weaponPickupCooldown--;

    // Smooth display bars
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    this.displayShield = lerp(this.displayShield, this.shield, 0.12);

    // x2 Orb break animation timer
    if (this.x2OrbBreaking > 0) this.x2OrbBreaking--;
    if (this.itemUseFlash > 0) this.itemUseFlash--;

    // ── Ultimate cutscene float phase ──
    if (this.ultCutscene) {
      this.ultCutsceneTimer--;
      // Float upward smoothly
      this.y = lerp(this.y, this.ultFloatY, 0.08);
      this.vx = 0;
      this.vy = 0;
      // Sparkle effects during float
      if (this.ultCutsceneTimer % 6 === 0) {
        const palette = this.currentPaletteDef();
        const col = palette ? (palette.accentColor || palette.color || this.type.color) : this.type.color;
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
        if (game && typeof game._retryCurrentRoom === 'function') {
          game._retryCurrentRoom();
          return;
        }
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
      if (this.invincibleTimer > 0) this.invincibleTimer--;

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
              // Big meteor stun
              for (const e of game.enemies) {
                if (e.dead) continue;
                const sdx = (e.x + e.w / 2) - m.targetX, sdy = (e.y + e.h / 2) - m.targetY;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 150) e.stunTimer = Math.max(e.stunTimer, 120);
              }
              if (game.boss && !game.boss.dead) {
                const sdx = (game.boss.x + game.boss.w / 2) - m.targetX, sdy = (game.boss.y + game.boss.h / 2) - m.targetY;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 150) game.boss.stunTimer = Math.max(game.boss.stunTimer, 90);
              }
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
              game.effects.push(new ScreenFlash('#fff4cf', 0.58, 18));
              game.effects.push(new ScreenFlash('#ff3b1f', 0.22, 26));
              SFX.nuke();
              triggerHitstop(12);
            } else {
              damageInRadius(game, m.targetX, m.targetY, 80, this.type.attackDamage + this.bonusElemental + 6, m.targetX);
              // Regular meteor stun
              for (const e of game.enemies) {
                if (e.dead) continue;
                const sdx = (e.x + e.w / 2) - m.targetX, sdy = (e.y + e.h / 2) - m.targetY;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 80) e.stunTimer = Math.max(e.stunTimer, 50);
              }
              if (game.boss && !game.boss.dead) {
                const sdx = (game.boss.x + game.boss.w / 2) - m.targetX, sdy = (game.boss.y + game.boss.h / 2) - m.targetY;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 80) game.boss.stunTimer = Math.max(game.boss.stunTimer, 30);
              }
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
        g.x += moveX * 2.5 * MOVEMENT_SPEED_SCALE;
        g.y += moveY * 2.5 * MOVEMENT_SPEED_SCALE + Math.sin(game.tick * 0.05) * 0.5;
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
        if (g.punchCooldown <= 0) {
          const golemKeyboardPunch = consumePress('KeyZ') || consumePress('KeyJ');
          const golemMousePunch = !golemKeyboardPunch && justPressed['MouseSpecial'];
          const golemGamepadPunch = !golemKeyboardPunch && !golemMousePunch && gpJust[GP_ATTACK];
          if (golemKeyboardPunch || golemMousePunch || golemGamepadPunch) {
            this._applyAimFacing(game, { mouse: golemMousePunch, gamepad: golemGamepadPunch });
            const hand = g.punchSide > 0 ? rh : lh;
            hand.punchTimer = 20;
            g.punchCooldown = 24;
            g.punchSide *= -1; // alternate
            SFX.attack();
          }
        }

        // Missiles: special button — 2 rockets in facing direction
        if (g.missileCooldown > 0) g.missileCooldown--;
        if (g.missileCooldown <= 0) {
          const golemKeyboardMissile = consumePress('KeyX') || consumePress('KeyK');
          const golemMouseMissile = !golemKeyboardMissile && justPressed['MouseAttack'];
          const golemGamepadMissile = !golemKeyboardMissile && !golemMouseMissile && gpJust[GP_SPECIAL];
          if (golemKeyboardMissile || golemMouseMissile || golemGamepadMissile) {
            const aim = this._applyAimFacing(game, { mouse: golemMouseMissile, gamepad: golemGamepadMissile });
            g.missileCooldown = 28;
            const px = cx + aim.x * (g.w / 2 + 4);
            const dmg = this.type.attackDamage + this.bonusElemental + 5;
            const perpX = -aim.y, perpY = aim.x;
            const p1 = new Projectile(px + perpX * -10, cy + aim.y * (g.w / 2 + 4) + perpY * -10, aim.x * 9 + perpX * -1.5, aim.y * 9 + perpY * -1.5, '#f84', dmg, 'player');
            const p2 = new Projectile(px + perpX * 10, cy + aim.y * (g.w / 2 + 4) + perpY * 10, aim.x * 9 + perpX * 1.5, aim.y * 9 + perpY * 1.5, '#f84', dmg, 'player');
            p1.isMissile = true; p2.isMissile = true;
            p1.noPlat = true; p2.noPlat = true;
            game.projectiles.push(p1, p2);
            SFX.shuriken();
          }
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
            t.enemy.takeDamage(this.type.attackDamage + this.bonusElemental + 1, game, this.x + this.w / 2, 'water', 'bubble');
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
              t.enemy.takeDamage((this.type.attackDamage + this.bonusElemental) * 2, game, this.x + this.w / 2, 'water', 'bubble');
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
          this.fireArmor = false;
          this.fireArmorTimer = 0;
          this.shadowUltBuff = false;
          this.shadowDarkness = 0;
          this.shadowEyesTimer = 0;
          this.stormRaindrops = [];
          this.ninjaType = 'basic';
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

    // Item Crash: sacrifice the held item for its old ultimate-scale effect.
    if (!this.ultimateActive) {
      if (consumePress('KeyC') || consumePress('KeyN') || gpJust[3]) {
        this.activateItemCrash(game);
      }
    }

    // Skip normal movement if in earth golem, wind bow, or crystal castle
    if (this.earthGolem || this.windBow || this.crystalCastle) {
      // Still allow invincibility, effects, etc. but skip movement/gravity/collision
      if (this.invincibleTimer > 0) this.invincibleTimer--;
      return;
    }
    const t = Object.assign({}, this.type, {
      name: 'Black Ninja',
      color: '#111',
      accentColor: '#d8d8d8'
    });

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
        if (this.hp <= 0) { this.hp = 0; if (!this._pendingDamage) this._pendingDamage = { amount: 0, element: 'ghost', killerInfo: { type: 'curse', element: 'ghost', isBoss: false } }; }
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
        if (this.hp <= 0) { this.hp = 0; if (!this._pendingDamage) this._pendingDamage = { amount: 0, element: 'spiky', killerInfo: { type: 'bleed', element: 'spiky', isBoss: false } }; }
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
          const burnDmg = Math.max(1, Math.round(this.maxHp * 0.03));
          this.hp -= burnDmg;
          if (this.hp <= 0) { this.hp = 0; if (!this._pendingDamage) this._pendingDamage = { amount: 0, element: 'fire', killerInfo: { type: 'burn', element: 'fire', isBoss: false } }; }
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
        this.vx = moveX * (t.speed + this.bonusSpeed * 0.3) * speedMult * freezeMult * MOVEMENT_SPEED_SCALE;
      }
      if (moveX !== 0) this.facing = moveX;
    }

    // Jump (double jump + bubble bonus jump)
    const maxJ = this.maxJumps + (this.bubbleBuffTimer > 0 ? 1 : 0);
    const jumpPress = consumePress('ArrowUp') || consumePress('KeyW') || consumePress('Space') || touchJust.up || gpJust[GP_JUMP];
    if (jumpPress && this.jumpsLeft > 0) {
      SFX.jump();
      this.earthAirHover = 0; // cancel earth hover if jumping again
      this.iceHover = 0; // cancel ice hover if jumping again
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
    if (!holdingDown) this.dropThroughSlamLock = false;
    if (holdingDown && !this.grounded && !this.slamming && !this.dropThroughSlamLock) {
      const slamCost = Math.max(1, Math.floor(this.hp * 0.20));
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
    if (!this.slamming && !this.windDashing && !this.stopMidair && !this.fireDashing && this.earthAirHover <= 0 && !(this.iceHover > 0)) {
      this.vy += grav;
    }
    if (this.iceHover > 0) {
      this.vy *= 0.8;
      this.iceHover--;
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
        this.jumpsLeft = maxJ;
        if (p.thin || p.playerDropThrough) {
          const crossedTop = this.vy > 0 && this.y + this.h - this.vy <= p.y + 4;
          if (holdingDown && wasGrounded && crossedTop) {
            this.dropThroughSlamLock = true;
          }
          const airborneSlamHitsDropPlatform = p.playerDropThrough && this.slamming && !wasGrounded && crossedTop;
          if (airborneSlamHitsDropPlatform || (crossedTop && !holdingDown && !this.slamming)) {
            this.y = p.y - this.h;
            this.vy = 0;
            this.grounded = true;
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
        } else if (this.vx > 0 && this.x + this.w - this.vx <= b.x + 4) {
          this.x = b.x - this.w;
          this.vx = 0;
        } else if (this.vx < 0 && this.x - this.vx >= b.x + b.w - 4) {
          this.x = b.x + b.w;
          this.vx = 0;
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

      // Earth: ground pound nearby boulders, extra slam damage, crater
      if (this.ninjaType === 'earth') {
        slamDmg = Math.ceil(slamDmg * 1.5);
        // Spawn damaging crater
        const craterDmg = Math.ceil(slamDmg * 0.4);
        game.effects.push(new EarthCrater(slamCX, slamCY, craterDmg, game));
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

      // Crystal: hit ice blocks
      if (this.ninjaType === 'crystal') {
        for (const b of game.stoneBlocks) {
          if (b instanceof IceBlock && !b.done) {
            b.playerHit(game, 3);
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
          e.vy = -10;
          e.vx = Math.sign(dx) * 4;
          e.stunTimer = Math.max(e.stunTimer, 45);
          if (!e.flying)
            e.juggleState = true;

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
          game.boss.stunTimer = Math.max(game.boss.stunTimer, 30);
          game.boss.juggleState = true;
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

    // Rope collision: touching a rope refills normal jumps.
    for (const r of game.ropes || []) {
      const touchingRope = rectOverlap(this, r);
      if (touchingRope) {
        if (this.jumpsLeft < maxJ) {
          this.jumpsLeft = maxJ;
          this.vy = Math.min(this.vy, 1);
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff0a0', 8, 3, 12));
          game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, 'JUMPS', '#fff0a0'));
        }
      }
      if (r.pulse !== undefined) r.pulse = touchingRope ? Math.min(12, r.pulse + 1) : Math.max(0, r.pulse - 1);
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
        const burnDmg = Math.max(1, Math.round(this.maxHp * 0.03));
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
          game.lives = 0;
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
    // Slow passive mana recharge
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.mana + 0.003, this.maxMana);
    }
    // The Code: slow counter-attack recharge
    if (this.items.theCode && this.codeCounterCharge < this.codeCounterMax) {
      this.codeCounterCharge++;
    }

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
        this.counterAttacking = false;
        this.countsTowardCombo = true;
      } else {
        // Check hits against enemies
        for (const e of game.enemies) {
          if (!e.dead && !this.swingHitSet.has(e) && this.attackBox && rectOverlap(this.attackBox, e)) {
            let dmg = t.attackDamage + this.bonusDamage;
            if (this.ninjaType === 'earth') dmg = Math.ceil(dmg * 2);
            if (this.ninjaType === 'shadow') {
              if (this.backstabReady || e.hp <= this.shadowKillThreshold) {
                dmg = 9999;
                SFX.backstab();
                if (this.backstabReady && !this.chainStriking) {
                  this.chainStriking = true;
                  this.chainTimer = 14;
                  this.chainLastHit = e;
                  this.shadowChainFirstHop = true;
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
            // The Code counter: 4x damage + heavy knockback
            if (this.counterAttacking) {
              dmg *= 4;
              const kbDir = Math.sign((e.x + e.w / 2) - (this.x + this.w / 2)) || this.facing;
              e.vx = kbDir * 14;
              e.vy = -8;
              e.grounded = false;
              game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#aaf', 18, 6, 16));
            }

            if (dmg < 9999) dmg = this._applyAttackFocusDamage(dmg);
            e.takeDamage(dmg, game, this.x + this.w / 2, this.ninjaType === 'shadow' && dmg >= 9999 ? 'shadow' : 'steel', this.ninjaType === 'shadow' && dmg >= 9999 ? 'chain' : 'sword');
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
            this.swingHitSet.add(e);

            if (this.ninjaType === 'crystal') {
              e.launchIceSlide(game, this.x + this.w / 2, dmg);
              for (const other of game.enemies) {
                if (other !== e && !other.dead && other.freezeTimer >= 1) {
                  other.takeDamage(dmg * 0.75, game, this.x + this.w / 2);
                }
              }
            }

            // Storm: hitting a soaked enemy starts lightning chain
            if (e.juggleState &&this.ninjaType === 'storm' && e.soakTimer > 0 && !this.stormChaining) {
              this.stormChaining = true;
              this.stormChainTimer = 12;
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
            if (this.ninjaType === 'storm' && this.stormChaining) {
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
            } else if (b instanceof IceBlock && (b.landed || b.falling)) {
              b.playerHit(game);
            } else if (b instanceof EarthBoulder && (b.hovering || b.rising)) {
              let nearest = null, nd = Infinity;
              const bcx = b.x + b.w / 2;
              const bcy = b.y + b.h / 2;
              // Line-of-sight check: ensure no thick platform blocks the path
              const hasLOS = (tx, ty) => {
                const dx = tx - bcx, dy = ty - bcy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const steps = Math.ceil(dist / TILE);
                for (let i = 1; i < steps; i++) {
                  const t = i / steps;
                  const px = bcx + dx * t, py = bcy + dy * t;
                  for (const pl of game.platforms) {
                    if (pl.thin) continue;
                    if (px >= pl.x && px <= pl.x + pl.w && py >= pl.y && py <= pl.y + pl.h) return false;
                  }
                }
                return true;
              };
              for (const e of game.enemies) {
                if (e.done) continue;
                const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
                if ((ex - bcx) * this.facing < 0) continue;
                if (!hasLOS(ex, ey)) continue;
                const d = Math.hypot(ex - bcx, ey - bcy);
                if (d < nd) { nd = d; nearest = e; }
              }
              if (game.boss && !game.boss.done) {
                const bx = game.boss.x + game.boss.w / 2, by = game.boss.y + game.boss.h / 2;
                if ((bx - bcx) * this.facing >= 0 && hasLOS(bx, by)) {
                  const d = Math.hypot(bx - bcx, by - bcy);
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
          if (!p.done && p.owner !== 'player' && p.owner !== 'ally' && p.owner !== 'boss' && this.attackBox && rectOverlap(this.attackBox, p)) {
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
        if (game.boss && !game.boss.dead && !this.swingHitSet.has(game.boss) && this.attackBox && rectOverlap(this.attackBox, game.boss)) {
          let dmg = t.attackDamage + this.bonusDamage;
          if (this.ninjaType === 'earth') dmg = Math.ceil(dmg * 2);
          if (this.ninjaType === 'shadow' && this.backstabReady) {
            dmg = 9999;
            if (!this.chainStriking) {
              this.chainStriking = true;
              this.chainTimer = 14;
              this.chainLastHit = game.boss;
              this.shadowChainFirstHop = true;
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
          // The Code counter: 4x damage + heavy knockback on boss
          if (this.counterAttacking) {
            dmg *= 4;
            const kbDir = Math.sign((game.boss.x + game.boss.w / 2) - (this.x + this.w / 2)) || this.facing;
            game.boss.vx = kbDir * 10;
            game.boss.vy = -6;
            game.effects.push(new Effect(game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, '#aaf', 18, 6, 16));
          }
          if (dmg < 9999) dmg = this._applyAttackFocusDamage(dmg);
          game.boss.takeDamage(dmg, game, this.x + this.w / 2, this.ninjaType === 'shadow' && dmg >= 9999 ? 'shadow' : 'steel', this.ninjaType === 'shadow' && dmg >= 9999 ? 'chain' : 'sword');
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
            this.stormChainTimer = 12;
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
          this.swingHitSet.add(game.boss);
          triggerHitstop(5);
        }
      }
    }

    const keyboardAttackPress = consumePress('KeyZ') || consumePress('KeyJ');
    const mouseAttackPress = !keyboardAttackPress && consumePress('MouseSpecial');
    const touchAttackPress = !keyboardAttackPress && !mouseAttackPress && touchJust.attack;
    const gamepadAttackPress = !keyboardAttackPress && !mouseAttackPress && !touchAttackPress && gpJust[GP_ATTACK];
    if ((keyboardAttackPress || mouseAttackPress || touchAttackPress || gamepadAttackPress) && !this.attacking && this.attackCooldown <= 0) {
      const attackAim = { mouse: mouseAttackPress, gamepad: gamepadAttackPress };
      this._applyAimFacing(game, attackAim);
      if (this.statusParalyse > 0) {
        this.statusStun = 30;
        this.statusParalyse = Math.max(0, this.statusParalyse - 30);
        const paraDmg = Math.max(1, Math.round(this.maxHp * 0.08));
        this.hp -= paraDmg;
        if (this.hp <= 0) { this.hp = 0; if (!this._pendingDamage) this._pendingDamage = { amount: 0, element: 'lightning', killerInfo: { type: 'paralyse', element: 'lightning', isBoss: false } }; }
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'STUNNED!', '#ff0'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ff0', 5, 2, 8));
        SFX.shock();
      } else {
        this.shadowAttackHit = false;
        this.attack(game, attackAim);
        if (this.items.theCode) this.codeComboCount = 1;
      }
    }

    // The Code: hold attack for a 3-hit combo
    if (this.items.theCode && !this.attacking && this.attackCooldown <= 0 && this.statusParalyse <= 0 && this.statusStun <= 0) {
      const holdingAttack = keys['KeyZ'] || keys['KeyJ'] || keys['MouseSpecial'] || touchState.attack || gpState.buttons[GP_ATTACK];
      if (holdingAttack && this.codeComboCount > 0 && this.codeComboCount < 3) {
        this.shadowAttackHit = false;
        this.attack(game, { mouse: keys['MouseSpecial'] && !keys['KeyZ'] && !keys['KeyJ'], gamepad: gpState.buttons[GP_ATTACK] && !keys['KeyZ'] && !keys['KeyJ'] && !keys['MouseSpecial'] });
        this.codeComboCount++;
      }
    }
    // Reset combo when attack released or combo finished
    if (this.codeComboCount >= 3 || !(keys['KeyZ'] || keys['KeyJ'] || keys['MouseSpecial'] || touchState.attack || gpState.buttons[GP_ATTACK])) {
      this.codeComboCount = 0;
    }

    // Held item
    const keyboardWeaponPress = consumePress('KeyX') || consumePress('KeyK');
    const mouseWeaponPress = !keyboardWeaponPress && consumePress('MouseAttack');
    const touchWeaponPress = !keyboardWeaponPress && !mouseWeaponPress && touchJust.special;
    const gamepadWeaponPress = !keyboardWeaponPress && !mouseWeaponPress && !touchWeaponPress && gpJust[GP_SPECIAL];
    if ((keyboardWeaponPress || mouseWeaponPress || touchWeaponPress || gamepadWeaponPress) && this.statusCurse <= 0 && this.specialCooldown <= 0) {
      const weaponAim = { mouse: mouseWeaponPress, gamepad: gamepadWeaponPress };
      this._applyAimFacing(game, weaponAim);
      this.useHeldItem(game, weaponAim);
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
          if (!e.dead && e._contactDmgCd <= 0) {
            const dx = (e.x + e.w / 2) - (this.x + this.w / 2);
            const dy = (e.y + e.h / 2) - (this.y + this.h / 2);
            if (Math.sqrt(dx * dx + dy * dy) < 50) {
              e.takeDamage(this.type.attackDamage + this.bonusElemental, game);
              e._contactDmgCd = 30;
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
            const res = ELEMENT_MATRIX[atkEl][nearest.element];
            if (res === 'resist') {
              game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'RESIST', nearest.elementColors.accent));
              game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, nearest.elementColors.accent, 8, 3, 12));
              this.chainStriking = false;
              this.shadowChainFirstHop = false;
              if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
              for (const a of this.afterimages) { if (a.chain) a.life = 20; }
              this.backstabReady = false;
              this.shadowStealth = 0;
              this._setChainInvulnerability(60);
              nearest = null;
            }
          }
        }
        // Check spiky deflection — stop chain and take reflect damage
        if (nearest && nearest.element === 'spiky') {
          const dmg = this.type.attackDamage + this.bonusElemental;
          nearest.takeDamage(dmg, game, this.x + this.w / 2);
          game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'DEFLECT', '#f86'));
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#f64', 8, 3, 10));
          SFX.reflect();
          this.chainStriking = false;
          this.shadowChainFirstHop = false;
          if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
          for (const a of this.afterimages) { if (a.chain) a.life = 20; }
          this.backstabReady = false;
          this.shadowStealth = 0;
          this._setChainInvulnerability(60);
          nearest = null;
        }
        if (nearest) {
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          const toCx = this.x + this.w / 2;
          const toCy = this.y + this.h / 2;
          this.afterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 90, chain: true, facing: this.facing });
          this._recordChainHop(cx, cy, toCx, toCy, nearest, { life: 90, jitter: 22 });
          let dmg = this.type.attackDamage + this.bonusElemental;
          if (this.shadowChainFirstHop || this.backstabReady || (nearest.hp !== undefined && nearest.hp <= this.shadowKillThreshold)) {
            dmg = 9999;
            this.shadowChainFirstHop = false;
            this.backstabReady = false;
          }
          nearest.takeDamage(dmg, game, this.x + this.w / 2, 'shadow', 'chain');
          if (nearest === game.boss && nearest.dead) {
            game.effects.push(new ScreenFlash('#f4e8ff', 0.50, 18));
            game.effects.push(new ScreenFlash('#5b147c', 0.24, 28));
            SFX.nuke(0.82);
            game.effects.push(new KanjiEffect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a4e', game.camera));
          }
          this.chainLastHit = nearest;
          this._spawnChainCut(nearest);
          SFX.chain();
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#a4e', 10, 4, 12));
          triggerHitstop(3);
          this._setChainInvulnerability(8);
          this.chainTimer = 14;
        } else if (!this.chainStriking) {
          // Already stopped by resist
        } else {
          this.chainStriking = false;
          this.shadowChainFirstHop = false;
          if (this._spinScythe) { this._spinScythe.recall(); this._spinScythe = null; }
          // Start fading chain afterimages now
          for (const a of this.afterimages) { if (a.chain) a.life = 20; }
          this.backstabReady = false;
          this.shadowStealth = 0;
          this._setChainInvulnerability(60);
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
            const res = ELEMENT_MATRIX[atkEl][nearest.element];
            if (res === 'resist') {
              game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'RESIST', nearest.elementColors.accent));
              game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, nearest.elementColors.accent, 8, 3, 12));
              this.stormChaining = false;
              for (const a of this.stormAfterimages) a.life = 15;
              this._setChainInvulnerability(60);
              nearest = null;
            }
          }
        }
        // Check spiky deflection — stop chain and take reflect damage
        if (nearest && nearest.element === 'spiky') {
          const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
          nearest.takeDamage(dmg, game, this.x + this.w / 2);
          game.effects.push(new TextEffect(nearest.x + nearest.w / 2 - 16, nearest.y - 10, 'DEFLECT', '#f86'));
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#f64', 8, 3, 10));
          SFX.reflect();
          this.stormChaining = false;
          for (const a of this.stormAfterimages) a.life = 15;
          this._setChainInvulnerability(60);
          nearest = null;
        }
        if (nearest) {
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          const toCx = this.x + this.w / 2;
          const toCy = this.y + this.h / 2;
          this.stormAfterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 90, facing: this.facing });
          this._recordChainHop(cx, cy, toCx, toCy, nearest, { life: 90, jitter: 26 });
          const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
          nearest.takeDamage(dmg, game, this.x + this.w / 2, 'lightning', 'chain');
          if (nearest === game.boss && nearest.dead) {
            this.stormLightningFlash = 35;
            game.effects.push(new ScreenFlash('#fffff0', 0.54, 16));
            game.effects.push(new ScreenFlash('#ffe033', 0.22, 24));
            SFX.nuke(0.82);
            game.effects.push(new KanjiEffect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#ff0', game.camera));
          }
          this.stormChainHit.add(nearest);
          this._spawnChainCut(nearest);
          SFX.chain();
          // Lightning bolt effect between positions
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#ff0', 12, 5, 14));
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, '#8af', 8, 3, 10));
          triggerHitstop(3);
          this._setChainInvulnerability(8);
          this.stormChainTimer = 12;
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
              const res = ELEMENT_MATRIX['lightning'][loopTarget.element];
              if (res === 'resist') {
                game.effects.push(new TextEffect(loopTarget.x + loopTarget.w / 2 - 16, loopTarget.y - 10, 'RESIST', loopTarget.elementColors.accent));
                game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, loopTarget.elementColors.accent, 8, 3, 12));
                this.stormChaining = false;
                for (const a of this.stormAfterimages) a.life = 15;
                this._setChainInvulnerability(60);
                loopTarget = null;
              }
            }
          }
          // Check spiky deflection — stop chain and take reflect damage
          if (loopTarget && loopTarget.element === 'spiky') {
            const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
            loopTarget.takeDamage(dmg, game, this.x + this.w / 2);
            game.effects.push(new TextEffect(loopTarget.x + loopTarget.w / 2 - 16, loopTarget.y - 10, 'DEFLECT', '#f86'));
            game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#f64', 8, 3, 10));
            SFX.reflect();
            this.stormChaining = false;
            for (const a of this.stormAfterimages) a.life = 15;
            this._setChainInvulnerability(60);
            loopTarget = null;
          }
          if (loopTarget) {
            const behind = (loopTarget.x + loopTarget.w / 2) > cx ? -1 : 1;
            this.x = loopTarget.x + (behind > 0 ? loopTarget.w + 4 : -this.w - 4);
            this.y = loopTarget.y + loopTarget.h / 2 - this.h / 2;
            this.facing = -behind;
            this.vx = 0; this.vy = 0;
            const toCx = this.x + this.w / 2;
            const toCy = this.y + this.h / 2;
            this.stormAfterimages.push({ x: cx - this.w / 2, y: cy - this.h / 2, life: 90, facing: this.facing });
            this._recordChainHop(cx, cy, toCx, toCy, loopTarget, { life: 90, jitter: 26 });
            const dmg = (this.type.attackDamage + this.bonusElemental) * 2;
            loopTarget.takeDamage(dmg, game, this.x + this.w / 2, 'lightning', 'chain');
            if (loopTarget === game.boss && loopTarget.dead) {
              this.stormLightningFlash = 35;
              game.effects.push(new ScreenFlash('#fffff0', 0.54, 16));
              game.effects.push(new ScreenFlash('#ffe033', 0.22, 24));
              SFX.nuke(0.82);
              game.effects.push(new KanjiEffect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#ff0', game.camera));
            }
            this.stormChainHit.add(loopTarget);
            this._spawnChainCut(loopTarget);
            SFX.chain();
            game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#ff0', 12, 5, 14));
            game.effects.push(new Effect(loopTarget.x + loopTarget.w / 2, loopTarget.y + loopTarget.h / 2, '#8af', 8, 3, 10));
            triggerHitstop(3);
            this._setChainInvulnerability(8);
            this.stormChainTimer = 12;
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
            this._setChainInvulnerability(60);
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

    // Stagger chain: player teleports through enemies one by one (any ninja type)
    if (this.staggerChaining) {
      this.staggerChainTimer--;
      if (this.staggerChainTimer <= 0) {
        let nearest = null;
        let nearDist = Infinity;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        let skullTarget = false;
        const nonSkullRadius = 360;
        for (const e of game.enemies) {
          if (e.dead || this.staggerChainHit.has(e) || e.disableTimer > 0) continue;
          const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nonSkullRadius && d < nearDist) { nearDist = d; nearest = e; skullTarget = false; }
        }
        if (game.boss && !game.boss.dead && !this.staggerChainHit.has(game.boss) && game.boss.disableTimer <= 0) {
          const dx = (game.boss.x + game.boss.w / 2) - cx, dy = (game.boss.y + game.boss.h / 2) - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nonSkullRadius && d < nearDist) { nearDist = d; nearest = game.boss; skullTarget = false; }
        }
        if (!nearest) {
          nearDist = Infinity;
          for (const e of game.enemies) {
            if (e.dead || this.staggerChainHit.has(e) || e.disableTimer <= 0) continue;
            const dx = (e.x + e.w / 2) - cx, dy = (e.y + e.h / 2) - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < nearDist) { nearDist = d; nearest = e; skullTarget = true; }
          }
          if (!nearest && game.boss && !game.boss.dead && !this.staggerChainHit.has(game.boss) && game.boss.disableTimer > 0) {
            nearest = game.boss;
            skullTarget = true;
          }
        }
        if (nearest) {
          const fromCx = cx;
          const fromCy = cy;
          const behind = (nearest.x + nearest.w / 2) > cx ? -1 : 1;
          this.x = nearest.x + (behind > 0 ? nearest.w + 4 : -this.w - 4);
          this.y = nearest.y + nearest.h / 2 - this.h / 2;
          this.facing = -behind;
          this.vx = 0; this.vy = 0;
          const toCx = this.x + this.w / 2;
          const toCy = this.y + this.h / 2;
          if (!this.staggerChainEchoes) this.staggerChainEchoes = [];
          if (!this.staggerChainSegments) this.staggerChainSegments = [];
          this.staggerChainEchoes.push({
            x: fromCx - this.w / 2, y: fromCy - this.h / 2,
            facing: this.facing, life: 90, maxLife: 90
          });
          this.staggerChainSegments.push({
            x1: fromCx, y1: fromCy, x2: toCx, y2: toCy,
            life: 90, maxLife: 90,
            j1: (Math.random() - 0.5) * 18,
            j2: (Math.random() - 0.5) * 18,
            j3: (Math.random() - 0.5) * 18,
            j4: (Math.random() - 0.5) * 18
          });
          this._applyStaggerChainStatus(nearest, game);
          if (skullTarget) {
            this._addStaggerChainCutMark(nearest);
            nearest._finishByStanceChain(game);
          } else {
            this._addStaggerChainCutMark(nearest);
            nearest.takeDamage(Math.max(1, Math.ceil((nearest.maxHp || nearest.hp || 1) * 0.4)), game, this.x + this.w / 2, null, 'chain');
          }
          this.staggerChainHit.add(nearest);
          this.staggerChainCombo = Math.max(2, (this.staggerChainCombo || 1) + 1);
          this.staggerChainComboTimer = 90;
          this.staggerChainComboPop = 1;
          this._spawnChainCut(nearest);
          SFX.chain();
          game.effects.push(new Effect(nearest.x + nearest.w / 2, nearest.y + nearest.h / 2, skullTarget ? '#c04fff' : '#f4f0ff', skullTarget ? 14 : 9, skullTarget ? 5 : 3, 18));
          triggerHitstop(3);
          this._setChainInvulnerability(8);
          this.staggerChainTimer = skullTarget ? 14 : 9;
        } else {
          this.staggerChaining = false;
          this.staggerChainHit.clear();
          this._setChainInvulnerability(60);
          if (!this.staggerChainEchoes) this.staggerChainEchoes = [];
          this.staggerChainEchoes.push({
            x: this.x, y: this.y,
            facing: this.facing, life: 90, maxLife: 90, final: true
          });
          for (const a of this.afterimages) { if (a.staggerChain) a.life = 90; }
          for (const e of this.staggerChainEchoes) e.life = Math.min(e.life, 90);
          for (const s of this.staggerChainSegments) s.life = Math.min(s.life, 90);
          for (const m of this.staggerChainMarks || []) m.life = Math.min(m.life, 90);
        }
      }
    }
    if (this.staggerChainComboTimer > 0) {
      this.staggerChainComboTimer--;
      this.staggerChainComboPop = Math.max(0, (this.staggerChainComboPop || 0) - 0.08);
    } else if (!this.staggerChaining) {
      this.staggerChainCombo = 0;
      this.staggerChainComboPop = 0;
    }

    // Stagger chain afterimage decay (all ninja types)
    this.afterimages = this.afterimages.filter(a => {
      if (!a.staggerChain) return true; // handled by per-ninja logic below
      if (this.staggerChaining) return true; // persist while chaining
      a.life--;
      return a.life > 0;
    });
    this.staggerChainSegments = (this.staggerChainSegments || []).filter(s => {
      if (this.staggerChaining || this.chainStriking || this.stormChaining) return true;
      s.life--;
      return s.life > 0;
    });
    this.staggerChainEchoes = (this.staggerChainEchoes || []).filter(e => {
      if (this.staggerChaining || this.chainStriking || this.stormChaining) return true;
      e.life--;
      return e.life > 0;
    });
    this.staggerChainMarks = (this.staggerChainMarks || []).filter(m => {
      if (this.staggerChaining || this.chainStriking || this.stormChaining) return true;
      m.life--;
      return m.life > 0;
    });

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
        if (a.chain && this.chainStriking) return true; // persist during shadow chain
        if (a.staggerChain && this.staggerChaining) return true; // persist during stagger chain
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
            triggerHitstop(4);
            game.effects.push(new Effect(e.x + e.w / 2, e.y + e.h / 2, '#bfb', 10, 4, 12));
            if (e.element) this.applyElementalStatus(e.element, game);
          }
        }
        if (game.boss && !game.boss.dead && (game.boss._contactDmgCd || 0) <= 0 && rectOverlap(this, game.boss)) {
          const dmg = t.attackDamage + this.bonusElemental + this.windPower;
          game.boss.takeDamage(dmg, game, this.x + this.w / 2);
          game.boss._contactDmgCd = 8;
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

  attack(game, aimOpts = {}) {
    this._applyAimFacing(game, aimOpts);
    this.attacking = true;
    this.attackTimer = 10;
    this.swingHitSet = new Set();
    this._swingHealDone = false;
    this._consumeAttackFocus();
    this.attackCooldown = 60;
    if (this.ninjaType === 'earth') triggerScreenShake(2, 4);
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
      const aim = this._getAimVector(game, aimOpts);
      const bubDist = 80 + this.bonusReach * 4;
      for (let i = 0; i < 5; i++) {
        const offY = (i === 0 ? -6 : 8) + (Math.random() - 0.5) * 4;
        game.bubbles.push(new SmallBubble(
          this.x + this.w / 2 + aim.x * bubDist + -aim.y * offY + Math.random() * 6,
          this.y + this.h / 2 + aim.y * bubDist + aim.x * offY,
          this.facing,
          this._applyAttackFocusDamage(this.type.attackDamage)
        ));
      }
    }

    // Crystal attack: shoot freeze dust
    if (this.ninjaType === 'crystal') {
      const aim = this._getAimVector(game, aimOpts);
      const side = (Math.random() - 0.5) * 1.5;
      const fx = this.x + this.w / 2 + aim.x * 20;
      const fy = this.y + this.h / 2 + aim.y * 20;
      const proj = new Projectile(fx, fy, aim.x * 6 + -aim.y * side, aim.y * 6 + aim.x * side, '#aff', this._applyAttackFocusDamage(this.type.attackDamage + this.bonusElemental), 'player');
      proj.w = 10; proj.h = 8;
      proj.freezeDust = true;
      proj.life = 60;
      game.projectiles.push(proj);
      game.effects.push(new Effect(fx, fy, '#aff', 4, 2, 6));
    }

    const shadowFullStealth = this.ninjaType === 'shadow' && this.shadowStealth >= 240;
    const shadowUltBonus = this.ninjaType === 'shadow' && this.shadowUltBuff;
    this._scytheAttack = shadowFullStealth || shadowUltBonus; // remember for render
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Earth: straight rectangular punch hitbox (starts inside player, extends outward)
    if (this.ninjaType === 'earth') {
      const punchReach = 50 + this.bonusReach * 4;
      const fistW = 36; const fistH = 52 + this.bonusReach * 3;
      const totalW = fistW + punchReach;
      this.attackBox = {
        x: this.facing > 0 ? cx - 8 : cx + 8 - totalW,
        y: cy - fistH / 2 - 4,
        w: totalW,
        h: fistH
      };
      game.effects.push(new Effect(
        cx + this.facing * (punchReach / 2 + 8), cy - 4,
        this.type.accentColor, 5, 3, 8
      ));
      return;
    }

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
    game.effects.push(new ScreenFlash('#fffff0', 0.70, 18));
    game.effects.push(new ScreenFlash('#ffe033', 0.32, 34));
    SFX.nuke();
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
    if (!this.ultimateActive) this.ninjaType = 'basic';
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
          this.earthAirHover = 35;
          this.jumpsLeft = this.maxJumps + 1 + (this.bubbleBuffTimer > 0 ? 1 : 0);
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
        // Spawn ice block in front of the player
        const ibx = this.x + this.w / 2 + this.facing * (TILE * 1.2);
        const iby = this.grounded ? this.y + this.h : this.y + this.h / 2;
        const ibMidair = !this.grounded;
        const iceBlock = new IceBlock(ibx, iby, this.facing, this.wave || 1, this.type.attackDamage + this.bonusElemental, ibMidair);
        game.stoneBlocks.push(iceBlock);
        if (ibMidair) {
          this.vy = 0;
          this.vx *= 0.3;
          this.iceHover = 25;
          this.jumpsLeft = Math.min(this.jumpsLeft + 1, 3);
        }
        SFX.special();
        game.effects.push(new Effect(ibx, iby - TILE * 0.7, '#aff', 14, 5, 16));
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

  _isElementalDamage(element) {
    return !!({ fire: true, water: true, crystal: true, wind: true, lightning: true, ghost: true, spiky: true }[element]);
  }

  _spendElementalArmorForDamage(amount, element, game) {
    if (!this._isElementalDamage(element) || (this.elementalArmor || 0) <= 0 || amount <= 0) return amount;
    const costPerDamage = Math.max(1, this.elementalArmorPerDamage || 5);
    const armor = this.elementalArmor || 0;
    const blocked = Math.min(amount, Math.floor(armor / costPerDamage));
    if (blocked <= 0) return amount;
    const spent = Math.min(armor, blocked * costPerDamage);
    this.elementalArmor = Math.max(0, armor - spent);
    const color = ELEMENT_COLORS[element] ? ELEMENT_COLORS[element].accent : '#dff';
    if (game && game.effects) {
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, color, 12, 4, 14));
      game.effects.push(new DamageNumber(this.x + this.w / 2, this.y - 10, blocked, element || null));
      if (this.elementalArmor <= 0) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 18, 'ARMOR BROKEN', color));
    }
    return Math.max(0, amount - blocked);
  }

  _spendElementalArmorForStatus(element, game) {
    if (!this._isElementalDamage(element) || (this.elementalArmor || 0) <= 0) return false;
    const armorCost = Math.min(this.elementalArmor || 0, this.elementalArmorBlockCost || 28);
    this.elementalArmor = Math.max(0, (this.elementalArmor || 0) - armorCost);
    const color = ELEMENT_COLORS[element] ? ELEMENT_COLORS[element].accent : '#dff';
    if (game && game.effects) {
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 14, 'ELEMENT BLOCK', color));
      game.effects.push(new SlamRing(this.x + this.w / 2, this.y + this.h / 2, color, 58, 7));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, color, 10, 3, 12));
    }
    return true;
  }

  applyElementalStatus(element, game, opts = {}) {
    if (!element) return;
    if (!this._isElementalDamage(element)) return;
    if (!opts.skipArmor && this._spendElementalArmorForStatus(element, game)) return;
    // Elemental Charms: immune to matching affliction
    const charmImmunity = {
      fire: 'charmFire', water: 'charmWater', crystal: 'charmCrystal',
      wind: 'charmWind', lightning: 'charmLightning', ghost: 'charmGhost', spiky: 'charmSpiky'
    };
    const legacyItemsOn = this._legacyBossItemsEnabled();
    if (legacyItemsOn && charmImmunity[element] && this.items[charmImmunity[element]]) return;
    // Protective Charm: halve duration
    const dMul = legacyItemsOn && this.items.protectiveCharm ? 0.5 : 1;
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
    if (game && game.boss && game.boss.dead && (game.bossDeathRewardDelay || 0) > 0) return;
    const ultimateFormActive = this.ultimateActive || this.ultCutscene;
    if (ultimateFormActive && this.earthGolem) {
      this.earthGolem.hp = Math.max(0, (this.earthGolem.hp || 0) - Math.max(1, Math.round(amount || 1)));
      if (this.earthGolem.hp <= 0) this.earthGolem = null;
      amount = Math.max(1, Math.ceil((amount || 1) * 0.35));
    }
    if (ultimateFormActive && this.crystalCastle) {
      amount = Math.max(1, Math.ceil((amount || 1) * 0.45));
    }
    if (ultimateFormActive && this.bubbleRide) {
      this.bubbleRide.hp -= amount;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 6, 2, 8));
      game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, element || null));
      SFX.playerHurt(this.ninjaType);
      triggerHitstop(3);
      return;
    }
    if (this.invincibleTimer > 0) {
      if (!(this.windDashing && element)) return;
    }
    if (this._isChainInvulnerable()) return;
    // Queue damage — highest prevails per frame
    if (!this._pendingDamage || amount > this._pendingDamage.amount) {
      this._pendingDamage = { amount, element, killerInfo };
    }
  }

  _applyPendingDamage(game) {
    if (!this._pendingDamage) return;
    if (game && game.boss && game.boss.dead && (game.bossDeathRewardDelay || 0) > 0) {
      this._pendingDamage = null;
      return;
    }
    if (this._isChainInvulnerable()) {
      this._pendingDamage = null;
      return;
    }
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
    const legacyItemsOn = this._legacyBossItemsEnabled();
    if (legacyItemsOn && this.items.leatherBoots && Math.random() < 0.05) {
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'DODGE', '#a86'));
      triggerHitstop(2);
      return;
    }
    // The Code: rechargeable counter-attack — negate damage, huge counter swing
    if (legacyItemsOn && this.items.theCode && this.codeCounterCharge >= this.codeCounterMax) {
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      // Cancel any current swing and force a powerful counter
      this.attacking = false;
      this.attackTimer = 0;
      this.attackCooldown = 0;
      this.shadowAttackHit = false;
      this.attack(game);
      // Override: longer arc + bigger hitbox for counter
      this.counterAttacking = true;
      this.attackTimer = 20;
      this.invincibleTimer = 45;
      // Expand the attack hitbox for the counter swing
      if (this.attackBox) {
        const grow = 20;
        this.attackBox.x -= grow;
        this.attackBox.y -= grow;
        this.attackBox.w += grow * 2;
        this.attackBox.h += grow * 2;
      }
      // Counter-attack visuals
      game.effects.push(new TextEffect(cx, this.y - 20, 'COUNTER!', '#aaf'));
      game.effects.push(new Effect(cx, cy, '#aaf', 20, 6, 18));
      game.effects.push(new Effect(cx, cy, '#fff', 12, 4, 14));
      game.effects.push(new SlamRing(cx, cy, '#aaf', 80, 16));
      game.effects.push(new SlamRing(cx, cy, '#fff', 50, 10));
      this.codeCounterCharge = 0;
      triggerHitstop(8);
      triggerScreenShake(5, 8);
      SFX.counterSwish();
      return;
    }
    if (this.ninjaType === 'wind' && this.windPower >= 10 && typeof SFX !== 'undefined' && SFX.windCrash) {
      SFX.windCrash();
    }
    if (this.ninjaType === 'wind' && game.trimerangs) {
      for (const t of game.trimerangs) t.done = true;
    }
    if (this._isChainInvulnerable()) return;
    if (this.fireArmor && this.fireArmorTimer > 0) {
      amount = Math.max(1, Math.ceil(amount * 0.45));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f80', 8, 3, 10));
    }
    // Bubble shield orb — blocks all external damage while active
    if (this.bubbleShieldTimer > 0) {
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#4af', 10, 4, 14));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 4, 2, 8));
      triggerHitstop(4);
      triggerScreenShake(2, 6);
      SFX.playerHurt(this.ninjaType);
      return;
    }
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
        SFX.playerHurt(this.ninjaType);
        triggerHitstop(6);
        game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, absorbed, element || null));
        this.applyElementalStatus(element, game);
        return;
      }
    }
    const beforeElementalArmor = amount;
    amount = this._spendElementalArmorForDamage(amount, element, game);
    if (amount <= 0) {
      this.lastDamageAmount = beforeElementalArmor;
      this.invincibleTimer = 30;
      this.lastDamageTick = game.tick;
      this.windPower = 0;
      SFX.playerHurt(this.ninjaType);
      triggerHitstop(4);
      triggerScreenShake(2, 6);
      return;
    }
    const bypassArmor = (element === 'spike' || element === 'fire' || element === 'lightning');
    // Elemental Charms: halve damage from matching element
    const charmMap = { fire:'charmFire', ghost:'charmGhost', water:'charmWater', crystal:'charmCrystal', wind:'charmWind', lightning:'charmLightning', spiky:'charmSpiky' };
    if (legacyItemsOn && element && charmMap[element] && this.items[charmMap[element]]) {
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    if (!bypassArmor) amount = Math.max(1, amount - this.bonusArmor);
    if (!this.oneShotProtectionUsed && this.hp >= this.maxHp && amount >= this.hp && this.hp > 1) {
      amount = this.hp - 1;
      this.oneShotProtectionUsed = true;
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 18, 'ONE HP!', '#ffe033'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ffe033', 14, 4, 16));
    }
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
    SFX.playerHurt(this.ninjaType);
    triggerHitstop(6);
    triggerScreenShake(4, 8);
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 8, 3, 12));
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, element || null));
    this.applyElementalStatus(element, game, { skipArmor: true });
    // Spiked Armor: damage all nearby enemies when taking damage
    if (legacyItemsOn && this.items.spikedArmor) {
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
      if (legacyItemsOn && this.items.deathsKey && !this.deathsKeyUsed) {
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
      SFX.playerDie();
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
      game.lives = 0;
    }
  }

  _drawHeldWeaponSprite(ctx, def, mode = 'hand') {
    if (!def) return;
    const id = this.heldItem || this.lastHeldItem || 'pistol';
    const hand = mode === 'hand';
    ctx.save();
    if (mode === 'back') {
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-10, 0);
      ctx.scale(0.92, 0.92);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = def.accentColor || def.color;
    ctx.shadowBlur = hand ? 6 : 2;
    const stroke = 'rgba(8,8,10,0.92)';
    const metal = def.color || '#ccc';
    const accent = def.accentColor || '#fff';
    const dark = def.hatColor || '#171717';
    const kind = def.kind || 'pistol';
    const wood = '#6b3f22';
    const drawBarrel = (x, y, w, h, color = metal) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 2, y + 1, Math.max(2, w - 4), 2);
    };
    if (kind === 'flamethrower') {
      ctx.fillStyle = dark;
      ctx.fillRect(-17, -7, 14, 14);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-17, -7, 14, 14);
      drawBarrel(-4, -4, 32, 8, metal);
      ctx.fillStyle = accent;
      ctx.fillRect(23, -6, 8, 12);
      ctx.fillStyle = wood;
      ctx.fillRect(-8, 5, 9, 10);
      if (hand && this.itemUseFlash > 0) {
        ctx.fillStyle = '#ffe66b';
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(48, -10);
        ctx.lineTo(42, 0);
        ctx.lineTo(49, 10);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === 'bubbleGun') {
      drawBarrel(-14, -6, 27, 12, '#205b86');
      ctx.fillStyle = dark;
      ctx.fillRect(-11, 5, 9, 9);
      ctx.fillStyle = 'rgba(160,235,255,0.35)';
      ctx.beginPath();
      ctx.arc(2, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(24, 0, 8, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'orb') {
      ctx.fillStyle = dark;
      ctx.fillRect(-14, -3, 15, 6);
      ctx.fillStyle = metal;
      ctx.beginPath(); ctx.arc(10, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(6, -16, 8, 8);
      ctx.strokeStyle = accent;
      ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'staff') {
      drawBarrel(-18, -2, 35, 4, '#2b5961');
      ctx.shadowBlur = hand ? 10 : 5;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(25, -14); ctx.lineTo(36, -2); ctx.lineTo(30, 10); ctx.lineTo(18, 4); ctx.lineTo(16, -7); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = metal;
      ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(25, -9); ctx.lineTo(31, -2); ctx.lineTo(26, 5); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (kind === 'crossbow') {
      drawBarrel(-14, -2, 30, 4, wood);
      ctx.fillStyle = metal;
      ctx.fillRect(2, -8, 6, 16);
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(7, -15); ctx.quadraticCurveTo(25, -12, 31, 0); ctx.quadraticCurveTo(25, 12, 7, 15); ctx.stroke();
      ctx.strokeStyle = '#eee';
      ctx.beginPath(); ctx.moveTo(7, -15); ctx.lineTo(7, 15); ctx.stroke();
      ctx.fillStyle = '#ddd';
      ctx.fillRect(15, -1, 18, 2);
    } else if (kind === 'shotgun') {
      ctx.fillStyle = wood;
      ctx.fillRect(-18, -5, 14, 10);
      drawBarrel(-5, -5, 38, 5, metal);
      drawBarrel(-5, 1, 38, 5, metal);
      ctx.fillStyle = dark;
      ctx.fillRect(-10, 5, 9, 9);
    } else if (kind === 'rpg') {
      drawBarrel(-18, -7, 36, 14, metal);
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(19, -11); ctx.lineTo(34, 0); ctx.lineTo(19, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark;
      ctx.fillRect(-5, 6, 10, 11);
      ctx.fillStyle = '#333';
      ctx.fillRect(-23, -5, 6, 10);
    } else if (kind === 'hammer') {
      ctx.fillStyle = dark;
      ctx.fillRect(-18, -3, 26, 6);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -3, 26, 6);
      ctx.fillStyle = metal;
      ctx.fillRect(8, -12, 15, 24);
      ctx.strokeRect(8, -12, 15, 24);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -9, 11, 4);
    } else if (kind === 'grenade') {
      ctx.fillStyle = metal;
      ctx.beginPath(); ctx.arc(2, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = dark;
      ctx.fillRect(-2, -17, 9, 7);
      ctx.strokeRect(-2, -17, 9, 7);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(8, -16, 6, -Math.PI * 0.1, Math.PI * 1.15); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(-8, -3, 20, 3);
    } else {
      drawBarrel(-11, -4, 25, 8, metal);
      ctx.fillStyle = accent;
      ctx.fillRect(10, -2, 9, 4);
      ctx.fillStyle = dark;
      ctx.fillRect(-5, 4, 8, 10);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  render(ctx, cam) {
    // Hide player during death delay
    if (this.deathTimer > 0) return;
    // Hide player inside golem mecha
    if (this.earthGolem) return;

    const weaponTint = this.currentPaletteDef ? this.currentPaletteDef() : null;
    const t = Object.assign({}, this.type, {
      color: (weaponTint && (weaponTint.bodyColor || weaponTint.color)) || this.type.color,
      accentColor: (weaponTint && (weaponTint.accentColor || weaponTint.color)) || this.type.accentColor,
      hatColor: (weaponTint && (weaponTint.hatColor || weaponTint.bodyColor || '#111')) || '#111'
    });
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
    // Earth punch recoil shake
    if (this.ninjaType === 'earth' && this.attackCooldown > 0) {
      sx += (this.attackCooldown % 2 === 0 ? 2 : -2);
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

    // Stagger chain afterimages + lines (all ninja types, color-coded by ninja)
    if (this.staggerChaining || (this.staggerChainEchoes && this.staggerChainEchoes.length > 0) || (this.staggerChainSegments && this.staggerChainSegments.length > 0) || (this.staggerChainMarks && this.staggerChainMarks.length > 0)) {
      const chainColor = this.type.accentColor;
      const staggerImages = this.staggerChainEchoes || [];
      const chainSegments = this.staggerChainSegments || [];
      const chainMarks = this.staggerChainMarks || [];
      if (chainSegments.length > 0) {
        ctx.save();
        ctx.strokeStyle = chainColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = chainColor;
        ctx.shadowBlur = 18;
        for (const seg of chainSegments) {
          const fade = this.staggerChaining ? 1 : Math.max(0, seg.life / seg.maxLife);
          const px1 = seg.x1 - cam.x, py1 = seg.y1 - cam.y;
          const px2 = seg.x2 - cam.x, py2 = seg.y2 - cam.y;
          const mx1 = px1 + (px2 - px1) * 0.33 + seg.j1;
          const my1 = py1 + (py2 - py1) * 0.33 + seg.j2;
          const mx2 = px1 + (px2 - px1) * 0.66 + seg.j3;
          const my2 = py1 + (py2 - py1) * 0.66 + seg.j4;
          ctx.globalAlpha = 0.75 * fade;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.lineTo(px2, py2);
          ctx.stroke();
          ctx.globalAlpha = 0.95 * fade;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();
          ctx.lineWidth = 4;
          ctx.strokeStyle = chainColor;
        }
        if (this.staggerChaining && chainSegments.length > 0) {
          const last = chainSegments[chainSegments.length - 1];
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(last.x2 - cam.x, last.y2 - cam.y);
          ctx.lineTo(this.x + this.w / 2 - cam.x, this.y + this.h / 2 - cam.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      for (const mark of []) {
        const fade = this.staggerChaining ? 1 : Math.max(0, mark.life / (mark.maxLife || 90));
        const mx = mark.x - cam.x;
        const my = mark.y - cam.y;
        const len = Math.max(mark.w || 24, mark.h || 24) * (mark.scale || 1.5);
        const angleA = mark.angleA !== undefined ? mark.angleA : Math.random() * Math.PI;
        const angleB = mark.angleB !== undefined ? mark.angleB : Math.random() * Math.PI;
        const ax = mx - Math.sin(angleA) * (mark.offsetA || 0);
        const ay = my + Math.cos(angleA) * (mark.offsetA || 0);
        const bx = mx - Math.sin(angleB) * (mark.offsetB || 0);
        const by = my + Math.cos(angleB) * (mark.offsetB || 0);
        const drawCut = (cx, cy, angle, widthScale) => {
          const w = (mark.thick || 7) * widthScale;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.globalAlpha = 0.86 * fade;
          ctx.shadowBlur = 0;
          const grad = ctx.createLinearGradient(-len * 0.52, 0, len * 0.52, 0);
          grad.addColorStop(0, 'rgba(80,0,0,0)');
          grad.addColorStop(0.12, 'rgba(120,0,0,0.9)');
          grad.addColorStop(0.5, 'rgba(190,8,8,1)');
          grad.addColorStop(0.88, 'rgba(115,0,0,0.92)');
          grad.addColorStop(1, 'rgba(80,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-len * 0.52, 0);
          ctx.lineTo(-len * 0.24, -w * 0.28);
          ctx.lineTo(-len * 0.04, -w * 0.58);
          ctx.lineTo(len * 0.34, -w * 0.22);
          ctx.lineTo(len * 0.52, 0);
          ctx.lineTo(len * 0.28, w * 0.2);
          ctx.lineTo(len * 0.02, w * 0.54);
          ctx.lineTo(-len * 0.32, w * 0.25);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.55 * fade;
          ctx.fillStyle = '#2a0000';
          ctx.beginPath();
          ctx.moveTo(-len * 0.34, -w * 0.08);
          ctx.lineTo(len * 0.42, -w * 0.03);
          ctx.lineTo(len * 0.22, w * 0.08);
          ctx.lineTo(-len * 0.42, w * 0.03);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };
        drawCut(ax, ay, angleA, mark.widthA || 1);
        drawCut(bx, by, angleB, mark.widthB || 0.8);
      }
      for (const a of staggerImages) {
        const fade = this.staggerChaining ? 1 : Math.max(0, a.life / (a.maxLife || 90));
        const alpha = 0.68 * fade;
        const pulse = this.staggerChaining ? 0.9 + 0.1 * Math.sin((a.life || 0) * 0.4) : 1;
        const aw = this.w * (a.final ? 1.15 : 1);
        const ah = this.h * (a.final ? 1.15 : 1);
        const ax = a.x + this.w / 2 - aw / 2;
        const ay = a.y + this.h / 2 - ah / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = chainColor;
        ctx.shadowColor = chainColor;
        ctx.shadowBlur = 18;
        ctx.fillRect(ax - cam.x, ay - cam.y, aw, ah);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeRect(ax - cam.x - 1, ay - cam.y - 1, aw + 2, ah + 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = alpha * pulse;
        const aFacing = a.facing || this.facing;
        const eyeX = aFacing > 0 ? ax + aw * 0.58 : ax + aw * 0.22;
        ctx.fillRect(eyeX - cam.x, ay + ah * 0.25 - cam.y, 7, 4);
        ctx.restore();
      }
      this._renderStaggerChainMarks(ctx, cam, chainMarks);
      ctx.globalAlpha = 1;
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
        const alpha = this.stormChaining ? 0.5 : Math.min(0.4, (a.life / 90) * 0.4);
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
        ctx.save();
        const pcx = this.x + this.w / 2 - cam.x;
        const pcy = this.y + this.h / 2 - cam.y;
        for (const t of this.windFullTrails) {
          t.age = (t.age || 0) + 1;
          const progress = t.age / 22;
          const alpha = 0.5 * (1 - progress);
          const radius = 12 + progress * 40;
          const spin = t.angle + progress * 4;
          // Swirling wind arc
          ctx.strokeStyle = '#bfb';
          ctx.lineWidth = 2.5 * (1 - progress);
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(pcx, pcy, radius, spin, spin + 1.2);
          ctx.stroke();
          // Inner lighter streak
          ctx.strokeStyle = '#dff';
          ctx.lineWidth = 1.2 * (1 - progress);
          ctx.globalAlpha = alpha * 0.7;
          ctx.beginPath();
          ctx.arc(pcx, pcy, radius - 3, spin + 0.3, spin + 1.0);
          ctx.stroke();
        }
        ctx.restore();
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
          const alpha = (a.chain && this.chainStriking) ? 0.5 : Math.min(0.5, (a.life / 90) * 0.5);
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

    if (this.staggerChainMarks && this.staggerChainMarks.length > 0 && (this.chainStriking || this.stormChaining)) {
      this._renderStaggerChainMarks(ctx, cam, this.staggerChainMarks);
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

    // Bubble shield visual — large translucent bubble shell around the player
    if (this.bubbleShieldTimer > 0) {
      const tick = game ? game.tick : 0;
      const t = this.bubbleShieldTimer / this.bubbleShieldMax;
      const flicker = t < 0.25 && Math.floor(tick / 3) % 2 === 0;
      const bcx = sx + this.w / 2;
      const bcy = sy + this.h / 2;
      const pulse = 1 + 0.045 * Math.sin(tick * 0.15);
      const rx = (this.w / 2 + 16) * pulse;
      const ry = (this.h / 2 + 14) * pulse;
      const baseAlpha = flicker ? 0.15 : t;
      ctx.save();
      // Soft fill
      ctx.globalAlpha = baseAlpha * 0.18;
      ctx.fillStyle = '#4af';
      ctx.shadowColor = '#4af';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(bcx, bcy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Main shell
      ctx.globalAlpha = baseAlpha * 0.55;
      ctx.strokeStyle = '#aef';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(bcx, bcy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner lighter ring
      ctx.globalAlpha = baseAlpha * 0.2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(bcx, bcy, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Glint top-left
      ctx.globalAlpha = baseAlpha * 0.65;
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.ellipse(bcx - rx * 0.3, bcy - ry * 0.32, rx * 0.18, ry * 0.09, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if ((this.elementalArmor || 0) > 0) {
      const tick = game ? game.tick : 0;
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      const armorRatio = Math.max(0, Math.min(1, (this.elementalArmor || 0) / Math.max(1, this.elementalArmorMax || 100)));
      ctx.save();
      ctx.globalAlpha = (0.25 + armorRatio * 0.3) + 0.08 * Math.sin(tick * 0.16);
      ctx.shadowColor = '#dff';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#dff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = tick * 0.025 + i * Math.PI / 3;
        const r = 23 + (i % 2) * 3;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * (r * 0.82);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
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

    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx - 0.5, sy - 0.5, this.w + 1, this.h + 1);

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeX = this.facing > 0 ? sx + 14 : sx + 4;
    ctx.fillRect(eyeX, sy + 8, 6, 6);
    ctx.fillStyle = '#222';
    ctx.fillRect(this.facing > 0 ? eyeX + 3 : eyeX, sy + 10, 3, 3);

    // Headband
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + 5, this.w, 3);

    // Hood and mask: weapon-tinted ninja silhouette.
    ctx.fillStyle = t.color;
    ctx.fillRect(sx + 2, sy - 2, this.w - 4, 12);
    ctx.strokeStyle = t.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1.5, sy - 2.5, this.w - 3, 13);
    ctx.fillStyle = t.color;
    ctx.fillRect(sx + 1, sy + 10, this.w - 2, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(sx + (this.facing > 0 ? 15 : 5), sy + 1, 5, 1);
    ctx.fillStyle = '#f2f2f2';
    const maskEyeX = this.facing > 0 ? sx + 14 : sx + 5;
    ctx.fillRect(maskEyeX, sy + 7, 6, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(this.facing > 0 ? maskEyeX + 3 : maskEyeX, sy + 8, 2, 1);

    // Kasa hat and brim render after the hood so they sit on top.
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.moveTo(sx - 9, sy + 3);
    ctx.lineTo(sx + this.w / 2, sy - 15);
    ctx.lineTo(sx + this.w + 9, sy + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = t.accentColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx - 9, sy + 1, this.w + 18, 4);
    ctx.strokeStyle = 'rgba(220,220,220,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 9.5, sy + 0.5, this.w + 19, 4);

    // Belt / sash
    ctx.fillStyle = t.accentColor;
    ctx.fillRect(sx, sy + this.h - 10, this.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx, sy + this.h - 9, this.w, 1);

    // Sheathed weapon on back (when not attacking)
    if (!this.attacking && this.itemUseFlash <= 0) {
      ctx.save();
      const backX = this.facing > 0 ? sx + 3 : sx + this.w - 3;
      const beltY = sy + this.h - 10;
      ctx.translate(backX, beltY);
      ctx.rotate(this.facing > 0 ? -0.45 : 0.45);

      const backHeldDef = this.currentWeaponDef ? this.currentWeaponDef() : null;
      if (backHeldDef) {
        this._drawHeldWeaponSprite(ctx, backHeldDef, 'back');
      } else if (this.ninjaType === 'shadow') {
        // Mini scythe on back
        // Handle
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-1.5, -24, 3, 28);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-1.5, -24, 1.5, 28);
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-1.5, -24, 3, 28);
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
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-1.5, -26, 3, 30);
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-1.5, -24, 3, 28);
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
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
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
        ctx.restore();
        // Pommel gem
        ctx.fillStyle = '#2dd';
        ctx.shadowColor = '#0aa';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(0, 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;


      } else {
        // Default katana scabbard (fire, storm, wind)
        if (this.ninjaType === 'storm') { ctx.shadowColor = '#ff0'; ctx.shadowBlur = 6; }
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
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 3; i++) ctx.fillRect(-1, -35 + i * 3, 2, 1);
        ctx.fillStyle = '#aa8';
        ctx.fillRect(-3, -28, 6, 2);
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -38, 2, 3);
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

    const heldWeaponDef = this.currentWeaponDef ? this.currentWeaponDef() : null;
    if (heldWeaponDef && this.itemUseFlash > 0 && !this.attacking) {
      ctx.save();
      const hx = sx + this.w / 2 + this.facing * 11;
      const hy = sy + this.h * 0.58;
      ctx.translate(hx, hy);
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.rotate(-0.08 + Math.sin(this.itemUseFlash * 0.8) * 0.04);
      this._drawHeldWeaponSprite(ctx, heldWeaponDef, 'hand');
      ctx.restore();
    }

    // Attack — katana moon slash (or shadow scythe in stealth)
    if (this.attacking && this.attackBox) {
      const slashDiv = this.counterAttacking ? 22 : 12;
      const slashProgress = 1 - this.attackTimer / slashDiv;
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

      // Earth: straight stone fist punch render
      if (isEarth) {
        const punchExt = Math.sin(slashProgress * Math.PI) * (50 + this.bonusReach * 4);
        const fistW = 26, fistH = 38 + this.bonusReach * 3;
        const fx = cx + dir * (8 + punchExt);
        const fy = cy - fistH / 2 - 4;
        ctx.save();
        // Stone fist body
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(fx - (dir > 0 ? 0 : fistW), fy, fistW, fistH);
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(fx - (dir > 0 ? 0 : fistW) - 0.5, fy - 0.5, fistW + 1, fistH + 1);
        // Knuckle highlights (4 across the tall fist)
        ctx.fillStyle = '#e8d0b0';
        const kx = dir > 0 ? fx + fistW - 5 : fx - fistW + 1;
        const knuckleSpacing = fistH / 5;
        for (let i = 1; i <= 4; i++) {
          ctx.fillRect(kx, fy + knuckleSpacing * i - 2, 4, 4);
        }
        // Wrist band
        const wx = dir > 0 ? fx : fx - 5;
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(wx, fy + 4, 5, fistH - 8);
        // Green accent band
        ctx.fillStyle = '#2e9e2e';
        const gx = dir > 0 ? fx + 3 : fx - fistW + 3;
        ctx.fillRect(gx, fy + 2, 4, fistH - 4);
        // Speed lines trailing behind
        const sDir = -dir;
        ctx.strokeStyle = '#c8a878';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7 * Math.sin(slashProgress * Math.PI);
        for (let i = 0; i < 7; i++) {
          const lx = (dir > 0 ? fx : fx) + sDir * (4 + i * 5);
          const ly = fy + 2 + i * (fistH / 7);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + sDir * (12 + i * 2), ly);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {

      // Weapon swinging
      ctx.save();
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);
      const startA = isScythe ? -Math.PI * 0.8 : -Math.PI * 0.65;
      const sweep = isScythe ? Math.PI * 1.4 : Math.PI * 1.0;
      const curA = startA + sweep * slashProgress;
      ctx.rotate(curA);

      if (heldWeaponDef) {
        this._drawHeldWeaponSprite(ctx, heldWeaponDef, 'hand');
      } else if (renderScythe) {
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-8, -2.5);
        ctx.lineTo(40 * sc, -1.5);
        ctx.lineTo(40 * sc, 1.5);
        ctx.lineTo(-8, 2.5);
        ctx.closePath();
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -1.5);
        ctx.lineTo(26, -1);
        ctx.lineTo(26, 1);
        ctx.lineTo(-6, 1.5);
        ctx.closePath();
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -1.2);
        ctx.lineTo(28, -0.8);
        ctx.lineTo(28, 0.8);
        ctx.lineTo(-6, 1.2);
        ctx.closePath();
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 3;
        ctx.stroke();
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
      ctx.fillStyle = renderScythe ? '#a040ff' : isBubble ? '#20a0d0' : isCrystal ? '#0aa' : t.color;
      ctx.fill();
      // Main crescent
      const moonAlpha = (renderScythe ? 0.7 : 0.6) * (1 - slashProgress * 0.6);
      ctx.globalAlpha = moonAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, aStart, aEnd, false);
      ctx.arc(offsetX, offsetY, innerR, aEnd, aStart, true);
      ctx.closePath();
      ctx.fillStyle = renderScythe ? '#c8a0ff' : isBubble ? '#80e8ff' : isCrystal ? '#aff' : t.accentColor;
      ctx.fill();
      // Bright edge on the outer rim
      ctx.strokeStyle = renderScythe ? '#e8d8ff' : isBubble ? '#c0f4ff' : isCrystal ? '#dff' : '#fff';
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
    } // end else (non-earth weapon render)
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
      if (p.done || p.owner === 'player' || p.owner === 'ally' || p.owner === 'boss') continue;
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
        e.stunTimer = Math.max(e.stunTimer, 90);
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
        game.boss.stunTimer = Math.max(game.boss.stunTimer, 60);
      }
    }
    game.effects.push(new ScreenFlash('#f4fbff', 0.60, 20));
    game.effects.push(new ScreenFlash('#9fe8ff', 0.28, 30));
    SFX.nuke();
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
