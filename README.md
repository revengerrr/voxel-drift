<div align="center">

# 🌌 Voxel Drift

### **Explore. Automate. Dominate the Leaderboard.**

<p align="center">
  <strong>A voxel space automation game with Galaxy-style gravity and drone programming</strong>
</p>

<p align="center">
  <a href="https://voxel-drift.vercel.app"><img src="https://img.shields.io/badge/Play-Live-00d4aa?style=for-the-badge&logo=vercel&logoColor=white" alt="Play Now"></a>
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Dev-Setup-7c3aed?style=for-the-badge&logo=rocket&logoColor=white" alt="Dev Setup"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/revengerrr/voxel-drift/stargazers"><img src="https://img.shields.io/github/stars/revengerrr/voxel-drift?style=for-the-badge&logo=github&color=e2e8f0" alt="Stars"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r170-049ef4?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Rapier-0.14-ef4444?style=flat-square" alt="Rapier">
  <img src="https://img.shields.io/badge/Miniplex-2.0-a78bfa?style=flat-square" alt="Miniplex">
  <img src="https://img.shields.io/badge/PixiJS-8.6-e91e8c?style=flat-square&logo=pixiv&logoColor=white" alt="PixiJS">
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<br/>

<img src="https://raw.githubusercontent.com/revengerrr/voxel-drift/main/public/assets/og-card.png" alt="Voxel Drift Screenshot" width="720"/>

<br/>

**[🎮 Play Now](https://voxel-drift.vercel.app)** · **[📖 Architecture](#-architecture)** · **[🗺️ Roadmap](#-roadmap)** · **[🤝 Contributing](#-contributing)**

</div>

---

## 🪐 What is Voxel Drift?

You're stranded in a star system full of tiny **voxel planetoids** — each with its own gravity field. Walk on any surface, **Mario Galaxy-style**. Harvest resources. Build infrastructure. And most importantly: **program your drone fleet** to automate everything.

The twist? Your leaderboard score depends on **how efficiently your drones work**, not how fast you click. Write better scripts → automate more → climb higher.

### The Core Loop

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│ EXPLORE  │────▸│ HARVEST  │────▸│ AUTOMATE │────▸│ EXPAND  │
│ Voxel    │     │ Mine &   │     │ Script   │     │ New     │
│ planets  │     │ collect  │     │ drones   │     │ planets │
└─────────┘     └─────────┘     └──────────┘     └────┬────┘
     ▲                                                  │
     └──────────── harder gravity puzzles ◀─────────────┘
```

### What Makes It Different

| Feature | Description |
|---------|-------------|
| 🪐 **Radial Gravity** | Walk on any surface of any planetoid. Jump between planets. Gravity is per-planet, not global |
| 🤖 **Drone Scripting** | Visual block editor to program autonomous drones. Your code runs in a sandboxed interpreter |
| 📊 **Automation Leaderboard** | Scored on efficiency ratio: drone output vs manual labor. Better scripts = higher rank |
| 🧱 **Procedural Voxels** | Every planetoid is noise-generated with ore veins, crystal deposits, and biomes |
| ⚡ **ECS Architecture** | Miniplex entity-component-system for clean, fast, extensible game logic |

---

## 🏗️ Architecture

Voxel Drift is built on an **Entity-Component-System** architecture using [miniplex](https://github.com/hmans/miniplex). Every game object is an entity with data-only components. Systems run each frame in a fixed pipeline:

```
 ┌──────────────────────────────────────────────────────┐
 │                    INPUT LAYER                        │
 │  InputSystem ──── ScriptExecutor ──── AIBehavior     │
 └────────────────────────┬─────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────┐
 │               PHYSICS LAYER (Rapier)                  │
 │  GravitySystem ── MovementSystem ── CollisionSystem  │
 │              Fixed 60Hz · Radial gravity              │
 └────────────────────────┬─────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────┐
 │                  GAME LOGIC LAYER                     │
 │  ResourceSys ── DroneSys ── BuildingSys ── ScoreSys  │
 └────────────────────────┬─────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────┐
 │                   RENDER LAYER                        │
 │  VoxelRenderer ──── CameraSystem ──── UIOverlay      │
 │     Three.js           Orbit cam        PixiJS       │
 └────────────────────────┬─────────────────────────────┘
                          ▼
 ┌──────────────────────────────────────────────────────┐
 │               PERSISTENCE LAYER                       │
 │    SaveSystem ──── LeaderboardSync ──── ScriptShare  │
 │                     Supabase                          │
 └──────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Tech | Role |
|-------|------|------|
| **Rendering** | Three.js r170 | 3D voxel worlds, instanced meshes, starfields |
| **Physics** | Rapier 0.14 (WASM) | Rigid bodies, colliders. Custom radial gravity on top |
| **ECS** | Miniplex 2.0 | Entities, components, cached queries, system pipeline |
| **UI** | PixiJS 8.6 + HTML | HUD overlay, drone status panel, script editor |
| **Backend** | Supabase (PostgreSQL) | Leaderboard, save states, script sharing |
| **Scripting** | Custom interpreter | Sandboxed drone scripts with 2ms/frame budget |
| **Build** | Vite 6 + TypeScript 5.7 | Fast HMR, WASM support, tree-shaking |
| **Deploy** | Vercel | Auto-deploy from GitHub, edge CDN |

### Key Entities

```typescript
// Player — walks on planets, collects resources, commands drones
{ transform, gravityBody, velocity, playerInput, inventory, score, isPlayer }

// Drone — autonomous worker, controlled by scripts
{ transform, gravityBody, velocity, drone, scriptRef, taskQueue, isDrone }

// Planetoid — voxel terrain with gravity field
{ transform, gravityField, voxelData, resourceDeposits, isPlanetoid }

// Building — player-placed structures
{ transform, building, production, isBuilding }
```

---

## 📁 Project Structure

```
voxel-drift/
├── public/
│   └── assets/
│       ├── models/          # .glb voxel models (player, drone, buildings)
│       ├── textures/        # Voxel palette textures
│       └── audio/           # SFX & ambient music
│
├── src/
│   ├── ecs/
│   │   ├── components.ts    # All component type definitions
│   │   ├── world.ts         # Miniplex world + entity factories
│   │   └── systems/
│   │       ├── GravitySystem.ts     # Radial gravity per planetoid
│   │       ├── MovementSystem.ts    # Gravity-aware character controller
│   │       ├── InputSystem.ts       # Keyboard + gamepad input
│   │       ├── ScriptExecutor.ts    # Sandboxed drone script runner
│   │       ├── VoxelRenderer.ts     # Instanced mesh + face culling
│   │       ├── CameraSystem.ts      # Gravity-aware orbital camera
│   │       └── ScoreSystem.ts       # Efficiency tracking + leaderboard
│   │
│   ├── voxel/
│   │   └── generator.ts     # Procedural planet generation (3D noise)
│   │
│   ├── scripting/
│   │   ├── interpreter.ts   # Block-to-instruction compiler
│   │   └── blocks.ts        # Visual block definitions
│   │
│   ├── ui/
│   │   ├── hud.ts           # PixiJS HUD overlay
│   │   └── editor.ts        # Drone script editor panel
│   │
│   ├── lib/
│   │   └── supabase.ts      # Leaderboard + persistence client
│   │
│   └── main.ts              # Entry point, game loop, init
│
├── supabase/
│   └── migrations/
│       └── 001_create_leaderboard.sql
│
├── index.html               # Game canvas + loading screen
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **pnpm**
- (Optional) **Supabase** account for leaderboard

### Run Locally

```bash
# Clone
git clone https://github.com/revengerrr/voxel-drift.git
cd voxel-drift

# Install dependencies
npm install

# (Optional) Configure Supabase for leaderboard
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
```

Open `http://localhost:5173` — you'll see a voxel planetoid with Galaxy-style gravity.

### Controls

| Key | Action |
|-----|--------|
| `W A S D` / `Arrows` | Move |
| `Space` | Jump |
| `E` | Interact / Mine |
| `Mouse` | Look around (click to lock) |
| `Tab` | Open drone script editor |
| `Esc` | Pause menu |

---

## 🗺️ Roadmap

### Phase 1: Core World ✅
- [x] Vite + Three.js + Rapier + Miniplex scaffold
- [x] Radial gravity system (Galaxy-style)
- [x] Procedural voxel planetoid generation
- [x] Player entity with gravity-aware movement
- [x] Orbital camera with smooth gravity transitions

### Phase 2: Terrain & Resources 🚧
- [ ] Greedy meshing optimization
- [ ] Mining mechanic (break voxels, collect resources)
- [ ] Resource types: ore, crystal, biomatter, energy
- [ ] Inventory UI (PixiJS overlay)

### Phase 3: Drone Scripting 🔮
- [ ] Drone entity with pathfinding
- [ ] Visual block editor (Blockly-inspired)
- [ ] Sandboxed script interpreter (2ms budget)
- [ ] Demo scripts: auto-mine, patrol, deposit

### Phase 4: Multi-Planet 🔮
- [ ] Multiple planetoids in a star system
- [ ] Gravity transitions (jump between planets)
- [ ] Building system (depot, refinery, launch pad)
- [ ] Planet-to-planet drone travel

### Phase 5: Leaderboard & Polish 🔮
- [ ] Supabase leaderboard integration
- [ ] Score: automation ratio, efficiency, exploration
- [ ] Sound effects & ambient music
- [ ] PixiJS HUD: stats, drone fleet panel, minimap

### Phase 6: Launch 🔮
- [ ] GitHub Pages / Vercel production deploy
- [ ] OG meta tags + share card
- [ ] Launch thread on X/Twitter
- [ ] Community feedback & iteration

---

## 🎮 Game Design

### Gravity System

Every planetoid emits a **radial gravity field**. Entities are pulled toward the nearest planet's center — not downward globally. This means:

- You can walk on any surface (top, bottom, sides)
- Jumping between planets transitions your "up" direction smoothly
- Drones must account for gravity when pathfinding across planets

```
        ·  ·  ·                    ·  ·  ·
      ·  ╭────╮  ·              ·  ╭────╮  ·
    ·  ╭─┤ 🧑 ├──╮  ·        ·  ╭─┤    ├──╮  ·
   · ──┤ Planet A ├── ·  ←→  · ──┤ Planet B ├── ·
    ·  ╰──────────╯  ·        ·  ╰─┤ 🤖 ├──╯  ·
      ·  ·  ·  ·  ·              ·  ╰────╯  ·
                                   ·  ·  ·
      Gravity → center             Gravity → center
```

### Drone Scripting

Drones run scripts written in a visual block language. Each tick, the executor processes one instruction per drone within a strict 2ms time budget.

**Instruction set:**

| Block | Description |
|-------|-------------|
| `MOVE [x,y,z]` | Navigate to target position |
| `MINE [resource]` | Extract resource at current location |
| `DEPOSIT` | Dump cargo at nearest depot |
| `WAIT [ticks]` | Idle for N ticks |
| `IF_FULL → [jump]` | Branch if cargo is full |
| `IF_EMPTY → [jump]` | Branch if cargo is empty |
| `LOOP → [jump]` | Unconditional jump (for loops) |

### Scoring

The leaderboard ranks players by a **composite score** that heavily rewards automation:

```
Score = (automated_harvest × 2)
      + (manual_harvest × 1)
      + (automation_ratio × 500)
      + (planets_explored × 100)
      + (time_bonus × 200)
```

A player who scripts 3 efficient drones will always outscore a player who mines manually for hours.

---

## 🖼️ Asset Pipeline

Voxel Drift uses **procedural generation** for terrain and supports multiple asset sources for entities:

| Asset Type | Source | Format | Location |
|-----------|--------|--------|----------|
| **Terrain** | Procedural (code) | Generated at runtime | `src/voxel/generator.ts` |
| **Player/Drone** | MagicaVoxel or code | `.glb` or BoxGeometry | `public/assets/models/` |
| **Buildings** | MagicaVoxel | `.glb` | `public/assets/models/` |
| **Free packs** | [Kenney.nl](https://kenney.nl/assets) (CC0) | `.glb` / `.png` | `public/assets/` |
| **Textures** | Palette-based | `.png` | `public/assets/textures/` |

### Creating Models with MagicaVoxel

1. Download [MagicaVoxel](https://ephtracy.github.io/) (free)
2. Create your model → Export as `.obj`
3. Import into [Blender](https://blender.org) → Export as `.glb`
4. (Optional) Compress with [gltfpack](https://github.com/zeux/meshoptimizer)
5. Place in `public/assets/models/`

---

## 🚢 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/revengerrr/voxel-drift)

**Or manually:**

```bash
# Build
npm run build

# Deploy (auto-detects Vite)
npx vercel --prod
```

**Environment variables** (set in Vercel dashboard):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration:
   ```bash
   # In Supabase SQL Editor, paste:
   # supabase/migrations/001_create_leaderboard.sql
   ```
3. Copy your project URL and anon key to `.env.local`

---

## 🤝 Contributing

Contributions are welcome! This is an indie project and every PR helps.

### How to Contribute

```bash
# Fork → Clone → Branch
git checkout -b feat/your-feature

# Make changes → Commit with conventional commits
git commit -m "feat(gravity): add gravity well visualization"

# Push → Open PR
git push origin feat/your-feature
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix a bug
chore(scope): tooling, deps, config
docs(scope): documentation only
refactor(scope): code restructure, no behavior change
```

### Areas That Need Help

- 🎨 **Voxel art** — MagicaVoxel models for player, drones, buildings
- 🎵 **Audio** — Ambient space music, mining SFX, UI sounds
- 🧩 **Script blocks** — New drone instructions and visual blocks
- 🧪 **Testing** — Unit tests for ECS systems
- 📱 **Mobile** — Touch controls and responsive UI

---

## 🔒 Security

- All secrets in environment variables (never committed)
- Supabase Row Level Security enabled
- Drone scripts run in a sandboxed interpreter (no `eval`, no DOM access)
- Leaderboard scores are insert-only (no updates or deletes)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

```
MIT License — Copyright (c) 2026 Voxel Drift Contributors
```

---

## 🙏 Credits

Built with obsession by **[@ClawdSign](https://github.com/revengerrr)** and Claude.

**Powered by:**
- [Three.js](https://threejs.org/) — 3D rendering
- [Rapier](https://rapier.rs/) — Physics engine
- [Miniplex](https://github.com/hmans/miniplex) — ECS framework
- [PixiJS](https://pixijs.com/) — 2D UI overlay
- [Supabase](https://supabase.com/) — Database & auth
- [Vite](https://vitejs.dev/) — Build tool
- [Vercel](https://vercel.com/) — Hosting

**Inspired by:**
- Super Mario Galaxy (gravity mechanics)
- Factorio (automation gameplay)
- The coding game referenced on X (drone scripting)
- The Mario movie browser game by [@ArtFromMemes](https://x.com) (architecture)

---

<div align="center">

### **Made with 🌌 in orbit**

**[⭐ Star this repo](https://github.com/revengerrr/voxel-drift)** if you think drones should do the work.

[![Star History Chart](https://api.star-history.com/svg?repos=revengerrr/voxel-drift&type=Date)](https://star-history.com/#revengerrr/voxel-drift&Date)

---

**[🎮 Play](https://voxel-drift.vercel.app)** · **[🐛 Report Bug](https://github.com/revengerrr/voxel-drift/issues)** · **[💡 Request Feature](https://github.com/revengerrr/voxel-drift/issues)** · **[🐦 Follow on X](https://x.com/ClawdSign)**

</div>
