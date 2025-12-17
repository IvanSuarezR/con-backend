import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://condominio-backend-741019382008.us-central1.run.app',
        // target: 'https://localhotst:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
