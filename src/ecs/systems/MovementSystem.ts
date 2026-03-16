// commit: fix(physics): add surface collision so player walks on planetoid
// description: Rewrites MovementSystem with proper surface collision.
// After applying velocity, checks player distance from bound planetoid's
// center. If player is inside the voxel terrain, pushes them out to the
// surface and kills downward velocity (grounded). Also does per-voxel
// height sampling for accurate terrain walking instead of just sphere radius.

import * as THREE from "three";
import { players, voxelPlanetoids, planetoids } from "../world";

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _up = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _surfacePos = new THREE.Vector3();

/** Movement tuning constants */
const MOVE_SPEED = 8.0;
const JUMP_FORCE = 8.0;
const GROUND_DAMPING = 0.82;
const AIR_DAMPING = 0.98;
const PLAYER_HEIGHT = 1.2; // how far above surface the player center sits

/**
 * Sample the surface height at a given direction from planetoid center.
 * Casts a ray from outside the planet inward and finds the outermost solid voxel.
 * Returns distance from center to surface, or -1 if no surface found.
 */
function sampleSurfaceHeight(
  grid: Uint8Array,
  gridSize: number,
  direction: THREE.Vector3
): number {
  const half = gridSize / 2;
  const maxDist = half * 1.5;
  const step = 0.5;
  const dir = direction.clone().normalize();

  // Start from outside, move inward
  for (let d = maxDist; d > 0; d -= step) {
    const x = Math.floor(dir.x * d + half);
    const y = Math.floor(dir.y * d + half);
    const z = Math.floor(dir.z * d + half);

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) continue;

    const voxel = grid[x + y * gridSize + z * gridSize * gridSize];
    if (voxel > 0) {
      // Found surface — return distance + 1 step to be ON TOP of the voxel
      return d + step;
    }
  }

  return -1; // no surface
}

/**
 * MovementSystem — runs each physics tick.
 *
 * 1. Project input onto local surface plane
 * 2. Apply velocity
 * 3. Surface collision: clamp player to surface height
 * 4. Orient player to align with surface normal
 */
export function movementSystem(dt: number, cameraForward: THREE.Vector3): void {
  for (const entity of players.entities) {
    const { transform, playerInput, gravityBody, velocity } = entity;
    if (!transform || !playerInput || !gravityBody || !velocity) continue;

    _up.copy(gravityBody.surfaceNormal);

    // ── Input → velocity ──

    // Project camera forward onto local surface plane
    _forward.copy(cameraForward);
    _forward.sub(_up.clone().multiplyScalar(_forward.dot(_up)));
    if (_forward.lengthSq() > 0.0001) {
      _forward.normalize();
    } else {
      _forward.set(0, 0, -1); // fallback
    }

    // Right vector
    _right.crossVectors(_forward, _up).normalize();

    // Build move direction from input
    _moveDir.set(0, 0, 0);
    _moveDir.addScaledVector(_right, playerInput.moveDir.x);
    _moveDir.addScaledVector(_forward, -playerInput.moveDir.y);

    if (_moveDir.lengthSq() > 0.001) {
      _moveDir.normalize();
      velocity.linear.addScaledVector(_moveDir, MOVE_SPEED * dt);
    }

    // Jump
    if (playerInput.jump && playerInput.grounded) {
      velocity.linear.addScaledVector(_up, JUMP_FORCE);
      playerInput.grounded = false;
      playerInput.jump = false;
    }

    // Apply velocity
    transform.position.addScaledVector(velocity.linear, dt);

    // Damping
    const damping = playerInput.grounded ? GROUND_DAMPING : AIR_DAMPING;
    velocity.linear.multiplyScalar(damping);

    // ── Surface collision ──

    // Find the bound planetoid
    const boundIdx = gravityBody.boundTo;
    if (boundIdx !== null && boundIdx >= 0) {
      const planetList = planetoids.entities;
      const planet = planetList[boundIdx];

      if (planet?.transform && planet.gravityField) {
        const planetCenter = planet.gravityField.center;

        // Vector from planet center to player
        _toPlayer.copy(transform.position).sub(planetCenter);
        const distFromCenter = _toPlayer.length();

        if (distFromCenter < 0.001) {
          // Edge case: player at exact center, push out
          transform.position.copy(planetCenter).addScaledVector(_up, 10);
          continue;
        }

        const dirFromCenter = _toPlayer.clone().normalize();

        // Try to sample actual voxel surface height
        let surfaceHeight = -1;

        // Find corresponding voxel planetoid
        for (const vp of voxelPlanetoids.entities) {
          if (!vp.transform || !vp.voxelData) continue;
          // Match by position (same planetoid)
          if (vp.transform.position.distanceTo(planetCenter) < 1) {
            surfaceHeight = sampleSurfaceHeight(
              vp.voxelData.grid,
              vp.voxelData.size,
              dirFromCenter
            );
            break;
          }
        }

        // Fallback: use sphere approximation if no voxel data
        if (surfaceHeight < 0) {
          surfaceHeight = planet.gravityField.radius / 3;
        }

        const targetDist = surfaceHeight + PLAYER_HEIGHT;

        // If player is below surface → push up
        if (distFromCenter < targetDist) {
          // Snap to surface
          _surfacePos
            .copy(planetCenter)
            .addScaledVector(dirFromCenter, targetDist);
          transform.position.copy(_surfacePos);

          // Kill velocity component toward planet center (downward)
          const downSpeed = velocity.linear.dot(dirFromCenter);
          if (downSpeed < 0) {
            // Remove the downward component
            velocity.linear.addScaledVector(dirFromCenter, -downSpeed);
          }

          playerInput.grounded = true;
        } else {
          // Check if just barely above surface (within threshold)
          const aboveSurface = distFromCenter - targetDist;
          if (aboveSurface < 0.5) {
            // Close enough to consider grounded (for gentle slopes)
            playerInput.grounded = true;
          } else {
            playerInput.grounded = false;
          }
        }
      }
    }

    // ── Orient to surface normal ──

    const currentUp = new THREE.Vector3(0, 1, 0);
    currentUp.applyQuaternion(transform.rotation);
    const rotAxis = new THREE.Vector3().crossVectors(currentUp, _up);

    if (rotAxis.lengthSq() > 0.0001) {
      rotAxis.normalize();
      const angle = Math.acos(
        THREE.MathUtils.clamp(currentUp.dot(_up), -1, 1)
      );
      const correction = new THREE.Quaternion().setFromAxisAngle(
        rotAxis,
        angle * Math.min(1, dt * 8)
      );
      transform.rotation.premultiply(correction);
      transform.rotation.normalize();
    }
  }
}
