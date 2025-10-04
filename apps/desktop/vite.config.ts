import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@polynote/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@polynote/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@polynote/security': path.resolve(__dirname, '../../packages/security/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
