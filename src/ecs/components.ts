// commit: feat(ecs): define all component types for game entities
// description: Defines the full component schema for miniplex ECS.
// Components are plain objects attached to entities — systems query
// and mutate them each frame. Covers transform, physics, gravity,
// drones, scripting, resources, buildings, and scoring.

import * as THREE from "three";

// ─── Core Components ──────────────────────────────────────────

/** World-space position, rotation, scale */
export interface Transform {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
}

/** Link to a Three.js mesh for rendering */
export interface MeshRef {
  mesh: THREE.Object3D;
}

// ─── Physics Components ───────────────────────────────────────

/** Rapier rigid body handle */
export interface RigidBodyRef {
  handle: number;
}

/** Affected by nearest planetoid's gravity */
export interface GravityBody {
  /** Which planetoid entity this body is bound to */
  boundTo: number | null;
  /** Gravity strength multiplier */
  gravityScale: number;
  /** Surface normal (up direction relative to planetoid) */
  surfaceNormal: THREE.Vector3;
}

/** Entity that has a velocity (for kinematic movement) */
export interface Velocity {
  linear: THREE.Vector3;
  angular: THREE.Vector3;
}

// ─── Planetoid Components ─────────────────────────────────────

/** Defines a gravity field around an entity */
export interface GravityField {
  /** Radius of gravity influence */
  radius: number;
  /** Gravity strength (m/s²) */
  strength: number;
  /** Center of gravity in world space (auto-synced from Transform) */
  center: THREE.Vector3;
}

/** Voxel terrain data for a planetoid */
export interface VoxelData {
  /** 3D voxel grid — 0 = air, >0 = block type */
  grid: Uint8Array;
  /** Grid dimensions */
  size: number;
  /** Whether the mesh needs rebuilding */
  dirty: boolean;
}

/** Resource deposits on a planetoid */
export interface ResourceDeposits {
  deposits: Array<{
    type: ResourceType;
    position: THREE.Vector3;
    amount: number;
    maxAmount: number;
  }>;
}

export enum ResourceType {
  Ore = 1,
  Crystal = 2,
  BioMatter = 3,
  Energy = 4,
}

// ─── Player Components ────────────────────────────────────────

export interface PlayerInput {
  moveDir: THREE.Vector2;
  jump: boolean;
  interact: boolean;
  /** Is the player grounded on a surface? */
  grounded: boolean;
}

export interface Inventory {
  items: Map<ResourceType, number>;
  maxSlots: number;
}

// ─── Drone Components ─────────────────────────────────────────

export interface Drone {
  /** Unique drone ID within the fleet */
  droneId: string;
  /** Current operational state */
  state: DroneState;
  /** Battery level 0-100 */
  battery: number;
  /** Cargo capacity */
  cargo: Map<ResourceType, number>;
  maxCargo: number;
}

export enum DroneState {
  Idle = "idle",
  Executing = "executing",
  Returning = "returning",
  Charging = "charging",
  Error = "error",
}

/** Reference to a script that controls this drone */
export interface ScriptRef {
  /** Script source (block-based serialized or text) */
  scriptId: string;
  /** Current execution pointer */
  programCounter: number;
  /** Script-local variables */
  memory: Map<string, number>;
  /** Ticks until next instruction */
  cooldown: number;
}

/** Task queue for drone operations */
export interface TaskQueue {
  tasks: Array<{
    type: "move" | "mine" | "deposit" | "wait";
    target?: THREE.Vector3;
    resourceType?: ResourceType;
    duration?: number;
  }>;
  currentIndex: number;
}

// ─── Building Components ──────────────────────────────────────

export interface Building {
  type: BuildingType;
  level: number;
  health: number;
  maxHealth: number;
}

export enum BuildingType {
  Depot = "depot",
  ChargingPad = "charging_pad",
  Refinery = "refinery",
  LaunchPad = "launch_pad",
  Beacon = "beacon",
}

export interface Production {
  /** What resource this building produces */
  outputType: ResourceType;
  /** Resources produced per tick */
  rate: number;
  /** Input resources required */
  inputCost: Map<ResourceType, number>;
  /** Ticks until next production */
  cooldown: number;
  currentCooldown: number;
}

// ─── Score Components ─────────────────────────────────────────

export interface Score {
  /** Total resources collected (manual) */
  manualHarvest: number;
  /** Total resources collected (by drones) */
  automatedHarvest: number;
  /** Number of planetoids explored */
  planetsExplored: number;
  /** Number of active drones */
  activeDrones: number;
  /** Efficiency ratio: automated / total */
  automationRatio: number;
  /** Time elapsed in seconds */
  elapsedTime: number;
}

// ─── Tag Components (marker types) ────────────────────────────

/** Marks entity as the local player */
export interface IsPlayer {
  __tag: "IsPlayer";
}

/** Marks entity as a planetoid */
export interface IsPlanetoid {
  __tag: "IsPlanetoid";
}

/** Marks entity as a drone */
export interface IsDrone {
  __tag: "IsDrone";
}

/** Marks entity as a building */
export interface IsBuilding {
  __tag: "IsBuilding";
}

// ─── Entity Type (union of all possible components) ───────────

export interface GameEntity {
  transform?: Transform;
  meshRef?: MeshRef;
  rigidBodyRef?: RigidBodyRef;
  gravityBody?: GravityBody;
  velocity?: Velocity;
  gravityField?: GravityField;
  voxelData?: VoxelData;
  resourceDeposits?: ResourceDeposits;
  playerInput?: PlayerInput;
  inventory?: Inventory;
  drone?: Drone;
  scriptRef?: ScriptRef;
  taskQueue?: TaskQueue;
  building?: Building;
  production?: Production;
  score?: Score;
  isPlayer?: IsPlayer;
  isPlanetoid?: IsPlanetoid;
  isDrone?: IsDrone;
  isBuilding?: IsBuilding;
}
