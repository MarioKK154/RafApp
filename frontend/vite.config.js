import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
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