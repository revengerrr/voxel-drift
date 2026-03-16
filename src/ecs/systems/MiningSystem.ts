// commit: feat(mining): implement voxel mining system with raycasting
// description: When player presses E (interact), casts a ray from the
// player in the camera's forward direction. If a solid voxel is hit
// within mining range, removes it from the grid, marks voxelData dirty
// for re-render, and adds the resource to player inventory. Shows a
// crosshair target indicator and mining progress.

import * as THREE from "three";
import { players, voxelPlanetoids } from "../world";
import { ResourceType } from "../components";

// ─── Config ───────────────────────────────────────────────────

const MINING_RANGE = 5.0;
const MINING_COOLDOWN = 15; // ticks (~0.25s at 60Hz)

// ─── State ────────────────────────────────────────────────────

let cooldown = 0;
let lastMinedBlock: { x: number; y: number; z: number } | null = null;

/** Block type → resource type mapping */
const BLOCK_TO_RESOURCE: Record<number, ResourceType> = {
  1: ResourceType.Ore, // Stone gives ore
  2: ResourceType.Ore, // Ore vein
  3: ResourceType.Crystal, // Crystal
  4: ResourceType.BioMatter, // BioMatter
  5: ResourceType.Ore, // Dark rock gives ore
  6: ResourceType.BioMatter, // Grass/moss
};

/** Block type → yield amount */
const BLOCK_YIELD: Record<number, number> = {
  1: 1, // Stone: 1 ore
  2: 3, // Ore vein: 3 ore
  3: 5, // Crystal: 5 crystal
  4: 2, // BioMatter: 2
  5: 1, // Dark rock: 1 ore
  6: 1, // Grass: 1 biomatter
};

// ─── Exports for HUD ──────────────────────────────────────────

export let isTargetingBlock = false;
export let targetBlockType = 0;
export let miningProgress = 0; // 0-1

/**
 * Get voxel at world position relative to a planetoid.
 */
function worldToVoxel(
  worldPos: THREE.Vector3,
  planetPos: THREE.Vector3,
  gridSize: number
): { x: number; y: number; z: number } {
  const half = gridSize / 2;
  return {
    x: Math.floor(worldPos.x - planetPos.x + half),
    y: Math.floor(worldPos.y - planetPos.y + half),
    z: Math.floor(worldPos.z - planetPos.z + half),
  };
}

function getVoxel(
  grid: Uint8Array,
  size: number,
  x: number,
  y: number,
  z: number
): number {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size)
    return 0;
  return grid[x + y * size + z * size * size];
}

function setVoxel(
  grid: Uint8Array,
  size: number,
  x: number,
  y: number,
  z: number,
  value: number
): void {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) return;
  grid[x + y * size + z * size * size] = value;
}

/**
 * Simple voxel raycast — steps through the grid along the ray direction.
 * Returns the first solid voxel hit within range.
 */
function voxelRaycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  planetPos: THREE.Vector3,
  grid: Uint8Array,
  gridSize: number,
  maxDist: number
): { x: number; y: number; z: number; blockType: number } | null {
  const step = 0.3;
  const pos = origin.clone();
  const dir = direction.clone().normalize().multiplyScalar(step);

  for (let d = 0; d < maxDist; d += step) {
    pos.add(dir);
    const voxelPos = worldToVoxel(pos, planetPos, gridSize);
    const block = getVoxel(grid, gridSize, voxelPos.x, voxelPos.y, voxelPos.z);

    if (block > 0) {
      return { ...voxelPos, blockType: block };
    }
  }

  return null;
}

/**
 * MiningSystem — runs each physics tick.
 *
 * 1. Cast ray from player in camera direction
 * 2. If solid voxel found within range, mark as target
 * 3. If player presses E, mine the block (with cooldown)
 * 4. Add resource to inventory
 * 5. Mark voxelData dirty for re-render
 */
export function miningSystem(
  _dt: number,
  cameraForward: THREE.Vector3
): void {
  if (cooldown > 0) {
    cooldown--;
    miningProgress = 1 - cooldown / MINING_COOLDOWN;
  }

  for (const player of players.entities) {
    const { transform, playerInput, inventory, score } = player;
    if (!transform || !playerInput || !inventory) continue;

    isTargetingBlock = false;
    targetBlockType = 0;

    // Find nearest planetoid to raycast against
    for (const planet of voxelPlanetoids.entities) {
      const { transform: pTransform, voxelData } = planet;
      if (!pTransform || !voxelData) continue;

      // Raycast from player position in camera forward direction
      const hit = voxelRaycast(
        transform.position,
        cameraForward,
        pTransform.position,
        voxelData.grid,
        voxelData.size,
        MINING_RANGE
      );

      if (hit) {
        isTargetingBlock = true;
        targetBlockType = hit.blockType;

        // Mine on interact (E key) with cooldown
        if (playerInput.interact && cooldown <= 0) {
          // Remove the voxel
          setVoxel(voxelData.grid, voxelData.size, hit.x, hit.y, hit.z, 0);
          voxelData.dirty = true;

          // Add resource to inventory
          const resourceType = BLOCK_TO_RESOURCE[hit.blockType] ?? ResourceType.Ore;
          const yield_ = BLOCK_YIELD[hit.blockType] ?? 1;
          const current = inventory.items.get(resourceType) ?? 0;
          inventory.items.set(resourceType, current + yield_);

          // Update score
          if (score) {
            score.manualHarvest += yield_;
          }

          // Set cooldown
          cooldown = MINING_COOLDOWN;
          miningProgress = 0;

          lastMinedBlock = { x: hit.x, y: hit.y, z: hit.z };
        }
      }
    }
  }
}

/**
 * Get current inventory summary for HUD display.
 */
export function getInventorySummary(): Map<ResourceType, number> {
  const player = players.entities[0];
  if (!player?.inventory) return new Map();
  return player.inventory.items;
}
