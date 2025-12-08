import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // Automatically open browser
    hmr: {
      overlay: true, // Show error overlay in browser
    },
  },
  // Optimize for faster HMR
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    // Production build optimizations
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'auth-vendor': ['@auth0/auth0-react'],
        },
      },
    },
  },
})

