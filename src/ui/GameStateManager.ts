// commit: feat(state): add game state manager — title screen, playing, game over, restart
// description: Manages game states: TITLE → PLAYING → GAME_OVER → TITLE.
// Title screen shows animated logo, controls, and "CLICK TO START".
// Game over shows score summary and "CLICK TO PLAY AGAIN".
// Provides state checks for main loop to pause/resume systems.
// All UI uses retro pixel aesthetic matching the HUD.

// ─── Types ────────────────────────────────────────────────────

export enum GameState {
  Loading = "loading",
  Title = "title",
  Playing = "playing",
  GameOver = "gameover",
}

// ─── State ────────────────────────────────────────────────────

let currentState: GameState = GameState.Loading;
let titleEl: HTMLDivElement | null = null;
let gameOverEl: HTMLDivElement | null = null;
let onStartCallback: (() => void) | null = null;
let onRestartCallback: (() => void) | null = null;

// ─── Getters ──────────────────────────────────────────────────

export function getGameState(): GameState {
  return currentState;
}

export function isPlaying(): boolean {
  return currentState === GameState.Playing;
}

// ─── Init ─────────────────────────────────────────────────────

export function initGameState(
  onStart: () => void,
  onRestart: () => void
): void {
  onStartCallback = onStart;
  onRestartCallback = onRestart;

  injectStyles();
  createTitleScreen();
  createGameOverScreen();
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    .gs-overlay {
      position: fixed; inset: 0; z-index: 50;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: 'Press Start 2P', monospace;
      image-rendering: pixelated;
      transition: opacity 0.5s ease, visibility 0.5s ease;
      cursor: pointer;
    }
    .gs-overlay.hidden {
      opacity: 0; visibility: hidden; pointer-events: none;
    }

    .gs-title-bg {
      background: radial-gradient(ellipse at 50% 60%, #0a1628 0%, #09090b 70%);
    }

    .gs-gameover-bg {
      background: rgba(9, 9, 11, 0.92);
      backdrop-filter: blur(8px);
    }

    .gs-logo {
      font-size: 32px; letter-spacing: 6px;
      text-transform: uppercase;
      color: transparent;
      background: linear-gradient(180deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: none;
      margin-bottom: 8px;
    }

    .gs-subtitle {
      font-size: 8px; letter-spacing: 3px;
      color: #4ade80; opacity: 0.6;
      text-transform: uppercase;
      margin-bottom: 48px;
    }

    .gs-prompt {
      font-size: 10px; color: #e4e4e7;
      animation: gs-blink 1.2s ease-in-out infinite;
      letter-spacing: 2px;
    }

    @keyframes gs-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }

    .gs-controls {
      margin-bottom: 40px;
      display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }

    .gs-key-row {
      display: flex; align-items: center; gap: 8px;
      font-size: 7px; color: #71717a;
      letter-spacing: 1px;
    }

    .gs-key {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 28px; height: 24px; padding: 0 6px;
      background: rgba(255,255,255,0.05);
      border: 2px solid #333;
      border-bottom-width: 3px;
      color: #a1a1aa;
      font-size: 8px;
      font-family: 'Press Start 2P', monospace;
    }

    .gs-separator {
      width: 60px; height: 2px; margin: 24px 0;
      background: repeating-linear-gradient(
        90deg, #4ade80 0px, #4ade80 4px,
        transparent 4px, transparent 8px
      );
      opacity: 0.3;
    }

    .gs-score-summary {
      display: flex; flex-direction: column;
      align-items: center; gap: 12px;
      margin-bottom: 32px;
    }

    .gs-stat {
      display: flex; align-items: center; gap: 12px;
      font-size: 8px;
    }

    .gs-stat-label {
      color: #71717a; min-width: 100px;
      text-align: right; letter-spacing: 1px;
    }

    .gs-stat-value {
      color: #4ade80; min-width: 60px;
    }

    .gs-gameover-text {
      font-size: 28px; color: #ef4444;
      letter-spacing: 4px; margin-bottom: 8px;
    }

    .gs-final-score {
      font-size: 12px; color: #fbbf24;
      margin-bottom: 32px; letter-spacing: 2px;
    }

    /* Floating stars animation on title */
    .gs-star {
      position: absolute;
      width: 2px; height: 2px;
      background: #fff;
      border-radius: 50%;
      animation: gs-twinkle 3s ease-in-out infinite;
    }
    @keyframes gs-twinkle {
      0%, 100% { opacity: 0.1; }
      50% { opacity: 0.8; }
    }

    .gs-version {
      position: absolute;
      bottom: 16px; right: 16px;
      font-size: 6px; color: #333;
      letter-spacing: 1px;
    }

    .gs-credit {
      position: absolute;
      bottom: 16px; left: 16px;
      font-size: 6px; color: #333;
      letter-spacing: 1px;
    }
  `;
  document.head.appendChild(style);
}

// ─── Title Screen ─────────────────────────────────────────────

function createTitleScreen(): void {
  titleEl = document.createElement("div");
  titleEl.className = "gs-overlay gs-title-bg hidden";
  titleEl.id = "title-screen";

  // Random stars
  let starsHtml = "";
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 3;
    const size = Math.random() > 0.7 ? 3 : 2;
    starsHtml += `<div class="gs-star" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s;"></div>`;
  }

  titleEl.innerHTML = `
    ${starsHtml}
    <div class="gs-logo">VOXEL DRIFT</div>
    <div class="gs-subtitle">EXPLORE · AUTOMATE · DOMINATE</div>

    <div class="gs-controls">
      <div class="gs-key-row">
        <span class="gs-key">W</span>
        <span class="gs-key">A</span>
        <span class="gs-key">S</span>
        <span class="gs-key">D</span>
        <span style="margin:0 4px;">—</span>
        <span>MOVE</span>
      </div>
      <div class="gs-key-row">
        <span class="gs-key">MOUSE</span>
        <span style="margin:0 4px;">—</span>
        <span>LOOK</span>
      </div>
      <div class="gs-key-row">
        <span class="gs-key">E</span>
        <span style="margin:0 4px;">—</span>
        <span>MINE</span>
      </div>
      <div class="gs-key-row">
        <span class="gs-key">SPACE</span>
        <span style="margin:0 4px;">—</span>
        <span>JUMP</span>
      </div>
    </div>

    <div class="gs-separator"></div>
    <div class="gs-prompt">CLICK TO START</div>

    <div class="gs-version">V0.2.0</div>
    <div class="gs-credit">BUILT WITH CLAUDE</div>
  `;

  titleEl.addEventListener("click", () => {
    if (currentState === GameState.Title) {
      startGame();
    }
  });

  document.body.appendChild(titleEl);
}

// ─── Game Over Screen ─────────────────────────────────────────

function createGameOverScreen(): void {
  gameOverEl = document.createElement("div");
  gameOverEl.className = "gs-overlay gs-gameover-bg hidden";
  gameOverEl.id = "gameover-screen";

  gameOverEl.innerHTML = `
    <div class="gs-gameover-text">GAME OVER</div>
    <div class="gs-final-score" id="go-final-score">SCORE: 0</div>

    <div class="gs-score-summary" id="go-summary"></div>

    <div class="gs-separator"></div>
    <div class="gs-prompt">CLICK TO PLAY AGAIN</div>
  `;

  gameOverEl.addEventListener("click", () => {
    if (currentState === GameState.GameOver) {
      restartGame();
    }
  });

  document.body.appendChild(gameOverEl);
}

// ─── State Transitions ────────────────────────────────────────

export function showTitleScreen(): void {
  currentState = GameState.Title;
  if (titleEl) titleEl.classList.remove("hidden");
  if (gameOverEl) gameOverEl.classList.add("hidden");
}

function startGame(): void {
  currentState = GameState.Playing;
  if (titleEl) titleEl.classList.add("hidden");
  if (onStartCallback) onStartCallback();
}

export function triggerGameOver(score: number, stats: {
  manualHarvest: number;
  automatedHarvest: number;
  planetsExplored: number;
  activeDrones: number;
  automationRatio: number;
  elapsedTime: number;
}): void {
  currentState = GameState.GameOver;

  const minutes = Math.floor(stats.elapsedTime / 60);
  const seconds = Math.floor(stats.elapsedTime % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const scoreEl = document.getElementById("go-final-score");
  if (scoreEl) scoreEl.textContent = `SCORE: ${score}`;

  const summaryEl = document.getElementById("go-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="gs-stat">
        <span class="gs-stat-label">TOTAL HARVEST</span>
        <span class="gs-stat-value">${stats.manualHarvest + stats.automatedHarvest}</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">MANUAL</span>
        <span class="gs-stat-value">${stats.manualHarvest}</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">AUTOMATED</span>
        <span class="gs-stat-value" style="color:#22d3ee;">${stats.automatedHarvest}</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">AUTO RATIO</span>
        <span class="gs-stat-value">${Math.round(stats.automationRatio * 100)}%</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">PLANETS</span>
        <span class="gs-stat-value">${stats.planetsExplored}</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">DRONES</span>
        <span class="gs-stat-value">${stats.activeDrones}</span>
      </div>
      <div class="gs-stat">
        <span class="gs-stat-label">TIME</span>
        <span class="gs-stat-value">${timeStr}</span>
      </div>
    `;
  }

  if (gameOverEl) gameOverEl.classList.remove("hidden");
}

function restartGame(): void {
  if (gameOverEl) gameOverEl.classList.add("hidden");
  currentState = GameState.Playing;
  if (onRestartCallback) onRestartCallback();
}

// ─── Game Over Trigger: fall into void ────────────────────────

const VOID_DISTANCE = 80; // if player is this far from any planet, game over

/**
 * Check if player has fallen into the void (too far from all planets).
 * Call this each frame from main loop.
 */
export function checkVoidDeath(
  playerPos: { x: number; y: number; z: number },
  planetCenters: Array<{ x: number; y: number; z: number }>
): boolean {
  if (currentState !== GameState.Playing) return false;

  let closestDist = Infinity;
  for (const center of planetCenters) {
    const dx = playerPos.x - center.x;
    const dy = playerPos.y - center.y;
    const dz = playerPos.z - center.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < closestDist) closestDist = dist;
  }

  return closestDist > VOID_DISTANCE;
}
