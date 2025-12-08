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
  // Preview server configuration for Railway/production
  preview: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: process.env.PORT || 5173,
    strictPort: false,
    // Allow all Railway hosts
    allowedHosts: [
      'localhost',
      '.railway.app', // Allows all Railway subdomains
    ],
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

