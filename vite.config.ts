import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      tunnel: { name: 'tudorilisoi' },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  preview: {
    allowedHosts: [
      // For Quick tunnels:
      '.wormhole.bar',
      '.trycloudflare.com',
      '.ngrok-free.app',
      // For named tunnels:
      // ".my-domain.com",
    ],
  },

  server: {
    host: true, // Exposes the server to 0.0.0.0 so Wormhole can reach it
    port: 5173,
    strictPort: true, // Prevents Vite from switching ports if 5173 is busy
    // Add your Wormhole tunnel domain (e.g., 'your-tunnel.wormhole.bar')
    allowedHosts: [
      '.wormhole.bar', // Allows any subdomain on wormhole.bar (or use your exact domain)
      '.trycloudflare.com',
      '.ngrok-free.app',
    ],
    hmr: {
      clientPort: 443, // Routes HMR WebSocket traffic over standard HTTPS port 443
    },
  },
})
