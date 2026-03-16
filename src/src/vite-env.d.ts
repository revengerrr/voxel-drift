// commit: fix: add vite env type declarations
// description: Declares Vite client types so TypeScript recognizes
// import.meta.env and custom VITE_ environment variables.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
