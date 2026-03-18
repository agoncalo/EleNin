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
function findNearestTarget(x, y, game, facing) {
  let nearest = null, bestDist = Infinity;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.friendly) continue; // Don't target friendly enemies
    if (!hasLineOfSight(x, y, e.x + e.w / 2, e.y + e.h / 2, game)) continue;
    const dx = (e.x + e.w / 2) - x, dy = (e.y + e.h / 2) - y;
    // Skip enemies directly behind the ninja (~90° cone behind)
    if (facing && dx * facing < 0 && Math.abs(dy) < Math.abs(dx)) continue;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; nearest = e; }
  }
  if (game.boss && !game.boss.dead) {
    if (hasLineOfSight(x, y, game.boss.x + game.boss.w / 2, game.boss.y + game.boss.h / 2, game)) {
      const dx = (game.boss.x + game.boss.w / 2) - x, dy = (game.boss.y + game.boss.h / 2) - y;
      if (!(facing && dx * facing < 0 && Math.abs(dy) < Math.abs(dx))) {
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; nearest = game.boss; }
      }
    }
  }
  return nearest;
}

// Fire a projectile at the nearest enemy or boss with line of sight
function fireProjectileAtNearestEnemy({
  x, y, game, speed = 8, color = '#ccc', damage = 1, owner = 'player', width = 8, height = 6, piercing = false, bouncy = false, facing = 0
}) {
  const nearest = findNearestTarget(x, y, game, facing);
  const fallbackDir = facing || 1;
  let vx = speed * fallbackDir, vy = 0;
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

// ── Canvas-drawn item icons ──────────────────────────────────
// Draws a boss item icon centered at (cx, cy) with given size and color.
function drawItemIcon(ctx, itemId, cx, cy, size, color) {
  const s = size / 2; // half-size for convenience
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size / 12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (itemId) {
    case 'pickaxe': {
      // Simple pick: straight handle + triangular point
      // Handle (diagonal)
      ctx.strokeStyle = '#a87';
      ctx.lineWidth = Math.max(2, size / 8);
      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.7);
      ctx.lineTo(-s * 0.15, -s * 0.05);
      ctx.stroke();
      // Metal head — horizontal bar with pointed left end
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.35);  // left point
      ctx.lineTo(-s * 0.1, -s * 0.55);
      ctx.lineTo(s * 0.5, -s * 0.25);   // right blunt end
      ctx.lineTo(s * 0.4, -s * 0.1);
      ctx.lineTo(-s * 0.1, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Shine
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.38);
      ctx.lineTo(s * 0.2, -s * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'tripleShuriken': {
      // Three small 4-pointed stars in a spread
      const offsets = [[-s * 0.4, s * 0.15], [0, -s * 0.3], [s * 0.4, s * 0.15]];
      ctx.fillStyle = color;
      for (const [ox, oy] of offsets) {
        const r = s * 0.32;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const cr = i % 2 === 0 ? r : r * 0.35;
          ctx.lineTo(ox + Math.cos(a) * cr, oy + Math.sin(a) * cr);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'homingShuriken': {
      // 4-pointed star with dashed circle reticle
      const r = s * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const cr = i % 2 === 0 ? r : r * 0.35;
        ctx.lineTo(Math.cos(a) * cr, Math.sin(a) * cr);
      }
      ctx.closePath();
      ctx.fill();
      // Reticle circle
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size / 14);
      ctx.setLineDash([size / 8, size / 8]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'vampireTeeth': {
      // Two fangs
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.4);
      ctx.lineTo(-s * 0.2, -s * 0.4);
      ctx.lineTo(-s * 0.35, s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.4);
      ctx.lineTo(s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.35, s * 0.55);
      ctx.closePath();
      ctx.fill();
      // Gum line
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.45, s * 0.7, s * 0.25, 0, Math.PI, 0);
      ctx.fill();
      // Blood drop
      ctx.fillStyle = '#f22';
      ctx.beginPath();
      ctx.arc(-s * 0.35, s * 0.65, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'iaito': {
      // Katana blade
      ctx.save();
      ctx.rotate(-0.6);
      // Blade
      ctx.fillStyle = '#dde';
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.9);
      ctx.lineTo(s * 0.08, -s * 0.85);
      ctx.lineTo(s * 0.06, s * 0.15);
      ctx.lineTo(-s * 0.06, s * 0.15);
      ctx.closePath();
      ctx.fill();
      // Edge shine
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.02, -s * 0.8);
      ctx.lineTo(-s * 0.03, s * 0.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Guard (tsuba)
      ctx.fillStyle = '#fc0';
      ctx.fillRect(-s * 0.18, s * 0.12, s * 0.36, s * 0.08);
      // Handle wrap
      ctx.fillStyle = '#624';
      ctx.fillRect(-s * 0.06, s * 0.22, s * 0.12, s * 0.55);
      // Handle wrapping lines
      ctx.strokeStyle = '#846';
      ctx.lineWidth = Math.max(1, size / 14);
      for (let i = 0; i < 4; i++) {
        const hy = s * 0.28 + i * s * 0.12;
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, hy);
        ctx.lineTo(s * 0.06, hy + s * 0.06);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'spikedArmor': {
      // Hexagon with spikes
      ctx.fillStyle = '#444';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        ctx.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55);
      }
      ctx.closePath();
      ctx.fill();
      // Spikes
      ctx.fillStyle = color;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const a1 = a - 0.2, a2 = a + 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * s * 0.5, Math.sin(a1) * s * 0.5);
        ctx.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9);
        ctx.lineTo(Math.cos(a2) * s * 0.5, Math.sin(a2) * s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'redMagnet': {
      // Horseshoe magnet
      ctx.lineWidth = s * 0.3;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, -s * 0.05, s * 0.45, Math.PI, 0);
      ctx.stroke();
      // Legs
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.63, -s * 0.1, s * 0.3, s * 0.55);
      ctx.fillRect(s * 0.33, -s * 0.1, s * 0.3, s * 0.55);
      // Tips
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-s * 0.63, s * 0.35, s * 0.3, s * 0.2);
      ctx.fillRect(s * 0.33, s * 0.35, s * 0.3, s * 0.2);
      // Field lines
      ctx.strokeStyle = '#f88';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, s * 0.1, s * 0.2, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      break;
    }
    case 'x2Orb': {
      // Glowing orb with "x2"
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.65);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, '#440');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // x2 text
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(size * 0.4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x2', 0, 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      break;
    }
    case 'deathsKey': {
      // Ornate key
      ctx.save();
      ctx.rotate(0.3);
      // Shaft
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.06, -s * 0.15, s * 0.12, s * 0.85);
      // Teeth
      ctx.fillRect(s * 0.06, s * 0.4, s * 0.18, s * 0.08);
      ctx.fillRect(s * 0.06, s * 0.55, s * 0.14, s * 0.08);
      // Bow (ring)
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.arc(0, -s * 0.4, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      // Gem in bow
      ctx.fillStyle = '#f4f';
      ctx.beginPath();
      ctx.arc(0, -s * 0.4, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'protectiveCharm': {
      // Shield shape with plus
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.lineTo(s * 0.6, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.25);
      ctx.lineTo(0, s * 0.7);
      ctx.lineTo(-s * 0.5, s * 0.25);
      ctx.lineTo(-s * 0.6, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      // Inner cross
      ctx.fillStyle = '#fff';
      ctx.fillRect(-s * 0.07, -s * 0.35, s * 0.14, s * 0.6);
      ctx.fillRect(-s * 0.25, -s * 0.1, s * 0.5, s * 0.14);
      break;
    }
    case 'charmFire':
    case 'charmEarth':
    case 'charmWater':
    case 'charmCrystal':
    case 'charmWind':
    case 'charmLightning':
    case 'charmSteel': {
      // Diamond shape with inner element symbol
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(0, s * 0.8);
      ctx.lineTo(-s * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      // Darker inner diamond
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(s * 0.3, 0);
      ctx.lineTo(0, s * 0.45);
      ctx.lineTo(-s * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      // Element-specific inner detail
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.8;
      if (itemId === 'charmFire') {
        // Flame
        ctx.beginPath();
        ctx.moveTo(0, s * 0.25);
        ctx.quadraticCurveTo(s * 0.2, 0, s * 0.1, -s * 0.15);
        ctx.quadraticCurveTo(s * 0.05, -s * 0.3, 0, -s * 0.35);
        ctx.quadraticCurveTo(-s * 0.05, -s * 0.3, -s * 0.1, -s * 0.15);
        ctx.quadraticCurveTo(-s * 0.2, 0, 0, s * 0.25);
        ctx.fill();
      } else if (itemId === 'charmEarth') {
        // Rock/mountain
        ctx.beginPath();
        ctx.moveTo(-s * 0.25, s * 0.2);
        ctx.lineTo(-s * 0.08, -s * 0.2);
        ctx.lineTo(s * 0.08, -s * 0.05);
        ctx.lineTo(s * 0.2, -s * 0.25);
        ctx.lineTo(s * 0.25, s * 0.2);
        ctx.closePath();
        ctx.fill();
      } else if (itemId === 'charmWater') {
        // Water drop
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.25);
        ctx.quadraticCurveTo(s * 0.18, s * 0.05, 0, s * 0.2);
        ctx.quadraticCurveTo(-s * 0.18, s * 0.05, 0, -s * 0.25);
        ctx.fill();
      } else if (itemId === 'charmCrystal') {
        // Crystal shard
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.3);
        ctx.lineTo(s * 0.12, s * 0.05);
        ctx.lineTo(0, s * 0.25);
        ctx.lineTo(-s * 0.12, s * 0.05);
        ctx.closePath();
        ctx.fill();
      } else if (itemId === 'charmWind') {
        // Swirl lines
        ctx.lineWidth = Math.max(1, size / 14);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-s * 0.05, -s * 0.1, s * 0.15, -0.5, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * 0.05, s * 0.05, s * 0.12, Math.PI - 0.5, 0);
        ctx.stroke();
      } else if (itemId === 'charmLightning') {
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(s * 0.05, -s * 0.3);
        ctx.lineTo(-s * 0.1, -s * 0.02);
        ctx.lineTo(s * 0.04, -s * 0.02);
        ctx.lineTo(-s * 0.08, s * 0.3);
        ctx.lineTo(s * 0.12, s * 0.02);
        ctx.lineTo(-s * 0.02, s * 0.02);
        ctx.closePath();
        ctx.fill();
      } else if (itemId === 'charmSteel') {
        // Gear cog
        ctx.lineWidth = Math.max(1, size / 16);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12);
          ctx.lineTo(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'leatherBoots': {
      // Boot shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.7);
      ctx.lineTo(s * 0.2, -s * 0.7);
      ctx.lineTo(s * 0.2, s * 0.2);
      ctx.lineTo(s * 0.65, s * 0.3);
      ctx.lineTo(s * 0.65, s * 0.6);
      ctx.lineTo(-s * 0.35, s * 0.6);
      ctx.lineTo(-s * 0.35, s * 0.3);
      ctx.lineTo(-s * 0.15, s * 0.15);
      ctx.closePath();
      ctx.fill();
      // Sole
      ctx.fillStyle = '#543';
      ctx.fillRect(-s * 0.35, s * 0.5, s * 1.0, s * 0.12);
      // Lace detail
      ctx.strokeStyle = '#dc9';
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.5);
      ctx.lineTo(s * 0.1, -s * 0.4);
      ctx.moveTo(-s * 0.05, -s * 0.3);
      ctx.lineTo(s * 0.1, -s * 0.2);
      ctx.stroke();
      break;
    }
    case 'friendsLetter': {
      // Envelope
      ctx.fillStyle = '#eed';
      ctx.fillRect(-s * 0.6, -s * 0.35, s * 1.2, s * 0.8);
      // Flap
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.35);
      ctx.lineTo(0, s * 0.15);
      ctx.lineTo(s * 0.6, -s * 0.35);
      ctx.closePath();
      ctx.fill();
      // Seal
      ctx.fillStyle = '#c44';
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Heart on seal
      ctx.fillStyle = '#f88';
      ctx.beginPath();
      ctx.arc(-s * 0.04, -s * 0.01, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.04, -s * 0.01, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.09, s * 0.02);
      ctx.lineTo(0, s * 0.1);
      ctx.lineTo(s * 0.09, s * 0.02);
      ctx.fill();
      break;
    }
    case 'theKunai': {
      // Kunai blade
      ctx.save();
      ctx.rotate(0.4);
      // Blade
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.18, s * 0.0);
      ctx.lineTo(0, s * 0.05);
      ctx.lineTo(-s * 0.18, s * 0.0);
      ctx.closePath();
      ctx.fill();
      // Edge highlight
      ctx.fillStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.06, -s * 0.1);
      ctx.lineTo(0, s * 0.0);
      ctx.closePath();
      ctx.fill();
      // Grip
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.06, s * 0.05, s * 0.12, s * 0.4);
      // Ring pommel
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.arc(0, s * 0.6, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'theCode': {
      // Code brackets / infinity loop
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.15;
      // Left bracket {
      ctx.beginPath();
      ctx.arc(-s * 0.25, -s * 0.25, s * 0.25, -0.3, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.25, s * 0.25, s * 0.25, -Math.PI * 0.5, 0.3);
      ctx.stroke();
      // Right bracket }
      ctx.beginPath();
      ctx.arc(s * 0.25, -s * 0.25, s * 0.25, Math.PI * 0.5, Math.PI + 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.25, s * 0.25, s * 0.25, Math.PI - 0.3, -Math.PI * 0.5);
      ctx.stroke();
      // Center dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // Fallback: colored circle with "?"
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(size * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      break;
    }
  }

  ctx.restore();
}
