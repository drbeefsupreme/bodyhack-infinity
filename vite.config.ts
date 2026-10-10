import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { bodyhackApi } from './server/api.ts';

const root = import.meta.dirname;

export default defineConfig({
  base: './',
  plugins: [react(), bodyhackApi(root)],
  build: {
    rollupOptions: { input: { main: resolve(root, 'index.html'), shot: resolve(root, 'shot.html') } },
    chunkSizeWarningLimit: 1500,
  },
  server: { host: true },
});
