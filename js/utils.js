// ── Utility functions ────────────────────────────────────────

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Hitstop
let hitstopFrames = 0;
function triggerHitstop(frames) { hitstopFrames = Math.max(hitstopFrames, frames); }

// Line of sight: returns true if no blocks/platforms between two points
function hasLineOfSight(x0, y0, x1, y1, game) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
  for (let i = 1; i < steps; ++i) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const probe = { x: x - 4, y: y - 4, w: 8, h: 8 };
    for (const p of game.platforms) {
      if (!p.thin && rectOverlap(probe, p)) return false;
    }
    for (const b of game.stoneBlocks) {
      if (!b.done && rectOverlap(probe, b)) return false;
    }
  }
  return true;
}

// ── Shared combat helpers ────────────────────────────────────

// Damage all enemies/boss within a radius from a point
function damageInRadius(game, cx, cy, radius, damage, fromX) {
  for (const e of game.enemies) {
    if (e.dead) continue;
    const dx = (e.x + e.w / 2) - cx;
    const dy = (e.y + e.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      e.takeDamage(damage, game, fromX !== undefined ? fromX : cx);
    }
  }
  if (game.boss && !game.boss.dead) {
    const dx = (game.boss.x + game.boss.w / 2) - cx;
    const dy = (game.boss.y + game.boss.h / 2) - cy;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      game.boss.takeDamage(damage, game, fromX !== undefined ? fromX : cx);
    }
  }
}

// Find nearest enemy or boss with line of sight from a point
function findNearestTarget(x, y, game) {
  let nearest = null, bestDist = Infinity;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (!hasLineOfSight(x, y, e.x + e.w / 2, e.y + e.h / 2, game)) continue;
    const dx = (e.x + e.w / 2) - x, dy = (e.y + e.h / 2) - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; nearest = e; }
  }
  if (game.boss && !game.boss.dead) {
    if (hasLineOfSight(x, y, game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, game)) {
      const dx = (game.boss.x + game.boss.w / 2) - x, dy = (game.boss.y + game.boss.h / 2) - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; nearest = game.boss; }
    }
  }
  return nearest;
}

// Fire a projectile at the nearest enemy or boss with line of sight
function fireProjectileAtNearestEnemy({
  x, y, game, speed = 8, color = '#ccc', damage = 1, owner = 'player', width = 8, height = 6, piercing = false, bouncy = false
}) {
  const nearest = findNearestTarget(x, y, game);
  let vx = speed, vy = 0;
  if (nearest) {
    const dx = (nearest.x + nearest.w / 2) - x;
    const dy = (nearest.y + nearest.h / 2) - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0) { vx = (dx / d) * speed; vy = (dy / d) * speed; }
  }
  const proj = new Projectile(x, y, vx, vy, color, damage, owner);
  proj.w = width;
  proj.h = height;
  proj.piercing = piercing;
  proj.bouncy = bouncy;
  game.projectiles.push(proj);
  return proj;
}

// Render an HP bar above an entity
function renderHpBar(ctx, cam, entity, barWidth) {
  const w = barWidth || entity.w;
  const sx = entity.x - cam.x;
  const sy = entity.y - cam.y;
  ctx.fillStyle = '#400';
  ctx.fillRect(sx, sy - 8, w, 4);
  ctx.fillStyle = '#f44';
  ctx.fillRect(sx, sy - 8, w * (entity.hp / entity.maxHp), 4);
}

// Process burn DOT for an entity (enemy or boss)
function processBurn(entity, game) {
  if (entity.burnTimer <= 0) return;
  // Water element enemies: fully immune to burn
  if (entity.element === 'water') {
    entity.burnTimer = 0;
    return;
  }
  // Fire element enemies: burn heals them instead
  if (entity.element === 'fire') {
    entity.burnTimer = 0;
    const healAmt = Math.min(2, entity.maxHp - entity.hp);
    if (healAmt > 0) {
      entity.hp += healAmt;
      game.effects.push(new Effect(entity.x + entity.w / 2, entity.y + entity.h / 2, '#4f4', 4, 2, 8));
    }
    return;
  }
  entity.burnTimer--;
  if (entity.burnTimer % 5 === 0) {
    game.effects.push(new Effect(entity.x + entity.w / 2, entity.y + entity.h / 2, '#f63', 6, 2, 10));
  }
  if (entity.burnTimer % 30 === 0) {
    entity.hp -= 1;
    entity.flashTimer = 4;
    game.effects.push(new Effect(entity.x + entity.w / 2, entity.y + entity.h / 2, '#f93', 4, 2, 8));
    if (entity.hp <= 0) {
      entity.dead = true;
      entity.onDeath(game);
    }
  }
}

// Shield damage check — returns true if damage was fully absorbed by shield
function processShieldDamage(entity, amount, game, fromX) {
  if (entity.shieldHp <= 0 || fromX === undefined) return false;
  const hitFromFront = (fromX > entity.x + entity.w / 2) === (entity.facing === 1);
  if (!hitFromFront) return false;
  entity.shieldHp -= amount;
  entity.flashTimer = 4;
  game.effects.push(new Effect(entity.x + (entity.facing > 0 ? entity.w : 0), entity.y + entity.h / 2, '#5ff', 6, 3, 10));
  if (entity.shieldHp < 0) entity.shieldHp = 0;
  return true;
}
