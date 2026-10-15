// ═══ Parcis Payment Link Module (On-Chain + Fallback) ═══
import QRCode from 'qrcode'
import {
  isLive, createLinkOnChain, createPremiumLinkOnChain, fetchLinkFromChain,
  fetchUserLinksFromChain, checkIdAvailable, signSponsorRequest,
  fetchLinkPaymentsFromChain, isReservedSlug
} from './links-contract.js'
import { checkGasBalance } from './wallet.js'
import { fetchWithCache, invalidateCache } from './cache.js'

const STORE_KEY  = 'parcis_links'
const PYMTS_KEY  = 'parcis_payments'
const SPONSOR_URL = '/api/sponsor-link'

function getStore()    { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] } }
function saveStore(l)  { localStorage.setItem(STORE_KEY, JSON.stringify(l)) }
function getPymts()    { try { return JSON.parse(localStorage.getItem(PYMTS_KEY) || '{}') } catch { return {} } }
function savePymts(p)  { localStorage.setItem(PYMTS_KEY, JSON.stringify(p)) }
function genSlug()     { return Math.random().toString(36).slice(2,7) + Math.random().toString(36).slice(2,5) }

// ─── Clean short URL  ───
export function payUrl(slug) {
  return `${window.location.origin}${window.location.pathname}#/pay/${slug}`
}

// ─── Create Link (smart routing) ───
export async function createPaymentLink({ creator, label, amount, description, type = 'fixed', groupTarget = null, slug = null, premium = false }, onStatus) {
  if (!creator)         throw new Error('Connect wallet first')
  if (!label?.trim())   throw new Error('Label is required')
  if (type === 'fixed' && (!amount || parseFloat(amount) <= 0)) throw new Error('Amount required for fixed links')
  if (type === 'group' && (!groupTarget || parseInt(groupTarget) < 2)) throw new Error('Group needs at least 2 people')
  if (type === 'stream' && (!amount || parseFloat(amount) <= 0)) throw new Error('Amount required for subscription links')
  if (type === 'stream' && (!groupTarget || parseInt(groupTarget) < 1)) throw new Error('Duration (days) is required for subscriptions')

  const id = slug?.trim() ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : genSlug()

  // ── Try on-chain first, fall back to mock/localStorage if it fails ──
  if (isLive()) {
    try {
      // ── Check if ID is taken ──
      onStatus?.('Checking availability...')
      const available = await checkIdAvailable(id)
      if (!available) throw new Error('That link ID is already taken. Try a different one.')

      // Block reserved slugs for premium links
      if (premium && isReservedSlug(id)) {
        throw new Error(`"${id}" is a reserved name. Choose a different custom link ID.`)
      }

      const linkData = {
        slug: id, label: label.trim(),
        amount: type !== 'open' ? parseFloat(amount) : null,
        description: description?.trim() || '', type,
        groupTarget: type === 'group' ? parseInt(groupTarget) : (type === 'stream' ? parseInt(groupTarget) : 0),
      }

      // ── Gas check ──
      onStatus?.('Checking wallet balance...')
      const { canPaySelf } = await checkGasBalance(0.005)

      if (canPaySelf) {
        if (premium) {
          // ── PREMIUM: user pays slug fee + gas ──
          onStatus?.('Creating premium link...')
          const txHash = await createPremiumLinkOnChain({ ...linkData, creator }, onStatus)
          onStatus?.('Premium link confirmed on Arc!')
          _cacheLink(creator, { ...linkData, id, creator: creator.toLowerCase(), createdAt: Date.now(), txHash, premium: true })
          return { id, txHash, sponsored: false, premium: true }
        } else {
          // ── USER pays own gas (free tier) ──
          onStatus?.('Confirm in MetaMask...')
          const txHash = await createLinkOnChain({ ...linkData, creator })
          onStatus?.('Confirmed on Arc!')
          _cacheLink(creator, { ...linkData, id, creator: creator.toLowerCase(), createdAt: Date.now(), txHash })
          return { id, txHash, sponsored: false }
        }
      } else {
        // ── ADMIN sponsors gas (free tier only — premium not eligible) ──
        if (premium) {
          throw new Error('Premium custom links require USDC in your wallet. Get USDC from the faucet first.')
        }
        onStatus?.('No USDC for gas - requesting sponsorship...')
        const { message, signature, address } = await signSponsorRequest(linkData)
        onStatus?.('Submitting sponsored transaction...')
        const res = await fetch(SPONSOR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, signature, address, linkData }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Sponsorship failed')
        onStatus?.('Confirmed on Arc (sponsored)!')
        _cacheLink(creator, { ...linkData, id, creator: creator.toLowerCase(), createdAt: Date.now(), txHash: json.txHash, sponsored: true })
        return { id, txHash: json.txHash, sponsored: true }
      }
    } catch (onChainErr) {
      // ── User explicitly rejected the wallet prompt — don't fall back ──
      if (onChainErr?.code === 4001 || onChainErr?.message?.includes('User denied') ||
          onChainErr?.message?.includes('user rejected') || onChainErr?.message?.includes('already taken')) {
        throw onChainErr
      }
      // ── On-chain failed (contract unreachable, wrong network, no gas, sponsor endpoint missing) ──
      // Fall through to mock/localStorage so the link is still created and usable
      console.warn('[Parcis] On-chain link creation failed, falling back to local mode:', onChainErr.message)
      onStatus?.('Saving locally (chain unavailable)...')
    }
  }

  // ── MOCK / FALLBACK mode ──
  const links = getStore()
  if (links.find(l => l.id === id)) throw new Error('That ID is already taken')
  const streamDays = type === 'stream' ? parseInt(groupTarget) : null
  const link = {
    id, creator: creator.toLowerCase(), label: label.trim(),
    amount: type !== 'open' ? parseFloat(amount) : null,
    description: description?.trim() || '', type,
    groupTarget: type === 'group' ? parseInt(groupTarget) : streamDays,
    streamDuration: streamDays,
    active: true, createdAt: Date.now(), mock: true, premium,
  }
  links.push(link)
  saveStore(links)
  return { id, txHash: null, sponsored: false, mock: true }
}

function _cacheLink(creator, link) {
  const links = getStore()
  const existing = links.findIndex(l => l.id === link.id)
  if (existing >= 0) links[existing] = { ...links[existing], ...link }
  else links.push({ ...link, active: true, payments: [] })
  saveStore(links)
  invalidateCache('user_links_' + creator.toLowerCase())
}

// ─── Get single link ───
export async function getLink(id) {
  if (isLive()) {
    try {
      const onChain = await fetchLinkFromChain(id)
      if (onChain) {
        // Return immediately using cached payments so link page loads instantly (<0.5s)
        const pymts = getPymts()
        const cachedPayments = pymts[id] || []
        const cached = getStore().find(l => l.id === id)
        const mergedLink = { ...cached, ...onChain, payments: cachedPayments }
        _cacheLink(onChain.creator, mergedLink)

        // Non-blocking background sync for detailed payment logs
        fetchLinkPaymentsFromChain(id).then(chainPayments => {
          if (chainPayments && chainPayments.length > 0) {
            _cacheLink(onChain.creator, { ...onChain, payments: chainPayments })
            const p = getPymts()
            p[id] = chainPayments
            savePymts(p)
          }
        }).catch(e => console.warn("Background link payments sync error:", e))

        return mergedLink
      }
    } catch (e) {
      console.warn("Failed to fetch link from chain, using cache fallback:", e)
    }
  }
  return getStore().find(l => l.id === id) || null
}

// ─── Get user links ───
export async function getUserLinks(address) {
  if (!address) return []
  return fetchWithCache(`user_links_${address.toLowerCase()}`, async () => {
    if (isLive()) {
      const onChain = await fetchUserLinksFromChain(address)
      const cached  = getStore().filter(l => l.creator === address.toLowerCase())
      const merged = [...onChain]
      cached.forEach(c => { if (!merged.find(m => m.id === c.id)) merged.push(c) })
      return merged.sort((a,b) => b.createdAt - a.createdAt)
    }
    return getStore().filter(l => l.creator === address.toLowerCase()).sort((a,b) => b.createdAt - a.createdAt)
  })
}

// ─── Record payment locally (truth = blockchain Transfer events) ───
export function recordPayment(id, { payer, amount, txHash }) {
  const pymts = getPymts()
  if (!pymts[id]) pymts[id] = []
  pymts[id].push({ payer: payer.toLowerCase(), amount: parseFloat(amount), txHash, timestamp: Date.now() })
  savePymts(pymts)
  // Update cached link too
  const links = getStore()
  const idx = links.findIndex(l => l.id === id)
  if (idx >= 0) {
    if (!links[idx].payments) links[idx].payments = []
    links[idx].payments.push({ payer: payer.toLowerCase(), amount: parseFloat(amount), txHash, timestamp: Date.now() })
    saveStore(links)
    invalidateCache('user_links_' + links[idx].creator)
  } else {
    invalidateCache('user_links')
  }
}

export function getLinkPayments(id) {
  return (getPymts()[id] || [])
}

export function linkTotalReceived(link) {
  if (link.totalRaised !== undefined) return link.totalRaised
  const payments = getLinkPayments(link.id)
  return payments.reduce((s, p) => s + p.amount, 0)
}

// ─── QR Code ───
export async function generateQR(url) {
  return await QRCode.toDataURL(url, {
    width: 240, margin: 2,
    color: { dark: '#22c55e', light: '#0d0d0f' },
    errorCorrectionLevel: 'M',
  })
}

export function seedDemoLinks() {
  if (localStorage.getItem('parcis_seeded_v2')) return
  localStorage.setItem('parcis_seeded_v2', '1')
}
