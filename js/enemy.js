// ── Enemy base ───────────────────────────────────────────────
class Enemy {
  constructor(x, y, type, big, wave, hpScale) {
    const base = ENEMY_STATS[type];
    this.type = type;
    this.big = !!big;
    this.wave = wave || 1;
    const healthScale = hpScale || this.wave;
    this.w = big ? 42 : 28;
    this.h = big ? 42 : 28;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = (big ? base.hp * 4 : base.hp) * healthScale;
    this.maxHp = this.hp;
    this.displayHp = this.hp;
    this._initCombatBars(healthScale);
    // Regular enemies hit in big chunks; the player can recover by fighting back.
    const _ehp = [0,16,24,34,46,60,73,89,107,127,148][Math.min(this.wave, 10)] || 148;
    const _arm = [0,1,2,4,6,8,10,13,15,18,21][Math.min(this.wave, 10)] || 21;
    this.contactDmg = Math.max(1, Math.round(_ehp * (big ? 0.55 : 0.40) + _arm));
    const darkTypeColors = {
      walker: '#3c4035', shooter: '#202837', jumper: '#302231', bouncer: '#393923',
      rocketeer: '#243447', charger: '#241716', shielded: '#3b4a35', deflector: '#222635', protector: '#8a6416',
      attacker: '#4a1f24', satellite: '#263a55', flyer: '#312032', flyshooter: '#242a35'
    };
    this.color = darkTypeColors[type] || base.color;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.dead = false;
    this.contactTick = 0;
    this.shootTimer = randInt(0, 40);
    this.jumpTimer = randInt(0, 40);
    this.wallJumpCooldown = 0;
    this.platformIntentCooldown = randInt(10, 45);
    this.platformDropTimer = 0;
    this.patrolLeft = x - 100;
    this.patrolRight = x + 100;
    this.flashTimer = 0;
    this.damageIframes = 0;
    this._slideDmgCd = 0;
    this._contactDmgCd = 0;
    this.resistTimer = 0;
    this.burnTimer = 0;
    this.soakTimer = 0;
    this.flying = (type === 'flyer' || type === 'flyshooter' || type === 'attacker' || type === 'satellite');
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
    this.rangeOffset = (type === 'shooter' || type === 'bouncer' || type === 'rocketeer') ? Math.floor(Math.random() * 80) - 40 : 0;
    this.guardOffset = Math.floor(Math.random() * 120) - 60;
    this.defensiveDashCooldown = randInt(20, 70);
    this.edgeAware = (type === 'walker' || type === 'shooter' || type === 'rocketeer' || type === 'shielded' || type === 'bouncer' || type === 'deflector' || type === 'protector');
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
    // Spears are larger readable guards, not tiny cars.
    if (type === 'walker') {
      this.w = big ? 54 : 36;
      this.h = big ? 54 : 42;
    }
    // Charger: low horizontal rectangle that commits to one lane.
    if (type === 'charger') {
      this.w = big ? 78 : 58;
      this.h = big ? 48 : 38;
      this.chargeLaneDir = this.facing;
      this.chargeJumpTimer = randInt(20, 70);
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
    if (type === 'satellite') {
      this.w = big ? 72 : 54;
      this.h = big ? 42 : 32;
      this.satelliteBeamCooldown = randInt(45, 100);
    }
    // Elemental variant
    this.element = null;
    this.elementColors = null;
    this.baseColor = this.color; // preserve original type color
    this.elementArmor = 0;
    this.elementArmorMax = 0;
    this.elementBroken = false;
    this.lightningTeleportCooldown = randInt(120, 240);
    this.windPhaseTimer = 0;
    this.windPhaseCooldown = randInt(140, 260);
    this.spikySpikeTimer = 0;
    this.spikySpikeCooldown = randInt(110, 210);
    this.juggleState = false;
    // Stance system
    this.staggerBar = 0;
    this.disableTimer = 0;
    this.stanceRecoverDelay = 0;
  }

  _initCombatBars(healthScale) {
    const normalHits = {
      walker: 8, shooter: 8, jumper: 9, bouncer: 10, charger: 12,
      shielded: 11, deflector: 14, protector: 16, rocketeer: 11, attacker: 7,
      satellite: 18, flyer: 8, flyshooter: 9
    };
    const scale = 1 + Math.max(0, (this.wave || 1) - 1) * 0.12;
    const mapScale = healthScale && healthScale !== this.wave ? Math.min(1.35, Math.max(1, Math.sqrt(healthScale))) : 1;
    const hpHits = Math.ceil((normalHits[this.type] || 8) * (this.big ? 1.8 : 1) * scale * mapScale * 8);
    this.hp = hpHits;
    this.maxHp = hpHits;
    this.displayHp = hpHits;
    this.maxStance = Math.max(4, Math.ceil(this.maxHp / 4));
    this.stance = this.maxStance;
    this.displayStance = this.stance;
    this.stanceRecoverDelay = 0;
  }

  _updateStance() {
    if (this.maxStance === undefined) {
      this.maxStance = Math.max(4, Math.ceil(this.maxHp / 4));
      this.stance = this.maxStance;
      this.displayStance = this.stance;
    }
    if (this.stanceRecoverDelay === undefined) this.stanceRecoverDelay = 0;
    if (this.disableTimer > 0) {
      this.disableTimer--;
      this.stance = 0;
      this.staggerBar = this.maxStance;
    } else {
      this.stanceRecoverDelay++;
      if (this.stanceRecoverDelay > 120 && this.stance < this.maxStance) {
        this.stance = Math.min(this.maxStance, this.stance + this.maxStance / 120);
      }
      this.staggerBar = Math.max(0, this.maxStance - this.stance);
    }
    this.displayStance = lerp(this.displayStance, this.stance, 0.18);
  }

  _damageProfile(amount, sourceType) {
    if (amount >= 9999 || sourceType === 'chain') return { hp: amount, stance: 0 };
    const hitPower = Math.max(1, Math.min(3, Math.ceil(amount / 2)));
    if (sourceType === 'shuriken') return { hp: 1, stance: hitPower * 2.5 };
    if (sourceType === 'sword') return { hp: 1, stance: hitPower };
    if (sourceType === 'boulder') return { hp: hitPower, stance: hitPower * 1.5 };
    return { hp: hitPower, stance: hitPower * 1.25 };
  }

  _applyStanceDamage(stanceDamage, game) {
    if (!game || stanceDamage <= 0 || this.disableTimer > 0) return;
    if (this.maxStance === undefined) this._initCombatBars(1);
    this.stanceRecoverDelay = 0;
    this.stance = Math.max(0, this.stance - stanceDamage);
    this.staggerBar = Math.max(0, this.maxStance - this.stance);
    if (this.stance <= 0) this._breakStance(game);
  }

  _breakStance(game) {
    if (this.disableTimer > 0) return;
    this.disableTimer = 600;
    this.stunTimer = Math.max(this.stunTimer || 0, 600);
    this.stance = 0;
    this.staggerBar = this.maxStance || 0;
    if (game) {
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'BROKEN!', '#f4f0ff'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c04fff', 16, 5, 20));
    }
  }

  _startStanceChain(game) {
    if (!game || !game.player || game.player.staggerChaining) return false;
    game.player.staggerChaining = true;
    game.player.staggerChainTimer = 14;
    game.player.staggerChainHit = new Set();
    game.player.staggerChainHit.add(this);
    game.player.staggerChainDmg = 1;
    game.player.staggerChainCombo = 1;
    game.player.staggerChainComboTimer = 90;
    game.player.staggerChainComboPop = 1;
    if (game.player._addStaggerChainCutMark) game.player._addStaggerChainCutMark(this);
    if (game.player._spawnChainCut) game.player._spawnChainCut(this);
    this._finishByStanceChain(game);
    game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 24, 'CHAIN STRIKE!', '#f4f0ff'));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#c04fff', 16, 5, 20));
    return true;
  }

  _finishByStanceChain(game) {
    if (this.shieldHp > 0) {
      const fromX = game && game.player ? game.player.x + game.player.w / 2 : this.x + this.w / 2;
      this._chipShield(game, fromX, 1, { effectSize: this.bossType ? 11 : 10 });
      this.disableTimer = 0;
      this.stance = this.maxStance || 0;
      this.staggerBar = 0;
      this.stunTimer = Math.max(this.stunTimer || 0, this.bossType ? 80 : 50);
      if (game && game.effects) {
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 24, 'SHIELD CUT', '#f4f0ff'));
      }
      return false;
    }
    if (game) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      game.effects.push(new Effect(cx, cy, '#f4f0ff', 18, 6, 22));
      game.effects.push(new Effect(cx, cy, '#c04fff', 12, 4, 18));
      game.effects.push(new BloodSpill(cx, cy, game.player ? game.player.x + game.player.w / 2 : cx - 1, this.big || this.bossType ? 1.8 : 1.25));
    }
    this.disableTimer = 0;
    this.stance = this.maxStance || 0;
    this.staggerBar = 0;
    this.hp = 0;
    this.dead = true;
    this.onDeath(game);
  }

  _syncElementState() {
    if (this.element && !this.elementColors && ELEMENT_COLORS[this.element]) {
      this.elementColors = ELEMENT_COLORS[this.element];
      this.color = this.elementColors.body;
    }
    if ((this.element === 'spiky' || this.element === 'steel') && this.elementArmorMax <= 0) {
      this.elementArmorMax = this.big ? 14 : 8;
      this.elementArmor = this.elementArmorMax;
      this.elementBroken = false;
    }
  }

  _needsDistance() {
    return this.type === 'shooter' || this.type === 'bouncer' || this.type === 'rocketeer' || this.type === 'flyshooter' || this.type === 'satellite';
  }

  _guardAnchor(game) {
    if (!game) return null;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const candidates = [];
    const add = (entity, weight) => {
      if (!entity || entity.dead) return;
      const ex = entity.x + entity.w / 2;
      const ey = entity.y + entity.h / 2;
      candidates.push({ x: ex, y: ey, weight: weight || 1 });
    };
    if (game.missionDirector) {
      const rt = game.missionDirector.routeEvent;
      if (rt && rt.target) add(rt.target, 0.35);
    }
    add(game.samurai, 0.45);
    add(game.protectBuilding, 0.35);
    add(game.boss && !game.boss.dead ? game.boss : null, 0.55);
    for (const e of game.enemies || []) {
      if (e === this || e.dead) continue;
      if (e.type === 'shooter' || e.type === 'bouncer' || e.type === 'rocketeer' || e.type === 'flyshooter' || e.type === 'attacker' || e.type === 'satellite') add(e, 0.65);
    }
    if (!candidates.length) return { x: this.patrolLeft + 100, y: cy };
    candidates.sort((a, b) => {
      const da = Math.hypot(a.x - cx, a.y - cy) * a.weight;
      const db = Math.hypot(b.x - cx, b.y - cy) * b.weight;
      return da - db;
    });
    return candidates[0];
  }

  _defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, opts = {}) {
    const pl = game.player;
    const pcx = pl.x + pl.w / 2;
    const pcy = pl.y + pl.h / 2;
    if (this.vy >= 0 && this.vy < 1 && Math.abs(pcx - cx) > 6) this.facing = pcx > cx ? 1 : -1;
    if (this.defensiveDashCooldown > 0) this.defensiveDashCooldown--;
    const playerDist = Math.hypot(pcx - cx, pcy - cy);
    const anchor = this._guardAnchor(game);
    const desiredX = anchor ? anchor.x + (this.guardOffset || 0) : cx;
    const dx = desiredX - cx;
    const guardRadius = opts.guardRadius || 38;
    const aggroRange = opts.aggroRange || 260;
    if (!playerStealthed && playerDist < aggroRange && Math.abs(pcy - cy) < (opts.aggroYRange || 120)) {
      const dir = Math.sign(pcx - cx) || this.facing || 1;
      this.facing = dir;
      const closeBias = playerDist < (opts.triggerRange || 110) ? 0.35 : 1;
      this.vx = dir * speed * (opts.aggroSpeed || 0.9) * closeBias * windResist;
    } else if (Math.abs(dx) > guardRadius) {
      this.vx = Math.sign(dx) * speed * (opts.guardSpeed || 0.42) * windResist;
    } else {
      this.vx = Math.sin(((game.tick || 0) + this.guardOffset * 7) * 0.035) * speed * 0.18 * windResist;
    }
    const verticalTarget = (playerDist < aggroRange || !anchor) ? { x: pcx, y: pcy } : anchor;
    const targetAbove = verticalTarget && verticalTarget.y < cy - (opts.platformRise || 44);
    const targetReachableX = verticalTarget && Math.abs(verticalTarget.x - cx) < (opts.platformXRange || 270);
    if (!playerStealthed && targetAbove && targetReachableX && this.defensiveDashCooldown <= 0 && this.vy >= 0 && this.vy < 1) {
      const dir = Math.sign(verticalTarget.x - cx) || this.facing || 1;
      this.facing = dir;
      this.vy = opts.platformJumpVy || opts.jumpVy || -10.5;
      this.vx = dir * speed * (opts.platformDashMult || opts.dashMult || 3.0) * windResist;
      this.defensiveDashCooldown = opts.platformCooldown || opts.cooldown || randInt(60, 100);
      if (game.effects) game.effects.push(new Effect(cx, cy, opts.color || '#d8d0b8', 8, 3, 12));
      return;
    }
    if (!playerStealthed && playerDist < (opts.triggerRange || 110) && Math.abs(pcy - cy) < (opts.yRange || 70) && this.defensiveDashCooldown <= 0 && this.vy >= 0 && this.vy < 1) {
      const dir = Math.sign(pcx - cx) || this.facing || 1;
      this.facing = dir;
      this.vy = opts.jumpVy || -8.5;
      this.vx = dir * speed * (opts.dashMult || 3.0) * windResist;
      this.defensiveDashCooldown = opts.cooldown || randInt(55, 95);
      if (game.effects) game.effects.push(new Effect(cx, cy, opts.color || '#d8d0b8', 7, 3, 10));
    }
  }

  _tryLeaperWallJump(game, px, speed, windResist) {
    if (this.type !== 'jumper' || this.wallJumpCooldown > 0) return false;
    if (this.onPlatform && this.vy >= 0 && this.vy < 1) return false;
    const margin = 8;
    const centerY = this.y + this.h / 2;
    let wallDir = 0;

    if (this.x <= margin && this.vx < 0) wallDir = 1;
    else if (this.x + this.w >= game.levelW - margin && this.vx > 0) wallDir = -1;

    if (!wallDir) {
      for (const p of game.platforms || []) {
        if (p.thin) continue;
        const verticalOverlap = centerY > p.y - this.h * 0.45 && centerY < p.y + p.h + this.h * 0.35;
        if (!verticalOverlap) continue;
        const hitLeftSide = this.vx > 0 && this.x + this.w >= p.x - margin && this.x + this.w <= p.x + margin;
        const hitRightSide = this.vx < 0 && this.x <= p.x + p.w + margin && this.x >= p.x + p.w - margin;
        if (hitLeftSide) { wallDir = -1; this.x = p.x - this.w - 1; break; }
        if (hitRightSide) { wallDir = 1; this.x = p.x + p.w + 1; break; }
      }
    }

    if (!wallDir) return false;
    this.facing = wallDir;
    const targetBias = px > this.x + this.w / 2 ? 1 : -1;
    const pushDir = targetBias === wallDir ? wallDir : wallDir * 0.85;
    this.vx = pushDir * speed * (this.big ? 3.1 : 3.45) * windResist;
    this.vy = this.big ? -12.4 : -11.2;
    this.wallJumpCooldown = this.big ? 20 : 16;
    this.jumpTimer = 0;
    if (game.effects) {
      game.effects.push(new Effect(
        wallDir > 0 ? this.x : this.x + this.w,
        this.y + this.h * 0.48,
        this.element ? this.elementColors.accent : '#d8b4ff',
        7,
        3,
        10
      ));
    }
    return true;
  }

  _canUseThinPlatforms() {
    if (this.flying || this.type === 'charger' || this.type === 'attacker' || this.type === 'satellite') return false;
    if ((this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging') return false;
    return true;
  }

  _platformMobility(game, px, py, speed, windResist, playerStealthed) {
    if (!game || this.flying || playerStealthed || this.stunTimer > 0 || this.knockbackTimer > 0) return;
    if ((this.type === 'shielded' || this.type === 'protector') && this.chargeState !== 'idle') return;
    if (this.type === 'attacker' || this.type === 'satellite') return;
    if (this.platformIntentCooldown > 0) this.platformIntentCooldown--;
    if (this.platformIntentCooldown > 0) return;
    this.platformIntentCooldown = randInt(12, 28);

    const grounded = this.vy >= -0.2 && this.vy < 1 && !!this.onPlatform;
    if (!grounded) return;

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = px - cx;
    const targetAbove = py < cy - 58;
    const targetBelow = py > cy + 72;
    const targetDir = Math.sign(dx) || this.facing || 1;
    const mobileJumpers = this.type === 'jumper' || this.type === 'bouncer' || this.type === 'deflector';
    const heavyGuard = this.type === 'shielded' || this.type === 'protector';
    const canJumpToPlatforms = mobileJumpers || heavyGuard;

    if (targetAbove && canJumpToPlatforms) {
      const reachable = (game.platforms || []).some(p => {
        if (p.y >= this.y - 18 || p.y < this.y - 150) return false;
        const horizontalReach = cx > p.x - 120 && cx < p.x + p.w + 120;
        const targetNearPlatform = px > p.x - 80 && px < p.x + p.w + 80;
        return horizontalReach || targetNearPlatform;
      });
      if (reachable || Math.abs(dx) < 260) {
        this.facing = targetDir;
        this.vy = mobileJumpers ? (this.big ? -12.8 : -11.4) : heavyGuard ? -10.2 : -9.8;
        this.vx = targetDir * speed * (mobileJumpers ? 2.8 : heavyGuard ? 2.0 : 2.25) * windResist;
        this.jumpTimer = 0;
        if (game.effects && mobileJumpers) game.effects.push(new Effect(cx, this.y + this.h, '#d8b4ff', 6, 3, 9));
        return;
      }
    }

    const p = this.onPlatform;
    const canDrop = p && (p.thin || p.playerDropThrough || p.h <= 12) && p.y < 460;
    if (targetBelow && canDrop && (Math.abs(dx) < Math.max(120, p.w * 0.65) || Math.sign(dx) === Math.sign(this.vx || targetDir))) {
      this.platformDropTimer = 18;
      this.onPlatform = null;
      this.y += 3;
      this.vy = Math.max(this.vy, 1.5);
      this.facing = targetDir;
      this.vx = targetDir * speed * (mobileJumpers ? 1.7 : 1.15) * windResist;
      return;
    }

    const edgePad = 18;
    const nearingLeft = p && cx < p.x + edgePad && this.vx < 0;
    const nearingRight = p && cx > p.x + p.w - edgePad && this.vx > 0;
    if ((nearingLeft || nearingRight) && Math.abs(dx) > 120 && !heavyGuard && canJumpToPlatforms) {
      this.facing = targetDir;
      this.vy = mobileJumpers ? (this.big ? -11.8 : -10.6) : -8.7;
      this.vx = targetDir * speed * (mobileJumpers ? 2.6 : 1.9) * windResist;
      this.jumpTimer = 0;
    }
  }

  _tryLightningTeleport(game) {
    if (this.element !== 'lightning' || !game || !game.player || this.spawnTimer > 0) return;
    this.lightningTeleportCooldown--;
    if (this.lightningTeleportCooldown > 0) return;
    this.lightningTeleportCooldown = randInt(210, 340);

    const pl = game._chooseEnemyTarget ? game._chooseEnemyTarget(this) : game.player;
    const pcx = pl.x + pl.w / 2;
    const pcy = pl.y + pl.h / 2;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dist = Math.hypot(pcx - cx, pcy - cy);
    const wantsDistance = this._needsDistance();
    if (wantsDistance && dist > 190) return;
    if (!wantsDistance && dist < 260) return;

    const side = pcx < cx ? 1 : -1;
    const desiredDist = wantsDistance ? randInt(240, 360) : randInt(70, 120);
    let nx = pcx + side * desiredDist - this.w / 2;
    nx = Math.max(40, Math.min(game.levelW - this.w - 40, nx));
    const oldX = this.x, oldY = this.y;
    this.x = nx;
    if (this.flying) {
      this.y = Math.max(60, Math.min(260, pcy - this.h / 2 + randInt(-70, 70)));
    } else {
      this.y = Math.min(this.y, 430 - this.h);
      this.vy = 0;
    }
    this.facing = pcx > this.x + this.w / 2 ? 1 : -1;
    game.effects.push(new TeleportTrace(oldX + this.w / 2, oldY + this.h / 2, this.x + this.w / 2, this.y + this.h / 2, '#ff8'));
    game.effects.push(new Effect(oldX + this.w / 2, oldY + this.h / 2, '#ff8', 12, 4, 12));
    game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 10, 3, 10));
    game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 12, wantsDistance ? 'BLINK OUT' : 'BLINK IN', '#ff8'));
  }

  _updateWindPhase(game) {
    if (this.element !== 'wind') {
      this.windPhaseTimer = 0;
      return;
    }
    if (this.windPhaseTimer > 0) {
      this.windPhaseTimer--;
      if (Math.random() < 0.25 && game) {
        game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + Math.random() * this.h, '#bfb', 1, 0.5, 8));
      }
      return;
    }
    this.windPhaseCooldown--;
    if (this.windPhaseCooldown <= 0) {
      this.windPhaseTimer = this.big ? 75 : 55;
      this.windPhaseCooldown = randInt(180, 300);
    }
  }

  _updateSpikySpikes(game) {
    if (this.element !== 'spiky') {
      this.spikySpikeTimer = 0;
      return;
    }
    if (this.spikySpikeTimer > 0) {
      this.spikySpikeTimer--;
      if (Math.random() < 0.18 && game) {
        game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + Math.random() * this.h, '#f64', 1, 0.7, 8));
      }
      return;
    }
    this.spikySpikeCooldown--;
    if (this.spikySpikeCooldown <= 0) {
      this.spikySpikeTimer = this.big ? 95 : 70;
      this.spikySpikeCooldown = randInt(150, 260);
      if (game) game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'SPIKES', '#f86'));
    }
  }

  _spikySpikeWarning() {
    return this.element === 'spiky' && this.spikySpikeTimer <= 0 && this.spikySpikeCooldown <= 60;
  }

  _spikySpikesActive() {
    return this.element === 'spiky' && this.spikySpikeTimer > 0;
  }

  _renderChainBubble(ctx, sx, sy, game) {
    if ((this.chainBubbleTimer || 0) <= 0) return;
    const tick = game ? game.tick : 0;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const radius = Math.max(this.w, this.h) * 0.72 + 7 + Math.sin(tick * 0.18) * 2;
    const fade = Math.min(1, this.chainBubbleTimer / 24);

    ctx.save();
    ctx.globalAlpha = 0.24 + 0.22 * fade;
    ctx.fillStyle = '#4af';
    ctx.shadowColor = '#8cf';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.86, radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.82 * fade;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c8f6ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.86, radius, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.28, cy - radius * 0.34, Math.max(2, radius * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.beginPath();
    ctx.arc(cx + radius * 0.22, cy - radius * 0.2, Math.max(1.5, radius * 0.07), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  update(game) {
    if (this.dead) return;
    this._syncElementState();
    this._updateWindPhase(game);
    this._updateSpikySpikes(game);
    this._tryLightningTeleport(game);
    this._updateStance();
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    if (this.isRouteEscapeTarget) {
      if (this.damageIframes > 0) this.damageIframes--;
      if (this.flashTimer > 0) this.flashTimer--;
      return;
    }
    if (this.grounded) this.juggleState = false;
    if (this.chainBubbleTimer > 0) {
      this.chainBubbleTimer--;
      this.vx = 0;
      this.vy = -0.35;
      this.y -= 0.35 + Math.sin(this.chainBubbleTimer * 0.18) * 0.25;
      this.freezeTimer = Math.max(this.freezeTimer || 0, 2);
      if (game && this.chainBubbleTimer % 8 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2 + randInt(-10, 10), this.y + this.h / 2 + randInt(-10, 10), '#8cf', 4, 1.5, 10));
      }
    }
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
      // Paralysis DOT — noticeable, but not a percent-health boss killer.
      if (this.paralyseTimer % 30 === 0) {
        const pdmg = Math.max(1, Math.round(this.maxHp * 0.05));
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
    const target = game._chooseEnemyTarget ? game._chooseEnemyTarget(this) : game.player;
    const targetBox = target && target.getHurtbox ? target.getHurtbox() : target;
    const targetIsPlayer = target === game.player;
    const playerStealthed = targetIsPlayer && game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    const px = playerStealthed ? (this.x + this.facing * 100) : (targetBox.x + targetBox.w / 2);
    const py = playerStealthed ? (this.y) : (targetBox.y + targetBox.h / 2);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // Gravity (not for flyers, not for floating). Disabled flyers should hold
    // their skull-marked position instead of float-drifting off-screen.
    if (this.disableTimer > 0 && this.flying) {
      this.vy = 0;
    } else if (this.floatTimer > 0) {
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

    if (this.wallJumpCooldown > 0) this.wallJumpCooldown--;
    if (this.platformDropTimer > 0) this.platformDropTimer--;
    if (this.stunTimer > 0) { this.stunTimer--; this.vx *= 0.9; }
    else switch (this.type) {
      case 'walker':
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        this._defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, {
          guardRadius: 44, guardSpeed: 0.58, triggerRange: 155, yRange: 96, aggroRange: 340,
          aggroSpeed: 1.15, platformJumpVy: -12.4, platformDashMult: 3.65,
          jumpVy: -11.2, dashMult: 3.75, cooldown: 55, color: '#d8d0b8'
        });
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
            const col = this.element ? this.elementColors.accent : '#ff4';
            game.hitLines.push(new HitLine(cx, cy, (dx / d) * 4, (dy / d) * 4, col, this.contactDmg, 'enemy', { element: this.element }));
          }
        }
        break;
      }
      case 'rocketeer': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        const rDist = Math.abs(px - cx);
        if (this.vy >= 0 && this.vy < 1) this.facing = px > cx ? 1 : -1;
        const rRetreat = 190 + this.rangeOffset;
        const rComfort = 320 + this.rangeOffset;
        const rBuf = 24;
        if (!this._rangeState) this._rangeState = 'comfort';
        if (this._rangeState === 'comfort') {
          if (rDist < rRetreat - rBuf) this._rangeState = 'retreat';
          else if (rDist > rComfort + rBuf) this._rangeState = 'approach';
        } else if (this._rangeState === 'retreat') {
          if (rDist > rRetreat + rBuf) this._rangeState = 'comfort';
        } else {
          if (rDist < rComfort - rBuf) this._rangeState = 'comfort';
        }
        if (this._rangeState === 'retreat') {
          this.vx = -this.facing * speed * 0.78 * windResist;
        } else if (this._rangeState === 'comfort') {
          const tick = game ? game.tick : 0;
          this.vx = Math.sin((tick + this.rangeOffset * 9) * 0.035) * speed * 0.24 * windResist;
        } else {
          this.vx = this.facing * speed * 0.48 * windResist;
        }
        this.shootTimer++;
        if (this.shootTimer >= (this.big ? 115 : 145)) {
          this.shootTimer = 0;
          const dx = px - cx, dy = py - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 620 && d > 0) {
            const col = this.element ? this.elementColors.accent : '#79d8ff';
            const leadX = Math.max(36, Math.min(game.levelW - 36, px + (targetBox.vx || 0) * 12 + randInt(-22, 22)));
            const leadY = Math.max(game.camera.y + 35, Math.min(500, py + randInt(-10, 18)));
            game.hitLines.push(new EnergyBlastCircle(leadX, leadY, this.big ? 72 : 58, col, this.contactDmg, 'enemy', {
              element: this.element,
              maxTimer: this.big ? 58 : 66,
              flashDur: 18,
              sourceType: 'rocketeer',
              originX: cx,
              originY: cy - 8
            }));
            game.effects.push(new Effect(cx, cy - 4, col, 8, 3, 10));
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
            // High-angle mortar — now a grenade that explodes
            const dx = px - cx;
            const dy = py - cy;
            const spread = (Math.random() - 0.5) * 1.2;
            const lobSpd = (5.5 + Math.random() * 1.5) * 0.65;
            const aimAngle = Math.atan2(dy, Math.abs(dx));
            const highAngle = Math.min(aimAngle, -Math.PI * 0.25) - Math.PI * 0.1;
            const dir = dx > 0 ? 1 : -1;
            const shots = this.big ? 2 : 1;
            for (let si = 0; si < shots; si++) {
              const sSpread = (spread + si * dir * 0.8) * 0.65;
              const gvx = dir * Math.cos(highAngle) * lobSpd + sSpread;
              const gvy = Math.sin(highAngle) * (lobSpd + si * 0.5 * 0.65);
              const col = this.element ? this.elementColors.accent : '#f6f';
              game.grenades.push(new Grenade(cx + dir * 6, cy - 4, gvx, gvy, col, this.contactDmg, 'enemy', {
                element: this.element, gravScale: 0.42, fuseTimer: 85 + randInt(0, 20), bouncesLeft: 3
              }));
            }
          }
        }
        break;
      }
      case 'charger': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        this.vx = this.facing * speed * 1.85 * windResist;
        this.chargeJumpTimer--;
        const cDist = Math.abs(px - cx);
        const cFacingPlayer = (this.facing > 0 && px > cx) || (this.facing < 0 && px < cx);
        if (!playerStealthed && cFacingPlayer && cDist < 260 && Math.abs(py - cy) < 100 && this.chargeJumpTimer <= 0 && this.vy >= 0 && this.vy < 1) {
          this.vy = -8.5;
          this.vx = this.facing * speed * 2.8;
          this.chargeJumpTimer = randInt(65, 110);
          game.effects.push(new TextEffect(cx, this.y - 8, 'CHARGE', '#fb6'));
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
            if (this.chargeTimer >= 16) {
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
              this.chargeCooldown = 85;
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
            if (this.chargeTimer >= 90) {
              this.chargeState = 'idle';
              this.chargeCooldown = 80;
            }
          } else if (this.chargeState === 'recoil') {
            const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
            this.vx = backDir * speed * 2.5;
            this.chargeTimer++;
            if (this.chargeTimer >= 15 || Math.abs(this.x - this.chargeStartX) < 10) {
              this.chargeState = 'idle';
              this.chargeCooldown = 80;
              this.vx = 0;
            }
          } else {
            // idle — walk toward player
            this._defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, {
              guardRadius: 52, guardSpeed: 0.50, triggerRange: 165, yRange: 98, aggroRange: 360,
              aggroSpeed: 1.0, platformJumpVy: -11.8, platformDashMult: 3.9,
              jumpVy: -10.4, dashMult: 4.2, cooldown: 65, color: '#5ff'
            });
            if (shDist < 165 && Math.abs(py - cy) < 90 && this.chargeCooldown <= 0 && this.vy >= 0 && this.vy < 1 && !playerStealthed) {
              this.chargeState = 'prepare';
              this.chargeTimer = 0;
              this.chargeStartX = this.x;
              const cdx = px - cx, cdy = py - cy;
              const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
              this._chargeVx = (cdx / cd) * speed * 5;
              this._chargeVy = Math.min((cdy / cd) * speed * 5, -2.5);
              this.vx = 0;
            }
          }
        } else {
          // Shield broken — behave like walker
          this._defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, {
            guardRadius: 46, guardSpeed: 0.54, triggerRange: 145, yRange: 86, aggroRange: 330,
            aggroSpeed: 1.0, platformJumpVy: -11.6, platformDashMult: 3.3,
            jumpVy: -10.2, dashMult: 3.25, cooldown: 60, color: '#d8d0b8'
          });
        }
        break;
      }
      case 'deflector': {
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; break; }
        // A Friend's Letter and objective Ronin allies fight on the player's side.
        const legacyItemsOn = !game._legacyBossItemsEnabled || game._legacyBossItemsEnabled();
        if (this.friendly || (legacyItemsOn && game.player.items.friendsLetter)) {
          if (legacyItemsOn && game.player.items.friendsLetter) this.friendly = true;
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
        // Hostile Ronin faces player with dead zone to prevent flipping
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
            if (this.chargeTimer >= 22) {
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
              this.chargeCooldown = 100;
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
            if (this.chargeTimer >= 105) {
              this.chargeState = 'idle';
              this.chargeCooldown = 95;
            }
          } else if (this.chargeState === 'recoil') {
            const backDir = Math.sign(this.chargeStartX - this.x) || -this.facing;
            this.vx = backDir * speed * 2;
            this.chargeTimer++;
            if (this.chargeTimer >= 18 || Math.abs(this.x - this.chargeStartX) < 10) {
              this.chargeState = 'idle';
              this.chargeCooldown = 95;
              this.vx = 0;
            }
          } else {
            // idle — walk slowly toward player
            this._defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, {
              guardRadius: 62, guardSpeed: 0.42, triggerRange: 175, yRange: 104, aggroRange: 380,
              aggroSpeed: 0.9, platformJumpVy: -11.2, platformDashMult: 3.4,
              jumpVy: -9.8, dashMult: 3.65, cooldown: 80, color: '#4f8'
            });
            if (pDist < 175 && Math.abs(py - cy) < 90 && this.chargeCooldown <= 0 && this.vy >= 0 && this.vy < 1 && !playerStealthed) {
              this.chargeState = 'prepare';
              this.chargeTimer = 0;
              this.chargeStartX = this.x;
              const cdx = px - cx, cdy = py - cy;
              const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
              this._chargeVx = (cdx / cd) * speed * 4.5;
              this._chargeVy = Math.min((cdy / cd) * speed * 4.5, -2.2);
              this.vx = 0;
            }
          }
        } else {
          // Shield broken — behave like walker
          this._defensiveGuard(game, px, py, cx, cy, speed, windResist, playerStealthed, {
            guardRadius: 56, guardSpeed: 0.46, triggerRange: 155, yRange: 90, aggroRange: 350,
            aggroSpeed: 0.9, platformJumpVy: -10.8, platformDashMult: 3.1,
            jumpVy: -9.8, dashMult: 3.0, cooldown: 75, color: '#d8d0b8'
          });
        }
        break;
      }
      case 'satellite': {
        this.hoverPhase += 0.035;
        if (this.knockbackTimer > 0) { this.knockbackTimer--; this.vx *= 0.92; this.vy *= 0.92; break; }
        const pl = game.player;
        const pcx = pl.x + pl.w / 2;
        const pcy = pl.y + pl.h / 2;
        const targetY = Math.max(game.camera.y + 58, Math.min(210, pcy - 210));
        const targetX = Math.max(60, Math.min(game.levelW - 60, pcx + Math.sin((game.tick + this.guardOffset) * 0.018) * 120));
        this.facing = pcx > cx ? 1 : -1;
        this.vx += Math.sign(targetX - cx) * 0.12;
        this.vx *= 0.92;
        this.vy += Math.sign(targetY - cy) * 0.08;
        this.vy = this.vy * 0.9 + Math.sin(this.hoverPhase) * 0.08;
        if (this.satelliteBeamCooldown > 0) this.satelliteBeamCooldown--;
        if (this.satelliteBeamCooldown <= 0) {
          this.satelliteBeamCooldown = this.big ? 150 : 185;
          const col = this.element ? this.elementColors.accent : '#8fd6ff';
          game.hitLines.push(new SatelliteBeam(this, col, this.contactDmg, 'enemy', {
            element: this.element,
            telegraphDur: this.big ? 32 : 38,
            activeDur: 60,
            fadeDur: 22,
            width: this.big ? 24 : 19,
            sourceType: 'satellite'
          }));
          game.effects.push(new Effect(cx, cy, col, 9, 3, 12));
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
              const col = this.element ? this.elementColors.accent : '#f44';
              game.hitLines.push(new HitLine(auraCx, auraCy, (sdx / sd) * 4, (sdy / sd) * 4, col, this.contactDmg, 'enemy', {
                element: this.element, maxTimer: this.big ? 38 : 46, flashDur: 20, activeDur: 18,
                width: this.big ? 18 : 14, sourceType: 'attacker'
              }));
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
              const col = this.element ? this.elementColors.accent : '#f44';
              game.hitLines.push(new HitLine(auraCx, auraCy, (sdx / sd) * 4, (sdy / sd) * 4, col, this.contactDmg, 'enemy', {
                element: this.element, maxTimer: this.big ? 38 : 46, flashDur: 20, activeDur: 18,
                width: this.big ? 18 : 14, sourceType: 'attacker'
              }));
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
            const col = this.element ? this.elementColors.accent : '#fa4';
            game.hitLines.push(new HitLine(cx, cy, (adx / ad) * 4, (ady / ad) * 4, col, this.contactDmg, 'enemy', { element: this.element }));
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

    this._platformMobility(game, px, py, speed, windResist, playerStealthed);

    // Defensive melee clumps near anchors, but should not stack into one blob.
    if (this.type === 'walker' || this.type === 'shielded' || this.type === 'protector') {
      for (const other of game.enemies) {
        if (other === this || other.dead || (other.type !== 'walker' && other.type !== 'shielded' && other.type !== 'protector')) continue;
        const ox = other.x + other.w / 2;
        const oy = other.y + other.h / 2;
        const dx = cx - ox;
        const dy = cy - oy;
        const minDist = (this.w + other.w) * 0.42;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < minDist * minDist && Math.abs(dy) < Math.max(this.h, other.h) * 0.8) {
          const d = Math.sqrt(d2);
          this.vx += (dx / d) * 0.45;
        }
      }
    }

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Platform collision (ground enemies only)
    const isChargeDashing = (this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging';
    if (!this.flying) {
      this._tryLeaperWallJump(game, px, speed, windResist);
      this.onPlatform = null;
      for (const p of game.platforms) {
        if (this.platformDropTimer > 0 && (p.thin || p.playerDropThrough || p.h <= 12)) continue;
        if (p.thin && !this._canUseThinPlatforms()) continue;
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
        const isRanged = (this.type === 'shooter' || this.type === 'bouncer' || this.type === 'rocketeer');
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
          const atLeftEdge = this.x + this.w / 2 < p.x + 8;
          const atRightEdge = this.x + this.w / 2 > p.x + p.w - 8;
          if ((atLeftEdge && this.vx < 0) || (atRightEdge && this.vx > 0)) {
            this.vx = 0;
            if (atLeftEdge) this.x = p.x + 8 - this.w / 2;
            if (atRightEdge) this.x = p.x + p.w - 8 - this.w / 2;
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
    const contactTarget = game._firstOverlappingFriendly ? game._firstOverlappingFriendly(this, this) : (rectOverlap(this, game.player.getHurtbox()) ? game.player : null);
    if (this.contactTick <= 0 && this.type !== 'attacker' && !this.friendly && contactTarget && !this.slamming && !contactTarget.slamming) {
      const kbDir = Math.sign(game._entityCenterX(contactTarget) - (this.x + this.w / 2)) || 1;
      const isShieldCharge = (this.type === 'shielded' || this.type === 'protector') && this.chargeState === 'charging';
      const isDashHit = isShieldCharge || this.type === 'charger' || this.flyerDashState === 'dashing';
      const kbStr = isDashHit ? 14 : (this.big ? 9 : 5);
      const dmg = isDashHit
        ? Math.round(this.contactDmg * (isShieldCharge ? 1.5 : 1.25))
        : Math.max(1, Math.round(this.contactDmg * (this.big ? 0.45 : 0.32)));
      const spikyMul = this._spikySpikesActive() ? 1.5 : 1;
      game._applyFriendlyKnockback(contactTarget, this, kbDir * kbStr, isDashHit ? -3 : (this.big ? -5 : -4), isDashHit ? 10 : 8);
      game._damageFriendlyTarget(contactTarget, Math.round(dmg * spikyMul), this.element || null, { type: this.type, element: this.element, isBoss: false });
      this.contactTick = 30;
      if (isShieldCharge || this.type === 'charger') {
        this.chargeState = 'recoil';
        this.chargeTimer = 0;
        this.vx = -this.facing * speed * 3;
        this.vy = -6;
      }
    }
  }

  takeDamage(amount, game, fromX, attackElement, sourceType, sourceActor) {
    if (this.dead) return false;
    if (this.friendly) return false;
    this._syncElementState();
    if (this.missionMinibossRole === 'captain' && this.missionCaptainLocked && game && game._missionCaptainGuardAlive && game._missionCaptainGuardAlive(this)) {
      this.flashTimer = 4;
      if (game.effects) {
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 16, 'GUARDS FIRST', '#ffb347'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#ffb347', 8, 2, 8));
      }
      return false;
    }
    if (this.element === 'wind' && this.windPhaseTimer > 0) {
      this.flashTimer = 3;
      if (game) {
        game.effects.push(new TextEffect(this.x + this.w / 2 - 14, this.y - 10, 'PHASED', '#bfb'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 8, 2, 10));
      }
      return false;
    }
    // Ghost: immune to blade & shuriken (only abilities/elemental can hurt)
    // Exception: sword hits on a shielded/protector can still chip the physical shield
    const hasActiveShield = (this.type === 'shielded' || this.type === 'protector') && this.shieldHp > 0;
    const rawAmount = amount;
    let suppressKnockback = false;
    if (this.element === 'ghost' && (sourceType === 'sword' || sourceType === 'shuriken') && !hasActiveShield) {
      this.flashTimer = 4;
      if (this.resistTimer <= 0) {
        game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'IMMUNE', '#6f6'));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#8f8', 6, 2, 10));
        this.resistTimer = 20;
      }
      return false;
    }
    // Spiky: reflect sword damage back to the sword user
    if (this._spikySpikesActive() && sourceType === 'sword' && game && game.player) {
      const reflDmg = Math.max(1, Math.round(amount * 0.5));
      const reflectTarget = sourceActor && sourceActor.takeDamage ? sourceActor : game.player;
      reflectTarget.takeDamage(reflDmg, game, 'spike', { type: this.type, element: 'spiky', isBoss: false });
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'REFLECT', '#f86'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f64', 8, 3, 10));
      this.flashTimer = 6;
      // still take half damage from the sword
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    // Shock: sword attacks get electrified
    if (this.element === 'lightning' && sourceType === 'sword' && game && game.player) {
      const shockTarget = sourceActor && sourceActor.takeDamage ? sourceActor : game.player;
      if (shockTarget.statusParalyse !== undefined) shockTarget.statusParalyse = 120;
      else shockTarget.takeDamage(1, game, 'lightning', { type: this.type, element: 'lightning', isBoss: false });
      game.effects.push(new TextEffect(this.x + this.w / 2 - 24, this.y - 10, 'PARALYSED', '#6ff'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#6ff', 8, 3, 12));
    }

    // Elemental interaction — only specials trigger resist/heal (not sword or shuriken)
    if (this.element && game && sourceType !== 'sword' && sourceType !== 'shuriken') {
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
          if (!hasActiveShield) this._applyStanceDamage(this._damageProfile(rawAmount, sourceType).stance, game);
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
    // Attacker: protected while enemies are in its aura, but no longer fully invulnerable.
    if (this.type === 'attacker' && this.attackerInvulnerable) {
      this.flashTimer = 4;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f88', 5, 2, 6));
      amount = Math.max(1, Math.round(amount * 0.35));
    }
    // Protector aura: active only while its shield holds, and reduces damage instead of denying it.
    if (this.type !== 'protector' && this.type !== 'attacker' && game) {
      for (const other of game.enemies) {
        if (other.dead || other.type !== 'protector' || other === this || other.shieldHp <= 0) continue;
        const dx = (this.x + this.w / 2) - (other.x + other.w / 2);
        const dy = (this.y + this.h / 2) - (other.y + other.h / 2);
        if (Math.sqrt(dx * dx + dy * dy) <= other.auraRadius) {
          this.flashTimer = 4;
          other.deflectFlash = 0;
          game.effects.push(new Effect(this.x + this.w / 2, this.y - 4, '#4f8', 5, 2, 6));
          amount = Math.max(1, Math.round(amount * 0.45));
          break;
        }
      }
    }

    // ── Chain strike: only sword hits cash out disabled enemies. Other damage
    // sources may hurt them, but should not erase the skull/finish window.
    if (this.disableTimer > 0 && sourceType === 'sword' && game && game.player && !game.player.staggerChaining) {
      return this._startStanceChain(game);
    }
    if (sourceType === 'chain') {
      this.stunTimer = Math.max(this.stunTimer || 0, this.big ? 55 : 40);
      this.vx *= 0.35;
      this.vy *= 0.35;
    }

    // ── Stagger bar: accumulates rawAmount from all hits, bypasses elemental resist ──
    const combatDamage = this._damageProfile(amount, sourceType);
    if (!hasActiveShield) this._applyStanceDamage(combatDamage.stance, game);
    amount = combatDamage.hp;

    // Shielded / Protector: heavy strikes and chain strikes remove shield pips
    let shieldBlocked = false;
    if ((sourceType === 'sword' || sourceType === 'boulder' || sourceType === 'shuriken' || sourceType === 'chain') && this._shieldBlocks(fromX, undefined, game)) {
      shieldBlocked = true;
      this._chipShield(game, fromX, 1, { effectSize: sourceType === 'chain' ? 10 : 5 });
      amount = Math.max(1, Math.round(amount * 0.25));
      this._applyStanceDamage(0.5, game);
    }
    if (this.juggleState) {
      amount = Math.ceil(amount * 1.5);
      const dir = Math.sign((this.x + this.w / 2) - (this.x + this.w / 2)) || (game && game.player ? game.player.facing : 1);
      this.vx = dir * 2;
      this.vy = -5;
      game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'JUGGLE', '#ff8'));
    }

    if ((this.element === 'spiky' || this.element === 'steel') && this.elementArmor > 0) {
      const armorBefore = this.elementArmor;
      const blocked = Math.min(amount, armorBefore);
      this.elementArmor -= blocked;
      amount -= blocked;
      suppressKnockback = true;
      const armorColor = this.element === 'steel' ? '#d8e0e8' : '#f86';
      if (game) {
        game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 18, 'ARMOR ' + this.elementArmor, armorColor));
        game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, armorColor, 8, 2, 10));
      }
      if (this.elementArmor <= 0) {
        const brokenElement = this.element;
        this.elementArmor = 0;
        this.elementArmorMax = 0;
        this.elementBroken = true;
        this.element = null;
        this.elementColors = null;
        this.color = this.baseColor;
        if (game) {
          game.effects.push(new TextEffect(this.x + this.w / 2 - 24, this.y - 30, 'ARMOR BREAK', armorColor));
          game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fff', 12, 4, 14));
        }
        if (brokenElement === 'spiky') this.resistTimer = Math.max(this.resistTimer, 8);
      }
      if (amount <= 0) {
        this.flashTimer = 4;
        return true;
      }
    }

    // ── Boss Summon Orb charge: damage dealt fills the meter ──
    if (game && !game.bossActive) {
      const waveDef = WAVE_DEFS[game.currentWaveDefIdx] || WAVE_DEFS[0];
      const _obj = game.currentObjective;
      // Determine if this hit should charge the meter
      let _shouldCharge = false;
      if (!_obj) _shouldCharge = true;
      // 'survive', 'zone', 'defend': charge via time in game.js, not from damage
      // 'collect': charge from shuriken caches in game.js, not from damage
      if (_shouldCharge) {
        let chargeMult = 1;
        if (game.wave > 1) {
          if (game.levelElement && this.element === game.levelElement) chargeMult += 0.5;
          if (waveDef && waveDef.boss && this.type === waveDef.boss) chargeMult += 0.5;
        }
        game.bossOrbCharge = Math.min(game.bossOrbChargeMax, game.bossOrbCharge + amount * chargeMult);
      }
    }

    this.hp -= amount;
    if (!shieldBlocked) this.flashTimer = 6;
    if (this.hp > 0) SFX.enemyHurt();
    const atkEl = attackElement || (game && game.player ? NINJA_ATTACK_ELEMENTS[game.player.ninjaType] : null);
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, atkEl));
    if (game && (sourceType === 'sword' || sourceType === 'shuriken' || sourceType === 'chain')) {
      game.effects.push(new BloodSpill(
        this.x + this.w / 2,
        this.y + this.h * (0.35 + Math.random() * 0.35),
        fromX,
        sourceType === 'chain' ? (this.big ? 1.75 : 1.35) : (this.big ? 1.35 : 1.08)
      ));
    }
    // Weight system: heavier enemies resist knockback more
    const weightBase = { walker: 1, shooter: 0.9, jumper: 0.8, bouncer: 1.2, rocketeer: 1.1, charger: 1.8, shielded: 1.6, deflector: 1.3, protector: 2.5, attacker: 0.7, flyer: 0.5, flyshooter: 0.5 };
    const isBoss = this instanceof Boss;
    let weight = (weightBase[this.type] || 1) * (this.big ? 2 : 1) * (isBoss ? 3.5 : 1);
    const dir = (fromX !== undefined) ? Math.sign(this.x + this.w / 2 - fromX) : this.facing * -1;
    if (suppressKnockback) {
      this.knockbackTimer = Math.max(this.knockbackTimer, 4);
    } else if (sourceType === 'sword' || sourceType === 'boulder') {
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
      const kbBase = { walker: 5, shooter: 6, jumper: 4, bouncer: 3, rocketeer: 4, charger: 2, shielded: 2, deflector: 3, protector: 1, attacker: 8, flyer: 20, flyshooter: 20 };
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
    if (game.currentObjective && game.currentObjective.type === 'hunt' && game._matchesHuntFilter(this, game.currentObjective.filter)) {
      game.objectiveKills = (game.objectiveKills || 0) + 1;
    } else if (game.routeObjectiveSet) {
      for (const obj of game.routeObjectiveSet) {
        if (obj && obj.type === 'hunt' && game._matchesHuntFilter(this, obj.filter)) {
          game.objectiveKills = (game.objectiveKills || 0) + 1;
          break;
        }
      }
    }
    if (this.isMissionMiniboss && game && game._onMissionMinibossKilled) {
      game._onMissionMinibossKilled(this);
    }
    if (this.isRouteEscapeTarget && game && game._onRouteEscapeKilled) {
      game._onRouteEscapeKilled(this);
    }
    // Track kill for achievements & bestiary
    recordKill(game.player.ninjaType);
    recordBestiaryKill(this.type, this.big, false, this.element);
    // Track deflector kill for earth construct unlock
    if (this.type === 'deflector') game.player.defeatedDeflector = true;
    // Elemental Charm: 10% heal on kill of matching element
    if (this.element) {
      const charmMap = { fire:'charmFire', ghost:'charmGhost', water:'charmWater', crystal:'charmCrystal', wind:'charmWind', lightning:'charmLightning', spiky:'charmSpiky' };
      const charmKey = charmMap[this.element];
      const legacyItemsOn = !game._legacyBossItemsEnabled || game._legacyBossItemsEnabled();
      if (legacyItemsOn && charmKey && game.player.items[charmKey]) {
        const healAmt = Math.max(1, Math.round(game.player.maxHp * 0.1));
        game.player.hp = Math.min(game.player.hp + healAmt, game.player.maxHp);
        game.effects.push(new TextEffect(game.player.x + game.player.w / 2, game.player.y - 10, '+' + healAmt, '#4f4'));
      }
    }
    SFX.enemyDie();
    triggerHitstop(this.big ? 7 : 5);
    triggerScreenShake(this.big ? 4 : 2, this.big ? 8 : 5);
    game.effects.push(new AngledDeathFade(this.x, this.y, this.w, this.h, this.color, { type: this.type, life: this.big ? 58 : 44 }));

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
    // Drop orb — tiered rarity (big/boss drop upgrades; normal mobs drop recharges only)
    const r = Math.random();
    const ox = this.x + this.w / 2 - 5;
    if (this.big || this instanceof Boss) {
      game.orbs.push(new Orb(ox, this.y, 'ultcharge'));
    } else {
      if (r < 0.65) {                                        // T1: heal 65%
        game.orbs.push(new Orb(ox, this.y, 'heal'));
      } else {                                               // T2: ultcharge 35%
        game.orbs.push(new Orb(ox, this.y, 'ultcharge'));
      }
    }
  }

  // Compute shield angle toward player (or facing fallback when stealthed)
  _shieldAngle(game) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const target = game && game._chooseEnemyTarget ? game._chooseEnemyTarget(this) : (game && game.player);
    const targetBox = target && target.getHurtbox ? target.getHurtbox() : target;
    const stealthed = target === (game && game.player) && game && game.player && game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    if (!stealthed && targetBox) {
      const px = targetBox.x + targetBox.w / 2;
      const py = targetBox.y + targetBox.h / 2;
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

  _chipShield(game, fromX, chipAmount = 1, opts = {}) {
    if (this.shieldHp <= 0) return false;
    const isProtector = this.type === 'protector' || this.bossType === 'protector';
    const isBossShield = !!this.bossType;
    const legacyItemsOn = !game || !game._legacyBossItemsEnabled || game._legacyBossItemsEnabled();
    const pickaxeBonus = legacyItemsOn && game && game.player && game.player.items && game.player.items.pickaxe ? 1 : 0;
    const chip = Math.max(1, Math.round(chipAmount) + pickaxeBonus);
    const shieldColor = isProtector ? '#f3d06a' : '#5ff';
    const effectScale = isBossShield ? 0.7 : 0.6;
    const shAng = this.shieldAngle || 0;

    this.shieldHp = Math.max(0, this.shieldHp - chip);
    this.shieldFlash = 6;
    this.shieldBump = isBossShield ? 8 : 6;

    if (game && game.effects) {
      game.effects.push(new Effect(
        this.x + this.w / 2 + Math.cos(shAng) * this.w * effectScale,
        this.y + this.h / 2 + Math.sin(shAng) * this.w * effectScale,
        shieldColor,
        opts.effectSize || 8,
        3,
        10
      ));
      if (this.shieldHp <= 0) {
        this.stunTimer = Math.max(this.stunTimer || 0, isBossShield ? 120 : 90);
        this.chargeState = 'idle';
        this.chargeTimer = 0;
        game.effects.push(new TextEffect(this.x + this.w / 2, this.y - 10, 'SHIELD BREAK', shieldColor));
      }
    }
    if (typeof SFX !== 'undefined' && SFX.armor) SFX.armor();
    return true;
  }

  _renderEnemySilhouette(ctx, sx, sy, color, type) {
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const w = this.w;
    const h = this.h;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 2.4;
    drawEnemySilhouettePath(ctx, sx, sy, w, h, type);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = 'rgba(255,245,210,0.72)';
    ctx.lineWidth = 1;
    drawEnemySilhouettePath(ctx, sx, sy, w, h, type);
    ctx.stroke();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.10, sy + h * 0.22, w * 0.12, h * 0.08, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
    ctx.beginPath();
    if (type === 'flyer') {
      ctx.moveTo(cx - w * 0.55, cy - h * 0.05);
      ctx.quadraticCurveTo(cx - w * 1.02, cy - h * 0.42, cx - w * 0.72, cy + h * 0.36);
      ctx.quadraticCurveTo(cx - w * 0.36, cy + h * 0.18, cx - w * 0.22, cy + h * 0.05);
      ctx.ellipse(cx, cy, w * 0.42, h * 0.38, 0, Math.PI * 0.96, Math.PI * 2.04);
      ctx.quadraticCurveTo(cx + w * 0.36, cy + h * 0.18, cx + w * 0.72, cy + h * 0.36);
      ctx.quadraticCurveTo(cx + w * 1.02, cy - h * 0.42, cx + w * 0.55, cy - h * 0.05);
      ctx.closePath();
    } else if (type === 'flyshooter') {
      ctx.moveTo(cx - w * 0.78, cy - h * 0.12);
      ctx.lineTo(cx - w * 0.30, cy - h * 0.34);
      ctx.lineTo(cx + w * 0.62, cy - h * 0.18);
      ctx.lineTo(cx + w * 0.86, cy + h * 0.02);
      ctx.lineTo(cx + w * 0.50, cy + h * 0.24);
      ctx.lineTo(cx - w * 0.58, cy + h * 0.22);
      ctx.closePath();
    } else if (type === 'attacker') {
      ctx.arc(cx, cy, w * 0.5, 0, Math.PI * 2);
    } else if (type === 'satellite') {
      ctx.moveTo(cx - w * 0.48, cy - h * 0.18);
      ctx.lineTo(cx - w * 0.22, cy - h * 0.42);
      ctx.lineTo(cx + w * 0.22, cy - h * 0.42);
      ctx.lineTo(cx + w * 0.48, cy - h * 0.18);
      ctx.lineTo(cx + w * 0.36, cy + h * 0.30);
      ctx.lineTo(cx, cy + h * 0.48);
      ctx.lineTo(cx - w * 0.36, cy + h * 0.30);
      ctx.closePath();
    } else if (type === 'shooter') {
      ctx.moveTo(sx + w * 0.18, sy + h * 0.22);
      ctx.quadraticCurveTo(cx, sy - h * 0.02, sx + w * 0.82, sy + h * 0.22);
      ctx.lineTo(sx + w * 0.90, sy + h * 0.78);
      ctx.quadraticCurveTo(cx, sy + h * 0.98, sx + w * 0.10, sy + h * 0.78);
      ctx.closePath();
    } else if (type === 'shielded' || type === 'protector' || type === 'charger') {
      ctx.moveTo(sx + w * 0.24, sy + h * 0.06);
      ctx.quadraticCurveTo(cx, sy - h * 0.06, sx + w * 0.76, sy + h * 0.06);
      ctx.lineTo(sx + w * 0.92, sy + h * 0.72);
      ctx.quadraticCurveTo(cx, sy + h * 1.02, sx + w * 0.08, sy + h * 0.72);
      ctx.closePath();
    } else if (type === 'bouncer') {
      ctx.moveTo(sx + w * 0.28, sy + h * 0.10);
      ctx.quadraticCurveTo(cx, sy - h * 0.04, sx + w * 0.72, sy + h * 0.10);
      ctx.quadraticCurveTo(sx + w * 0.98, sy + h * 0.44, sx + w * 0.78, sy + h * 0.84);
      ctx.quadraticCurveTo(cx, sy + h * 1.05, sx + w * 0.22, sy + h * 0.84);
      ctx.quadraticCurveTo(sx + w * 0.02, sy + h * 0.44, sx + w * 0.28, sy + h * 0.10);
    } else if (type === 'jumper') {
      ctx.moveTo(sx + w * 0.34, sy + h * 0.08);
      ctx.quadraticCurveTo(cx, sy - h * 0.05, sx + w * 0.66, sy + h * 0.08);
      ctx.lineTo(sx + w * 0.82, sy + h * 0.60);
      ctx.lineTo(sx + w * 0.98, sy + h * 0.96);
      ctx.lineTo(sx + w * 0.58, sy + h * 0.82);
      ctx.lineTo(sx + w * 0.42, sy + h * 0.82);
      ctx.lineTo(sx + w * 0.02, sy + h * 0.96);
      ctx.lineTo(sx + w * 0.18, sy + h * 0.60);
      ctx.closePath();
    } else if (type === 'deflector') {
      ctx.moveTo(sx + w * 0.20, sy + h * 0.18);
      ctx.quadraticCurveTo(cx, sy + h * 0.02, sx + w * 0.80, sy + h * 0.18);
      ctx.lineTo(sx + w * 0.74, sy + h * 0.92);
      ctx.quadraticCurveTo(cx, sy + h * 1.04, sx + w * 0.26, sy + h * 0.92);
      ctx.closePath();
    } else {
      ctx.moveTo(sx + w * 0.30, sy + h * 0.08);
      ctx.quadraticCurveTo(cx, sy - h * 0.06, sx + w * 0.74, sy + h * 0.13);
      ctx.lineTo(sx + w * 0.88, sy + h * 0.72);
      ctx.quadraticCurveTo(sx + w * 0.66, sy + h * 1.00, sx + w * 0.46, sy + h * 0.88);
      ctx.quadraticCurveTo(sx + w * 0.26, sy + h * 1.00, sx + w * 0.12, sy + h * 0.70);
      ctx.lineTo(sx + w * 0.18, sy + h * 0.26);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = 'rgba(255,245,210,0.72)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.12, sy + h * 0.22, w * 0.16, h * 0.10, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderEnemyDetails(ctx, sx, sy, game) {
    const t = game ? game.tick : 0;
    const cx = sx + this.w / 2;
    const cy = sy + this.h / 2;
    const dir = this.facing >= 0 ? 1 : -1;
    const frontX = dir > 0 ? sx + this.w : sx;
    const faceX = dir > 0 ? sx + this.w * 0.58 : sx + this.w * 0.22;
    this._renderRedesignedEnemyDetails(ctx, sx, sy, game, t, cx, cy, dir, frontX, faceX);
    return;
    ctx.save();
    ctx.lineWidth = this.big ? 2 : 1.5;
    if (this.type === 'walker') {
      ctx.fillStyle = '#63705a';
      ctx.beginPath();
      ctx.ellipse(cx, sy + this.h * 0.27, this.w * 0.31, this.h * 0.20, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b201c';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.18, sy + this.h * 0.45);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.36, sx + this.w * 0.84, sy + this.h * 0.48);
      ctx.lineTo(sx + this.w * 0.76, sy + this.h * 0.86);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.96, sx + this.w * 0.20, sy + this.h * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5e6e55';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.10, sy + this.h * 0.50);
      ctx.lineTo(sx - this.w * 0.16, sy + this.h * 0.68);
      ctx.moveTo(sx + this.w * 0.90, sy + this.h * 0.48);
      ctx.lineTo(sx + this.w * 1.12, sy + this.h * 0.62);
      ctx.stroke();
      const spearGripX = frontX - dir * this.w * 0.28;
      const spearGripY = sy + this.h * 0.54;
      ctx.save();
      ctx.translate(spearGripX, spearGripY);
      ctx.rotate(dir > 0 ? -0.18 : Math.PI + 0.18);
      ctx.strokeStyle = '#5b3a20';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-this.w * 0.20, 0);
      ctx.lineTo(this.w * 1.18, 0);
      ctx.stroke();
      ctx.strokeStyle = '#eadfbe';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-this.w * 0.14, -2);
      ctx.lineTo(this.w * 1.06, -2);
      ctx.stroke();
      ctx.fillStyle = '#d7dee0';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(this.w * 1.26, 0);
      ctx.lineTo(this.w * 1.02, -7);
      ctx.lineTo(this.w * 1.08, 0);
      ctx.lineTo(this.w * 1.02, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b33';
      ctx.fillRect(this.w * 0.16, -4, 7, 8);
      ctx.restore();
    } else if (this.type === 'shooter') {
      ctx.fillStyle = '#202735';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.16, sy + this.h * 0.34);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.24, sx + this.w * 0.84, sy + this.h * 0.34);
      ctx.lineTo(sx + this.w * 0.78, sy + this.h * 0.82);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.94, sx + this.w * 0.18, sy + this.h * 0.80);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#39465b';
      ctx.beginPath();
      ctx.ellipse(cx, sy + this.h * 0.19, this.w * 0.33, this.h * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d1118';
      ctx.fillRect(sx + this.w * 0.25, sy + this.h * 0.18, this.w * 0.50, 4);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      const muzzle = this.facing > 0 ? sx + this.w + 13 : sx - 13;
      ctx.beginPath();
      ctx.moveTo(cx, sy + this.h * 0.52);
      ctx.lineTo(muzzle, sy + this.h * 0.48);
      ctx.stroke();
      ctx.fillStyle = '#cfd6d9';
      ctx.fillRect(this.facing > 0 ? muzzle : muzzle - 5, sy + this.h * 0.45, 5, 4);
    } else if (this.type === 'flyer') {
      ctx.fillStyle = '#3b2235';
      ctx.beginPath();
      ctx.ellipse(cx, cy, this.w * 0.56, this.h * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, this.w * 0.32, this.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(cx + Math.sin(t * 0.08) * 2, cy, this.w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d3d5d';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.10, cy);
      ctx.quadraticCurveTo(sx - this.w * 0.30, cy - 10 - Math.sin(t * 0.25) * 4, sx - this.w * 0.08, cy + 12);
      ctx.moveTo(sx + this.w * 0.90, cy);
      ctx.quadraticCurveTo(sx + this.w * 1.30, cy - 10 + Math.sin(t * 0.25) * 4, sx + this.w * 1.08, cy + 12);
      ctx.stroke();
    } else if (this.type === 'shielded') {
      ctx.fillStyle = '#5e6e55';
      ctx.beginPath();
      ctx.ellipse(cx, sy + this.h * 0.28, this.w * 0.31, this.h * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d7d0bd';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.30, sy + this.h * 0.12);
      ctx.lineTo(sx + this.w * 0.18, sy - 4);
      ctx.moveTo(sx + this.w * 0.70, sy + this.h * 0.12);
      ctx.lineTo(sx + this.w * 0.86, sy - 4);
      ctx.stroke();
      const axeGripX = frontX - dir * this.w * 0.20;
      const axeGripY = sy + this.h * 0.56;
      ctx.save();
      ctx.translate(axeGripX, axeGripY);
      ctx.rotate(dir > 0 ? -0.65 : 0.65);
      ctx.strokeStyle = '#3a2415';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -this.h * 0.34);
      ctx.lineTo(0, this.h * 0.28);
      ctx.stroke();
      ctx.fillStyle = '#c9d0c9';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-12, -this.h * 0.38);
      ctx.quadraticCurveTo(3, -this.h * 0.58, 18, -this.h * 0.34);
      ctx.lineTo(8, -this.h * 0.15);
      ctx.quadraticCurveTo(-4, -this.h * 0.22, -12, -this.h * 0.38);
      ctx.moveTo(4, -this.h * 0.38);
      ctx.quadraticCurveTo(16, -this.h * 0.48, 22, -this.h * 0.25);
      ctx.lineTo(9, -this.h * 0.18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (this.type === 'flyshooter') {
      ctx.fillStyle = '#303341';
      ctx.beginPath();
      ctx.ellipse(cx, cy, this.w * 0.66, this.h * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65758a';
      ctx.fillRect(sx + this.w * 0.18, sy + this.h * 0.25, this.w * 0.64, this.h * 0.18);
      ctx.fillStyle = '#a5f0ff';
      for (let i = 0; i < 3; i++) ctx.fillRect(sx + this.w * (0.26 + i * 0.22), sy + this.h * 0.46, 4, 3);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#9ff';
      ctx.beginPath();
      ctx.moveTo(cx - this.w * 0.22, sy + this.h * 0.58);
      ctx.lineTo(cx + this.w * 0.22, sy + this.h * 0.58);
      ctx.lineTo(cx + this.w * 0.38, sy + this.h * 1.08);
      ctx.lineTo(cx - this.w * 0.38, sy + this.h * 1.08);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.type === 'bouncer') {
      ctx.fillStyle = '#5d6144';
      ctx.beginPath();
      ctx.ellipse(cx, sy + this.h * 0.52, this.w * 0.36, this.h * 0.33, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2f22';
      ctx.beginPath();
      ctx.ellipse(cx, sy + this.h * 0.21, this.w * 0.28, this.h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#202016';
      ctx.fillRect(sx + this.w * 0.14, sy + this.h * 0.46, 7, 9);
      ctx.fillRect(sx + this.w * 0.70, sy + this.h * 0.44, 7, 9);
      ctx.fillStyle = '#f44';
      ctx.fillRect(sx + this.w * 0.17, sy + this.h * 0.43, 3, 3);
      ctx.strokeStyle = '#211';
      ctx.lineWidth = 3;
      const packX = dir > 0 ? sx + this.w * 0.70 : sx + this.w * 0.18;
      ctx.strokeRect(packX, sy + this.h * 0.34, this.w * 0.16, this.h * 0.22);
    } else if (this.type === 'charger') {
      ctx.fillStyle = '#241716';
      ctx.beginPath();
      ctx.ellipse(cx - dir * this.w * 0.04, sy + this.h * 0.55, this.w * 0.38, this.h * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f201b';
      ctx.beginPath();
      ctx.ellipse(frontX - dir * this.w * 0.15, sy + this.h * 0.34, this.w * 0.22, this.h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9c0a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(frontX - dir * this.w * 0.16, sy + this.h * 0.20);
      ctx.quadraticCurveTo(frontX - dir * this.w * 0.02, sy - this.h * 0.04, frontX + dir * this.w * 0.18, sy + this.h * 0.08);
      ctx.moveTo(frontX - dir * this.w * 0.20, sy + this.h * 0.31);
      ctx.quadraticCurveTo(frontX - dir * this.w * 0.03, sy + this.h * 0.52, frontX + dir * this.w * 0.16, sy + this.h * 0.38);
      ctx.stroke();
      ctx.fillStyle = '#0d0706';
      ctx.beginPath();
      ctx.arc(frontX - dir * this.w * 0.12, sy + this.h * 0.30, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a0d0a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.25, sy + this.h * 0.75);
      ctx.lineTo(sx + this.w * 0.20, sy + this.h * 0.98);
      ctx.moveTo(sx + this.w * 0.72, sy + this.h * 0.75);
      ctx.lineTo(sx + this.w * 0.78, sy + this.h * 0.98);
      ctx.stroke();
    } else if (this.type === 'jumper') {
      ctx.fillStyle = '#3a2634';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.28, sy + this.h * 0.16);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.04, sx + this.w * 0.72, sy + this.h * 0.16);
      ctx.lineTo(sx + this.w * 0.82, sy + this.h * 0.60);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.76, sx + this.w * 0.18, sy + this.h * 0.60);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6e5b72';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.24, sy + this.h * 0.62);
      ctx.lineTo(sx + this.w * 0.02, sy + this.h * 0.96);
      ctx.moveTo(sx + this.w * 0.76, sy + this.h * 0.62);
      ctx.lineTo(sx + this.w * 0.98, sy + this.h * 0.96);
      ctx.stroke();
    } else if (this.type === 'deflector') {
      ctx.fillStyle = '#1e222c';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.20, sy + this.h * 0.18);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.06, sx + this.w * 0.80, sy + this.h * 0.18);
      ctx.lineTo(sx + this.w * 0.74, sy + this.h * 0.80);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.94, sx + this.w * 0.26, sy + this.h * 0.80);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d9d9e2';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.16, sy + this.h * 0.36);
      ctx.lineTo(sx + this.w * 0.90, sy + this.h * 0.18);
      ctx.stroke();
    } else if (this.type === 'protector') {
      ctx.fillStyle = '#143224';
      ctx.beginPath();
      ctx.moveTo(sx + this.w * 0.22, sy + this.h * 0.16);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.02, sx + this.w * 0.78, sy + this.h * 0.16);
      ctx.lineTo(sx + this.w * 0.82, sy + this.h * 0.74);
      ctx.quadraticCurveTo(cx, sy + this.h * 0.96, sx + this.w * 0.18, sy + this.h * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#62d989';
      ctx.beginPath();
      ctx.arc(cx, cy, this.w * 0.38, -0.3, Math.PI + 0.3);
      ctx.stroke();
    }
    if (!this.flying && this.type !== 'attacker') {
      ctx.fillStyle = this.flashTimer > 0 ? '#111' : '#f4d6b0';
      ctx.fillRect(faceX, sy + this.h * 0.25, 4, 3);
      ctx.fillRect(faceX + dir * 9, sy + this.h * 0.26, 3, 2);
      ctx.fillStyle = '#190707';
      ctx.fillRect(faceX + dir * 2, sy + this.h * 0.34, dir * 10, 2);
      ctx.strokeStyle = 'rgba(230,220,190,0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(frontX - dir * this.w * 0.12, sy + this.h * 0.50);
      ctx.lineTo(frontX + dir * this.w * 0.10, sy + this.h * 0.43);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderRedesignedEnemyDetails(ctx, sx, sy, game, t, cx, cy, dir, frontX, faceX) {
    const w = this.w;
    const h = this.h;
    const type = this.type || this.bossType || 'walker';
    const strokeScale = this.big || this.bossType ? 1.35 : 1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'walker') {
      const aimTarget = game ? game.player : null;
      const aimX = aimTarget ? aimTarget.x + aimTarget.w / 2 : cx + dir * w;
      const aimY = aimTarget ? aimTarget.y + aimTarget.h / 2 : sy + h * 0.35;
      const spearGripX = cx - dir * w * 0.10;
      const spearGripY = sy + h * 0.52;
      const spearAngle = Math.atan2(aimY - spearGripY, aimX - spearGripX);
      ctx.strokeStyle = '#17100c';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cx - dir * w * 0.10, sy + h * 0.45);
      ctx.lineTo(cx - dir * w * 0.38, sy + h * 0.62);
      ctx.moveTo(cx + dir * w * 0.04, sy + h * 0.48);
      ctx.lineTo(cx + dir * w * 0.28, sy + h * 0.64);
      ctx.stroke();
      ctx.fillStyle = '#6d765e';
      ctx.beginPath();
      ctx.ellipse(cx, sy + h * 0.20, w * 0.22, h * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b201c';
      ctx.fillRect(cx - w * 0.16, sy + h * 0.34, w * 0.32, h * 0.30);
      ctx.save();
      ctx.translate(spearGripX, spearGripY);
      ctx.rotate(spearAngle);
      ctx.strokeStyle = '#5b3a20';
      ctx.lineWidth = 5.2 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, 0);
      ctx.lineTo(w * 1.45, 0);
      ctx.stroke();
      ctx.strokeStyle = '#eadfbe';
      ctx.lineWidth = 1.4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(-w * 0.30, -2);
      ctx.lineTo(w * 1.22, -2);
      ctx.stroke();
      ctx.fillStyle = '#d7dee0';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.6 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(w * 1.58, 0);
      ctx.lineTo(w * 1.20, -9);
      ctx.lineTo(w * 1.30, 0);
      ctx.lineTo(w * 1.20, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (type === 'shooter') {
      const aimTarget = game ? game.player : null;
      const aimX = aimTarget ? aimTarget.x + aimTarget.w / 2 : cx + dir * w;
      const aimY = aimTarget ? aimTarget.y + aimTarget.h / 2 : sy + h * 0.45;
      const gunX = cx - dir * w * 0.12;
      const gunY = sy + h * 0.47;
      const gunAngle = Math.atan2(aimY - gunY, aimX - gunX);
      ctx.fillStyle = '#161c28';
      ctx.fillRect(sx + w * 0.30, sy + h * 0.30, w * 0.34, h * 0.52);
      ctx.fillStyle = '#39465b';
      ctx.beginPath();
      ctx.ellipse(cx, sy + h * 0.24, w * 0.26, h * 0.11, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(gunX, gunY);
      ctx.rotate(gunAngle);
      ctx.strokeStyle = '#0b0e13';
      ctx.lineWidth = 5 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(-w * 0.12, 0);
      ctx.lineTo(w * 1.24, 0);
      ctx.stroke();
      ctx.strokeStyle = '#8793a4';
      ctx.lineWidth = 2 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(w * 0.18, -2);
      ctx.lineTo(w * 1.08, -2);
      ctx.stroke();
      ctx.fillStyle = '#cfd6d9';
      ctx.fillRect(w * 1.13, -4, 6, 8);
      ctx.restore();
    } else if (type === 'rocketeer') {
      const aimTarget = game ? game.player : null;
      const aimX = aimTarget ? aimTarget.x + aimTarget.w / 2 : cx + dir * w;
      const aimY = aimTarget ? aimTarget.y + aimTarget.h / 2 : sy + h * 0.20;
      const tubeX = cx - dir * w * 0.18;
      const tubeY = sy + h * 0.30;
      const aimAngle = Math.atan2(aimY - tubeY, aimX - tubeX);
      const tubeAngle = (dir >= 0 ? 0 : Math.PI) + aimAngle * 0.35 - dir * 0.22;
      const glow = this.element ? this.elementColors.accent : '#79d8ff';
      ctx.fillStyle = '#162331';
      ctx.fillRect(sx + w * 0.28, sy + h * 0.34, w * 0.42, h * 0.46);
      ctx.fillStyle = '#536475';
      ctx.beginPath();
      ctx.ellipse(cx, sy + h * 0.22, w * 0.24, h * 0.13, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10151d';
      ctx.lineWidth = 5.5 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cx - dir * w * 0.12, sy + h * 0.64);
      ctx.lineTo(cx - dir * w * 0.34, sy + h * 1.02);
      ctx.moveTo(cx + dir * w * 0.18, sy + h * 0.66);
      ctx.lineTo(cx + dir * w * 0.46, sy + h * 1.02);
      ctx.stroke();
      ctx.save();
      ctx.translate(tubeX, tubeY);
      ctx.rotate(tubeAngle);
      ctx.fillStyle = '#0c1118';
      ctx.strokeStyle = '#7d8ea0';
      ctx.lineWidth = 2 * strokeScale;
      ctx.fillRect(-w * 0.22, -h * 0.13, w * 1.28, h * 0.26);
      ctx.strokeRect(-w * 0.22, -h * 0.13, w * 1.28, h * 0.26);
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.12);
      ctx.beginPath();
      ctx.arc(w * 1.06, 0, h * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#dcecff';
      ctx.fillRect(w * 0.18, -h * 0.04, w * 0.36, h * 0.08);
      ctx.restore();
    } else if (type === 'flyer') {
      const flap = Math.sin(t * 0.25) * 5;
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.25, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d3d5d';
      ctx.lineWidth = 3 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.16, cy - h * 0.05);
      ctx.quadraticCurveTo(cx - w * 0.72, cy - h * 0.44 - flap, cx - w * 0.92, cy + h * 0.12);
      ctx.moveTo(cx + w * 0.16, cy - h * 0.05);
      ctx.quadraticCurveTo(cx + w * 0.72, cy - h * 0.44 + flap, cx + w * 0.92, cy + h * 0.12);
      ctx.stroke();
      ctx.fillStyle = '#101015';
      ctx.beginPath();
      ctx.arc(cx + dir * w * 0.08, cy - h * 0.02, w * 0.10, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'flyshooter') {
      ctx.fillStyle = '#65758a';
      ctx.fillRect(sx + w * 0.18, sy + h * 0.28, w * 0.66, h * 0.18);
      ctx.strokeStyle = '#252a35';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.10, sy + h * 0.43);
      ctx.lineTo(sx - w * 0.36, sy + h * 0.40);
      ctx.moveTo(sx + w * 0.90, sy + h * 0.43);
      ctx.lineTo(sx + w * 1.36, sy + h * 0.40);
      ctx.stroke();
      ctx.fillStyle = '#a5f0ff';
      for (let i = 0; i < 3; i++) ctx.fillRect(sx + w * (0.30 + i * 0.18), sy + h * 0.50, 4, 4);
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = '#9ff';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.26, sy + h * 0.58);
      ctx.lineTo(cx + w * 0.26, sy + h * 0.58);
      ctx.lineTo(cx + w * 0.42, sy + h * 1.08);
      ctx.lineTo(cx - w * 0.42, sy + h * 1.08);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (type === 'satellite') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.08);
      ctx.fillStyle = '#6e86a8';
      ctx.fillRect(sx + w * 0.18, sy + h * 0.28, w * 0.64, h * 0.18);
      ctx.fillStyle = '#111923';
      ctx.fillRect(sx + w * 0.28, sy + h * 0.16, w * 0.44, h * 0.34);
      ctx.strokeStyle = '#9fb6d8';
      ctx.lineWidth = 3 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.18, sy + h * 0.38);
      ctx.lineTo(sx - w * 0.20, sy + h * 0.20);
      ctx.moveTo(sx + w * 0.82, sy + h * 0.38);
      ctx.lineTo(sx + w * 1.20, sy + h * 0.20);
      ctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.25;
      ctx.fillStyle = this.element ? this.elementColors.accent : '#8fd6ff';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.18, sy + h * 0.55);
      ctx.lineTo(cx + w * 0.18, sy + h * 0.55);
      ctx.lineTo(cx + w * 0.30, sy + h * 1.12);
      ctx.lineTo(cx - w * 0.30, sy + h * 1.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (type === 'shielded' || type === 'protector') {
      ctx.fillStyle = type === 'protector' ? '#143224' : '#30412c';
      ctx.fillRect(sx + w * 0.27, sy + h * 0.18, w * 0.46, h * 0.58);
      ctx.fillStyle = type === 'protector' ? '#62d989' : '#d7d0bd';
      ctx.beginPath();
      ctx.moveTo(cx, sy + h * 0.04);
      ctx.lineTo(sx + w * 0.74, sy + h * 0.18);
      ctx.lineTo(sx + w * 0.26, sy + h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = type === 'protector' ? '#62d989' : '#c9d0c9';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cx + dir * w * 0.10, sy + h * 0.42);
      ctx.lineTo(cx + dir * w * 0.70, sy + h * 0.18);
      ctx.lineTo(cx + dir * w * 0.50, sy + h * 0.56);
      ctx.stroke();
    } else if (type === 'charger') {
      ctx.fillStyle = '#2f201b';
      ctx.beginPath();
      ctx.ellipse(frontX - dir * w * 0.22, sy + h * 0.34, w * 0.24, h * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9c0a6';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(frontX - dir * w * 0.18, sy + h * 0.20);
      ctx.lineTo(frontX + dir * w * 0.28, sy + h * 0.00);
      ctx.moveTo(frontX - dir * w * 0.18, sy + h * 0.38);
      ctx.lineTo(frontX + dir * w * 0.28, sy + h * 0.54);
      ctx.stroke();
      ctx.fillStyle = '#0d0706';
      ctx.beginPath();
      ctx.arc(frontX - dir * w * 0.14, sy + h * 0.31, 3 * strokeScale, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'bouncer') {
      ctx.fillStyle = '#2c2f22';
      ctx.beginPath();
      ctx.ellipse(cx, sy + h * 0.24, w * 0.25, h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#211';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cx, sy + h * 0.22);
      ctx.lineTo(cx + dir * w * 0.58, sy - h * 0.02);
      ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.fillRect(cx + dir * w * 0.48 - (dir < 0 ? 10 : 0), sy - h * 0.08, 10, 10);
      ctx.strokeStyle = '#6e7248';
      ctx.lineWidth = 3 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.24, sy + h * 0.70);
      ctx.lineTo(sx + w * 0.06, sy + h * 1.02);
      ctx.moveTo(sx + w * 0.76, sy + h * 0.70);
      ctx.lineTo(sx + w * 0.94, sy + h * 1.02);
      ctx.stroke();
    } else if (type === 'jumper') {
      ctx.fillStyle = '#3a2634';
      ctx.beginPath();
      ctx.ellipse(cx, sy + h * 0.30, w * 0.25, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c6a82';
      ctx.lineWidth = 4 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.32, sy + h * 0.60);
      ctx.lineTo(sx - w * 0.06, sy + h * 0.98);
      ctx.moveTo(sx + w * 0.68, sy + h * 0.60);
      ctx.lineTo(sx + w * 1.06, sy + h * 0.98);
      ctx.stroke();
    } else if (type === 'deflector') {
      ctx.fillStyle = '#aac';
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.08, sy + h * 0.24);
      ctx.lineTo(cx, sy - h * 0.12);
      ctx.lineTo(sx + w * 1.08, sy + h * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d9d9e2';
      ctx.lineWidth = 3 * strokeScale;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.10, sy + h * 0.58);
      ctx.lineTo(sx + w * 0.96, sy + h * 0.18);
      ctx.stroke();
    }

    if (!this.flying && type !== 'attacker') {
      ctx.fillStyle = this.flashTimer > 0 ? '#111' : '#f4d6b0';
      ctx.fillRect(faceX, sy + h * 0.25, Math.max(3, w * 0.10), 3);
      ctx.fillStyle = '#190707';
      ctx.fillRect(faceX + dir * 2, sy + h * 0.35, dir * Math.max(6, w * 0.20), 2);
    }
    ctx.restore();
  }

  render(ctx, cam, game) {
    this._syncElementState();
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
    const counterpartBossTypes = ['walker', 'shooter', 'jumper', 'bouncer', 'rocketeer', 'charger', 'shielded', 'flyer', 'flyshooter'];
    const usesCounterpartArt = counterpartBossTypes.includes(this.bossType);

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
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Inner eye
      ctx.fillStyle = this.attackerInvulnerable ? '#f88' : '#866';
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ghost: transparent body
      const windPhasing = this.element === 'wind' && this.windPhaseTimer > 0;
      if (this.element === 'ghost') {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin((game ? game.tick : 0) * 0.08);
      } else if (windPhasing) {
        ctx.save();
        const phase = Math.max(0, this.windPhaseTimer / (this.big ? 75 : 55));
        ctx.globalAlpha = 0.1 + phase * 0.28;
      }
      const baseColor = this.freezeTimer > 0 ? '#88eeff' : (this.flashTimer > 0 ? '#fff' : this.color);
      this._renderEnemySilhouette(ctx, sx, sy, baseColor, this.type);
      if (this.element === 'ghost' || windPhasing) ctx.restore();
    }

    this._renderEnemyDetails(ctx, sx, sy, game);

    // Soak drip particles
    if (this.soakTimer > 0 && Math.random() < 0.15) {
      game.effects.push(new Effect(this.x + Math.random() * this.w, this.y + this.h, '#48f', 3, 1, 8));
    }

    this._renderChainBubble(ctx, sx, sy, game);

    if (this.elementArmorMax > 0 && this.elementArmor > 0) {
      const armorColor = this.element === 'steel' ? '#d8e0e8' : '#f86';
      const pct = this.elementArmor / this.elementArmorMax;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(sx, sy - 10, this.w, 4);
      ctx.fillStyle = armorColor;
      ctx.fillRect(sx, sy - 10, this.w * pct, 4);
      ctx.strokeStyle = armorColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy - 10, this.w, 4);
      ctx.restore();
    }

    if (this._spikySpikeWarning()) {
      const warnColor = '#f86';
      const label = 'SPIKES SOON';
      const pulse = 0.35 + 0.35 * Math.sin((game ? game.tick : 0) * 0.35);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = warnColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = warnColor;
      ctx.shadowBlur = 14 + pulse * 12;
      ctx.strokeRect(sx - 5, sy - 5, this.w + 10, this.h + 10);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = warnColor;
      //ctx.fillText(label, sx + this.w / 2 - ctx.measureText(label).width / 2, sy - 16);
      ctx.restore();
    }

    if (this._spikySpikesActive()) {
      ctx.save();
      const phase = this.spikySpikeTimer / (this.big ? 95 : 70);
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#f86';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f64';
      ctx.shadowBlur = 10;
      ctx.strokeRect(sx - 4, sy - 4, this.w + 8, this.h + 8);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f86';
      //ctx.fillText('SPIKES', sx + this.w / 2 - 17, sy - 14);
      ctx.fillRect(sx, sy - 6, this.w * phase, 2);
      ctx.restore();
    }

    // Elemental aura
    if (this.element && this.elementColors) {
      const tick = game ? game.tick : 0;

      if (this._spikySpikesActive()) {
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
          ctx.globalAlpha = shAlpha + 0.15;
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#5b351c';
          ctx.fillRect(-4, -(this.h * 0.58), 9, this.h * 1.16);
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#7a4a27';
          ctx.fillRect(-2, -(this.h * 0.55), 3, this.h * 1.1);
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#3a2213';
          ctx.fillRect(-4, -1, 9, 2);
          ctx.strokeStyle = this.shieldFlash > 0 ? '#fff' : '#24150c';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-4, -(this.h * 0.58), 9, this.h * 1.16);
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
        ctx.fillStyle = '#2f3b2b';
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
      case 'flyshooter':
        if (this.flyerDashState === 'prepare') {
          const pulse = Math.sin(this.flyerDashTimer * 0.5) * 0.4 + 0.6;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ff0';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('!', sx + this.w / 2 - 3, sy - 8);
          ctx.globalAlpha = 1;
        }
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
        if (this.auraRadius > 0 && this.shieldHp > 0) {
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
    if (this.contactTick > 20 && this.type !== 'shooter' && this.type !== 'rocketeer' && this.type !== 'flyshooter' && this.type !== 'attacker') {
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
    const forceHpBar = this.isMissionMiniboss || this.missionMinibossRole || this.isRouteEscapeTarget;
    if (this.hp < this.maxHp || forceHpBar) {
      const barW = this.w + 6;
      const barX = sx + this.w / 2 - barW / 2;
      const barY = sy - 10;
      ctx.fillStyle = '#400';
      ctx.fillRect(barX, barY, barW, 4);
      const displayHp = Number.isFinite(this.displayHp) ? this.displayHp : this.hp;
      const displayRatio = Math.max(0, Math.min(1, displayHp / Math.max(1, this.maxHp)));
      const hpRatio = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f66';
        ctx.fillRect(barX, barY, barW * displayRatio, 4);
      }
      ctx.fillStyle = '#f44';
      ctx.fillRect(barX, barY, barW * hpRatio, 4);
    }
    if (this.maxStance && (this.stance < this.maxStance || this.disableTimer > 0)) {
      const barW = this.w + 6;
      const barX = sx + this.w / 2 - barW / 2;
      const barY = sy - (this.hp < this.maxHp ? 16 : 10);
      const stanceRatio = this.disableTimer > 0 ? 0 : Math.max(0, this.displayStance / this.maxStance);
      ctx.fillStyle = '#1c1630';
      ctx.fillRect(barX, barY, barW, 3);
      ctx.fillStyle = '#f4f0ff';
      ctx.fillRect(barX, barY, barW * stanceRatio, 3);
      ctx.strokeStyle = '#7a5cff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, 3);
    }

    // Shield pips
    if ((this.type === 'shielded' || this.type === 'protector') && this.shieldMax > 0) {
      const pipColor = this.type === 'protector' ? '#4f8' : '#5ff';
      const pipW = this.type === 'protector' ? 3 : 5;
      const pipGap = this.type === 'protector' ? 5 : 7;
      const totalW = this.shieldMax * pipGap;
      const pipBump = this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.5) * 2 : 0;
      const pipStartX = sx + this.w / 2 - totalW / 2 + pipBump;
      const pipY = sy - (this.maxStance && (this.stance < this.maxStance || this.disableTimer > 0) ? (this.hp < this.maxHp ? 23 : 17) : 16);
      for (let i = 0; i < this.shieldMax; i++) {
        ctx.fillStyle = i < this.shieldHp ? pipColor : '#234';
        ctx.fillRect(pipStartX + i * pipGap, pipY, pipW, 3);
      }
    }

    // Protector aura protection indicator — small shield above protected enemies
    if (this.type !== 'protector' && this.type !== 'attacker' && game) {
      for (const other of game.enemies) {
        if (other.dead || other.type !== 'protector' || other === this || other.shieldHp <= 0) continue;
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
    // Disabled / stagger glow
    if (this.disableTimer > 0) {
      const tick = game ? game.tick : 0;
      const dp = 0.55 + 0.35 * Math.sin(tick * 0.18);
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      ctx.save();
      ctx.globalAlpha = dp;
      ctx.shadowColor = '#c04fff';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = '#f4f0ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - 3, sy - 3, this.w + 6, this.h + 6);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(this.w, this.h) * 0.78 + Math.sin(tick * 0.22) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f4f0ff';
      ctx.shadowBlur = 20 + dp * 18;
      ctx.fillStyle = '#f4f0ff';
      ctx.fillText('\u2620', cx, sy - 24 + Math.sin(tick * 0.2) * 2);
      ctx.font = 'bold 8px monospace';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#fff';
      ctx.fillText('FINISH', cx, sy - 9);
      ctx.restore();
    }
    if (spawning) ctx.restore();
  }
}

// ── Boss (extends Enemy) ─────────────────────────────────────
class Boss extends Enemy {
  constructor(x, y, bossType, wave, hpScale) {
    // Call Enemy constructor with boss type, not big, and wave
    super(x, y, bossType, false, wave, hpScale);
    this.bossType = bossType;
    // Override dimensions — boss is bigger than any regular enemy
    this.w = 56; this.h = 56;
    // Override HP with the map-distance scale when provided.
    this.hp = (ENEMY_STATS[bossType].bossBase || 200) * (hpScale || wave);
    this.maxHp = this.hp;
    this.displayHp = this.hp;
    const bossHits = {
      walker: 36, shooter: 36, jumper: 40, bouncer: 44, rocketeer: 46, charger: 48,
      shielded: 48, deflector: 52, protector: 60, attacker: 42,
      flyer: 38, flyshooter: 42
    };
    const bossScale = 1 + Math.max(0, (wave || 1) - 1) * 0.10;
    this.hp = Math.ceil((bossHits[bossType] || 40) * bossScale * 8);
    this.maxHp = this.hp;
    this.displayHp = this.hp;
    this.maxStance = Math.max(16, Math.ceil(this.maxHp / 2));
    this.stance = this.maxStance;
    this.displayStance = this.stance;
    // Override contact damage — boss takes 3 hits to kill player
    const _ehp = [0,16,24,34,46,60,73,89,107,127,148][Math.min(wave, 10)] || 148;
    const _arm = [0,1,2,4,6,8,10,13,15,18,21][Math.min(wave, 10)] || 21;
    this.contactDmg = Math.max(1, Math.round(_ehp * 0.70 + _arm));
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
      bouncer: '#c5c', rocketeer: '#79d8ff', shielded: '#5cc', deflector: '#88a',
      protector: '#8a6416', attacker: '#4a1f24', flyer: '#312032', flyshooter: '#242a35'
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
    this._syncElementState();
    this._updateWindPhase(game);
    this._updateSpikySpikes(game);
    this._tryLightningTeleport(game);
    this.displayHp = lerp(this.displayHp, this.hp, 0.12);
    if (this.contactTick > 0) this.contactTick--;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.shieldFlash > 0) this.shieldFlash--;
    if (this.damageIframes > 0) this.damageIframes--;
    this._updateStance();
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
    if (this.chainBubbleTimer > 0) {
      this.chainBubbleTimer--;
      this.vx = 0;
      this.vy = -0.25;
      this.y -= 0.25 + Math.sin(this.chainBubbleTimer * 0.16) * 0.18;
      this.freezeTimer = Math.max(this.freezeTimer || 0, 2);
      if (game && this.chainBubbleTimer % 8 === 0) {
        game.effects.push(new Effect(this.x + this.w / 2 + randInt(-16, 16), this.y + this.h / 2 + randInt(-16, 16), '#8cf', 5, 1.8, 10));
      }
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
      // Paralysis DOT — noticeable, but not a percent-health boss killer.
      if (this.paralyseTimer % 30 === 0) {
        const pdmg = Math.max(1, Math.round(this.maxHp * 0.05));
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

    const target = game._chooseEnemyTarget ? game._chooseEnemyTarget(this) : game.player;
    const targetBox = target && target.getHurtbox ? target.getHurtbox() : target;
    const targetIsPlayer = target === game.player;
    const playerStealthed = targetIsPlayer && game.player.ninjaType === 'shadow' && game.player.shadowStealth > 180;
    const px = playerStealthed ? (this.x + this.facing * 100) : (targetBox.x + targetBox.w / 2);
    const py = playerStealthed ? this.y : (targetBox.y + targetBox.h / 2);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    if (!playerStealthed) this.facing = dx > 0 ? 1 : -1;
    this.stateTimer++;
    this.actionTimer++;

    const canShoot = (this.bossType === 'shooter' || this.bossType === 'bouncer' || this.bossType === 'rocketeer' || this.bossType === 'flyshooter');
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
              const col = this.element ? this.elementColors.accent : '#f44';
              game.hitLines.push(new HitLine(cx, cy, (dx / sd) * 4.5, (dy / sd) * 4.5, col, this.contactDmg, 'boss', {
                element: this.element, maxTimer: this.phase === 2 ? 34 : 42, flashDur: 22, activeDur: 20,
                width: this.phase === 2 ? 22 : 18, sourceType: 'attacker'
              }));
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
                // Bouncer boss (flying): grenades
                const bDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 3 : 2;
                for (let si = 0; si < shots; si++) {
                  const spread = (si - (shots - 1) / 2) * 0.2;
                  const dir = dx > 0 ? 1 : -1;
                  const lobSpd = (6 + Math.random() * 1.5) * 0.65;
                  const highAngle = -Math.PI * 0.38 - Math.random() * 0.1;
                  const bvx = dir * Math.cos(highAngle) * lobSpd + spread * 0.65;
                  const bvy = Math.sin(highAngle) * lobSpd;
                  const col = this.element ? this.elementColors.accent : '#f6f';
                  game.grenades.push(new Grenade(cx + dir * 8, cy - 6, bvx, bvy, col, bDmg, 'boss', {
                    element: this.element, gravScale: 0.42, fuseTimer: 90 + randInt(0, 20),
                    bouncesLeft: this.phase === 2 ? 5 : 3, explodeRadius: 75
                  }));
                }
              } else if (this.bossType === 'rocketeer') {
                const rDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 2 : 1;
                const col = this.element ? this.elementColors.accent : '#79d8ff';
                for (let si = 0; si < shots; si++) {
                  const offset = (si - (shots - 1) / 2) * 70;
                  game.hitLines.push(new EnergyBlastCircle(
                    Math.max(40, Math.min(game.levelW - 40, px + offset + randInt(-20, 20))),
                    Math.max(game.camera.y + 35, Math.min(500, py + randInt(-8, 18))),
                    this.phase === 2 ? 86 : 74,
                    col,
                    rDmg,
                    'boss',
                    { element: this.element, maxTimer: 55, flashDur: 18, sourceType: 'rocketeer', originX: cx, originY: cy - 10 }
                  ));
                }
              } else if (this.bossType === 'shooter') {
                // Shooter boss (flying): hitline spread
                const sDmg = Math.max(1, Math.round(this._bossEhp / 6 + this._bossArm));
                const count = this.phase === 2 ? 5 : 3;
                const arc = this.phase === 2 ? 0.5 : 0.35;
                const col = this.element ? this.elementColors.accent : '#f44';
                game.hitLines.push(new HitLine(cx, cy, (dx / d) * 5, (dy / d) * 5, col, sDmg, 'boss', {
                  element: this.element, count, arc, maxTimer: 35
                }));
              } else {
                // flyshooter boss (flying): three-line hitline
                const col = this.element ? this.elementColors.accent : '#f44';
                game.hitLines.push(new HitLine(cx, cy, (dx / d) * 5, (dy / d) * 5, col, Math.max(1, Math.round(this._bossEhp / 4 + this._bossArm)), 'boss', {
                  element: this.element, count: 3, arc: 0.42, maxTimer: 35
                }));
              }
            }
          }
          if (this.stateTimer > 80) {
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
        const legacyItemsOn = !game._legacyBossItemsEnabled || game._legacyBossItemsEnabled();
        if (legacyItemsOn && game.player.items.friendsLetter && !this.friendly) {
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
            const slamTarget = game._nearestFriendlyInRadius ? game._nearestFriendlyInRadius(cx, this.y + this.h, 95, this) : (Math.abs(dx) < 80 && Math.abs(dy) < 60 ? game.player : null);
            if (slamTarget && !slamTarget.slamming) {
              const kbDir = Math.sign(game._entityCenterX(slamTarget) - cx) || 1;
              game._applyFriendlyKnockback(slamTarget, this, kbDir * 18, -9, 12);
              const slamDmg = Math.max(this.contactDmg, Math.round(this.contactDmg * (this.bossType === 'jumper' ? 1.25 : 1.1)));
              game._damageFriendlyTarget(slamTarget, slamDmg, this.element || null, { type: this.bossType, element: this.element, isBoss: true });
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
                // Bouncer boss (ground): grenades
                const bDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 3 : 2;
                for (let si = 0; si < shots; si++) {
                  const spread = (si - (shots - 1) / 2) * 0.2;
                  const dir = dx > 0 ? 1 : -1;
                  const lobSpd = (6 + Math.random() * 1.5) * 0.65;
                  const highAngle = -Math.PI * 0.38 - Math.random() * 0.1;
                  const bvx = dir * Math.cos(highAngle) * lobSpd + spread * 0.65;
                  const bvy = Math.sin(highAngle) * lobSpd;
                  const col = this.element ? this.elementColors.accent : '#f6f';
                  game.grenades.push(new Grenade(cx + dir * 8, cy - 6, bvx, bvy, col, bDmg, 'boss', {
                    element: this.element, gravScale: 0.42, fuseTimer: 90 + randInt(0, 20),
                    bouncesLeft: this.phase === 2 ? 5 : 3, explodeRadius: 80
                  }));
                }
              } else if (this.bossType === 'rocketeer') {
                const rDmg = Math.max(1, Math.round(this._bossEhp / 5 + this._bossArm));
                const shots = this.phase === 2 ? 2 : 1;
                const col = this.element ? this.elementColors.accent : '#79d8ff';
                for (let si = 0; si < shots; si++) {
                  const offset = (si - (shots - 1) / 2) * 72;
                  game.hitLines.push(new EnergyBlastCircle(
                    Math.max(40, Math.min(game.levelW - 40, px + offset + randInt(-22, 22))),
                    Math.max(game.camera.y + 35, Math.min(500, py + randInt(-8, 18))),
                    this.phase === 2 ? 88 : 76,
                    col,
                    rDmg,
                    'boss',
                    { element: this.element, maxTimer: 56, flashDur: 18, sourceType: 'rocketeer', originX: cx, originY: cy - 10 }
                  ));
                }
              } else if (this.bossType === 'shooter') {
                // Shooter boss (ground): hitline spread
                const sDmg = Math.max(1, Math.round(this._bossEhp / 6 + this._bossArm));
                const count = this.phase === 2 ? 5 : 3;
                const arc = this.phase === 2 ? 0.5 : 0.35;
                const col = this.element ? this.elementColors.accent : '#f44';
                game.hitLines.push(new HitLine(cx, cy, (dx / d) * 5, (dy / d) * 5, col, sDmg, 'boss', {
                  element: this.element, count, arc, maxTimer: 35
                }));
              } else {
                // flyshooter boss (ground): three-line hitline
                const col = this.element ? this.elementColors.accent : '#f44';
                game.hitLines.push(new HitLine(cx, cy, (dx / d) * 5, (dy / d) * 5, col, Math.max(1, Math.round(this._bossEhp / 4 + this._bossArm)), 'boss', {
                  element: this.element, count: 3, arc: 0.42, maxTimer: 35
                }));
              }
            }
          }
          if (this.stateTimer > 85) {
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
    const contactTarget = game._firstOverlappingFriendly ? game._firstOverlappingFriendly(this, this) : (rectOverlap(this, game.player.getHurtbox()) ? game.player : null);
    if (this.contactTick <= 0 && contactTarget && !contactTarget.slamming) {
      const kbDir = Math.sign(game._entityCenterX(contactTarget) - (this.x + this.w / 2)) || 1;
      const isShieldCharge = (this.bossType === 'shielded' || this.bossType === 'protector') && this.chargeState === 'charging';
      const isDashHit = isShieldCharge || this.flyerDashState === 'dashing';
      if (isDashHit) {
        game._applyFriendlyKnockback(contactTarget, this, kbDir * 22, -5, 14);
        const chargeDmg = Math.round(this.contactDmg * (isShieldCharge ? 1.5 : 1.15));
        game._damageFriendlyTarget(contactTarget, chargeDmg, this.element || null, { type: this.bossType, element: this.element, isBoss: true });
        if (isShieldCharge) {
          this.chargeState = 'recoil';
          this.chargeTimer = 0;
          this.vx = -this.facing * speed * 3;
          this.vy = -8;
        }
      } else {
        game._applyFriendlyKnockback(contactTarget, this, kbDir * 18, -9, 12);
        game._damageFriendlyTarget(contactTarget, Math.max(1, Math.round(this.contactDmg * 0.35)), this.element || null, { type: this.bossType, element: this.element, isBoss: true });
      }
      this.contactTick = 45;
    }
  }

  takeDamage(amount, game, fromX, attackElement, sourceType, sourceActor) {
    if (this.dead) return false;
    if (this.friendly) return false;
    this._syncElementState();
    if (this.element === 'wind' && this.windPhaseTimer > 0) {
      this.flashTimer = 3;
      game.effects.push(new TextEffect(this.x + this.w / 2 - 14, this.y - 10, 'PHASED', '#bfb'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#bfb', 10, 2, 10));
      return false;
    }
    // Ghost: immune to blade & shuriken
    if (this.element === 'ghost' && (sourceType === 'sword' || sourceType === 'shuriken')) {
      this.flashTimer = 4;
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'IMMUNE', '#6f6'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#8f8', 6, 2, 10));
      return false;
    }
    // Spiky: reflect sword damage back to the sword user
    if (this._spikySpikesActive() && sourceType === 'sword' && game && game.player) {
      const reflDmg = Math.max(1, Math.round(amount * 0.5));
      const reflectTarget = sourceActor && sourceActor.takeDamage ? sourceActor : game.player;
      reflectTarget.takeDamage(reflDmg, game, 'spike', { type: this.bossType, element: 'spiky', isBoss: true });
      game.effects.push(new TextEffect(this.x + this.w / 2 - 16, this.y - 10, 'REFLECT', '#f86'));
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f64', 8, 3, 10));
      this.flashTimer = 6;
      amount = Math.max(1, Math.round(amount * 0.5));
    }
    // Attacker boss: protected when enemies are nearby, but still takes reduced damage.
    if (this.attackerInvulnerable) {
      this.flashTimer = 4;
      game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#f44', 6, 2, 8));
      amount = Math.max(1, Math.round(amount * 0.35));
    }

    const hasActiveBossShield = (this.bossType === 'shielded' || this.bossType === 'protector') && this.shieldHp > 0;
    const rawAmount = amount;

    // ── Chain strike: only sword hits cash out disabled bosses. Other damage
    // sources may hurt them, but should not erase the skull/finish window.
    if (this.disableTimer > 0 && sourceType === 'sword' && game && game.player && !game.player.staggerChaining) {
      return this._startStanceChain(game);
    }
    if (sourceType === 'chain') {
      this.stunTimer = Math.max(this.stunTimer || 0, 28);
      this.vx *= 0.45;
      this.vy *= 0.45;
    }

    // ── Stagger bar ──
    const combatDamage = this._damageProfile(amount, sourceType);
    if (!hasActiveBossShield) this._applyStanceDamage(combatDamage.stance, game);
    amount = combatDamage.hp;

    // Shield check — only swords remove shield pips
    let shieldBlocked = false;
    if ((sourceType === 'sword' || sourceType === 'chain') && this._shieldBlocks(fromX, undefined, game)) {
      shieldBlocked = true;
      const legacyItemsOn = !game || !game._legacyBossItemsEnabled || game._legacyBossItemsEnabled();
      const pickaxeHits = (legacyItemsOn && game && game.player && game.player.items.pickaxe) ? 2 : 1;
      this.shieldHp -= pickaxeHits;
      this.shieldFlash = 6;
      this.shieldBump = 8;
      const shieldColor = this.bossType === 'protector' ? '#f3d06a' : '#5ff';
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
      this._applyStanceDamage(0.5, game);
    }
    this.hp -= amount;
    this.hp = Math.round(this.hp);
    if (!shieldBlocked) this.flashTimer = 8;
    const atkEl = game && game.player ? NINJA_ATTACK_ELEMENTS[game.player.ninjaType] : null;
    game.effects.push(new DamageNumber(this.x + this.w / 2, this.y, amount, atkEl));
    if (game && (sourceType === 'sword' || sourceType === 'shuriken' || sourceType === 'chain')) {
      game.effects.push(new BloodSpill(
        this.x + this.w / 2,
        this.y + this.h * (0.35 + Math.random() * 0.35),
        fromX,
        sourceType === 'chain' ? 2.2 : 1.65
      ));
    }
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
    const chainKilled = game && game.player && game.player.staggerChaining;
    triggerHitstop(chainKilled ? 44 : 10);
    triggerScreenShake(8, 15);
    game.effects.push(new AngledDeathFade(this.x, this.y, this.w, this.h, '#8b1018', { type: this.bossType, boss: true, life: 118, splat: true }));
    if (chainKilled) {
      game.effects.push(new ScreenFlash('#fff', 0.35, 18));
    }
    game.bossDeathRewardDelay = Math.max(game.bossDeathRewardDelay || 0, 220);
    // Track boss kill for bestiary
    recordBestiaryKill(this.bossType, false, true);
    /*
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
    */
    game.bossRewardItem = null;
    if (game && game._dropRandomClassOrb) {
      game._dropRandomClassOrb(this.x + this.w / 2, this.y + this.h / 2);
    }
  }

  render(ctx, cam, game) {
    // Charge dash trails
    if (this.chargeTrails && this.chargeTrails.length) {
      const trailColor = this.bossType === 'protector' ? '#f3d06a' : (this.bossType === 'flyer' || this.bossType === 'flyshooter') ? '#8c8' : '#5ff';
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
    const counterpartBossTypes = ['walker', 'shooter', 'jumper', 'bouncer', 'rocketeer', 'charger', 'shielded', 'flyer', 'flyshooter'];
    const usesCounterpartArt = counterpartBossTypes.includes(this.bossType);

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

    const windPhasing = this.element === 'wind' && this.windPhaseTimer > 0;

    // Ghost boss: transparent body
    if (this.element === 'ghost') {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin((game ? game.tick : 0) * 0.08);
    }
    if (windPhasing) {
      ctx.save();
      const phase = Math.max(0, this.windPhaseTimer / (this.big ? 75 : 55));
      ctx.globalAlpha = 0.1 + phase * 0.28;
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
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orbCx, orbCy, orbR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
      this._renderEnemySilhouette(ctx, sx, sy, bodyColor, 'protector');
      // Helmet with visor
      ctx.fillStyle = '#9a741d';
      ctx.fillRect(sx - 3, sy - 8, this.w + 6, 14);
      // Visor slit
      ctx.fillStyle = '#3b2a0b';
      ctx.fillRect(sx + 6, sy - 4, this.w - 12, 5);
      // Glowing eyes behind visor
      const eyePulse = 0.7 + 0.3 * Math.sin((game ? game.tick : 0) * 0.1);
      ctx.save();
      ctx.shadowColor = '#ffd35a';
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(255,220,95,${eyePulse})`;
      ctx.fillRect(sx + 12, sy - 4, 7, 4);
      ctx.fillRect(sx + this.w - 19, sy - 4, 7, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
      // Helmet crest/plume
      ctx.fillStyle = '#d6a72e';
      ctx.fillRect(sx + this.w / 2 - 3, sy - 16, 6, 10);
      ctx.fillRect(sx + this.w / 2 - 5, sy - 16, 10, 4);
      // Shoulder pauldrons
      ctx.fillStyle = '#7a5a17';
      ctx.fillRect(sx - 8, sy + 6, 10, 14);
      ctx.fillRect(sx + this.w - 2, sy + 6, 10, 14);
      ctx.fillStyle = '#f3d06a';
      ctx.fillRect(sx - 6, sy + 9, 3, 3);
      ctx.fillRect(sx + this.w + 1, sy + 9, 3, 3);
      // Chest plate
      ctx.fillStyle = '#7a5a17';
      ctx.fillRect(sx + 3, sy + 6, this.w - 6, this.h - 18);
      ctx.fillStyle = '#d6a72e';
      ctx.fillRect(sx + 4, sy + 7, this.w - 8, 4);
      ctx.fillStyle = '#4b350e';
      ctx.fillRect(sx + this.w / 2 - 1, sy + 11, 2, this.h - 28);
      // Belt
      ctx.fillStyle = '#4b350e';
      ctx.fillRect(sx, sy + this.h - 16, this.w, 5);
      ctx.fillStyle = '#f3d06a';
      ctx.fillRect(sx + this.w / 2 - 4, sy + this.h - 16, 8, 5);
      // Greaves
      ctx.fillStyle = '#7a5a17';
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
        ctx.fillStyle = bpShFlash ? '#fff' : '#8a6416';
        ctx.fillRect(-3, -(this.h * 0.6 + 4), 11, this.h * 1.2 + 8);
        // Shield border
        ctx.strokeStyle = bpShFlash ? '#fff' : '#4b350e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-2.5, -(this.h * 0.6 + 3.5), 10, this.h * 1.2 + 7);
        // Shield emblem (cross)
        ctx.fillStyle = bpShFlash ? '#fff' : '#f3d06a';
        ctx.fillRect(1, -(this.h * 0.35), 3, this.h * 0.7);
        ctx.fillRect(-2, -1.5, 9, 3);
        ctx.restore();
      } else {
        // Broken shield stub
        ctx.save();
        ctx.translate(bpShX, bpShY);
        ctx.rotate(bpAng);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#5c4212';
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
      this._renderEnemySilhouette(ctx, sx, sy, bodyColor, 'deflector');
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
      this._renderEnemySilhouette(ctx, sx, sy, bodyColor, this.bossType);
      this._renderEnemyDetails(ctx, sx, sy, game);

      // Flying wings
      if (this.flying && !usesCounterpartArt) {
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
        if (this.bossType === 'shielded') {
          ctx.globalAlpha = shieldAlpha + 0.2;
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#5b351c';
          ctx.fillRect(-6, -this.h * 0.46, 12, this.h * 0.92);
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#7a4a27';
          ctx.fillRect(-3, -this.h * 0.43, 3, this.h * 0.86);
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : '#3a2213';
          ctx.fillRect(-6, -2, 12, 4);
          ctx.strokeStyle = this.shieldFlash > 0 ? '#fff' : '#24150c';
          ctx.lineWidth = 3;
          ctx.strokeRect(-6, -this.h * 0.46, 12, this.h * 0.92);
        } else {
          ctx.fillStyle = this.shieldFlash > 0 ? '#fff' : `rgba(100,220,255,${shieldAlpha})`;
          ctx.fillRect(-3, -(this.h * 0.55), 6, this.h * 1.1);
          ctx.strokeStyle = this.shieldFlash > 0 ? '#fff' : `rgba(150,240,255,${shieldAlpha * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-3, -(this.h * 0.55), 6, this.h * 1.1);
        }
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

      if (!usesCounterpartArt) {
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
      }

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
    if (windPhasing) ctx.restore();

    this._renderChainBubble(ctx, sx, sy, game);

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

    if (this._spikySpikeWarning()) {
      const warnColor = '#f86';
      const label = 'SPIKES SOON';
      const pulse = 0.35 + 0.25 * Math.sin((game ? game.tick : 0) * 0.35);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = warnColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(sx - 8, sy - 8, this.w + 16, this.h + 16);
      ctx.restore();
      ctx.fillStyle = warnColor;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(label, sx + this.w / 2 - ctx.measureText(label).width / 2, sy - 42);
    }

    if (this._spikySpikesActive()) {
      const phase = this.spikySpikeTimer / (this.big ? 95 : 70);
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#f86';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - 7, sy - 7, this.w + 14, this.h + 14);
      ctx.restore();
      ctx.fillStyle = '#411';
      ctx.fillRect(sx, sy - 32, this.w, 4);
      ctx.fillStyle = '#f86';
      ctx.fillRect(sx, sy - 32, this.w * Math.max(0, phase), 4);
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
      const pipColor = this.bossType === 'protector' ? '#f3d06a' : '#5ff';
      const barW = this.w + 20;
      const pipW = Math.max(2, Math.floor(barW / this.shieldMax) - 1);
      const pipGap = barW / this.shieldMax;
      const bpipBump = this.shieldBump > 0 ? Math.sin(this.shieldBump * 1.5) * 3 : 0;
      const pipStartX = sx + this.w / 2 - barW / 2 + bpipBump;
      for (let i = 0; i < this.shieldMax; i++) {
        ctx.fillStyle = i < this.shieldHp ? pipColor : '#234';
        ctx.fillRect(pipStartX + i * pipGap, sy - 39, pipW, 3);
      }
    }

    // Protector boss: healing aura ring
    if (this.bossType === 'protector' && this.auraRadius > 0 && this.shieldHp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.05 * Math.sin((game ? game.tick : 0) * 0.05);
      ctx.strokeStyle = '#d6a72e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2, sy + this.h / 2, this.auraRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(214,167,46,0.07)';
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
      const displayRatio = Math.max(0, Math.min(1, this.displayHp / Math.max(1, this.maxHp)));
      const hpRatio = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f66';
        ctx.fillRect(barX, barY, barW * displayRatio, barH);
      }
      ctx.fillStyle = '#f44';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    }
    if (this.maxStance && (this.stance < this.maxStance || this.disableTimer > 0)) {
      const barW = this.w + 20;
      const barH = 4;
      const barX = sx + this.w / 2 - barW / 2;
      const barY = sy - 31;
      const stanceRatio = this.disableTimer > 0 ? 0 : Math.max(0, this.displayStance / this.maxStance);
      ctx.fillStyle = '#1c1630';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#f4f0ff';
      ctx.fillRect(barX, barY, barW * stanceRatio, barH);
      ctx.strokeStyle = '#7a5cff';
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
    // Disabled / stagger glow
    if (this.disableTimer > 0) {
      const dp = 0.55 + 0.35 * Math.sin(game.tick * 0.18);
      const cx = sx + this.w / 2;
      const cy = sy + this.h / 2;
      ctx.save();
      ctx.globalAlpha = dp;
      ctx.shadowColor = '#c04fff';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#f4f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(sx - 4, sy - 4, this.w + 8, this.h + 8);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(this.w, this.h) * 0.78 + Math.sin(game.tick * 0.22) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f4f0ff';
      ctx.shadowBlur = 24 + dp * 20;
      ctx.fillStyle = '#f4f0ff';
      ctx.fillText('\u2620', cx, sy - 48 + Math.sin(game.tick * 0.2) * 2);
      ctx.font = 'bold 9px monospace';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff';
      ctx.fillText('FINISH', cx, sy - 27);
      ctx.restore();
    }
    // Restore fade alpha
    if (_fading) ctx.restore();
  }
}
