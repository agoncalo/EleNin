// ── Constants ────────────────────────────────────────────────
const CANVAS_W = 960;
const CANVAS_H = 540;
const TILE = 32;
const GRAVITY = 0.55;
const MAX_FALL = 12;
const FIXED_DT = 1000 / 60; // 60 fps timestep

const NINJA_ORDER = ['fire', 'earth', 'bubble', 'shadow', 'crystal', 'wind', 'storm'];

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
    color: '#7a5',
    accentColor: '#a87',
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
    color: '#36c',
    accentColor: '#8af',
    key: '7',
    attackDamage: 2,
    jumpPower: -10.5,
    speed: 4.2
  }
};

// ── Enemy tier system ────────────────────────────────────────
const ENEMY_TIERS = ['walker', 'shooter', 'jumper', 'bouncer', 'shielded', 'deflector', 'protector', 'attacker', 'flyer', 'flyshooter'];
const ENEMY_STATS = {
  walker:     { color: '#a55', hp: 3, dmg: 3, name: 'Walker' },
  shooter:    { color: '#aa5', hp: 3, dmg: 3, name: 'Shooter' },
  jumper:     { color: '#a8a', hp: 4, dmg: 4, name: 'Jumper' },
  bouncer:    { color: '#a5a', hp: 5, dmg: 4, name: 'Bouncer' },
  shielded:   { color: '#5a8', hp: 6, dmg: 4, name: 'Shielded' },
  deflector:  { color: '#88a', hp: 14, dmg: 6, name: 'Deflector' },
  protector:  { color: '#4a6', hp: 18, dmg: 4, name: 'Protector' },
  attacker:   { color: '#a44', hp: 1, dmg: 10, name: 'Attacker' },
  flyer:      { color: '#8c5', hp: 2, dmg: 5, name: 'Flyer' },
  flyshooter: { color: '#c85', hp: 3, dmg: 5, name: 'Fly-Shooter' }
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
const TOTAL_WAVES = 10;
const WAVE_DEFS = [
  { boss: 'walker', killsForBoss: 20,
    pool: [
      { type: 'walker', weight: 5 },
      { type: 'shooter', weight: 3 },
      { type: 'walker', weight: 2, big: true },
    ]
  },
  { boss: 'shooter', killsForBoss: 25,
    pool: [
      { type: 'walker', weight: 3 },
      { type: 'shooter', weight: 4 },
      { type: 'jumper', weight: 3 },
      { type: 'walker', weight: 1, big: true },
      { type: 'shooter', weight: 1, big: true },
    ]
  },
  { boss: 'jumper', killsForBoss: 30,
    pool: [
      { type: 'walker', weight: 2 },
      { type: 'shooter', weight: 3 },
      { type: 'jumper', weight: 4 },
      { type: 'flyer', weight: 2 },
      { type: 'jumper', weight: 1, big: true },
    ]
  },
  { boss: 'flyer', killsForBoss: 35,
    pool: [
      { type: 'shooter', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'flyer', weight: 4 },
      { type: 'flyer', weight: 1, big: true },
      { type: 'shielded', weight: 1, big: true },
    ]
  },
  { boss: 'deflector', killsForBoss: 45,
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 3 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 1, big: true },
    ]
  },
  { boss: 'bouncer', killsForBoss: 40,
    pool: [
      { type: 'jumper', weight: 2 },
      { type: 'bouncer', weight: 4 },
      { type: 'flyer', weight: 2 },
      { type: 'bouncer', weight: 1, big: true },
      { type: 'walker', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true }
    ]
  },

  { boss: 'shielded', killsForBoss: 50,
    pool: [
      { type: 'jumper', weight: 2 },
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 4 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 1, big: true },
      { type: 'bouncer', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true }
    ]
  },
  { boss: 'protector', killsForBoss: 56,
    pool: [
      { type: 'bouncer', weight: 2 },
      { type: 'shielded', weight: 2 },
      { type: 'deflector', weight: 2 },
      { type: 'flyer', weight: 2 },
      { type: 'shielded', weight: 1, big: true },
      { type: 'deflector', weight: 1, big: true },
    ]
  },
  { boss: 'attacker', killsForBoss: 64,
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
  { boss: 'flyshooter', killsForBoss: 70,
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

// Gamepad button map (Standard Gamepad):
const GP_ATTACK = 0;   // A / Cross
const GP_SPECIAL = 2;  // X / Square
const GP_SHURIKEN = 1; // B / Circle
const GP_JUMP = 3;     // Y / Triangle
const GP_SLAM = 13;    // Dpad Down
const GP_LB = 4;
const GP_RB = 5;
