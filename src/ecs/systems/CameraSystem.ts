// commit: feat(render): implement gravity-aware camera system
// description: Third-person camera that respects the local "up" direction
// from the player's GravityBody. Orbits around the player with mouse
// control, smoothly reorients when gravity direction changes (e.g.
// jumping between planetoids). Provides cameraForward vector for
// the MovementSystem.

import * as THREE from "three";
import { players } from "../world";

// ─── Camera Config ────────────────────────────────────────────

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;
const CAMERA_SMOOTH = 0.08;
const LOOK_SMOOTH = 0.12;
const MOUSE_SENSITIVITY = 0.003;

// ─── State ────────────────────────────────────────────────────

let camera: THREE.PerspectiveCamera | null = null;
let yaw = 0;
let pitch = -0.3;

const _targetPos = new THREE.Vector3();
const _cameraPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _smoothUp = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _offset = new THREE.Vector3();

/** Current camera forward direction (used by MovementSystem) */
export const cameraForward = new THREE.Vector3(0, 0, -1);

// ─── Init ─────────────────────────────────────────────────────

export function initCameraSystem(cam: THREE.PerspectiveCamera): void {
  camera = cam;

  // Mouse look
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement) {
      yaw -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = THREE.MathUtils.clamp(pitch, -1.2, 0.8);
    }
  });

  // Pointer lock on click
  document.addEventListener("click", () => {
    const canvas = document.getElementById("game-canvas");
    if (canvas && !document.pointerLockElement) {
      canvas.requestPointerLock();
    }
  });
}

/**
 * CameraSystem — runs each render frame.
 *
 * 1. Get player position + surfaceNormal (local "up")
 * 2. Build orbit offset using yaw/pitch relative to local up
 * 3. Smooth position + lookAt + up vector
 * 4. Export cameraForward for MovementSystem
 */
export function cameraSystem(_dt: number): void {
  if (!camera) return;

  const player = players.entities[0];
  if (!player?.transform || !player.gravityBody) return;

  const playerPos = player.transform.position;
  const surfaceNormal = player.gravityBody.surfaceNormal;

  // Smooth the up vector (prevents jitter during gravity transitions)
  _smoothUp.lerp(surfaceNormal, CAMERA_SMOOTH * 2);
  _smoothUp.normalize();

  // Build local coordinate frame from smoothed up
  _up.copy(_smoothUp);

  // Forward = rotate around up by yaw
  _forward.set(0, 0, 1);
  _forward.applyAxisAngle(_up, yaw);

  // Right = forward × up
  _right.crossVectors(_forward, _up).normalize();

  // Re-orthogonalize forward
  _forward.crossVectors(_up, _right).normalize();

  // Apply pitch (rotate around right axis)
  _offset.copy(_forward);
  _offset.applyAxisAngle(_right, pitch);

  // Camera position = player + offset * distance + up * height
  _targetPos.copy(playerPos);
  _targetPos.addScaledVector(_offset, CAMERA_DISTANCE);
  _targetPos.addScaledVector(_up, CAMERA_HEIGHT);

  // Smooth camera position
  _cameraPos.copy(camera.position);
  _cameraPos.lerp(_targetPos, CAMERA_SMOOTH);
  camera.position.copy(_cameraPos);

  // Smooth look-at (slightly above player)
  _lookAt.copy(playerPos).addScaledVector(_up, 1.5);
  camera.lookAt(_lookAt);

  // Override camera up
  camera.up.copy(_smoothUp);

  // Export camera forward for movement system
  cameraForward.copy(playerPos).sub(camera.position).normalize();
  // Project onto surface plane
  cameraForward.sub(
    _smoothUp.clone().multiplyScalar(cameraForward.dot(_smoothUp))
  );
  cameraForward.normalize();
}
