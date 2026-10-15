// ═══ ParcisSafe Wallet Module (Reown AppKit Edition) ═══
import {
  getAccount as wagmiGetAccount,
  getPublicClient as wagmiGetPublicClient,
  getConnectorClient,
  watchAccount,
  disconnect as wagmiDisconnect,
  switchChain as wagmiSwitchChain,
  writeContract as wagmiWriteContract,
  readContract as wagmiReadContract,
  sendTransaction as wagmiSendTransaction,
  signMessage as wagmiSignMessage,
  signTypedData as wagmiSignTypedData,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
} from '@wagmi/core'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { modal, wagmiConfig, arcTestnet, activeChain, isMainnet, waitForReownReady } from './reown.js'
import { CONFIG } from './config.js'

export { arcTestnet, activeChain }

const RPC_URL = CONFIG.rpcUrl || (isMainnet ? 'https://rpc.mainnet.arc.io' : 'https://arc-testnet.drpc.org')
const USDC_ADDRESS = CONFIG.usdcAddress || '0x3600000000000000000000000000000000000000'
const USDC_TRANSFER_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
]

let fallbackPublicClient = null
function getFallbackPublicClient() {
  if (!fallbackPublicClient) {
    fallbackPublicClient = createPublicClient({
      chain: activeChain,
      transport: http(RPC_URL, {
        retryCount: 3,
        retryDelay: 800,
      }),
    })
  }
  return fallbackPublicClient
}

// ─── Wallet State & Event Bus ───
const listeners = []
export function onWalletChange(fn) {
  listeners.push(fn)
  // Call immediately with current state if available
  const acc = getAccount()
  if (acc) {
    try { fn({ account: acc, chainId: CONFIG.chainId, connected: true }) } catch (e) {}
  }
}

function notify() {
  const account = getAccount()
  const connected = isConnected()
  listeners.forEach(fn => {
    try {
      fn({ account, chainId: CONFIG.chainId, connected })
    } catch (e) {
      console.error('[Wallet] Listener error:', e)
    }
  })
}

// Watch account status changes from Reown AppKit / wagmi
watchAccount(wagmiConfig, {
  onChange(account) {
    if (account?.isConnected && account?.chainId && account.chainId !== CONFIG.chainId) {
      switchToArc()
    }
    notify()
  }
})

// ─── Public API ───
export function getAccount() {
  try {
    const acc = wagmiGetAccount(wagmiConfig)
    return acc?.address ? acc.address.toLowerCase() : null
  } catch {
    return null
  }
}

export function isConnected() {
  try {
    const acc = wagmiGetAccount(wagmiConfig)
    return !!acc?.isConnected && !!acc?.address
  } catch {
    return false
  }
}

export async function connectWallet() {
  try {
    await waitForReownReady()
    if (modal) {
      await modal.open()
    }
  } catch (err) {
    console.error('[Reown] Failed to open modal:', err)
  }
}

export async function disconnectWallet() {
  try {
    await wagmiDisconnect(wagmiConfig)
  } catch (err) {
    console.warn('[Reown] Disconnect warning:', err)
  }
  notify()
}

export function getPublicClient() {
  try {
    const pc = wagmiGetPublicClient(wagmiConfig, { chainId: CONFIG.chainId })
    if (pc) return pc
  } catch {}
  return getFallbackPublicClient()
}

// Universal WalletClient proxy compatible with viem WalletClient calls
const walletClientProxy = {
  get account() {
    const addr = getAccount()
    return addr ? { address: addr } : null
  },
  async writeContract(args) {
    return await wagmiWriteContract(wagmiConfig, { ...args, chainId: CONFIG.chainId })
  },
  async sendTransaction(args) {
    return await wagmiSendTransaction(wagmiConfig, { ...args, chainId: CONFIG.chainId })
  },
  async signMessage(args) {
    return await wagmiSignMessage(wagmiConfig, args)
  },
  async signTypedData(args) {
    return await wagmiSignTypedData(wagmiConfig, args)
  },
}

export function getWalletClient() {
  if (!isConnected()) return null
  return walletClientProxy
}

export async function getConnectorWalletClient() {
  try {
    return await getConnectorClient(wagmiConfig, { chainId: CONFIG.chainId })
  } catch {
    return null
  }
}

export async function switchToArc() {
  try {
    await wagmiSwitchChain(wagmiConfig, { chainId: CONFIG.chainId })
  } catch (e) {
    console.warn('[Wallet] Switch chain warning:', e?.message)
  }
}

// ─── USDC Operations ───
export async function getUSDCBalance() {
  const account = getAccount()
  if (!account) return '0.00'
  try {
    const pc = getPublicClient()
    const bal = await pc.readContract({
      address: USDC_ADDRESS,
      abi: USDC_TRANSFER_ABI,
      functionName: 'balanceOf',
      args: [account],
    })
    return parseFloat(formatUnits(bal, 6)).toFixed(2)
  } catch (err) {
    console.warn('[USDC Balance] Failed:', err?.message)
    return '0.00'
  }
}

export async function getRawUSDCBalance(address) {
  const target = address || getAccount()
  if (!target) return 0
  try {
    const pc = getPublicClient()
    const bal = await pc.readContract({
      address: USDC_ADDRESS,
      abi: USDC_TRANSFER_ABI,
      functionName: 'balanceOf',
      args: [target],
    })
    return parseFloat(formatUnits(bal, 6))
  } catch (err) {
    console.warn('[Raw USDC Balance] Failed:', err?.message)
    return 0
  }
}

export async function sendUSDC(to, amountUsdc) {
  if (!isConnected()) throw new Error('Connect wallet first')
  const amountWei = parseUnits(String(amountUsdc), 6)
  const hash = await wagmiWriteContract(wagmiConfig, {
    address: USDC_ADDRESS,
    abi: USDC_TRANSFER_ABI,
    functionName: 'transfer',
    args: [to, amountWei],
  })
  const pc = getPublicClient()
  const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
  if (receipt.status === 'reverted') {
    throw new Error('USDC transfer reverted on-chain.')
  }
  return { hash, receipt, success: receipt.status === 'success' }
}

export async function checkGasBalance(requiredAmount = 0) {
  const balance = await getRawUSDCBalance(getAccount())
  const GAS_BUFFER = 0.005 // ~$0.005 for gas on Arc
  return { canPaySelf: balance >= requiredAmount + GAS_BUFFER, balance }
}

export function shortAddr(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
