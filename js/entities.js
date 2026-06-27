// ── Platform ─────────────────────────────────────────────────
class Platform {
  constructor(x, y, w, h, color) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.color = color || '#666';
    this.thin = false;
  }
  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    if (this.thin) {
      ctx.fillStyle = this.color;
      ctx.fillRect(sx, sy, this.w, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let dx = 0; dx < this.w; dx += 12) {
        ctx.fillRect(sx + dx, sy, 6, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx, sy + 4, this.w, 2);
    } else {
      const g = ctx.createLinearGradient(0, sy, 0, sy + this.h);
      g.addColorStop(0, this.color);
      g.addColorStop(0.16, 'rgba(255,255,255,0.16)');
      g.addColorStop(0.17, this.color);
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(sx, sy, this.w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let dx = 8; dx < this.w; dx += 34) ctx.fillRect(sx + dx, sy + 4, 2, Math.max(0, this.h - 6));
      if (this.h > 24) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let dy = 18; dy < this.h; dy += 28) ctx.fillRect(sx, sy + dy, this.w, 2);
      }
      ctx.strokeStyle = 'rgba(12,8,8,0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i < Math.min(10, Math.floor(this.w / 90) + 2); i++) {
        const seed = Math.sin((this.x + 31) * (i + 2) + this.y * 0.17) * 10000;
        const fx = sx + Math.abs(seed % 1) * this.w;
        const fy = sy + 7 + Math.abs((seed * 1.7) % 1) * Math.max(5, this.h - 12);
        const len = 7 + Math.abs((seed * 2.3) % 1) * 22;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + len * 0.55, fy + 2);
        ctx.lineTo(fx + len, fy - 1);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      for (let i = 0; i < Math.min(8, Math.floor(this.w / 110) + 1); i++) {
        const seed = Math.sin((this.x + 71) * (i + 3) - this.y * 0.11) * 10000;
        const chipX = sx + Math.abs(seed % 1) * Math.max(1, this.w - 22);
        ctx.fillRect(chipX, sy + 2, 14 + Math.abs((seed * 1.9) % 1) * 16, 2);
      }
    }
  }
}

class StageProp {
  constructor(x, y, type, front, destructible, scale) {
    this.x = x; this.y = y;
    this.type = type;
    this.front = !!front;
    this.destructible = !!destructible;
    this.scale = scale || 1;
    const dims = {
      bamboo: [18, 58], vase: [24, 32], lamp: [22, 42], crate: [36, 30],
      barrel: [28, 34], shrine: [34, 42], banner: [26, 60], stool: [28, 22],
      chair: [34, 34], tree: [62, 110], rock: [46, 30], statue: [34, 58],
      well: [54, 46], cart: [66, 40], sign: [36, 46], bush: [52, 30]
    }[type] || [30, 34];
    this.w = Math.round(dims[0] * this.scale);
    this.h = Math.round(dims[1] * this.scale);
    this.hp = this.destructible ? 2 : 999;
    this.done = false;
    this.flash = 0;
    this.breaking = 0;
    this.shards = [];
  }

  takeHit(game) {
    if (!this.destructible || this.done || this.breaking > 0) return false;
    this.hp--;
    this.flash = 8;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    if (game) {
      if (typeof SFX !== 'undefined' && SFX.hit) SFX.hit();
    }
    if (this.hp <= 0) {
      this.breaking = 34;
      this.destructible = false;
      const palette = this.type === 'vase' ? ['#b9d4ef', '#5d7892', '#eff8ff']
        : this.type === 'lamp' ? ['#ffbd55', '#7b3b16', '#2a1408']
        : ['#8a6038', '#4a2d18', '#c79a62'];
      this.shards = [];
      for (let i = 0; i < 7; i++) {
        this.shards.push({
          ox: (Math.random() - 0.5) * this.w * 0.7,
          oy: (Math.random() - 0.5) * this.h * 0.7,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -1.8 - Math.random() * 2.1,
          rot: (Math.random() - 0.5) * 0.6,
          a: Math.random() * Math.PI,
          w: 5 + Math.random() * 10,
          h: 3 + Math.random() * 8,
          c: palette[Math.floor(Math.random() * palette.length)]
        });
      }
    }
    return true;
  }

  update(game) {
    if (this.flash > 0) this.flash--;
    if (this.breaking > 0) {
      this.breaking--;
      for (const s of this.shards) {
        s.ox += s.vx;
        s.oy += s.vy;
        s.vy += 0.18;
        s.a += s.rot;
      }
      if (this.breaking <= 0) this.done = true;
      return;
    }
    if (!this.destructible || this.done) return;
    const hb = { x: this.x, y: this.y, w: this.w, h: this.h };
    const pl = game.player;
    if (pl && pl.attackBox && rectOverlap(pl.attackBox, hb)) this.takeHit(game);
    for (const p of game.projectiles) {
      if (p.done || p.owner !== 'player' || !rectOverlap(p, hb)) continue;
      p.done = true;
      this.takeHit(game);
      break;
    }
  }

  _drawPot(ctx, sx, sy, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(sx + this.w / 2, sy + this.h * 0.58, this.w * 0.42, this.h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(sx + this.w * 0.3, sy + this.h * 0.18, this.w * 0.4, 4);
  }

  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    ctx.save();
    if (this.breaking > 0) {
      const fade = Math.min(1, this.breaking / 22);
      for (const s of this.shards) {
        ctx.save();
        ctx.translate(sx + this.w / 2 + s.ox, sy + this.h / 2 + s.oy);
        ctx.rotate(s.a);
        ctx.globalAlpha = 0.88 * fade;
        ctx.fillStyle = s.c;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.globalAlpha = 0.28 * fade;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, 1);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    if (this.flash > 0) ctx.globalAlpha = 0.65;
    const t = this.type;
    if (t === 'bamboo') {
      ctx.fillStyle = '#49723a';
      for (let i = 0; i < 3; i++) {
        const bx = sx + i * this.w / 3 + 2;
        ctx.fillRect(bx, sy + 2 + i * 4, 5, this.h - 4 - i * 4);
        ctx.fillStyle = '#6fa45b';
        for (let y = sy + 12; y < sy + this.h; y += 13) ctx.fillRect(bx - 1, y, 7, 2);
        ctx.fillStyle = '#49723a';
      }
    } else if (t === 'vase') this._drawPot(ctx, sx, sy, '#8fb0d8');
    else if (t === 'lamp') {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx + this.w / 2 - 2, sy + 8, 4, this.h - 8);
      ctx.fillStyle = '#ffd06a'; ctx.fillRect(sx + 4, sy + 4, this.w - 8, 16);
      ctx.fillStyle = 'rgba(255,180,60,0.28)'; ctx.fillRect(sx, sy, this.w, this.h * 0.55);
    } else if (t === 'crate') {
      ctx.fillStyle = '#8a6038'; ctx.fillRect(sx, sy, this.w, this.h);
      ctx.strokeStyle = '#4a2d18'; ctx.strokeRect(sx + 1, sy + 1, this.w - 2, this.h - 2);
      ctx.beginPath(); ctx.moveTo(sx + 3, sy + 3); ctx.lineTo(sx + this.w - 3, sy + this.h - 3); ctx.moveTo(sx + this.w - 3, sy + 3); ctx.lineTo(sx + 3, sy + this.h - 3); ctx.stroke();
    } else if (t === 'barrel') {
      ctx.fillStyle = '#7b4a2a'; ctx.fillRect(sx + 4, sy, this.w - 8, this.h);
      ctx.fillStyle = '#51301c'; ctx.fillRect(sx + 2, sy + 7, this.w - 4, 4); ctx.fillRect(sx + 2, sy + this.h - 11, this.w - 4, 4);
    } else if (t === 'tree') {
      ctx.fillStyle = '#51331f'; ctx.fillRect(sx + this.w * 0.42, sy + this.h * 0.35, this.w * 0.16, this.h * 0.65);
      ctx.fillStyle = '#21482c'; ctx.beginPath(); ctx.arc(sx + this.w * 0.5, sy + this.h * 0.28, this.w * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d6939'; ctx.beginPath(); ctx.arc(sx + this.w * 0.35, sy + this.h * 0.38, this.w * 0.26, 0, Math.PI * 2); ctx.arc(sx + this.w * 0.65, sy + this.h * 0.38, this.w * 0.28, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'chair') {
      ctx.fillStyle = '#5a3b26'; ctx.fillRect(sx + 5, sy + 3, this.w - 10, 6); ctx.fillRect(sx + 8, sy + 12, this.w - 16, 8);
      ctx.fillRect(sx + 7, sy + 20, 4, this.h - 20); ctx.fillRect(sx + this.w - 11, sy + 20, 4, this.h - 20); ctx.fillRect(sx + 9, sy, 4, 18); ctx.fillRect(sx + this.w - 13, sy, 4, 18);
    } else if (t === 'rock') {
      ctx.fillStyle = '#54525b'; ctx.beginPath(); ctx.ellipse(sx + this.w / 2, sy + this.h * 0.65, this.w * 0.45, this.h * 0.35, -0.1, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'statue') {
      ctx.fillStyle = '#777985'; ctx.fillRect(sx + 7, sy + 12, this.w - 14, this.h - 16); ctx.fillRect(sx + 3, sy + this.h - 8, this.w - 6, 8); ctx.beginPath(); ctx.arc(sx + this.w / 2, sy + 10, 10, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'well') {
      ctx.fillStyle = '#555'; ctx.fillRect(sx, sy + 14, this.w, this.h - 14); ctx.fillStyle = '#222'; ctx.fillRect(sx + 6, sy + 19, this.w - 12, 10); ctx.fillStyle = '#6a3b28'; ctx.fillRect(sx + 5, sy, 5, 18); ctx.fillRect(sx + this.w - 10, sy, 5, 18); ctx.fillRect(sx + 3, sy, this.w - 6, 5);
    } else if (t === 'cart') {
      ctx.fillStyle = '#7a4c2a'; ctx.fillRect(sx + 4, sy + 8, this.w - 12, this.h - 18); ctx.fillStyle = '#2b1a12'; ctx.beginPath(); ctx.arc(sx + 15, sy + this.h - 6, 7, 0, Math.PI * 2); ctx.arc(sx + this.w - 22, sy + this.h - 6, 7, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'sign') {
      ctx.fillStyle = '#6c4428'; ctx.fillRect(sx + this.w / 2 - 2, sy + 12, 4, this.h - 12); ctx.fillRect(sx, sy + 4, this.w, 14);
    } else if (t === 'bush') {
      ctx.fillStyle = '#2d6939'; ctx.beginPath(); ctx.arc(sx + 12, sy + 18, 14, 0, Math.PI * 2); ctx.arc(sx + 28, sy + 15, 17, 0, Math.PI * 2); ctx.arc(sx + 42, sy + 20, 13, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(sx, sy, this.w, this.h);
    }
    ctx.restore();
  }
}

class StageLantern {
  constructor(x, y, kind, vx) {
    this.x = x; this.y = y;
    this.w = 18; this.h = 24;
    this.kind = kind || 'cable';
    this.vx = vx || 0;
    this.vy = 0;
    this.state = 'hanging';
    this.done = false;
    this.swing = Math.random() * Math.PI * 2;
    this.life = 9999;
    this.burstTimer = 0;
    this.burstShards = [];
  }

  drop(game) {
    if (this.state === 'falling' || this.done) return;
    this.state = 'falling';
    this.vx += (Math.random() - 0.5) * 1.5;
    this.vy = -1;
    if (game) game.effects.push(new Effect(this.x + this.w / 2, this.y + this.h / 2, '#fa3', 6, 2, 10));
  }

  explode(game) {
    if (this.done) return;
    this.state = 'burst';
    this.burstTimer = 34;
    this.vx = 0;
    this.vy = 0;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    this.burstShards = [];
    for (let i = 0; i < 10; i++) {
      this.burstShards.push({
        ox: (Math.random() - 0.5) * 16,
        oy: (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 3.0,
        vy: -2.4 - Math.random() * 2.6,
        w: 3 + Math.random() * 7,
        h: 4 + Math.random() * 10,
        a: Math.random() * Math.PI,
        rot: (Math.random() - 0.5) * 0.45,
        c: Math.random() < 0.4 ? '#ffd46a' : (Math.random() < 0.55 ? '#8b2c12' : '#2a160c')
      });
    }
    if (game) {
      damageInRadius(game, cx, cy, 82, 8, cx, 'fire', 'lantern');
      game.effects.push(new SlamRing(cx, cy, '#f80', '#fff'));
      triggerScreenShake(4, 10);
      if (typeof SFX !== 'undefined' && SFX.slam) SFX.slam();
    }
  }

  update(game) {
    if (this.done) return;
    this.swing += 0.04;
    if (this.state === 'burst') {
      this.burstTimer--;
      for (const s of this.burstShards) {
        s.ox += s.vx;
        s.oy += s.vy;
        s.vy += 0.22;
        s.vx *= 0.96;
        s.a += s.rot;
      }
      if (this.burstTimer <= 0) this.done = true;
      return;
    }
    const hb = { x: this.x, y: this.y, w: this.w, h: this.h };
    const pl = game.player;
    if (pl && pl.attackBox && rectOverlap(pl.attackBox, hb)) this.drop(game);
    for (const p of game.projectiles) {
      if (p.done || p.owner !== 'player' || !rectOverlap(p, hb)) continue;
      p.done = true;
      this.drop(game);
      break;
    }
    if (this.kind === 'flyby' && this.state === 'hanging') {
      this.x += this.vx;
      this.y += Math.sin(this.swing) * 0.15;
      if (this.x < -160 || this.x > game.levelW + 160) this.done = true;
    }
    if (this.state === 'falling') {
      this.vy += GRAVITY * 0.65;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
      this.x += this.vx;
      this.y += this.vy;
      for (const p of game.platforms) {
        if (p.thin) continue;
        if (rectOverlap(this, p) && this.vy >= 0) {
          this.explode(game);
          return;
        }
      }
      for (const e of game.enemies) {
        if (!e.dead && !e.friendly && rectOverlap(this, e)) { this.explode(game); return; }
      }
      if (game.boss && !game.boss.dead && rectOverlap(this, game.boss)) this.explode(game);
      if (this.y > game.levelH + 260) this.done = true;
    }
  }

  render(ctx, cam) {
    if (this.done) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    const bob = this.state === 'hanging' ? Math.sin(this.swing) * 2 : 0;
    ctx.save();
    if (this.state === 'burst') {
      const fade = Math.min(1, this.burstTimer / 24);
      for (const s of this.burstShards) {
        ctx.save();
        ctx.translate(sx + this.w / 2 + s.ox, sy + this.h / 2 + s.oy);
        ctx.rotate(s.a);
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = s.c;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      }
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.ellipse(sx + this.w / 2, sy + this.h / 2 + 6, 36 * (1.2 - fade), 12 * (1.2 - fade), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (this.kind === 'cable' && this.state === 'hanging') {
      ctx.strokeStyle = 'rgba(70,45,24,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + this.w / 2 - 10, sy - 108);
      ctx.quadraticCurveTo(sx + this.w / 2 - 4, sy - 64, sx + this.w / 2, sy - 40);
      ctx.quadraticCurveTo(sx + this.w / 2 + Math.sin(this.swing) * 8, sy - 16, sx + this.w / 2 + Math.sin(this.swing) * 3, sy + bob);
      ctx.stroke();
    }
    if (this.kind === 'flyby' && this.state === 'hanging') {
      ctx.strokeStyle = 'rgba(180,150,80,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 18, sy + 8);
      ctx.lineTo(sx - 4, sy + 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = '#5a2718';
    ctx.fillRect(sx + 3, sy + bob + 4, this.w - 6, this.h - 7);
    ctx.fillStyle = '#ffd46a';
    ctx.fillRect(sx + 5, sy + bob + 7, this.w - 10, this.h - 13);
    ctx.fillStyle = 'rgba(255,160,40,0.22)';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, sy + bob + this.h / 2, 22 + Math.sin(this.swing * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a160c';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 3, sy + bob + 4, this.w - 6, this.h - 7);
    ctx.restore();
  }
}

// ── Spike (environmental hazard) ─────────────────────────────
class Spike {
  constructor(x, y, w) {
    this.x = x; this.y = y;
    this.w = w; this.h = 12;
  }
  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    ctx.fillStyle = '#c33';
    const spikeW = 12;
    for (let dx = 0; dx < this.w; dx += spikeW) {
      ctx.beginPath();
      ctx.moveTo(sx + dx, sy + this.h);
      ctx.lineTo(sx + dx + spikeW / 2, sy);
      ctx.lineTo(sx + dx + spikeW, sy + this.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#f66';
    for (let dx = 0; dx < this.w; dx += spikeW) {
      ctx.fillRect(sx + dx + spikeW / 2 - 1, sy, 2, 3);
    }
  }
}

// Rope: hanging structure that refills normal jumps when touched.
class Rope {
  constructor(x, y, h) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = h || 140;
    this.touching = false;
    this.pulse = 0;
  }

  render(ctx, cam) {
    const sx = this.x - cam.x;
    const sy = this.y - cam.y;
    const mid = sx + this.w / 2;
    ctx.save();
    ctx.strokeStyle = '#caa66a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mid, sy);
    const segments = 7;
    for (let i = 1; i <= segments; i++) {
      const py = sy + (this.h / segments) * i;
      const px = mid + Math.sin(i * 1.7 + this.pulse * 0.18) * 3;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,240,180,0.65)';
    ctx.lineWidth = 1.5;
    for (let y = sy + 16; y < sy + this.h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(mid - 7, y);
      ctx.lineTo(mid + 7, y + 8);
      ctx.stroke();
    }

    ctx.fillStyle = '#6b4b2a';
    ctx.fillRect(mid - 12, sy - 4, 24, 8);
    ctx.restore();
  }
}
