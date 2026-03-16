// commit: feat: implement main game loop with fixed timestep physics
// description: Entry point for Voxel Drift. Initializes Rapier physics
// (WASM), Three.js renderer, and all ECS systems. Runs a fixed-timestep
// physics loop (60Hz) decoupled from the render loop (rAF). Spawns
// initial planetoid and player for Phase 1 prototype.

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

// ECS
import { spawnPlayer, spawnPlanetoid } from "./ecs/world";

// Systems
import { gravitySystem } from "./ecs/systems/GravitySystem";
import { movementSystem } from "./ecs/systems/MovementSystem";
import { inputSystem, initInputSystem } from "./ecs/systems/InputSystem";
import { scriptExecutorSystem } from "./ecs/systems/ScriptExecutor";
import { scoreSystem } from "./ecs/systems/ScoreSystem";
import {
  voxelRenderSystem,
  initVoxelRenderer,
} from "./ecs/systems/VoxelRenderer";
import {
  cameraSystem,
  initCameraSystem,
  cameraForward,
} from "./ecs/systems/CameraSystem";
import { miningSystem } from "./ecs/systems/MiningSystem";

// UI
import { initHUD, updateHUD } from "./ui/hud";

// Voxel generation
import { generatePlanet } from "./voxel/generator";

// ─── Loading Screen ───────────────────────────────────────────

function updateLoading(progress: number, status: string): void {
  const fill = document.getElementById("loader-fill");
  const text = document.getElementById("loading-status");
  if (fill) fill.style.width = `${progress}%`;
  if (text) text.textContent = status;
}

function hideLoading(): void {
  const screen = document.getElementById("loading-screen");
  if (screen) screen.classList.add("hidden");
}

// ─── Main Init ────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Init Rapier WASM
  updateLoading(10, "Loading physics engine...");
  await RAPIER.init();
  const gravity = new RAPIER.Vector3(0, 0, 0); // We handle gravity ourselves
  const physicsWorld = new RAPIER.World(gravity);

  // 2. Init Three.js
  updateLoading(30, "Setting up renderer...");
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090b);
  scene.fog = new THREE.FogExp2(0x09090b, 0.008);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.5);
  sunLight.position.set(50, 80, 30);
  sunLight.castShadow = false; // Enable later for polish
  scene.add(sunLight);

  // Subtle fill light from below
  const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
  fillLight.position.set(-20, -40, -10);
  scene.add(fillLight);

  // Starfield background
  const starCount = 2000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 400;
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3)
  );
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(starGeom, starMat));

  // 3. Init systems
  updateLoading(50, "Initializing systems...");
  initVoxelRenderer(scene);
  initCameraSystem(camera);
  initInputSystem();
  initHUD();

  // 4. Generate first planetoid
  updateLoading(70, "Generating planetoid...");
  const planetData = generatePlanet({
    size: 32,
    radius: 12,
    noiseScale: 0.08,
    heightVariation: 3,
    seed: 42,
  });

  const planetoid = spawnPlanetoid([0, 0, 0], 12, 32);
  if (planetoid.voxelData) {
    planetoid.voxelData.grid = planetData.grid;
    planetoid.voxelData.dirty = true;
  }
  if (planetoid.resourceDeposits) {
    planetoid.resourceDeposits.deposits = planetData.deposits;
  }

  // 5. Spawn player above planetoid surface
  updateLoading(85, "Spawning player...");
  const playerEntity = spawnPlayer([0, 18, 0]);

  // Temporary player mesh (cube placeholder)
  const playerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.6, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x22d3ee })
  );
  scene.add(playerMesh);

  // 6. Resize handler
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 7. Hide loading
  updateLoading(100, "Ready!");
  await new Promise((r) => setTimeout(r, 400));
  hideLoading();

  // ─── Game Loop ────────────────────────────────────────────

  const PHYSICS_HZ = 60;
  const PHYSICS_DT = 1 / PHYSICS_HZ;
  let accumulator = 0;
  let lastTime = performance.now();

  function gameLoop(now: number): void {
    requestAnimationFrame(gameLoop);

    const frameTime = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
    lastTime = now;
    accumulator += frameTime;

    // ── Fixed-step physics (60Hz) ──
    while (accumulator >= PHYSICS_DT) {
      // Input
      inputSystem();

      // Scripts
      scriptExecutorSystem(PHYSICS_DT);

      // Physics
      gravitySystem(PHYSICS_DT);
      movementSystem(PHYSICS_DT, cameraForward);

      // Rapier step (for future colliders)
      physicsWorld.step();

      // Game logic
      miningSystem(PHYSICS_DT, cameraForward);
      scoreSystem(PHYSICS_DT);

      accumulator -= PHYSICS_DT;
    }

    // ── Render (every frame) ──

    // Sync player mesh with ECS transform
    if (playerEntity.transform) {
      playerMesh.position.copy(playerEntity.transform.position);
      playerMesh.quaternion.copy(playerEntity.transform.rotation);
    }

    // Camera
    cameraSystem(frameTime);

    // Voxel mesh updates
    voxelRenderSystem();

    // UI
    updateHUD();

    // Draw
    renderer.render(scene, camera);
  }

  requestAnimationFrame(gameLoop);
}

// ─── Boot ─────────────────────────────────────────────────────

main().catch((err) => {
  console.error("[VoxelDrift] Fatal error:", err);
  updateLoading(0, `Error: ${err.message}`);
});
