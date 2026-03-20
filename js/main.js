// ── Bootstrap ────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// Wire up input listeners that need the canvas element
setupMouseInput(canvas);
setupMouseWheel(canvas);
setupTouchInput(canvas);

// ── Game Loop (fixed timestep) ───────────────────────────────
const game = new Game();
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += delta;

  // Cap accumulator to prevent spiral of death
  if (accumulator > 200) accumulator = 200;

  while (accumulator >= FIXED_DT) {
    if (hitstopFrames > 0) {
      hitstopFrames--;
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    // Pause toggle (Escape)
    if (consumePress('Escape') || gpJust[9]) {
      if (!game.gameOver && !game.gameWon && !game.menuActive && !game.mainMenuScreen && !game.controlsScreen) {
        togglePause();
        clearFrameInput();
        accumulator -= FIXED_DT;
        continue;
      }
    }
    // Simple pause (P key, no menu)
    if (consumePress('KeyP')) {
      if (!game.gameOver && !game.gameWon && !pauseMenu.active) {
        game.simplePause = !game.simplePause;
        clearFrameInput();
        accumulator -= FIXED_DT;
        continue;
      }
    }
    if (game.menuActive) {
      // Toggle button click detection (top-right corner buttons)
      if (justPressed['MouseAttack'] && canvasMouseX >= 0) {
        const bw = 84, bh = 26, by = 10;
        const mx1 = CANVAS_W - 180, sx1 = CANVAS_W - 88;
        if (canvasMouseY >= by && canvasMouseY <= by + bh) {
          if (canvasMouseX >= mx1 && canvasMouseX <= mx1 + bw) {
            Music.setMuted(!Music.muted);
            justPressed['MouseAttack'] = false;
          } else if (canvasMouseX >= sx1 && canvasMouseX <= sx1 + bw) {
            SFX.muted = !SFX.muted;
            justPressed['MouseAttack'] = false;
          }
        }
      }
      if (Object.values(justPressed).some(v => v) || gpJust.some(v => v)) {
        game.menuActive = false;
        game.mainMenuScreen = true;
        game.mainMenuSelected = 0;
        game.mainMenuPopup = null;
      }
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    if (game.mainMenuScreen) {
      // If a popup is active, handle popup input
      if (game.mainMenuPopup) {
        // Reuse pause popup input handling
        pauseMenu.popup = game.mainMenuPopup;
        updatePopup();
        // Check if popup was closed
        if (!pauseMenu.popup) {
          game.mainMenuPopup = null;
        } else {
          game.mainMenuPopup = pauseMenu.popup;
        }
        pauseMenu.popup = null;
        clearFrameInput();
        accumulator -= FIXED_DT;
        continue;
      }
      // Navigate main menu
      if (consumePress('ArrowUp') || consumePress('KeyW')) {
        game.mainMenuSelected = (game.mainMenuSelected + MAIN_MENU_OPTIONS.length - 1) % MAIN_MENU_OPTIONS.length;
      }
      if (consumePress('ArrowDown') || consumePress('KeyS')) {
        game.mainMenuSelected = (game.mainMenuSelected + 1) % MAIN_MENU_OPTIONS.length;
      }
      if (consumePress('Enter') || consumePress('Space') || consumePress('KeyZ') || consumePress('KeyJ')) {
        const sel = game.mainMenuSelected;
        if (sel === 0) { // Play
          game.mainMenuScreen = false;
          game.controlsScreen = true;
        }
        if (sel === 1) { // Controls
          game.mainMenuScreen = false;
          game.controlsScreen = true;
        }
        if (sel === 2) { game.mainMenuPopup = 'guide'; pauseMenu.guideNinja = 0; pauseMenu.popupScroll = 0; }
        if (sel === 3) { game.mainMenuPopup = 'bestiary'; pauseMenu.bestiaryIdx = 0; pauseMenu.bestiaryDetail = false; pauseMenu.popupScroll = 0; }
        if (sel === 4) { game.mainMenuPopup = 'vault'; pauseMenu.vaultScroll = 0; }
        if (sel === 5) { game.mainMenuPopup = 'achievements'; pauseMenu.popupScroll = 0; }
        if (sel === 6) { Music.setMuted(!Music.muted); }
        if (sel === 7) { SFX.muted = !SFX.muted; }
      }
      if (consumePress('Escape') || consumePress('Backspace')) {
        game.mainMenuScreen = false;
        game.menuActive = true;
      }
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    if (game.controlsScreen) {
      if (Object.values(justPressed).some(v => v) || gpJust.some(v => v)) {
        game.controlsScreen = false;
      }
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    if (game.simplePause) {
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    if (pauseMenu.active) {
      pauseUpdate();
      clearFrameInput();
      accumulator -= FIXED_DT;
      continue;
    }
    game.update();
    accumulator -= FIXED_DT;
    clearFrameInput();
  }

  game.render();
  renderPauseMenu(ctx);
  renderToast(ctx);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(ts => {
  lastTime = ts;
  gameLoop(ts);
});
