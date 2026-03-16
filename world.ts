// commit: feat(ecs): create miniplex world and entity factories
// description: Initializes the miniplex ECS world with typed entities.
// Provides factory functions for spawning player, planetoid, drone,
// and building entities with sensible defaults. All game state lives
// here — systems read/write through world queries.

import { World } from "miniplex";
import * as THREE from "three";
import {
  GameEntity,
  ResourceType,
  DroneState,
  BuildingType,
  type Transform,
} from "./components";

// ─── World Instance ───────────────────────────────────────────

export const world = new World<GameEntity>();

// ─── Queries (cached for performance) ─────────────────────────

/** All entities with gravity bodies (affected by gravity) */
export const gravityBodies = world.with("transform", "gravityBody");

/** All planetoids with gravity fields */
export const planetoids = world.with(
  "transform",
  "gravityField",
  "isPlanetoid"
);

/** All planetoids with voxel data */
export const voxelPlanetoids = world.with(
  "transform",
  "voxelData",
  "isPlanetoid"
);

/** The player entity */
export const players = world.with("transform", "playerInput", "isPlayer");

/** All drones */
export const drones = world.with("transform", "drone", "isDrone");

/** Drones with scripts attached */
export const scriptedDrones = world.with(
  "transform",
  "drone",
  "scriptRef",
  "isDrone"
);

/** All buildings */
export const buildings = world.with("transform", "building", "isBuilding");

/** Buildings that produce resources */
export const producers = world.with("building", "production", "isBuilding");

/** All renderable entities */
export const renderables = world.with("transform", "meshRef");

// ─── Entity Factories ─────────────────────────────────────────

function createTransform(
  pos: [number, number, number] = [0, 0, 0]
): Transform {
  return {
    position: new THREE.Vector3(...pos),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
  };
}

/** Spawn the player entity */
export function spawnPlayer(position: [number, number, number] = [0, 10, 0]) {
  return world.add({
    transform: createTransform(position),
    gravityBody: {
      boundTo: null,
      gravityScale: 1,
      surfaceNormal: new THREE.Vector3(0, 1, 0),
    },
    velocity: {
      linear: new THREE.Vector3(),
      angular: new THREE.Vector3(),
    },
    playerInput: {
      moveDir: new THREE.Vector2(),
      jump: false,
      interact: false,
      grounded: false,
    },
    inventory: {
      items: new Map(),
      maxSlots: 20,
    },
    score: {
      manualHarvest: 0,
      automatedHarvest: 0,
      planetsExplored: 0,
      activeDrones: 0,
      automationRatio: 0,
      elapsedTime: 0,
    },
    isPlayer: { __tag: "IsPlayer" },
  });
}

/** Spawn a voxel planetoid */
export function spawnPlanetoid(
  position: [number, number, number],
  radius: number,
  gridSize: number = 32
) {
  return world.add({
    transform: createTransform(position),
    gravityField: {
      radius: radius * 3,
      strength: 9.81,
      center: new THREE.Vector3(...position),
    },
    voxelData: {
      grid: new Uint8Array(gridSize * gridSize * gridSize),
      size: gridSize,
      dirty: true,
    },
    resourceDeposits: {
      deposits: [],
    },
    isPlanetoid: { __tag: "IsPlanetoid" },
  });
}

/** Spawn a drone entity */
export function spawnDrone(
  position: [number, number, number],
  droneId: string
) {
  return world.add({
    transform: createTransform(position),
    gravityBody: {
      boundTo: null,
      gravityScale: 0.5,
      surfaceNormal: new THREE.Vector3(0, 1, 0),
    },
    velocity: {
      linear: new THREE.Vector3(),
      angular: new THREE.Vector3(),
    },
    drone: {
      droneId,
      state: DroneState.Idle,
      battery: 100,
      cargo: new Map(),
      maxCargo: 10,
    },
    taskQueue: {
      tasks: [],
      currentIndex: 0,
    },
    isDrone: { __tag: "IsDrone" },
  });
}

/** Spawn a building entity */
export function spawnBuilding(
  position: [number, number, number],
  type: BuildingType
) {
  const healthMap: Record<BuildingType, number> = {
    [BuildingType.Depot]: 200,
    [BuildingType.ChargingPad]: 100,
    [BuildingType.Refinery]: 150,
    [BuildingType.LaunchPad]: 250,
    [BuildingType.Beacon]: 50,
  };

  return world.add({
    transform: createTransform(position),
    building: {
      type,
      level: 1,
      health: healthMap[type],
      maxHealth: healthMap[type],
    },
    isBuilding: { __tag: "IsBuilding" },
  });
}
