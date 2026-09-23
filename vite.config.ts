import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,        // auto-open browser on start
    strictPort: true,  // fail instead of auto-incrementing if port is taken
  },
  // maplibre-gl constructs its worker via a URL relative to its own module;
  // Vite's dep pre-bundling breaks that URL, so it's excluded here.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
