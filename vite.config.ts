import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  base: '/DONKEY-KONG/',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    open: true,
  },
})

