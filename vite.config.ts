import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS alleen inschakelen wanneer expliciet gevraagd (VITE_HTTPS=1),
// zodat de gewone preview via HTTP op localhost blijft werken (USB-forwarding).
const useHttps = process.env.VITE_HTTPS === '1'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Project-pagina op GitHub Pages draait onder /arise-veldassistent/, lokaal blijft alles op '/'.
  base: command === 'build' ? '/arise-veldassistent/' : '/',
  // Bind aan alle netwerkinterfaces zodat de telefoon via wifi kan verbinden.
  preview: {
    host: true,
    port: 4173,
  },
  plugins: [
    ...(useHttps ? [basicSsl()] : []),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      workbox: {
        // Cache alle app-assets zodat de app volledig offline start.
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'ARISE Veldassistent',
        short_name: 'ARISE Veld',
        description:
          'Offline raadplegen van ARISE/NMV-paddenstoelengegevens en administreren van collecties.',
        lang: 'nl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f4f6f4',
        theme_color: '#1f6b3b',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
}))
