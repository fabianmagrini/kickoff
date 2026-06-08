import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    tanstackStart({
      // The *.server.ts feature files contain createServerFn calls which TanStack
      // Start transforms into HTTP RPC stubs on the client. Import-protection must
      // not block them or the client stub never runs and loaders hang indefinitely.
      importProtection: {
        client: {
          excludeFiles: ['**/features/**/*.server.*'],
        },
      },
    }), // MUST come before react()
    // nitro() handles the production server bundle.
    // On Vercel (VERCEL=1) it uses the Vercel preset → .vercel/output/.
    // Locally it uses the node-server preset → .output/server/index.mjs.
    nitro({
      preset: process.env.VERCEL ? 'vercel' : 'node-server',
    }),
    viteReact(),
  ],
  server: {
    port: 5173,
    strictPort: true, // fail fast instead of silently incrementing to 5174, 5175…
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // kysely 0.29.x removed DEFAULT_MIGRATION_TABLE/LOCK from its main entry.
      // better-auth's SQLite dialects still import them from 'kysely' (dead code
      // for us — we use Neon). This shim re-exports the full kysely surface plus
      // the two missing constants so the nitro bundle compiles and runs correctly.
      'kysely': path.resolve(__dirname, './src/lib/kysely-shim.js'),
    },
  },
});
