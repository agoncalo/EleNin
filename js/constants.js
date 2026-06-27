// ── Constants ────────────────────────────────────────────────
const CANVAS_W = 960;
const CANVAS_H = 540;
const TILE = 32;
const GRAVITY = 0.55;
const MAX_FALL = 12;
const FIXED_DT = 1000 / 60; // 60 fps timestep

const NINJA_ORDER = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind', 'storm'];

// ── Elemental Affinities ─────────────────────────────────────
// Elements that enemies can have (shadow is NOT an affinity)
const ENEMY_ELEMENTS = ['fire', 'ghost', 'water', 'crystal', 'wind', 'lightning', 'steel', 'spiky'];

// Colors for each element
const ELEMENT_COLORS = {
  fire:      { body: '#d44', accent: '#f93', glow: '#f60', particle: '#fa3' },
  ghost:     { body: '#8a6aaf', accent: '#6f6', glow: '#3a5', particle: '#8f8' },
  water:     { body: '#46a', accent: '#6af', glow: '#38d', particle: '#4af' },
  crystal:   { body: '#5cc', accent: '#dff', glow: '#6ee', particle: '#aef' },
  wind:      { body: '#6b6', accent: '#bfb', glow: '#5a5', particle: '#9e9' },
  lightning: { body: '#aa4', accent: '#ff8', glow: '#dd6', particle: '#ff4' },
  steel:     { body: '#7f8790', accent: '#d8e0e8', glow: '#aab4c0', particle: '#d8e0e8' },
  spiky:     { body: '#a44', accent: '#f86', glow: '#c33', particle: '#f64' },
};

// Interaction matrix: attackElement -> enemyElement -> result
// 'normal' = full damage, 'resist' = blocked (shield pop), 'heal' = heals enemy (green cross)
// Steel = melee sword / shuriken hits
const ELEMENT_MATRIX = {
  fire: {
    fire: 'resist',    // fire resists fire
    ghost: 'normal',   // fire hurts ghosts
    water: 'resist',   // water resists fire
    crystal: 'normal', // fire beats crystal (melts)
    wind: 'normal',
    lightning: 'normal',
    spiky: 'normal',
  },
  earth: {
    fire: 'normal',
    ghost: 'normal',
    water: 'normal',
    crystal: 'normal',
    wind: 'normal',
    lightning: 'normal',
    spiky: 'normal',
  },
  water: {
    fire: 'normal',    // water beats fire
    ghost: 'normal',
    water: 'resist',   // water resists water
    crystal: 'normal',
    wind: 'resist',    // wind resists water (blows it away)
    lightning: 'normal',
    spiky: 'normal',
  },
  crystal: {
    fire: 'resist',    // fire resists crystal (melts)
    ghost: 'normal',
    water: 'normal',
    crystal: 'resist', // crystal resists crystal
    wind: 'normal',
    lightning: 'normal',
    spiky: 'normal',
  },
  wind: {
    fire: 'normal',
    ghost: 'normal',
    water: 'normal',   // wind beats water (evaporates)
    crystal: 'normal',
    wind: 'resist',    // wind resists wind
    lightning: 'normal',
    spiky: 'normal',
  },
  lightning: {
    fire: 'normal',
    ghost: 'normal',
    water: 'normal',   // lightning beats water
    crystal: 'normal',
    wind: 'normal',
    lightning: 'resist',
    spiky: 'normal',
  },
  steel: {
    fire: 'normal',
    ghost: 'resist',   // blades pass through ghosts
    water: 'normal',
    crystal: 'normal',
    wind: 'normal',
    lightning: 'normal',
    spiky: 'normal',   // sword vs spiky handled in takeDamage
  },
};

// Map ninja type -> attack element. Shadow has no element (always steel/normal).
// Storm is multi-element: melee=steel, soak/chain=lightning+water
const NINJA_ATTACK_ELEMENTS = {
  fire: 'fire',
  earth: 'earth',
  bubble: 'water',
  shadow: 'steel',   // shadow uses blades, no elemental affinity
  crystal: 'crystal',
  wind: 'wind',
  storm: 'lightning', // default element, water for soak-related
};

// Starting max Mana per ninja type (can be increased with orbs)
const MANA_CAPS = {
  fire: 2,
  earth: 3,
  bubble: 1,
  shadow: 2, 
  crystal: 2,
  wind: 1,
  storm: 1
};

// Chance for an enemy to be elemental (per spawn)
const ELEMENTAL_SPAWN_CHANCE = 0.12; // 12% base chance (boosted when level has an element)

const NINJA_TYPES = {
  fire: {
    name: 'Fire Ninja',
    color: '#e33',
    accentColor: '#f93',
    key: '1',
    attackDamage: 2,
    jumpPower: -10,
    speed: 4
  },
  earth: {
    name: 'Earth Ninja',
    color: '#a0622a',
    accentColor: '#2e9e2e',
    key: '2',
    attackDamage: 2,
    jumpPower: -10,
    speed: 3.5
  },
  bubble: {
    name: 'Bubble Ninja',
    color: '#48f',
    accentColor: '#8cf',
    key: '3',
    attackDamage: 1,
    jumpPower: -11,
    speed: 4.2
  },
  shadow: {
    name: 'Shadow Ninja',
    color: '#726',
    accentColor: '#a4e',
    key: '4',
    attackDamage: 1,
    jumpPower: -10.5,
    speed: 4.5
  },
  crystal: {
    name: 'Crystal Ninja',
    color: '#2dd',
    accentColor: '#aff',
    key: '5',
    attackDamage: 2,
    jumpPower: -10,
    speed: 3.8
  },
  wind: {
    name: 'Wind Ninja',
    color: '#8d8',
    accentColor: '#bfb',
    key: '6',
    attackDamage: 1,
    jumpPower: -10.5,
    speed: 5
  },
  storm: {
    name: 'Storm Ninja',
    color: '#24c',
    accentColor: '#fd0',
    key: '7',
    attackDamage: 2,
    jumpPower: -10.5,
    speed: 4.2
  }
};

// ── Enemy tier system ────────────────────────────────────────
const ENEMY_TIERS = ['walker', 'shooter', 'jumper', 'bouncer', 'charger', 'shielded', 'deflector', 'protector', 'attacker', 'flyer', 'flyshooter'];
const ENEMY_STATS = {
  walker:     { color: '#3c4035', hp: 3,  dmg: 3,  bossBase: 200, name: 'Walker' },
  shooter:    { color: '#202837', hp: 3,  dmg: 3,  bossBase: 190, name: 'Shooter' },
  jumper:     { color: '#302231', hp: 4,  dmg: 4,  bossBase: 200, name: 'Jumper' },
  bouncer:    { color: '#393923', hp: 5,  dmg: 4,  bossBase: 185, name: 'Bouncer' },
  charger:    { color: '#241716', hp: 7,  dmg: 5,  bossBase: 195, name: 'Charger' },
  shielded:   { color: '#3b4a35', hp: 6,  dmg: 4,  bossBase: 200, name: 'Shielded' },
  deflector:  { color: '#222635', hp: 14, dmg: 6,  bossBase: 185, name: 'Deflector' },
  protector:  { color: '#8a6416', hp: 18, dmg: 4,  bossBase: 200, name: 'Protector' },
  attacker:   { color: '#4a1f24', hp: 1,  dmg: 10, bossBase: 185, name: 'Attacker' },
  flyer:      { color: '#312032', hp: 2,  dmg: 5,  bossBase: 175, name: 'Flyer' },
  flyshooter: { color: '#242a35', hp: 3,  dmg: 5,  bossBase: 210, name: 'Fly-Shooter' }
};

function getTierInfo(tierIdx) {
  if (tierIdx < ENEMY_TIERS.length) return { type: ENEMY_TIERS[tierIdx], big: false };
  return { type: ENEMY_TIERS[tierIdx % ENEMY_TIERS.length], big: true };
}
function getTierName(tierIdx) {
  const info = getTierInfo(tierIdx);
  return (info.big ? 'Big ' : '') + ENEMY_STATS[info.type].name;
}

// ── Wave definitions ─────────────────────────────────────────
const TOTAL_WAVES = 8; // 8 rounds (dynamic persistent-pool system)

// Boss path pools per round (0-indexed).
// Legacy reference — actual runtime pools are managed dynamically in game.js.
// Round 1: BRUTE — mandatory
// Round 2: [1,2,3] — GUNNER / JUMPER / FLYER, pick 1
// Round 3: [remaining 2] + [6 GUARDIAN] — pick 1
// Round 4: [remaining 2] + [5 BOUNCER] — pick 1
// Round 5: [4,7,8] — RONIN / AEGIS / NEMESIS — all three must be fought, pick order
// Round 6: [remaining 2 of 4,7,8] — pick 1
// Round 7: [last 1 of 4,7,8] — forced
// Round 8: [9] OVERLORD — final boss, always
const BOSS_PATH_POOLS = [
  0,         // Round 1: BRUTE — always first, no choice
  [1, 2, 3], // Round 2: GUNNER / JUMPER / FLYER
  null,      // Round 3: dynamic — remaining 2 + GUARDIAN
  null,      // Round 4: dynamic — remaining 2 + BOUNCER
  null,      // Round 5: dynamic — RONIN/AEGIS/NEMESIS
  null,      // Round 6: dynamic
  null,      // Round 7: dynamic
  9,         // Round 8: OVERLORD — final boss
];

// Reward budget multipliers per element (harder = bigger reward)
const ELEMENT_BUDGET_MULT = {
  fire:      1.30,
  ghost:     1.60,  // hard: immune to steel
  water:     1.20,
  crystal:   1.35,
  wind:      1.20,
  lightning: 1.50,  // hard: strong DOT paralysis
  steel:     1.40,  // hard: armor absorbs damage and knockback
  spiky:     1.60,  // hard: reflects sword damage
};

// Visual and gameplay theming per level element
const ELEMENT_LEVEL_THEMES = {
  fire: {
    skyTop: '#280808', skyBot: '#180404',
    mountainColor: '#380a0a',
    platformColor: '#664433', platformColorAlt: '#553322', groundColor: '#554433',
    weather: 'embers', hazard: 'flame',
  },
  ghost: {
    skyTop: '#0d0a18', skyBot: '#080614',
    mountainColor: '#12091e',
    platformColor: '#443356', platformColorAlt: '#332244', groundColor: '#2a1a3a',
    weather: 'fog', hazard: null,
  },
  water: {
    skyTop: '#081828', skyBot: '#041020',
    mountainColor: '#0a1e2e',
    platformColor: '#244466', platformColorAlt: '#1a3355', groundColor: '#1a3050',
    weather: 'rain', hazard: 'current',
  },
  crystal: {
    skyTop: '#081820', skyBot: '#041018',
    mountainColor: '#0e1c28',
    platformColor: '#2a3f5a', platformColorAlt: '#1e3044', groundColor: '#1a2c3a',
    weather: 'snow', hazard: 'icicle',
  },
  wind: {
    skyTop: '#081008', skyBot: '#050b04',
    mountainColor: '#0c180a',
    platformColor: '#3a4a2a', platformColorAlt: '#283520', groundColor: '#2a3a1a',
    weather: 'leaves', hazard: 'gust',
  },
  lightning: {
    skyTop: '#08080e', skyBot: '#040408',
    mountainColor: '#0c0c18',
    platformColor: '#2a2a44', platformColorAlt: '#1e1e33', groundColor: '#1e1e33',
    weather: 'storm', hazard: 'thunder',
  },
  steel: {
    skyTop: '#101418', skyBot: '#080a0c',
    mountainColor: '#161c22',
    platformColor: '#4a5058', platformColorAlt: '#333942', groundColor: '#3c4248',
    weather: null, hazard: null,
  },
  spiky: {
    skyTop: '#160a0a', skyBot: '#0e0606',
    mountainColor: '#1e0c0c',
    platformColor: '#554433', platformColorAlt: '#443322', groundColor: '#442200',
    weather: null, hazard: 'rockfall',
  },
};
const WAVE_DEFS = [
  { boss: 'walker', killsForBoss: 20,  // Round 1
    objective: { type: 'kills', label: 'Kill Enemies', desc: 'Defeat enemies to charge Boss Orbs.', icon: '⚔' },
    pool: [
      { type: 'walker', weight: 5 },
      { type: 'shooter', weight: 3 },
      { type: 'charger', weight: 2 },
      { type: 'walker', weight: 2, big: true },
    ]
  },
  { boss: 'shooter', killsForBoss: 26,  // Round 2 choice
    objective: { type: 'hunt', filter: { enemyType: 'shooter' }, label: 'Hunt Gunners', desc: 'Only Shooter kills charge Boss Orbs. One is always present.', icon: '◎' },
    pool: [
      { type: 'walker', weight: 3 },
      { type: 'shooter', weight: 4 },
      { type: 'jumper', weight: 3 },
      { type: 'charger', weight: 2 },
      { type: 'walker', weight: 1, big: true },
      { type: 'shooter', weight: 1, big: true },
    ]
  },
  { boss: 'jumper', killsForBoss: 30,   // Round 2 choice
    objective: { type: 'survive', label: 'Survive', desc: 'Survival time charges Boss Orbs. Stay alive!', icon: '♥' },
    pool: [
      { type: 'walker', weight: 2 },
      { type: 'shooter', weight: 3 },
      { type: 'jumper', weight: 4 },
      { type: 'charger', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'jumper', weight: 1, big: true },
    ]
  },
  { boss: 'flyer', killsForBoss: 28,    // Round 2-3 choice
    objective: { type: 'zone', label: 'Hold the Zone', desc: 'Stand in the marked zone to charge Boss Orbs.', icon: '◈' },
    pool: [
      { type: 'shooter', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'flyer', weight: 4 },
      { type: 'flyer', weight: 1, big: true },
      { type: 'shielded', weight: 1, big: true },
    ]
  },
  { boss: 'deflector', killsForBoss: 48, // Round 4 choice
    objective: { type: 'hunt', filter: { enemyType: 'deflector' }, label: 'Hunt Ronin', desc: 'Only Deflector kills charge Boss Orbs. One is always present.', icon: '◎' },
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 3 },
      { type: 'flyer', weight: 2 },
      { type: 'deflector', weight: 3 },
      { type: 'shielded', weight: 1, big: true },
    ]
  },
  { boss: 'bouncer', killsForBoss: 38,   // Round 3 choice
    objective: { type: 'collect', label: 'Collect Shurikens', desc: 'Shuriken caches spawn as Boss Orbs. Pick them up!', icon: '✦' },
    pool: [
      { type: 'jumper', weight: 2 },
      { type: 'bouncer', weight: 4 },
      { type: 'charger', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 4 },
      { type: 'bouncer', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true },
      { type: 'shielded', weight: 1, big: true },
    ]
  },

  { boss: 'shielded', killsForBoss: 42,  // Round 3 choice
    objective: { type: 'defend', label: 'Protect the Ronin', desc: 'Keep the allied Ronin alive — they charge Boss Orbs.', icon: '⊕' },
    pool: [
      { type: 'jumper', weight: 2 },
      { type: 'bouncer', weight: 2 },
      { type: 'charger', weight: 2 },
      { type: 'shielded', weight: 4 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 1, big: true },
      { type: 'bouncer', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true }
    ]
  },
  { boss: 'protector', killsForBoss: 50, // Round 4 choice
    objective: { type: 'zone', label: 'Hold the Zone', desc: 'Stand in the marked zone to charge Boss Orbs.', icon: '◈' },
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'deflector', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true },
    ]
  },
  { boss: 'attacker', killsForBoss: 52,  // Round 4 choice only
    objective: { type: 'survive', label: 'Survive', desc: 'Survival time charges Boss Orbs. Stay alive!', icon: '♥' },
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'deflector', weight: 2 },
      { type: 'protector', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'flyshooter', weight: 2 },
      { type: 'deflector', weight: 1, big: true },
      { type: 'shielded', weight: 1, big: true },
    ]
  },
  { boss: 'flyshooter', killsForBoss: 56, // Round 5
    objective: { type: 'kills', label: 'Kill Enemies', desc: 'Defeat enemies to charge Boss Orbs.', icon: '⚔' },
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'deflector', weight: 2 },
      { type: 'protector', weight: 2 },
      { type: 'attacker', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'flyshooter', weight: 4 },
      { type: 'flyshooter', weight: 2, big: true },
      { type: 'flyer', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true },
    ]
  },
];

const BOSS_NAMES = {
  walker:'BRUTE', shooter:'GUNNER', jumper:'LEAPER',
  bouncer:'BOUNCER', shielded:'GUARDIAN', deflector:'RONIN',
  protector:'AEGIS', attacker:'NEMESIS', flyer:'SWOOPER', flyshooter:'OVERLORD'
};

const MAP_STORAGE_KEY = 'elenin-map-cache-v27';
const MAP_START_ROOM_ID = 'forest-walker-normal';
const MAP_AREAS = {
  forest:    { label: 'FOREST',     color: '#1bb14a', centerCol: 0,  centerRow: 0 },
  mountain:  { label: 'MOUNTAIN',   color: '#9bdff2', centerCol: -5, centerRow: -1 },
  volcano:   { label: 'VOLCANO',    color: '#e22',    centerCol: 5,  centerRow: -1 },
  castle:    { label: 'CASTLE',     color: '#888',    centerCol: 0,  centerRow: -7 },
  skies:     { label: 'SKIES',      color: '#0797d8', centerCol: 0,  centerRow: -12 },
};
const MAP_ROOM_DEFS = (() => {
  const bossOrder = ['walker','shooter','jumper','bouncer','shielded','flyer','deflector','protector','attacker','flyshooter'];
  const elementOrder = [null, 'wind', 'water', 'crystal', 'steel', 'spiky', 'fire', 'ghost', 'lightning'];
  const easyBosses = new Set(['walker','shooter','jumper','bouncer','shielded','flyer']);
  const specialBosses = new Set(['deflector','protector','attacker']);
  const rooms = [];
  const byArea = {};
  const waveIdxFor = boss => Math.max(0, WAVE_DEFS.findIndex(w => w.boss === boss));
  const elemId = element => element || 'normal';
  const title = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Normal';
  const spiralOffset = idx => {
    if (idx === 0) return [0, 0];
    let x = 0, y = 0, step = 1, n = 0;
    while (true) {
      for (let i = 0; i < step; i++) { x++; if (++n === idx) return [x, y]; }
      for (let i = 0; i < step; i++) { y++; if (++n === idx) return [x, y]; }
      step++;
      for (let i = 0; i < step; i++) { x--; if (++n === idx) return [x, y]; }
      for (let i = 0; i < step; i++) { y--; if (++n === idx) return [x, y]; }
      step++;
    }
  };
  const areaOffset = (area, idx) => {
    if (area === 'forest') {
      const forestOffsets = [
        [0,0], [-1,0], [1,0], [0,-1], [0,1],
        [-2,-1], [2,-1], [-2,1], [2,1],
        [-1,-2], [1,-2], [-1,2], [1,2],
        [-3,0], [3,0], [0,-3], [0,3],
        [-3,-1], [3,-1], [-3,1], [3,1],
        [-2,-2], [2,-2], [-2,2], [2,2],
        [-4,0], [4,0], [0,-4], [-1,3], [1,3],
      ];
      return forestOffsets[idx] || spiralOffset(idx);
    }
    if (area === 'mountain') {
      const col = Math.floor(idx / 6);
      const row = idx % 6;
      return [-col, row - 2 - Math.floor(col / 2)];
    }
    if (area === 'volcano') {
      const col = Math.floor(idx / 5);
      const row = idx % 5;
      return [col, row - 2 - Math.floor(col / 2)];
    }
    if (area === 'skies') {
      const skyOffsets = [
        [0,0], [-1,1], [1,1], [-2,0], [2,0], [-1,-1], [1,-1],
        [0,-2], [-3,1], [3,1], [-2,2], [2,2], [0,2],
        [-3,-1], [3,-1], [-1,-3], [1,-3], [0,-4],
        [-4,0], [4,0], [-2,-2], [2,-2], [0,-5],
      ];
      return skyOffsets[idx] || spiralOffset(idx);
    }
    return spiralOffset(idx);
  };
  const skyOffsetFor = (boss, element, idx) => {
    if (boss === 'flyshooter' && element === 'ghost') return [0, -5];
    if (element === 'ghost' && boss === 'deflector') return [-3, -5];
    if (element === 'ghost' && boss === 'protector') return [3, -5];
    if (element === 'ghost' && boss === 'attacker') return [-1, -4];
    const skyOffsets = [
      [0,0], [-1,1], [1,1], [-2,0], [2,0], [-1,-1], [1,-1],
      [0,-2], [-3,1], [3,1], [-2,2], [2,2], [0,2],
      [-3,-1], [3,-1], [-1,-3], [1,-3], [-4,0],
      [4,0], [-2,-2], [2,-2],
    ];
    return skyOffsets[idx % skyOffsets.length];
  };
  const castleOffsetFor = (boss, element, idx) => {
    if (boss === 'flyshooter' && element === null) return [0, 0];
    if (element === null && boss === 'deflector') return [-3, 2];
    if (element === null && boss === 'protector') return [-1, 2];
    if (element === null && boss === 'attacker') return [1, 2];
    if (element === 'ghost' && boss === 'walker') return [3, 2];
    const topOffsets = [[-3,-2], [-1,-2], [1,-2], [3,-2], [-2,-2], [2,-2], [0,-2]];
    return topOffsets[idx % topOffsets.length];
  };
  const areaFor = (boss, element) => {
    if (element === 'lightning') return 'skies';
    if (element === 'ghost') return easyBosses.has(boss) ? 'castle' : 'skies';
    if (element === 'fire' || element === 'spiky') return 'volcano';
    if (element === 'crystal' || element === 'steel') return 'mountain';
    if (boss === 'flyshooter' && element === null) return 'castle';
    if (element === null && specialBosses.has(boss)) return 'castle';
    return 'forest';
  };
  const layoutFor = (area, boss, element, idx) => {
    if (area === 'forest' && element === null && boss === 'walker') return 'normal';
    if (boss === 'flyer' || boss === 'flyshooter') return 'plain';
    if (boss === 'shielded' || boss === 'protector') return 'wall';
    if (boss === 'charger' || boss === 'bouncer') return 'lane';
    if (area === 'castle') return idx % 2 === 0 ? 'wall' : 'lane';
    const layouts = ['normal', 'plain', 'wall', 'lane'];
    return layouts[(idx + (element ? element.length : 0)) % layouts.length];
  };
  const enemyMix = (area, boss, element, idx) => {
    const rangedByArea = {
      forest: ['shooter'],
      mountain: ['shooter'],
      volcano: ['shooter'],
      castle: ['shooter'],
      skies: ['flyshooter', 'shooter'],
    };
    const commonByArea = {
      forest: ['walker', 'jumper', 'charger', 'bouncer', 'flyer'],
      mountain: ['charger', 'jumper', 'bouncer', 'flyer', 'walker'],
      volcano: ['charger', 'bouncer', 'jumper', 'flyer', 'walker'],
      castle: ['charger', 'bouncer', 'jumper', 'flyer', 'walker'],
      skies: ['flyer', 'charger', 'bouncer', 'jumper', 'walker'],
    };
    const specialByArea = {
      forest: ['shielded'],
      mountain: ['shielded', 'deflector'],
      volcano: ['shielded', 'attacker'],
      castle: ['deflector', 'protector', 'attacker', 'shielded'],
      skies: ['attacker', 'deflector', 'protector'],
    };
    const rangedTypes = new Set(['shooter', 'flyshooter']);
    const specialTypes = new Set(['shielded', 'deflector', 'protector', 'attacker']);
    const pick = list => list[idx % list.length];
    const mix = [];
    const add = type => {
      if (!type || mix.includes(type)) return;
      if (rangedTypes.has(type) && mix.some(t => rangedTypes.has(t))) return;
      if (specialTypes.has(type) && mix.some(t => specialTypes.has(t))) return;
      mix.push(type);
    };

    add(pick(rangedByArea[area] || rangedByArea.forest));

    if (specialTypes.has(boss)) add(boss);
    const shouldUseSpecial = !mix.some(t => specialTypes.has(t)) && ((idx + (element ? 1 : 0)) % 3 === 0);
    if (shouldUseSpecial) add(pick(specialByArea[area] || specialByArea.forest));

    const commonPool = commonByArea[area] || commonByArea.forest;
    if (!(boss === 'walker' && area !== 'forest') && !rangedTypes.has(boss) && !specialTypes.has(boss)) add(boss);
    for (let i = 0; mix.length < 3 && i < commonPool.length; i++) {
      add(commonPool[(idx + i) % commonPool.length]);
    }
    return mix.slice(0, 3);
  };
  const kindFor = (boss, element, area) => {
    if (boss === 'flyshooter' && element === 'ghost') return 'trueFinal';
    if (boss === 'flyshooter' && element === null) return 'finalBoss';
    if (specialBosses.has(boss)) return 'miniBoss';
    if (area === 'skies' || (area === 'castle' && element === 'ghost')) return 'bridgeBoss';
    return 'stage';
  };
  const objectiveFor = (boss, element, enemyTypes, idx) => {
    const targetType = (enemyTypes || []).find(type => type === boss) || (enemyTypes || [boss])[idx % Math.max(1, (enemyTypes || [boss]).length)];
    const typeName = { walker:'Brutes', shooter:'Gunners', jumper:'Leapers', bouncer:'Bouncers', charger:'Chargers',
                       shielded:'Guards', deflector:'Ronin', protector:'Aegis', attacker:'Nemesis',
                       flyer:'Flyers', flyshooter:'Overlords' }[targetType] || title(targetType);
    const seed = idx + boss.length + (element ? element.length : 0);
    const options = [
      { type: 'kills', label: 'Defeat Enemies', desc: 'Defeat enemies to fill the objective bar and draw out the boss.', icon: '' },
      { type: 'hunt', filter: { enemyType: targetType }, label: `Hunt ${typeName}`, desc: `Only ${typeName} kills fill the objective bar. One is always present.`, icon: '' },
      { type: 'survive', label: 'Survive', desc: 'Survival time fills the objective bar. Stay alive!', icon: '' },
      { type: 'zone', label: 'Hold the Zone', desc: 'Stand in the marked zone to fill the objective bar.', icon: '' },
      { type: 'collect', label: 'Collect Shurikens', desc: 'Pick up marked shuriken caches to fill the objective bar.', icon: '' },
      { type: 'defend', label: 'Protect the Ronin', desc: 'Keep the allied Ronin alive while the objective bar fills.', icon: '' },
    ];
    if (boss === 'flyshooter' && (element === null || element === 'ghost')) return options[0];
    return options[seed % options.length];
  };
  const addRoom = (boss, element) => {
    const area = areaFor(boss, element);
    if (!byArea[area]) byArea[area] = [];
    const idx = byArea[area].length;
    const spec = MAP_AREAS[area];
    const offset = area === 'castle'
      ? castleOffsetFor(boss, element, idx)
      : area === 'skies'
        ? skyOffsetFor(boss, element, idx)
        : areaOffset(area, idx);
    const id = `${area}-${boss}-${elemId(element)}`;
    const enemyTypes = enemyMix(area, boss, element, idx);
    const room = {
      id,
      name: `${title(element)} ${BOSS_NAMES[boss] || boss.toUpperCase()}`,
      subtitle: spec.label,
      area,
      col: spec.centerCol + offset[0],
      row: spec.centerRow + offset[1],
      mapType: layoutFor(area, boss, element, idx),
      waveIdx: waveIdxFor(boss),
      bossType: boss,
      element,
      enemyTypes,
      kind: kindFor(boss, element, area),
      objective: objectiveFor(boss, element, enemyTypes, idx),
      navLinks: [],
      unlockOnPrimary: [],
      unlockOnSecondary: [],
    };
    if (id === MAP_START_ROOM_ID) {
      room.name = 'Forest Outpost';
      room.subtitle = 'Basic mission';
      room.enemyTypes = ['walker','shooter'];
      room.mapType = 'normal';
    }
    byArea[area].push(room);
    rooms.push(room);
  };
  for (const element of elementOrder) {
    for (const boss of bossOrder) addRoom(boss, element);
  }
  const byId = Object.fromEntries(rooms.map(r => [r.id, r]));
  const areaBounds = {};
  for (const room of rooms) {
    if (!areaBounds[room.area]) {
      areaBounds[room.area] = { minCol: room.col, maxCol: room.col, minRow: room.row, maxRow: room.row };
    } else {
      const b = areaBounds[room.area];
      b.minCol = Math.min(b.minCol, room.col);
      b.maxCol = Math.max(b.maxCol, room.col);
      b.minRow = Math.min(b.minRow, room.row);
      b.maxRow = Math.max(b.maxRow, room.row);
    }
  }
  const borderDistance = room => {
    const b = areaBounds[room.area];
    if (!b) return 0;
    return Math.min(room.col - b.minCol, b.maxCol - room.col, room.row - b.minRow, b.maxRow - room.row);
  };
  const navBridgeIds = {};
  const navBridgeDirs = {};
  const bridgeSourceIds = new Set();
  const bridgeTargetIds = new Set();
  const protectedBridgePairs = [];
  const addBridge = (fromId, toId, protectedBridge, forceDir) => {
    if (!fromId || !toId || fromId === toId) return;
    if (!navBridgeIds[fromId]) navBridgeIds[fromId] = [];
    if (!navBridgeIds[fromId].includes(toId)) navBridgeIds[fromId].push(toId);
    if (forceDir) navBridgeDirs[fromId + '|' + toId] = forceDir;
    bridgeSourceIds.add(fromId);
    bridgeTargetIds.add(toId);
    if (protectedBridge) protectedBridgePairs.push({ fromId, toId, dir: forceDir });
  };
  const edgeRooms = (area, side) => {
    const b = areaBounds[area];
    const areaRooms = rooms.filter(room => room.area === area);
    if (!b) return areaRooms;
    if (side === 'left') return areaRooms.filter(room => room.col === b.minCol);
    if (side === 'right') return areaRooms.filter(room => room.col === b.maxCol);
    if (side === 'up') return areaRooms.filter(room => room.row === b.minRow);
    if (side === 'down') return areaRooms.filter(room => room.row === b.maxRow);
    return areaRooms;
  };
  const bridgeScore = (from, to, fromSide, toSide) => {
    const dc = to.col - from.col;
    const dr = to.row - from.row;
    const horizontal = fromSide === 'left' || fromSide === 'right' || toSide === 'left' || toSide === 'right';
    const vertical = fromSide === 'up' || fromSide === 'down' || toSide === 'up' || toSide === 'down';
    const rowPenalty = horizontal ? Math.abs(dr) * 120 : 0;
    const colPenalty = vertical ? Math.abs(dc) * 120 : 0;
    const travel = Math.abs(dc) + Math.abs(dr);
    const depthPenalty = borderDistance(from) + borderDistance(to);
    return rowPenalty + colPenalty + travel + depthPenalty * 20;
  };
  const addAreaBridge = (fromArea, toArea, fromSide, toSide, count) => {
    const sources = edgeRooms(fromArea, fromSide).slice();
    const targets = edgeRooms(toArea, toSide).slice();
    const usedSources = new Set();
    const usedTargets = new Set();
    for (let i = 0; i < count; i++) {
      let best = null;
      let bestScore = Infinity;
      for (const from of sources) {
        if (bridgeSourceIds.has(from.id)) continue;
        if (usedSources.has(from.id)) continue;
        for (const to of targets) {
          if (bridgeTargetIds.has(to.id)) continue;
          if (usedTargets.has(to.id)) continue;
          const score = bridgeScore(from, to, fromSide, toSide);
          if (score < bestScore) {
            bestScore = score;
            best = { from, to };
          }
        }
      }
      if (!best) break;
      addBridge(best.from.id, best.to.id);
      usedSources.add(best.from.id);
      usedTargets.add(best.to.id);
    }
  };
  const hardestEdgeRoom = (area, side) => {
    const candidates = edgeRooms(area, side).filter(room => !bridgeSourceIds.has(room.id));
    let best = null;
    let bestScore = -Infinity;
    for (const room of candidates) {
      const areaRank = { forest: 1, mountain: 2, volcano: 2, castle: 3, skies: 5 };
      const kindRank = { stage: 0, bridgeBoss: 1, miniBoss: 2, finalBoss: 4, trueFinal: 5 };
      const score =
        (room.distance || 0) * 100 +
        (areaRank[room.area] || 1) * 40 +
        (kindRank[room.kind] || 0) * 30 +
        (room.element ? 15 : 0) +
        (room.waveIdx || 0);
      if (score > bestScore) {
        bestScore = score;
        best = room;
      }
    }
    return best;
  };
  const hardEdgeRooms = (area, side) => {
    return edgeRooms(area, side)
      .filter(room => !bridgeSourceIds.has(room.id))
      .sort((a, b) => {
        const kindRank = { stage: 0, bridgeBoss: 1, miniBoss: 2, finalBoss: 4, trueFinal: 5 };
        const score = room =>
          (kindRank[room.kind] || 0) * 100 +
          (room.element ? 40 : 0) +
          (room.waveIdx || 0);
        return score(b) - score(a);
      });
  };
  const addHardBridge = (fromArea, toArea, fromSide, toSide) => {
    const from = hardestEdgeRoom(fromArea, fromSide);
    const targets = edgeRooms(toArea, toSide).filter(room => !bridgeTargetIds.has(room.id));
    if (!from || !targets.length) return;
    let bestTarget = null;
    let bestScore = Infinity;
    for (const to of targets) {
      const score = bridgeScore(from, to, fromSide, toSide);
      if (score < bestScore) {
        bestScore = score;
        bestTarget = to;
      }
    }
    if (bestTarget) addBridge(from.id, bestTarget.id, true);
  };
  const addExplicitHardBridge = (fromArea, toArea, fromSide, toSide, index) => {
    const from = hardEdgeRooms(fromArea, fromSide)[index || 0];
    const targets = edgeRooms(toArea, toSide).filter(room => !bridgeTargetIds.has(room.id));
    if (!from || !targets.length) return;
    let bestTarget = null;
    let bestScore = Infinity;
    for (const to of targets) {
      const score = bridgeScore(from, to, fromSide, toSide);
      if (score < bestScore) {
        bestScore = score;
        bestTarget = to;
      }
    }
    if (bestTarget) addBridge(from.id, bestTarget.id);
  };
  const addPinnedBridge = (fromId, toId, dir) => {
    if (byId[fromId] && byId[toId]) addBridge(fromId, toId, true, dir);
  };
  addAreaBridge('forest', 'mountain', 'left', 'right', 2);
  addAreaBridge('forest', 'volcano', 'right', 'left', 2);
  addPinnedBridge('mountain-attacker-steel', 'skies-deflector-ghost', 'up');
  addPinnedBridge('volcano-flyer-fire', 'skies-protector-ghost', 'up');
  addAreaBridge('mountain', 'castle', 'up', 'down', 2);
  addAreaBridge('volcano', 'castle', 'up', 'down', 2);
  addAreaBridge('castle', 'skies', 'up', 'down', 2);
  const nearestInDirection = (room, candidates, dx, dy) => {
    let best = null;
    let bestScore = Infinity;
    for (const other of candidates) {
      if (other.id === room.id) continue;
      const dc = other.col - room.col;
      const dr = other.row - room.row;
      if (dx !== 0 && dc * dx <= 0) continue;
      if (dy !== 0 && dr * dy <= 0) continue;
      const primary = dx !== 0 ? Math.abs(dc) : Math.abs(dr);
      const offAxis = dx !== 0 ? Math.abs(dr) : Math.abs(dc);
      if (offAxis > 0 && borderDistance(other) >= borderDistance(room)) continue;
      const score = primary * 100 + offAxis * 45;
      if (score < bestScore) {
        bestScore = score;
        best = other;
      }
    }
    return best;
  };
  const dirKeyFor = (from, to) => {
    const dc = to.col - from.col;
    const dr = to.row - from.row;
    if (Math.abs(dc) >= Math.abs(dr)) return dc < 0 ? 'left' : 'right';
    return dr < 0 ? 'up' : 'down';
  };
  const oppositeDir = { left: 'right', right: 'left', up: 'down', down: 'up' };
  const sortedDirections = [
    ['left', -1, 0],
    ['right', 1, 0],
    ['up', 0, -1],
    ['down', 0, 1],
  ];
  for (const room of rooms) room.navDirs = {};
  const setNavPair = (from, to, dir) => {
    if (!from || !to || !dir) return false;
    const opp = oppositeDir[dir];
    if (!opp || from.navDirs[dir] || to.navDirs[opp]) return false;
    from.navDirs[dir] = to.id;
    to.navDirs[opp] = from.id;
    return true;
  };
  const clearNavPair = (from, dir) => {
    if (!from || !dir || !from.navDirs[dir]) return;
    const to = byId[from.navDirs[dir]];
    const opp = oppositeDir[dir];
    delete from.navDirs[dir];
    if (to && opp && to.navDirs[opp] === from.id) delete to.navDirs[opp];
  };
  const forceNavPair = (from, to, dir) => {
    if (!from || !to || !dir) return false;
    const opp = oppositeDir[dir];
    if (!opp) return false;
    clearNavPair(from, dir);
    clearNavPair(to, opp);
    from.navDirs[dir] = to.id;
    to.navDirs[opp] = from.id;
    return true;
  };
  for (const room of rooms) {
    const bridgeRooms = (navBridgeIds[room.id] || []).map(id => byId[id]).filter(Boolean);
    const areaRooms = rooms.filter(other => other.area === room.area);
    for (const bridge of bridgeRooms) {
      setNavPair(room, bridge, navBridgeDirs[room.id + '|' + bridge.id] || dirKeyFor(room, bridge));
    }
    for (const dir of sortedDirections) {
      const target = nearestInDirection(room, areaRooms, dir[1], dir[2]);
      if (target) setNavPair(room, target, dir[0]);
    }
  }
  for (const pair of protectedBridgePairs) {
    const from = byId[pair.fromId];
    const to = byId[pair.toId];
    forceNavPair(from, to, pair.dir || dirKeyFor(from, to));
  }
  for (const room of rooms) {
    room.navLinks = Object.values(room.navDirs).filter((id, idx, arr) => arr.indexOf(id) === idx);
    room.unlockOnPrimary = room.navLinks.slice();
  }
  const start = byId[MAP_START_ROOM_ID] || rooms[0];
  const reachableFromStart = () => {
    const seen = new Set();
    const queue = start ? [start] : [];
    if (start) seen.add(start.id);
    for (let qi = 0; qi < queue.length; qi++) {
      const room = queue[qi];
      for (const id of room.navLinks || []) {
        const next = byId[id];
        if (!next || seen.has(next.id)) continue;
        seen.add(next.id);
        queue.push(next);
      }
    }
    return seen;
  };
  let reachable = reachableFromStart();
  while (start && reachable.size < rooms.length) {
    let best = null;
    let bestScore = Infinity;
    for (const from of rooms) {
      if (!reachable.has(from.id)) continue;
      for (const to of rooms) {
        if (reachable.has(to.id)) continue;
        const dir = dirKeyFor(from, to);
        const opp = oppositeDir[dir];
        if (from.navDirs[dir] || to.navDirs[opp]) continue;
        const sameAreaPenalty = from.area === to.area ? 0 : 80;
        const score = Math.abs(from.col - to.col) * 10 + Math.abs(from.row - to.row) * 10 + sameAreaPenalty;
        if (score < bestScore) {
          bestScore = score;
          best = { from, to, dir };
        }
      }
    }
    if (!best) break;
    setNavPair(best.from, best.to, best.dir);
    for (const room of rooms) {
      room.navLinks = Object.values(room.navDirs).filter((id, idx, arr) => arr.indexOf(id) === idx);
      room.unlockOnPrimary = room.navLinks.slice();
    }
    reachable = reachableFromStart();
  }
  if (start) {
    const queue = [start];
    start.distance = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const room = queue[qi];
      for (const id of room.navLinks || []) {
        const next = byId[id];
        if (!next || next.distance !== undefined) continue;
        next.distance = room.distance + 1;
        queue.push(next);
      }
    }
  }
  for (const room of rooms) {
    if (room.distance === undefined) {
      room.distance = Math.max(1, Math.abs(room.col - (start ? start.col : 0)) + Math.abs(room.row - (start ? start.row : 0)));
    }
  }
  return rooms;
})();

const MAP_ROOM_BY_ID = Object.fromEntries(MAP_ROOM_DEFS.map(room => [room.id, room]));

// Gamepad button map (Standard Gamepad):
const GP_ATTACK = 0;   // A / Cross
const GP_SPECIAL = 2;  // X / Square
const GP_SHURIKEN = 1; // B / Circle
const GP_JUMP = 3;     // Y / Triangle
const GP_SLAM = 13;    // Dpad Down
const GP_LB = 4;
const GP_RB = 5;

// ── Boss Item Definitions ────────────────────────────────────
const BOSS_ITEMS = {
  pickaxe:        { name: 'Pickaxe',          icon: '⛏', color: '#c96', desc: 'Enemy shields take 2 hits instead of one.' },
  tripleShuriken: { name: 'Triple Shuriken',  icon: '✦', color: '#ccc', desc: 'Each shuriken fires 3 projectiles. Halves recharge time.' },
  homingShuriken: { name: 'Homing Shuriken',  icon: '◎', color: '#6cf', desc: 'Shurikens home in on enemies.' },
  vampireTeeth:   { name: 'Vampire Teeth',    icon: '🦷', color: '#d44', desc: 'Each hit recovers 1% HP (min 1).' },
  iaito:          { name: 'Iaito',             icon: '⚔', color: '#eee', desc: 'Sword attacks deflect bullets back at enemies.' },
  spikedArmor:    { name: 'Spiked Armor',     icon: '⬡', color: '#f80', desc: 'When hit, damage all nearby enemies.' },
  redMagnet:      { name: 'Red Magnet',        icon: '⊙', color: '#f33', desc: 'Greatly increases orb pickup range.' },
  x2Orb:          { name: 'x2 Orb',            icon: '②', color: '#ff0', desc: 'Double the effect of orbs. Fragile — breaks after 100 orbs.' },
  deathsKey:      { name: "Death's Key",        icon: '🗝', color: '#a6f', desc: 'Once per run, revive at 50% HP.' },
  protectiveCharm:{ name: 'Protective Charm',  icon: '♣', color: '#4f4', desc: 'Halves affliction duration.' },
  charmFire:      { name: 'Fire Charm',        icon: '◈', color: '#f44', desc: 'Halves fire damage, immune to burn, 10% heal on fire kill.' },
  charmGhost:     { name: 'Ghost Charm',       icon: '◈', color: '#a8e', desc: 'Halves ghost damage, immune to curse, 10% heal on ghost kill.' },
  charmWater:     { name: 'Water Charm',       icon: '◈', color: '#4af', desc: 'Halves water damage, immune to freeze, 10% heal on water kill.' },
  charmCrystal:   { name: 'Crystal Charm',     icon: '◈', color: '#0dd', desc: 'Halves crystal damage, immune to freeze, 10% heal on crystal kill.' },
  charmWind:      { name: 'Wind Charm',        icon: '◈', color: '#6b6', desc: 'Halves wind damage, immune to float, 10% heal on wind kill.' },
  charmLightning: { name: 'Lightning Charm',   icon: '◈', color: '#ff4', desc: 'Halves lightning damage, immune to paralyse, 10% heal on lightning kill.' },
  charmSpiky:     { name: 'Spiky Charm',       icon: '◈', color: '#f86', desc: 'Halves spiky damage, immune to bleed, 10% heal on spiky kill.' },
  leatherBoots:   { name: 'Leather Boots',     icon: '👢', color: '#a86', desc: '5% chance to evade attacks.' },
  friendsLetter:  { name: "A Friend's Letter", icon: '✉', color: '#fda', desc: "'I hope it will reach him.'" },
  theKunai:       { name: 'The Kunai',         icon: '🗡', color: '#f66', desc: 'Last shuriken is a kunai that always explodes. More shurikens = bigger blast.' },
  theCode:        { name: 'The Code',          icon: '⌘', color: '#aaf', desc: 'Hold attack for a 3-hit combo. Counter-attack recharges over time.' },
};

// Which item(s) each boss drops (first uncollected in order)
const BOSS_ITEM_DROPS = {
  walker:     ['pickaxe', 'charmFire'],
  shooter:    ['tripleShuriken', 'charmGhost'],
  jumper:     ['leatherBoots', 'charmWater'],
  flyer:      ['homingShuriken', 'charmCrystal'],
  deflector:  ['friendsLetter', 'iaito', 'charmWind'],
  bouncer:    ['spikedArmor', 'x2Orb', 'charmLightning'],
  shielded:   ['protectiveCharm', 'deathsKey', 'charmSpiky'],
  protector:  ['redMagnet', 'theCode'],
  attacker:   ['vampireTeeth'],
  flyshooter: ['theKunai'],
};

const ITEM_ATTRIBUTES = {
  mind:      { label: 'Mind',      color: '#b45cff', stats: 'magic damage / focus' },
  vigor:     { label: 'Vigor',     color: '#ff6a3d', stats: 'attack damage / strength' },
  dexterity: { label: 'Dexterity', color: '#39d98a', stats: 'reach / speed' },
};

const BOSS_ITEM_META = {
  pickaxe:        { attr: 'vigor', complexity: 1 },
  leatherBoots:   { attr: 'dexterity', complexity: 1 },
  protectiveCharm:{ attr: 'mind', complexity: 1 },
  charmFire:      { attr: 'mind', complexity: 1 },
  charmWater:     { attr: 'mind', complexity: 1 },
  tripleShuriken: { attr: 'dexterity', complexity: 2 },
  homingShuriken: { attr: 'mind', complexity: 2 },
  spikedArmor:    { attr: 'vigor', complexity: 2 },
  charmGhost:     { attr: 'mind', complexity: 2 },
  charmCrystal:   { attr: 'mind', complexity: 2 },
  charmWind:      { attr: 'mind', complexity: 2 },
  redMagnet:      { attr: 'dexterity', complexity: 3 },
  vampireTeeth:   { attr: 'vigor', complexity: 3 },
  deathsKey:      { attr: 'mind', complexity: 3 },
  charmLightning: { attr: 'mind', complexity: 3 },
  charmSpiky:     { attr: 'vigor', complexity: 3 },
  iaito:          { attr: 'dexterity', complexity: 4 },
  x2Orb:          { attr: 'mind', complexity: 4 },
  friendsLetter:  { attr: 'mind', complexity: 4 },
  theCode:        { attr: 'dexterity', complexity: 5 },
  theKunai:       { attr: 'vigor', complexity: 5 },
};
for (const [itemId, meta] of Object.entries(BOSS_ITEM_META)) {
  if (BOSS_ITEMS[itemId]) Object.assign(BOSS_ITEMS[itemId], meta);
}

// Items localStorage key
const VAULT_KEY = 'elenin_vault';

// ── Battle Phrases ───────────────────────────────────────────
// Helper to pick a random phrase
function pickPhrase(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getBattlePhrase(enemyType, ninjaType, element) {
  const data = BATTLE_PHRASES[enemyType];
  if (!data) return null;
  // Ninja-specific first (25% chance if available)
  if (ninjaType && data.ninjaEntrance && data.ninjaEntrance[ninjaType] && Math.random() < 0.25) {
    return pickPhrase(data.ninjaEntrance[ninjaType]);
  }
  // Element-specific (20% chance if available)
  if (element && data.elementEntrance && data.elementEntrance[element] && Math.random() < 0.2) {
    return pickPhrase(data.elementEntrance[element]);
  }
  return pickPhrase(data.entrance);
}

function getKillPhrase(enemyType, ninjaType, element) {
  const data = BATTLE_PHRASES[enemyType];
  if (!data) return null;
  if (ninjaType && data.ninjaKill && data.ninjaKill[ninjaType] && Math.random() < 0.25) {
    return pickPhrase(data.ninjaKill[ninjaType]);
  }
  if (element && data.elementKill && data.elementKill[element] && Math.random() < 0.2) {
    return pickPhrase(data.elementKill[element]);
  }
  return pickPhrase(data.kill);
}

function getNinjaResponse(ninjaType, enemyType, element) {
  const data = NINJA_RESPONSES[ninjaType];
  if (!data) return null;
  if (enemyType && data[enemyType]) return pickPhrase(data[enemyType]);
  if (element && data['elem_' + element]) return pickPhrase(data['elem_' + element]);
  return data.general ? pickPhrase(data.general) : null;
}

const BATTLE_PHRASES = {
  walker: {
    entrance: [
      "For the King!",
      "Yahaww!",
      "I'll call my commander!",
      "Halt, intruder!",
      "You won't pass this post!",
      "The Reign stands firm!",
    ],
    elementEntrance: {
      fire:      ["Want some warming up?", "I'll scorch you myself!"],
      earth:     ["Heavy steps, heavy fists!", "The ground is MINE!"],
      water:     ["Want some freezing needle?", "You'll drown here!"],
      crystal:   ["Shiny armor, sharp blade!", "Ice-cold steel!"],
      wind:      ["I'll blow you away!", "A breeze won't save you!"],
      lightning: ["Feel my thunder!", "Zap! Haha!"],
      steel:     ["Forged and ready!", "Cold iron, warm blood!"],
    },
    kill: [
      "I want my reward!",
      "I'll get promoted for sure!",
      "I will be your Nemesis!",
      "Back to the barracks... as a hero!",
      "Tell the commander — I got one!",
      "The Reign always wins!",
    ],
    elementKill: {
      fire:      ["Burnt to a crisp, eh?", "That was... warm!"],
      earth:     ["Grounded. Permanently.", "Crushed like gravel!"],
      water:     ["Washed up already?", "Frozen solid!"],
      crystal:   ["Shattered like glass!", "Ice cold finish!"],
      wind:      ["Blown out for good!", "No wind can save you!"],
      lightning: ["Shocking defeat!", "Fried!"],
      steel:     ["Cold steel wins!", "Hammered down!"],
    },
  },
  shooter: {
    entrance: [
      "I got you in my sights.",
      "Target spotted.",
      "Hold still... just a second.",
      "Distance is my advantage.",
      "One shot, one down.",
      "You can't dodge forever.",
    ],
    elementEntrance: {
      fire:      ["Incendiary rounds loaded!", "Fire in the hole!"],
      water:     ["Frost-tipped bolts ready!", "Ice shot, primed!"],
      lightning: ["Charged bolts online!", "Thundershot ready!"],
      crystal:   ["Crystal-tipped rounds!", "Diamond precision!"],
      wind:      ["Wind-guided shot!", "No wind can deflect this!"],
      earth:     ["Stone slugs loaded!", "Heavy payload!"],
      steel:     ["Armor-piercing bolt!", "Steel rain incoming!"],
    },
    kill: [
      "Bullseye!",
      "Clean shot.",
      "Confirmed kill — moving on.",
      "Should've stayed behind cover.",
      "Another notch on my bolt.",
      "Ranged superiority.",
    ],
    elementKill: {
      fire:      ["Burned from a distance!", "Fire bolt — direct hit!"],
      water:     ["Frost shot confirmed!", "Frozen mid-step!"],
      lightning: ["Thunder strike confirmed!", "Zapped clean!"],
      crystal:   ["Shattered on impact!", "Crystal clear shot!"],
      wind:      ["Wind-guided to your skull!", "Blown away by precision!"],
      earth:     ["Stone slug impact!", "Heavy hit confirmed!"],
      steel:     ["Steel bolt through and through!", "Pierced!"],
    },
  },
  jumper: {
    entrance: [
      "Yahoo!",
      "Can't catch me!",
      "Boing boing boing!",
      "Up here, slowpoke!",
      "Wheee!",
      "Jump jump jump!",
    ],
    elementEntrance: {
      fire:      ["Hot hops!", "Fire jump!"],
      water:     ["Splash landing!", "Slippery bounce!"],
      wind:      ["Wind-boosted leap!", "Sky hop!"],
      lightning: ["Thunder jump!", "Sparky bounce!"],
      earth:     ["Ground pound incoming!", "Heavy landing!"],
      crystal:   ["Icy vault!", "Crystal hop!"],
      steel:     ["Metal spring!", "Steel bounce!"],
    },
    kill: [
      "Hehehe! Squished!",
      "Bounced right on ya!",
      "Too slow! Waaay too slow!",
      "I'm the best jumper ever!",
      "Trampolined to victory!",
      "You got hopped!",
    ],
    elementKill: {
      fire:      ["Hot stomp!", "Burnt on landing!"],
      water:     ["Splash KO!", "Frozen underfoot!"],
      wind:      ["Air stomped!", "Wind from above!"],
      lightning: ["Thunder stomp!", "Zap-landed!"],
      earth:     ["Earthquake landing!", "Mega stomp!"],
      crystal:   ["Icy dive!", "Shatter hop!"],
      steel:     ["Metal stomp!", "Steel drop!"],
    },
  },
  bouncer: {
    entrance: [
      "Artillery barrage!!!",
      "Mortar crew, ready!",
      "Incoming bombardment!",
      "Fire for effect!",
      "Lobbing 'em high!",
      "Area denial engaged!",
    ],
    elementEntrance: {
      fire:      ["Incendiary shells loaded!", "Fire rain!"],
      water:     ["Frost mortars away!", "Ice bombardment!"],
      lightning: ["Tesla shells primed!", "Lightning barrage!"],
      earth:     ["Boulder barrage!", "Stone rain!"],
      crystal:   ["Crystal cluster rounds!", "Diamond shrapnel!"],
      wind:      ["Air burst shells!", "Gale mortar!"],
      steel:     ["Armor-piercing shells!", "Steel hail!"],
    },
    kill: [
      "Direct hit! Target eliminated!",
      "Splash damage wins again!",
      "Area denied. Permanently.",
      "Should've moved faster!",
      "Artillery always wins!",
      "Kaboom! Hahaha!",
    ],
    elementKill: {
      fire:      ["Scorched by mortar!", "Burn radius!"],
      water:     ["Frozen by shrapnel!", "Ice shell!"],
      lightning: ["Tesla shell direct hit!", "Shocked!"],
      earth:     ["Buried in rubble!", "Stone shelled!"],
      crystal:   ["Crystal fragmentation!", "Shattered!"],
      wind:      ["Air burst lethal!", "Blown apart!"],
      steel:     ["Steel shell impact!", "Shrapnel finish!"],
    },
  },
  shielded: {
    entrance: [
      "My shield is my oath!",
      "Come! Break yourself upon me!",
      "Hold the line!",
      "Phalanx formation! ...Just me!",
      "I am the wall!",
      "None shall pass!",
    ],
    elementEntrance: {
      fire:      ["Flame-forged shield!", "This shield survived hotter!"],
      water:     ["Frost-tempered barrier!", "Ice ward raised!"],
      lightning: ["Grounded shield!", "No spark gets through!"],
      earth:     ["Stone bulwark!", "Mountain wall!"],
      crystal:   ["Crystal aegis!", "Diamond fortress!"],
      wind:      ["Wind won't move me!", "Anchored firm!"],
      steel:     ["Reinforced plating!", "Double steel!"],
    },
    kill: [
      "The shield holds. You don't.",
      "Stood my ground. You fell.",
      "Protected the Reign to the end.",
      "This is what persistence looks like.",
      "I held the line. Did you?",
      "Unbreakable.",
    ],
    elementKill: {
      fire:      ["Burned behind your guard!", "Shield-bash, flame finish!"],
      water:     ["Frozen behind cover!", "No shield saves from ice!"],
      lightning: ["Shocked through your defense!", "Spark through the gap!"],
      earth:     ["Crushed against stone!", "Wall to wall!"],
      crystal:   ["Shattered your stance!", "Crystal slam!"],
      wind:      ["Blown past your guard!", "Shield bash, wind!"],
      steel:     ["Steel on steel. I won.", "Clang! You lose."],
    },
  },
  deflector: {
    entrance: [
      "Draw your blade.",
      "I've been waiting for this.",
      "The arena demands blood.",
      "Let us cross swords.",
      "A worthy foe? We'll see.",
      "The Ronin never retreats.",
    ],
    ninjaEntrance: {
      fire:    ["Fire. At last, our rematch.", "The Arena waited for us, Fire.", "Ready for the duel of your life?", "Our rivalry ends today."],
      earth:   ["Your constructs won't save you here.", "Stone crumbles against steel.", "The Arena is no place for builders.", "Swords, not walls, Earth."],
      bubble:  ["A bubble in an arena? Amusing.", "Pop goes the fighter.", "This isn't a playground.", "Float away while you can."],
      shadow:  ["I can feel you lurking.", "Step into the light, coward.", "No shadows in the Arena.", "Your tricks won't work on me."],
      crystal: ["Your ice is beautiful. And fragile.", "A sculptor against a swordsman?", "Delicate, aren't you?", "Crystal shatters. Steel endures."],
      wind:    ["The wandering scout returns.", "Wind! I knew you'd come.", "Your boomerangs against my katana? Amusing.", "The scout who started it all."],
      storm:   ["Lightning is fast. My blade is faster.", "Voltage means nothing against focus.", "Thunder brother, bring your storm.", "Raw power won't save you."],
    },
    kill: [
      "A clean cut.",
      "The blade speaks.",
      "Deflected and finished.",
      "The Arena claims another.",
      "Yield to the katana.",
      "Victory... with honor.",
    ],
    ninjaKill: {
      fire:    ["Our rivalry... I win.", "The Arena is mine, Fire.", "Not hot enough.", "The rematch is settled."],
      earth:   ["Walls fall. Blades remain.", "Crumble.", "No construct saves its master.", "The builder falls."],
      bubble:  ["Pop.", "Too fragile for the Arena.", "Should've floated away.", "Amusing. But over."],
      shadow:  ["I saw you the whole time.", "Stealth fails against instinct.", "Nowhere to hide.", "The shadow fades."],
      crystal: ["Beautiful... and broken.", "Like ice in the sun.", "Shattered.", "Fragile to the last."],
      wind:    ["The scout falls. The mission ends.", "Wind cannot cut steel.", "Your journey ends here.", "Farewell, leader."],
      storm:   ["Lightning, grounded.", "Fast, but not enough.", "The thunder dies.", "Storm's over."],
    },
  },
  protector: {
    entrance: [
      "The Guild remembers.",
      "I protect what remains.",
      "My aura shields all who serve.",
      "You fight the Aegis now.",
      "The ancient ward holds.",
      "None fall under my watch.",
    ],
    ninjaEntrance: {
      fire:    ["Fire... the Guild recalls your raids.", "You burned our halls once."],
      earth:   ["Earth. Our elders spoke of you.", "You knew our craft. Now face it."],
      bubble:  ["Even bubbles pop against our ward.", "A drifter against a guardian?"],
      shadow:  ["The Guild sees all. Even you.", "Shadows cannot pierce our aura."],
      crystal: ["Your frost meets our warmth.", "Crystal artisan... the Guild respects you."],
      wind:    ["Wind. You knew our elders well.", "The scout returns. The Guild endures."],
      storm:   ["Lightning cannot break a ward.", "Storm... the Guild stands firm."],
    },
    kill: [
      "The Guild endures.",
      "Protected until the end.",
      "The aura never wavered.",
      "Shielded from hope.",
      "The Aegis prevails.",
      "Rest now. The Guild remains.",
    ],
    ninjaKill: {
      fire:    ["The Guild remembers... and the Guild wins.", "Your flames end here."],
      earth:   ["Our craft surpasses yours.", "The student falls before the Guild."],
      bubble:  ["Popped.", "The ward holds. You don't."],
      shadow:  ["The Guild saw you all along.", "No darkness hides from the aura."],
      crystal: ["Frozen... permanently.", "The artisan falls."],
      wind:    ["The leader falls. The cause falters.", "Your elders would grieve."],
      storm:   ["Grounded by the Guild.", "The storm passes."],
    },
  },
  attacker: {
    entrance: [
      "▓░▒ AWAKEN ▒░▓",
      "d4RKn3$$ r!sEs",
      "TTTH̷E̴ ̸O̶R̵B̶ ̸S̸E̶E̸S̷",
      "fr4gm3nt::ONLINE",
      "s̶e̸a̷l̴ ̵b̸r̶o̸k̷e̸n̶.̴.̸.̴",
      "V̷O̴I̸D̷ ̶H̴U̵N̷G̸E̶R̸S̶",
    ],
    elementEntrance: {
      fire:      ["b̶u̷r̸n̸.̶d̶a̸t̴ ̶C̴O̵R̷R̵U̶P̷T̸", "FL4M3::NULL"],
      water:     ["fr33z3.exe HALT", "W4T3R::0V3RFL0W"],
      lightning: ["SP4RK.err ABSORB", "v0lt4g3::F33D"],
      earth:     ["CR̸U̸S̷H̸.dat L0AD", "st0n3::NULL"],
      crystal:   ["SH4TT3R.log RUN", "1C3::FR4GM3NT"],
      wind:      ["W1ND.sys HALT", "br33z3::V01D"],
      steel:     ["M3T4L.exe C0RRUPT", "ST33L::4BS0RB"],
    },
    kill: [
      "▓░ C̸O̴N̸S̸U̶M̵E̶D̸ ░▓",
      "s0uL.dat EXTRACT",
      "d4rkn3ss::GR0WS",
      "fr4gm3nt::F3D",
      "TH̸E̵ ̸S̷E̸A̸L̷ ̷W̸E̶A̸K̵E̸N̵S̸",
      "V̷O̸I̵D̵ ̸S̸A̷T̶I̷S̸F̸I̷E̵D̶",
    ],
    elementKill: {
      fire:      ["FL4M3.dat D3L3T3D", "b̶u̷r̸n̸::VOID"],
      water:     ["FR33Z3.exe HALT", "W4T3R::DR41N3D"],
      lightning: ["SP4RK::4BS0RB3D", "v0lt::G0N3"],
      earth:     ["ST0N3::CRUSH3D", "34RTH::V01D"],
      crystal:   ["1C3::SH4TT3R3D", "CRYST4L::NULL"],
      wind:      ["W1ND::ST1LL", "BR33Z3::D34D"],
      steel:     ["ST33L::C0RROD3D", "M3T4L::V01D"],
    },
  },
  flyer: {
    entrance: [
      "Target acquired.",
      "Fox-2, engaged!",
      "Tally-ho! Bandit low!",
      "Going in hot!",
      "Cleared for dive!",
      "Airspace is mine!",
    ],
    elementEntrance: {
      fire:      ["Afterburner engaged!", "Napalm run incoming!"],
      water:     ["Frost dive incoming!", "Ice wing attack!"],
      lightning: ["Tesla dive!", "Spark descent!"],
      earth:     ["Ground strike inbound!", "Stone falcon dive!"],
      crystal:   ["Diamond dive!", "Crystal strafe!"],
      wind:      ["Wind shear attack!", "Gust dive!"],
      steel:     ["Steel talon dive!", "Metal hawk!"],
    },
    kill: [
      "Splash! Target down!",
      "Kill confirmed from above!",
      "That's a clean sortie!",
      "Ground target eliminated!",
      "Returning to altitude!",
      "Mission complete!",
    ],
    elementKill: {
      fire:      ["Napalm strike confirmed!", "Scorched from above!"],
      water:     ["Frost strike confirmed!", "Iced from the sky!"],
      lightning: ["Tesla strike confirmed!", "Zapped from above!"],
      earth:     ["Ground strike impact!", "Pounded from altitude!"],
      crystal:   ["Diamond strike confirmed!", "Shattered from high!"],
      wind:      ["Wind shear lethal!", "Blown down from up!"],
      steel:     ["Steel talon kill!", "Metal from the sky!"],
    },
  },
  flyshooter: {
    entrance: [
      "The Reign has no ceiling.",
      "All kneel below the crown.",
      "Your rebellion ends here.",
      "I see everything from up here.",
      "The Overlord sees all.",
      "The sky belongs to the Reign!",
    ],
    ninjaEntrance: {
      fire:    ["Your flames reach high, but I fly higher.", "The hot-head who burns thrones... try burning the sky.", "Fire, your rival was just an appetizer.", "The Arena was practice. This is your end."],
      earth:   ["Stack your walls. I'll fly over them.", "The builder. Your constructs crumble below.", "Dig deeper, Earth. You can't reach me.", "Your Guild friends couldn't stop me. Neither can you."],
      bubble:  ["A bubble against the Overlord? Delightful.", "Pop, pop, pop. That's your future.", "Your floating tricks amuse me.", "The drifter who thought war was fun."],
      shadow:  ["I see you, Shadow. I always have.", "Your darkness is nothing next to the Orbs.", "The ritual continues, whether you hide or not.", "Lurking won't save anyone."],
      crystal: ["Beautiful ice. It will melt in my bombardment.", "The artisan from the frozen north. Your spires are dust.", "Delicate. Precise. And doomed.", "You came for revenge? How quaint."],
      wind:    ["The scout who started this whole mess.", "You gathered them all. And I'll end them all.", "Wind, your favors are spent.", "Every lead you followed leads here."],
      storm:   ["Your stolen thunder won't save you.", "Lightning rises — but never high enough.", "The storm-forged weapons are mine now.", "Take your thunder back? Please try."],
    },
    kill: [
      "The Reign stands eternal!",
      "Your rebellion dies today!",
      "Submit to the crown!",
      "None escape the Overlord!",
      "The sky falls on the disloyal!",
      "My reign is absolute!",
    ],
    ninjaKill: {
      fire:    ["Burn out, hot-head.", "The Arena will miss you.", "Flames extinguished.", "Your rival sends regards."],
      earth:   ["Crumble, builder.", "No wall reaches the sky.", "Buried.", "Your constructs die with you."],
      bubble:  ["Pop.", "Was the war fun enough?", "Float away forever.", "Pathetic."],
      shadow:  ["The shadows can't hide you now.", "The ritual is complete.", "Darkness consumed.", "You saw the truth, and it killed you."],
      crystal: ["Your ice spires join you in ruin.", "Shattered. Like your homeland.", "Delicate to the end.", "Revenge denied."],
      wind:    ["The leader falls! The rebellion is over!", "Every lead, every favor... wasted.", "The scout's final report: failure.", "You assembled them all... for nothing."],
      storm:   ["Your thunder belongs to me.", "Lightning grounded forever.", "The storm ends.", "You wanted your thunder back? Take it to the grave."],
    },
  },
};

// ── Ninja Responses ──────────────────────────────────────────
const NINJA_RESPONSES = {
  fire: {
    general:    ["I'm just getting warmed up!", "That all you got?!", "MORE!", "Bring it!!"],
    walker:     ["You call that a fight?!", "I've burned kings. You're nothing.", "Grunt louder. It won't help.", "Promoted? In the afterlife!"],
    shooter:    ["You missed, genius!", "Bet you can't hit a bonfire!", "Sights? What sights?", "Keep shooting. I'll keep dodging."],
    jumper:     ["Hold still so I can burn you!", "Jumping won't save you from fire!", "Annoying little rabbit!", "Hop into this fireball!"],
    bouncer:    ["Mortars? That's cute.", "I AM the explosion!", "Fire beats artillery!", "Boom? I'll show you boom!"],
    shielded:   ["Shields melt!", "I'll burn through that!", "That shield won't last!", "Spartan? Meet inferno!"],
    deflector:  ["Ronin! I've waited for this!", "Our rematch — HERE AND NOW!", "This time I won't hold back!", "The Arena is calling!"],
    protector:  ["Your Guild can't shield from this heat!", "Auras don't stop fire!", "I'll melt your ward!", "The Guild burns!"],
    attacker:   ["What even ARE you?!", "Glitch this, orb thing!", "Dark magic? I prefer FIRE magic!", "Come closer so I can burn you!"],
    flyer:      ["Get down here and fight!", "Even birds burn!", "My flames reach the sky!", "I'll clip your wings!"],
    flyshooter: ["You want the sky? I'll set it on fire!", "Your reign BURNS today!", "Higher ground won't save you!", "I'll bring you DOWN!"],
  },
  earth: {
    general:    ["I'll build right through you.", "Solid as bedrock.", "Watch this.", "Let me craft something..."],
    walker:     ["I've toppled kingdoms. You patrol hallways.", "Back to the dirt with you.", "My golems hit harder.", "Bedrock vs foot soldier? Please."],
    shooter:    ["Pillars make great cover.", "My walls eat your bolts.", "Nice shot — at my pillar.", "Construct a better plan."],
    jumper:     ["Jump all you want. Spikes below.", "Ground pound beats bunny hop.", "I'll plant you in place.", "This isn't Minecraft, but still."],
    bouncer:    ["Mortars bounce off stone!", "My pillars absorb that!", "Artillery vs architecture!", "Build, block, win."],
    shielded:   ["Your shield was forged by the Guild. I know its weaknesses.", "The Guild taught us both.", "Shield meets hammer.", "Craft against craft."],
    deflector:  ["My constructs don't flinch.", "Walls don't need to deflect.", "The Arena? I prefer the workshop.", "Swords break on stone."],
    protector:  ["Old friend... I'll free you.", "The Guild deserves better.", "Your elders sent me.", "I'll break the Overlord's hold."],
    attacker:   ["Ancient darkness... meet ancient stone.", "My golems have stood for centuries.", "Sealed in rock before. I'll do it again.", "Back to the earth with you."],
    flyer:      ["I'll build a tower to reach you.", "Spikes go up too.", "What goes up, lands on my spikes.", "Altitude won't save you."],
    flyshooter: ["Your reign stands on a foundation I can crack.", "Every kingdom falls.", "I'll build your tomb.", "Toppled nations before. Yours is next."],
  },
  bubble: {
    general:    ["This is SO fun!", "Wheee!", "Pop pop pop!", "Hehe, sorry not sorry!"],
    walker:     ["Ooh, a soldier! Cute!", "For the king? More like for the funny!", "Want a bubble ride?", "Grunt noises are hilarious!"],
    shooter:    ["You can't shoot what you can't pop!", "Bubble shield! Bloop!", "Missed! Hehe!", "Try aiming at something less fun!"],
    jumper:     ["Ooh, a bouncy friend!", "I can jump too! HIGHER!", "Tag! You're it!", "Boing boing BUDDIES!"],
    bouncer:    ["Ooh, fireworks!", "Boom boom! Fun!", "My bubbles eat your shells!", "Pop vs boom — LET'S GO!"],
    shielded:   ["Hide behind that all day! I don't mind!", "Knock knock! Bubble delivery!", "Shields are just pre-popped bubbles!", "Bloop right over ya!"],
    deflector:  ["Oooh, a sword! Fancy!", "Can you deflect BUBBLES?!", "The Arena sounds fun!", "Swords can't pop what bends!"],
    protector:  ["Aww, a healer! That's nice!", "Your aura is so pretty!", "Heal this — BLOOP!", "Let's be friends! After I win!"],
    attacker:   ["Ooh, a glowy ball! SHINY!", "Pop goes the orb!", "Can I keep it?!", "It's like a dark bubble! But worse!"],
    flyer:      ["We can BOTH fly! Kinda!", "Bubble vs bird!", "I float BETTER!", "Wheee, sky battle!"],
    flyshooter: ["Oooh, the big bad king!", "This is the final boss? EXCITING!", "I came for fun and I'm having it!", "Pop goes the Overlord!"],
  },
  shadow: {
    general:    ["...", "You won't see the next one.", "From the darkness.", "Already behind you."],
    walker:     ["You can't fight what you can't see.", "...Pathetic.", "Too slow.", "I was behind you the whole time."],
    shooter:    ["Aim at empty air.", "I was never where you looked.", "Your sights see nothing.", "Shadows have no silhouette."],
    jumper:     ["Jumping reveals you. Standing still hides me.", "...Noisy.", "I prefer the ground. In the dark.", "Quiet wins."],
    bouncer:    ["Explosions light up the dark. Briefly.", "I'll slip between the blasts.", "Loud. And useless.", "Area denial? I deny your existence."],
    shielded:   ["Your shield faces forward. I'm behind you.", "Shields block what you see coming.", "...", "Turn around."],
    deflector:  ["You sense me? Impressive.", "The katana won't catch what it can't see.", "Instinct vs shadow. Interesting.", "Feel the darkness, Ronin."],
    protector:  ["The Guild sees all? Test that.", "Auras don't illuminate darkness.", "The ancient ward... has cracks.", "I see the truth in those Orbs."],
    attacker:   ["I've seen what you really are.", "Ancient darkness? I AM darkness.", "The ritual ends now.", "Fragment of a sealed horror... I'll seal you again."],
    flyer:      ["The sky has shadows too.", "Dive all you want. I've moved.", "Your altitude means nothing at night.", "I'm the shadow of your wings."],
    flyshooter: ["I've walked in your tower's shadows.", "The ritual... I'll end it.", "Your Overlord crown casts a long shadow. Mine.", "I've seen your truth. It dies with you."],
  },
  crystal: {
    general:    ["Precision.", "Surgical.", "Like cutting a diamond.", "Clean and cold."],
    walker:     ["Crude. But brave, I suppose.", "My homeland fell to better soldiers than you.", "Stand still. This will be precise.", "A grunt versus a master artisan."],
    shooter:    ["Your aim lacks... artistry.", "My shards find their mark too.", "Cold precision beats warm bolts.", "Freeze. It'll hurt less."],
    jumper:     ["Erratic. Undisciplined.", "Stop bouncing. It's unbecoming.", "My ice will slow you down.", "Freeze mid-air."],
    bouncer:    ["Crude explosives against crystal art?", "My shards cut your shells.", "Messy. I prefer clean.", "Artillery has no finesse."],
    shielded:   ["Ice goes around shields.", "Your ward was beautiful once.", "Freeze the shield. Shatter it.", "Cold defeats steel."],
    deflector:  ["Your blade is elegant. My ice... more so.", "An artisan of steel meets one of ice.", "Swords chip. Diamonds don't.", "A dance of precision."],
    protector:  ["The Guild respects the North's craft.", "Your aura is warm. My ice is colder.", "Protect all you want. Ice finds cracks.", "Freeze the healer first."],
    attacker:   ["Ancient horror trapped in an orb? Fitting.", "Even darkness can freeze.", "I'll shatter you like the ice spires.", "Fragment by fragment."],
    flyer:      ["Fall from the sky. Shatter on ice.", "I'll freeze your wings.", "Crystal catches the light. And the flyer.", "Dive into a glacier."],
    flyshooter: ["You shattered my homeland's spires. I return the favor.", "The frozen north remembers.", "My revenge is cold and precise.", "Your reign melts."],
  },
  wind: {
    general:    ["The wind finds a way.", "I've seen worse.", "Keep moving.", "Every corner of this land — I've been there."],
    walker:     ["I scouted your posts weeks ago.", "Every patrol route — I know them all.", "The wind carries more than leaves.", "Fall back, soldier."],
    shooter:    ["Wind bends your bolts.", "I've dodged arrows from Hawk Women.", "Your shots can't touch the breeze.", "Like Windranger, but better."],
    jumper:     ["I'm faster on the ground AND in the air.", "Jumping? Cute. I DASH.", "You're like a rabbit. I'm the hawk.", "Robin Hood could outrun you."],
    bouncer:    ["I'll weave through the barrage.", "Wind finds the gaps.", "Your shells are slow.", "I scouted artillery camps. This is nothing."],
    shielded:   ["I'll dash right past your shield.", "The wind goes around walls.", "Your shield was built to face forward.", "I come from every direction."],
    deflector:  ["Ronin... I gathered them all for this.", "My boomerangs against your katana.", "I've scouted every arena.", "You taught me speed. I surpassed it."],
    protector:  ["Old friend... the elders sent their regards.", "I knew your Guild before the Overlord.", "The wind remembers the free Guild.", "I'll free you."],
    attacker:   ["I've seen these across the land.", "Every tower, every ritual site — scouted.", "The wind carries warnings about you.", "End of the line, fragment."],
    flyer:      ["The sky is MY domain.", "I've outrun flyers before.", "Wind beats wings.", "Your dive is predictable."],
    flyshooter: ["I found you. I gathered them. And now we end this.", "Every lead, every favor. It all leads here.", "The wind reaches everywhere — even your throne.", "You designed the Reign. I designed its fall."],
  },
  storm: {
    general:    ["Nothing personal.", "Sorry about this.", "Thunder incoming.", "Let's get this done."],
    walker:     ["Hey, no hard feelings.", "I just need my thunder back.", "Stand down? ...No? Okay.", "Sorry, soldier. Orders are orders."],
    shooter:    ["Nice aim! ...But I'm faster.", "Sorry, I really am.", "No hard feelings, sniper.", "Dodge this — actually, that's my line."],
    jumper:     ["You're fun! I mean, sorry!", "Nice hops! But I have LIGHTNING!", "No offense — ZAP!", "Jump buddy! ...Sorry!"],
    bouncer:    ["Cool explosions! Mine are better though.", "Sorry about the voltage!", "Artillery vs lightning — I genuinely feel bad.", "Thunder beats boom. My apologies."],
    shielded:   ["Your shield is great! Really! ...ZAP.", "Sorry, shields conduct electricity.", "Nothing personal, shield guy.", "I respect the determination. Truly."],
    deflector:  ["Your blade is impressive, Ronin.", "I respect the skill. Genuinely.", "Brother fights beside me... somewhat.", "Focus is admirable. Lightning is faster."],
    protector:  ["The Guild sounds wonderful. I wish we were allies.", "I don't want to fight you.", "Healing is noble. I'm sorry.", "Can we talk about this? ...No?"],
    attacker:   ["Even I don't like ancient dark things.", "Okay, THIS one I don't feel bad about.", "Lightning vs dark orbs? Let's go!", "No regrets zapping this one."],
    flyer:      ["Hey, we're both sky people!", "Sorry about the downdraft!", "Nothing personal, flyboy!", "Your wings are cool! ...ZAP. Sorry!"],
    flyshooter: ["I just want my thunder back.", "Storm-forged weapons belong to my clan.", "Nothing personal, your Overlordship.", "I'll take my birthright now. Sorry."],
  },
};

// ── Generic Phrases ──────────────────────────────────────────
const START_PHRASES = [
  "Let's go!", "Here we go!", "Here we go again...", "Ready!", "Time to shine!",
  "Another day, another fight.", "Focus...", "Let's do this!", "Alright, let's move.",
  "No holding back!", "One more time!", "Stay sharp.", "Into the fray!",
];

const NINJA_START_PHRASES = {
  fire:    ["Burn bright!", "Fire it up!", "Time to ignite!", "Let the flames roar!", "The inferno starts now!"],
  earth:   ["Stand firm.", "Solid ground, solid mind.", "Unbreakable.", "Like a mountain.", "Foundations first."],
  bubble:  ["Bubble time!", "Float like a dream~", "Pop pop pop!", "Light as air!", "Let's make a splash!"],
  shadow:  ["From the shadows...", "They won't see me coming.", "Silent and deadly.", "Darkness falls.", "Unseen. Unstoppable."],
  crystal: ["Refracted.", "Clear as crystal.", "Every angle, calculated.", "Shimmering start.", "Hard and brilliant."],
  wind:    ["Feel the breeze...", "Swift as the gale!", "Chase the wind!", "Can't catch me!", "A storm is brewing~"],
  storm:   ["Thunder rolls...", "Lightning never strikes twice? Watch me.", "The storm approaches.", "Charged up!", "Sky's fury, unleashed."],
};

const NEXT_WAVE_PHRASES = {
  fire:    ["Still burning!", "More fuel for the fire!", "The flame grows!", "Heating up!", "Ashes to ashes!"],
  earth:   ["Onward.", "Deeper we dig.", "Layer by layer.", "Steady progress.", "Bedrock holds."],
  bubble:  ["More bubbles!", "Floating onward~", "That was bubbly!", "Pop and move!", "Wheee!"],
  shadow:  ["Into the dark.", "Another shadow falls.", "Fading forward.", "Vanishing act.", "Silent advance."],
  crystal: ["Next facet.", "Gleaming.", "Precisely cut.", "Another reflection.", "Brilliant."],
  wind:    ["Onward, wind!", "A fresh breeze!", "Gust after gust!", "Can't slow down!", "Tailwind!"],
  storm:   ["Thunder continues.", "Another strike!", "Rumbling on.", "No rest for the storm.", "Voltage rising!"],
};

const BOSS_KILL_PHRASES = [
  "Phew!", "That was close!", "Easy.", "Too easy.", "Next!",
  "Done.", "Got 'em!", "One down.", "Piece of cake!",
  "Barely broke a sweat.", "And stay down!", "Down you go!",
  "That all?", "Who's next?", "Onwards!", "Moving on!",
];

const FINAL_BOSS_KILL_PHRASES = {
  fire:    ["The flames will always burn brighter than your Reign!", "I am the inferno that ends tyrants!", "Your throne is ashes now!"],
  earth:   ["Even empires crumble to dust.", "The foundation of your Reign... shattered.", "Built to fall. Like everything you made."],
  bubble:  ["Pop goes the Overlord!", "Your whole Reign? Just a bubble!", "Washed away, just like that!"],
  shadow:  ["Vanished... like you never existed.", "The shadow devours all thrones.", "Darkness claims even kings."],
  crystal: ["Shattered. Perfectly.", "Every facet of your plan... broken.", "Crystal clear: you lose."],
  wind:    ["Every lead. Every favor. It all ends here.", "The wind scatters even crowns.", "I gathered them all... and we won."],
  storm:   ["Sorry. Truly. ...But the thunder is MINE.", "Lightning strikes the tallest tower.", "My birthright. Reclaimed."],
};
