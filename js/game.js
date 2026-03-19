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
    this.bossItems = [];
    this.fireTrails = [];
    this.spikes = [];
    this.trimerangs = [];
    this.diamondShards = [];
    this.crystalCastle = null;
    this.deaths = 0;
    this.lives = 3;
    this.gameOver = false;
    this.cheated = false;
    this.levelType = 'open';
    this.levelW = 3200;
    this.levelH = 540;

    // Wave / spawn system
    this.wave = 1;
    this.waveKills = 0;
    this.totalKills = 0;
    this.spawnedMiniboss = new Set();
    this.maxEnemies = 32;
    this.spawnTimer = 0;
    this.spawnInterval = 50;
    this.boss = null;
    this.bossActive = false;
    this.bossMessage = 0;
    this.waveMessage = '';
    this.waveMessageTimer = 0;
    this.gameWon = false;
    this.itemPickupOverlay = null; // { itemId, timer }

    // Phrase system
    this.phraseText = '';
    this.phraseTimer = 0;
    this.phraseMaxTimer = 0;
    this.phraseColor = '#fff';
    this.phraseSource = null;
    this.ninjaResponseText = '';
    this.ninjaResponseTimer = 0;
    this.ninjaResponseMaxTimer = 0;
    this.ninjaResponseColor = '#fff';
    this.ninjaResponseActive = false;
    this.ninjaResponseSource = null;
    this.gameOverDelay = 0;
    this.killerInfo = null;
    this.killPhraseText = '';
    this.killPhraseTimer = 0;
    this.killPhraseMaxTimer = 0;
    this.killPhraseColor = '#f88';
    this.killPhrasePos = null;
    this.ninjaKillResponseText = '';
    this.ninjaKillResponseTimer = 0;
    this.ninjaKillResponseMaxTimer = 0;
    this.ninjaKillResponseColor = '#fff';
    this.ninjaKillResponsePos = null;
    this.transitionTimer = 0;

    // ── Procedural world / zone state ─────────────────────────
    this.zoneType        = 'open1'; // open1,tower_down,arena1,open2,arena2,tower_up
    this.pendingZone     = null;    // zone queued for transition
    this.exitDoor        = null;    // { x,y,w,h,triggered }
    this.towerCorridor   = null;    // (legacy, unused)
    this.inlineTower     = null;    // inline tower built at end of open field
    this.towerXOffset    = 0;       // X offset for inline tower positioning
    this.leftBoundary    = 0;       // camera left clamp in open zones
    this.highWaterX      = 0;       // farthest x player has been
    this.worldX          = 0;       // rightmost generated chunk edge
    this.worldChunkCount = 0;
    this.towerScrollY    = 0;       // autoscroll y target
    this.towerScrollSpeed = 0;
    this.towerTopY       = 0;
    this.towerBottomY    = 0;
    this.towerBossRoomY  = 0;
    this.towerScrollDelay = 0;      // frames to wait before scrolling starts

    this.startZone('open1');
    this.showWaveMessage('Wave 1/' + TOTAL_WAVES + ' — Fight!');
    // Start phrase (character-specific)
    const startPool = NINJA_START_PHRASES[this.player.ninjaType] || START_PHRASES;
    this.phraseText = pickPhrase(startPool);
    this.phraseTimer = 100;
    this.phraseMaxTimer = 100;
    this.phraseColor = this.player.type.accentColor;
    this.phraseSource = this.player;
  }

  showWaveMessage(text) {
    this.waveMessage = text;
    this.waveMessageTimer = 180;
  }

  renderSpawnHouse(ctx, cam) {
    // Small tent at spawn point
    let tentX, tentGroundY;
    if (this.levelType === 'tower') {
      tentX = this.towerXOffset + 380; tentGroundY = 440;
    } else if (this.levelType === 'arena') {
      tentX = 130; tentGroundY = 400;
    } else {
      tentX = 170; tentGroundY = 340; // on leftmost thin platform
    }
    const tw = 70, th = 50;
    const cx = tentX - cam.x;
    const by = tentGroundY - cam.y;

    // Tent body (triangle)
    ctx.fillStyle = '#8b5e3c';
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, by);
    ctx.lineTo(cx, by - th);
    ctx.lineTo(cx + tw / 2, by);
    ctx.closePath();
    ctx.fill();

    // Tent outline
    ctx.strokeStyle = '#5a3420';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, by);
    ctx.lineTo(cx, by - th);
    ctx.lineTo(cx + tw / 2, by);
    ctx.stroke();

    // Center seam
    ctx.strokeStyle = '#6b4228';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, by - th);
    ctx.lineTo(cx, by);
    ctx.stroke();

    // Door flap (open, slight gap)
    ctx.fillStyle = '#704a2a';
    ctx.beginPath();
    ctx.moveTo(cx - 2, by);
    ctx.lineTo(cx - 10, by - 28);
    ctx.lineTo(cx - 2, by - 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 2, by);
    ctx.lineTo(cx + 10, by - 28);
    ctx.lineTo(cx + 2, by - 28);
    ctx.closePath();
    ctx.fill();

    // Pole tip
    ctx.fillStyle = '#c8b070';
    ctx.beginPath();
    ctx.arc(cx, by - th - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  buildLevel() {
    this.platforms = [];
    this.spikes = [];
    const waveDef = WAVE_DEFS[this.wave - 1];
    const bossType = waveDef ? waveDef.boss : 'walker';
    // Flying bosses → TOWER (except flyshooter on last wave → OPEN), miniboss types → ARENA, else OPEN
    if (bossType === 'flyer') {
      this.levelType = 'tower';
    } else if (bossType === 'flyshooter') {
      this.levelType = 'open';
    } else if (bossType === 'deflector' || bossType === 'protector' || bossType === 'attacker') {
      this.levelType = 'arena';
    } else {
      this.levelType = 'open';
    }
    switch (this.levelType) {
      case 'arena': this.buildArena(); break;
      case 'tower': this.buildTower(); break;
      default: this.buildOpen(); break;
    }
  }

  buildOpen() {
    this.levelW = 3200;
    this.levelH = 540;
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

  buildArena() {
    this.levelW = 1200;
    this.levelH = 540;
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x, y, w, 6, '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x, y, w));

    // Ground
    P(0, 480, 1200, 60, '#555');

    // Side walls
    P(-32, 0, 32, 540, '#444');
    P(1200, 0, 32, 540, '#444');

    // Layer 1 — lower platforms
    P(80, 400, 200, 16, '#666');
    P(500, 400, 200, 16, '#666');
    P(920, 400, 200, 16, '#666');

    // Layer 2 — mid platforms
    P(200, 310, 180, 16, '#777');
    P(510, 310, 180, 16, '#777');
    P(820, 310, 180, 16, '#777');

    // Layer 3 — top platforms
    P(350, 220, 160, 16, '#888');
    P(690, 220, 160, 16, '#888');

    // Thin platforms scattered
    TP(50, 340, 100);
    TP(350, 360, 80);
    TP(770, 360, 80);
    TP(1050, 340, 100);
    TP(150, 260, 90);
    TP(560, 260, 80);
    TP(950, 260, 90);
    TP(450, 170, 80);
    TP(670, 170, 80);

    // Spikes
    S(300, 468, 48);
    S(550, 468, 48);
    S(850, 468, 48);
    S(400, 304, 36);
    S(720, 304, 36);
  }

  buildTower() {
    this.levelW = 960;
    this.levelH = 1200;
    const ox = 80; // center offset — tower is 800px wide in 960px canvas
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x + ox, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x + ox, y, w, 6, '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x + ox, y, w));

    // Side walls (full height)
    P(-32, -660, 32, 1900, '#444');
    P(800, -660, 32, 1900, '#444');

    // Bottom: spikes instead of ground
    S(0, 488, 800);

    // Starting platform at bottom
    P(200, 440, 250, 16, '#666');

    // Ascending — sparse platforms with gaps to fall through
    // Floor 1 — left only
    P(50, 370, 130, 16, '#666');
    TP(550, 390, 90);

    // Floor 2 — right only with wall ledge
    P(550, 310, 140, 16, '#777');
    P(704, 300, 16, 50, '#686');

    // Floor 3 — center narrow
    P(300, 250, 120, 16, '#777');

    // Floor 4 — left with L
    P(50, 190, 130, 16, '#888');
    P(50, 170, 16, 40, '#686');
    TP(450, 200, 80);

    // Floor 5 — right only
    P(580, 130, 130, 16, '#777');

    // Floor 6 — center narrow + gap
    P(200, 60, 110, 16, '#888');
    TP(550, 70, 80);

    // Floor 7 — left with wall climb
    P(80, -10, 120, 16, '#777');
    P(650, -20, 70, 16, '#686');
    P(704, -20, 16, 40, '#686');

    // Floor 8 — center
    P(320, -80, 130, 16, '#888');

    // Floor 9 — right only
    P(550, -150, 120, 16, '#777');
    TP(150, -140, 80);

    // Floor 10 — left
    P(80, -220, 130, 16, '#888');

    // Top platform
    P(250, -280, 300, 16, '#999');

    // Wall-climbing ledges (sparse, alternating)
    P(0, 330, 25, 10, '#555');
    P(775, 240, 25, 10, '#555');
    P(0, 120, 25, 10, '#555');
    P(775, 30, 25, 10, '#555');
    P(0, -80, 25, 10, '#555');
    P(775, -170, 25, 10, '#555');
  }

  // ── Zone management ───────────────────────────────────────
  startZone(zone) {
    this.zoneType  = zone;
    this.levelType = ZONE_LEVEL_TYPE[zone];
    this.platforms = [];
    this.spikes    = [];
    this.enemies   = [];
    this.projectiles = [];
    this.stoneBlocks = [];
    this.stonePillars = [];
    this.bubbles    = [];
    this.orbs       = [];
    this.bossItems  = [];
    this.effects    = [];
    this.fireTrails = [];
    if (this.diamondShards) this.diamondShards = [];
    this.crystalCastle = null;
    this.boss       = null;
    this.bossActive = false;
    this.exitDoor   = null;
    this.towerCorridor = null;
    this.inlineTower = null;
    this.towerXOffset = 0;
    switch (zone) {
      case 'open1':
      case 'open2': this._setupOpenZone(); break;
      case 'tower_down': this._setupTowerDown(); break;
      case 'tower_up':   this._setupTowerUp();   break;
      case 'arena1':
      case 'arena2': this.buildArena(); this.levelW = 1200; this.levelH = 540; break;
    }
  }

  _setupOpenZone() {
    this.levelH          = 540;
    this.leftBoundary    = 0;
    this.highWaterX      = 0;
    this.worldX          = 0;
    this.worldChunkCount = 0;
    for (let i = 0; i < 7; i++) this._addOpenChunk();
    this.levelW = this.worldX + CANVAS_W;
  }

  _addOpenChunk() {
    generateOpenChunk(this.worldX, this.worldChunkCount,
      { platforms: this.platforms, spikes: this.spikes });
    this.worldChunkCount++;
    this.worldX += CHUNK_W;
  }

  _generateOpenAhead() {
    if (this.exitDoor || this.inlineTower || this.bossActive) return; // stop once transition path placed
    const PRERENDER = 1800;
    while (this.player.x + PRERENDER > this.worldX) {
      this._addOpenChunk();
      this.levelW = this.worldX + CANVAS_W;
    }
    // Prune chunks far behind left boundary
    const pruneX = this.leftBoundary - 2400;
    this.platforms = this.platforms.filter(p => !p._chunkX || p._chunkX >= pruneX);
    this.spikes    = this.spikes.filter(s => !s._chunkX || s._chunkX >= pruneX);
  }

  _setupTowerDown() {
    this.levelW          = 960;
    this.towerScrollSpeed = 0.45;
    this.towerScrollY    = 0;
    this.towerScrollDelay = 210;    // ~3.5s lock before scroll starts
    const r = buildTowerDownLayout(this.platforms, this.spikes, 14);
    this.towerTopY      = r.topY;
    this.towerBottomY   = r.bottomY;
    this.towerBossRoomY = r.bossRoomY;
    this.levelH = this.towerBottomY + 300;
  }

  _setupTowerUp() {
    this.levelW          = 960;
    this.towerScrollSpeed = 0.55;
    this.towerScrollDelay = 210;    // ~3.5s lock before scroll starts
    const r = buildTowerUpLayout(this.platforms, this.spikes, 16);
    this.towerTopY      = r.topY;
    this.towerBottomY   = r.bottomY;
    this.towerBossRoomY = r.bossRoomY;
    this.towerScrollY   = this.towerBottomY - CANVAS_H; // start at bottom
    this.levelH = this.towerBottomY + 300;
  }

  spawnExitDoor() {
    const dw = 48, dh = 80;
    let dx, dy;
    if (this.zoneType === 'open1' || this.zoneType === 'open2') {
      // Flat run-up then door
      const runX = this.worldX;
      const flat = new Platform(runX - 100, 480, 800, 60, '#555');
      flat._chunkX = runX - 100;
      this.platforms.push(flat);
      dx = runX + 600;
      dy = 480 - dh;
      this.worldX  = dx + dw + 200;
      this.levelW  = this.worldX + CANVAS_W;
    } else if (this.zoneType === 'tower_down') {
      // Center of boss room floor platform
      dx = this.towerXOffset + TOWER_OX + 260 + 135 - dw / 2;
      dy = this.towerBossRoomY + TOWER_SECTION_H * 0.28 - dh;
    } else if (this.zoneType === 'arena1' || this.zoneType === 'arena2') {
      dx = this.levelW - dw - 20;
      dy = 480 - dh;
    } else {
      return; // tower_up → victory, no door
    }
    this.exitDoor = { x: dx, y: dy, w: dw, h: dh, triggered: false };
  }

  buildInlineTower(nextZone) {
    // Build the tower physically at the end of the current area — no teleports.
    const isDown = nextZone === 'tower_down';

    let runX, corridorLen, towerBaseX;

    if (this.zoneType === 'open1' || this.zoneType === 'open2') {
      runX = this.worldX;
      corridorLen = 600;
      towerBaseX = runX + corridorLen;
    } else if (this.zoneType === 'arena1' || this.zoneType === 'arena2') {
      runX = this.levelW - 200;
      corridorLen = 200;
      towerBaseX = runX + corridorLen;
    } else {
      return false;
    }

    // ── Corridor connecting current area to tower ──
    const floorP = new Platform(runX - 100, 480, corridorLen + 200, 60, '#545');
    floorP._chunkX = runX;
    this.platforms.push(floorP);
    const roofP = new Platform(runX + 80, 356, corridorLen - 60, 16, '#4a4a4a');
    roofP._chunkX = runX;
    this.platforms.push(roofP);
    const cWall = new Platform(runX + 80, 356, 16, 124, '#4a4a4a');
    cWall._chunkX = runX;
    this.platforms.push(cWall);

    // ── Generate tower layout, then shift into world position ──
    const tPlats = [];
    const tSpks  = [];
    let r;
    if (isDown) {
      r = buildTowerDownLayout(tPlats, tSpks, 14);
    } else {
      r = buildTowerUpLayout(tPlats, tSpks, 16);
    }
    const deltaX = towerBaseX;
    const deltaY = isDown ? (480 - r.topY) : (480 - r.bottomY);
    for (const p of tPlats) { p.x += deltaX; p.y += deltaY; }
    for (const s of tSpks)  { s.x += deltaX; s.y += deltaY; }

    // Split the left wall to create an entrance gap (y 356→540)
    const lwX = towerBaseX + TOWER_OX - 32;
    const gapTop = 356, gapBot = 540;
    for (let i = tPlats.length - 1; i >= 0; i--) {
      const p = tPlats[i];
      if (Math.abs(p.x - lwX) < 2 && p.w === 32 && p.h > 500) {
        const wTop = p.y, wBot = p.y + p.h;
        tPlats.splice(i, 1);
        if (gapTop > wTop) {
          const a = new Platform(p.x, wTop, 32, gapTop - wTop, p.color);
          a._towerPiece = true; tPlats.push(a);
        }
        if (wBot > gapBot) {
          const b = new Platform(p.x, gapBot, 32, wBot - gapBot, p.color);
          b._towerPiece = true; tPlats.push(b);
        }
        break;
      }
    }

    // Entry ledge: extends corridor floor into the tower entrance
    const ledge = new Platform(lwX, 480, TOWER_OX + 300, 60, '#545');
    ledge._towerPiece = true;
    tPlats.push(ledge);

    this.platforms.push(...tPlats);
    this.spikes.push(...tSpks);

    // Store tower parameters
    const sTopY  = r.topY  + deltaY;
    const sBotY  = r.bottomY + deltaY;
    const sBossY = r.bossRoomY + deltaY;
    this.inlineTower = {
      baseX:      towerBaseX,
      topY:       sTopY,
      bottomY:    sBotY,
      bossRoomY:  sBossY,
      scrollSpeed: isDown ? 0.45 : 0.55,
      scrollDelay: 210,
      direction:  isDown ? 'down' : 'up',
      entered:    false,
      targetZone: nextZone,
      triggerX:   lwX + 48,   // just past the left wall gap
    };

    // Extend world bounds
    if (this.zoneType === 'open1' || this.zoneType === 'open2') {
      this.worldX = towerBaseX + 960;
      this.levelW = this.worldX + CANVAS_W;
    } else {
      this.levelW = towerBaseX + 960 + CANVAS_W;
    }
    this.levelH = Math.max(this.levelH, sBotY + 300);
    return true;
  }

  checkZoneTransition() {
    // Inline tower: player physically walks into the shaft — activate tower mode
    if (this.inlineTower && !this.inlineTower.entered && this.pendingZone) {
      const pl = this.player;
      if (pl.x + pl.w * 0.5 >= this.inlineTower.triggerX) {
        this._activateInlineTower();
        return;
      }
    }
    if (!this.exitDoor || this.exitDoor.triggered || !this.pendingZone) return;
    const pl = this.player;
    if (rectOverlap(pl, this.exitDoor)) {
      this.exitDoor.triggered = true;
      this.enterNextZone();
    }
  }

  _activateInlineTower() {
    // Seamlessly switch to tower mode — no wipe, no teleport.
    const t = this.inlineTower;
    const zone = t.targetZone;
    t.entered = true;
    this.pendingZone = null;
    this.zoneType  = zone;
    this.levelType = 'tower';
    this.towerXOffset   = t.baseX;
    this.towerBottomY   = t.bottomY;
    this.towerBossRoomY = t.bossRoomY;
    this.towerScrollSpeed = t.scrollSpeed;
    this.towerScrollDelay = t.scrollDelay;
    if (t.direction === 'down') {
      // Set topY low enough so camera isn't snapped away from entry view
      this.towerTopY    = Math.min(t.topY, this.camera.y) - 40;
      this.towerScrollY = this.camera.y;
    } else {
      this.towerTopY    = t.topY;
      // Set bottomY high enough to include entry view
      this.towerBottomY = Math.max(t.bottomY, this.camera.y + CANVAS_H) + 40;
      this.towerScrollY = Math.max(t.bottomY - CANVAS_H, this.camera.y);
    }
    this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 90);
    this.spawnTimer = -120;
    SFX.wave();
    this.showWaveMessage(`Wave ${this.wave}/${TOTAL_WAVES} — Fight!`);
  }

  enterNextZone() {
    // Used for non-tower transitions (exit door → arena/open).
    const zone = this.pendingZone;
    if (!zone) return;
    this.pendingZone = null;
    this.transitionTimer = 60;
    this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 90);
    this.startZone(zone);
    const e = ZONE_ENTRY[zone] || { x: 100, y: 440 };
    this.player.x = e.x;
    this.player.y = e.y;
    this.camera.x = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.spawnTimer = -120;
    SFX.wave();
    this.showWaveMessage(`Wave ${this.wave}/${TOTAL_WAVES} — Fight!`);
  }

  _getCameraBounds() {
    if (this.zoneType === 'tower_down' || this.zoneType === 'tower_up') {
      const tx = this.towerXOffset;
      return { minX: tx, maxX: tx,
               minY: this.towerTopY, maxY: this.towerBottomY - CANVAS_H };
    }
    const minX = (this.zoneType === 'open1' || this.zoneType === 'open2')
      ? this.leftBoundary : 0;
    return { minX, maxX: Math.max(minX, this.levelW - CANVAS_W),
             minY: -100, maxY: 540 - CANVAS_H };
  }

  _updateZone() {
    const pl = this.player;
    if (this.zoneType === 'tower_down' || this.zoneType === 'tower_up') {
      // ── Tower auto-scroll ──────────────────────────────────
      if (this.towerScrollDelay > 0) {
        this.towerScrollDelay--;
      } else {
        if (this.zoneType === 'tower_down') {
          this.towerScrollY = Math.min(
            this.towerScrollY + this.towerScrollSpeed,
            this.towerBottomY - CANVAS_H
          );
          // Soft push: nudge player down if above camera top
          const camTop = this.towerScrollY - 30;
          if (pl.y < camTop) {
            pl.vy = Math.max(pl.vy, 2.5);
            if (pl.y < camTop - 100) { pl.y = camTop - 100; pl.takeDamage(1, this); }
          }
        } else {
          this.towerScrollY = Math.max(
            this.towerScrollY - this.towerScrollSpeed,
            this.towerTopY
          );
          // Soft push: nudge player up if below camera bottom
          const camBot = this.towerScrollY + CANVAS_H + 30;
          if (pl.y + pl.h > camBot) {
            pl.vy = Math.min(pl.vy, -2.5);
            if (pl.y > camBot + 100) { pl.y = camBot + 80; pl.takeDamage(1, this); }
          }
        }
      }
      // Camera follows scroll target — smooth lock X to tower center
      this.camera.x = lerp(this.camera.x, this.towerXOffset, 0.10);
      this.camera.y = lerp(this.camera.y, this.towerScrollY, 0.07);
    } else {
      // ── Open / Arena standard follow ───────────────────────
      const tcx = pl.x + pl.w / 2 - CANVAS_W / 2;
      const tcy = pl.y + pl.h / 2 - CANVAS_H / 2;
      this.camera.x = lerp(this.camera.x, tcx, 0.08);
      this.camera.y = lerp(this.camera.y, tcy, 0.08);
      // Left boundary push in open zones
      if (this.zoneType === 'open1' || this.zoneType === 'open2') {
        this.highWaterX = Math.max(this.highWaterX, pl.x);
        const lbTarget = this.highWaterX - 1400;
        if (lbTarget > this.leftBoundary)
          this.leftBoundary = Math.min(this.leftBoundary + 1.5, lbTarget);
        if (pl.x < this.leftBoundary + 15) {
          pl.x = this.leftBoundary + 15;
          if (pl.vx < 0) pl.vx = 0;
        }
        this._generateOpenAhead();
      }
      // Smooth camera approach toward inline tower
      if (this.inlineTower && !this.inlineTower.entered && this.pendingZone) {
        const approachDist = pl.x - (this.inlineTower.baseX - 400);
        if (approachDist > 0) {
          const lockTarget = this.inlineTower.baseX;
          this.camera.x = lerp(this.camera.x, lockTarget, 0.06);
        }
      }
    }
    // Clamp camera
    const cb = this._getCameraBounds();
    this.camera.x = Math.max(cb.minX, Math.min(this.camera.x, cb.maxX));
    this.camera.y = Math.max(cb.minY, Math.min(this.camera.y, cb.maxY));
  }

  _renderZoneOverlays(ctx, cam) {
    // Left boundary push indicator (open zones)
    if ((this.zoneType === 'open1' || this.zoneType === 'open2') && this.leftBoundary > 20) {
      const lbx = this.leftBoundary - cam.x;
      if (lbx < CANVAS_W) {
        ctx.save();
        const g = ctx.createLinearGradient(lbx, 0, lbx + 28, 0);
        g.addColorStop(0, 'rgba(180,30,30,0.38)');
        g.addColorStop(1, 'rgba(180,30,30,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lbx, 0, 28, CANVAS_H);
        ctx.restore();
      }
    }
    // Tower scroll direction arrow
    if (this.zoneType === 'tower_down' || this.zoneType === 'tower_up') {
      const dir   = this.zoneType === 'tower_down' ? '↓' : '↑';
      const range = Math.max(1, this.towerBottomY - CANVAS_H - this.towerTopY);
      const pct   = this.zoneType === 'tower_down'
        ? Math.round((this.towerScrollY - this.towerTopY) / range * 100)
        : Math.round((1 - (this.towerScrollY - this.towerTopY) / range) * 100);
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.3 * Math.sin(this.tick * 0.1);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${dir} ${pct}%`, CANVAS_W - 6, 28);
      ctx.textAlign = 'left';
      ctx.restore();
    }
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
    // Protector/attacker minibosses: only spawn once per wave
    if (pick.big && (pick.type === 'protector' || pick.type === 'attacker')) {
      if (this.spawnedMiniboss.has(pick.type)) return;
    }
    const isFlying = (pick.type === 'flyer' || pick.type === 'flyshooter');
    const side = Math.random() < 0.5 ? -1 : 1;
    const spawnDist = this.levelW < 1000 ? randInt(150, 300) : randInt(350, 550);
    let x = this.player.x + side * spawnDist;
    let y = isFlying ? randInt(50, 250) : -40;
    if (this.zoneType === 'tower_down') {
      // Always spawn below view in descending tower.
      y = Math.min(this.camera.y + CANVAS_H + randInt(60, 150), this.towerBottomY - 40);
    } else if (this.zoneType === 'tower_up') {
      // Always spawn above view in ascending tower.
      y = Math.max(this.camera.y - randInt(100, 180), this.towerTopY + 8);
    } else if (this.levelType === 'tower') {
      y = Math.min(this.player.y - 100, 200);
    }
    const txOff = this.towerXOffset;
    const xMin = this.levelType === 'tower' ? txOff + TOWER_OX + 40 : 40;
    const xMax = this.levelType === 'tower' ? txOff + TOWER_OX + TOWER_CORRIDOR_W - 40 : this.levelW - 60;
    x = Math.max(xMin, Math.min(xMax, x));
    const e = new Enemy(x, y, pick.type, !!pick.big, this.wave);
    // Elemental variant chance
    if (Math.random() < ELEMENTAL_SPAWN_CHANCE) {
      e.element = ENEMY_ELEMENTS[Math.floor(Math.random() * ENEMY_ELEMENTS.length)];
      e.elementColors = ELEMENT_COLORS[e.element];
      e.color = e.elementColors.body;
    }
    if (pick.big && (pick.type === 'protector' || pick.type === 'attacker')) {
      this.spawnedMiniboss.add(pick.type);
    }
    this.enemies.push(e);
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, e.element ? e.elementColors.particle : '#fff', 6, 3, 10));
  }

  spawnBoss() {
    const waveDef = WAVE_DEFS[this.wave - 1];
    let bx, by;
    if (this.zoneType === 'tower_down' || this.zoneType === 'tower_up') {
      bx = this.towerXOffset + CANVAS_W / 2 - 28;
      by = this.camera.y + CANVAS_H * 0.5;
    } else {
      bx = Math.min(this.player.x + 300, this.levelW - 100);
      by = 300;
    }
    this.boss = new Boss(bx, by, waveDef.boss, this.wave);
    // Elemental variant chance
    if (Math.random() < ELEMENTAL_SPAWN_CHANCE) {
      this.boss.element = ENEMY_ELEMENTS[Math.floor(Math.random() * ENEMY_ELEMENTS.length)];
      this.boss.elementColors = ELEMENT_COLORS[this.boss.element];
      this.boss.color = this.boss.elementColors.body;
    }
    this.bossActive = true;
    this.bossMessage = 180;
    this.effects.push(new Effect(this.boss.x + 28, this.boss.y + 28, this.boss.element ? this.boss.elementColors.particle : '#f44', 25, 6, 25));
    SFX.bossSpawn();
    this.showWaveMessage(this.boss.name + ` (${this.wave}/${TOTAL_WAVES})`);
    // Boss entrance phrase
    this.ninjaResponseActive = false;
    const bPhrase = getBattlePhrase(waveDef.boss, this.player.ninjaType, this.boss.element);
    if (bPhrase) {
      this.phraseText = bPhrase;
      this.phraseTimer = 150;
      this.phraseMaxTimer = 150;
      this.phraseColor = this.boss.element ? ELEMENT_COLORS[this.boss.element].accent : '#faa';
      this.phraseSource = this.boss;
      // Schedule ninja response
      const nResp = getNinjaResponse(this.player.ninjaType, waveDef.boss, this.boss.element);
      if (nResp) {
        this.ninjaResponseText = nResp;
        this.ninjaResponseTimer = -90;
        this.ninjaResponseColor = this.player.type.accentColor;
        this.ninjaResponseSource = this.player;
      }
    }
  }

  advanceWave() {
    if (this.wave >= TOTAL_WAVES) {
      if (this.cheated) {
        this.gameOver = true;
        this.boss = null;
        this.bossActive = false;
        this.showWaveMessage('GAME OVER, CHEATER!');
        recordCheaterEnding();
        return;
      }
      this.gameWon = true;
      this.boss = null;
      this.bossActive = false;
      this.showWaveMessage('VICTORY!');
      SFX.victory();
      recordGoodEnding();
      // Final boss kill phrase
      const finalPhrases = FINAL_BOSS_KILL_PHRASES[this.player.ninjaType];
      if (finalPhrases) {
        this.phraseText = pickPhrase(finalPhrases);
        this.phraseTimer = 180;
        this.phraseMaxTimer = 180;
        this.phraseColor = this.player.type.accentColor;
        this.phraseSource = this.player;
      }
      return;
    }
    // Track defeated boss type for earth construct unlocks
    const waveDef = WAVE_DEFS[this.wave - 1];
    if (waveDef) this.player.defeatedBossTypes.add(waveDef.boss);
    recordWaveClear(this.wave, this.player.ninjaType);
    this.wave++;
    this.waveKills = 0;
    this.spawnedMiniboss = new Set();
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.enemies = [];
    // Boss kill phrase (skip if player is dying)
    const isLastBoss = this.wave > TOTAL_WAVES;
    if (!isLastBoss && !this.gameOverDelay) {
      const killPool = NEXT_WAVE_PHRASES[this.player.ninjaType] || BOSS_KILL_PHRASES;
      this.phraseText = pickPhrase(Math.random() < 0.6 ? killPool : BOSS_KILL_PHRASES);
      this.phraseTimer = 90;
      this.phraseMaxTimer = 90;
      this.phraseColor = this.player.type.accentColor;
      this.phraseSource = this.player;
    }
    // Zone-aware transition
    const curZone  = getWaveZone(this.wave - 1); // wave was already incremented
    const nextZone = getWaveZone(this.wave);
    if (nextZone === curZone) {
      // Same zone: continue in-place (multi-boss arenas or consecutive open waves)
      this.spawnTimer = -120;
      SFX.wave();
      if (!this.gameOverDelay) this.showWaveMessage(`Wave ${this.wave}/${TOTAL_WAVES} — Fight!`);
    } else {
      // Zone change: inline tower or exit door.
      this.pendingZone = nextZone;
      this.spawnTimer  = -9999; // hold enemy spawns until next zone
      SFX.wave();
      const isTowerEntry = (nextZone === 'tower_down' || nextZone === 'tower_up');
      const placedTower = isTowerEntry ? this.buildInlineTower(nextZone) : false;
      if (!placedTower) this.spawnExitDoor();
      if (!this.gameOverDelay) {
        this.showWaveMessage(placedTower ? 'Zone cleared! Enter the tower…' : 'Zone cleared! Find the exit…');
      }
    }
  }

  update() {
    this.tick++;
    pollGamepad();

    if ((this.gameWon || this.gameOver) && (consumePress('KeyR'))) {
      Object.assign(this, new Game());
      return;
    }
    if (this.gameWon || this.gameOver) {
      if (this.killPhraseTimer > 0) this.killPhraseTimer--;
      return;
    }

    // Ninja switching
    if (consumePress('Digit1')) this.player.switchNinja('fire');
    if (consumePress('Digit2')) this.player.switchNinja('earth');
    if (consumePress('Digit3')) this.player.switchNinja('bubble');
    if (consumePress('Digit4')) this.player.switchNinja('shadow');
    if (consumePress('Digit5')) this.player.switchNinja('crystal');
    if (consumePress('Digit6')) this.player.switchNinja('wind');
    if (consumePress('Digit7')) this.player.switchNinja('storm');
    if (justPressed['WheelSwitch']) {
      justPressed['WheelSwitch'] = false;
      this.player.switchNinja(NINJA_ORDER[mouseWheelNinja]);
    }
    if (gpJust[GP_LB]) {
      const idx = NINJA_ORDER.indexOf(this.player.ninjaType);
      this.player.switchNinja(NINJA_ORDER[(idx + 6) % 7]);
    }
    if (gpJust[GP_RB]) {
      const idx = NINJA_ORDER.indexOf(this.player.ninjaType);
      this.player.switchNinja(NINJA_ORDER[(idx + 1) % 7]);
    }

    // Cheat: + to skip wave
    if (consumePress('Equal') || consumePress('NumpadAdd')) {
      this.cheated = true;
      recordCheatUsed();
      if (this.boss && !this.boss.dead) this.boss.hp = 0;
      // Grant average stats for the wave being skipped
      const waveDef = WAVE_DEFS[this.wave - 1];
      if (waveDef) {
        const kills = waveDef.killsForBoss;
        // Orb drop rates per kill: 0.13 maxhp, 0.10 damage, 0.08 shield, 0.12 shuriken
        const pl = this.player;
        const avgMaxHp = Math.round(kills * 0.13);
        const avgDmg = Math.round(kills * 0.10);
        const avgShield = Math.round(kills * 0.08);
        const avgShuriken = Math.round(kills * 0.12);
        const avgSpeed = Math.round(kills * 0.04);
        const avgReach = Math.round(kills * 0.04);
        const avgUlt = Math.round(kills * 0.04) * 50;
        const avgArmor = Math.round(kills * 0.04);
        pl.maxHp += avgMaxHp;
        pl.hp = Math.min(pl.hp + avgMaxHp, pl.maxHp);
        pl.bonusDamage += avgDmg;
        pl.maxShield += avgShield * 2;
        pl.shield = Math.min(pl.shield + avgShield * 3, pl.maxShield);
        pl.maxShurikens += avgShuriken;
        pl.shurikens = pl.maxShurikens;
        pl.bonusSpeed += avgSpeed;
        pl.bonusReach += avgReach;
        pl.bonusArmor += avgArmor;
        // Assume one ultimate activation per wave: scale requirement and refill
        pl.ultimateMax = Math.round(pl.ultimateMax * 1.2);
        pl.ultimateCharge = 0;
        pl.ultimateReady = false;
      }
      // Give a random uncollected item
      const allItemKeys = Object.keys(BOSS_ITEMS);
      const uncollected = allItemKeys.filter(k => !this.player.items[k]);
      if (uncollected.length > 0) {
        const rItem = uncollected[Math.floor(Math.random() * uncollected.length)];
        this.player.items[rItem] = true;
        if (rItem === 'deathsKey') this.player.deathsKeyUsed = false;
        this.itemPickupOverlay = { itemId: rItem, timer: 180 };
        recordItemFound(rItem);
      }
      this.advanceWave();
    }
    // Cheat: 0 to toggle god mode
    if (consumePress('Digit0') || consumePress('Numpad0')) {
      this.cheated = true;
      recordCheatUsed();
      this.player.godMode = !this.player.godMode;
      this.showWaveMessage(this.player.godMode ? 'GOD MODE ON' : 'GOD MODE OFF');
    }
    // Cheat: - to spawn boss with average end-of-wave stats
    if (consumePress('Minus') || consumePress('NumpadSubtract')) {
      this.cheated = true;
      recordCheatUsed();
      // Set player stats to average for end of current wave
      const pl = this.player;
      const _ehp = [0,16,24,34,46,60,73,89,107,127,148];
      const _arm = [0,1,2,4,6,8,10,13,15,18,21];
      const w = Math.min(this.wave, 10);
      // Cumulative kills up to this wave
      let cumKills = 0;
      for (let i = 0; i < this.wave && i < WAVE_DEFS.length; i++) cumKills += WAVE_DEFS[i].killsForBoss;
      const avgMaxHp = 10 + Math.round(cumKills * 0.13);
      const avgShieldMax = Math.round(cumKills * 0.08) * 2;
      const avgDmg = Math.round(cumKills * 0.10);
      const avgShuriken = Math.round(cumKills * 0.12);
      const avgSpeed = Math.round(cumKills * 0.04);
      const avgReach = Math.round(cumKills * 0.04);
      const avgArmor = _arm[w] || 21;
      pl.maxHp = avgMaxHp;
      pl.hp = avgMaxHp;
      pl.maxShield = avgShieldMax;
      pl.shield = avgShieldMax;
      pl.bonusDamage = avgDmg;
      pl.maxShurikens = 3 + avgShuriken;
      pl.shurikens = pl.maxShurikens;
      pl.bonusSpeed = avgSpeed;
      pl.bonusReach = avgReach;
      pl.bonusArmor = avgArmor;
      pl.ultimateCharge = 0;
      pl.ultimateReady = false;
      if (!this.bossActive) {
        this.spawnBoss();
      } else {
        pl.ultimateCharge = pl.ultimateMax;
        pl.ultimateReady = true;
      }
    }

    // Transition freeze — block player control on map change
    if (this.transitionTimer > 0) {
      this.transitionTimer--;
    } else {
      this.player.update(this);
    }

    // During ultimate cutscene, freeze everything except effects
    if (this.player.ultCutscene) {
      for (const e of this.effects) e.update();
      this.effects = this.effects.filter(e => !e.done);
      // Camera still follows
      const targetCamX = this.player.x + this.player.w / 2 - CANVAS_W / 2;
      const targetCamY = this.player.y + this.player.h / 2 - CANVAS_H / 2;
      this.camera.x = lerp(this.camera.x, targetCamX, 0.08);
      this.camera.y = lerp(this.camera.y, targetCamY, 0.08);
      { const cb = this._getCameraBounds();
        this.camera.x = Math.max(cb.minX, Math.min(this.camera.x, cb.maxX));
        this.camera.y = Math.max(cb.minY, Math.min(this.camera.y, cb.maxY)); }
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
    if (this.crystalCastle) {
      this.crystalCastle.update(this);
      if (this.crystalCastle.done) this.crystalCastle = null;
    }
    for (const e of this.effects) e.update();
    for (const b of this.stoneBlocks) b.update(this);
    for (const b of this.bubbles) b.update(this);
    for (const o of this.orbs) o.update(this);
    for (const bi of this.bossItems) bi.update(this);

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
    if (this.phraseTimer > 0) this.phraseTimer--;
    if (this.ninjaResponseTimer < 0) this.ninjaResponseTimer++;
    else if (this.ninjaResponseTimer > 0) this.ninjaResponseTimer--;
    // Start ninja response once boss phrase fades
    if (this.ninjaResponseTimer === 0 && this.ninjaResponseText && !this.ninjaResponseActive && this.phraseTimer <= 0) {
      this.ninjaResponseTimer = 120;
      this.ninjaResponseMaxTimer = 120;
      this.ninjaResponseActive = true;
    }
    // Game over delay
    if (this.gameOverDelay > 0) {
      this.gameOverDelay--;
      if (this.gameOverDelay === 0) {
        this.gameOver = true;
      }
    }
    if (this.killPhraseTimer > 0) this.killPhraseTimer--;
    if (this.itemPickupOverlay) {
      this.itemPickupOverlay.timer--;
      if (this.itemPickupOverlay.timer <= 0) this.itemPickupOverlay = null;
    }

    // Cleanup
    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.done);
    this.effects = this.effects.filter(e => !e.done);
    this.stoneBlocks = this.stoneBlocks.filter(b => !b.done);
    this.bubbles = this.bubbles.filter(b => !b.done);
    this.orbs = this.orbs.filter(o => !o.done);
    this.bossItems = this.bossItems.filter(bi => !bi.done);

    // Camera + zone-specific logic
    this._updateZone();
    // Zone transition interaction (corridor trigger or exit door)
    this.checkZoneTransition();
  }

  render() {
    const cam = this.camera;

    // Sky gradient
    const fireUltSky = this.player.ultimateActive && this.player.ninjaType === 'fire';
    const shadowUltSky = this.player.ultimateActive && this.player.ninjaType === 'shadow';
    const stormUltSky = this.player.ultimateActive && this.player.ninjaType === 'storm';
    const bubbleUltSky = this.player.ultimateActive && this.player.ninjaType === 'bubble' && this.player.bubbleUlt;
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    if (fireUltSky) {
      grad.addColorStop(0, '#4a0a0a');
      grad.addColorStop(1, '#2a0808');
    } else if (shadowUltSky) {
      grad.addColorStop(0, '#050510');
      grad.addColorStop(1, '#080818');
    } else if (stormUltSky) {
      grad.addColorStop(0, '#0a0a1e');
      grad.addColorStop(1, '#151530');
    } else if (bubbleUltSky) {
      grad.addColorStop(0, '#082040');
      grad.addColorStop(1, '#0a3060');
    } else {
      grad.addColorStop(0, '#0a0a2e');
      grad.addColorStop(1, '#1a1a3e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Background stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137 + 50) % this.levelW) - cam.x * 0.3;
      const sy = ((i * 97 + 30) % 400);
      if (sx > -5 && sx < CANVAS_W + 5) {
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Background mountains
    ctx.fillStyle = fireUltSky ? '#2a0a0a' : (shadowUltSky ? '#080818' : (stormUltSky ? '#0a0a1e' : (bubbleUltSky ? '#0a2040' : '#1a1a3a')));
    for (let i = 0; i < this.levelW; i += 200) {
      const bx = i - cam.x * 0.2;
      if (bx > -200 && bx < CANVAS_W + 200) {
        ctx.beginPath();
        ctx.moveTo(bx, 480 - cam.y);
        ctx.lineTo(bx + 100, 300 - cam.y);
        ctx.lineTo(bx + 200, 480 - cam.y);
        ctx.fill();
      }
    }

    // Spawn house
    this.renderSpawnHouse(ctx, cam);

    // Zone overlays (left boundary push indicator, tower scroll arrow)
    this._renderZoneOverlays(ctx, cam);

    for (const p of this.platforms) p.render(ctx, cam);
    for (const s of this.spikes) s.render(ctx, cam);

    // Inline tower entrance arrow cue
    if (this.inlineTower && !this.inlineTower.entered && this.pendingZone) {
      const t = this.inlineTower;
      const arrowX = t.triggerX - cam.x - 10;
      const arrowY = 430 - cam.y;
      ctx.save();
      ctx.globalAlpha = 0.65 + 0.25 * Math.sin(this.tick * 0.09);
      ctx.fillStyle = '#caa25a';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('→', arrowX, arrowY);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // Exit door
    if (this.exitDoor && !this.exitDoor.triggered) {
      const d = this.exitDoor;
      const dx = d.x - cam.x, dy = d.y - cam.y;
      const pulse = 0.5 + 0.5 * Math.sin(this.tick * 0.09);
      // Glow
      ctx.save();
      ctx.globalAlpha = 0.2 + pulse * 0.18;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(dx - 8, dy - 8, d.w + 16, d.h + 16);
      ctx.restore();
      // Frame
      ctx.fillStyle = '#7a5200';
      ctx.fillRect(dx, dy, d.w, d.h);
      // Portal gradient
      const ig = ctx.createLinearGradient(dx, dy, dx, dy + d.h);
      ig.addColorStop(0, '#fff8c0');
      ig.addColorStop(0.45, '#ffd700');
      ig.addColorStop(1, '#a06010');
      ctx.fillStyle = ig;
      ctx.fillRect(dx + 5, dy + 5, d.w - 10, d.h - 10);
      // Arrow + label
      ctx.fillStyle = '#4a2800';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      const arrow = (this.pendingZone === 'tower_down' || this.pendingZone === 'tower_up') ? '↑' : '→';
      ctx.fillText(arrow, dx + d.w / 2, dy + d.h / 2 + 5);
      ctx.font = '8px monospace';
      ctx.fillText('EXIT', dx + d.w / 2, dy + d.h - 8);
      ctx.textAlign = 'left';
    }

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
    for (const bi of this.bossItems) bi.render(ctx, cam);
    if (this.crystalCastle) this.crystalCastle.render(ctx, cam);
    this.player.render(ctx, cam);

    // Shadow ultimate: darken everything except enemies
    if (this.player.ninjaType === 'shadow' && this.player.shadowDarkness > 0) {
      ctx.save();
      ctx.globalAlpha = this.player.shadowDarkness;
      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    for (const e of this.enemies) e.render(ctx, cam, this);
    if (this.boss && !this.boss.dead) this.boss.render(ctx, cam, this);

    // ── Ultimate cutscene / active rendering ──

    // Storm lightning flash (end of chain or sheath finisher)
    if (this.player.stormLightningFlash > 0) {
      this.player.stormLightningFlash--;
      const f = this.player.stormLightningFlash;
      const isFinisher = this.player.stormSheathFinisher > 0;
      if (isFinisher) {
        // Big finisher flash
        if (f > 45) {
          ctx.save();
          ctx.globalAlpha = Math.min(0.6, (f - 45) / 15 * 0.6);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();
        } else if (f > 0) {
          ctx.save();
          ctx.globalAlpha = 0.3 * (f / 45);
          ctx.fillStyle = '#ffa';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();
        }
      } else {
        if (f >= 30 && f <= 33) {
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();
        } else if (f >= 1 && f <= 22) {
          ctx.save();
          ctx.globalAlpha = 0.15 * (f / 22);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();
        }
      }
    }

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
          const ts = m.big ? 14 : 8;
          ctx.globalAlpha = t.life / 15 * (m.big ? 0.8 : 0.6);
          ctx.fillStyle = m.big ? '#ff0' : '#f93';
          ctx.fillRect(t.x - ts / 2 - cam.x, t.y - ts / 2 - cam.y, ts, ts);
        }
        ctx.globalAlpha = 1;
        // Glow for big meteor
        if (m.big) {
          ctx.save();
          ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.02) * 0.1;
          ctx.fillStyle = '#f93';
          ctx.beginPath();
          ctx.arc(m.x - cam.x, m.y - cam.y, m.size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
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

    // Earth ultimate: render mecha — BIG head + BIG hands, no bar, hand frame follows head
    if (this.player.earthGolem) {
      const g = this.player.earthGolem;
      const gx = g.x - cam.x;
      const gy = g.y - cam.y;
      const t = this.tick || 0;
      const facing = g.facing;
      const cx = gx + g.w / 2;
      const cy = gy + g.h / 2;
      const li = '#c8a878', mi = '#8b6340', dk = '#5a3a1a', vdk = '#3a200e';

      const bevel = (bx, by, bw, bh, col, bs) => {
        bs = bs || 2;
        ctx.fillStyle = col || mi;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = li; ctx.globalAlpha = 0.4;
        ctx.fillRect(bx, by, bw, bs);
        ctx.fillRect(bx, by, bs, bh);
        ctx.fillStyle = vdk; ctx.globalAlpha = 0.5;
        ctx.fillRect(bx, by + bh - bs, bw, bs);
        ctx.fillRect(bx + bw - bs, by, bs, bh);
        ctx.globalAlpha = 1;
      };

      // Screen positions
      const lhx = g.leftHand.x - cam.x, lhy = g.leftHand.y - cam.y;
      const rhx = g.rightHand.x - cam.x, rhy = g.rightHand.y - cam.y;

      // === HOVER SHADOW ===
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(cx, gy + g.h + 15, 80, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a1508';
      ctx.fill();
      ctx.restore();

      // === BIG HEAD (2x: ~112x84) ===
      const headW = 112, headH = 84;
      const headX = cx - headW / 2;
      const headY = gy - 20;
      // Skull
      bevel(headX, headY, headW, headH, mi, 3);
      // Chin plate
      bevel(headX + 12, headY + headH - 20, headW - 24, 20, dk, 2);
      // Visor recess
      ctx.fillStyle = vdk;
      ctx.fillRect(headX + 12, headY + 28, headW - 24, 28);
      ctx.fillStyle = '#111';
      ctx.fillRect(headX + 16, headY + 32, headW - 32, 20);
      // Visor shine
      ctx.fillStyle = '#555'; ctx.globalAlpha = 0.3;
      ctx.fillRect(headX + 16, headY + 32, headW - 32, 2);
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.4;
      ctx.fillRect(headX + 16, headY + 50, headW - 32, 2);
      ctx.globalAlpha = 1;
      // Glowing eyes
      ctx.fillStyle = '#ff0'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 12;
      const eyeOff = facing > 0 ? 8 : 0;
      ctx.fillRect(headX + 20 + eyeOff, headY + 36, 16, 10);
      ctx.fillRect(headX + headW - 36 + eyeOff, headY + 36, 16, 10);
      // Eye highlights
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6;
      ctx.fillRect(headX + 24 + eyeOff, headY + 38, 6, 4);
      ctx.fillRect(headX + headW - 32 + eyeOff, headY + 38, 6, 4);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      // Horn/antenna
      bevel(cx - 10, headY - 20, 20, 24, '#b8864e', 2);
      ctx.fillStyle = '#2e9e2e'; ctx.shadowColor = '#2e9e2e'; ctx.shadowBlur = 6;
      ctx.fillRect(cx - 4, headY - 18, 8, 20);
      ctx.shadowBlur = 0;
      // Cheek plates
      bevel(headX - 8, headY + 20, 12, 36, '#7a5533', 2);
      bevel(headX + headW - 4, headY + 20, 12, 36, '#7a5533', 2);
      // Forehead ridge
      ctx.fillStyle = li; ctx.globalAlpha = 0.3;
      ctx.fillRect(headX + 20, headY + 8, headW - 40, 3);
      ctx.globalAlpha = 1;
      // Thruster glow under head
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 0.15) * 0.1;
      const htG = ctx.createRadialGradient(cx, headY + headH + 5, 3, cx, headY + headH + 5, 28);
      htG.addColorStop(0, '#ff8');
      htG.addColorStop(0.5, '#f80');
      htG.addColorStop(1, 'transparent');
      ctx.fillStyle = htG;
      ctx.fillRect(cx - 22, headY + headH, 44, 16);
      ctx.restore();

      // === BIG HANDS (2x: ~88x88) ===
      const drawHand = (hx, hy, punching, side) => {
        const hw = 88, hh = 88;
        const fx = hx - hw / 2, fy = hy - hh / 2;
        // Punch glow
        if (punching) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          const aG = ctx.createRadialGradient(hx, hy, 5, hx, hy, 60);
          aG.addColorStop(0, '#fff');
          aG.addColorStop(0.3, '#ff4');
          aG.addColorStop(1, 'transparent');
          ctx.fillStyle = aG;
          ctx.beginPath();
          ctx.arc(hx, hy, 60, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Fist block
        bevel(fx, fy, hw, hh, '#9a7050', 3);
        bevel(fx + 8, fy + 8, hw - 16, hh - 16, '#8b6340', 2);
        // Green gem
        ctx.fillStyle = '#3c4'; ctx.shadowColor = '#2e9e2e'; ctx.shadowBlur = 8;
        ctx.fillRect(hx - 9, hy - 9, 18, 18);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#afa'; ctx.globalAlpha = 0.5;
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
        ctx.globalAlpha = 1;
        // Knuckle ridges
        const knuckleX = side < 0 ? fx : fx + hw - 12;
        for (let k = 0; k < 4; k++) {
          const ky = fy + 12 + k * 18;
          ctx.fillStyle = li; ctx.globalAlpha = 0.3;
          ctx.fillRect(knuckleX, ky, 12, 10);
          ctx.fillStyle = vdk; ctx.globalAlpha = 0.5;
          ctx.fillRect(knuckleX, ky + 10, 12, 2);
        }
        ctx.globalAlpha = 1;
      };
      drawHand(lhx, lhy, g.leftHand.punchTimer > 0, -1);
      drawHand(rhx, rhy, g.rightHand.punchTimer > 0, 1);

      // HP bar (above head)
      if (g.hp < g.maxHp) {
        ctx.fillStyle = '#400';
        ctx.fillRect(headX, headY - 26, headW, 6);
        ctx.fillStyle = '#4a7a3a';
        ctx.fillRect(headX, headY - 26, headW * (g.hp / g.maxHp), 6);
      }
    }
    if (this.player.bubbleUlt) {
      const bu = this.player.bubbleUlt;
      // Underwater tint overlay
      ctx.save();
      ctx.globalAlpha = bu.underwaterAlpha;
      ctx.fillStyle = '#1040a0';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
      // Light rays (underwater caustics)
      ctx.save();
      ctx.globalAlpha = bu.underwaterAlpha * 0.3;
      for (let i = 0; i < 6; i++) {
        const rx = (i * 180 + this.tick * 0.3) % (CANVAS_W + 100) - 50;
        ctx.fillStyle = '#4080ff';
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 30 + Math.sin(this.tick * 0.02 + i) * 15, CANVAS_H);
        ctx.lineTo(rx + 60 + Math.sin(this.tick * 0.02 + i) * 15, CANVAS_H);
        ctx.lineTo(rx + 20, 0);
        ctx.fill();
      }
      ctx.restore();
      // Floating bubble particles
      ctx.save();
      for (const p of bu.bubbleParticles) {
        const px = p.x - cam.x;
        const py = p.y - cam.y;
        if (px > -20 && px < CANVAS_W + 20 && py > -20 && py < CANVAS_H + 20) {
          ctx.globalAlpha = Math.min(0.4, p.life / 60);
          ctx.strokeStyle = '#8cf';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.stroke();
          // Tiny shine
          ctx.globalAlpha *= 0.5;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px - p.size * 0.3, py - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      // Draw bubble around each trapped enemy
      for (const t of bu.trapped) {
        if (t.enemy.dead) continue;
        const ex = t.enemy.x + t.enemy.w / 2 - cam.x;
        const ey = t.enemy.y + t.enemy.h / 2 - cam.y;
        const br = Math.max(t.enemy.w, t.enemy.h) * 0.8;
        // Outer glow
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(this.tick * 0.1 + t.bobPhase) * 0.05;
        ctx.fillStyle = '#4af';
        ctx.beginPath();
        ctx.arc(ex, ey, br + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Main bubble
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4af';
        ctx.beginPath();
        ctx.arc(ex, ey, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#8cf';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Shine
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - br * 0.3, ey - br * 0.3, br * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Timer bar at top
      ctx.fillStyle = '#123';
      ctx.fillRect(CANVAS_W / 2 - 100, 20, 200, 6);
      ctx.fillStyle = '#4af';
      ctx.fillRect(CANVAS_W / 2 - 100, 20, 200 * (bu.timer / 300), 6);
    }

    // Wind ultimate: giant bow + arrows
    if (this.player.windBow) {
      const wb = this.player.windBow;
      const bcx = wb.centerX - cam.x;
      const bcy = wb.centerY - cam.y;
      if (wb.phase === 'bow' || wb.phase === 'fire') {
        // Draw giant bow facing upward (rotated 90° from vertical)
        ctx.save();
        ctx.globalAlpha = wb.bowAlpha * 0.9;
        const scale = wb.bowScale;
        const bowW = 180 * scale; // horizontal span
        const bowH = 50 * scale;  // curve depth upward
        // Bow body (curved arc opening upward)
        ctx.strokeStyle = '#5a3';
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(bcx - bowW / 2, bcy);
        ctx.quadraticCurveTo(bcx, bcy - bowH, bcx + bowW / 2, bcy);
        ctx.stroke();
        // Bow limb glow
        ctx.strokeStyle = '#8d8';
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = wb.bowAlpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(bcx - bowW / 2, bcy);
        ctx.quadraticCurveTo(bcx, bcy - bowH, bcx + bowW / 2, bcy);
        ctx.stroke();
        // Bowstring (horizontal)
        ctx.strokeStyle = '#bfb';
        ctx.lineWidth = 2 * scale;
        ctx.globalAlpha = wb.bowAlpha * 0.8;
        ctx.beginPath();
        ctx.moveTo(bcx - bowW / 2, bcy);
        ctx.lineTo(bcx + bowW / 2, bcy);
        ctx.stroke();
        // Wind swirl around bow
        ctx.globalAlpha = wb.bowAlpha * 0.3;
        ctx.strokeStyle = '#bfb';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const angle = this.tick * 0.05 + i * (Math.PI * 2 / 3);
          const sr = 60 + Math.sin(this.tick * 0.03 + i) * 15;
          ctx.beginPath();
          ctx.arc(bcx + Math.cos(angle) * sr, bcy - 20 + Math.sin(angle) * sr * 0.4, 8, 0, Math.PI * 1.5);
          ctx.stroke();
        }
        ctx.restore();
      }
      // Draw arrows
      for (const a of wb.arrows) {
        if (a.done) continue;
        ctx.save();
        const ax = a.x - cam.x;
        const ay = a.y - cam.y;
        // Arrow trail
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#8d8';
        ctx.lineWidth = 2;
        for (let i = 1; i < a.trail.length; i++) {
          const t0 = a.trail[i - 1];
          const t1 = a.trail[i];
          ctx.globalAlpha = 0.3 * (t1.life / 20);
          ctx.beginPath();
          ctx.moveTo(t0.x - cam.x, t0.y - cam.y);
          ctx.lineTo(t1.x - cam.x, t1.y - cam.y);
          ctx.stroke();
        }
        // Arrow body
        ctx.globalAlpha = 1;
        const arrowLen = 20 * a.size;
        const angle = Math.atan2(a.vy || -1, a.vx || 0);
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        // Shaft
        ctx.fillStyle = '#8d8';
        ctx.fillRect(-arrowLen, -1.5, arrowLen, 3);
        // Arrowhead
        ctx.fillStyle = '#bfb';
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-6, 5);
        ctx.fill();
        // Fletching
        ctx.fillStyle = '#5a3';
        ctx.beginPath();
        ctx.moveTo(-arrowLen, 0);
        ctx.lineTo(-arrowLen - 6, -4);
        ctx.lineTo(-arrowLen - 2, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-arrowLen, 0);
        ctx.lineTo(-arrowLen - 6, 4);
        ctx.lineTo(-arrowLen - 2, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    // Storm ultimate: rain rendering
    if (this.player.ultimateActive && this.player.ninjaType === 'storm' && this.player.stormRaindrops) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#6af';
      ctx.lineWidth = 1;
      for (const r of this.player.stormRaindrops) {
        const rx = r.x - cam.x;
        const ry = r.y - cam.y;
        if (rx > -5 && rx < CANVAS_W + 5 && ry > -10 && ry < CANVAS_H + 10) {
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 1, ry + 8);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Shadow ultimate: glowing eyes (darkness now renders before platforms)
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



    for (const e of this.effects) e.render(ctx, cam);

    // Screen-wide status effect overlays
    const pl = this.player;
    if (pl.statusBurn > 0) {
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.03 * Math.sin(pl.statusBurn * 0.15);
      ctx.fillStyle = '#f40';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusFreeze > 0) {
      ctx.save();
      ctx.globalAlpha = 0.08 + 0.03 * Math.sin(pl.statusFreeze * 0.12);
      ctx.fillStyle = '#0cf';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusFloat > 0) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.02 * Math.sin(pl.statusFloat * 0.1);
      ctx.fillStyle = '#4f4';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusParalyse > 0) {
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.04 * Math.sin(pl.statusParalyse * 0.25);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusStun > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.06 * Math.sin(pl.statusStun * 0.5);
      ctx.fillStyle = '#ff0';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusHeavy > 0) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(pl.statusHeavy * 0.12);
      ctx.fillStyle = '#a64';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusSteel > 0) {
      ctx.save();
      ctx.globalAlpha = 0.08 + 0.04 * Math.sin(pl.statusSteel * 0.15);
      ctx.fillStyle = '#999';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    // Storm: sheathing sword during ult chain strike
    if (pl.stormSheathActive || pl.stormSheathFinisher > 0) {
      const hits = pl.stormSheathHits;
      const maxHits = 20;
      // sheathProgress: 0 = fully drawn, 1 = fully sheathed
      const sheathProgress = pl.stormSheathFinisher > 0 ? 1 : Math.min(hits / maxHits, 0.95);
      const finisher = pl.stormSheathFinisher;

      ctx.save();

      // Sword position — right side of screen
      const swordX = CANVAS_W - 120;
      const swordY = CANVAS_H / 2 - 80;
      const swordLen = 240;
      const sheathLen = 200;

      // Dim background slightly during sheath
      if (pl.stormSheathActive) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#001';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Finisher: bright flash + full dark overlay
      if (finisher > 0) {
        const fProg = finisher / 90;
        // Dark overlay
        ctx.globalAlpha = 0.6 * fProg;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // White lightning flash at start
        if (finisher > 70) {
          ctx.globalAlpha = (finisher - 70) / 20;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
      }

      ctx.globalAlpha = pl.stormSheathFinisher > 0 ? Math.min(1, pl.stormSheathFinisher / 15) : 0.9;

      // Scabbard (always visible)
      ctx.save();
      ctx.translate(swordX, swordY);
      ctx.rotate(0.2); // slight tilt
      // Scabbard body
      const grad = ctx.createLinearGradient(0, 0, 0, sheathLen);
      grad.addColorStop(0, '#1a1a3a');
      grad.addColorStop(0.5, '#2a2a5a');
      grad.addColorStop(1, '#1a1a3a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-10, 40, 20, sheathLen, 4);
      ctx.fill();
      // Scabbard mouth (koiguchi)
      ctx.fillStyle = '#fd0';
      ctx.fillRect(-12, 36, 24, 8);
      // Scabbard tip (kojiri)
      ctx.fillStyle = '#fd0';
      ctx.beginPath();
      ctx.arc(0, 40 + sheathLen, 8, 0, Math.PI);
      ctx.fill();
      // Gold bands
      ctx.fillStyle = '#ca0';
      ctx.fillRect(-11, 80, 22, 4);
      ctx.fillRect(-11, 160, 22, 4);

      // Blade — slides into scabbard based on progress
      const bladeOut = swordLen * (1 - sheathProgress); // how much sticks out
      ctx.save();
      ctx.beginPath();
      ctx.rect(-20, -swordLen + (swordLen - bladeOut) - 5, 40, bladeOut + 50);
      ctx.clip();

      // Blade
      const pulseGlow = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
      ctx.shadowColor = '#4af';
      ctx.shadowBlur = 12 * pulseGlow;
      const bladeGrad = ctx.createLinearGradient(0, -swordLen + 40, 0, 40);
      bladeGrad.addColorStop(0, '#eef');
      bladeGrad.addColorStop(0.3, '#cde');
      bladeGrad.addColorStop(1, '#aac');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-1, -swordLen + 40); // tip
      ctx.lineTo(-7, -swordLen + 70);
      ctx.lineTo(-7, 36);
      ctx.lineTo(7, 36);
      ctx.lineTo(7, -swordLen + 70);
      ctx.lineTo(1, -swordLen + 40);
      ctx.closePath();
      ctx.fill();
      // Edge highlight
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -swordLen + 42);
      ctx.lineTo(-6, -swordLen + 70);
      ctx.lineTo(-6, 34);
      ctx.stroke();
      ctx.globalAlpha = pl.stormSheathFinisher > 0 ? Math.min(1, pl.stormSheathFinisher / 15) : 0.9;
      // Lightning crackling along blade
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.7 * pulseGlow;
      ctx.beginPath();
      let ly = -swordLen + 60;
      ctx.moveTo(0, ly);
      while (ly < 30) {
        ly += 8 + Math.random() * 12;
        const lx = (Math.random() - 0.5) * 10;
        ctx.lineTo(lx, Math.min(ly, 30));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore(); // clip restore

      // Tsuba (guard) — sits at sheath mouth
      ctx.globalAlpha = pl.stormSheathFinisher > 0 ? Math.min(1, pl.stormSheathFinisher / 15) : 0.9;
      ctx.fillStyle = '#fd0';
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 6;
      ctx.fillRect(-16, 30, 32, 6);
      ctx.shadowBlur = 0;

      // Handle (tsuka) — above guard
      ctx.fillStyle = '#24c';
      ctx.fillRect(-8, 0, 16, 32);
      // Wrap pattern
      ctx.fillStyle = '#fd0';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-7, 2 + i * 6, 14, 2);
      }
      // Pommel (kashira)
      ctx.fillStyle = '#fd0';
      ctx.beginPath();
      ctx.arc(0, -2, 9, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // translate restore

      // Hit counter
      if (pl.stormSheathActive) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = hits >= 20 ? '#fd0' : '#4af';
        ctx.shadowColor = hits >= 20 ? '#fd0' : '#4af';
        ctx.shadowBlur = 10;
        ctx.fillText(`${hits}/${maxHits}`, swordX, swordY + sheathLen + 80);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      ctx.restore();
    }

    this.renderUI();
  }

  renderUI() {
    const cam = this.camera;
    const pl = this.player;
    const t = pl.type;
    const ninjaKeys = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind', 'storm'];

    // Ninja bar at top, status bars stacked up from bottom
    const ninjaBarY = 4;
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
      elemBarVal = this.diamondShards ? this.diamondShards.length : 0; elemBarMax = 10; elemBarColor = '#0ff'; elemBarGlow = this.crystalCastle != null; elemBarLabel = 'Crystal';
    } else if (pl.ninjaType === 'wind') {
      elemBarVal = pl.windPower; elemBarMax = 10; elemBarColor = '#8d8'; elemBarGlow = pl.windPower >= 10; elemBarLabel = 'Wind';
    } else if (pl.ninjaType === 'earth') {
      elemBarVal = this.stoneBlocks.length; elemBarMax = 10; elemBarColor = '#8b5e3c'; elemBarGlow = this.stoneBlocks.length >= 10; elemBarLabel = 'Blocks';
    } else if (pl.ninjaType === 'storm') {
      // Count soaked enemies
      let soakedCount = 0;
      for (const e of this.enemies) { if (!e.dead && e.soakTimer > 0) soakedCount++; }
      if (this.boss && !this.boss.dead && this.boss.soakTimer > 0) soakedCount++;
      elemBarVal = soakedCount; elemBarMax = 10; elemBarColor = '#48f'; elemBarGlow = soakedCount >= 3; elemBarLabel = 'Soaked';
    }
    const elemBarH = 10;
    const elemBarY = CANVAS_H - elemBarH - gap;
    const elemBarX = CANVAS_W / 2 - elemBarW / 2;
    ctx.save();
    if (elemBarGlow) { ctx.shadowColor = elemBarColor; ctx.shadowBlur = 14; }
    ctx.fillStyle = '#222';
    ctx.fillRect(elemBarX, elemBarY, elemBarW, elemBarH);
    ctx.fillStyle = elemBarColor;
    ctx.fillRect(elemBarX, elemBarY, elemBarW * Math.min(1, elemBarVal / elemBarMax), elemBarH);
    ctx.shadowBlur = 0;
    ctx.restore();
    const darkLabelTypes = ['fire', 'bubble', 'crystal', 'wind'];
    const useDarkLabel = darkLabelTypes.includes(pl.ninjaType) && elemBarVal / elemBarMax > 0.15;
    ctx.fillStyle = elemBarGlow ? (useDarkLabel ? '#111' : '#fff') : (useDarkLabel ? '#222' : '#ccc');
    ctx.font = 'bold 9px monospace';
    ctx.fillText(elemBarLabel, elemBarX + 3, elemBarY + 8);

    // Shield bar (separate row, only if player has shield)
    const hasShield = pl.maxShield > 0;
    const shieldBarH = 8;
    const shieldBarW = Math.min(CANVAS_W - 40, 100 + pl.maxShield * 2);
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
      ctx.fillText(`SH ${Math.round(pl.shield)}/${Math.round(pl.maxShield)}`, shieldBarX + 3, shieldBarY + 7);
    }

    // HP bar
    const hpBarH = 10;
    const hpBarW = Math.min(CANVAS_W - 40, 120 + pl.maxHp * 6);
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
    ctx.fillText(`HP ${Math.round(pl.hp)}/${Math.round(pl.maxHp)}`, hpBarX + 3, hpBarY + 9);

    // Buff icons data
    const buffItems = [];
    const baseAtk = pl.type.attackDamage;
    const totalAtk = baseAtk + pl.bonusDamage;
    buffItems.push({ icon: '\u2694', value: totalAtk, color: '#f80', hasBonus: pl.bonusDamage > 0 });
    buffItems.push({ icon: '\u00bb', value: pl.bonusSpeed, color: '#0f0' });
    buffItems.push({ icon: '\u2194', value: pl.bonusReach, color: '#fa0' });
    buffItems.push({ icon: '\u26CA', value: pl.bonusArmor, color: '#88f' });
    buffItems.push({ icon: '\u2665', value: this.lives, color: '#f44' });

    // Ultimate bar
    const ultimateBarW = Math.min(CANVAS_W - 40, 140 + Math.floor(pl.ultimateMax / 5));
    const ultimateBarH = 14;
    const ultimateBarX = CANVAS_W / 2 - ultimateBarW / 2;
    const ultimateBarY = hpBarY - ultimateBarH - gap;

    // Buff icons above ultimate bar (ICON -> value)
    if (buffItems.length > 0) {
      ctx.font = 'bold 14px monospace';
      let totalBW = 0;
      const itemWidths = [];
      for (const b of buffItems) {
        let iw = ctx.measureText(b.icon).width + 3 + ctx.measureText(String(b.value)).width;
        if (b.hasBonus) {
          ctx.font = '10px monospace';
          iw += 2 + ctx.measureText(`+${pl.bonusDamage}`).width;
          ctx.font = 'bold 14px monospace';
        }
        itemWidths.push(iw);
        totalBW += iw;
      }
      totalBW += (buffItems.length - 1) * 14;
      let bx = CANVAS_W / 2 - totalBW / 2;
      const by = ultimateBarY - 6;
      for (let i = 0; i < buffItems.length; i++) {
        const b = buffItems[i];
        ctx.fillStyle = b.color;
        ctx.fillText(b.icon, bx, by);
        const iconW = ctx.measureText(b.icon).width;
        ctx.fillStyle = '#fff';
        ctx.fillText(String(b.value), bx + iconW + 3, by);
        if (b.hasBonus) {
          const valW = ctx.measureText(String(b.value)).width;
          ctx.font = '10px monospace';
          ctx.fillStyle = '#5f5';
          ctx.fillText(`+${pl.bonusDamage}`, bx + iconW + 3 + valW + 2, by);
          ctx.font = 'bold 14px monospace';
        }
        bx += itemWidths[i] + 14;
      }
    }

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
      const readyText = 'ULTIMATE READY! [V/M/Y]';
      const tw = ctx.measureText(readyText).width;
      const tx = CANVAS_W / 2 - tw / 2;
      const ty = ultimateBarY + 11;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(readyText, tx, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(readyText, tx, ty);
    } else if (pl.ultimateActive) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText('ULTIMATE ACTIVE', ultimateBarX + 4, ultimateBarY + 11);
      ctx.fillStyle = '#fff';
      ctx.fillText('ULTIMATE ACTIVE', ultimateBarX + 4, ultimateBarY + 11);
    } else {
      ctx.fillStyle = '#ccc';
      const pct = Math.floor((pl.ultimateCharge / pl.ultimateMax) * 100);
      ctx.fillText(`ULT ${pct}%`, ultimateBarX + 4, ultimateBarY + 11);
    }

    // Ninja selection bar
    const ninjaBarX = CANVAS_W / 2 - 182;
    for (let i = 0; i < 7; i++) {
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

    // Shuriken display (canvas-drawn, below progress bar)
    if (typeof window !== 'undefined' && document.getElementById('shuriken-bar')) {
      document.getElementById('shuriken-bar').innerHTML = '';
      document.getElementById('shuriken-bar').style.display = 'none';
    }
    {
      const sSize = 12;
      const sPad = 3;
      const totalSW = pl.maxShurikens * sSize + (pl.maxShurikens - 1) * sPad;
      const sStartX = CANVAS_W / 2 - totalSW / 2;
      const sY = 58;
      for (let i = 0; i < pl.maxShurikens; i++) {
        const sx = sStartX + i * (sSize + sPad) + sSize / 2;
        const sy = sY + sSize / 2;
        const available = i < pl.shurikens;
        ctx.globalAlpha = available ? 1 : 0.25;
        if (i === 0 && pl.items.theKunai) {
          // Kunai icon
          ctx.fillStyle = '#f66';
          ctx.beginPath();
          ctx.moveTo(sx, sy - sSize / 2);
          ctx.lineTo(sx + sSize * 0.12, sy);
          ctx.lineTo(sx, sy + sSize / 2);
          ctx.lineTo(sx - sSize * 0.12, sy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#a44';
          ctx.fillRect(sx - 2, sy + sSize * 0.25, 4, sSize * 0.2);
          ctx.strokeStyle = '#f66';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(sx, sy + sSize * 0.45, sSize * 0.15, sSize * 0.1, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Shuriken star
          ctx.fillStyle = '#ccc';
          ctx.beginPath();
          const r = sSize / 2;
          for (let p = 0; p < 4; p++) {
            const angle = (p / 4) * Math.PI * 2 - Math.PI / 2;
            const tipX = sx + Math.cos(angle) * r;
            const tipY = sy + Math.sin(angle) * r;
            const innerAngle = angle + Math.PI / 4;
            const innerR = r * 0.35;
            const inX = sx + Math.cos(innerAngle) * innerR;
            const inY = sy + Math.sin(innerAngle) * innerR;
            if (p === 0) ctx.moveTo(tipX, tipY);
            else ctx.lineTo(tipX, tipY);
            ctx.lineTo(inX, inY);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // Boss Items display (left side, vertically centered)
    {
      const itemKeys = Object.keys(pl.items).filter(k => pl.items[k]);
      if (itemKeys.length > 0) {
        const iconSize = 30;
        const pad = 4;
        const totalH = itemKeys.length * iconSize + (itemKeys.length - 1) * pad;
        let iy = Math.round((CANVAS_H - totalH) / 2);
        for (const key of itemKeys) {
          const def = BOSS_ITEMS[key];
          if (!def) continue;
          const icx = 8, icy = iy;
          // Grey out used Death's Key
          const dimmed = key === 'deathsKey' && pl.deathsKeyUsed;
          if (dimmed) ctx.globalAlpha = 0.3;
          // Outer glow
          ctx.shadowColor = def.color;
          ctx.shadowBlur = 8;
          // Background gradient
          const grad = ctx.createLinearGradient(icx, icy, icx, icy + iconSize);
          grad.addColorStop(0, 'rgba(40,40,50,0.85)');
          grad.addColorStop(1, 'rgba(15,15,20,0.95)');
          ctx.fillStyle = grad;
          ctx.fillRect(icx, icy, iconSize, iconSize);
          // Colored inner border
          ctx.shadowBlur = 0;
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(icx + 1, icy + 1, iconSize - 2, iconSize - 2);
          // Corner highlights
          ctx.fillStyle = def.color;
          ctx.globalAlpha = dimmed ? 0.15 : 0.5;
          ctx.fillRect(icx + 1, icy + 1, 4, 1);
          ctx.fillRect(icx + 1, icy + 1, 1, 4);
          ctx.fillRect(icx + iconSize - 5, icy + iconSize - 2, 4, 1);
          ctx.fillRect(icx + iconSize - 2, icy + iconSize - 5, 1, 4);
          ctx.globalAlpha = dimmed ? 0.3 : 1;
          // Canvas-drawn icon
          drawItemIcon(ctx, key, icx + iconSize / 2, icy + iconSize / 2, iconSize * 0.75, def.color);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          iy += iconSize + pad;
        }
      }
    }

    // Wave info panel (top right, below ninja bar)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(CANVAS_W - 175, 36, 167, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_W - 175, 36, 167, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Wave ${this.wave}/${TOTAL_WAVES}`, CANVAS_W - 167, 52);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Kills: ${this.totalKills}`, CANVAS_W - 167, 66);

    // Progress bar (top center)
    if (!this.gameWon && !(this.boss && !this.boss.dead)) {
      const pbW = 400, pbH = 18;
      const pbX = CANVAS_W / 2 - pbW / 2;
      const pbY = 38;
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
      ctx.fillRect(bx - 4, 34, bw + 8, 24);
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 12px monospace';
      const bossLabel = `${this.boss.name} [${this.wave}/${TOTAL_WAVES}]`;
      ctx.fillText(bossLabel, bx, 48);
      const labelW = ctx.measureText(bossLabel).width + 8;
      ctx.fillStyle = '#400';
      ctx.fillRect(bx + labelW, 38, bw - labelW, 14);
      ctx.fillStyle = this.boss.phase === 2 ? '#f22' : '#e44';
      ctx.fillRect(bx + labelW, 38, (bw - labelW) * (this.boss.hp / this.boss.maxHp), 14);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(`${Math.round(this.boss.hp)}/${Math.round(this.boss.maxHp)}`, bx + bw - 55, 49);
    }

    // Map transition overlay
    if (this.transitionTimer > 0) {
      const fade = Math.min(1, this.transitionTimer / 30);
      ctx.fillStyle = 'rgba(0,0,0,' + (fade * 0.6).toFixed(2) + ')';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Wave / boss message
    if (this.waveMessageTimer > 0 && !this.gameOverDelay && !this.gameOver) {
      ctx.globalAlpha = Math.min(1, this.waveMessageTimer / 30);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px monospace';
      const tw = ctx.measureText(this.waveMessage).width;
      ctx.fillText(this.waveMessage, CANVAS_W / 2 - tw / 2, CANVAS_H / 2 - 60);
      ctx.globalAlpha = 1;
    }

    // Boss entrance phrase (follows boss)
    if (this.phraseTimer > 0 && this.phraseText && !this.gameOverDelay && !this.gameOver) {
      const src = this.phraseSource;
      const elapsed = this.phraseMaxTimer - this.phraseTimer;
      const floatY = elapsed * 0.25;
      let px, py;
      if (src) {
        px = src.x + src.w / 2 - cam.x;
        py = src.y - 14 - cam.y - floatY;
      } else {
        px = CANVAS_W / 2;
        py = CANVAS_H / 2 - 34 - floatY;
      }
      const txt = '\u201C' + this.phraseText + '\u201D';
      ctx.globalAlpha = Math.min(1, this.phraseTimer / 20);
      ctx.font = 'italic 14px monospace';
      const ptw = ctx.measureText(txt).width;
      const tx = Math.max(4, Math.min(px - ptw / 2, CANVAS_W - ptw - 4));
      ctx.fillStyle = '#000';
      ctx.fillText(txt, tx + 1, py + 1);
      ctx.fillStyle = this.phraseColor;
      ctx.fillText(txt, tx, py);
      ctx.globalAlpha = 1;
    }

    // Ninja response to boss entrance (follows player)
    if (this.ninjaResponseTimer > 0 && this.ninjaResponseText && !this.gameOverDelay && !this.gameOver) {
      const src = this.ninjaResponseSource;
      const elapsed = this.ninjaResponseMaxTimer - this.ninjaResponseTimer;
      const floatY = elapsed * 0.2;
      let px, py;
      if (src) {
        px = src.x + src.w / 2 - cam.x;
        py = src.y - 14 - cam.y - floatY;
      } else {
        px = CANVAS_W / 2;
        py = CANVAS_H / 2 - 14 - floatY;
      }
      const txt = '\u201C' + this.ninjaResponseText + '\u201D';
      ctx.globalAlpha = Math.min(1, this.ninjaResponseTimer / 20);
      ctx.font = 'italic 13px monospace';
      const nrtw = ctx.measureText(txt).width;
      const tx = Math.max(4, Math.min(px - nrtw / 2, CANVAS_W - nrtw - 4));
      ctx.fillStyle = '#000';
      ctx.fillText(txt, tx + 1, py + 1);
      ctx.fillStyle = this.ninjaResponseColor;
      ctx.fillText(txt, tx, py);
      ctx.globalAlpha = 1;
    }

    // Kill phrase (before game over, follows killer position)
    if (this.killPhraseTimer > 0 && this.killPhraseText && !this.gameOver) {
      const pos = this.killPhrasePos;
      const elapsed = this.killPhraseMaxTimer - this.killPhraseTimer;
      const floatY = elapsed * 0.2;
      let px, py;
      if (pos) {
        px = pos.x - cam.x;
        py = pos.y - 16 - cam.y - floatY;
      } else {
        px = CANVAS_W / 2;
        py = CANVAS_H / 2 - 27 - floatY;
      }
      const txt = '\u201C' + this.killPhraseText + '\u201D';
      ctx.globalAlpha = Math.min(1, this.killPhraseTimer / 15);
      ctx.font = 'italic bold 15px monospace';
      const kptw = ctx.measureText(txt).width;
      const tx = Math.max(4, Math.min(px - kptw / 2, CANVAS_W - kptw - 4));
      ctx.fillStyle = '#000';
      ctx.fillText(txt, tx + 1, py + 1);
      ctx.fillStyle = this.killPhraseColor;
      ctx.fillText(txt, tx, py);
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

    // Item pickup overlay
    if (this.itemPickupOverlay) {
      const ipo = this.itemPickupOverlay;
      const def = BOSS_ITEMS[ipo.itemId];
      if (def) {
        const fade = Math.min(1, ipo.timer / 20, (180 - ipo.timer + 1) / 20);
        ctx.globalAlpha = fade * 0.75;
        ctx.fillStyle = '#000';
        const boxW = 280, boxH = 64;
        const boxX = CANVAS_W / 2 - boxW / 2;
        const boxY = CANVAS_H / 2 - 80;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        // Icon with glow
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 12;
        const icoGrad = ctx.createRadialGradient(boxX + 24, boxY + 32, 2, boxX + 24, boxY + 32, 20);
        icoGrad.addColorStop(0, def.color);
        icoGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = icoGrad;
        ctx.fillRect(boxX + 4, boxY + 8, 40, 48);
        drawItemIcon(ctx, ipo.itemId, boxX + 24, boxY + 34, 36, def.color);
        ctx.shadowBlur = 0;
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(def.name, boxX + 52, boxY + 22);
        // Description
        ctx.fillStyle = '#ccc';
        ctx.font = '11px monospace';
        const words = def.desc.split(' ');
        let line = '', lineY = boxY + 40;
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > boxW - 62) {
            ctx.fillText(line, boxX + 52, lineY);
            line = w; lineY += 14;
          } else { line = test; }
        }
        if (line) ctx.fillText(line, boxX + 52, lineY);
        ctx.globalAlpha = 1;
      }
    }

    // Game Over screen
    if (this.gameOver) {
      // Ensure no stray phrases render
      this.phraseText = '';
      this.ninjaResponseText = '';
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 36px monospace';
      const got = this.cheated ? 'GAME OVER, CHEATER!' : 'GAME OVER';
      const gotw = ctx.measureText(got).width;
      ctx.fillText(got, CANVAS_W / 2 - gotw / 2, CANVAS_H / 2 - 50);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      const gost = `Wave: ${this.wave}/${TOTAL_WAVES}  Kills: ${this.totalKills}  Deaths: ${this.deaths}`;
      const gostw = ctx.measureText(gost).width;
      ctx.fillText(gost, CANVAS_W / 2 - gostw / 2, CANVAS_H / 2);

      // Kill phrase on game over (static, already shown in-game)
      if (this.killPhraseText) {
        ctx.globalAlpha = 0.7;
        ctx.font = 'italic 14px monospace';
        ctx.fillStyle = this.killPhraseColor;
        const kpt = '\u201C' + this.killPhraseText + '\u201D';
        const kptw2 = ctx.measureText(kpt).width;
        ctx.fillText(kpt, CANVAS_W / 2 - kptw2 / 2, CANVAS_H / 2 + 30);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      const gort = 'Press R to restart';
      const gortw = ctx.measureText(gort).width;
      ctx.fillText(gort, CANVAS_W / 2 - gortw / 2, CANVAS_H / 2 + 75);
    }
  }
}
