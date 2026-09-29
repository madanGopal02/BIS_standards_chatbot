import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The frontend NEVER talks to an AI provider directly.
 * During development every /api request is proxied to the FastAPI backend so
 * there is no CORS preflight and the API key can never reach the browser.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: false,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },  
    },
    preview: {
      port: Number(env.VITE_PORT || 4173),
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
