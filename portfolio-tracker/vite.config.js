import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const key = env.PRICEMPIRE_API_KEY || ''
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/pricempire': {
          target: 'https://api.pricempire.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/pricempire/, '/v4/trader'),
          configure(proxy) {
            proxy.on('proxyReq', (req) => {
              if (key) req.setHeader('Authorization', `Bearer ${key}`)
            })
          },
        },
        '/api/pe-items': {
          target: 'https://api.pricempire.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/pe-items/, '/v3/items/prices'),
          configure(proxy) {
            proxy.on('proxyReq', (req) => {
              if (key) req.setHeader('Authorization', `Bearer ${key}`)
            })
          },
        },
        '/api/steam-search': {
          target: 'https://steamcommunity.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/steam-search/, '/market/search/render'),
          configure(proxy) {
            proxy.on('proxyReq', (req) => {
              req.setHeader('User-Agent', 'Mozilla/5.0')
              req.setHeader('Accept-Language', 'en-US,en;q=0.9')
            })
          },
        },
      },
    },
  }
})
