import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/llm-proxy': {
        target: 'http://textin-llm-extract-bidding.ai.intsig.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-proxy/, ''),
      },
    },
  },
})
