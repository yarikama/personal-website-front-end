/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    // Vitest empties CSS by default; textWrap.test.ts reads the site's own
    // stylesheet as text, so that one file keeps its content.
    css: { include: [/src\/index\.css/] },
  },
})