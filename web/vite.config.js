import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: '/vitalk/',
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      input: 'web/index.html'
    }
  },
  server: {
    port: 3001 // Different port to avoid conflict
  }
});
