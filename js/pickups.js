class TimedPickupOrb extends Orb {
  constructor(x, y, type, opts = {}) {
    super(x, y, type);
    this.w = opts.w || 20;
    this.h = opts.h || 20;
    this.radius = opts.radius || Math.max(this.w, this.h) / 2;
    this.life = opts.life || 600;
    this.maxLife = this.life;
    this.bobTimer = opts.bobTimer ?? Math.random() * Math.PI * 2;
    this.bobSpeed = opts.bobSpeed || 0.06;
    this.done = false;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.rare = false;
  }

  tickPickup() {
    if (this.done) return false;
    this.bobTimer += this.bobSpeed;
    this.life--;
    if (this.life <= 0) {
      this.done = true;
      return false;
    }
    return true;
  }

  drawState(cam, bobAmount = 6) {
    if (this.done) return null;
    if (this.life < 120 && Math.floor(this.life / 8) % 2) return null;
    return {
      alpha: this.life < 60 ? this.life / 60 : 1,
      x: this.x - cam.x,
      y: this.y + Math.sin(this.bobTimer) * bobAmount - cam.y,
    };
  }
}

class ShurikenPickupOrb extends TimedPickupOrb {
  constructor(x, y) {
    super(x, y, 'shuriken', { life: 600, bobSpeed: 0.06, w: 20, h: 20 });
  }

  static spawnInterval(game) {
    const routeCollect = game._routeObjectiveOfType && game._routeObjectiveOfType('collect');
    const collectMode = routeCollect || (game.currentObjective && game.currentObjective.type === 'collect');
    return collectMode ? 120 : ((game.player.items && game.player.items.tripleShuriken) ? 150 : 300);
  }

  static spawnPhase() {
    return 60;
  }

  static maxOnScreen(game) {
    return (game._routeObjectiveOfType && game._routeObjectiveOfType('collect')) || (game.currentObjective && game.currentObjective.type === 'collect') ? 6 : 3;
  }

  update(game) {
    if (!this.tickPickup()) return;
    const pl = game.player;
    if (!rectOverlap(pl, this)) return;

    this.done = true;
    SFX.pickup();
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    if (this.isObjectiveCache(game)) {
      this.collectObjectiveCache(game, cx, cy);
    }
    this.fireShurikens(game, pl, cx, cy);
  }

  isObjectiveCache(game) {
    const routeCollect = game._routeObjectiveOfType && game._routeObjectiveOfType('collect');
    const target = routeCollect ? routeCollect.target : (game._objectiveCollectTarget ? game._objectiveCollectTarget() : game.bossOrbsRequired);
    return (routeCollect || (game.currentObjective && game.currentObjective.type === 'collect')) &&
      !game.bossActive && !game.boss &&
      game.bossOrbsCollected < target;
  }

  collectObjectiveCache(game, cx, cy) {
    const routeCollect = game._routeObjectiveOfType && game._routeObjectiveOfType('collect');
    const target = routeCollect ? routeCollect.target : (game._objectiveCollectTarget ? game._objectiveCollectTarget() : 15);
    const marker = routeCollect && routeCollect.marker ? routeCollect.marker : { symbol: '\u2726', color: '#ccc' };
    game.bossOrbsRequired = target;
    game.bossOrbsCollected = Math.min(target, (game.bossOrbsCollected || 0) + 1);
    game.bossOrbCharge = 0;
    game.bossOrbCooldown = 0;
    game.effects.push(new Effect(cx, cy, marker.color, 10, 4, 15));
    const txt = game.bossOrbsCollected >= target
      ? marker.symbol + ' ROUTE READY!'
      : marker.symbol + ' ' + game.bossOrbsCollected + '/' + target;
    game.effects.push(new TextEffect(cx, cy - 38, txt, marker.color));
    if (!routeCollect && game.bossOrbsCollected >= target) game.spawnBoss();
  }

  fireShurikens(game, pl, cx, cy) {
    const color = (pl.ninjaType === 'fire') ? '#f93' :
      (pl.ninjaType === 'crystal') ? '#aff' :
      (pl.ninjaType === 'storm') ? '#48f' : '#ccc';
    const dmg = pl.type.attackDamage + pl.shurikenLevel;
    const chosenTargets = new Set();
    for (let i = 0; i < pl.maxShurikens; i++) {
      const isLastKunai = pl.items.theKunai && i === pl.maxShurikens - 1;
      const sProj = fireProjectileAtNearestEnemy({
        x: cx, y: cy, game, speed: 8 + i * 1.5, color: isLastKunai ? '#f66' : color,
        damage: dmg, owner: 'player', width: 8, height: 6, facing: pl.facing,
        piercing: true, preferBoss: false, ignoreLOS: true, excludeTargets: chosenTargets,
      });
      if (!sProj) continue;
      if (sProj.initialTarget) chosenTargets.add(sProj.initialTarget);
      this.applyShurikenTraits(sProj, pl, dmg, isLastKunai);
      if (pl.items.tripleShuriken) this.fireTripleShurikens(game, pl, cx, cy, color, dmg, isLastKunai, sProj, chosenTargets);
    }
    SFX.shuriken();
    game.effects.push(new Effect(cx, cy, '#ccc', 12, 5, 18));
    game.effects.push(new TextEffect(cx, cy - 22, '\u2726 SHURIKENS!', '#ccc'));
  }

  fireTripleShurikens(game, pl, cx, cy, color, dmg, isLastKunai, sourceProjectile, chosenTargets) {
    for (const triOff of [0.25, -0.25]) {
      const tProj = fireProjectileAtNearestEnemy({
        x: cx, y: cy, game, speed: 8, color: isLastKunai ? '#f66' : color,
        damage: dmg, owner: 'player', width: 8, height: 6, facing: 0,
        piercing: true, preferBoss: false, ignoreLOS: true, excludeTargets: chosenTargets,
      });
      if (!tProj) continue;
      if (tProj.initialTarget) chosenTargets.add(tProj.initialTarget);
      this.applyShurikenTraits(tProj, pl, dmg, false);
      const ta = Math.atan2(sourceProjectile.vy, sourceProjectile.vx) + triOff;
      const tsp = Math.sqrt(sourceProjectile.vx * sourceProjectile.vx + sourceProjectile.vy * sourceProjectile.vy);
      tProj.vx = Math.cos(ta) * tsp;
      tProj.vy = Math.sin(ta) * tsp;
    }
  }

  applyShurikenTraits(projectile, pl, dmg, isKunai) {
    projectile.isShuriken = true;
    if (pl.ninjaType === 'crystal') projectile.freezeDust = true;
    if (pl.ninjaType === 'shadow' || pl.ninjaType === 'storm') projectile.shadowParalyse = true;
    if (pl.items.homingShuriken) projectile.homing = true;
    if (!isKunai) return;
    projectile.isKunai = true;
    projectile.kunaiDmg = dmg * 2;
    projectile.kunaiMaxShurikens = pl.maxShurikens;
    projectile.life = 30;
  }

  render(ctx, cam, game) {
    const state = this.drawState(cam);
    if (!state) return;
    const routeCollect = game && game._routeObjectiveOfType && game._routeObjectiveOfType('collect');
    const marker = routeCollect && this.isObjectiveCache(game) ? routeCollect.marker : null;
    ctx.save();
    ctx.globalAlpha = state.alpha;
    ctx.translate(state.x + 10, state.y + 10);
    ctx.rotate(this.bobTimer * 1.5);
    ctx.fillStyle = '#e0e0e0';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ccc';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = a + Math.PI / 4;
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(b) * 4, Math.sin(b) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (marker) {
      ctx.rotate(-this.bobTimer * 1.5);
      ctx.shadowColor = marker.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = marker.color;
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(marker.symbol, 0, -16);
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

class BubbleShieldPickupOrb extends TimedPickupOrb {
  constructor(x, y) {
    super(x, y, 'bubbleshield', { life: 900, bobSpeed: 0.05, w: 20, h: 20 });
  }

  static spawnInterval() {
    return 1200;
  }

  static spawnPhase() {
    return 600;
  }

  static maxOnScreen() {
    return 1;
  }

  update(game) {
    if (!this.tickPickup()) return;
    const pl = game.player;
    if (!rectOverlap(pl, this) || pl.bubbleShieldTimer > 0) return;

    this.done = true;
    SFX.pickup();
    pl.bubbleShieldTimer = pl.bubbleShieldMax;
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    game.effects.push(new Effect(cx, cy, '#4af', 18, 5, 18));
    game.effects.push(new Effect(cx, cy, '#fff', 8, 3, 12));
    game.effects.push(new TextEffect(cx, cy - 22, '\u2B22 SHIELD!', '#4af'));
  }

  render(ctx, cam) {
    const state = this.drawState(cam);
    if (!state) return;
    ctx.save();
    ctx.globalAlpha = state.alpha;
    ctx.translate(state.x + 10, state.y + 10);
    ctx.shadowColor = '#4af';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(60,180,255,0.35)';
    ctx.strokeStyle = '#aef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -10);
    ctx.lineTo(10, -6);
    ctx.lineTo(10, 1);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 1);
    ctx.lineTo(-10, -6);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = state.alpha * 0.8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

class ElementalShieldPickupOrb extends TimedPickupOrb {
  constructor(x, y) {
    super(x, y, 'elementalshield', { life: 900, bobSpeed: 0.05, w: 24, h: 24 });
  }

  static spawnInterval() {
    return 1500;
  }

  static spawnPhase() {
    return 840;
  }

  static maxOnScreen() {
    return 1;
  }

  update(game) {
    if (!this.tickPickup()) return;
    const pl = game.player;
    const max = pl.elementalArmorMax || 100;
    if (!rectOverlap(pl, this) || (pl.elementalArmor || 0) >= max) return;

    this.done = true;
    SFX.pickup();
    pl.elementalArmor = max;
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    game.effects.push(new SlamRing(cx, cy, '#dff', 76, 9));
    game.effects.push(new Effect(cx, cy, '#dff', 20, 5, 18));
    game.effects.push(new TextEffect(cx, cy - 26, 'ELEMENTAL ARMOR', '#dff'));
  }

  render(ctx, cam) {
    const state = this.drawState(cam);
    if (!state) return;
    const t = this.bobTimer;
    ctx.save();
    ctx.globalAlpha = state.alpha;
    ctx.translate(state.x + 12, state.y + 12);
    ctx.rotate(t * 0.8);
    ctx.shadowColor = '#dff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(210,255,255,0.25)';
    ctx.strokeStyle = '#dff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const r = i % 2 ? 9 : 13;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-t * 0.8);
    ctx.fillStyle = '#fff';
    ctx.font = '900 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', 0, 1);
    ctx.restore();
  }
}

class ClassOrb {
  constructor(x, y, weaponId, opts = {}) {
    this.x = x;
    this.y = y;
    this.w = 52;
    this.h = 36;
    this.weaponId = WEAPON_ITEMS[weaponId] ? weaponId : 'flamethrower';
    const def = WEAPON_ITEMS[this.weaponId] || WEAPON_ITEMS.flamethrower;
    this.ammo = opts.ammo === undefined ? Math.ceil((def.ammoMax || 0) * 0.5) : Math.max(0, Math.min(def.ammoMax || 0, Math.round(opts.ammo)));
    this.bobTimer = opts.bobTimer ?? Math.random() * Math.PI * 2;
    this.pickupCooldown = opts.pickupCooldown || 0;
    this.done = false;
  }

  update(game) {
    if (this.done) return;
    if (this.pickupCooldown > 0) this.pickupCooldown--;
    this.bobTimer += 0.055;
    const pl = game.player;
    if (!pl || this.pickupCooldown > 0 || !rectOverlap(pl, this)) return;
    const oldItem = pl.heldItem;
    const oldAmmo = pl.itemAmmo || 0;
    if (!pl.equipWeapon(this.weaponId, game, { ammo: this.ammo })) return;
    this.done = true;
    SFX.weaponPickup();
    if (oldItem && WEAPON_ITEMS[oldItem]) {
      game.classOrbs.push(new ClassOrb(this.x, this.y, oldItem, { ammo: oldAmmo, pickupCooldown: 45, bobTimer: this.bobTimer + Math.PI }));
    }
    const wt = WEAPON_ITEMS[this.weaponId];
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    game.effects.push(new ScreenFlash(wt.accentColor || wt.color, 0.18, 12));
    game.effects.push(new SlamRing(this.x + this.w / 2, this.y + this.h / 2, wt.accentColor || wt.color, 120, 12));
    game.effects.push(new Effect(cx, cy, wt.accentColor || wt.color, 26, 6, 22));
    game.effects.push(new TextEffect(cx, cy - 42, wt.name.toUpperCase(), wt.accentColor || wt.color));
  }

  render(ctx, cam) {
    if (this.done) return;
    const wt = WEAPON_ITEMS[this.weaponId] || WEAPON_ITEMS.flamethrower;
    const color = wt.color || '#f93';
    const accent = wt.accentColor || color;
    const sx = this.x + this.w / 2 - cam.x;
    const sy = this.y + this.h / 2 + Math.sin(this.bobTimer) * 7 - cam.y;
    const pulse = 1 + Math.sin(this.bobTimer * 1.7) * 0.08;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = this.pickupCooldown > 0 ? 0.72 : 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24 + Math.sin(this.bobTimer * 2) * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(-28, -18, 56, 36);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(-28, -18, 56, 36);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-22, -12, 44, 24);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.fillStyle = color;
    this._drawWeaponIcon(ctx, wt, 0, 0, 1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '900 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wt.icon || '?', 0, 1);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 11px monospace';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff';
    ctx.fillText(wt.name.toUpperCase(), sx, sy - 34);
    ctx.fillStyle = accent;
    ctx.fillText('ITEM', sx, sy + 38);
    ctx.restore();
  }

  _drawWeaponIcon(ctx, wt, x, y, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = wt.color;
    ctx.strokeStyle = wt.accentColor || '#fff';
    ctx.lineWidth = 2;
    const kind = wt.kind || 'pistol';
    if (kind === 'bubbleGun') {
      ctx.fillRect(-14, -4, 22, 8);
      ctx.strokeRect(-14, -4, 22, 8);
      ctx.beginPath(); ctx.arc(13, 0, 6, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'orb') {
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(-2, -15, 4, 8);
    } else if (kind === 'staff') {
      ctx.fillRect(-2, -14, 4, 28);
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(8, -10); ctx.lineTo(0, -4); ctx.lineTo(-8, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'crossbow') {
      ctx.fillRect(-15, -2, 30, 4);
      ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else if (kind === 'shotgun') {
      ctx.fillRect(-18, -4, 30, 8);
      ctx.fillRect(8, 0, 12, 4);
      ctx.strokeRect(-18, -4, 38, 8);
    } else if (kind === 'rpg') {
      ctx.fillRect(-18, -5, 34, 10);
      ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(26, 0); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'hammer') {
      ctx.fillRect(-16, -2, 24, 4);
      ctx.fillRect(7, -12, 14, 24);
      ctx.strokeRect(7, -12, 14, 24);
    } else {
      ctx.fillRect(-14, -4, 28, 8);
      ctx.fillRect(8, 0, 8, 5);
      ctx.strokeRect(-14, -4, 28, 8);
    }
    ctx.restore();
  }
}

class AmmoPickupOrb extends TimedPickupOrb {
  constructor(x, y) {
    super(x, y, 'ammo', { life: 720, bobSpeed: 0.055, w: 24, h: 20 });
  }

  static spawnInterval() {
    return 420;
  }

  static spawnPhase() {
    return 180;
  }

  static maxOnScreen() {
    return 3;
  }

  update(game) {
    if (!this.tickPickup()) return;
    const pl = game.player;
    if (!pl || !rectOverlap(pl, this)) return;
    const gained = pl.addAmmo(null, game);
    if (gained <= 0) return;
    this.done = true;
    SFX.reload();
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    game.effects.push(new Effect(cx, cy, '#ffd86b', 14, 4, 14));
    game.effects.push(new TextEffect(cx, cy - 24, '+' + gained + ' AMMO', '#ffd86b'));
  }

  render(ctx, cam) {
    const state = this.drawState(cam);
    if (!state) return;
    ctx.save();
    ctx.globalAlpha = state.alpha;
    ctx.translate(state.x + 12, state.y + 10);
    ctx.shadowColor = '#ffd86b';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(-12, -9, 24, 18);
    ctx.strokeStyle = '#ffd86b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -9, 24, 18);
    ctx.fillStyle = '#ffd86b';
    for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 6, -5, 4, 10);
    ctx.restore();
  }
}

class HeartPickupOrb extends TimedPickupOrb {
  constructor(x, y) {
    super(x, y, 'heart', { life: 900, bobSpeed: 0.05, w: 22, h: 22 });
  }

  static spawnInterval() {
    return 900;
  }

  static spawnPhase() {
    return 300;
  }

  static maxOnScreen() {
    return 1;
  }

  update(game) {
    if (!this.tickPickup()) return;
    const pl = game.player;
    if (!rectOverlap(pl, this) || pl.hp >= pl.maxHp) return;

    this.done = true;
    SFX.pickup();
    const heal = Math.min(5, pl.maxHp - pl.hp);
    pl.hp = Math.min(pl.maxHp, pl.hp + heal);
    const cx = pl.x + pl.w / 2;
    const cy = pl.y + pl.h / 2;
    game.effects.push(new Effect(cx, cy, '#f44', 16, 5, 18));
    game.effects.push(new Effect(cx, cy, '#fff', 7, 3, 12));
    game.effects.push(new TextEffect(cx, cy - 22, '+' + heal + ' HP', '#f66'));
  }

  render(ctx, cam) {
    const state = this.drawState(cam);
    if (!state) return;
    const cx = state.x + 11;
    const cy = state.y + 11;
    ctx.save();
    ctx.globalAlpha = state.alpha;
    ctx.translate(cx, cy);
    ctx.shadowColor = '#f44';
    ctx.shadowBlur = 12;

    ctx.fillStyle = 'rgba(255,60,90,0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(-4, -4, 6, 0, Math.PI * 2);
    ctx.arc(4, -4, 6, 0, Math.PI * 2);
    ctx.moveTo(-10, -1);
    ctx.lineTo(0, 12);
    ctx.lineTo(10, -1);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffd6dc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2665', 0, -1);
    ctx.restore();
  }
}
