import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Debug: log VITE_ env vars during build
console.log('[vite build] VITE_API_URL:', process.env.VITE_API_URL || '(not set)');
console.log('[vite build] NODE_ENV:', process.env.NODE_ENV || '(not set)');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
