// ═══ Reown AppKit Configuration ═══
// Central config for Reown wallet connection modal.
// This replaces the custom wallet modal in wallet.js.

import { Buffer } from 'buffer'
if (typeof window !== 'undefined') window.Buffer = window.Buffer || Buffer
if (typeof globalThis !== 'undefined') globalThis.Buffer = globalThis.Buffer || Buffer

import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { defineChain } from '@reown/appkit/networks'
import { isMainnet as configIsMainnet, getNetworkEnv } from './config.js'

// ─── Arc Testnet & Mainnet Custom Chain Definitions ───
export const arcTestnetChain = defineChain({
  id: 5042002,
  caipNetworkId: 'eip155:5042002',
  chainNamespace: 'eip155',
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_TESTNET_RPC_URL ||
        (import.meta.env.VITE_RPC_URL && import.meta.env.VITE_RPC_URL.includes('testnet') ? import.meta.env.VITE_RPC_URL : 'https://arc-testnet.drpc.org')
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: (
        import.meta.env.VITE_TESTNET_EXPLORER ||
        (import.meta.env.VITE_EXPLORER && import.meta.env.VITE_EXPLORER.includes('testnet') ? import.meta.env.VITE_EXPLORER : 'https://testnet.arcscan.app')
      ),
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
})

export const arcMainnetChain = defineChain({
  id: 5042,
  caipNetworkId: 'eip155:5042',
  chainNamespace: 'eip155',
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_MAINNET_RPC_URL ||
        (import.meta.env.VITE_RPC_URL && !import.meta.env.VITE_RPC_URL.includes('testnet') ? import.meta.env.VITE_RPC_URL : 'https://rpc.mainnet.arc.io')
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: (
        import.meta.env.VITE_MAINNET_EXPLORER ||
        (import.meta.env.VITE_EXPLORER && !import.meta.env.VITE_EXPLORER.includes('testnet') ? import.meta.env.VITE_EXPLORER : 'https://explorer.arc.io')
      ),
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
})

export const isMainnet = configIsMainnet
export const activeChain = isMainnet ? arcMainnetChain : arcTestnetChain
export const arcTestnet = activeChain // Backwards compatibility for existing imports

// ─── Project Configuration ───
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'your_reown_project_id_here'

if (!import.meta.env.VITE_REOWN_PROJECT_ID) {
  console.warn('[Reown] Using placeholder VITE_REOWN_PROJECT_ID. Replace with real ID from cloud.reown.com for production.')
}

const origin = typeof window !== 'undefined' ? window.location.origin : 'https://parcis.app'
const metadata = {
  name: 'Parcis Protocol',
  description: 'USDC Payment Links, Escrow & Streams on Arc Network',
  url: origin,
  icons: [`${origin}/logo.png`],
}

// ─── Wagmi Adapter ───
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [activeChain, isMainnet ? arcTestnetChain : arcMainnetChain],
})

// ─── Create AppKit Modal ───
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [activeChain, isMainnet ? arcTestnetChain : arcMainnetChain],
  defaultNetwork: activeChain,
  projectId,
  metadata,
  features: {
    analytics: true,     // Reown dashboard analytics
    email: true,         // Email wallet creation
    socials: ['google', 'apple', 'farcaster'], // Social logins
    onramp: true,        // Fiat on-ramp
  },
  themeMode: 'dark',     // Match Parcis dark theme
  themeVariables: {
    '--w3m-accent': '#10b981',           // Parcis emerald green
    '--apkt-accent': '#10b981',
    '--w3m-color-mix': '#09090b',        // Dark background matching Parcis
    '--apkt-color-mix': '#09090b',
    '--w3m-color-mix-strength': 40,
    '--apkt-color-mix-strength': 40,
    '--w3m-border-radius-master': '8px', // Match Parcis border radius
    '--apkt-border-radius-master': '8px',
    '--w3m-font-family': '"Outfit", "Inter", -apple-system, sans-serif',
    '--apkt-font-family': '"Outfit", "Inter", -apple-system, sans-serif',
  },
})

// ─── Export wagmi config for use in wallet.js ───
export const wagmiConfig = wagmiAdapter.wagmiConfig

if (typeof window !== 'undefined') {
  window.modal = modal
}

// ─── Reown Readiness & Availability Verification ───
export function isReownAvailable() {
  if (typeof window === 'undefined') return false
  if (!window.customElements || !window.customElements.get('appkit-button')) return false
  const btn = document.querySelector('appkit-button')
  if (btn && (!btn.shadowRoot || !btn.shadowRoot.firstElementChild)) return false
  return true
}

export function waitForReownReady(timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (isReownAvailable()) return resolve(true)

    let finished = false
    const finish = () => {
      if (!finished) {
        finished = true
        resolve(true)
      }
    }

    if (typeof window !== 'undefined' && window.customElements) {
      customElements.whenDefined('appkit-button').then(() => {
        const start = performance.now()
        const check = () => {
          if (isReownAvailable() || performance.now() - start > 3000) finish()
          else requestAnimationFrame(check)
        }
        check()
      }).catch(() => finish())
    }

    const interval = setInterval(() => {
      if (isReownAvailable()) {
        clearInterval(interval)
        finish()
      }
    }, 40)

    setTimeout(() => {
      clearInterval(interval)
      finish()
    }, timeoutMs)
  })
}
