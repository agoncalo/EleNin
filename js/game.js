// ── Game ──────────────────────────────────────────────────────
class Game {
  constructor() {
    this.tick = 0;
    this.menuActive = true;
    this.controlsScreen = false;
    this.controlsTick = 0;
    this.menuTick = 0;
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
    this.flamePools = [];
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
    this.orbBucketChoice = null; // { buckets: [{type:count}x3], selected: 0 }
    this.bossRewardItem = null;

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

    this.buildLevel();
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
      tentX = 380; tentGroundY = 440;
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
    if (this.levelType === 'tower') y = Math.min(this.player.y - 100, 200);
    const xMin = this.levelType === 'tower' ? 120 : 40;
    const xMax = this.levelType === 'tower' ? 840 : this.levelW - 60;
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
    let bx = Math.min(this.player.x + 300, this.levelW - 100);
    let by = this.levelType === 'tower' ? 100 : 300;
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

  // ── Orb Bucket Generation ──
  _generateOrbBuckets() {
    const pl = this.player;

    // How far behind the expected curve is the player?
    let cumDrops = 0;
    for (let i = 0; i < this.wave && i < WAVE_DEFS.length; i++) {
      cumDrops += WAVE_DEFS[i].killsForBoss + (i + 2);
    }
    const expectedAll = cumDrops * (0.10 + 0.36 + 0.10 + 0.06 + 0.03 + 0.04 + 0.04 + 0.03 + 0.02);
    const actualAll = (pl.maxHp - 10) + pl.maxShield / 2 + (pl.maxShurikens - 3) +
      pl.bonusDamage + pl.bonusElemental + pl.bonusSpeed + pl.bonusReach +
      pl.bonusArmor + pl.bonusMana;
    const deficit = Math.max(0, expectedAll - actualAll);
    const deficitRatio = expectedAll > 0 ? Math.min(1, deficit / expectedAll) : 1;
    const permTotal = pl.bonusDamage + pl.bonusElemental + pl.bonusSpeed + pl.bonusReach + pl.bonusArmor + pl.bonusMana;

    // Orb pricing — element=50 is the reference unit
    // Budget: 1 element minimum (50), 2 elements max (100) when no perms
    // Scales up with wave and deficit
    const baseBudget = 50 + this.wave * 8;
    const budget = Math.round(baseBudget * (1 + deficitRatio * 0.6));

    const ORB_META = {
      heal:      { icon: '\u2665', color: '#f44', label: 'HP',       per: 3,  cost: 3 },
      maxhp:     { icon: '+',  color: '#4f4', label: 'MAX HP',   per: 1,  cost: 8 },
      shield:    { icon: '\u25c6', color: '#4af', label: 'SHIELD',   per: 2,  cost: 5 },
      damage:    { icon: '!',  color: '#f80', label: 'ATK',      per: 1,  cost: 18 },
      elDmg:     { icon: '\u2737', color: '#c4f', label: 'EL.DMG',  per: 1,  cost: 20 },
      speed:     { icon: '\u00bb', color: '#0f0', label: 'SPD',      per: 1,  cost: 16 },
      reach:     { icon: '\u2194', color: '#fa0', label: 'REACH',    per: 1,  cost: 16 },
      armor:     { icon: '\u25a0', color: '#88f', label: 'ARMOR',    per: 1,  cost: 18 },
      shuriken:  { icon: '\u2726', color: '#ccc', label: 'SHURIKEN', per: 1,  cost: 8 },
      ultcharge: { icon: '\u2605', color: '#ff0', label: 'ULT',      per: 50, cost: 6 },
      element:   { icon: '\u25c8', color: '#f0f', label: 'SPECIAL',  per: 1,  cost: 50 },
    };

    // Filter useless orbs
    const hpFull = pl.hp >= pl.maxHp;
    const shieldFull = pl.maxShield > 0 && pl.shield >= pl.maxShield;
    const ultFull = pl.ultimateReady || pl.ultimateActive || pl.ultimateCharge >= pl.ultimateMax;

    const _pick = (pool) => {
      const total = pool.reduce((s, p) => s + p.w, 0);
      let r = Math.random() * total;
      for (const p of pool) { r -= p.w; if (r <= 0) return p.type; }
      return pool[pool.length - 1].type;
    };

    const rareBoost = 1 + deficitRatio * 3;
    const _basePool = () => {
      const pool = [];
      if (!hpFull) pool.push({ type: 'heal', w: 20 });
      pool.push({ type: 'maxhp', w: 14 });
      if (!shieldFull) pool.push({ type: 'shield', w: 15 });
      else pool.push({ type: 'shield', w: 4 });
      pool.push({ type: 'shuriken', w: 12 });
      if (!ultFull) pool.push({ type: 'ultcharge', w: 10 });
      pool.push({ type: 'damage', w: 6 * rareBoost });
      pool.push({ type: 'elDmg', w: 4 * rareBoost });
      pool.push({ type: 'speed', w: 6 * rareBoost });
      pool.push({ type: 'reach', w: 6 * rareBoost });
      pool.push({ type: 'armor', w: 5 * rareBoost });
      pool.push({ type: 'element', w: 6 * rareBoost });
      return pool;
    };

    const _makeBucket = () => {
      const pool = _basePool();
      const orbs = {};
      let remaining = budget;
      let elementCount = 0;
      const slotCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
      const slots = [];
      for (let s = 0; s < slotCount && pool.length > 0; s++) {
        const type = _pick(pool);
        if (!slots.includes(type)) slots.push(type);
        const idx = pool.findIndex(p => p.type === type);
        if (idx >= 0) pool.splice(idx, 1);
      }
      for (let safety = 0; safety < 200 && remaining > 0; safety++) {
        const affordable = slots.filter(t => {
          if (ORB_META[t].cost > remaining) return false;
          if (t === 'element' && elementCount >= 2) return false;
          // Don't offer more heal than missing HP
          if (t === 'heal' && (orbs['heal'] || 0) * 3 >= pl.maxHp - pl.hp) return false;
          return true;
        });
        if (!affordable.length) break;
        const type = affordable[safety % affordable.length];
        orbs[type] = (orbs[type] || 0) + 1;
        remaining -= ORB_META[type].cost;
        if (type === 'element') elementCount++;
      }
      return orbs;
    };

    // Check if bucket a is dominated by bucket b (b has >= of every type in a)
    const _dominated = (a, b) => {
      for (const t of Object.keys(a)) {
        if ((b[t] || 0) < a[t]) return false;
      }
      return true;
    };

    const buckets = [];
    for (let b = 0; b < 3; b++) {
      let orbs;
      for (let attempt = 0; attempt < 10; attempt++) {
        orbs = _makeBucket();
        // Ensure this bucket isn't dominated by any existing one,
        // and no existing one is dominated by this one
        let dominated = false;
        for (const other of buckets) {
          if (_dominated(orbs, other) || _dominated(other, orbs)) {
            dominated = true; break;
          }
        }
        if (!dominated) break;
      }
      buckets.push(orbs);
    }
    return { buckets, selected: 0, meta: ORB_META };
  }

  _applyOrbBucket(orbs) {
    const pl = this.player;
    for (const [type, count] of Object.entries(orbs)) {
      for (let i = 0; i < count; i++) {
        switch (type) {
          case 'heal':      pl.hp = Math.min(pl.hp + 3, pl.maxHp); break;
          case 'maxhp':     pl.maxHp += 1; pl.hp = Math.min(pl.hp + 1, pl.maxHp); break;
          case 'shield':    pl.maxShield += 2; pl.shield = Math.min(pl.shield + 3, pl.maxShield); break;
          case 'damage':    pl.bonusDamage += 1; break;
          case 'elDmg':     pl.bonusElemental += 1; break;
          case 'speed':     pl.bonusSpeed += 1; break;
          case 'reach':     pl.bonusReach += 1; break;
          case 'armor':     pl.bonusArmor += 1; break;
          case 'shuriken':  pl.maxShurikens += 1; pl.shurikens = Math.min(pl.shurikens + 1, pl.maxShurikens); break;
          case 'ultcharge': if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(50); break;
          case 'element':   pl.bonusMana += 1; pl.maxMana += 1; pl.mana = pl.maxMana; break;
        }
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
    const oldLevelType = this.levelType;
    this.buildLevel();
    // Only reposition player if level type changed
    if (this.levelType !== oldLevelType) {
      this.player.x = this.levelType === 'tower' ? 380 : 100;
      this.player.y = this.levelType === 'tower' ? 400 : 300;
      this.player.vx = 0;
      this.player.vy = 0;
      if (!this.gameOverDelay) {
        this.transitionTimer = 90;
        this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 120);
      }
    }
    this.spawnTimer = -120;
    SFX.wave();
    if (!this.gameOverDelay) {
      this.showWaveMessage(`Wave ${this.wave}/${TOTAL_WAVES} — Fight!`);
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

    // Orb bucket choice menu
    if (this.orbBucketChoice) {
      const obc = this.orbBucketChoice;
      if (obc.delay > 0) {
        obc.delay--;
        // Consume stale inputs during delay
        consumePress('ArrowLeft'); consumePress('KeyA');
        consumePress('ArrowRight'); consumePress('KeyD');
        consumePress('KeyZ'); consumePress('Enter'); consumePress('Space'); consumePress('MouseAttack');
      } else {
        if (consumePress('ArrowLeft') || consumePress('KeyA')) obc.selected = (obc.selected + 2) % 3;
        if (consumePress('ArrowRight') || consumePress('KeyD')) obc.selected = (obc.selected + 1) % 3;
        if (consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack')) {
          this._applyOrbBucket(obc.buckets[obc.selected]);
          this.orbBucketChoice = null;
          this.advanceWave();
        }
      }
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

    // Cheat: + to skip wave (grant average stats for the wave being skipped)
    if (consumePress('Equal') || consumePress('NumpadAdd')) {
      this.cheated = true;
      recordCheatUsed();
      if (this.boss && !this.boss.dead) this.boss.hp = 0;
      const waveDef = WAVE_DEFS[this.wave - 1];
      if (waveDef) {
        const pl = this.player;
        const kills = waveDef.killsForBoss;
        const bossOrbs = this.wave + 1; // avg boss orb count (wave + random 0-2)
        const drops = kills + bossOrbs;
        // Actual drop table rates × orb stat values per drop
        pl.maxHp          += Math.round(drops * 0.10);  // maxhp: 10% × +1
        pl.hp              = pl.maxHp;
        pl.bonusDamage    += Math.round(drops * 0.06);  // damage: 6% × +1
        pl.bonusElemental += Math.round(drops * 0.03);  // elDmg: 3% × +1
        pl.maxShield      += Math.round(drops * 0.18) * 2; // shield: 18% × +2
        pl.shield          = pl.maxShield;
        pl.maxShurikens   += Math.round(drops * 0.10);  // shuriken: 10% × +1
        pl.shurikens       = pl.maxShurikens;
        pl.bonusSpeed     += Math.round(drops * 0.04);  // speed: 4% × +1
        pl.bonusReach     += Math.round(drops * 0.04);  // reach: 4% × +1
        pl.bonusArmor     += Math.round(drops * 0.03);  // armor: 3% × +1
        pl.bonusMana      += Math.round(drops * 0.02);  // element: 2% × +1
        pl.maxMana        += Math.round(drops * 0.02);
        pl.mana            = pl.maxMana;
        pl.ultimateCharge  = 0;
        pl.ultimateReady   = false;
      }
      // Give a random uncollected boss item
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
      const pl = this.player;
      // Total orb sources: completed waves (enemies + boss orbs) + current wave enemies
      let totalDrops = 0;
      for (let i = 0; i < this.wave - 1 && i < WAVE_DEFS.length; i++) {
        totalDrops += WAVE_DEFS[i].killsForBoss + (i + 2); // enemies + avg boss orbs (wave i+1, avg = i+2)
      }
      if (this.wave - 1 < WAVE_DEFS.length) {
        totalDrops += WAVE_DEFS[this.wave - 1].killsForBoss; // current wave enemies only (boss not fought)
      }
      // Set absolute stats: base + average gains from all drops
      pl.maxHp          = 10 + Math.round(totalDrops * 0.10);  // base 10 + maxhp orbs
      pl.hp             = pl.maxHp;
      pl.displayHp      = pl.maxHp;
      pl.bonusDamage    = Math.round(totalDrops * 0.06);
      pl.bonusElemental = Math.round(totalDrops * 0.03);
      pl.maxShield      = Math.round(totalDrops * 0.18) * 2;
      pl.shield         = pl.maxShield;
      pl.displayShield  = pl.maxShield;
      pl.maxShurikens   = 3 + Math.round(totalDrops * 0.10);  // base 3
      pl.shurikens      = pl.maxShurikens;
      pl.bonusSpeed     = Math.round(totalDrops * 0.04);
      pl.bonusReach     = Math.round(totalDrops * 0.04);
      pl.bonusArmor     = Math.round(totalDrops * 0.03);
      pl.bonusMana      = Math.round(totalDrops * 0.02);
      pl.maxMana        = 2 + pl.bonusMana;
      pl.mana           = pl.maxMana;
      pl.ultimateCharge = 0;
      pl.ultimateReady  = false;
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
      this.camera.x = Math.max(0, Math.min(this.camera.x, this.levelW - CANVAS_W));
      this.camera.y = Math.max(this.levelType === 'tower' ? -600 : -100, Math.min(this.camera.y, 540 - CANVAS_H));
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
    for (const f of this.flamePools) f.update(this);
    this.flamePools = this.flamePools.filter(f => !f.done);
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
      if (this.boss && this.boss.dead && !this.orbBucketChoice) {
        this.orbBucketChoice = this._generateOrbBuckets();
        this.orbBucketChoice.delay = 120; // 3 second delay before selection allowed
        this.orbBucketChoice.rewardItem = this.bossRewardItem || null;
        this.bossRewardItem = null;
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

    // Camera follows player (smooth)
    const targetCamX = this.player.x + this.player.w / 2 - CANVAS_W / 2;
    const targetCamY = this.player.y + this.player.h / 2 - CANVAS_H / 2;
    this.camera.x = lerp(this.camera.x, targetCamX, 0.08);
    this.camera.y = lerp(this.camera.y, targetCamY, 0.08);
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.levelW - CANVAS_W));
    this.camera.y = Math.max(this.levelType === 'tower' ? -600 : -100, Math.min(this.camera.y, 540 - CANVAS_H));
  }

  renderMenu() {
    this.menuTick++;
    const t = this.menuTick;

    // Dark background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#06061a');
    grad.addColorStop(1, '#12122e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Background stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const seed = i * 137 + 29;
      const sx = (seed * 7.3) % CANVAS_W;
      const sy = (seed * 3.1) % CANVAS_H;
      const twinkle = 0.2 + Math.sin(t * 0.02 + i) * 0.3 + 0.3;
      ctx.globalAlpha = twinkle;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // ── ELENIN logo with rectangular letters ──
    const ninjaColors = [
      { body: '#e33', accent: '#f93' },     // E - fire
      { body: '#a0622a', accent: '#2e9e2e' }, // l - earth
      { body: '#48f', accent: '#8cf' },       // e - bubble
      { body: '#726', accent: '#a4e' },       // N - shadow
      { body: '#2dd', accent: '#aff' },       // i - crystal
      { body: '#8d8', accent: '#bfb' },       // n - wind
    ];

    const letterW = 48;
    const letterH = 64;
    const gap = 14;
    const totalW = 6 * letterW + 5 * gap;
    const startX = (CANVAS_W - totalW) / 2;
    const startY = 140;
    const bg = '#06061a'; // cutout color (matches background)
    const s = 2; // strip/cutout thickness

    // Letter drawing: solid rectangles with rectangular cutouts
    const drawE = (x, y, color, accentColor) => {
      const pillar = 12;
      // Left vertical pillar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pillar, letterH);
      // Three horizontal bars (top, mid, bottom)
      ctx.fillRect(x + pillar, y, letterW - pillar, 10);
      ctx.fillRect(x + pillar, y + letterH / 2 - 5, (letterW - pillar) * 0.75, 10);
      ctx.fillRect(x + pillar, y + letterH - 10, letterW - pillar, 10);
      // Accent edges
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, y, letterW - pillar, 2);
      ctx.fillRect(x + pillar, y + letterH - 2, letterW - pillar, 2);
      ctx.fillRect(x, y, pillar, 2);
    };

    const drawLower_l = (x, y, color, accentColor) => {
      // Tall narrow solid block
      const pillarW = 18;
      const px = x + (letterW - pillarW) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(px, y, pillarW, letterH);
      // Small wide foot
      ctx.fillStyle = accentColor;
      ctx.fillRect(px - 4, y + letterH - 4, pillarW + 8, 4);
      // Top accent
      ctx.fillRect(px, y, pillarW, 2);
    };

    const drawLower_e = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      const h = letterH - topOff;
      const yy = y + topOff;
      const pillar = 10;
      // Left vertical pillar
      ctx.fillStyle = color;
      ctx.fillRect(x, yy, pillar, h);
      // Three horizontal bars (top, mid, bottom)
      ctx.fillRect(x + pillar, yy, letterW - pillar, 8);
      ctx.fillRect(x + pillar, yy + h / 2 - 4, letterW - pillar, 8);
      ctx.fillRect(x + pillar, yy + h - 8, (letterW - pillar) * 0.75, 8);
      // Right top section (closes the top)
      ctx.fillRect(x + letterW - pillar, yy, pillar, h / 2 - 4);
      // Accent edges
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, yy, letterW - pillar, 2);
      ctx.fillRect(x + pillar, yy + h / 2 - 4, letterW - pillar, 2);
      ctx.fillRect(x, yy, pillar, 2);
    };

    const drawN = (x, y, color, accentColor) => {
      const pillar = 12;
      // Left pillar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pillar, letterH);
      // Right pillar
      ctx.fillRect(x + letterW - pillar, y, pillar, letterH);
      // Diagonal: thick stepped blocks connecting top-left to bottom-right
      ctx.fillStyle = accentColor;
      const steps = 7;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const bx = x + pillar - 2 + frac * (letterW - pillar * 2 + 4 - 10);
        const by = y + frac * (letterH - 10);
        ctx.fillRect(bx, by, 10, 10);
      }
      // Accent: thin line on left pillar top and right pillar bottom
      ctx.fillRect(x, y, pillar, 2);
      ctx.fillRect(x + letterW - pillar, y + letterH - 2, pillar, 2);
    };

    const drawLower_i = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      // Stem: solid narrow block
      const pillarW = 18;
      const px = x + (letterW - pillarW) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + topOff, pillarW, letterH - topOff);
      // Accent base
      ctx.fillStyle = accentColor;
      ctx.fillRect(px - 3, y + letterH - 3, pillarW + 6, 3);
      // Top accent
      ctx.fillRect(px, y + topOff, pillarW, 2);
    };

    const drawLower_n = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      const h = letterH - topOff;
      const yy = y + topOff;
      const pillar = 10;
      // Left pillar
      ctx.fillStyle = color;
      ctx.fillRect(x, yy, pillar, h);
      // Right pillar
      ctx.fillRect(x + letterW - pillar, yy + 8, pillar, h - 8);
      // Top arch bar connecting them
      ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 10);
      // Accent: top edge
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 2);
      ctx.fillRect(x, yy, pillar, 2);
    };

    // Floating animation per letter
    const letters = [
      { draw: drawE, upper: true },
      { draw: drawLower_l, upper: false },
      { draw: drawLower_e, upper: false },
      { draw: drawN, upper: true },
      { draw: drawLower_i, upper: false },
      { draw: drawLower_n, upper: false },
    ];

    for (let i = 0; i < 6; i++) {
      const lx = startX + i * (letterW + gap);
      const floatY = Math.sin(t * 0.035 + i * 0.8) * 5;
      const ly = startY + floatY;
      const c = ninjaColors[i];

      // Glow behind each letter
      ctx.save();
      ctx.shadowColor = c.accent;
      ctx.shadowBlur = 15 + Math.sin(t * 0.05 + i) * 5;
      letters[i].draw(lx, ly, c.body, c.accent);
      ctx.restore();

      // Draw letter again without shadow for clean look
      letters[i].draw(lx, ly, c.body, c.accent);

      // Hat on the "i" (index 4) — ninja kasa
      if (i === 4) {
        const hatCx = lx + letterW / 2;
        const hatBaseY = ly + letterH * 0.3 - 4;
        // Pointed kasa hat
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.moveTo(hatCx - 16, hatBaseY);
        ctx.lineTo(hatCx, hatBaseY - 22);
        ctx.lineTo(hatCx + 16, hatBaseY);
        ctx.closePath();
        ctx.fill();
        // Brim
        ctx.fillStyle = c.body;
        ctx.fillRect(hatCx - 16, hatBaseY - 2, 32, 4);
      }
    }

    // Subtitle
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.04) * 0.2;
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('~ an elemental ninja platformer ~', CANVAS_W / 2, startY + letterH + 35);
    ctx.globalAlpha = 1;

    // "Press any key to start" blinking
    const blink = Math.sin(t * 0.06) > -0.3;
    if (blink) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ANY KEY TO START', CANVAS_W / 2, CANVAS_H - 120);
    }

    // Small ninja silhouettes at bottom
    const ninjaNames = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind'];
    const silW = 16, silH = 22;
    const silTotalW = 6 * silW + 5 * 24;
    const silStartX = (CANVAS_W - silTotalW) / 2;
    const silY = CANVAS_H - 75;
    for (let i = 0; i < 6; i++) {
      const sx = silStartX + i * (silW + 24);
      const c = ninjaColors[i];
      const bob = Math.sin(t * 0.04 + i * 1.1) * 2;
      ctx.globalAlpha = 0.7;
      // Body
      ctx.fillStyle = c.body;
      ctx.fillRect(sx, silY + bob + 8, silW, silH - 8);
      // Head
      ctx.fillRect(sx + 3, silY + bob, 10, 10);
      // Hat
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.moveTo(sx - 1, silY + bob + 2);
      ctx.lineTo(sx + 8, silY + bob - 8);
      ctx.lineTo(sx + 17, silY + bob + 2);
      ctx.closePath();
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx + 4, silY + bob + 3, 2, 2);
      ctx.fillRect(sx + 9, silY + bob + 3, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  renderControls() {
    this.controlsTick++;
    const t = this.controlsTick;

    // Dark background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#08081e');
    grad.addColorStop(1, '#141430');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', CANVAS_W / 2, 36);

    // Helper to draw a key cap
    const drawKey = (cx, cy, label, w, h) => {
      w = w || 30; h = h || 26;
      // Key body
      ctx.fillStyle = '#222';
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      // Highlight top edge
      ctx.fillStyle = '#444';
      ctx.fillRect(cx - w / 2 + 1, cy - h / 2, w - 2, 2);
      // Label
      ctx.fillStyle = '#ddd';
      ctx.font = label.length > 2 ? '9px monospace' : 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + 1);
    };

    ctx.textBaseline = 'middle';

    // ── LEFT SIDE: Movement ──
    const mlx = 170, mly = 100;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOVEMENT', mlx + 16, mly - 30);

    // Arrow keys
    drawKey(mlx, mly - 2, '\u2191');         // Up
    drawKey(mlx - 34, mly + 28, '\u2190');   // Left
    drawKey(mlx, mly + 28, '\u2193');         // Down
    drawKey(mlx + 34, mly + 28, '\u2192');   // Right

    // Or WASD
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('or', mlx + 90, mly + 13);

    const wsdx = mlx + 130;
    drawKey(wsdx, mly - 2, 'W');
    drawKey(wsdx - 34, mly + 28, 'A');
    drawKey(wsdx, mly + 28, 'S');
    drawKey(wsdx + 34, mly + 28, 'D');

    // Labels
    ctx.fillStyle = '#8cf';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Jump / Double Jump', mlx + 180, mly - 2);
    ctx.fillText('Move Left / Right', mlx + 180, mly + 16);
    ctx.fillText('Ground Slam (hold)', mlx + 180, mly + 34);

    // Space bar
    drawKey(mlx + 50, mly + 66, 'SPACE', 80, 24);
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('= Jump', mlx + 96, mly + 66);

    // ── RIGHT SIDE: Combat ──
    const crx = 170, cry = 220;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COMBAT', crx + 16, cry - 20);

    // Z/J, X/K, C/L, V/M
    const combatKeys = [
      { k1: 'Z', k2: 'J', label: 'Attack', color: '#f88' },
      { k1: 'X', k2: 'K', label: 'Special (costs mana)', color: '#8f8' },
      { k1: 'C', k2: 'L', label: 'Shuriken', color: '#ff8' },
      { k1: 'V', k2: 'M', label: 'Ultimate (when charged)', color: '#f8f' },
    ];
    for (let i = 0; i < combatKeys.length; i++) {
      const row = combatKeys[i];
      const ry = cry + i * 32;
      drawKey(crx - 20, ry, row.k1);
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('/', crx + 5, ry);
      drawKey(crx + 30, ry, row.k2);
      ctx.fillStyle = row.color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(row.label, crx + 54, ry);
    }

    // ── Mouse ──
    const msx = 540, msy = 100;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOUSE', msx + 30, msy - 30);

    // Simple mouse icon
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(msx, msy - 15, 60, 80, 12);
    ctx.stroke();
    // Divider line
    ctx.beginPath();
    ctx.moveTo(msx + 30, msy - 15);
    ctx.lineTo(msx + 30, msy + 25);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(msx, msy + 25);
    ctx.lineTo(msx + 60, msy + 25);
    ctx.stroke();

    // LMB label
    ctx.fillStyle = '#f88';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ATK', msx + 15, msy + 5);
    // RMB label
    ctx.fillStyle = '#8f8';
    ctx.fillText('SPC', msx + 45, msy + 5);
    // MMB label
    ctx.fillStyle = '#ff8';
    ctx.fillText('SHR', msx + 30, msy + 40);

    // Mouse labels
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f88';
    ctx.fillText('Left Click = Attack', msx + 70, msy - 2);
    ctx.fillStyle = '#8f8';
    ctx.fillText('Right Click = Special', msx + 70, msy + 16);
    ctx.fillStyle = '#ff8';
    ctx.fillText('Middle Click = Shuriken', msx + 70, msy + 34);
    ctx.fillStyle = '#ccc';
    ctx.fillText('Scroll = Switch Ninja', msx + 70, msy + 52);

    // ── Ninja Switching ──
    const nsx = 540, nsy = 215;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NINJA SWITCH', nsx + 80, nsy - 18);

    const ninjaList = [
      { key: '1', name: 'Fire', color: '#e33' },
      { key: '2', name: 'Earth', color: '#a0622a' },
      { key: '3', name: 'Bubble', color: '#48f' },
      { key: '4', name: 'Shadow', color: '#726' },
      { key: '5', name: 'Crystal', color: '#2dd' },
      { key: '6', name: 'Wind', color: '#8d8' },
      { key: '7', name: 'Storm', color: '#aa4' },
    ];
    for (let i = 0; i < ninjaList.length; i++) {
      const n = ninjaList[i];
      const nx = nsx + (i % 4) * 88;
      const ny = nsy + Math.floor(i / 4) * 30;
      drawKey(nx, ny, n.key);
      ctx.fillStyle = n.color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(n.name, nx + 20, ny);
    }

    // ── System ──
    const ssx = 170, ssy = 380;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM', ssx, ssy - 18);
    drawKey(ssx - 20, ssy, 'ESC', 36);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Pause', ssx + 6, ssy);

    // ── HUD Bars Guide ──
    const bx = 440, by = 310;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HUD BARS', bx + 100, by - 18);

    ctx.textAlign = 'left';
    ctx.font = '10px monospace';

    // Ultimate bar example
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, 120, 12);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(bx, by, 72, 12);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 120, 12);
    ctx.fillStyle = '#ff0';
    ctx.fillText('Ultimate charge — fills from kills', bx + 128, by + 10);

    // HP bar example
    const hby = by + 22;
    ctx.fillStyle = '#400';
    ctx.fillRect(bx, hby, 120, 10);
    ctx.fillStyle = '#e44';
    ctx.fillRect(bx, hby, 84, 10);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(bx, hby, 120, 10);
    ctx.fillStyle = '#e44';
    ctx.fillText('HP — your health', bx + 128, hby + 9);

    // Shield bar example
    const sby = hby + 20;
    ctx.fillStyle = '#112';
    ctx.fillRect(bx, sby, 120, 8);
    ctx.fillStyle = '#4af';
    ctx.fillRect(bx, sby, 60, 8);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(bx, sby, 120, 8);
    ctx.fillStyle = '#4af';
    ctx.fillText('Shield — absorbs damage first', bx + 128, sby + 8);

    // Mana pips example
    const mpy = sby + 20;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < 2 ? '#f93' : '#222';
      ctx.fillRect(bx + i * 18, mpy, 14, 14);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(bx + i * 18, mpy, 14, 14);
    }
    ctx.fillStyle = '#f93';
    ctx.fillText('Mana — used for special ability', bx + 128, mpy + 11);

    // Buff icons
    const ipy = mpy + 24;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#f80';
    ctx.fillText('\u2694', bx, ipy);
    ctx.fillStyle = '#0f0';
    ctx.fillText('\u00bb', bx + 20, ipy);
    ctx.fillStyle = '#fa0';
    ctx.fillText('\u2194', bx + 40, ipy);
    ctx.fillStyle = '#88f';
    ctx.fillText('\u26CA', bx + 60, ipy);
    ctx.fillStyle = '#f44';
    ctx.fillText('\u2665', bx + 80, ipy);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Atk  Spd  Rch  Arm  Lives', bx + 128, ipy);

    // ── Tip about ninja abilities ──
    ctx.fillStyle = '#f93';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Each ninja has a unique special ability — try them all!', CANVAS_W / 2, CANVAS_H - 80);

    // Blink prompt
    const blink = Math.sin(t * 0.06) > -0.3;
    if (blink) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ANY KEY TO START', CANVAS_W / 2, CANVAS_H - 40);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  render() {
    if (this.menuActive) {
      this.renderMenu();
      return;
    }
    if (this.controlsScreen) {
      this.renderControls();
      return;
    }

    const cam = this.camera;
    updateScreenShake();
    cam.x += screenShakeX;
    cam.y += screenShakeY;

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

    // ── Ultimate background details ──

    // Fire ultimate: background mini meteors streaking across sky
    if (fireUltSky) {
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const seed = i * 173 + 91;
        const speed = 1.5 + (seed % 7) * 0.5;
        const period = 180 + (seed % 120);
        const phase = (this.tick * speed + seed) % period;
        const progress = phase / period;
        const sx = (seed * 3.7 % CANVAS_W) + progress * 300 - 100;
        const sy = (seed * 2.3 % (CANVAS_H * 0.6)) + progress * 200;
        if (sx > -20 && sx < CANVAS_W + 20 && sy > -20 && sy < CANVAS_H) {
          const size = 2 + (seed % 3);
          // Trail
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = '#f93';
          ctx.lineWidth = size * 0.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 12 - size * 3, sy - 8 - size * 2);
          ctx.stroke();
          // Body
          ctx.globalAlpha = 0.5 + Math.sin(this.tick * 0.1 + i) * 0.2;
          ctx.fillStyle = i % 3 === 0 ? '#ff4' : '#f62';
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Earth ultimate: space jets and helicopters passing by
    if (this.player.earthGolem) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const seed = i * 251 + 47;
        const speed = 2 + (seed % 3);
        const period = 400 + (seed % 200);
        const dir = i % 2 === 0 ? 1 : -1;
        const phase = (this.tick * speed + seed * 10) % period;
        const progress = phase / period;
        const vx = dir > 0 ? -80 + progress * (CANVAS_W + 160) : CANVAS_W + 80 - progress * (CANVAS_W + 160);
        const vy = 30 + (seed % 5) * 40 + Math.sin(this.tick * 0.02 + i) * 8;
        ctx.globalAlpha = 0.35;
        if (i < 2) {
          // Jet: triangular body + exhaust
          ctx.fillStyle = '#8b6340';
          ctx.beginPath();
          ctx.moveTo(vx + dir * 18, vy);
          ctx.lineTo(vx - dir * 10, vy - 5);
          ctx.lineTo(vx - dir * 10, vy + 5);
          ctx.closePath();
          ctx.fill();
          // Wings
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(vx - dir * 4, vy - 9, 8, 3);
          ctx.fillRect(vx - dir * 4, vy + 6, 8, 3);
          // Exhaust glow
          ctx.globalAlpha = 0.2 + Math.sin(this.tick * 0.3 + i) * 0.1;
          ctx.fillStyle = '#fa3';
          ctx.beginPath();
          ctx.arc(vx - dir * 12, vy, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Helicopter: body + rotor
          ctx.fillStyle = '#7a5a3a';
          ctx.fillRect(vx - 10, vy - 4, 20, 8);
          // Cockpit
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(vx + dir * 8, vy - 3, 4, 6);
          // Rotor blades (spinning)
          ctx.strokeStyle = '#c8a878';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
          const rotAngle = this.tick * 0.4 + i * 2;
          ctx.beginPath();
          ctx.moveTo(vx + Math.cos(rotAngle) * 16, vy - 6);
          ctx.lineTo(vx - Math.cos(rotAngle) * 16, vy - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(vx + Math.sin(rotAngle) * 16, vy - 6);
          ctx.lineTo(vx - Math.sin(rotAngle) * 16, vy - 6);
          ctx.stroke();
          // Tail
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(vx - dir * 10, vy - 2, 6, 4);
        }
      }
      ctx.restore();
    }

    // Wind ultimate: ghost elk silhouette in background
    if (this.player.windBow) {
      ctx.save();
      const elkAlpha = 0.12 + Math.sin(this.tick * 0.03) * 0.05;
      ctx.globalAlpha = elkAlpha;
      ctx.fillStyle = '#bfb';
      // Elk position: drifts slowly across screen
      const elkX = CANVAS_W * 0.5 + Math.sin(this.tick * 0.008) * 80;
      const elkY = CANVAS_H * 0.3 + Math.sin(this.tick * 0.012) * 20;
      const s = 1.2; // scale
      // Body (large rectangle)
      ctx.fillRect(elkX - 40 * s, elkY - 10 * s, 80 * s, 30 * s);
      // Head (rectangle extending forward)
      ctx.fillRect(elkX + 35 * s, elkY - 20 * s, 25 * s, 22 * s);
      // Neck
      ctx.fillRect(elkX + 30 * s, elkY - 15 * s, 12 * s, 20 * s);
      // Front legs
      ctx.fillRect(elkX + 15 * s, elkY + 18 * s, 8 * s, 30 * s);
      ctx.fillRect(elkX + 28 * s, elkY + 18 * s, 8 * s, 28 * s);
      // Back legs
      ctx.fillRect(elkX - 25 * s, elkY + 18 * s, 8 * s, 28 * s);
      ctx.fillRect(elkX - 12 * s, elkY + 18 * s, 8 * s, 30 * s);
      // Antlers (branching rectangles)
      ctx.fillRect(elkX + 42 * s, elkY - 35 * s, 5 * s, 18 * s);
      ctx.fillRect(elkX + 55 * s, elkY - 30 * s, 5 * s, 14 * s);
      ctx.fillRect(elkX + 38 * s, elkY - 32 * s, 22 * s, 4 * s);
      // Second branch
      ctx.fillRect(elkX + 48 * s, elkY - 42 * s, 4 * s, 12 * s);
      ctx.fillRect(elkX + 44 * s, elkY - 40 * s, 14 * s, 4 * s);
      // Tail (small block)
      ctx.fillRect(elkX - 42 * s, elkY - 8 * s, 8 * s, 6 * s);
      // Eye glow
      ctx.globalAlpha = elkAlpha * 2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(elkX + 52 * s, elkY - 16 * s, 4 * s, 4 * s);
      ctx.restore();
    }

    // Spawn house
    this.renderSpawnHouse(ctx, cam);

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
    for (const bi of this.bossItems) bi.render(ctx, cam);
    if (this.crystalCastle) this.crystalCastle.render(ctx, cam);
    for (const p of this.projectiles) p.render(ctx, cam);
    if (this.trimerangs) for (const t of this.trimerangs) t.render(ctx, cam);
    if (this.diamondShards) for (const d of this.diamondShards) d.render(ctx, cam);
    for (const f of this.flamePools) f.render(ctx, cam);

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

    this.player.render(ctx, cam);

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

    // Shadow ultimate: glowing eyes (active during entire darkness)
    if (this.player.ninjaType === 'shadow' && this.player.shadowDarkness > 0.1) {
      ctx.save();
      const eyeAlpha = Math.min(1, this.player.shadowDarkness / 0.3);
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
    if (pl.statusCurse > 0) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(pl.statusCurse * 0.12);
      ctx.fillStyle = '#928';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (pl.statusBleed > 0) {
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.03 * Math.sin(pl.statusBleed * 0.15);
      ctx.fillStyle = '#a22';
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

    if (!this.simplePause) this.renderUI();
  }

  renderUI() {
    const cam = this.camera;
    const pl = this.player;
    const t = pl.type;
    const ninjaKeys = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind', 'storm'];

    // Timer (top left)
    {
      const totalSec = Math.floor(this.tick / 60);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const timeStr = min + ':' + (sec < 10 ? '0' : '') + sec;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(4, 4, 52, 18);
      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(timeStr, 10, 17);
    }

    // Ninja bar at top, status bars stacked up from bottom
    const ninjaBarY = 4;
    const gap = 6;

    // Mana pip bar
    const manaColors = { fire: '#f93', earth: '#8b5e3c', bubble: '#6af', shadow: '#a4e', crystal: '#0ff', wind: '#8d8', storm: '#48f' };
    const manaColor = manaColors[pl.ninjaType] || '#aaa';
    const pipSize = 14;
    const pipGap = 4;
    const totalPips = pl.maxMana;
    const pipBarW = totalPips * (pipSize + pipGap) - pipGap;
    const pipBarX = CANVAS_W / 2 - pipBarW / 2;
    const elemBarH = pipSize;
    const elemBarY = CANVAS_H - elemBarH - gap;
    for (let i = 0; i < totalPips; i++) {
      const px = pipBarX + i * (pipSize + pipGap);
      const fillAmount = Math.min(1, Math.max(0, pl.mana - i));
      ctx.fillStyle = '#222';
      ctx.fillRect(px, elemBarY, pipSize, pipSize);
      if (fillAmount > 0) {
        ctx.save();
        if (fillAmount >= 1) { ctx.shadowColor = manaColor; ctx.shadowBlur = 8; }
        ctx.fillStyle = manaColor;
        ctx.fillRect(px, elemBarY + pipSize * (1 - fillAmount), pipSize, pipSize * fillAmount);
        ctx.restore();
      }
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, elemBarY, pipSize, pipSize);
    }
    const elemLabels = { fire: 'FIRE', earth: 'EARTH', bubble: 'WATER', shadow: 'SHADOW', crystal: 'CRYSTAL', wind: 'WIND', storm: 'STORM' };
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 9px monospace';
    const elemLabel = elemLabels[pl.ninjaType] || 'ELEM';
    ctx.fillText(elemLabel, pipBarX - ctx.measureText(elemLabel).width - 6, elemBarY + 11);

    // Shield bar (separate row, only if player has shield)
    const hasShield = pl.maxShield > 0;
    const shieldBarH = 8;
    const shieldBarW = Math.min(CANVAS_W - 40, 100 + pl.maxShield * 2);
    const shieldBarY = hasShield ? elemBarY - shieldBarH - gap : elemBarY;
    const shieldBarX = CANVAS_W / 2 - shieldBarW / 2;
    if (hasShield) {
      const shieldRatio = pl.displayShield / pl.maxShield;
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
    const displayHpRatio = pl.displayHp / pl.maxHp;
    ctx.fillStyle = '#400';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    // Trailing damage bar (shows recent damage draining away)
    if (displayHpRatio > hpRatio) {
      ctx.fillStyle = '#f84';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * displayHpRatio, hpBarH);
    }
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
    buffItems.push({ icon: '\u2694', value: totalAtk, color: '#f80', hasBonus: pl.bonusDamage > 0, bonusVal: pl.bonusDamage });
    const totalEle = baseAtk + pl.bonusElemental;
    buffItems.push({ icon: '\u2737', value: totalEle, color: '#c4f', hasBonus: pl.bonusElemental > 0, bonusVal: pl.bonusElemental });
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
          iw += 2 + ctx.measureText(`+${b.bonusVal}`).width;
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
          ctx.fillText(`+${b.bonusVal}`, bx + iconW + 3 + valW + 2, by);
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

    // Boss HUD (top center): HP bar matching progress bar size
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      const pbW = 400, pbH = 18;
      const pbX = CANVAS_W / 2 - pbW / 2;
      const pbY = 38;
      const hpRatio = b.hp / b.maxHp;
      const displayRatio = b.displayHp / b.maxHp;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(pbX - 2, pbY - 2, pbW + 4, pbH + 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(pbX, pbY, pbW, pbH);
      // Trailing damage bar
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f84';
        ctx.fillRect(pbX, pbY, pbW * displayRatio, pbH);
      }
      // HP fill
      ctx.fillStyle = b.phase === 2 ? '#f22' : '#e44';
      ctx.fillRect(pbX, pbY, pbW * hpRatio, pbH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pbX, pbY, pbW, pbH);
      // Boss name label on top of bar
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      const bossLabel = `${b.name} [${this.wave}/${TOTAL_WAVES}]`;
      const tw = ctx.measureText(bossLabel).width;
      ctx.fillText(bossLabel, CANVAS_W / 2 - tw / 2, pbY + 14);
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

    // Orb bucket choice overlay
    if (this.orbBucketChoice) {
      const obc = this.orbBucketChoice;
      const meta = obc.meta;
      // Darken
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Boss item reward (shown at top)
      let headerH = 80;
      if (obc.rewardItem) {
        const def = BOSS_ITEMS[obc.rewardItem];
        if (def) {
          headerH = 110;
          // Item box
          const ibW = 340, ibH = 50;
          const ibX = CANVAS_W / 2 - ibW / 2, ibY = 45;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(ibX, ibY, ibW, ibH);
          ctx.strokeStyle = def.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(ibX, ibY, ibW, ibH);
          // Icon
          ctx.shadowColor = def.color;
          ctx.shadowBlur = 10;
          drawItemIcon(ctx, obc.rewardItem, ibX + 24, ibY + ibH / 2, 28, def.color);
          ctx.shadowBlur = 0;
          // Name
          ctx.fillStyle = def.color;
          ctx.font = 'bold 13px monospace';
          ctx.fillText(def.name, ibX + 46, ibY + 20);
          // Description
          ctx.fillStyle = '#ccc';
          ctx.font = '10px monospace';
          ctx.fillText(def.desc, ibX + 46, ibY + 36);
        }
      }
      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      const title = 'Choose Your Reward';
      const titleW = ctx.measureText(title).width;
      ctx.fillText(title, CANVAS_W / 2 - titleW / 2, headerH + 20);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#aaa';
      const sub = obc.delay > 0
        ? '...' + Math.ceil(obc.delay / 60)
        : '\u2190 A/D \u2192 to browse, Z/Enter to pick';
      const subW = ctx.measureText(sub).width;
      ctx.fillText(sub, CANVAS_W / 2 - subW / 2, headerH + 40);
      // Draw 3 buckets
      const boxW = 200, boxH = 200, boxGap = 30;
      const totalW = boxW * 3 + boxGap * 2;
      const startX = CANVAS_W / 2 - totalW / 2;
      const startY = headerH + 56;
      for (let b = 0; b < 3; b++) {
        const bx = startX + b * (boxW + boxGap);
        const by = startY;
        const isSel = b === obc.selected;
        // Box bg
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = isSel ? '#ff0' : '#555';
        ctx.lineWidth = isSel ? 3 : 1;
        ctx.strokeRect(bx, by, boxW, boxH);
        // Bucket number
        ctx.fillStyle = isSel ? '#ff0' : '#888';
        ctx.font = 'bold 14px monospace';
        ctx.fillText((b + 1) + '', bx + boxW / 2 - 4, by + 20);
        // Orb entries — sorted by rarity (rarest first)
        const _orbOrder = ['element','elDmg','damage','armor','speed','reach','shuriken','maxhp','ultcharge','shield','heal'];
        const entries = Object.entries(obc.buckets[b])
          .sort((a, b) => _orbOrder.indexOf(a[0]) - _orbOrder.indexOf(b[0]));
        let ey = by + 38;
        for (const [type, count] of entries) {
          const m = meta[type];
          if (!m) continue;
          const totalVal = count * m.per;
          // Icon
          ctx.fillStyle = m.color;
          ctx.font = 'bold 16px monospace';
          ctx.fillText(m.icon, bx + 14, ey + 5);
          // Label
          ctx.fillStyle = m.color;
          ctx.font = '12px monospace';
          const valStr = '+' + totalVal + ' ' + m.label;
          ctx.fillText(valStr, bx + 36, ey + 4);
          // Count hint
          if (count > 1) {
            ctx.fillStyle = '#888';
            ctx.font = '10px monospace';
            ctx.fillText('x' + count, bx + boxW - 30, ey + 4);
          }
          ey += 24;
        }
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

    // Restore camera after shake offset
    cam.x -= screenShakeX;
    cam.y -= screenShakeY;
  }
}
