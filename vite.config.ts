import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
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
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
