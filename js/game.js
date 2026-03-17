// ── Game ──────────────────────────────────────────────────────
class Game {
  constructor() {
    this.tick = 0;
    this.camera = { x: 0, y: 0 };
    this.player = new Player(100, 300);
    this.platforms = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.stoneBlocks = [];
    this.stonePillars = [];
    this.bubbles = [];
    this.orbs = [];
    this.fireTrails = [];
    this.spikes = [];
    this.trimerangs = [];
    this.diamondShards = [];
    this.deaths = 0;
    this.lives = 3;
    this.gameOver = false;

    // Wave / spawn system
    this.wave = 1;
    this.waveKills = 0;
    this.totalKills = 0;
    this.maxEnemies = 32;
    this.spawnTimer = 0;
    this.spawnInterval = 50;
    this.boss = null;
    this.bossActive = false;
    this.bossMessage = 0;
    this.waveMessage = '';
    this.waveMessageTimer = 0;
    this.gameWon = false;

    this.buildLevel();
    this.showWaveMessage('Wave 1/' + TOTAL_WAVES + ' — Fight!');
  }

  showWaveMessage(text) {
    this.waveMessage = text;
    this.waveMessageTimer = 180;
  }

  buildLevel() {
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x, y, w, 6, '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x, y, w));

    // Ground
    P(0, 480, 3200, 60, '#555');

    // Lower platforms
    P(200, 400, 160, 16, '#666');
    P(450, 360, 120, 16, '#666');
    P(650, 320, 140, 16, '#666');
    P(900, 380, 120, 16, '#666');
    P(1100, 340, 160, 16, '#666');

    // Mid platforms
    P(300, 260, 120, 16, '#777');
    P(550, 220, 100, 16, '#777');
    P(780, 180, 140, 16, '#777');
    P(1050, 240, 140, 16, '#777');
    P(1300, 200, 120, 16, '#777');

    // High platforms
    P(400, 140, 100, 16, '#888');
    P(700, 100, 140, 16, '#888');
    P(1000, 130, 120, 16, '#888');

    // Extended area
    P(1500, 420, 200, 16, '#666');
    P(1750, 360, 160, 16, '#666');
    P(1950, 300, 140, 16, '#666');
    P(2150, 380, 120, 16, '#666');
    P(2350, 320, 180, 16, '#666');
    P(2600, 400, 200, 16, '#666');
    P(2850, 350, 160, 16, '#666');

    // L-shaped platforms
    P(150, 440, 80, 16, '#686'); P(150, 380, 16, 60, '#686');
    P(830, 260, 16, 70, '#686'); P(830, 260, 90, 16, '#686');
    P(1400, 370, 80, 16, '#686'); P(1464, 310, 16, 60, '#686');
    P(2050, 240, 16, 70, '#686'); P(2050, 240, 90, 16, '#686');
    P(2750, 280, 80, 16, '#686'); P(2750, 280, 16, 70, '#686');

    // Vertical walls
    P(580, 380, 16, 100, '#555');
    P(1200, 300, 16, 180, '#555');
    P(1850, 350, 16, 130, '#555');
    P(2500, 280, 16, 200, '#555');

    // Thin passable platforms
    TP(120, 340, 100);
    TP(350, 310, 80);
    TP(500, 280, 90);
    TP(730, 250, 100);
    TP(950, 290, 80);
    TP(1150, 200, 100);
    TP(1550, 340, 120);
    TP(1700, 280, 100);
    TP(2000, 220, 110);
    TP(2300, 260, 100);
    TP(2650, 300, 120);
    TP(2900, 250, 100);

    // Spikes
    S(560, 468, 48);
    S(1180, 468, 48);
    S(1830, 468, 48);
    S(2480, 468, 48);
    S(700, 84, 48);
    S(1300, 184, 36);

    // Boundary walls
    P(-32, 0, 32, 540, '#444');
    P(3200, 0, 32, 540, '#444');
  }

  spawnEnemy() {
    const waveDef = WAVE_DEFS[this.wave - 1];
    let totalW = 0;
    for (const e of waveDef.pool) totalW += e.weight;
    let r = Math.random() * totalW;
    let pick = waveDef.pool[0];
    for (const e of waveDef.pool) {
      r -= e.weight;
      if (r <= 0) { pick = e; break; }
    }
    // Miniboss types: only one alive at a time
    if (pick.type === 'protector' || pick.type === 'attacker' || pick.type === 'deflector') {
      for (const e of this.enemies) {
        if (!e.dead && e.type === pick.type) return;
      }
    }
    const isFlying = (pick.type === 'flyer' || pick.type === 'flyshooter');
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = this.player.x + side * randInt(350, 550);
    let y = isFlying ? randInt(50, 250) : -40;
    x = Math.max(40, Math.min(3140, x));
    const e = new Enemy(x, y, pick.type, !!pick.big, this.wave);
    this.enemies.push(e);
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, '#fff', 6, 3, 10));
  }

  spawnBoss() {
    const waveDef = WAVE_DEFS[this.wave - 1];
    this.boss = new Boss(this.player.x + 300, 300, waveDef.boss, this.wave);
    this.bossActive = true;
    this.bossMessage = 180;
    this.effects.push(new Effect(this.boss.x + 28, this.boss.y + 28, '#f44', 25, 6, 25));
    SFX.bossSpawn();
    this.showWaveMessage(this.boss.name + ` (${this.wave}/${TOTAL_WAVES})`);
  }

  advanceWave() {
    if (this.wave >= TOTAL_WAVES) {
      this.gameWon = true;
      this.boss = null;
      this.bossActive = false;
      this.showWaveMessage('VICTORY!');
      SFX.victory();
      return;
    }
    this.wave++;
    this.waveKills = 0;
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.spawnTimer = -120;
    SFX.wave();
    this.showWaveMessage(`Wave ${this.wave}/${TOTAL_WAVES} — Fight!`);
  }

  update() {
    this.tick++;
    pollGamepad();

    if ((this.gameWon || this.gameOver) && (consumePress('KeyR') || gpJust[9])) {
      Object.assign(this, new Game());
      return;
    }
    if (this.gameWon || this.gameOver) return;

    // Ninja switching
    if (consumePress('Digit1')) this.player.switchNinja('fire');
    if (consumePress('Digit2')) this.player.switchNinja('earth');
    if (consumePress('Digit3')) this.player.switchNinja('bubble');
    if (consumePress('Digit4')) this.player.switchNinja('shadow');
    if (consumePress('Digit5')) this.player.switchNinja('crystal');
    if (consumePress('Digit6')) this.player.switchNinja('wind');
    if (justPressed['WheelSwitch']) {
      justPressed['WheelSwitch'] = false;
      this.player.switchNinja(NINJA_ORDER[mouseWheelNinja]);
    }
    if (gpJust[GP_LB]) {
      const idx = NINJA_ORDER.indexOf(this.player.ninjaType);
      this.player.switchNinja(NINJA_ORDER[(idx + 5) % 6]);
    }
    if (gpJust[GP_RB]) {
      const idx = NINJA_ORDER.indexOf(this.player.ninjaType);
      this.player.switchNinja(NINJA_ORDER[(idx + 1) % 6]);
    }

    // Cheat: + to skip wave
    if (consumePress('Equal') || consumePress('NumpadAdd')) {
      if (this.boss && !this.boss.dead) this.boss.hp = 0;
      this.advanceWave();
    }
    // Cheat: - to spawn boss / fill ultimate
    if (consumePress('Minus') || consumePress('NumpadSubtract')) {
      if (!this.bossActive) {
        this.spawnBoss();
      } else {
        this.player.ultimateCharge = this.player.ultimateMax;
        this.player.ultimateReady = true;
      }
    }

    this.player.update(this);

    // During ultimate cutscene, freeze everything except effects
    if (this.player.ultCutscene) {
      for (const e of this.effects) e.update();
      this.effects = this.effects.filter(e => !e.done);
      // Camera still follows
      const targetCamX = this.player.x + this.player.w / 2 - CANVAS_W / 2;
      const targetCamY = this.player.y + this.player.h / 2 - CANVAS_H / 2;
      this.camera.x = lerp(this.camera.x, targetCamX, 0.08);
      this.camera.y = lerp(this.camera.y, targetCamY, 0.08);
      this.camera.x = Math.max(0, Math.min(this.camera.x, 3200 - CANVAS_W));
      this.camera.y = Math.max(-100, Math.min(this.camera.y, 540 - CANVAS_H));
      return; // Skip all other updates during cutscene
    }

    for (const e of this.enemies) e.update(this);
    if (this.boss && !this.boss.dead) this.boss.update(this);
    for (const p of this.projectiles) p.update(this);
    if (this.trimerangs) {
      for (const t of this.trimerangs) t.update(this);
      this.trimerangs = this.trimerangs.filter(t => !t.done);
    }
    if (this.diamondShards) {
      for (const d of this.diamondShards) d.update(this);
      this.diamondShards = this.diamondShards.filter(d => !d.done);
    }
    for (const e of this.effects) e.update();
    for (const b of this.stoneBlocks) b.update(this);
    for (const b of this.bubbles) b.update(this);
    for (const o of this.orbs) o.update(this);

    // Fire trail update
    if (this.player.ninjaType === 'fire' && this.player.grounded && Math.abs(this.player.vx) > 1) {
      if (this.tick % 4 === 0) {
        this.fireTrails.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h, life: 90 });
      }
    }
    for (const ft of this.fireTrails) {
      ft.life--;
      if (ft.life % 20 === 0) {
        for (const e of this.enemies) {
          if (!e.dead && Math.abs(e.x + e.w / 2 - ft.x) < 16 && Math.abs(e.y + e.h - ft.y) < 12) {
            e.burnTimer = Math.max(e.burnTimer, 60);
          }
        }
        if (this.boss && !this.boss.dead && Math.abs(this.boss.x + this.boss.w / 2 - ft.x) < 24 && Math.abs(this.boss.y + this.boss.h - ft.y) < 16) {
          this.boss.burnTimer = Math.max(this.boss.burnTimer, 60);
        }
      }
    }
    this.fireTrails = this.fireTrails.filter(ft => ft.life > 0);

    // Wave / spawn logic
    if (!this.gameWon) {
      const waveDef = WAVE_DEFS[this.wave - 1];
      if (!this.bossActive) {
        if (this.waveKills >= waveDef.killsForBoss) {
          this.spawnBoss();
        } else {
          const aliveCount = this.enemies.filter(e => !e.dead).length;
          this.spawnTimer++;
          if (this.spawnTimer >= this.spawnInterval && aliveCount < this.maxEnemies) {
            this.spawnTimer = 0;
            this.spawnEnemy();
          }
        }
      } else {
        const aliveCount = this.enemies.filter(e => !e.dead).length;
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval && aliveCount < this.maxEnemies) {
          this.spawnTimer = 0;
          this.spawnEnemy();
        }
      }
      if (this.boss && this.boss.dead) {
        this.advanceWave();
      }
    }

    if (this.bossMessage > 0) this.bossMessage--;
    if (this.waveMessageTimer > 0) this.waveMessageTimer--;

    // Cleanup
    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.done);
    this.effects = this.effects.filter(e => !e.done);
    this.stoneBlocks = this.stoneBlocks.filter(b => !b.done);
    this.bubbles = this.bubbles.filter(b => !b.done);
    this.orbs = this.orbs.filter(o => !o.done);

    // Camera follows player (smooth)
    const targetCamX = this.player.x + this.player.w / 2 - CANVAS_W / 2;
    const targetCamY = this.player.y + this.player.h / 2 - CANVAS_H / 2;
    this.camera.x = lerp(this.camera.x, targetCamX, 0.08);
    this.camera.y = lerp(this.camera.y, targetCamY, 0.08);
    this.camera.x = Math.max(0, Math.min(this.camera.x, 3200 - CANVAS_W));
    this.camera.y = Math.max(-100, Math.min(this.camera.y, 540 - CANVAS_H));
  }

  render() {
    const cam = this.camera;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Background stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137 + 50) % 3200) - cam.x * 0.3;
      const sy = ((i * 97 + 30) % 400);
      if (sx > -5 && sx < CANVAS_W + 5) {
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Background mountains
    ctx.fillStyle = '#1a1a3a';
    for (let i = 0; i < 3200; i += 200) {
      const bx = i - cam.x * 0.2;
      if (bx > -200 && bx < CANVAS_W + 200) {
        ctx.beginPath();
        ctx.moveTo(bx, 480 - cam.y);
        ctx.lineTo(bx + 100, 300 - cam.y);
        ctx.lineTo(bx + 200, 480 - cam.y);
        ctx.fill();
      }
    }

    for (const p of this.platforms) p.render(ctx, cam);
    for (const s of this.spikes) s.render(ctx, cam);

    // Fire trails
    for (const ft of this.fireTrails) {
      const alpha = Math.min(1, ft.life / 30) * 0.6;
      ctx.globalAlpha = alpha;
      const flicker = Math.sin(ft.life * 0.5) * 2;
      ctx.fillStyle = ft.life > 50 ? '#f93' : (ft.life > 25 ? '#e52' : '#a30');
      ctx.fillRect(ft.x - 4 - cam.x, ft.y - 6 + flicker - cam.y, 8, 6);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(ft.x - 2 - cam.x, ft.y - 8 + flicker - cam.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    for (const b of this.stoneBlocks) b.render(ctx, cam);
    for (const b of this.bubbles) b.render(ctx, cam);
    for (const o of this.orbs) o.render(ctx, cam);
    for (const e of this.enemies) e.render(ctx, cam, this);
    if (this.boss && !this.boss.dead) this.boss.render(ctx, cam, this);
    this.player.render(ctx, cam);

    // ── Ultimate cutscene / active rendering ──

    // Cutscene flash overlay
    if (this.player.ultCutscene) {
      const flash = Math.min(1, (60 - this.player.ultCutsceneTimer) / 20);
      ctx.save();
      ctx.globalAlpha = flash * 0.3;
      ctx.fillStyle = this.player.type.color;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
      // Elemental ring around player
      ctx.save();
      const ringR = 30 + (60 - this.player.ultCutsceneTimer) * 1.5;
      ctx.strokeStyle = this.player.type.accentColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(
        this.player.x + this.player.w / 2 - cam.x,
        this.player.y + this.player.h / 2 - cam.y,
        ringR, 0, Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Fire ultimate: render meteors
    if (this.player.ultimateActive && this.player.ninjaType === 'fire') {
      for (const m of this.player.fireMeteors) {
        if (m.done || !m.active) continue;
        // Trail
        for (const t of m.trail) {
          ctx.globalAlpha = t.life / 15 * 0.6;
          ctx.fillStyle = '#f93';
          ctx.fillRect(t.x - 4 - cam.x, t.y - 4 - cam.y, 8, 8);
        }
        ctx.globalAlpha = 1;
        // Meteor body
        ctx.fillStyle = '#f44';
        ctx.beginPath();
        ctx.arc(m.x - cam.x, m.y - cam.y, m.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(m.x - cam.x, m.y - 2 - cam.y, m.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Earth ultimate: render golem mecha
    if (this.player.earthGolem) {
      const g = this.player.earthGolem;
      const gx = g.x - cam.x;
      const gy = g.y - cam.y;
      // Hover glow
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#8d8';
      ctx.fillRect(gx - 4, gy + g.h - 6, g.w + 8, 8);
      ctx.restore();
      // Body
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(gx + 8, gy + 20, g.w - 16, g.h - 24);
      // Shoulders
      ctx.fillStyle = '#4a8a4a';
      ctx.fillRect(gx, gy + 16, g.w, 20);
      // Head
      ctx.fillStyle = '#5a9a5a';
      ctx.fillRect(gx + 18, gy, 28, 20);
      // Eyes
      ctx.fillStyle = '#ff0';
      ctx.fillRect(gx + 22 + (g.facing > 0 ? 8 : 0), gy + 6, 6, 6);
      ctx.fillRect(gx + 32 + (g.facing > 0 ? 4 : -4), gy + 6, 6, 6);
      // Arms
      ctx.fillStyle = '#4a8a4a';
      const armOffsetX = g.punchTimer > 0 ? g.facing * 20 : 0;
      const armLx = gx - 12 + (g.facing < 0 ? armOffsetX : 0);
      const armRx = gx + g.w + (g.facing > 0 ? armOffsetX : 0);
      ctx.fillRect(armLx, gy + 24, 14, 28);
      ctx.fillRect(armRx, gy + 24, 14, 28);
      // Fist glow on punch
      if (g.punchTimer > 0) {
        const fistX = g.facing > 0 ? armRx + 4 : armLx - 4;
        ctx.fillStyle = '#ff4';
        ctx.beginPath();
        ctx.arc(fistX + 7, gy + 42, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      // Legs
      ctx.fillStyle = '#2a5a2a';
      ctx.fillRect(gx + 14, gy + g.h - 8, 12, 8);
      ctx.fillRect(gx + g.w - 26, gy + g.h - 8, 12, 8);
      // HP bar
      if (g.hp < g.maxHp) {
        ctx.fillStyle = '#400';
        ctx.fillRect(gx, gy - 8, g.w, 4);
        ctx.fillStyle = '#4d4';
        ctx.fillRect(gx, gy - 8, g.w * (g.hp / g.maxHp), 4);
      }
      // Timer bar
      ctx.fillStyle = '#222';
      ctx.fillRect(gx, gy - 4, g.w, 2);
      ctx.fillStyle = '#8d8';
      ctx.fillRect(gx, gy - 4, g.w * (g.timer / 480), 2);
    }

    // Shadow ultimate: darkness overlay + glowing eyes
    if (this.player.ninjaType === 'shadow' && this.player.shadowDarkness > 0) {
      ctx.save();
      ctx.globalAlpha = this.player.shadowDarkness;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (this.player.ninjaType === 'shadow' && this.player.shadowEyesTimer > 0) {
      ctx.save();
      const eyeAlpha = Math.min(1, this.player.shadowEyesTimer / 20);
      ctx.globalAlpha = eyeAlpha * 0.9;
      const ecx = CANVAS_W / 2;
      const ecy = CANVAS_H / 2 - 40;
      const eyeSize = 8 + Math.sin(this.tick * 0.1) * 2;
      // Left eye
      ctx.fillStyle = '#f0f';
      ctx.shadowColor = '#f0f';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(ecx - 25, ecy, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Right eye
      ctx.beginPath();
      ctx.ellipse(ecx + 25, ecy, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(ecx - 25, ecy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ecx + 25, ecy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Low HP red overlay
    if (this.player.hp / this.player.maxHp <= 0.33 && !this.gameOver) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.15 * (1 - this.player.hp / this.player.maxHp);
      ctx.fillStyle = '#f22';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    for (const p of this.projectiles) p.render(ctx, cam);
    if (this.trimerangs) for (const t of this.trimerangs) t.render(ctx, cam);
    if (this.diamondShards) for (const d of this.diamondShards) d.render(ctx, cam);

    // Crystal ultimate: shatter glass shards
    if (this.player.crystalShatter > 0 && this.player.crystalShards) {
      ctx.save();
      for (const s of this.player.crystalShards) {
        ctx.globalAlpha = s.life / 30 * 0.8;
        ctx.translate(s.x - cam.x, s.y - cam.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = '#aff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6;
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.6);
        ctx.shadowBlur = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();
      // White flash during shatter
      ctx.save();
      ctx.globalAlpha = this.player.crystalShatter / 30 * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // Crystal ultimate: afterimage clones
    if (this.player.crystalClones) {
      const pl = this.player;
      for (const clone of pl.crystalClones) {
        const cx = pl.x + clone.offsetX - cam.x;
        const cy = pl.y + clone.offsetY - cam.y;
        ctx.save();
        ctx.globalAlpha = clone.alpha;
        // Clone body
        ctx.fillStyle = pl.type.color;
        ctx.fillRect(cx, cy, pl.w, pl.h);
        // Tint overlay
        ctx.fillStyle = 'rgba(170,255,255,0.25)';
        ctx.fillRect(cx, cy, pl.w, pl.h);
        // Eyes
        ctx.fillStyle = '#fff';
        const eyeX = pl.facing > 0 ? cx + 14 : cx + 4;
        ctx.fillRect(eyeX, cy + 8, 6, 6);
        ctx.fillStyle = '#0ff';
        ctx.fillRect(pl.facing > 0 ? eyeX + 3 : eyeX, cy + 10, 3, 3);
        // Headband
        ctx.fillStyle = pl.type.accentColor;
        ctx.fillRect(cx, cy + 5, pl.w, 3);
        // Clone attack slash
        if (pl.attacking && pl.attackBox) {
          ctx.globalAlpha = clone.alpha * 0.4;
          const reach = pl.attackBox.w;
          const slashX = pl.facing > 0 ? cx + pl.w : cx - reach;
          ctx.fillStyle = '#aff';
          ctx.fillRect(slashX, cy + 4, reach, pl.h - 8);
        }
        ctx.restore();
      }
    }

    for (const e of this.effects) e.render(ctx, cam);

    this.renderUI();
  }

  renderUI() {
    const pl = this.player;
    const t = pl.type;
    const ninjaKeys = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind'];

    // Bottom UI layout (stacked upward from ninja bar)
    const ninjaBarY = CANVAS_H - 36;
    const gap = 6;

    // Element bar
    let elemBarW = 140, elemBarVal = 0, elemBarMax = 1, elemBarColor = '#aaa', elemBarGlow = false, elemBarLabel = '';
    if (pl.ninjaType === 'fire') {
      elemBarVal = pl.comboMeter; elemBarMax = 10; elemBarColor = '#f93'; elemBarGlow = pl.comboMeter >= 10; elemBarLabel = 'Element';
    } else if (pl.ninjaType === 'bubble') {
      elemBarVal = pl.bubbleBuffTimer; elemBarMax = 240; elemBarColor = '#6af'; elemBarGlow = pl.bubbleBuffTimer > 200; elemBarLabel = 'Float';
    } else if (pl.ninjaType === 'shadow') {
      elemBarVal = pl.shadowStealth; elemBarMax = 300; elemBarColor = '#a4e'; elemBarGlow = pl.backstabReady; elemBarLabel = 'Stealth';
    } else if (pl.ninjaType === 'crystal') {
      elemBarVal = this.diamondShards ? this.diamondShards.length : 0; elemBarMax = 10; elemBarColor = '#0ff'; elemBarGlow = pl.crystalClones != null; elemBarLabel = 'Crystal';
    } else if (pl.ninjaType === 'wind') {
      elemBarVal = pl.windPower; elemBarMax = 10; elemBarColor = '#8d8'; elemBarGlow = pl.windPower >= 10; elemBarLabel = 'Wind';
    } else if (pl.ninjaType === 'earth') {
      elemBarVal = this.stoneBlocks.length; elemBarMax = 10; elemBarColor = '#a87'; elemBarGlow = this.stoneBlocks.length >= 10; elemBarLabel = 'Blocks';
    }
    const elemBarH = 10;
    const elemBarY = ninjaBarY - elemBarH - gap;
    const elemBarX = CANVAS_W / 2 - elemBarW / 2;
    ctx.save();
    if (elemBarGlow) { ctx.shadowColor = elemBarColor; ctx.shadowBlur = 14; }
    ctx.fillStyle = '#222';
    ctx.fillRect(elemBarX, elemBarY, elemBarW, elemBarH);
    ctx.fillStyle = elemBarColor;
    ctx.fillRect(elemBarX, elemBarY, elemBarW * Math.min(1, elemBarVal / elemBarMax), elemBarH);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = elemBarGlow ? '#fff' : '#ccc';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(elemBarLabel, elemBarX + 3, elemBarY + 8);

    // Shield bar (separate row, only if player has shield)
    const hasShield = pl.maxShield > 0;
    const shieldBarH = 8;
    const shieldBarW = 160;
    const shieldBarY = hasShield ? elemBarY - shieldBarH - gap : elemBarY;
    const shieldBarX = CANVAS_W / 2 - shieldBarW / 2;
    if (hasShield) {
      const shieldRatio = pl.shield / pl.maxShield;
      ctx.fillStyle = '#112';
      ctx.fillRect(shieldBarX, shieldBarY, shieldBarW, shieldBarH);
      ctx.fillStyle = '#4af';
      ctx.fillRect(shieldBarX, shieldBarY, shieldBarW * shieldRatio, shieldBarH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`SH ${pl.shield}/${pl.maxShield}`, shieldBarX + 3, shieldBarY + 7);
    }

    // HP bar
    const hpBarH = 10;
    const hpBarW = 180;
    const hpBarY = (hasShield ? shieldBarY : elemBarY) - hpBarH - gap;
    const hpBarX = CANVAS_W / 2 - hpBarW / 2;
    const hpRatio = pl.hp / pl.maxHp;
    ctx.fillStyle = '#400';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = '#e44';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`HP ${pl.hp}/${pl.maxHp}`, hpBarX + 3, hpBarY + 9);

    // Ultimate bar
    const ultimateBarW = 220;
    const ultimateBarH = 14;
    const ultimateBarX = CANVAS_W / 2 - ultimateBarW / 2;
    const ultimateBarY = hpBarY - ultimateBarH - gap;
    ctx.save();
    if (pl.ultimateReady || pl.ultimateActive) {
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = '#222';
    ctx.fillRect(ultimateBarX, ultimateBarY, ultimateBarW, ultimateBarH);
    ctx.fillStyle = pl.ultimateActive ? '#ff0' : (pl.ultimateReady ? '#ffd700' : '#555');
    ctx.fillRect(ultimateBarX, ultimateBarY, ultimateBarW * Math.min(1, pl.ultimateCharge / pl.ultimateMax), ultimateBarH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ultimateBarX, ultimateBarY, ultimateBarW, ultimateBarH);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ultimateBarX, ultimateBarY, ultimateBarW, ultimateBarH);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = pl.ultimateActive ? '#ff0' : (pl.ultimateReady ? '#ffd700' : '#555');
    ctx.fillRect(ultimateBarX, ultimateBarY, ultimateBarW * Math.min(1, pl.ultimateCharge / pl.ultimateMax), ultimateBarH);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px monospace';
    if (pl.ultimateReady && !pl.ultimateActive) {
      ctx.fillStyle = '#ffd700';
      const readyText = 'ULTIMATE READY! [V/M/Y]';
      const tw = ctx.measureText(readyText).width;
      ctx.fillText(readyText, CANVAS_W / 2 - tw / 2, ultimateBarY + 11);
    } else if (pl.ultimateActive) {
      ctx.fillStyle = '#fff';
      ctx.fillText('ULTIMATE ACTIVE', ultimateBarX + 4, ultimateBarY + 11);
    } else {
      ctx.fillStyle = '#ccc';
      const pct = Math.floor((pl.ultimateCharge / pl.ultimateMax) * 100);
      ctx.fillText(`ULT ${pct}%`, ultimateBarX + 4, ultimateBarY + 11);
    }

    // Ninja selection bar
    const ninjaBarX = CANVAS_W / 2 - 156;
    for (let i = 0; i < 6; i++) {
      const nt = NINJA_TYPES[ninjaKeys[i]];
      const bx = ninjaBarX + i * 52;
      const selected = pl.ninjaType === ninjaKeys[i];
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, ninjaBarY, 48, 28);
      if (selected) {
        ctx.strokeStyle = nt.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, ninjaBarY, 48, 28);
      }
      ctx.fillStyle = nt.color;
      ctx.fillRect(bx + 4, ninjaBarY + 4, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(`${i + 1}`, bx + 20, ninjaBarY + 14);
      ctx.font = '8px monospace';
      ctx.fillText(ninjaKeys[i].substring(0, 4), bx + 20, ninjaBarY + 23);
    }

    // Shuriken display
    if (typeof window !== 'undefined' && document.getElementById('shuriken-bar')) {
      const shurikenBar = document.getElementById('shuriken-bar');
      shurikenBar.innerHTML = '';
      shurikenBar.style.marginTop = '38px';
      shurikenBar.style.marginBottom = '0px';
      shurikenBar.style.height = '38px';
      shurikenBar.style.display = 'flex';
      shurikenBar.style.justifyContent = 'center';
      shurikenBar.style.alignItems = 'center';
      for (let i = 0; i < pl.maxShurikens; i++) {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.style.width = '28px';
        span.style.height = '28px';
        span.style.margin = '0 4px';
        span.style.opacity = i < pl.shurikens ? '1' : '0.25';
        span.style.verticalAlign = 'middle';
        span.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><polygon points="14,3 16,12 25,14 16,16 14,25 12,16 3,14 12,12" fill="#ccc"/></svg>';
        shurikenBar.appendChild(span);
      }
    }

    // Death counter + Lives (top left)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, 8, 130, 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 130, 24);
    ctx.fillStyle = '#f66';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Deaths: ${this.deaths}`, 16, 25);
    ctx.fillStyle = '#4f4';
    for (let i = 0; i < this.lives; i++) {
      ctx.fillText('\u2665', 100 + i * 12, 25);
    }

    // Wave info panel (top right)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(CANVAS_W - 175, 8, 167, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_W - 175, 8, 167, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Wave ${this.wave}/${TOTAL_WAVES}`, CANVAS_W - 167, 24);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Kills: ${this.totalKills}`, CANVAS_W - 167, 38);

    // Progress bar (top center)
    if (!this.gameWon && !(this.boss && !this.boss.dead)) {
      const pbW = 400, pbH = 18;
      const pbX = CANVAS_W / 2 - pbW / 2;
      const pbY = 10;
      const waveDef = WAVE_DEFS[this.wave - 1];
      const pct = this.bossActive ? 1 : Math.min(1, this.waveKills / waveDef.killsForBoss);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(pbX - 2, pbY - 2, pbW + 4, pbH + 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(pbX, pbY, pbW, pbH);
      const barColor = this.bossActive ? '#f44' : `hsl(${30 + pct * 90}, 80%, 50%)`;
      ctx.fillStyle = barColor;
      ctx.fillRect(pbX, pbY, pbW * pct, pbH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pbX, pbY, pbW, pbH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      const label = this.bossActive
        ? `BOSS ${this.wave}/${TOTAL_WAVES}`
        : `${this.waveKills}/${waveDef.killsForBoss}`;
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, CANVAS_W / 2 - tw / 2, pbY + 14);
    }

    // Boss HP bar (top center)
    if (this.boss && !this.boss.dead) {
      const bw = 300;
      const bx = CANVAS_W / 2 - bw / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 4, 6, bw + 8, 24);
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 12px monospace';
      const bossLabel = `${this.boss.name} [${this.wave}/${TOTAL_WAVES}]`;
      ctx.fillText(bossLabel, bx, 20);
      const labelW = ctx.measureText(bossLabel).width + 8;
      ctx.fillStyle = '#400';
      ctx.fillRect(bx + labelW, 10, bw - labelW, 14);
      ctx.fillStyle = this.boss.phase === 2 ? '#f22' : '#e44';
      ctx.fillRect(bx + labelW, 10, (bw - labelW) * (this.boss.hp / this.boss.maxHp), 14);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(`${this.boss.hp}/${this.boss.maxHp}`, bx + bw - 55, 21);
    }

    // Wave / boss message
    if (this.waveMessageTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.waveMessageTimer / 30);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px monospace';
      const tw = ctx.measureText(this.waveMessage).width;
      ctx.fillText(this.waveMessage, CANVAS_W / 2 - tw / 2, CANVAS_H / 2 - 60);
      ctx.globalAlpha = 1;
    }

    // Touch controls overlay
    if (isTouchDevice) {
      ctx.globalAlpha = 0.25;
      const dcx = CANVAS_W * 0.15, dcy = CANVAS_H * 0.78;
      const ds = 28;
      ctx.fillStyle = touchState.up ? '#fff' : '#888';
      ctx.fillRect(dcx - ds / 2, dcy - ds * 1.6, ds, ds);
      ctx.fillStyle = touchState.down ? '#fff' : '#888';
      ctx.fillRect(dcx - ds / 2, dcy + ds * 0.6, ds, ds);
      ctx.fillStyle = touchState.left ? '#fff' : '#888';
      ctx.fillRect(dcx - ds * 1.6, dcy - ds / 2, ds, ds);
      ctx.fillStyle = touchState.right ? '#fff' : '#888';
      ctx.fillRect(dcx + ds * 0.6, dcy - ds / 2, ds, ds);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('\u25B2', dcx - 5, dcy - ds * 0.9);
      ctx.fillText('\u25BC', dcx - 5, dcy + ds * 1.3);
      ctx.fillText('\u25C0', dcx - ds * 1.3, dcy + 4);
      ctx.fillText('\u25B6', dcx + ds * 0.9, dcy + 4);
      const abx = CANVAS_W * 0.82, aby = CANVAS_H * 0.78;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = touchState.attack ? '#f44' : '#844';
      ctx.beginPath(); ctx.arc(abx - 30, aby, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = touchState.special ? '#44f' : '#448';
      ctx.beginPath(); ctx.arc(abx + 30, aby, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = touchState.shuriken ? '#ff4' : '#884';
      ctx.beginPath(); ctx.arc(abx, aby - 40, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ATK', abx - 40, aby + 4);
      ctx.fillText('SPC', abx + 18, aby + 4);
      ctx.fillText('SHR', abx - 12, aby - 36);
      ctx.globalAlpha = 1;
    }

    // Victory screen
    if (this.gameWon) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#4f4';
      ctx.font = 'bold 36px monospace';
      const vt = 'VICTORY!';
      const vtw = ctx.measureText(vt).width;
      ctx.fillText(vt, CANVAS_W / 2 - vtw / 2, CANVAS_H / 2 - 40);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      const st = `Kills: ${this.totalKills}  Deaths: ${this.deaths}`;
      const stw = ctx.measureText(st).width;
      ctx.fillText(st, CANVAS_W / 2 - stw / 2, CANVAS_H / 2 + 10);
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      const rt = 'Press R to restart';
      const rtw = ctx.measureText(rt).width;
      ctx.fillText(rt, CANVAS_W / 2 - rtw / 2, CANVAS_H / 2 + 40);
    }

    // Game Over screen
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 36px monospace';
      const got = 'GAME OVER';
      const gotw = ctx.measureText(got).width;
      ctx.fillText(got, CANVAS_W / 2 - gotw / 2, CANVAS_H / 2 - 40);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      const gost = `Wave: ${this.wave}/${TOTAL_WAVES}  Kills: ${this.totalKills}  Deaths: ${this.deaths}`;
      const gostw = ctx.measureText(gost).width;
      ctx.fillText(gost, CANVAS_W / 2 - gostw / 2, CANVAS_H / 2 + 10);
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      const gort = 'Press R to restart';
      const gortw = ctx.measureText(gort).width;
      ctx.fillText(gort, CANVAS_W / 2 - gortw / 2, CANVAS_H / 2 + 40);
    }
  }
}
