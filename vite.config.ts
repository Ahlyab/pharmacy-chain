import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/inventory': 'http://localhost:3000',
      '/billing': 'http://localhost:3000',
      '/transaction': 'http://localhost:3000',
      '/pos': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
