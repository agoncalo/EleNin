// ── Procedural World Generation ─────────────────────────────
const CHUNK_W          = 800;
const TOWER_OX         = 80;
const TOWER_CORRIDOR_W = 800;
const TOWER_SECTION_H  = 300;

// ── Seeded deterministic RNG ─────────────────────────────────
class SeededRNG {
  constructor(seed) {
    this.s = (Math.abs(Math.round(seed)) ^ 0xDEAD) >>> 0;
    if (!this.s) this.s = 1;
  }
  next() {
    this.s ^= this.s << 13;
    this.s ^= this.s >> 17;
    this.s ^= this.s << 5;
    return (this.s >>> 0) / 0x100000000;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr)  { return arr[Math.floor(this.next() * arr.length)]; }
}

// ── Open-world chunk generator ───────────────────────────────
// chunkX  : world-space left edge of this chunk
// chunkIdx: sequential index (0 = first/spawn chunk)
// out     : { platforms: [], spikes: [] }  ← push into these arrays
function generateOpenChunk(chunkX, chunkIdx, out) {
  const rng = new SeededRNG((chunkX + 1) * 2654435761 ^ (chunkIdx + 1) * 1234567);

  const addP = (x, y, w, h, c) => {
    const p = new Platform(chunkX + x, y, w, h, c);
    p._chunkX = chunkX;
    out.platforms.push(p);
  };
  const addTP = (x, y, w) => {
    const p = new Platform(chunkX + x, y, w, 6, '#997');
    p.thin   = true;
    p._chunkX = chunkX;
    out.platforms.push(p);
  };
  const addS = (x, y, w) => {
    const s = new Spike(chunkX + x, y, w);
    s._chunkX = chunkX;
    out.spikes.push(s);
  };

  // ── Ground (first chunk never has a pit) ─────────────────
  const hasPit  = chunkIdx > 0 && rng.next() < 0.22;
  const pitStart = hasPit ? rng.int(250, 520) : -1;
  const pitW     = hasPit ? rng.int(72, 140)  : 0;
  if (hasPit) {
    addP(0,            480, pitStart,               60, '#555');
    addP(pitStart + pitW, 480, CHUNK_W - pitStart - pitW, 60, '#555');
    addS(pitStart, 468, 32);
  } else {
    addP(0, 480, CHUNK_W, 60, '#555');
  }

  // ── Safe spawn platforms (first chunk only) ──────────────
  if (chunkIdx === 0) {
    addP(60,  390, 220, 16, '#666');
    addP(360, 340, 160, 16, '#777');
  }

  // ── Random platforms: 3–6 ────────────────────────────────
  const placed = [];
  const numP   = rng.int(3, 6);
  for (let i = 0; i < numP; i++) {
    let px, py, pw, t = 0;
    do {
      px = rng.int(30, CHUNK_W - 200);
      py = rng.int(160, 445);
      pw = rng.int(80, 180);
      t++;
    } while (t < 12 && placed.some(q =>
      Math.abs(q.x - px) < pw + 50 && Math.abs(q.y - py) < 55
    ));
    placed.push({ x: px, y: py, w: pw });
    const col = py < 260 ? '#888' : py < 360 ? '#777' : '#666';
    addP(px, py, pw, 16, col);
    if (rng.next() < 0.30) addTP(px + rng.int(-20, pw), py - rng.int(55, 95), rng.int(60, 100));
    if (rng.next() < 0.18) { const wh = rng.int(40, 80); addP(px, py - wh, 16, wh, '#686'); }
    if (rng.next() < 0.14) addS(px + rng.int(10, pw - 42), py - 12, rng.int(32, 48));
  }

  // ── Guaranteed mid-height reachable platform (≤48px above jump reach from ground) ─
  if (!placed.some(q => q.y >= 280 && q.y <= 400)) {
    const mx = rng.int(80, CHUNK_W - 200);
    const my = rng.int(300, 390);
    addP(mx, my, rng.int(100, 160), 16, '#777');
    placed.push({ x: mx, y: my });
  }

  // ── Occasional vertical divider (floats above ground, walkable under) ──
  if (rng.next() < 0.22) {
    const wh = rng.int(60, 120);
    addP(rng.int(350, 550), 480 - wh - 64, 16, wh, '#555');
  }

  // ── Ground spikes (0–2) ──────────────────────────────────
  for (let i = 0; i < rng.int(0, 2); i++) {
    const sx = rng.int(60, CHUNK_W - 100);
    if (!hasPit || sx < pitStart - 50 || sx > pitStart + pitW + 50)
      addS(sx, 468, 48);
  }
}

// ── Downward-scroll tower layout ─────────────────────────────
// Returns { topY, bottomY, bossRoomY }
function buildTowerDownLayout(platforms, spikes, numSections) {
  const S   = numSections || 14;
  const sec = TOWER_SECTION_H;
  const topY     = 20;
  const bottomY  = topY + S * sec;

  const addP = (x, y, w, h, c) => {
    const p = new Platform(TOWER_OX + x, y, w, h, c);
    p._towerPiece = true;
    platforms.push(p);
  };
  const addTP = (x, y, w) => {
    const p = new Platform(TOWER_OX + x, y, w, 6, '#997');
    p.thin = true; p._towerPiece = true;
    platforms.push(p);
  };
  const addS = (x, y, w) => {
    const s = new Spike(TOWER_OX + x, y, w);
    s._towerPiece = true;
    spikes.push(s);
  };

  // Side walls (full height + margin)
  addP(-32, topY - 300, 32, bottomY - topY + 600, '#444');
  addP(TOWER_CORRIDOR_W, topY - 300, 32, bottomY - topY + 600, '#444');

  // Death spikes at very bottom
  addS(0, bottomY + 10, TOWER_CORRIDOR_W);

  // Spawn platform at top
  addP(200, topY + 14, 300, 16, '#999');
  // Entrance arch pillars flanking the spawn area
  addP(184, topY - 28, 20, 76, '#555');
  addP(496, topY - 28, 20, 76, '#555');

  const rng = new SeededRNG(0xC0FFEE);
  const layouts = [
    (y) => { addP(50,  y + 50, 130, 16, '#666'); addTP(430, y + 140, 100); },
    (y) => { addP(540, y + 50, 130, 16, '#666'); addTP(130, y + 140, 100); },
    (y) => { addP(270, y + 55, 180, 16, '#777'); addTP(60, y + 150, 80); addTP(545, y + 120, 80); },
    (y) => { addP(80,  y + 40, 110, 16, '#666'); addP(510, y + 80, 110, 16, '#666'); addTP(265, y + 160, 130); },
    (y) => { addTP(200, y + 50, 90); addP(430, y + 90, 120, 16, '#777'); addTP(80, y + 165, 100); },
    (y) => { addP(90,  y + 55, 130, 16, '#888'); addP(510, y + 100, 120, 16, '#888'); addTP(270, y + 170, 120); },
    (y) => { addP(40,  y + 35, 100, 16, '#666'); addP(570, y + 75, 100, 16, '#666'); addP(275, y + 125, 120, 16, '#777'); addTP(115, y + 195, 90); },
    (y) => { addTP(80, y + 60, 120); addTP(510, y + 60, 120); addP(255, y + 145, 160, 16, '#777'); },
  ];

  const route = [70, 540, 280, 150];
  for (let i = 0; i < S - 1; i++) {
    const y = topY + i * sec;
    // Rotating guaranteed path: keeps a reliable ladder of landings through the full tower.
    const ax = route[i % route.length];
    const bx = route[(i + 1) % route.length];
    addP(ax, y + 34, 140, 16, '#7b7');
    addP(bx, y + 182, 140, 16, '#7b7');
    rng.pick(layouts)(y);
    // Wall ledge
    if (rng.next() < 0.5)
      addP(rng.next() < 0.5 ? 0 : 742, y + rng.int(20, sec - 30), 24, 10, '#555');
  }

  // Boss room (last section) — open arena
  const bossRoomY = topY + (S - 1) * sec;
  addP(50,  bossRoomY + sec * 0.55, 200, 16, '#888');
  addP(540, bossRoomY + sec * 0.55, 200, 16, '#888');
  addP(260, bossRoomY + sec * 0.28, 270, 16, '#999'); // center floor

  return { topY, bottomY, bossRoomY };
}

// ── Upward-scroll tower layout ───────────────────────────────
// Returns { topY, bottomY, bossRoomY }
function buildTowerUpLayout(platforms, spikes, numSections) {
  const S   = numSections || 16;
  const sec = TOWER_SECTION_H;
  const bottomY = 460;
  const topY    = bottomY - S * sec;

  const addP = (x, y, w, h, c) => {
    const p = new Platform(TOWER_OX + x, y, w, h, c);
    p._towerPiece = true;
    platforms.push(p);
  };
  const addTP = (x, y, w) => {
    const p = new Platform(TOWER_OX + x, y, w, 6, '#997');
    p.thin = true; p._towerPiece = true;
    platforms.push(p);
  };
  const addS = (x, y, w) => {
    const s = new Spike(TOWER_OX + x, y, w);
    s._towerPiece = true;
    spikes.push(s);
  };

  // Side walls
  addP(-32, topY - 300, 32, bottomY - topY + 600, '#444');
  addP(TOWER_CORRIDOR_W, topY - 300, 32, bottomY - topY + 600, '#444');

  // Death spikes at very bottom
  addS(0, bottomY + 10, TOWER_CORRIDOR_W);

  // Spawn platform at bottom
  addP(200, bottomY - 10, 300, 16, '#999');
  // Entrance arch pillars flanking the spawn area
  addP(184, bottomY + 14, 20, 60, '#555');
  addP(496, bottomY + 14, 20, 60, '#555');

  const rng = new SeededRNG(0xDEAD);
  const layouts = [
    (y) => { addP(50,  y,      130, 16, '#666'); addTP(430, y - 100, 100); },
    (y) => { addP(540, y,      130, 16, '#666'); addTP(110, y - 100, 100); },
    (y) => { addP(270, y,      180, 16, '#777'); addTP(60, y - 110, 80); addTP(545, y - 85, 80); },
    (y) => { addP(80,  y + 30, 110, 16, '#666'); addP(510, y,       110, 16, '#666'); addTP(265, y - 115, 130); },
    (y) => { addTP(200, y + 20, 90); addP(430,  y,       120, 16, '#777'); addTP(90, y - 120, 100); },
    (y) => { addP(90,  y,      130, 16, '#888'); addP(510, y - 55,  120, 16, '#888'); addTP(270, y - 155, 120); },
    (y) => { addP(40,  y + 30, 100, 16, '#666'); addP(570, y,       100, 16, '#666'); addP(265, y - 75, 120, 16, '#777'); addTP(115, y - 175, 90); },
    (y) => { addTP(80, y - 45, 120); addTP(510, y - 45, 120); addP(255, y, 160, 16, '#777'); },
  ];

  const route = [70, 540, 280, 150];
  for (let i = 1; i <= S - 1; i++) {
    const y = bottomY - i * sec + sec * 0.4;
    // Rotating guaranteed path mirrored for ascent.
    const ridx = (S - i) % route.length;
    const ax = route[ridx];
    const bx = route[(ridx + 1) % route.length];
    addP(ax, y + 26, 140, 16, '#7b7');
    addP(bx, y - 145, 140, 16, '#7b7');
    rng.pick(layouts)(y);
    if (rng.next() < 0.5)
      addP(rng.next() < 0.5 ? 0 : 742, bottomY - i * sec + rng.int(20, sec - 30), 24, 10, '#555');
  }

  // Boss room (top section) — open arena
  const bossRoomY = topY + sec * 0.3;
  addP(50,  bossRoomY + sec * 0.8,  200, 16, '#888');
  addP(540, bossRoomY + sec * 0.8,  200, 16, '#888');
  addP(260, bossRoomY + sec * 1.15, 270, 16, '#999'); // center floor

  return { topY, bottomY, bossRoomY };
}
