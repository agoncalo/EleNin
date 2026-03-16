// ── Input ────────────────────────────────────────────────────
const keys = {};
const justPressed = {};
window.addEventListener('keydown', e => {
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
function consumePress(code) { if (justPressed[code]) { justPressed[code] = false; return true; } return false; }

// ── Mouse input ──────────────────────────────────────────────
function setupMouseInput(canvas) {
  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    ensureAudio();
    if (e.button === 0) { justPressed['MouseAttack'] = true; keys['MouseAttack'] = true; }
    if (e.button === 2) { justPressed['MouseSpecial'] = true; keys['MouseSpecial'] = true; }
    if (e.button === 1) { justPressed['MouseShuriken'] = true; keys['MouseShuriken'] = true; }
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) keys['MouseAttack'] = false;
    if (e.button === 2) keys['MouseSpecial'] = false;
    if (e.button === 1) keys['MouseShuriken'] = false;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

// Mouse wheel for ninja switching
let mouseWheelNinja = 0;
function setupMouseWheel(canvas) {
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.deltaY > 0) mouseWheelNinja = (mouseWheelNinja + 1) % 6;
    else mouseWheelNinja = (mouseWheelNinja + 5) % 6;
    justPressed['WheelSwitch'] = true;
  }, { passive: false });
}

// ── Touch input ──────────────────────────────────────────────
const touchState = { left: false, right: false, up: false, down: false, attack: false, special: false, shuriken: false };
const touchJust = { attack: false, special: false, shuriken: false, up: false };
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function getTouchZone(tx, ty, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = (tx - rect.left) / rect.width * CANVAS_W;
  const y = (ty - rect.top) / rect.height * CANVAS_H;
  if (x < CANVAS_W * 0.35 && y > CANVAS_H * 0.5) {
    const cx = CANVAS_W * 0.15, cy = CANVAS_H * 0.78;
    const dx = x - cx, dy = y - cy;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }
  if (x > CANVAS_W * 0.65 && y > CANVAS_H * 0.5) {
    if (y < CANVAS_H * 0.68) return 'shuriken';
    if (x < CANVAS_W * 0.82) return 'attack';
    return 'special';
  }
  return null;
}

function setupTouchInput(canvas) {
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    ensureAudio();
    for (const t of e.changedTouches) {
      const zone = getTouchZone(t.clientX, t.clientY, canvas);
      if (zone) {
        touchState[zone] = true;
        if (zone === 'attack' || zone === 'special' || zone === 'shuriken' || zone === 'up') touchJust[zone] = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchState.left = false; touchState.right = false; touchState.up = false; touchState.down = false;
    touchState.attack = false; touchState.special = false; touchState.shuriken = false;
    for (const t of e.touches) {
      const zone = getTouchZone(t.clientX, t.clientY, canvas);
      if (zone) touchState[zone] = true;
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

// ── Gamepad support ──────────────────────────────────────────
const gpState = { axes: [0,0,0,0], buttons: new Array(17).fill(false) };
const gpJust = new Array(17).fill(false);
const gpPrev = new Array(17).fill(false);

function pollGamepad() {
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (!gp) return;
  ensureAudio();
  gpState.axes[0] = gp.axes[0] || 0;
  gpState.axes[1] = gp.axes[1] || 0;
  for (let i = 0; i < gp.buttons.length && i < 17; i++) {
    const pressed = gp.buttons[i].pressed;
    gpJust[i] = pressed && !gpPrev[i];
    gpPrev[i] = pressed;
    gpState.buttons[i] = pressed;
  }
}

// Clear per-frame input state
function clearFrameInput() {
  for (const k in justPressed) justPressed[k] = false;
  touchJust.attack = false; touchJust.special = false; touchJust.shuriken = false; touchJust.up = false;
}
