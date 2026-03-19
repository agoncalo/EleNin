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
      if (!game.gameOver && !game.gameWon) {
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
      if (Object.values(justPressed).some(v => v) || gpJust.some(v => v)) {
        game.menuActive = false;
        game.controlsScreen = true;
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
