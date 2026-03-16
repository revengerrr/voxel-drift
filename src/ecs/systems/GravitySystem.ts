// commit: feat(physics): implement radial gravity system
// description: Core Galaxy-style gravity system. Each planetoid emits
// a radial gravity field. Entities with GravityBody are pulled toward
// the nearest planetoid's center. Handles gravity transitions when
// jumping between planets — smoothly blends the "up" direction.

import * as THREE from "three";
import { gravityBodies, planetoids } from "../world";

const _tempVec = new THREE.Vector3();
const _tempVec2 = new THREE.Vector3();

/** Track which planets the player has visited */
const _visitedPlanets = new Set<number>();
_visitedPlanets.add(0); // start planet

interface GravityInfluence {
  entityIndex: number;
  center: THREE.Vector3;
  strength: number;
  distance: number;
  direction: THREE.Vector3;
}

/**
 * GravitySystem — runs each physics tick (60Hz).
 *
 * For each GravityBody entity:
 * 1. Find all planetoids within influence range
 * 2. Pick the dominant one (closest surface)
 * 3. Apply radial gravity force toward that planetoid's center
 * 4. Update surfaceNormal (the entity's local "up")
 * 5. Handle smooth transitions between gravity fields
 */
export function gravitySystem(dt: number): void {
  const planetoidList = planetoids.entities;

  for (const entity of gravityBodies.entities) {
    const { transform, gravityBody } = entity;
    if (!transform || !gravityBody) continue;

    const pos = transform.position;
    let bestInfluence: GravityInfluence | null = null;
    let bestSurfaceDist = Infinity;

    // Find dominant gravity field
    for (let i = 0; i < planetoidList.length; i++) {
      const planet = planetoidList[i];
      if (!planet.transform || !planet.gravityField) continue;

      const field = planet.gravityField;
      _tempVec.copy(field.center).sub(pos);
      const distance = _tempVec.length();

      // Skip if outside influence radius
      if (distance > field.radius) continue;

      // Surface distance (how far from the planet's "surface")
      // For voxel planets, surface ≈ half grid size
      const surfaceRadius = planet.voxelData
        ? (planet.voxelData.size / 2) * 0.8
        : field.radius / 3;
      const surfaceDist = Math.abs(distance - surfaceRadius);

      if (surfaceDist < bestSurfaceDist) {
        bestSurfaceDist = surfaceDist;
        bestInfluence = {
          entityIndex: i,
          center: field.center.clone(),
          strength: field.strength,
          distance,
          direction: _tempVec.clone().normalize(),
        };
      }
    }

    if (bestInfluence) {
      // Apply radial gravity: force direction = toward planet center
      const gravityDir = bestInfluence.direction;

      // Update velocity (gravity acceleration)
      if (entity.velocity) {
        const force =
          bestInfluence.strength * gravityBody.gravityScale * dt;
        entity.velocity.linear.addScaledVector(gravityDir, force);
      }

      // Smooth surface normal transition (for camera + character orientation)
      // surfaceNormal = opposite of gravity direction (points "up" from surface)
      const targetNormal = _tempVec2
        .copy(gravityDir)
        .negate()
        .normalize();

      // Slerp-like blend for smooth transitions between planets
      gravityBody.surfaceNormal.lerp(targetNormal, Math.min(1, dt * 5));
      gravityBody.surfaceNormal.normalize();

      // Detect planet transition
      const prevBound = gravityBody.boundTo;
      gravityBody.boundTo = bestInfluence.entityIndex;

      // Track planets explored (for player entity)
      if (prevBound !== null && prevBound !== bestInfluence.entityIndex) {
        const ent = entity as Record<string, unknown>;
        if (ent.isPlayer && ent.score) {
          const score = ent.score as { planetsExplored: number };
          if (!_visitedPlanets.has(bestInfluence.entityIndex)) {
            _visitedPlanets.add(bestInfluence.entityIndex);
            score.planetsExplored = _visitedPlanets.size;
          }
        }
      }
    } else {
      // No gravity — free floating in space
      gravityBody.boundTo = null;
    }
  }
}
