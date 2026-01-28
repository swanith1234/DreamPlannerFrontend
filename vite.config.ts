import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://dreamplanner-lbm7.onrender.com',
        changeOrigin: true,
        secure: false, // In case of SSL issues locally, usually fine
      },
      '/ws': {
        target: 'wss://dreamplanner-lbm7.onrender.com',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
