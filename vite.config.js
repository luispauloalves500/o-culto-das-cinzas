import { defineConfig } from 'vite';

// base relativa para funcionar em https://<usuario>.github.io/o-culto-das-cinzas/
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
});
