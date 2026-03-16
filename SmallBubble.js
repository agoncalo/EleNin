class SmallBubble extends Bubble {
  constructor(x, y, facing) {
    super(x, y);
    this.w = 16;
    this.h = 16;
    this.life = 24; // short burst
    this.facing = facing;
    this.baseY = y;
    this.bobPhase = 0;
    this.vx = 6 * facing + (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.2;
  }
  update(game) {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.done = true;
    // Damage enemies on contact
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
