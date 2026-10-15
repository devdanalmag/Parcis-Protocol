// ═══ Parcis Pages ═══
import { getAccount, isConnected, shortAddr, getUSDCBalance } from './wallet.js'
import { getStatusLabel, getStatusClass, getUserDeals, getDeal, getDealsForAddress, getUserStreams, getStream, getContractOwner, getPlatformArbiters, getAllDeals, getArbiterSlashHistory } from './contract.js'
import { getLink, getUserLinks, linkTotalReceived, payUrl, generateQR, getLinkPayments } from './payment.js'
import { svg } from './icons.js'
import { CONFIG } from './config.js'
import { getOnChainAnalytics, exportOnChainCSV, refreshOnChainAnalytics } from './analytics.js'

window.currentAdminTab = window.currentAdminTab || 'overview'
window.switchAdminTab = (tab) => {
  window.currentAdminTab = tab
  if (window.router) window.router()
}
window.exportOnChainCSV = exportOnChainCSV
window.refreshAnalytics = async () => {
  const app = document.getElementById('app')
  const btn = document.getElementById('btn-refresh-analytics')
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle"></div> Refreshing...' }
  await refreshOnChainAnalytics()
  if (window.router) window.router()
}

const esc = s => { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
const fmt = a => parseFloat(a || 0).toFixed(2)
// Handle both mock (ms) and on-chain (seconds BigInt) timestamps safely
const fmtDate = ts => {
  if (!ts) return 'N/A'
  const n = typeof ts === 'bigint' ? Number(ts) * 1000 : Number(ts)
  const ms = n > 1e12 ? n : n * 1000 // if already ms don't multiply
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── HOME ───
export function renderHome() {
  return `
<section class="hero hero-video-bg">
  <div class="video-bg-wrapper">
    <video autoplay loop muted playsinline class="bg-video-element">
      <source src="/hero-motion.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div class="video-bg-overlay"></div>
  </div>
  <div class="container hero-container-centered">
    <div class="hero-badge">${svg('shield', 14)} The Identity Protocol for Arc Commerce</div>
    <h1>Build Your On-Chain<br><span>Reputation. Get Paid.</span></h1>
    <p class="hero-sub">Every payment, every escrow, every deal builds your verifiable on-chain reputation. Parcis turns commerce into trust — no databases, no middlemen, 100% blockchain.</p>
    <div class="hero-actions">
      <a href="#/send" class="btn btn-primary btn-lg">${svg('send', 16)} Create Payment Link</a>
      <a href="#/safe" class="btn btn-ghost btn-lg">${svg('shield', 16)} Escrow Safe</a>
    </div>
    <div class="hero-stats">
      <div><span class="stat-value">Identity</span><span class="stat-label">On-Chain Reputation</span></div>
      <div><span class="stat-value">&lt;1s</span><span class="stat-label">Settlement</span></div>
      <div><span class="stat-value">$0.001</span><span class="stat-label">Avg Fee</span></div>
      <div><span class="stat-value">${CONFIG.platformFeePercent}%</span><span class="stat-label">Escrow Fee</span></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2 class="section-title">Not Just Payments. Portable Reputation.</h2>
    <p class="section-sub">Every Arc app has payment links. Only Parcis builds a verifiable identity from every transaction — a trust score that follows you everywhere.</p>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">${svg('link', 18)}</div>
        <h3>Pre-filled Payment Requests</h3>
        <p>Send "Pay me $150 for the logo" - not a raw address. The payer sees exactly what they're paying for before confirming.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('qrCode', 18)}</div>
        <h3>QR Codes</h3>
        <p>Auto-generated QR for every link. Print it on your business card or market stall. Customer scans, one click to pay.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('users', 18)}</div>
        <h3>Group Contributions</h3>
        <p>Collect contributions from multiple people toward a shared goal. Parcis tracks who paid and shows live progress.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('dollar', 18)}</div>
        <h3>Open Tips</h3>
        <p>Let supporters choose their amount. Like a tip jar or donation page - but USDC with zero platform cut.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('activity', 18)}</div>
        <h3>Instant Receipts</h3>
        <p>Every payment creates on-chain proof automatically. Know who paid, when, and how much - no manual tracking.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('shield', 18)}</div>
        <h3>Escrow Safe</h3>
        <p>For deals with strangers. Lock USDC until work is delivered. Built-in dispute resolution. <a href="#/safe">Learn more</a></p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">${svg('user', 18)}</div>
        <h3>On-Chain Reputation</h3>
        <p>Every deal you complete builds your Parcis Trust Score. A portable, verifiable identity no other payment app can give you.</p>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="trust-banner">
      <div class="trust-badge-row">
        <div class="trust-badge">${svg('shield', 16)} <span>100% On-Chain</span></div>
        <div class="trust-badge">${svg('lock', 16)} <span>No Database</span></div>
        <div class="trust-badge">${svg('checkCircle', 16)} <span>Non-Custodial</span></div>
        <div class="trust-badge">${svg('user', 16)} <span>No Sign-Up</span></div>
        <div class="trust-badge">${svg('eye', 16)} <span>Fully Transparent</span></div>
      </div>
      <p class="trust-text">Every link, every payment, every deal, every reputation score — lives permanently on the blockchain. Nothing is stored on servers. Nothing can be faked, frozen, or censored.</p>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <h2 class="section-title">How It Works</h2>
    <p class="section-sub">Three steps from setup to payment received.</p>
    <div class="steps-grid">
      <div class="step-card"><h4>Create Your Link</h4><p>Choose Fixed, Open, or Group. Set your label, amount, and description in under 30 seconds.</p></div>
      <div class="step-card"><h4>Share It Anywhere</h4><p>Copy the link, show the QR code, or tap a share button for WhatsApp, Telegram, or Twitter.</p></div>
      <div class="step-card"><h4>Get Paid Instantly</h4><p>Payer connects wallet, sees the details, clicks Pay. USDC settles in under one second.</p></div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0;text-align:center">
  <div class="container">
    <h2 class="section-title">Ready? It Takes 30 Seconds.</h2>
    <p class="section-sub">Connect your wallet, set your amount, share the link.</p>
    <div class="hero-actions">
      <a href="#/send" class="btn btn-primary btn-lg">${svg('send', 16)} Create Payment Link</a>
      <a href="https://faucet.circle.com" target="_blank" class="btn btn-secondary btn-lg">${svg('externalLink', 16)} Get Testnet USDC</a>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div class="container">
    <div class="footer-inner">
      <span class="footer-copy">Parcis - Built on Arc Network</span>
      <div class="footer-links">
        <a href="https://testnet.arcscan.app" target="_blank">Explorer</a>
        <a href="https://faucet.circle.com" target="_blank">Faucet</a>
        <a href="https://docs.arc.network" target="_blank">Docs</a>
        <a href="#/safe">Safe Escrow</a>
      </div>
    </div>
  </div>
</footer>`
}

// ─── SEND ───
export function renderSend() {
  if (!isConnected()) return `<div class="page"><div class="container"><div class="empty-state" style="margin-top:60px"><div class="empty-state-icon">${svg('wallet', 40)}</div><h3>Connect Your Wallet</h3><p>Connect to create a payment link.</p><button class="btn btn-primary" onclick="window.connectWallet()">Connect Wallet</button></div></div></div>`
  return `
<div class="page">
  <div class="container form-container">
    <div class="form-header">
      <h1>Create Payment Link</h1>
      <p>Set your details. Share the link. Get paid instantly in USDC.</p>
    </div>
    <div class="form-card">
      <div id="send-result"></div>
      <div id="send-form-wrap">
        <p style="font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Link Type</p>
        <div class="type-selector">
          <div class="type-option selected" id="type-fixed" onclick="window.selectType('fixed')">
            <div class="type-option-icon">${svg('dollar', 18)}</div>
            <div class="type-option-label">Fixed Amount</div>
          </div>
          <div class="type-option" id="type-open" onclick="window.selectType('open')">
            <div class="type-option-icon">${svg('activity', 18)}</div>
            <div class="type-option-label">Open / Tips</div>
          </div>
          <div class="type-option" id="type-group" onclick="window.selectType('group')">
            <div class="type-option-icon">${svg('users', 18)}</div>
            <div class="type-option-label">Group Split</div>
          </div>
          <div class="type-option" id="type-stream" onclick="window.selectType('stream')">
            <div class="type-option-icon" style="color:var(--green)">${svg('zap', 18)}</div>
            <div class="type-option-label">Subscription</div>
          </div>
        </div>
        <form id="send-form">
          <input type="hidden" id="link-type" value="fixed">
          <div class="form-group">
            <label>Your Name or Business</label>
            <input type="text" id="link-label" placeholder="e.g. Dev Studio, Mama Nkechi's Kitchen" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="link-desc" placeholder="What is this payment for?"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group" id="amount-group">
              <label>Amount (USDC)</label>
              <input type="number" id="link-amount" placeholder="50.00" min="0.01" step="0.01">
            </div>
            <div class="form-group" id="group-target-group" style="display:none">
              <label id="group-target-label">Number of People</label>
              <input type="number" id="link-group-target" placeholder="6" min="1" step="1">
            </div>
            <div class="form-group premium-slug-section">
              <div class="premium-slug-header">
                <label>Custom Link ID</label>
                <div class="premium-slug-toggle-wrap">
                  <span class="premium-slug-price">$0.50 USDC</span>
                  <label class="premium-toggle-switch">
                    <input type="checkbox" id="premium-slug-toggle" onchange="window.togglePremiumSlug(this.checked)">
                    <span class="premium-toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="premium-slug-input-wrap" id="premium-slug-input-wrap">
                <div class="premium-slug-lock-overlay" id="premium-slug-lock">
                  ${svg('lock', 14)} <span>Unlock for a custom vanity URL</span>
                </div>
                <input type="text" id="link-slug" placeholder="my-shop" disabled>
              </div>
              <div class="form-hint" id="premium-slug-hint">Enable to choose a custom branded link name</div>
              <div class="premium-fee-notice" id="premium-fee-notice" style="display:none">
                ${svg('zap', 12)} <span>$0.50 USDC will be charged for your custom link name</span>
              </div>
              <input type="hidden" id="premium-enabled" value="0">
            </div>
          </div>
          <div id="send-status" style="font-size:.78rem;color:var(--text-muted);min-height:16px;text-align:center;margin-bottom:4px"></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-lg" id="send-btn">${svg('zap', 16)} Generate Link &amp; QR</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>`
}

// ─── PAY PAGE (public) - reads link from chain by slug ───
export async function renderPay(slug, query) {
  // Handle direct SDK payment via query parameters
  if (query && query.get('to')) {
    let rawTo = query.get('to')
    let to = rawTo.trim()
    const match = to.match(/[#/]pay\/([^/?#]+)/)
    if (match) to = match[1]
    else if (to.includes('/pay/')) to = to.split('/pay/')[1]
    to = to.split('?')[0].replace(/^\/+|\/+$/g, '').trim()

    let creatorAddress = to
    if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
      try {
        const link = await getLink(to)
        if (link && link.creator && link.creator !== '0x0000000000000000000000000000000000000000') {
          creatorAddress = link.creator
        }
      } catch (e) {
        console.warn('Could not resolve slug on chain:', e)
      }
    }

    const amt = query.get('amount') || ''
    const desc = query.get('desc') || 'SDK Payment'
    const label = query.get('label') || (to !== creatorAddress ? `Payment to ${to}` : 'Direct Payment')
    const type = query.get('type') || 'fixed'
    const days = query.get('duration') || 30
    const initials = creatorAddress.startsWith('0x') ? creatorAddress.slice(2, 4).toUpperCase() : to.slice(0, 2).toUpperCase()

    if (type === 'stream') {
      return `
<div class="pay-page">
  <div class="pay-card">
    <div class="pay-card-header">
      <div class="pay-brand">
        <img src="/logo.png" alt="Parcis" class="pay-brand-logo">
        <span>Parcis Streams</span>
      </div>
      <div class="pay-network-pill">
        <span class="network-dot"></span> ${CONFIG.chainName || 'Arc'}
      </div>
    </div>

    <div class="pay-recipient-box">
      <div class="pay-avatar-wrap">
        <div class="pay-avatar" style="background:linear-gradient(135deg,var(--purple),#6366f1)">${initials}</div>
        <div class="pay-verified-check" style="background:var(--purple);color:#fff">${svg('check', 10)}</div>
      </div>
      <div class="pay-recipient-details">
        <div class="pay-label">Subscribe to ${esc(label)}</div>
        <div class="pay-addr-badge">
          <span class="pay-addr-text">${shortAddr(creatorAddress)}</span>
          ${to !== creatorAddress ? `<span class="pay-slug-tag">${esc(to)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="pay-amount-box" style="background:rgba(139,92,246,0.04);border-color:rgba(139,92,246,0.2)">
      <div class="pay-amount-hero">
        <span class="pay-amount-num">${fmt(amt)}</span>
        <span class="pay-currency-badge" style="background:rgba(139,92,246,0.15);color:var(--purple)">USDC</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-sec)">Streaming over ${days} days</div>
      ${desc && desc !== 'SDK Payment' ? `<div class="pay-desc-pill">${esc(desc)}</div>` : ''}
    </div>

    <div class="pay-breakdown">
      <div class="pay-breakdown-row">
        <span>Stream Flow</span>
        <span class="breakdown-val">Per-Second Micro-Stream</span>
      </div>
      <div class="pay-breakdown-row">
        <span>Cancellation Policy</span>
        <span class="breakdown-val highlight-green">Instant Refund on Cancel</span>
      </div>
    </div>

    <div id="pay-action">
      ${isConnected()
          ? `<button class="btn btn-primary btn-pay-cta" style="background:var(--purple);box-shadow:0 4px 16px rgba(139,92,246,0.35);color:#fff" id="stream-now-btn" onclick="window.handleSubscribe('${creatorAddress}', ${parseFloat(amt) || 0}, ${parseInt(days) || 30})">${svg('zap', 16)} Start Stream</button>`
          : `<button class="btn btn-primary btn-pay-cta" style="background:var(--purple);box-shadow:0 4px 16px rgba(139,92,246,0.35);color:#fff" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet to Stream</button>`}
    </div>
    <div id="pay-status"></div>

    <div class="pay-card-footer">
      <span>${svg('lock', 12)} Secured by <strong>Parcis Streams</strong></span>
      <a href="#/profile/${creatorAddress}" target="_blank" class="pay-profile-link">View Profile →</a>
    </div>
  </div>
</div>`
    }

    const amountSection = amt
      ? `<div class="pay-amount-box">
          <div class="pay-amount-hero">
            <span class="pay-amount-num">${fmt(amt)}</span>
            <span class="pay-currency-badge">USDC</span>
          </div>
          ${desc && desc !== 'SDK Payment' ? `<div class="pay-desc-pill">${esc(desc)}</div>` : ''}
        </div>`
      : `<div class="pay-amount-box">
          <div class="pay-amount-input-wrap">
            <label>Amount (USDC)</label>
            <div class="pay-input-with-icon">
              <input type="number" id="pay-open-amount" placeholder="25.00" min="0.01" step="0.01" autofocus>
              <span class="pay-input-suffix">USDC</span>
            </div>
          </div>
          ${desc && desc !== 'SDK Payment' ? `<div class="pay-desc-pill" style="margin-top:4px">${esc(desc)}</div>` : ''}
        </div>`

    return `
<div class="pay-page">
  <div class="pay-card">
    <div class="pay-card-header">
      <div class="pay-brand">
        <img src="/logo.png" alt="Parcis" class="pay-brand-logo">
        <span>Parcis Checkout</span>
      </div>
      <div class="pay-network-pill">
        <span class="network-dot"></span> ${CONFIG.chainName || 'Arc'}
      </div>
    </div>

    <div class="pay-recipient-box">
      <div class="pay-avatar-wrap">
        <div class="pay-avatar">${initials}</div>
        <div class="pay-verified-check">${svg('check', 10)}</div>
      </div>
      <div class="pay-recipient-details">
        <div class="pay-label">${esc(label)}</div>
        <div class="pay-addr-badge">
          <span class="pay-addr-text">${shortAddr(creatorAddress)}</span>
          ${to !== creatorAddress ? `<span class="pay-slug-tag">${esc(to)}</span>` : ''}
        </div>
      </div>
    </div>

    ${amountSection}

    <div class="pay-breakdown">
      <div class="pay-breakdown-row">
        <span>Payment Method</span>
        <span class="breakdown-val">Direct Arc Transfer</span>
      </div>
      <div class="pay-breakdown-row">
        <span>Estimated Gas Fee</span>
        <span class="breakdown-val highlight-green">&lt; $0.001 (USDC)</span>
      </div>
    </div>

    <div id="pay-action">
      ${isConnected()
        ? `<button class="btn btn-primary btn-pay-cta" id="pay-now-btn" onclick="window.handleDirectPay('${creatorAddress}',${amt || 0})">${svg('send', 16)} Pay ${amt ? fmt(amt) + ' USDC' : 'Now'}</button>`
        : `<button class="btn btn-primary btn-pay-cta" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet to Pay</button>`}
    </div>
    <div id="pay-status"></div>

    <div class="pay-card-footer">
      <span>${svg('lock', 12)} Secured by <strong>Parcis Protocol</strong></span>
      <a href="#/profile/${creatorAddress}" target="_blank" class="pay-profile-link">View Profile →</a>
    </div>
  </div>
</div>`
  }

  // Handle standard payment link
  if (!slug) return `<div class="pay-page"><div class="pay-card"><div class="empty-state-icon" style="margin:0 auto 12px">${svg('xCircle', 40)}</div><h3>No link ID</h3><a href="#/" class="btn btn-secondary">Home</a></div></div>`
  const link = await getLink(slug)
  if (!link || !link.active) {
    return `<div class="pay-page"><div class="pay-card"><div class="empty-state-icon" style="margin:0 auto 12px">${svg('xCircle', 40)}</div><h3>Link Not Found</h3><p style="color:var(--text-sec);font-size:.875rem;margin-bottom:20px">This payment link is invalid or doesn't exist.</p><a href="#/" class="btn btn-secondary">Go Home</a></div></div>`
  }
  const initials = link.label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const payments = getLinkPayments(slug)
  const payCount = Math.max(link.paymentCount || 0, payments.length)
  const pct = link.type === 'group' && link.groupTarget ? Math.min(100, Math.round((payCount / link.groupTarget) * 100)) : 0
  const groupHtml = link.type === 'group' ? `
    <div class="group-progress">
      <div class="group-meta">
        <span id="group-progress-text">${payCount} of ${link.groupTarget} paid</span>
        <span id="group-progress-percent">${pct}%</span>
      </div>
      <div class="group-bar">
        <div class="group-bar-fill" id="group-progress-bar" style="width:${pct}%"></div>
      </div>
    </div>` : ''

  if (link.type === 'stream') {
    const days = link.groupTarget || 30 // groupTarget used as duration for streams
    return `
<div class="pay-page">
  <div class="pay-card">
    <div class="pay-card-header">
      <div class="pay-brand">
        <img src="/logo.png" alt="Parcis" class="pay-brand-logo">
        <span>Parcis Streams</span>
      </div>
      <div class="pay-network-pill">
        <span class="network-dot"></span> Arc Testnet
      </div>
    </div>

    <div class="pay-recipient-box">
      <div class="pay-avatar-wrap">
        <div class="pay-avatar" style="background:linear-gradient(135deg,var(--purple),#6366f1)">${initials}</div>
        <div class="pay-verified-check" style="background:var(--purple);color:#fff">${svg('check', 10)}</div>
      </div>
      <div class="pay-recipient-details">
        <div class="pay-label">${esc(link.label)}</div>
        <div class="pay-addr-badge">${shortAddr(link.creator)}</div>
      </div>
    </div>

    <div class="pay-amount-box" style="background:rgba(139,92,246,0.04);border-color:rgba(139,92,246,0.2)">
      <div class="pay-amount-hero">
        <span class="pay-amount-num">${fmt(link.amount)}</span>
        <span class="pay-currency-badge" style="background:rgba(139,92,246,0.15);color:var(--purple)">USDC</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-sec)">Streaming over ${days} days</div>
      ${link.description ? `<div class="pay-desc-pill">${esc(link.description)}</div>` : ''}
    </div>

    <div class="pay-breakdown">
      <div class="pay-breakdown-row">
        <span>Stream Rate</span>
        <span class="breakdown-val">Per-second realtime unlock</span>
      </div>
      <div class="pay-breakdown-row">
        <span>Cancellation</span>
        <span class="breakdown-val highlight-green">Cancel anytime for refund</span>
      </div>
    </div>

    <div id="pay-action">
      ${isConnected()
        ? `<button class="btn btn-primary btn-pay-cta" style="background:var(--purple);box-shadow:0 4px 16px rgba(139,92,246,0.35);color:#fff" id="stream-now-btn" onclick="window.handleSubscribe('${link.creator}', ${parseFloat(link.amount) || 0}, ${parseInt(days) || 30})">${svg('zap', 16)} Start Stream</button>`
        : `<button class="btn btn-primary btn-pay-cta" style="background:var(--purple);box-shadow:0 4px 16px rgba(139,92,246,0.35);color:#fff" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet to Stream</button>`}
    </div>
    <div id="pay-status"></div>

    <div class="pay-card-footer">
      <span>${svg('lock', 12)} Secured by <strong>Parcis Streams</strong></span>
      <a href="#/profile/${link.creator}" target="_blank" class="pay-profile-link">View Portfolio →</a>
    </div>
  </div>
</div>`
  }

  const isOpen = link.type === 'open' || (link.type === 'fixed' && !link.amount)
  const amountSection = isOpen
    ? `<div class="pay-amount-box">
        <div class="pay-amount-input-wrap">
          <label>Enter Amount (USDC)</label>
          <div class="pay-input-with-icon">
            <input type="number" id="pay-open-amount" placeholder="10.00" min="0.01" step="0.01">
            <span class="pay-input-suffix">USDC</span>
          </div>
        </div>
        ${link.description ? `<div class="pay-desc-pill" style="margin-top:4px">${esc(link.description)}</div>` : ''}
      </div>`
    : `<div class="pay-amount-box">
        <div class="pay-amount-hero">
          <span class="pay-amount-num">${fmt(link.amount)}</span>
          <span class="pay-currency-badge">USDC</span>
        </div>
        ${link.description ? `<div class="pay-desc-pill">${esc(link.description)}</div>` : ''}
      </div>`

  const isMaxReached = link.type === 'group' && link.groupTarget && payCount >= link.groupTarget;
  const payActionHtml = isMaxReached ? `<div style="color:var(--text-sec);text-align:center;padding:12px;border:1px solid var(--border);border-radius:12px;font-weight:700">Group payment limit reached!</div>` : `
    <div id="pay-action" style="display:flex;flex-direction:column;gap:8px">
      ${isConnected()
      ? `<button class="btn btn-primary btn-pay-cta" id="pay-now-btn" onclick="window.handlePay('${link.creator}',${link.amount || 0},'${link.type}','${slug}')">${svg('send', 16)} Pay on Arc</button>`
      : `<button class="btn btn-primary btn-pay-cta" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet to Pay</button>`}
      <button class="btn btn-secondary" style="width:100%;border-radius:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:8px;" onclick="window.openCCTPModal('${slug}', ${link.amount || 0}, '${link.creator}')">
        ${svg('activity', 15)} Pay Cross-Chain (CCTP)
        <span style="font-size:0.65rem;background:rgba(255,255,255,0.08);color:var(--text-muted);padding:2px 7px;border-radius:10px;font-weight:600;letter-spacing:0.02em;">Coming Soon</span>
      </button>
    </div>`;

  const qr = await generateQR(payUrl(slug))
  return `
<div class="pay-page">
  <div class="pay-card">
    <div class="pay-card-header">
      <div class="pay-brand">
        <img src="/logo.png" alt="Parcis" class="pay-brand-logo">
        <span>Parcis Checkout</span>
      </div>
      <div class="pay-network-pill">
        <span class="network-dot"></span> ${CONFIG.chainName || 'Arc'}
      </div>
    </div>

    <div class="pay-recipient-box">
      <div class="pay-avatar-wrap">
        <div class="pay-avatar">${initials}</div>
        <div class="pay-verified-check">${svg('check', 10)}</div>
      </div>
      <div class="pay-recipient-details">
        <div class="pay-label">${esc(link.label)}</div>
        <div class="pay-addr-badge">${shortAddr(link.creator)}</div>
      </div>
    </div>

    ${groupHtml}
    ${amountSection}
    ${payActionHtml}
    <div id="pay-status"></div>

    <div style="margin-top:4px;padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <img src="${qr}" alt="QR Code" class="qr-img" width="130" height="130" style="margin:4px auto;border-radius:10px;">
      <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">Scan to pay with mobile wallet</div>
    </div>

    <div class="pay-card-footer">
      <span>${svg('lock', 12)} Powered by <strong>Parcis Protocol</strong></span>
      <a href="#/profile/${link.creator}" target="_blank" class="pay-profile-link">View Portfolio →</a>
    </div>
  </div>
</div>`
}

// ─── SUBSCRIBE PAGE (Streams) ───
export async function renderSubscribe(creator) {
  if (!creator) return `<div class="pay-page"><div class="pay-card">${svg('xCircle', 40)}<h3>No creator specified</h3><a href="#/" class="btn btn-secondary">Home</a></div></div>`

  const initials = creator.slice(2, 4).toUpperCase()

  return `
<div class="pay-page">
  <div class="pay-card" style="border-top:3px solid var(--green)">
    <div class="pay-avatar" style="background:var(--green);color:#000">${initials}</div>
    <div class="pay-label">Subscribe to Creator</div>
    <div class="pay-desc" style="font-family:monospace">${shortAddr(creator)}</div>
    
    <div class="form-group" style="text-align:left;margin-top:24px">
      <label>Subscription Duration (Days)</label>
      <input type="number" id="stream-days" value="30" min="1" step="1" style="background:var(--surface);border:1px solid var(--border);padding:10px;border-radius:8px;width:100%;color:#fff;margin-bottom:16px">
      
      <label>Total USDC to Lock</label>
      <input type="number" id="stream-amount" placeholder="50.00" min="0.01" step="0.01" style="background:var(--surface);border:1px solid var(--border);padding:10px;border-radius:8px;width:100%;color:#fff">
    </div>

    <div style="margin:16px 0;padding:12px;background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.1);border-radius:8px;font-size:0.8rem;color:var(--text-sec);text-align:left">
      ${svg('activity', 14)} <strong>Streaming Subscription:</strong><br>
      Your USDC will stream per second. You can cancel at any time and get a refund for the unused time.
    </div>

    <div id="pay-action">
      ${isConnected()
      ? `<button class="btn btn-primary" style="width:100%;background:var(--green);color:#000" id="stream-now-btn" onclick="window.handleSubscribe('${creator}')">${svg('zap', 16)} Start Stream</button>`
      : `<button class="btn btn-primary" style="width:100%;background:var(--green);color:#000" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet</button>`}
    </div>
    <div id="pay-status"></div>
    <div class="pay-powered">Powered by <strong>Parcis Streams</strong></div>
  </div>
</div>`
}

// ─── DASHBOARD TAB RENDERERS (LAZY-LOADED ON-DEMAND) ───
export function renderLinksTabHtml(links) {
  if (!links || links.length === 0) {
    return `<div class="empty-state"><div class="empty-state-icon">${svg('link', 40)}</div><h3>No Payment Links</h3><p>Create your first payment link to get started.</p><a href="#/send" class="btn btn-primary">${svg('plus', 15)} Create Link</a></div>`
  }
  return `<div class="links-grid">${links.map(l => {
    const pymts = getLinkPayments(l.id)
    const payCount = l.paymentCount !== undefined ? l.paymentCount : pymts.length
    const displayType = (l.type === 'fixed' && !l.amount) ? 'open' : l.type
    const amtLabel = displayType === 'open' ? 'Open' : displayType === 'group' ? `${payCount}/${l.groupTarget} paid` : `${fmt(l.amount)} USDC`
    const premiumBadge = l.premium ? `<span class="premium-link-badge">${svg('zap', 10)} PRO</span>` : ''
    return `<div class="link-card${l.premium ? ' link-card-premium' : ''}" onclick="location.hash='#/link/${l.id}'">
      <div class="card-header"><span class="card-title">${esc(l.label)}${premiumBadge}</span><span class="card-amount">${amtLabel}</span></div>
      ${l.description ? `<div class="card-desc">${esc(l.description)}</div>` : ''}
      <div class="card-footer">
        <div style="display:flex;align-items:center;gap:6px"><span class="type-tag type-tag-${displayType}">${displayType}</span><span class="card-meta${l.premium ? ' premium-slug-text' : ''}">/${l.id}</span></div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.showLinkQR('${l.id}')">${svg('qrCode', 13)}</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.copyLinkUrl('${l.id}',this)">${svg('copy', 13)}</button>
          <a href="#/pay/${l.id}" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()">${svg('externalLink', 13)}</a>
        </div>
      </div>
    </div>`
  }).join('')}</div>`
}

export function renderDealsTabHtml(deals, arbiterMap = {}) {
  if (!deals || deals.length === 0) {
    return `<div class="empty-state"><div class="empty-state-icon">${svg('shield', 40)}</div><h3>No Escrow Deals</h3><p>Use Safe for deals requiring trust protection.</p><a href="#/safe" class="btn btn-ghost">${svg('shield', 15)} Learn About Safe</a></div>`
  }
  return `<div class="deals-grid">${deals.map(d => {
    const isDirect = d.arbiter.toLowerCase() === d.client.toLowerCase()
    const isPlat = !isDirect && (arbiterMap[d.arbiter.toLowerCase()]?.isPlatformArbiter)
    const arbiterBadge = isDirect ? `
      <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
        ${svg('user', 9)} Direct Escrow
      </span>
    ` : (isPlat ? `
      <span class="badge badge-purple" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0;">
        ${svg('shield', 9)} Verified Pool
      </span>
    ` : `
      <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
        ${svg('user', 9)} Personal Arbiter
      </span>
    `)

    return `<div class="deal-card" onclick="location.hash='#/deal/${d.id}'">
      <div class="card-header">
        <span class="card-title">${esc(d.title)}</span>
        <span class="card-amount">${fmt(d.amount)} USDC</span>
      </div>
      <div class="card-desc">${esc(d.description || 'No description')}</div>
      <div style="font-size:0.75rem; color:var(--text-sec); margin:-4px 0 12px 0; display:flex; align-items:center; gap:6px;">
        <span>Arbiter:</span>
        ${arbiterBadge}
      </div>
      <div class="card-footer">
        <span class="badge badge-${getStatusClass(d.status)}">${getStatusLabel(d.status)}</span>
        <span class="card-meta">${fmtDate(d.createdAt)}</span>
      </div>
    </div>`
  }).join('')}</div>`
}

export function renderStreamsTabHtml(streams, account) {
  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
      <div>
        <h3 style="margin:0;font-size:1.15rem;color:#fff;display:flex;align-items:center;gap:8px;">
          ${svg('activity', 18)} Continuous Money Streams
        </h3>
        <p style="margin:3px 0 0;font-size:0.8rem;color:var(--text-sec);">Real-time per-second USDC streams for subscriptions and recurring payments on Arc.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="window.openCreateStreamModal()">${svg('plus', 14)} Start Stream</button>
    </div>`

  if (!streams || streams.length === 0) {
    return `
      ${headerHtml}
      <div class="empty-state">
        <div class="empty-state-icon">${svg('activity', 40)}</div>
        <h3>No Active Streams</h3>
        <p>Start a continuous subscription stream or wait for someone to stream USDC to you.</p>
        <button class="btn btn-primary" style="margin-top:14px" onclick="window.openCreateStreamModal()">${svg('zap', 15)} Start a Stream</button>
      </div>`
  }

  const now = Math.floor(Date.now() / 1000)

  return `
    ${headerHtml}
    <div class="deals-grid">${streams.map(s => {
    const isRecipient = s.recipient.toLowerCase() === account.toLowerCase()
    const otherAddr = isRecipient ? s.sender : s.recipient

    const isStreaming = s.isActive && now < s.stopTime
    const isCancelled = !s.isActive && (s.depositAmount - s.amountWithdrawn > 0.001)
    const isCompleted = !s.isActive && !isCancelled

    let statusBadge = ''
    if (isStreaming) {
      statusBadge = `<span class="badge badge-in_progress">${svg('activity', 11)} Streaming</span>`
    } else if (s.isActive && now >= s.stopTime) {
      statusBadge = `<span class="badge badge-completed">${svg('check', 11)} Ended</span>`
    } else if (isCancelled) {
      statusBadge = `<span class="badge badge-cancelled">Cancelled</span>`
    } else {
      statusBadge = `<span class="badge badge-completed">Completed</span>`
    }

    const withdrawableFormatted = s.withdrawable ? s.withdrawable.toFixed(4) : '0.0000'
    const canWithdraw = s.isActive && s.withdrawable > 0.00001

    // Progress calculation
    let progressPct = 0
    if (now >= s.stopTime || !s.isActive) progressPct = 100
    else if (now > s.startTime) progressPct = Math.min(100, Math.round(((now - s.startTime) / Math.max(1, s.stopTime - s.startTime)) * 100))

    const progressClass = isCancelled ? 'cancelled' : (progressPct >= 100 ? 'completed' : '')
    const categoryChip = s.category ? `<span style="background:rgba(139,92,246,0.12);color:#a78bfa;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.02em;">${esc(s.category)}</span>` : ''

    return `<div class="stream-card-v2 ${isRecipient ? '' : 'outgoing'}" onclick="location.hash='#/stream/${s.id}'">
        <div class="stream-card-top">
          <div class="stream-title-wrap">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="stream-title-text">${esc(s.title || 'Stream #' + s.id)}</span>
              ${categoryChip}
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span class="stream-role-pill ${isRecipient ? 'incoming' : 'outgoing'}">${isRecipient ? svg('arrowDownLeft', 10) + ' Incoming' : svg('arrowUpRight', 10) + ' Outgoing'}</span>
              ${statusBadge}
            </div>
          </div>
          <span style="font-size:1.2rem;font-weight:800;color:${isRecipient ? 'var(--green)' : '#60a5fa'};white-space:nowrap;">${fmt(s.depositAmount)} <span style="font-size:0.75rem;font-weight:600;opacity:0.7;">USDC</span></span>
        </div>

        <div class="stream-metric-box">
          <div class="stream-live-ticker-row">
            <span style="font-size:0.76rem;color:var(--text-sec);">${isRecipient ? 'Earned' : 'Streamed'}</span>
            <span class="stream-live-val">
              <span class="stream-ticker" data-id="${s.id}" data-active="${s.isActive}" data-role="${isRecipient ? 'recipient' : 'sender'}" data-start="${s.startTime}" data-stop="${s.stopTime}" data-deposit="${s.depositAmount}" data-withdrawn="${s.amountWithdrawn}" data-refundable="${s.refundable || 0}">0.000000</span>
            </span>
          </div>
          <div class="stream-mini-progress">
            <div class="stream-mini-progress-fill ${progressClass}" style="width:${progressPct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-sec);margin-top:6px;">
            <span>${isRecipient ? 'Withdrawable:' : 'Refundable:'} <span style="color:${isRecipient ? 'var(--green)' : '#f59e0b'};font-weight:700;font-family:'JetBrains Mono',monospace;" id="stream-${isRecipient ? 'withdrawable' : 'refundable'}-${s.id}">${isRecipient ? withdrawableFormatted : (s.refundable ? s.refundable.toFixed(4) : '0.0000')}</span> USDC</span>
            <span style="color:rgba(255,255,255,0.35);">${progressPct}%</span>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);">
            <span>${isRecipient ? 'From' : 'To'}:</span>
            <a href="#/profile/${otherAddr}" onclick="event.stopPropagation()" style="color:var(--text);font-weight:600;text-decoration:none;font-size:0.78rem;">${shortAddr(otherAddr)}</a>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${isRecipient && s.isActive ? `
              <button class="btn btn-primary btn-sm" ${canWithdraw ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"'} onclick="event.stopPropagation();window.handleWithdrawStream(${s.id}, event)">
                Withdraw
              </button>` : ''}
            ${!isRecipient && s.isActive ? `
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();window.handleCancelStream(${s.id}, event)">
                Cancel & Refund
              </button>` : ''}
          </div>
        </div>
      </div>`
  }).join('')}</div>`
}

// ─── STREAM DETAIL PAGE WITH WAVE VISUALIZER ───
export async function renderStreamDetail(id) {
  const s = await getStream(parseInt(id))
  if (!s) return `<div class="page"><div class="container detail-container"><div class="empty-state" style="margin-top:80px"><div class="empty-state-icon">${svg('xCircle', 40)}</div><h3>Stream Not Found</h3><p>This stream does not exist or could not be loaded from the blockchain.</p><a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a></div></div></div>`

  const account = isConnected() ? getAccount() : null
  const isRecipient = account && s.recipient.toLowerCase() === account.toLowerCase()
  const isSender = account && s.sender.toLowerCase() === account.toLowerCase()
  const now = Math.floor(Date.now() / 1000)

  const isStreaming = s.isActive && now < s.stopTime
  const isCancelled = !s.isActive && (s.depositAmount - s.amountWithdrawn > 0.001)
  const isCompleted = !s.isActive && !isCancelled
  const isEnded = s.isActive && now >= s.stopTime

  const duration = Math.max(1, s.stopTime - s.startTime)
  const ratePerSec = s.depositAmount / duration
  const ratePerDay = ratePerSec * 86400

  let progressPct = 0
  if (now >= s.stopTime || !s.isActive) progressPct = 100
  else if (now > s.startTime) progressPct = Math.min(100, ((now - s.startTime) / duration) * 100)

  const progressClass = isCancelled ? 'cancelled' : (progressPct >= 100 ? 'completed' : '')

  let statusText = '', statusColor = ''
  if (isStreaming) { statusText = 'Streaming'; statusColor = '#10b981' }
  else if (isEnded) { statusText = 'Ended'; statusColor = '#60a5fa' }
  else if (isCancelled) { statusText = 'Cancelled & Refunded'; statusColor = '#ef4444' }
  else { statusText = 'Completed'; statusColor = '#10b981' }

  const startDate = new Date(s.startTime * 1000)
  const endDate = new Date(s.stopTime * 1000)
  const durationDays = Math.round(duration / 86400 * 10) / 10
  const remaining = isStreaming ? Math.max(0, s.stopTime - now) : 0
  const remainDays = Math.floor(remaining / 86400)
  const remainHrs = Math.floor((remaining % 86400) / 3600)
  const remainMins = Math.floor((remaining % 3600) / 60)

  const themeClass = isRecipient ? '' : 'outgoing-theme'
  const accentColor = isRecipient ? 'var(--green, #22c55e)' : '#3b82f6'

  const shareUrl = `${window.location.origin}${window.location.pathname}#/stream/${s.id}`
  const explorerUrl = `https://testnet.arcscan.app`

  return `
<div class="page">
  <div class="container" style="max-width:900px;">
    <button class="detail-back" onclick="location.hash='#/dashboard'">${svg('arrowLeft', 15)} Back to Dashboard</button>

    <!-- Stream Visualizer Card -->
    <div class="stream-visualizer-card ${themeClass}">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:8px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
            <h1 style="margin:0;font-size:1.6rem;font-weight:800;color:#fff;">${esc(s.title)}</h1>
            ${s.category ? `<span style="background:rgba(139,92,246,0.15);color:#a78bfa;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:12px;">${esc(s.category)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="stream-role-pill ${isRecipient ? 'incoming' : (isSender ? 'outgoing' : 'outgoing')}">${isRecipient ? svg('arrowDownLeft', 11) + ' You are Receiving' : (isSender ? svg('arrowUpRight', 11) + ' You are Sending' : 'External')}</span>
            <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:700;background:rgba(${statusColor === '#10b981' ? '16,185,129' : statusColor === '#ef4444' ? '239,68,68' : '96,165,250'},0.12);color:${statusColor};">
              ${isStreaming ? '<span class="live-pulsing-dot"></span>' : ''} ${statusText}
            </span>
            <span style="font-size:0.78rem;color:var(--text-muted);font-family:monospace;">ID: #${s.id}</span>
          </div>
          ${s.memo ? `<p style="margin:10px 0 0;font-size:0.84rem;color:var(--text-sec);line-height:1.5;max-width:600px;">${esc(s.memo)}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:2rem;font-weight:800;color:#fff;">${fmt(s.depositAmount)}</div>
          <div style="font-size:0.8rem;color:var(--text-sec);font-weight:600;">USDC Total Deposit</div>
        </div>
      </div>

      <!-- Flow Diagram: Sender → Wave → Recipient -->
      <div class="stream-flow-container">
        <div class="flow-node">
          <div class="flow-node-avatar" style="background:linear-gradient(135deg,#${s.sender.slice(2,8)},#${s.sender.slice(-6)});">
            ${svg('arrowUpRight', 16)}
          </div>
          <div>
            <div class="flow-node-label">Sender</div>
            <a class="flow-node-addr" href="#/profile/${s.sender}">${shortAddr(s.sender)}</a>
          </div>
        </div>

        <div class="wave-visualizer-mid">
          <svg class="stream-sine-svg" viewBox="0 0 200 50" preserveAspectRatio="none">
            <path d="M0,25 Q25,5 50,25 T100,25 T150,25 T200,25" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
            <path class="wave-path-active ${isStreaming ? 'streaming' : ''}" d="M0,25 Q25,5 50,25 T100,25 T150,25 T200,25" fill="none" stroke="${accentColor}" stroke-width="2.5" opacity="0.6"/>
          </svg>
          <div class="stream-center-badge">
            ${isStreaming ? '<span class="live-pulsing-dot"></span>' : ''} ${fmt(ratePerDay)} USDC/day
          </div>
        </div>

        <div class="flow-node">
          <div class="flow-node-avatar" style="background:linear-gradient(135deg,#${s.recipient.slice(2,8)},#${s.recipient.slice(-6)});">
            ${svg('arrowDownLeft', 16)}
          </div>
          <div>
            <div class="flow-node-label">Recipient</div>
            <a class="flow-node-addr" href="#/profile/${s.recipient}">${shortAddr(s.recipient)}</a>
          </div>
        </div>
      </div>

      <!-- Live Ticking Balance -->
      <div style="text-align:center;margin:10px 0 20px 0;">
        <div style="font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-sec);margin-bottom:4px;">
          ${isRecipient ? 'Total Earned' : 'Total Streamed'}
        </div>
        <div class="stream-big-ticker" style="text-shadow:0 0 30px ${accentColor}40;">
          <span class="stream-ticker" id="detail-stream-ticker" data-id="${s.id}" data-active="${s.isActive}" data-role="${isRecipient ? 'recipient' : 'sender'}" data-start="${s.startTime}" data-stop="${s.stopTime}" data-deposit="${s.depositAmount}" data-withdrawn="${s.amountWithdrawn}" data-refundable="${s.refundable || 0}">0.000000</span>
          <span style="font-size:1rem;font-weight:600;color:var(--text-sec);margin-left:6px;">USDC</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="margin:0 0 20px 0;">
        <div style="display:flex;justify-content:space-between;font-size:0.76rem;color:var(--text-sec);margin-bottom:6px;">
          <span>${isStreaming ? `${remainDays}d ${remainHrs}h ${remainMins}m remaining` : statusText}</span>
          <span id="detail-stream-progress-pct" style="font-weight:700;color:#fff;">${progressPct.toFixed(1)}%</span>
        </div>
        <div class="stream-detail-progress-track">
          <div class="stream-detail-progress-bar ${progressClass}" id="detail-stream-progress-fill" style="width:${progressPct}%"></div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stream-hero-stats-grid">
        <div class="stream-hero-stat-card">
          <div class="stream-hero-stat-label">${svg('dollarSign', 13)} Total Deposit</div>
          <div class="stream-hero-stat-value" style="color:${accentColor}">${fmt(s.depositAmount)} USDC</div>
        </div>
        <div class="stream-hero-stat-card">
          <div class="stream-hero-stat-label">${svg('activity', 13)} Daily Rate</div>
          <div class="stream-hero-stat-value">${fmt(ratePerDay)} USDC/day</div>
        </div>
        <div class="stream-hero-stat-card">
          <div class="stream-hero-stat-label" style="color:var(--green)">${svg('arrowDownLeft', 13)} Withdrawable</div>
          <div class="stream-hero-stat-value" style="color:var(--green)" id="detail-stream-withdrawable">${s.withdrawable ? s.withdrawable.toFixed(4) : '0.0000'} USDC</div>
        </div>
        <div class="stream-hero-stat-card">
          <div class="stream-hero-stat-label" style="color:#f59e0b">${svg('rotateCw', 13)} Refundable</div>
          <div class="stream-hero-stat-value" style="color:#f59e0b" id="detail-stream-refundable">${s.refundable ? s.refundable.toFixed(4) : '0.0000'} USDC</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
        ${isRecipient && s.isActive ? `
          <button class="btn btn-primary" onclick="window.handleWithdrawStream(${s.id}, event)" ${s.withdrawable > 0.00001 ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"'}>
            ${svg('arrowDownLeft', 14)} Withdraw Earned USDC
          </button>` : ''}
        ${isSender && s.isActive ? `
          <button class="btn btn-danger" onclick="window.handleCancelStream(${s.id}, event)">
            ${svg('xCircle', 14)} Cancel & Refund
          </button>` : ''}
        <button class="btn btn-secondary" onclick="window.copyText('${shareUrl}', this)">
          ${svg('copy', 14)} Copy Stream URL
        </button>
        <a href="${explorerUrl}" target="_blank" class="btn btn-secondary">${svg('externalLink', 14)} ArcScan</a>
      </div>
    </div>

    <!-- On-chain Details Table -->
    <div class="detail-card" style="padding:24px;margin-bottom:24px;">
      <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        ${svg('list', 16)} Stream Details
      </h3>
      <div class="dev-table-wrap">
        <table class="history-table">
          <tbody>
            <tr><td style="color:var(--text-sec);font-weight:600;width:180px;">Stream ID</td><td style="font-family:monospace;font-weight:700;">#${s.id}</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Title / Purpose</td><td>${esc(s.title)}</td></tr>
            ${s.memo ? `<tr><td style="color:var(--text-sec);font-weight:600;">Description</td><td style="color:var(--text-sec);">${esc(s.memo)}</td></tr>` : ''}
            <tr><td style="color:var(--text-sec);font-weight:600;">Category</td><td><span style="background:rgba(139,92,246,0.12);color:#a78bfa;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:8px;">${esc(s.category)}</span></td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Sender</td><td><a href="#/profile/${s.sender}" style="color:var(--text);font-family:monospace;text-decoration:none;">${s.sender}</a></td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Recipient</td><td><a href="#/profile/${s.recipient}" style="color:var(--text);font-family:monospace;text-decoration:none;">${s.recipient}</a></td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Deposit Amount</td><td style="font-weight:800;color:${accentColor};">${fmt(s.depositAmount)} USDC</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Amount Withdrawn</td><td>${fmt(s.amountWithdrawn)} USDC</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Rate</td><td>${(ratePerSec * 3600).toFixed(6)} USDC/hr · ${fmt(ratePerDay)} USDC/day</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Duration</td><td>${durationDays} days (${duration.toLocaleString()} seconds)</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Start Time</td><td>${startDate.toLocaleString()}</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">End Time</td><td>${endDate.toLocaleString()}</td></tr>
            <tr><td style="color:var(--text-sec);font-weight:600;">Status</td><td style="color:${statusColor};font-weight:700;">${statusText}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</div>`
}

export function renderArbiterTabHtml(arbiterInfo) {
  return arbiterInfo && arbiterInfo.isPlatformArbiter ? `
    <div class="arbiter-portal-wrap" style="max-width:680px; margin:0 auto;">
      <div class="portal-header" style="display:flex; justify-content:space-between; align-items:center; background:rgba(34,197,94,0.02); border:1px solid rgba(34,197,94,0.15); border-radius:var(--radius-lg); padding:20px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="portal-avatar" style="width:48px; height:48px; border-radius:50%; background:var(--green-dim); border:1px solid var(--green-border); display:flex; align-items:center; justify-content:center; color:var(--green);">${svg('shield', 20)}</div>
          <div>
            <h3 style="font-size:1.15rem; margin-bottom:2px; color:var(--green)">Active Platform Arbiter</h3>
            <p style="color:var(--text-sec); font-size:0.82rem; margin:0;">Your node is active. You are eligible to resolve disputes.</p>
          </div>
        </div>
        <span class="badge badge-completed">Registered</span>
      </div>
      
      <div class="portal-stats-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:24px;">
        <div class="dash-stat">
          <div class="dash-stat-label">Your Stake</div>
          <div class="dash-stat-value green">${fmt(arbiterInfo.stake)} USDC</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-label">Trust Score</div>
          <div class="dash-stat-value">${arbiterInfo.trustScore}</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-label">Disputes Resolved</div>
          <div class="dash-stat-value">${arbiterInfo.disputesResolved}</div>
        </div>
      </div>

      <div class="portal-actions-card" style="background:var(--card); border:1px solid var(--border); padding:24px; border-radius:var(--radius-lg);">
        <h3 style="font-size:0.95rem; margin-bottom:8px;">Manage Your Stake</h3>
        <p style="color:var(--text-sec); font-size:0.8rem; margin-bottom:18px; line-height:1.5;">To resign from the arbiter pool and withdraw your locked stake, click the button below. Once resigned, you will no longer be eligible to receive dispute resolution jobs or earn fees.</p>
        <button class="btn btn-danger" onclick="window.handleWithdrawArbiterStake()">${svg('xCircle', 14)} Resign &amp; Withdraw Stake</button>
      </div>
    </div>
  ` : `
    <div class="arbiter-portal-wrap" style="max-width:680px; margin:0 auto;">
      <div class="portal-intro-card" style="background:linear-gradient(135deg, rgba(34,197,94,0.03), rgba(139,92,246,0.03)); border:1px solid var(--border); padding:24px; border-radius:var(--radius-lg); margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:flex-start;">
          <div class="feature-icon" style="background:rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.2); color:#a78bfa; flex-shrink:0;">${svg('shield', 22)}</div>
          <div>
            <h2 style="font-size:1.25rem; margin-bottom:8px; font-weight:800;">Become a Platform Arbiter</h2>
            <p style="color:var(--text-sec); font-size:0.88rem; line-height:1.55;">Help secure the ecosystem by resolving transaction conflicts. Staked arbiters earn a fixed ${CONFIG.arbiterFeePercent}% resolution fee on the total escrow amount. Fees are dynamically allocated based on your trust score and stake size relative to the pool.</p>
          </div>
        </div>
        
        <div style="margin-top:20px; display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; border-top:1px solid var(--border); padding-top:20px; text-align:center;">
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px; font-weight:600;">Staking Requirement</span>
            <span style="font-size:0.95rem; font-weight:800; color:#fff;">Min. ${CONFIG.minArbiterStake} USDC</span>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px; font-weight:600;">Incentive Model</span>
            <span style="font-size:0.95rem; font-weight:800; color:var(--green);">${CONFIG.arbiterFeePercent}% Fixed Fee</span>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; display:block; margin-bottom:4px; font-weight:600;">Platform Security</span>
            <span style="font-size:0.95rem; font-weight:800; color:#fff;">On-Chain Pool</span>
          </div>
        </div>
      </div>

      <div class="form-card" style="background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:28px;">
        <h3 style="font-size:1rem; margin-bottom:12px; font-weight:700;">Stake USDC &amp; Join Pool</h3>
        <form id="register-arbiter-form" onsubmit="window.handleRegisterArbiter(event)">
          <div class="form-group" style="margin-bottom:18px;">
            <label>Stake Amount (USDC)</label>
            <input type="number" id="arbiter-stake-amount" placeholder="${CONFIG.minArbiterStake.toFixed(2)}" min="${CONFIG.minArbiterStake}" step="0.01" value="${CONFIG.minArbiterStake.toFixed(2)}" required>
            <div class="form-hint">Minimum required stake is ${CONFIG.minArbiterStake} USDC. You can withdraw your stake at any time.</div>
          </div>
          <div style="font-size:.78rem; color:var(--text-sec); margin-bottom:20px; background:rgba(255,255,255,0.02); padding:12px; border:1px solid var(--border); border-radius:8px; line-height:1.45;">
            ${svg('info', 13)} Staking will lock your USDC in the ParcisSafe contract. You must maintain a high trust score. Resolving disputes dishonestly or failing to respond will result in trust score decay or stake slashing.
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="register-arbiter-btn" style="width:100%; justify-content:center;">${svg('check', 16)} Approve &amp; Stake USDC</button>
        </form>
      </div>
    </div>
  `
}

// ─── DASHBOARD (INSTANT SHELL + DYNAMIC TAB LOADING) ───
export async function renderDashboard() {
  if (!isConnected()) return `<div class="page"><div class="container"><div class="empty-state" style="margin-top:80px"><div class="empty-state-icon">${svg('wallet', 40)}</div><h3>Connect Your Wallet</h3><p>Connect to see your dashboard.</p><button class="btn btn-primary" onclick="window.connectWallet()">Connect Wallet</button></div></div></div>`
  const account = getAccount()

  // Trigger immediate parallel fetch for all dashboard summary metrics & default tab
  const urlTab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab')
  const defaultTab = urlTab || window._activeDashTab || 'links'
  setTimeout(() => {
    if (window.loadDashboardSummary) window.loadDashboardSummary(account)
    if (window.switchTab) window.switchTab(defaultTab)
  }, 0)

  return `
<div class="page">
  <div class="container">
    <div class="dash-header">
      <h1>Dashboard</h1>
      <a href="#/send" class="btn btn-primary">${svg('plus', 15)} New Link</a>
    </div>
    <div class="dash-stats">
      <div class="dash-stat"><div class="dash-stat-label">Wallet Balance</div><div class="dash-stat-value green" id="dash-balance-val">...</div></div>
      <div class="dash-stat"><div class="dash-stat-label">Total Received</div><div class="dash-stat-value" id="dash-received-val">...</div></div>
      <div class="dash-stat"><div class="dash-stat-label">Active Streams</div><div class="dash-stat-value" id="dash-streams-count">...</div></div>
      <div class="dash-stat"><div class="dash-stat-label">Safe Deals</div><div class="dash-stat-value" id="dash-deals-count">...</div></div>
    </div>
    <a href="#/profile/${account}" class="dash-portfolio-banner">
      <div class="dash-portfolio-left">
        <div class="dash-portfolio-icon">${svg('user', 20)}</div>
        <div>
          <div class="dash-portfolio-title">My On-Chain Portfolio</div>
          <div class="dash-portfolio-sub">View your verifiable reputation, completed work, and achievement badges</div>
        </div>
      </div>
      <span class="dash-portfolio-arrow">→</span>
    </a>
    <div class="dash-tabs">
      <button class="dash-tab active" id="tab-links" onclick="window.switchTab('links')">${svg('link', 14)} Payment Links</button>
      <button class="dash-tab" id="tab-streams" onclick="window.switchTab('streams')">${svg('activity', 14)} Streams</button>
      <button class="dash-tab" id="tab-deals" onclick="window.switchTab('deals')">${svg('shield', 14)} Safe Deals</button>
      <button class="dash-tab" id="tab-arbiter" onclick="window.switchTab('arbiter')">${svg('shield', 14)} Arbiter Portal</button>
    </div>
    <div id="tab-content-links"></div>
    <div id="tab-content-streams" style="display:none"></div>
    <div id="tab-content-deals" style="display:none"></div>
    <div id="tab-content-arbiter" style="display:none"></div>
  </div>
</div>`
}

// ─── SAFE LANDING ───
export function renderSafe() {
  return `
<div class="page">
  <div class="container">
    <div class="safe-hero">
      <div class="premium-badge">${svg('shield', 13)} Premium Feature</div>
      <h2>Parcis <span style="color:var(--green)">Safe</span></h2>
      <p style="color:var(--text-sec);max-width:500px;margin:0 auto 24px;font-size:.95rem">For deals where trust is critical. Lock USDC in a smart contract - released only when the client approves the delivered work.</p>
      <div class="hero-actions" style="justify-content:center">
        <a href="#/create" class="btn btn-primary btn-lg">${svg('lock', 16)} Create Escrow Deal</a>
        <a href="#/dashboard" class="btn btn-secondary btn-lg">${svg('dashboard', 16)} View My Deals</a>
      </div>
    </div>
    <div class="features-grid" style="max-width:860px;margin:0 auto">
      <div class="feature-card"><div class="feature-icon">${svg('lock', 18)}</div><h3>Locked Escrow</h3><p>USDC is locked in a smart contract on Arc. Neither party can access it until deal terms are met.</p></div>
      <div class="feature-card"><div class="feature-icon">${svg('package', 18)}</div><h3>Proof of Delivery</h3><p>Worker submits deliverable proof on-chain. Client reviews, then releases funds instantly with sub-second settlement.</p></div>
      <div class="feature-card"><div class="feature-icon">${svg('alertTriangle', 18)}</div><h3>Dispute Resolution</h3><p>Disagree? A pre-agreed arbiter reviews the case and decides how funds are distributed - fairly and finally.</p></div>
    </div>
    <div style="text-align:center;margin:40px auto 0;max-width:560px;padding:24px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg)">
      <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">When to use which</p>
      <p style="color:var(--text-sec);font-size:.9rem">Use <strong style="color:var(--green)">Payment Links</strong> for trusted, quick payments. Use <strong style="color:var(--green)">Safe</strong> when hiring strangers or handling large amounts.</p>
    </div>
  </div>
</div>`
}

// ─── CREATE DEAL ───
export function renderCreate() {
  if (!isConnected()) return `<div class="page"><div class="container form-container"><div class="empty-state" style="margin-top:60px"><div class="empty-state-icon">${svg('wallet', 40)}</div><h3>Connect Wallet</h3><button class="btn btn-primary" onclick="window.connectWallet()">Connect Wallet</button></div></div></div>`
  const tomorrow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)
  return `
<div class="page">
  <div class="container form-container">
    <div class="form-header">
      <div class="premium-badge" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);color:#a78bfa;font-size:.75rem;font-weight:600;margin-bottom:12px">${svg('shield', 13)} Safe - Escrow Deal</div>
      <h1>Create Escrow Deal</h1>
      <p style="color:var(--text-sec)">Lock USDC until work is delivered. Both parties protected.</p>
    </div>
    <div class="form-card">
      <form id="create-deal-form">
        <div class="form-group"><label>Deal Title</label><input type="text" id="deal-title" placeholder="e.g. Logo Design, Website Build" required></div>
        <div class="form-group"><label>Description</label><textarea id="deal-desc" placeholder="Describe deliverables and conditions..."></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Amount (USDC)</label><input type="number" id="deal-amount" placeholder="150.00" min="0.01" step="0.01" required></div>
          <div class="form-group"><label>Deadline</label><input type="datetime-local" id="deal-deadline" value="${tomorrow}" required></div>
        </div>
        <div class="form-group"><label>Worker Address or Parcis Link</label><input type="text" id="deal-worker" placeholder="0x... or Parcis link name" required><div class="form-hint">Wallet address <strong>or Parcis link name</strong> of the person doing the work. <strong>Must be different from your wallet</strong> (${getAccount() ? `yours: ${getAccount().slice(0, 6)}...${getAccount().slice(-4)}` : 'connect wallet first'}).</div></div>
        
        <div class="form-group">
          <label>Arbiter Type</label>
          <div class="type-selector" style="margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="type-option selected" id="arbiter-type-platform" onclick="window.selectArbiterType('platform')">
              <div class="type-option-icon">${svg('shield', 18)}</div>
              <div class="type-option-label">Platform Arbiter Pool</div>
            </div>
            <div class="type-option" id="arbiter-type-personal" onclick="window.selectArbiterType('personal')">
              <div class="type-option-icon">${svg('user', 18)}</div>
              <div class="type-option-label">Personal Arbiter</div>
            </div>
          </div>
          <input type="hidden" id="arbiter-type-input" value="platform">
        </div>

        <!-- Platform Arbiter Group -->
        <div class="form-group" id="platform-arbiter-group">
          <label>Select Platform Arbiter</label>
          <div id="platform-arbiters-list" class="arbiters-list-wrap">
            <div class="loading-inline" style="padding: 12px; color: var(--text-sec); display: flex; align-items: center; gap: 8px; justify-content: center;">
              <span class="spinner"></span> Loading registered arbiters...
            </div>
          </div>
          <input type="hidden" id="selected-platform-arbiter" value="">
          <div class="form-hint">Choose an active registered platform arbiter from the staking pool.</div>
        </div>

        <!-- Personal Arbiter Group -->
        <div class="form-group" id="personal-arbiter-group" style="display: none;">
          <label>Personal Arbiter Address or Parcis Link</label>
          <input type="text" id="deal-arbiter" placeholder="0x... or Parcis link name (optional)">
          <div class="form-hint">Trusted third party for disputes. Leave blank for no arbiter (fully trustless escrow).</div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg" id="create-btn">${svg('lock', 16)} Create Escrow Deal</button>
          <a href="#/safe" class="btn btn-secondary btn-lg">Cancel</a>
        </div>
      </form>
    </div>
  </div>
</div>`
}

// ─── DEAL DETAIL ───
export async function renderDeal(id) {
  const deal = await getDeal(parseInt(id))
  if (!deal) return `<div class="page"><div class="container detail-container"><div class="empty-state" style="margin-top:80px"><div class="empty-state-icon">${svg('xCircle', 40)}</div><h3>Deal Not Found</h3><a href="#/dashboard" class="btn btn-secondary">Dashboard</a></div></div></div>`

  const { getArbiterInfo, getContractOwner } = await import('./contract.js')
  const arbiterInfo = await getArbiterInfo(deal.arbiter)
  const ownerAddress = await getContractOwner()

  const account = (getAccount() || '').toLowerCase()
  const isClient = deal.client === account, isWorker = deal.worker === account, isArbiter = deal.arbiter === account
  const isOwner = account === ownerAddress.toLowerCase()
  const now = Date.now()
  const dlMs = new Date(deal.deadline).getTime()
  const isExpired = dlMs < now
  const timeDiff = Math.abs(dlMs - now)
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hrsDiff = Math.floor((timeDiff / (1000 * 60 * 60)) % 24)
  const countdownStr = isExpired ? `Expired ${daysDiff}d ${hrsDiff}h ago` : `Expires in ${daysDiff}d ${hrsDiff}h`

  const s = deal.status
  let actions = ''
  if (isClient && s === 0) actions = `<button class="btn btn-primary" onclick="window.handleFund(${id})">${svg('lock', 15)} Fund Escrow</button><button class="btn btn-danger" onclick="window.handleCancel(${id})">Cancel</button>`
  if (isWorker && s === 1) actions = `<button class="btn btn-primary" onclick="window.handleSubmit(${id})">${svg('package', 15)} Submit Deliverable</button>`
  if (isClient && s === 1 && isExpired) actions += `<button class="btn btn-secondary" onclick="window.handleRenew(${id})" style="margin-left:8px">${svg('activity', 15)} Renew Deadline</button><button class="btn btn-danger" onclick="window.handleClientWithdraw(${id})" style="margin-left:8px">${svg('alertTriangle', 15)} Withdraw (Expired)</button>`
  if (isClient && s === 2) actions += `<button class="btn btn-primary" onclick="window.handleApprove(${id})">${svg('checkCircle', 15)} Approve &amp; Release</button><button class="btn btn-danger" onclick="window.handleDispute(${id})">${svg('alertTriangle', 15)} Dispute</button>`
  if ((isClient || isWorker) && s === 1 && !isExpired) actions += `<button class="btn btn-danger" onclick="window.handleDispute(${id})">${svg('alertTriangle', 15)} Dispute</button>`
  if (isArbiter && s === 4) actions = `<button class="btn btn-primary" onclick="window.handleResolve(${id},true)">Pay Worker</button><button class="btn btn-danger" onclick="window.handleResolve(${id},false)">Refund Client</button>`
  if ((isClient || isWorker) && s === 4 && isExpired) actions += `<button class="btn btn-danger" onclick="window.handleArbiterDead(${id})" style="margin-left:8px">Arbiter Unresponsive</button>`

  let appealRemainingStr = ''
  let appealWindowPassed = false
  if (s === 5) {
    const appealDuration = 172800 * 1000 // 48 hours
    const resolutionTime = deal.resolutionTimestamp || 0
    const appealEndTime = resolutionTime + appealDuration
    if (now < appealEndTime) {
      const remainingMs = appealEndTime - now
      const remHours = Math.floor(remainingMs / (1000 * 60 * 60))
      const remMins = Math.floor((remainingMs / (1000 * 60)) % 60)
      appealRemainingStr = `Appeal window: ${remHours}h ${remMins}m remaining`
      if (isClient || isWorker) {
        actions += `<button class="btn btn-danger" onclick="window.handleAppeal(${id})" style="margin-left:8px">${svg('alertTriangle', 15)} Appeal Ruling</button>`
      }
    } else {
      appealWindowPassed = true
      appealRemainingStr = `Appeal window expired`
      actions += `<button class="btn btn-primary" onclick="window.handleFinalizeResolution(${id})">${svg('checkCircle', 15)} Finalize Payout</button>`
    }
  }

  if (s === 7) {
    if (isOwner) {
      actions += `<button class="btn btn-primary" onclick="window.handleFinalizeAppeal(${id},true)">Finalize Appeal (For Worker)</button>`
      actions += `<button class="btn btn-danger" onclick="window.handleFinalizeAppeal(${id},false)" style="margin-left:8px">Finalize Appeal (For Client)</button>`
    }
  }

  let stageLabel = 'Awaiting Completion'
  let stageTime = 0
  if (s === 3) { stageLabel = 'Completed'; stageTime = deal.completedAt || deal.resolvedAt }
  else if (s === 4) { stageLabel = 'Disputed'; stageTime = deal.disputedAt }
  else if (s === 5) { stageLabel = 'Resolved (Holding)'; stageTime = deal.resolutionTimestamp }
  else if (s === 6) { stageLabel = 'Cancelled'; stageTime = deal.cancelledAt }
  else if (s === 7) { stageLabel = 'Appealed (Review)'; stageTime = deal.appealedAt }

  const timelineItems = [
    { label: 'Deal Created', time: deal.createdAt, done: true },
    { label: 'Escrow Funded', time: deal.createdAt, done: s >= 1 },
    { label: 'Deliverable Submitted', time: deal.createdAt, done: s >= 2 },
    { label: stageLabel, time: stageTime || deal.createdAt, done: s === 3 || s === 5 || s === 6 || s === 7 },
  ]
  return `
<div class="page">
  <div class="container detail-container">
    <button class="detail-back" onclick="location.hash='#/dashboard'">${svg('arrowLeft', 15)} Dashboard</button>
    <div class="detail-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div>
          <h2 class="detail-title">${esc(deal.title)}</h2>
          <div class="detail-meta">
            <span class="badge badge-${getStatusClass(s)}">${getStatusLabel(s)}</span>
            <span class="detail-meta-item">${svg('clock', 13)} ${fmtDate(deal.createdAt)}</span>
          </div>
        </div>
        <div style="text-align:right"><div class="detail-amount">${fmt(deal.amount)} USDC</div></div>
      </div>
      ${deal.description ? `<div class="detail-desc">${esc(deal.description)}</div>` : ''}
      ${(deal.status === 4 || deal.status === 5 || deal.status === 7) && deal.disputeReason ? `
      <div style="margin-bottom:20px;padding:16px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:8px;">
        <label style="font-size:.72rem;color:var(--danger);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;font-weight:600;">${svg('alertTriangle', 13)} Dispute Reason</label>
        <div style="font-size:.875rem;color:var(--text);line-height:1.5;">${esc(deal.disputeReason)}</div>
      </div>` : ''}
      ${s === 5 ? `
      <div style="margin-bottom:20px; padding:16px; background:rgba(0,180,216,0.06); border:1px solid rgba(0,180,216,0.25); border-radius:12px; display:flex; gap:12px; align-items:center;">
        <div style="color:var(--primary); display:flex;">${svg('info', 18)}</div>
        <div style="font-size:0.875rem; line-height:1.5;">
          <strong>Proposed Resolution:</strong> Arbiter ruled in favor of the <span style="color:var(--primary); font-weight:600;">${deal.resolutionForWorker ? 'Worker' : 'Client'}</span>.
          <div style="font-size:0.75rem; color:var(--text-sec); margin-top:2px;">${appealRemainingStr}</div>
        </div>
      </div>` : ''}
      ${s === 7 ? `
      <div style="margin-bottom:20px; padding:16px; background:rgba(255,178,0,0.06); border:1px solid rgba(255,178,0,0.25); border-radius:12px; display:flex; gap:12px; align-items:center;">
        <div style="color:#ffb200; display:flex;">${svg('alertTriangle', 18)}</div>
        <div style="font-size:0.875rem; line-height:1.5;">
          <strong>Dispute Appealed:</strong> A final decision is pending review by the platform administrator.
        </div>
      </div>` : ''}
      <div class="detail-grid">
        <div class="detail-field"><label>Client</label><div class="val mono"><a href="#/profile/${deal.client}" style="color:var(--green);text-decoration:none">${shortAddr(deal.client)}</a>${isClient ? ' (You)' : ''}</div></div>
        <div class="detail-field"><label>Worker</label><div class="val mono"><a href="#/profile/${deal.worker}" style="color:var(--green);text-decoration:none">${shortAddr(deal.worker)}</a>${isWorker ? ' (You)' : ''}</div></div>
        <div class="detail-field">
          <label>Arbiter</label>
          <div class="val mono" style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
            ${deal.arbiter.toLowerCase() === deal.client.toLowerCase() ? `
              <span style="color:var(--text-sec)">None (Direct Escrow)</span>
              <span class="badge badge-silver" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0;">
                ${svg('user', 10)} Direct Escrow
              </span>
            ` : `
              <a href="#/profile/${deal.arbiter}" style="color:var(--green);text-decoration:none">${shortAddr(deal.arbiter)}</a>
              ${isArbiter ? ' (You)' : ''}
              ${arbiterInfo && arbiterInfo.isPlatformArbiter ? `
                <span class="badge badge-purple" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0;">
                  ${svg('shield', 10)} Verified Platform Arbiter
                </span>
              ` : `
                <span class="badge badge-silver" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0;">
                  ${svg('user', 10)} Personal Arbiter
                </span>
              `}
            `}
          </div>
        </div>
        <div class="detail-field"><label>Deadline</label><div class="val">${fmtDate(deal.deadline)} <span style="color:${isExpired ? 'var(--danger)' : 'var(--text-sec)'};font-size:0.8em;margin-left:8px">(${countdownStr})</span></div></div>
      </div>
      ${(() => {
      if (deal.deliverable) {
        const isUrl = /^https?:\/\//i.test(deal.deliverable)
        return `<div class="detail-card" style="margin-top:0;margin-bottom:0">
            <label style="font-size:.75rem;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px;display:block">${svg('package', 13)} Deliverable Proof</label>
            ${isUrl
            ? `<a href="${esc(deal.deliverable)}" target="_blank" style="color:var(--green);word-break:break-all;font-size:.875rem">${esc(deal.deliverable)} ${svg('externalLink', 12)}</a>`
            : `<div style="color:var(--text);font-size:.875rem;word-break:break-all">${esc(deal.deliverable)}</div>`
          }
          </div>`
      }
      return ''
    })()}
      ${actions ? `<div class="detail-actions">${actions}</div>` : ''}
    </div>
    <div class="detail-card">
      <h3 style="font-size:.95rem;margin-bottom:16px">${svg('activity', 15)} Timeline</h3>
      <div class="timeline">
        ${timelineItems.map(it => `<div class="timeline-item ${it.done ? 'done' : ''}"><div class="timeline-label">${it.label}</div>${it.time ? `<div class="timeline-time">${fmtDate(it.time)}</div>` : ''}</div>`).join('')}
      </div>
    </div>
  </div>
</div>`
}

// ─── PROFILE PAGE ───
export async function renderProfile(address, resolvedSlug) {
  const { fetchUserLinksFromChain } = await import('./links-contract.js')
  const { getPublicClient, getRawUSDCBalance } = await import('./wallet.js')
  const { formatUnits } = await import('viem')
  const { getArbiterInfo } = await import('./contract.js')

  // Fetch all data from blockchain sequentially to avoid RPC rate-limiting
  const pc = getPublicClient()
  const deals = await getDealsForAddress(address).catch(() => [])
  const links = await fetchUserLinksFromChain(address).catch(() => [])
  const nativeBal = await pc.getBalance({ address }).catch(() => 0n)
  const usdcBal = await getRawUSDCBalance(address).catch(() => 0)
  const arbiterInfo = await getArbiterInfo(address).catch(() => null)
  const slashHistory = await getArbiterSlashHistory(address).catch(() => [])

  // Fetch unique arbiter details sequentially
  const arbiterAddresses = [...new Set(deals.map(d => d.arbiter).filter(Boolean))]
  const arbiterInfos = []
  for (const addr of arbiterAddresses) {
    arbiterInfos.push(await getArbiterInfo(addr).catch(() => null))
  }
  const arbiterMap = Object.fromEntries(arbiterAddresses.map((addr, idx) => [addr.toLowerCase(), arbiterInfos[idx]]))

  const nativeFormatted = parseFloat(formatUnits(nativeBal, 18)).toFixed(4)
  const usdcFormatted = parseFloat(usdcBal).toFixed(2)

  const addr = address.toLowerCase()
  const displayName = resolvedSlug || shortAddr(address)

  // ── Calculate on-chain stats ──
  const workerDeals = deals.filter(d => d.worker === addr)
  const clientDeals = deals.filter(d => d.client === addr)

  const completedAsWorker = workerDeals.filter(d => d.status === 3 || d.status === 5) // Completed or Resolved(for worker)
  const completedAsClient = clientDeals.filter(d => d.status === 3 || d.status === 5)
  const disputedDeals = deals.filter(d => d.status === 4 || d.status === 5)

  const totalEarned = completedAsWorker.reduce((s, d) => s + d.amount, 0)
  const totalSpent = completedAsClient.reduce((s, d) => s + d.amount, 0)
  const totalDeals = deals.length
  const completedCount = completedAsWorker.length + completedAsClient.length
  const disputeCount = disputedDeals.length
  const completionRate = workerDeals.length > 0 ? Math.round((completedAsWorker.length / workerDeals.length) * 100) : 100

  // Earliest deal
  const memberSince = deals.length > 0 ? fmtDate(Math.min(...deals.map(d => d.createdAt))) : 'New member'

  // Total received from payment links
  const totalFromLinks = links.reduce((s, l) => s + (l.totalRaised || 0), 0)
  const totalPayments = links.reduce((s, l) => s + (l.paymentCount || 0), 0)

  // ── TRUST SCORE (0-100) ──
  // Weighted: completion rate (40%), volume (25%), consistency (20%), dispute penalty (15%)
  let trustScore = 0
  if (totalDeals > 0 || links.length > 0) {
    const completionPart = completionRate * 0.40
    const volumeRaw = Math.min(totalEarned + totalSpent + totalFromLinks, 10000)
    const volumePart = (volumeRaw / 10000) * 100 * 0.25
    const dealCountRaw = Math.min(totalDeals + links.length, 50)
    const consistencyPart = (dealCountRaw / 50) * 100 * 0.20
    const disputePenalty = totalDeals > 0 ? (disputeCount / totalDeals) * 100 * 0.15 : 0
    trustScore = Math.min(100, Math.max(0, Math.round(completionPart + volumePart + consistencyPart - disputePenalty)))
  }

  // Dynamic trust color: pure red < 50, yellow 50-89, green >= 90
  const trustColor = trustScore >= 90 ? '#22c55e' : (trustScore >= 50 ? '#eab308' : '#ef4444')

  // ── Render completed work portfolio ──
  const portfolioItems = workerDeals
    .filter(d => d.status === 3 || d.status === 5)
    .map(d => {
      const deliverable = d.deliverable
      const isUrl = deliverable && (deliverable.startsWith('http') || deliverable.startsWith('www'))
      const isDirect = d.arbiter.toLowerCase() === d.client.toLowerCase()
      const isPlat = !isDirect && (arbiterMap[d.arbiter.toLowerCase()]?.isPlatformArbiter)
      const arbiterBadge = isDirect ? `
        <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
          ${svg('user', 9)} Direct Escrow
        </span>
      ` : (isPlat ? `
        <span class="badge badge-purple" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0;">
          ${svg('shield', 9)} Verified Pool
        </span>
      ` : `
        <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
          ${svg('user', 9)} Personal Arbiter
        </span>
      `)

      return `
      <div class="portfolio-item">
        <div class="portfolio-header">
          <span class="portfolio-title">${esc(d.title)}</span>
          <span class="portfolio-amount">$${fmt(d.amount)} USDC</span>
        </div>
        <div class="portfolio-meta">${fmtDate(d.createdAt)}</div>
        <div style="font-size:0.75rem; color:var(--text-sec); margin: 6px 0 10px 0; display:flex; align-items:center; gap:6px;">
          <span>Arbiter:</span>
          ${arbiterBadge}
        </div>
        ${deliverable ? `<div class="portfolio-deliverable">${svg('link2', 13)} ${isUrl ? `<a href="${esc(deliverable)}" target="_blank" rel="noopener">${esc(deliverable)}</a>` : `<span>${esc(deliverable)}</span>`}</div>` : ''}
        <a href="#/deal/${d.id}" class="portfolio-view">View Deal →</a>
      </div>`
    }).join('')

  // ── Render active deals ──
  const activeDeals = deals
    .filter(d => d.status < 3) // Created, Funded, Submitted
    .map(d => {
      const isDirect = d.arbiter.toLowerCase() === d.client.toLowerCase()
      const isPlat = !isDirect && (arbiterMap[d.arbiter.toLowerCase()]?.isPlatformArbiter)
      const arbiterBadge = isDirect ? `
        <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
          ${svg('user', 9)} Direct Escrow
        </span>
      ` : (isPlat ? `
        <span class="badge badge-purple" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0;">
          ${svg('shield', 9)} Verified Pool
        </span>
      ` : `
        <span class="badge badge-silver" style="text-transform:none; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; opacity:0.85;">
          ${svg('user', 9)} Personal Arbiter
        </span>
      `)

      return `
      <div class="portfolio-item active-deal">
        <div class="portfolio-header">
          <span class="portfolio-title">${esc(d.title)}</span>
          <span class="status-badge ${getStatusClass(d.status)}">${getStatusLabel(d.status)}</span>
        </div>
        <div class="portfolio-meta">$${fmt(d.amount)} USDC · ${d.worker === addr ? 'Worker' : 'Client'}</div>
        <div style="font-size:0.75rem; color:var(--text-sec); margin: 6px 0 10px 0; display:flex; align-items:center; gap:6px;">
          <span>Arbiter:</span>
          ${arbiterBadge}
        </div>
        <a href="#/deal/${d.id}" class="portfolio-view">View Deal →</a>
      </div>`
    }).join('')

  // ── Render payment links ──
  const linkItems = links.map(l => `
    <div class="portfolio-item" onclick="location.hash='#/link/${l.id}'" style="cursor: pointer">
      <div class="portfolio-header">
        <span class="portfolio-title">${esc(l.label)}</span>
        <span class="portfolio-amount">${l.amount ? `$${fmt(l.amount)}` : 'Open'}</span>
      </div>
      <div class="portfolio-meta">${l.paymentCount} payment${l.paymentCount !== 1 ? 's' : ''} · $${fmt(l.totalRaised)} received</div>
      <a href="#/pay/${l.id}" class="portfolio-view" onclick="event.stopPropagation()">View Link →</a>
    </div>`).join('')

  return `
<div class="page">
  <div class="container" style="max-width:800px">

    <div class="profile-card" style="display:flex; flex-direction:column; gap:20px; padding:28px">
      <div class="profile-card-header">
        <div class="profile-card-left">
          <div class="profile-avatar">${displayName.slice(0, 2).toUpperCase()}</div>
          <div class="profile-info" style="flex:1; min-width:0">
            <h1 class="profile-name" style="word-break:break-all; display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
              ${esc(displayName)}
              ${arbiterInfo && arbiterInfo.isPlatformArbiter ? `
                <span class="badge badge-purple" style="text-transform:none; font-weight:600; padding:4px 10px; font-size:0.75rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0; box-shadow: 0 0 10px rgba(139,92,246,0.15)">
                  ${svg('shield', 11)} Verified Platform Arbiter
                </span>
              ` : (deals.some(d => d.arbiter === addr && d.client !== addr) || (arbiterInfo && arbiterInfo.disputesResolved > 0) ? `
                <span class="badge badge-silver" style="text-transform:none; font-weight:600; padding:4px 10px; font-size:0.75rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0;">
                  ${svg('user', 11)} Personal Arbiter
                </span>
              ` : '')}
            </h1>
            <div class="profile-address" style="word-break:break-all; white-space:normal">${address}</div>
            <div class="profile-since">${svg('calendar', 13)} ${memberSince}</div>
          </div>
        </div>
        <div class="trust-score-ring">
          <svg viewBox="0 0 100 100" class="trust-ring-svg">
            <circle cx="50" cy="50" r="42" class="trust-ring-bg"/>
            <circle cx="50" cy="50" r="42" class="trust-ring-fill" style="stroke-dashoffset:${264 - (264 * trustScore / 100)}; stroke:${trustColor}"/>
          </svg>
          <div class="trust-score-value" style="color:${trustColor}">${trustScore}</div>
          <div class="trust-score-label">Trust Score</div>
        </div>
      </div>
      
      <div class="trust-breakdown-row">
        <span><strong style="color:var(--green)">+${totalDeals > 0 || links.length > 0 ? Math.round(completionRate * 0.40) : 0}%</strong> Completion</span>
        <span><strong style="color:var(--green)">+${totalDeals > 0 || links.length > 0 ? Math.round((Math.min(totalEarned + totalSpent + totalFromLinks, 10000) / 10000) * 100 * 0.25) : 0}%</strong> Volume</span>
        <span><strong style="color:var(--green)">+${totalDeals > 0 || links.length > 0 ? Math.round((Math.min(totalDeals + links.length, 50) / 50) * 100 * 0.20) : 0}%</strong> Activity</span>
        <span><strong style="color:var(--danger)">-${totalDeals > 0 || links.length > 0 ? Math.round(totalDeals > 0 ? (disputeCount / totalDeals) * 100 * 0.15 : 0) : 0}%</strong> Disputes</span>
      </div>
    </div>

    <div class="profile-stats">
      <div class="profile-stat">
        <div class="profile-stat-value">${totalDeals}</div>
        <div class="profile-stat-label">Total Deals</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">$${fmt(totalEarned)}</div>
        <div class="profile-stat-label">Earned (Worker)</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">$${fmt(totalSpent)}</div>
        <div class="profile-stat-label">Spent (Client)</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value ${completionRate >= 90 ? 'stat-green' : completionRate >= 70 ? 'stat-yellow' : 'stat-red'}">${completionRate}%</div>
        <div class="profile-stat-label">Completion Rate</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">${disputeCount}</div>
        <div class="profile-stat-label">Disputes</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value">${links.length}</div>
        <div class="profile-stat-label">Payment Links</div>
      </div>
    </div>

    <div class="profile-badge-row">
      ${completedAsWorker.length >= 10 ? `<span class="profile-badge badge-gold">${svg('award', 13)} Veteran (10+ jobs)</span>` : ''}
      ${completedAsWorker.length >= 5 && completedAsWorker.length < 10 ? `<span class="profile-badge badge-silver">${svg('award', 13)} Experienced (5+ jobs)</span>` : ''}
      ${disputeCount === 0 && totalDeals >= 3 ? `<span class="profile-badge badge-green">${svg('shield', 13)} Zero Disputes</span>` : ''}
      ${completionRate === 100 && workerDeals.length >= 3 ? `<span class="profile-badge badge-blue">${svg('checkCircle', 13)} Perfect Record</span>` : ''}
      ${totalEarned >= 1000 ? `<span class="profile-badge badge-purple">${svg('dollarSign', 13)} $1K+ Earned</span>` : ''}
      ${totalFromLinks >= 500 ? `<span class="profile-badge badge-cyan">${svg('zap', 13)} $500+ via Links</span>` : ''}
    </div>

    <!-- On-Chain Portfolio Section -->
    <div class="profile-section" style="margin-top: 8px">
      <h2>${svg('wallet', 18)} On-Chain Portfolio</h2>
      <p class="section-hint">Real-time asset balances read directly from the Arc network.</p>
      <div class="portfolio-assets">
        <div class="asset-card">
          <div class="asset-info" style="display:flex; align-items:center; gap:12px; width:100%">
            <div class="asset-icon usdc" style="display:flex;align-items:center;justify-content:center;background:rgba(39, 117, 202, 0.15);color:#2775ca;width:36px;height:36px;border-radius:50%;border:1px solid rgba(39, 117, 202, 0.3)">
              ${svg('dollarSign', 18)}
            </div>
            <div>
              <div class="asset-name" style="font-weight: 700; font-size: 0.95rem; color: var(--text)">USDC (ERC-20)</div>
              <div class="asset-symbol" style="font-size: 0.72rem; color: var(--text-muted)">Payment Token</div>
            </div>
          </div>
          <div class="asset-balance" style="text-align: left; margin-top: 4px">
            <div class="asset-val" style="font-size: 1.6rem; font-weight: 800; color: var(--text); line-height: 1.2">${usdcFormatted} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-sec)">USDC</span></div>
            <div class="asset-fiat" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px">~$${usdcFormatted}</div>
          </div>
        </div>
        <div class="asset-card">
          <div class="asset-info" style="display:flex; align-items:center; gap:12px; width:100%">
            <div class="asset-icon arc" style="display:flex;align-items:center;justify-content:center;background:rgba(34, 197, 94, 0.15);color:var(--green);width:36px;height:36px;border-radius:50%;border:1px solid var(--green-border)">
              ${svg('activity', 18)}
            </div>
            <div>
              <div class="asset-name" style="font-weight: 700; font-size: 0.95rem; color: var(--text)">USDC (Native Gas)</div>
              <div class="asset-symbol" style="font-size: 0.72rem; color: var(--text-muted)">Arc Gas Fee</div>
            </div>
          </div>
          <div class="asset-balance" style="text-align: left; margin-top: 4px">
            <div class="asset-val" style="font-size: 1.6rem; font-weight: 800; color: var(--text); line-height: 1.2">${nativeFormatted} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-sec)">USDC</span></div>
            <div class="asset-fiat" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px">~$${nativeFormatted}</div>
          </div>
        </div>
        <div class="asset-card">
          <div class="asset-info" style="display:flex; align-items:center; gap:12px; width:100%">
            <div class="asset-icon" style="display:flex;align-items:center;justify-content:center;background:rgba(167, 139, 250, 0.15);color:#a78bfa;width:36px;height:36px;border-radius:50%;border:1px solid rgba(167, 139, 250, 0.3)">
              ${svg('zap', 18)}
            </div>
            <div>
              <div class="asset-name" style="font-weight: 700; font-size: 0.95rem; color: var(--text)">PARCIS (Reputation)</div>
              <div class="asset-symbol" style="font-size: 0.72rem; color: var(--text-muted)">Trust Multiplier</div>
            </div>
          </div>
          <div class="asset-balance" style="text-align: left; margin-top: 4px">
            <div class="asset-val" style="font-size: 1.6rem; font-weight: 800; color: var(--text); line-height: 1.2">${trustScore} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-sec)">PTS</span></div>
            <div class="asset-fiat" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px">${trustScore >= 80 ? 'High Trust User' : trustScore >= 50 ? 'Moderate Trust' : 'New Account'}</div>
          </div>
        </div>
      </div>
    </div>

    ${(arbiterInfo && (arbiterInfo.isPlatformArbiter || arbiterInfo.disputesResolved > 0)) || slashHistory.length > 0 ? `
    <div class="profile-section">
      <h2 style="display:flex;align-items:center;gap:8px;">${svg('shield', 18)} Arbiter Operations & Governance</h2>
      <p class="section-hint">Historical record of resolved disputes, staked collateral, compliance indicators, and disciplinary actions.</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:12px;margin-bottom:20px;">
        <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Disputes Resolved</div>
          <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:6px;">${arbiterInfo ? arbiterInfo.disputesResolved : 0}</div>
        </div>
        <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Staked Collateral</div>
          <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:6px;">${arbiterInfo ? arbiterInfo.stake : 0} <span style="font-size:0.75rem;color:var(--text-sec)">USDC</span></div>
        </div>
        <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Weighted Score</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--primary);margin-top:6px;">${arbiterInfo ? arbiterInfo.weightedScore.toLocaleString() : 0}</div>
        </div>
        <div style="padding:14px;background:var(--surface);border:1px solid ${slashHistory.length > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border)'};border-radius:12px;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Slashing Events</div>
          <div style="font-size:1.4rem;font-weight:800;color:${slashHistory.length > 0 ? 'var(--danger)' : '#fff'};margin-top:6px;">${slashHistory.length}</div>
        </div>
      </div>

      <div style="margin-top:8px;">
        <h3 style="font-size:0.85rem;font-weight:800;color:#fff;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Disciplinary & Slashing History</h3>
        ${slashHistory.length === 0
        ? `<div style="padding:16px;background:rgba(34,197,94,0.03);border:1px solid rgba(34,197,94,0.12);border-radius:12px;font-size:0.85rem;color:var(--text-sec);display:flex;align-items:center;gap:8px;">
              <span style="color:#22c55e;display:flex;">${svg('checkCircle', 16)}</span>
              <span>Perfect governance record. No disciplinary actions or slashings recorded.</span>
            </div>`
        : `<div style="display:flex;flex-direction:column;gap:10px;">
              ${slashHistory.map(sh => `
                <div style="padding:14px 16px;background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.15);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="flex:1;min-width:180px;">
                    <div style="font-weight:700;color:#fff;font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                      <span style="color:var(--danger);display:flex;">${svg('alertTriangle', 14)}</span>
                      Arbiter Slashed
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-sec);margin-top:4px;">Reason: <strong style="color:var(--text);font-weight:500;">${esc(sh.reason || 'No reason provided')}</strong></div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:800;color:var(--danger);font-size:1.05rem;">-${fmt(sh.amount)} USDC</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">${fmtDate(sh.timestamp)}</div>
                  </div>
                </div>
              `).join('')}
            </div>`
      }
      </div>
    </div>` : ''}

    ${portfolioItems ? `
    <div class="profile-section">
      <h2>${svg('briefcase', 18)} Completed Work <span class="section-count">${completedAsWorker.length}</span></h2>
      <p class="section-hint">Every item below is a verified, on-chain escrow deal with proof of delivery.</p>
      <div class="portfolio-list">${portfolioItems}</div>
    </div>` : ''}

    ${activeDeals ? `
    <div class="profile-section">
      <h2>${svg('clock', 18)} Active Deals <span class="section-count">${deals.filter(d => d.status < 3).length}</span></h2>
      <div class="portfolio-list">${activeDeals}</div>
    </div>` : ''}

    ${linkItems ? `
    <div class="profile-section">
      <h2>${svg('link2', 18)} Payment Links <span class="section-count">${links.length}</span></h2>
      <div class="portfolio-list">${linkItems}</div>
    </div>` : ''}

    ${totalDeals === 0 && links.length === 0 ? `
    <div class="empty-state" style="margin-top:40px">
      <div class="empty-state-icon">${svg('user', 48)}</div>
      <h3>No on-chain activity yet</h3>
      <p>This address has no deals or payment links recorded on the blockchain.</p>
    </div>` : ''}

    <div class="profile-footer">
      <span>${svg('shield', 13)} All data is read directly from the blockchain. Nothing can be faked.</span>
      <a href="${(CONFIG.explorerUrl || 'https://explorer.arc.io')}/address/${address}" target="_blank" class="btn btn-secondary btn-sm">Verify on ArcScan →</a>
    </div>

  </div>
</div>`
}

// ─── DEVELOPERS ───
export function renderDevelopers() {
  const base = window.location.origin
  return `
<div class="page container">
  <div class="dev-hero">
    <div class="dev-badge">${svg('zap', 14)} Open Commerce Infrastructure</div>
    <h1>Parcis SDK & API Suite</h1>
    <p class="dev-sub">Embed seamless in-page crypto payments, per-second streaming subscriptions, and on-chain trust scores into any application with zero backend friction.</p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
      <a href="#/console" class="btn btn-primary btn-lg" style="box-shadow:0 4px 20px rgba(34,197,94,0.3);">${svg('terminal', 16)} Launch Developer Console →</a>
      <a href="#/docs" class="btn btn-secondary btn-lg">${svg('book', 16)} Full API &amp; SDK Docs</a>
      <a href="#/console?tab=keys" class="btn btn-secondary btn-lg">${svg('key', 16)} Generate API Key</a>
    </div>
  </div>

  <!-- Quick-Start 3-Step Wizard -->
  <div class="dev-section" style="margin-bottom:30px;">
    <div class="dev-section-header">
      <span class="dev-section-icon">${svg('compass', 20)}</span>
      <div>
        <h2>Quick-Start Integration Guide</h2>
        <p>Go from zero to live crypto checkout or Web3 escrow in under 3 minutes.</p>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
      <!-- Step 1 -->
      <div class="detail-card" style="margin:0; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span style="background:var(--accent); color:#fff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">STEP 1</span>
            <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Install or Embed SDK</h3>
          </div>
          <p style="font-size:0.8rem; color:var(--text-sec); line-height:1.4; margin-bottom:12px;">
            Load the lightweight client script in your frontend, or import the typed Viem client in your Node/TS project.
          </p>
        </div>
        <div class="dev-code-card" style="margin:0;">
          <pre class="dev-code" style="padding:10px; font-size:0.75rem;"><code>&lt;script src="${base}/sdk.js"&gt;&lt;/script&gt;</code></pre>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="detail-card" style="margin:0; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span style="background:var(--green); color:#000; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">STEP 2</span>
            <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Drop Button or Call Web3</h3>
          </div>
          <p style="font-size:0.8rem; color:var(--text-sec); line-height:1.4; margin-bottom:12px;">
            Place a <code>&lt;parcis-pay&gt;</code> web component directly in HTML, or call <code>client.payLink()</code> with USDC.
          </p>
        </div>
        <div class="dev-code-card" style="margin:0;">
          <pre class="dev-code" style="padding:10px; font-size:0.75rem;"><code>&lt;parcis-pay address="sample" amount="25"&gt;&lt;/parcis-pay&gt;</code></pre>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="detail-card" style="margin:0; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <span style="background:var(--blue); color:#fff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">STEP 3</span>
            <h3 style="font-size:0.95rem; font-weight:700; margin:0;">Listen to On-Chain Events</h3>
          </div>
          <p style="font-size:0.8rem; color:var(--text-sec); line-height:1.4; margin-bottom:12px;">
            Receive instantaneous payment confirmation via window <code>postMessage</code> or <code>client.on('tx:confirmed')</code>.
          </p>
        </div>
        <div class="dev-code-card" style="margin:0;">
          <pre class="dev-code" style="padding:10px; font-size:0.75rem;"><code>window.addEventListener('message', (e) =&gt; { ... })</code></pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Interactive Widget Configurator -->
  <div class="dev-section">
    <div class="dev-section-header">
      <span class="dev-section-icon">${svg('sliders', 20)}</span>
      <div>
        <h2>Interactive Widget Builder</h2>
        <p>Customize your embeddable button and watch the code update in real time.</p>
      </div>
    </div>

    <div class="dev-builder-grid">
      <!-- Configurator Controls -->
      <div class="dev-config-card">
        <h3 style="font-size:1rem; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
          ${svg('settings', 16)} Widget Settings
        </h3>

        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="font-size:0.8rem;">Widget Type</label>
          <select id="cfg-type" class="form-input stylish-select" onchange="window.updateDevSnippet()">
            <option value="pay">Payment Button (&lt;parcis-pay&gt;)</option>
            <option value="stream">Streaming Subscription (&lt;parcis-stream&gt;)</option>
            <option value="profile">Identity Profile Card (&lt;parcis-profile&gt;)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label class="form-label" style="font-size:0.8rem;">Recipient Address / Parcis Link</label>
            <span id="cfg-addr-resolution" style="font-size:0.75rem; color:var(--text-sec); font-family:'SF Mono',monospace;"></span>
          </div>
          <input type="text" id="cfg-address" class="form-input" value="" placeholder="0x... or https://parcis.app/#/pay/sample" oninput="window.updateDevSnippet()">
        </div>

        <div class="form-row" style="display:flex; gap:10px; margin-bottom:12px;" id="cfg-amount-row">
          <div style="flex:1;">
            <label class="form-label" style="font-size:0.8rem;">Amount (USDC)</label>
            <input type="number" id="cfg-amount" class="form-input" value="25.00" step="0.5" oninput="window.updateDevSnippet()">
          </div>
          <div style="flex:1; display:none;" id="cfg-duration-wrap">
            <label class="form-label" style="font-size:0.8rem;">Duration (Days)</label>
            <input type="number" id="cfg-duration" class="form-input" value="30" oninput="window.updateDevSnippet()">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px;" id="cfg-label-wrap">
          <label class="form-label" style="font-size:0.8rem;">Button Label</label>
          <input type="text" id="cfg-label" class="form-input" value="Pay for Services" oninput="window.updateDevSnippet()">
        </div>

        <div class="form-row" style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label class="form-label" style="font-size:0.8rem;">Display Mode</label>
            <select id="cfg-display" class="form-input stylish-select" onchange="window.updateDevSnippet()">
              <option value="modal">In-Page Modal (Recommended)</option>
              <option value="popup">Popup Window</option>
              <option value="redirect">Direct Redirect</option>
            </select>
          </div>
          <div style="flex:1;">
            <label class="form-label" style="font-size:0.8rem;">Theme</label>
            <select id="cfg-theme" class="form-input stylish-select" onchange="window.updateDevSnippet()">
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Live Interactive Preview -->
      <div class="dev-preview-card">
        <div class="dev-preview-label">${svg('eye', 14)} Live Interactive Preview</div>
        <div class="dev-preview-area" id="sdk-live-preview" style="min-height: 180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;">
          <div class="dev-preview-loading">${svg('zap', 20)} Initializing SDK preview...</div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-sec); text-align:center;">
          Clicking the preview above triggers the live checkout flow.
        </div>
      </div>
    </div>

    <!-- Multi-Language Code Snippet Generator -->
    <div style="margin-top:20px;">
      <div class="dev-tabs-bar" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
        <button class="btn btn-sm btn-primary dev-tab-btn" id="dtab-html" onclick="window.switchDevTab('html')">HTML & Web Component</button>
        <button class="btn btn-sm btn-ghost dev-tab-btn" id="dtab-react" onclick="window.switchDevTab('react')">React / Next.js</button>
        <button class="btn btn-sm btn-ghost dev-tab-btn" id="dtab-sdk" onclick="window.switchDevTab('sdk')">ParcisClient (Web3 SDK)</button>
        <button class="btn btn-sm btn-ghost dev-tab-btn" id="dtab-node" onclick="window.switchDevTab('node')">Node.js (REST)</button>
        <button class="btn btn-sm btn-ghost dev-tab-btn" id="dtab-python" onclick="window.switchDevTab('python')">Python</button>
        <button class="btn btn-sm btn-ghost dev-tab-btn" id="dtab-curl" onclick="window.switchDevTab('curl')">cURL</button>
      </div>

      <div class="dev-code-card">
        <div class="dev-code-header">
          <span class="dev-code-dot red"></span>
          <span class="dev-code-dot yellow"></span>
          <span class="dev-code-dot green"></span>
          <span class="dev-code-title" id="dev-snippet-title">index.html</span>
        </div>
        <pre class="dev-code"><code id="dev-code-output"></code></pre>
        <button class="btn btn-secondary btn-sm dev-copy-btn" id="dev-copy-action-btn" onclick="window.copyActiveDevSnippet(this)">${svg('copy', 13)} Copy Code</button>
      </div>
    </div>
  </div>

  <!-- Event Bus & postMessage Reference -->
  <div class="dev-section">
    <div class="dev-section-header">
      <span class="dev-section-icon">${svg('activity', 20)}</span>
      <div>
        <h2>Bi-Directional Event Bus (postMessage)</h2>
        <p>Listen for real-time transaction lifecycle events on your host website.</p>
      </div>
    </div>

    <div class="dev-code-card">
      <div class="dev-code-header">
        <span class="dev-code-dot red"></span>
        <span class="dev-code-dot yellow"></span>
        <span class="dev-code-dot green"></span>
        <span class="dev-code-title">events.js</span>
      </div>
      <pre class="dev-code"><code><span class="c-comment">// Listen for Parcis checkout events</span>
window.addEventListener(<span class="c-str">'message'</span>, (event) => {
  <span class="c-kw">const</span> { type, txHash, amount, payer, linkId } = event.data || {}

  <span class="c-kw">if</span> (type === <span class="c-str">'PARCIS_PAYMENT_SUCCESS'</span>) {
    console.log(<span class="c-str">'✅ Payment confirmed on Arc:'</span>, txHash)
    <span class="c-comment">// Fulfill order, unlock access, or grant SaaS credits</span>
  } <span class="c-kw">else if</span> (type === <span class="c-str">'PARCIS_PAYMENT_ERROR'</span>) {
    console.error(<span class="c-str">'❌ Payment failed:'</span>, event.data.error)
  } <span class="c-kw">else if</span> (type === <span class="c-str">'PARCIS_MODAL_CLOSE'</span>) {
    console.log(<span class="c-str">'Modal dismissed'</span>)
  }
})</code></pre>
    </div>
  </div>

  <!-- Interactive REST API Explorer -->
  <div class="dev-section">
    <div class="dev-section-header">
      <span class="dev-section-icon">${svg('cpu', 20)}</span>
      <div>
        <h2>Interactive REST API Explorer</h2>
        <p>Test all open Parcis REST APIs live against the Arc blockchain with zero setup.</p>
      </div>
    </div>

    <!-- Quick Presets Bar -->
    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:14px;">
      <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-right:4px;">Presets:</span>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('score')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Trust Score</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('link-slug')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Link by Slug</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('links-user')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Links by Wallet</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('deal')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Escrow Deal</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('deals-user')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Deals by Wallet</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('stream')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Streaming Stats</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('arbiters')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Arbiters</button>
      <button class="btn btn-ghost btn-xs" onclick="window.applyApiPreset('health')" style="font-size:0.75rem; padding:3px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">Health</button>
    </div>

    <div class="dev-api-explorer">
      <div class="api-explorer-controls">
        <div class="endpoint-select-wrap">
          <select id="api-exp-endpoint" class="form-input stylish-select api-exp-select" onchange="window.handleApiEndpointChange()">
            <option value="score">GET /api/score</option>
            <option value="link">GET /api/link</option>
            <option value="deal">GET /api/deal</option>
            <option value="stream">GET /api/stream</option>
            <option value="arbiters">GET /api/arbiters</option>
            <option value="health">GET /api/health</option>
          </select>
        </div>
        <div class="endpoint-param-wrap">
          <input type="text" id="api-exp-param" class="form-input" placeholder="address=0xDe4600000000000000000000000000000000aDe7" value="address=0xDe4600000000000000000000000000000000aDe7">
        </div>
        <button class="btn btn-primary" id="api-exp-send-btn" onclick="window.executeApiExplorerQuery()" style="display:flex; align-items:center; gap:6px;">
          ${svg('send', 14)} Send Request
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:0.8rem; color:var(--text-sec);">
        <span id="api-exp-url-preview" class="mono">${base}/api/score?address=0x...</span>
        <span id="api-exp-meta" class="mono">Ready</span>
      </div>

      <!-- Visual Error & Health Diagnostic Banner -->
      <div id="api-exp-diagnostic-banner" style="display:none; margin-bottom:10px; padding:10px 14px; border-radius:8px; font-size:0.82rem; line-height:1.4;"></div>

      <div class="dev-code-card" style="margin:0;">
        <div class="dev-code-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="dev-code-dot red"></span>
            <span class="dev-code-dot yellow"></span>
            <span class="dev-code-dot green"></span>
            <span class="dev-code-title">JSON Response</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost btn-xs" onclick="window.copyApiCurlCommand(this)" title="Copy cURL Command" style="padding:2px 8px; font-size:0.75rem; border:1px solid rgba(255,255,255,0.1); border-radius:6px;">
              ${svg('terminal', 12)} Copy cURL
            </button>
            <button class="btn btn-ghost btn-xs" onclick="window.copyApiResponseJson(this)" title="Copy JSON Response" style="padding:2px 8px; font-size:0.75rem; border:1px solid rgba(255,255,255,0.1); border-radius:6px;">
              ${svg('copy', 12)} Copy JSON
            </button>
          </div>
        </div>
        <pre class="dev-code" style="max-height:280px; overflow-y:auto;"><code id="api-exp-response">Click "Send Request" to test this endpoint.</code></pre>
      </div>

      <!-- Request History Log -->
      <div class="api-exp-history-wrap" style="margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.8rem; font-weight:600; color:var(--text-sec); display:flex; align-items:center; gap:6px;">
            ${svg('clock', 13)} Recent Request History
          </span>
          <button class="btn btn-ghost btn-xs" onclick="window.clearApiHistory()" style="font-size:0.7rem; color:var(--text-muted); padding:2px 6px;">Clear History</button>
        </div>
        <div id="api-exp-history-list" style="display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No recent requests in this session.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Component Attributes Reference -->
  <div class="dev-section">
    <div class="dev-section-header">
      <span class="dev-section-icon">${svg('info', 20)}</span>
      <div>
        <h2>Web Component Attributes Reference</h2>
        <p>Complete documentation for all Parcis web components.</p>
      </div>
    </div>
    <div class="dev-table-wrap">
      <table class="dev-table">
        <thead>
          <tr><th>Component</th><th>Attribute</th><th>Type</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>&lt;parcis-pay&gt;</code></td><td><code>address</code></td><td>string</td><td>—</td><td>Recipient wallet address (0x) or Parcis slug</td></tr>
          <tr><td></td><td><code>amount</code></td><td>number</td><td>—</td><td>USDC amount (leave blank for open tip)</td></tr>
          <tr><td></td><td><code>label</code></td><td>string</td><td>"Pay with Parcis"</td><td>Custom button label text</td></tr>
          <tr><td></td><td><code>display</code></td><td>string</td><td>"modal"</td><td><code>modal</code> (in-page iframe), <code>popup</code>, or <code>redirect</code></td></tr>
          <tr><td></td><td><code>theme</code></td><td>string</td><td>"dark"</td><td><code>dark</code> or <code>light</code></td></tr>
          <tr><td></td><td><code>size</code></td><td>string</td><td>"md"</td><td><code>sm</code>, <code>md</code>, or <code>lg</code></td></tr>
          <tr class="dev-table-divider"><td><code>&lt;parcis-stream&gt;</code></td><td><code>address</code></td><td>string</td><td>—</td><td>Recipient wallet address or slug</td></tr>
          <tr><td></td><td><code>amount</code></td><td>number</td><td>—</td><td>Total subscription deposit amount</td></tr>
          <tr><td></td><td><code>duration</code></td><td>number</td><td>30</td><td>Stream duration in days</td></tr>
          <tr><td></td><td><code>display</code></td><td>string</td><td>"modal"</td><td><code>modal</code>, <code>popup</code>, or <code>redirect</code></td></tr>
          <tr class="dev-table-divider"><td><code>&lt;parcis-profile&gt;</code></td><td><code>address</code></td><td>string</td><td>—</td><td>Target wallet address to display</td></tr>
          <tr><td></td><td><code>theme</code></td><td>string</td><td>"dark"</td><td><code>dark</code> or <code>light</code></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- CTA -->
  <div class="dev-cta">
    <h2>Start Building on Arc Network</h2>
    <p>Zero friction. Zero API keys. Instant on-chain commerce settlement.</p>
    <div class="hero-actions" style="justify-content:center">
      <a href="#/docs" class="btn btn-primary btn-lg">${svg('book', 16)} Explore API Documentation</a>
      <a href="#/send" class="btn btn-secondary btn-lg">${svg('zap', 16)} Create Payment Link</a>
      <a href="https://github.com/DevDanAlmag/payarc" target="_blank" class="btn btn-ghost btn-lg">${svg('externalLink', 16)} View Protocol on GitHub</a>
    </div>
  </div>
</div>`
}

// ─── LINK DASHBOARD ───
export async function renderLinkDashboard(slug) {
  const link = await getLink(slug);
  if (!link) return `<div class="page"><div class="container detail-container"><div class="empty-state" style="margin-top:80px"><div class="empty-state-icon">${svg('xCircle', 40)}</div><h3>Link Not Found</h3><a href="#/dashboard" class="btn btn-secondary">Dashboard</a></div></div></div>`;

  const payments = getLinkPayments(slug);
  const payCount = Math.max(link.paymentCount || 0, payments.length);
  const totalRaised = link.totalRaised || linkTotalReceived(link);
  const avgPayment = payCount > 0 ? (totalRaised / payCount) : 0;
  const qr = await generateQR(payUrl(slug));
  const shareUrl = payUrl(slug);

  // Group Link Goal Progress Widget
  let goalProgressHtml = '';
  if (link.type === 'group' && link.groupTarget) {
    const pct = Math.min(100, Math.round((payCount / link.groupTarget) * 100));
    goalProgressHtml = `
      <div class="detail-card" style="margin-bottom: 24px; background: linear-gradient(135deg, var(--card), rgba(34, 197, 94, 0.03)); border-color: rgba(34, 197, 94, 0.15)">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--green); display:flex; align-items:center; gap: 8px">
            ${svg('award', 16)} Group Goal Progress
          </h4>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-sec)">${pct}% Completed</span>
        </div>
        <div class="group-progress" style="margin: 0">
          <div class="group-meta">
            <span style="color: var(--text)">${payCount} of ${link.groupTarget} payers</span>
            <span style="font-weight:700; color: var(--green); font-size: 0.85rem">${fmt(totalRaised)} / ${fmt(link.amount * link.groupTarget)} USDC</span>
          </div>
          <div class="group-bar" style="height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px">
            <div class="group-bar-fill" style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--green), #059669); border-radius: 5px"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Payment History list
  const paymentsHtml = payments.length === 0 ?
    `<div class="empty-state" style="padding: 30px 0">
      <div class="empty-state-icon" style="margin-bottom: 8px">${svg('info', 24)}</div>
      <p style="font-size: 0.85rem; color: var(--text-muted)">No payments have been received yet.</p>
     </div>` :
    `<div class="dev-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Sender Address</th>
            <th>Amount Paid</th>
            <th>Transaction Hash</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map(p => {
      const fromLabel = typeof p === 'object' && p.payer ? p.payer : 'Anonymous';
      const amt = typeof p === 'object' && p.amount ? fmt(p.amount) : 'Unknown';
      const hash = typeof p === 'object' && p.txHash ? p.txHash : '';
      const time = typeof p === 'object' && p.timestamp ? new Date(p.timestamp).toLocaleString() : 'N/A';
      const initials = fromLabel.slice(2, 4).toUpperCase();
      return `<tr>
              <td>
                <div class="history-row">
                  <div class="history-avatar" style="background: linear-gradient(135deg, #${fromLabel.slice(2, 8)}, #${fromLabel.slice(-6)}); text-transform: uppercase;">
                    ${initials}
                  </div>
                  <a href="#/profile/${fromLabel}" style="color: var(--text); font-weight: 600; text-decoration:none">${shortAddr(fromLabel)}</a>
                </div>
              </td>
              <td style="font-weight: 800; color: var(--green); font-size: 0.95rem">${amt} USDC</td>
              <td class="mono">
                ${hash ? `<a href="https://testnet.arcscan.app/tx/${hash}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:4px; padding: 4px 8px; font-size: 0.72rem">
                  ${hash.slice(0, 8)}... ${svg('externalLink', 10)}
                </a>` : '<span style="color: var(--text-muted)">N/A</span>'}
              </td>
              <td style="color: var(--text-sec); font-size: 0.8rem">${time}</td>
            </tr>`;
    }).join('')}
        </tbody>
      </table>
     </div>`;

  return `
<div class="page">
  <div class="container" style="max-width: 1140px">
    <button class="detail-back" onclick="location.hash='#/dashboard'">${svg('arrowLeft', 15)} Back to Dashboard</button>
    
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px">
      <div>
        <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 4px">
          <span class="type-tag type-tag-${link.type}" style="font-size: 0.65rem; padding: 3px 8px; border-radius: 4px">${link.type}</span>
          <span style="font-size: 0.8rem; color: var(--text-sec); font-family: monospace">ID: ${slug}</span>
        </div>
        <h1 class="detail-title" style="font-size: 1.8rem; font-weight: 800; color: var(--text); margin: 0">${esc(link.label)}</h1>
      </div>
      <a href="#/pay/${slug}" class="btn btn-primary">${svg('externalLink', 14)} Open Payer Page</a>
    </div>

    <!-- KPIs Metric Section -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-icon-wrap">${svg('dollarSign', 20)}</div>
        <div class="kpi-data">
          <span class="kpi-value" style="color: var(--green)">${fmt(totalRaised)} USDC</span>
          <span class="kpi-label">Total Received</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-wrap" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.2); color: #a78bfa">${svg('users', 20)}</div>
        <div class="kpi-data">
          <span class="kpi-value">${payCount}</span>
          <span class="kpi-label">Payments Count</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: var(--warning)">${svg('activity', 20)}</div>
        <div class="kpi-data">
          <span class="kpi-value">${fmt(avgPayment)} USDC</span>
          <span class="kpi-label">Average Value</span>
        </div>
      </div>
    </div>

    <div class="premium-layout-grid">
      <!-- Main Content Panel -->
      <div style="display:flex; flex-direction:column">
        ${goalProgressHtml}

        <div class="detail-card" style="padding: 24px">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; display:flex; align-items:center; gap: 8px">
            ${svg('list', 16)} Transaction History
          </h3>
          ${paymentsHtml}
        </div>
      </div>

      <!-- Side Share & Control Panel -->
      <div style="display:flex; flex-direction:column; gap: 24px">
        <div class="detail-card" style="text-align: center; padding: 24px">
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 6px">${svg('share2', 15)} Share & Collect</h3>
          <p style="color: var(--text-sec); font-size: 0.8rem; margin-bottom: 16px">Copy this link or share the QR code to receive payments</p>
          
          <div class="share-input-wrap">
            <input type="text" value="${shareUrl}" id="share-link-input" readonly>
            <button class="btn btn-secondary btn-sm" onclick="window.copyLinkUrl('${slug}', this)" style="padding: 6px 10px">${svg('copy', 12)}</button>
          </div>

          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display:inline-block; margin-bottom: 12px">
            <img src="${qr}" alt="Payment QR Code" style="width: 180px; height: 180px; border-radius: 8px; display:block">
          </div>
          
          <div style="display:flex; gap: 8px; justify-content:center">
            <a href="${qr}" download="parcis-qr-${slug}.png" class="btn btn-secondary btn-sm" style="width:100%">
              ${svg('download', 12)} Download QR
            </a>
          </div>
        </div>

        <div class="detail-card" style="padding: 20px">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 14px">${svg('info', 14)} Link Configuration</h3>
          <div style="display:flex; flex-direction:column; gap: 12px; font-size: 0.85rem">
            <div style="display:flex; justify-content:space-between">
              <span style="color: var(--text-sec)">Creator</span>
              <span class="mono" style="font-weight: 600"><a href="#/profile/${link.creator}" style="color:var(--green)">${shortAddr(link.creator)}</a></span>
            </div>
            <div style="display:flex; justify-content:space-between">
              <span style="color: var(--text-sec)">Link Type</span>
              <span style="font-weight: 600; text-transform: capitalize">${link.type}</span>
            </div>
            <div style="display:flex; justify-content:space-between">
              <span style="color: var(--text-sec)">Base Amount</span>
              <span style="font-weight: 600; color: var(--green)">${link.amount ? `${fmt(link.amount)} USDC` : 'Flexible (Open)'}</span>
            </div>
            ${link.description ? `
              <div style="border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px">
                <span style="color: var(--text-sec); display:block; margin-bottom: 4px">Description</span>
                <span style="color: var(--text); font-size: 0.8rem; line-height: 1.4">${esc(link.description)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
  `;
}

export function renderNotFound() {
  return `
<div class="page">
  <div class="container" style="max-width:600px; text-align:center; padding-top:100px; padding-bottom:80px;">
    <div class="empty-state">
      <div class="empty-state-icon" style="margin:0 auto 16px; color:var(--text-sec);">
        ${svg('xCircle', 52)}
      </div>
      <h2 style="font-size:1.75rem; font-weight:800; margin-bottom:8px; color:var(--text);">404 - Page Not Found</h2>
      <p style="color:var(--text-sec); font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <a href="#/" class="btn btn-primary">${svg('arrowLeft', 14)} Back to Home</a>
      </div>
    </div>
  </div>
</div>
  `;
}

export function renderAdminAccessDenied() {
  return renderNotFound()
}

export async function renderAdmin() {
  const account = isConnected() ? getAccount() : null
  let ownerAddress = null
  try { ownerAddress = await getContractOwner() } catch (e) { }
  const isOwner = account && ownerAddress && account.toLowerCase() === ownerAddress.toLowerCase()

  const currentTab = window.currentAdminTab || 'overview'

  // Fetch 100% real on-chain analytics directly from BOTH smart contracts
  const m = await getOnChainAnalytics()

  let minStake = CONFIG.minArbiterStake
  let appealWindow = 172800
  let arbiters = []
  let deals = []
  let appealedDeals = []
  let pausedStatus = { safe: false, links: false, streams: false }
  let pendingOwner = null
  let allOwnership = { contracts: [], byKey: {}, ownedCount: 0, pendingClaimCount: 0, hasPendingClaims: false }
  let devConfig = { address: null, treasury: '', relayer: '', streams: '', totalDevs: 0 }
  let linksConfig = { address: null, admin: '', premiumSlugFee: 0.5, platformWallet: '' }

  try {
    const { getPublicClient, DEPLOYED_ADDRESS, ARCSAFE_ABI } = await import('./contract.js')
    if (DEPLOYED_ADDRESS) {
      try {
        const pc = getPublicClient()
        const { formatUnits } = await import('viem')
        const [stakeBig, windowBig] = await Promise.all([
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'minArbiterStake' }),
          pc.readContract({ address: DEPLOYED_ADDRESS, abi: ARCSAFE_ABI, functionName: 'appealWindowDuration' })
        ])
        minStake = parseFloat(formatUnits(stakeBig, 6))
        appealWindow = Number(windowBig)
      } catch (e) {
        console.warn("Failed to read admin values from chain:", e)
      }
    }
    [arbiters, deals] = await Promise.all([
      getPlatformArbiters(),
      getAllDeals()
    ])
    appealedDeals = deals.filter(d => d.status === 7)

    if (currentTab === 'governance') {
      try {
        const {
          getContractPausedStatus,
          getPendingOwner,
          getAllContractsOwnership,
          getDevRegistryConfig,
          getLinksConfig
        } = await import('./contract.js')
        const [ps, po, dc, lc, ao] = await Promise.all([
          getContractPausedStatus().catch(() => ({ safe: false, links: false, streams: false })),
          getPendingOwner().catch(() => null),
          getDevRegistryConfig().catch(() => ({ address: null, treasury: '', relayer: '', streams: '', totalDevs: 0 })),
          getLinksConfig().catch(() => ({ address: null, admin: '', premiumSlugFee: 0.5, platformWallet: '' })),
          getAllContractsOwnership().catch(() => ({ contracts: [], byKey: {}, ownedCount: 0, pendingClaimCount: 0, hasPendingClaims: false }))
        ])
        pausedStatus = ps
        pendingOwner = po
        devConfig = dc
        linksConfig = lc
        allOwnership = ao
      } catch (err) {
        console.warn("Failed to load governance admin data:", err)
      }
    }
  } catch (e) {
    console.warn("Contract data fetch fallback:", e)
  }

  const hourLabel = Math.floor(appealWindow / 3600)

  // Sub-navigation bar HTML
  const navTabsHtml = `
    <div class="admin-tab-nav">
      <button class="admin-tab-btn ${currentTab === 'overview' ? 'active' : ''}" onclick="window.switchAdminTab('overview')">
        ${svg('barChart', 15)} Protocol Overview
      </button>
      <button class="admin-tab-btn ${currentTab === 'links' ? 'active' : ''}" onclick="window.switchAdminTab('links')">
        ${svg('link', 15)} Links & Streams ($${(m.linkVolume + m.streamVolume).toLocaleString()})
      </button>
      <button class="admin-tab-btn ${currentTab === 'escrow' ? 'active' : ''}" onclick="window.switchAdminTab('escrow')">
        ${svg('shield', 15)} Escrow & Arbiters ($${m.escrowVolume.toLocaleString()})
      </button>
      <button class="admin-tab-btn ${currentTab === 'activity' ? 'active' : ''}" onclick="window.switchAdminTab('activity')">
        ${svg('activity', 15)} Activity Feed (${m.activityFeed.length})
      </button>
      <button class="admin-tab-btn ${currentTab === 'governance' ? 'active' : ''}" onclick="window.switchAdminTab('governance')">
        ${svg('settings', 15)} Governance ${isOwner ? '<span class="badge badge-purple" style="font-size:0.65rem;margin-left:4px">Owner</span>' : ''}
      </button>
    </div>
  `

  let tabContentHtml = ''

  if (currentTab === 'overview') {
    // ── 1. PROTOCOL OVERVIEW & ON-CHAIN KPIS ──
    tabContentHtml = `
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <div class="kpi-header"><span>Total Protocol Volume</span><span class="badge badge-green">On-Chain</span></div>
          <div class="kpi-value" style="color:var(--green)">$${m.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-sub"><span>Escrow + Links + Streams + Stakes</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span>Platform Fees Earned (0.25%)</span><span class="badge badge-purple">Revenue</span></div>
          <div class="kpi-value" style="color:#3b82f6">$${m.totalPlatformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-sub"><span>Net Accrued Platform Revenue</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span>Arbiter Fee Earnings (0.5%)</span><span class="badge badge-purple">Arbiter Pool</span></div>
          <div class="kpi-value" style="color:var(--green)">$${m.arbiterFeeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-sub"><span>Dispute Resolution Earnings</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span>Total Transactions</span><span class="badge badge-blue">All Contracts</span></div>
          <div class="kpi-value" style="color:#fff">${m.totalTxCount}</div>
          <div class="kpi-sub"><span>Escrow: ${m.escrowTxCount} • Links: ${m.linksTxCount} • Streams: ${m.streamsTxCount}</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span>Unique Interacting Wallets</span><span class="badge badge-purple">On-Chain Users</span></div>
          <div class="kpi-value">${m.uniqueWalletsCount}</div>
          <div class="kpi-sub"><span>Clients, Freelancers & Arbiters</span></div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        
        <!-- Multi-Contract Smart Contract Summary -->
        <div class="detail-card" style="margin:0; padding:20px;">
          <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            ${svg('shield', 16)} Smart Contracts Deployment Info
          </h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-sec);">ArcSafe Escrow Contract:</div>
              <div style="font-size:0.85rem; font-weight:700; color:var(--green);" class="mono">${shortAddr(m.escrowContract)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-sec);">ParcisLinks Payment Contract:</div>
              <div style="font-size:0.85rem; font-weight:700; color:var(--purple);" class="mono">${shortAddr(m.linksContract)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-sec);">ParcisStreams Contract:</div>
              <div style="font-size:0.85rem; font-weight:700; color:#3b82f6;" class="mono">${shortAddr(m.streamsContract)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-sec);">Platform Admin / Fee Wallet:</div>
              <div style="font-size:0.85rem; font-weight:700; color:#fff;" class="mono">${m.ownerAddress ? shortAddr(m.ownerAddress) : 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Volume Category Breakdown -->
        <div class="detail-card" style="margin:0; padding:20px;">
          <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            ${svg('creditCard', 16)} Volume & Revenue Breakdown
          </h3>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div>
                <div style="font-size:0.88rem; font-weight:700; color:#fff">🛡️ Escrow Contracts</div>
                <div style="font-size:0.75rem; color:var(--text-sec)">${m.totalDeals} deals • ${m.escrowTxCount} txs</div>
              </div>
              <div style="font-weight:800; color:var(--green); font-size:1.05rem;">$${m.escrowVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div>
                <div style="font-size:0.88rem; font-weight:700; color:#fff">🔗 Payment Links</div>
                <div style="font-size:0.75rem; color:var(--text-sec)">${m.totalLinksCount} links • ${m.linksTxCount} payments • ${m.linkPayerCount} unique payers</div>
              </div>
              <div style="font-weight:800; color:var(--purple); font-size:1.05rem;">$${m.linkVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div>
                <div style="font-size:0.88rem; font-weight:700; color:#fff">⚡ Streaming Subscriptions</div>
                <div style="font-size:0.75rem; color:var(--text-sec)">${m.totalStreams} streams (${m.activeStreams} active) • $${m.streamWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })} withdrawn</div>
              </div>
              <div style="font-weight:800; color:#3b82f6; font-size:1.05rem;">$${m.streamVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border);">
              <div>
                <div style="font-size:0.88rem; font-weight:700; color:#fff">🔒 Arbiter Staked Collateral</div>
                <div style="font-size:0.75rem; color:var(--text-sec)">${m.arbitersCount} registered arbiters</div>
              </div>
              <div style="font-weight:800; color:var(--warning); font-size:1.05rem;">$${m.totalArbiterStaked.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</div>
            </div>
          </div>
        </div>

      </div>
    `
  } else if (currentTab === 'links') {
    // ── 2. PAYMENT LINKS & STREAMS TAB ──
    const linksHtml = m.linksList.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No payment links registered on-chain yet.</td></tr>`
      : m.linksList.map(l => `
          <tr>
            <td style="padding:12px; font-weight:700; color:#fff;" class="mono">${esc(l.label || l.id)}</td>
            <td style="padding:12px;"><span class="badge badge-purple">${l.type === 'stream' ? 'Stream' : (l.type === 'group' ? 'Group' : 'Fixed')}</span></td>
            <td style="padding:12px; font-size:0.85rem; font-weight:800; color:var(--green);">${l.amount ? `${fmt(l.amount)} USDC` : 'Open'}</td>
            <td style="padding:12px; font-size:0.85rem; font-weight:800; color:var(--purple);">${fmt(l.totalRaised || 0)} USDC</td>
            <td style="padding:12px; font-size:0.8rem;" class="mono"><a href="#/profile/${l.creator}" style="color:var(--green)">${shortAddr(l.creator)}</a></td>
            <td style="padding:12px;"><span class="badge ${l.sponsored ? 'badge-warning' : 'badge-green'}">${l.sponsored ? 'Admin Sponsored' : 'User Paid'}</span></td>
          </tr>
        `).join('')

    tabContentHtml = `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header"><span>Payment Links Volume</span></div>
            <div class="kpi-value" style="color:var(--green)">$${m.linkVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub"><span>${m.totalLinksCount} links • ${m.linkPayerCount} unique payers</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span>Streaming Volume</span></div>
            <div class="kpi-value" style="color:#3b82f6">$${m.streamVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub"><span>${m.totalStreams} streams (${m.activeStreams} active)</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span>Link Payment Events</span></div>
            <div class="kpi-value" style="color:var(--warning)">${m.linksTxCount} txs</div>
            <div class="kpi-sub"><span>On-chain PaymentReceived events</span></div>
          </div>
        </div>

        <div class="detail-card" style="margin:0; padding:24px;">
          <h2 style="font-size:1.2rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            ${svg('link', 18)} On-Chain Payment Links Registry (${m.linksList.length})
          </h2>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="border-bottom:1px solid var(--border); color:var(--text-sec); font-size:0.75rem; text-transform:uppercase; font-weight:700">
                  <th style="padding:8px 12px">Link Label</th>
                  <th style="padding:8px 12px">Type</th>
                  <th style="padding:8px 12px">Price</th>
                  <th style="padding:8px 12px">Total Raised</th>
                  <th style="padding:8px 12px">Creator</th>
                  <th style="padding:8px 12px">Gas Model</th>
                </tr>
              </thead>
              <tbody>
                ${linksHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  } else if (currentTab === 'escrow') {
    // ── 3. ESCROW DEALS & ARBITER REVENUE TAB ──
    const dealsHtml = m.dealsList.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No escrow deals created on-chain yet.</td></tr>`
      : m.dealsList.map(d => `
          <tr>
            <td style="padding:12px; font-weight:700; color:#fff;" class="mono">#${d.id}</td>
            <td style="padding:12px; font-size:0.85rem; color:#fff;">${esc(d.title)}</td>
            <td style="padding:12px; font-size:0.85rem; font-weight:800; color:var(--green);">${fmt(d.amount)} USDC</td>
            <td style="padding:12px; font-size:0.8rem;" class="mono"><a href="#/profile/${d.client}" style="color:var(--green)">${shortAddr(d.client)}</a></td>
            <td style="padding:12px; font-size:0.8rem;" class="mono"><a href="#/profile/${d.worker}" style="color:var(--text-sec)">${shortAddr(d.worker)}</a></td>
            <td style="padding:12px;"><span class="badge badge-${getStatusClass(d.status)}">${getStatusLabel(d.status)}</span></td>
          </tr>
        `).join('')

    tabContentHtml = `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header"><span>Escrow Volume</span></div>
            <div class="kpi-value" style="color:var(--green)">$${m.escrowVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub"><span>${m.totalDeals} total deals</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span>Platform Fee Revenue</span></div>
            <div class="kpi-value" style="color:#3b82f6">$${m.escrowPlatformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub"><span>0.25% fee on escrow</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-header"><span>Arbiter Fees Earned</span></div>
            <div class="kpi-value" style="color:var(--purple)">$${m.arbiterFeeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub"><span>0.5% resolution fee • $${m.totalArbiterStaked.toLocaleString()} staked</span></div>
          </div>
        </div>

        <div class="detail-card" style="margin:0; padding:24px;">
          <h2 style="font-size:1.2rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            ${svg('shield', 18)} On-Chain Escrow Contracts Log (${m.dealsList.length})
          </h2>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="border-bottom:1px solid var(--border); color:var(--text-sec); font-size:0.75rem; text-transform:uppercase; font-weight:700">
                  <th style="padding:8px 12px">ID</th>
                  <th style="padding:8px 12px">Title</th>
                  <th style="padding:8px 12px">Amount</th>
                  <th style="padding:8px 12px">Client</th>
                  <th style="padding:8px 12px">Worker</th>
                  <th style="padding:8px 12px">Status</th>
                </tr>
              </thead>
              <tbody>
                ${dealsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  } else if (currentTab === 'activity') {
    // ── 4. LIVE ON-CHAIN ACTIVITY FEED TAB ──
    const feedHtml = m.activityFeed.length === 0
      ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.88rem;background:rgba(255,255,255,0.01);border:1px dashed var(--border);border-radius:12px;">No on-chain contract events logged yet.</div>`
      : m.activityFeed.map(item => {
        const relTime = Math.round((Date.now() - item.timestamp) / 60000)
        const timeStr = relTime <= 0 ? 'Just now' : (relTime < 60 ? `${relTime}m ago` : `${Math.round(relTime / 60)}h ago`)
        return `
            <div class="activity-item">
              <div class="activity-icon">
                ${svg(item.icon, 18)}
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  <span>${esc(item.title)}</span>
                  <span class="badge ${item.badgeClass}" style="font-size:0.68rem">${item.badge}</span>
                </div>
                <div class="activity-desc">${esc(item.subtitle)}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                  <span style="font-size:0.75rem; color:var(--text-muted);" class="mono">${timeStr}</span>
                  ${item.amount ? `<span style="font-size:0.85rem; font-weight:800; color:var(--green);">${item.amount}</span>` : ''}
                </div>
              </div>
            </div>
          `
      }).join('')

    tabContentHtml = `
      <div class="detail-card" style="margin:0; padding:24px;">
        <h2 style="font-size:1.2rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
          ${svg('activity', 18)} Real On-Chain Operational Feed (${m.activityFeed.length} Events)
        </h2>
        <div class="activity-feed">
          ${feedHtml}
        </div>
      </div>
    `
  } else if (currentTab === 'governance') {
    // ── 5. GOVERNANCE & SLASHING CONTROLS TAB ──
    const arbitersHtml = arbiters.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No active arbiters registered on-chain.</td></tr>`
      : arbiters.map((arb) => {
        const tc = arb.trustScore >= 90 ? '#22c55e' : (arb.trustScore >= 50 ? '#eab308' : '#ef4444')
        return `
          <tr>
            <td class="mono" style="padding:12px;font-size:0.8rem;color:var(--text)"><a href="#/profile/${arb.address}" style="color:var(--green)">${shortAddr(arb.address)}</a></td>
            <td style="padding:12px;font-size:0.85rem">${arb.stake.toLocaleString()} USDC</td>
            <td style="padding:12px;font-size:0.85rem;font-weight:700;color:${tc}">${arb.trustScore}%</td>
            <td style="padding:12px;font-size:0.85rem">${arb.disputesResolved}</td>
            <td style="padding:12px;font-size:0.85rem;font-weight:700;color:var(--primary)">${arb.weightedScore.toLocaleString()}</td>
            <td style="padding:12px;text-align:right">
              <button class="btn btn-danger btn-sm" style="padding:4px 8px;font-size:0.75rem" onclick="window.prefillSlash('${arb.address}', ${arb.stake})" ${!isOwner ? 'disabled' : ''}>
                ${svg('alertTriangle', 11)} Slash
              </button>
            </td>
          </tr>
        `}).join('')

    const appealsHtml = appealedDeals.length === 0
      ? `<div style="text-align:center;padding:28px;color:var(--text-muted);font-size:0.88rem;background:rgba(255,255,255,0.01);border:1px dashed var(--border);border-radius:12px;">No appealed cases currently pending review on-chain.</div>`
      : appealedDeals.map(d => `
          <div class="detail-card" style="margin-top: 0; margin-bottom: 16px; border: 1px solid rgba(245,158,11,0.25); background:rgba(245,158,11,0.02)">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <h4 style="margin:0 0 4px 0; font-size:1.05rem; font-weight:700; color:#fff">${esc(d.title)}</h4>
                <span class="badge badge-appealed">Appealed</span>
                <span style="font-size:0.75rem; color:var(--text-sec); margin-left:8px">Deal ID: #${d.id}</span>
              </div>
              <div style="font-weight:700; color:var(--green)">${fmt(d.amount)} USDC</div>
            </div>
            <div style="font-size:0.8rem; color:var(--text-sec); margin-bottom:14px; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:8px; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px;">
              <div><strong>Client:</strong> <span class="mono">${shortAddr(d.client)}</span></div>
              <div><strong>Worker:</strong> <span class="mono">${shortAddr(d.worker)}</span></div>
              <div><strong>Arbiter:</strong> <span class="mono">${shortAddr(d.arbiter)}</span></div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" onclick="window.handleFinalizeAppeal(${d.id}, true)" ${!isOwner ? 'disabled' : ''}>
                Rule for Worker
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.handleFinalizeAppeal(${d.id}, false)" ${!isOwner ? 'disabled' : ''}>
                Rule for Client
              </button>
              <a href="#/deal/${d.id}" class="btn btn-secondary btn-sm" style="margin-left:auto">${svg('externalLink', 12)} View Full Audit</a>
            </div>
          </div>
        `).join('')

    tabContentHtml = `
      ${!isOwner ? `
        <div class="detail-card" style="border:1px solid rgba(245,158,11,0.3); background:rgba(245,158,11,0.03); margin-bottom:24px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="color:var(--warning)">${svg('alertTriangle', 24)}</div>
            <div>
              <h4 style="margin:0; font-size:0.95rem; color:#fff">Governance Controls (Read-Only Mode)</h4>
              <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--text-sec)">Connect with platform owner wallet ${ownerAddress ? `(<strong>${shortAddr(ownerAddress)}</strong>)` : ''} to execute parameter updates, circuit breaker actions, or arbiter slashing.</p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ── SECTION A: EMERGENCY CIRCUIT BREAKER DASHBOARD ── -->
      <div style="margin-bottom:28px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div>
            <h2 style="font-size:1.25rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
              ${svg('shield', 18)} Emergency Circuit Breakers
            </h2>
            <p style="color:var(--text-sec); font-size:0.8rem; margin:4px 0 0 0">
              Real-time contract status and emergency freeze controls across all 3 protocol contracts
            </p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="window.switchAdminTab('governance')">
              ${svg('activity', 12)} Check Status
            </button>
          </div>
        </div>

        <div class="circuit-breaker-grid">
          <!-- ParcisSafe Card -->
          <div class="contract-status-card ${pausedStatus.safe ? 'status-paused' : 'status-active'}">
            <div class="status-card-header">
              <div class="status-card-title">
                <span class="status-dot ${pausedStatus.safe ? 'status-dot-paused' : 'status-dot-active'}"></span>
                <strong>ParcisSafe (Escrow)</strong>
              </div>
              <span class="badge ${pausedStatus.safe ? 'badge-danger' : 'badge-green'}">
                ${pausedStatus.safe ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
            <div class="status-card-body">
              <div class="contract-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="mono" style="font-size:0.75rem; color:var(--text-sec);">${shortAddr(m.escrowContract || '0x462b674d2feD79CD38e813eb5455e3DCf27D0077')}</span>
                <span class="badge badge-purple" style="font-size:0.65rem">V2.2 Pausable</span>
              </div>
              <p style="font-size:0.78rem; color:var(--text-sec); margin:8px 0 16px 0; line-height:1.4">
                Controls deals creation, deposits, disputes, and arbiter resolutions.
              </p>
              ${pausedStatus.safe ? `
                <button class="btn btn-success btn-sm" style="width:100%; justify-content:center" onclick="window.handleUnpauseContract('safe')" ${!isOwner ? 'disabled title="Only contract owner can resume"' : ''}>
                  ▶ Resume Safe Contract
                </button>
              ` : `
                <button class="btn btn-danger btn-sm" style="width:100%; justify-content:center" onclick="window.handlePauseContract('safe')" ${!isOwner ? 'disabled title="Only contract owner can pause"' : ''}>
                  ⏸ Emergency Pause Safe
                </button>
              `}
            </div>
          </div>

          <!-- ParcisLinks Card -->
          <div class="contract-status-card ${pausedStatus.links ? 'status-paused' : 'status-active'}">
            <div class="status-card-header">
              <div class="status-card-title">
                <span class="status-dot ${pausedStatus.links ? 'status-dot-paused' : 'status-dot-active'}"></span>
                <strong>ParcisLinks (Payments)</strong>
              </div>
              <span class="badge ${pausedStatus.links ? 'badge-danger' : 'badge-green'}">
                ${pausedStatus.links ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
            <div class="status-card-body">
              <div class="contract-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="mono" style="font-size:0.75rem; color:var(--text-sec);">${shortAddr(m.linksContract || CONFIG.linksContract || '')}</span>
                <span class="badge badge-purple" style="font-size:0.65rem">V3.1 Pausable</span>
              </div>
              <p style="font-size:0.78rem; color:var(--text-sec); margin:8px 0 16px 0; line-height:1.4">
                Controls link creation, tip checkouts, and custom vanity slug payments.
              </p>
              ${pausedStatus.links ? `
                <button class="btn btn-success btn-sm" style="width:100%; justify-content:center" onclick="window.handleUnpauseContract('links')" ${!isOwner ? 'disabled title="Only contract owner can resume"' : ''}>
                  ▶ Resume Links Contract
                </button>
              ` : `
                <button class="btn btn-danger btn-sm" style="width:100%; justify-content:center" onclick="window.handlePauseContract('links')" ${!isOwner ? 'disabled title="Only contract owner can pause"' : ''}>
                  ⏸ Emergency Pause Links
                </button>
              `}
            </div>
          </div>

          <!-- ParcisStreams Card -->
          <div class="contract-status-card ${pausedStatus.streams ? 'status-paused' : 'status-active'}">
            <div class="status-card-header">
              <div class="status-card-title">
                <span class="status-dot ${pausedStatus.streams ? 'status-dot-paused' : 'status-dot-active'}"></span>
                <strong>ParcisStreams</strong>
              </div>
              <span class="badge ${pausedStatus.streams ? 'badge-danger' : 'badge-green'}">
                ${pausedStatus.streams ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
            <div class="status-card-body">
              <div class="contract-meta" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="mono" style="font-size:0.75rem; color:var(--text-sec);">${shortAddr(m.streamsContract || '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d')}</span>
                <span class="badge badge-purple" style="font-size:0.65rem">V1.1 Pausable</span>
              </div>
              <p style="font-size:0.78rem; color:var(--text-sec); margin:8px 0 16px 0; line-height:1.4">
                Controls continuous payroll streaming deposits and withdrawals.
              </p>
              ${pausedStatus.streams ? `
                <button class="btn btn-success btn-sm" style="width:100%; justify-content:center" onclick="window.handleUnpauseContract('streams')" ${!isOwner ? 'disabled title="Only contract owner can resume"' : ''}>
                  ▶ Resume Streams Contract
                </button>
              ` : `
                <button class="btn btn-danger btn-sm" style="width:100%; justify-content:center" onclick="window.handlePauseContract('streams')" ${!isOwner ? 'disabled title="Only contract owner can pause"' : ''}>
                  ⏸ Emergency Pause Streams
                </button>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- ── PENDING OWNERSHIP CLAIM BANNER (IF CONNECTED WALLET IS NOMINATED) ── -->
      ${allOwnership.hasPendingClaims ? `
        <div class="detail-card" style="border: 2px solid #22c55e; background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.05)); margin-bottom: 24px; padding: 22px; border-radius: 14px; box-shadow: 0 0 30px rgba(34,197,94,0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(34, 197, 94, 0.2); display: flex; align-items: center; justify-content: center; color: #22c55e; font-size: 24px; flex-shrink: 0;">
                👑
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.12rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
                  Action Required: Ownership Acceptance Ready
                  <span class="badge badge-green" style="font-size: 0.72rem;">Step 2 Pending</span>
                </h3>
                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-sec); line-height: 1.4;">
                  Your connected wallet <span class="mono" style="color:#22c55e; font-weight:700;">${shortAddr(account)}</span> is nominated as pending owner on 
                  <strong>${allOwnership.pendingClaimCount} contract${allOwnership.pendingClaimCount > 1 ? 's' : ''}</strong>
                  (${allOwnership.contracts.filter(c => c.isPendingOwner).map(c => c.shortName).join(', ')}).
                  Click below to sign the on-chain claim transaction and finalize your protocol ownership.
                </p>
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-success" style="padding: 10px 20px; font-size: 0.9rem; font-weight: 700; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);" onclick="window.handleAcceptOwnership('all')">
                ${svg('check', 16)} Claim All Nominated Contracts (${allOwnership.pendingClaimCount})
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ── SECTION B: PROTOCOL CONTRACTS 2-STEP OWNERSHIP REGISTRY ── -->
      <div style="margin-bottom: 28px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h2 style="font-size:1.25rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
              ${svg('shield', 18)} Protocol Contracts 2-Step Ownership
            </h2>
            <p style="color:var(--text-sec); font-size:0.8rem; margin:4px 0 0 0">
              Live on-chain ownership detection across all 4 Parcis smart contracts. Nominate new owner (Step 1) and claim authority (Step 2).
            </p>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="badge ${allOwnership.ownedCount > 0 ? 'badge-green' : 'badge-purple'}" style="font-size:0.75rem; padding:6px 12px;">
              ${allOwnership.ownedCount} of ${allOwnership.contracts.length || 4} Contracts Owned by You
            </span>
          </div>
        </div>

        <!-- Contract Ownership Cards Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap:16px; margin-bottom:20px;">
          ${(allOwnership.contracts.length > 0 ? allOwnership.contracts : [
            { key: 'safe', name: 'ParcisSafe (Escrow)', shortName: 'ParcisSafe', category: 'Escrow & Disputes', address: m.escrowContract, owner: ownerAddress, pendingOwner: pendingOwner, isOwner, isPendingOwner: account && pendingOwner && account.toLowerCase() === pendingOwner.toLowerCase(), isLive: true }
          ]).map(c => {
            const expUrl = `${(CONFIG.explorerUrl || 'https://explorer.arc.io')}/address/${c.address || ''}`
            return `
              <div class="detail-card" style="margin:0; padding:18px; border:1px solid ${c.isPendingOwner ? 'rgba(34,197,94,0.4)' : (c.isOwner ? 'rgba(168,85,247,0.3)' : 'var(--border)')}; background:${c.isPendingOwner ? 'rgba(34,197,94,0.03)' : (c.isOwner ? 'rgba(168,85,247,0.02)' : 'var(--surface)')}; position:relative; overflow:hidden;">
                ${c.isPendingOwner ? `<div style="position:absolute; top:0; right:0; background:#22c55e; color:#000; font-size:0.65rem; font-weight:800; padding:3px 8px; border-bottom-left-radius:8px; text-transform:uppercase;">Claim Ready</div>` : ''}
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <div>
                    <h4 style="margin:0; font-size:0.98rem; font-weight:700; color:#fff">${c.shortName}</h4>
                    <span style="font-size:0.72rem; color:var(--text-sec);">${c.category || 'Protocol Contract'}</span>
                  </div>
                  <span class="badge ${c.isOwner ? 'badge-purple' : 'badge-secondary'}" style="font-size:0.68rem">
                    ${c.isOwner ? '👑 You are Owner' : (c.isPendingOwner ? '🎯 Nominee' : 'External')}
                  </span>
                </div>

                <!-- Contract Address -->
                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); padding:6px 10px; border-radius:6px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                  <span class="mono" style="font-size:0.75rem; color:var(--text-muted);">${c.address ? shortAddr(c.address) : 'Not deployed'}</span>
                  ${c.address ? `<a href="${expUrl}" target="_blank" rel="noopener" style="color:var(--primary); font-size:0.72rem; display:flex; align-items:center; gap:3px;">${svg('externalLink', 11)} Scan</a>` : ''}
                </div>

                <!-- Detected Current Owner -->
                <div style="font-size:0.78rem; margin-bottom:8px;">
                  <div style="color:var(--text-sec); font-size:0.7rem; margin-bottom:2px;">Current Owner:</div>
                  <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span class="mono" style="color:${c.isOwner ? '#22c55e' : '#fff'}; font-weight:700; font-size:0.78rem;" title="${c.owner || 'None'}">
                      ${c.owner ? shortAddr(c.owner) : '0x000...000'}
                    </span>
                    ${c.isOwner ? `<span class="badge badge-green" style="font-size:0.62rem">Connected</span>` : ''}
                  </div>
                </div>

                <!-- Detected Pending Nominee -->
                <div style="font-size:0.78rem; margin-bottom:14px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.08);">
                  <div style="color:var(--text-sec); font-size:0.7rem; margin-bottom:2px;">Pending Nominee (Step 2):</div>
                  <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span class="mono" style="color:${c.pendingOwner ? (c.isPendingOwner ? '#22c55e' : 'var(--warning)') : 'var(--text-muted)'}; font-size:0.78rem;">
                      ${c.pendingOwner ? shortAddr(c.pendingOwner) : 'None (Settled)'}
                    </span>
                    ${c.pendingOwner ? `<span class="badge ${c.isPendingOwner ? 'badge-green' : 'badge-warning'}" style="font-size:0.62rem">${c.isPendingOwner ? 'Your Claim!' : 'Awaiting'}</span>` : ''}
                  </div>
                </div>

                <!-- Card Action Button -->
                ${c.isPendingOwner ? `
                  <button class="btn btn-success btn-sm" style="width:100%; justify-content:center; font-weight:700;" onclick="window.handleAcceptOwnership('${c.key}')">
                    ${svg('check', 13)} Claim ${c.shortName} Ownership
                  </button>
                ` : (c.isOwner ? `
                  <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onclick="window.selectContractForTransfer('${c.key}')">
                    Initiate Transfer →
                  </button>
                ` : `
                  <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:4px 0;">
                    ${c.pendingOwner ? `Pending claim by ${shortAddr(c.pendingOwner)}` : `Controlled by ${shortAddr(c.owner || '')}`}
                  </div>
                `)}
              </div>
            `
          }).join('')}
        </div>

        <!-- 2-Step Action Panels: Transfer & Claim -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
          
          <!-- Transfer Ownership Form (Step 1) -->
          <div class="detail-card danger-zone" style="margin:0; padding:22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
                  ${svg('shield', 16)} Step 1: Nominate New Owner
                </h3>
                <p style="color:var(--text-sec); font-size:0.78rem; margin:3px 0 0 0;">
                  Initiate 2-step transfer to a cold wallet, multi-sig, or new team address
                </p>
              </div>
              <span class="badge badge-purple">Ownable2Step</span>
            </div>

            <form id="transfer-ownership-form" onsubmit="window.handleTransferOwnership(event)">
              <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:0.78rem; color:var(--text-sec)">Target Contract</label>
                <select id="transfer-contract-select" style="background:var(--surface); border:1px solid var(--border); padding:8px 10px; border-radius:8px; width:100%; color:#fff; font-size:0.85rem; margin-top:4px;">
                  <option value="all">⚡ All 4 Protocol Contracts (Full Protocol Handover)</option>
                  <option value="safe">ParcisSafe (Escrow & Dispute Arbitration)</option>
                  <option value="links">ParcisLinks (Payment Links & Slugs)</option>
                  <option value="streams">ParcisStreams (Streaming Payroll)</option>
                  <option value="devRegistry">ParcisDevRegistry (Developer Relayer & SDK)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:0.78rem; color:var(--text-sec)">New Owner Address (0x...)</label>
                <input type="text" id="new-owner-input" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:8px 10px; border-radius:8px; width:100%; color:#fff; font-family:monospace; font-size:0.82rem; margin-top:4px;">
              </div>

              <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:10px; margin-bottom:14px; font-size:0.75rem; color:var(--text-sec); line-height:1.4;">
                <strong style="color:var(--danger)">Security Protocol:</strong> Calling this function does NOT immediately forfeit your privileges. The nominated address must connect to this portal and sign Step 2 (<code style="color:#fff">acceptOwnership</code>) before ownership is finalized.
              </div>

              <button type="submit" class="btn btn-danger btn-sm" style="width:100%; justify-content:center; padding:10px;" ${!isOwner && allOwnership.ownedCount === 0 ? 'disabled' : ''}>
                Initiate Ownership Nomination
              </button>
            </form>
          </div>

          <!-- Claim Nominated Ownership (Step 2) -->
          <div class="detail-card" style="margin:0; padding:22px; border:1px solid ${allOwnership.hasPendingClaims ? '#22c55e' : 'var(--border)'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
                  ${svg('check', 16)} Step 2: Accept & Claim Ownership
                </h3>
                <p style="color:var(--text-sec); font-size:0.78rem; margin:3px 0 0 0;">
                  Finalize ownership transfer by signing acceptance from the nominated address
                </p>
              </div>
              <span class="badge ${allOwnership.hasPendingClaims ? 'badge-green' : 'badge-secondary'}">
                ${allOwnership.hasPendingClaims ? `${allOwnership.pendingClaimCount} Ready` : 'No Pending Claims'}
              </span>
            </div>

            ${allOwnership.hasPendingClaims ? `
              <div style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3); border-radius:8px; padding:12px; margin-bottom:14px;">
                <div style="font-size:0.82rem; font-weight:700; color:#22c55e; margin-bottom:6px;">
                  Your wallet is nominated as pending owner on:
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  ${allOwnership.contracts.filter(c => c.isPendingOwner).map(c => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:6px;">
                      <div>
                        <strong style="color:#fff; font-size:0.82rem;">${c.shortName}</strong>
                        <span style="font-size:0.7rem; color:var(--text-sec); margin-left:6px;" class="mono">${shortAddr(c.address)}</span>
                      </div>
                      <button class="btn btn-success btn-sm" style="padding:3px 8px; font-size:0.75rem;" onclick="window.handleAcceptOwnership('${c.key}')">
                        Claim
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>

              <button class="btn btn-success btn-sm" style="width:100%; justify-content:center; padding:10px; font-weight:700;" onclick="window.handleAcceptOwnership('all')">
                ✓ Accept & Claim All Nominated Contracts
              </button>
            ` : `
              <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:8px; padding:16px; margin-bottom:14px; text-align:center;">
                <div style="color:var(--text-muted); font-size:0.82rem; margin-bottom:8px;">
                  No contracts are currently awaiting acceptance by your connected wallet (<span class="mono">${account ? shortAddr(account) : 'Not Connected'}</span>).
                </div>
                <div style="font-size:0.75rem; color:var(--text-sec); line-height:1.4;">
                  If another address nominated you, make sure to connect that exact address in MetaMask or WalletConnect. Once connected, a claim button will appear automatically here.
                </div>
              </div>

              <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center; padding:10px;" onclick="window.switchAdminTab('governance')">
                ${svg('activity', 13)} Refresh On-Chain Ownership Status
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- ── SECTION C: ON-CHAIN PARAMETER CONFIGURATION ── -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-bottom:28px;">

        <!-- DevRegistry Config Panel -->
        <div class="detail-card config-panel" style="margin:0; padding:22px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
              ${svg('settings', 16)} DevRegistry Config
            </h3>
            <span class="badge badge-blue">Registry</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-sec); margin-bottom:14px;">
            Registered Developers: <strong style="color:#fff">${devConfig.totalDevs || 0}</strong>
          </div>

          <!-- Platform Treasury -->
          <form onsubmit="window.handleSetPlatformTreasury(event)" style="margin-bottom:12px;">
            <label style="font-size:0.75rem; color:var(--text-sec)">Platform Treasury Address</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="dev-treasury-input" value="${devConfig.treasury || ''}" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-family:monospace; font-size:0.8rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>

          <!-- API Relayer -->
          <form onsubmit="window.handleSetApiRelayer(event)" style="margin-bottom:12px;">
            <label style="font-size:0.75rem; color:var(--text-sec)">API Relayer Address</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="dev-relayer-input" value="${devConfig.relayer || ''}" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-family:monospace; font-size:0.8rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>

          <!-- DevRegistry Streams Contract -->
          <form onsubmit="window.handleSetDevRegistryStreams(event)">
            <label style="font-size:0.75rem; color:var(--text-sec)">Linked ParcisStreams Address</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="dev-streams-input" value="${devConfig.streams || ''}" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-family:monospace; font-size:0.8rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>
        </div>

        <!-- ParcisLinks Config Panel -->
        <div class="detail-card config-panel" style="margin:0; padding:22px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <h3 style="font-size:1.05rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
              ${svg('link', 16)} ParcisLinks Config
            </h3>
            <span class="badge badge-purple">Links Admin</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-sec); margin-bottom:14px;">
            Manage vanity slug fees and protocol fee wallet
          </div>

          <!-- Links Admin -->
          <form onsubmit="window.handleSetLinksAdmin(event)" style="margin-bottom:12px;">
            <label style="font-size:0.75rem; color:var(--text-sec)">Links Admin Address</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="links-admin-input" value="${linksConfig.admin || ''}" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-family:monospace; font-size:0.8rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>

          <!-- Premium Slug Fee -->
          <form onsubmit="window.handleSetPremiumSlugFee(event)" style="margin-bottom:12px;">
            <label style="font-size:0.75rem; color:var(--text-sec)">Premium Vanity Slug Fee (USDC)</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="number" id="links-fee-input" value="${linksConfig.premiumSlugFee}" step="0.01" min="0" placeholder="0.50" required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-size:0.85rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>

          <!-- Platform Fee Wallet -->
          <form onsubmit="window.handleSetLinksPlatformWallet(event)">
            <label style="font-size:0.75rem; color:var(--text-sec)">Platform Fee Collector Wallet</label>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="links-wallet-input" value="${linksConfig.platformWallet || ''}" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:6px 10px; border-radius:6px; width:100%; color:#fff; font-family:monospace; font-size:0.8rem;">
              <button type="submit" class="btn btn-primary btn-sm" ${!isOwner ? 'disabled' : ''}>Save</button>
            </div>
          </form>
        </div>

      </div>

      <div class="admin-grid">
        <div style="display:flex; flex-direction:column; gap:24px;">
          <div>
            <h2 style="font-size:1.25rem; font-weight:800; color:#fff; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
              ${svg('alertTriangle', 16)} On-Chain Pending Appeals Queue (${appealedDeals.length})
            </h2>
            ${appealsHtml}
          </div>

          <div class="detail-card" style="margin:0; padding:24px;">
            <h2 style="font-size:1.25rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              ${svg('users', 16)} Platform Arbiters Pool
            </h2>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);color:var(--text-sec);font-size:0.75rem;text-transform:uppercase;font-weight:700">
                    <th style="padding:8px 12px">Address</th>
                    <th style="padding:8px 12px">Stake</th>
                    <th style="padding:8px 12px">Trust</th>
                    <th style="padding:8px 12px">Resolved</th>
                    <th style="padding:8px 12px">Weighted Score</th>
                    <th style="padding:8px 12px;text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${arbitersHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:24px;">
          <div class="detail-card" style="margin:0; padding:24px;">
            <h3 style="font-size:1.1rem; font-weight:800; color:#fff; margin-bottom:16px; display:flex; align-items:center; gap:6px;">
              ${svg('settings', 15)} System Parameters
            </h3>
            
            <form id="stake-settings-form" style="margin-bottom:20px;" onsubmit="window.handleUpdateMinStake(event)">
              <div class="form-group">
                <label>Minimum Arbiter Stake (USDC)</label>
                <div style="display:flex; gap:8px; margin-top:6px;">
                  <input type="number" id="new-min-stake" value="${minStake}" placeholder="100" min="1" step="1" required style="background:var(--surface); border:1px solid var(--border); padding:10px; border-radius:8px; width:100%; color:#fff; font-family:var(--font);">
                  <button type="submit" class="btn btn-primary" style="padding: 0 16px;" ${!isOwner ? 'disabled' : ''}>Update</button>
                </div>
              </div>
            </form>

            <form id="appeal-settings-form" onsubmit="window.handleUpdateAppealDuration(event)">
              <div class="form-group">
                <label>Appeal Hold Window (Seconds)</label>
                <div style="display:flex; gap:8px; margin-top:6px;">
                  <input type="number" id="new-appeal-duration" value="${appealWindow}" placeholder="172800" min="60" step="1" required style="background:var(--surface); border:1px solid var(--border); padding:10px; border-radius:8px; width:100%; color:#fff; font-family:var(--font);">
                  <button type="submit" class="btn btn-primary" style="padding: 0 16px;" ${!isOwner ? 'disabled' : ''}>Update</button>
                </div>
                <div class="form-hint" style="margin-top:6px;">172800 = 48 hours, 86400 = 24 hours.</div>
              </div>
            </form>
          </div>

          <div class="detail-card" style="margin:0; padding:24px; border: 1px solid rgba(239,68,68,0.15); background:rgba(239,68,68,0.01)">
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--danger); margin-bottom:16px; display:flex; align-items:center; gap:6px;">
              ${svg('alertTriangle', 15)} Slash Arbiter Stake
            </h3>
            <p style="color:var(--text-sec); font-size:0.8rem; margin-bottom:16px; line-height:1.4">Reduce the staked collateral of a colluding or inactive arbiter.</p>
            
            <form id="slash-arbiter-form" onsubmit="window.handleSlashArbiterSubmit(event)">
              <div class="form-group" style="margin-bottom:12px;">
                <label>Arbiter Wallet Address</label>
                <input type="text" id="slash-address" placeholder="0x..." required style="background:var(--surface); border:1px solid var(--border); padding:10px; border-radius:8px; width:100%; color:#fff; font-family:monospace; font-size:0.85rem; margin-top:6px;">
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label>Slash Amount (USDC)</label>
                <input type="number" id="slash-amount" placeholder="50.00" min="0.01" step="0.01" required style="background:var(--surface); border:1px solid var(--border); padding:10px; border-radius:8px; width:100%; color:#fff; font-family:var(--font); margin-top:6px;">
              </div>
              <div class="form-group" style="margin-bottom:18px;">
                <label>Reason for Slashing</label>
                <textarea id="slash-reason" placeholder="Explain the collusion details or missed deadline..." required style="background:var(--surface); border:1px solid var(--border); padding:10px; border-radius:8px; width:100%; min-height:60px; color:#fff; font-family:var(--font); font-size:0.85rem; resize:vertical; outline:none; margin-top:6px;"></textarea>
              </div>
              <button type="submit" class="btn btn-danger" style="width:100%; justify-content:center" ${!isOwner ? 'disabled' : ''}>
                ${svg('alertTriangle', 14)} Execute On-Chain Slash
              </button>
            </form>
          </div>
        </div>
      </div>
    `
  }

  return `
<div class="page">
  <div class="container" style="max-width:1100px;">
    
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px; border-bottom:1px solid var(--border); padding-bottom:16px;">
      <div>
        <h1 style="font-size:1.8rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:8px; margin:0">
          ${svg('shield', 22)} Multi-Contract On-Chain Analytics
        </h1>
        <p style="color:var(--text-sec); font-size:0.88rem; margin:4px 0 0 0">Real-time smart contract data across ArcSafe & ParcisLinks • Zero Mocks • Zero Databases</p>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button id="btn-refresh-analytics" class="btn btn-secondary btn-sm" onclick="window.refreshAnalytics()">
          ${svg('activity', 12)} Refresh Live Data
        </button>
        <button class="btn btn-secondary btn-sm" onclick="window.exportOnChainCSV()">
          ${svg('externalLink', 12)} Export CSV
        </button>
      </div>
    </div>

    <!-- Contract Status Header Banner -->
    <div class="detail-card" style="margin-bottom:24px; padding:16px 20px; background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="display:inline-block; width:10px; height:10px; background:var(--green); border-radius:50%; box-shadow:0 0 8px var(--green)"></span>
          <span style="font-size:0.88rem; font-weight:700; color:#fff">Network: Arc Testnet (Chain ID 50341)</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-sec); display:flex; gap:16px; flex-wrap:wrap;">
          <span>Escrow: <strong style="color:var(--green)" class="mono">${shortAddr(m.escrowContract)}</strong></span>
          <span>Links: <strong style="color:var(--purple)" class="mono">${shortAddr(m.linksContract)}</strong></span>
          <span>Streams: <strong style="color:#3b82f6" class="mono">${shortAddr(m.streamsContract)}</strong></span>
        </div>
      </div>
    </div>

    ${navTabsHtml}

    ${tabContentHtml}

  </div>
</div>
  `
}


