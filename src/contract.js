// ═══ Parcis Contract Module ═══
// Uses localStorage mock until contract is deployed on Arc testnet.
// Set DEPLOYED_ADDRESS to switch to live mode.

import { getPublicClient, getWalletClient, getAccount, arcTestnet } from './wallet.js'
import { parseUnits, encodeFunctionData } from 'viem'
import { CONFIG } from './config.js'
import { fetchWithCache, invalidateCache } from './cache.js'
import { LINKS_CONTRACT_ADDRESS, LINKS_ABI } from './links-contract.js'

// ─── Contract address - set VITE_ARCSAFE_CONTRACT in your .env ───
const _arcSafeRaw = (CONFIG.safeContract || import.meta.env.VITE_ARCSAFE_CONTRACT || '').trim()
const DEPLOYED_ADDRESS = /^0x[0-9a-fA-F]{40}$/.test(_arcSafeRaw) ? _arcSafeRaw : null
const USDC_ADDRESS = CONFIG.usdcAddress || '0x3600000000000000000000000000000000000000'
const STATUS_LABELS = ['Created','Funded','Submitted','Completed','Disputed','Resolved','Cancelled','Appealed']
const STATUS_CLASSES = ['created','funded','submitted','completed','disputed','resolved','cancelled','appealed']

const ARCSAFE_ABI = [
  { name:'createDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_worker',type:'address'},{name:'_arbiter',type:'address'},{name:'_amount',type:'uint256'},{name:'_deadline',type:'uint256'},{name:'_title',type:'string'},{name:'_description',type:'string'}], outputs:[{type:'uint256'}] },
  { name:'fundDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'submitDeliverable', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'},{name:'_deliverable',type:'string'}], outputs:[] },
  { name:'approveDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'disputeDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'},{name:'_reason',type:'string'}], outputs:[] },
  { name:'resolveDispute', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'},{name:'_forWorker',type:'bool'}], outputs:[] },
  { name:'cancelDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'renewDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'},{name:'_newDeadline',type:'uint256'}], outputs:[] },
  { name:'withdrawExpiredDeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'fallbackResolve', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'getDeal', type:'function', stateMutability:'view', inputs:[{name:'_id',type:'uint256'}], outputs:[{type:'tuple', components:[{name:'client',type:'address'},{name:'worker',type:'address'},{name:'arbiter',type:'address'},{name:'amount',type:'uint256'},{name:'deadline',type:'uint256'},{name:'title',type:'string'},{name:'description',type:'string'},{name:'deliverable',type:'string'},{name:'status',type:'uint8'},{name:'createdAt',type:'uint256'}]}] },
  { name:'getClientDeals', type:'function', stateMutability:'view', inputs:[{name:'_a',type:'address'}], outputs:[{type:'uint256[]'}] },
  { name:'getWorkerDeals', type:'function', stateMutability:'view', inputs:[{name:'_a',type:'address'}], outputs:[{type:'uint256[]'}] },
  { name:'getArbiterDeals', type:'function', stateMutability:'view', inputs:[{name:'_a',type:'address'}], outputs:[{type:'uint256[]'}] },
  { name:'dealCount', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint256'}] },
  
  // V2 & V2.1 Functions
  { name:'registerAsArbiter', type:'function', stateMutability:'nonpayable', inputs:[{name:'_stakeAmount',type:'uint256'}], outputs:[] },
  { name:'withdrawArbiterStake', type:'function', stateMutability:'nonpayable', inputs:[], outputs:[] },
  { name:'getPlatformArbiters', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'address[]'}] },
  { name:'isPlatformArbiter', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'bool'}] },
  { name:'arbiterStake', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'arbiterTrustScore', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'arbiterDisputesResolved', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'disputeReasons', type:'function', stateMutability:'view', inputs:[{name:'',type:'uint256'}], outputs:[{type:'string'}] },
  { name:'minArbiterStake', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint256'}] },
  
  // V2.1 Appeal & Slashing
  { name:'appealResolution', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'finalizeResolution', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'}], outputs:[] },
  { name:'finalizeAppeal', type:'function', stateMutability:'nonpayable', inputs:[{name:'_id',type:'uint256'},{name:'_forWorker',type:'bool'}], outputs:[] },
  { name:'slashArbiter', type:'function', stateMutability:'nonpayable', inputs:[{name:'_arbiter',type:'address'},{name:'_slashAmount',type:'uint256'},{name:'_reason',type:'string'}], outputs:[] },
  { name:'getArbiterWeightedScore', type:'function', stateMutability:'view', inputs:[{name:'_arbiter',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'resolutionTimestamp', type:'function', stateMutability:'view', inputs:[{name:'',type:'uint256'}], outputs:[{type:'uint256'}] },
  { name:'resolutionForWorker', type:'function', stateMutability:'view', inputs:[{name:'',type:'uint256'}], outputs:[{type:'bool'}] },
  { name:'appealWindowDuration', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'uint256'}] },
  { name:'preDisputeStatus', type:'function', stateMutability:'view', inputs:[{name:'',type:'uint256'}], outputs:[{type:'uint8'}] },
  { name:'activeDisputes', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'uint256'}] },
  { name:'owner', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'address'}] },
  { name:'pendingOwner', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'address'}] },
  { name:'transferOwnership', type:'function', stateMutability:'nonpayable', inputs:[{name:'newOwner',type:'address'}], outputs:[] },
  { name:'acceptOwnership', type:'function', stateMutability:'nonpayable', inputs:[], outputs:[] },
  { name:'pause', type:'function', stateMutability:'nonpayable', inputs:[], outputs:[] },
  { name:'unpause', type:'function', stateMutability:'nonpayable', inputs:[], outputs:[] },
  { name:'paused', type:'function', stateMutability:'view', inputs:[], outputs:[{type:'bool'}] },
  { name:'setMinArbiterStake', type:'function', stateMutability:'nonpayable', inputs:[{name:'_newMin',type:'uint256'}], outputs:[] },
  { name:'setAppealWindowDuration', type:'function', stateMutability:'nonpayable', inputs:[{name:'_duration',type:'uint256'}], outputs:[] },
]

// ─── LocalStorage Mock Layer ───
function getStore() {
  try { return JSON.parse(localStorage.getItem('arcsafe_deals') || '[]') }
  catch { return [] }
}
function saveStore(deals) { localStorage.setItem('arcsafe_deals', JSON.stringify(deals)) }

function isLive() { return !!DEPLOYED_ADDRESS }

// ─── Public API ───
export function getStatusLabel(s) { return STATUS_LABELS[s] || 'Unknown' }
export function getStatusClass(s) { return STATUS_CLASSES[s] || 'created' }

export function parseRevertError(error) {
  console.error("Contract call error:", error)
  const message = error.message || ""
  if (message.includes("Only client can fund")) return "Only the client who created this deal can fund it."
  if (message.includes("Deal is not in Created state")) return "This deal has already been funded or cancelled."
  if (message.includes("Only worker can submit work")) return "Only the assigned worker can submit deliverables."
  if (message.includes("Deal is not Funded")) return "This deal is no longer in a funded state. It may have been completed, cancelled, or disputed."
  if (message.includes("Deal must be in Submitted state")) return "The worker has not submitted deliverables yet, or the deal is already approved."
  if (message.includes("Only assigned arbiter can resolve")) return "Only the assigned arbiter is authorized to resolve this dispute."
  if (message.includes("Deal is not in a disputed state")) return "This deal is not currently in a disputed state."
  if (message.includes("Only client can cancel")) return "Only the client can cancel this deal."
  if (message.includes("Cannot cancel once funded")) return "The deal cannot be cancelled because it has already been funded."
  if (message.includes("Deal has not expired yet")) return "The deadline for this deal has not passed yet."
  if (message.includes("Stake below minimum")) return `Your stake amount is below the minimum required ${CONFIG.minArbiterStake} USDC.`
  if (message.includes("Not registered as arbiter")) return "Your wallet address is not registered as a platform arbiter."
  if (message.includes("reverted with the following reason:")) {
    const match = message.match(/reverted with the following reason:\s*(.+)/)
    if (match && match[1]) return match[1].trim()
  }
  return error.shortMessage || error.reason || "The transaction was reverted on-chain. Please verify the contract is in the correct state."
}

export async function createDeal({ worker, arbiter, amount, deadline, title, description }) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')

  if (isLive()) {
    const pc = getPublicClient()
    const wc = getWalletClient()
    const args = [
      worker,
      arbiter || account,
      parseUnits(amount, 6),
      BigInt(Math.floor(new Date(deadline).getTime() / 1000)),
      title,
      description,
    ]
    try {
      const { result: dealId } = await pc.simulateContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'createDeal',
        args, account, gas: 500000n,
      })
      const hash = await wc.writeContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'createDeal',
        args, chain: arcTestnet, gas: 500000n,
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return Number(dealId)
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }

  // Mock mode
  const deals = getStore()
  const deal = {
    id: deals.length,
    client: account.toLowerCase(),
    worker: worker.toLowerCase(),
    arbiter: (arbiter || account).toLowerCase(),
    amount: parseFloat(amount),
    deadline: new Date(deadline).getTime(),
    title, description,
    deliverableHash: null,
    status: 0,
    createdAt: Date.now(),
  }
  deals.push(deal)
  saveStore(deals)
  return deal.id
}

export async function fundDeal(id) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')

  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const { formatUnits } = await import('viem')

      const raw = await pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getDeal', args: [BigInt(id)] })
      const dealAmount = raw.amount

      const USDC_ABI = [
        { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
        { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
      ]
      const allowance = await pc.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance', args: [account, DEPLOYED_ADDRESS] })

      if (allowance < dealAmount) {
        const approveTx = await wc.writeContract({
          address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
          args: [DEPLOYED_ADDRESS, dealAmount],
          chain: arcTestnet, gas: 100000n,
        })
        const approveReceipt = await pc.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 })
        if (approveReceipt.status === 'reverted') throw new Error('USDC Approval reverted on-chain')
      }

      const hash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'fundDeal', args: [BigInt(id)], chain: arcTestnet, gas: 200000n })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }

  const deals = getStore()
  if (!deals[id] || deals[id].client !== account.toLowerCase() || deals[id].status !== 0) throw new Error('Cannot fund')
  deals[id].status = 1; deals[id].fundedAt = Date.now(); saveStore(deals)
}

export async function submitDeliverable(id, proof) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'submitDeliverable', args: [BigInt(id), proof], chain: arcTestnet, gas: 300000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].worker !== account.toLowerCase() || deals[id].status !== 1) throw new Error('Cannot submit')
  deals[id].status = 2; deals[id].deliverable = proof; deals[id].submittedAt = Date.now(); saveStore(deals)
}

export async function approveDeal(id) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'approveDeal', args: [BigInt(id)], chain: arcTestnet, gas: 200000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].client !== account.toLowerCase() || deals[id].status !== 2) throw new Error('Cannot approve')
  deals[id].status = 3; deals[id].completedAt = Date.now(); saveStore(deals)
}

export async function disputeDeal(id, reason) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'disputeDeal', args: [BigInt(id), reason || ""], chain: arcTestnet, gas: 250000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  const a = account.toLowerCase()
  if (!deals[id] || (deals[id].client !== a && deals[id].worker !== a)) throw new Error('Not party')
  if (deals[id].status !== 1 && deals[id].status !== 2) throw new Error('Cannot dispute')
  deals[id].status = 4; deals[id].disputeReason = reason; deals[id].disputedAt = Date.now(); saveStore(deals)
}

export async function cancelDeal(id) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'cancelDeal', args: [BigInt(id)], chain: arcTestnet, gas: 150000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].client !== account.toLowerCase() || deals[id].status !== 0) throw new Error('Cannot cancel')
  deals[id].status = 6; saveStore(deals)
}

export async function resolveDispute(id, forWorker) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'resolveDispute', args: [BigInt(id), forWorker], chain: arcTestnet, gas: 200000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].status !== 4) throw new Error('Not in dispute')
  if (deals[id].arbiter !== account.toLowerCase()) throw new Error('Not the arbiter')
  deals[id].status = 5
  deals[id].resolvedAt = Date.now()
  deals[id].resolution = forWorker ? 'worker' : 'client'
  saveStore(deals)
}

export async function appealResolution(id) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'appealResolution', args: [BigInt(id)], chain: arcTestnet, gas: 180000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].status !== 5) throw new Error('Not resolved')
  deals[id].status = 7 // Appealed
  deals[id].appealedAt = Date.now()
  saveStore(deals)
}

export async function finalizeResolution(id) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'finalizeResolution', args: [BigInt(id)], chain: arcTestnet, gas: 220000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].status !== 5) throw new Error('Not resolved')
  deals[id].status = 3 // Completed
  deals[id].completedAt = Date.now()
  saveStore(deals)
}

export async function finalizeAppeal(id, forWorker) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'finalizeAppeal', args: [BigInt(id), forWorker], chain: arcTestnet, gas: 220000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const deals = getStore()
  if (!deals[id] || deals[id].status !== 7) throw new Error('Not appealed')
  deals[id].status = 3 // Completed
  deals[id].completedAt = Date.now()
  deals[id].appealOutcome = forWorker ? 'worker' : 'client'
  saveStore(deals)
}

export async function slashArbiter(arbiterAddress, slashAmount, reason) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const { parseUnits } = await import('viem')
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'slashArbiter', args: [arbiterAddress, parseUnits(slashAmount.toString(), 6), reason], chain: arcTestnet, gas: 200000n })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const arbiters = JSON.parse(localStorage.getItem('arcsafe_arbiters') || '{}')
  const lowerAddr = arbiterAddress.toLowerCase()
  if (arbiters[lowerAddr]) {
    arbiters[lowerAddr].stake = Math.max(0, arbiters[lowerAddr].stake - slashAmount)
    arbiters[lowerAddr].trustScore = 0
    if (arbiters[lowerAddr].stake === 0) {
      arbiters[lowerAddr].isPlatformArbiter = false
    }
    localStorage.setItem('arcsafe_arbiters', JSON.stringify(arbiters))
  }
  // Record mock slashing history
  const slashes = JSON.parse(localStorage.getItem('arcsafe_slashes') || '[]')
  slashes.push({
    arbiter: lowerAddr,
    amount: parseFloat(slashAmount),
    reason: reason,
    timestamp: Date.now()
  })
  localStorage.setItem('arcsafe_slashes', JSON.stringify(slashes))
}

export async function getDeal(id) {
  if (isLive()) {
    const pc = getPublicClient()
    const { formatUnits } = await import('viem')
    const raw = await pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getDeal', args: [BigInt(id)] })
    if (raw.client === '0x0000000000000000000000000000000000000000') return null
    
    // Fetch dispute reason if the deal is disputed, resolved, or appealed
    let disputeReason = null
    const dealStatus = Number(raw.status)
    if (dealStatus === 4 || dealStatus === 5 || dealStatus === 7) {
      try {
        disputeReason = await pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'disputeReasons', args: [BigInt(id)] })
      } catch (e) {}
    }

    let resTimestamp = 0
    let resForWorker = false
    let preStatus = 0
    
    if (dealStatus >= 4) {
      try {
        preStatus = Number(await pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'preDisputeStatus', args: [BigInt(id)] }))
      } catch (e) {}
    }
    
    if (dealStatus === 5 || dealStatus === 7) {
      try {
        const [timestamp, forWorker] = await Promise.all([
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'resolutionTimestamp', args: [BigInt(id)] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'resolutionForWorker', args: [BigInt(id)] }),
        ])
        resTimestamp = Number(timestamp) * 1000
        resForWorker = forWorker
      } catch (e) {}
    }

    return {
      id:                  Number(id),
      client:              raw.client.toLowerCase(),
      worker:              raw.worker.toLowerCase(),
      arbiter:             raw.arbiter.toLowerCase(),
      amount:              parseFloat(formatUnits(raw.amount, 6)),
      deadline:            Number(raw.deadline) * 1000,
      title:               raw.title,
      description:         raw.description,
      deliverable:         raw.deliverable || null,
      status:              dealStatus,
      createdAt:           Number(raw.createdAt) * 1000,
      disputeReason:       disputeReason || null,
      resolutionTimestamp: resTimestamp,
      resolutionForWorker: resForWorker,
      preDisputeStatus:    preStatus
    }
  }
  const deals = getStore()
  return deals[id] || null
}

export async function getUserDeals() {
  const account = getAccount()
  if (!account) return []

  return fetchWithCache(`user_deals_${account.toLowerCase()}`, async () => {
    if (isLive()) {
      try {
        const pc = getPublicClient()
        const { formatUnits } = await import('viem')
        // Parallel fetch of all 3 role-based ID lists
        const [clientIds, workerIds, arbiterIds] = await Promise.all([
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getClientDeals', args: [account] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getWorkerDeals', args: [account] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getArbiterDeals', args: [account] })
        ])

        const allIds = [...new Set([...clientIds, ...workerIds, ...arbiterIds].map(id => Number(id)))]
        // Parallel fetch ALL deal details in one burst
        const rawDeals = await Promise.all(
          allIds.map(id => pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getDeal', args: [BigInt(id)] }).then(raw => ({ id, raw })).catch(() => null))
        )
        const deals = rawDeals.filter(Boolean).map(({ id, raw }) => ({
          id,
          client:          raw.client.toLowerCase(),
          worker:          raw.worker.toLowerCase(),
          arbiter:         raw.arbiter.toLowerCase(),
          amount:          parseFloat(formatUnits(raw.amount, 6)),
          deadline:        Number(raw.deadline) * 1000,
          title:           raw.title,
          description:     raw.description,
          deliverable:     raw.deliverable || null,
          status:          Number(raw.status),
          createdAt:       Number(raw.createdAt) * 1000,
        }))
        return deals.sort((a, b) => b.createdAt - a.createdAt)
      } catch (e) {
        console.error('[getUserDeals]', e)
        return []
      }
    }

    const a = account.toLowerCase()
    const deals = getStore()
    return deals.filter(d => d.client === a || d.worker === a || d.arbiter === a).sort((a,b) => b.createdAt - a.createdAt)
  })
}

export async function getAllDeals() {
  return fetchWithCache('all_deals', async () => {
    if (isLive()) {
      try {
        const pc = getPublicClient()
        const { formatUnits } = await import('viem')
        const countBig = await pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'dealCount', args: [] })
        const count = Number(countBig)

        // Parallel fetch ALL deals in one burst
        const rawResults = await Promise.all(
          Array.from({ length: count }, (_, id) =>
            pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getDeal', args: [BigInt(id)] })
              .then(raw => ({ id, raw }))
              .catch(() => null)
          )
        )

        const validDeals = rawResults.filter(r => r && r.raw.client !== '0x0000000000000000000000000000000000000000')

        // Parallel fetch dispute reasons for disputed deals
        const disputedIds = validDeals.filter(({ raw }) => { const s = Number(raw.status); return s === 4 || s === 5 || s === 7 })
        const disputeReasons = {}
        if (disputedIds.length > 0) {
          const reasons = await Promise.all(
            disputedIds.map(({ id }) =>
              pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'disputeReasons', args: [BigInt(id)] })
                .then(r => ({ id, reason: r }))
                .catch(() => ({ id, reason: null }))
            )
          )
          reasons.forEach(({ id, reason }) => { disputeReasons[id] = reason })
        }

        const deals = validDeals.map(({ id, raw }) => ({
          id,
          client:          raw.client.toLowerCase(),
          worker:          raw.worker.toLowerCase(),
          arbiter:         raw.arbiter.toLowerCase(),
          amount:          parseFloat(formatUnits(raw.amount, 6)),
          deadline:        Number(raw.deadline) * 1000,
          title:           raw.title,
          description:     raw.description,
          deliverable:     raw.deliverable || null,
          status:          Number(raw.status),
          createdAt:       Number(raw.createdAt) * 1000,
          disputeReason:   disputeReasons[id] || null
        }))
        return deals.sort((a, b) => b.createdAt - a.createdAt)
      } catch (e) {
        console.error("Failed to fetch all deals", e)
        return []
      }
    }
    
    const deals = getStore()
    return deals.map((d, i) => d ? { ...d, id: i } : null).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt)
  })
}

export async function getDealsForAddress(address) {
  if (!address) return []
  return fetchWithCache(`deals_for_${address.toLowerCase()}`, async () => {
    if (!isLive()) {
      const a = address.toLowerCase()
      return getStore().filter(d => d.client === a || d.worker === a || d.arbiter === a).sort((a,b) => b.createdAt - a.createdAt)
    }
    try {
      const pc = getPublicClient()
      const { formatUnits } = await import('viem')
      // Parallel fetch all 3 role-based ID lists
      const [clientIds, workerIds, arbiterIds] = await Promise.all([
        pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getClientDeals', args: [address] }),
        pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getWorkerDeals', args: [address] }),
        pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getArbiterDeals', args: [address] })
      ])

      const allIds = [...new Set([...clientIds, ...workerIds, ...arbiterIds].map(id => Number(id)))]
      // Parallel fetch ALL deal details
      const rawDeals = await Promise.all(
        allIds.map(id => pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getDeal', args: [BigInt(id)] }).then(raw => ({ id, raw })).catch(() => null))
      )
      const deals = rawDeals.filter(r => r && r.raw.client !== '0x0000000000000000000000000000000000000000').map(({ id, raw }) => ({
        id, client: raw.client.toLowerCase(), worker: raw.worker.toLowerCase(),
        arbiter: raw.arbiter.toLowerCase(), amount: parseFloat(formatUnits(raw.amount, 6)),
        deadline: Number(raw.deadline) * 1000, title: raw.title, description: raw.description,
        deliverable: raw.deliverable || null, status: Number(raw.status), createdAt: Number(raw.createdAt) * 1000,
      }))
      return deals.sort((a, b) => b.createdAt - a.createdAt)
    } catch (e) { console.error('[getDealsForAddress]', e); return [] }
  })
}

export async function renewDeal(id, newDeadline) {
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'renewDeal',
        args: [BigInt(id), BigInt(Math.floor(new Date(newDeadline).getTime() / 1000))],
        chain: arcTestnet, gas: 150000n,
      })
      await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const deals = getStore()
  const d = deals[id]
  if (!d) throw new Error('Deal not found')
  if (d.client !== account.toLowerCase()) throw new Error('Not the client')
  if (d.status !== 1 && d.status !== 0) throw new Error('Cannot renew this deal')
  const dlMs = new Date(newDeadline).getTime()
  if (dlMs <= Date.now()) throw new Error('New deadline must be in the future')
  d.deadline = dlMs
  saveStore(deals)
}

export async function withdrawExpiredDeal(id) {
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'withdrawExpiredDeal',
        args: [BigInt(id)],
        chain: arcTestnet, gas: 200000n,
      })
      await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const deals = getStore()
  const d = deals[id]
  if (!d) throw new Error('Deal not found')
  if (d.client !== account.toLowerCase()) throw new Error('Not the client')
  if (d.status !== 1) throw new Error('Deal is not in funded state')
  if (Date.now() < d.deadline) throw new Error('Deadline has not passed yet')
  d.status = 6 // Cancelled/Withdrawn
  saveStore(deals)
}

export async function fallbackResolve(id) {
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'fallbackResolve',
        args: [BigInt(id)],
        chain: arcTestnet, gas: 200000n,
      })
      await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const deals = getStore()
  const d = deals[id]
  if (!d) throw new Error('Deal not found')
  if (d.client !== account.toLowerCase() && d.worker !== account.toLowerCase()) throw new Error('Not party to deal')
  if (d.status !== 4) throw new Error('Deal is not disputed')
  if (Date.now() < d.deadline) throw new Error('Deadline has not passed yet')
  d.status = 5
  d.resolution = 'client'
  saveStore(deals)
}

// ─── V2 Arbiter Functions ───

export async function registerAsArbiter(amountUsdc) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const amountUnits = parseUnits(amountUsdc.toString(), 6)

      const USDC_ABI = [
        { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
        { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
      ]
      const allowance = await pc.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance', args: [account, DEPLOYED_ADDRESS] })
      if (allowance < amountUnits) {
        const approveTx = await wc.writeContract({
          address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
          args: [DEPLOYED_ADDRESS, amountUnits],
          chain: arcTestnet, gas: 100000n,
        })
        const approveReceipt = await pc.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 })
        if (approveReceipt.status === 'reverted') throw new Error('USDC Approval reverted on-chain')
      }

      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS,
        abi: ARCSAFE_ABI,
        functionName: 'registerAsArbiter',
        args: [amountUnits],
        chain: arcTestnet,
        gas: 300000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }

  // Mock Mode
  const arbiters = JSON.parse(localStorage.getItem('arcsafe_arbiters') || '{}')
  arbiters[account.toLowerCase()] = {
    isPlatformArbiter: true,
    stake: parseFloat(amountUsdc),
    trustScore: 100,
    disputesResolved: 0
  }
  localStorage.setItem('arcsafe_arbiters', JSON.stringify(arbiters))
  return '0xmockregisterhash'
}

export async function withdrawArbiterStake() {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS,
        abi: ARCSAFE_ABI,
        functionName: 'withdrawArbiterStake',
        args: [],
        chain: arcTestnet,
        gas: 300000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }

  // Mock Mode
  const arbiters = JSON.parse(localStorage.getItem('arcsafe_arbiters') || '{}')
  delete arbiters[account.toLowerCase()]
  localStorage.setItem('arcsafe_arbiters', JSON.stringify(arbiters))
  return '0xmockwithdrawhash'
}

export async function getPlatformArbiters() {
  return fetchWithCache('platform_arbiters', async () => {
    if (isLive()) {
      const pc = getPublicClient()
      try {
        const list = await pc.readContract({
          address: DEPLOYED_ADDRESS,
          abi: ARCSAFE_ABI,
          functionName: 'getPlatformArbiters',
          args: []
        })
        const { formatUnits } = await import('viem')
        // Parallel fetch ALL arbiter details in one burst
        const arbiters = await Promise.all(
          list.map(async addr => {
            const [stake, trust, resolved, score] = await Promise.all([
              pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterStake', args: [addr] }),
              pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterTrustScore', args: [addr] }),
              pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterDisputesResolved', args: [addr] }),
              pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getArbiterWeightedScore', args: [addr] }).catch(() => 0n)
            ])
            return {
              address: addr.toLowerCase(),
              stake: parseFloat(formatUnits(stake, 6)),
              trustScore: Number(trust),
              disputesResolved: Number(resolved),
              weightedScore: Number(score)
            }
          })
        )
        return arbiters.sort((a, b) => b.weightedScore - a.weightedScore)
      } catch (e) {
        console.error("Failed to fetch platform arbiters", e)
        return []
      }
    }

    // Mock Mode
    const arbiters = JSON.parse(localStorage.getItem('arcsafe_arbiters') || '{}')
    const list = Object.keys(arbiters).map(addr => {
      const a = arbiters[addr]
      const wScore = a.trustScore * (a.disputesResolved + 1) * a.stake
      return {
        address: addr.toLowerCase(),
        stake: a.stake,
        trustScore: a.trustScore,
        disputesResolved: a.disputesResolved,
        weightedScore: wScore
      }
    })
    if (list.length === 0) {
      const defaults = [
        { address: '0x9965503b1a05940976c905a48e23ab29021a8a2d', stake: CONFIG.minArbiterStake * 1.5, trustScore: 98, disputesResolved: 12 },
        { address: '0x3289021a8a2d9965503b1a05940976c905a48e23', stake: CONFIG.minArbiterStake * 5.0, trustScore: 95, disputesResolved: 5 },
        { address: '0x76c905a48e23ab29021a8a2d9965503b1a059409', stake: CONFIG.minArbiterStake, trustScore: 89, disputesResolved: 2 }
      ].map(a => ({
        ...a,
        weightedScore: a.trustScore * (a.disputesResolved + 1) * a.stake
      }))
      return defaults.sort((a, b) => b.weightedScore - a.weightedScore)
    }
    return list.sort((a, b) => b.weightedScore - a.weightedScore)
  })
}

export async function getArbiterInfo(address) {
  if (!address) return null
  return fetchWithCache(`arbiter_info_${address.toLowerCase()}`, async () => {
    if (isLive()) {
      const pc = getPublicClient()
      try {
        const { formatUnits } = await import('viem')
        // Parallel fetch all 5 arbiter fields in one burst
        const [isPlat, stake, trust, resolved, score] = await Promise.all([
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'isPlatformArbiter', args: [address] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterStake', args: [address] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterTrustScore', args: [address] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'arbiterDisputesResolved', args: [address] }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'getArbiterWeightedScore', args: [address] }).catch(() => 0n)
        ])
        return {
          isPlatformArbiter: isPlat,
          stake: parseFloat(formatUnits(stake, 6)),
          trustScore: Number(trust),
          disputesResolved: Number(resolved),
          weightedScore: Number(score)
        }
      } catch (e) {
        return null
      }
    }

    // Mock Mode
    const arbiters = JSON.parse(localStorage.getItem('arcsafe_arbiters') || '{}')
    const lowerAddr = address.toLowerCase()
    if (arbiters[lowerAddr]) {
      const a = arbiters[lowerAddr]
      return {
        ...a,
        weightedScore: a.trustScore * (a.disputesResolved + 1) * a.stake
      }
    }

    let fallback = null
    if (lowerAddr === '0x9965503b1a05940976c905a48e23ab29021a8a2d'.toLowerCase()) {
      fallback = { isPlatformArbiter: true, stake: CONFIG.minArbiterStake * 1.5, trustScore: 98, disputesResolved: 12 }
    } else if (lowerAddr === '0x3289021a8a2d9965503b1a05940976c905a48e23'.toLowerCase()) {
      fallback = { isPlatformArbiter: true, stake: CONFIG.minArbiterStake * 5.0, trustScore: 95, disputesResolved: 5 }
    } else if (lowerAddr === '0x76c905a48e23ab29021a8a2d9965503b1a059409'.toLowerCase()) {
      fallback = { isPlatformArbiter: true, stake: CONFIG.minArbiterStake, trustScore: 89, disputesResolved: 2 }
    }

    if (fallback) {
      return {
        ...fallback,
        weightedScore: fallback.trustScore * (fallback.disputesResolved + 1) * fallback.stake
      }
    }

    return {
      isPlatformArbiter: false,
      stake: 0,
      trustScore: 0,
      disputesResolved: 0,
      weightedScore: 0
    }
  })
}

export async function getArbiterSlashHistory(address) {
  if (!address) return []
  const lowerAddr = address.toLowerCase()
  
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const { formatUnits } = await import('viem')
      
      const logs = await pc.getLogs({
        address: DEPLOYED_ADDRESS,
        event: {
          name: 'ArbiterSlashed',
          type: 'event',
          inputs: [
            { name: 'arbiter', type: 'address', indexed: true },
            { name: 'slashAmount', type: 'uint256' },
            { name: 'reason', type: 'string' }
          ]
        },
        args: {
          arbiter: address
        },
        fromBlock: 0n
      })
      
      return logs.map(log => ({
        arbiter: log.args.arbiter.toLowerCase(),
        amount: parseFloat(formatUnits(log.args.slashAmount, 6)),
        reason: log.args.reason,
        timestamp: Date.now() // Event logs on-chain don't easily yield timestamp without getBlock, fallback to now
      }))
    } catch (e) {
      console.error("Failed to query slashing logs from chain:", e)
      return []
    }
  }

  // Mock Mode
  const slashes = JSON.parse(localStorage.getItem('arcsafe_slashes') || '[]')
  return slashes.filter(s => s.arbiter === lowerAddr).sort((a, b) => b.timestamp - a.timestamp)
}

export async function setMinArbiterStake(amountUsdc) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const { parseUnits } = await import('viem')
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS,
        abi: ARCSAFE_ABI,
        functionName: 'setMinArbiterStake',
        args: [parseUnits(amountUsdc.toString(), 6)],
        chain: arcTestnet,
        gas: 150000n
      })
      await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  // Mock Mode
  CONFIG.minArbiterStake = parseFloat(amountUsdc)
}

export async function setAppealWindowDuration(durationSeconds) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  if (isLive()) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const txHash = await wc.writeContract({
        address: DEPLOYED_ADDRESS,
        abi: ARCSAFE_ABI,
        functionName: 'setAppealWindowDuration',
        args: [BigInt(durationSeconds)],
        chain: arcTestnet,
        gas: 150000n
      })
      await pc.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      return txHash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  // Mock Mode
  // No-op or update local storage if needed
}

export async function getContractOwner(contractKey = 'safe') {
  return await getSingleContractOwner(contractKey)
}

export { ARCSAFE_ABI, DEPLOYED_ADDRESS, STATUS_LABELS }

// ═════════════════════════════════════════════════════════════
// ─── STREAMS CONTRACT ───
// ═════════════════════════════════════════════════════════════
const _streamsRaw = (CONFIG.streamsContract || import.meta.env.VITE_STREAMS_CONTRACT || '').trim()
export const STREAMS_ADDRESS = /^0x[0-9a-fA-F]{40}$/.test(_streamsRaw) ? _streamsRaw : null

const STREAMS_ABI = [
  { name: 'createStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'depositAmount', type: 'uint256' }, { name: 'durationInSeconds', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'withdrawFromStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'cancelStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'streams', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'depositAmount', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'stopTime', type: 'uint256' }, { name: 'amountWithdrawn', type: 'uint256' }, { name: 'isActive', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ name: 'withdrawableByRecipient', type: 'uint256' }, { name: 'refundableToSender', type: 'uint256' }] },
  { name: 'streamCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'pendingOwner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
  { name: 'acceptOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
]

export function isStreamsLive() { return !!STREAMS_ADDRESS }

export async function createStream(recipient, amountUsdc, durationInSeconds, title = '', memo = '', category = '') {
  if (!isStreamsLive()) throw new Error('Streams contract not deployed')
  const { parseUnits, encodeFunctionData } = await import('viem')
  const pc = getPublicClient()
  const wc = getWalletClient()
  const account = getAccount()

  const amountUnits = parseUnits(amountUsdc.toString(), 6) // USDC has 6 decimals on Arc

  try {
    // 1. Approve USDC spending for the Streams contract
    const usdcAbi = [
      { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
      { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
    ]

    const allowance = await pc.readContract({
      address: '0x3600000000000000000000000000000000000000',
      abi: usdcAbi,
      functionName: 'allowance',
      args: [account, STREAMS_ADDRESS]
    })

    if (allowance < amountUnits) {
      const txApprove = await wc.sendTransaction({
        account, to: '0x3600000000000000000000000000000000000000',
        data: encodeFunctionData({ abi: usdcAbi, functionName: 'approve', args: [STREAMS_ADDRESS, amountUnits] }),
        chain: arcTestnet
      })
      const approveReceipt = await pc.waitForTransactionReceipt({ hash: txApprove })
      if (approveReceipt.status !== 'success') {
        throw new Error('USDC Approval transaction failed on-chain')
      }
    }

    // 2. Create the stream on-chain
    const txStream = await wc.sendTransaction({
      account, to: STREAMS_ADDRESS,
      data: encodeFunctionData({ abi: STREAMS_ABI, functionName: 'createStream', args: [recipient, amountUnits, BigInt(durationInSeconds)] }),
      chain: arcTestnet
    })
    const receipt = await pc.waitForTransactionReceipt({ hash: txStream })
    if (receipt.status !== 'success') {
      throw new Error('Stream creation transaction failed on-chain')
    }

    // Read latest streamCount to attach metadata
    try {
      const currentCount = await pc.readContract({
        address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'streamCount'
      })
      const streamId = Number(currentCount)
      const meta = {
        title: (title || '').trim() || `Stream #${streamId}`,
        memo: (memo || '').trim(),
        category: (category || '').trim() || 'Subscription',
        txHash: receipt.transactionHash,
        createdAt: Date.now()
      }
      localStorage.setItem(`parcis_stream_meta_${streamId}`, JSON.stringify(meta))
    } catch (metaErr) {
      console.warn('Failed to store stream metadata locally:', metaErr)
    }

    // Invalidate cached streams so UI updates immediately
    invalidateCache(`user_streams_${account.toLowerCase()}`)
    if (recipient) invalidateCache(`user_streams_${recipient.toLowerCase()}`)

    return receipt.transactionHash
  } catch (e) {
    console.error('Error in createStream:', e)
    throw new Error(e.message || 'Failed to create stream')
  }
}

export async function getStream(id) {
  if (!isStreamsLive()) return null
  try {
    const pc = getPublicClient()
    const { formatUnits } = await import('viem')
    // Parallel fetch stream data + balances in one burst
    const [raw, bals] = await Promise.all([
      pc.readContract({ address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'streams', args: [BigInt(id)] }),
      pc.readContract({ address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'balanceOf', args: [BigInt(id)] })
    ])
    if (raw[0] === '0x0000000000000000000000000000000000000000') return null

    let meta = null
    try {
      const metaRaw = localStorage.getItem(`parcis_stream_meta_${id}`)
      if (metaRaw) meta = JSON.parse(metaRaw)
    } catch (e) {}

    return {
      id: Number(id),
      sender: raw[0].toLowerCase(),
      recipient: raw[1].toLowerCase(),
      depositAmount: parseFloat(formatUnits(raw[2], 6)),
      startTime: Number(raw[3]),
      stopTime: Number(raw[4]),
      amountWithdrawn: parseFloat(formatUnits(raw[5], 6)),
      isActive: raw[6],
      withdrawable: parseFloat(formatUnits(bals[0], 6)),
      refundable: parseFloat(formatUnits(bals[1], 6)),
      title: meta?.title || `Stream #${id}`,
      memo: meta?.memo || '',
      category: meta?.category || (meta?.title ? 'Subscription' : 'Direct')
    }
  } catch (e) { console.error('getStream', e); return null }
}

export async function withdrawStream(id) {
  if (!isStreamsLive()) throw new Error('Streams not deployed')
  const { encodeFunctionData } = await import('viem')
  const pc = getPublicClient()
  const wc = getWalletClient()
  const account = getAccount()
  const tx = await wc.sendTransaction({
    account, to: STREAMS_ADDRESS,
    data: encodeFunctionData({ abi: STREAMS_ABI, functionName: 'withdrawFromStream', args: [BigInt(id)] }),
    chain: arcTestnet
  })
  const receipt = await pc.waitForTransactionReceipt({ hash: tx })
  if (receipt.status === 'reverted') throw new Error('Stream withdrawal reverted on-chain')

  // Invalidate stream cache for caller
  if (account) invalidateCache(`user_streams_${account.toLowerCase()}`)

  return receipt.transactionHash
}

export async function cancelStream(id) {
  if (!isStreamsLive()) throw new Error('Streams not deployed')
  const { encodeFunctionData } = await import('viem')
  const pc = getPublicClient()
  const wc = getWalletClient()
  const account = getAccount()
  const tx = await wc.sendTransaction({
    account, to: STREAMS_ADDRESS,
    data: encodeFunctionData({ abi: STREAMS_ABI, functionName: 'cancelStream', args: [BigInt(id)] }),
    chain: arcTestnet
  })
  const receipt = await pc.waitForTransactionReceipt({ hash: tx })
  if (receipt.status === 'reverted') throw new Error('Stream cancellation reverted on-chain')

  // Invalidate stream cache for caller
  if (account) invalidateCache(`user_streams_${account.toLowerCase()}`)

  return receipt.transactionHash
}

export async function getUserStreams(address) {
  if (!address || !isStreamsLive()) return []
  return fetchWithCache(`user_streams_${address.toLowerCase()}`, async () => {
    try {
      const pc = getPublicClient()
      const { formatUnits } = await import('viem')
      const addr = address.toLowerCase()

      const count = await pc.readContract({
        address: STREAMS_ADDRESS, abi: STREAMS_ABI,
        functionName: 'streamCount'
      })
      const total = Number(count)
      if (total === 0) return []

      // Use multicall to batch all stream data + balance reads into a single RPC call
      const calls = []
      for (let i = 1; i <= total; i++) {
        calls.push({
          address: STREAMS_ADDRESS, abi: STREAMS_ABI,
          functionName: 'streams', args: [BigInt(i)]
        })
        calls.push({
          address: STREAMS_ADDRESS, abi: STREAMS_ABI,
          functionName: 'balanceOf', args: [BigInt(i)]
        })
      }

      const results = await pc.multicall({ contracts: calls, allowFailure: true })

      const streams = []
      for (let i = 0; i < total; i++) {
        const rawResult = results[i * 2]
        const balResult = results[i * 2 + 1]

        if (rawResult.status !== 'success' || !rawResult.result) continue

        const raw = rawResult.result
        const sender = (raw[0] || '').toLowerCase()
        const recipient = (raw[1] || '').toLowerCase()

        // Skip streams that don't involve this address
        if (sender !== addr && recipient !== addr) continue
        // Skip zero-address streams
        if (sender === '0x0000000000000000000000000000000000000000') continue

        const bals = balResult.status === 'success' ? balResult.result : [0n, 0n]
        const streamId = i + 1

        let meta = null
        try {
          const metaRaw = localStorage.getItem(`parcis_stream_meta_${streamId}`)
          if (metaRaw) meta = JSON.parse(metaRaw)
        } catch (e) {}

        streams.push({
          id: streamId,
          sender,
          recipient,
          depositAmount: parseFloat(formatUnits(raw[2], 6)),
          startTime: Number(raw[3]),
          stopTime: Number(raw[4]),
          amountWithdrawn: parseFloat(formatUnits(raw[5], 6)),
          isActive: raw[6],
          withdrawable: parseFloat(formatUnits(bals[0] || 0n, 6)),
          refundable: parseFloat(formatUnits(bals[1] || 0n, 6)),
          title: meta?.title || `Stream #${streamId}`,
          memo: meta?.memo || '',
          category: meta?.category || (meta?.title ? 'Subscription' : 'Direct')
        })
      }

      return streams.sort((a, b) => b.startTime - a.startTime)
    } catch (e) { console.error('getUserStreams', e); return [] }
  })
}

// ═════════════════════════════════════════════════════════════
// ─── DEV REGISTRY & ADMIN BLOCKCHAIN CONTROLS ───
// ═════════════════════════════════════════════════════════════
const _devRegistryRaw = (CONFIG.devRegistryContract || import.meta.env.VITE_DEV_REGISTRY_CONTRACT || '').trim()
export const DEV_REGISTRY_ADDRESS = /^0x[0-9a-fA-F]{40}$/.test(_devRegistryRaw) ? _devRegistryRaw : null

export const DEV_REGISTRY_ABI = [
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'pendingOwner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'transferOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
  { name: 'acceptOwnership', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'platformTreasury', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'apiRelayer', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'parcisStreams', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'totalDevelopers', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'setPlatformTreasury', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_treasury', type: 'address' }], outputs: [] },
  { name: 'setApiRelayer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_relayer', type: 'address' }], outputs: [] },
  { name: 'setParcisStreams', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_streams', type: 'address' }], outputs: [] },
]

/**
 * Emergency Circuit Breaker: pause contract actions
 * @param {'safe'|'links'|'streams'} contractName
 */
export async function pauseContract(contractName) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cName = (contractName || '').toLowerCase()

  if (cName === 'safe' || cName === 'parcissafe') {
    if (isLive()) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'pause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_safe', 'true')
    invalidateCache('contract_paused_status')
    return '0xmock_paused_safe'
  }

  if (cName === 'links' || cName === 'parcislinks') {
    if (LINKS_CONTRACT_ADDRESS) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'pause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_links', 'true')
    invalidateCache('contract_paused_status')
    return '0xmock_paused_links'
  }

  if (cName === 'streams' || cName === 'parcisstreams') {
    if (isStreamsLive()) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'pause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_streams', 'true')
    invalidateCache('contract_paused_status')
    return '0xmock_paused_streams'
  }

  throw new Error(`Unknown contract: ${contractName}`)
}

/**
 * Emergency Circuit Breaker: resume protocol actions
 * @param {'safe'|'links'|'streams'} contractName
 */
export async function unpauseContract(contractName) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cName = (contractName || '').toLowerCase()

  if (cName === 'safe' || cName === 'parcissafe') {
    if (isLive()) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'unpause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_safe', 'false')
    invalidateCache('contract_paused_status')
    return '0xmock_unpaused_safe'
  }

  if (cName === 'links' || cName === 'parcislinks') {
    if (LINKS_CONTRACT_ADDRESS) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'unpause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_links', 'false')
    invalidateCache('contract_paused_status')
    return '0xmock_unpaused_links'
  }

  if (cName === 'streams' || cName === 'parcisstreams') {
    if (isStreamsLive()) {
      try {
        const pc = getPublicClient()
        const wc = getWalletClient()
        const hash = await wc.writeContract({
          address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'unpause',
          account, chain: arcTestnet, gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
        invalidateCache('contract_paused_status')
        return hash
      } catch (e) {
        throw new Error(parseRevertError(e))
      }
    }
    localStorage.setItem('arc_paused_streams', 'false')
    invalidateCache('contract_paused_status')
    return '0xmock_unpaused_streams'
  }

  throw new Error(`Unknown contract: ${contractName}`)
}

/**
 * Check real-time pause status across all 3 contracts
 */
export async function getContractPausedStatus() {
  const status = { safe: false, links: false, streams: false }
  const pc = getPublicClient()

  if (isLive()) {
    try {
      status.safe = await pc.readContract({
        address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'paused'
      })
    } catch (e) {
      status.safe = localStorage.getItem('arc_paused_safe') === 'true'
    }
  } else {
    status.safe = localStorage.getItem('arc_paused_safe') === 'true'
  }

  if (LINKS_CONTRACT_ADDRESS) {
    try {
      status.links = await pc.readContract({
        address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'paused'
      })
    } catch (e) {
      status.links = localStorage.getItem('arc_paused_links') === 'true'
    }
  } else {
    status.links = localStorage.getItem('arc_paused_links') === 'true'
  }

  if (isStreamsLive()) {
    try {
      status.streams = await pc.readContract({
        address: STREAMS_ADDRESS, abi: STREAMS_ABI, functionName: 'paused'
      })
    } catch (e) {
      status.streams = localStorage.getItem('arc_paused_streams') === 'true'
    }
  } else {
    status.streams = localStorage.getItem('arc_paused_streams') === 'true'
  }

  return status
}

// ═════════════════════════════════════════════════════════════
// ─── MULTI-CONTRACT 2-STEP OWNERSHIP MANAGEMENT ───
// ═════════════════════════════════════════════════════════════

export const PROTOCOL_CONTRACTS = [
  {
    key: 'safe',
    name: 'ParcisSafe (Escrow & Arbitration)',
    shortName: 'ParcisSafe',
    category: 'Escrow & Dispute Resolution',
    getAddress: () => DEPLOYED_ADDRESS,
    getAbi: () => ARCSAFE_ABI,
    mockOwnerKey: 'arc_custom_owner',
    mockPendingKey: 'arc_pending_owner'
  },
  {
    key: 'links',
    name: 'ParcisLinks (Payment Links)',
    shortName: 'ParcisLinks',
    category: 'Paylinks & Vanity Slugs',
    getAddress: () => LINKS_CONTRACT_ADDRESS,
    getAbi: () => LINKS_ABI,
    mockOwnerKey: 'arc_owner_links',
    mockPendingKey: 'arc_pending_links'
  },
  {
    key: 'streams',
    name: 'ParcisStreams (Streaming Payroll)',
    shortName: 'ParcisStreams',
    category: 'Continuous Streaming Payments',
    getAddress: () => STREAMS_ADDRESS,
    getAbi: () => STREAMS_ABI,
    mockOwnerKey: 'arc_owner_streams',
    mockPendingKey: 'arc_pending_streams'
  },
  {
    key: 'devRegistry',
    name: 'ParcisDevRegistry (Developer Relayer)',
    shortName: 'ParcisDevRegistry',
    category: 'Developer SDK & Gas Relayer',
    getAddress: () => DEV_REGISTRY_ADDRESS,
    getAbi: () => DEV_REGISTRY_ABI,
    mockOwnerKey: 'arc_owner_dev_registry',
    mockPendingKey: 'arc_pending_dev_registry'
  }
]

export function getContractMeta(key) {
  const normKey = (key || 'safe').toLowerCase()
  return PROTOCOL_CONTRACTS.find(c => c.key.toLowerCase() === normKey || c.shortName.toLowerCase() === normKey) || PROTOCOL_CONTRACTS[0]
}

export async function getSingleContractOwner(contractKey = 'safe') {
  const meta = getContractMeta(contractKey)
  const addr = meta.getAddress()
  if (addr) {
    const pc = getPublicClient()
    try {
      const owner = await pc.readContract({
        address: addr,
        abi: meta.getAbi(),
        functionName: 'owner',
        args: []
      })
      return owner
    } catch (e) {
      console.warn(`Failed to read owner for ${meta.shortName}:`, e)
      return localStorage.getItem(meta.mockOwnerKey) || '0x0000000000000000000000000000000000000000'
    }
  }
  return localStorage.getItem(meta.mockOwnerKey) || getAccount() || '0x0000000000000000000000000000000000000000'
}

/**
 * Read pending owner (2-step ownership transfer)
 */
export async function getPendingOwner(contractKey = 'safe') {
  const meta = getContractMeta(contractKey)
  const addr = meta.getAddress()
  if (addr) {
    const pc = getPublicClient()
    try {
      const pending = await pc.readContract({
        address: addr,
        abi: meta.getAbi(),
        functionName: 'pendingOwner',
        args: []
      })
      return pending && pending !== '0x0000000000000000000000000000000000000000' ? pending : null
    } catch (e) {
      return localStorage.getItem(meta.mockPendingKey) || null
    }
  }
  return localStorage.getItem(meta.mockPendingKey) || null
}

/**
 * Read ownership and pending nominee across all 4 protocol contracts in parallel
 */
export async function getAllContractsOwnership() {
  const account = (getAccount() || '').toLowerCase()
  const pc = getPublicClient()

  const list = await Promise.all(PROTOCOL_CONTRACTS.map(async (meta) => {
    const addr = meta.getAddress()
    let owner = '0x0000000000000000000000000000000000000000'
    let pendingOwner = null
    const isLiveMode = !!addr

    if (addr) {
      try {
        const [o, p] = await Promise.allSettled([
          pc.readContract({ address: addr, abi: meta.getAbi(), functionName: 'owner' }),
          pc.readContract({ address: addr, abi: meta.getAbi(), functionName: 'pendingOwner' })
        ])
        const oVal = (o.status === 'fulfilled' || o.status === 'success') ? (o.value ?? o.result) : null
        const pVal = (p.status === 'fulfilled' || p.status === 'success') ? (p.value ?? p.result) : null
        if (oVal) owner = oVal
        if (pVal && pVal !== '0x0000000000000000000000000000000000000000') {
          pendingOwner = pVal
        }
      } catch (e) {
        console.warn(`getAllContractsOwnership failed for ${meta.shortName}:`, e)
      }
    } else {
      owner = localStorage.getItem(meta.mockOwnerKey) || getAccount() || '0x0000000000000000000000000000000000000000'
      pendingOwner = localStorage.getItem(meta.mockPendingKey) || null
    }

    const isOwner = !!(account && owner && account === owner.toLowerCase())
    const isPendingOwner = !!(account && pendingOwner && account === pendingOwner.toLowerCase())

    return {
      key: meta.key,
      name: meta.name,
      shortName: meta.shortName,
      category: meta.category,
      address: addr,
      owner,
      pendingOwner,
      isOwner,
      isPendingOwner,
      isLive: isLiveMode
    }
  }))

  const ownedCount = list.filter(c => c.isOwner).length
  const pendingClaimCount = list.filter(c => c.isPendingOwner).length

  return {
    contracts: list,
    byKey: Object.fromEntries(list.map(c => [c.key, c])),
    ownedCount,
    pendingClaimCount,
    hasPendingClaims: pendingClaimCount > 0
  }
}

/**
 * 2-Step Ownership Transfer (Step 1: Nominate)
 * @param {string} newOwner
 * @param {string} contractKey 'safe'|'links'|'streams'|'devRegistry'|'all'
 */
export async function transferContractOwnership(newOwner, contractKey = 'safe') {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (newOwner || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) {
    throw new Error('Invalid Ethereum/Arc address: must be 42 characters starting with 0x')
  }

  const targets = (contractKey === 'all')
    ? PROTOCOL_CONTRACTS
    : [getContractMeta(contractKey)]

  const results = []
  const pc = getPublicClient()
  const wc = getWalletClient()

  for (const meta of targets) {
    const addr = meta.getAddress()
    if (addr) {
      try {
        const hash = await wc.writeContract({
          address: addr,
          abi: meta.getAbi(),
          functionName: 'transferOwnership',
          args: [cleanAddr],
          account,
          chain: arcTestnet,
          gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error(`Transaction reverted on-chain for ${meta.shortName}`)
        results.push({ contract: meta.shortName, hash, success: true })
      } catch (e) {
        if (targets.length === 1) {
          throw new Error(`[${meta.shortName}] ${parseRevertError(e)}`)
        }
        results.push({ contract: meta.shortName, error: parseRevertError(e), success: false })
      }
    } else {
      localStorage.setItem(meta.mockPendingKey, cleanAddr)
      results.push({ contract: meta.shortName, hash: `0xmock_transferred_${meta.key}`, success: true })
    }
  }

  return results.length === 1 ? results[0].hash : results
}

/**
 * 2-Step Ownership Acceptance (Step 2: Claim)
 * @param {string} contractKey 'safe'|'links'|'streams'|'devRegistry'|'all'
 */
export async function acceptContractOwnership(contractKey = 'safe') {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')

  let targets = []
  if (contractKey === 'all') {
    // When accepting 'all', find all contracts where caller is pending owner
    const all = await getAllContractsOwnership()
    targets = all.contracts.filter(c => c.isPendingOwner).map(c => getContractMeta(c.key))
    if (targets.length === 0) {
      throw new Error('Your connected wallet is not nominated as pending owner on any contract')
    }
  } else {
    targets = [getContractMeta(contractKey)]
  }

  const results = []
  const pc = getPublicClient()
  const wc = getWalletClient()

  for (const meta of targets) {
    const addr = meta.getAddress()
    if (addr) {
      try {
        const hash = await wc.writeContract({
          address: addr,
          abi: meta.getAbi(),
          functionName: 'acceptOwnership',
          account,
          chain: arcTestnet,
          gas: 150000n
        })
        const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
        if (receipt.status === 'reverted') throw new Error(`Transaction reverted on-chain for ${meta.shortName}`)
        localStorage.removeItem(meta.mockPendingKey)
        results.push({ contract: meta.shortName, hash, success: true })
      } catch (e) {
        if (targets.length === 1) {
          throw new Error(`[${meta.shortName}] ${parseRevertError(e)}`)
        }
        results.push({ contract: meta.shortName, error: parseRevertError(e), success: false })
      }
    } else {
      const pending = localStorage.getItem(meta.mockPendingKey)
      if (pending && pending.toLowerCase() === account.toLowerCase()) {
        localStorage.setItem(meta.mockOwnerKey, account)
        localStorage.removeItem(meta.mockPendingKey)
        results.push({ contract: meta.shortName, hash: `0xmock_accepted_${meta.key}`, success: true })
      } else if (targets.length === 1) {
        throw new Error(`Caller is not the nominated pending owner for ${meta.shortName}`)
      }
    }
  }

  return results.length === 1 ? results[0].hash : results
}

/**
 * Get DevRegistry current configuration
 */
export async function getDevRegistryConfig() {
  const config = {
    address: DEV_REGISTRY_ADDRESS,
    treasury: '0x0000000000000000000000000000000000000000',
    relayer: '0x0000000000000000000000000000000000000000',
    streams: '0x0000000000000000000000000000000000000000',
    totalDevs: 0
  }

  if (DEV_REGISTRY_ADDRESS) {
    const pc = getPublicClient()
    try {
      const [t, r, s, d] = await Promise.allSettled([
        pc.readContract({ address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'platformTreasury' }),
        pc.readContract({ address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'apiRelayer' }),
        pc.readContract({ address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'parcisStreams' }),
        pc.readContract({ address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'totalDevelopers' })
      ])
      const getVal = (res) => (res && (res.status === 'fulfilled' || res.status === 'success')) ? (res.value ?? res.result) : null
      const tVal = getVal(t)
      const rVal = getVal(r)
      const sVal = getVal(s)
      const dVal = getVal(d)
      if (tVal) config.treasury = tVal
      if (rVal) config.relayer = rVal
      if (sVal) config.streams = sVal
      if (dVal !== null && dVal !== undefined) config.totalDevs = Number(dVal)
      return config
    } catch (e) {
      console.warn('getDevRegistryConfig error:', e)
    }
  }
  config.treasury = localStorage.getItem('dev_platform_treasury') || getAccount() || '0x0000000000000000000000000000000000000000'
  config.relayer = localStorage.getItem('dev_api_relayer') || '0x0000000000000000000000000000000000000000'
  config.streams = localStorage.getItem('dev_parcis_streams') || STREAMS_ADDRESS || '0x0000000000000000000000000000000000000000'
  return config
}

export async function setPlatformTreasury(treasuryAddress) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (treasuryAddress || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) throw new Error('Invalid Ethereum/Arc address')

  if (DEV_REGISTRY_ADDRESS) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'setPlatformTreasury',
        args: [cleanAddr], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('dev_platform_treasury', cleanAddr)
  return '0xmock_treasury_set'
}

export async function setApiRelayer(relayerAddress) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (relayerAddress || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) throw new Error('Invalid Ethereum/Arc address')

  if (DEV_REGISTRY_ADDRESS) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'setApiRelayer',
        args: [cleanAddr], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('dev_api_relayer', cleanAddr)
  return '0xmock_relayer_set'
}

export async function setDevRegistryStreams(streamsAddress) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (streamsAddress || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) throw new Error('Invalid Ethereum/Arc address')

  if (DEV_REGISTRY_ADDRESS) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: DEV_REGISTRY_ADDRESS, abi: DEV_REGISTRY_ABI, functionName: 'setParcisStreams',
        args: [cleanAddr], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('dev_parcis_streams', cleanAddr)
  return '0xmock_dev_streams_set'
}

/**
 * Get Links contract configuration
 */
export async function getLinksConfig() {
  const config = {
    address: LINKS_CONTRACT_ADDRESS,
    admin: '0x0000000000000000000000000000000000000000',
    premiumSlugFee: CONFIG.premiumSlugFee || 0.5,
    platformWallet: '0x0000000000000000000000000000000000000000'
  }

  if (LINKS_CONTRACT_ADDRESS) {
    const pc = getPublicClient()
    const { formatUnits } = await import('viem')
    try {
      const [a, f, w] = await Promise.allSettled([
        pc.readContract({ address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'admin' }),
        pc.readContract({ address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'premiumSlugFee' }),
        pc.readContract({ address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'platformWallet' })
      ])
      const getVal = (res) => (res && (res.status === 'fulfilled' || res.status === 'success')) ? (res.value ?? res.result) : null
      const aVal = getVal(a)
      const fVal = getVal(f)
      const wVal = getVal(w)
      if (aVal) config.admin = aVal
      if (fVal !== null && fVal !== undefined) config.premiumSlugFee = parseFloat(formatUnits(fVal, 6))
      if (wVal) config.platformWallet = wVal
      return config
    } catch (e) {
      console.warn('getLinksConfig error:', e)
    }
  }

  config.admin = localStorage.getItem('links_admin') || getAccount() || '0x0000000000000000000000000000000000000000'
  config.premiumSlugFee = parseFloat(localStorage.getItem('links_premium_slug_fee') || String(CONFIG.premiumSlugFee || 0.5))
  config.platformWallet = localStorage.getItem('links_platform_wallet') || getAccount() || '0x0000000000000000000000000000000000000000'
  return config
}

export async function setLinksAdmin(adminAddress) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (adminAddress || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) throw new Error('Invalid Ethereum/Arc address')

  if (LINKS_CONTRACT_ADDRESS) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'setAdmin',
        args: [cleanAddr], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('links_admin', cleanAddr)
  return '0xmock_links_admin_set'
}

export async function setLinksPremiumSlugFee(feeUsdc) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const fee = parseFloat(feeUsdc)
  if (isNaN(fee) || fee < 0) throw new Error('Invalid fee value')

  if (LINKS_CONTRACT_ADDRESS) {
    try {
      const { parseUnits } = await import('viem')
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'setPremiumSlugFee',
        args: [parseUnits(fee.toString(), 6)], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('links_premium_slug_fee', fee.toString())
  return '0xmock_links_fee_set'
}

export async function setLinksPlatformWallet(walletAddress) {
  const account = getAccount()
  if (!account) throw new Error('Connect wallet first')
  const cleanAddr = (walletAddress || '').trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(cleanAddr)) throw new Error('Invalid Ethereum/Arc address')

  if (LINKS_CONTRACT_ADDRESS) {
    try {
      const pc = getPublicClient()
      const wc = getWalletClient()
      const hash = await wc.writeContract({
        address: LINKS_CONTRACT_ADDRESS, abi: LINKS_ABI, functionName: 'setPlatformWallet',
        args: [cleanAddr], account, chain: arcTestnet, gas: 150000n
      })
      const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
      return hash
    } catch (e) {
      throw new Error(parseRevertError(e))
    }
  }
  localStorage.setItem('links_platform_wallet', cleanAddr)
  return '0xmock_links_wallet_set'
}

