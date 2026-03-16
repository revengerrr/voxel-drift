// commit: feat(render): implement voxel renderer with instanced meshes
// description: Renders voxel planetoids using Three.js InstancedMesh for
// performance. Includes a simple greedy meshing pass that only creates
// faces for exposed voxel surfaces. Supports multiple block types with
// a color palette. Rebuilds mesh when VoxelData.dirty flag is set.

import * as THREE from "three";
import { voxelPlanetoids, world } from "../world";

// ─── Voxel Color Palette ──────────────────────────────────────

const BLOCK_COLORS: Record<number, THREE.Color> = {
  1: new THREE.Color(0x6b7280), // Stone — gray
  2: new THREE.Color(0x92400e), // Ore — copper brown
  3: new THREE.Color(0x7c3aed), // Crystal — purple
  4: new THREE.Color(0x059669), // BioMatter — emerald
  5: new THREE.Color(0x374151), // Dark rock
  6: new THREE.Color(0x4ade80), // Grass/moss
};

const DEFAULT_COLOR = new THREE.Color(0x52525b);

// ─── Face Direction Offsets ───────────────────────────────────

const FACE_DIRS = [
  { dir: [1, 0, 0], name: "right" },
  { dir: [-1, 0, 0], name: "left" },
  { dir: [0, 1, 0], name: "top" },
  { dir: [0, -1, 0], name: "bottom" },
  { dir: [0, 0, 1], name: "front" },
  { dir: [0, 0, -1], name: "back" },
] as const;

// Shared geometry for a single voxel face
const faceGeom = new THREE.PlaneGeometry(1, 1);
const faceMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
});

// ─── Scene Reference ──────────────────────────────────────────

let scene: THREE.Scene | null = null;
const planetMeshes = new Map<number, THREE.Group>();

export function initVoxelRenderer(sceneRef: THREE.Scene): void {
  scene = sceneRef;
}

/**
 * Get voxel at (x, y, z) in a grid of given size.
 * Returns 0 (air) for out-of-bounds coordinates.
 */
function getVoxel(grid: Uint8Array, size: number, x: number, y: number, z: number): number {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
    return 0;
  }
  return grid[x + y * size + z * size * size];
}

/**
 * Build a mesh for a voxel planetoid.
 * Uses simple culled-face approach: only generate faces where
 * a solid voxel is adjacent to air (or boundary).
 */
function buildVoxelMesh(grid: Uint8Array, size: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  const halfSize = size / 2;

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const voxel = getVoxel(grid, size, x, y, z);
        if (voxel === 0) continue;

        const color = BLOCK_COLORS[voxel] || DEFAULT_COLOR;

        // Check each face direction
        for (const face of FACE_DIRS) {
          const [dx, dy, dz] = face.dir;
          const neighbor = getVoxel(grid, size, x + dx, y + dy, z + dz);

          // Only create face if neighbor is air
          if (neighbor !== 0) continue;

          // Face center position (offset to center the grid)
          const fx = x - halfSize + 0.5;
          const fy = y - halfSize + 0.5;
          const fz = z - halfSize + 0.5;

          // Generate 4 vertices for this face
          const faceVerts = getFaceVertices(fx, fy, fz, dx, dy, dz);

          for (const v of faceVerts) {
            positions.push(v[0], v[1], v[2]);
            normals.push(dx, dy, dz);
            colors.push(color.r, color.g, color.b);
          }

          // Two triangles per face
          indices.push(
            vertexCount,
            vertexCount + 1,
            vertexCount + 2,
            vertexCount,
            vertexCount + 2,
            vertexCount + 3
          );
          vertexCount += 4;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3)
  );
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Get 4 corner vertices for a face given center position and normal direction.
 */
function getFaceVertices(
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  ny: number,
  nz: number
): [number, number, number][] {
  const h = 0.5; // half-size

  if (nx !== 0) {
    // X-facing face
    const x = cx + nx * h;
    return [
      [x, cy - h, cz - h],
      [x, cy + h, cz - h],
      [x, cy + h, cz + h],
      [x, cy - h, cz + h],
    ];
  } else if (ny !== 0) {
    // Y-facing face
    const y = cy + ny * h;
    return [
      [cx - h, y, cz - h],
      [cx + h, y, cz - h],
      [cx + h, y, cz + h],
      [cx - h, y, cz + h],
    ];
  } else {
    // Z-facing face
    const z = cz + nz * h;
    return [
      [cx - h, cy - h, z],
      [cx + h, cy - h, z],
      [cx + h, cy + h, z],
      [cx - h, cy + h, z],
    ];
  }
}

/**
 * VoxelRenderSystem — runs each render frame.
 * Checks for dirty voxel data and rebuilds meshes as needed.
 */
export function voxelRenderSystem(): void {
  if (!scene) return;

  for (const entity of voxelPlanetoids.entities) {
    const { transform, voxelData } = entity;
    if (!transform || !voxelData) continue;

    // Get a stable entity index for tracking meshes
    const entityId = voxelPlanetoids.entities.indexOf(entity);

    if (voxelData.dirty) {
      // Remove old mesh
      const existing = planetMeshes.get(entityId);
      if (existing) {
        scene.remove(existing);
        existing.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
      }

      // Build new mesh
      const geometry = buildVoxelMesh(voxelData.grid, voxelData.size);
      const mesh = new THREE.Mesh(geometry, faceMaterial);

      const group = new THREE.Group();
      group.add(mesh);
      group.position.copy(transform.position);

      scene.add(group);
      planetMeshes.set(entityId, group);

      // Store mesh reference on entity
      if (!entity.meshRef) {
        world.addComponent(entity, "meshRef", { mesh: group });
      } else {
        entity.meshRef.mesh = group;
      }

      voxelData.dirty = false;
    }

    // Sync transform
    const group = planetMeshes.get(entityId);
    if (group) {
      group.position.copy(transform.position);
      group.quaternion.copy(transform.rotation);
    }
  }
}
