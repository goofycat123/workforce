import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pricempireKey = env.PRICEMPIRE_API_KEY || ''

  return {
    plugins: [react()],
    base: '/',
    server: {
      proxy: {
        '/api/pricempire': {
          target: 'https://api.pricempire.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/pricempire/, '/v4/trader'),
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              if (pricempireKey) {
                proxyReq.setHeader('Authorization', `Bearer ${pricempireKey}`)
              }
            })
          },
        },
      },
    },
  }
})
