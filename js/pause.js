// ── Pause Menu, Ninja Guide, Bestiary & Achievements ─────────

// ── Achievement Storage ──────────────────────────────────────
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

// ── Achievement Definitions ──────────────────────────────────
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

// ── Runtime Tracking ─────────────────────────────────────────
const achievementData = loadAchievements();
const bestiaryData = loadBestiary();

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
  achievementData[id] = Date.now();
  achievementData._totalKills = totalKillsAll;
  achievementData._ninjaKills = ninjaKills;
  saveAchievements(achievementData);
  const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
  if (def) achievementToasts.push(def);
}

function recordKill(ninjaType) {
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

function recordBestiaryKill(enemyType, isBig, isBoss) {
  const key = isBoss ? `boss_${enemyType}` : (isBig ? `big_${enemyType}` : enemyType);
  const isNew = !bestiaryData[key];
  if (isNew) {
    bestiaryData[key] = { kills: 0, type: enemyType, big: isBig, boss: isBoss };
  }
  bestiaryData[key].kills++;
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

// ── Pause Menu State ─────────────────────────────────────────
const pauseMenu = {
  active: false,
  selected: 0,     // 0=resume, 1=guide, 2=bestiary, 3=achievements
  popup: null,      // 'guide' | 'bestiary' | 'achievements' | null
  popupScroll: 0,
  guideNinja: 0,    // index into NINJA_ORDER
  bestiaryIdx: 0,   // current bestiary page index
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
    if (sel === 2) { pauseMenu.popup = 'bestiary'; pauseMenu.bestiaryIdx = 0; pauseMenu.popupScroll = 0; }
    if (sel === 3) { pauseMenu.popup = 'achievements'; pauseMenu.popupScroll = 0; }
  }
}

function updatePopup() {
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

  if (pauseMenu.popup === 'bestiary') {
    const entries = getBestiaryEntries();
    if (consumePress('ArrowLeft') || consumePress('KeyA')) {
      pauseMenu.bestiaryIdx = Math.max(0, pauseMenu.bestiaryIdx - 1);
    }
    if (consumePress('ArrowRight') || consumePress('KeyD')) {
      pauseMenu.bestiaryIdx = Math.min(entries.length - 1, pauseMenu.bestiaryIdx + 1);
    }
  }

  if (pauseMenu.popup === 'achievements') {
    if (consumePress('ArrowUp') || consumePress('KeyW')) {
      pauseMenu.popupScroll = Math.max(0, pauseMenu.popupScroll - 1);
    }
    if (consumePress('ArrowDown') || consumePress('KeyS')) {
      pauseMenu.popupScroll = Math.min(ACHIEVEMENT_DEFS.length - 1, pauseMenu.popupScroll + 1);
    }
  }
}

// ── Ninja Guide Data ─────────────────────────────────────────
const NINJA_GUIDE = {
  fire: {
    element: 'Fire / Combo',
    special: 'Fire Dash — Charge forward in flames, damaging enemies in your path.',
    ultimate: 'Meteors rain from the sky dealing massive AOE. Grants fire armor (immune to damage, auto-fires projectiles).',
    mechanic: 'Hitting enemies builds Combo (0-10). At 8+ combo: Fire Armor activates. Attacks apply Burn (DOT). Fire trails left while running deal burn to enemies.',
    tips: 'Stay aggressive to keep combo up. Combo decays over time!'
  },
  earth: {
    element: 'Stone / Constructs',
    special: 'Place Stone Construct — Spawns pillars, spikes, golems, shooters, flyers, or deflectors based on unlocks.',
    ultimate: 'Summon a Golem Mecha to ride — heavy punches, invulnerable, timed duration.',
    mechanic: 'Constructs fight independently. Unlock new types by defeating matching bosses. Pillar, Spike, and Golem are always available.',
    tips: 'Build defenses before bosses. Constructs block enemy projectiles!'
  },
  bubble: {
    element: 'Water / Float',
    special: 'Bubble Burst — Sends bubbles upward that float and pop on enemies.',
    ultimate: 'Replication Cascade — Spawns bubble clones that seek and damage all enemies.',
    mechanic: 'Float Buff (4 sec) grants extra jump and 1.35x speed. Bubbles bob in the air and pop on contact.',
    tips: 'Use float buff for mobility. Great for tower levels!'
  },
  shadow: {
    element: 'Darkness / Stealth',
    special: 'Vanish — Enter stealth. Builds to backstab at max stealth (massive damage).',
    ultimate: 'Eternal Darkness — Screen darkens, glowing eyes appear, chain strike teleports between enemies.',
    mechanic: 'Stealth builds when not touching enemies (0-300). Backstab at max stealth deals 9999 damage. Chain strike combos between nearby targets.',
    tips: 'Patience is key. Wait for full stealth before backstabbing bosses!'
  },
  crystal: {
    element: 'Ice / Diamonds',
    special: 'Diamond Shard — Launch a homing crystal that freezes enemies (60 frames). Also deflects enemy projectiles.',
    ultimate: 'Crystal Shatter — Freezes all enemies, spawns afterimage clones that attack. Frozen kills spawn extra shards.',
    mechanic: 'Freeze stops movement. Shurikens also freeze. Shards scatter from frozen kills. Parry window reflects projectiles.',
    tips: 'Freeze bosses to buy time. Shards chain through groups!'
  },
  wind: {
    element: 'Air / Momentum',
    special: 'Trimerang — Homing boomerang that orbits back. Gains power from wind meter.',
    ultimate: 'Trimerang Burst — Sends a storm of orbiting trimerangs around you.',
    mechanic: 'Wind Power (0-10) builds while not taking damage. At 10: 50% dodge chance, double next hit, enemies slowed. Resets on damage.',
    tips: 'Play safe to build wind power. Dodge chance can save you in tough spots!'
  },
  storm: {
    element: 'Lightning / Soak',
    special: 'Storm Orb — Fire water orbs that soak enemies (mark for lightning).',
    ultimate: 'Lightning Reign — Rain soaks all enemies, chain lightning strikes between soaked targets every 30 frames.',
    mechanic: 'Soaked enemies take chain lightning. Soak lasts 5 sec. Shurikens also apply soak. Lightning chains between nearby soaked enemies.',
    tips: 'Soak groups then attack one to chain lightning through all!'
  }
};

// ── Bestiary Helpers ─────────────────────────────────────────
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
  for (const t of ENEMY_TIERS) {
    entries.push({ key: t, type: t, big: false, boss: false });
    entries.push({ key: `big_${t}`, type: t, big: true, boss: false });
    entries.push({ key: `boss_${t}`, type: t, big: false, boss: true });
  }
  return entries;
}

// ── Render Helpers ───────────────────────────────────────────
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

// ── Toast Render ─────────────────────────────────────────────
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

// ── Pause Menu Render ────────────────────────────────────────
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

// ── Popup Render ─────────────────────────────────────────────
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
  ctx.fillText(`ATK: ${nt.attackDamage}  SPD: ${nt.speed}  JUMP: ${Math.abs(nt.jumpPower)}  KEY: [${nt.key}]`, bx + 24, cy);

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

function renderBestiaryPopup(ctx) {
  const bw = 700, bh = 420;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = CANVAS_H / 2 - bh / 2;
  drawBox(ctx, bx, by, bw, bh);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Bestiary', bx + 20, by + 30);

  const entries = getBestiaryEntries();
  const idx = pauseMenu.bestiaryIdx;
  const entry = entries[idx];
  const data = bestiaryData[entry.key];
  const discovered = data && data.kills > 0;

  // Entry tabs — show pages
  const tabY = by + 44;
  const perPage = 10;
  const page = Math.floor(idx / perPage);
  const startEntry = page * perPage;

  for (let i = startEntry; i < Math.min(startEntry + perPage, entries.length); i++) {
    const e = entries[i];
    const d = bestiaryData[e.key];
    const disc = d && d.kills > 0;
    const tx = bx + 20 + (i - startEntry) * 66;
    const sel = i === idx;
    ctx.fillStyle = sel ? (disc ? ENEMY_STATS[e.type].color : '#555') : 'rgba(255,255,255,0.08)';
    ctx.fillRect(tx, tabY, 62, 20);
    ctx.fillStyle = sel ? '#fff' : (disc ? '#aaa' : '#444');
    ctx.font = '8px monospace';
    const label = disc ? (e.boss ? 'BOSS' : (e.big ? 'BIG' : '')) + (e.boss || e.big ? ' ' : '') + e.type.substring(0, 5) : '???';
    ctx.fillText(label, tx + 3, tabY + 14);
  }

  // Page indicator
  const totalPages = Math.ceil(entries.length / perPage);
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText(`Page ${page + 1}/${totalPages}`, bx + bw - 80, tabY + 14);

  // Detail area
  const detY = tabY + 34;

  if (!discovered) {
    ctx.fillStyle = '#555';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('??? — Not yet discovered', bx + 40, detY + 40);
    ctx.fillStyle = '#444';
    ctx.font = '12px monospace';
    ctx.fillText('Defeat this enemy to learn about it.', bx + 40, detY + 64);
  } else {
    const stats = ENEMY_STATS[entry.type];

    // Name + type label
    ctx.fillStyle = stats.color;
    ctx.font = 'bold 16px monospace';
    const nameStr = (entry.boss ? BOSS_NAMES[entry.type] + ' (Boss)' : (entry.big ? 'Big ' : '') + stats.name);
    ctx.fillText(nameStr, bx + 40, detY + 20);

    // Mini enemy preview (colored box)
    const prevX = bx + bw - 120;
    const prevY = detY + 10;
    const prevW = entry.boss ? 56 : (entry.big ? 40 : 28);
    const prevH = entry.boss ? 56 : (entry.big ? 40 : 28);
    ctx.fillStyle = stats.color;
    ctx.fillRect(prevX, prevY, prevW, prevH);
    // Eyes
    ctx.fillStyle = '#fff';
    const eyeX = prevX + prevW * 0.5;
    ctx.fillRect(eyeX, prevY + prevH * 0.25, 4, 4);
    ctx.fillRect(eyeX + 6, prevY + prevH * 0.25, 4, 4);
    // Headband
    ctx.fillStyle = '#c33';
    ctx.fillRect(prevX, prevY + prevH * 0.15, prevW, 3);

    // Stats
    let sy = detY + 44;
    ctx.font = '12px monospace';
    const waveScale = entry.boss ? 10 : (entry.big ? 2 : 1);
    const baseHp = stats.hp * waveScale;
    const baseDmg = entry.boss ? Math.round(4) : (entry.big ? stats.dmg + 3 : stats.dmg);
    ctx.fillStyle = '#e44';
    ctx.fillText(`Base HP: ${baseHp}`, bx + 40, sy);
    ctx.fillStyle = '#fa0';
    ctx.fillText(`Base DMG: ${baseDmg}`, bx + 200, sy);

    sy += 20;
    ctx.fillStyle = '#4f4';
    ctx.fillText(`Your Kills: ${data.kills}`, bx + 40, sy);

    sy += 24;
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    const desc = BESTIARY_DESCS[entry.type] || 'A dangerous enemy.';
    const descLines = wrapText(ctx, desc, bw - 80);
    for (const line of descLines) {
      ctx.fillText(line, bx + 40, sy);
      sy += 15;
    }

    // Type-specific notes
    sy += 10;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    if (entry.boss) {
      ctx.fillText(`Boss variant: 10x HP, larger body, phase 2 at 50% HP.`, bx + 40, sy);
      sy += 14;
      ctx.fillText(`Boss name: ${BOSS_NAMES[entry.type]}`, bx + 40, sy);
    } else if (entry.big) {
      ctx.fillText('Big variant: 2x HP, +3 DMG, larger body, 50% knockback resist.', bx + 40, sy);
    }

    // Tier info
    sy += 20;
    const tierIdx = ENEMY_TIERS.indexOf(entry.type);
    ctx.fillStyle = '#666';
    ctx.fillText(`Tier: ${tierIdx + 1}/${ENEMY_TIERS.length}`, bx + 40, sy);
  }

  // Footer
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText('\u2190\u2192 Browse entries \u2022 ESC/Backspace to go back', bx + 16, by + bh - 12);
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
  ctx.fillText('\u2191\u2193 Scroll \u2022 ESC/Backspace to go back', bx + 16, by + bh - 12);
}
