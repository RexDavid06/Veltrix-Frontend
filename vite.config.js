import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://ais-dev-kpzdvdmrek7cuieuepr6ud-40509995081.europe-west3.run.app'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: BACKEND_URL.replace(/^http/, 'ws'),
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
