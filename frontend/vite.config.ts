import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/bot_call/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true,
  },
})
