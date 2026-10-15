// ═══ Parcis Decentralized Developer Auth & Registry Module ═══
import { getPublicClient, getWalletClient, getAccount, isConnected, arcTestnet } from './wallet.js'
import { keccak256, sha256, stringToBytes } from 'viem'
import { CONFIG } from './config.js'

export const DEV_REGISTRY_ADDRESS = CONFIG.devRegistryContract
export const STREAMS_CONTRACT_ADDRESS = CONFIG.streamsContract

export const DEV_REGISTRY_ABI = [
  { name: 'register', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'setApiKeyHash', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'keyHash', type: 'bytes32' }], outputs: [] },
  { name: 'revokeApiKey', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'linkSubscriptionStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }, { name: 'tier', type: 'uint8' }], outputs: [] },
  { name: 'unlinkSubscriptionStream', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'addWebhook', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'url', type: 'string' }, { name: 'eventType', type: 'uint8' }], outputs: [] },
  { name: 'removeWebhook', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'index', type: 'uint256' }], outputs: [] },
  { name: 'getWebhooks', type: 'function', stateMutability: 'view', inputs: [{ name: 'devAddress', type: 'address' }], outputs: [{ type: 'tuple[]', components: [{ name: 'url', type: 'string' }, { name: 'eventType', type: 'uint8' }, { name: 'active', type: 'bool' }] }] },
  {
    name: 'getDeveloper', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'devAddress', type: 'address' }],
    outputs: [
      {
        name: 'dev', type: 'tuple',
        components: [
          { name: 'wallet', type: 'address' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'trialExpiry', type: 'uint256' },
          { name: 'activeStreamId', type: 'uint256' },
          { name: 'subscribedTier', type: 'uint8' },
          { name: 'apiKeyHash', type: 'bytes32' },
          { name: 'apiCallsUsed', type: 'uint256' },
          { name: 'cycleStartTime', type: 'uint256' },
          { name: 'active', type: 'bool' }
        ]
      },
      { name: 'currentTier', type: 'uint8' },
      { name: 'isTrialActive', type: 'bool' },
      { name: 'trialSecondsRemaining', type: 'uint256' },
      { name: 'isStreamActive', type: 'bool' },
      { name: 'callLimit', type: 'uint256' }
    ]
  },
  {
    name: 'verifyApiKey', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'keyHash', type: 'bytes32' }],
    outputs: [
      { name: 'devAddress', type: 'address' },
      { name: 'tier', type: 'uint8' },
      { name: 'callsUsed', type: 'uint256' },
      { name: 'callLimit', type: 'uint256' },
      { name: 'isValid', type: 'bool' }
    ]
  }
]

export const PARCIS_STREAMS_ABI = [
  {
    name: 'createStream', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'durationInSeconds', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'streams', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'stopTime', type: 'uint256' },
      { name: 'amountWithdrawn', type: 'uint256' },
      { name: 'isActive', type: 'bool' }
    ]
  },
  {
    name: 'cancelStream', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: []
  }
]

const EIP712_DOMAIN = {
  name: 'Parcis Developer Network',
  version: '1',
  chainId: arcTestnet.id,
  verifyingContract: DEV_REGISTRY_ADDRESS,
}

const EIP712_TYPES = {
  ParcisApiKey: [
    { name: 'developer', type: 'address' },
    { name: 'action', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'statement', type: 'string' },
  ],
}

/** Get stored local API key for address */
export function getStoredApiKey(address) {
  if (!address) return null
  try {
    return localStorage.getItem(`parcis_dev_key_${address.toLowerCase()}`)
  } catch {
    return null
  }
}

/** Save local API key for address */
export function setStoredApiKey(address, key) {
  if (!address) return
  try {
    localStorage.setItem(`parcis_dev_key_${address.toLowerCase()}`, key)
  } catch {}
}

/** Clear stored local API key */
export function clearStoredApiKey(address) {
  if (!address) return
  try {
    localStorage.removeItem(`parcis_dev_key_${address.toLowerCase()}`)
  } catch {}
}

/**
 * Fetch full developer profile directly from on-chain contract
 */
export async function getDeveloperProfile(address) {
  const publicClient = getPublicClient()
  const target = address || getAccount()
  if (!target) return null

  try {
    const result = await publicClient.readContract({
      address: DEV_REGISTRY_ADDRESS,
      abi: DEV_REGISTRY_ABI,
      functionName: 'getDeveloper',
      args: [target]
    })

    const [dev, currentTier, isTrialActive, trialSecondsRemaining, isStreamActive, callLimit] = result
    const tierNames = ['Free', 'Pro', 'Enterprise']

    return {
      wallet: dev.wallet,
      active: dev.active,
      registeredAt: Number(dev.registeredAt),
      trialExpiry: Number(dev.trialExpiry),
      activeStreamId: Number(dev.activeStreamId),
      subscribedTier: Number(dev.subscribedTier),
      apiKeyHash: dev.apiKeyHash,
      apiCallsUsed: Number(dev.apiCallsUsed),
      cycleStartTime: Number(dev.cycleStartTime),
      currentTier: Number(currentTier),
      tierName: tierNames[Number(currentTier)] || 'Free',
      isTrialActive: Boolean(isTrialActive),
      trialSecondsRemaining: Number(trialSecondsRemaining),
      isStreamActive: Boolean(isStreamActive),
      callLimit: callLimit > 1000000000n ? 'Unlimited' : Number(callLimit),
      hasApiKey: dev.apiKeyHash && dev.apiKeyHash !== '0x0000000000000000000000000000000000000000000000000000000000000000',
    }
  } catch (err) {
    console.warn('[devAuth] Error fetching developer profile:', err)
    return null
  }
}

/**
 * Register as developer on-chain (activates 30-day Pro trial)
 */
export async function registerDeveloper() {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const hash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'register',
    args: [],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

/**
 * Generate a deterministic API key via EIP-712 wallet signature and store its hash on-chain
 */
export async function generateAndRegisterApiKey(nonce = 0) {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  // Step 1: Request EIP-712 Typed Signature from wallet
  const signature = await walletClient.signTypedData({
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: 'ParcisApiKey',
    message: {
      developer: account,
      action: 'Generate Parcis API Key',
      nonce: BigInt(nonce),
      statement: 'Authorize generation of your deterministic Parcis API Key. Never reveal this signature to anyone.',
    },
  })

  // Step 2: Deterministically derive the API key from signature
  const sigHash = sha256(signature)
  const apiKey = `pk_live_${sigHash.slice(2, 38)}`

  // Step 3: Compute keccak256(apiKey) for on-chain storage
  const keyHash = keccak256(stringToBytes(apiKey))

  // Step 4: Submit keyHash to ParcisDevRegistry
  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'setApiKeyHash',
    args: [keyHash],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  // Cache locally
  setStoredApiKey(account, apiKey)

  return { apiKey, keyHash, txHash }
}

/**
 * Revoke active API key globally on-chain
 */
export async function revokeApiKey() {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'revokeApiKey',
    args: [],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  clearStoredApiKey(account)
  return txHash
}

/**
 * Link an active ParcisStreams stream as the subscription
 */
export async function linkSubscriptionStream(streamId, tier = 1) {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'linkSubscriptionStream',
    args: [BigInt(streamId), tier],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}

/**
 * Unlink active stream
 */
export async function unlinkSubscriptionStream() {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'unlinkSubscriptionStream',
    args: [],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}

/**
 * Add webhook configuration
 */
export async function addWebhook(url, eventType = 0) {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'addWebhook',
    args: [url, eventType],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}

/**
 * Remove webhook configuration
 */
export async function removeWebhook(index) {
  const walletClient = getWalletClient()
  const account = getAccount()
  if (!walletClient || !account) throw new Error('Wallet not connected')

  const txHash = await walletClient.writeContract({
    address: DEV_REGISTRY_ADDRESS,
    abi: DEV_REGISTRY_ABI,
    functionName: 'removeWebhook',
    args: [BigInt(index)],
  })

  const publicClient = getPublicClient()
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  return txHash
}

/**
 * Fetch webhooks on-chain
 */
export async function getWebhooks(address) {
  const publicClient = getPublicClient()
  const target = address || getAccount()
  if (!target) return []

  try {
    const list = await publicClient.readContract({
      address: DEV_REGISTRY_ADDRESS,
      abi: DEV_REGISTRY_ABI,
      functionName: 'getWebhooks',
      args: [target]
    })
    return (list || []).map((w, idx) => ({
      index: idx,
      url: w.url,
      eventType: Number(w.eventType),
      active: w.active,
    }))
  } catch (err) {
    console.warn('[devAuth] Error reading webhooks:', err)
    return []
  }
}
