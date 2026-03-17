// â”€â”€ Pause Menu, Ninja Guide, Bestiary & Achievements â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Achievement Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACHIEVEMENTS_KEY = 'elenin_achievements';
const BESTIARY_KEY = 'elenin_bestiary';

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAchievements(data) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data)); } catch {}
}

function loadBestiary() {
  try {
    const raw = localStorage.getItem(BESTIARY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveBestiary(data) {
  try { localStorage.setItem(BESTIARY_KEY, JSON.stringify(data)); } catch {}
}

// â”€â”€ Achievement Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACHIEVEMENT_DEFS = [
  // Kill milestones
  { id: 'kills_1', name: 'First Blood', desc: 'Get 1 kill', icon: '\u2694' },
  { id: 'kills_10', name: 'Warrior', desc: 'Get 10 kills', icon: '\u2694' },
  { id: 'kills_100', name: 'Slayer', desc: 'Get 100 kills', icon: '\u2694' },
  { id: 'kills_1000', name: 'Legend', desc: 'Get 1000 kills', icon: '\u2694' },
  // 100 kills per character
  { id: 'kills_fire_100', name: 'Inferno Master', desc: '100 kills as Fire Ninja', icon: '\uD83D\uDD25' },
  { id: 'kills_earth_100', name: 'Earthshaker', desc: '100 kills as Earth Ninja', icon: '\uD83E\uDEA8' },
  { id: 'kills_bubble_100', name: 'Bubble Pop', desc: '100 kills as Bubble Ninja', icon: '\uD83E\uDEE7' },
  { id: 'kills_shadow_100', name: 'Shadow Lord', desc: '100 kills as Shadow Ninja', icon: '\uD83C\uDF11' },
  { id: 'kills_crystal_100', name: 'Crystal Cutter', desc: '100 kills as Crystal Ninja', icon: '\uD83D\uDC8E' },
  { id: 'kills_wind_100', name: 'Gale Force', desc: '100 kills as Wind Ninja', icon: '\uD83C\uDF2C' },
  { id: 'kills_storm_100', name: 'Thundergod', desc: '100 kills as Storm Ninja', icon: '\u26A1' },
  // Level milestones overall
  { id: 'wave_1', name: 'Getting Started', desc: 'Clear Wave 1', icon: '\u2B50' },
  { id: 'wave_2', name: 'Warmed Up', desc: 'Clear Wave 2', icon: '\u2B50' },
  { id: 'wave_3', name: 'Rising Force', desc: 'Clear Wave 3', icon: '\u2B50' },
  { id: 'wave_4', name: 'Sky High', desc: 'Clear Wave 4', icon: '\u2B50' },
  { id: 'wave_5', name: 'Halfway!', desc: 'Clear Wave 5', icon: '\u2B50' },
  { id: 'wave_6', name: 'Relentless', desc: 'Clear Wave 6', icon: '\u2B50' },
  { id: 'wave_7', name: 'Unstoppable', desc: 'Clear Wave 7', icon: '\u2B50' },
  { id: 'wave_8', name: 'One With War', desc: 'Clear Wave 8', icon: '\u2B50' },
  { id: 'wave_9', name: 'Final Push', desc: 'Clear Wave 9', icon: '\u2B50' },
  { id: 'wave_10', name: 'Champion', desc: 'Clear Wave 10', icon: '\u2B50' },
  // Level per character
  ...NINJA_ORDER.flatMap(n => {
    const label = NINJA_TYPES[n].name;
    return Array.from({ length: 10 }, (_, i) => ({
      id: `wave_${n}_${i + 1}`, name: `${label} W${i + 1}`, desc: `Clear Wave ${i + 1} as ${label}`, icon: '\u2B50'
    }));
  }),
  // Endings
  { id: 'good_ending', name: 'True Ninja', desc: 'Beat the game (good ending)', icon: '\uD83C\uDFC6' },
  { id: 'cheater_ending', name: 'Shortcut Seeker', desc: 'Beat the game (cheater ending)', icon: '\uD83D\uDCA8' },
  // Cheats
  { id: 'discovered_cheats', name: 'Curious Mind', desc: 'Use a cheat for the first time', icon: '\uD83D\uDD0D' },
  // Bestiary
  { id: 'bestiary_full', name: 'Zoologist', desc: 'Fill the entire bestiary', icon: '\uD83D\uDCD6' },
  // Game over
  { id: 'game_over_1', name: 'First Fall', desc: 'Get a game over', icon: '\uD83D\uDC80' },
  { id: 'game_over_no_kills', name: 'Pacifist Run', desc: 'Game over with 0 kills', icon: '\u262E' },
  // Ultimates
  { id: 'ult_fire', name: 'Meteor Shower', desc: 'Use Fire ultimate', icon: '\u2604' },
  { id: 'ult_earth', name: 'Golem Rider', desc: 'Use Earth ultimate', icon: '\uD83E\uDEA8' },
  { id: 'ult_bubble', name: 'Cascade', desc: 'Use Bubble ultimate', icon: '\uD83E\uDEE7' },
  { id: 'ult_shadow', name: 'Eternal Darkness', desc: 'Use Shadow ultimate', icon: '\uD83C\uDF11' },
  { id: 'ult_crystal', name: 'Shatter Storm', desc: 'Use Crystal ultimate', icon: '\uD83D\uDC8E' },
  { id: 'ult_wind', name: 'Trimerang Fury', desc: 'Use Wind ultimate', icon: '\uD83C\uDF2C' },
  { id: 'ult_storm', name: 'Lightning Reign', desc: 'Use Storm ultimate', icon: '\u26A1' },
];

// â”€â”€ Runtime Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let achievementData = loadAchievements();
let bestiaryData = loadBestiary();

// Per-session tracking (persisted via achievements)
let totalKillsAll = achievementData._totalKills || 0;
const ninjaKills = achievementData._ninjaKills || {};
for (const n of NINJA_ORDER) { if (!ninjaKills[n]) ninjaKills[n] = 0; }

// Toast queue
const achievementToasts = [];
let currentToast = null;
let toastTimer = 0;

function unlockAchievement(id) {
  if (achievementData[id]) return;
  if (typeof game !== 'undefined' && game.cheated && id !== 'discovered_cheats' && id !== 'cheater_ending') return;
  achievementData[id] = Date.now();
  achievementData._totalKills = totalKillsAll;
  achievementData._ninjaKills = ninjaKills;
  saveAchievements(achievementData);
  const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
  if (def) achievementToasts.push(def);
}

function recordKill(ninjaType) {
  if (typeof game !== 'undefined' && game.cheated) return;
  totalKillsAll++;
  ninjaKills[ninjaType] = (ninjaKills[ninjaType] || 0) + 1;
  // Check milestones
  if (totalKillsAll >= 1) unlockAchievement('kills_1');
  if (totalKillsAll >= 10) unlockAchievement('kills_10');
  if (totalKillsAll >= 100) unlockAchievement('kills_100');
  if (totalKillsAll >= 1000) unlockAchievement('kills_1000');
  if (ninjaKills[ninjaType] >= 100) unlockAchievement(`kills_${ninjaType}_100`);
  // Save periodically
  achievementData._totalKills = totalKillsAll;
  achievementData._ninjaKills = ninjaKills;
}

function recordBestiaryKill(enemyType, isBig, isBoss, element) {
  if (typeof game !== 'undefined' && game.cheated) return;
  const key = isBoss ? `boss_${enemyType}` : (isBig ? `big_${enemyType}` : enemyType);
  const isNew = !bestiaryData[key];
  if (isNew) {
    bestiaryData[key] = { kills: 0, type: enemyType, big: isBig, boss: isBoss };
  }
  bestiaryData[key].kills++;
  // Track elemental variant kills
  if (element) {
    if (!bestiaryData[key].elementKills) bestiaryData[key].elementKills = {};
    bestiaryData[key].elementKills[element] = (bestiaryData[key].elementKills[element] || 0) + 1;
    // Track elemental bestiary entry (per type Ã— element)
    const elKey = `elem_${element}_${enemyType}`;
    const elNew = !bestiaryData[elKey];
    if (elNew) {
      bestiaryData[elKey] = { kills: 0, element: element, type: enemyType };
    }
    bestiaryData[elKey].kills++;
    if (elNew) {
      const elName = element.charAt(0).toUpperCase() + element.slice(1);
      const stats = ENEMY_STATS[enemyType];
      achievementToasts.push({ icon: '\uD83D\uDCD6', name: 'New Bestiary Entry', desc: `${elName} ${stats.name}`, isBestiary: true });
    }
  }
  saveBestiary(bestiaryData);
  if (isNew) {
    const stats = ENEMY_STATS[enemyType];
    const label = isBoss ? BOSS_NAMES[enemyType] + ' (Boss)' : (isBig ? 'Big ' : '') + stats.name;
    achievementToasts.push({ icon: '\uD83D\uDCD6', name: 'New Bestiary Entry', desc: label, isBestiary: true });
  }
  // Check bestiary full
  checkBestiaryFull();
}

function checkBestiaryFull() {
  // Need all 10 base + 10 big + 10 boss = 30 entries
  const allKeys = [];
  for (const t of ENEMY_TIERS) {
    allKeys.push(t, `big_${t}`, `boss_${t}`);
  }
  const hasFull = allKeys.every(k => bestiaryData[k] && bestiaryData[k].kills > 0);
  if (hasFull) unlockAchievement('bestiary_full');
}

function recordWaveClear(waveNum, ninjaType) {
  unlockAchievement(`wave_${waveNum}`);
  unlockAchievement(`wave_${ninjaType}_${waveNum}`);
}

function recordUltimate(ninjaType) {
  unlockAchievement(`ult_${ninjaType}`);
}

function recordGameOver(totalKills) {
  unlockAchievement('game_over_1');
  if (totalKills === 0) unlockAchievement('game_over_no_kills');
}

function recordGoodEnding() { unlockAchievement('good_ending'); }
function recordCheaterEnding() { unlockAchievement('cheater_ending'); }
function recordCheatUsed() { unlockAchievement('discovered_cheats'); }

// â”€â”€ Pause Menu State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const pauseMenu = {
  active: false,
  selected: 0,     // 0=resume, 1=guide, 2=bestiary, 3=achievements
  popup: null,      // 'guide' | 'bestiary' | 'achievements' | null
  popupScroll: 0,
  guideNinja: 0,    // index into NINJA_ORDER
  bestiaryIdx: 0,   // current bestiary grid cursor
  bestiaryDetail: false, // showing detail view
  clearCacheConfirm: false, // clear cache confirmation state
};

const PAUSE_OPTIONS = ['Resume', 'Ninja Guide', 'Bestiary', 'Achievements'];

function togglePause() {
  if (pauseMenu.popup) {
    pauseMenu.popup = null;
    pauseMenu.popupScroll = 0;
    return;
  }
  pauseMenu.active = !pauseMenu.active;
  pauseMenu.selected = 0;
  pauseMenu.popupScroll = 0;
}

function pauseUpdate() {
  if (!pauseMenu.active) return;

  if (pauseMenu.popup) {
    updatePopup();
    return;
  }

  // Navigate menu
  if (consumePress('ArrowUp') || consumePress('KeyW')) {
    pauseMenu.selected = (pauseMenu.selected + PAUSE_OPTIONS.length - 1) % PAUSE_OPTIONS.length;
  }
  if (consumePress('ArrowDown') || consumePress('KeyS')) {
    pauseMenu.selected = (pauseMenu.selected + 1) % PAUSE_OPTIONS.length;
  }
  if (consumePress('Enter') || consumePress('Space') || consumePress('KeyZ') || consumePress('KeyJ')) {
    const sel = pauseMenu.selected;
    if (sel === 0) { pauseMenu.active = false; return; }
    if (sel === 1) { pauseMenu.popup = 'guide'; pauseMenu.guideNinja = 0; pauseMenu.popupScroll = 0; }
    if (sel === 2) { pauseMenu.popup = 'bestiary'; pauseMenu.bestiaryIdx = 0; pauseMenu.bestiaryDetail = false; pauseMenu.popupScroll = 0; }
    if (sel === 3) { pauseMenu.popup = 'achievements'; pauseMenu.popupScroll = 0; }
  }
}

function updatePopup() {
  // Bestiary detail: ESC goes back to grid, not close popup
  if (pauseMenu.popup === 'bestiary' && pauseMenu.bestiaryDetail) {
    if (consumePress('Escape') || consumePress('Backspace')) {
      pauseMenu.bestiaryDetail = false;
      return;
    }
  }
  // Close popup
  if (consumePress('Escape') || consumePress('Backspace')) {
    pauseMenu.popup = null;
    pauseMenu.popupScroll = 0;
    return;
  }

  if (pauseMenu.popup === 'guide') {
    if (consumePress('ArrowLeft') || consumePress('KeyA')) {
      pauseMenu.guideNinja = (pauseMenu.guideNinja + 6) % 7;
    }
    if (consumePress('ArrowRight') || consumePress('KeyD')) {
      pauseMenu.guideNinja = (pauseMenu.guideNinja + 1) % 7;
    }
  }

  if (pauseMenu.popup === 'bestiary' && !pauseMenu.bestiaryDetail) {
    const entries = getBestiaryEntries();
    const cols = 10;
    if (consumePress('ArrowLeft') || consumePress('KeyA')) {
      pauseMenu.bestiaryIdx = Math.max(0, pauseMenu.bestiaryIdx - 1);
    }
    if (consumePress('ArrowRight') || consumePress('KeyD')) {
      pauseMenu.bestiaryIdx = Math.min(entries.length - 1, pauseMenu.bestiaryIdx + 1);
    }
    if (consumePress('ArrowUp') || consumePress('KeyW')) {
      pauseMenu.bestiaryIdx = Math.max(0, pauseMenu.bestiaryIdx - cols);
    }
    if (consumePress('ArrowDown') || consumePress('KeyS')) {
      pauseMenu.bestiaryIdx = Math.min(entries.length - 1, pauseMenu.bestiaryIdx + cols);
    }
    if (consumePress('Enter') || consumePress('Space') || consumePress('KeyZ') || consumePress('KeyJ')) {
      const e = entries[pauseMenu.bestiaryIdx];
      const d = bestiaryData[e.key];
      if (d && d.kills > 0) pauseMenu.bestiaryDetail = true;
    }
  }

  if (pauseMenu.popup === 'achievements') {
    // Clear cache confirmation
    if (pauseMenu.clearCacheConfirm) {
      if (consumePress('KeyY')) {
        localStorage.removeItem(ACHIEVEMENTS_KEY);
        localStorage.removeItem(BESTIARY_KEY);
        achievementData = {};
        bestiaryData = {};
        pauseMenu.clearCacheConfirm = false;
        pauseMenu.popupScroll = 0;
        return;
      }
      if (consumePress('KeyN') || consumePress('Escape') || consumePress('Backspace')) {
        pauseMenu.clearCacheConfirm = false;
        return;
      }
      return; // Block other inputs during confirmation
    }
    if (consumePress('ArrowUp') || consumePress('KeyW')) {
      pauseMenu.popupScroll = Math.max(0, pauseMenu.popupScroll - 1);
    }
    if (consumePress('ArrowDown') || consumePress('KeyS')) {
      pauseMenu.popupScroll = Math.min(ACHIEVEMENT_DEFS.length - 1, pauseMenu.popupScroll + 1);
    }
    if (consumePress('KeyX') || consumePress('Delete')) {
      pauseMenu.clearCacheConfirm = true;
    }
  }
}

// â”€â”€ Ninja Guide Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NINJA_GUIDE = {
  fire: {
    element: 'Fire / Combo',
    special: 'Fire Dash â€” Charge forward in flames, damaging enemies in your path.',
    ultimate: 'Meteors rain from the sky dealing massive AOE. Grants fire armor (immune to damage, auto-fires projectiles).',
    mechanic: 'Hitting enemies builds Combo (0-10). At 8+ combo: Fire Armor activates. Attacks apply Burn (DOT). Fire trails left while running deal burn to enemies.',
    tips: 'Stay aggressive to keep combo up. Combo decays over time!'
  },
  earth: {
    element: 'Stone / Constructs',
    special: 'Place Stone Construct â€” Spawns pillars, spikes, golems, shooters, flyers, or deflectors based on unlocks.',
    ultimate: 'Summon a Golem Mecha to ride â€” heavy punches, invulnerable, timed duration.',
    mechanic: 'Constructs fight independently. Unlock new types by defeating matching bosses. Pillar, Spike, and Golem are always available.',
    tips: 'Build defenses before bosses. Constructs block enemy projectiles!'
  },
  bubble: {
    element: 'Water / Float',
    special: 'Bubble Burst â€” Sends bubbles upward that float and pop on enemies.',
    ultimate: 'Replication Cascade â€” Spawns bubble clones that seek and damage all enemies.',
    mechanic: 'Float Buff (4 sec) grants extra jump and 1.35x speed. Bubbles bob in the air and pop on contact.',
    tips: 'Use float buff for mobility. Great for tower levels!'
  },
  shadow: {
    element: 'Darkness / Stealth',
    special: 'Vanish â€” Enter stealth. Builds to backstab at max stealth (massive damage).',
    ultimate: 'Eternal Darkness â€” Screen darkens, glowing eyes appear, chain strike teleports between enemies.',
    mechanic: 'Stealth builds when not touching enemies (0-300). Backstab at max stealth deals 9999 damage. Chain strike combos between nearby targets.',
    tips: 'Patience is key. Wait for full stealth before backstabbing bosses!'
  },
  crystal: {
    element: 'Ice / Diamonds',
    special: 'Diamond Shard â€” Launch a homing crystal that freezes enemies (60 frames). Also deflects enemy projectiles.',
    ultimate: 'Crystal Shatter â€” Freezes all enemies, spawns afterimage clones that attack. Frozen kills spawn extra shards.',
    mechanic: 'Freeze stops movement. Shurikens also freeze. Shards scatter from frozen kills. Parry window reflects projectiles.',
    tips: 'Freeze bosses to buy time. Shards chain through groups!'
  },
  wind: {
    element: 'Air / Momentum',
    special: 'Trimerang â€” Homing boomerang that orbits back. Gains power from wind meter.',
    ultimate: 'Trimerang Burst â€” Sends a storm of orbiting trimerangs around you.',
    mechanic: 'Wind Power (0-10) builds while not taking damage. At 10: 50% dodge chance, double next hit, enemies slowed. Resets on damage.',
    tips: 'Play safe to build wind power. Dodge chance can save you in tough spots!'
  },
  storm: {
    element: 'Lightning / Soak',
    special: 'Storm Orb â€” Fire water orbs that soak enemies (mark for lightning).',
    ultimate: 'Lightning Reign â€” Rain soaks all enemies, chain lightning strikes between soaked targets every 30 frames.',
    mechanic: 'Soaked enemies take chain lightning. Soak lasts 5 sec. Shurikens also apply soak. Lightning chains between nearby soaked enemies.',
    tips: 'Soak groups then attack one to chain lightning through all!'
  }
};

// â”€â”€ Bestiary Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BESTIARY_DESCS = {
  walker: 'A basic patrolling enemy. Walks back and forth, turns at edges.',
  shooter: 'Ranged enemy that fires projectiles at the player.',
  jumper: 'Agile enemy that frequently leaps toward the player.',
  bouncer: 'Fires bouncy projectiles that ricochet off surfaces.',
  shielded: 'Carries a frontal shield that blocks incoming projectiles.',
  deflector: 'A ronin swordsman that deflects projectiles back and throws shurikens.',
  protector: 'Heals nearby allies with an aura. Slow but tanky.',
  attacker: 'Floating orb that is invulnerable while allies are in its aura. Fires rapid piercing shots.',
  flyer: 'Airborne enemy that swoops toward the player.',
  flyshooter: 'Airborne shooter. Combines flying mobility with ranged attacks.',
};

function getBestiaryEntries() {
  const entries = [];
  // Row: Normal
  for (const t of ENEMY_TIERS) entries.push({ key: t, type: t, big: false, boss: false, element: null });
  // Row: Big
  for (const t of ENEMY_TIERS) entries.push({ key: `big_${t}`, type: t, big: true, boss: false, element: null });
  // Row: Boss
  for (const t of ENEMY_TIERS) entries.push({ key: `boss_${t}`, type: t, big: false, boss: true, element: null });
  // One row per element
  for (const el of ENEMY_ELEMENTS) {
    for (const t of ENEMY_TIERS) {
      entries.push({ key: `elem_${el}_${t}`, type: t, big: false, boss: false, element: el });
    }
  }
  return entries;
}

// â”€â”€ Render Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function drawBox(ctx, x, y, w, h, bgAlpha) {
  ctx.fillStyle = `rgba(0,0,0,${bgAlpha || 0.85})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawText(ctx, text, x, y, color, font) {
  ctx.fillStyle = color || '#fff';
  ctx.font = font || '12px monospace';
  ctx.fillText(text, x, y);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// â”€â”€ Toast Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderToast(ctx) {
  if (!currentToast && achievementToasts.length > 0) {
    currentToast = achievementToasts.shift();
    toastTimer = 180; // 3 seconds
  }
  if (!currentToast) return;
  toastTimer--;
  if (toastTimer <= 0) { currentToast = null; return; }

  const alpha = toastTimer > 150 ? (180 - toastTimer) / 30 : (toastTimer < 30 ? toastTimer / 30 : 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  const tw = 300, th = 50;
  const tx = CANVAS_W / 2 - tw / 2;
  const ty = 50;
  drawBox(ctx, tx, ty, tw, th, 0.9);
  const isBestiary = currentToast.isBestiary;
  const accent = isBestiary ? '#6af' : '#ffd700';
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(tx, ty, tw, th);
  ctx.font = 'bold 11px monospace';
  ctx.fillText(isBestiary ? '\uD83D\uDCD6 New Bestiary Entry!' : '\u2606 Achievement Unlocked!', tx + 10, ty + 18);
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(`${currentToast.icon} ${currentToast.name}`, tx + 10, ty + 36);
  ctx.restore();
}

// â”€â”€ Pause Menu Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPauseMenu(ctx) {
  if (!pauseMenu.active) return;

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (pauseMenu.popup) {
    renderPopup(ctx);
    return;
  }

  // Main menu box
  const bw = 280, bh = 200;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = CANVAS_H / 2 - bh / 2;
  drawBox(ctx, bx, by, bw, bh);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px monospace';
  const title = 'PAUSED';
  const ttw = ctx.measureText(title).width;
  ctx.fillText(title, CANVAS_W / 2 - ttw / 2, by + 32);

  // Options
  ctx.font = '14px monospace';
  for (let i = 0; i < PAUSE_OPTIONS.length; i++) {
    const oy = by + 60 + i * 32;
    if (i === pauseMenu.selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(bx + 20, oy - 14, bw - 40, 24);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('\u25B6 ', bx + 24, oy + 2);
    }
    ctx.fillStyle = i === pauseMenu.selected ? '#fff' : '#aaa';
    ctx.fillText(PAUSE_OPTIONS[i], bx + 44, oy + 2);
  }

  // Footer
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('ESC to close \u2022 \u2191\u2193 Navigate \u2022 Enter/Z to select', bx + 16, by + bh - 12);
}

// â”€â”€ Popup Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPopup(ctx) {
  if (pauseMenu.popup === 'guide') renderGuidePopup(ctx);
  else if (pauseMenu.popup === 'bestiary') renderBestiaryPopup(ctx);
  else if (pauseMenu.popup === 'achievements') renderAchievementsPopup(ctx);
}

function renderGuidePopup(ctx) {
  const bw = 700, bh = 400;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = CANVAS_H / 2 - bh / 2;
  drawBox(ctx, bx, by, bw, bh);

  const ninjaKey = NINJA_ORDER[pauseMenu.guideNinja];
  const nt = NINJA_TYPES[ninjaKey];
  const guide = NINJA_GUIDE[ninjaKey];

  // Title
  ctx.fillStyle = nt.color;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(nt.name, bx + 20, by + 30);

  // Color swatch
  ctx.fillStyle = nt.color;
  ctx.fillRect(bx + bw - 60, by + 14, 20, 20);
  ctx.fillStyle = nt.accentColor;
  ctx.fillRect(bx + bw - 36, by + 14, 20, 20);

  // Ninja tabs
  const tabY = by + 48;
  for (let i = 0; i < 7; i++) {
    const tk = NINJA_ORDER[i];
    const tt = NINJA_TYPES[tk];
    const tx = bx + 20 + i * 96;
    const sel = i === pauseMenu.guideNinja;
    ctx.fillStyle = sel ? tt.color : 'rgba(255,255,255,0.1)';
    ctx.fillRect(tx, tabY, 88, 22);
    ctx.fillStyle = sel ? '#fff' : '#888';
    ctx.font = sel ? 'bold 10px monospace' : '10px monospace';
    ctx.fillText(`${i + 1}:${tk.substring(0, 5)}`, tx + 6, tabY + 15);
  }

  // Stats
  let cy = tabY + 42;
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`ATK: ${Math.round(nt.attackDamage)}  SPD: ${Math.round(nt.speed * 10) / 10}  JUMP: ${Math.round(Math.abs(nt.jumpPower) * 10) / 10}  KEY: [${nt.key}]`, bx + 24, cy);

  cy += 24;
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`Element: ${guide.element}`, bx + 24, cy);

  cy += 22;
  ctx.fillStyle = '#8cf';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('Special:', bx + 24, cy);
  ctx.fillStyle = '#ccc';
  ctx.font = '11px monospace';
  const specLines = wrapText(ctx, guide.special, bw - 60);
  for (const line of specLines) {
    cy += 14;
    ctx.fillText(line, bx + 24, cy);
  }

  cy += 20;
  ctx.fillStyle = '#f93';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('Ultimate:', bx + 24, cy);
  ctx.fillStyle = '#ccc';
  ctx.font = '11px monospace';
  const ultLines = wrapText(ctx, guide.ultimate, bw - 60);
  for (const line of ultLines) {
    cy += 14;
    ctx.fillText(line, bx + 24, cy);
  }

  cy += 20;
  ctx.fillStyle = '#8d8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('Mechanic:', bx + 24, cy);
  ctx.fillStyle = '#ccc';
  ctx.font = '11px monospace';
  const mechLines = wrapText(ctx, guide.mechanic, bw - 60);
  for (const line of mechLines) {
    cy += 14;
    ctx.fillText(line, bx + 24, cy);
  }

  cy += 20;
  ctx.fillStyle = '#aaa';
  ctx.font = 'italic 11px monospace';
  const tipLines = wrapText(ctx, 'Tip: ' + guide.tips, bw - 60);
  for (const line of tipLines) {
    cy += 14;
    ctx.fillText(line, bx + 24, cy);
  }

  // Footer
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('\u2190\u2192 Switch Ninja \u2022 ESC/Backspace to go back', bx + 16, by + bh - 12);
}

function drawMiniEnemy(ctx, cx, cy, w, h, entry) {
  const stats = ENEMY_STATS[entry.type];
  const bodyColor = entry.element ? ELEMENT_COLORS[entry.element].body : stats.color;
  if (entry.type === 'attacker') {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx + w / 2, cy + h / 2, w * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#866';
    ctx.beginPath();
    ctx.arc(cx + w / 2, cy + h / 2, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    if (entry.element) {
      ctx.fillStyle = ELEMENT_COLORS[entry.element].accent;
      ctx.beginPath();
      ctx.moveTo(cx + w / 2, cy + 2); ctx.lineTo(cx + w / 2 + 3, cy + 5);
      ctx.lineTo(cx + w / 2, cy + 8); ctx.lineTo(cx + w / 2 - 3, cy + 5);
      ctx.closePath(); ctx.fill();
    }
    return;
  }
  const bx_ = cx + 4, by_ = cy + (entry.boss ? 2 : (entry.big ? 3 : 5));
  const bw_ = w - 8, bh_ = h - (entry.boss ? 4 : (entry.big ? 5 : 8));
  ctx.fillStyle = bodyColor;
  ctx.fillRect(bx_, by_, bw_, bh_);
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx_ + bw_ * 0.5, by_ + bh_ * 0.2, 2, 2);
  ctx.fillRect(bx_ + bw_ * 0.5 + 4, by_ + bh_ * 0.2, 2, 2);
  // Headband (non-elemental only)
  if (!entry.element) {
    ctx.fillStyle = '#c33';
    ctx.fillRect(bx_, by_ + bh_ * 0.15, bw_, 2);
  }
  // Type accents
  switch (entry.type) {
    case 'shooter':
      ctx.fillStyle = entry.element ? ELEMENT_COLORS[entry.element].accent : '#ff4';
      ctx.fillRect(bx_ + bw_, by_ + bh_ / 2 - 1, 3, 2); break;
    case 'jumper':
      ctx.fillStyle = '#ff0';
      ctx.fillRect(bx_ + 1, by_ + bh_ - 1, 3, 2);
      ctx.fillRect(bx_ + bw_ - 4, by_ + bh_ - 1, 3, 2); break;
    case 'bouncer':
      ctx.fillStyle = '#f6f';
      ctx.fillRect(bx_ + 1, by_, bw_ - 2, 2); break;
    case 'shielded':
      ctx.fillStyle = '#5cf';
      ctx.fillRect(bx_ + bw_ - 1, by_ - 1, 2, bh_ + 2); break;
    case 'deflector':
      ctx.fillStyle = '#aac';
      ctx.beginPath();
      ctx.moveTo(bx_ - 1, by_ + 2);
      ctx.lineTo(bx_ + bw_ / 2, by_ - 5);
      ctx.lineTo(bx_ + bw_ + 1, by_ + 2);
      ctx.closePath(); ctx.fill(); break;
    case 'protector':
      ctx.fillStyle = '#5a7';
      ctx.fillRect(bx_ - 1, by_ - 2, bw_ + 2, 4);
      ctx.fillStyle = '#3d8';
      ctx.fillRect(bx_ + bw_ / 2 - 1, by_ - 5, 2, 4); break;
    case 'flyer':
      ctx.fillStyle = '#bdb';
      ctx.fillRect(bx_ - 3, by_ + 2, 3, bh_ - 4);
      ctx.fillRect(bx_ + bw_, by_ + 2, 3, bh_ - 4); break;
    case 'flyshooter':
      ctx.fillStyle = '#dba';
      ctx.fillRect(bx_ - 3, by_ + 2, 3, bh_ - 4);
      ctx.fillRect(bx_ + bw_, by_ + 2, 3, bh_ - 4);
      ctx.fillStyle = entry.element ? ELEMENT_COLORS[entry.element].accent : '#fa4';
      ctx.fillRect(bx_ + bw_ + 3, by_ + bh_ / 2 - 1, 3, 2); break;
  }
  // Big indicator
  if (entry.big) {
    ctx.strokeStyle = '#ff0'; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx_, by_, bw_, bh_);
  }
  // Boss indicator
  if (entry.boss) {
    ctx.fillStyle = '#f44';
    ctx.fillRect(bx_ + bw_ / 2 - 4, by_ - 3, 8, 3);
    ctx.fillRect(bx_ + bw_ / 2 - 5, by_ - 5, 2, 3);
    ctx.fillRect(bx_ + bw_ / 2 + 3, by_ - 5, 2, 3);
    ctx.fillRect(bx_ + bw_ / 2 - 1, by_ - 5, 2, 3);
  }
  // Element pip + aura
  if (entry.element) {
    const elC = ELEMENT_COLORS[entry.element];
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = elC.glow;
    ctx.beginPath();
    ctx.arc(bx_ + bw_ / 2, by_ + bh_ / 2, bw_ * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const px = cx + w / 2, py = cy + 3;
    ctx.fillStyle = elC.accent;
    ctx.beginPath();
    ctx.moveTo(px, py - 3); ctx.lineTo(px + 2, py);
    ctx.lineTo(px, py + 3); ctx.lineTo(px - 2, py);
    ctx.closePath(); ctx.fill();
  }
}

function renderBestiaryPopup(ctx) {
  const bw = 700, bh = 450;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = CANVAS_H / 2 - bh / 2;
  drawBox(ctx, bx, by, bw, bh);

  const entries = getBestiaryEntries();
  const idx = pauseMenu.bestiaryIdx;
  const entry = entries[idx];
  const data = bestiaryData[entry.key];
  const discovered = data && data.kills > 0;

  if (pauseMenu.bestiaryDetail && discovered) {
    renderBestiaryDetail(ctx, bx, by, bw, bh, entry, data);
    return;
  }

  // Grid view
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Bestiary', bx + 20, by + 28);
  const totalDisc = entries.filter(e => bestiaryData[e.key] && bestiaryData[e.key].kills > 0).length;
  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.fillText(`${totalDisc}/${entries.length}`, bx + 130, by + 28);

  const cols = 10;
  const cellW = 40, cellH = 33;
  const gapX = 4, gapY = 3;
  const labelW = 70;
  const gridW = cols * (cellW + gapX);
  const gridStartX = bx + (bw - gridW - labelW) / 2 + labelW;
  const gridStartY = by + 56;

  // Column headers
  ctx.font = '7px monospace';
  for (let c = 0; c < cols; c++) {
    const type = ENEMY_TIERS[c];
    const stats = ENEMY_STATS[type];
    const hx = gridStartX + c * (cellW + gapX) + cellW / 2;
    ctx.fillStyle = stats.color;
    ctx.fillText(type.substring(0, 5).toUpperCase(), hx - 11, gridStartY - 5);
  }

  // Row labels
  const rowLabels = ['Normal', 'Big', 'Boss', 'Fire', 'Earth', 'Water', 'Crystal', 'Wind', 'Lightn.', 'Steel'];
  for (let r = 0; r < 10; r++) {
    const ry = gridStartY + r * (cellH + gapY);
    ctx.fillStyle = r < 3 ? '#aaa' : ELEMENT_COLORS[ENEMY_ELEMENTS[r - 3]].accent;
    ctx.font = '8px monospace';
    ctx.fillText(rowLabels[r], gridStartX - labelW + 4, ry + cellH / 2 + 3);
  }

  // Separator between base and elemental rows
  const sepY = gridStartY + 3 * (cellH + gapY) - 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gridStartX - labelW + 4, sepY);
  ctx.lineTo(gridStartX + gridW - gapX, sepY);
  ctx.stroke();

  // Grid cells
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = gridStartX + col * (cellW + gapX);
    const cy = gridStartY + row * (cellH + gapY);
    const d = bestiaryData[e.key];
    const disc = d && d.kills > 0;
    const isSel = i === idx;

    ctx.fillStyle = disc ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(cx, cy, cellW, cellH);

    if (isSel) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 1, cy - 1, cellW + 2, cellH + 2);
    }

    if (disc) {
      drawMiniEnemy(ctx, cx, cy, cellW, cellH, e);
    } else {
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('?', cx + cellW / 2 - 4, cy + cellH / 2 + 4);
    }
  }

  // Selected entry label
  const footY = by + bh - 36;
  if (discovered) {
    let name;
    if (entry.element) {
      const elName = entry.element.charAt(0).toUpperCase() + entry.element.slice(1);
      name = `${elName} ${ENEMY_STATS[entry.type].name}`;
    } else {
      name = entry.boss ? BOSS_NAMES[entry.type] + ' (Boss)' : (entry.big ? 'Big ' : '') + ENEMY_STATS[entry.type].name;
    }
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(name, bx + 20, footY);
    ctx.fillStyle = '#4f4';
    ctx.font = '10px monospace';
    ctx.fillText(`Kills: ${data.kills}`, bx + 20, footY + 14);
  } else {
    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    ctx.fillText('??? \u2014 Not yet discovered', bx + 20, footY);
  }

  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('Arrows: Navigate \u2022 Enter: Details \u2022 ESC: Back', bx + 260, by + bh - 6);
}

function renderBestiaryDetail(ctx, bx, by, bw, bh, entry, data) {
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Bestiary', bx + 20, by + 28);

  const detY = by + 48;

  if (entry.element) {
    const elColors = ELEMENT_COLORS[entry.element];
    const elName = entry.element.charAt(0).toUpperCase() + entry.element.slice(1);
    const stats = ENEMY_STATS[entry.type];
    ctx.fillStyle = elColors.accent;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${elName} ${stats.name}`, bx + 40, detY + 20);

    // Larger preview
    const prevX = bx + bw - 140;
    const prevY = detY + 10;
    drawMiniEnemy(ctx, prevX, prevY, 48, 48, entry);

    let sy = detY + 50;
    ctx.fillStyle = '#4f4';
    ctx.font = '12px monospace';
    ctx.fillText(`Kills: ${data.kills}`, bx + 40, sy);

    sy += 24;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    const ELEMENT_DESCS = {
      fire: 'Immune to burn \u2014 fire damage heals it. Weak to water.',
      earth: 'Resistant to most elements except earth and steel.',
      water: 'Fully immune to burn. Resists fire. Weak to wind and lightning.',
      crystal: 'Heals from crystal attacks. Weak to fire.',
      wind: 'Resists water. Weak to earth.',
      lightning: 'Weak to earth (grounded). Strong against water.',
      steel: 'Resists fire. Steel attacks never heal \u2014 only resist.',
    };
    const desc = `${elName} variant of ${stats.name}. ${ELEMENT_DESCS[entry.element] || ''}`;
    const descLines = wrapText(ctx, desc, bw - 80);
    for (const line of descLines) {
      ctx.fillText(line, bx + 40, sy);
      sy += 15;
    }

    sy += 10;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('Interactions vs this element:', bx + 40, sy);
    sy += 14;
    for (const atkEl of ['fire', 'earth', 'water', 'crystal', 'wind', 'lightning', 'steel']) {
      if (!ELEMENT_MATRIX[atkEl]) continue;
      const result = ELEMENT_MATRIX[atkEl][entry.element];
      if (result === 'normal') continue;
      const atkName = atkEl.charAt(0).toUpperCase() + atkEl.slice(1);
      ctx.fillStyle = result === 'resist' ? ELEMENT_COLORS[entry.element].accent : '#4f4';
      ctx.fillText(`${atkName} \u2192 ${result.toUpperCase()}`, bx + 50, sy);
      sy += 13;
    }
  } else {
    const stats = ENEMY_STATS[entry.type];
    ctx.fillStyle = stats.color;
    ctx.font = 'bold 16px monospace';
    const nameStr = entry.boss ? BOSS_NAMES[entry.type] + ' (Boss)' : (entry.big ? 'Big ' : '') + stats.name;
    ctx.fillText(nameStr, bx + 40, detY + 20);

    // Larger preview
    const prevX = bx + bw - 140;
    const prevY = detY + 10;
    const prevW = entry.boss ? 64 : (entry.big ? 52 : 44);
    const prevH = entry.boss ? 64 : (entry.big ? 52 : 44);
    drawMiniEnemy(ctx, prevX, prevY, prevW, prevH, entry);

    let sy = detY + 50;
    ctx.font = '12px monospace';
    const waveScale = entry.boss ? 10 : (entry.big ? 2 : 1);
    const baseHp = stats.hp * waveScale;
    const baseDmg = entry.boss ? Math.round(4) : (entry.big ? stats.dmg + 3 : stats.dmg);
    ctx.fillStyle = '#e44';
    ctx.fillText(`Base HP: ${Math.round(baseHp)}`, bx + 40, sy);
    ctx.fillStyle = '#fa0';
    ctx.fillText(`Base DMG: ${Math.round(baseDmg)}`, bx + 200, sy);

    sy += 20;
    ctx.fillStyle = '#4f4';
    ctx.fillText(`Your Kills: ${data.kills}`, bx + 40, sy);

    if (data.elementKills) {
      sy += 18;
      ctx.font = '10px monospace';
      let elStr = 'Elemental kills:';
      for (const el of ENEMY_ELEMENTS) {
        if (data.elementKills[el]) elStr += ` ${el}:${data.elementKills[el]}`;
      }
      ctx.fillStyle = '#aaa';
      ctx.fillText(elStr, bx + 40, sy);
    }

    sy += 24;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    const desc = BESTIARY_DESCS[entry.type] || 'A dangerous enemy.';
    const descLines = wrapText(ctx, desc, bw - 80);
    for (const line of descLines) {
      ctx.fillText(line, bx + 40, sy);
      sy += 15;
    }

    sy += 10;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    if (entry.boss) {
      ctx.fillText('Boss variant: 10x HP, larger body, phase 2 at 50% HP.', bx + 40, sy);
      sy += 14;
      ctx.fillText(`Boss name: ${BOSS_NAMES[entry.type]}`, bx + 40, sy);
    } else if (entry.big) {
      ctx.fillText('Big variant: 2x HP, +3 DMG, larger body, 50% knockback resist.', bx + 40, sy);
    }

    sy += 20;
    const tierIdx = ENEMY_TIERS.indexOf(entry.type);
    ctx.fillStyle = '#666';
    ctx.fillText(`Tier: ${tierIdx + 1}/${ENEMY_TIERS.length}`, bx + 40, sy);
  }

  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('ESC/Backspace: Back to grid', bx + 16, by + bh - 12);
}

function renderAchievementsPopup(ctx) {
  const bw = 700, bh = 420;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = CANVAS_H / 2 - bh / 2;
  drawBox(ctx, bx, by, bw, bh);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  const unlocked = ACHIEVEMENT_DEFS.filter(a => achievementData[a.id]).length;
  ctx.fillText(`Achievements (${unlocked}/${ACHIEVEMENT_DEFS.length})`, bx + 20, by + 28);

  // Scrollable list
  const listY = by + 44;
  const listH = bh - 70;
  const rowH = 28;
  const visible = Math.floor(listH / rowH);
  const scroll = pauseMenu.popupScroll;
  const startIdx = Math.max(0, Math.min(scroll, ACHIEVEMENT_DEFS.length - visible));

  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, listY, bw, listH);
  ctx.clip();

  for (let i = startIdx; i < Math.min(startIdx + visible, ACHIEVEMENT_DEFS.length); i++) {
    const a = ACHIEVEMENT_DEFS[i];
    const done = !!achievementData[a.id];
    const ry = listY + (i - startIdx) * rowH;

    // Highlight current scroll position
    if (i === scroll) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx + 8, ry, bw - 16, rowH - 2);
    }

    // Icon & name
    ctx.fillStyle = done ? '#ffd700' : '#444';
    ctx.font = '14px monospace';
    ctx.fillText(a.icon, bx + 16, ry + 18);

    ctx.fillStyle = done ? '#fff' : '#555';
    ctx.font = done ? 'bold 11px monospace' : '11px monospace';
    ctx.fillText(a.name, bx + 44, ry + 15);

    // Description
    ctx.fillStyle = done ? '#aaa' : '#444';
    ctx.font = '10px monospace';
    ctx.fillText(a.desc, bx + 44, ry + 25);

    // Checkmark
    if (done) {
      ctx.fillStyle = '#4f4';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('\u2713', bx + bw - 30, ry + 18);
    }
  }

  ctx.restore();

  // Scrollbar
  if (ACHIEVEMENT_DEFS.length > visible) {
    const sbH = listH * (visible / ACHIEVEMENT_DEFS.length);
    const sbY = listY + (startIdx / ACHIEVEMENT_DEFS.length) * listH;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(bx + bw - 8, sbY, 4, sbH);
  }

  // Footer
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('\u2191\u2193 Scroll \u2022 X/Del: Clear Cache \u2022 ESC/Backspace to go back', bx + 16, by + bh - 12);

  // Clear cache confirmation overlay
  if (pauseMenu.clearCacheConfirm) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    drawBox(ctx, cx - 180, cy - 50, 360, 100);
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Clear all saved data?', cx, cy - 15);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    ctx.fillText('Achievements & Bestiary will be reset.', cx, cy + 5);
    ctx.fillStyle = '#4f4';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Y = Confirm    N = Cancel', cx, cy + 30);
    ctx.textAlign = 'left';
  }
}