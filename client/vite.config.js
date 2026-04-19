import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// COOP/COEP/CORP are required for SharedArrayBuffer + OPFS Worker threads (Phase 2+).
// They must match the prod nginx config in client/nginx.conf — if one strays, drift will
// only surface in the other tier and be a nightmare to diagnose.
const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sqlite-wasm ships its own WASM + Worker files alongside the ES module and
  // locates them via `new URL(..., import.meta.url)`. Vite's esbuild prebundling
  // breaks that resolution — exclude it and the import stays intact.
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    headers: crossOriginHeaders,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://server:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    headers: crossOriginHeaders,
  },
})
