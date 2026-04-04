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
      },
    },
  }
})
