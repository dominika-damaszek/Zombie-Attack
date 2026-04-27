import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Redirect all 404s to index.html so React Router handles the route on refresh
    historyApiFallback: true,
  },
})
