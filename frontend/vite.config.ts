import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icon-192.png', 'icon-512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB to allow VideoCallPage chunk
      },
      manifest: {
        name: 'NetraAI',
        short_name: 'NetraAI',
        description: 'AI-powered telemedicine platform',
        theme_color: '#2E7D32',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  envDir: '../',

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'motion-vendor': ['motion'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'excel-vendor': ['xlsx'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', 'lucide-react'],
          'ai-vendor': ['framer-motion', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 2500, // Increase warning limit to 2500 KB for heavy Video/AI modules
  },
})
