import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://turfwar-backend.onrender.com', changeOrigin: true },
      '/socket.io': { target: 'https://turfwar-backend.onrender.com', ws: true },
    },
  },
});