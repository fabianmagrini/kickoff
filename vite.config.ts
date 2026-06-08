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
      // better-auth's SQLite dialects import kysely constants that moved to
      // kysely/migration in 0.29.x. We use Neon so SQLite is dead code — skip bundling.
      rollupConfig: {
        external: (id: string) => id === 'kysely' || id.startsWith('kysely/'),
      },
    }),
    viteReact(),
  ],
  server: {
    port: 5173,
    strictPort: true, // fail fast instead of silently incrementing to 5174, 5175…
  },
  ssr: {
    // better-auth's SQLite dialects import kysely constants not on the main export
    // in 0.29.x; we use Neon so SQLite code is dead — externalize to skip bundling.
    external: ['kysely'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
