import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import path from 'path';

export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      input: 'web/index.html'
    }
  },
  server: {
    port: 3001 // Different port to avoid conflict
  },
  plugins: [
    {
      name: 'copy-nojekyll',
      closeBundle() {
        copyFileSync('web/public/.nojekyll', '../dist/web/.nojekyll');
      }
    }
  ]
});
