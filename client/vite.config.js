import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    process: {
      env: {}
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'socket-vendor': ['socket.io-client'],
          'webrtc-vendor': ['simple-peer'],
          'utils': ['zustand', 'axios'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
    sourcemap: false, // Disable sourcemaps for production
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'socket.io-client', 'simple-peer']
  },
  resolve: {
    alias: {
      events: 'events',
      util: 'util',
      buffer: 'buffer',
    }
  }
})
