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
  stageProps: 90,
  stageLanterns: 20,
  bloodStains: 90,
  allies: 3,
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
    this.allies = [];
    this.friendlyTargets = [];
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.effects = [];
    this.stoneBlocks = [];
    this.bubbles = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.bubbleShieldPickups = [];
    this.heartPickups = [];
    this.bossItems = [];
    this.fireTrails = [];
    this.spikes = [];
    this.trimerangs = [];
    this.diamondShards = [];
    this.flamePools = [];
    this.stagePropsBack = [];
    this.stagePropsFront = [];
    this.stageLanterns = [];
    this.bloodStains = [];
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
    this.bossDeathRewardDelay = 0;
    this.bossMessage = 0;
    this.waveMessage = '';
    this.waveMessageTimer = 0;
    this.missionDirector = null;
    this.missionSeals = [];
    this.protectBuilding = null;
    this.routeLady = null;
    this.objectiveIndicatorIntroTimer = 0;
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
    this.routeState = this.mapState.route || this._freshMapState().route;
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
    this.samurai = null;           // Friendly Ronin ally for defend objectives
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
    this._spawnLevelAllies(MAP_ROOM_BY_ID[this.currentRoomId]);
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
    if (this.missionDirector && this.missionDirector.phases) {
      const phase = this.missionDirector.phases[this.missionDirector.phaseIndex];
      return phase && phase.type === 'survive' ? '' : this._missionPhaseTargetText(phase);
    }
    if (this.routeObjectiveSet && this.routeObjectiveSet.length) {
      return 'OBJECTIVES: choose your route';
    }
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

  _routeObjectiveProgressInfo(obj) {
    const start = this.routeObjectiveStart || { tick: this.tick || 0, waveKills: 0, objectiveKills: 0 };
    if (!obj) return null;
    if (obj.type === 'kills') {
      const target = Math.max(1, obj.target || 12);
      const current = Math.max(0, (this.waveKills || 0) - (start.waveKills || 0));
      return { current: Math.min(target, current), target, rawCurrent: current, rawTarget: target };
    }
    if (obj.type === 'hunt') {
      const target = Math.max(1, obj.target || 4);
      const current = Math.max(0, this.objectiveKills || 0);
      return { current: Math.min(target, current), target, rawCurrent: current, rawTarget: target };
    }
    if (obj.type === 'survive') {
      const target = Math.max(1, obj.targetSeconds || obj.target || 20);
      const current = Math.max(0, Math.floor(((this.tick || 0) - (start.tick || 0)) / 60));
      return { current: Math.min(target, current), target, suffix: 's', rawCurrent: current, rawTarget: target };
    }
    if (obj.type === 'collect') {
      const target = Math.max(1, obj.target || this._objectiveCollectTarget());
      const current = Math.max(0, (this.bossOrbsCollected || 0) - (start.bossOrbsCollected || 0));
      return { current: Math.min(target, current), target, rawCurrent: current, rawTarget: target };
    }
    if (obj.type === 'zone') {
      const target = Math.max(1, obj.targetSeconds || obj.target || 18);
      return { current: Math.min(target, obj.zoneSeconds || 0), target, suffix: 's', rawCurrent: obj.zoneSeconds || 0, rawTarget: target };
    }
    return null;
  }

  _routeObjectiveRatio(obj) {
    const p = this._routeObjectiveProgressInfo(obj);
    return p ? Math.max(0, Math.min(1, p.rawCurrent / Math.max(1, p.rawTarget))) : 0;
  }

  _routeMarkerFor(route) {
    return (typeof ROUTE_MARKERS !== 'undefined' && ROUTE_MARKERS[route]) || { symbol: '?', color: '#fff' };
  }

  _routeObjectiveOfType(type) {
    return this.routeObjectiveSet && this.routeObjectiveSet.find(obj => obj && obj.type === type);
  }

  _checkRouteObjectives() {
    if (!this.routeObjectiveSet || this.routeObjectiveResult || this.bossActive || (this.boss && !this.boss.dead)) return;
    for (const obj of this.routeObjectiveSet) {
      const p = this._routeObjectiveProgressInfo(obj);
      if (p && p.rawCurrent >= p.rawTarget) {
        this.routeObjectiveResult = obj.route || 'mid';
        this.currentObjective = obj;
        const marker = this._routeMarkerFor(this.routeObjectiveResult);
        this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 34, marker.symbol + ' ROUTE OPEN', marker.color));
        this.showWaveMessage(marker.symbol + ' OBJECTIVE COMPLETE');
        this.spawnBoss();
        break;
      }
    }
  }

  _missionPhaseDefs(roomDef, cached) {
    const step = Math.max(0, (cached && cached.routeStep) || this.currentRouteStep || 0);
    const enemyTypes = (roomDef && roomDef.enemyTypes && roomDef.enemyTypes.length)
      ? roomDef.enemyTypes.slice()
      : ['walker', 'shooter', 'jumper'];
    const roomEnemySet = new Set(enemyTypes);
    const minibossPool = ['charger', 'shielded', 'deflector', 'protector', 'bouncer', 'jumper', 'shooter', 'walker'];
    let eliteTypes = minibossPool.filter(t => t !== (cached && cached.bossType) && !roomEnemySet.has(t));
    if (!eliteTypes.length) eliteTypes = minibossPool.filter(t => t !== (cached && cached.bossType));
    const eliteA = eliteTypes[step % eliteTypes.length] || 'charger';
    const eliteB = eliteTypes[(step + 2) % eliteTypes.length] || 'shielded';
    const minibossKinds = ['solo', 'squad', 'captainGuards'];
    const kindA = minibossKinds[step % minibossKinds.length];
    const kindB = minibossKinds[(step + 1) % minibossKinds.length];
    return [
      { type: 'survive', label: 'Hold the Line', seconds: 18 + step * 2, routeEvent: this._missionRouteEventDef(step, 0) },
      { type: 'miniboss', label: 'Break the Vanguard', enemyType: eliteA, encounter: kindA },
      { type: 'survive', label: 'Weather the Ambush', seconds: 16 + step * 2, routeEvent: this._missionRouteEventDef(step, 1) },
      { type: 'miniboss', label: 'Cut Down the Champion', enemyType: eliteB, encounter: kindB },
      { type: 'survive', label: 'Endure the Omen', seconds: 16 + step * 2, routeEvent: this._missionRouteEventDef(step, 2) },
      { type: 'boss', label: 'Final Target' }
    ];
  }

  _missionRouteEventDef(step, slot) {
    if (step <= 0 && slot === 0) return null;
    const kind = (step + slot) % 4;
    if (kind === 0) {
      const blessings = ['summon', 'heal', 'purge'];
      return { type: 'lady', label: 'Protect the Shrine Lady', blessing: blessings[(step + slot) % blessings.length], score: 1 + (slot === 2 ? 1 : 0) };
    }
    if (kind === 1) {
      const enemyTypes = ['charger', 'bouncer', 'jumper', 'walker', 'shielded'];
      return { type: 'escapeKill', label: 'Kill the Escaping Target', enemyType: enemyTypes[(step + slot) % enemyTypes.length], score: 1 + (slot === 1 ? 1 : 0) };
    }
    if (kind === 2) {
      return { type: 'seals', label: 'Restore the Seals', count: Math.min(5, 2 + slot + Math.floor(step / 3)), score: 1 };
    }
    return { type: 'bomb', label: 'Disarm the Bomb Carriage', score: 2 };
  }

  _initMissionDirector(roomDef, cached) {
    this.routeObjectiveSet = null;
    this.routeObjectiveResult = null;
    this.currentObjective = { type: 'mission', label: 'Mission', desc: 'Complete the encounter chain.', icon: '' };
    this.missionSeals = [];
    this.protectBuilding = null;
    this.missionDirector = {
      active: true,
      roomId: roomDef ? roomDef.id : this.currentRoomId,
      step: Math.max(0, (cached && cached.routeStep) || this.currentRouteStep || 0),
      phaseIndex: -1,
      phases: this._missionPhaseDefs(roomDef, cached),
      score: 0,
      failedProtect: false,
      miniboss: null,
      minibosses: [],
      minibossCaptain: null,
      routeEvent: null,
      phaseStartedTick: this.tick || 0,
      lastPhaseLabel: '',
    };
    this._startMissionPhase(0);
  }

  _missionPhaseTargetText(phase) {
    if (!phase) return 'TARGET';
    if (phase.type === 'survive') return 'TARGET: SURVIVE';
    if (phase.type === 'miniboss') return 'TARGET: ELIMINATE ELITE';
    if (phase.type === 'zone') return 'TARGET: HOLD THE SHRINE';
    if (phase.type === 'protect') return phase.target === 'building' ? 'TARGET: PROTECT THE GATE' : 'TARGET: PROTECT THE RONIN';
    if (phase.type === 'seals') return 'TARGET: RESTORE THE SEALS';
    if (phase.type === 'boss') return 'TARGET: BOSS APPROACHING';
    return 'TARGET: ' + (phase.label || 'MISSION');
  }

  _startMissionPhase(index) {
    const md = this.missionDirector;
    if (!md || !md.phases || index >= md.phases.length) return;
    this._cleanupMissionRouteEventForPhaseChange();
    md.phaseIndex = index;
    md.phaseStartedTick = this.tick || 0;
    md.miniboss = null;
    md.minibosses = [];
    md.minibossCaptain = null;
    md.routeEvent = null;
    const phase = md.phases[index];
    phase.timer = Math.max(1, Math.round((phase.seconds || 0) * 60));
    phase.holdFrames = 0;
    phase.completed = false;
    this.missionSeals = [];
    this.objZone = null;
    if (this.samurai && this.samurai.objectiveAlly) {
      this.samurai.dead = true;
      this.samurai = null;
    }
    this.protectBuilding = null;
    this.routeLady = null;
    this.currentObjective = { type: 'mission', label: phase.label || 'Mission', desc: '', icon: '' };
    if (phase.type === 'survive') {
      this.waveMessage = '';
      this.waveMessageTimer = 0;
      if (phase.routeEvent) this._queueMissionRouteEvent(phase.routeEvent, phase);
    } else if (phase.type !== 'boss') {
      this.waveMessage = '';
      this.waveMessageTimer = 0;
    }
    if (phase.type === 'miniboss') {
      this._spawnMissionMiniboss(phase);
    } else if (phase.type === 'zone') {
      this._setupZoneObjective();
      this._flashObjectiveIndicator();
    } else if (phase.type === 'protect') {
      if (phase.target === 'building') this._setupProtectBuilding();
      else this._spawnRoninAlly(MAP_ROOM_BY_ID[this.currentRoomId]);
      this._flashObjectiveIndicator();
    } else if (phase.type === 'seals') {
      this._spawnMissionSeals(phase.count || 3);
      this._flashObjectiveIndicator();
    } else if (phase.type === 'boss') {
      this.routeObjectiveResult = this._missionRouteResult();
      this.spawnBoss();
    }
  }

  _cleanupMissionRouteEventForPhaseChange() {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.done || event.failed) return;
    if (event.type === 'escapeKill' && event.target && !event.target.dead) {
      event.failed = true;
      event.target.dead = true;
      this.effects.push(new TextEffect(event.target.x + event.target.w / 2, event.target.y - 18, 'ESCAPED', event.target.routeObjectiveColor || '#39d8ff'));
    } else if (event.type === 'bomb' && event.carriage && !event.carriage.dead) {
      event.failed = true;
      event.carriage.dead = true;
    }
  }

  _startMissionRouteEvent(eventDef, phase) {
    const md = this.missionDirector;
    if (!md || !eventDef) return;
    const event = Object.assign({}, eventDef);
    event.done = false;
    event.failed = false;
    event.holdFrames = 0;
    event.startedTick = this.tick || 0;
    event.phaseSeconds = phase ? (phase.seconds || 0) : 0;
    md.routeEvent = event;
    if (event.type === 'zone') {
      this._setupZoneObjective();
    } else if (event.type === 'protect') {
      if (event.target === 'building') this._setupProtectBuilding();
      else this._spawnRoninAlly(MAP_ROOM_BY_ID[this.currentRoomId]);
    } else if (event.type === 'seals') {
      this._spawnMissionSeals(event.count || 3);
    }
    SFX.alarmSecondary();
    this._flashObjectiveIndicator();
  }

  _queueMissionRouteEvent(eventDef, phase) {
    const md = this.missionDirector;
    if (!md || !eventDef) return;
    const event = Object.assign({}, eventDef);
    event.done = false;
    event.failed = false;
    event.spawned = false;
    event.holdFrames = 0;
    event.startedTick = this.tick || 0;
    event.phaseSeconds = phase ? (phase.seconds || 0) : 0;
    event.delayTimer = Math.max(90, Math.min(300, Math.round((event.phaseSeconds || 12) * 18)));
    md.routeEvent = event;
  }

  _spawnQueuedMissionRouteEvent(event) {
    if (!event || event.spawned) return;
    event.spawned = true;
    event.spawnTick = this.tick || 0;
    if (event.type === 'zone') {
      this._setupZoneObjective();
    } else if (event.type === 'protect') {
      if (event.target === 'building') this._setupProtectBuilding();
      else this._spawnRoninAlly(MAP_ROOM_BY_ID[this.currentRoomId]);
    } else if (event.type === 'lady') {
      this._spawnRouteLady(event);
    } else if (event.type === 'escapeKill') {
      this._spawnRouteEscapeTarget(event);
    } else if (event.type === 'bomb') {
      this._spawnRouteBombCarriage(event);
    } else if (event.type === 'seals') {
      this._spawnMissionSeals(event.count || 3);
    }
    this._flashObjectiveIndicator();
  }

  _spawnRouteLady(event) {
    const w = 28, h = 42;
    const anchor = this._objectiveAnchor(this._preferredObjectiveX(), 120, 84);
    const power = this._roomPowerLevel();
    this.routeLady = {
      x: Math.round(anchor.x + 46), y: Math.round(anchor.y + 34), w, h,
      hp: 38 + power * 10, maxHp: 38 + power * 10,
      friendly: true, objectiveAlly: true, routeLady: true,
      blessing: event.blessing || 'summon',
      takeDamage: function() {}
    };
    this.effects.push(new TextEffect(this.routeLady.x + w / 2, this.routeLady.y - 18, 'SHRINE LADY', '#ffe0ec'));
  }

  _spawnRouteEscapeTarget(event) {
    const type = event.enemyType || 'charger';
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x = dir > 0 ? -80 : this.levelW + 80;
    const e = new Enemy(x, 0, type, true, 1, this._roomPowerLevel() + 0.5);
    const anchor = this._objectiveAnchor(dir > 0 ? 90 : this.levelW - 90, e.w, e.h);
    e.y = Math.round(anchor.y);
    e.isRouteEscapeTarget = true;
    e.routeEscapeDir = dir;
    const playerRunSpeed = this._playerRunSpeed();
    e.routeEscapeSpeed = Math.min(playerRunSpeed * 0.92, 2.5 + Math.min(1.4, (this.currentRouteStep || 0) * 0.16));
    e.routeEscapeBaseY = e.y;
    e.hp = Math.ceil(e.hp * 1.25);
    e.maxHp = e.hp;
    e.displayHp = e.hp;
    e.isHuntTarget = true;
    e.routeObjectiveColor = '#39d8ff';
    this.enemies.push(e);
    event.target = e;
    this.effects.push(new TextEffect(e.x + e.w / 2, e.y - 18, 'ESCAPING!', e.routeObjectiveColor));
  }

  _spawnRouteBombCarriage(event) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const w = 58, h = 38;
    const anchor = this._objectiveAnchor(dir > 0 ? 90 : this.levelW - 90, w, h);
    const hp = 34 + this._roomPowerLevel() * 7;
    event.carriage = {
      x: dir > 0 ? -80 : this.levelW + 80,
      y: Math.round(anchor.y + Math.max(0, h - 24)),
      w, h, hp, maxHp: hp, dir, dead: false,
      friendly: false, objectiveAlly: false, routeBomb: true,
      takeDamage: function(amount) { this.hp = Math.max(0, this.hp - Math.max(1, Math.round(amount || 1))); if (this.hp <= 0) this.dead = true; }
    };
  }

  _completeMissionRouteEvent(score, text, color) {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.done || event.failed) return;
    event.done = true;
    md.score += Math.max(0, score === undefined ? (event.score || 1) : score);
    this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 48, text || 'ROUTE UP', color || '#68ffad'));
    if (event.type === 'lady') this._grantRouteLadyBlessing(event);
  }

  _failMissionRouteEvent(text) {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.done || event.failed) return;
    event.failed = true;
    if (event.type === 'protect') md.failedProtect = true;
    this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 48, text || 'ROUTE LOST', '#f66'));
  }

  _grantRouteLadyBlessing(event) {
    const blessing = (event && event.blessing) || (this.routeLady && this.routeLady.blessing) || 'summon';
    const x = this.routeLady ? this.routeLady.x + this.routeLady.w / 2 : this.player.x + this.player.w / 2;
    const y = this.routeLady ? this.routeLady.y : this.player.y;
    if (blessing === 'heal') {
      const heal = Math.max(4, Math.round(this.player.maxHp * 0.35));
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.player.displayHp = Math.min(this.player.maxHp, Math.max(this.player.displayHp || 0, this.player.hp));
      this.effects.push(new TextEffect(x, y - 28, 'HEALING BLESSING', '#4f8'));
      this.effects.push(new Effect(x, y, '#4f8', 24, 4, 24));
    } else if (blessing === 'purge') {
      let hit = 0;
      for (const e of this.enemies) {
        if (!e || e.dead || e.friendly) continue;
        e.takeDamage(Math.max(8, Math.round((e.maxHp || e.hp || 12) * 0.45)), this, x, null, 'special');
        hit++;
        if (hit >= 8) break;
      }
      this.effects.push(new TextEffect(x, y - 28, 'PURGE BLESSING', '#ffe033'));
      triggerScreenShake(4, 12);
    } else {
      for (let i = 0; i < 2; i++) {
        const types = this._elementAllyTypes(MAP_ROOM_BY_ID[this.currentRoomId]);
        const type = types[(i + (this.tick || 0)) % types.length] || 'wind';
        const ally = new AllyNinja(x + (i ? 28 : -28), y + 8, type, this._roomPowerLevel(), i + 7);
        ally.patrolLeft = Math.max(0, ally.x - 180);
        ally.patrolRight = Math.min(this.levelW, ally.x + 220);
        this.allies.push(ally);
        this.effects.push(new TextEffect(ally.x + ally.w / 2, ally.y - 12, type.toUpperCase() + ' ALLY', ally.type.accentColor));
      }
      this.effects.push(new TextEffect(x, y - 28, 'SUMMON BLESSING', '#9fbaff'));
    }
  }

  _onRouteEscapeKilled(enemy) {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.type !== 'escapeKill' || event.target !== enemy || event.done || event.failed) return;
    this._completeMissionRouteEvent(event.score || 1, 'ROUTE UP: TARGET KILLED', enemy.routeObjectiveColor || '#39d8ff');
  }

  _playerRunSpeed() {
    const pl = this.player;
    if (!pl) return 4;
    const typeSpeed = pl.type && pl.type.speed ? pl.type.speed : (NINJA_TYPES[pl.ninjaType] ? NINJA_TYPES[pl.ninjaType].speed : 4);
    const buff = pl.bubbleBuffTimer > 0 ? 1.35 : 1;
    return Math.max(2.8, (typeSpeed + (pl.bonusSpeed || 0) * 0.3) * buff);
  }

  _updateRouteEscapeGrounding(target) {
    if (!target || target.flying) return;
    const prevY = target.y;
    target.vy = Math.min(MAX_FALL, (target.vy || 0) + GRAVITY);
    target.y += target.vy;
    for (const p of this.platforms) {
      if (!p || p.w < Math.max(48, target.w * 0.7) || p.h > 28) continue;
      if (!rectOverlap(target, p)) continue;
      if (target.vy >= 0 && prevY + target.h <= p.y + 8) {
        target.y = p.y - target.h;
        target.vy = 0;
        target.routeEscapeBaseY = target.y;
        return;
      }
    }
  }

  _flashObjectiveIndicator() {
    this.objectiveIndicatorIntroTimer = 96;
  }

  _missionRouteResult() {
    const md = this.missionDirector;
    if (!md) return 'mid';
    const score = md.score || 0;
    if (score >= 3) return 'hard';
    if (score >= 1 && !md.failedProtect) return 'mid';
    return 'easy';
  }

  _completeMissionPhase(extraScore) {
    const md = this.missionDirector;
    if (!md) return;
    this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 34, 'TARGET CLEAR', '#ffe033'));
    this._startMissionPhase(md.phaseIndex + 1);
  }

  _spawnMissionMiniboss(phase) {
    const type = phase.enemyType || 'charger';
    const encounter = phase.encounter || 'solo';
    this._missionMinibossSpawnSide = Math.random() < 0.5 ? -1 : 1;
    if (encounter === 'squad') {
      this._spawnMissionEliteSquad(phase, type);
    } else if (encounter === 'captainGuards') {
      this._spawnMissionCaptainGuards(phase, type);
    } else {
      this._spawnMissionElite(type, true, 'ELITE', 1.45, null);
    }
    this._flashObjectiveIndicator();
    SFX.alarmMiniboss();
    SFX.bossSpawn();
    this._missionMinibossSpawnSide = null;
  }

  _missionMinibossSpawnPoint(offsetIndex, total) {
    const spread = 82;
    const side = this._missionMinibossSpawnSide || (Math.random() < 0.5 ? -1 : 1);
    const spawnDist = this.levelW < 1000 ? 260 : 460;
    const centerOffset = (offsetIndex - (total - 1) / 2) * spread;
    const x = Math.max(40, Math.min(this.levelW - 90, this.player.x + side * spawnDist + centerOffset));
    const y = this.levelType === 'tower' ? Math.min(this.player.y - 120, 160) : -40;
    return { x, y };
  }

  _spawnMissionElite(type, big, text, hpMult, role, index, total) {
    const pos = this._missionMinibossSpawnPoint(index || 0, total || 1);
    const e = new Enemy(pos.x, pos.y, type, !!big, 1, this._roomPowerLevel() + 0.5);
    e.isMissionMiniboss = true;
    e.missionMinibossRole = role || 'solo';
    e.missionPhaseIndex = this.missionDirector ? this.missionDirector.phaseIndex : 0;
    e.hp = Math.ceil(e.hp * (hpMult || 1.45));
    e.maxHp = e.hp;
    e.displayHp = e.hp;
    if (this.levelElement && ELEMENT_COLORS[this.levelElement]) {
      e.element = this.levelElement;
      e.elementColors = ELEMENT_COLORS[this.levelElement];
      e.color = e.elementColors.body;
    }
    this.enemies.push(e);
    if (this.missionDirector) {
      this.missionDirector.minibosses.push(e);
      if (!this.missionDirector.miniboss) this.missionDirector.miniboss = e;
      if (role === 'captain') this.missionDirector.minibossCaptain = e;
    }
    this.effects.push(new SlamRing(pos.x + e.w / 2, pos.y + e.h / 2, role === 'guard' ? '#ffb347' : '#ffe033', big ? 120 : 86, big ? 14 : 9));
    this.effects.push(new TextEffect(pos.x + e.w / 2, pos.y - 20, text || 'ELITE', role === 'guard' ? '#ffb347' : '#ffe033'));
    return e;
  }

  _spawnMissionEliteSquad(phase, type) {
    for (let i = 0; i < 4; i++) {
      this._spawnMissionElite(type, false, 'ELITE SQUAD', 1.85, 'squad', i, 4);
    }
    if (this.missionDirector) this.missionDirector.miniboss = this.missionDirector.minibosses[0] || null;
  }

  _spawnMissionCaptainGuards(phase, type) {
    const guardType = phase.guardType || (type === 'shielded' ? 'walker' : 'shielded');
    for (let i = 0; i < 3; i++) {
      this._spawnMissionElite(guardType, false, 'GUARD', 1.55, 'guard', i, 4);
    }
    const captain = this._spawnMissionElite(type, true, 'CAPTAIN', 1.75, 'captain', 3, 4);
    captain.missionCaptainLocked = true;
    if (this.missionDirector) this.missionDirector.miniboss = captain;
  }

  _onMissionMinibossKilled(enemy) {
    const md = this.missionDirector;
    if (!md || !enemy || !enemy.isMissionMiniboss) return;
    if (enemy.missionPhaseIndex !== md.phaseIndex) return;
    if (enemy.missionMinibossRole === 'guard' && md.minibossCaptain && !md.minibossCaptain.dead && !this._missionCaptainGuardAlive(md.minibossCaptain)) {
      md.minibossCaptain.missionCaptainLocked = false;
      this.effects.push(new TextEffect(md.minibossCaptain.x + md.minibossCaptain.w / 2, md.minibossCaptain.y - 28, 'CAPTAIN EXPOSED', '#ffe033'));
      this.effects.push(new SlamRing(md.minibossCaptain.x + md.minibossCaptain.w / 2, md.minibossCaptain.y + md.minibossCaptain.h / 2, '#ffe033', 110, 12));
    }
    const alive = (md.minibosses || []).some(e => e && !e.dead && e.missionPhaseIndex === md.phaseIndex);
    if (alive) return;
    this._completeMissionPhase(0);
  }

  _missionCaptainGuardAlive(captain) {
    const md = this.missionDirector;
    if (!md || !captain) return false;
    return (md.minibosses || []).some(e => e && !e.dead && e !== captain && e.missionPhaseIndex === captain.missionPhaseIndex && e.missionMinibossRole === 'guard');
  }

  _setupProtectBuilding() {
    const w = 74, h = 70;
    const anchor = this._objectiveAnchor(this._preferredObjectiveX(), w, h);
    const power = this._roomPowerLevel();
    this.protectBuilding = {
      x: Math.round(anchor.x), y: Math.round(anchor.y), w, h,
      hp: 50 + power * 12, maxHp: 50 + power * 12,
      friendly: true, objectiveAlly: true, takeDamage: function() {}
    };
  }

  _spawnMissionSeals(count) {
    const n = Math.max(1, count || 3);
    for (let i = 0; i < n; i++) {
      const px = 160 + ((i + 1) / (n + 1)) * Math.max(320, this.levelW - 320);
      const anchor = this._objectiveAnchor(px, 24, 28);
      this.missionSeals.push({
        x: Math.round(anchor.x + 4), y: Math.round(anchor.y - 8),
        w: 24, h: 28, done: false, bob: Math.random() * Math.PI * 2
      });
    }
  }

  _updateMissionSeals() {
    if (!this.missionSeals || !this.missionSeals.length) return false;
    let remaining = 0;
    for (const seal of this.missionSeals) {
      if (!seal || seal.done) continue;
      seal.bob += 0.07;
      if (rectOverlap(this.player, seal)) {
        seal.done = true;
        SFX.pickup();
        this.effects.push(new SlamRing(seal.x + seal.w / 2, seal.y + seal.h / 2, '#9fbaff', 70, 8));
        this.effects.push(new TextEffect(seal.x + seal.w / 2, seal.y - 14, 'SEAL RESTORED', '#9fbaff'));
      } else {
        remaining++;
      }
    }
    return remaining <= 0;
  }

  _updateMissionRouteEvent() {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.done || event.failed) return;
    if (!event.spawned) {
      event.delayTimer = Math.max(0, (event.delayTimer || 0) - 1);
      if (event.delayTimer <= 0) this._spawnQueuedMissionRouteEvent(event);
      return;
    }
    if (event.type === 'zone' && this.objZone) {
      const pl = this.player;
      const inZone = pl.x + pl.w > this.objZone.x && pl.x < this.objZone.x + this.objZone.w &&
                     pl.y + pl.h > this.objZone.y && pl.y < this.objZone.y + this.objZone.h;
      if (inZone) event.holdFrames++;
      if (event.holdFrames >= Math.max(1, (event.seconds || 9) * 60)) {
        this._completeMissionRouteEvent(event.score || 1, 'ROUTE UP: SHRINE HELD', '#68ffad');
      }
    } else if (event.type === 'protect') {
      const target = event.target === 'building' ? this.protectBuilding : this.samurai;
      if (!target || target.dead || target.hp <= 0) {
        this._failMissionRouteEvent('ROUTE LOST: TARGET DOWN');
      }
    } else if (event.type === 'lady') {
      const target = this.routeLady;
      if (!target || target.dead || target.hp <= 0) {
        this._failMissionRouteEvent('ROUTE LOST: LADY FALLEN');
      }
    } else if (event.type === 'escapeKill') {
      const target = event.target;
      if (!target || target.dead) return;
      const speed = Math.min(target.routeEscapeSpeed || 3, this._playerRunSpeed() * 0.92);
      target.routeEscapeSpeed = speed;
      target.x += (target.routeEscapeDir || 1) * speed;
      target.vx = (target.routeEscapeDir || 1) * speed;
      target.facing = target.routeEscapeDir || 1;
      this._updateRouteEscapeGrounding(target);
      if ((target.routeEscapeDir > 0 && target.x + target.w >= this.levelW) || (target.routeEscapeDir < 0 && target.x <= 0)) {
        this._failMissionRouteEvent('ROUTE LOST: TARGET ESCAPED');
        target.dead = true;
      }
    } else if (event.type === 'bomb') {
      const c = event.carriage;
      if (!c || c.dead || c.hp <= 0) {
        this._completeMissionRouteEvent(event.score || 2, 'ROUTE UP: BOMB DISARMED', '#ffb347');
        return;
      }
      c.x += (c.dir || 1) * 2.15;
      const atk = this.player && this.player.attackBox;
      if (atk && rectOverlap(atk, c)) {
        c.hp = Math.max(0, c.hp - 1.6);
        this.effects.push(new Effect(c.x + c.w / 2, c.y + c.h / 2, '#ffb347', 4, 1, 6));
      }
      if ((c.dir > 0 && c.x > this.levelW + 40) || (c.dir < 0 && c.x + c.w < -40)) {
        this._failMissionRouteEvent('BOMB DETONATED');
        const dist = Math.abs((this.player.x + this.player.w / 2) - (c.x + c.w / 2));
        if (dist < 360) this.player.takeDamage(Math.max(6, Math.round(this.player.maxHp * 0.45)), this, 'fire', { type: 'bomb', element: 'fire', isBoss: false });
        this.effects.push(new SlamRing(c.x + c.w / 2, c.y + c.h / 2, '#f63', 190, 24));
        this.effects.push(new ScreenFlash('#fff1c2', 0.62, 20));
        this.effects.push(new ScreenFlash('#ff5a22', 0.28, 28));
        SFX.nuke();
        triggerScreenShake(10, 18);
        c.dead = true;
      }
    } else if (event.type === 'seals') {
      if (this._updateMissionSeals()) {
        this._completeMissionRouteEvent(event.score || 1, 'ROUTE UP: SEALS RESTORED', '#9fbaff');
      }
    }
  }

  _finalizeMissionRouteEventAtPhaseEnd() {
    const md = this.missionDirector;
    const event = md && md.routeEvent;
    if (!event || event.done || event.failed) return;
    if (!event.spawned) return;
    if (event.type === 'protect') {
      const target = event.target === 'building' ? this.protectBuilding : this.samurai;
      if (!target || target.dead || target.hp <= 0) {
        this._failMissionRouteEvent('ROUTE LOST: TARGET DOWN');
        return;
      }
      const pct = target.hp / Math.max(1, target.maxHp || target.hp);
      const score = pct > 0.75 ? (event.score || 1) + 1 : (event.score || 1);
      this._completeMissionRouteEvent(score, pct > 0.75 ? 'ROUTE UP: CLEAN DEFENSE' : 'ROUTE UP: DEFENDED', '#4f8');
    } else if (event.type === 'lady') {
      const target = this.routeLady;
      if (!target || target.dead || target.hp <= 0) {
        this._failMissionRouteEvent('ROUTE LOST: LADY FALLEN');
        return;
      }
      const pct = target.hp / Math.max(1, target.maxHp || target.hp);
      this._completeMissionRouteEvent((event.score || 1) + (pct > 0.75 ? 1 : 0), pct > 0.75 ? 'ROUTE UP: LADY SAVED' : 'ROUTE UP: LADY LIVES', '#ffe0ec');
    }
  }

  _updateMissionDirector() {
    const md = this.missionDirector;
    if (!md || !md.active || this.bossActive || (this.boss && !this.boss.dead) || this.gameWon) return;
    const phase = md.phases[md.phaseIndex];
    if (!phase || phase.type === 'boss' || phase.completed) return;
    if (phase.type === 'survive') {
      this._updateMissionRouteEvent();
      phase.timer--;
      if (phase.timer <= 0) {
        this._finalizeMissionRouteEventAtPhaseEnd();
        this._completeMissionPhase(0);
      }
    } else if (phase.type === 'zone' && this.objZone) {
      const pl = this.player;
      const inZone = pl.x + pl.w > this.objZone.x && pl.x < this.objZone.x + this.objZone.w &&
                     pl.y + pl.h > this.objZone.y && pl.y < this.objZone.y + this.objZone.h;
      if (inZone) phase.holdFrames++;
      if (phase.holdFrames >= Math.max(1, (phase.seconds || 12) * 60)) this._completeMissionPhase(2);
    } else if (phase.type === 'protect') {
      phase.timer--;
      const target = phase.target === 'building' ? this.protectBuilding : this.samurai;
      if (!target || target.dead || target.hp <= 0) {
        md.failedProtect = true;
        this.showWaveMessage('TARGET LOST');
        this._completeMissionPhase(0);
      } else if (phase.timer <= 0) {
        const pct = target.hp / Math.max(1, target.maxHp || target.hp);
        this._completeMissionPhase(pct > 0.75 ? 3 : (pct > 0.35 ? 1 : 0));
      }
    } else if (phase.type === 'seals') {
      if (this._updateMissionSeals()) this._completeMissionPhase(2);
    }
  }

  _objectiveTotalSeconds(type) {
    if (type === 'zone') return 15;
    if (type === 'defend') return 30;
    if (type === 'survive') return 30 * Math.max(1, this.bossOrbsRequired || 1);
    return 30 * Math.max(1, this.bossOrbsRequired || 1);
  }

  _objectiveSecondsPerOrb(type) {
    return this._objectiveTotalSeconds(type) / Math.max(1, this.bossOrbsRequired || 1);
  }

  _objectiveCollectTarget() {
    return 15;
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
      const target = this._objectiveCollectTarget();
      return { current: Math.min(target, this.bossOrbsCollected || 0), target, rawCurrent: this.bossOrbsCollected || 0, rawTarget: target };
    }
    const totalSeconds = this._objectiveTotalSeconds(obj.type);
    const secondsPerOrb = this._objectiveSecondsPerOrb(obj.type);
    const targetFrames = Math.max(1, totalSeconds * 60);
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
    this.stagePropsBack = [];
    this.stagePropsFront = [];
    this.stageLanterns = [];
    this.bloodStains = [];
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
    this._decorateStage(theme);
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

  _addReachabilityThinPlatforms(TP, rng, opts = {}) {
    const maxGap = opts.maxGap || 230;
    const minGap = opts.minGap || 135;
    const minY = opts.minY === undefined ? -400 : opts.minY;
    const maxY = opts.maxY || 445;
    const surfaces = this.platforms
      .filter(p => p.w >= 96 && p.y >= minY && p.y <= maxY && p.x + p.w > 0 && p.x < this.levelW)
      .sort((a, b) => a.x - b.x || a.y - b.y);

    for (let i = 0; i < surfaces.length - 1; i++) {
      const a = surfaces[i];
      const b = surfaces[i + 1];
      if (Math.abs(a.y - b.y) > 115) continue;
      const gap = b.x - (a.x + a.w);
      if (gap <= maxGap) continue;
      const bridgeCount = Math.min(3, Math.ceil(gap / maxGap));
      for (let j = 1; j <= bridgeCount; j++) {
        const bx = a.x + a.w + (gap * j) / (bridgeCount + 1);
        const yBase = Math.min(a.y, b.y) + Math.min(42, Math.abs(a.y - b.y) * 0.35);
        const by = Math.max(minY, Math.min(maxY, yBase + (rng() * 18 - 9)));
        const bw = 84 + Math.floor(rng() * 24);
        const tooClose = surfaces.some(p => Math.abs((p.x + p.w / 2) - bx) < minGap && Math.abs(p.y - by) < 38);
        if (!tooClose) TP(Math.max(70, Math.min(this.levelW - bw - 70, bx - bw / 2)), by, bw);
      }
    }
  }

  _platformTooClose(x, y, w, minGap = 64, yBand = 42) {
    const left = x;
    const right = x + w;
    for (const p of this.platforms) {
      if (p.w < 48 || Math.abs(p.y - y) > yBand) continue;
      const gap = Math.max(p.x - right, left - (p.x + p.w));
      if (gap < minGap) return true;
    }
    return false;
  }

  _surfaceForDecor(rng, minWidth, groundOnly) {
    const groundY = this.platforms.reduce((m, p) => Math.max(m, p.y), 0);
    const surfaces = this.platforms.filter(p => {
      if (p.w < (minWidth || 70) || p.y <= -500 || p.y >= this.levelH + 40) return false;
      if (groundOnly && p.y < groundY - 30) return false;
      return true;
    });
    if (!surfaces.length) return null;
    return surfaces[Math.floor(rng() * surfaces.length)];
  }

  _wallForDecor(rng) {
    const walls = this.platforms.filter(p => p.h >= 60 && p.h > p.w * 1.7 && p.y > -520 && p.y < this.levelH + 40);
    if (!walls.length) return null;
    return walls[Math.floor(rng() * walls.length)];
  }

  _decorateStage(theme) {
    const rng = this._layoutRng('decor');
    const destructible = ['bamboo', 'vase', 'lamp', 'crate', 'barrel', 'banner', 'sign'];
    const solid = ['chair', 'tree', 'rock', 'statue', 'well', 'cart', 'shrine', 'bush', 'stool'];
    const addProp = (front, destruct) => {
      const list = destruct ? destructible : solid;
      const p = this._surfaceForDecor(rng, destruct ? 90 : 120, !destruct);
      if (!p) return;
      const type = list[Math.floor(rng() * list.length)];
      const scale = 0.82 + rng() * 0.38;
      const temp = new StageProp(0, 0, type, front, destruct, scale);
      const x = p.x + 18 + rng() * Math.max(1, p.w - temp.w - 36);
      temp.x = Math.round(x);
      temp.y = Math.round(p.y - temp.h);
      if (temp.y < -520 || temp.y > this.levelH + 20) return;
      (front ? this.stagePropsFront : this.stagePropsBack).push(temp);
    };

    const routeStep = this.currentRouteStep || 0;
    const propCount = 12 + Math.floor(rng() * 10) + (this.levelType === 'plain' ? 4 : 0) + Math.floor(routeStep * 1.5);
    for (let i = 0; i < propCount; i++) addProp(rng() < 0.38, rng() < 0.55);

    const wallTypes = ['banner', 'sign', 'lamp'];
    const wallCount = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < wallCount; i++) {
      const wall = this._wallForDecor(rng);
      if (!wall) break;
      const type = wallTypes[Math.floor(rng() * wallTypes.length)];
      const scale = 0.72 + rng() * 0.28;
      const temp = new StageProp(0, 0, type, rng() < 0.45, type === 'lamp', scale);
      const leftSide = rng() < 0.5;
      temp.x = Math.round(wall.x + (leftSide ? -temp.w + 2 : wall.w - 2));
      temp.y = Math.round(wall.y + 18 + rng() * Math.max(1, wall.h - temp.h - 36));
      temp.wallMounted = true;
      if (temp.y >= -520 && temp.y <= this.levelH + 20) {
        (temp.front ? this.stagePropsFront : this.stagePropsBack).push(temp);
      }
    }

    const cableCount = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < cableCount; i++) {
      const x = 160 + rng() * Math.max(1, this.levelW - 320);
      const y = 72 + rng() * 190;
      this.stageLanterns.push(new StageLantern(Math.round(x), Math.round(y), 'cable', 0));
    }
    if (rng() < 0.75) {
      const flyCount = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < flyCount; i++) {
        const dir = rng() < 0.5 ? 1 : -1;
        const x = dir > 0 ? -80 - i * 120 : this.levelW + 80 + i * 120;
        const y = 95 + rng() * 190;
        this.stageLanterns.push(new StageLantern(Math.round(x), Math.round(y), 'flyby', dir * (0.35 + rng() * 0.45)));
      }
    }
    const eerieTypes = ['statue', 'shrine', 'banner', 'lamp'];
    const eerieCount = Math.max(0, routeStep - 2);
    for (let i = 0; i < eerieCount; i++) {
      const p = this._surfaceForDecor(rng, 120, rng() < 0.65);
      if (!p) continue;
      const type = eerieTypes[Math.floor(rng() * eerieTypes.length)];
      const temp = new StageProp(0, 0, type, rng() < 0.5, type === 'banner' || type === 'lamp', 0.9 + rng() * 0.45);
      temp.x = Math.round(p.x + 14 + rng() * Math.max(1, p.w - temp.w - 28));
      temp.y = Math.round(p.y - temp.h);
      if (temp.y >= -520 && temp.y <= this.levelH + 20) {
        (temp.front ? this.stagePropsFront : this.stagePropsBack).push(temp);
      }
    }
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
      for (let attempt = 0; attempt < 8; attempt++) {
        const w = 95 + rng() * 75;
        const x = 180 + rng() * (width - 420);
        const y = 390 + Math.floor(rng() * 38);
        if (this._platformTooClose(x, y, w, 76, 38)) continue;
        P(x, y, w, 14, c2);
        break;
      }
    }
    this._addReachabilityThinPlatforms(TP, rng, { maxGap: 225, minGap: 120, maxY: 430 });
  }

  buildPlainMap(theme) {
    const rng = this._layoutRng('plain');
    const width = 2400 + Math.floor(rng() * 800);
    const { P, TP, R, c2, groundY } = this._procHelpers(theme, width, 480);
    const platformCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < platformCount; i++) {
      const x = 320 + i * ((width - 680) / Math.max(1, platformCount - 1)) + (rng() * 140 - 70);
      P(Math.max(160, Math.min(width - 260, x)), 405 + Math.floor(rng() * 36), 120 + Math.floor(rng() * 90), 14, c2);
    }
    this._addReachabilityThinPlatforms(TP, rng, { maxGap: 245, minGap: 130, maxY: 430 });
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
    const { P, R, c1, c2, groundY } = this._procHelpers(theme, width, 480);
    const wallCount = 6 + Math.floor(rng() * 4);
    const walls = [];
    for (let i = 0; i < wallCount; i++) {
      const x = 220 + i * ((width - 440) / Math.max(1, wallCount - 1)) + (rng() * 70 - 35);
      const h = 150 + Math.floor(rng() * 230);
      const w = 18 + Math.floor(rng() * 18);
      const wx = Math.max(120, Math.min(width - 150, x));
      P(wx, groundY - h, w, h, rng() < 0.5 ? c1 : c2);
      walls.push({ x: wx, y: groundY - h, w, h });
    }
    walls.sort((a, b) => a.x - b.x);
    const ropeTop = 8;
    for (let i = 0; i < walls.length - 1; i++) {
      const left = walls[i];
      const right = walls[i + 1];
      const gapCenter = (left.x + left.w + right.x) / 2 + (rng() * 44 - 22);
      const h = Math.max(210, Math.min(410, groundY - ropeTop - 60 - Math.floor(rng() * 45)));
      R(Math.max(70, Math.min(width - 95, gapCenter)), ropeTop, h);
    }
    for (let i = 0; i < walls.length; i += 2) {
      const wall = walls[i];
      const side = rng() < 0.5 ? -1 : 1;
      const x = wall.x + (side < 0 ? -38 : wall.w + 14);
      const h = 190 + Math.floor(rng() * 150);
      R(Math.max(60, Math.min(width - 90, x)), ropeTop, h);
    }
  }

  buildLaneMap(theme) {
    const rng = this._layoutRng('lane');
    const width = 2600 + Math.floor(rng() * 700);
    const { P, TP, c2, c3 } = this._procHelpers(theme, width, 480);
    const laneCount = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < laneCount; i++) {
      const y = 410 - i * (66 + Math.floor(rng() * 10));
      const rowOffset = (i % 2) * 140 + rng() * 60;
      let x = 150 + rowOffset;
      let previous = null;
      while (x < width - 240) {
        const w = 360 + Math.floor(rng() * 160);
        const thin = { x: Math.min(x, width - w - 90), y, w, h: 8 };
        const lanePlatform = new Platform(thin.x, thin.y, thin.w, thin.h, i % 2 === 0 ? c2 : c3);
        lanePlatform.playerDropThrough = true;
        this.platforms.push(lanePlatform);

        if (previous) {
          const gap = thin.x - (previous.x + previous.w);
          if (gap > 220) {
            const bridgeCount = gap > 390 ? 2 : 1;
            for (let b = 1; b <= bridgeCount; b++) {
              const bw = 110 + Math.floor(rng() * 34);
              const bx = previous.x + previous.w + (gap * b) / (bridgeCount + 1) - bw / 2;
              const by = y - 42 - Math.floor(rng() * 14);
              TP(Math.max(previous.x + previous.w + 28, Math.min(thin.x - bw - 28, bx)), by, bw);
            }
          }
        }

        previous = thin;
        x = thin.x + thin.w + 145 + Math.floor(rng() * 90);
      }
    }
    this._addReachabilityThinPlatforms(TP, rng, { maxGap: 235, minGap: 120, maxY: 430 });
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
      walker: '#3c4035', shooter: '#202837', jumper: '#302231', bouncer: '#393923',
      shielded: '#3b4a35', deflector: '#222635', protector: '#8a6416',
      attacker: '#4a1f24', flyer: '#312032', flyshooter: '#242a35',
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
    drawEnemySilhouettePath(ctx, cx - 24, cy - 28, 48, 56, bossType);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 2;
    drawEnemySilhouettePath(ctx, cx - 24, cy - 28, 48, 56, bossType);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    if (bossType === 'walker') {
      ctx.beginPath(); ctx.moveTo(cx - 28, cy + 2); ctx.lineTo(cx + 42, cy - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 47, cy - 11); ctx.lineTo(cx + 34, cy - 18); ctx.lineTo(cx + 37, cy - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (bossType === 'shooter' || bossType === 'flyshooter') {
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 44, cy - 2); ctx.stroke();
      ctx.fillRect(cx + 42, cy - 6, 7, 8);
    } else if (bossType === 'shielded' || bossType === 'protector') {
      ctx.fillRect(cx + 22, cy - 24, 10, 48);
      ctx.fillStyle = '#111'; ctx.fillRect(cx + 25, cy - 18, 3, 36);
    } else if (bossType === 'charger') {
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + 12, cy - 14); ctx.lineTo(cx + 42, cy - 30); ctx.moveTo(cx + 12, cy + 6); ctx.lineTo(cx + 42, cy + 20); ctx.stroke();
    } else if (bossType === 'jumper' || bossType === 'bouncer') {
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx - 12, cy + 18); ctx.lineTo(cx - 32, cy + 34); ctx.moveTo(cx + 12, cy + 18); ctx.lineTo(cx + 32, cy + 34); ctx.stroke();
    } else if (bossType === 'flyer') {
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx + 4, cy, 5, 0, Math.PI * 2); ctx.fill();
    } else if (bossType === 'deflector') {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 24, cy + 8); ctx.lineTo(cx + 32, cy - 20); ctx.stroke();
    }
    ctx.restore();
    return;

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

  _aliveHostileTypeCount(type) {
    let count = 0;
    for (const e of this.enemies) {
      if (!e || e.dead || e.friendly || e.type !== type) continue;
      count++;
    }
    return count;
  }

  _spawnHuntTarget(filter) {
    if (!filter) return;
    const typeToSpawn = filter.enemyType || 'walker';
    if (this._aliveHostileTypeCount(typeToSpawn) >= 6) return;
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
    const routeHunt = this._routeObjectiveOfType && this._routeObjectiveOfType('hunt');
    const markerColor = routeHunt && routeHunt.marker ? routeHunt.marker.color : '#ff0';
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, markerColor, 6, 3, 10));
  }

  _preferredObjectiveX() {
    if (this.levelType === 'tower') return 300;
    if (this.levelType === 'arena') return 520;
    if (this.levelType === 'narrow') return 580;
    return Math.max(180, Math.min(this.levelW - 180, this.levelW * 0.45));
  }

  _objectiveAnchor(preferredCenterX, objW, objH) {
    const fallbackX = Math.max(60, Math.min(this.levelW - objW - 60, preferredCenterX - objW / 2));
    let best = { x: fallbackX, y: 480 - objH };
    let bestScore = Infinity;
    for (const p of this.platforms) {
      if (!p || p.w < Math.max(72, objW + 16)) continue;
      if (p.w < p.h * 1.2) continue;
      if (p.y < -420 || p.y > this.levelH + 20) continue;
      const minX = Math.max(0, p.x + 8);
      const maxX = Math.min(this.levelW - objW, p.x + p.w - objW - 8);
      if (maxX < minX) continue;
      const x = Math.max(minX, Math.min(maxX, preferredCenterX - objW / 2));
      const center = x + objW / 2;
      const highPenalty = Math.max(0, 260 - p.y) * 0.35;
      const thinPenalty = p.thin ? 35 : 0;
      const edgePenalty = (x < 60 || x + objW > this.levelW - 60) ? 60 : 0;
      const score = Math.abs(center - preferredCenterX) + highPenalty + thinPenalty + edgePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y: p.y - objH, platform: p };
      }
    }
    return best;
  }

  _setupZoneObjective() {
    const zW = 130;
    const zH = 90;
    const anchor = this._objectiveAnchor(this._preferredObjectiveX(), zW, zH);
    this.objZone = { x: Math.round(anchor.x), y: Math.round(anchor.y), w: zW, h: zH };
  }

  _spawnRoninAlly(roomDef) {
    const power = roomDef ? this._roomPowerLevel(roomDef) : this.wave;
    const ally = new Enemy(0, 0, 'deflector', false, 1, power);
    ally.friendly = true;
    ally.objectiveAlly = true;
    ally.isRoninAlly = true;
    ally.color = '#c8a060';
    ally.baseColor = ally.color;
    ally.hp = Math.max(28, 18 + power * 8);
    ally.maxHp = ally.hp;
    ally.displayHp = ally.hp;
    ally.contactDmg = Math.max(2, Math.round(ally.contactDmg * 0.75));
    const anchor = this._objectiveAnchor(this._preferredObjectiveX(), ally.w + 24, ally.h);
    ally.x = Math.round(anchor.x + 12);
    ally.y = Math.round(anchor.y);
    ally.patrolLeft = Math.max(0, ally.x - 160);
    ally.patrolRight = Math.min(this.levelW, ally.x + 160);
    this.samurai = ally;
    this.enemies.push(ally);
    this.effects.push(new TextEffect(ally.x + ally.w / 2, ally.y - 12, 'RONIN ALLY', '#fda'));
  }

  _setupObjectiveActors(roomDef) {
    this.objZone = null;
    this.samurai = null;
    const obj = this.currentObjective;
    const routeZone = this._routeObjectiveOfType ? this._routeObjectiveOfType('zone') : null;
    const routeCollect = this._routeObjectiveOfType ? this._routeObjectiveOfType('collect') : null;
    if (!obj) return;
    if (obj.type === 'defend') {
      obj.label = 'Protect the Ronin';
      obj.desc = 'Keep the allied Ronin alive while the objective bar fills.';
    }
    if (obj.type === 'collect') {
      this.bossOrbsRequired = this._objectiveCollectTarget();
      this.bossOrbCharge = 0;
      this.bossOrbCooldown = 0;
      obj.label = 'Collect Shurikens';
      obj.desc = 'Collect 15 shurikens to charge the objective.';
    }
    if (routeCollect) {
      this.bossOrbsRequired = routeCollect.target || this._objectiveCollectTarget();
      this.bossOrbCharge = 0;
      this.bossOrbCooldown = 0;
    }
    if (obj.type === 'zone' || routeZone) {
      this._setupZoneObjective();
    } else if (obj.type === 'defend') {
      this._spawnRoninAlly(roomDef);
    } else if (obj.type === 'hunt') {
      for (const e of this.enemies) {
        if (!e.dead && this._matchesHuntFilter(e, obj.filter)) e.isHuntTarget = true;
      }
    }
  }

  _elementAllyTypes(roomDef) {
    const element = (roomDef && roomDef.element) || this.levelElement || null;
    const byElement = {
      fire: ['fire', 'earth'],
      spiky: ['fire', 'earth'],
      water: ['bubble', 'wind'],
      crystal: ['crystal', 'earth'],
      steel: ['earth', 'crystal'],
      ghost: ['shadow', 'storm'],
      lightning: ['storm', 'wind'],
      wind: ['wind', 'bubble']
    };
    if (element && byElement[element]) return byElement[element];
    const byArea = {
      forest: ['wind', 'fire'],
      mountain: ['crystal', 'earth'],
      volcano: ['fire', 'earth'],
      castle: ['shadow', 'crystal'],
      skies: ['storm', 'wind']
    };
    return byArea[(roomDef && roomDef.area) || this.currentRoomArea] || ['fire', 'wind'];
  }

  _spawnLevelAllies(roomDef) {
    this.allies = [];
    this.friendlyTargets = [];
    if (!roomDef || roomDef.kind === 'bridgeBoss') return;
    const roll = this._hashText(roomDef.id + ':ally-ninjas') % 100;
    if (roll >= 20) return;
    const power = this._roomPowerLevel(roomDef);
    const count = power >= 7 ? 2 : 1;
    const types = this._elementAllyTypes(roomDef);
    const baseX = this.levelType === 'tower' ? 330 : 170;
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length] || types[0] || 'fire';
      const anchor = this._objectiveAnchor(baseX + i * 58, 32, 32);
      const ally = new AllyNinja(Math.round(anchor.x + 4), Math.round(anchor.y), type, power, i);
      ally.patrolLeft = Math.max(0, ally.x - 160);
      ally.patrolRight = Math.min(this.levelW, ally.x + 200);
      this.allies.push(ally);
      this.effects.push(new TextEffect(ally.x + ally.w / 2, ally.y - 12, type.toUpperCase() + ' ALLY', ally.type.accentColor));
    }
  }

  _friendlyAlive(entity) {
    if (!entity || entity.dead) return false;
    if (entity === this.player) return entity.hp > 0 && (!entity.deathTimer || entity.deathTimer <= 0);
    return entity.hp === undefined || entity.hp > 0;
  }

  _refreshFriendlyTargets() {
    const targets = [];
    if (this._friendlyAlive(this.player)) targets.push(this.player);
    if (this.allies) {
      for (const ally of this.allies) {
        if (this._friendlyAlive(ally)) targets.push(ally);
      }
    }
    if (this._friendlyAlive(this.samurai)) targets.push(this.samurai);
    if (this._friendlyAlive(this.protectBuilding)) targets.push(this.protectBuilding);
    if (this._friendlyAlive(this.routeLady)) targets.push(this.routeLady);
    this.friendlyTargets = targets;
    return targets;
  }

  _entityHurtbox(entity) {
    return entity && entity.getHurtbox ? entity.getHurtbox() : entity;
  }

  _entityCenterX(entity) {
    const box = this._entityHurtbox(entity);
    return box ? box.x + box.w / 2 : 0;
  }

  _entityCenterY(entity) {
    const box = this._entityHurtbox(entity);
    return box ? box.y + box.h / 2 : 0;
  }

  _chooseEnemyTarget(source) {
    let targets = this.friendlyTargets && this.friendlyTargets.length ? this.friendlyTargets : this._refreshFriendlyTargets();
    if (!targets.length) return this.player;
    if (targets.length === 1) return targets[0] === source ? this.player : targets[0];
    if (source && source._allyTargetLock > 0 && this._friendlyAlive(source._allyTargetRef) && source._allyTargetRef !== source) {
      source._allyTargetLock--;
      return source._allyTargetRef;
    }
    if (source && source._allyTargetSeed === undefined) {
      source._allyTargetSeed = this._hashText((source.type || source.bossType || 'enemy') + ':' + Math.round(source.x) + ':' + Math.round(source.y));
    }
    const seed = source ? source._allyTargetSeed || 0 : 0;
    const sx = source ? source.x + source.w / 2 : this.player.x + this.player.w / 2;
    const sy = source ? source.y + source.h / 2 : this.player.y + this.player.h / 2;
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!this._friendlyAlive(target) || target === source) continue;
      const tx = this._entityCenterX(target);
      const ty = this._entityCenterY(target);
      const dx = tx - sx;
      const dy = ty - sy;
      const spread = 0.78 + (((seed + i * 53 + Math.floor(this.tick / 90) * 17) % 100) / 100) * 0.46;
      const playerDogpilePenalty = target === this.player ? 1.12 : 1;
      const score = (dx * dx + dy * dy * 0.8) * spread * playerDogpilePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = target;
      }
    }
    best = best || this.player;
    if (source) {
      source._allyTargetRef = best;
      source._allyTargetLock = 45 + (seed % 65);
    }
    return best;
  }

  _firstOverlappingFriendly(rect, source) {
    const targets = this.friendlyTargets && this.friendlyTargets.length ? this.friendlyTargets : this._refreshFriendlyTargets();
    for (const target of targets) {
      if (!this._friendlyAlive(target) || target === source) continue;
      const box = this._entityHurtbox(target);
      if (box && rectOverlap(rect, box)) return target;
    }
    return null;
  }

  _nearestFriendlyInRadius(cx, cy, radius, source) {
    const targets = this.friendlyTargets && this.friendlyTargets.length ? this.friendlyTargets : this._refreshFriendlyTargets();
    let best = null;
    let bestDist = radius * radius;
    for (const target of targets) {
      if (!this._friendlyAlive(target) || target === source) continue;
      const dx = this._entityCenterX(target) - cx;
      const dy = this._entityCenterY(target) - cy;
      const d = dx * dx + dy * dy;
      if (d <= bestDist) {
        bestDist = d;
        best = target;
      }
    }
    return best;
  }

  _damageFriendlyTarget(target, amount, element, killerInfo) {
    if (!this._friendlyAlive(target) || !target.takeDamage) return false;
    if (target.friendly && target.objectiveAlly) {
      if ((target._friendlyHitTimer || 0) > 0) return false;
      const dmg = Math.max(1, Math.round(amount || 1));
      target.hp = Math.max(0, target.hp - dmg);
      target.flashTimer = 12;
      target._friendlyHitTimer = 24;
      this.effects.push(new DamageNumber(target.x + target.w / 2, target.y, dmg, element || null));
      this.effects.push(new Effect(target.x + target.w / 2, target.y + target.h / 2, '#fff', 5, 2, 8));
      if (target.hp <= 0) {
        target.dead = true;
        this.bossOrbCharge = 0;
        const fallenText = target === this.protectBuilding ? 'GATE DESTROYED!' : (target === this.routeLady ? 'LADY FALLEN!' : 'RONIN FALLEN!');
        this.effects.push(new TextEffect(target.x + target.w / 2, target.y - 16, fallenText, '#f44'));
        triggerScreenShake(6, 15);
        SFX.enemyDie();
      }
      return true;
    }
    target.takeDamage(amount, this, element || null, killerInfo || { type: 'enemy', element: element || null, isBoss: false });
    return true;
  }

  _applyFriendlyKnockback(target, source, kbX, kbY, timer) {
    if (!target || (target.invincibleTimer || 0) > 0) return;
    target.vx = kbX;
    target.vy = kbY;
    if (target.knockbackTimer !== undefined) target.knockbackTimer = timer || 10;
  }

  _initObjective() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const roomDef = MAP_ROOM_BY_ID[this.currentRoomId];
    if (roomDef) {
      const cached = this._getRoomConfig(roomDef.id);
      this.routeObjectiveSet = cached.objectiveSet || null;
      this.routeObjectiveResult = null;
      this.routeObjectiveStart = {
        tick: this.tick || 0,
        waveKills: this.waveKills || 0,
        objectiveKills: this.objectiveKills || 0,
        bossOrbsCollected: this.bossOrbsCollected || 0,
      };
      if (cached.objective && cached.objective.type === 'mission') {
        this._initMissionDirector(roomDef, cached);
        return;
      }
      this.currentObjective = cached.objective || (this.routeObjectiveSet && this.routeObjectiveSet[0]) || roomDef.objective || {
        type: 'kills',
        label: 'Defeat Enemies',
        desc: 'Defeat enemies to fill the objective bar and draw out the boss.',
        icon: ''
      };
      this.pendingObjective = null;
      this._setupObjectiveActors(roomDef);
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
    this._setupObjectiveActors(null);
  }

  spawnEnemy() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const roomTypes = this.currentRoomEnemyTypes && this.currentRoomEnemyTypes.length
      ? this.currentRoomEnemyTypes.slice(0, 3)
      : null;
    const spawnPool = roomTypes
      ? roomTypes.map((type, idx) => ({ type, weight: Math.max(1, 4 - idx) }))
      : waveDef.pool;
    const cappedPool = spawnPool.filter(entry => this._aliveHostileTypeCount(entry.type) < 6);
    if (!cappedPool.length) return;
    let totalW = 0;
    for (const e of cappedPool) totalW += e.weight;
    let r = Math.random() * totalW;
    let pick = cappedPool[0];
    for (const e of cappedPool) {
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
    const routeElemBoost = Math.min(0.35, ((this.currentRouteStep || 0) * 0.06));
    const boostedChance = allowedElements.length ? Math.min(0.82, baseElemChance + 0.25 + routeElemBoost) : 0;
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
    this._applyEnemyBalance(e, pick);
    if (pick.big && (pick.type === 'protector' || pick.type === 'attacker')) {
      this.spawnedMiniboss.add(pick.type);
    }
    // Mark hunt target
    const _huntObj = (this._routeObjectiveOfType && this._routeObjectiveOfType('hunt')) || this.currentObjective;
    if (_huntObj && _huntObj.type === 'hunt' && this._matchesHuntFilter(e, _huntObj.filter)) {
      e.isHuntTarget = true;
    }
    this.enemies.push(e);
    this.effects.push(new Effect(x + e.w / 2, y + e.h / 2, e.element ? e.elementColors.particle : '#fff', 6, 3, 10));
  }

  spawnBoss() {
    const waveDef = WAVE_DEFS[this.currentWaveDefIdx] || WAVE_DEFS[0];
    const roomDef = MAP_ROOM_BY_ID[this.currentRoomId] || null;
    const bossType = this.currentRouteBossType || (waveDef && waveDef.boss) || 'walker';
    let bx = Math.min(this.player.x + 300, this.levelW - 100);
    let by = this.levelType === 'tower' ? 100 : 300;
    this.boss = new Boss(bx, by, bossType, 1, this._roomPowerLevel());
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
    this._applyBossBalance(this.boss, roomDef);
    this.bossActive = true;
    this.bossDeathRewardDelay = 0;
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
    SFX.alarmBoss();
    SFX.bossSpawn();
    SFX.bossRoar();
    this._flashObjectiveIndicator();
    const elemTag = this.boss.element ? ` [${this.boss.element.toUpperCase()}]` : '';
    this.showWaveMessage(this.boss.name + elemTag);
    // Boss entrance phrase
    this.ninjaResponseActive = false;
    const bPhrase = getBattlePhrase(bossType, this.player.ninjaType, this.boss.element);
    if (bPhrase) {
      this.phraseText = bPhrase;
      this.phraseTimer = 150;
      this.phraseMaxTimer = 150;
      this.phraseColor = this.boss.element ? ELEMENT_COLORS[this.boss.element].accent : '#faa';
      this.phraseSource = this.boss;
      // Schedule ninja response
      const nResp = getNinjaResponse(this.player.ninjaType, bossType, this.boss.element);
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
      route: {
        step: 0,
        lane: 'mid',
        previousLane: 'mid',
        history: [],
        next: null,
        allHard: true,
      },
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
      const freshRoute = this._freshMapState().route;
      return {
        currentRoomId: parsed.currentRoomId || MAP_START_ROOM_ID,
        route: Object.assign({}, freshRoute, parsed.route || {}),
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
    this.mapState.route = this.routeState || this.mapState.route || this._freshMapState().route;
    this.mapState.roomCache = this.roomCache;
    this.mapState.itemRoomAssignments = this.mapState.itemRoomAssignments || {};
    this.mapState.itemRewardChoices = this.mapState.itemRewardChoices || {};
    try {
      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(this.mapState));
    } catch (err) {
      // Local storage can fail in private mode; runtime cache still works.
    }
  }

  _routeLaneIndex(lane) {
    return Math.max(0, ROUTE_LANES.indexOf(lane));
  }

  _routeStageDef(step) {
    return ROUTE_STAGE_LAYOUTS[Math.max(0, Math.min(ROUTE_STAGE_LAYOUTS.length - 1, step || 0))];
  }

  _routeLayoutRoomId(step, lane) {
    const stage = this._routeStageDef(step);
    lane = ROUTE_LANES.includes(lane) ? lane : 'mid';
    return (stage && stage.lanes && (stage.lanes[lane] || stage.lanes.mid || stage.lanes.easy)) || MAP_START_ROOM_ID;
  }

  _routeBossFor(step, lane, previousLane, history) {
    if (step < ROUTE_FIXED_BOSSES.length) return ROUTE_FIXED_BOSSES[step] || 'walker';
    if (step >= ROUTE_STAGE_LAYOUTS.length - 1) {
      const allHard = (history || []).length >= ROUTE_STAGE_LAYOUTS.length - 1 && (history || []).every(h => h && h.route === 'hard');
      if (allHard) return ROUTE_FINAL_PERFECT_HARD_BOSS;
      return ROUTE_FINAL_BOSSES[lane] || 'flyshooter';
    }
    const matrixStep = Math.max(0, step - ROUTE_FIXED_BOSSES.length);
    const from = ROUTE_LANES.includes(previousLane) ? previousLane : 'mid';
    const to = ROUTE_LANES.includes(lane) ? lane : 'mid';
    const row = ROUTE_BOSS_MATRIX[from] || ROUTE_BOSS_MATRIX.mid;
    const list = row[to] || row.mid || ['deflector'];
    return list[Math.min(list.length - 1, matrixStep)] || 'deflector';
  }

  _routeElementFor(step, lane, bossType) {
    if (step < ROUTE_FIXED_BOSSES.length) return null;
    if (step >= ROUTE_STAGE_LAYOUTS.length - 1) {
      if (lane === 'hard') return 'ghost';
      if (lane === 'easy') return null;
      return null;
    }
    const pool = ROUTE_ELEMENTS[lane] || ROUTE_ELEMENTS.mid;
    const element = pool[step % pool.length] || null;
    if (bossType === 'flyshooter' && lane === 'hard') return 'lightning';
    return element;
  }

  _routeObjectiveSet(roomDef, bossType, step) {
    const enemies = (roomDef && roomDef.enemyTypes && roomDef.enemyTypes.length)
      ? roomDef.enemyTypes
      : ['walker', 'shooter', 'jumper'];
    const huntTarget = enemies.find(t => t !== bossType) || enemies[0] || 'walker';
    const typeName = { walker:'Brutes', shooter:'Gunners', jumper:'Leapers', bouncer:'Bouncers', charger:'Chargers',
                       shielded:'Guards', deflector:'Ronin', protector:'Aegis', attacker:'Nemesis',
                       flyer:'Flyers', flyshooter:'Overlords' }[huntTarget] || huntTarget;
    const depth = Math.max(0, step || 0);
    const midMarker = this._routeMarkerFor('mid');
    const hardMarker = this._routeMarkerFor('hard');
    const midObj = depth % 2 === 0
      ? Object.assign({}, ROUTE_OBJECTIVES[1], {
        filter: { enemyType: huntTarget },
        label: 'Hunt ' + typeName,
        desc: 'Marked enemies force this route.',
        target: 4 + Math.floor(depth * 1.5),
        icon: midMarker.symbol,
        marker: midMarker
      })
      : {
        route: 'mid',
        type: 'collect',
        label: 'Collect Caches',
        desc: 'Marked shuriken caches force this route.',
        target: Math.min(10, 5 + depth),
        icon: midMarker.symbol,
        marker: midMarker
      };
    const hardObj = depth % 2 === 0
      ? Object.assign({}, ROUTE_OBJECTIVES[2], {
        targetSeconds: 18 + depth * 4,
        target: 18 + depth * 4
      })
      : {
        route: 'hard',
        type: 'zone',
        label: 'Hold Marker',
        desc: 'Stand in the marked zone to force this route.',
        targetSeconds: 15 + depth * 3,
        target: 15 + depth * 3,
        zoneSeconds: 0,
        icon: hardMarker.symbol,
        marker: hardMarker
      };
    return [
      Object.assign({}, ROUTE_OBJECTIVES[0], { target: 12 + depth * 3 }),
      midObj,
      hardObj
    ];
  }

  _routeConfigFor(step, lane, previousLane, history) {
    step = Math.max(0, Math.min(ROUTE_STAGE_LAYOUTS.length - 1, step || 0));
    lane = ROUTE_LANES.includes(lane) ? lane : 'mid';
    previousLane = ROUTE_LANES.includes(previousLane) ? previousLane : lane;
    const roomId = this._routeLayoutRoomId(step, lane);
    const roomDef = MAP_ROOM_BY_ID[roomId] || MAP_ROOM_BY_ID[MAP_START_ROOM_ID];
    const bossType = this._routeBossFor(step, lane, previousLane, history || []);
    const element = this._routeElementFor(step, lane, bossType);
    const waveIdx = Math.max(0, WAVE_DEFS.findIndex(w => w.boss === bossType));
    const objectiveSet = null;
    const objective = { type: 'mission', label: 'Mission', desc: 'Survive the encounter chain and defeat the boss.', icon: '' };
    return { step, lane, previousLane, roomId: roomDef.id, roomDef, bossType, element, waveIdx, objectiveSet, objective };
  }

  _currentRouteConfig() {
    const route = this.routeState || this._freshMapState().route;
    if (route.next) return route.next;
    return this._routeConfigFor(route.step || 0, route.lane || 'mid', route.previousLane || route.lane || 'mid', route.history || []);
  }

  _getRoomConfig(roomId) {
    const roomDef = MAP_ROOM_BY_ID[roomId] || MAP_ROOM_BY_ID[MAP_START_ROOM_ID];
    const routeCfg = this._currentRouteConfig ? this._currentRouteConfig() : null;
    const routeApplies = routeCfg && routeCfg.roomId === roomDef.id;
    if (!this.roomCache[roomDef.id]) {
      this.roomCache[roomDef.id] = {
        id: roomDef.id,
        waveIdx: routeApplies ? routeCfg.waveIdx : roomDef.waveIdx,
        element: routeApplies ? routeCfg.element : (roomDef.element || null),
        elementTypes: routeApplies ? (routeCfg.element ? [routeCfg.element] : []) : this._roomElementTypes(roomDef),
        mapType: roomDef.mapType || null,
        enemyTypes: roomDef.enemyTypes ? roomDef.enemyTypes.slice() : null,
        area: roomDef.area || null,
        kind: roomDef.kind || 'stage',
        distance: routeApplies ? routeCfg.step : (roomDef.distance || 0),
        bossType: routeApplies ? routeCfg.bossType : roomDef.bossType,
        routeStep: routeApplies ? routeCfg.step : 0,
        routeLane: routeApplies ? routeCfg.lane : 'mid',
        objectiveSet: routeApplies ? routeCfg.objectiveSet : null,
        objective: routeApplies ? routeCfg.objective : (roomDef.objective || null),
        createdAtTick: this.tick || 0,
      };
    }
    if (routeApplies) {
      Object.assign(this.roomCache[roomDef.id], {
        waveIdx: routeCfg.waveIdx,
        element: routeCfg.element,
        elementTypes: routeCfg.element ? [routeCfg.element] : [],
        bossType: routeCfg.bossType,
        routeStep: routeCfg.step,
        routeLane: routeCfg.lane,
        distance: routeCfg.step,
        objectiveSet: routeCfg.objectiveSet,
        objective: routeCfg.objective,
      });
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
    if (!roomDef || (roomDef.id && roomDef.id === this.currentRoomId)) {
      return Math.max(1, (this.currentRouteStep || 0) + 1);
    }
    roomDef = roomDef || MAP_ROOM_BY_ID[this.currentRoomId];
    const distance = roomDef && roomDef.distance !== undefined ? roomDef.distance : 0;
    return Math.max(1, distance + 1);
  }

  _completedRoomCount() {
    return Object.keys((this.mapState && this.mapState.completed) || {}).length;
  }

  _mapProgressRatio(roomDef) {
    roomDef = roomDef || MAP_ROOM_BY_ID[this.currentRoomId];
    const maxDistance = MAP_ROOM_DEFS.reduce((m, r) => Math.max(m, r.distance || 0), 1);
    const distance = roomDef && roomDef.distance !== undefined ? roomDef.distance : 0;
    return Math.max(0, Math.min(1, distance / Math.max(1, maxDistance)));
  }

  _recomputeRoomLevelBonuses() {
    const pl = this.player;
    const prev = pl._roomLevelApplied || { maxHp: 0, damage: 0, elemental: 0, armor: 0, speed: 0, reach: 0 };
    pl.maxHp = Math.max(1, pl.maxHp - (prev.maxHp || 0));
    pl.hp = Math.min(pl.hp, pl.maxHp);
    pl.displayHp = Math.min(pl.displayHp || pl.hp, pl.maxHp);
    pl.bonusDamage -= prev.damage || 0;
    pl.bonusElemental -= prev.elemental || 0;
    pl.bonusArmor -= prev.armor || 0;
    pl.bonusSpeed -= prev.speed || 0;
    pl.bonusReach -= prev.reach || 0;

    const next = {
      maxHp: 0,
      damage: 0,
      elemental: 0,
      armor: 0,
      speed: 0,
      reach: 0,
    };
    pl._roomLevelApplied = next;
    pl.maxHp += next.maxHp;
    pl.hp = Math.min(pl.maxHp, pl.hp + Math.max(0, next.maxHp - (prev.maxHp || 0)));
    pl.displayHp = Math.min(pl.maxHp, pl.displayHp || pl.hp);
    pl.bonusDamage += next.damage;
    pl.bonusElemental += next.elemental;
    pl.bonusArmor += next.armor;
    pl.bonusSpeed += next.speed;
    pl.bonusReach += next.reach;
  }

  _balancedPlayerAttackDamage() {
    const pl = this.player;
    return Math.max(1, (pl.type ? pl.type.attackDamage : 1) + (pl.bonusDamage || 0));
  }

  _bossTargetHits(roomDef) {
    if (roomDef && roomDef.kind === 'trueFinal') return 60;
    if (roomDef && roomDef.kind === 'finalBoss') return 40;
    const progress = this._mapProgressRatio(roomDef);
    const kindBonus = roomDef && roomDef.kind === 'miniBoss' ? 5 : roomDef && roomDef.kind === 'bridgeBoss' ? 3 : 0;
    return Math.round(10 + progress * 22 + kindBonus);
  }

  _bossDamageFraction(roomDef) {
    if (roomDef && roomDef.kind === 'trueFinal') return 1.05;
    if (roomDef && roomDef.kind === 'finalBoss') return 0.90;
    if (roomDef && roomDef.kind === 'bridgeBoss') return 0.80;
    if (roomDef && roomDef.kind === 'miniBoss') return 0.60;
    return 0.60 + this._mapProgressRatio(roomDef) * 0.20;
  }

  _rawDamageForDeathHits(targetHits, element) {
    const pl = this.player;
    const bypassArmor = (element === 'spike' || element === 'fire' || element === 'lightning');
    const armorOffset = bypassArmor ? 0 : (pl.bonusArmor || 0);
    return Math.max(1, Math.ceil(pl.maxHp / Math.max(1, targetHits) + armorOffset));
  }

  _rawDamageForHealthFraction(fraction, element) {
    const pl = this.player;
    const bypassArmor = (element === 'spike' || element === 'fire' || element === 'lightning');
    const armorOffset = bypassArmor ? 0 : (pl.bonusArmor || 0);
    return Math.max(1, Math.ceil(pl.maxHp * Math.max(0.05, fraction) + armorOffset));
  }

  _applyBossBalance(boss, roomDef) {
    if (!boss) return;
    const attackDamage = this._balancedPlayerAttackDamage();
    const targetHits = this._bossTargetHits(roomDef);
    const damageFraction = this._bossDamageFraction(roomDef);
    if (boss._syncElementState) boss._syncElementState();
    const armorTax = boss.elementArmorMax ? Math.ceil(boss.elementArmorMax * 0.6) : 0;
    const targetHp = Math.max(attackDamage + 1, attackDamage * targetHits - armorTax) * 8;
    boss.hp = Math.max(1, Math.round(targetHp));
    boss.maxHp = boss.hp;
    boss.displayHp = boss.hp;
    boss.maxStance = Math.max(16, Math.ceil(boss.maxHp / 2));
    boss.stance = boss.maxStance;
    boss.displayStance = boss.stance;
    boss.staggerBar = 0;
    boss.stanceRecoverDelay = 0;
    boss.contactDmg = Math.max(3, this._rawDamageForHealthFraction(damageFraction, boss.element));
    boss._bossEhp = Math.max(8, boss.contactDmg * 5);
    boss._bossArm = 0;
    boss._targetHits = targetHits;
    boss._targetDamageFraction = damageFraction;
  }

  _enemyTargetHits(enemy, pick) {
    const typeHits = {
      walker: 3, shooter: 3, jumper: 4, bouncer: 4, charger: 4,
      shielded: 5, deflector: 6, protector: 6, attacker: 3, flyer: 3, flyshooter: 4
    };
    let hits = typeHits[enemy.type] || 4;
    if (pick && pick.big) hits += 4;
    if (enemy.element === 'steel' || enemy.element === 'spiky') hits = Math.max(3, hits - 1);
    return hits;
  }

  _applyEnemyBalance(enemy, pick) {
    if (!enemy) return;
    if (enemy._syncElementState) enemy._syncElementState();
    const attackDamage = this._balancedPlayerAttackDamage();
    const targetHits = this._enemyTargetHits(enemy, pick);
    const armorTax = enemy.elementArmorMax ? Math.ceil(enemy.elementArmorMax * 0.5) : 0;
    const hp = Math.max(attackDamage + 1, attackDamage * targetHits - armorTax) * 8;
    enemy.hp = Math.max(1, Math.round(hp));
    enemy.maxHp = enemy.hp;
    enemy.displayHp = enemy.hp;
    enemy.maxStance = Math.max(4, Math.ceil(enemy.maxHp / 4));
    enemy.stance = enemy.maxStance;
    enemy.displayStance = enemy.stance;
    enemy.staggerBar = 0;
    enemy.stanceRecoverDelay = 0;

    const isBig = pick && pick.big;
    enemy.contactDmg = this._rawDamageForHealthFraction(isBig ? 0.55 : 0.40, enemy.element);
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

  _nextItemForBossType(bossType) {
    const drops = BOSS_ITEM_DROPS[bossType] || [];
    for (const itemId of drops) {
      if (BOSS_ITEMS[itemId] && !(this.player.items && this.player.items[itemId])) return itemId;
    }
    return null;
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
    const routeCfg = this._currentRouteConfig();
    roomId = routeCfg ? routeCfg.roomId : roomId;
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
    this.currentRouteStep = cached.routeStep || 0;
    this.currentRouteLane = cached.routeLane || 'mid';
    this.currentRouteBossType = cached.bossType || roomDef.bossType;
    this.routeObjectiveSet = cached.objectiveSet || null;
    this.routeObjectiveResult = null;
    this.routeObjectiveStart = null;
    if (this.routeState) this.routeState.next = null;
    this.pendingObjective = null;
    this._recomputeRoomLevelBonuses();
    this._recomputeItemAttributeBonuses();
    this.wave = (cached.routeStep || 0) + 1;
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
    this.missionDirector = null;
    this.missionSeals = [];
    this.protectBuilding = null;
    this.routeLady = null;
    this.boss = null;
    this.bossActive = false;
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.bubbleShieldPickups = [];
    this.heartPickups = [];
    this.enemies = [];
    this.allies = [];
    this.friendlyTargets = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.fireTrails = [];
    const oldLevelType = this.levelType;
    this.buildLevel();
    this._spawnLevelAllies(MAP_ROOM_BY_ID[this.currentRoomId]);
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
    this.player.hp = this.player.maxHp;
    this.player.displayHp = this.player.hp;
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
    const fresh = this._freshMapState();
    this.mapState.route = fresh.route;
    this.mapState.completed = {};
    this.mapState.unlocked = fresh.unlocked;
    this.mapState.currentRoomId = MAP_START_ROOM_ID;
    this.routeState = this.mapState.route;
    this.currentRoomId = MAP_START_ROOM_ID;
    this.roomCache = {};
    this.mapScreen = null;
    this.boss = null;
    this.bossActive = false;
    this.missionDirector = null;
    this.missionSeals = [];
    this.protectBuilding = null;
    this.routeLady = null;
    this.projectiles = [];
    this.hitLines = [];
    this.grenades = [];
    this.enemies = [];
    this.allies = [];
    this.friendlyTargets = [];
    this.orbs = [];
    this.shurikenPickups = [];
    this.heartPickups = [];
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
    this._enterMapRoom(MAP_START_ROOM_ID);
    this.showWaveMessage(this._objectiveStartMessage());
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
    const bossType = this.currentRouteBossType || (this.boss && this.boss.bossType) || roomDef.bossType;
    const rewardItem = this._nextItemForBossType(bossType);
    const secondaryDone = this._roomSecondaryComplete(roomDef) || !!(previousClear && previousClear.secondaryDone);
    const routeResult = this.routeObjectiveResult || 'mid';
    this.mapState.completed[roomDef.id] = {
      waveIdx: roomDef.waveIdx,
      element: this.levelElement || null,
      bossType,
      kills: Math.max(this.waveKills, previousClear ? previousClear.kills || 0 : 0),
      secondaryDone,
      routeResult,
    };
    recordWaveClear((this.currentRouteStep || 0) + 1, this.player.ninjaType);
    this.player.defeatedBossTypes.add(bossType);
    this.showWaveMessage('VICTORY!');
    this.effects.push(new TextEffect(this.player.x + this.player.w / 2, this.player.y - 42, 'VICTORY!', '#ffe033'));
    if (rewardItem) {
      this._grantBossItem(rewardItem);
      this.itemPickupOverlay = { itemId: rewardItem, timer: 180 };
    }
    const route = this.routeState || this._freshMapState().route;
    const completedStep = route.step || 0;
    route.history = route.history || [];
    route.history.push({ step: completedStep, lane: route.lane || 'mid', route: routeResult, bossType, element: this.levelElement || null, roomId: roomDef.id });
    route.allHard = !!route.allHard && routeResult === 'hard';
    if (completedStep >= ROUTE_STAGE_LAYOUTS.length - 1) {
      this.gameWon = true;
      this.boss = null;
      this.bossActive = false;
      this.enemies = [];
      this.allies = [];
      this.friendlyTargets = [];
      this.projectiles = [];
      this.hitLines = [];
      this.showWaveMessage('VICTORY!');
      SFX.victory();
      recordGoodEnding();
      this._saveMapState();
      return;
    }
    const nextStep = completedStep + 1;
    const previousLane = route.lane || 'mid';
    const nextLane = routeResult;
    const nextCfg = this._routeConfigFor(nextStep, nextLane, previousLane, route.history);
    route.previousLane = previousLane;
    route.lane = nextLane;
    route.step = nextStep;
    route.next = nextCfg;
    this.routeState = route;
    this.mapState.route = route;
    this.mapState.unlocked[nextCfg.roomId] = true;
    recentUnlocks.push(nextCfg.roomId);
    this._saveMapState();
    this.mapScreen = {
      selected: Math.max(0, MAP_ROOM_DEFS.findIndex(r => r.id === nextCfg.roomId)),
      recentUnlocks,
      completedRoomId: roomDef.id,
      routeAutoAdvance: true,
      nextRoomId: nextCfg.roomId,
      nextRoute: nextLane,
      zoom: this.mapZoom || (this.mapScreen && this.mapScreen.zoom) || 1,
      delay: 120,
    };
    this.boss = null;
    this.bossActive = false;
    this.enemies = [];
    this.allies = [];
    this.friendlyTargets = [];
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
      { type: 'zone',    label: 'Protect the Zone',     desc: 'Stand in the marked zone to charge Boss Orbs.',             icon: '◈' },
      { type: 'collect', label: 'Collect Shurikens',    desc: 'Collect 15 shurikens to charge the objective.',            icon: '✦' },
      { type: 'defend',  label: 'Protect the Ronin',     desc: 'Keep the allied Ronin alive — they charge Boss Orbs.',    icon: '⊕' },
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
    this.heartPickups = [];
    this.enemies = [];
    this.allies = [];
    this.friendlyTargets = [];
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
    this._spawnLevelAllies(MAP_ROOM_BY_ID[this.currentRoomId]);
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

  _updateHeartPickups() {
    this.heartPickups = this._updatePickupArray(this.heartPickups, HeartPickupOrb);
  }

  _updateFieldPickups() {
    this._updateShurikenPickups();
    this._updateBubbleShieldPickups();
    this._updateHeartPickups();
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

  _renderRoninAllyMarker(ctx, cam) {
    const sam = this.samurai;
    if (!sam) return;
    const sx = sam.x + sam.w / 2 - cam.x;
    const sy = sam.y - cam.y;
    ctx.save();
    if (sam.dead) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f44';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RONIN FALLEN', sx, sy - 14);
      ctx.restore();
      return;
    }
    const pulse = 0.75 + Math.sin(this.tick * 0.12) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#4f4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4f4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 28);
    ctx.lineTo(sx + 8, sy - 20);
    ctx.lineTo(sx, sy - 12);
    ctx.lineTo(sx - 8, sy - 20);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    const bw = 46;
    const bh = 5;
    const bx = sx - bw / 2;
    const by = sy - 8;
    const hpPct = Math.max(0, Math.min(1, sam.hp / Math.max(1, sam.maxHp)));
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#f44';
    ctx.fillRect(bx, by, Math.round(bw * hpPct), bh);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fda';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALLY RONIN', sx, sy - 32);
    ctx.restore();
  }

  _renderZoneLady(ctx, cam) {
    const z = this.objZone;
    const routeZone = this._routeObjectiveOfType && this._routeObjectiveOfType('zone');
    const missionZone = this.missionDirector && this.missionDirector.phases &&
      this.missionDirector.phases[this.missionDirector.phaseIndex] &&
      this.missionDirector.phases[this.missionDirector.phaseIndex].type === 'zone';
    if (!z || this.bossActive || (!missionZone && !routeZone && this.currentObjective && this.currentObjective.type !== 'zone')) return;
    const zoneMarker = routeZone && routeZone.marker ? routeZone.marker : { color: '#9fbaff' };

    const pl = this.player;
    const inZone = pl.x + pl.w > z.x && pl.x < z.x + z.w &&
                   pl.y + pl.h > z.y && pl.y < z.y + z.h;
    const t = this.tick || 0;
    const cx = z.x + z.w / 2 - cam.x;
    const baseY = z.y + z.h - 8 - cam.y;
    const bob = Math.sin(t * 0.08) * 1.5;
    const glow = inZone ? '#68ffad' : zoneMarker.color;

    ctx.save();
    ctx.translate(Math.round(cx) + 0.5, Math.round(baseY + bob) + 0.5);

    ctx.globalAlpha = 0.38 + Math.sin(t * 0.09) * 0.08;
    ctx.fillStyle = inZone ? 'rgba(92,255,174,0.42)' : zoneMarker.color;
    ctx.globalAlpha = inZone ? 0.42 : 0.22;
    ctx.beginPath();
    ctx.ellipse(0, -19, 30, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd7c2';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, -27);
    ctx.lineTo(-18, -18);
    ctx.moveTo(9, -27);
    ctx.lineTo(18, -18);
    ctx.stroke();

    ctx.fillStyle = '#2f2334';
    ctx.fillRect(-7, -15, 4, 15);
    ctx.fillRect(3, -15, 4, 15);

    ctx.fillStyle = inZone ? '#53d88f' : '#6688dd';
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(15, -3);
    ctx.lineTo(-15, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f7eef8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffeff7';
    ctx.fillRect(-4, -25, 8, 4);
    ctx.fillStyle = '#ffd7c2';
    ctx.fillRect(-6, -38, 12, 11);
    ctx.fillRect(-3, -29, 6, 5);

    ctx.fillStyle = '#3a2030';
    ctx.fillRect(-8, -42, 16, 5);
    ctx.fillRect(-9, -38, 4, 12);
    ctx.fillRect(5, -38, 4, 10);

    ctx.fillStyle = '#2b1b24';
    ctx.fillRect(-3, -34, 2, 2);
    ctx.fillRect(3, -34, 2, 2);
    ctx.fillStyle = '#d75d7a';
    ctx.fillRect(-2, -31, 4, 1);

    ctx.fillStyle = '#f4d24c';
    ctx.fillRect(5, -43, 3, 3);
    ctx.fillRect(8, -42, 2, 2);

    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-18, -17);
    ctx.quadraticCurveTo(0, -9 + Math.sin(t * 0.12) * 2, 18, -17);
    ctx.stroke();

    const heartY = -51 + Math.sin(t * 0.12) * 2;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = inZone ? '#fff3f8' : '#ffe0ec';
    ctx.beginPath();
    ctx.arc(-3, heartY, 3, 0, Math.PI * 2);
    ctx.arc(3, heartY, 3, 0, Math.PI * 2);
    ctx.moveTo(-6, heartY + 1);
    ctx.lineTo(0, heartY + 9);
    ctx.lineTo(6, heartY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  _isPlayerChainSlowingWorld() {
    const pl = this.player;
    return !!(pl && (pl.chainStriking || pl.stormChaining || pl.staggerChaining));
  }

  _shouldUpdateChainSlowedWorld() {
    if (!this._isPlayerChainSlowingWorld()) {
      this._chainSlowFrame = 0;
      return true;
    }
    this._chainSlowFrame = (this._chainSlowFrame || 0) + 1;
    return this._chainSlowFrame % 6 === 0;
  }

  _cleanupLiveObjects() {
    compactLiveArray(this.allies, keepEnemyAlive, GAME_OBJECT_LIMITS.allies);
    this._refreshFriendlyTargets();
    compactLiveArray(this.enemies, keepEnemyAlive);
    compactLiveArray(this.projectiles, keepNotDone, GAME_OBJECT_LIMITS.projectiles);
    compactLiveArray(this.hitLines, keepNotDone, GAME_OBJECT_LIMITS.hitLines);
    compactLiveArray(this.grenades, keepNotDone, GAME_OBJECT_LIMITS.grenades);
    compactLiveArray(this.effects, keepNotDone, GAME_OBJECT_LIMITS.effects);
    compactLiveArray(this.stoneBlocks, keepNotDone, GAME_OBJECT_LIMITS.stoneBlocks);
    compactLiveArray(this.bubbles, keepNotDone, GAME_OBJECT_LIMITS.bubbles);
    compactLiveArray(this.stagePropsBack, keepNotDone, GAME_OBJECT_LIMITS.stageProps);
    compactLiveArray(this.stagePropsFront, keepNotDone, GAME_OBJECT_LIMITS.stageProps);
    compactLiveArray(this.stageLanterns, keepNotDone, GAME_OBJECT_LIMITS.stageLanterns);
    compactLiveArray(this.bloodStains, keepNotDone, GAME_OBJECT_LIMITS.bloodStains);
    compactLiveArray(this.orbs, keepNotDone, GAME_OBJECT_LIMITS.orbs);
    compactLiveArray(this.bossItems, keepNotDone);
  }

  _updateCameraFollow() {
    const targetCamX = this.player.x + this.player.w / 2 - CANVAS_W / 2;
    const targetCamY = this.player.y + this.player.h / 2 - CANVAS_H / 2;
    this.camera.x = lerp(this.camera.x, targetCamX, 0.08);
    this.camera.y = lerp(this.camera.y, targetCamY, 0.08);
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.levelW - CANVAS_W));
    this.camera.y = Math.max(this.levelType === 'tower' ? -600 : -100, Math.min(this.camera.y, 540 - CANVAS_H));
  }

  _renderChainFreezeOverlay(ctx, cam) {
    if (!this._isPlayerChainSlowingWorld()) return;
    const pl = this.player;
    const t = this.tick;
    const px = pl.x + pl.w / 2 - cam.x;
    const py = pl.y + pl.h / 2 - cam.y;
    const color = pl.stormChaining ? '#ffe96a' : (pl.chainStriking ? '#b56cff' : '#f4f0ff');
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.22);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const grad = ctx.createRadialGradient(px, py, 20, px, py, 420);
    grad.addColorStop(0, 'rgba(255,255,255,0.00)');
    grad.addColorStop(0.45, 'rgba(90,40,150,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35 + pulse * 0.25;
    ctx.beginPath();
    ctx.arc(px, py, 34 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18 + pulse * 0.18;
    ctx.beginPath();
    ctx.arc(px, py, 78 + pulse * 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.035 + i * Math.PI * 2 / 12;
      const inner = 50 + (i % 3) * 10;
      const outer = 160 + pulse * 40 + (i % 4) * 18;
      ctx.globalAlpha = 0.10 + ((i + t) % 4 === 0 ? 0.18 : 0);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * inner, py + Math.sin(a) * inner);
      ctx.lineTo(px + Math.cos(a) * outer, py + Math.sin(a) * outer);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    //const label = pl.staggerChaining ? 'CHAIN FINISH - SLOW TIME' : (pl.stormChaining ? 'STORM CHAIN - SLOW TIME' : 'SHADOW CHAIN - SLOW TIME');
    //ctx.fillText(label, px, py - 58 - pulse * 4);
    ctx.restore();
  }

  _renderMissionObjects(ctx, cam) {
    const t = this.tick || 0;
    if (this.protectBuilding && !this.protectBuilding.dead) {
      const b = this.protectBuilding;
      const sx = b.x - cam.x, sy = b.y - cam.y;
      const pct = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
      ctx.save();
      ctx.translate(Math.round(sx) + 0.5, Math.round(sy) + 0.5);
      ctx.fillStyle = '#34281f';
      ctx.fillRect(4, 18, b.w - 8, b.h - 18);
      ctx.fillStyle = '#5f4730';
      ctx.fillRect(10, 28, b.w - 20, b.h - 28);
      ctx.fillStyle = '#2b1f19';
      ctx.fillRect(26, 42, 22, 28);
      ctx.strokeStyle = '#d9b36a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(b.w / 2, 0);
      ctx.lineTo(b.w, 22);
      ctx.stroke();
      ctx.fillStyle = '#d9b36a';
      ctx.fillRect(17, 31, 10, 10);
      ctx.fillRect(48, 31, 10, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(4, -11, b.w - 8, 6);
      ctx.fillStyle = pct > 0.35 ? '#4f8' : '#f44';
      ctx.fillRect(4, -11, (b.w - 8) * pct, 6);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, -11, b.w - 8, 6);
      ctx.fillStyle = '#ffe0a0';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GATE', b.w / 2, -17);
      ctx.restore();
    }

    if (this.routeLady && !this.routeLady.dead) {
      const l = this.routeLady;
      const sx = l.x - cam.x, sy = l.y - cam.y;
      const cx = sx + l.w / 2;
      const baseY = sy + l.h;
      const pct = Math.max(0, Math.min(1, l.hp / Math.max(1, l.maxHp)));
      const auraColor = l.blessing === 'heal' ? '#68ffad' : (l.blessing === 'purge' ? '#ffe033' : '#9fbaff');
      ctx.save();
      ctx.globalAlpha = 0.24 + Math.sin(t * 0.08) * 0.05;
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 3, 72, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 3, 82, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a2030';
      ctx.fillRect(cx - 58, baseY - 18, 8, 18);
      ctx.fillRect(cx + 50, baseY - 18, 8, 18);
      ctx.fillStyle = '#ffd35a';
      ctx.fillRect(cx - 58, baseY - 25, 8, 7);
      ctx.fillRect(cx + 50, baseY - 25, 8, 7);
      ctx.fillStyle = '#6b263d';
      ctx.fillRect(sx + 6, sy + 16, l.w - 12, l.h - 12);
      ctx.fillStyle = '#f7c7d8';
      ctx.fillRect(sx + 8, sy + 4, l.w - 16, 14);
      ctx.fillStyle = '#ffe8f1';
      ctx.fillRect(sx + 10, sy + 2, l.w - 20, 8);
      ctx.fillStyle = '#24131d';
      ctx.fillRect(sx + 10, sy + 10, 3, 3);
      ctx.fillRect(sx + l.w - 13, sy + 10, 3, 3);
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 19, sy + 23);
      ctx.quadraticCurveTo(cx, sy + 13 + Math.sin(t * 0.1) * 3, cx + 19, sy + 23);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.fillRect(cx - 28, sy - 16, 56, 6);
      ctx.fillStyle = pct > 0.35 ? '#4f8' : '#f44';
      ctx.fillRect(cx - 28, sy - 16, 56 * pct, 6);
      ctx.strokeStyle = '#ffe0ec';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 28, sy - 16, 56, 6);
      ctx.fillStyle = auraColor;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText((l.blessing || 'summon').toUpperCase(), cx, sy - 22);
      ctx.restore();
    }

    const md = this.missionDirector;
    const bomb = md && md.routeEvent && md.routeEvent.carriage;
    if (bomb && !bomb.dead) {
      const sx = bomb.x - cam.x, sy = bomb.y - cam.y;
      const pct = Math.max(0, Math.min(1, bomb.hp / Math.max(1, bomb.maxHp)));
      ctx.save();
      ctx.fillStyle = '#3b2418';
      ctx.fillRect(sx + 5, sy + 10, bomb.w - 10, bomb.h - 12);
      ctx.fillStyle = '#6b3a20';
      ctx.fillRect(sx + 12, sy + 4, bomb.w - 24, 16);
      ctx.fillStyle = '#19100c';
      ctx.beginPath();
      ctx.arc(sx + 13, sy + bomb.h - 4, 7, 0, Math.PI * 2);
      ctx.arc(sx + bomb.w - 13, sy + bomb.h - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6a3d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + bomb.w * 0.35, sy + 4);
      ctx.quadraticCurveTo(sx + bomb.w * 0.45, sy - 10 + Math.sin(t * 0.25) * 2, sx + bomb.w * 0.58, sy + 4);
      ctx.stroke();
      ctx.fillStyle = '#ffcf33';
      ctx.fillRect(sx + bomb.w * 0.56, sy - 2, 6, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      ctx.fillRect(sx + 2, sy - 12, bomb.w - 4, 5);
      ctx.fillStyle = pct > 0.35 ? '#ffb347' : '#f44';
      ctx.fillRect(sx + 2, sy - 12, (bomb.w - 4) * pct, 5);
      ctx.restore();
    }

    for (const seal of this.missionSeals || []) {
      if (!seal || seal.done) continue;
      const sx = seal.x + seal.w / 2 - cam.x;
      const sy = seal.y + seal.h / 2 + Math.sin(seal.bob || 0) * 4 - cam.y;
      ctx.save();
      ctx.translate(Math.round(sx) + 0.5, Math.round(sy) + 0.5);
      ctx.rotate(Math.sin(t * 0.05 + seal.bob) * 0.15);
      ctx.shadowColor = '#9fbaff';
      ctx.shadowBlur = 12 + Math.sin(t * 0.09) * 4;
      ctx.strokeStyle = '#9fbaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(159,186,255,0.28)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', 0, 1);
      ctx.restore();
    }
  }

  _nearestMissionSeal() {
    let best = null;
    let bestDist = Infinity;
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    for (const seal of this.missionSeals || []) {
      if (!seal || seal.done) continue;
      const sx = seal.x + seal.w / 2;
      const sy = seal.y + seal.h / 2;
      const dx = sx - px;
      const dy = sy - py;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = seal;
      }
    }
    return best;
  }

  _currentObjectiveIndicatorTarget() {
    if (this.boss && !this.boss.dead) {
      return { entity: this.boss, label: 'BOSS', color: this.boss.element && this.boss.elementColors ? this.boss.elementColors.accent : '#f44' };
    }
    const md = this.missionDirector;
    const missionTarget = this._missionMinibossIndicatorTarget();
    if (missionTarget) {
      return missionTarget;
    }
    if (md && md.routeEvent && !md.routeEvent.done && !md.routeEvent.failed) {
      const event = md.routeEvent;
      if (event.type === 'protect') {
        const target = event.target === 'building' ? this.protectBuilding : this.samurai;
        if (target && !target.dead && target.hp > 0) return { entity: target, label: 'PROTECT', color: '#4f8' };
      }
      if (event.type === 'lady') {
        const target = this.routeLady;
        if (target && !target.dead && target.hp > 0) return { entity: target, label: 'PROTECT', color: '#ffe0ec' };
      }
      if (event.type === 'zone' && this.objZone) {
        return { entity: this.objZone, label: 'PROTECT', color: '#68ffad' };
      }
      if (event.type === 'seals') {
        const seal = this._nearestMissionSeal();
        if (seal) return { entity: seal, label: 'COLLECT', color: '#9fbaff' };
      }
      if (event.type === 'bomb') {
        const target = event.carriage || this.protectBuilding;
        if (target && !target.dead) return { entity: target, label: 'DISARM', color: '#ff6a3d' };
      }
      if (event.type === 'escapeKill') {
        const target = event.target;
        if (target && !target.dead) return { entity: target, label: 'KILL', color: target.routeObjectiveColor || '#39d8ff' };
      }
    }
    for (const e of this.enemies || []) {
      if (e && !e.dead && e.isMissionMiniboss) return { entity: e, label: 'KILL', color: '#ffe033' };
      if (e && !e.dead && e.isRouteEscapeTarget) return { entity: e, label: 'KILL', color: e.routeObjectiveColor || '#39d8ff' };
      if (e && !e.dead && e.isHuntTarget) return { entity: e, label: 'KILL', color: '#ff0' };
    }
    if (this.currentObjective && this.currentObjective.type === 'defend' && this.samurai && !this.samurai.dead) {
      return { entity: this.samurai, label: 'PROTECT', color: '#4f8' };
    }
    if (this.currentObjective && this.currentObjective.type === 'zone' && this.objZone) {
      return { entity: this.objZone, label: 'PROTECT', color: '#68ffad' };
    }
    return null;
  }

  _missionMinibossIndicatorTarget() {
    const md = this.missionDirector;
    if (!md) return null;
    if (md.minibossCaptain && !md.minibossCaptain.dead) {
      const guard = (md.minibosses || []).find(e => e && !e.dead && e.missionMinibossRole === 'guard' && e.missionPhaseIndex === md.phaseIndex);
      if (guard) return { entity: guard, label: 'KILL', color: '#ffb347' };
      return { entity: md.minibossCaptain, label: 'KILL', color: md.minibossCaptain.element && md.minibossCaptain.elementColors ? md.minibossCaptain.elementColors.accent : '#ffe033' };
    }
    const squadTarget = (md.minibosses || []).find(e => e && !e.dead && e.missionPhaseIndex === md.phaseIndex);
    if (squadTarget) {
      return { entity: squadTarget, label: 'KILL', color: squadTarget.missionMinibossRole === 'squad' ? '#ffb347' : (squadTarget.element && squadTarget.elementColors ? squadTarget.elementColors.accent : '#ffe033') };
    }
    if (md.miniboss && !md.miniboss.dead) {
      return { entity: md.miniboss, label: 'KILL', color: md.miniboss.element && md.miniboss.elementColors ? md.miniboss.elementColors.accent : '#ffe033' };
    }
    return null;
  }

  _renderObjectiveTargetIndicator(ctx, cam) {
    const targetInfo = this._currentObjectiveIndicatorTarget();
    if (!targetInfo || !targetInfo.entity) return;
    const target = targetInfo.entity;
    const color = targetInfo.color || '#ffe033';
    const cx = target.x + target.w / 2 - cam.x;
    const cy = target.y + target.h / 2 - cam.y;
    const margin = 38;
    const onScreen = cx >= margin && cx <= CANVAS_W - margin && cy >= margin && cy <= CANVAS_H - margin;
    const t = this.tick || 0;
    const intro = Math.max(0, this.objectiveIndicatorIntroTimer || 0);
    const introPct = Math.min(1, intro / 96);
    const introEase = introPct * introPct;
    const introScale = 1 + introEase * 4.2;

    ctx.save();
    if (intro > 0) {
      ctx.globalAlpha = introEase * 0.22;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = Math.min(1, introEase * 1.2);
      ctx.textAlign = 'center';
      ctx.font = '900 ' + Math.round(22 + introEase * 22) + 'px monospace';
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 + introEase * 32;
      ctx.strokeStyle = '#120016';
      ctx.lineWidth = 8;
      ctx.fillStyle = color;
      const announceY = 78 + Math.sin(t * 0.15) * introEase * 6;
      ctx.strokeText(targetInfo.label, CANVAS_W / 2, announceY);
      ctx.fillText(targetInfo.label, CANVAS_W / 2, announceY);
      ctx.shadowBlur = 0;
    }
    if (onScreen) {
      const y = cy - target.h / 2 - 24 - introEase * 28 + Math.sin(t * 0.12) * (3 + introEase * 10);
      ctx.globalAlpha = 0.86 + Math.sin(t * 0.14) * 0.12;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16 + introEase * 54;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 + introEase * 5;
      if (introEase > 0.02) {
        const ringR = (38 + Math.max(target.w, target.h) * 0.45) * (0.65 + introEase * 1.25);
        ctx.globalAlpha = 0.28 + introEase * 0.52;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.55 + introEase * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx - ringR - 18, cy);
        ctx.lineTo(cx - ringR + 18, cy);
        ctx.moveTo(cx + ringR - 18, cy);
        ctx.lineTo(cx + ringR + 18, cy);
        ctx.moveTo(cx, cy - ringR - 18);
        ctx.lineTo(cx, cy - ringR + 18);
        ctx.moveTo(cx, cy + ringR - 18);
        ctx.lineTo(cx, cy + ringR + 18);
        ctx.stroke();
        ctx.globalAlpha = 0.86 + Math.sin(t * 0.14) * 0.12;
      }
      ctx.beginPath();
      ctx.moveTo(cx, y - 14 * introScale);
      ctx.lineTo(cx + 12 * introScale, y);
      ctx.lineTo(cx, y + 14 * introScale);
      ctx.lineTo(cx - 12 * introScale, y);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = '900 ' + Math.round(11 + introEase * 18) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#120016';
      ctx.lineWidth = introEase > 0.05 ? 6 : 0;
      if (introEase > 0.05) ctx.strokeText(targetInfo.label, cx, y - 21 * introScale);
      ctx.fillText(targetInfo.label, cx, y - 21 * introScale);
    } else {
      const centerX = CANVAS_W / 2;
      const centerY = CANVAS_H / 2;
      const dx = cx - centerX;
      const dy = cy - centerY;
      const angle = Math.atan2(dy, dx);
      const edgeX = Math.max(margin, Math.min(CANVAS_W - margin, cx));
      const edgeY = Math.max(margin, Math.min(CANVAS_H - margin, cy));
      const pulse = (1 + Math.sin(t * 0.16) * 0.12) * introScale;
      ctx.globalAlpha = 0.94;
      ctx.translate(edgeX, edgeY);
      ctx.shadowColor = color;
      ctx.shadowBlur = 18 + introEase * 60;
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#120016';
      ctx.lineWidth = 5 + introEase * 5;
      ctx.beginPath();
      ctx.moveTo(22 * pulse, 0);
      ctx.lineTo(-13 * pulse, -15 * pulse);
      ctx.lineTo(-5 * pulse, 0);
      ctx.lineTo(-13 * pulse, 15 * pulse);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.rotate(-angle);
      if (introEase > 0.02) {
        ctx.globalAlpha = introEase * 0.65;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 34 + introEase * 54, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.94;
      }
      ctx.font = '900 ' + Math.round(12 + introEase * 20) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#120016';
      ctx.lineWidth = 6;
      const labelY = (edgeY < 70 ? 36 : -32) * Math.min(2.1, introScale);
      ctx.strokeText(targetInfo.label, 0, labelY);
      ctx.fillText(targetInfo.label, 0, labelY);
    }
    ctx.restore();
  }

  _renderSomberShaderLayer(ctx) {
    const t = this.tick || 0;
    ctx.save();

    const tint = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    tint.addColorStop(0, 'rgba(4,8,18,0.18)');
    tint.addColorStop(0.52, 'rgba(12,5,10,0.08)');
    tint.addColorStop(1, 'rgba(0,0,0,0.24)');
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const vignette = ctx.createRadialGradient(
      CANVAS_W * 0.50, CANVAS_H * 0.46, CANVAS_H * 0.18,
      CANVAS_W * 0.50, CANVAS_H * 0.50, CANVAS_H * 0.82
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.58, 'rgba(0,0,0,0.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    for (let y = (t % 4); y < CANVAS_H; y += 4) {
      ctx.fillRect(0, y, CANVAS_W, 1);
    }

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 90; i++) {
      const seed = (i * 197 + t * 37) % 997;
      const x = (seed * 53 + i * 29) % CANVAS_W;
      const y = (seed * 31 + i * 71) % CANVAS_H;
      ctx.fillStyle = (seed % 3 === 0) ? '#fff' : '#000';
      ctx.fillRect(x, y, 1 + (seed % 2), 1);
    }

    ctx.restore();
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
      if (ms.routeAutoAdvance) {
        if (ms.delay <= 0 || consumePress('KeyZ') || consumePress('Enter') || consumePress('Space') || consumePress('MouseAttack')) {
          this.mapScreen = null;
          this._enterMapRoom(ms.nextRoomId || this._routeLayoutRoomId((this.routeState && this.routeState.step) || 0, (this.routeState && this.routeState.lane) || 'mid'));
          this.showWaveMessage(this._objectiveStartMessage());
        }
        return;
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
      for (const e of this.effects) e.update(this);
      compactLiveArray(this.effects, keepNotDone, GAME_OBJECT_LIMITS.effects);
      // Camera still follows
      this._updateCameraFollow();
      return; // Skip all other updates during cutscene
    }

    if (!this._shouldUpdateChainSlowedWorld()) {
      this._cleanupLiveObjects();
      this._updateCameraFollow();
      return;
    }

    for (const ally of this.allies) ally.update(this);
    this._refreshFriendlyTargets();
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
    for (const e of this.effects) e.update(this);
    for (const b of this.stoneBlocks) b.update(this);
    for (const b of this.bubbles) b.update(this);
    for (const p of this.stagePropsBack) p.update(this);
    for (const p of this.stagePropsFront) p.update(this);
    for (const l of this.stageLanterns) l.update(this);
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
      const _routeHuntObj = this.routeObjectiveSet && this.routeObjectiveSet.find(obj => obj && obj.type === 'hunt');
      const _wObj = _routeHuntObj || this.currentObjective;
      if (_wObj && _wObj.type === 'hunt' && !this.bossActive && !this.boss) {
        const _huntAlive = this.enemies.some(e => !e.dead && this._matchesHuntFilter(e, _wObj.filter));
        if (!_huntAlive) {
          this._spawnHuntTarget(_wObj.filter);
        }
      }
      // Friendly Ronin update (defend objective)
      if (this.samurai && !this.samurai.dead) {
        if (this.samurai.flashTimer > 0) this.samurai.flashTimer--;
        if (this.samurai._friendlyHitTimer > 0) this.samurai._friendlyHitTimer--;
      }
      if (this.protectBuilding && this.protectBuilding._friendlyHitTimer > 0) this.protectBuilding._friendlyHitTimer--;
      if (this.missionDirector) this._updateMissionDirector();
      // ── Boss Summon Orb logic ──
      if (!this.missionDirector && !this.bossActive && !this.boss) {
        if (this.routeObjectiveSet) {
          const routeZone = this._routeObjectiveOfType('zone');
          if (routeZone && this.objZone) {
            const _pl = this.player;
            const _inZone = _pl.x + _pl.w > this.objZone.x && _pl.x < this.objZone.x + this.objZone.w &&
                            _pl.y + _pl.h > this.objZone.y && _pl.y < this.objZone.y + this.objZone.h;
            if (_inZone && this.tick % 60 === 0) routeZone.zoneSeconds = (routeZone.zoneSeconds || 0) + 1;
          }
          this._checkRouteObjectives();
        } else {
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
              const framesPerOrb = Math.max(1, this._objectiveSecondsPerOrb('zone') * 60);
              this.bossOrbCharge = Math.min(this.bossOrbChargeMax, this.bossOrbCharge + this.bossOrbChargeMax / framesPerOrb);
            }
          } else if (_obj.type === 'defend' && this.samurai && !this.samurai.dead) {
            const framesPerOrb = Math.max(1, this._objectiveSecondsPerOrb('defend') * 60);
            this.bossOrbCharge = Math.min(this.bossOrbChargeMax, this.bossOrbCharge + this.bossOrbChargeMax / framesPerOrb);
          }
          // 'kills' and 'hunt': progress comes from visible kill counts.
          // 'collect': progress comes directly from shuriken pickups.
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
      if (this.bossDeathRewardDelay > 0) this.bossDeathRewardDelay--;
      if (this.boss && this.boss.dead && this.bossDeathRewardDelay <= 0 && !this.orbBucketChoice && !this.pathChoiceScreen) {
        this._completeCurrentMapRoom();
      }
    }

    if (this.bossMessage > 0) this.bossMessage--;
    if (this.waveMessageTimer > 0) this.waveMessageTimer--;
    if (this.objectiveIndicatorIntroTimer > 0) this.objectiveIndicatorIntroTimer--;
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
    this._cleanupLiveObjects();

    // Camera follows player (smooth)
    this._updateCameraFollow();
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
    if (this.menuActive || this.mainMenuScreen) {
      Music.play('menu');
    } else if (this.gameWon || this.gameOver) {
      if (Music.playing) Music.stop();
    } else if (this.bossActive && this.boss) {
      Music.play(BOSS_MUSIC[this.boss.bossType] || GENERAL_BOSS_TRACKS[this.wave % 3]);
    } else {
      let stageTrack = 'stage3';
      if (this.levelType === 'tower') stageTrack = 'tower';
      else if (this.levelType === 'arena') stageTrack = 'arena';
      else if (this.wave <= 3) stageTrack = 'stage1';
      else if (this.wave <= 7) stageTrack = 'stage2';
      const md = this.missionDirector;
      const minibossActive = md && this._missionMinibossAlive();
      Music.play(minibossActive ? stageTrack + '_miniboss' : stageTrack);
    }

    if (this.menuActive) {
      this.renderMenu();
      return;
    }
    if (this.mainMenuScreen) {
      this.renderMainMenu();
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
      const routeZone = this._routeObjectiveOfType && this._routeObjectiveOfType('zone');
      const zoneMarker = routeZone && routeZone.marker ? routeZone.marker : { symbol: '◆', color: '#88aaff' };
      const zsx = z.x - cam.x, zsy = z.y - cam.y;
      const _pl = this.player;
      const _inZone = _pl.x + _pl.w > z.x && _pl.x < z.x + z.w &&
                      _pl.y + _pl.h > z.y && _pl.y < z.y + z.h;
      const t = this.tick;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t * 0.05) * 0.06;
      ctx.fillStyle = zoneMarker.color;
      ctx.fillRect(zsx, zsy, z.w, z.h);
      ctx.globalAlpha = _inZone ? 0.9 : (0.5 + Math.sin(t * 0.08) * 0.3);
      ctx.strokeStyle = zoneMarker.color;
      ctx.lineWidth = _inZone ? 3 : 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(zsx, zsy, z.w, z.h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = zoneMarker.color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(zoneMarker.symbol + (_inZone ? ' HOLD' : ' ZONE'), zsx + z.w / 2, zsy - 5);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    for (const r of this.ropes || []) r.render(ctx, cam);
    for (const p of this.platforms) p.render(ctx, cam);
    for (const s of this.spikes) s.render(ctx, cam);
    for (const b of this.bloodStains || []) b.render(ctx, cam);
    this._renderZoneLady(ctx, cam);
    this._renderMissionObjects(ctx, cam);
    for (const p of this.stagePropsBack || []) p.render(ctx, cam);
    for (const l of this.stageLanterns || []) l.render(ctx, cam);

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

    for (const sp of this.shurikenPickups) sp.render(ctx, cam, this);
    for (const bp of this.bubbleShieldPickups) bp.render(ctx, cam);
    for (const hp of this.heartPickups) hp.render(ctx, cam);
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
    for (const p of this.stagePropsFront || []) p.render(ctx, cam);

    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#020305';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    for (const ally of this.allies) ally.render(ctx, cam, this);
    this._renderRoninAllyMarker(ctx, cam);
    this._renderObjectiveTargetIndicator(ctx, cam);

    // Hunt objective: draw target marker over matching enemies
    const routeHunt = this._routeObjectiveOfType && this._routeObjectiveOfType('hunt');
    if (((this.currentObjective && this.currentObjective.type === 'hunt') || routeHunt) && !this.bossActive) {
      const huntMarker = routeHunt && routeHunt.marker ? routeHunt.marker : { symbol: '◆', color: '#ff0' };
      const t = this.tick;
      for (const e of this.enemies) {
        if (e.dead || !e.isHuntTarget) continue;
        const ex = e.x + e.w / 2 - cam.x;
        const ey = e.y - cam.y;
        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(t * 0.12) * 0.2;
        ctx.strokeStyle = huntMarker.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = huntMarker.color;
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
        ctx.fillStyle = huntMarker.color;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(huntMarker.symbol, ex, ey - 11);
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    this._renderChainFreezeOverlay(ctx, cam);

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
        ctx.fillStyle = '#f44';
        const golemHpRatio = Math.max(0, Math.min(1, g.hp / Math.max(1, g.maxHp)));
        ctx.fillRect(headX, headY - 26, headW * golemHpRatio, 6);
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
    const playerHpRatio = Math.max(0, Math.min(1, this.player.hp / Math.max(1, this.player.maxHp)));
    if (playerHpRatio <= 0.33 && !this.gameOver) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.15 * (1 - playerHpRatio);
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
      const px = pl.x + pl.w / 2 - cam.x;
      const py = pl.y + pl.h / 2 - cam.y;
      const pulse = Math.sin(pl.statusCurse * 0.12);
      const r = 76 + pulse * 8;
      ctx.fillStyle = 'rgba(4,0,8,0.82)';
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS_W, CANVAS_H);
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill('evenodd');
      const grad = ctx.createRadialGradient(px, py, r * 0.72, px, py, r * 1.28);
      grad.addColorStop(0, 'rgba(4,0,8,0)');
      grad.addColorStop(1, 'rgba(4,0,8,0.70)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 0.22 + 0.08 * pulse;
      ctx.strokeStyle = '#b47cff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
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
    this._renderSomberShaderLayer(ctx);
  }

  _missionMinibossAlive() {
    const md = this.missionDirector;
    if (!md) return false;
    if ((md.minibosses || []).some(e => e && !e.dead && e.missionPhaseIndex === md.phaseIndex)) return true;
    return !!(md.miniboss && !md.miniboss.dead);
  }

  _renderStaggerChainCombo(ctx) {
    const pl = this.player;
    const combo = pl ? (pl.staggerChainCombo || 0) : 0;
    if (!pl || combo < 2 || (!pl.staggerChaining && (pl.staggerChainComboTimer || 0) <= 0)) return;

    const timer = Math.max(0, pl.staggerChainComboTimer || 0);
    const alpha = Math.min(1, timer / 18);
    const pop = Math.max(0, pl.staggerChainComboPop || 0);
    const wild = Math.min(1, (combo - 2) / 10);
    const hot = Math.min(1, (combo - 4) / 8);
    const size = 38 + Math.min(combo, 14) * 4 + pop * 18 + wild * 10;
    const x = CANVAS_W * 0.68 + Math.sin(this.tick * 0.17) * wild * 10 + (Math.random() - 0.5) * wild * 5;
    const y = 100 + Math.cos(this.tick * 0.13) * wild * 5 + (Math.random() - 0.5) * wild * 4;
    const rot = Math.sin(this.tick * 0.21) * wild * 0.18 + (Math.random() - 0.5) * wild * 0.08;
    const numberColor = hot >= 1 ? '#ffe033' : (combo >= 8 ? '#ff3df2' : (combo >= 5 ? '#c04fff' : '#f4f0ff'));
    const flareColor = combo >= 8 ? '#ff3df2' : '#c04fff';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = flareColor;
    ctx.shadowBlur = 16 + wild * 22 + pop * 18;

    if (combo >= 5) {
      ctx.save();
      ctx.rotate(-0.35 + Math.sin(this.tick * 0.12) * 0.08);
      ctx.strokeStyle = combo >= 9 ? '#ffe033' : flareColor;
      ctx.lineWidth = 2 + wild * 2;
      const rays = 3 + Math.min(4, Math.floor(combo / 3));
      for (let i = 0; i < rays; i++) {
        const yy = (i - (rays - 1) / 2) * (8 + wild * 5);
        const len = 44 + combo * 3 + i * 7;
        ctx.beginPath();
        ctx.moveTo(-len - 24, yy);
        ctx.lineTo(-22 - i * 4, yy - 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22 + i * 4, yy + 4);
        ctx.lineTo(len + 24, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    const scaleX = 1 + pop * 0.16 + wild * 0.08;
    const scaleY = 1 - pop * 0.05 + Math.sin(this.tick * 0.2) * wild * 0.03;
    ctx.scale(scaleX, scaleY);
    ctx.font = '900 ' + Math.round(size) + 'px monospace';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#120016';
    ctx.lineWidth = 8 + wild * 5;
    ctx.strokeText(combo + 'x', 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2 + pop * 2;
    ctx.strokeText(combo + 'x', 0, 0);
    ctx.fillStyle = numberColor;
    ctx.fillText(combo + 'x', 0, 0);

    ctx.font = '900 13px monospace';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = alpha * (0.74 + wild * 0.18);
    ctx.fillText('CHAIN STRIKE', 0, Math.max(34, size * 0.52));
    ctx.restore();
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

    if (!this.missionDirector && this.routeObjectiveSet && !this.bossActive && !(this.boss && !this.boss.dead)) {
      const x = 8, y = 28, w = 250, rowH = 17;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y, w, 64);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ddd';
      ctx.fillText('ROUTE OBJECTIVES', x + 8, y + 12);
      for (let i = 0; i < this.routeObjectiveSet.length; i++) {
        const obj = this.routeObjectiveSet[i];
        const p = this._routeObjectiveProgressInfo(obj);
        const yy = y + 20 + i * rowH;
        const routeMarker = obj.marker || this._routeMarkerFor(obj.route);
        const routeColor = routeMarker.color || '#ccc';
        const pct = p ? Math.max(0, Math.min(1, p.rawCurrent / Math.max(1, p.rawTarget))) : 0;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 78, yy - 8, 112, 6);
        ctx.fillStyle = routeColor;
        ctx.fillRect(x + 78, yy - 8, 112 * pct, 6);
        ctx.fillStyle = routeColor;
        ctx.fillText(obj.marker ? routeMarker.symbol : '-', x + 8, yy);
        ctx.fillStyle = '#ccc';
        const prog = p ? (p.current + '/' + p.target + (p.suffix || '')) : '';
        ctx.fillText(obj.label + ' ' + prog, x + 196, yy);
      }
      ctx.restore();
    }

    this._renderStaggerChainCombo(ctx);

    // Ninja bar at top, status bars stacked up from bottom
    const ninjaBarY = 4;

    // ── Bottom HUD ──
    // Y anchors (all measured from bottom)
    const barH = 26;
    const barY   = CANVAS_H - barH - 6;  // 508
    const pipY   = CANVAS_H - 92;        // 448

    // Attack and magic charges recharge independently.

    // ── Buff icons ──
    const attrColors = {
      mind: (ITEM_ATTRIBUTES.mind && ITEM_ATTRIBUTES.mind.color) || '#b45cff',
      vigor: (ITEM_ATTRIBUTES.vigor && ITEM_ATTRIBUTES.vigor.color) || '#ff6a3d',
      dexterity: (ITEM_ATTRIBUTES.dexterity && ITEM_ATTRIBUTES.dexterity.color) || '#39d98a',
    };

    // ── HP bar — ninja-colored, ult charge shown as glow ──
    const nbc = { fill: '#f44', dark: '#400', delay: '#f66' };

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
    const attackFocusW = 128;
    const attackFocusH = 14;
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
    const swordX = focusX;
    const swordY = pipY - 1;
    const bladeX = swordX + 22;
    const bladeY = swordY + 3;
    const bladeW = attackFocusW - 22;
    const bladeH = attackFocusH - 4;
    const drawBladePath = () => {
      ctx.beginPath();
      ctx.moveTo(bladeX, bladeY);
      ctx.lineTo(bladeX + bladeW - 13, bladeY);
      ctx.lineTo(bladeX + bladeW, bladeY + bladeH / 2);
      ctx.lineTo(bladeX + bladeW - 13, bladeY + bladeH);
      ctx.lineTo(bladeX, bladeY + bladeH);
      ctx.closePath();
    };
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    drawBladePath();
    ctx.fill();
    ctx.save();
    drawBladePath();
    ctx.clip();
    ctx.fillStyle = attrColors.vigor;
    ctx.fillRect(bladeX, bladeY, bladeW * focusPct, bladeH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(bladeX, bladeY + 1, bladeW * focusPct, 2);
    ctx.restore();
    ctx.strokeStyle = attrColors.vigor;
    ctx.lineWidth = 1.4;
    drawBladePath();
    ctx.stroke();
    ctx.fillStyle = attrColors.vigor;
    ctx.fillRect(swordX + 15, swordY, 5, attackFocusH + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(swordX + 18, swordY + 1, 1, attackFocusH);
    ctx.fillStyle = '#6b3528';
    ctx.fillRect(swordX + 4, swordY + 5, 13, 5);
    ctx.fillStyle = attrColors.vigor;
    ctx.fillRect(swordX, swordY + 4, 5, 7);
    ctx.restore();
    drawChargePips('MAG', pl.specialCharges, pl.specialRechargeTimer, chargeLeft + attackGroupW + chargeGap + chargeLabelW + 8, pipY, attrColors.mind);
    const hpRatio = Math.max(0, Math.min(1, pl.hp / Math.max(1, pl.maxHp)));
    const displayHpRatio = Math.max(0, Math.min(1, pl.displayHp / Math.max(1, pl.maxHp)));

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
    if (!this.missionDirector && !this.gameWon && !(this.boss && !this.boss.dead)) {
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
      const hpRatio = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
      const displayRatio = Math.max(0, Math.min(1, b.displayHp / Math.max(1, b.maxHp)));
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(pbX - 2, pbY - 2, pbW + 4, pbH + 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(pbX, pbY, pbW, pbH);
      // Trailing damage bar
      if (displayRatio > hpRatio) {
        ctx.fillStyle = '#f66';
        ctx.fillRect(pbX, pbY, pbW * displayRatio, pbH);
      }
      // HP fill
      ctx.fillStyle = '#f44';
      ctx.fillRect(pbX, pbY, pbW * hpRatio, pbH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pbX, pbY, pbW, pbH);
      // Boss label inside bar: "30/50 (RONIN BOSS)"
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      const bossLabel = `${Math.max(0, Math.ceil(b.hp))}/${b.maxHp} (${b.name})`;
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

  _renderRouteMapScreen(ctx) {
    const ms = this.mapScreen;
    const route = this.routeState || { step: 0, lane: 'mid', previousLane: 'mid', history: [] };
    const history = route.history || [];
    ctx.fillStyle = 'rgba(0,0,0,0.84)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    const title = 'MISSION ROUTE';
    ctx.fillText(title, CANVAS_W / 2 - ctx.measureText(title).width / 2, 42);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    const hint = ms && ms.routeAutoAdvance
      ? (ms.delay > 0 ? 'Route locked: advancing in ' + Math.ceil(ms.delay / 60) : 'Z confirm next mission')
      : 'Route advances by mission performance';
    ctx.fillText(hint, CANVAS_W / 2 - ctx.measureText(hint).width / 2, 62);

    const mapX = 70, mapY = 96, mapW = 610, mapH = 360;
    const panelX = 700, panelY = 96, panelW = 200, panelH = 360;
    ctx.fillStyle = 'rgba(10,14,18,0.92)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    const steps = ROUTE_STAGE_LAYOUTS.length;
    const nodeX = step => mapX + 38 + (mapW - 76) * (step / Math.max(1, steps - 1));
    const nodeY = (step, lane) => {
      if (step === 0 || step === steps - 1) return mapY + mapH / 2;
      const row = ROUTE_STAGE_LAYOUTS[step].laneRows[lane];
      return mapY + mapH / 2 + row * 82;
    };
    const nodeLaneList = step => (step === 0 || step === steps - 1) ? ['mid'] : ROUTE_LANES;
    const nodeKey = (step, lane) => step + ':' + lane;
    const activeStep = route.step || 0;
    const activeLane = route.lane || 'mid';
    const visited = new Set(['0:mid']);
    let prevLane = 'mid';
    for (const h of history) {
      visited.add(nodeKey(h.step, h.lane || prevLane));
      if (h.step + 1 < steps) visited.add(nodeKey(h.step + 1, h.route || 'mid'));
      prevLane = h.route || prevLane;
    }
    visited.add(nodeKey(activeStep, activeStep === 0 || activeStep === steps - 1 ? 'mid' : activeLane));

    ctx.save();
    ctx.lineWidth = 1.2;
    for (let step = 0; step < steps - 1; step++) {
      for (const fromLane of nodeLaneList(step)) {
        for (const toLane of nodeLaneList(step + 1)) {
          const fromX = nodeX(step), fromY = nodeY(step, fromLane);
          const toX = nodeX(step + 1), toY = nodeY(step + 1, toLane);
          ctx.strokeStyle = 'rgba(160,170,190,0.24)';
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
        }
      }
    }
    let drawPrevLane = 'mid';
    for (const h of history) {
      if (h.step >= steps - 1) continue;
      const marker = this._routeMarkerFor(h.route || 'mid');
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(nodeX(h.step), nodeY(h.step, h.lane || drawPrevLane));
      ctx.lineTo(nodeX(h.step + 1), nodeY(h.step + 1, h.step + 1 === steps - 1 ? 'mid' : (h.route || 'mid')));
      ctx.stroke();
      drawPrevLane = h.route || drawPrevLane;
    }
    ctx.restore();

    for (let step = 0; step < steps; step++) {
      for (const lane of nodeLaneList(step)) {
        const x = nodeX(step), y = nodeY(step, lane);
        const isCurrent = step === activeStep && (step === 0 || step === steps - 1 || lane === activeLane);
        const seen = visited.has(nodeKey(step, lane));
        const marker = step === 0 || step === steps - 1 ? { symbol: '', color: '#ffe033' } : this._routeMarkerFor(lane);
        const nodeColor = (seen || isCurrent) ? marker.color : '#686a72';
        ctx.save();
        ctx.fillStyle = seen ? 'rgba(255,255,255,0.12)' : 'rgba(110,112,122,0.10)';
        ctx.strokeStyle = isCurrent ? '#fff' : nodeColor;
        ctx.lineWidth = isCurrent ? 4 : 2;
        ctx.shadowColor = isCurrent ? '#fff' : nodeColor;
        ctx.shadowBlur = seen || isCurrent ? 10 : 0;
        ctx.beginPath();
        ctx.arc(x, y, isCurrent ? 18 : 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = nodeColor;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(step === 0 ? 'S' : step === steps - 1 ? 'F' : marker.symbol, x, y + 5);
        ctx.fillStyle = seen || isCurrent ? '#aaa' : '#5f626a';
        ctx.font = '9px monospace';
        const stageName = ROUTE_STAGE_LAYOUTS[step].name;
        ctx.fillText(stageName.length > 12 ? stageName.slice(0, 12) : stageName, x, y + 32);
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(12,12,16,0.95)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    const cfg = this._routeConfigFor(activeStep, activeLane, route.previousLane || 'mid', history);
    const bossName = BOSS_NAMES[cfg.bossType] || cfg.bossType.toUpperCase();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Current Mission', panelX + 14, panelY + 28);
    ctx.fillStyle = '#bbb';
    ctx.font = '11px monospace';
    ctx.fillText('Step ' + (activeStep + 1) + '/' + steps, panelX + 14, panelY + 54);
    ctx.fillText('Boss: ' + bossName, panelX + 14, panelY + 74);
    ctx.fillText('Element: ' + (cfg.element || 'normal'), panelX + 14, panelY + 94);
    ctx.fillText('Layout: ' + (cfg.roomDef.mapType || 'classic'), panelX + 14, panelY + 114);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Route Trail', panelX + 14, panelY + 150);
    ctx.font = '11px monospace';
    let yy = panelY + 172;
    if (!history.length) {
      ctx.fillStyle = '#777';
      ctx.fillText('No route yet', panelX + 14, yy);
    } else {
      for (let i = Math.max(0, history.length - 8); i < history.length; i++) {
        const h = history[i];
        const marker = this._routeMarkerFor(h.route || 'mid');
        const boss = BOSS_NAMES[h.bossType] || (h.bossType || '').toUpperCase();
        ctx.fillStyle = marker.color;
        ctx.fillText((h.step + 1) + '. ' + marker.symbol + ' ' + boss, panelX + 14, yy);
        yy += 18;
      }
    }
  }

  renderMapScreen(ctx) {
    this._renderRouteMapScreen(ctx);
    return;
    const ms = this.mapScreen;
    ctx.fillStyle = 'rgba(0,0,0,0.84)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    const title = 'MISSION MAP';
    ctx.fillText(title, CANVAS_W / 2 - ctx.measureText(title).width / 2, 42);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    const hint = ms.routeAutoAdvance
      ? (ms.delay > 0 ? 'Route locked: advancing in ' + Math.ceil(ms.delay / 60) : 'Z confirm next mission')
      : (ms.delay > 0 ? '...' + Math.ceil(ms.delay / 60) : 'WASD / arrows select room   Q/E zoom   0 free travel   Z confirm');
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
      const stroke = selected ? '#ffe033' : recent ? '#fff' : current ? '#4f4' : (accessible ? (kindColor || '#aaa') : '#333');

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
      drawRoomIcon(room, x, y, Math.min(tileW, tileH), unlocked ? (kindColor || '#fff') : '#666', unlocked ? 0.95 : 0.26);
      if (this._roomHasSkyExit(room)) {
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.28;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeStyle = unlocked ? '#7bd' : '#666';
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
        ctx.fillStyle = unlocked ? '#9df' : '#777';
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
      const routeCfg = (this.routeState && selectedRoom.id === this._routeLayoutRoomId(this.routeState.step, this.routeState.lane))
        ? this._routeConfigFor(this.routeState.step, this.routeState.lane, this.routeState.previousLane || 'mid', this.routeState.history || [])
        : null;
      const wd = WAVE_DEFS[routeCfg ? routeCfg.waveIdx : selectedRoom.waveIdx] || WAVE_DEFS[0];
      const routeBoss = routeCfg ? routeCfg.bossType : wd.boss;
      const routeElement = routeCfg ? routeCfg.element : selectedRoom.element;
      const bossName = BOSS_NAMES[routeBoss] || routeBoss.toUpperCase();
      const area = MAP_AREAS[selectedRoom.area] || null;
      const mix = (selectedRoom.enemyTypes || []).map(t => ENEMY_STATS[t] ? ENEMY_STATS[t].name : t).join(', ');
      ctx.fillStyle = routeElement && ELEMENT_COLORS[routeElement] ? ELEMENT_COLORS[routeElement].accent : '#ffe033';
      ctx.font = 'bold 12px monospace';
      panelText('Boss: ' + bossName, panelX + 14, panelY + 84, panelW - 28);
      ctx.fillStyle = '#bbb';
      ctx.font = '11px monospace';
      panelText('Area: ' + (area ? area.label : selectedRoom.area), panelX + 14, panelY + 106, panelW - 28);
      panelText('Type: ' + (kindLabel[selectedRoom.kind] || 'Stage'), panelX + 14, panelY + 126, panelW - 28);
      panelText('Element: ' + (routeElement || 'normal'), panelX + 14, panelY + 146, panelW - 28);
      panelText('Layout: ' + (selectedRoom.mapType || 'classic'), panelX + 14, panelY + 166, panelW - 28);
      panelText('Enemies: ' + mix, panelX + 14, panelY + 186, panelW - 28);
      panelText('Status: ' + (selectedCompleted ? 'completed' : 'available'), panelX + 14, panelY + 206, panelW - 28);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Route trail', panelX + 14, panelY + 242);
    ctx.font = '11px monospace';
    const routeHistory = (this.routeState && this.routeState.history) || [];
    if (routeHistory.length) {
      let yy = panelY + 264;
      for (let i = Math.max(0, routeHistory.length - 8); i < routeHistory.length; i++) {
        const h = routeHistory[i];
        ctx.fillStyle = h.route === 'hard' ? '#f66' : h.route === 'mid' ? '#fc6' : '#7df';
        const boss = BOSS_NAMES[h.bossType] || (h.bossType || '').toUpperCase();
        panelText((h.step + 1) + '. ' + (ROUTE_LABELS[h.route] || h.route) + ' - ' + boss, panelX + 14, yy, panelW - 28);
        yy += 18;
      }
    } else {
      ctx.fillStyle = '#777';
      ctx.fillText('No route yet', panelX + 14, panelY + 264);
    }

    const doneCount = Object.keys(this.mapState.completed || {}).length;
    const unlockedCount = Object.keys(this.mapState.unlocked || {}).length;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`Route step: ${((this.routeState && this.routeState.step) || 0) + 1}/${ROUTE_STAGE_LAYOUTS.length}`, panelX + 14, panelY + panelH - 36);
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
