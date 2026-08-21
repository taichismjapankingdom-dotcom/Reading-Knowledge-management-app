import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Reading Knowledge Base',
        short_name: 'ReadingKB',
        description: 'A beautiful personal reading knowledge management system',
        theme_color: '#f7f9fa',
        background_color: '#f7f9fa',
        display: 'standalone',
        icons: [
          {
            src: 'cover1.png', // Fallback placeholder icon
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'cover1.png', // Fallback placeholder icon
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
