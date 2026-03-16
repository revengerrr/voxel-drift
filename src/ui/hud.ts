// commit: feat(ui): implement HTML HUD overlay with crosshair and inventory
// description: Renders a minimal HUD using DOM elements (no PixiJS yet for
// simplicity). Shows: crosshair, mining target indicator, resource inventory
// counts, and a mini score display. Updates every frame from ECS state.
// PixiJS upgrade planned for Phase 5 polish.

import { ResourceType } from "../ecs/components";
import {
  isTargetingBlock,
  targetBlockType,
  miningProgress,
  getInventorySummary,
} from "../ecs/systems/MiningSystem";
import { getScoreSnapshot } from "../ecs/systems/ScoreSystem";

// ─── Block Names ──────────────────────────────────────────────

const BLOCK_NAMES: Record<number, string> = {
  1: "Stone",
  2: "Ore Vein",
  3: "Crystal",
  4: "BioMatter",
  5: "Dark Rock",
  6: "Moss",
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  [ResourceType.Ore]: "Ore",
  [ResourceType.Crystal]: "Crystal",
  [ResourceType.BioMatter]: "BioMatter",
  [ResourceType.Energy]: "Energy",
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Ore]: "#92400e",
  [ResourceType.Crystal]: "#7c3aed",
  [ResourceType.BioMatter]: "#059669",
  [ResourceType.Energy]: "#eab308",
};

// ─── DOM Elements ─────────────────────────────────────────────

let crosshair: HTMLDivElement;
let miningIndicator: HTMLDivElement;
let miningBar: HTMLDivElement;
let miningLabel: HTMLDivElement;
let inventoryPanel: HTMLDivElement;
let scorePanel: HTMLDivElement;
let controlsHint: HTMLDivElement;

/**
 * Create all HUD DOM elements and inject into #ui-overlay.
 */
export function initHUD(): void {
  const overlay = document.getElementById("ui-overlay");
  if (!overlay) return;

  // ── Crosshair ──
  crosshair = document.createElement("div");
  crosshair.id = "crosshair";
  crosshair.innerHTML = `
    <div style="
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 20;
    ">
      <div style="
        width: 2px; height: 16px;
        background: rgba(255,255,255,0.6);
        position: absolute;
        top: -8px; left: -1px;
      "></div>
      <div style="
        width: 16px; height: 2px;
        background: rgba(255,255,255,0.6);
        position: absolute;
        top: -1px; left: -8px;
      "></div>
    </div>
  `;
  overlay.appendChild(crosshair);

  // ── Mining indicator ──
  miningIndicator = document.createElement("div");
  miningIndicator.style.cssText = `
    position: fixed;
    top: 55%; left: 50%;
    transform: translateX(-50%);
    text-align: center;
    pointer-events: none;
    z-index: 20;
    opacity: 0;
    transition: opacity 0.15s ease;
  `;

  miningLabel = document.createElement("div");
  miningLabel.style.cssText = `
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 6px;
  `;

  miningBar = document.createElement("div");
  miningBar.style.cssText = `
    width: 80px; height: 3px;
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
    overflow: hidden;
    margin: 0 auto;
  `;
  miningBar.innerHTML = `<div id="mining-bar-fill" style="
    width: 0%; height: 100%;
    background: linear-gradient(90deg, #22d3ee, #34d399);
    border-radius: 2px;
    transition: width 0.05s linear;
  "></div>`;

  miningIndicator.appendChild(miningLabel);
  miningIndicator.appendChild(miningBar);
  overlay.appendChild(miningIndicator);

  // ── Inventory panel (bottom left) ──
  inventoryPanel = document.createElement("div");
  inventoryPanel.style.cssText = `
    position: fixed;
    bottom: 24px; left: 24px;
    pointer-events: auto;
    z-index: 20;
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `;
  overlay.appendChild(inventoryPanel);

  // ── Score panel (top right) ──
  scorePanel = document.createElement("div");
  scorePanel.style.cssText = `
    position: fixed;
    top: 24px; right: 24px;
    pointer-events: auto;
    z-index: 20;
    font-family: 'JetBrains Mono', monospace;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  overlay.appendChild(scorePanel);

  // ── Controls hint (bottom center) ──
  controlsHint = document.createElement("div");
  controlsHint.style.cssText = `
    position: fixed;
    bottom: 24px; left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 20;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
    transition: opacity 3s ease;
  `;
  controlsHint.textContent = "WASD move · Mouse look · E mine · Space jump";
  overlay.appendChild(controlsHint);

  // Fade out controls hint after 8 seconds
  setTimeout(() => {
    controlsHint.style.opacity = "0";
  }, 8000);
}

/**
 * Update HUD — call every render frame.
 */
export function updateHUD(): void {
  // ── Mining indicator ──
  if (isTargetingBlock) {
    miningIndicator.style.opacity = "1";
    miningLabel.textContent = `[E] Mine ${BLOCK_NAMES[targetBlockType] ?? "Block"}`;
    const fill = miningBar.querySelector("#mining-bar-fill") as HTMLDivElement;
    if (fill) {
      fill.style.width = `${miningProgress * 100}%`;
    }
    // Crosshair turns green when targeting
    crosshair.querySelector("div")!.querySelectorAll("div").forEach((d) => {
      d.style.background = "rgba(52, 211, 153, 0.9)";
    });
  } else {
    miningIndicator.style.opacity = "0";
    // Reset crosshair color
    crosshair.querySelector("div")!.querySelectorAll("div").forEach((d) => {
      d.style.background = "rgba(255, 255, 255, 0.6)";
    });
  }

  // ── Inventory ──
  const inventory = getInventorySummary();
  let inventoryHTML = "";

  const resourceOrder = [
    ResourceType.Ore,
    ResourceType.Crystal,
    ResourceType.BioMatter,
    ResourceType.Energy,
  ];

  for (const type of resourceOrder) {
    const amount = inventory.get(type) ?? 0;
    if (amount > 0) {
      const color = RESOURCE_COLORS[type];
      const name = RESOURCE_NAMES[type];
      inventoryHTML += `
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0,0,0,0.5);
          border-left: 3px solid ${color};
          border-radius: 4px;
          backdrop-filter: blur(4px);
        ">
          <div style="
            width: 8px; height: 8px;
            background: ${color};
            border-radius: 2px;
          "></div>
          <span style="
            font-size: 11px;
            color: rgba(255,255,255,0.7);
            min-width: 70px;
          ">${name}</span>
          <span style="
            font-size: 13px;
            color: white;
            font-weight: 600;
          ">${amount}</span>
        </div>
      `;
    }
  }

  if (inventoryHTML === "") {
    inventoryHTML = `
      <div style="
        font-size: 10px;
        color: rgba(255,255,255,0.25);
        letter-spacing: 1px;
        text-transform: uppercase;
      ">Press E to mine</div>
    `;
  }

  inventoryPanel.innerHTML = inventoryHTML;

  // ── Score ──
  const snapshot = getScoreSnapshot();
  if (snapshot) {
    const minutes = Math.floor(snapshot.elapsedTime / 60);
    const seconds = Math.floor(snapshot.elapsedTime % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    scorePanel.innerHTML = `
      <div style="
        font-size: 10px;
        color: rgba(255,255,255,0.3);
        letter-spacing: 1px;
        text-transform: uppercase;
      ">Score</div>
      <div style="
        font-size: 18px;
        color: white;
        font-weight: 600;
      ">${snapshot.totalScore}</div>
      <div style="
        font-size: 10px;
        color: rgba(255,255,255,0.3);
        margin-top: 4px;
      ">${timeStr} · ${Math.round(snapshot.automationRatio * 100)}% auto</div>
    `;
  }
}
