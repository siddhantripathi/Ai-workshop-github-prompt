import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/analyze': {
        target: 'https://tripps.app.n8n.cloud',
        changeOrigin: true,
        rewrite: () => '/webhook/github-analyzer',
        secure: true,
      },
    },
  },
})
