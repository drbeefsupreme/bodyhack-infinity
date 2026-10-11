import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import capacitor from '../../capacitor.config.ts';

// The web part of the Android app: only the pages the app opens, and no public/ copy (public/model and
// public/mediapipe are 72 MB the app never loads). build.sh adds public/model-lite.
const root = resolve(import.meta.dirname, '../..');
const { webDir, server } = capacitor;
const startPage = server?.appStartPath;
if (!webDir || !startPage) throw new Error('capacitor.config.ts must set webDir and server.appStartPath');

export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [
    react(),
    {
      // Capacitor requires an index.html; the app opens appStartPath, and the local server falls back to index.html
      // for unknown paths, so it forwards there.
      name: 'capacitor-index',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'index.html',
          source: `<!doctype html>\n<meta http-equiv="refresh" content="0; url=${startPage}">\n`,
        });
      },
    },
  ],
  build: {
    outDir: resolve(root, webDir),
    emptyOutDir: true,
    rollupOptions: { input: { start: join(root, startPage) } },
    chunkSizeWarningLimit: 1500,
  },
});
