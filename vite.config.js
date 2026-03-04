import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['LOGO APP.JPG', 'logo192.png', 'logo512.png', 'vite.svg'],
      manifest: {
        name: 'KARGoo - Gestión de Transportes',
        short_name: 'KARGoo',
        description: 'Aplicación para la gestión de transportes logísticos',
        theme_color: '#D32F2F',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'LOGO APP.JPG',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'LOGO APP.JPG',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'LOGO APP.JPG',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  }
})
