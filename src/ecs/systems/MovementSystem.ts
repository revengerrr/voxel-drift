// commit: feat(physics): implement gravity-aware movement system
// description: Character controller that works on any surface orientation.
// Uses the GravityBody's surfaceNormal as "up" to project movement
// input onto the local tangent plane. Supports walking on spherical
// planetoids, jumping, and velocity damping.

import * as THREE from "three";
import { players } from "../world";

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _up = new THREE.Vector3();

/** Movement tuning constants */
const MOVE_SPEED = 8.0;
const JUMP_FORCE = 12.0;
const GROUND_DAMPING = 0.85;
const AIR_DAMPING = 0.98;

/**
 * MovementSystem — runs each physics tick.
 *
 * Projects player input onto the local surface plane (defined by
 * GravityBody.surfaceNormal) so movement always feels "forward"
 * relative to the camera, regardless of which planetoid surface
 * the player is walking on.
 */
export function movementSystem(dt: number, cameraForward: THREE.Vector3): void {
  for (const entity of players.entities) {
    const { transform, playerInput, gravityBody, velocity } = entity;
    if (!transform || !playerInput || !gravityBody || !velocity) continue;

    _up.copy(gravityBody.surfaceNormal);

    // Project camera forward onto local surface plane
    _forward.copy(cameraForward);
    _forward.sub(_up.clone().multiplyScalar(_forward.dot(_up)));
    _forward.normalize();

    // Right vector = forward × up
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

    // Apply velocity to position
    transform.position.addScaledVector(velocity.linear, dt);

    // Damping
    const damping = playerInput.grounded ? GROUND_DAMPING : AIR_DAMPING;
    velocity.linear.multiplyScalar(damping);

    // Orient entity to align with surface normal
    // Build a rotation quaternion that aligns local Y with surfaceNormal
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
