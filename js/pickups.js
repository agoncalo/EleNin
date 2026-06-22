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
    const collectMode = game.currentObjective && game.currentObjective.type === 'collect';
    return collectMode ? 120 : ((game.player.items && game.player.items.tripleShuriken) ? 150 : 300);
  }

  static spawnPhase() {
    return 60;
  }

  static maxOnScreen(game) {
    return game.currentObjective && game.currentObjective.type === 'collect' ? 6 : 3;
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
    const target = game._objectiveCollectTarget ? game._objectiveCollectTarget() : game.bossOrbsRequired;
    return game.currentObjective && game.currentObjective.type === 'collect' &&
      !game.bossActive && !game.boss &&
      game.bossOrbsCollected < target;
  }

  collectObjectiveCache(game, cx, cy) {
    const target = game._objectiveCollectTarget ? game._objectiveCollectTarget() : 15;
    game.bossOrbsRequired = target;
    game.bossOrbsCollected = Math.min(target, (game.bossOrbsCollected || 0) + 1);
    game.bossOrbCharge = 0;
    game.bossOrbCooldown = 0;
    game.effects.push(new Effect(cx, cy, '#ccc', 10, 4, 15));
    const txt = game.bossOrbsCollected >= target
      ? '\u2726 BOSS SUMMONED!'
      : '\u2726 ' + game.bossOrbsCollected + '/' + target;
    game.effects.push(new TextEffect(cx, cy - 38, txt, '#ccc'));
    if (game.bossOrbsCollected >= target) game.spawnBoss();
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
        damage: dmg, owner: 'player', width: 8, height: 6, facing: pl.facing,
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

  render(ctx, cam) {
    const state = this.drawState(cam);
    if (!state) return;
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
