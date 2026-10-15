// ═══ Parcis Links Contract Module ═══
import { getWalletClient, getPublicClient, getAccount, arcTestnet } from './wallet.js'
import { parseUnits, formatUnits } from 'viem'
import { CONFIG } from './config.js'

// ─── Contract address resolved dynamically from config / env ───
export const LINKS_CONTRACT_ADDRESS = 
  CONFIG.linksContract || 
  import.meta.env.VITE_LINKS_CONTRACT || 
  '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0'

export const LINKS_ABI = [
  {
    name: 'createLink', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'id',          type: 'bytes32' },
      { name: 'label',       type: 'string'  },
      { name: 'amount',      type: 'uint256' },
      { name: 'description', type: 'string'  },
      { name: 'linkType',    type: 'uint8'   },
      { name: 'groupTarget', type: 'uint8'   },
    ], outputs: []
  },
  {
    name: 'getLink', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{
      type: 'tuple', components: [
        { name: 'creator',     type: 'address' },
        { name: 'label',       type: 'string'  },
        { name: 'amount',      type: 'uint256' },
        { name: 'description', type: 'string'  },
        { name: 'linkType',    type: 'uint8'   },
        { name: 'groupTarget', type: 'uint8'   },
        { name: 'active',      type: 'bool'    },
        { name: 'createdAt',   type: 'uint256' },
        { name: 'totalRaised', type: 'uint256' },
        { name: 'paymentCount',type: 'uint256' },
      ]
    }]
  },
  {
    name: 'payLink', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'bytes32' }, { name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'getUserLinks', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bytes32[]' }]
  },
  {
    name: 'isIdAvailable', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'deactivateLink', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'bytes32' }], outputs: []
  },
  {
    name: 'createPremiumLink', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'id',          type: 'bytes32' },
      { name: 'label',       type: 'string'  },
      { name: 'amount',      type: 'uint256' },
      { name: 'description', type: 'string'  },
      { name: 'linkType',    type: 'uint8'   },
      { name: 'groupTarget', type: 'uint8'   },
    ], outputs: []
  },
  {
    name: 'premiumSlugFee', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'isPremiumSlug', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'bool' }]
  },
  {
    name: 'PaymentReceived', type: 'event',
    inputs: [
      { name: 'id',      type: 'bytes32', indexed: true },
      { name: 'payer',   type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'amount',  type: 'uint256', indexed: false },
    ]
  },
  {
    name: 'PremiumSlugPurchased', type: 'event',
    inputs: [
      { name: 'id',      type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'fee',     type: 'uint256', indexed: false },
    ]
  },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'pendingOwner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
  { name: 'acceptOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'admin', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'platformWallet', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'setAdmin', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newAdmin', type: 'address' }], outputs: [] },
  { name: 'setPremiumSlugFee', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_fee', type: 'uint256' }], outputs: [] },
  { name: 'setPlatformWallet', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_wallet', type: 'address' }], outputs: [] },
]

// ─── Slug ↔ bytes32 conversion (browser-native, no Buffer) ───
export function slugToBytes32(slug) {
  const bytes = new TextEncoder().encode(slug)
  const padded = new Uint8Array(32)
  padded.set(bytes.slice(0, 32))
  return '0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')
}

function bytes32ToSlug(hex) {
  const bytes = hex.slice(2).match(/.{2}/g).map(b => parseInt(b, 16))
  return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0+/g, '')
}

export function isLive() { return !!LINKS_CONTRACT_ADDRESS }

// ─── Check if ID available ───
export async function checkIdAvailable(slug) {
  if (!isLive()) return true // Mock: always available
  const pc = getPublicClient()
  return await pc.readContract({
    address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
    functionName: 'isIdAvailable', args: [slugToBytes32(slug)],
  })
}

// ─── Create link on-chain (user pays own gas) ───
export async function createLinkOnChain({ slug, label, amount, description, type, groupTarget }) {
  const wc = getWalletClient()
  if (!wc) throw new Error('Connect wallet first')
  const typeNum = { fixed: 0, open: 1, group: 2, stream: 3 }[type] ?? 0
  const amountWei = amount ? parseUnits(String(amount), 6) : 0n
  const hash = await wc.writeContract({
    address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
    functionName: 'createLink',
    args: [slugToBytes32(slug), label, amountWei, description || '', typeNum, groupTarget || 0],
    chain: arcTestnet,
    gas: 300000n,
  })
  const pc = getPublicClient()
  const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted on-chain. Link creation failed.')
  }
  return hash
}

// ─── Reserved slugs that cannot be used as custom link IDs ───
const RESERVED_SLUGS = [
  'admin', 'parcis', 'pay', 'dashboard', 'send', 'safe', 'create',
  'profile', 'developers', 'subscribe', 'settings', 'login', 'signup',
  'api', 'help', 'support', 'billing', 'pricing', 'home', 'about',
  'terms', 'privacy', 'link', 'links', 'deal', 'deals', 'stream',
  'streams', 'wallet', 'app', 'www', 'faq', 'docs', 'status',
]

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.includes(slug?.toLowerCase?.()?.trim())
}

// ─── Get premium slug fee from chain ───
export async function getPremiumSlugFee() {
  if (!isLive()) return 0.5 // Default $0.50 in mock mode
  try {
    const pc = getPublicClient()
    const feeRaw = await pc.readContract({
      address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
      functionName: 'premiumSlugFee',
    })
    return parseFloat(formatUnits(feeRaw, 6))
  } catch (err) {
    console.warn('[Links Contract] Failed to read premium fee:', err?.message)
    return 0.5 // Fallback
  }
}

// ─── Check if a slug is premium on-chain ───
export async function isPremiumSlugOnChain(slug) {
  if (!isLive()) return false
  try {
    const pc = getPublicClient()
    return await pc.readContract({
      address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
      functionName: 'isPremiumSlug', args: [slugToBytes32(slug)],
    })
  } catch { return false }
}

// ─── Create premium link on-chain (user pays slug fee + gas) ───
export async function createPremiumLinkOnChain({ slug, label, amount, description, type, groupTarget }, onStatus) {
  const wc = getWalletClient()
  const account = getAccount()
  if (!wc || !account) throw new Error('Connect wallet first')

  // Validate reserved slugs
  if (isReservedSlug(slug)) throw new Error(`"${slug}" is a reserved name. Choose a different slug.`)

  const pc = getPublicClient()
  const typeNum = { fixed: 0, open: 1, group: 2, stream: 3 }[type] ?? 0
  const amountWei = amount ? parseUnits(String(amount), 6) : 0n

  // 1. Read the premium fee from chain
  onStatus?.('Reading premium fee...')
  let feeWei
  try {
    feeWei = await pc.readContract({
      address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
      functionName: 'premiumSlugFee',
    })
  } catch {
    feeWei = parseUnits('0.5', 6) // Fallback $0.50
  }

  // 2. Approve USDC for the premium fee
  const USDC_ADDRESS = CONFIG.usdcAddress || import.meta.env.VITE_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'
  const USDC_ABI = [
    { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
    { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  ]

  const allowance = await pc.readContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance',
    args: [account, LINKS_CONTRACT_ADDRESS]
  })

  if (allowance < feeWei) {
    onStatus?.('Approve premium fee in MetaMask...')
    const approveTx = await wc.writeContract({
      address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
      args: [LINKS_CONTRACT_ADDRESS, feeWei],
      chain: arcTestnet, gas: 100000n,
    })
    const approveReceipt = await pc.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 })
    if (approveReceipt.status === 'reverted') {
      throw new Error('USDC approval reverted on-chain.')
    }
  }

  // 3. Create premium link (contract collects fee atomically)
  onStatus?.('Confirm premium link creation in MetaMask...')
  const hash = await wc.writeContract({
    address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
    functionName: 'createPremiumLink',
    args: [slugToBytes32(slug), label, amountWei, description || '', typeNum, groupTarget || 0],
    chain: arcTestnet,
    gas: 400000n,
  })
  const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted on-chain. Premium link creation failed.')
  }
  return hash
}

// ─── Fetch link from chain ───
export async function fetchLinkFromChain(slug) {
  if (!isLive()) return null
  try {
    const pc = getPublicClient()
    const raw = await pc.readContract({
      address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
      functionName: 'getLink', args: [slugToBytes32(slug)],
    })
    if (!raw || raw.creator === '0x0000000000000000000000000000000000000000') return null
    const typeMap = ['fixed', 'open', 'group', 'stream']
    return {
      id:          slug,
      creator:     raw.creator.toLowerCase(),
      label:       raw.label,
      amount:      raw.amount > 0n ? parseFloat(formatUnits(raw.amount, 6)) : null,
      description: raw.description,
      type:        typeMap[raw.linkType] || 'fixed',
      groupTarget: raw.groupTarget || null,
      active:      raw.active,
      createdAt:   Number(raw.createdAt) * 1000,
      totalRaised: parseFloat(formatUnits(raw.totalRaised, 6)),
      paymentCount: Number(raw.paymentCount),
    }
  } catch (err) {
    console.warn('[Links Contract] Failed to fetch link:', slug, err?.message)
    return null
  }
}

// ─── Fetch all links for a user ───
export async function fetchUserLinksFromChain(address) {
  if (!isLive() || !address) return []
  try {
    const pc = getPublicClient()
    const ids = await pc.readContract({
      address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI,
      functionName: 'getUserLinks', args: [address],
    })
    // Parallel fetch to avoid sequential RPC latency
    const results = await Promise.all(ids.map(id => fetchLinkFromChain(bytes32ToSlug(id))))
    return results.filter(Boolean)
  } catch (err) {
    console.warn('[Links Contract] Failed to fetch user links:', address, err?.message)
    return []
  }
}

// ─── Sign sponsorship request (user proves identity without paying gas) ───
export async function signSponsorRequest(linkData) {
  const wc = getWalletClient()
  if (!wc) throw new Error('Connect wallet first')
  const message = JSON.stringify({ ...linkData, timestamp: Date.now(), action: 'createLink' })
  const account = getAccount()
  const signature = await wc.signMessage({ account, message })
  return { message, signature, address: account }
}

// ─── Pay a Link On-Chain ───
export async function payLinkOnChain(slug, amount) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')

  const pc = getPublicClient()
  const wc = getWalletClient()
  
  const amountWei = parseUnits(String(amount), 6)
  const USDC_ADDRESS = CONFIG.usdcAddress || import.meta.env.VITE_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'

  const USDC_ABI = [
    { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
    { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  ]

  // 1. Check allowance
  const allowance = await pc.readContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance',
    args: [account, LINKS_CONTRACT_ADDRESS]
  })

  // 2. Approve if necessary (approve exact amount needed for security)
  if (allowance < amountWei) {
    const approveTx = await wc.writeContract({
      address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
      args: [LINKS_CONTRACT_ADDRESS, amountWei],
      chain: arcTestnet, gas: 100000n,
    })
    const approveReceipt = await pc.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 })
    if (approveReceipt.status === 'reverted') {
      throw new Error('USDC Approval reverted on-chain.')
    }
  }

  // 3. Pay the link
  const hash = await wc.writeContract({
    address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'payLink',
    args: [slugToBytes32(slug), amountWei],
    chain: arcTestnet, gas: 300000n,
  })
  const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted on-chain. Payment failed.')
  }
  return hash
}

export async function fetchLinkPaymentsFromChain(slug) {
  if (!isLive()) return []
  try {
    const pc = getPublicClient()
    const currentBlock = await pc.getBlockNumber()
    const deploymentBlock = 48085000n // Block number close to contract deployment to scan from
    
    // Split block scan range into chunks of 9500 blocks to satisfy eth_getLogs limits (max 10,000 range)
    const chunks = []
    for (let from = deploymentBlock; from <= currentBlock; from += 9500n) {
      let to = from + 9499n
      if (to > currentBlock) to = currentBlock
      chunks.push({ from, to })
    }
    
    // Parallel fetch logs for all chunks
    const logResults = await Promise.all(
      chunks.map(chunk =>
        pc.getContractEvents({
          address: LINKS_CONTRACT_ADDRESS,
          abi: LINKS_ABI,
          eventName: 'PaymentReceived',
          args: { id: slugToBytes32(slug) },
          fromBlock: chunk.from,
          toBlock: chunk.to,
        }).catch(err => {
          console.warn("Failed fetching chunk logs:", err)
          return []
        })
      )
    )
    const logs = logResults.flat()
    
    // Process logs concurrently for block timestamps
    const payments = await Promise.all(
      logs.map(async (log) => {
        let timestamp = Date.now()
        try {
          const block = await pc.getBlock({ blockNumber: log.blockNumber })
          timestamp = Number(block.timestamp) * 1000
        } catch (e) {
          console.warn("Failed to fetch block timestamp:", e)
        }
        return {
          payer: log.args.payer.toLowerCase(),
          amount: parseFloat(formatUnits(log.args.amount, 6)),
          txHash: log.transactionHash,
          timestamp,
        }
      })
    )
    
    // Sort transactions from newest to oldest
    return payments.sort((a, b) => b.timestamp - a.timestamp)
  } catch (e) {
    console.error("Failed to fetch payments from chain:", e)
    return []
  }
}
