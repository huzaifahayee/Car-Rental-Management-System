import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite validates the request Host header against this list; without it,
    // `<tenant-slug>.localhost:5173` requests get rejected outright.
    allowedHosts: ['.localhost'],
  },
})