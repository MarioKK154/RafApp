import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'RafApp',
        short_name: 'RafApp',
        description: 'Industrial OS for businesses',
        theme_color: '#1a202c',
        background_color: '#1a202c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // 5 MB
      }
    })
  ],
  resolve: {
    alias: {
      // Route FullCalendar CSS imports to an empty file so Vite doesn't error
      '@fullcalendar/common/main.css': path.resolve(__dirname, 'src/empty.css'),
      '@fullcalendar/daygrid/main.css': path.resolve(__dirname, 'src/empty.css'),
      '@fullcalendar/timegrid/main.css': path.resolve(__dirname, 'src/empty.css'),
      '@fullcalendar/list/main.css': path.resolve(__dirname, 'src/empty.css'),
    },
  },
})

// vite.config.js