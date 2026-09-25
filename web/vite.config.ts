import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  server: {
    port: 3000,
    open: true,        // auto-open browser on start
    strictPort: true,  // fail instead of auto-incrementing if port is taken
    proxy: {
      // Browser telemetry goes to the collector's OTLP HTTP port through the
      // dev server, so requests are same-origin and need no CORS setup.
      '/otlp': {
        target: 'http://localhost:4318',
        rewrite: (path) => path.replace(/^\/otlp/, ''),
      },
    },
  },
  // maplibre-gl constructs its worker via a URL relative to its own module;
  // Vite's dep pre-bundling breaks that URL, so it's excluded here.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
