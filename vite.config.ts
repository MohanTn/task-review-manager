import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/client'),
  publicDir: resolve(__dirname, 'src/public'),
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5111',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/client'),
    },
  },
});
