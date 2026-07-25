import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
      external: [
        '@capacitor/filesystem',
        '@capacitor/core'
      ]
    },
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['@capacitor/filesystem', '@capacitor/core']
  }
});
