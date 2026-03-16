# commit: docs: add asset pipeline guide for MagicaVoxel workflow
# description: Step-by-step guide for creating voxel models in MagicaVoxel,
# exporting via Blender to .glb, and loading into the game.

# Asset Pipeline Guide

## Overview

```
MagicaVoxel (.vox) → Blender (.blend) → Export (.glb) → /public/assets/models/ → Game
```

## Step 1: Download Tools

### MagicaVoxel (Free)
- **Download:** https://ephtracy.github.io/
- **Version:** 0.99.7.2 (latest)
- Windows & macOS
- Just unzip and run, no install needed

### Blender (Free)
- **Download:** https://www.blender.org/download/
- **Version:** 4.2+ recommended
- Install the MagicaVoxel importer addon:
  - Go to: https://extensions.blender.org/add-ons/blender-magicavoxel/
  - Download and install via Blender → Edit → Preferences → Add-ons → Install from Disk

## Step 2: Create Models in MagicaVoxel

### Models We Need

| Model | Description | Suggested Size | Notes |
|-------|------------|----------------|-------|
| `player.vox` | Player character | 8×16×8 voxels | Humanoid shape, cyan/teal colors |
| `drone.vox` | Autonomous drone | 6×3×6 voxels | Flat, mechanical look, amber/yellow |
| `depot.vox` | Resource depot building | 12×12×12 voxels | Boxy, green accents |
| `refinery.vox` | Refinery building | 16×12×16 voxels | Industrial, purple accents |
| `crystal.vox` | Crystal collectible | 3×6×3 voxels | Pointy, purple/pink |
| `ore_node.vox` | Ore deposit marker | 5×5×5 voxels | Rocky, copper/brown |
| `energy_orb.vox` | Energy collectible | 4×4×4 voxels | Round, glowing yellow |

### MagicaVoxel Tips

- **Color palette:** Use 6-8 colors max per model for clean voxel look
- **Keep it small:** 8-16 voxels per axis is ideal for game performance
- **Save as:** `.vox` format (default)
- **Tip:** Start with the player model — it's the most visible

### Suggested Color Palette

```
Player:    #22D3EE (cyan), #0E7490 (dark cyan), #164E63 (shadow)
Drone:     #FBBF24 (amber), #D97706 (dark amber), #78716C (metal gray)
Buildings: #4ADE80 (green), #166534 (dark green), #374151 (concrete)
Crystal:   #A78BFA (purple), #7C3AED (dark purple), #DDD6FE (glow)
Ore:       #CD7F32 (copper), #92400E (dark brown), #57534E (rock)
Energy:    #FBBF24 (yellow), #FDE047 (light yellow), #FFFFFF (glow)
```

## Step 3: Export from MagicaVoxel → Blender → GLB

### Option A: Direct OBJ Export (Simple)

1. In MagicaVoxel: **File → Export → obj**
2. Open Blender → **File → Import → Wavefront (.obj)**
3. Select your model, adjust if needed
4. **File → Export → glTF 2.0 (.glb/.gltf)**
   - Format: **glTF Binary (.glb)** ← important!
   - Include: ✅ Mesh, ✅ Materials
   - Uncheck: ❌ Cameras, ❌ Lights, ❌ Custom Properties
5. Save to `public/assets/models/player.glb`

### Option B: Direct VOX Import (Better)

1. Install Blender MagicaVoxel addon (see Step 1)
2. Open Blender → **File → Import → MagicaVoxel (.vox)**
3. Settings:
   - Meshing: **Greedy** (optimized mesh, fewer polygons)
   - Material: **Textured Models (UV unwrap)** (best for games)
   - Voxel Size: **1.0**
4. Adjust materials/colors if needed
5. **File → Export → glTF 2.0 (.glb/.gltf)**
   - Same settings as Option A

### Blender Adjustments (Optional)

Before exporting, you can tweak in Blender:
- **Scale:** Select model → S → type number → Enter
- **Origin:** Right-click → Set Origin → Origin to Geometry
- **Materials:** Switch to Material Preview mode, adjust colors
- **Decimate:** If too many polygons, add Decimate modifier (ratio 0.5)

## Step 4: Place Files in Project

```
public/
  assets/
    models/
      player.glb      ← Player character
      drone.glb        ← Drone entity
      depot.glb        ← Depot building
      refinery.glb     ← Refinery building
      crystal.glb      ← Crystal collectible
      ore_node.glb     ← Ore deposit marker
      energy_orb.glb   ← Energy collectible
```

Push to GitHub → Vercel auto-deploys with static assets.

## Step 5: Models Load Automatically

The `AssetLoader.ts` handles everything:

```typescript
import { loadModel, preloadAllModels } from "./lib/AssetLoader";

// Preload all at startup (with progress)
await preloadAllModels((loaded, total, name) => {
  console.log(`Loading ${name}... (${loaded}/${total})`);
});

// Get a model instance for an entity
const playerMesh = await loadModel("player");
scene.add(playerMesh);
```

**If a .glb file is missing**, the loader automatically creates a colored box as placeholder. So you can develop without models and add them later — the game never breaks.

## File Size Guidelines

| Type | Target Size | Why |
|------|-------------|-----|
| Player | < 50 KB | Loaded once, always visible |
| Drone | < 30 KB | Multiple instances |
| Buildings | < 100 KB | Few per planet |
| Collectibles | < 20 KB | Many instances, needs instancing |

### Optimizing GLB Size

1. **Greedy meshing** in Blender addon (reduces polygons 60-80%)
2. **gltfpack** compression: `gltfpack -i model.glb -o model_opt.glb`
   - Download: https://github.com/zeux/meshoptimizer
3. **Draco compression** in Blender export settings
4. Keep voxel models small (max 32×32×32)

## Workflow Summary

```
1. Open MagicaVoxel → create model → save .vox
2. Open Blender → import .vox → adjust → export .glb
3. Copy .glb to public/assets/models/
4. Push to GitHub → Vercel deploys
5. Game loads model automatically (or uses fallback box)
```

That's it! Start with the player model — once you see your custom character walking on the planetoid, the rest follows naturally.
