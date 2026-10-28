import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0', // reachable from other machines on the LAN
    port: 5173,
    proxy: {
      // When VITE_API_MODE=http, API calls go to /api/v1/... and are proxied to the backend
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000', changeOrigin: true },
    },
  },
})
