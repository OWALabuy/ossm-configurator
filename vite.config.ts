import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/ossm-configurator/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
