import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // reachable from other machines on the LAN
    port: 5173,
    proxy: {
      // Backend API (wire up when the server is ready)
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
