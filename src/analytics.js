// ═══ Parcis 100% Pure On-Chain Multi-Contract Analytics Engine ═══
// Zero mock data. Zero localStorage. Zero databases.
// Aggregates REAL data directly from ALL 3 deployed smart contracts:
// 1. ArcSafe Escrow  — Deals, Disputes, Appeals, Arbiter Stakes, Platform Fees
// 2. ParcisLinks     — Payment Links (Fixed, Open, Group), PaymentReceived events
// 3. ParcisStreams    — USDC Streaming Subscriptions, Withdrawals
//
// PERFORMANCE: Uses 4 optimization layers:
// 1. fetchWithCache (120s TTL) — tab switches instant, no re-fetch
// 2. Incremental event log scanning — only scans NEW blocks since last scan
// 3. Maximum parallelization — all contracts queried simultaneously
// 4. Request deduplication — concurrent calls share one fetch

import { getAllDeals, getPlatformArbiters, getContractOwner, DEPLOYED_ADDRESS as ESCROW_ADDRESS, STREAMS_ADDRESS, isStreamsLive } from './contract.js'
import { LINKS_CONTRACT_ADDRESS, LINKS_ABI, isLive as isLinksLive, fetchLinkFromChain } from './links-contract.js'
import { getPublicClient } from './wallet.js'
import { formatUnits } from 'viem'
import { CONFIG } from './config.js'
import { fetchWithCache } from './cache.js'

// ─── Persistent event log cache (survives across calls, only scans new blocks) ───
let _cachedPaymentEvents = []
let _lastScannedBlock = 0n
const DEPLOYMENT_BLOCK = 48085000n

// ─── Fetch ALL streams from ParcisStreams contract ───
async function fetchAllStreams() {
  if (!isStreamsLive()) return []
  try {
    const pc = getPublicClient()
    const STREAMS_ABI_VIEW = [
      { name: 'streamCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
      { name: 'streams', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'depositAmount', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'stopTime', type: 'uint256' }, { name: 'amountWithdrawn', type: 'uint256' }, { name: 'isActive', type: 'bool' }] },
    ]
    const countBig = await pc.readContract({ address: STREAMS_ADDRESS, abi: STREAMS_ABI_VIEW, functionName: 'streamCount' })
    const total = Number(countBig)
    if (total === 0) return []

    // Parallel burst fetch — all streams at once
    const results = await Promise.all(
      Array.from({ length: total }, (_, i) =>
        pc.readContract({ address: STREAMS_ADDRESS, abi: STREAMS_ABI_VIEW, functionName: 'streams', args: [BigInt(i + 1)] })
          .then(raw => ({ id: i + 1, raw }))
          .catch(() => null)
      )
    )

    return results.filter(r => r && r.raw.sender !== '0x0000000000000000000000000000000000000000').map(({ id, raw }) => ({
      id,
      sender: raw.sender.toLowerCase(),
      recipient: raw.recipient.toLowerCase(),
      depositAmount: parseFloat(formatUnits(raw.depositAmount, 6)),
      startTime: Number(raw.startTime) * 1000,
      stopTime: Number(raw.stopTime) * 1000,
      amountWithdrawn: parseFloat(formatUnits(raw.amountWithdrawn, 6)),
      isActive: raw.isActive,
    }))
  } catch (e) {
    console.warn("Failed to fetch streams:", e)
    return []
  }
}

// ─── INCREMENTAL event log scan — only scans blocks since last scan ───
async function fetchAllLinkPaymentEvents() {
  if (!isLinksLive()) return []
  try {
    const pc = getPublicClient()
    const currentBlock = await pc.getBlockNumber()

    // Start from where we left off (or deployment block on first run)
    const startBlock = _lastScannedBlock > 0n ? _lastScannedBlock + 1n : DEPLOYMENT_BLOCK

    // If no new blocks, return cached events immediately
    if (startBlock > currentBlock) return _cachedPaymentEvents

    const chunks = []
    for (let from = startBlock; from <= currentBlock; from += 9500n) {
      let to = from + 9499n
      if (to > currentBlock) to = currentBlock
      chunks.push({ from, to })
    }

    // Parallel fetch all chunks at once
    const logResults = await Promise.all(
      chunks.map(chunk =>
        pc.getContractEvents({
          address: LINKS_CONTRACT_ADDRESS,
          abi: LINKS_ABI,
          eventName: 'PaymentReceived',
          fromBlock: chunk.from,
          toBlock: chunk.to,
        }).catch(() => [])
      )
    )

    const newEvents = logResults.flat()

    // Append to persistent cache + update watermark
    _cachedPaymentEvents = [..._cachedPaymentEvents, ...newEvents]
    _lastScannedBlock = currentBlock

    return _cachedPaymentEvents
  } catch (e) {
    console.warn("Failed to fetch link payment events:", e)
    return _cachedPaymentEvents // Return whatever we have cached
  }
}

// ─── Discover all unique link IDs from payment events + fetch their details ───
async function fetchAllLinksFromChain(paymentEvents) {
  if (!isLinksLive()) return []
  try {
    const linkIdSet = new Set()
    paymentEvents.forEach(log => {
      if (log.args?.id) linkIdSet.add(log.args.id)
    })

    // Also discover links via getUserLinks for admin wallets (parallel)
    if (CONFIG.adminWallets.length > 0) {
      const pc = getPublicClient()
      const adminResults = await Promise.all(
        CONFIG.adminWallets.map(addr =>
          pc.readContract({
            address: LINKS_CONTRACT_ADDRESS,
            abi: LINKS_ABI,
            functionName: 'getUserLinks',
            args: [addr],
          }).catch(() => [])
        )
      )
      adminResults.flat().forEach(id => linkIdSet.add(id))
    }

    if (linkIdSet.size === 0) return []

    function bytes32ToSlug(hex) {
      const bytes = hex.slice(2).match(/.{2}/g).map(b => parseInt(b, 16))
      return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\0+/g, '')
    }

    // Parallel burst fetch all link details
    const links = await Promise.all(
      Array.from(linkIdSet).map(id => fetchLinkFromChain(bytes32ToSlug(id)))
    )

    return links.filter(Boolean)
  } catch (e) {
    console.warn("Failed to fetch all links:", e)
    return []
  }
}

// ═══════════════════════════════════════════════════════
// MAIN: Aggregate analytics from ALL 3 smart contracts
// Wrapped in fetchWithCache — 120s TTL for instant tab switches
// ═══════════════════════════════════════════════════════
export async function getOnChainAnalytics() {
  return fetchWithCache('admin_analytics_full', async () => {
    return _computeAnalytics()
  }, 120_000) // 2-minute cache
}

// Force-refresh (bypasses cache)
export async function refreshOnChainAnalytics() {
  const { invalidateCache } = await import('./cache.js')
  invalidateCache('admin_analytics_full')
  return getOnChainAnalytics()
}

async function _computeAnalytics() {
  try {
    // Fire ALL data sources in maximum parallel
    const [ownerAddress, deals, arbiters, streams, paymentEvents] = await Promise.all([
      getContractOwner().catch(() => null),
      getAllDeals().catch(() => []),
      getPlatformArbiters().catch(() => []),
      fetchAllStreams(),
      fetchAllLinkPaymentEvents(),
    ])

    // Fetch discovered links (depends on paymentEvents result)
    const linksList = await fetchAllLinksFromChain(paymentEvents)

    const uniqueWallets = new Set()

    // ══════════════════════════════════════════════════
    // 1. ARCSAFE ESCROW CONTRACT METRICS
    // ══════════════════════════════════════════════════
    let escrowVolume = 0, fundedDeals = 0, completedDeals = 0
    let disputedDeals = 0, appealedDeals = 0, resolvedVolume = 0

    deals.forEach(d => {
      const amt = parseFloat(d.amount || 0)
      escrowVolume += amt
      if (d.client) uniqueWallets.add(d.client.toLowerCase())
      if (d.worker) uniqueWallets.add(d.worker.toLowerCase())
      if (d.arbiter && d.arbiter !== '0x0000000000000000000000000000000000000000') uniqueWallets.add(d.arbiter.toLowerCase())
      if (d.status === 1) fundedDeals++
      else if (d.status === 3) completedDeals++
      else if (d.status === 4) disputedDeals++
      else if (d.status === 5) { resolvedVolume += amt }
      else if (d.status === 7) appealedDeals++
    })

    const escrowTxCount = deals.length
    const escrowPlatformFee = escrowVolume * ((CONFIG.platformFeePercent || 0.25) / 100)
    const arbiterFeeEarnings = resolvedVolume * ((CONFIG.arbiterFeePercent || 0.5) / 100)

    // ══════════════════════════════════════════════════
    // 2. ARCSAFE ARBITER POOL METRICS
    // ══════════════════════════════════════════════════
    let totalArbiterStaked = 0
    arbiters.forEach(a => {
      if (a.address) uniqueWallets.add(a.address.toLowerCase())
      totalArbiterStaked += (a.stake || 0)
    })

    // ══════════════════════════════════════════════════
    // 3. PARCISLINKS PAYMENT CONTRACT METRICS
    // ══════════════════════════════════════════════════
    let linkVolume = 0, fixedLinks = 0, openLinks = 0, groupLinks = 0
    const linkPayerWallets = new Set()

    linksList.forEach(l => {
      const raised = parseFloat(l.totalRaised || 0)
      linkVolume += raised
      if (l.creator) uniqueWallets.add(l.creator.toLowerCase())
      if (l.type === 'fixed') fixedLinks++
      else if (l.type === 'open') openLinks++
      else if (l.type === 'group') groupLinks++
    })

    let linkEventVolume = 0
    paymentEvents.forEach(log => {
      if (log.args?.payer) {
        linkPayerWallets.add(log.args.payer.toLowerCase())
        uniqueWallets.add(log.args.payer.toLowerCase())
      }
      if (log.args?.creator) uniqueWallets.add(log.args.creator.toLowerCase())
      if (log.args?.amount) {
        linkEventVolume += parseFloat(formatUnits(log.args.amount, 6))
      }
    })

    const finalLinkVolume = Math.max(linkVolume, linkEventVolume)
    const linksTxCount = paymentEvents.length
    const linkPlatformFee = finalLinkVolume * ((CONFIG.platformFeePercent || 0.25) / 100)

    // ══════════════════════════════════════════════════
    // 4. PARCISSTREAMS CONTRACT METRICS
    // ══════════════════════════════════════════════════
    let streamVolume = 0, activeStreams = 0, completedStreams = 0, streamWithdrawn = 0

    streams.forEach(s => {
      streamVolume += s.depositAmount
      streamWithdrawn += s.amountWithdrawn
      if (s.sender) uniqueWallets.add(s.sender)
      if (s.recipient) uniqueWallets.add(s.recipient)
      if (s.isActive) activeStreams++
      else completedStreams++
    })

    const streamsTxCount = streams.length
    const streamPlatformFee = streamVolume * ((CONFIG.platformFeePercent || 0.25) / 100)

    // ══════════════════════════════════════════════════
    // 5. COMBINED PROTOCOL TOTALS
    // ══════════════════════════════════════════════════
    const totalVolume = escrowVolume + finalLinkVolume + streamVolume + totalArbiterStaked
    const totalPlatformRevenue = escrowPlatformFee + linkPlatformFee + streamPlatformFee
    const totalTxCount = escrowTxCount + linksTxCount + streamsTxCount
    const successRate = deals.length > 0 ? (((deals.length - disputedDeals) / deals.length) * 100).toFixed(1) : '100'

    // Build real chronological activity feed
    const activityFeed = [
      ...deals.map(d => ({
        id: `deal_${d.id}`,
        icon: d.status === 4 ? 'alertTriangle' : (d.status === 3 ? 'checkCircle' : 'shield'),
        title: `Escrow Deal #${d.id}: ${d.title || 'Untitled'}`,
        subtitle: `Client: ${d.client?.slice(0,6)}...${d.client?.slice(-4)} • Worker: ${d.worker?.slice(0,6)}...${d.worker?.slice(-4)}`,
        badge: d.status === 7 ? 'Appealed' : (d.status === 4 ? 'Disputed' : (d.status === 3 ? 'Completed' : 'Active')),
        badgeClass: d.status === 7 || d.status === 4 ? 'badge-danger' : (d.status === 3 ? 'badge-green' : 'badge-blue'),
        amount: `${parseFloat(d.amount).toFixed(2)} USDC`,
        timestamp: d.createdAt || Date.now()
      })),
      ...streams.map(s => ({
        id: `stream_${s.id}`,
        icon: 'zap',
        title: `Stream #${s.id}: ${s.depositAmount.toFixed(2)} USDC`,
        subtitle: `From: ${s.sender.slice(0,6)}...${s.sender.slice(-4)} → To: ${s.recipient.slice(0,6)}...${s.recipient.slice(-4)}`,
        badge: s.isActive ? 'Streaming' : 'Completed',
        badgeClass: s.isActive ? 'badge-blue' : 'badge-green',
        amount: `${s.depositAmount.toFixed(2)} USDC`,
        timestamp: s.startTime
      })),
      ...linksList.map(l => ({
        id: `link_${l.id}`,
        icon: 'link',
        title: `Payment Link: ${l.label || l.id}`,
        subtitle: `Creator: ${l.creator?.slice(0,6)}...${l.creator?.slice(-4)} • ${l.paymentCount || 0} payments`,
        badge: l.type === 'group' ? 'Group' : (l.type === 'open' ? 'Open' : 'Fixed'),
        badgeClass: 'badge-purple',
        amount: l.totalRaised ? `${l.totalRaised.toFixed(2)} USDC raised` : (l.amount ? `${l.amount.toFixed(2)} USDC` : 'Open'),
        timestamp: l.createdAt || Date.now()
      }))
    ].sort((a, b) => b.timestamp - a.timestamp)

    return {
      isLive: Boolean(ESCROW_ADDRESS || isLinksLive() || isStreamsLive()),
      ownerAddress,
      escrowContract: ESCROW_ADDRESS || 'Not deployed',
      linksContract: LINKS_CONTRACT_ADDRESS || 'Not deployed',
      streamsContract: STREAMS_ADDRESS || 'Not deployed',

      totalVolume, totalPlatformRevenue, totalTxCount,
      uniqueWalletsCount: uniqueWallets.size, successRate,

      escrowVolume, escrowTxCount, escrowPlatformFee,
      totalDeals: deals.length, fundedDeals, completedDeals,
      disputedDeals, appealedDeals, dealsList: deals,

      arbiterFeeEarnings, totalArbiterStaked,
      arbitersCount: arbiters.length, arbitersList: arbiters,

      linkVolume: finalLinkVolume, linksTxCount, linkPlatformFee,
      totalLinksCount: linksList.length, fixedLinks, openLinks, groupLinks,
      linkPayerCount: linkPayerWallets.size, linksList,

      streamVolume, streamsTxCount, streamPlatformFee,
      totalStreams: streams.length, activeStreams, completedStreams,
      streamWithdrawn, streamsList: streams,

      activityFeed,
    }
  } catch (err) {
    console.error("Failed to fetch multi-contract on-chain analytics:", err)
    return _emptyAnalytics()
  }
}

function _emptyAnalytics() {
  return {
    isLive: false, ownerAddress: null,
    escrowContract: ESCROW_ADDRESS || 'Not deployed',
    linksContract: LINKS_CONTRACT_ADDRESS || 'Not deployed',
    streamsContract: STREAMS_ADDRESS || 'Not deployed',
    totalVolume: 0, totalPlatformRevenue: 0, totalTxCount: 0,
    uniqueWalletsCount: 0, successRate: '100',
    escrowVolume: 0, escrowTxCount: 0, escrowPlatformFee: 0,
    totalDeals: 0, fundedDeals: 0, completedDeals: 0,
    disputedDeals: 0, appealedDeals: 0, dealsList: [],
    arbiterFeeEarnings: 0, totalArbiterStaked: 0,
    arbitersCount: 0, arbitersList: [],
    linkVolume: 0, linksTxCount: 0, linkPlatformFee: 0,
    totalLinksCount: 0, fixedLinks: 0, openLinks: 0, groupLinks: 0,
    linkPayerCount: 0, linksList: [],
    streamVolume: 0, streamsTxCount: 0, streamPlatformFee: 0,
    totalStreams: 0, activeStreams: 0, completedStreams: 0,
    streamWithdrawn: 0, streamsList: [],
    activityFeed: [],
  }
}

export async function exportOnChainCSV() {
  const m = await getOnChainAnalytics()
  let csv = "data:text/csv;charset=utf-8,"

  csv += "=== PARCIS MULTI-CONTRACT ON-CHAIN AUDIT REPORT ===\n\n"
  csv += "=== CONTRACT ADDRESSES ===\n"
  csv += `ArcSafe Escrow,${m.escrowContract}\n`
  csv += `ParcisLinks,${m.linksContract}\n`
  csv += `ParcisStreams,${m.streamsContract}\n`
  csv += `Owner,${m.ownerAddress || 'N/A'}\n\n`

  csv += "=== PROTOCOL TOTALS ===\n"
  csv += `Total Combined Volume (USDC),${m.totalVolume}\n`
  csv += `Total Platform Revenue (USDC),${m.totalPlatformRevenue}\n`
  csv += `Total Transactions,${m.totalTxCount}\n`
  csv += `Unique Wallets,${m.uniqueWalletsCount}\n\n`

  csv += "=== PER-CONTRACT BREAKDOWN ===\n"
  csv += `Escrow Volume,${m.escrowVolume},Escrow Txs,${m.escrowTxCount},Escrow Fee,${m.escrowPlatformFee}\n`
  csv += `Links Volume,${m.linkVolume},Links Txs,${m.linksTxCount},Links Fee,${m.linkPlatformFee}\n`
  csv += `Streams Volume,${m.streamVolume},Streams Txs,${m.streamsTxCount},Streams Fee,${m.streamPlatformFee}\n`
  csv += `Arbiter Staked,${m.totalArbiterStaked},Arbiter Fee Earnings,${m.arbiterFeeEarnings}\n\n`

  csv += "=== ESCROW DEALS ===\n"
  csv += "ID,Title,Amount,Client,Worker,Arbiter,Status\n"
  m.dealsList.forEach(d => {
    csv += `"${d.id}","${d.title}","${d.amount}","${d.client}","${d.worker}","${d.arbiter}","${d.status}"\n`
  })

  csv += "\n=== STREAMS ===\n"
  csv += "ID,Sender,Recipient,Deposit,Withdrawn,Active\n"
  m.streamsList.forEach(s => {
    csv += `"${s.id}","${s.sender}","${s.recipient}","${s.depositAmount}","${s.amountWithdrawn}","${s.isActive}"\n`
  })

  const link = document.createElement("a")
  link.setAttribute("href", encodeURI(csv))
  link.setAttribute("download", `Parcis_OnChain_Report_${new Date().toISOString().slice(0,10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
