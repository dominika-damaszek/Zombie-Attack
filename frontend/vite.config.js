import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bypass: if the browser is navigating (Accept: text/html), serve the SPA.
// Only proxy fetch/XHR API calls to the backend.
const apiBypass = (req) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return req.url;
  }
  return null;
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/session': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/player': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: apiBypass,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
