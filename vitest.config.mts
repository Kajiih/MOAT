import path from 'node:path';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/e2e/**'],
      alias: {
        '@': path.resolve(__dirname, './src/'),
      },
      env: {
        ...env,
      },
    },
  };
});
