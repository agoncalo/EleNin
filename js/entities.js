// ── Platform ─────────────────────────────────────────────────
class Platform {
  constructor(x, y, w, h, color) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.color = color || '#666';
    this.thin = false;
  }
  render(ctx, cam) {
    ctx.fillStyle = this.color;
    if (this.thin) {
      ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let dx = 0; dx < this.w; dx += 12) {
        ctx.fillRect(this.x - cam.x + dx, this.y - cam.y, 6, 2);
      }
    } else {
      ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, this.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(this.x - cam.x, this.y - cam.y, this.w, 3);
    }
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
