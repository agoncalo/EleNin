// ── Main Menu Options ────────────────────────────────────────
const MAIN_MENU_OPTIONS = ['Play', 'Controls', 'Ninja Guide', 'Bestiary', 'Vault', 'Achievements', 'Music', 'SFX'];

const GAME_OBJECT_LIMITS = {
  projectiles: 180,
  hitLines: 90,
  grenades: 48,
  effects: 120,
  stoneBlocks: 36,
  bubbles: 64,
  orbs: 100,
  trimerangs: 28,
  diamondShards: 96,
  flamePools: 36,
  fireTrails: 90,
  weatherParticles: 96,
};

function keepNotDone(obj) { return obj && !obj.done; }
function keepEnemyAlive(enemy) { return enemy && !enemy.dead; }
function keepPositiveLife(obj) { return obj && obj.life > 0; }

function compactLiveArray(array, keepFn, maxLen) {
  let write = 0;
  for (let read = 0; read < array.length; read++) {
    const item = array[read];
    if (keepFn(item)) array[write++] = item;
  }
  array.length = write;
  if (maxLen && array.length > maxLen) array.splice(0, array.length - maxLen);
  return array;
}

// ── Game ──────────────────────────────────────────────────────
class Game {
  constructor() {
    this.tick = 0;
    this.menuActive = true;
    this.controlsScreen = false;
    this.mainMenuScreen = false;
    this.mainMenuSelected = 0;
    this.mainMenuPopup = null;
    this.controlsTick = 0;
    this.menuTick = 0;
    this.camera = { x: 0, y: 0 };
    this.player = new Player(100, 300);
    this.platforms = [];
    this.ropes = [];
    this.enemies = [];
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.effects = [];
    this.stoneBlocks = [];
    this.bubbles = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.bubbleShieldPickups = [];
    this.bossItems = [];
    this.fireTrails = [];
    this.spikes = [];
    this.trimerangs = [];
    this.diamondShards = [];
    this.flamePools = [];
    this.crystalCastle = null;
    this.deaths = 0;
    this.lives = 1;
    this.gameOver = false;
    this.cheated = false;
    this.levelType = 'open';
    this.levelW = 3200;
    this.levelH = 540;

    // Wave / spawn system
    this.wave = 1;
    this.waveKills = 0;
    this.objectiveKills = 0;
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
    this.bossRewardItems = [];   // up to 3 uncollected items offered on reward screen
    this.itemRewardScreen = null; // { itemId, bossType, roomId, selected, delay }

    // Choose-your-path system
    this.currentWaveDefIdx = 0;    // which WAVE_DEFS entry is active
    this.levelElement = null;      // elemental theme of current level (null = normal)
    this.pathChoiceScreen = null;  // { choices:[{waveIdx,element,label}], selected, delay }
    // Dynamic boss progression pools (replaces static BOSS_PATH_POOLS)
    this.bossPool = null;          // early-group pool ([1,2,3] + replacements) for waves 1-3
    this.mandatoryPool = null;     // mandatory group pool ([5,6,7]) for waves 4-6

    // Room map prototype
    this.mapState = this._loadMapState();
    this.mapScreen = null;         // { selected, recentUnlocks, completedRoomId, delay }
    this.currentRoomId = this.mapState.currentRoomId || MAP_START_ROOM_ID;
    this.roomCache = this.mapState.roomCache || {};
    this._ensureItemRoomAssignments();
    this._enterMapRoom(this.currentRoomId, { keepPlayer: true });

    // Boss Summon Orb system
    this.bossOrbCharge = 0;        // damage accumulated toward next orb
    this.bossOrbChargeMax = 100;   // damage threshold per orb spawn
    this.bossOrbCooldown = 0;      // frames remaining until next orb can spawn
    this.bossOrbsCollected = 0;    // orbs caught this wave
    this.bossOrbsRequired = 2;     // orbs needed to summon boss (2-5, scales with wave)
    this.bossOrbPickups = [];      // world pickup objects

    // Wave Objective system
    this.currentObjective = null;  // { type, filter?, label, desc, icon } from waveDef
    this.objZone = null;           // { x, y, w, h } for zone objective
    this.samurai = null;           // { x, y, w, h, hp, maxHp, dead, flashTimer } for defend
    this.pendingObjective = null;  // objective randomly picked at path choice, consumed by _initObjective

    // Weather & hazards
    this.levelHazards = [];
    this.hazardTimer = 0;
    this.weatherParticles = [];
    this.weatherTimer = 0;
    this.weatherFogCount = 0;

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
    this._initObjective();
    this.showWaveMessage(this._objectiveStartMessage());
    // Start phrase (character-specific)
    const startPool = NINJA_START_PHRASES[this.player.ninjaType] || START_PHRASES;
    this.phraseText = pickPhrase(startPool);
    this.phraseTimer = 100;
    this.phraseMaxTimer = 100;
    this.phraseColor = this.player.type.accentColor;
    this.phraseSource = this.player;
  }

  showWaveMessage(text) {
    if (typeof text === 'string' && /^Round\b/.test(text) && text.includes('Fight')) {
      text = this._objectiveStartMessage();
    }
    this.waveMessage = text;
    this.waveMessageTimer = 180;
  }

  _objectiveStartMessage() {
    const label = ((this.currentObjective && this.currentObjective.label) || 'Defeat Enemies').trim();
    const progress = this._objectiveProgressText();
    return (/^objective$/i.test(label) ? 'OBJECTIVE' : 'OBJECTIVE: ' + label) + progress;
  }

  _objectiveProgressText() {
    if (!this.bossOrbsRequired || this.bossActive || (this.boss && !this.boss.dead)) return '';
    const p = this._objectiveProgressInfo();
    if (!p) return '';
    return ' (' + p.current + '/' + p.target + (p.suffix || '') + ')';
  }

  _objectiveProgressRatio() {
    const p = this._objectiveProgressInfo();
    return p ? Math.max(0, Math.min(1, p.rawCurrent / Math.max(1, p.rawTarget))) : 0;
  }

  _objectiveProgressInfo() {
    const obj = this.currentObjective || { type: 'kills' };
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    if (obj.type === 'kills') {
      const target = Math.max(1, waveDef.killsForBoss || 20);
      return { current: Math.min(target, this.waveKills || 0), target, rawCurrent: this.waveKills || 0, rawTarget: target };
    }
    if (obj.type === 'hunt') {
      const target = Math.max(1, Math.ceil((waveDef.killsForBoss || 24) * 0.45));
      return { current: Math.min(target, this.objectiveKills || 0), target, rawCurrent: this.objectiveKills || 0, rawTarget: target };
    }
    if (obj.type === 'collect') {
      const target = Math.max(1, this.bossOrbsRequired || 1);
      return { current: Math.min(target, this.bossOrbsCollected || 0), target, rawCurrent: this.bossOrbsCollected || 0, rawTarget: target };
    }
    const secondsPerOrb = obj.type === 'survive' ? 30 : obj.type === 'zone' ? 25 : obj.type === 'defend' ? 20 : 30;
    const targetFrames = Math.max(1, (this.bossOrbsRequired || 1) * secondsPerOrb * 60);
    const currentFrames = (this.bossOrbsCollected || 0) * secondsPerOrb * 60
      + Math.min(1, (this.bossOrbCharge || 0) / Math.max(1, this.bossOrbChargeMax || 1)) * secondsPerOrb * 60;
    return {
      current: Math.min(Math.ceil(targetFrames / 60), Math.floor(currentFrames / 60)),
      target: Math.ceil(targetFrames / 60),
      suffix: 's',
      rawCurrent: currentFrames,
      rawTarget: targetFrames
    };
  }

  renderSpawnHouse(ctx, cam) {
    // Small tent at spawn point
    let tentX, tentGroundY;
    if (this.levelType === 'tower') {
      tentX = 380; tentGroundY = 440;
    } else if (this.levelType === 'arena') {
      tentX = 130; tentGroundY = 400;
    } else if (this.levelType === 'narrow') {
      tentX = 130; tentGroundY = 380;
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
    this.ropes = [];
    this.levelHazards = [];
    this.weatherParticles = [];
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const bossType = waveDef ? waveDef.boss : 'walker';
    const theme = this.levelElement ? ELEMENT_LEVEL_THEMES[this.levelElement] : null;

    this.levelType = this.currentMapType || 'normal';
    switch (this.levelType) {
      case 'plain': this.buildPlainMap(theme); break;
      case 'wall':  this.buildWallMap(theme);  break;
      case 'lane':  this.buildLaneMap(theme);  break;
      case 'normal':
      default:      this.buildNormalMap(theme); break;
    }
  }

  _layoutRng(salt) {
    const text = (this.currentRoomId || MAP_START_ROOM_ID) + ':' + (this.currentMapType || this.levelType || 'normal') + ':' + salt;
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  _hashText(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  _roomElementTypes(roomDef) {
    if (!roomDef || !roomDef.element) return [];
    const byArea = {
      forest: ['wind', 'water'],
      mountain: ['crystal', 'steel', 'water', 'wind'],
      volcano: ['fire', 'spiky', 'steel', 'ghost'],
      castle: ['steel', 'ghost', 'spiky', 'crystal'],
      castleTop: ['ghost', 'steel', 'crystal', 'wind'],
      skies: ['lightning', 'ghost', 'wind', 'crystal'],
    };
    const pool = (byArea[roomDef.area] || ENEMY_ELEMENTS).filter(el => el !== roomDef.element);
    const elements = [roomDef.element];
    if (pool.length && (this._hashText(roomDef.id + ':second-element') % 3) !== 0) {
      elements.push(pool[this._hashText(roomDef.id + ':element-pick') % pool.length]);
    }
    return elements.slice(0, 2);
  }

  _procHelpers(theme, width, groundY) {
    this.levelW = width;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor : '#555';
    const c2 = theme ? theme.platformColor : '#666';
    const c3 = theme ? theme.platformColorAlt : '#777';
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c));
    const TP = (x, y, w) => {
      const p = new Platform(Math.round(x), Math.round(y), Math.round(w), 6, c3 || '#997');
      p.thin = true;
      this.platforms.push(p);
    };
    const R = (x, y, h) => this.ropes.push(new Rope(Math.round(x), Math.round(y), Math.round(h)));
    P(0, groundY, width, 540 - groundY, c1);
    P(-32, 0, 32, 540, '#444');
    P(width, 0, 32, 540, '#444');
    return { P, TP, R, c1, c2, c3, groundY };
  }

  buildNormalMap(theme) {
    const rng = this._layoutRng('normal');
    const width = 2400 + Math.floor(rng() * 700);
    const { P, TP, c1, c2, c3, groundY } = this._procHelpers(theme, width, 480);
    const lanes = [385, 335, 285, 235, 185];
    const thinCount = 12 + Math.floor(rng() * 7);
    for (let i = 0; i < thinCount; i++) {
      const x = 120 + i * ((width - 300) / thinCount) + (rng() * 90 - 45);
      const y = lanes[Math.floor(rng() * lanes.length)];
      const w = 80 + Math.floor(rng() * 70);
      TP(Math.max(70, Math.min(width - 180, x)), y, w);
    }
    const wallCount = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < wallCount; i++) {
      const x = 260 + i * ((width - 520) / Math.max(1, wallCount - 1)) + (rng() * 140 - 70);
      const h = 70 + Math.floor(rng() * 130);
      const y = groundY - h;
      P(Math.max(120, Math.min(width - 160, x)), y, 18 + Math.floor(rng() * 12), h, rng() < 0.45 ? c1 : c2);
    }
    const lowCount = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < lowCount; i++) {
      const x = 180 + rng() * (width - 420);
      const y = 390 + Math.floor(rng() * 38);
      P(x, y, 90 + rng() * 90, 14, c2);
    }
  }

  buildPlainMap(theme) {
    const rng = this._layoutRng('plain');
    const width = 2400 + Math.floor(rng() * 800);
    const { P, R, c2, groundY } = this._procHelpers(theme, width, 480);
    const platformCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < platformCount; i++) {
      const x = 320 + i * ((width - 680) / Math.max(1, platformCount - 1)) + (rng() * 140 - 70);
      P(Math.max(160, Math.min(width - 260, x)), 405 + Math.floor(rng() * 36), 120 + Math.floor(rng() * 90), 14, c2);
    }
    const ropeCount = 6 + Math.floor(rng() * 5);
    for (let i = 0; i < ropeCount; i++) {
      const x = 190 + i * ((width - 380) / Math.max(1, ropeCount - 1)) + (rng() * 80 - 40);
      const h = 190 + Math.floor(rng() * 135);
      R(Math.max(90, Math.min(width - 110, x)), 0, Math.min(h, groundY - 105));
    }
  }

  buildWallMap(theme) {
    const rng = this._layoutRng('wall');
    const width = 1900 + Math.floor(rng() * 500);
    const { P, c1, c2, groundY } = this._procHelpers(theme, width, 480);
    const wallCount = 6 + Math.floor(rng() * 4);
    for (let i = 0; i < wallCount; i++) {
      const x = 220 + i * ((width - 440) / Math.max(1, wallCount - 1)) + (rng() * 70 - 35);
      const h = 150 + Math.floor(rng() * 230);
      const w = 18 + Math.floor(rng() * 18);
      P(Math.max(120, Math.min(width - 150, x)), groundY - h, w, h, rng() < 0.5 ? c1 : c2);
    }
  }

  buildLaneMap(theme) {
    const rng = this._layoutRng('lane');
    const width = 2300 + Math.floor(rng() * 700);
    const { P, c2, c3 } = this._procHelpers(theme, width, 480);
    const laneCount = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < laneCount; i++) {
      const y = 405 - i * (54 + Math.floor(rng() * 18));
      const segments = 2 + Math.floor(rng() * 2);
      for (let s = 0; s < segments; s++) {
        const laneW = width / segments;
        const x = s * laneW + 120 + rng() * 90;
        const w = laneW - 220 - rng() * 120;
        if (w > 220) P(x, y, w, 22 + Math.floor(rng() * 10), i % 2 === 0 ? c2 : c3);
      }
    }
  }

  buildCubicle(theme) {
    this.levelW = 980;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor : '#555';
    const c2 = theme ? theme.platformColor : '#666';
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const R = (x, y, h) => this.ropes.push(new Rope(x, y, h));

    P(0, 470, this.levelW, 70, c1);
    P(-32, 0, 32, 540, '#333');
    P(this.levelW, 0, 32, 540, '#333');
    P(0, -28, this.levelW, 28, '#2a2a2a');

    // A few low cover blocks, but no vertical maze.
    P(220, 410, 80, 16, c2);
    P(680, 410, 80, 16, c2);
    P(450, 350, 90, 16, c2);
    R(485, 28, 210);
  }

  buildOpenArea(theme) {
    this.levelW = 2600;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor : '#555';
    const c2 = theme ? theme.platformColor : '#666';
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const R = (x, y, h) => this.ropes.push(new Rope(x, y, h));

    P(0, 480, this.levelW, 60, c1);
    P(-32, 0, 32, 540, '#444');
    P(this.levelW, 0, 32, 540, '#444');

    // Sparse landmarks only, so combat stays mostly horizontal.
    P(650, 430, 140, 14, c2);
    P(1460, 430, 140, 14, c2);
    P(2130, 430, 140, 14, c2);
    R(760, 0, 300);
    R(1570, 0, 300);
    R(2240, 0, 300);
  }

  buildOpen(theme) {
    this.levelW = 3200;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor  : '#555';
    const c2 = theme ? theme.platformColor    : '#666';
    const c3 = theme ? theme.platformColorAlt : '#777';
    const c4 = (theme && theme.platformColorAlt) ? theme.platformColor : '#888';
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x, y, w, 6, theme ? theme.platformColorAlt : '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x, y, w));
    const R = (x, y, h) => this.ropes.push(new Rope(x, y, h));

    // Ground
    P(0, 480, 3200, 60, c1);

    // Lower platforms
    P(200, 400, 160, 16, c2);
    P(450, 360, 120, 16, c2);
    P(650, 320, 140, 16, c2);
    P(900, 380, 120, 16, c2);
    P(1100, 340, 160, 16, c2);

    // Mid platforms
    P(300, 260, 120, 16, c3);
    P(550, 220, 100, 16, c3);
    P(780, 180, 140, 16, c3);
    P(1050, 240, 140, 16, c3);
    P(1300, 200, 120, 16, c3);

    // High platforms
    P(400, 140, 100, 16, c4);
    P(700, 100, 140, 16, c4);
    P(1000, 130, 120, 16, c4);

    // Extended area
    P(1500, 420, 200, 16, c2);
    P(1750, 360, 160, 16, c2);
    P(1950, 300, 140, 16, c2);
    P(2150, 380, 120, 16, c2);
    P(2350, 320, 180, 16, c2);
    P(2600, 400, 200, 16, c2);
    P(2850, 350, 160, 16, c2);

    // L-shaped platforms
    P(150, 440, 80, 16, c3); P(150, 380, 16, 60, c3);
    P(830, 260, 16, 70, c3); P(830, 260, 90, 16, c3);
    P(1400, 370, 80, 16, c3); P(1464, 310, 16, 60, c3);
    P(2050, 240, 16, 70, c3); P(2050, 240, 90, 16, c3);
    P(2750, 280, 80, 16, c3); P(2750, 280, 16, 70, c3);

    // Vertical walls
    P(580, 380, 16, 100, c1);
    P(1200, 300, 16, 180, c1);
    P(1850, 350, 16, 130, c1);
    P(2500, 280, 16, 200, c1);

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
    R(615, 0, 170);
    R(1245, 0, 210);
    R(1885, 0, 190);
    R(2535, 0, 230);

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

  buildArena(theme) {
    this.levelW = 1200;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor  : '#555';
    const c2 = theme ? theme.platformColor    : '#666';
    const c3 = theme ? theme.platformColorAlt : '#777';
    const c4 = (theme && theme.platformColorAlt) ? theme.platformColor : '#888';
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x, y, w, 6, theme ? theme.platformColorAlt : '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x, y, w));
    const R = (x, y, h) => this.ropes.push(new Rope(x, y, h));

    // Ground
    P(0, 480, 1200, 60, c1);

    // Side walls
    P(-32, 0, 32, 540, '#444');
    P(1200, 0, 32, 540, '#444');

    // Layer 1 — lower platforms
    P(80, 400, 200, 16, c2);
    P(500, 400, 200, 16, c2);
    P(920, 400, 200, 16, c2);

    // Layer 2 — mid platforms
    P(200, 310, 180, 16, c3);
    P(510, 310, 180, 16, c3);
    P(820, 310, 180, 16, c3);

    // Layer 3 — top platforms
    P(350, 220, 160, 16, c4);
    P(690, 220, 160, 16, c4);

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
    R(390, 0, 210);
    R(770, 0, 210);

    // Spikes
    S(300, 468, 48);
    S(550, 468, 48);
    S(850, 468, 48);
    S(400, 304, 36);
    S(720, 304, 36);
  }

  buildNarrow(theme) {
    // Narrow horizontal corridor — good for shield boss fights
    this.levelW = 2000;
    this.levelH = 540;
    const c1 = theme ? theme.groundColor     : '#555';
    const c2 = theme ? theme.platformColor   : '#666';
    const c3 = theme ? theme.platformColorAlt: '#777';
    const P  = (x, y, w, h, c) => this.platforms.push(new Platform(x, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x, y, w, 6, theme ? theme.platformColorAlt : '#997'); p.thin = true; this.platforms.push(p); };
    const S  = (x, y, w) => this.spikes.push(new Spike(x, y, w));
    const R = (x, y, h) => this.ropes.push(new Rope(x, y, h));

    // Ground
    P(0, 440, 2000, 100, c1);

    // Mid-level platforms (one level up — shield fights need horizontal space)
    P(100, 320, 180, 16, c2);
    P(380, 300, 160, 16, c2);
    P(660, 320, 200, 16, c2);
    P(960, 300, 160, 16, c2);
    P(1240, 320, 180, 16, c2);
    P(1520, 300, 160, 16, c2);
    P(1750, 320, 160, 16, c2);

    // High platforms (sparse — sniping positions, flanks)
    P(250, 200, 120, 16, c3);
    P(540, 180, 100, 16, c3);
    P(840, 200, 130, 16, c3);
    P(1120, 180, 110, 16, c3);
    P(1400, 200, 120, 16, c3);
    P(1660, 180, 140, 16, c3);

    // Thin passable platforms
    TP(170, 365, 90);
    TP(450, 350, 80);
    TP(730, 365, 90);
    TP(1030, 350, 80);
    TP(1310, 365, 90);
    TP(1590, 350, 80);
    R(510, 0, 230);
    R(1070, 0, 220);
    R(1630, 0, 230);

    // Low shield-cover walls (good for tactical play against shield boss)
    P(320, 384, 16, 56, c1);
    P(600, 384, 16, 56, c1);
    P(880, 384, 16, 56, c1);
    P(1160, 384, 16, 56, c1);
    P(1440, 384, 16, 56, c1);

    // Spikes in pits
    S(440, 428, 48);
    S(940, 428, 48);
    S(1440, 428, 48);

    // Boundary walls
    P(-32, 0, 32, 540, '#444');
    P(2000, 0, 32, 540, '#444');

    // Mark shield-boss platforms as slippery for ice/crystal levels
    if (this.levelElement === 'crystal' || this.levelElement === 'water') {
      for (const p of this.platforms) {
        if (!p.thin && p.y < 440) p.slippery = true;
      }
    }
  }

  // ── Boss Preview Sprite (for path choice cards) ──
  _drawBossPreview(ctx, bossType, element, cx, cy) {
    ctx.save();
    const baseColors = {
      walker: '#c33', shooter: '#cc5', jumper: '#c8c', bouncer: '#c5c',
      shielded: '#5cc', deflector: '#88a', protector: '#4a6',
      attacker: '#a44', flyer: '#8c5', flyshooter: '#c85',
    };
    const bodyColor = (element && ELEMENT_COLORS[element]) ? ELEMENT_COLORS[element].body : (baseColors[bossType] || '#c33');
    const accentColor = (element && ELEMENT_COLORS[element]) ? ELEMENT_COLORS[element].accent : '#fff';
    const glowColor = (element && ELEMENT_COLORS[element]) ? ELEMENT_COLORS[element].glow : bodyColor;

    // Elemental aura behind sprite
    if (element) {
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = bodyColor;

    switch (bossType) {
      case 'walker': {
        // Chunky block with yellow border
        ctx.fillRect(cx - 22, cy - 26, 44, 52);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 22, cy - 26, 44, 52);
        // Eyes (right side)
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 4, cy - 18, 10, 10);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 8, cy - 15, 5, 6);
        break;
      }
      case 'shooter': {
        ctx.fillRect(cx - 18, cy - 20, 36, 40);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 18, cy - 20, 36, 40);
        // Barrel
        ctx.fillStyle = '#cc5'; ctx.fillRect(cx + 18, cy - 4, 16, 7);
        ctx.fillStyle = '#aa3'; ctx.fillRect(cx + 30, cy - 5, 4, 9); // muzzle
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 14, 9, 9);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 11, 5, 5);
        break;
      }
      case 'jumper': {
        ctx.fillRect(cx - 16, cy - 18, 32, 36);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 16, cy - 18, 32, 36);
        // Spring feet
        ctx.fillStyle = '#ff0';
        ctx.fillRect(cx - 12, cy + 18, 8, 6);
        ctx.fillRect(cx + 4, cy + 18, 8, 6);
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 12, 8, 8);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 9, 4, 5);
        break;
      }
      case 'flyer': {
        ctx.fillRect(cx - 16, cy - 18, 32, 36);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 16, cy - 18, 32, 36);
        // Wings
        ctx.fillStyle = '#bdb';
        ctx.fillRect(cx - 30, cy - 8, 14, 20);
        ctx.fillRect(cx + 16, cy - 8, 14, 20);
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 12, 8, 8);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 9, 4, 5);
        break;
      }
      case 'deflector': {
        ctx.fillRect(cx - 16, cy - 18, 32, 36);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 16, cy - 18, 32, 36);
        // Kasa hat
        ctx.fillStyle = '#aac';
        ctx.beginPath(); ctx.moveTo(cx - 24, cy - 18); ctx.lineTo(cx, cy - 40); ctx.lineTo(cx + 24, cy - 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#889'; ctx.fillRect(cx - 24, cy - 22, 48, 5); // brim
        // Katana (diagonal)
        ctx.save();
        ctx.translate(cx + 16, cy - 4);
        ctx.rotate(-0.6);
        ctx.fillStyle = '#dde'; ctx.fillRect(0, -2, 28, 4);
        ctx.fillStyle = '#aa8'; ctx.fillRect(-4, -4, 5, 8); // guard
        ctx.restore();
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 12, 8, 8);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 9, 4, 5);
        break;
      }
      case 'bouncer': {
        ctx.fillRect(cx - 18, cy - 20, 36, 40);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 18, cy - 20, 36, 40);
        // Cannon barrel (angled up-right)
        ctx.save();
        ctx.translate(cx + 18, cy - 2);
        ctx.rotate(-0.7);
        ctx.fillStyle = '#555'; ctx.fillRect(0, -4, 22, 8);
        ctx.fillStyle = accentColor; ctx.fillRect(19, -5, 4, 10); // muzzle
        ctx.restore();
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 14, 9, 9);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 11, 5, 5);
        break;
      }
      case 'shielded': {
        ctx.fillRect(cx - 16, cy - 18, 32, 36);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 16, cy - 18, 32, 36);
        // Floating shield (right side)
        ctx.fillStyle = 'rgba(100,220,255,0.8)';
        ctx.fillRect(cx + 20, cy - 22, 7, 44);
        ctx.strokeStyle = '#aff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 20, cy - 22, 7, 44);
        // Headband
        ctx.fillStyle = '#5a8'; ctx.fillRect(cx - 14, cy - 18, 28, 4);
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 12, 8, 8);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 9, 4, 5);
        break;
      }
      case 'protector': {
        // Armored body (wider)
        ctx.fillRect(cx - 20, cy - 24, 40, 48);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 20, cy - 24, 40, 48);
        // Helmet
        ctx.fillStyle = '#5a7'; ctx.fillRect(cx - 22, cy - 30, 44, 12);
        // Tower shield (right side, wider)
        ctx.fillStyle = '#3b7'; ctx.fillRect(cx + 24, cy - 28, 12, 56);
        ctx.strokeStyle = '#2a5'; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 24, cy - 28, 12, 56);
        // Shield emblem cross
        ctx.fillStyle = '#8d8';
        ctx.fillRect(cx + 28, cy - 10, 4, 20);
        ctx.fillRect(cx + 24, cy - 2, 12, 4);
        // Glowing visor
        ctx.fillStyle = '#4f8'; ctx.fillRect(cx - 10, cy - 24, 20, 5);
        // Aura hint
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#4f8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'attacker': {
        // Orb body
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor; ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#f44';
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Inner eye
        ctx.fillStyle = '#866';
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        // Crown horns
        ctx.fillStyle = '#ff0';
        ctx.fillRect(cx - 18, cy - 30, 6, 10);
        ctx.fillRect(cx - 3, cy - 34, 6, 14);
        ctx.fillRect(cx + 12, cy - 30, 6, 10);
        break;
      }
      case 'flyshooter': {
        ctx.fillRect(cx - 18, cy - 20, 36, 40);
        ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 18, cy - 20, 36, 40);
        // Wings
        ctx.fillStyle = '#dba';
        ctx.fillRect(cx - 32, cy - 10, 14, 22);
        ctx.fillRect(cx + 18, cy - 10, 14, 22);
        // Barrel (right)
        ctx.fillStyle = '#fa4'; ctx.fillRect(cx + 18, cy - 3, 14, 6);
        ctx.fillStyle = '#fc6'; ctx.fillRect(cx + 29, cy - 4, 3, 8);
        // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(cx + 2, cy - 14, 9, 9);
        ctx.fillStyle = '#200'; ctx.fillRect(cx + 5, cy - 11, 5, 5);
        break;
      }
    }

    // Element pip above head
    if (element && ELEMENT_COLORS[element]) {
      const pipY = cy - 44;
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(cx, pipY - 5);
      ctx.lineTo(cx + 4, pipY);
      ctx.lineTo(cx, pipY + 5);
      ctx.lineTo(cx - 4, pipY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Weather System ──
  _updateWeather() {
    if (!this.levelElement) { this.weatherParticles.length = 0; this.weatherFogCount = 0; return; }
    const theme = ELEMENT_LEVEL_THEMES[this.levelElement];
    if (!theme || !theme.weather) { this.weatherParticles.length = 0; this.weatherFogCount = 0; return; }
    const weather = theme.weather;
    this.weatherTimer = (this.weatherTimer || 0) + 1;
    // Spawn new particles
    const spawnRate = weather === 'rain' ? 4 : (weather === 'storm' ? 6 : (weather === 'snow' ? 2 : (weather === 'embers' ? 3 : (weather === 'fog' ? 6 : 2))));
    if (this.weatherTimer % spawnRate === 0) {
      const cam = this.camera;
      const px = cam.x + Math.random() * CANVAS_W;
      const py = cam.y - 10;
      if (weather === 'rain') {
        this.weatherParticles.push({ x: px, y: py, vx: -0.5, vy: 12 + Math.random() * 4, life: 80, maxLife: 80, type: 'rain' });
      } else if (weather === 'storm') {
        this.weatherParticles.push({ x: px, y: py, vx: -1 + Math.random() * 2, vy: 15 + Math.random() * 5, life: 60, maxLife: 60, type: 'storm' });
      } else if (weather === 'snow') {
        this.weatherParticles.push({ x: px, y: py, vx: -0.8 + Math.random() * 1.6, vy: 1.5 + Math.random() * 2, life: 200, maxLife: 200, type: 'snow' });
      } else if (weather === 'embers') {
        this.weatherParticles.push({ x: cam.x + Math.random() * CANVAS_W, y: cam.y + CANVAS_H - 60, vx: -0.5 + Math.random(), vy: -(2 + Math.random() * 3), life: 120, maxLife: 120, type: 'embers', color: Math.random() < 0.5 ? '#ff6622' : '#ff9900' });
      } else if (weather === 'fog') {
        if ((this.weatherFogCount || 0) < 18) {
          this.weatherParticles.push({ x: px, y: cam.y + 200 + Math.random() * 200, vx: 0.3 + Math.random() * 0.5, vy: 0, life: 160, maxLife: 160, type: 'fog' });
        }
      } else if (weather === 'leaves') {
        this.weatherParticles.push({ x: px, y: py, vx: 1 + Math.random() * 2, vy: 2 + Math.random() * 2, life: 180, maxLife: 180, type: 'leaves', rot: Math.random() * Math.PI * 2 });
      }
    }
    let write = 0;
    const maxY = this.camera.y + CANVAS_H + 20;
    for (let read = 0; read < this.weatherParticles.length; read++) {
      const p = this.weatherParticles[read];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.type === 'leaves' && p.rot !== undefined) {
        p.rot += 0.05;
        p.vx += Math.sin(this.weatherTimer * 0.03) * 0.05;
      }
      if (p.life > 0 && p.y < maxY) this.weatherParticles[write++] = p;
    }
    this.weatherParticles.length = write;
    if (this.weatherParticles.length > GAME_OBJECT_LIMITS.weatherParticles) {
      this.weatherParticles.splice(0, this.weatherParticles.length - GAME_OBJECT_LIMITS.weatherParticles);
    }
    this.weatherFogCount = 0;
    for (const p of this.weatherParticles) {
      if (p.type === 'fog') this.weatherFogCount++;
    }
  }

  _renderWeather(ctx, cam, bgOnly = false) {
    if (!this.weatherParticles || this.weatherParticles.length === 0) return;
    ctx.save();
    for (const p of this.weatherParticles) {
      const isFog = p.type === 'fog';
      if (bgOnly && !isFog) continue;
      if (!bgOnly && isFog) continue;
      const sx = p.x - cam.x, sy = p.y - cam.y;
      if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      if (p.type === 'rain' || p.type === 'storm') {
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = p.type === 'storm' ? '#8888cc' : '#8899cc';
        ctx.lineWidth = p.type === 'storm' ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.vx * 3, sy - 10);
        ctx.stroke();
      } else if (p.type === 'snow') {
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#cce8ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + Math.sin(p.life * 0.1), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'embers') {
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color || '#ff6622';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fog') {
        ctx.globalAlpha = Math.min(0.08, alpha * 0.08);
        ctx.fillStyle = '#6644aa';
        ctx.beginPath();
        ctx.arc(sx, sy, 40, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'leaves') {
        ctx.globalAlpha = alpha * 0.75;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = '#88aa44';
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Hazard System ──
  _updateHazards() {
    if (!this.levelElement) { this.levelHazards.length = 0; return; }
    const theme = ELEMENT_LEVEL_THEMES[this.levelElement];
    if (!theme || !theme.hazard) { this.levelHazards.length = 0; return; }
    this.hazardTimer = (this.hazardTimer || 0) + 1;
    const hazardType = theme.hazard;
    const pl = this.player;
    // Spawn new hazards periodically
    const spawnInterval = hazardType === 'thunder' ? 240 : (hazardType === 'rockfall' ? 180 : (hazardType === 'icicle' ? 200 : 0));
    if (spawnInterval > 0 && this.hazardTimer % spawnInterval === 0 && !this.pathChoiceScreen && !this.orbBucketChoice) {
      const spawnX = this.camera.x + 80 + Math.random() * (CANVAS_W - 160);
      if (hazardType === 'thunder') {
        // Warning first, then strike
        this.levelHazards.push({ type: 'thunder', x: spawnX, y: this.levelH - 80, phase: 'warn', timer: 90 });
      } else if (hazardType === 'rockfall') {
        this.levelHazards.push({ type: 'rock', x: spawnX, y: -20, vy: 2 + Math.random() * 3, r: 10 + Math.random() * 8, timer: 200 });
      } else if (hazardType === 'icicle') {
        // Find a platform to drop from
        const icicleX = this.camera.x + 80 + Math.random() * (CANVAS_W - 160);
        this.levelHazards.push({ type: 'icicle', x: icicleX, y: 0, vy: 0, phase: 'fall', timer: 120 });
      }
    }
    // Update existing hazards
    for (const h of this.levelHazards) {
      h.timer--;
      if (h.type === 'thunder') {
        if (h.phase === 'warn' && h.timer <= 0) {
          // Strike!
          h.phase = 'strike';
          h.timer = 20;
          // Damage player if in range
          const dist = Math.abs(pl.x - h.x);
          if (dist < 40 && !pl.invincibleTimer) {
            pl.hp -= 2;
            pl.invincibleTimer = 60;
          }
        }
      } else if (h.type === 'rock') {
        h.y += h.vy;
        h.vy = Math.min(h.vy + 0.15, 10);
        // Hurt player
        const dx = Math.abs(pl.x - h.x), dy = Math.abs(pl.y - h.y);
        if (dx < h.r + 12 && dy < h.r + 24 && !pl.invincibleTimer && h.timer > 0) {
          pl.hp -= 1;
          pl.invincibleTimer = 60;
        }
      } else if (h.type === 'icicle') {
        h.vy += 0.3;
        h.y += h.vy;
        const dx = Math.abs(pl.x - h.x), dy = Math.abs(pl.y - h.y);
        if (dx < 14 && dy < 24 && !pl.invincibleTimer && h.timer > 0) {
          pl.hp -= 2;
          pl.invincibleTimer = 60;
        }
      }
    }
    let write = 0;
    const maxY = this.levelH + 60;
    for (let read = 0; read < this.levelHazards.length; read++) {
      const h = this.levelHazards[read];
      if (h.timer > 0 && h.y < maxY) this.levelHazards[write++] = h;
    }
    this.levelHazards.length = write;
  }

  _renderHazards(ctx, cam) {
    if (!this.levelHazards || this.levelHazards.length === 0) return;
    ctx.save();
    for (const h of this.levelHazards) {
      const sx = h.x - cam.x, sy = h.y - cam.y;
      if (h.type === 'thunder') {
        if (h.phase === 'warn') {
          // Glow warning column
          const alpha = (1 - h.timer / 90) * 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#aa99ff';
          ctx.fillRect(sx - 20, 0, 40, CANVAS_H);
          ctx.globalAlpha = 1;
        } else if (h.phase === 'strike') {
          // Bright lightning bolt column
          ctx.globalAlpha = h.timer / 20;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#8888ff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx - 8, CANVAS_H / 3);
          ctx.lineTo(sx + 6, CANVAS_H * 0.6);
          ctx.lineTo(sx, CANVAS_H);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      } else if (h.type === 'rock') {
        ctx.globalAlpha = Math.min(1, h.timer / 30);
        ctx.fillStyle = '#886644';
        ctx.beginPath();
        ctx.arc(sx, sy, h.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#554422';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (h.type === 'icicle') {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy);
        ctx.lineTo(sx + 8, sy);
        ctx.lineTo(sx, sy + 28);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  buildTower() {
    this.levelW = 960;
    this.levelH = 1200;
    const ox = 80; // center offset — tower is 800px wide in 960px canvas
    const P = (x, y, w, h, c) => this.platforms.push(new Platform(x + ox, y, w, h, c));
    const TP = (x, y, w) => { const p = new Platform(x + ox, y, w, 6, '#997'); p.thin = true; this.platforms.push(p); };
    const S = (x, y, w) => this.spikes.push(new Spike(x + ox, y, w));
    const R = (x, y, h) => this.ropes.push(new Rope(x + ox, y, h));

    // Side walls (full height)
    P(-32, -660, 32, 1900, '#444');
    P(800, -660, 32, 1900, '#444');

    // Bottom: spikes instead of ground
    S(0, 500, 800);

    // Starting platform at bottom
    P(200, 440, 250, 16, '#666');

    // Ascending — sparse platforms with gaps to fall through
    // Floor 1 — left only
    P(50, 370, 130, 16, '#666');
    TP(550, 390, 90);

    // Floor 2 — right only with wall ledge
    P(550, 310, 140, 16, '#777');
    P(704, 270, 16, 60, '#686');

    // Vertical wall — left side divider
    P(180, 320, 16, 70, '#585');

    // Floor 3 — center narrow
    P(300, 250, 120, 16, '#777');

    // Floor 4 — left with L
    P(50, 190, 130, 16, '#888');
    P(50, 150, 16, 60, '#686');
    TP(450, 200, 80);

    // Vertical wall — right side divider
    P(600, 170, 16, 80, '#585');

    // Floor 5 — right only
    P(580, 130, 130, 16, '#777');

    // Floor 6 — center narrow + gap
    P(200, 60, 110, 16, '#888');
    TP(550, 70, 80);

    // Vertical wall — center pillar
    P(390, 20, 16, 70, '#585');

    // Floor 7 — left with wall climb
    P(80, -10, 120, 16, '#777');
    P(650, -20, 70, 16, '#686');
    P(704, -20, 16, 50, '#686');

    // Vertical wall — left barrier
    P(220, -60, 16, 70, '#585');

    // Floor 8 — center
    P(320, -80, 130, 16, '#888');
    R(455, -240, 150);

    // Floor 9 — right only
    P(550, -150, 120, 16, '#777');
    TP(150, -140, 80);

    // Vertical wall — right barrier
    P(500, -190, 16, 60, '#585');

    // Floor 10 — left
    P(80, -220, 130, 16, '#888');
    R(240, -380, 155);

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

  // ── Wave Objective Init ────────────────────────────────────
  _matchesHuntFilter(enemy, filter) {
    if (!filter) return false;
    if (filter.enemyType && enemy.type !== filter.enemyType) return false;
    if (filter.big && !enemy.big) return false;
    if (filter.element && enemy.element !== filter.element) return false;
    if (filter.miniboss && !(enemy.type === 'deflector' || enemy.type === 'protector' || enemy.type === 'attacker')) return false;
    return true;
  }

  _spawnHuntTarget(filter) {
    if (!filter) return;
    const typeToSpawn = filter.enemyType || 'walker';
    const isBig = !!filter.big;
    const side = Math.random() < 0.5 ? -1 : 1;
    const spawnDist = this.levelW < 1000 ? randInt(150, 300) : randInt(350, 550);
    let x = this.player.x + side * spawnDist;
    let y = -40;
    if (this.levelType === 'tower') y = Math.min(this.player.y - 100, 200);
    const xMin = this.levelType === 'tower' ? 120 : 40;
    const xMax = this.levelType === 'tower' ? 840 : this.levelW - 60;
    x = Math.max(xMin, Math.min(xMax, x));
    const e = new Enemy(x, y, typeToSpawn, isBig, 1, this._roomPowerLevel());
    if (filter.element) {
      e.element = filter.element;
      e.elementColors = ELEMENT_COLORS[filter.element];
      e.color = e.elementColors.body;
    }
    e.isHuntTarget = true; // flag for rendering marker
    this.enemies.push(e);
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, '#ff0', 6, 3, 10));
  }

  _initObjective() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const roomDef = MAP_ROOM_BY_ID[this.currentRoomId];
    if (roomDef) {
      const cached = this._getRoomConfig(roomDef.id);
      this.currentObjective = cached.objective || roomDef.objective || {
        type: 'kills',
        label: 'Defeat Enemies',
        desc: 'Defeat enemies to fill the objective bar and draw out the boss.',
        icon: ''
      };
      this.pendingObjective = null;
      this.objZone = null;
      this.samurai = null;
      const obj = this.currentObjective;
      if (obj.type === 'zone') {
        const zW = 130, zH = 90;
        if (this.levelType === 'tower') {
          this.objZone = { x: 270, y: 360, w: zW, h: zH };
        } else if (this.levelType === 'arena') {
          this.objZone = { x: 520, y: 315, w: zW, h: zH };
        } else if (this.levelType === 'narrow') {
          this.objZone = { x: 580, y: 270, w: zW, h: zH };
        } else {
          this.objZone = { x: 1240, y: 355, w: zW, h: zH };
        }
      } else if (obj.type === 'defend') {
        const samX = this.levelType === 'tower' ? 240 : (this.levelType === 'arena' ? 200 : 300);
        const samY = this.levelType === 'tower' ? 425 : (this.levelType === 'arena' ? 340 : 330);
        const baseHp = 12 + this._roomPowerLevel(roomDef) * 4;
        this.samurai = { x: samX, y: samY, w: 18, h: 28, hp: baseHp, maxHp: baseHp, dead: false, flashTimer: 0, facing: 1 };
      } else if (obj.type === 'hunt') {
        for (const e of this.enemies) {
          if (!e.dead && this._matchesHuntFilter(e, obj.filter)) e.isHuntTarget = true;
        }
      }
      return;
    }
    // Consume a randomly pre-assigned objective if one was queued, else fall back to waveDef
    if (this.pendingObjective) {
      this.currentObjective = this.pendingObjective;
      this.pendingObjective = null;
    } else {
      this.currentObjective = (waveDef && waveDef.objective)
        ? waveDef.objective
        : { type: 'kills', label: 'Kill Enemies', desc: 'Defeat enemies to charge Boss Orbs.', icon: '⚔' };
    }
    this.objZone = null;
    this.samurai = null;
    const obj = this.currentObjective;
    if (obj.type === 'zone') {
      const zW = 130, zH = 90;
      if (this.levelType === 'tower') {
        this.objZone = { x: 270, y: 360, w: zW, h: zH };
      } else if (this.levelType === 'arena') {
        this.objZone = { x: 520, y: 315, w: zW, h: zH };
      } else if (this.levelType === 'narrow') {
        this.objZone = { x: 580, y: 270, w: zW, h: zH };
      } else {
        this.objZone = { x: 1240, y: 355, w: zW, h: zH };
      }
    } else if (obj.type === 'defend') {
      const samX = this.levelType === 'tower' ? 240 : (this.levelType === 'arena' ? 200 : 300);
      const samY = this.levelType === 'tower' ? 425 : (this.levelType === 'arena' ? 340 : 330);
      const baseHp = 12 + this.wave * 4;
      this.samurai = { x: samX, y: samY, w: 18, h: 28, hp: baseHp, maxHp: baseHp, dead: false, flashTimer: 0, facing: 1 };
    } else if (obj.type === 'hunt') {
      // Mark any already-spawned matching enemies
      for (const e of this.enemies) {
        if (!e.dead && this._matchesHuntFilter(e, obj.filter)) e.isHuntTarget = true;
      }
    }
  }

  spawnEnemy() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const roomTypes = this.currentRoomEnemyTypes && this.currentRoomEnemyTypes.length
      ? this.currentRoomEnemyTypes.slice(0, 3)
      : null;
    const spawnPool = roomTypes
      ? roomTypes.map((type, idx) => ({ type, weight: Math.max(1, 4 - idx) }))
      : waveDef.pool;
    let totalW = 0;
    for (const e of spawnPool) totalW += e.weight;
    let r = Math.random() * totalW;
    let pick = spawnPool[0];
    for (const e of spawnPool) {
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
    const e = new Enemy(x, y, pick.type, !!pick.big, 1, this._roomPowerLevel());
    // Elemental variant chance — boosted when level has a theme element
    const baseElemChance = ELEMENTAL_SPAWN_CHANCE + (this._roomPowerLevel() - 1) * 0.04;
    const allowedElements = (this.currentRoomElementTypes || []).filter(el => ELEMENT_COLORS[el]).slice(0, 2);
    const boostedChance = allowedElements.length ? Math.min(0.5, baseElemChance + 0.35) : 0;
    if (allowedElements.length && Math.random() < boostedChance) {
      // When a level element is active, bias 75% toward that element
      if (this.levelElement && allowedElements.includes(this.levelElement) && Math.random() < 0.75) {
        e.element = this.levelElement;
      } else {
        e.element = allowedElements[Math.floor(Math.random() * allowedElements.length)];
      }
      e.elementColors = ELEMENT_COLORS[e.element];
      e.color = e.elementColors.body;
    }
    if (pick.big && (pick.type === 'protector' || pick.type === 'attacker')) {
      this.spawnedMiniboss.add(pick.type);
    }
    // Mark hunt target
    const _huntObj = this.currentObjective;
    if (_huntObj && _huntObj.type === 'hunt' && this._matchesHuntFilter(e, _huntObj.filter)) {
      e.isHuntTarget = true;
    }
    this.enemies.push(e);
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, e.element ? e.elementColors.particle : '#fff', 6, 3, 10));
  }

  spawnBoss() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    let bx = Math.min(this.player.x + 300, this.levelW - 100);
    let by = this.levelType === 'tower' ? 100 : 300;
    this.boss = new Boss(bx, by, waveDef.boss, 1, this._roomPowerLevel());
    // Use forced level element if set, otherwise small random chance
    const bossAllowedElements = (this.currentRoomElementTypes || []).filter(el => ELEMENT_COLORS[el]).slice(0, 2);
    if (this.levelElement) {
      this.boss.element = this.levelElement;
      this.boss.elementColors = ELEMENT_COLORS[this.levelElement];
      this.boss.color = this.boss.elementColors.body;
    } else if (bossAllowedElements.length && Math.random() < ELEMENTAL_SPAWN_CHANCE) {
      this.boss.element = bossAllowedElements[Math.floor(Math.random() * bossAllowedElements.length)];
      this.boss.elementColors = ELEMENT_COLORS[this.boss.element];
      this.boss.color = this.boss.elementColors.body;
    }
    this.bossActive = true;
    this.bossMessage = 180;
    // ── Boss spawn dramatic effect ──
    const bCX = this.boss.x + 28, bCY = this.boss.y + 28;
    const bColor = this.boss.element ? this.boss.elementColors.particle : '#f44';
    this.effects.push(new SlamRing(bCX, bCY, bColor, 200, 24));
    this.effects.push(new SlamRing(bCX, bCY, '#fff', 120, 14));
    this.effects.push(new SlamRing(bCX, bCY, bColor, 70, 8));
    this.effects.push(new Effect(bCX, bCY, '#fff', 30, 8, 30));
    this.effects.push(new Effect(bCX, bCY, bColor, 22, 6, 25));
    this.effects.push(new Effect(bCX, bCY, '#f44', 14, 5, 20));
    triggerScreenShake(10, 20);
    triggerHitstop(12);
    SFX.bossSpawn();
    SFX.bossRoar();
    const elemTag = this.boss.element ? ` [${this.boss.element.toUpperCase()}]` : '';
    this.showWaveMessage(this.boss.name + elemTag);
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

  // ── Path Choice Generation ──
  // Generates path choice options for the next round.
  // pool: array of WAVE_DEFS indices to offer.
  // normalCount: how many of those should be 'normal' (no element).
  // ── Dynamic Boss Progression ──────────────────────────────
  // Returns the pool of WAVE_DEFS indices for the next round, or null if next
  // round is the final boss (OVERLORD, set directly by caller).
  // Mutates this.bossPool / this.mandatoryPool to track which bosses remain.
  //
  // Progression:
  //  Wave 1 → 2 : [1,2,3]  GUNNER/JUMPER/FLYER — pick 1
  //  Wave 2 → 3 : [rem 2] + [6 GUARDIAN]       — pick 1
  //  Wave 3 → 4 : [rem 2] + [5 BOUNCER]        — pick 1
  //  Wave 4 → 5 : [4,7,8] RONIN/AEGIS/NEMESIS  — mandatory, pick order
  //  Wave 5 → 6 : [rem 2 of mandatory]          — pick 1
  //  Wave 6 → 7 : [rem 1 of mandatory]          — forced single choice
  //  Wave 7 → 8 : null → OVERLORD final boss
  // -- Room Map Prototype -------------------------------------------------
  _freshMapState() {
    const unlocked = {};
    unlocked[MAP_START_ROOM_ID] = true;
    return {
      currentRoomId: MAP_START_ROOM_ID,
      unlocked,
      completed: {},
      unlockSources: {},
      itemRoomAssignments: {},
      itemRewardChoices: {},
      roomCache: {},
    };
  }

  _loadMapState() {
    try {
      const raw = localStorage.getItem(MAP_STORAGE_KEY);
      if (!raw) return this._freshMapState();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.unlocked || !parsed.roomCache) return this._freshMapState();
      if (!parsed.unlocked[MAP_START_ROOM_ID]) parsed.unlocked[MAP_START_ROOM_ID] = true;
      return {
        currentRoomId: parsed.currentRoomId || MAP_START_ROOM_ID,
        unlocked: parsed.unlocked || { [MAP_START_ROOM_ID]: true },
        completed: parsed.completed || {},
        unlockSources: parsed.unlockSources || {},
        itemRoomAssignments: parsed.itemRoomAssignments || {},
        itemRewardChoices: parsed.itemRewardChoices || {},
        roomCache: parsed.roomCache || {},
      };
    } catch (err) {
      return this._freshMapState();
    }
  }

  _saveMapState() {
    this.mapState.currentRoomId = this.currentRoomId;
    this.mapState.roomCache = this.roomCache;
    this.mapState.itemRoomAssignments = this.mapState.itemRoomAssignments || {};
    this.mapState.itemRewardChoices = this.mapState.itemRewardChoices || {};
    try {
      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(this.mapState));
    } catch (err) {
      // Local storage can fail in private mode; runtime cache still works.
    }
  }

  _getRoomConfig(roomId) {
    const roomDef = MAP_ROOM_BY_ID[roomId] || MAP_ROOM_BY_ID[MAP_START_ROOM_ID];
    if (!this.roomCache[roomDef.id]) {
      this.roomCache[roomDef.id] = {
        id: roomDef.id,
        waveIdx: roomDef.waveIdx,
        element: roomDef.element || null,
        elementTypes: this._roomElementTypes(roomDef),
        mapType: roomDef.mapType || null,
        enemyTypes: roomDef.enemyTypes ? roomDef.enemyTypes.slice() : null,
        area: roomDef.area || null,
        kind: roomDef.kind || 'stage',
        distance: roomDef.distance || 0,
        objective: roomDef.objective || null,
        createdAtTick: this.tick || 0,
      };
    }
    if (this.roomCache[roomDef.id].distance === undefined) this.roomCache[roomDef.id].distance = roomDef.distance || 0;
    if (!this.roomCache[roomDef.id].objective) this.roomCache[roomDef.id].objective = roomDef.objective || null;
    return this.roomCache[roomDef.id];
  }

  _roomDifficulty(roomDef) {
    if (!roomDef) return 1;
    const areaRank = { forest: 1, mountain: 2, volcano: 2, castle: 3, castleTop: 4, skies: 5 };
    const kindRank = { stage: 0, bridgeBoss: 1, miniBoss: 2, finalBoss: 4, trueFinal: 5 };
    return (areaRank[roomDef.area] || 1) + (kindRank[roomDef.kind] || 0) + (roomDef.element ? 1 : 0);
  }

  _roomPowerLevel(roomDef) {
    roomDef = roomDef || MAP_ROOM_BY_ID[this.currentRoomId];
    const distance = roomDef && roomDef.distance !== undefined ? roomDef.distance : 0;
    return Math.max(1, distance + 1);
  }

  _roomProgressLabel() {
    const roomDef = MAP_ROOM_BY_ID[this.currentRoomId];
    const cleared = Object.keys(this.mapState.completed || {}).length;
    const depth = this._roomPowerLevel(roomDef);
    const elemTag = this.levelElement ? ` [${this.levelElement.toUpperCase()}]` : '';
    return `Depth ${depth}${elemTag}  Cleared: ${cleared}`;
  }

  _ensureItemRoomAssignments() {
    if (this._itemRoomAssignmentsReady && this.mapState.itemRoomAssignments) return;
    const assignments = {};
    const usedRooms = new Set();
    const source = this.mapState.itemRoomAssignments || {};
    const itemIds = Object.values(BOSS_ITEM_DROPS).flat().filter(id => BOSS_ITEMS[id]);
    const validItems = new Set(itemIds);
    for (const itemId of itemIds) {
      const roomId = source[itemId];
      const room = MAP_ROOM_BY_ID[roomId];
      if (room && !usedRooms.has(roomId) && validItems.has(itemId)) {
        assignments[itemId] = roomId;
        usedRooms.add(roomId);
      }
    }

    const roomsByBoss = {};
    for (const room of MAP_ROOM_DEFS) {
      if (!roomsByBoss[room.bossType]) roomsByBoss[room.bossType] = [];
      roomsByBoss[room.bossType].push(room);
    }
    for (const bossRooms of Object.values(roomsByBoss)) {
      bossRooms.sort((a, b) => this._roomDifficulty(a) - this._roomDifficulty(b));
    }

    for (const [bossType, drops] of Object.entries(BOSS_ITEM_DROPS)) {
      const sortedDrops = drops
        .filter(itemId => BOSS_ITEMS[itemId] && !assignments[itemId])
        .sort((a, b) => ((BOSS_ITEMS[a].complexity || 1) - (BOSS_ITEMS[b].complexity || 1)));
      for (const itemId of sortedDrops) {
        const complexity = BOSS_ITEMS[itemId].complexity || 1;
        const candidates = (roomsByBoss[bossType] || MAP_ROOM_DEFS).filter(room => !usedRooms.has(room.id));
        let best = null;
        let bestScore = Infinity;
        for (const room of candidates) {
          const score = Math.abs(this._roomDifficulty(room) - complexity);
          if (score < bestScore) {
            best = room;
            bestScore = score;
          }
        }
        if (!best) best = MAP_ROOM_DEFS.find(room => !usedRooms.has(room.id));
        if (!best) continue;
        assignments[itemId] = best.id;
        usedRooms.add(best.id);
      }
    }

    this.mapState.itemRoomAssignments = assignments;
    this._itemRoomAssignmentsReady = true;
    this._roomItemByIdSource = null;
    this._roomItemByIdCache = null;
    for (const [itemId, roomId] of Object.entries(assignments)) {
      const cached = this._getRoomConfig(roomId);
      cached.itemId = itemId;
    }
    this.mapState.itemRewardChoices = this.mapState.itemRewardChoices || {};
  }

  _itemForRoom(roomId) {
    this._ensureItemRoomAssignments();
    for (const [itemId, assignedRoomId] of Object.entries(this.mapState.itemRoomAssignments || {})) {
      if (assignedRoomId === roomId) return itemId;
    }
    return null;
  }

  _itemForBossClear(roomDef) {
    if (!roomDef) return null;
    return this._itemForRoom(roomDef.id);
  }

  _grantBossItem(itemId) {
    if (!itemId || !BOSS_ITEMS[itemId]) return;
    if (!this.player.unlockedItems) this.player.unlockedItems = {};
    this.player.unlockedItems[itemId] = true;
    this.player.items[itemId] = true;
    if (itemId === 'deathsKey') this.player.deathsKeyUsed = false;
    recordItemFound(itemId);
  }

  _chooseRoomReward(roomId, choice) {
    const itemId = this._itemForRoom(roomId);
    if (!itemId || !BOSS_ITEMS[itemId]) return;
    this.mapState.itemRewardChoices = this.mapState.itemRewardChoices || {};
    this.mapState.itemRewardChoices[roomId] = choice;
    if (choice === 'item') {
      this._grantBossItem(itemId);
    } else {
      if (!this.player.unlockedItems) this.player.unlockedItems = {};
      this.player.unlockedItems[itemId] = false;
      this.player.items[itemId] = false;
    }
    this._recomputeItemAttributeBonuses();
    this._saveMapState();
  }

  _recomputeItemAttributeBonuses() {
    const pl = this.player;
    if (!pl.itemAttrBonuses) pl.itemAttrBonuses = { mind: 0, vigor: 0, dexterity: 0 };
    if (!pl._itemAttrApplied) pl._itemAttrApplied = { mind: 0, vigor: 0, dexterity: 0 };
    const prev = pl._itemAttrApplied;
    pl.bonusElemental -= prev.mind || 0;
    pl.maxMana = Math.max(1, pl.maxMana - (prev.mind || 0));
    pl.mana = Math.min(pl.mana, pl.maxMana);
    pl.bonusDamage -= prev.vigor || 0;
    pl.maxHp = Math.max(1, pl.maxHp - (prev.vigor || 0));
    pl.hp = Math.min(pl.hp, pl.maxHp);
    pl.bonusSpeed -= prev.dexterity || 0;
    pl.bonusReach -= prev.dexterity || 0;

    const next = { mind: 0, vigor: 0, dexterity: 0 };
    this._ensureItemRoomAssignments();
    for (const [roomId, choice] of Object.entries(this.mapState.itemRewardChoices || {})) {
      if (choice !== 'attr') continue;
      const itemId = this._itemForRoom(roomId);
      const attr = itemId && BOSS_ITEMS[itemId] && BOSS_ITEMS[itemId].attr;
      if (next[attr] !== undefined) next[attr]++;
    }
    pl.itemAttrBonuses = next;
    pl._itemAttrApplied = { mind: next.mind, vigor: next.vigor, dexterity: next.dexterity };
    pl.bonusElemental += next.mind;
    pl.maxMana += next.mind;
    pl.mana = Math.min(pl.maxMana, pl.mana + Math.max(0, next.mind - (prev.mind || 0)));
    pl.bonusDamage += next.vigor;
    pl.maxHp += next.vigor;
    pl.hp = Math.min(pl.maxHp, pl.hp + Math.max(0, next.vigor - (prev.vigor || 0)));
    pl.displayHp = Math.min(pl.maxHp, pl.displayHp || pl.hp);
    pl.bonusSpeed += next.dexterity;
    pl.bonusReach += next.dexterity;
  }

  _enterMapRoom(roomId, opts) {
    opts = opts || {};
    const roomDef = MAP_ROOM_BY_ID[roomId] || MAP_ROOM_BY_ID[MAP_START_ROOM_ID];
    const cached = this._getRoomConfig(roomDef.id);
    this.currentRoomId = roomDef.id;
    this.mapState.currentRoomId = roomDef.id;
    this.currentWaveDefIdx = cached.waveIdx;
    this.levelElement = cached.element;
    this.currentRoomElementTypes = cached.elementTypes || this._roomElementTypes(roomDef);
    this.currentMapType = cached.mapType || roomDef.mapType || null;
    this.currentRoomEnemyTypes = cached.enemyTypes || roomDef.enemyTypes || null;
    this.currentRoomArea = cached.area || roomDef.area || null;
    this.currentRoomKind = cached.kind || roomDef.kind || 'stage';
    this.pendingObjective = null;
    this.wave = this._roomPowerLevel(roomDef);
    this._saveMapState();
    if (!opts.keepPlayer) this._prepareRoomStart();
  }

  _prepareRoomStart() {
    this.lives = 1;
    this.waveKills = 0;
    this.objectiveKills = 0;
    this.bossOrbsRequired = Math.min(5, 2 + Math.floor((this.wave - 1) / 2));
    this.bossOrbCharge = 0;
    this.bossOrbCooldown = 0;
    this.bossOrbsCollected = 0;
    this.bossOrbPickups = [];
    this.spawnedMiniboss = new Set();
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.bubbleShieldPickups = [];
    this.enemies = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.fireTrails = [];
    const oldLevelType = this.levelType;
    this.buildLevel();
    this._initObjective();
    this.player.x = this.levelType === 'tower' ? 380 : 100;
    this.player.y = this.levelType === 'tower' ? 400 : 300;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.attackCharges = this.player.actionChargeMax || 3;
    this.player.specialCharges = this.player.actionChargeMax || 3;
    this.player.attackRechargeTimer = 0;
    this.player.specialRechargeTimer = 0;
    this.player.attackFocus = 1;
    this.player._attackDamageMult = 1;
    this.camera.x = 0;
    this.camera.y = 0;
    this.spawnTimer = -120;
    this.transitionTimer = oldLevelType === this.levelType ? 45 : 90;
    this.player.invincibleTimer = Math.max(this.player.invincibleTimer, 120);
    SFX.wave();
  }

  _retryCurrentRoom() {
    this.gameOverDelay = 0;
    this.gameOver = false;
    this.killerInfo = null;
    this.lives = 1;
    this._openCurrentMap(30);
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.enemies = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.fireTrails = [];
    this.player.hp = this.player.maxHp;
    this.player.displayHp = this.player.hp;
    this.player.deathTimer = 0;
    this.player.x = this.levelType === 'tower' ? 380 : 100;
    this.player.y = this.levelType === 'tower' ? 400 : 300;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.statusBurn = 0;
    this.player.statusFreeze = 0;
    this.player.statusFloat = 0;
    this.player.statusParalyse = 0;
    this.player.statusStun = 0;
    this.player.statusCurse = 0;
    this.player.statusBleed = 0;
  }

  _openCurrentMap(delay) {
    this.mapScreen = {
      selected: Math.max(0, this._defaultMapSelection([])),
      recentUnlocks: [],
      completedRoomId: null,
      zoom: this.mapZoom || 1,
      delay: delay === undefined ? 30 : delay,
    };
    this.waveMessage = '';
    this.waveMessageTimer = 0;
  }

  _unlockMapRoom(roomId, sourceRoomId, reason, recentUnlocks) {
    const roomDef = MAP_ROOM_BY_ID[roomId];
    if (!roomDef) return;
    if (!this.mapState.unlockSources[roomId]) this.mapState.unlockSources[roomId] = [];
    this.mapState.unlockSources[roomId].push({ from: sourceRoomId, reason });
    if (!this.mapState.unlocked[roomId]) {
      this.mapState.unlocked[roomId] = true;
      recentUnlocks.push(roomId);
      this._getRoomConfig(roomId);
    }
  }

  _roomSecondaryComplete(roomDef) {
    if (!roomDef || !roomDef.secondary) return false;
    if (roomDef.secondary.type === 'kills') return this.waveKills >= roomDef.secondary.count;
    return false;
  }

  _completeCurrentMapRoom() {
    const roomDef = MAP_ROOM_BY_ID[this.currentRoomId] || MAP_ROOM_BY_ID[MAP_START_ROOM_ID];
    const recentUnlocks = [];
    const previousClear = this.mapState.completed[roomDef.id] || null;
    const rewardItem = this._itemForBossClear(roomDef);
    const secondaryDone = this._roomSecondaryComplete(roomDef) || !!(previousClear && previousClear.secondaryDone);
    this.mapState.completed[roomDef.id] = {
      waveIdx: roomDef.waveIdx,
      element: roomDef.element || null,
      kills: Math.max(this.waveKills, previousClear ? previousClear.kills || 0 : 0),
      secondaryDone,
    };
    this.player.defeatedBossTypes.add(roomDef.bossType);
    if (rewardItem) {
      const previousChoice = this.mapState.itemRewardChoices && this.mapState.itemRewardChoices[roomDef.id];
      this.itemRewardScreen = {
        itemId: rewardItem,
        bossType: roomDef.bossType,
        roomId: roomDef.id,
        selected: previousChoice === 'attr' ? 1 : 0,
        delay: 30
      };
    }
    for (const id of roomDef.navLinks || roomDef.unlockOnPrimary || []) {
      this._unlockMapRoom(id, roomDef.id, 'primary', recentUnlocks);
    }
    if (secondaryDone) {
      for (const id of roomDef.unlockOnSecondary || []) {
        this._unlockMapRoom(id, roomDef.id, 'secondary', recentUnlocks);
      }
    }
    this._saveMapState();
    this.mapScreen = {
      selected: Math.max(0, MAP_ROOM_DEFS.findIndex(r => r.id === roomDef.id)),
      recentUnlocks,
      completedRoomId: roomDef.id,
      zoom: this.mapZoom || (this.mapScreen && this.mapScreen.zoom) || 1,
      delay: 45,
    };
    this.boss = null;
    this.bossActive = false;
    this.enemies = [];
    this.projectiles = [];
    this.hitLines = [];
  }

  _defaultMapSelection(recentUnlocks) {
    if (recentUnlocks && recentUnlocks.length) {
      const recentIdx = MAP_ROOM_DEFS.findIndex(r => r.id === recentUnlocks[0]);
      if (recentIdx >= 0) return recentIdx;
    }
    const nextFresh = MAP_ROOM_DEFS.find(r => this.mapState.unlocked[r.id] && !this.mapState.completed[r.id]);
    if (nextFresh) return MAP_ROOM_DEFS.findIndex(r => r.id === nextFresh.id);
    const nextUnlocked = MAP_ROOM_DEFS.find(r => this.mapState.unlocked[r.id]);
    if (nextUnlocked) return MAP_ROOM_DEFS.findIndex(r => r.id === nextUnlocked.id);
    return MAP_ROOM_DEFS.findIndex(r => r.id === this.currentRoomId);
  }

  _mapNeighborIds(room) {
    const ids = new Set(room && room.navDirs ? Object.values(room.navDirs) : (room && room.navLinks ? room.navLinks : []));
    return ids;
  }

  _mapDirectionalNeighbors(room) {
    const result = {};
    const dirs = room && room.navDirs ? room.navDirs : {};
    for (const [key, id] of Object.entries(dirs)) {
      if (this.mapState.unlocked[id] || (this.mapScreen && this.mapScreen.freeTravel)) result[key] = id;
    }
    return result;
  }

  _selectNextMapRoom(dx, dy) {
    if (!this.mapScreen) return;
    const current = MAP_ROOM_DEFS[this.mapScreen.selected];
    if (!current) return;
    const directional = this._mapDirectionalNeighbors(current);
    const key = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    let targetId = directional[key];
    if (!targetId && this.mapScreen.freeTravel) {
      let best = null;
      let bestScore = Infinity;
      for (const other of MAP_ROOM_DEFS) {
        if (!other || other.id === current.id) continue;
        const dc = other.col - current.col;
        const dr = other.row - current.row;
        if (dx !== 0 && dc * dx <= 0) continue;
        if (dy !== 0 && dr * dy <= 0) continue;
        const primary = dx !== 0 ? Math.abs(dc) : Math.abs(dr);
        const offAxis = dx !== 0 ? Math.abs(dr) : Math.abs(dc);
        const score = primary * 100 + offAxis * 25;
        if (score < bestScore) {
          bestScore = score;
          best = other.id;
        }
      }
      targetId = best;
    }
    const bestIdx = targetId ? MAP_ROOM_DEFS.findIndex(r => r.id === targetId) : -1;
    if (bestIdx >= 0) this.mapScreen.selected = bestIdx;
  }

  _confirmMapRoom() {
    const room = MAP_ROOM_DEFS[this.mapScreen.selected];
    if (!room || (!this.mapState.unlocked[room.id] && !this.mapScreen.freeTravel)) return;
    if (this.mapScreen.freeTravel && !this.mapState.unlocked[room.id]) {
      this._unlockMapRoom(room.id, this.currentRoomId, 'freeTravel', []);
      this._saveMapState();
    }
    this.mapScreen = null;
    this._enterMapRoom(room.id);
    const elemTag = this.levelElement ? ` [${this.levelElement.toUpperCase()}]` : '';
    this.showWaveMessage(this._objectiveStartMessage());
  }

  _getNextBossPool() {
    const wave = this.wave; // current wave just completed (1-indexed)
    if (wave === 1) {
      this.bossPool = [1, 2, 3];
      return this.bossPool.slice();
    } else if (wave === 2) {
      // Remove chosen, add GUARDIAN (6) in its place
      const chosen = this.currentWaveDefIdx;
      this.bossPool = (this.bossPool || [1, 2, 3]).filter(i => i !== chosen);
      this.bossPool.push(6);
      return this.bossPool.slice();
    } else if (wave === 3) {
      // Remove chosen, add BOUNCER (5) in its place
      const chosen = this.currentWaveDefIdx;
      this.bossPool = (this.bossPool || []).filter(i => i !== chosen);
      this.bossPool.push(5);
      return this.bossPool.slice();
    } else if (wave === 4) {
      // Start mandatory group: RONIN / AEGIS / NEMESIS
      this.mandatoryPool = [4, 7, 8];
      return this.mandatoryPool.slice();
    } else if (wave === 5) {
      // Remove first-chosen mandatory boss, show remaining 2
      const chosen = this.currentWaveDefIdx;
      this.mandatoryPool = (this.mandatoryPool || [4, 7, 8]).filter(i => i !== chosen);
      return this.mandatoryPool.slice();
    } else if (wave === 6) {
      // Remove second-chosen, show last 1 (single-item confirmation)
      const chosen = this.currentWaveDefIdx;
      this.mandatoryPool = (this.mandatoryPool || []).filter(i => i !== chosen);
      return this.mandatoryPool.slice(); // length === 1
    } else if (wave === 7) {
      // Round 8: OVERLORD — caller sets WAVE_DEFS[9] directly
      return null;
    }
    return null;
  }

  // Randomly pick an objective for a wave def, deriving hunt filter from its enemy pool
  _randomObjectiveFor(wd) {
    const _pool = [
      { type: 'kills',   label: 'Kill Enemies',         desc: 'Defeat enemies to charge Boss Orbs.',                       icon: '⚔' },
      { type: 'hunt',    label: null,                   desc: null,                                                        icon: '◎' },
      { type: 'survive', label: 'Survive',              desc: 'Survival time charges Boss Orbs. Stay alive!',              icon: '♥' },
      { type: 'zone',    label: 'Hold the Zone',        desc: 'Stand in the marked zone to charge Boss Orbs.',             icon: '◈' },
      { type: 'collect', label: 'Collect Shurikens',    desc: 'Shuriken caches spawn as Boss Orbs. Pick them up!',        icon: '✦' },
      { type: 'defend',  label: 'Defend the Samurai',   desc: 'Keep the samurai alive — they charge Boss Orbs.',          icon: '⊕' },
    ];
    const pick = _pool[Math.floor(Math.random() * _pool.length)];
    if (pick.type === 'hunt') {
      // Pick the highest-weight non-big, non-boss type from the pool as target
      let best = null, bestW = 0;
      for (const e of (wd.pool || [])) {
        if (!e.big && e.weight > bestW) { bestW = e.weight; best = e; }
      }
      const targetType = best ? best.type : 'walker';
      const typeName = { walker:'Brutes', shooter:'Gunners', jumper:'Leapers', bouncer:'Bouncers', charger:'Chargers',
                         shielded:'Guards', deflector:'Ronin', protector:'Aegis', attacker:'Nemesis',
                         flyer:'Flyers', flyshooter:'Overlords' }[targetType] || targetType;
      return { type: 'hunt', filter: { enemyType: targetType }, label: `Hunt ${typeName}`, desc: `Only ${typeName} kills charge Boss Orbs. One is always present.`, icon: '◎' };
    }
    return pick;
  }

  _generatePathChoices(pool, normalCount) {
    normalCount = normalCount !== undefined ? normalCount : 1;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const choices = [];
    const usedElements = [];
    for (let i = 0; i < shuffled.length; i++) {
      const waveIdx = shuffled[i];
      const wd = WAVE_DEFS[waveIdx];
      let element = null;
      if (i >= normalCount) {
        const available = ENEMY_ELEMENTS.filter(el => !usedElements.includes(el));
        if (available.length > 0) {
          element = available[Math.floor(Math.random() * available.length)];
          usedElements.push(element);
        }
      }
      const bossName = BOSS_NAMES[wd.boss] || wd.boss.toUpperCase();
      // Pre-generate the orb reward for this specific choice
      const mult = element ? (ELEMENT_BUDGET_MULT[element] || 1.0) : 1.0;
      const orbData = this._generateOrbBuckets(mult);
      // Randomly assign objective (first wave = index 0, last = index 9 keep kills; rest are random)
      const objective = (waveIdx === 0 || waveIdx === 9)
        ? (wd.objective || { type: 'kills', label: 'Kill Enemies', desc: 'Defeat enemies to charge Boss Orbs.', icon: '⚔' })
        : this._randomObjectiveFor(wd);
      choices.push({ waveIdx, element, bossName, bossType: wd.boss, reward: orbData.buckets[0], meta: orbData.meta, objective });
    }
    // Consume the boss item choices (shown at the top of the path screen)
    const itemChoices = (this.bossRewardItems && this.bossRewardItems.length > 0) ? this.bossRewardItems.slice() : [];
    this.bossRewardItems = [];
    return { choices, selected: 0, delay: 60, itemChoices, itemSelected: 0, focus: 'boss' };
  }

  // ── Orb Bucket Generation ──
  _generateOrbBuckets(budgetMult) {
    budgetMult = budgetMult || 1.0;
    const pl = this.player;

    // How far behind the expected curve is the player?
    let cumDrops = 0;
    for (let i = 0; i < this.wave && i < WAVE_DEFS.length; i++) {
      cumDrops += WAVE_DEFS[i].killsForBoss + (i + 2);
    }
    const expectedAll = cumDrops * (0.10 + 0.36 + 0.10 + 0.06 + 0.03 + 0.04 + 0.04 + 0.03 + 0.02);
    const actualAll = (pl.maxHp - 20) +
      pl.bonusDamage + pl.bonusElemental + pl.bonusSpeed + pl.bonusReach +
      pl.bonusArmor + pl.bonusMana;
    const deficit = Math.max(0, expectedAll - actualAll);
    const deficitRatio = expectedAll > 0 ? Math.min(1, deficit / expectedAll) : 1;
    const permTotal = pl.bonusDamage + pl.bonusElemental + pl.bonusSpeed + pl.bonusReach + pl.bonusArmor + pl.bonusMana;

    // Orb pricing — element=50 is the reference unit
    // Budget: 1 element minimum (50), 2 elements max (100) when no perms
    // Scales up with wave and deficit
    const baseBudget = 50 + this.wave * 8;
    const budget = Math.round(baseBudget * (1 + deficitRatio * 0.6) * budgetMult);

    const ORB_META = {
      heal:      { icon: '\u2665', color: '#f44', label: 'HP',       per: 5,  cost: 5 },
      maxhp:     { icon: '+',  color: '#4f4', label: 'MAX HP',   per: 1,  cost: 8 },
      damage:    { icon: '!',  color: '#f80', label: 'ATK',      per: 1,  cost: 18 },
      elDmg:     { icon: '\u2737', color: '#c4f', label: 'EL.DMG',  per: 1,  cost: 20 },
      speed:     { icon: '\u00bb', color: '#0f0', label: 'SPD',      per: 1,  cost: 16 },
      reach:     { icon: '\u2194', color: '#fa0', label: 'REACH',    per: 1,  cost: 16 },
      armor:     { icon: '\u25a0', color: '#88f', label: 'ARMOR',    per: 1,  cost: 18 },
      shuriken:  { icon: '\u2726', color: '#ccc', label: 'SHURIKENS', per: 1, cost: 14 },
      ultcharge: { icon: '\u2605', color: '#ff0', label: 'ULT',      per: 50, cost: 6 },
      element:   { icon: '\u25c8', color: '#f0f', label: 'SPECIAL',  per: 1,  cost: 50 },
    };

    // Filter useless orbs
    const hpFull = pl.hp >= pl.maxHp;
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
      if (!hpFull) pool.push({ type: 'heal', w: 24 });
      pool.push({ type: 'maxhp', w: 14 });
      if (!ultFull) pool.push({ type: 'ultcharge', w: 10 });
      pool.push({ type: 'damage', w: 6 * rareBoost });
      pool.push({ type: 'elDmg', w: 4 * rareBoost });
      pool.push({ type: 'speed', w: 6 * rareBoost });
      pool.push({ type: 'reach', w: 6 * rareBoost });
      pool.push({ type: 'armor', w: 5 * rareBoost });
      pool.push({ type: 'shuriken', w: 6 * rareBoost });
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
          if (t === 'heal' && (orbs['heal'] || 0) * 5 >= pl.maxHp - pl.hp) return false;
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
          case 'heal':      pl.hp = Math.min(pl.hp + 5, pl.maxHp); break;
          case 'maxhp':     pl.maxHp += 1; pl.hp = Math.min(pl.hp + 1, pl.maxHp); break;
          case 'damage':    pl.bonusDamage += 1; break;
          case 'elDmg':     pl.bonusElemental += 1; break;
          case 'speed':     pl.bonusSpeed += 1; break;
          case 'reach':     pl.bonusReach += 1; break;
          case 'armor':     pl.bonusArmor += 1; break;
          case 'ultcharge': if (!pl.ultimateReady && !pl.ultimateActive) pl.addUltimateCharge(50); break;
          case 'shuriken':  pl.maxShurikens += 1; break;
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
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    if (waveDef) this.player.defeatedBossTypes.add(waveDef.boss);
    recordWaveClear(this.wave, this.player.ninjaType);
    this.wave++;
    this.waveKills = 0;
    // Boss Summon Orb reset for new wave
    this.bossOrbsRequired = Math.min(5, 2 + Math.floor((this.wave - 1) / 2));
    this.bossOrbCharge = 0;
    this.bossOrbCooldown = 0;
    this.bossOrbsCollected = 0;
    this.bossOrbPickups = [];
    this.spawnedMiniboss = new Set();
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.bubbleShieldPickups = [];
    this.enemies = [];
    // Boss kill phrase
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
    this._initObjective();
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
      this.showWaveMessage(this._objectiveStartMessage());
    }
  }

  _spawnScreenPickup(PickupClass) {
    return new PickupClass(
      this.camera.x + 60 + Math.random() * (CANVAS_W - 120),
      this.camera.y + 80 + Math.random() * (CANVAS_H - 200)
    );
  }

  _updatePickupArray(pickups, PickupClass) {
    const interval = PickupClass.spawnInterval(this);
    const phase = PickupClass.spawnPhase(this);
    const maxOnScreen = PickupClass.maxOnScreen(this);
    if (this.tick % interval === phase && pickups.length < maxOnScreen) {
      pickups.push(this._spawnScreenPickup(PickupClass));
    }
    for (const pickup of pickups) pickup.update(this);
    return compactLiveArray(pickups, keepNotDone, maxOnScreen);
  }

  _updateShurikenPickups() {
    this.shurikenPickups = this._updatePickupArray(this.shurikenPickups, ShurikenPickupOrb);
  }

  _updateBubbleShieldPickups() {
    this.bubbleShieldPickups = this._updatePickupArray(this.bubbleShieldPickups, BubbleShieldPickupOrb);
  }

  _updateFieldPickups() {
    this._updateShurikenPickups();
    this._updateBubbleShieldPickups();
  }

  _mapAreaBounds() {
    if (this._mapAreaBoundsCache) return this._mapAreaBoundsCache;
    const bounds = [];
    for (const [areaId, area] of Object.entries(MAP_AREAS)) {
      let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
      for (const room of MAP_ROOM_DEFS) {
        if (room.area !== areaId) continue;
        minCol = Math.min(minCol, room.col);
        maxCol = Math.max(maxCol, room.col);
        minRow = Math.min(minRow, room.row);
        maxRow = Math.max(maxRow, room.row);
      }
      if (minCol !== Infinity) bounds.push({ areaId, area, minCol, maxCol, minRow, maxRow });
    }
    this._mapAreaBoundsCache = bounds;
    return bounds;
  }

  _mapGhostPathPairs() {
    if (this._mapGhostPathPairsCache) return this._mapGhostPathPairsCache;
    const seen = new Set();
    const pairs = [];
    for (const room of MAP_ROOM_DEFS) {
      for (const id of Object.values(room.navDirs || {})) {
        const key = room.id < id ? room.id + '|' + id : id + '|' + room.id;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ fromId: room.id, toId: id });
      }
    }
    this._mapGhostPathPairsCache = pairs;
    return pairs;
  }

  _roomHasSkyExit(room) {
    if (!this._roomSkyExitCache) {
      this._roomSkyExitCache = {};
      for (const r of MAP_ROOM_DEFS) {
        let hasExit = false;
        for (const id of Object.values(r.navDirs || {})) {
          if (MAP_ROOM_BY_ID[id] && MAP_ROOM_BY_ID[id].area === 'skies') {
            hasExit = true;
            break;
          }
        }
        this._roomSkyExitCache[r.id] = hasExit;
      }
    }
    return !!this._roomSkyExitCache[room.id];
  }

  _roomItemById() {
    const assignments = this.mapState.itemRoomAssignments || {};
    if (this._roomItemByIdCache && this._roomItemByIdSource === assignments) return this._roomItemByIdCache;
    const roomItemById = {};
    for (const [itemId, roomId] of Object.entries(assignments)) {
      roomItemById[roomId] = itemId;
    }
    this._roomItemByIdSource = assignments;
    this._roomItemByIdCache = roomItemById;
    return roomItemById;
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

    if (this.itemRewardScreen) {
      const rs = this.itemRewardScreen;
      if (rs.delay > 0) {
        rs.delay--;
        consumePress('KeyZ'); consumePress('Enter'); consumePress('Space'); consumePress('MouseAttack');
      }
      if (consumePress('ArrowLeft') || consumePress('KeyA') || consumePress('ArrowRight') || consumePress('KeyD')) {
        rs.selected = rs.selected === 0 ? 1 : 0;
      }
      if (rs.delay <= 0 && (consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack'))) {
        this._chooseRoomReward(rs.roomId, rs.selected === 0 ? 'item' : 'attr');
        this.itemRewardScreen = null;
      }
      return;
    }

    if (this.mapScreen) {
      const ms = this.mapScreen;
      if (ms.delay > 0) {
        ms.delay--;
        consumePress('KeyZ'); consumePress('Enter'); consumePress('Space'); consumePress('MouseAttack');
      }
      const navLeft = consumePress('ArrowLeft') || consumePress('KeyA');
      const navRight = consumePress('ArrowRight') || consumePress('KeyD');
      const navUp = consumePress('ArrowUp') || consumePress('KeyW');
      const navDown = consumePress('ArrowDown') || consumePress('KeyS');
      const navDx = navLeft ? -1 : navRight ? 1 : 0;
      const navDy = navUp ? -1 : navDown ? 1 : 0;
      if (navDx || navDy) this._selectNextMapRoom(navDx, navDy);
      if (consumePress('KeyQ') || consumePress('Minus') || consumePress('NumpadSubtract')) {
        ms.zoom = Math.max(0.3, Math.round(((ms.zoom || 1) - 0.15) * 100) / 100);
        this.mapZoom = ms.zoom;
      }
      if (consumePress('KeyE') || consumePress('Equal') || consumePress('NumpadAdd')) {
        ms.zoom = Math.min(1.9, Math.round(((ms.zoom || 1) + 0.15) * 100) / 100);
        this.mapZoom = ms.zoom;
      }
      if (consumePress('Digit0') || consumePress('Numpad0')) {
        ms.freeTravel = !ms.freeTravel;
        this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 20, ms.freeTravel ? 'MAP FREE TRAVEL' : 'MAP LOCKED PATHS', ms.freeTravel ? '#7df' : '#aaa'));
      }
      if (ms.delay <= 0 && (consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack'))) {
        this._confirmMapRoom();
      }
      return;
    }

    // Path choice screen (combined boss selection + reward preview)
    if (this.pathChoiceScreen) {
      const pcs = this.pathChoiceScreen;
      const numChoices = pcs.choices.length;
      const numItems = pcs.itemChoices ? pcs.itemChoices.length : 0;
      if (pcs.delay > 0) {
        pcs.delay--;
        // Only eat confirm buttons during delay; let arrows through
        consumePress('KeyZ'); consumePress('Enter'); consumePress('Space'); consumePress('MouseAttack');
      }
      if (consumePress('ArrowLeft') || consumePress('KeyA')) pcs.selected = (pcs.selected + numChoices - 1) % numChoices;
      if (consumePress('ArrowRight') || consumePress('KeyD')) pcs.selected = (pcs.selected + 1) % numChoices;
      if (pcs.delay <= 0) {
        if (consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack')) {
          const chosen = pcs.choices[pcs.selected];
          this.currentWaveDefIdx = chosen.waveIdx;
          this.levelElement = chosen.element;
          this.pendingObjective = chosen.objective || null; // carry random objective into next wave
          this.pathChoiceScreen = null;
          // Apply the selected boss item
          if (numItems > 0) {
            const chosenItem = pcs.itemChoices[pcs.selected];
            if (chosenItem) {
              this.player.items[chosenItem] = true;
              if (chosenItem === 'deathsKey') this.player.deathsKeyUsed = false;
              this.itemPickupOverlay = { itemId: chosenItem, timer: 180 };
              recordItemFound(chosenItem);
            }
          }
          // Apply the pre-generated orb reward for the chosen path
          this._applyOrbBucket(chosen.reward);
          this.advanceWave();
        }
      }
      return;
    }

    // Orb bucket choice menu
    if (this.orbBucketChoice) {
      const obc = this.orbBucketChoice;
      const numOrbItems = obc.itemChoices ? obc.itemChoices.length : 0;
      if (obc.delay > 0) {
        obc.delay--;
        // Only eat confirm buttons during delay; let arrows through
        consumePress('KeyZ'); consumePress('Enter'); consumePress('Space'); consumePress('MouseAttack');
      }
      if (consumePress('ArrowLeft') || consumePress('KeyA')) obc.selected = (obc.selected + 2) % 3;
      if (consumePress('ArrowRight') || consumePress('KeyD')) obc.selected = (obc.selected + 1) % 3;
      if (obc.delay <= 0) {
        if (consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack')) {
          this._applyOrbBucket(obc.buckets[obc.selected]);
          // Apply the selected boss item
          if (numOrbItems > 0) {
            const chosenOrbItem = obc.itemChoices[obc.selected];
            if (chosenOrbItem) {
              this.player.items[chosenOrbItem] = true;
              if (chosenOrbItem === 'deathsKey') this.player.deathsKeyUsed = false;
              this.itemPickupOverlay = { itemId: chosenOrbItem, timer: 180 };
              recordItemFound(chosenOrbItem);
            }
          }
          this.orbBucketChoice = null;
          this.advanceWave();
        }
      }
      return;
    }

    // Ninja switching
    if (consumePress('Digit1') || consumePress('Numpad1')) this.player.switchNinja('fire');
    if (consumePress('Digit2') || consumePress('Numpad2')) this.player.switchNinja('earth');
    if (consumePress('Digit3') || consumePress('Numpad3')) this.player.switchNinja('bubble');
    if (consumePress('Digit4') || consumePress('Numpad4')) this.player.switchNinja('shadow');
    if (consumePress('Digit5') || consumePress('Numpad5')) this.player.switchNinja('crystal');
    if (consumePress('Digit6') || consumePress('Numpad6')) this.player.switchNinja('wind');
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
      if (false) {
      const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
      if (waveDef) {
        const pl = this.player;
        const kills = 20 + this.wave * 5; // estimate: roughly scales with wave
        const bossOrbs = this.wave + 1; // avg boss orb count (wave + random 0-2)
        const drops = kills + bossOrbs;
        // Actual drop table rates × orb stat values per drop
        pl.maxHp          += Math.round(drops * 0.10);  // maxhp: 10% × +1
        pl.hp              = pl.maxHp;
        pl.bonusDamage    += Math.round(drops * 0.06);  // damage: 6% × +1
        pl.bonusElemental += Math.round(drops * 0.03);  // elDmg: 3% × +1
        pl.bonusSpeed     += Math.round(drops * 0.04);  // speed: 4% × +1
        pl.bonusReach     += Math.round(drops * 0.04);  // reach: 4% × +1
        pl.bonusArmor     += Math.round(drops * 0.03);  // armor: 3% × +1
        pl.bonusMana      += Math.round(drops * 0.02);  // element: 2% × +1
        pl.maxMana        += Math.round(drops * 0.02);
        pl.mana            = pl.maxMana;
        pl.ultimateCharge  = 0;
        pl.ultimateReady   = false;
      }
      }
      this._completeCurrentMapRoom();
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
      if (false) {
      // Total orb sources: completed waves (enemies + boss orbs) + current wave enemies
      let totalDrops = 0;
      for (let i = 0; i < this.wave - 1 && i < WAVE_DEFS.length; i++) {
        totalDrops += (20 + i * 5) + (i + 2); // estimated enemies + avg boss orbs
      }
      if (this.wave - 1 < WAVE_DEFS.length) {
        totalDrops += 20 + (this.wave - 1) * 5; // current wave estimated enemies
      }
      // Set absolute stats: base + average gains from all drops
      pl.maxHp          = 10 + Math.round(totalDrops * 0.10);  // base 10 + maxhp orbs
      pl.hp             = pl.maxHp;
      pl.displayHp      = pl.maxHp;
      pl.bonusDamage    = Math.round(totalDrops * 0.06);
      pl.bonusElemental = Math.round(totalDrops * 0.03);
      pl.bonusSpeed     = Math.round(totalDrops * 0.04);
      pl.bonusReach     = Math.round(totalDrops * 0.04);
      pl.bonusArmor     = Math.round(totalDrops * 0.03);
      pl.bonusMana      = Math.round(totalDrops * 0.02);
      pl.maxMana        = 2 + pl.bonusMana;
      pl.mana           = pl.maxMana;
      pl.ultimateCharge = 0;
      pl.ultimateReady  = false;
      }
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
    } else if (this.player.deathTimer > 0) {
      this.player.deathTimer--;
      if (this.player.deathTimer <= 0) {
        this._retryCurrentRoom();
        return;
      }
    } else {
      this.player.update(this);
    }

    // During ultimate cutscene, freeze everything except effects
    if (this.player.ultCutscene) {
      for (const e of this.effects) e.update();
      compactLiveArray(this.effects, keepNotDone, GAME_OBJECT_LIMITS.effects);
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
    for (const h of this.hitLines) h.update(this);
    for (const g of this.grenades) g.update(this);
    if (this.trimerangs) {
      for (const t of this.trimerangs) t.update(this);
      compactLiveArray(this.trimerangs, keepNotDone, GAME_OBJECT_LIMITS.trimerangs);
    }
    if (this.diamondShards) {
      for (const d of this.diamondShards) d.update(this);
      compactLiveArray(this.diamondShards, keepNotDone, GAME_OBJECT_LIMITS.diamondShards);
    }
    for (const f of this.flamePools) f.update(this);
    compactLiveArray(this.flamePools, keepNotDone, GAME_OBJECT_LIMITS.flamePools);
    if (this.crystalCastle) {
      this.crystalCastle.update(this);
      if (this.crystalCastle.done) this.crystalCastle = null;
    }
    for (const e of this.effects) e.update();
    for (const b of this.stoneBlocks) b.update(this);
    for (const b of this.bubbles) b.update(this);
    for (const o of this.orbs) o.update(this);
    for (const bi of this.bossItems) bi.update(this);

    this._updateFieldPickups();

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
    compactLiveArray(this.fireTrails, keepPositiveLife, GAME_OBJECT_LIMITS.fireTrails);

    // Weather & hazard updates
    if (!this.pathChoiceScreen && !this.orbBucketChoice) {
      this._updateWeather();
      this._updateHazards();
    }

    // Wave / spawn logic
    if (!this.gameWon) {
      const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
      // Always spawn enemies regardless of boss state
      const aliveCount = this.enemies.reduce((n, e) => n + (e.dead ? 0 : 1), 0);
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval && aliveCount < this.maxEnemies) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
      // Hunt objective: guarantee one target enemy alive at all times
      const _wObj = this.currentObjective;
      if (_wObj && _wObj.type === 'hunt' && !this.bossActive && !this.boss) {
        const _huntAlive = this.enemies.some(e => !e.dead && this._matchesHuntFilter(e, _wObj.filter));
        if (!_huntAlive) {
          this._spawnHuntTarget(_wObj.filter);
        }
      }
      // Samurai update (defend objective)
      if (this.samurai && !this.samurai.dead) {
        if (this.samurai.flashTimer > 0) this.samurai.flashTimer--;
        // Enemies nearby damage the samurai
        for (const e of this.enemies) {
          if (e.dead) continue;
          const sdx = Math.abs(e.x + e.w / 2 - (this.samurai.x + this.samurai.w / 2));
          const sdy = Math.abs(e.y + e.h / 2 - (this.samurai.y + this.samurai.h / 2));
          if (sdx < 28 && sdy < 36 && this.tick % 30 === 0) {
            this.samurai.hp -= 1;
            this.samurai.flashTimer = 12;
            if (this.samurai.hp <= 0) {
              this.samurai.hp = 0;
              this.samurai.dead = true;
              this.bossOrbCharge = 0; // charge lost when samurai dies
              this.effects.push(new TextEffect(this.samurai.x + 9, this.samurai.y - 16, 'SAMURAI FALLEN!', '#f44'));
              triggerScreenShake(6, 15);
              SFX.enemyDie();
            }
            break;
          }
        }
      }
      // ── Boss Summon Orb logic ──
      if (!this.bossActive && !this.boss) {
        if (this.bossOrbCooldown > 0) this.bossOrbCooldown--;
        // Objective-based charge accumulation (overrides damage-based for non-kill types)
        const _obj = this.currentObjective;
        if (_obj) {
          if (_obj.type === 'survive') {
            // ~30 seconds per orb
            this.bossOrbCharge = Math.min(this.bossOrbChargeMax, this.bossOrbCharge + this.bossOrbChargeMax / 1800);
          } else if (_obj.type === 'zone' && this.objZone) {
            const _pl = this.player;
            const _inZone = _pl.x + _pl.w > this.objZone.x && _pl.x < this.objZone.x + this.objZone.w &&
                            _pl.y + _pl.h > this.objZone.y && _pl.y < this.objZone.y + this.objZone.h;
            if (_inZone) {
              // ~25 seconds of cumulative zone time per orb
              this.bossOrbCharge = Math.min(this.bossOrbChargeMax, this.bossOrbCharge + this.bossOrbChargeMax / 1500);
            }
          } else if (_obj.type === 'defend' && this.samurai && !this.samurai.dead) {
            // ~20 seconds of samurai alive per orb
            this.bossOrbCharge = Math.min(this.bossOrbChargeMax, this.bossOrbCharge + this.bossOrbChargeMax / 1200);
          }
          // 'kills' and 'hunt': progress comes from visible kill counts.
          // 'collect': charge comes from shuriken pickup caches.
        }
        if (_obj && (_obj.type === 'kills' || _obj.type === 'hunt') && !this.bossActive && !this.boss) {
          const progress = this._objectiveProgressInfo();
          if (progress && progress.rawCurrent >= progress.rawTarget) {
            this.spawnBoss();
          }
        }
        // Spawn an orb when charge threshold met and cooldown elapsed
        if (this.bossOrbCharge >= this.bossOrbChargeMax && this.bossOrbCooldown <= 0 &&
            this.bossOrbsCollected < this.bossOrbsRequired) {
          this.bossOrbCharge = 0;
          this.bossOrbCooldown = 45;
          this.bossOrbsCollected++;
          SFX.wave();
          const pl = this.player;
          const rem = this.bossOrbsRequired - this.bossOrbsCollected;
          const txt = rem > 0
            ? 'OBJECTIVE ' + this.bossOrbsCollected + '/' + this.bossOrbsRequired
            : 'BOSS SUMMONED!';
          this.effects.push(new TextEffect(pl.x + pl.w / 2, pl.y - 20, txt, '#f80'));
          if (this.bossOrbsCollected >= this.bossOrbsRequired) this.spawnBoss();
          if (false) {
          const orbSpawnX = this.camera.x + 80 + Math.random() * (CANVAS_W - 160);
          const orbSpawnY = this.camera.y + 80 + Math.random() * (CANVAS_H - 200);
          this.bossOrbPickups.push({
            x: orbSpawnX, y: orbSpawnY,
            bobTimer: Math.random() * Math.PI * 2, life: 1800, done: false, w: 28, h: 28,
            vx: 0, vy: 0,
          });
          // ── Boss Orb spawn burst ──
          this.effects.push(new SlamRing(orbSpawnX + 14, orbSpawnY + 14, '#f80', 120, 18));
          this.effects.push(new SlamRing(orbSpawnX + 14, orbSpawnY + 14, '#fa0', 70, 10));
          for (let _i = 0; _i < 10; _i++) {
            const _a = (_i / 10) * Math.PI * 2;
            const _spd = 3 + Math.random() * 3;
            const _p = new Projectile(orbSpawnX + 14, orbSpawnY + 14, Math.cos(_a) * _spd, Math.sin(_a) * _spd, '#fa0', 0, 'none');
            _p.w = 4; _p.h = 4; _p.life = 30; _p.noPlat = true; _p.passThrough = true;
            this.projectiles.push(_p);
          }
          this.effects.push(new Effect(orbSpawnX + 14, orbSpawnY + 14, '#fff', 22, 7, 20));
          this.effects.push(new Effect(orbSpawnX + 14, orbSpawnY + 14, '#f80', 16, 5, 18));
          SFX.wave();
          const pl = this.player;
          this.effects.push(new TextEffect(pl.x + pl.w / 2, pl.y - 30, '\u2606 BOSS ORB!', '#f80'));
          }
        }
        // Update and collect pickups
        const pl = this.player;
        for (const orb of this.bossOrbPickups) {
          if (orb.done) continue;
          orb.bobTimer += 0.05;
          orb.life--;
          if (orb.life <= 0) { orb.done = true; continue; }
          // Attraction to player
          const _obx = orb.x + orb.w / 2, _oby = orb.y + orb.h / 2;
          const _pdx = pl.x + pl.w / 2 - _obx, _pdy = pl.y + pl.h / 2 - _oby;
          const _odist = Math.sqrt(_pdx * _pdx + _pdy * _pdy);
          const _magnetRange = pl.items && pl.items.redMagnet ? 240 : 64;
          if (_odist < _magnetRange && _odist > 0) {
            orb.vx += (_pdx / _odist) * 0.7;
            orb.vy += (_pdy / _odist) * 0.35;
            const _ospd = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
            if (_ospd > 6) { orb.vx = orb.vx * 6 / _ospd; orb.vy = orb.vy * 6 / _ospd; }
            orb.x += orb.vx;
            orb.y += orb.vy;
          }
          if (rectOverlap(pl, orb)) {
            orb.done = true;
            this.bossOrbsCollected++;
            SFX.pickup();
            const rem = this.bossOrbsRequired - this.bossOrbsCollected;
            const txt = rem > 0
              ? '\u2605 ORB (' + this.bossOrbsCollected + '/' + this.bossOrbsRequired + ')'
              : '\u2605 BOSS SUMMONED!';
            this.effects.push(new TextEffect(pl.x + pl.w / 2, pl.y - 20, txt, '#f80'));
            if (this.bossOrbsCollected >= this.bossOrbsRequired) this.spawnBoss();
          }
        }
        compactLiveArray(this.bossOrbPickups, keepNotDone);
      }
      if (this.boss && this.boss.dead && !this.orbBucketChoice && !this.pathChoiceScreen) {
        this._completeCurrentMapRoom();
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
    compactLiveArray(this.enemies, keepEnemyAlive);
    compactLiveArray(this.projectiles, keepNotDone, GAME_OBJECT_LIMITS.projectiles);
    compactLiveArray(this.hitLines, keepNotDone, GAME_OBJECT_LIMITS.hitLines);
    compactLiveArray(this.grenades, keepNotDone, GAME_OBJECT_LIMITS.grenades);
    compactLiveArray(this.effects, keepNotDone, GAME_OBJECT_LIMITS.effects);
    compactLiveArray(this.stoneBlocks, keepNotDone, GAME_OBJECT_LIMITS.stoneBlocks);
    compactLiveArray(this.bubbles, keepNotDone, GAME_OBJECT_LIMITS.bubbles);
    compactLiveArray(this.orbs, keepNotDone, GAME_OBJECT_LIMITS.orbs);
    compactLiveArray(this.bossItems, keepNotDone);

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

    // ── Audio/Music toggle buttons (top-right) ──
    const btnW = 84, btnH = 26, btnY = 10;
    const musicBtnX = CANVAS_W - 180;
    const sfxBtnX = CANVAS_W - 88;

    ctx.fillStyle = Music.muted ? '#333' : '#224';
    ctx.fillRect(musicBtnX, btnY, btnW, btnH);
    ctx.strokeStyle = Music.muted ? '#555' : '#68f';
    ctx.lineWidth = 1;
    ctx.strokeRect(musicBtnX, btnY, btnW, btnH);
    ctx.fillStyle = Music.muted ? '#666' : '#adf';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Music.muted ? 'MUSIC: OFF' : 'MUSIC: ON', musicBtnX + btnW / 2, btnY + 17);

    ctx.fillStyle = SFX.muted ? '#333' : '#224';
    ctx.fillRect(sfxBtnX, btnY, btnW, btnH);
    ctx.strokeStyle = SFX.muted ? '#555' : '#68f';
    ctx.strokeRect(sfxBtnX, btnY, btnW, btnH);
    ctx.fillStyle = SFX.muted ? '#666' : '#adf';
    ctx.fillText(SFX.muted ? 'SFX: OFF' : 'SFX: ON', sfxBtnX + btnW / 2, btnY + 17);

    ctx.textAlign = 'left';
  }

  renderMainMenu() {
    // Dark background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#06061a');
    grad.addColorStop(1, '#12122e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Background stars
    ctx.fillStyle = '#fff';
    const t = this.menuTick;
    this.menuTick++;
    for (let i = 0; i < 60; i++) {
      const seed = i * 137 + 29;
      const sx = (seed * 7.3) % CANVAS_W;
      const sy = (seed * 3.1) % CANVAS_H;
      const twinkle = 0.2 + Math.sin(t * 0.02 + i) * 0.3 + 0.3;
      ctx.globalAlpha = twinkle;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // If a popup is active, render the popup on top
    if (this.mainMenuPopup) {
      // Reuse pause menu popup system
      pauseMenu.popup = this.mainMenuPopup;
      renderPopup(ctx);
      pauseMenu.popup = null;
      return;
    }

    // ── ELENIN logo with rectangular letters ──
    const ninjaColors = [
      { body: '#e33', accent: '#f93' },
      { body: '#a0622a', accent: '#2e9e2e' },
      { body: '#48f', accent: '#8cf' },
      { body: '#726', accent: '#a4e' },
      { body: '#2dd', accent: '#aff' },
      { body: '#8d8', accent: '#bfb' },
    ];

    const letterW = 32, letterH = 42;
    const gap = 9;
    const totalW = 6 * letterW + 5 * gap;
    const startX = (CANVAS_W - totalW) / 2;
    const startY = 22;
    const drawE = (x, y, color, accentColor) => {
      const pillar = 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pillar, letterH);
      ctx.fillRect(x + pillar, y, letterW - pillar, 7);
      ctx.fillRect(x + pillar, y + letterH / 2 - 3, (letterW - pillar) * 0.75, 7);
      ctx.fillRect(x + pillar, y + letterH - 7, letterW - pillar, 7);
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, y, letterW - pillar, 2);
      ctx.fillRect(x + pillar, y + letterH - 2, letterW - pillar, 2);
      ctx.fillRect(x, y, pillar, 2);
    };
    const drawLower_l = (x, y, color, accentColor) => {
      const pillarW = 12;
      const px = x + (letterW - pillarW) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(px, y, pillarW, letterH);
      ctx.fillStyle = accentColor;
      ctx.fillRect(px - 3, y + letterH - 3, pillarW + 6, 3);
      ctx.fillRect(px, y, pillarW, 2);
    };
    const drawLower_e = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      const h = letterH - topOff;
      const yy = y + topOff;
      const pillar = 7;
      ctx.fillStyle = color;
      ctx.fillRect(x, yy, pillar, h);
      ctx.fillRect(x + pillar, yy, letterW - pillar, 5);
      ctx.fillRect(x + pillar, yy + h / 2 - 3, letterW - pillar, 5);
      ctx.fillRect(x + pillar, yy + h - 5, (letterW - pillar) * 0.75, 5);
      ctx.fillRect(x + letterW - pillar, yy, pillar, h / 2 - 3);
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, yy, letterW - pillar, 2);
      ctx.fillRect(x + pillar, yy + h / 2 - 3, letterW - pillar, 2);
      ctx.fillRect(x, yy, pillar, 2);
    };
    const drawN = (x, y, color, accentColor) => {
      const pillar = 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pillar, letterH);
      ctx.fillRect(x + letterW - pillar, y, pillar, letterH);
      ctx.fillStyle = accentColor;
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const bx = x + pillar - 2 + frac * (letterW - pillar * 2 + 4 - 7);
        const by = y + frac * (letterH - 7);
        ctx.fillRect(bx, by, 7, 7);
      }
      ctx.fillRect(x, y, pillar, 2);
      ctx.fillRect(x + letterW - pillar, y + letterH - 2, pillar, 2);
    };
    const drawLower_i = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      const pillarW = 12;
      const px = x + (letterW - pillarW) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + topOff, pillarW, letterH - topOff);
      ctx.fillStyle = accentColor;
      ctx.fillRect(px - 2, y + letterH - 2, pillarW + 4, 2);
      ctx.fillRect(px, y + topOff, pillarW, 2);
    };
    const drawLower_n = (x, y, color, accentColor) => {
      const topOff = Math.floor(letterH * 0.28);
      const h = letterH - topOff;
      const yy = y + topOff;
      const pillar = 7;
      ctx.fillStyle = color;
      ctx.fillRect(x, yy, pillar, h);
      ctx.fillRect(x + letterW - pillar, yy + 5, pillar, h - 5);
      ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 7);
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + pillar, yy, letterW - pillar * 2, 2);
      ctx.fillRect(x, yy, pillar, 2);
    };

    const letters = [
      { draw: drawE }, { draw: drawLower_l }, { draw: drawLower_e },
      { draw: drawN }, { draw: drawLower_i }, { draw: drawLower_n },
    ];

    for (let i = 0; i < 6; i++) {
      const lx = startX + i * (letterW + gap);
      const floatY = Math.sin(t * 0.035 + i * 0.8) * 3;
      const ly = startY + floatY;
      const c = ninjaColors[i];
      ctx.save();
      ctx.shadowColor = c.accent;
      ctx.shadowBlur = 10 + Math.sin(t * 0.05 + i) * 4;
      letters[i].draw(lx, ly, c.body, c.accent);
      ctx.restore();
      letters[i].draw(lx, ly, c.body, c.accent);
      if (i === 4) {
        const hatCx = lx + letterW / 2;
        const hatBaseY = ly + letterH * 0.3 - 3;
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.moveTo(hatCx - 11, hatBaseY);
        ctx.lineTo(hatCx, hatBaseY - 15);
        ctx.lineTo(hatCx + 11, hatBaseY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.body;
        ctx.fillRect(hatCx - 11, hatBaseY - 2, 22, 3);
      }
    }

    // Subtitle
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.04) * 0.2;
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('~ an elemental ninja platformer ~', CANVAS_W / 2, startY + letterH + 20);
    ctx.globalAlpha = 1;

    // Menu box
    const options = MAIN_MENU_OPTIONS;
    const bw = 280, bh = 40 + options.length * 28 + 24;
    const bx = CANVAS_W / 2 - bw / 2;
    const by = startY + letterH + 34;
    drawBox(ctx, bx, by, bw, bh);

    // Options
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < options.length; i++) {
      const oy = by + 26 + i * 28;
      if (i === this.mainMenuSelected) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(bx + 20, oy - 14, bw - 40, 24);
        ctx.fillStyle = '#ffd700';
        ctx.fillText('\u25B6 ', bx + 24, oy + 2);
      }
      ctx.fillStyle = i === this.mainMenuSelected ? '#fff' : '#aaa';
      ctx.fillText(options[i], bx + 44, oy + 2);
      // Show ON/OFF for Music and SFX
      if (options[i] === 'Music' || options[i] === 'SFX') {
        const isOn = options[i] === 'Music' ? !Music.muted : !SFX.muted;
        ctx.fillStyle = isOn ? '#4f4' : '#f44';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(isOn ? 'ON' : 'OFF', bx + bw - 30, oy + 2);
        ctx.textAlign = 'left';
        ctx.font = '14px monospace';
      }
    }

    // Footer
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u2191\u2193 Navigate \u2022 Enter/Z to select', CANVAS_W / 2, by + bh - 8);

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
      { k1: 'X', k2: 'K', label: 'Special', color: '#8f8' },
      { k1: 'C', k2: 'L', label: 'Ultimate (when charged)', color: '#f8f' },
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
    ctx.fillText('ULT', msx + 30, msy + 40);

    // Mouse labels
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f88';
    ctx.fillText('Left Click = Attack', msx + 70, msy - 2);
    ctx.fillStyle = '#8f8';
    ctx.fillText('Right Click = Special', msx + 70, msy + 16);
    ctx.fillStyle = '#ff8';
    ctx.fillText('Middle Click = Ultimate', msx + 70, msy + 34);
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
    const ssx = 170, ssy = 360;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM', ssx, ssy - 18);
    drawKey(ssx - 20, ssy, 'ESC', 36);
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Pause', ssx + 6, ssy);

    // ── Reward Screen ──
    const rsx = 120, rsy = 420;
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REWARD SCREEN', rsx + 60, rsy - 18);
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffe033';
    ctx.fillText('A / D', rsx, rsy);
    ctx.fillStyle = '#ccc';
    ctx.fillText('\u2014 choose path or bonus bucket', rsx + 42, rsy);
    ctx.fillStyle = '#ffe033';
    ctx.fillText('Z / Enter', rsx, rsy + 16);
    ctx.fillStyle = '#ccc';
    ctx.fillText('\u2014 confirm selection', rsx + 68, rsy + 16);
    ctx.fillStyle = '#aaa';
    ctx.fillText('Each card shows orbs + an item — you get both!', rsx, rsy + 32);

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
    // ── Music state management ──
    if (this.menuActive || this.controlsScreen || this.mainMenuScreen) {
      Music.play('menu');
    } else if (this.gameWon || this.gameOver) {
      if (Music.playing) Music.stop();
    } else if (this.bossActive && this.boss) {
      Music.play(BOSS_MUSIC[this.boss.bossType] || GENERAL_BOSS_TRACKS[this.wave % 3]);
    } else {
      if (this.levelType === 'tower') Music.play('tower');
      else if (this.levelType === 'arena') Music.play('arena');
      else if (this.wave <= 3) Music.play('stage1');
      else if (this.wave <= 7) Music.play('stage2');
      else Music.play('stage3');
    }

    if (this.menuActive) {
      this.renderMenu();
      return;
    }
    if (this.mainMenuScreen) {
      this.renderMainMenu();
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
    } else if (this.levelElement && ELEMENT_LEVEL_THEMES[this.levelElement]) {
      const th = ELEMENT_LEVEL_THEMES[this.levelElement];
      grad.addColorStop(0, th.skyTop);
      grad.addColorStop(1, th.skyBot);
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
    const elemTheme = (!fireUltSky && !shadowUltSky && !stormUltSky && !bubbleUltSky && this.levelElement)
      ? ELEMENT_LEVEL_THEMES[this.levelElement] : null;
    ctx.fillStyle = fireUltSky ? '#2a0a0a' : (shadowUltSky ? '#080818' : (stormUltSky ? '#0a0a1e' : (bubbleUltSky ? '#0a2040' : (elemTheme ? elemTheme.mountainColor : '#1a1a3a'))));
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
    //this.renderSpawnHouse(ctx, cam);

    // Fog clouds in background (before platforms)
    this._renderWeather(ctx, cam, true);

    // Level hazards (below platforms)
    this._renderHazards(ctx, cam);

    // ── Objective world rendering ──
    // Zone: glowing rectangle in world space (render before platforms so it appears in background)
    if (this.objZone && !this.bossActive) {
      const z = this.objZone;
      const zsx = z.x - cam.x, zsy = z.y - cam.y;
      const _pl = this.player;
      const _inZone = _pl.x + _pl.w > z.x && _pl.x < z.x + z.w &&
                      _pl.y + _pl.h > z.y && _pl.y < z.y + z.h;
      const t = this.tick;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t * 0.05) * 0.06;
      ctx.fillStyle = _inZone ? '#44ff88' : '#88aaff';
      ctx.fillRect(zsx, zsy, z.w, z.h);
      ctx.globalAlpha = _inZone ? 0.9 : (0.5 + Math.sin(t * 0.08) * 0.3);
      ctx.strokeStyle = _inZone ? '#44ff88' : '#88aaff';
      ctx.lineWidth = _inZone ? 3 : 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(zsx, zsy, z.w, z.h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = _inZone ? '#44ff88' : '#aac';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(_inZone ? '◈ HOLD' : '◈ ZONE', zsx + z.w / 2, zsy - 5);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    for (const r of this.ropes || []) r.render(ctx, cam);
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

    // Samurai NPC (rendered after stoneBlocks, in front of platforms)
    if (this.samurai) {
      const sam = this.samurai;
      const sx = sam.x - cam.x, sy = sam.y - cam.y;
      ctx.save();
      const flash = sam.flashTimer > 0 && Math.floor(sam.flashTimer / 3) % 2;
      ctx.globalAlpha = sam.dead ? 0.35 : (flash ? 0.5 : 1);
      ctx.fillStyle = sam.dead ? '#333' : '#8060a0'; ctx.fillRect(sx + 4, sy - 3, 10, 5); ctx.fillRect(sx + 8, sy - 7, 3, 5);
      ctx.fillStyle = sam.dead ? '#555' : '#e8c880'; ctx.fillRect(sx + 5, sy, 8, 9);
      ctx.fillStyle = sam.dead ? '#444' : '#c8a060'; ctx.fillRect(sx + 4, sy + 8, 10, 16);
      ctx.fillStyle = sam.dead ? '#444' : '#a08040'; ctx.fillRect(sx + 14, sy + 8, 3, 12);
      ctx.fillStyle = sam.dead ? '#555' : '#e0e8ff'; ctx.fillRect(sx + 15, sy + 3, 2, 8);
      ctx.fillStyle = sam.dead ? '#333' : '#6040a0'; ctx.fillRect(sx + 4, sy + 24, 4, 6); ctx.fillRect(sx + 10, sy + 24, 4, 6);
      ctx.restore();
      if (!sam.dead) {
        const bw = 36, bh = 5;
        const bx = sx + sam.w / 2 - bw / 2, by2 = sy - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by2 - 1, bw + 2, bh + 2);
        ctx.fillStyle = sam.hp > sam.maxHp * 0.5 ? '#4f4' : (sam.hp > sam.maxHp * 0.25 ? '#fa0' : '#f44');
        ctx.fillRect(bx, by2, Math.round(bw * sam.hp / sam.maxHp), bh);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(bx, by2, bw, bh);
        ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('SAM', bx + bw / 2, by2 - 2); ctx.textAlign = 'left';
      }
    }
    for (const b of this.bubbles) b.render(ctx, cam);
    for (const o of this.orbs) o.render(ctx, cam);
    for (const bi of this.bossItems) bi.render(ctx, cam);

    for (const sp of this.shurikenPickups) sp.render(ctx, cam);
    for (const bp of this.bubbleShieldPickups) bp.render(ctx, cam);
    for (const bo of this.bossOrbPickups) {
      if (bo.done) continue;
      const flash = bo.life < 120 && Math.floor(bo.life / 8) % 2;
      if (flash) continue;
      const alpha = bo.life < 60 ? bo.life / 60 : 1;
      const bx = bo.x - cam.x;
      const by = bo.y + Math.sin(bo.bobTimer) * 8 - cam.y;
      ctx.save();
      ctx.globalAlpha = alpha;
      const t = this.tick;
      ctx.shadowColor = '#f80';
      ctx.shadowBlur = 16 + Math.sin(t * 0.12) * 6;
      ctx.strokeStyle = '#fa0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx + 14, by + 14, 16 + Math.sin(t * 0.08) * 2, 0, Math.PI * 2);
      ctx.stroke();
      const grad = ctx.createRadialGradient(bx + 14, by + 14, 2, bx + 14, by + 14, 12);
      grad.addColorStop(0, '#fff8e0');
      grad.addColorStop(0.5, '#f80');
      grad.addColorStop(1, '#a40');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx + 14, by + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2605', bx + 14, by + 19);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    if (this.crystalCastle) this.crystalCastle.render(ctx, cam);
    for (const h of this.hitLines) h.render(ctx, cam);
    for (const p of this.projectiles) p.render(ctx, cam);
    for (const g of this.grenades) g.render(ctx, cam);
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

    // Hunt objective: draw target marker over matching enemies
    if (this.currentObjective && this.currentObjective.type === 'hunt' && !this.bossActive) {
      const t = this.tick;
      for (const e of this.enemies) {
        if (e.dead || !e.isHuntTarget) continue;
        const ex = e.x + e.w / 2 - cam.x;
        const ey = e.y - cam.y;
        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(t * 0.12) * 0.2;
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 8;
        // Diamond target indicator above enemy
        const ds = 8;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 16 - ds);
        ctx.lineTo(ex + ds, ey - 16);
        ctx.lineTo(ex, ey - 16 + ds);
        ctx.lineTo(ex - ds, ey - 16);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

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

    // Weather overlay (on top of everything except UI — fog handled in background)
    this._renderWeather(ctx, cam, false);
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

    // ── Bottom HUD ──
    const manaColors = { fire: '#f93', earth: '#8b5e3c', bubble: '#6af', shadow: '#a4e', crystal: '#0ff', wind: '#8d8', storm: '#48f' };
    const manaColor = manaColors[pl.ninjaType] || '#aaa';

    // Y anchors (all measured from bottom)
    const barH = 26;
    const barY   = CANVAS_H - barH - 6;  // 508
    const ultY   = CANVAS_H - 46;        // 494
    const buffY  = CANVAS_H - 50;        // 490
    const pipY   = CANVAS_H - 92;        // 448

    // Attack and magic charges recharge independently.

    // ── Buff icons ──
    const buffItems = [];
    const attrColors = {
      mind: (ITEM_ATTRIBUTES.mind && ITEM_ATTRIBUTES.mind.color) || '#b45cff',
      vigor: (ITEM_ATTRIBUTES.vigor && ITEM_ATTRIBUTES.vigor.color) || '#ff6a3d',
      dexterity: (ITEM_ATTRIBUTES.dexterity && ITEM_ATTRIBUTES.dexterity.color) || '#39d98a',
    };
    const baseAtk = pl.type.attackDamage;
    const totalAtk = baseAtk + pl.bonusDamage;
    buffItems.push({ icon: '\u2694', value: totalAtk, color: attrColors.vigor, hasBonus: pl.bonusDamage > 0, bonusVal: pl.bonusDamage });
    const totalEle = baseAtk + pl.bonusElemental;
    buffItems.push({ icon: '\u2737', value: totalEle, color: attrColors.mind, hasBonus: pl.bonusElemental > 0, bonusVal: pl.bonusElemental });
    buffItems.push({ icon: '\u00bb', value: pl.bonusSpeed, color: attrColors.dexterity });
    buffItems.push({ icon: '\u2194', value: pl.bonusReach, color: attrColors.dexterity });
    buffItems.push({ icon: '\u26CA', value: pl.bonusArmor, color: attrColors.vigor });
    buffItems.push({ icon: '\u2665', value: this.lives, color: attrColors.vigor });
    buffItems.push({ icon: '\u2726', value: pl.maxShurikens, color: attrColors.dexterity });
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
      for (let i = 0; i < buffItems.length; i++) {
        const b = buffItems[i];
        ctx.fillStyle = b.color;
        ctx.fillText(b.icon, bx, buffY);
        const iconW = ctx.measureText(b.icon).width;
        ctx.fillStyle = b.color;
        ctx.fillText(String(b.value), bx + iconW + 3, buffY);
        if (b.hasBonus) {
          const valW = ctx.measureText(String(b.value)).width;
          ctx.font = '10px monospace';
          ctx.fillStyle = b.color;
          ctx.fillText(`+${b.bonusVal}`, bx + iconW + 3 + valW + 2, buffY);
          ctx.font = 'bold 14px monospace';
        }
        bx += itemWidths[i] + 14;
      }
    }

    // ── HP bar — ninja-colored, ult charge shown as glow ──
    const ninjaBarColors = {
      fire:    { fill: '#f93', dark: '#421800', delay: '#fa8' },
      earth:   { fill: '#a07040', dark: '#301808', delay: '#c09060' },
      bubble:  { fill: '#4af', dark: '#013040', delay: '#8cf' },
      shadow:  { fill: '#a04ec8', dark: '#200840', delay: '#c080e8' },
      crystal: { fill: '#0ee', dark: '#005050', delay: '#7ff' },
      wind:    { fill: '#6c6', dark: '#082008', delay: '#9e9' },
      storm:   { fill: '#38e', dark: '#0a1428', delay: '#6af' },
    };
    const nbc = ninjaBarColors[pl.ninjaType] || { fill: '#e44', dark: '#400', delay: '#f84' };

    const centerX = CANVAS_W / 2;
    const barTotalW = 440;
    const barLeft = centerX - barTotalW / 2;
    const drawChargePips = (label, charges, timer, x, y, color) => {
      const max = pl.actionChargeMax || 3;
      const recharge = pl.actionRechargeMax || 180;
      const safeCharges = Math.max(0, Math.min(max, charges || 0));
      ctx.save();
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(label, x - 8, y + 9);
      ctx.textAlign = 'left';
      for (let i = 0; i < max; i++) {
        const px = x + i * 18;
        ctx.fillStyle = i < safeCharges ? color : 'rgba(255,255,255,0.14)';
        ctx.fillRect(px, y, 12, 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, y, 12, 12);
      }
      if (safeCharges < max) {
        const px = x + safeCharges * 18;
        const pct = Math.min(1, (timer || 0) / recharge);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(px, y + 12 - 12 * pct, 12, 12 * pct);
      }
      ctx.restore();
    };
    const chargeMax = pl.actionChargeMax || 3;
    const chargePipW = (chargeMax - 1) * 18 + 12;
    const chargeLabelW = 28;
    const chargeGap = 48;
    const chargeGroupW = chargeLabelW + 8 + chargePipW;
    const attackFocusW = 112;
    const attackFocusH = 12;
    const attackGroupW = 28 + 8 + attackFocusW;
    const chargeLeft = centerX - (attackGroupW + chargeGap + chargeGroupW) / 2;
    const focusX = chargeLeft + 28 + 8;
    const focusPct = Math.max(0, Math.min(1, pl.attackFocus === undefined ? 1 : pl.attackFocus));
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = attrColors.vigor;
    ctx.fillText('ATK', focusX - 8, pipY + 9);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(focusX, pipY, attackFocusW, attackFocusH);
    ctx.fillStyle = attrColors.vigor;
    ctx.fillRect(focusX, pipY, attackFocusW * focusPct, attackFocusH);
    ctx.strokeStyle = attrColors.vigor;
    ctx.lineWidth = 1;
    ctx.strokeRect(focusX, pipY, attackFocusW, attackFocusH);
    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 9px monospace';
    const focusLabel = Math.round(focusPct * 100) + '%';
    ctx.fillText(focusLabel, focusX + attackFocusW + 6, pipY + 10);
    ctx.restore();
    drawChargePips('MAG', pl.specialCharges, pl.specialRechargeTimer, chargeLeft + attackGroupW + chargeGap + chargeLabelW + 8, pipY, attrColors.mind);
    const hpRatio = pl.hp / pl.maxHp;
    const displayHpRatio = pl.displayHp / pl.maxHp;

    const ultPct = pl.ultimateCharge / pl.ultimateMax;
    const ultReady = pl.ultimateReady && !pl.ultimateActive;
    const ultActive = pl.ultimateActive;
    const blinkOn = Math.floor(this.tick / 15) % 2 === 0;

    // Glow pass (background rect carries the outer glow)
    ctx.save();
    if (ultActive) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 22;
    } else if (ultReady) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = blinkOn ? 24 : 10;
    } else if (ultPct >= 0.5) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = (ultPct - 0.5) / 0.5 * 12;
    }
    ctx.fillStyle = nbc.dark;
    ctx.fillRect(barLeft, barY, barTotalW, barH);
    ctx.restore();

    // Delayed damage
    if (displayHpRatio > hpRatio) {
      ctx.fillStyle = nbc.delay;
      ctx.fillRect(barLeft, barY, barTotalW * displayHpRatio, barH);
    }

    // Active fill (also glows when ult ready/active)
    ctx.save();
    if (ultActive) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14; }
    else if (ultReady) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = blinkOn ? 16 : 6; }
    ctx.fillStyle = nbc.fill;
    ctx.fillRect(barLeft, barY, barTotalW * hpRatio, barH);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barLeft, barY, barTotalW, barH);

    // Label: show ult state inside bar
    const hpLabel = 'HP ' + String(Math.round(pl.hp)) + ' / ' + String(pl.maxHp);
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(hpLabel, centerX + 1, barY + barH - 4);
    ctx.fillStyle = (ultReady || ultActive) ? '#ffd700' : attrColors.vigor;
    ctx.fillText(hpLabel, centerX, barY + barH - 5);
    ctx.textAlign = 'left';

    // Bubble shield timer strip (directly below the HP bar)
    if (pl.bubbleShieldTimer > 0) {
      const shieldRatio = pl.bubbleShieldTimer / pl.bubbleShieldMax;
      const shY = barY + barH + 4;
      const shH = 5;
      const pulse = 0.55 + 0.2 * Math.sin(this.tick * 0.2);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(barLeft, shY, barTotalW, shH);
      ctx.shadowColor = '#4af';
      ctx.shadowBlur = shieldRatio < 0.25 ? 12 + Math.sin(this.tick * 0.4) * 6 : 8;
      ctx.fillStyle = `rgba(80,180,255,${pulse})`;
      ctx.fillRect(barLeft, shY, barTotalW * shieldRatio, shH);
      ctx.strokeStyle = 'rgba(160,230,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barLeft, shY, barTotalW, shH);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText('SHIELD', centerX + 1, shY + shH + 9);
      ctx.fillStyle = '#aef';
      ctx.fillText('SHIELD', centerX, shY + shH + 8);
      ctx.textAlign = 'left';
      ctx.restore();
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

    // Boss Items display (left side, vertically centered)
    this.renderItemBar(pl);

    // Room info panel (top right, below ninja bar)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(CANVAS_W - 218, 36, 210, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_W - 218, 36, 210, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(this._roomProgressLabel(), CANVAS_W - 210, 52);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`Kills: ${this.totalKills}`, CANVAS_W - 210, 66);

    // ── Objective indicator (bottom-left of wave panel) ──
    if (false && this.currentObjective && !this.gameWon && !this.bossActive) {
      const _obj = this.currentObjective;
      const _ox = CANVAS_W - 175, _oy = 74;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(_ox, _oy, 167, 22);
      ctx.strokeStyle = 'rgba(255,220,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(_ox, _oy, 167, 22);
      const _iconColor = _obj.type === 'survive' ? '#f44' : (_obj.type === 'zone' ? '#88f' : (_obj.type === 'hunt' ? '#ff0' : (_obj.type === 'defend' ? '#4f4' : (_obj.type === 'collect' ? '#ccc' : '#f80'))));
      ctx.fillStyle = _iconColor;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(_obj.icon || '◆', _ox + 6, _oy + 15);
      ctx.fillStyle = '#ddd';
      ctx.font = '10px monospace';
      ctx.fillText(_obj.label, _ox + 20, _oy + 15);
      // Show extra live state
      if (_obj.type === 'zone' && this.objZone) {
        const _pl2 = this.player;
        const _inZ = _pl2.x + _pl2.w > this.objZone.x && _pl2.x < this.objZone.x + this.objZone.w &&
                     _pl2.y + _pl2.h > this.objZone.y && _pl2.y < this.objZone.y + this.objZone.h;
        ctx.fillStyle = _inZ ? '#4f4' : '#f84';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(_inZ ? '◈ IN ZONE' : '◈ FIND ZONE', _ox + 85, _oy + 15);
      } else if (_obj.type === 'defend' && this.samurai) {
        ctx.fillStyle = this.samurai.dead ? '#f44' : '#4f4';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(this.samurai.dead ? '✕ FALLEN' : '♥ ALIVE', _ox + 90, _oy + 15);
      }
    }

    // Boss Summon Orb HUD (top center) — placeholder circles that fill when charge builds
    if (!this.gameWon && !(this.boss && !this.boss.dead)) {
      const objCx = CANVAS_W / 2;
      const objBarW = 420, objBarH = 24;
      const objBarX = objCx - objBarW / 2, objBarY = 40;
      const objectivePct = this._objectiveProgressRatio();
      const objectiveAccent = this.levelElement && ELEMENT_COLORS[this.levelElement] ? ELEMENT_COLORS[this.levelElement].accent : '#f80';
      const roomDef = MAP_ROOM_BY_ID[this.currentRoomId];
      const objectiveName = ((this.currentObjective && this.currentObjective.label) || 'Defeat Enemies').trim();
      const objectivePrefix = /^objective$/i.test(objectiveName) ? '' : 'OBJECTIVE: ';
      const objLabel = this.bossActive
        ? 'BOSS ACTIVE'
        : objectivePrefix + objectiveName + this._objectiveProgressText();
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.fillRect(objBarX, objBarY, objBarW, objBarH);
      ctx.fillStyle = objectiveAccent;
      ctx.globalAlpha = 0.72;
      ctx.fillRect(objBarX, objBarY, objBarW * objectivePct, objBarH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = objectiveAccent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(objBarX, objBarY, objBarW, objBarH);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillText(objLabel, objCx + 1, objBarY + 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(objLabel, objCx, objBarY + 15);
      if (roomDef) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#bbb';
        ctx.fillText(roomDef.name, objCx, objBarY + 35);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    }

    if (false && !this.gameWon && !(this.boss && !this.boss.dead)) {
      const cx = CANVAS_W / 2;
      if (this.bossActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - 72, 38, 144, 20);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS ' + this.wave + '/' + TOTAL_WAVES, cx, 52);
        ctx.textAlign = 'left';
        ctx.restore();
      } else {
        const req = this.bossOrbsRequired;
        const col = this.bossOrbsCollected;
        const chargePct = Math.min(1, this.bossOrbCharge / this.bossOrbChargeMax);
        const onCooldown = this.bossOrbCooldown > 0;
        const t = this.tick;
        const R = 12;
        const spacing = 34;
        const oy = 50; // center Y of orb circles
        const accent = this.levelElement
          ? (ELEMENT_COLORS[this.levelElement] ? ELEMENT_COLORS[this.levelElement].accent : '#f80')
          : '#f80';

        for (let i = 0; i < req; i++) {
          const ox = cx - (req - 1) * spacing / 2 + i * spacing;
          ctx.save();
          if (i < col) {
            // ── Collected: bright filled orb ──
            const pulse = Math.sin(t * 0.07 + i * 1.2) * 5;
            ctx.shadowColor = accent;
            ctx.shadowBlur = 14 + pulse;
            const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, R);
            g.addColorStop(0, '#fffbe8');
            g.addColorStop(0.45, accent);
            g.addColorStop(1, '#70200a');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('\u2605', ox, oy + 4);
          } else if (i === col) {
            // ── Next slot to fill: shows charge progress ──
            const pulseAmt = onCooldown
              ? 1 + Math.abs(Math.sin(t * 0.025)) * 2
              : 2 + chargePct * 10 + Math.abs(Math.sin(t * (0.06 + chargePct * 0.05))) * (chargePct * 6);
            ctx.shadowColor = onCooldown ? '#443' : accent;
            ctx.shadowBlur = pulseAmt;
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = onCooldown ? '#333' : accent;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = onCooldown ? 0.3 : 0.35 + chargePct * 0.65;
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.stroke();
            if (!onCooldown && chargePct > 0.01) {
              ctx.globalAlpha = 0.5 + chargePct * 0.45;
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(ox, oy, R - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargePct);
              ctx.stroke();
            }
          } else {
            // ── Future slots: static dark placeholder ──
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
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
      const bossElemAccent = (b.element && ELEMENT_COLORS[b.element]) ? ELEMENT_COLORS[b.element].accent : null;
      ctx.fillStyle = bossElemAccent || (b.phase === 2 ? '#f22' : '#e44');
      ctx.fillRect(pbX, pbY, pbW * hpRatio, pbH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pbX, pbY, pbW, pbH);
      // Boss label inside bar: "30/50 (RONIN BOSS)"
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      const bossLabel = `${Math.ceil(b.hp)}/${b.maxHp} (${b.name})`;
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

    if (this.itemRewardScreen) {
      this.renderItemRewardScreen(ctx);
    }

    if (this.mapScreen && !this.itemRewardScreen) {
      this.renderMapScreen(ctx);
    }

    // Path choice overlay — combined boss selection + reward preview
    if (this.pathChoiceScreen) {
      const pcs = this.pathChoiceScreen;
      const choices = pcs.choices;
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      let bannerH = 0;

      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      const titleTxt = 'Choose Your Path';
      ctx.fillText(titleTxt, CANVAS_W / 2 - ctx.measureText(titleTxt).width / 2, bannerH + 28);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#aaa';
      const subTxt = pcs.delay > 0
        ? '\u22ef ' + Math.ceil(pcs.delay / 60) + '\u22ef'
        : '\u2190 A/D \u2192 choose path   Z confirm';
      ctx.fillText(subTxt, CANVAS_W / 2 - ctx.measureText(subTxt).width / 2, bannerH + 46);

      // Cards
      const cardW = 218, cardH = 390, cardGap = 12;
      const numCards = choices.length;
      const totalCardW = cardW * numCards + cardGap * (numCards - 1);
      const startCX = CANVAS_W / 2 - totalCardW / 2;
      const startCY = bannerH + 56;

      for (let ci = 0; ci < numCards; ci++) {
        const ch = choices[ci];
        const cx = startCX + ci * (cardW + cardGap);
        const cy = startCY;
        const isSel = ci === pcs.selected;
        const elemColors = ch.element ? ELEMENT_COLORS[ch.element] : null;
        const borderColor = isSel ? (elemColors ? elemColors.accent : '#ffe033') : (elemColors ? elemColors.body : '#444');

        // Card bg
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,20,0.80)';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isSel ? 3 : 1.5;
        ctx.strokeRect(cx, cy, cardW, cardH);

        // Element color strip at top
        if (elemColors) {
          ctx.fillStyle = elemColors.body;
          ctx.fillRect(cx, cy, cardW, 5);
        }

        // ── Boss sprite preview (top 110px) ──
        const previewCX = cx + cardW / 2;
        const previewCY = cy + 62;
        this._drawBossPreview(ctx, ch.bossType, ch.element, previewCX, previewCY);

        // Boss name
        ctx.fillStyle = isSel ? '#fff' : '#ccc';
        ctx.font = 'bold 15px monospace';
        const bossLabel = ch.bossName;
        ctx.fillText(bossLabel, cx + cardW / 2 - ctx.measureText(bossLabel).width / 2, cy + 125);

        // Element / variant tag
        if (ch.element && elemColors) {
          ctx.fillStyle = elemColors.accent;
          ctx.font = 'bold 11px monospace';
          const elLabel = '\u25c6 ' + ch.element.toUpperCase() + ' VARIANT';
          ctx.fillText(elLabel, cx + cardW / 2 - ctx.measureText(elLabel).width / 2, cy + 142);
          // Difficulty stars
          const mult = ELEMENT_BUDGET_MULT[ch.element] || 1.0;
          const stars = Math.max(1, Math.round((mult - 1.0) / 0.1));
          ctx.fillStyle = '#ffd700';
          ctx.font = '12px monospace';
          const starStr = '\u2605'.repeat(Math.min(stars, 7));
          ctx.fillText(starStr, cx + cardW / 2 - ctx.measureText(starStr).width / 2, cy + 158);
        } else {
          ctx.fillStyle = '#888';
          ctx.font = '11px monospace';
          const normalLabel = '\u25cb NORMAL';
          ctx.fillText(normalLabel, cx + cardW / 2 - ctx.measureText(normalLabel).width / 2, cy + 142);
        }

        // ── Objective section ──
        if (ch.objective) {
          const _chObj = ch.objective;
          const _objIconColor = _chObj.type === 'survive' ? '#f44' : (_chObj.type === 'zone' ? '#88f' : (_chObj.type === 'hunt' ? '#ff0' : (_chObj.type === 'defend' ? '#4f4' : (_chObj.type === 'collect' ? '#ccc' : '#f80'))));
          ctx.fillStyle = _objIconColor;
          ctx.font = 'bold 12px monospace';
          ctx.fillText(_chObj.icon || '◆', cx + 14, cy + 164);
          ctx.fillStyle = isSel ? '#ddd' : '#aaa';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(_chObj.label, cx + 28, cy + 164);
        }

        // Divider
        ctx.strokeStyle = isSel ? (elemColors ? elemColors.body : '#555') : '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy + 170);
        ctx.lineTo(cx + cardW - 12, cy + 170);
        ctx.stroke();

        // ── Rewards section ──
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText('REWARDS', cx + 12, cy + 183);

        if (ch.reward && ch.meta) {
          const _orbOrder = ['element','elDmg','damage','armor','speed','reach','shuriken','maxhp','ultcharge','heal'];
          const entries = Object.entries(ch.reward)
            .sort((a, b) => _orbOrder.indexOf(a[0]) - _orbOrder.indexOf(b[0]));
          let ey = cy + 197;
          for (const [type, count] of entries) {
            const m = ch.meta[type];
            if (!m) continue;
            const totalVal = count * m.per;
            ctx.fillStyle = m.color;
            ctx.font = 'bold 13px monospace';
            ctx.fillText(m.icon, cx + 14, ey + 3);
            ctx.font = '11px monospace';
            ctx.fillText('+' + totalVal + ' ' + m.label, cx + 32, ey + 3);
            if (count > 1) {
              ctx.fillStyle = '#666';
              ctx.font = '9px monospace';
              ctx.fillText('x' + count, cx + cardW - 28, ey + 2);
            }
            ey += 20;
            if (ey > cy + cardH - 100) break; // leave room for item section
          }
        }

        // Selection arrow
        if (isSel) {
          ctx.fillStyle = elemColors ? elemColors.accent : '#ffe033';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('\u25bc', cx + cardW / 2 - 7, cy + cardH - 12);
        }

        // ── Element ambient particles (drawn on top of card content) ──
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx + 1, cy + 1, cardW - 2, cardH - 2);
        ctx.clip();
        const t = this.tick;
        const alpha = isSel ? 0.90 : 0.60;
        if (ch.element === 'fire') {
          // Rising ember sparks with glow
          for (let k = 0; k < 14; k++) {
            const phase = (t * 1.4 + k * 31) % (cardH + 20);
            const px = cx + 10 + ((k * 53 + 17) % (cardW - 20));
            const py = cy + cardH - phase;
            const r = 2.5 + (k % 3) * 1.2;
            const col = k % 2 === 0 ? '#ff6a00' : '#ffcc00';
            ctx.globalAlpha = alpha * (0.4 + 0.6 * (phase / (cardH + 20)));
            ctx.shadowColor = col; ctx.shadowBlur = 8;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowBlur = 0;
        } else if (ch.element === 'ghost') {
          // Drifting wisp rings with glow
          for (let k = 0; k < 7; k++) {
            const phase = (t * 0.7 + k * 55) % 280;
            const px = cx + 16 + ((k * 47 + 10) % (cardW - 32));
            const py = cy + cardH * 0.25 + Math.sin(t * 0.05 + k * 1.2) * 40 - phase * 0.2;
            const fade = 1 - phase / 280;
            ctx.globalAlpha = alpha * fade;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12;
            ctx.strokeStyle = k % 2 === 0 ? '#7cfc00' : '#00ff88';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(px, py, 7 + k * 2.5, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.shadowBlur = 0;
        } else if (ch.element === 'water') {
          // Falling raindrops with shimmer
          for (let k = 0; k < 18; k++) {
            const phase = (t * 3.0 + k * 29) % (cardH + 16);
            const px = cx + 6 + ((k * 13 + 3) % (cardW - 12));
            const py = cy + phase;
            ctx.globalAlpha = alpha * 0.85;
            ctx.shadowColor = '#4af'; ctx.shadowBlur = 6;
            ctx.strokeStyle = k % 3 === 0 ? '#8ef' : '#4af';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 1, py + 7); ctx.stroke();
          }
          ctx.shadowBlur = 0;
        } else if (ch.element === 'crystal') {
          // Rotating sparkle crosses with glow
          for (let k = 0; k < 8; k++) {
            const px = cx + 16 + ((k * 29 + 8) % (cardW - 32));
            const py = cy + 20 + ((k * 41 + 14) % (cardH - 36));
            const angle = (t * 0.05 + k * 0.7) % (Math.PI * 2);
            ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * 0.08 + k));
            ctx.shadowColor = '#aef'; ctx.shadowBlur = 10;
            ctx.strokeStyle = k % 2 === 0 ? '#aef' : '#fff';
            ctx.lineWidth = 1.5;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            const s = 6 + k % 4;
            ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
            ctx.restore();
          }
          ctx.shadowBlur = 0;
        } else if (ch.element === 'wind') {
          // Sweeping streaks across the full card
          for (let k = 0; k < 10; k++) {
            const phase = (t * 4.5 + k * 41) % (cardW + 80);
            const py = cy + 16 + ((k * 37) % (cardH - 28));
            const px = cx - 30 + phase;
            const len = 24 + (k % 4) * 8;
            ctx.globalAlpha = alpha * (0.4 + 0.6 * (1 - Math.abs(phase - (cardW / 2 + 40)) / (cardW / 2 + 40)));
            ctx.shadowColor = '#8f8'; ctx.shadowBlur = 6;
            ctx.strokeStyle = k % 2 === 0 ? '#cfc' : '#8f8';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + len, py + 4); ctx.stroke();
          }
          ctx.shadowBlur = 0;
        } else if (ch.element === 'lightning') {
          // Persistent edge sparks + periodic full bolt
          const bolt = Math.floor(t / 12) % 8 === 0;
          if (bolt) {
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#6ff'; ctx.shadowBlur = 16;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            const by = cy + cardH * 0.5 + (Math.sin(t * 0.3) * 30);
            ctx.beginPath();
            let lx = cx + 6;
            ctx.moveTo(lx, by);
            while (lx < cx + cardW - 6) {
              lx += 8 + Math.random() * 10;
              ctx.lineTo(lx, by + (Math.random() * 18 - 9));
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          // Persistent crackling corner sparks
          const corners = [[cx + 6, cy + 6], [cx + cardW - 6, cy + 6], [cx + 6, cy + cardH - 6], [cx + cardW - 6, cy + cardH - 6]];
          for (let k = 0; k < 4; k++) {
            ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.18 + k * 1.8)));
            ctx.shadowColor = '#6ff'; ctx.shadowBlur = 14;
            ctx.fillStyle = '#6ff';
            ctx.beginPath(); ctx.arc(corners[k][0], corners[k][1], 3.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowBlur = 0;
          // Arc lines from edges
          for (let k = 0; k < 3; k++) {
            if ((t + k * 7) % 20 < 3) {
              const ey = cy + 30 + k * 110;
              ctx.globalAlpha = alpha * 0.8;
              ctx.shadowColor = '#6ff'; ctx.shadowBlur = 8;
              ctx.strokeStyle = '#6ff'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(cx + 1, ey);
              ctx.lineTo(cx + 12 + Math.random() * 10, ey + (Math.random() * 16 - 8));
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
        } else if (ch.element === 'spiky') {
          // Falling rock chunks
          for (let k = 0; k < 12; k++) {
            const phase = (t * 2.2 + k * 33) % (cardH + 24);
            const px = cx + 8 + ((k * 19 + 5) % (cardW - 16));
            const py = cy + phase - 12;
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = k % 3 === 0 ? '#c8a' : k % 3 === 1 ? '#a86' : '#745';
            const s = 3 + k % 4;
            ctx.fillRect(px, py, s, s);
            // small shadow below
            ctx.globalAlpha = alpha * 0.25;
            ctx.fillStyle = '#000';
            ctx.fillRect(px + 1, py + s, s - 1, 2);
          }
        } else {
          // Normal: drifting light orbs
          for (let k = 0; k < 6; k++) {
            const phase = (t * 0.5 + k * 75) % 360;
            const px = cx + cardW * 0.2 + Math.sin(phase * Math.PI / 180 + k) * cardW * 0.38;
            const py = cy + cardH * 0.5 + Math.cos(phase * Math.PI / 180 + k * 0.8) * cardH * 0.28;
            ctx.globalAlpha = alpha * 0.55;
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
        ctx.restore();
        // ── Item reward embedded in card ──
        const _cItem = (pcs.itemChoices && pcs.itemChoices[ci]) || null;
        const _cItemDef = _cItem ? BOSS_ITEMS[_cItem] : null;
        if (_cItemDef) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = isSel ? '#555' : '#2a2a2a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx + 12, cy + cardH - 92); ctx.lineTo(cx + cardW - 12, cy + cardH - 92); ctx.stroke();
          ctx.fillStyle = '#666'; ctx.font = '9px monospace';
          ctx.fillText('ITEM REWARD', cx + 12, cy + cardH - 79);
          if (isSel) { ctx.shadowColor = _cItemDef.color; ctx.shadowBlur = 8; }
          drawItemIcon(ctx, _cItem, cx + 20, cy + cardH - 56, 18, _cItemDef.color);
          ctx.shadowBlur = 0;
          ctx.fillStyle = isSel ? _cItemDef.color : '#aaa'; ctx.font = 'bold 11px monospace';
          ctx.fillText(_cItemDef.name, cx + 36, cy + cardH - 63);
          ctx.fillStyle = '#777'; ctx.font = '9px monospace';
          const _ciWords = _cItemDef.desc.split(' ');
          let _ciLn = '', _ciY = cy + cardH - 49, _ciN = 0;
          for (const _cw of _ciWords) {
            const _ct = _ciLn ? _ciLn + ' ' + _cw : _cw;
            if (ctx.measureText(_ct).width > cardW - 50) {
              ctx.fillText(_ciLn, cx + 36, _ciY); _ciLn = _cw; _ciY += 11; _ciN++;
              if (_ciN >= 2) break;
            } else _ciLn = _ct;
          }
          if (_ciLn && _ciN < 2) ctx.fillText(_ciLn, cx + 36, _ciY);
        }
      }
    }

    // Orb bucket choice overlay
    if (this.orbBucketChoice) {
      const obc = this.orbBucketChoice;
      const meta = obc.meta;
      // Darken
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      let headerH = 60;
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
        : '\u2190 A/D \u2192 choose bonus   Z confirm';
      const subW = ctx.measureText(sub).width;
      ctx.fillText(sub, CANVAS_W / 2 - subW / 2, headerH + 40);
      // Draw 3 buckets
      const boxW = 200, boxH = 268, boxGap = 30;
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
        const _orbOrder = ['element','elDmg','damage','armor','speed','reach','shuriken','maxhp','ultcharge','heal'];
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
          if (ey > by + boxH - 76) break; // leave room for item section
        }
        // ── Item reward embedded in bucket ──
        const _bItem = (obc.itemChoices && obc.itemChoices[b]) || null;
        const _bItemDef = _bItem ? BOSS_ITEMS[_bItem] : null;
        if (_bItemDef) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = isSel ? '#555' : '#2a2a2a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + 8, by + boxH - 72); ctx.lineTo(bx + boxW - 8, by + boxH - 72); ctx.stroke();
          ctx.fillStyle = '#666'; ctx.font = '9px monospace';
          ctx.fillText('ITEM REWARD', bx + 10, by + boxH - 59);
          if (isSel) { ctx.shadowColor = _bItemDef.color; ctx.shadowBlur = 8; }
          drawItemIcon(ctx, _bItem, bx + 18, by + boxH - 38, 18, _bItemDef.color);
          ctx.shadowBlur = 0;
          ctx.fillStyle = isSel ? _bItemDef.color : '#aaa'; ctx.font = 'bold 11px monospace';
          ctx.fillText(_bItemDef.name, bx + 34, by + boxH - 44);
          ctx.fillStyle = '#777'; ctx.font = '9px monospace';
          const _biWords = _bItemDef.desc.split(' ');
          let _biLn = '', _biY = by + boxH - 30, _biN = 0;
          for (const _bw of _biWords) {
            const _bt = _biLn ? _biLn + ' ' + _bw : _bw;
            if (ctx.measureText(_bt).width > boxW - 44) {
              ctx.fillText(_biLn, bx + 34, _biY); _biLn = _bw; _biY += 11; _biN++;
              if (_biN >= 1) break;
            } else _biLn = _bt;
          }
          if (_biLn && _biN < 2) ctx.fillText(_biLn, bx + 34, _biY);
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
      const gost = `${this._roomProgressLabel()}  Kills: ${this.totalKills}  Deaths: ${this.deaths}`;
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

    // Re-render spikes on top of UI so they're always visible
    for (const s of this.spikes) s.render(ctx, cam);

    // Restore camera after shake offset
    cam.x -= screenShakeX;
    cam.y -= screenShakeY;
  }

  renderItemRewardScreen(ctx) {
    const rs = this.itemRewardScreen;
    const itemId = rs && rs.itemId;
    const def = itemId ? BOSS_ITEMS[itemId] : null;
    if (!def) return;
    const attr = ITEM_ATTRIBUTES[def.attr] || ITEM_ATTRIBUTES.mind;
    ctx.fillStyle = 'rgba(0,0,0,0.86)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const boxW = 520, boxH = 240;
    const boxX = CANVAS_W / 2 - boxW / 2;
    const boxY = CANVAS_H / 2 - boxH / 2;
    ctx.fillStyle = 'rgba(12,12,18,0.96)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = attr.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.shadowColor = attr.color;
    ctx.shadowBlur = 16;
    drawItemIcon(ctx, itemId, boxX + 78, boxY + 94, 70, def.color);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('BOSS REWARD', boxX + 140, boxY + 52);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = def.color;
    ctx.fillText(def.name, boxX + 140, boxY + 88);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = attr.color;
    ctx.fillText(attr.label.toUpperCase() + '  Lv.' + (def.complexity || 1), boxX + 140, boxY + 112);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ccc';
    const words = def.desc.split(' ');
    let line = '', yy = boxY + 142;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > boxW - 170) {
        ctx.fillText(line, boxX + 140, yy);
        line = w; yy += 16;
      } else line = test;
    }
    if (line) ctx.fillText(line, boxX + 140, yy);
    const optY = boxY + boxH - 62;
    const optW = 210, optH = 34;
    for (let i = 0; i < 2; i++) {
      const ox = boxX + 48 + i * (optW + 26);
      const selected = rs.selected === i;
      const col = i === 0 ? def.color : attr.color;
      ctx.fillStyle = selected ? 'rgba(255,224,51,0.16)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(ox, optY, optW, optH);
      ctx.strokeStyle = selected ? '#ffe033' : col;
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.strokeRect(ox, optY, optW, optH);
      ctx.fillStyle = col;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(i === 0 ? 'TAKE ITEM' : '+1 ' + attr.label.toUpperCase(), ox + 16, optY + 22);
    }
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(rs.delay > 0 ? '...' : 'A/D choose   Z confirm', boxX + 184, boxY + boxH - 12);
  }

  renderMapScreen(ctx) {
    const ms = this.mapScreen;
    ctx.fillStyle = 'rgba(0,0,0,0.84)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    const title = 'MISSION MAP';
    ctx.fillText(title, CANVAS_W / 2 - ctx.measureText(title).width / 2, 42);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    const hint = ms.delay > 0 ? '...' + Math.ceil(ms.delay / 60) : 'WASD / arrows select room   Q/E zoom   0 free travel   Z confirm';
    ctx.fillText(hint, CANVAS_W / 2 - ctx.measureText(hint).width / 2, 62);

    const mapX = 70, mapY = 88, mapW = 610, mapH = 390;
    const zoom = Math.max(0.3, Math.min(1.9, ms.zoom || this.mapZoom || 1));
    ms.zoom = zoom;
    const cellW = 74 * zoom;
    const cellH = 54 * zoom;
    const tileScale = Math.max(0.48, Math.min(1.22, zoom));
    const selectedForCamera = MAP_ROOM_DEFS[ms.selected] || MAP_ROOM_BY_ID[this.currentRoomId] || MAP_ROOM_DEFS[0];
    const mapCenterX = mapX + mapW / 2;
    const mapCenterY = mapY + mapH / 2;
    const roomX = room => mapCenterX + (room.col - selectedForCamera.col) * cellW;
    const roomY = room => mapCenterY + (room.row - selectedForCamera.row) * cellH;
    ctx.fillStyle = 'rgba(10,14,18,0.92)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);
    ctx.fillStyle = '#9ab';
    ctx.font = 'bold 10px monospace';
    const zoomText = 'ZOOM ' + Math.round(zoom * 100) + '%';
    ctx.fillText(zoomText, mapX + mapW - ctx.measureText(zoomText).width - 8, mapY + 16);
    if (ms.freeTravel) {
      ctx.fillStyle = '#7df';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('FREE TRAVEL', mapX + 8, mapY + 16);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const offsetX = ((selectedForCamera.col % 1) * cellW);
    const offsetY = ((selectedForCamera.row % 1) * cellH);
    for (let gx = mapCenterX - mapW; gx <= mapCenterX + mapW; gx += cellW) {
      ctx.beginPath();
      ctx.moveTo(gx - offsetX, mapY);
      ctx.lineTo(gx - offsetX, mapY + mapH);
      ctx.stroke();
    }
    for (let gy = mapCenterY - mapH; gy <= mapCenterY + mapH; gy += cellH) {
      ctx.beginPath();
      ctx.moveTo(mapX, gy - offsetY);
      ctx.lineTo(mapX + mapW, gy - offsetY);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapW, mapH);
    ctx.clip();
    for (const areaInfo of this._mapAreaBounds()) {
      const { area, minCol, maxCol, minRow, maxRow } = areaInfo;
      const ax = mapCenterX + (minCol - selectedForCamera.col) * cellW - cellW * 0.55;
      const ay = mapCenterY + (minRow - selectedForCamera.row) * cellH - cellH * 0.55;
      const aw = (maxCol - minCol + 1) * cellW + cellW * 0.1;
      const ah = (maxRow - minRow + 1) * cellH + cellH * 0.1;
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = area.color;
      ctx.fillRect(ax, ay, aw, ah);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = area.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(ax, ay, aw, ah);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = area.color;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(area.label, ax + 8, ay + 16);
    }
    ctx.restore();

    const selectedForLinks = MAP_ROOM_DEFS[ms.selected] || MAP_ROOM_BY_ID[this.currentRoomId];
    this._ensureItemRoomAssignments();
    const roomItemById = this._roomItemById();

    const drawLink = (fromId, toId, preview) => {
      const a = MAP_ROOM_BY_ID[fromId], b = MAP_ROOM_BY_ID[toId];
      if (!a || !b) return;
      const fromUnlocked = !!this.mapState.unlocked[fromId];
      const toUnlocked = !!this.mapState.unlocked[toId];
      const ghost = preview === 'ghost';
      if (!ghost && (!fromUnlocked || (!toUnlocked && !preview))) return;
      const ax = roomX(a);
      const ay = roomY(a);
      const bx = roomX(b);
      const by = roomY(b);
      const mx = (ax + bx) * 0.5;
      const my = (ay + by) * 0.5;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const bendSign = fromId < toId ? 1 : -1;
      const bend = Math.min(26, len * 0.14) * bendSign;
      const cx = mx + (-dy / len) * bend;
      const cy = my + (dx / len) * bend;
      ctx.save();
      ctx.globalAlpha = ghost ? 0.18 : (toUnlocked ? 0.95 : 0.45);
      ctx.strokeStyle = ghost ? '#8a8a8a' : (toUnlocked ? '#ffe033' : '#9a9a9a');
      ctx.lineWidth = ghost ? 1.25 : (toUnlocked ? 3.5 : 2);
      if (ghost || !toUnlocked) ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(bx, by, ghost ? 2 : (toUnlocked ? 4 : 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapW, mapH);
    ctx.clip();

    for (const pair of this._mapGhostPathPairs()) {
      drawLink(pair.fromId, pair.toId, 'ghost');
    }

    if (selectedForLinks && this.mapState.unlocked[selectedForLinks.id]) {
      const previewIds = new Set([
        ...Object.values(selectedForLinks.navDirs || {}),
        ...(selectedForLinks.unlockOnPrimary || []),
        ...(selectedForLinks.unlockOnSecondary || []),
      ]);
      for (const id of previewIds) drawLink(selectedForLinks.id, id, true);
    }

    const drawRoomIcon = (room, x, y, size, color, alpha) => {
      if (!room.kind || room.kind === 'stage') return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.08);
      if (room.kind === 'miniBoss') {
        const r = size * 0.26;
        ctx.beginPath();
        ctx.moveTo(x - r, y + r);
        ctx.lineTo(x + r, y - r);
        ctx.moveTo(x - r, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, size * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else if (room.kind === 'bridgeBoss') {
        const w = size * 0.5;
        const h = size * 0.38;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y + h / 2);
        ctx.lineTo(x - w / 2, y);
        ctx.quadraticCurveTo(x, y - h, x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - w * 0.22, y + h / 2);
        ctx.lineTo(x - w * 0.22, y + h * 0.02);
        ctx.moveTo(x + w * 0.22, y + h / 2);
        ctx.lineTo(x + w * 0.22, y + h * 0.02);
        ctx.stroke();
      } else if (room.kind === 'finalBoss' || room.kind === 'trueFinal') {
        const s = size * (room.kind === 'trueFinal' ? 0.34 : 0.28);
        ctx.beginPath();
        ctx.moveTo(x - s, y + s * 0.45);
        ctx.lineTo(x - s * 0.75, y - s * 0.35);
        ctx.lineTo(x - s * 0.25, y + s * 0.05);
        ctx.lineTo(x, y - s * 0.55);
        ctx.lineTo(x + s * 0.25, y + s * 0.05);
        ctx.lineTo(x + s * 0.75, y - s * 0.35);
        ctx.lineTo(x + s, y + s * 0.45);
        ctx.closePath();
        ctx.stroke();
        if (room.kind === 'trueFinal') {
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 4;
            const rr = i % 2 === 0 ? s * 1.15 : s * 0.58;
            const px = x + Math.cos(a) * rr;
            const py = y + Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    for (let i = 0; i < MAP_ROOM_DEFS.length; i++) {
      const room = MAP_ROOM_DEFS[i];
      const unlocked = !!this.mapState.unlocked[room.id];
      const completed = !!this.mapState.completed[room.id];
      const current = room.id === this.currentRoomId;
      const recent = ms.recentUnlocks && ms.recentUnlocks.includes(room.id);
      const selected = i === ms.selected;
      const x = roomX(room);
      const y = roomY(room);
      const elem = room.element ? ELEMENT_COLORS[room.element] : null;
      const kindColor = room.kind === 'trueFinal' ? '#00ff66'
        : room.kind === 'finalBoss' ? '#ffd700'
        : room.kind === 'miniBoss' ? '#c58cff'
        : room.kind === 'bridgeBoss' ? '#7bd'
        : null;
      const baseFill = completed ? '#26442f' : (elem ? elem.body : '#665c38');
      const accessible = unlocked || ms.freeTravel;
      const fill = !accessible ? '#1c1c22' : room.kind === 'finalBoss' ? '#7a6320'
        : room.kind === 'trueFinal' ? '#15552d'
        : room.kind === 'bridgeBoss' ? '#294d5b'
        : room.kind === 'miniBoss' ? '#4a3866'
        : baseFill;
      const stroke = selected ? '#ffe033' : recent ? '#fff' : current ? '#4f4' : kindColor || (accessible ? '#aaa' : '#333');

      if (accessible) {
        ctx.fillStyle = selected ? 'rgba(255,224,51,0.12)' : current ? 'rgba(80,255,80,0.08)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x - cellW / 2 + 3, y - cellH / 2 + 3, cellW - 6, cellH - 6);
      }

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = selected ? 4 : recent || current ? 3 : 1.5;
      const tileW = (selected ? 56 : 48) * tileScale;
      const tileH = (selected ? 38 : 34) * tileScale;
      const drawDiamond = room.kind === 'miniBoss';
      const drawTriangle = room.kind === 'bridgeBoss';
      if (kindColor && unlocked) {
        ctx.save();
        ctx.globalAlpha = room.kind === 'trueFinal' ? 0.38 : room.kind === 'finalBoss' ? 0.26 : 0.18;
        ctx.fillStyle = kindColor;
        ctx.beginPath();
        ctx.arc(x, y, room.kind === 'trueFinal' ? tileW * 0.78 : tileW * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (drawDiamond) {
        ctx.beginPath();
        ctx.moveTo(x, y - tileH / 2);
        ctx.lineTo(x + tileW / 2, y);
        ctx.lineTo(x, y + tileH / 2);
        ctx.lineTo(x - tileW / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (drawTriangle) {
        ctx.beginPath();
        ctx.moveTo(x, y - tileH / 2);
        ctx.lineTo(x + tileW / 2, y + tileH / 2);
        ctx.lineTo(x - tileW / 2, y + tileH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x - tileW / 2, y - tileH / 2, tileW, tileH);
        ctx.strokeRect(x - tileW / 2, y - tileH / 2, tileW, tileH);
      }
      if ((room.kind === 'finalBoss' || room.kind === 'trueFinal') && unlocked) {
        ctx.save();
        ctx.strokeStyle = kindColor;
        ctx.lineWidth = room.kind === 'trueFinal' ? 4 : 3;
        ctx.beginPath();
        ctx.arc(x, y, tileW * (room.kind === 'trueFinal' ? 0.66 : 0.56), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawRoomIcon(room, x, y, Math.min(tileW, tileH), kindColor || '#fff', unlocked ? 0.95 : 0.32);
      if (this._roomHasSkyExit(room)) {
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.42;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeStyle = '#7bd';
        ctx.lineWidth = 1.5;
        const sx = x + tileW / 2 - 8;
        const sy = y - tileH / 2 - 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 8);
        ctx.lineTo(sx + 8, sy + 6);
        ctx.lineTo(sx - 8, sy + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#9df';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SKY', sx, sy + 5);
        ctx.textAlign = 'left';
        ctx.restore();
      }
      const roomItemId = completed ? roomItemById[room.id] : null;
      const roomItemDef = roomItemId ? BOSS_ITEMS[roomItemId] : null;
      if (roomItemDef) {
        const choice = this.mapState.itemRewardChoices && this.mapState.itemRewardChoices[room.id];
        const itemAttr = ITEM_ATTRIBUTES[roomItemDef.attr] || ITEM_ATTRIBUTES.mind;
        ctx.save();
        ctx.globalAlpha = choice === 'attr' ? 0.48 : 0.95;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeStyle = choice === 'attr' ? itemAttr.color : roomItemDef.color;
        ctx.lineWidth = 1.5;
        const ix = x + tileW / 2 - 9;
        const iy = y - tileH / 2 + 9;
        ctx.beginPath();
        ctx.arc(ix, iy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawItemIcon(ctx, roomItemId, ix, iy, 13, roomItemDef.color);
        if (choice === 'attr') {
          ctx.fillStyle = itemAttr.color;
          ctx.font = 'bold 8px monospace';
          ctx.fillText('+', ix - 3, iy + 16);
        }
        ctx.restore();
      }

      if (completed) {
        ctx.fillStyle = '#9f9';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('OK', x - 8, y + 5);
      } else if (!unlocked) {
        ctx.fillStyle = '#555';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('?', x - 4, y + 4);
      } else if (recent) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('!', x - 4, y + 4);
      }

      if (unlocked) {
        ctx.fillStyle = selected ? '#fff' : '#bbb';
        ctx.font = selected ? 'bold 10px monospace' : '9px monospace';
        const label = room.name.length > 14 ? room.name.slice(0, 14) : room.name;
        ctx.fillText(label, x - ctx.measureText(label).width / 2, y + 34);
      }
    }
    ctx.restore();

    const panelX = 700, panelY = 88, panelW = 200, panelH = 390;
    ctx.fillStyle = 'rgba(12,12,16,0.95)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    const selectedRoom = MAP_ROOM_DEFS[ms.selected] || MAP_ROOM_BY_ID[this.currentRoomId];
    const selectedUnlocked = !!this.mapState.unlocked[selectedRoom.id];
    const selectedCompleted = !!this.mapState.completed[selectedRoom.id];
    const panelText = (text, x, y, maxW) => {
      let out = String(text);
      while (out.length > 3 && ctx.measureText(out).width > maxW) {
        out = out.slice(0, -4) + '...';
      }
      ctx.fillText(out, x, y);
    };
    const kindLabel = {
      stage: 'Stage',
      miniBoss: 'Elite boss',
      bridgeBoss: 'Bridge boss',
      finalBoss: 'Final boss',
      trueFinal: 'True final boss'
    };
    ctx.fillStyle = selectedUnlocked ? '#fff' : '#666';
    ctx.font = 'bold 15px monospace';
    panelText(selectedUnlocked ? selectedRoom.name : 'Unknown Room', panelX + 14, panelY + 28, panelW - 28);
    ctx.font = '11px monospace';
    ctx.fillStyle = selectedUnlocked ? '#aaa' : '#555';
    panelText(selectedUnlocked ? selectedRoom.subtitle : 'Locked', panelX + 14, panelY + 48, panelW - 28);

    if (selectedUnlocked) {
      const wd = WAVE_DEFS[selectedRoom.waveIdx] || WAVE_DEFS[0];
      const bossName = BOSS_NAMES[wd.boss] || wd.boss.toUpperCase();
      const area = MAP_AREAS[selectedRoom.area] || null;
      const mix = (selectedRoom.enemyTypes || []).map(t => ENEMY_STATS[t] ? ENEMY_STATS[t].name : t).join(', ');
      ctx.fillStyle = selectedRoom.element && ELEMENT_COLORS[selectedRoom.element] ? ELEMENT_COLORS[selectedRoom.element].accent : '#ffe033';
      ctx.font = 'bold 12px monospace';
      panelText('Boss: ' + bossName, panelX + 14, panelY + 84, panelW - 28);
      ctx.fillStyle = '#bbb';
      ctx.font = '11px monospace';
      panelText('Area: ' + (area ? area.label : selectedRoom.area), panelX + 14, panelY + 106, panelW - 28);
      panelText('Type: ' + (kindLabel[selectedRoom.kind] || 'Stage'), panelX + 14, panelY + 126, panelW - 28);
      panelText('Element: ' + (selectedRoom.element || 'normal'), panelX + 14, panelY + 146, panelW - 28);
      panelText('Layout: ' + (selectedRoom.mapType || 'classic'), panelX + 14, panelY + 166, panelW - 28);
      panelText('Enemies: ' + mix, panelX + 14, panelY + 186, panelW - 28);
      panelText('Status: ' + (selectedCompleted ? 'completed' : 'available'), panelX + 14, panelY + 206, panelW - 28);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Recently unlocked', panelX + 14, panelY + 242);
    ctx.font = '11px monospace';
    if (ms.recentUnlocks && ms.recentUnlocks.length) {
      let yy = panelY + 264;
      for (const id of ms.recentUnlocks) {
        const room = MAP_ROOM_BY_ID[id];
        if (!room) continue;
        ctx.fillStyle = '#ffe033';
        panelText('+ ' + room.name, panelX + 14, yy, panelW - 28);
        yy += 18;
      }
    } else {
      ctx.fillStyle = '#777';
      ctx.fillText('No new rooms', panelX + 14, panelY + 264);
    }

    const doneCount = Object.keys(this.mapState.completed || {}).length;
    const unlockedCount = Object.keys(this.mapState.unlocked || {}).length;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`Cache: ${unlockedCount}/${MAP_ROOM_DEFS.length} rooms`, panelX + 14, panelY + panelH - 36);
    ctx.fillText(`Completed: ${doneCount}`, panelX + 14, panelY + panelH - 18);
  }

  renderItemBar(pl) {
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
          // x2 Orb: crack overlay based on durability
          if (key === 'x2Orb' && pl.x2OrbCounter > 0) {
            const crackPct = pl.x2OrbCounter / 100;
            ctx.globalAlpha = crackPct * 0.7;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            // Main crack line
            ctx.beginPath();
            ctx.moveTo(icx + iconSize * 0.3, icy + iconSize * 0.2);
            ctx.lineTo(icx + iconSize * 0.5, icy + iconSize * 0.55);
            ctx.lineTo(icx + iconSize * 0.4, icy + iconSize * 0.8);
            ctx.stroke();
            // Secondary crack at 50%+
            if (crackPct > 0.5) {
              ctx.beginPath();
              ctx.moveTo(icx + iconSize * 0.5, icy + iconSize * 0.55);
              ctx.lineTo(icx + iconSize * 0.7, icy + iconSize * 0.4);
              ctx.stroke();
            }
            // Tertiary crack at 75%+
            if (crackPct > 0.75) {
              ctx.beginPath();
              ctx.moveTo(icx + iconSize * 0.5, icy + iconSize * 0.55);
              ctx.lineTo(icx + iconSize * 0.65, icy + iconSize * 0.75);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Warning pulse near breaking
            if (crackPct > 0.8) {
              const pulse = 0.15 + 0.1 * Math.sin(this.tick * 0.15);
              ctx.globalAlpha = pulse;
              ctx.fillStyle = '#f44';
              ctx.fillRect(icx, icy, iconSize, iconSize);
              ctx.globalAlpha = 1;
            }
          }
          // The Code: charge overlay
          if (key === 'theCode') {
            const pct = Math.min(pl.codeCounterCharge / pl.codeCounterMax, 1);
            if (pct < 1) {
              // Dim overlay on uncharged portion (sweeps upward)
              ctx.fillStyle = 'rgba(0,0,0,0.55)';
              const uncharged = iconSize * (1 - pct);
              ctx.fillRect(icx, icy, iconSize, uncharged);
            } else {
              // Fully charged: pulsing glow
              const pulse = 0.3 + 0.2 * Math.sin(this.tick * 0.1);
              ctx.globalAlpha = pulse;
              ctx.fillStyle = '#aaf';
              ctx.fillRect(icx, icy, iconSize, iconSize);
              ctx.globalAlpha = 1;
            }
          }
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          iy += iconSize + pad;
        }
      }
    }

    // x2 Orb break flash effect
    if (pl.x2OrbBreaking > 0) {
      const t = pl.x2OrbBreaking;
      const flash = t / 60;
      // Screen-edge flash
      ctx.save();
      ctx.globalAlpha = flash * 0.3;
      ctx.fillStyle = '#ff0';
      ctx.fillRect(0, 0, 60, CANVAS_H);
      ctx.globalAlpha = flash * 0.15;
      ctx.fillStyle = '#f44';
      ctx.fillRect(0, 0, 40, CANVAS_H);
      ctx.restore();
      // Floating shards near left side
      if (t > 30) {
        const numShards = 6;
        for (let si = 0; si < numShards; si++) {
          const progress = (60 - t) / 30;
          const angle = (si / numShards) * Math.PI * 2 + t * 0.1;
          const dist = progress * 60;
          const sx = 23 + Math.cos(angle) * dist;
          const sy = CANVAS_H / 2 + Math.sin(angle) * dist;
          ctx.save();
          ctx.globalAlpha = flash;
          ctx.fillStyle = si % 2 === 0 ? '#ff0' : '#fa0';
          ctx.translate(sx, sy);
          ctx.rotate(angle + t * 0.15);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
      }
    }
  }
}
