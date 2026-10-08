import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Extract backend URL from environment, fallback to localhost
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'
  const wsUrl = env.VITE_WS_URL || 'ws://localhost:8000/ws'
  
  console.log(`[Vite Config] Mode: ${mode}`)
  console.log(`[Vite Config] Backend URL: ${env.VITE_API_BASE_URL}`)
  console.log(`[Vite Config] WebSocket URL: ${wsUrl}`)
  
  return {
    
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['zustand', 'clsx'],
          },
        },
      },
    },
    server: {
      host: env.VITE_SERVER_HOST || '0.0.0.0', // Listen on all network interfaces
      port: parseInt(env.VITE_SERVER_PORT || '3000'),
      strictPort: false, // Allow fallback to another port if taken
      open: false, // Don't auto-open browser on server
      allowedHosts: ['localhost', '127.0.0.1','vms2.0.haloocom.in','chatbot.haloocom.in'],
      // Proxy configuration for development (from environment)
      proxy: {
        // WebSocket proxy for real-time communication with backend
        '/ws': {
          target: wsUrl,
          ws: true,
          changeOrigin: true,
        },
        // API proxy if needed
        '/backend1': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: env.VITE_SERVER_HOST || '0.0.0.0', // Listen on all network interfaces
      port: parseInt(env.VITE_PREVIEW_PORT || '4173'),
      strictPort: false,
      open: false,
    },
  }
})
