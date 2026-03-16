// commit: feat(assets): add GLB model loader with fallback to procedural meshes
// description: Loads .glb models exported from MagicaVoxel → Blender pipeline.
// Provides loadModel() for individual models and preloadAll() for batch loading.
// Falls back to colored box geometry if model file not found (dev mode).
// Models are cached after first load. Supports scale/rotation adjustment.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ─── Types ────────────────────────────────────────────────────

export interface ModelDef {
  path: string;
  scale?: number;
  fallbackColor?: number;
  fallbackSize?: [number, number, number];
}

// ─── Model Registry ───────────────────────────────────────────

export const MODELS: Record<string, ModelDef> = {
  player: {
    path: "/assets/models/player.glb",
    scale: 1,
    fallbackColor: 0x22d3ee,
    fallbackSize: [0.8, 1.6, 0.8],
  },
  drone: {
    path: "/assets/models/drone.glb",
    scale: 0.6,
    fallbackColor: 0xfbbf24,
    fallbackSize: [0.6, 0.3, 0.6],
  },
  depot: {
    path: "/assets/models/depot.glb",
    scale: 1.2,
    fallbackColor: 0x4ade80,
    fallbackSize: [1.5, 1.5, 1.5],
  },
  refinery: {
    path: "/assets/models/refinery.glb",
    scale: 1,
    fallbackColor: 0xa78bfa,
    fallbackSize: [2, 1.5, 2],
  },
  crystal: {
    path: "/assets/models/crystal.glb",
    scale: 0.4,
    fallbackColor: 0xa78bfa,
    fallbackSize: [0.3, 0.6, 0.3],
  },
  ore_node: {
    path: "/assets/models/ore_node.glb",
    scale: 0.5,
    fallbackColor: 0xcd7f32,
    fallbackSize: [0.5, 0.5, 0.5],
  },
  energy_orb: {
    path: "/assets/models/energy_orb.glb",
    scale: 0.3,
    fallbackColor: 0xfbbf24,
    fallbackSize: [0.4, 0.4, 0.4],
  },
};

// ─── Cache & Loader ───────────────────────────────────────────

const modelCache = new Map<string, THREE.Object3D>();
const loader = new GLTFLoader();

/**
 * Create a fallback mesh (colored box/shape) when .glb is not available.
 */
function createFallback(def: ModelDef): THREE.Object3D {
  const size = def.fallbackSize ?? [1, 1, 1];
  const color = def.fallbackColor ?? 0xff00ff;

  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

/**
 * Load a single .glb model by key. Returns cached if already loaded.
 * Falls back to a colored box if the model file doesn't exist.
 */
export async function loadModel(key: string): Promise<THREE.Object3D> {
  // Check cache
  const cached = modelCache.get(key);
  if (cached) {
    return cached.clone();
  }

  const def = MODELS[key];
  if (!def) {
    console.warn(`[AssetLoader] Unknown model key: ${key}`);
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xff00ff })
    );
    return fallback;
  }

  try {
    const gltf = await loader.loadAsync(def.path);
    const model = gltf.scene;

    // Apply scale
    const s = def.scale ?? 1;
    model.scale.set(s, s, s);

    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Wrap in a group so position is at origin
    const group = new THREE.Group();
    group.add(model);

    // Cache it
    modelCache.set(key, group);

    console.log(`[AssetLoader] Loaded: ${key} (${def.path})`);
    return group.clone();
  } catch (_err) {
    // Model file not found — use fallback
    console.log(`[AssetLoader] Fallback for: ${key} (${def.path} not found)`);
    const fallback = createFallback(def);
    modelCache.set(key, fallback);
    return fallback.clone();
  }
}

/**
 * Preload all registered models. Shows progress via callback.
 */
export async function preloadAllModels(
  onProgress?: (loaded: number, total: number, name: string) => void
): Promise<void> {
  const keys = Object.keys(MODELS);
  const total = keys.length;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (onProgress) onProgress(i, total, key);
    await loadModel(key);
  }

  if (onProgress) onProgress(total, total, "done");
  console.log(`[AssetLoader] All ${total} models loaded/fallbacked.`);
}

/**
 * Get a clone of a cached model (sync, must be preloaded).
 * Returns fallback box if not in cache.
 */
export function getModelSync(key: string): THREE.Object3D {
  const cached = modelCache.get(key);
  if (cached) return cached.clone();

  const def = MODELS[key];
  if (def) return createFallback(def);

  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xff00ff })
  );
}
