import { defineConfig } from 'vite'
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { Buffer } from 'buffer'

function parcisApiDevPlugin() {
  return {
    name: 'parcis-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        try {
          const parsedUrl = new URL(req.url, 'http://localhost:3000')
          const pathname = parsedUrl.pathname
          const endpoint = pathname.replace(/^\/api\//, '').split('/')[0].split('?')[0]

          // Ignore internal helpers like _shared.js
          if (endpoint.startsWith('_')) return next()

          const apiFilePath = path.resolve(process.cwd(), `api/${endpoint}.js`)
          if (!fs.existsSync(apiFilePath)) return next()

          req.query = Object.fromEntries(parsedUrl.searchParams.entries())

          if (req.method === 'POST') {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const bodyStr = Buffer.concat(chunks).toString('utf-8')
            try { req.body = JSON.parse(bodyStr) } catch { req.body = {} }
          }

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return res
          }

          const module = await server.ssrLoadModule(apiFilePath)
          const handler = module.default
          if (typeof handler === 'function') {
            await handler(req, res)
          } else {
            res.status(500).json({ error: `Handler for ${endpoint} not found` })
          }
        } catch (err) {
          console.error(`[API Dev Server Error] ${req.url}:`, err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
          }
        }
      })
    }
  }
}

const rawNetwork = (process.env.VITE_NETWORK || process.env.NETWORK || '').toLowerCase()
const isMainnet = rawNetwork === 'mainnet' || (!rawNetwork && (process.env.VITE_CHAIN_ID === '5042' || (process.env.VITE_RPC_URL && !process.env.VITE_RPC_URL.includes('testnet'))))

const rpcTarget = isMainnet
  ? (process.env.VITE_MAINNET_RPC_URL || process.env.MAINNET_RPC_URL || 'https://rpc.mainnet.arc.io')
  : (process.env.VITE_TESTNET_RPC_URL || process.env.TESTNET_RPC_URL || 'https://arc-testnet.drpc.org')

export default defineConfig({
  plugins: [parcisApiDevPlugin()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/rpc': {
        target: rpcTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, '')
      }
    }
  },
  optimizeDeps: {
    include: ['@reown/appkit', '@reown/appkit-adapter-wagmi', 'wagmi', 'viem', 'buffer'],
  },
  build: {
    outDir: 'dist',
    target: 'es2020'
  }
})

