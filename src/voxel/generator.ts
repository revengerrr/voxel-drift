// commit: feat(voxel): implement procedural spherical planet generator
// description: Generates voxel planetoids using 3D simplex-like noise
// carved into a sphere shape. Different biome layers create varied
// terrain: surface layer (grass/moss), mid layer (stone), deep layer
// (ore deposits). Resource deposits are placed at noise peaks.

import * as THREE from "three";
import { ResourceType } from "../ecs/components";

// ─── Simple 3D Noise (hash-based, no dependency) ─────────────

function hash3(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) / 2147483648;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Simple value noise in 3D */
function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const fz = smoothstep(z - iz);

  const v000 = hash3(ix, iy, iz);
  const v100 = hash3(ix + 1, iy, iz);
  const v010 = hash3(ix, iy + 1, iz);
  const v110 = hash3(ix + 1, iy + 1, iz);
  const v001 = hash3(ix, iy, iz + 1);
  const v101 = hash3(ix + 1, iy, iz + 1);
  const v011 = hash3(ix, iy + 1, iz + 1);
  const v111 = hash3(ix + 1, iy + 1, iz + 1);

  return lerp(
    lerp(lerp(v000, v100, fx), lerp(v010, v110, fx), fy),
    lerp(lerp(v001, v101, fx), lerp(v011, v111, fx), fy),
    fz
  );
}

/** Fractal Brownian Motion — layered noise for natural terrain */
function fbm(x: number, y: number, z: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

// ─── Planet Generation ────────────────────────────────────────

export interface PlanetConfig {
  /** Grid size (e.g. 32 = 32³ voxels) */
  size: number;
  /** Base sphere radius in voxels */
  radius: number;
  /** Noise scale (smaller = smoother terrain) */
  noiseScale: number;
  /** Terrain height variation */
  heightVariation: number;
  /** Random seed offset */
  seed: number;
}

const DEFAULT_CONFIG: PlanetConfig = {
  size: 32,
  radius: 12,
  noiseScale: 0.08,
  heightVariation: 3,
  seed: 0,
};

/**
 * Generate a spherical voxel planet.
 *
 * Algorithm:
 * 1. For each voxel position, compute distance from grid center
 * 2. Add noise-based height variation to the sphere surface
 * 3. If distance < (radius + noise), fill the voxel
 * 4. Assign block types based on depth from surface
 */
export function generatePlanet(
  config: Partial<PlanetConfig> = {}
): {
  grid: Uint8Array;
  deposits: Array<{
    type: ResourceType;
    position: THREE.Vector3;
    amount: number;
    maxAmount: number;
  }>;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { size, radius, noiseScale, heightVariation, seed } = cfg;

  const grid = new Uint8Array(size * size * size);
  const deposits: Array<{
    type: ResourceType;
    position: THREE.Vector3;
    amount: number;
    maxAmount: number;
  }> = [];

  const center = size / 2;

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Distance from center
        const dx = x - center;
        const dy = y - center;
        const dz = z - center;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Noise-modulated surface
        const nx = (x + seed) * noiseScale;
        const ny = (y + seed) * noiseScale;
        const nz = (z + seed) * noiseScale;
        const surfaceNoise = fbm(nx, ny, nz, 4) * heightVariation;

        const surfaceRadius = radius + surfaceNoise;

        if (dist > surfaceRadius) continue; // air

        // Depth from surface
        const depth = surfaceRadius - dist;
        const idx = x + y * size + z * size * size;

        if (depth < 1.5) {
          // Surface layer — grass/moss
          grid[idx] = 6;
        } else if (depth < 4) {
          // Mid layer — stone
          grid[idx] = 1;

          // Ore veins (noise clusters)
          const oreNoise = fbm(nx * 3 + 100, ny * 3, nz * 3 + 100, 3);
          if (oreNoise > 0.65) {
            grid[idx] = 2; // Ore
          }
        } else {
          // Deep layer — dark rock
          grid[idx] = 5;

          // Crystal deposits (rare, deep)
          const crystalNoise = fbm(nx * 5 + 200, ny * 5, nz * 5 + 200, 2);
          if (crystalNoise > 0.75) {
            grid[idx] = 3; // Crystal

            // Register as resource deposit
            if (Math.random() < 0.3) {
              deposits.push({
                type: ResourceType.Crystal,
                position: new THREE.Vector3(
                  x - center,
                  y - center,
                  z - center
                ),
                amount: 50 + Math.floor(Math.random() * 50),
                maxAmount: 100,
              });
            }
          }
        }

        // BioMatter on surface (rare patches)
        if (depth < 1.5) {
          const bioNoise = fbm(nx * 2 + 300, ny * 2, nz * 2 + 300, 2);
          if (bioNoise > 0.7) {
            grid[idx] = 4; // BioMatter

            if (Math.random() < 0.2) {
              deposits.push({
                type: ResourceType.BioMatter,
                position: new THREE.Vector3(
                  x - center,
                  y - center,
                  z - center
                ),
                amount: 20 + Math.floor(Math.random() * 30),
                maxAmount: 50,
              });
            }
          }
        }
      }
    }
  }

  // Add ore deposits
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[x + y * size + z * size * size] === 2 && Math.random() < 0.05) {
          deposits.push({
            type: ResourceType.Ore,
            position: new THREE.Vector3(x - center, y - center, z - center),
            amount: 30 + Math.floor(Math.random() * 70),
            maxAmount: 100,
          });
        }
      }
    }
  }

  return { grid, deposits };
}
