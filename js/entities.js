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
