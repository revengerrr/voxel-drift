# commit: docs: add contributing guide
# description: Guidelines for contributors including dev setup,
# commit conventions, PR process, and code standards.

# Contributing to Voxel Drift

Thanks for wanting to help build Voxel Drift! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/revengerrr/voxel-drift.git
cd voxel-drift
npm install
npm run dev
```

## Commit Messages

We use **Conventional Commits**:

```
feat(gravity): add gravity well particle effects
fix(camera): prevent jitter during planet transition
chore(deps): update three.js to r171
docs(readme): add asset pipeline section
refactor(ecs): extract shared query helpers
```

**Scopes:** `gravity`, `camera`, `input`, `voxel`, `drone`, `script`, `score`, `ui`, `render`, `ecs`, `db`, `deps`, `docs`

## Pull Request Process

1. Fork and create a feature branch from `main`
2. Make your changes with clear, scoped commits
3. Test locally with `npm run dev`
4. Run `npm run build` to verify no TS errors
5. Open a PR with a description of what changed and why

## Code Standards

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Components are data-only** — no methods, no logic
- **Systems are pure functions** — `(dt: number) => void`
- **No singletons** — pass dependencies explicitly
- **File naming** — PascalCase for systems, camelCase for utilities

## Project Architecture

All game state lives in the ECS world (`src/ecs/world.ts`). Systems query entities and mutate components. No global mutable state outside the world.

If you're adding a new game mechanic:
1. Define new components in `components.ts`
2. Create a system in `systems/`
3. Add cached queries in `world.ts`
4. Wire the system into the game loop in `main.ts`
