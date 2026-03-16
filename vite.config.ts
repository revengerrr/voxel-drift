// commit: chore: configure vite with wasm support and path aliases
// description: Sets up Vite build tool with TypeScript path aliases,
// WASM support for Rapier physics engine, and optimized chunking
// for Three.js and other large dependencies.

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["@dimforge/rapier3d-compat"],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          rapier: ["@dimforge/rapier3d-compat"],
          pixi: ["pixi.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
