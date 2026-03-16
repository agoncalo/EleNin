// ── Bubble (Bubble ninja ability) ─────────────────────────────
class Bubble {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 32; this.h = 32;
    this.life = 360;
    this.done = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.baseY = y;
    this.consumed = false;
  }
  update(game) {
    this.bobPhase += 0.03;
    this.y = this.baseY + Math.sin(this.bobPhase) * 5;
    this.baseY -= 0.15;
    this.life--;
    if (this.life <= 0) this.pop(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) e.takeDamage(2, game);
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) game.boss.takeDamage(2, game);
  }
  pop(game) {
    this.done = true;
    let damage = 1;
    for (const b of game.bubbles) {
      if (!b.done) damage += 1;
    }
    game.effects.push(new Effect(this.x + 16, this.y + 16, '#6af', 8, 3, 15));
    damageInRadius(game, this.x + 16, this.y + 16, 80, 2);
    // Fire projectile at nearest target
    const cx = this.x + 16, cy = this.y + 16;
    const nearest = findNearestTarget(cx, cy, game);
    if (nearest) {
      const dx = (nearest.x + nearest.w / 2) - cx;
      const dy = (nearest.y + nearest.h / 2) - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0) {
        game.projectiles.push(new Projectile(cx, cy, (dx / d) * 6, (dy / d) * 6, '#4af', damage, 'player'));
      }
    }
  }
  render(ctx, cam) {
    const alpha = this.life < 60 ? this.life / 60 : 1;
    ctx.globalAlpha = alpha * (this.consumed ? 0.3 : 0.5);
    ctx.fillStyle = this.consumed ? '#8cf' : '#4af';
    ctx.beginPath();
    ctx.arc(this.x + 16 - cam.x, this.y + 16 - cam.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#8cf';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(this.x + 9 - cam.x, this.y + 9 - cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ── SmallBubble (short burst bubble for Bubble Ninja attack) ─
class SmallBubble extends Bubble {
  constructor(x, y, facing) {
    super(x, y);
    this.w = 16;
    this.h = 16;
    this.life = 150;
    this.facing = facing;
    this.baseY = y;
    this.bobPhase = 0;
    this.vx = 6 * facing + (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.2;
  }
  update(game) {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life--;
    if (this.life <= 0) this.pop(game);
    for (const e of game.enemies) {
      if (!e.dead && rectOverlap(this, e)) {
        e.takeDamage(1, game);
        this.done = true;
        game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#8cf', 6, 2, 8));
      }
    }
    if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) {
      game.boss.takeDamage(1, game);
      this.done = true;
      game.effects.push(new Effect(this.x + this.w/2, this.y + this.h/2, '#8cf', 8, 2, 10));
    }
  }
  render(ctx, cam) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#8cf';
    ctx.beginPath();
    ctx.arc(this.x + 8 - cam.x, this.y + 8 - cam.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
