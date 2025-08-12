import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VITE_BASE_URL, VITE_BASE_URL_VERCEL, VITE_IS_VERCEL } from './src/data';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // update it according to the backend port
      '/inventory': VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL,
      '/billing': VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL,
      '/transaction': VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL,
      '/pos': VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL,
      '/api': VITE_IS_VERCEL ? VITE_BASE_URL_VERCEL : VITE_BASE_URL,
    },
  },
});
