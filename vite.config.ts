import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // './' en local ; /oxford-3000/ pour GitHub Pages (voir .github/workflows/deploy.yml)
  base: process.env.DEPLOY_BASE ?? './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Oxford 3000 — Flashcards',
        short_name: 'Oxford 3000',
        description: 'Apprendre les 3000 mots essentiels de l’anglais',
        lang: 'fr',
        display: 'standalone',
        background_color: '#0a0c13',
        theme_color: '#0a0c13',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}']
  }
} as Parameters<typeof defineConfig>[0]);
