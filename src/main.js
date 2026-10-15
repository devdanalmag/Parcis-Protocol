// ═══ Parcis - Main (Ultra-Fast Edition) ═══
// Buffer polyfill — must be first, before any WalletConnect/Reown code
import { Buffer } from 'buffer'
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer
}
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = globalThis.Buffer || Buffer
}

import './style.css'
import './console.css'
import './reown.js'
import { CONFIG, isAdminWallet } from './config.js'
import { connectWallet, onWalletChange, isConnected, getAccount, sendUSDC, checkGasBalance, getUSDCBalance, disconnectWallet } from './wallet.js'
import { createDeal, fundDeal, submitDeliverable, approveDeal, disputeDeal, cancelDeal, resolveDispute, appealResolution, finalizeResolution, finalizeAppeal, slashArbiter, getUserDeals, getUserStreams, getArbiterInfo } from './contract.js'
import { createPaymentLink, recordPayment, generateQR, payUrl, seedDemoLinks, getUserLinks, linkTotalReceived } from './payment.js'
import { payLinkOnChain, isLive as isLinksLive, fetchLinkFromChain } from './links-contract.js'
import { renderHome, renderSend, renderPay, renderDashboard, renderSafe, renderCreate, renderDeal, renderProfile, renderDevelopers, renderSubscribe, renderLinkDashboard, renderStreamDetail, renderAdmin, renderAdminAccessDenied, renderNotFound, renderLinksTabHtml, renderDealsTabHtml, renderStreamsTabHtml, renderArbiterTabHtml } from './pages.js'
import { renderConsole } from './console.js'
import { renderDocs } from './docs.js'
import { svg } from './icons.js'
import { warmDashboardCache } from './cache.js'

import { waitForReownReady, isMainnet } from './reown.js'

// Update network badge based on active network
if (typeof document !== 'undefined') {
  const updateNetworkBadge = () => {
    const netBadge = document.getElementById('network-badge')
    if (netBadge) {
      netBadge.innerHTML = `<span class="network-dot"></span> ${isMainnet ? 'Arc Mainnet' : 'Arc Testnet'}`
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNetworkBadge)
  } else {
    updateNetworkBadge()
  }
}

// ─── Reown AppKit Button Availability Checker & State Transition ───
function initReownButtonWatcher() {
  const container = document.getElementById('wallet-button-container')
  const loadingBtn = document.getElementById('wallet-loading-btn')

  if (!container) return

  let userWantsConnect = false

  if (loadingBtn) {
    loadingBtn.addEventListener('click', () => {
      userWantsConnect = true
      const textEl = loadingBtn.querySelector('.wallet-loading-text')
      if (textEl) textEl.textContent = 'Opening...'
    })
  }

  waitForReownReady().then(() => {
    container.setAttribute('data-status', 'ready')
    if (userWantsConnect && window.connectWallet) {
      window.connectWallet()
    }
  })
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReownButtonWatcher)
  } else {
    initReownButtonWatcher()
  }
}

// ─ Wallet (with preflight cache warming) ─
window.connectWallet = async () => {
  try {
    await connectWallet()
  } catch (e) { toast(e.message || 'Failed to connect', 'error') }
}

onWalletChange(({ account, connected }) => {
  if (connected && account) {
    warmDashboardCache(account, { getUSDCBalance, getUserLinks, getUserStreams, getUserDeals })
  }
  router()
})

// ─── Toast ───
function toast(msg, type = 'info', dur = 4000) {
  const iconMap = { success: svg('checkCircle',16), error: svg('xCircle',16), warning: svg('alertTriangle',16), info: svg('info',16) }
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span style="color:var(--${type==='success'?'green':type==='error'?'danger':type==='warning'?'warning':'text-sec'})">${iconMap[type]||''}</span><span>${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => { el.style.animation = 'toastOut .3s ease forwards'; setTimeout(() => el.remove(), 300) }, dur)
}
window.toast = toast

// ─── Modal ───
const openModal = html => {
  document.getElementById('modal-content').innerHTML = html
  document.getElementById('modal-overlay').classList.add('open')
}
const closeModal = () => document.getElementById('modal-overlay').classList.remove('open')
window.closeModal = closeModal
document.getElementById('modal-close').addEventListener('click', closeModal)
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal() })

const showConfirm = (title, message, onConfirm) => {
  openModal(`
    <div style="text-align: center; padding: 10px 0;">
      <h3 style="margin-bottom: 8px; font-size: 1.2rem; font-weight: 800; color: #fff;">${title}</h3>
      <p style="color: var(--text-sec); font-size: 0.88rem; margin-bottom: 24px; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button class="btn btn-primary" id="confirm-yes-btn" style="flex: 1; justify-content: center; max-width: 140px;">${svg('check',14)} Confirm</button>
        <button class="btn btn-secondary" id="confirm-no-btn" style="flex: 1; justify-content: center; max-width: 140px;">Cancel</button>
      </div>
    </div>
  `)
  const yesBtn = document.getElementById('confirm-yes-btn')
  const noBtn = document.getElementById('confirm-no-btn')
  yesBtn.addEventListener('click', async () => {
    const originalHtml = yesBtn.innerHTML
    yesBtn.disabled = true
    noBtn.disabled = true
    yesBtn.innerHTML = `<span class="spinner"></span> Processing...`
    try {
      await onConfirm()
      closeModal()
    } catch (e) {
      toast(e.message || 'Operation failed', 'error')
      yesBtn.disabled = false
      noBtn.disabled = false
      yesBtn.innerHTML = originalHtml
    }
  })
  noBtn.addEventListener('click', closeModal)
}
window.showConfirm = showConfirm

window.openFeedbackModal = () => {
  openModal(`
    <div class="feedback-container">
      <div class="feedback-title">${svg('messageCircle', 20)} Share Feedback</div>
      <div class="feedback-subtitle">We'd love to hear your thoughts, suggestions, or assist you with any questions. Choose a channel below:</div>
      <div class="feedback-options">
        <a href="${CONFIG.feedbackGoogleForm}" target="_blank" class="feedback-option google-form" onclick="window.closeFeedbackModal()">
          <div class="feedback-opt-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="feedback-opt-content">
            <div class="feedback-opt-title">Google Form</div>
            <div class="feedback-opt-desc">Submit feature requests, bug reports, or general suggestions anonymously.</div>
          </div>
          <div class="feedback-opt-arrow">${svg('chevronRight', 16)}</div>
        </a>
        <a href="${CONFIG.feedbackTelegram}" target="_blank" class="feedback-option telegram" onclick="window.closeFeedbackModal()">
          <div class="feedback-opt-icon">${svg('messageCircle', 20)}</div>
          <div class="feedback-opt-content">
            <div class="feedback-opt-title">Telegram Message</div>
            <div class="feedback-opt-desc">Chat directly with the developer for fast support or integrations.</div>
          </div>
          <div class="feedback-opt-arrow">${svg('chevronRight', 16)}</div>
        </a>
      </div>
    </div>
  `)
}
window.closeFeedbackModal = closeModal


// ─── Confetti ───
function confetti() {
  const colors = ['#22c55e', '#16a34a', '#86efac', '#fff', '#d1fae5']
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    el.style.cssText = `left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${1+Math.random()*0.6}s;animation-delay:${Math.random()*0.3}s;border-radius:${Math.random()>0.5?'50%':'2px'}`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2000)
  }
}

// ─── Type selector ───
window.selectType = type => {
  document.querySelectorAll('.type-option').forEach(el => el.classList.remove('selected'))
  document.getElementById(`type-${type}`)?.classList.add('selected')
  document.getElementById('link-type').value = type
  const amtGroup = document.getElementById('amount-group')
  const grpGroup = document.getElementById('group-target-group')
  const grpLabel = document.getElementById('group-target-label')
  if (type === 'open') { amtGroup.style.display = 'none'; grpGroup.style.display = 'none' }
  else if (type === 'group') { amtGroup.style.display = ''; grpGroup.style.display = ''; if(grpLabel) grpLabel.textContent = 'Number of People' }
  else if (type === 'stream') { amtGroup.style.display = ''; grpGroup.style.display = ''; if(grpLabel) grpLabel.textContent = 'Duration (Days)' }
  else { amtGroup.style.display = ''; grpGroup.style.display = 'none' }
}

// ─── Premium Slug Toggle ───
window.togglePremiumSlug = (enabled) => {
  const slugInput = document.getElementById('link-slug')
  const lockOverlay = document.getElementById('premium-slug-lock')
  const feeNotice = document.getElementById('premium-fee-notice')
  const hint = document.getElementById('premium-slug-hint')
  const wrap = document.getElementById('premium-slug-input-wrap')
  const hiddenFlag = document.getElementById('premium-enabled')

  if (enabled) {
    if (slugInput) { slugInput.disabled = false; slugInput.focus() }
    if (lockOverlay) lockOverlay.style.display = 'none'
    if (feeNotice) feeNotice.style.display = 'flex'
    if (hint) hint.style.display = 'none'
    if (wrap) wrap.classList.add('premium-unlocked')
    if (hiddenFlag) hiddenFlag.value = '1'
  } else {
    if (slugInput) { slugInput.disabled = true; slugInput.value = '' }
    if (lockOverlay) lockOverlay.style.display = 'flex'
    if (feeNotice) feeNotice.style.display = 'none'
    if (hint) hint.style.display = ''
    if (wrap) wrap.classList.remove('premium-unlocked')
    if (hiddenFlag) hiddenFlag.value = '0'
  }
}

// ─── Send form ───
function bindSendForm() {
  const form = document.getElementById('send-form')
  if (!form) return
  form.addEventListener('submit', async e => {
    e.preventDefault()
    const btn = document.getElementById('send-btn')
    const statusEl = document.getElementById('send-status')
    btn.disabled = true
    btn.innerHTML = `<span class="spinner"></span> Creating...`
    const onStatus = msg => {
      if (statusEl) statusEl.textContent = msg
    }
    try {
      const isPremium = document.getElementById('premium-enabled')?.value === '1'
      const slugVal = document.getElementById('link-slug').value
      const { id, txHash, sponsored, mock, premium } = await createPaymentLink({
        creator: getAccount(),
        label: document.getElementById('link-label').value,
        amount: document.getElementById('link-amount')?.value,
        description: document.getElementById('link-desc').value,
        type: document.getElementById('link-type').value,
        groupTarget: document.getElementById('link-group-target')?.value,
        slug: isPremium ? slugVal : document.getElementById('link-slug').value,
        premium: isPremium && slugVal?.trim(),
      }, onStatus)
      const url = payUrl(id)
      const qr = await generateQR(url)
      const sponsorBadge = sponsored ? `<div style="margin-bottom:12px;padding:6px 12px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:6px;font-size:.75rem;color:#a78bfa;text-align:center">${svg('zap',12)} Gas sponsored by Parcis - link created on-chain</div>` : ''
      const premiumBadge = premium ? `<div style="margin-bottom:12px;padding:6px 12px;background:linear-gradient(135deg,rgba(234,179,8,0.1),rgba(168,85,247,0.1));border:1px solid rgba(234,179,8,0.25);border-radius:6px;font-size:.75rem;color:#eab308;text-align:center;font-weight:600">${svg('zap',12)} ✨ Premium Custom Link — /${id}</div>` : ''
      const chainBadge = txHash ? `<div style="margin-bottom:10px;font-size:.72rem;color:var(--text-muted);text-align:center">On-chain: <a href="https://testnet.arcscan.app/tx/${txHash}" target="_blank" style="color:var(--green)">${txHash.slice(0,10)}... ${svg('externalLink',11)}</a></div>` : (mock ? '<div style="margin-bottom:10px;font-size:.72rem;color:var(--text-muted);text-align:center">Mock mode - deploy contract to go live</div>' : '')
      document.getElementById('send-form-wrap').style.display = 'none'
      document.getElementById('send-result').innerHTML = `
        <div class="link-success">
          <div style="color:var(--green);display:flex;justify-content:center;margin-bottom:10px">${svg('checkCircle',36)}</div>
          <h3>Your link is ready</h3>
          ${sponsorBadge}
          ${premiumBadge}
          ${chainBadge}
          <div class="link-success-url">
            <span>${url}</span>
            <button class="btn btn-secondary btn-sm" onclick="window.copyText('${url}',this)">${svg('copy',13)} Copy</button>
          </div>
          <img src="${qr}" alt="QR Code" class="qr-img" width="180" height="180">
          <div class="share-btns">
            <button class="share-btn" onclick="window.open('https://wa.me/?text=${encodeURIComponent('Pay me via Parcis: '+url)}','_blank')">${svg('messageCircle',13)} WhatsApp</button>
            <button class="share-btn" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Pay me on Parcis')}','_blank')">${svg('send',13)} Telegram</button>
            <button class="share-btn" onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent('Pay me in USDC instantly: '+url)}','_blank')">${svg('twitter',13)} Twitter</button>
            <button class="share-btn" onclick="window.copyText('${url}',this)">${svg('copy',13)} Copy Link</button>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
            <a href="#/dashboard" class="btn btn-secondary">${svg('dashboard',14)} Dashboard</a>
            <button class="btn btn-ghost" onclick="location.hash='#/send';window.router()">${svg('plus',14)} Create Another</button>
          </div>
        </div>`
      toast('Payment link created', 'success')
    } catch (err) {
      toast(err.message || 'Failed to create link', 'error')
      btn.disabled = false
      btn.innerHTML = `${svg('zap',16)} Generate Link & QR`
      if (statusEl) statusEl.textContent = ''
    }
  })
}

// ─── Copy text ───
window.copyText = (text, btn) => {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.innerHTML
      btn.innerHTML = `${svg('check',13)} Copied`
      setTimeout(() => { btn.innerHTML = orig }, 2000)
    } else toast('Copied', 'success')
  }).catch(() => toast('Copy failed', 'error'))
}
window.copyLinkUrl = (id, btn) => window.copyText(payUrl(id), btn)

// ─── Show QR modal ───
window.showLinkQR = async id => {
  const link = getLink(id)
  if (!link) return
  const url = payUrl(id)
  const qr = await generateQR(url)
  openModal(`
    <h3 style="margin-bottom:14px">${svg('qrCode',16)} ${link.label}</h3>
    <img src="${qr}" alt="QR" style="display:block;margin:0 auto 14px;border-radius:10px;border:1px solid var(--border)" width="200">
    <div style="font-family:monospace;font-size:.75rem;color:var(--text-muted);text-align:center;word-break:break-all;margin-bottom:16px">${url}</div>
    <div class="modal-btns">
      <button class="btn btn-primary" onclick="window.copyText('${url}')">${svg('copy',14)} Copy Link</button>
      <button class="btn btn-secondary" onclick="window.printQR('${qr}')">${svg('printer',14)} Print</button>
    </div>`)
}

window.printQR = dataUrl => {
  const w = window.open('', '_blank')
  w.document.write(`<html><body style="text-align:center;padding:48px;font-family:Inter,sans-serif;background:#fff"><h2 style="color:#22c55e;font-size:1.4rem;margin-bottom:8px">Parcis</h2><p style="color:#666;font-size:.9rem;margin-bottom:24px">Scan to pay with USDC on Arc Network</p><img src="${dataUrl}" style="width:260px;border-radius:12px"><p style="color:#aaa;font-size:.75rem;margin-top:20px">parcis.app</p></body></html>`)
  w.document.close(); w.print()
}

// ─── Pay handler (REAL on-chain USDC transfer) ───
window.handlePay = async (creatorAddress, fixedAmount, type, linkId) => {
  const account = getAccount()
  if (!account) { toast('Connect wallet first', 'warning'); return }

  let amount = parseFloat(fixedAmount)
  if (type === 'open') {
    amount = parseFloat(document.getElementById('pay-open-amount')?.value || 0)
    if (!amount || amount <= 0) { toast('Enter an amount', 'warning'); return }
  }
  if (!amount || amount <= 0) { toast('Invalid amount', 'error'); return }

  const btn = document.getElementById('pay-now-btn')
  const status = document.getElementById('pay-status')

  // ── Gas check ──
  const { canPaySelf, balance } = await checkGasBalance(amount)
  if (!canPaySelf) {
    toast(`Insufficient USDC. You have ${balance.toFixed(4)} USDC but need ${amount} + gas. Get USDC from the faucet.`, 'warning', 7000)
    if (status) status.innerHTML = `<div style="margin-top:12px;padding:10px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:.8rem;color:var(--warning)">Need USDC? <a href="https://faucet.circle.com" target="_blank" style="color:var(--green)">Get from faucet →</a></div>`
    return
  }

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Sending on Arc...` }
  if (status) status.innerHTML = `
    <div style="margin-top:10px;padding:10px 14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:8px;font-size:.78rem;color:var(--text-sec)">
      ${svg('info',13)} <strong>2 MetaMask confirmations required:</strong><br>
      1. Approve USDC spending<br>
      2. Complete payment
    </div>`

  try {
    let hash
    if (isLinksLive()) {
      hash = await payLinkOnChain(linkId, amount)
    } else {
      const res = await sendUSDC(creatorAddress, amount)
      hash = res.hash
    }
    
    recordPayment(linkId, { payer: account, amount, txHash: hash })
    updateGroupProgress(linkId)
    confetti()

    // ── Broadcast postMessage to parent if in modal/iframe ──
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'PARCIS_PAYMENT_SUCCESS',
          txHash: hash,
          amount,
          payer: account,
          linkId: linkId || '',
        }, '*')
      } catch (e) { /* ignore */ }
    }

    const explorerUrl = `https://testnet.arcscan.app/tx/${hash}`
    document.getElementById('pay-action').innerHTML = `
      <div class="pay-success">
        <div class="pay-success-icon">${svg('checkCircle',48)}</div>
        <h3>Payment Sent!</h3>
        <p style="color:var(--text-sec);font-size:.875rem;margin-bottom:14px">${amount} USDC confirmed on Arc Network</p>
        <a href="${explorerUrl}" target="_blank" class="btn btn-secondary btn-sm">${svg('externalLink',13)} View on ArcScan</a>
        <a href="#/" class="btn btn-ghost btn-sm" style="margin-left:8px">${svg('arrowLeft',13)} Home</a>
      </div>`
    if (status) status.innerHTML = ''
    toast(`${amount} USDC sent! Tx: ${hash.slice(0,10)}...`, 'success', 6000)
  } catch (e) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'PARCIS_PAYMENT_ERROR',
          error: e.message || 'Transaction failed',
          linkId: linkId || '',
        }, '*')
      } catch (err) { /* ignore */ }
    }
    toast(e.message || 'Transaction failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg('send',15)} Pay Now` }
    if (status) status.innerHTML = ''
  }
}

// ─── CCTP Cross-Chain Handler (Coming Soon) ───
window.openCCTPModal = (linkId, amount, creatorAddress) => {
  toast('Cross-Chain (CCTP) transfer is coming soon!', 'info', 4000)

  let modal = document.getElementById('cctp-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'cctp-modal'
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:16px;'
    document.body.appendChild(modal)
  }

  modal.innerHTML = `
    <div style="background:#0d0d0f;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:420px;padding:32px 24px;box-shadow:0 24px 48px rgba(0,0,0,0.6);text-align:center;position:relative;animation:modalIn 0.2s cubic-bezier(0.16,1,0.3,1);">
      <button class="btn btn-ghost" style="position:absolute;top:16px;right:16px;padding:6px;min-width:auto;border-radius:8px;" onclick="document.getElementById('cctp-modal').style.display='none'">${svg('x', 18)}</button>
      
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        ${svg('activity', 30)}
      </div>

      <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:var(--green);font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">
        Coming Soon
      </div>

      <h3 style="margin:0 0 10px;font-size:1.25rem;font-weight:700;color:#fff;">Cross-Chain CCTP Transfer</h3>
      <p style="color:var(--text-sec);font-size:0.875rem;line-height:1.5;margin-bottom:24px;">
        Native 1:1 USDC cross-chain bridging via Circle CCTP (Base, Arbitrum, Ethereum, and Solana to Arc) is currently in final testing and will be enabled in the upcoming release.
      </p>

      <button class="btn btn-primary" style="width:100%;padding:12px;border-radius:12px;font-weight:600;font-size:0.95rem;" onclick="document.getElementById('cctp-modal').style.display='none'">
        Got it
      </button>
    </div>
  `
  modal.style.display = 'flex'
}

window.startCCTPBridge = (chainName, amount, linkId) => {
  toast('Cross-Chain (CCTP) transfer is coming soon!', 'info', 4000)
}

// ─── Direct Pay handler (SDK) ───
window.handleDirectPay = async (toAddress, fixedAmount) => {
  const account = getAccount()
  if (!account) { toast('Connect wallet first', 'warning'); return }

  let amount = parseFloat(fixedAmount)
  if (!amount || amount <= 0) {
    amount = parseFloat(document.getElementById('pay-open-amount')?.value || 0)
    if (!amount || amount <= 0) { toast('Enter an amount', 'warning'); return }
  }

  const btn = document.getElementById('pay-now-btn')
  const status = document.getElementById('pay-status')

  // ── Gas check ──
  const { canPaySelf, balance } = await checkGasBalance(amount)
  if (!canPaySelf) {
    toast(`Insufficient USDC. You have ${balance.toFixed(4)} USDC but need ${amount}.`, 'warning', 7000)
    return
  }

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Sending on Arc...` }
  if (status) status.innerHTML = `
    <div style="margin-top:10px;padding:10px 14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:8px;font-size:.78rem;color:var(--text-sec)">
      ${svg('info',13)} Please confirm the transaction in MetaMask...
    </div>`

  try {
    const res = await sendUSDC(toAddress, amount)
    const txHash = res?.hash || res
    
    // Success
    confetti()
    if (status) status.innerHTML = `
      <div style="margin-top:12px;padding:12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;text-align:center">
        <span style="color:var(--green);font-weight:700">${svg('checkCircle',14)} Payment Confirmed!</span><br>
        <a href="${CONFIG.explorerUrl || 'https://explorer.arc.io'}/tx/${txHash}" target="_blank" style="font-size:0.75rem;color:var(--green);text-decoration:underline;margin-top:4px;display:inline-block">View on ArcScan →</a>
      </div>`
    if (btn) btn.innerHTML = `${svg('check',16)} Paid ${amount.toFixed(2)} USDC`

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'PARCIS_PAYMENT_SUCCESS',
        txHash,
        amount,
        payer: account,
        recipient: toAddress
      }, '*')
    }

  } catch (e) {
    console.error('Direct Pay error:', e)
    toast(e.message || 'Payment failed', 'error')
    if (status) status.innerHTML = `
      <div style="margin-top:10px;padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;font-size:0.8rem;color:var(--danger);display:flex;align-items:center;gap:6px;justify-content:center">
        ${svg('xCircle',14)} <span>${e.message || 'Payment failed.'}</span>
      </div>`
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg('send',16)} Pay Now` }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'PARCIS_PAYMENT_ERROR',
        error: e.message || 'Payment failed'
      }, '*')
    }
  }
}

// ─── Instant Dashboard Summary Fetcher (Static Imports — Zero Import Overhead) ───
window.loadDashboardSummary = async (account) => {
  if (!account) return
  try {
    const fmtNum = a => parseFloat(a || 0).toFixed(2)

    // Parallel fetch all 4 dashboard summary metrics — already cached from preflight
    const [balance, links, streams, deals] = await Promise.all([
      getUSDCBalance().catch(() => '0.00'),
      getUserLinks(account).catch(() => []),
      getUserStreams(account).catch(() => []),
      getUserDeals().catch(() => [])
    ])

    const balEl = document.getElementById('dash-balance-val')
    const recEl = document.getElementById('dash-received-val')
    const stmEl = document.getElementById('dash-streams-count')
    const delEl = document.getElementById('dash-deals-count')

    if (balEl) balEl.textContent = `${balance} USDC`
    if (recEl) {
      const totalRec = links.reduce((s, l) => s + linkTotalReceived(l), 0)
      recEl.textContent = `${fmtNum(totalRec)} USDC`
    }
    if (stmEl) stmEl.textContent = `${streams.filter(s => s.isActive).length}`
    if (delEl) delEl.textContent = `${deals.length}`
  } catch (err) {
    console.error('[Dashboard Summary Error]', err)
  }
}

// ─── Tab switch (INSTANT — Static Imports, No Dynamic Overhead) ───
window.switchTab = async (tab, forceRefresh = false) => {
  window._activeDashTab = tab
  const account = getAccount()
  if (!account) return

  // Update active tab buttons instantly (pure DOM, zero async)
  ['links', 'streams', 'deals', 'arbiter'].forEach(t => {
    document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab)
    const c = document.getElementById(`tab-content-${t}`)
    if (c) c.style.display = t === tab ? '' : 'none'
  })

  const target = document.getElementById(`tab-content-${tab}`)
  if (!target) return

  // Reset loaded attribute on force refresh; skip if already loaded
  if (forceRefresh) {
    delete target.dataset.loaded
  } else if (target.dataset.loaded === 'true') {
    return
  }

  // Show inline tab loading spinner
  target.innerHTML = `
    <div class="tab-loading-state">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>`

  try {
    const fmtNum = a => parseFloat(a || 0).toFixed(2)

    if (tab === 'links') {
      const links = await getUserLinks(account)
      const totalReceived = links.reduce((s, l) => s + linkTotalReceived(l), 0)
      const recEl = document.getElementById('dash-received-val')
      if (recEl) recEl.textContent = `${fmtNum(totalReceived)} USDC`
      target.innerHTML = renderLinksTabHtml(links)
    } else if (tab === 'streams') {
      const streams = await getUserStreams(account)
      const countEl = document.getElementById('dash-streams-count')
      if (countEl) countEl.textContent = `${streams.filter(s => s.isActive).length}`
      target.innerHTML = renderStreamsTabHtml(streams, account)
    } else if (tab === 'deals') {
      const deals = await getUserDeals()
      const countEl = document.getElementById('dash-deals-count')
      if (countEl) countEl.textContent = `${deals.length}`
      // Parallel fetch all arbiter details
      const arbiterAddresses = [...new Set(deals.map(d => d.arbiter).filter(Boolean))]
      const arbiterResults = await Promise.all(
        arbiterAddresses.map(addr => getArbiterInfo(addr).catch(() => null).then(info => [addr.toLowerCase(), info]))
      )
      const arbiterMap = Object.fromEntries(arbiterResults)
      target.innerHTML = renderDealsTabHtml(deals, arbiterMap)
    } else if (tab === 'arbiter') {
      const info = await getArbiterInfo(account)
      target.innerHTML = renderArbiterTabHtml(info)
    }

    target.dataset.loaded = 'true'
  } catch (err) {
    console.error(`[SwitchTab Error] Failed to load ${tab}:`, err)
    target.innerHTML = `
      <div class="tab-error-state">
        ${svg('alertTriangle', 28)}
        <h3>Failed to load ${tab}</h3>
        <p style="font-size:0.85rem">${err.message || 'Network request failed'}</p>
        <button class="btn btn-secondary btn-sm" onclick="window.switchTab('${tab}', true)">
          ${svg('rotateCw', 14)} Retry
        </button>
      </div>`
  }
}

// ─── Escrow: Fund ───
window.handleFund = async (id) => {
  // Pre-check USDC balance before showing the modal
  const { getDeal } = await import('./contract.js')
  const { getRawUSDCBalance } = await import('./wallet.js')
  const deal = await getDeal(id)
  if (!deal) { toast('Deal not found', 'error'); return }

  const balance = await getRawUSDCBalance()
  if (balance < deal.amount) {
    toast(`Insufficient USDC. You have ${balance.toFixed(2)} but need ${deal.amount.toFixed(2)} USDC to fund this escrow.`, 'error', 7000)
    return
  }

  openModal(`
    <h3>${svg('lock',16)} Fund Escrow</h3>
    <p class="modal-body" style="margin-top:8px">This locks <strong>${deal.amount.toFixed(2)} USDC</strong> in the smart contract until you approve the delivered work.</p>
    <div style="margin:10px 0;padding:10px 12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:8px;font-size:.78rem;color:var(--text-sec)">
      ${svg('info',13)} <strong>2 confirmations required:</strong><br>
      1. Approve USDC spending<br>
      2. Fund the escrow deal
    </div>
    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:10px">Your balance: ${balance.toFixed(2)} USDC</div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="modal-confirm-btn" onclick="window._doFund(${id})">${svg('check',14)} Confirm</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doFund = async id => {
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Funding...` }
  try {
    await fundDeal(id)
    closeModal()
    confetti()
    toast('Deal funded — USDC is locked in escrow', 'success')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Funding failed', 'error')
  }
}

// ─── Escrow: Submit ───
window.handleSubmit = id => {
  openModal(`
    <h3>${svg('package',16)} Submit Deliverable</h3>
    <div class="form-group" style="margin-top:14px">
      <label>Link or Description</label>
      <input type="text" id="proof-input" placeholder="https://... or describe what was delivered" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font);font-size:.875rem;outline:none;margin-top:6px">
    </div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="modal-confirm-btn" onclick="window._doSubmit(${id})">${svg('check',14)} Submit</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doSubmit = async id => {
  const p = document.getElementById('proof-input')?.value?.trim()
  if (!p) { toast('Enter proof of delivery', 'warning'); return }
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Submitting...` }
  try {
    await submitDeliverable(id, p)
    closeModal()
    toast('Deliverable submitted on-chain', 'success')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Submission failed', 'error')
  }
}

// ─── Escrow: Approve ───
window.handleApprove = id => {
  openModal(`
    <h3>${svg('checkCircle',16)} Approve &amp; Release</h3>
    <p class="modal-body" style="margin-top:8px">This releases the USDC to the worker. <strong>This action cannot be undone.</strong></p>
    <div class="modal-btns">
      <button class="btn btn-primary" id="modal-confirm-btn" onclick="window._doApprove(${id})">${svg('check',14)} Confirm Release</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doApprove = async id => {
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Releasing...` }
  try {
    await approveDeal(id)
    closeModal()
    confetti()
    toast('Payment released to worker', 'success')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Approval failed', 'error')
  }
}

// ─── Escrow: Dispute ───
window.handleDispute = id => {
  openModal(`
    <h3>${svg('alertTriangle',16)} Raise Dispute</h3>
    <p class="modal-body" style="margin-top:8px; margin-bottom:12px;">Explain why you are raising a dispute. This description will be saved on-chain for the arbiter to review.</p>
    <div class="form-group" style="text-align:left;">
      <label>Reason for Dispute</label>
      <textarea id="dispute-reason-input" placeholder="Explain the issue in detail (e.g. deliverable does not match agreement)..." style="width:100%; min-height:80px; padding:10px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:8px; color:#fff; resize:vertical; outline:none; font-family:var(--font); font-size:.875rem; margin-top:6px;"></textarea>
    </div>
    <div class="modal-btns">
      <button class="btn btn-danger" id="modal-confirm-btn" onclick="window._doDispute(${id})">${svg('check',14)} Confirm Dispute</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doDispute = async id => {
  const reason = document.getElementById('dispute-reason-input')?.value?.trim() || ''
  if (!reason) { toast('Please provide a reason for the dispute', 'warning'); return }
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Disputing...` }
  try {
    await disputeDeal(id, reason)
    closeModal()
    toast('Dispute raised — arbiter notified', 'info')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Dispute failed', 'error')
  }
}

// ─── Escrow: Cancel ───
window.handleCancel = id => {
  openModal(`
    <h3>Cancel Deal</h3>
    <p class="modal-body" style="margin-top:8px">The deal hasn't been funded. No funds at risk. This will remove the deal permanently.</p>
    <div class="modal-btns">
      <button class="btn btn-danger" id="modal-confirm-btn" onclick="window._doCancel(${id})">Cancel Deal</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Keep It</button>
    </div>`)
}
window._doCancel = async id => {
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Cancelling...` }
  try {
    await cancelDeal(id)
    closeModal()
    toast('Deal cancelled', 'info')
    location.hash = '#/dashboard'
  } catch (e) {
    closeModal()
    toast(e.message || 'Cancel failed', 'error')
  }
}

// ─── Escrow: Resolve ───
window.handleResolve = (id, forWorker) => {
  openModal(`
    <h3>Resolve Dispute</h3>
    <p class="modal-body" style="margin-top:8px">Ruling: <strong>${forWorker ? 'Worker receives funds' : 'Client is refunded'}</strong>. This decision is final and immediate.</p>
    <div class="modal-btns">
      <button class="btn btn-primary" id="modal-confirm-btn" onclick="window._doResolve(${id},${forWorker})">${svg('check',14)} Confirm</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doResolve = async (id, fw) => {
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Resolving...` }
  try {
    await resolveDispute(id, fw)
    closeModal()
    toast('Dispute resolved', 'success')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Resolution failed', 'error')
  }
}

// ─── Create Deal form ───
function bindCreateForm() {
  const form = document.getElementById('create-deal-form')
  if (!form) return

  // Load platform arbiters list asynchronously when the form is rendered
  const listEl = document.getElementById('platform-arbiters-list')
  if (listEl) {
    (async () => {
      try {
        const { getPlatformArbiters } = await import('./contract.js')
        const arbiters = await getPlatformArbiters()
        if (arbiters.length === 0) {
          listEl.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.85rem;">No platform arbiters currently registered.</div>`
          return
        }
        listEl.innerHTML = arbiters.map((arb, idx) => {
          const selectedClass = idx === 0 ? 'selected' : ''
          if (idx === 0) {
            const hiddenInput = document.getElementById('selected-platform-arbiter')
            if (hiddenInput) hiddenInput.value = arb.address
          }
          
          let tierBadge = 'New'
          let tierColor = 'rgba(255,255,255,0.06)'
          let textColor = 'var(--text-sec)'
          if (arb.weightedScore > 100000) {
            tierBadge = 'Elite'
            tierColor = 'rgba(168,85,247,0.1)'
            textColor = '#c084fc'
          } else if (arb.weightedScore > 15000) {
            tierBadge = 'Active'
            tierColor = 'rgba(59,130,246,0.1)'
            textColor = '#60a5fa'
          }

          const trustColor = arb.trustScore >= 90 ? '#22c55e' : (arb.trustScore >= 50 ? '#eab308' : '#ef4444')

          return `
            <div class="arbiter-card ${selectedClass}" data-address="${arb.address}" onclick="window.selectPlatformArbiter('${arb.address}', this)">
              <div class="arbiter-card-left">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="arbiter-card-address">${arb.address.slice(0, 8)}...${arb.address.slice(-6)}</span>
                  <span class="badge badge-purple" style="text-transform:none; font-weight:600; padding:1px 6px; font-size:0.65rem; border-radius:10px; display:inline-flex; align-items:center; gap:3px; border:none; margin:0; line-height:1;">
                    ${svg('shield', 9)} Verified Pool
                  </span>
                  <span style="background:${tierColor}; color:${textColor}; padding:1px 6px; font-size:0.65rem; border-radius:10px; font-weight:600; text-transform:none; border:none; display:inline-flex; align-items:center; line-height:1;">
                    ${tierBadge} Rating
                  </span>
                </div>
                <span class="arbiter-card-stats">${arb.disputesResolved} disputes resolved • Rank Score: ${arb.weightedScore.toLocaleString()}</span>
              </div>
              <div class="arbiter-card-right">
                <span class="arbiter-card-trust" style="color:${trustColor}">${arb.trustScore}% Trust</span>
                <span class="arbiter-card-stake">${arb.stake} USDC staked</span>
              </div>
            </div>
          `
        }).join('')
      } catch (err) {
        listEl.innerHTML = `<div style="padding:16px; text-align:center; color:var(--danger); font-size:0.85rem;">Failed to load arbiters.</div>`
      }
    })()
  }

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const btn = document.getElementById('create-btn')
    const isValidAddr = a => /^0x[0-9a-fA-F]{40}$/.test(a)

    // ── Resolve input to address (supports 0x address, Parcis slug, or full URL) ──
    async function resolveToAddress(input, fieldName) {
      input = input.trim()
      if (!input) return null

      // Already a valid 0x address — use directly
      if (isValidAddr(input)) return input

      // Extract slug from full URL (e.g. "https://parcis.app/#/pay/devdan" → "devdan")
      let slug = input
      const urlMatch = input.match(/[#/]pay\/([^/?#]+)/)
      if (urlMatch) slug = urlMatch[1]

      // Clean the slug (remove leading/trailing slashes, spaces)
      slug = slug.replace(/^\/+|\/+$/g, '').trim()
      if (!slug) throw new Error(`Invalid ${fieldName} — enter a 0x address or Parcis link name`)

      // Resolve from blockchain
      toast(`Resolving "${slug}" from blockchain...`, 'info', 3000)
      const link = await fetchLinkFromChain(slug)
      if (!link || !link.creator) {
        throw new Error(`No Parcis link found for "${slug}" — check the name and try again`)
      }

      toast(`✓ Resolved "${slug}" → ${link.creator.slice(0,6)}...${link.creator.slice(-4)}`, 'success', 3000)
      return link.creator
    }

    // ── Resolve worker ──
    const workerInput = document.getElementById('deal-worker').value.trim()
    let worker
    try {
      worker = await resolveToAddress(workerInput, 'worker')
    } catch (err) {
      toast(err.message, 'error', 5000)
      document.getElementById('deal-worker').focus()
      return
    }
    if (!worker) {
      toast('Worker is required — enter a 0x address or Parcis link name', 'error', 5000)
      document.getElementById('deal-worker').focus()
      return
    }
    if (worker.toLowerCase() === getAccount()?.toLowerCase()) {
      toast('Worker cannot be your own wallet - enter a different address', 'error', 5000)
      document.getElementById('deal-worker').focus()
      return
    }

    // ── Resolve arbiter ──
    const arbiterType = document.getElementById('arbiter-type-input')?.value || 'platform'
    let arbiter = ''
    if (arbiterType === 'platform') {
      arbiter = document.getElementById('selected-platform-arbiter')?.value || ''
      if (!arbiter) {
        toast('Please select a platform arbiter from the list or switch to Personal Arbiter', 'error')
        return
      }
    } else {
      const arbiterInput = document.getElementById('deal-arbiter').value.trim()
      if (arbiterInput) {
        try {
          arbiter = await resolveToAddress(arbiterInput, 'arbiter')
        } catch (err) {
          toast(err.message, 'error', 5000)
          document.getElementById('deal-arbiter').focus()
          return
        }
      }
    }

    const title = document.getElementById('deal-title').value.trim()
    const description = document.getElementById('deal-desc').value.trim()
    const amount = document.getElementById('deal-amount').value
    const deadline = document.getElementById('deal-deadline').value

    let formattedDeadline = deadline
    try {
      const dDate = new Date(deadline)
      if (!isNaN(dDate.getTime())) {
        formattedDeadline = dDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      }
    } catch (e) {}

    const { getArbiterInfo } = await import('./contract.js')
    const arbiterInfo = arbiter ? await getArbiterInfo(arbiter) : null
    const isPlatform = arbiterInfo ? arbiterInfo.isPlatformArbiter : false

    openModal(`
      <h3 style="margin-bottom: 4px; font-size: 1.2rem; font-weight: 800; text-align: center;">Review Escrow Deal</h3>
      <p style="color: var(--text-sec); font-size: 0.8rem; text-align: center; margin-bottom: 20px;">Confirm details before depositing funds into the escrow.</p>
      
      <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 18px; text-align: left;">
        <div>
          <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Deal Title</span>
          <span style="font-weight: 700; color: var(--text); font-size: 0.95rem;">${title}</span>
        </div>
        
        <div style="border-top: 1px solid var(--border); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div>
            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Escrow Amount</span>
            <span style="font-weight: 800; color: var(--green); font-size: 1.25rem;">${amount} <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-sec)">USDC</span></span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Deadline</span>
            <span style="font-weight: 600; color: var(--text); font-size: 0.85rem;">${formattedDeadline}</span>
          </div>
        </div>
        
        <div style="border-top: 1px solid var(--border); padding-top: 10px;">
          <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Worker Address</span>
          <span style="font-family: monospace; font-size: 0.78rem; color: var(--text); word-break: break-all; font-weight: 600;">${worker}</span>
        </div>
        
        <div style="border-top: 1px solid var(--border); padding-top: 10px;">
          <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Arbiter Role</span>
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
            <span style="font-family: ${arbiter ? 'monospace' : 'inherit'}; font-size: 0.8rem; color: ${arbiter ? 'var(--text)' : 'var(--text-sec)'}; word-break: break-all; font-weight: 600; line-height:1.2;">
              ${arbiter ? arbiter : 'No Arbiter (Trustless Escrow)'}
            </span>
            ${arbiter && arbiter.toLowerCase() !== getAccount()?.toLowerCase() ? (isPlatform ? `
              <span class="badge badge-purple" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0; line-height:1;">
                ${svg('shield', 10)} Verified Platform Arbiter
              </span>
            ` : `
              <span class="badge badge-silver" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0; line-height:1;">
                ${svg('user', 10)} Personal Arbiter
              </span>
            `) : `
              <span class="badge badge-silver" style="text-transform:none; font-weight:600; padding:2px 8px; font-size:0.7rem; border-radius:12px; display:inline-flex; align-items:center; gap:4px; border:none; margin:0; line-height:1;">
                ${svg('user', 10)} Direct Escrow
              </span>
            `}
          </div>
        </div>
      </div>
      
      <div class="modal-btns" style="margin-top: 20px; display: flex; gap: 10px;">
        <button class="btn btn-primary" id="modal-confirm-create-btn" style="flex: 1.5; justify-content: center;">${svg('check', 14)} Confirm & Create</button>
        <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')" style="flex: 1; justify-content: center;">Edit</button>
      </div>
    `)

    document.getElementById('modal-confirm-create-btn').onclick = async () => {
      const confirmBtn = document.getElementById('modal-confirm-create-btn')
      confirmBtn.disabled = true; confirmBtn.innerHTML = `<span class="spinner"></span> Creating...`
      try {
        const id = await createDeal({ title, description, amount, deadline, worker, arbiter })
        closeModal()
        toast('Escrow deal created', 'success')
        location.hash = `#/deal/${id}`
      } catch (err) {
        toast(err.message || 'Failed', 'error')
        confirmBtn.disabled = false; confirmBtn.innerHTML = `${svg('check',14)} Confirm & Create`
      }
    }
  })
}

window.handleRenew = async id => {
  openModal(`
    <h3>Renew Deadline</h3>
    <p class="modal-body" style="margin-top:8px">Extend the deadline to give the worker more time.</p>
    <div class="form-group"><input type="datetime-local" id="renew-deadline" required style="width:100%;padding:10px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:#fff;margin-top:10px"></div>
    <div class="modal-btns">
      <button class="btn btn-primary" id="modal-confirm-btn" onclick="window._doRenew(${id})">${svg('check',14)} Renew</button>
      <button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancel</button>
    </div>`)
}
window._doRenew = async id => {
  const dl = document.getElementById('renew-deadline').value
  if (!dl) return toast('Select a deadline', 'warning')
  const btn = document.getElementById('modal-confirm-btn')
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Renewing...` }
  try {
    const { renewDeal } = await import('./contract.js')
    await renewDeal(id, dl)
    closeModal()
    toast('Deadline extended', 'success')
    router()
  } catch (e) {
    closeModal()
    toast(e.message || 'Renew failed', 'error')
  }
}

window.handleClientWithdraw = async id => {
  showConfirm(
    'Withdraw Funds',
    'The deadline has passed without a deliverable. Withdraw your locked USDC from escrow?',
    async () => {
      const { withdrawExpiredDeal } = await import('./contract.js')
      await withdrawExpiredDeal(id)
      toast('Funds withdrawn successfully', 'success')
      router()
    }
  )
}

window.handleArbiterDead = async id => {
  const { getDeal, fallbackResolve } = await import('./contract.js')
  const deal = await getDeal(id)
  let msg = 'The arbiter did not resolve the dispute within the deadline. Reclaim your locked USDC from escrow?'
  if (deal && deal.preDisputeStatus === 2) {
    msg = 'The arbiter did not resolve the dispute on time. Since you submitted deliverables, the escrow will be split 50/50 between Client and Worker.'
  } else {
    msg = 'The arbiter did not resolve the dispute on time. Since no deliverables were submitted, the Client will receive a 100% refund.'
  }
  
  showConfirm(
    'Fallback Resolution',
    msg,
    async () => {
      await fallbackResolve(id)
      toast('Fallback resolution executed successfully', 'success')
      router()
    }
  )
}

window.handleAppeal = async id => {
  showConfirm(
    'Appeal Arbiter Ruling',
    'Are you sure you want to appeal this resolution? This will escalate the dispute to the platform administrator for a final ruling.',
    async () => {
      const { appealResolution } = await import('./contract.js')
      await appealResolution(id)
      toast('Appeal filed successfully', 'success')
      router()
    }
  )
}

window.handleFinalizeResolution = async id => {
  showConfirm(
    'Finalize Payout',
    'Confirm final payout release. The appeal window has expired, so funds will be distributed according to the arbiter\'s ruling.',
    async () => {
      const { finalizeResolution } = await import('./contract.js')
      await finalizeResolution(id)
      toast('Payout finalized successfully', 'success')
      router()
    }
  )
}

window.handleFinalizeAppeal = async (id, forWorker) => {
  showConfirm(
    'Finalize Appeal',
    `As the Platform Administrator, confirm the final binding decision in favor of the ${forWorker ? 'Worker' : 'Client'}.`,
    async () => {
      const { finalizeAppeal } = await import('./contract.js')
      await finalizeAppeal(id, forWorker)
      toast('Appeal ruling finalized successfully', 'success')
      router()
    }
  )
}

window.handleUpdateMinStake = async (event) => {
  event.preventDefault()
  const val = parseFloat(document.getElementById('new-min-stake')?.value || 0)
  if (!val || val <= 0) return toast('Invalid stake amount', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn.innerHTML
  btn.disabled = true; btn.innerHTML = 'Updating...'
  try {
    const { setMinArbiterStake } = await import('./contract.js')
    await setMinArbiterStake(val)
    toast('Minimum arbiter stake updated successfully!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    btn.disabled = false; btn.innerHTML = original
  }
}

window.handleUpdateAppealDuration = async (event) => {
  event.preventDefault()
  const val = parseInt(document.getElementById('new-appeal-duration')?.value || 0)
  if (!val || val <= 0) return toast('Invalid duration value', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn.innerHTML
  btn.disabled = true; btn.innerHTML = 'Updating...'
  try {
    const { setAppealWindowDuration } = await import('./contract.js')
    await setAppealWindowDuration(val)
    toast('Appeal window duration updated successfully!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    btn.disabled = false; btn.innerHTML = original
  }
}

window.prefillSlash = (address, maxStake) => {
  const addrInput = document.getElementById('slash-address')
  const amtInput = document.getElementById('slash-amount')
  if (addrInput) addrInput.value = address
  if (amtInput) {
    amtInput.value = maxStake
    amtInput.max = maxStake
  }
  toast('Slash form prefilled', 'info')
}

window.handleSlashArbiterSubmit = async (event) => {
  event.preventDefault()
  const address = document.getElementById('slash-address')?.value?.trim() || ''
  const amount = parseFloat(document.getElementById('slash-amount')?.value || 0)
  const reason = document.getElementById('slash-reason')?.value?.trim() || ''

  if (!address || !amount || !reason) {
    return toast('Please fill in all slash fields', 'warning')
  }

  showConfirm(
    'Slash Arbiter Collateral',
    `WARNING: You are about to slash ${amount} USDC from arbiter ${address.slice(0, 6)}...${address.slice(-4)} for "${reason}". Slashed funds will be returned to the platform wallet, and their reputation will be zeroed out. This is irreversible.`,
    async () => {
      const { slashArbiter } = await import('./contract.js')
      await slashArbiter(address, amount, reason)
      toast('Arbiter stake successfully slashed on-chain!', 'success')
      router()
    }
  )
}

// ─── Admin Blockchain Controls Handlers ───
window.handlePauseContract = async (contractName) => {
  const names = {
    safe: 'ParcisSafe (Escrow & Arbitration)',
    links: 'ParcisLinks (Payment Links)',
    streams: 'ParcisStreams (Streaming Payments)'
  }
  const displayName = names[contractName] || contractName

  showConfirm(
    'EMERGENCY: Pause Contract',
    `CRITICAL ACTION: You are about to pause ${displayName}. This will immediately FREEZE contract actions (deposits, creation, transfers) on-chain. Are you sure you want to trigger the circuit breaker?`,
    async () => {
      try {
        toast(`Pausing ${displayName}...`, 'info')
        const { pauseContract } = await import('./contract.js')
        await pauseContract(contractName)
        toast(`${displayName} successfully paused!`, 'success')
        router()
      } catch (e) {
        toast(e.message || 'Pause transaction failed', 'error')
      }
    }
  )
}

window.handleUnpauseContract = async (contractName) => {
  const names = {
    safe: 'ParcisSafe (Escrow & Arbitration)',
    links: 'ParcisLinks (Payment Links)',
    streams: 'ParcisStreams (Streaming Payments)'
  }
  const displayName = names[contractName] || contractName

  showConfirm(
    'Resume Contract Actions',
    `You are about to unpause ${displayName}. Normal operations will resume immediately. Confirm unpause?`,
    async () => {
      try {
        toast(`Resuming ${displayName}...`, 'info')
        const { unpauseContract } = await import('./contract.js')
        await unpauseContract(contractName)
        toast(`${displayName} resumed successfully!`, 'success')
        router()
      } catch (e) {
        toast(e.message || 'Unpause transaction failed', 'error')
      }
    }
  )
}

window.selectContractForTransfer = (key) => {
  const sel = document.getElementById('transfer-contract-select')
  if (sel) {
    sel.value = key
    sel.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const input = document.getElementById('new-owner-input')
  if (input) input.focus()
}

window.handleTransferOwnership = async (event) => {
  event.preventDefault()
  const contractSelect = document.getElementById('transfer-contract-select')
  const contractKey = contractSelect ? contractSelect.value : 'safe'
  const newOwner = document.getElementById('new-owner-input')?.value?.trim() || ''
  
  if (!newOwner || !/^0x[0-9a-fA-F]{40}$/.test(newOwner)) {
    return toast('Please enter a valid 0x Ethereum address (42 characters)', 'warning')
  }

  const contractLabel = contractKey === 'all'
    ? 'ALL 4 protocol contracts (Safe, Links, Streams, Registry)'
    : `${contractKey.toUpperCase()} contract`

  showConfirm(
    'Initiate 2-Step Ownership Transfer',
    `CRITICAL SECURITY CONFIRMATION:\n\nYou are nominating ${newOwner} as the new owner for ${contractLabel}.\n\nUnder OpenZeppelin Ownable2Step rules:\n1. Your current wallet remains owner until the new wallet accepts.\n2. The nominated address must connect to Parcis and call acceptOwnership() to finalize.\n\nDo you want to proceed with this on-chain nomination?`,
    async () => {
      const btn = event.target.querySelector('button[type="submit"]')
      const original = btn ? btn.innerHTML : ''
      if (btn) { btn.disabled = true; btn.innerHTML = 'Submitting on-chain...' }
      try {
        const { transferContractOwnership } = await import('./contract.js')
        await transferContractOwnership(newOwner, contractKey)
        if (typeof _adminAuthCache !== 'undefined') {
          _adminAuthCache = { account: '', authorized: false, timestamp: 0 }
        }
        toast('Ownership transfer nominated! The new wallet must now connect and click "Accept & Claim".', 'success')
        router()
      } catch (e) {
        toast(e.message || 'Ownership transfer failed', 'error')
        if (btn) { btn.disabled = false; btn.innerHTML = original }
      }
    }
  )
}

window.handleAcceptOwnership = async (contractKey = 'all') => {
  const label = contractKey === 'all'
    ? 'all nominated contracts'
    : `${contractKey.toUpperCase()} contract`

  showConfirm(
    'Accept Contract Ownership',
    `You are claiming and finalizing ownership of ${label}. Your connected wallet will become the administrative authority on Arc.`,
    async () => {
      try {
        toast('Signing on-chain acceptance...', 'info')
        const { acceptContractOwnership } = await import('./contract.js')
        await acceptContractOwnership(contractKey)
        if (typeof _adminAuthCache !== 'undefined') {
          _adminAuthCache = { account: '', authorized: false, timestamp: 0 }
        }
        toast('Congratulations! Ownership successfully claimed and verified on-chain!', 'success')
        router()
      } catch (e) {
        toast(e.message || 'Accept ownership failed', 'error')
      }
    }
  )
}

window.handleSetPlatformTreasury = async (event) => {
  event.preventDefault()
  const val = document.getElementById('dev-treasury-input')?.value?.trim() || ''
  if (!val || !/^0x[0-9a-fA-F]{40}$/.test(val)) return toast('Invalid treasury address', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setPlatformTreasury } = await import('./contract.js')
    await setPlatformTreasury(val)
    toast('Platform Treasury address updated!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleSetApiRelayer = async (event) => {
  event.preventDefault()
  const val = document.getElementById('dev-relayer-input')?.value?.trim() || ''
  if (!val || !/^0x[0-9a-fA-F]{40}$/.test(val)) return toast('Invalid relayer address', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setApiRelayer } = await import('./contract.js')
    await setApiRelayer(val)
    toast('API Relayer address updated!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleSetDevRegistryStreams = async (event) => {
  event.preventDefault()
  const val = document.getElementById('dev-streams-input')?.value?.trim() || ''
  if (!val || !/^0x[0-9a-fA-F]{40}$/.test(val)) return toast('Invalid streams contract address', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setDevRegistryStreams } = await import('./contract.js')
    await setDevRegistryStreams(val)
    toast('DevRegistry linked Streams contract updated!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleSetLinksAdmin = async (event) => {
  event.preventDefault()
  const val = document.getElementById('links-admin-input')?.value?.trim() || ''
  if (!val || !/^0x[0-9a-fA-F]{40}$/.test(val)) return toast('Invalid admin address', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setLinksAdmin } = await import('./contract.js')
    await setLinksAdmin(val)
    toast('ParcisLinks admin address updated!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleSetPremiumSlugFee = async (event) => {
  event.preventDefault()
  const val = parseFloat(document.getElementById('links-fee-input')?.value || 0)
  if (isNaN(val) || val < 0) return toast('Invalid slug fee', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setLinksPremiumSlugFee } = await import('./contract.js')
    await setLinksPremiumSlugFee(val)
    toast('Premium slug fee updated successfully!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleSetLinksPlatformWallet = async (event) => {
  event.preventDefault()
  const val = document.getElementById('links-wallet-input')?.value?.trim() || ''
  if (!val || !/^0x[0-9a-fA-F]{40}$/.test(val)) return toast('Invalid wallet address', 'warning')
  const btn = event.target.querySelector('button[type="submit"]')
  const original = btn ? btn.innerHTML : ''
  if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...' }
  try {
    const { setLinksPlatformWallet } = await import('./contract.js')
    await setLinksPlatformWallet(val)
    toast('Links platform fee wallet updated!', 'success')
    router()
  } catch (e) {
    toast(e.message || 'Update failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

// ─── Developers SDK & Interactive Sandbox Controller ───
let activeDevTab = 'html'
let activeSnippetRawText = ''
let resolveAddrTimeout = null
let resolvedCreatorAddress = null

function parseAddressOrSlug(input) {
  if (!input) return ''
  let cleaned = input.trim()
  const match = cleaned.match(/[#/]pay\/([^/?#]+)/)
  if (match) cleaned = match[1]
  else if (cleaned.includes('/pay/')) cleaned = cleaned.split('/pay/')[1]
  else if (cleaned.includes('#/profile/')) cleaned = cleaned.split('#/profile/')[1]
  cleaned = cleaned.split('?')[0].replace(/^\/+|\/+$/g, '').trim()
  return cleaned
}

function loadSDKPreviews() {
  const base = window.location.origin
  if (!document.getElementById('parcis-sdk-script')) {
    const s = document.createElement('script')
    s.id = 'parcis-sdk-script'
    s.src = `${base}/sdk.js`
    document.head.appendChild(s)
  }

  const check = setInterval(() => {
    if (window.Parcis) {
      clearInterval(check)
      window.updateDevSnippet()
    }
  }, 50)
}

window.switchDevTab = (tab) => {
  activeDevTab = tab
  document.querySelectorAll('.dev-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `dtab-${tab}`)
    btn.classList.toggle('btn-primary', btn.id === `dtab-${tab}`)
    btn.classList.toggle('btn-ghost', btn.id !== `dtab-${tab}`)
  })
  window.updateDevSnippet()
}

window.updateDevSnippet = () => {
  const base = window.location.origin
  const type = document.getElementById('cfg-type')?.value || 'pay'
  const rawInput = document.getElementById('cfg-address')?.value?.trim() || ''
  const address = parseAddressOrSlug(rawInput)
  const amount = document.getElementById('cfg-amount')?.value || '25.00'
  const duration = document.getElementById('cfg-duration')?.value || '30'
  const label = document.getElementById('cfg-label')?.value?.trim() || 'Pay for Services'
  const display = document.getElementById('cfg-display')?.value || 'modal'
  const theme = document.getElementById('cfg-theme')?.value || 'dark'

  const durationWrap = document.getElementById('cfg-duration-wrap')
  const labelWrap = document.getElementById('cfg-label-wrap')
  const amountRow = document.getElementById('cfg-amount-row')
  const resolutionEl = document.getElementById('cfg-addr-resolution')

  if (durationWrap) durationWrap.style.display = type === 'stream' ? 'block' : 'none'
  if (labelWrap) labelWrap.style.display = type === 'profile' ? 'none' : 'block'
  if (amountRow) amountRow.style.display = type === 'profile' ? 'none' : 'flex'

  // Debounced On-Chain Address / Slug Lookup
  if (resolutionEl) {
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
      resolvedCreatorAddress = address
      resolutionEl.innerHTML = `<span style="color:var(--green)">✓ Direct 0x Address</span>`
    } else if (address) {
      clearTimeout(resolveAddrTimeout)
      resolutionEl.innerHTML = `<span style="color:var(--text-sec)"><span class="spinner" style="width:10px;height:10px;border-width:1.5px;display:inline-block;vertical-align:middle"></span> Resolving slug...</span>`
      resolveAddrTimeout = setTimeout(async () => {
        try {
          const link = await fetchLinkFromChain(address)
          if (link && link.creator && link.creator !== '0x0000000000000000000000000000000000000000') {
            resolvedCreatorAddress = link.creator
            const short = `${link.creator.slice(0,6)}...${link.creator.slice(-4)}`
            resolutionEl.innerHTML = `<span style="color:var(--green)">✓ Creator: <code>${short}</code></span>`
          } else {
            resolvedCreatorAddress = null
            resolutionEl.innerHTML = `<span style="color:var(--text-muted)">Unregistered slug</span>`
          }
        } catch (e) {
          resolvedCreatorAddress = null
          resolutionEl.innerHTML = `<span style="color:var(--text-muted)">Custom slug</span>`
        }
      }, 400)
    } else {
      resolutionEl.innerHTML = ''
    }
  }

  // Update Live Preview Container
  const previewArea = document.getElementById('sdk-live-preview')
  if (previewArea && window.Parcis) {
    previewArea.innerHTML = ''
    if (type === 'pay') {
      previewArea.appendChild(window.Parcis.createPayButton({ address, amount, label, display, theme }))
    } else if (type === 'stream') {
      previewArea.appendChild(window.Parcis.createStreamButton({ address, amount, duration, label, display, theme }))
    } else if (type === 'profile') {
      const targetAddr = resolvedCreatorAddress || (address.startsWith('0x') ? address : '0xDe460E97D4eb3F3bFdb7FafB299166aDe7C4E1A9')
      previewArea.appendChild(window.Parcis.createProfileCard(targetAddr, { theme }))
    }
  }

  // Generate Syntax-Highlighted Code Output
  const titleEl = document.getElementById('dev-snippet-title')
  const codeEl = document.getElementById('dev-code-output')
  if (!codeEl) return

  const effectiveAddr = resolvedCreatorAddress || address

  if (activeDevTab === 'html') {
    if (titleEl) titleEl.textContent = 'index.html'
    if (type === 'pay') {
      activeSnippetRawText = `<!-- 1. Add the SDK -->\n<script src="${base}/sdk.js"></script>\n\n<!-- 2. Drop a payment button -->\n<parcis-pay\n  address="${address}"\n  amount="${amount}"\n  label="${label}"\n  display="${display}"\n  theme="${theme}"\n></parcis-pay>`
      codeEl.innerHTML = `&lt;!-- 1. Add the SDK --&gt;\n&lt;<span class="c-tag">script</span> <span class="c-attr">src</span>=<span class="c-str">"${base}/sdk.js"</span>&gt;&lt;/<span class="c-tag">script</span>&gt;\n\n&lt;!-- 2. Drop a payment button --&gt;\n&lt;<span class="c-tag">parcis-pay</span>\n  <span class="c-attr">address</span>=<span class="c-str">"${address}"</span>\n  <span class="c-attr">amount</span>=<span class="c-str">"${amount}"</span>\n  <span class="c-attr">label</span>=<span class="c-str">"${label}"</span>\n  <span class="c-attr">display</span>=<span class="c-str">"${display}"</span>\n  <span class="c-attr">theme</span>=<span class="c-str">"${theme}"</span>\n&gt;&lt;/<span class="c-tag">parcis-pay</span>&gt;`
    } else if (type === 'stream') {
      activeSnippetRawText = `<!-- 1. Add the SDK -->\n<script src="${base}/sdk.js"></script>\n\n<!-- 2. Drop a streaming subscription button -->\n<parcis-stream\n  address="${address}"\n  amount="${amount}"\n  duration="${duration}"\n  label="${label}"\n  display="${display}"\n  theme="${theme}"\n></parcis-stream>`
      codeEl.innerHTML = `&lt;!-- 1. Add the SDK --&gt;\n&lt;<span class="c-tag">script</span> <span class="c-attr">src</span>=<span class="c-str">"${base}/sdk.js"</span>&gt;&lt;/<span class="c-tag">script</span>&gt;\n\n&lt;!-- 2. Drop a streaming subscription button --&gt;\n&lt;<span class="c-tag">parcis-stream</span>\n  <span class="c-attr">address</span>=<span class="c-str">"${address}"</span>\n  <span class="c-attr">amount</span>=<span class="c-str">"${amount}"</span>\n  <span class="c-attr">duration</span>=<span class="c-str">"${duration}"</span>\n  <span class="c-attr">label</span>=<span class="c-str">"${label}"</span>\n  <span class="c-attr">display</span>=<span class="c-str">"${display}"</span>\n  <span class="c-attr">theme</span>=<span class="c-str">"${theme}"</span>\n&gt;&lt;/<span class="c-tag">parcis-stream</span>&gt;`
    } else {
      activeSnippetRawText = `<!-- 1. Add the SDK -->\n<script src="${base}/sdk.js"></script>\n\n<!-- 2. Drop an identity profile card -->\n<parcis-profile\n  address="${effectiveAddr}"\n  theme="${theme}"\n></parcis-profile>`
      codeEl.innerHTML = `&lt;!-- 1. Add the SDK --&gt;\n&lt;<span class="c-tag">script</span> <span class="c-attr">src</span>=<span class="c-str">"${base}/sdk.js"</span>&gt;&lt;/<span class="c-tag">script</span>&gt;\n\n&lt;!-- 2. Drop an identity profile card --&gt;\n&lt;<span class="c-tag">parcis-profile</span>\n  <span class="c-attr">address</span>=<span class="c-str">"${effectiveAddr}"</span>\n  <span class="c-attr">theme</span>=<span class="c-str">"${theme}"</span>\n&gt;&lt;/<span class="c-tag">parcis-profile</span>&gt;`
    }
  } else if (activeDevTab === 'react') {
    if (titleEl) titleEl.textContent = 'CheckoutButton.jsx'
    activeSnippetRawText = `import { useEffect } from 'react'\n\nexport function ParcisCheckout() {\n  useEffect(() => {\n    const script = document.createElement('script')\n    script.src = '${base}/sdk.js'\n    script.async = true\n    document.body.appendChild(script)\n  }, [])\n\n  const handlePay = () => {\n    window.Parcis.pay({\n      address: '${address}',\n      amount: '${amount}',\n      display: '${display}',\n      theme: '${theme}',\n      onSuccess: (data) => console.log('Payment complete!', data.txHash),\n      onError: (err) => console.error('Payment error', err),\n    })\n  }\n\n  return (\n    <button onClick={handlePay} className="btn-pay">\n      ${label} ($${amount} USDC)\n    </button>\n  )\n}`
    codeEl.innerHTML = `<span class="c-kw">import</span> { <span class="c-fn">useEffect</span> } <span class="c-kw">from</span> <span class="c-str">'react'</span>\n\n<span class="c-kw">export function</span> <span class="c-fn">ParcisCheckout</span>() {\n  <span class="c-fn">useEffect</span>(() =&gt; {\n    <span class="c-kw">const</span> script = document.<span class="c-fn">createElement</span>(<span class="c-str">'script'</span>)\n    script.<span class="c-attr">src</span> = <span class="c-str">'${base}/sdk.js'</span>\n    script.<span class="c-attr">async</span> = <span class="c-num">true</span>\n    document.body.<span class="c-fn">appendChild</span>(script)\n  }, [])\n\n  <span class="c-kw">const</span> <span class="c-fn">handlePay</span> = () =&gt; {\n    window.<span class="c-fn">Parcis</span>.<span class="c-fn">pay</span>({\n      <span class="c-attr">address</span>: <span class="c-str">'${address}'</span>,\n      <span class="c-attr">amount</span>: <span class="c-str">'${amount}'</span>,\n      <span class="c-attr">display</span>: <span class="c-str">'${display}'</span>,\n      <span class="c-attr">theme</span>: <span class="c-str">'${theme}'</span>,\n      <span class="c-attr">onSuccess</span>: (<span class="c-attr">data</span>) =&gt; console.<span class="c-fn">log</span>(<span class="c-str">'Payment complete!'</span>, data.<span class="c-attr">txHash</span>),\n      <span class="c-attr">onError</span>: (<span class="c-attr">err</span>) =&gt; console.<span class="c-fn">error</span>(<span class="c-str">'Payment error'</span>, err),\n    })\n  }\n\n  <span class="c-kw">return</span> (\n    &lt;<span class="c-tag">button</span> <span class="c-attr">onClick</span>={handlePay} <span class="c-attr">className</span>=<span class="c-str">"btn-pay"</span>&gt;\n      ${label} ($${amount} USDC)\n    &lt;/<span class="c-tag">button</span>&gt;\n  )\n}`
  } else if (activeDevTab === 'sdk') {
    if (titleEl) titleEl.textContent = 'web3-checkout.js'
    if (type === 'pay') {
      activeSnippetRawText = `import { ParcisClient } from './src/sdk/ParcisClient.js'\n\nconst client = new ParcisClient({\n  rpcUrl: '${CONFIG.rpcUrl}',\n  walletClient: customWalletClient,\n})\n\n// 1. Subscribe to transaction lifecycle events\nclient.on('allowance:approved', ({ amountWei }) => console.log('USDC approved!'))\nclient.on('tx:confirmed', ({ hash, blockNumber }) => console.log('Payment confirmed:', hash))\n\n// 2. Pay link with automated USDC approval\ntry {\n  const receipt = await client.payLink('${address}', ${amount})\n  console.log('Transaction hash:', receipt.hash, 'Block:', receipt.blockNumber)\n} catch (err) {\n  console.error('Payment failed:', err.name, err.message)\n}`
      codeEl.innerHTML = `<span class="c-kw">import</span> { <span class="c-fn">ParcisClient</span> } <span class="c-kw">from</span> <span class="c-str">'./src/sdk/ParcisClient.js'</span>\n\n<span class="c-kw">const</span> client = <span class="c-kw">new</span> <span class="c-fn">ParcisClient</span>({\n  <span class="c-attr">rpcUrl</span>: <span class="c-str">'${CONFIG.rpcUrl}'</span>,\n  <span class="c-attr">walletClient</span>: customWalletClient,\n})\n\n<span class="c-comment">// 1. Subscribe to transaction lifecycle events</span>\nclient.<span class="c-fn">on</span>(<span class="c-str">'allowance:approved'</span>, ({ <span class="c-attr">amountWei</span> }) =&gt; console.<span class="c-fn">log</span>(<span class="c-str">'USDC approved!'</span>))\nclient.<span class="c-fn">on</span>(<span class="c-str">'tx:confirmed'</span>, ({ <span class="c-attr">hash</span>, <span class="c-attr">blockNumber</span> }) =&gt; console.<span class="c-fn">log</span>(<span class="c-str">'Payment confirmed:'</span>, hash))\n\n<span class="c-comment">// 2. Pay link with automated USDC approval</span>\n<span class="c-kw">try</span> {\n  <span class="c-kw">const</span> receipt = <span class="c-kw">await</span> client.<span class="c-fn">payLink</span>(<span class="c-str">'${address}'</span>, ${amount})\n  console.<span class="c-fn">log</span>(<span class="c-str">'Transaction hash:'</span>, receipt.<span class="c-attr">hash</span>, <span class="c-str">'Block:'</span>, receipt.<span class="c-attr">blockNumber</span>)\n} <span class="c-kw">catch</span> (err) {\n  console.<span class="c-fn">error</span>(<span class="c-str">'Payment failed:'</span>, err.<span class="c-attr">name</span>, err.<span class="c-attr">message</span>)\n}`
    } else if (type === 'stream') {
      activeSnippetRawText = `import { ParcisClient } from './src/sdk/ParcisClient.js'\n\nconst client = new ParcisClient({ walletClient: customWalletClient })\n\n// Start continuous streaming subscription\nconst stream = await client.startStream({\n  recipient: '${effectiveAddr}',\n  amount: ${amount},\n  durationDays: ${duration},\n})\nconsole.log('Stream started on Arc:', stream.hash)`
      codeEl.innerHTML = `<span class="c-kw">import</span> { <span class="c-fn">ParcisClient</span> } <span class="c-kw">from</span> <span class="c-str">'./src/sdk/ParcisClient.js'</span>\n\n<span class="c-kw">const</span> client = <span class="c-kw">new</span> <span class="c-fn">ParcisClient</span>({ <span class="c-attr">walletClient</span>: customWalletClient })\n\n<span class="c-comment">// Start continuous streaming subscription</span>\n<span class="c-kw">const</span> stream = <span class="c-kw">await</span> client.<span class="c-fn">startStream</span>({\n  <span class="c-attr">recipient</span>: <span class="c-str">'${effectiveAddr}'</span>,\n  <span class="c-attr">amount</span>: ${amount},\n  <span class="c-attr">durationDays</span>: ${duration},\n})\nconsole.<span class="c-fn">log</span>(<span class="c-str">'Stream started on Arc:'</span>, stream.<span class="c-attr">hash</span>)`
    } else {
      activeSnippetRawText = `import { ParcisClient } from './src/sdk/ParcisClient.js'\n\nconst client = new ParcisClient()\n\n// Query reputation and user links\nconst [score, links] = await Promise.all([\n  client.getTrustScore('${effectiveAddr}'),\n  client.getUserLinks('${effectiveAddr}')\n])\nconsole.log('Trust Score:', score.trustScore, score.level)\nconsole.log('Active Links:', links.length)`
      codeEl.innerHTML = `<span class="c-kw">import</span> { <span class="c-fn">ParcisClient</span> } <span class="c-kw">from</span> <span class="c-str">'./src/sdk/ParcisClient.js'</span>\n\n<span class="c-kw">const</span> client = <span class="c-kw">new</span> <span class="c-fn">ParcisClient</span>()\n\n<span class="c-comment">// Query reputation and user links</span>\n<span class="c-kw">const</span> [score, links] = <span class="c-kw">await</span> Promise.<span class="c-fn">all</span>([\n  client.<span class="c-fn">getTrustScore</span>(<span class="c-str">'${effectiveAddr}'</span>),\n  client.<span class="c-fn">getUserLinks</span>(<span class="c-str">'${effectiveAddr}'</span>)\n])\nconsole.<span class="c-fn">log</span>(<span class="c-str">'Trust Score:'</span>, score.<span class="c-attr">trustScore</span>, score.<span class="c-attr">level</span>)\nconsole.<span class="c-fn">log</span>(<span class="c-str">'Active Links:'</span>, links.<span class="c-attr">length</span>)`
    }
  } else if (activeDevTab === 'node') {
    if (titleEl) titleEl.textContent = 'fetch-api.js'
    activeSnippetRawText = `// REST API Query\nconst res = await fetch('${base}/api/score?address=${effectiveAddr}')\nconst data = await res.json()\nconsole.log('Trust score:', data.trustScore, data.level)\n\nconst linkRes = await fetch('${base}/api/link?id=${address}')\nconst linkData = await linkRes.json()\nconsole.log('Link data:', linkData)`
    codeEl.innerHTML = `<span class="c-comment">// REST API Query</span>\n<span class="c-kw">const</span> res = <span class="c-kw">await</span> <span class="c-fn">fetch</span>(<span class="c-str">'${base}/api/score?address=${effectiveAddr}'</span>)\n<span class="c-kw">const</span> data = <span class="c-kw">await</span> res.<span class="c-fn">json</span>()\nconsole.<span class="c-fn">log</span>(<span class="c-str">'Trust score:'</span>, data.<span class="c-attr">trustScore</span>, data.<span class="c-attr">level</span>)\n\n<span class="c-kw">const</span> linkRes = <span class="c-kw">await</span> <span class="c-fn">fetch</span>(<span class="c-str">'${base}/api/link?id=${address}'</span>)\n<span class="c-kw">const</span> linkData = <span class="c-kw">await</span> linkRes.<span class="c-fn">json</span>()\nconsole.<span class="c-fn">log</span>(<span class="c-str">'Link data:'</span>, linkData)`
  } else if (activeDevTab === 'python') {
    if (titleEl) titleEl.textContent = 'check_reputation.py'
    activeSnippetRawText = `import requests\n\n# Query Trust Score API on Arc Network\nurl = "${base}/api/score"\nparams = {"address": "${effectiveAddr}"}\n\nresponse = requests.get(url, params=params)\ndata = response.json()\n\nprint(f"Trust Score: {data.get('trustScore')} ({data.get('level')})")\nprint(f"Completion Rate: {data.get('breakdown', {}).get('completionRate')}%")`
    codeEl.innerHTML = `<span class="c-kw">import</span> requests\n\n<span class="c-comment"># Query Trust Score API on Arc Network</span>\nurl = <span class="c-str">"${base}/api/score"</span>\nparams = {<span class="c-str">"address"</span>: <span class="c-str">"${effectiveAddr}"</span>}\n\nresponse = requests.<span class="c-fn">get</span>(url, params=params)\ndata = response.<span class="c-fn">json</span>()\n\n<span class="c-kw">print</span>(<span class="c-str">f"Trust Score: {data.get('trustScore')} ({data.get('level')})"</span>)\n<span class="c-kw">print</span>(<span class="c-str">f"Completion Rate: {data.get('breakdown', {}).get('completionRate')}%"</span>)`
  } else if (activeDevTab === 'curl') {
    if (titleEl) titleEl.textContent = 'terminal'
    activeSnippetRawText = `# Query Trust Score API\ncurl -X GET "${base}/api/score?address=${effectiveAddr}" \\\n  -H "Accept: application/json"\n\n# Query Payment Link Metadata\ncurl -X GET "${base}/api/link?id=${address}" \\\n  -H "Accept: application/json"`
    codeEl.innerHTML = `<span class="c-comment"># Query Trust Score API</span>\ncurl -X GET <span class="c-str">"${base}/api/score?address=${effectiveAddr}"</span> \\\n  -H <span class="c-str">"Accept: application/json"</span>\n\n<span class="c-comment"># Query Payment Link Metadata</span>\ncurl -X GET <span class="c-str">"${base}/api/link?id=${address}"</span> \\\n  -H <span class="c-str">"Accept: application/json"</span>`
  }
}

window.copyActiveDevSnippet = (btn) => {
  if (!activeSnippetRawText) {
    const codeEl = document.getElementById('dev-code-output')
    activeSnippetRawText = codeEl?.textContent || ''
  }
  navigator.clipboard.writeText(activeSnippetRawText)
  const orig = btn.innerHTML
  btn.innerHTML = `${svg('check', 13)} Copied!`
  setTimeout(() => { btn.innerHTML = orig }, 2000)
}

// ─── REST API Explorer Handlers ───
const apiHistory = []

window.renderApiHistory = () => {
  const listEl = document.getElementById('api-exp-history-list')
  if (!listEl) return
  if (apiHistory.length === 0) {
    listEl.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No recent requests in this session.</div>'
    return
  }

  listEl.innerHTML = apiHistory.map((h, idx) => {
    const statusColor = h.ok ? 'var(--green)' : 'var(--danger)'
    const statusBg = h.ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; font-size:0.75rem;">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
          <span style="font-weight:700; color:${statusColor}; background:${statusBg}; padding:2px 6px; border-radius:4px;">${h.status || 'ERR'}</span>
          <span class="mono" style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${h.url}">
            GET /api/${h.endpoint}${h.param ? `?${h.param}` : ''}
          </span>
          <span style="color:var(--text-muted);">${h.latency}ms</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:var(--text-muted); font-size:0.7rem;">${h.time}</span>
          <button class="btn btn-ghost btn-xs" onclick="window.replayApiHistory(${idx})" style="padding:2px 6px; font-size:0.7rem;" title="Re-run Query">
            ${svg('refresh', 11)} Run
          </button>
        </div>
      </div>
    `
  }).join('')
}

window.replayApiHistory = (idx) => {
  const item = apiHistory[idx]
  if (!item) return
  const endpointSelect = document.getElementById('api-exp-endpoint')
  const paramInput = document.getElementById('api-exp-param')
  if (endpointSelect) endpointSelect.value = item.endpoint
  if (paramInput) paramInput.value = item.param || ''
  window.handleApiEndpointChange()
  if (paramInput) paramInput.value = item.param || ''
  window.executeApiExplorerQuery()
}

window.clearApiHistory = () => {
  apiHistory.length = 0
  window.renderApiHistory()
  toast('Request history cleared', 'info')
}

window.applyApiPreset = (preset) => {
  const endpointSelect = document.getElementById('api-exp-endpoint')
  const paramInput = document.getElementById('api-exp-param')
  const preview = document.getElementById('api-exp-url-preview')
  const base = window.location.origin

  const presets = {
    'score': { endpoint: 'score', param: 'address=0xDe4600000000000000000000000000000000aDe7' },
    'link-slug': { endpoint: 'link', param: 'id=sample' },
    'links-user': { endpoint: 'link', param: 'address=0xDe4600000000000000000000000000000000aDe7' },
    'deal': { endpoint: 'deal', param: 'id=1' },
    'deals-user': { endpoint: 'deal', param: 'address=0xDe4600000000000000000000000000000000aDe7' },
    'stream': { endpoint: 'stream', param: 'id=1' },
    'arbiters': { endpoint: 'arbiters', param: '' },
    'health': { endpoint: 'health', param: '' },
  }

  const config = presets[preset]
  if (!config) return

  if (endpointSelect) endpointSelect.value = config.endpoint
  if (paramInput) {
    paramInput.value = config.param
    paramInput.disabled = config.endpoint === 'arbiters' || config.endpoint === 'health'
  }
  if (preview) {
    const q = config.param ? `?${config.param}` : ''
    preview.textContent = `${base}/api/${config.endpoint}${q}`
  }

  window.executeApiExplorerQuery()
}

window.handleApiEndpointChange = () => {
  const endpoint = document.getElementById('api-exp-endpoint')?.value || 'score'
  const paramInput = document.getElementById('api-exp-param')
  const preview = document.getElementById('api-exp-url-preview')
  const base = window.location.origin

  const defaults = {
    score: 'address=0xDe4600000000000000000000000000000000aDe7',
    link: 'id=sample',
    deal: 'id=1',
    stream: 'id=1',
    arbiters: '',
    health: '',
  }

  if (paramInput) {
    paramInput.value = defaults[endpoint] || ''
    paramInput.placeholder = defaults[endpoint] || 'None required'
    paramInput.disabled = endpoint === 'arbiters' || endpoint === 'health'
  }

  if (preview) {
    const q = defaults[endpoint] ? `?${defaults[endpoint]}` : ''
    preview.textContent = `${base}/api/${endpoint}${q}`
  }
}

window.copyApiResponseJson = (btn) => {
  const text = document.getElementById('api-exp-response')?.textContent || ''
  if (!text || text.startsWith('Click "Send Request"')) {
    toast('No response to copy yet. Send a request first.', 'info')
    return
  }
  navigator.clipboard.writeText(text)
  if (btn) {
    const orig = btn.innerHTML
    btn.innerHTML = `${svg('check', 12)} Copied!`
    setTimeout(() => { btn.innerHTML = orig }, 2000)
  }
  toast('JSON response copied to clipboard', 'success')
}

window.copyApiCurlCommand = (btn) => {
  const preview = document.getElementById('api-exp-url-preview')?.textContent || ''
  if (!preview) return
  const cmd = `curl -X GET "${preview}" -H "Accept: application/json"`
  navigator.clipboard.writeText(cmd)
  if (btn) {
    const orig = btn.innerHTML
    btn.innerHTML = `${svg('check', 12)} Copied!`
    setTimeout(() => { btn.innerHTML = orig }, 2000)
  }
  toast('cURL command copied to clipboard', 'success')
}

window.executeApiExplorerQuery = async () => {
  const endpoint = document.getElementById('api-exp-endpoint')?.value || 'score'
  const paramVal = document.getElementById('api-exp-param')?.value?.trim() || ''
  const responseEl = document.getElementById('api-exp-response')
  const metaEl = document.getElementById('api-exp-meta')
  const preview = document.getElementById('api-exp-url-preview')
  const btn = document.getElementById('api-exp-send-btn')
  const diagnosticBanner = document.getElementById('api-exp-diagnostic-banner')
  const base = window.location.origin

  const url = `${base}/api/${endpoint}${paramVal ? (paramVal.startsWith('?') ? paramVal : `?${paramVal}`) : ''}`
  if (preview) preview.textContent = url

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Querying...` }
  if (responseEl) responseEl.textContent = 'Executing query on Arc...'
  if (metaEl) metaEl.textContent = 'Fetching...'
  if (diagnosticBanner) diagnosticBanner.style.display = 'none'

  const start = performance.now()
  let statusCode = 0
  let isOk = false

  try {
    const res = await fetch(url)
    statusCode = res.status
    isOk = res.ok
    const latency = Math.round(performance.now() - start)
    const json = await res.json()

    if (metaEl) metaEl.innerHTML = `<span style="color:${res.ok ? 'var(--green)' : 'var(--danger)'}">HTTP ${res.status} ${res.statusText}</span> • ${latency}ms`
    if (responseEl) responseEl.textContent = JSON.stringify(json, null, 2)

    if (diagnosticBanner) {
      if (!res.ok || json.error) {
        diagnosticBanner.style.display = 'block'
        diagnosticBanner.style.background = 'rgba(239, 68, 68, 0.12)'
        diagnosticBanner.style.border = '1px solid rgba(239, 68, 68, 0.3)'
        diagnosticBanner.style.color = '#fca5a5'
        diagnosticBanner.innerHTML = `<strong>⚠️ Response Status (${res.status}):</strong> ${json.error || json.message || 'Error executing request'}. Check parameter format or network status.`
      } else {
        diagnosticBanner.style.display = 'block'
        diagnosticBanner.style.background = 'rgba(34, 197, 94, 0.1)'
        diagnosticBanner.style.border = '1px solid rgba(34, 197, 94, 0.25)'
        diagnosticBanner.style.color = '#86efac'
        diagnosticBanner.innerHTML = `<strong>✓ 200 OK:</strong> Live response received from Arc Testnet (${latency}ms).`
        setTimeout(() => { if (diagnosticBanner) diagnosticBanner.style.display = 'none' }, 5000)
      }
    }

    // Add to history
    apiHistory.unshift({
      endpoint,
      param: paramVal,
      url,
      status: res.status,
      ok: res.ok,
      latency,
      time: new Date().toLocaleTimeString(),
    })
    if (apiHistory.length > 10) apiHistory.pop()
    window.renderApiHistory()

  } catch (err) {
    const latency = Math.round(performance.now() - start)
    if (metaEl) metaEl.innerHTML = `<span style="color:var(--danger)">Network Error</span> • ${latency}ms`
    if (responseEl) responseEl.textContent = JSON.stringify({ error: err.message }, null, 2)

    if (diagnosticBanner) {
      diagnosticBanner.style.display = 'block'
      diagnosticBanner.style.background = 'rgba(239, 68, 68, 0.12)'
      diagnosticBanner.style.border = '1px solid rgba(239, 68, 68, 0.3)'
      diagnosticBanner.style.color = '#fca5a5'
      diagnosticBanner.innerHTML = `<strong>⚠️ Network Error:</strong> ${err.message}. If running locally, ensure <code>npm run dev</code> is active.`
    }

    apiHistory.unshift({
      endpoint,
      param: paramVal,
      url,
      status: 'ERR',
      ok: false,
      latency,
      time: new Date().toLocaleTimeString(),
    })
    if (apiHistory.length > 10) apiHistory.pop()
    window.renderApiHistory()

  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg('send', 14)} Send Request` }
  }
}

// ─── Nav active ───
function setNavActive(page) {
  document.querySelectorAll('.nav-link').forEach(l => {
    const isExact = l.dataset.page === page
    const isDevParent = (l.id === 'nav-developers' && (page === 'developers' || page === 'console' || page === 'docs'))
    l.classList.toggle('active', isExact || isDevParent)
  })
  document.querySelectorAll('.nav-dropdown-item').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page)
  })
}

const mobileBtn = document.getElementById('mobile-menu-btn')
const navLinks = document.getElementById('nav-links')

if (mobileBtn && navLinks) {
  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = navLinks.classList.toggle('open')
    mobileBtn.classList.toggle('open', isOpen)
  })

  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('.nav-dropdown-trigger')) return
    navLinks.classList.remove('open')
    mobileBtn.classList.remove('open')
  })

  document.addEventListener('click', (e) => {
    const mainNav = document.getElementById('main-nav')
    if (mainNav && !mainNav.contains(e.target)) {
      navLinks.classList.remove('open')
      mobileBtn.classList.remove('open')
    }
  })
}

// ─── Nav Dropdown (Developers) ───
const devDropdown = document.getElementById('nav-dev-dropdown')
const devTrigger = document.getElementById('nav-developers')

if (devDropdown && devTrigger) {
  devTrigger.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    devDropdown.classList.toggle('open')
  })

  document.addEventListener('click', (e) => {
    if (!devDropdown.contains(e.target)) {
      devDropdown.classList.remove('open')
    }
  })

  devDropdown.querySelectorAll('.nav-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      devDropdown.classList.remove('open')
    })
  })
}

// ─── STREAMS ───
window.handleSubscribe = async (creator, explicitAmount, explicitDays) => {
  const btn = document.getElementById('stream-now-btn')
  const statusEl = document.getElementById('pay-status')
  if (!btn) return

  let days = explicitDays !== undefined && explicitDays !== null ? parseInt(explicitDays) : null
  let amount = explicitAmount !== undefined && explicitAmount !== null ? parseFloat(explicitAmount) : null

  if (!days) {
    const daysEl = document.getElementById('stream-days')
    if (daysEl) days = parseInt(daysEl.value)
  }
  if (!amount) {
    const amountEl = document.getElementById('stream-amount')
    if (amountEl) amount = parseFloat(amountEl.value)
  }

  if (!days || days <= 0 || !amount || amount <= 0) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',16)} Invalid duration or amount</div>`
    else toast('Invalid duration or amount for stream', 'error')
    return
  }

  try {
    btn.disabled = true
    btn.innerHTML = `${svg('zap',16)} Starting Stream...`
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-info">${svg('activity',14)} Approving USDC & initiating stream...</div>`

    // Dynamic import to avoid circular deps
    const { createStream } = await import('./contract.js')
    const durationInSeconds = days * 24 * 60 * 60

    const tx = await createStream(creator, amount, durationInSeconds)
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-success">${svg('checkCircle',16)} Stream started! (TX: ${shortAddr(tx)})</div>`
    toast('Stream started successfully!', 'success')
    setTimeout(() => {
      window._activeDashTab = 'streams'
      location.hash = '#/dashboard?tab=streams'
      setTimeout(() => {
        if (window.switchTab) window.switchTab('streams', true)
      }, 100)
    }, 1500)
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',16)} ${err.message || 'Failed to start stream'}</div>`
    btn.disabled = false
    btn.innerHTML = `${svg('zap',16)} Start Stream`
  }
}

window.handleWithdrawStream = async (id, event) => {
  if (event) event.stopPropagation()
  const btn = event ? event.currentTarget : null
  const original = btn ? btn.innerHTML : ''
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = 'Withdrawing...' }
    const { withdrawStream } = await import('./contract.js')
    await withdrawStream(id)
    toast('Withdrawal successful! USDC sent to your wallet.', 'success')
    if (window.switchTab) window.switchTab('streams', true)
  } catch (err) {
    toast(err.message || 'Withdrawal failed', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = original }
  }
}

window.handleCancelStream = async (id, event) => {
  if (event) event.stopPropagation()
  showConfirm(
    'Cancel Stream & Refund',
    'Are you sure you want to cancel this stream? Remaining unstreamed USDC will be refunded to your wallet immediately, and the stream will stop.',
    async () => {
      try {
        toast('Cancelling stream on Arc Network...', 'info')
        const { cancelStream } = await import('./contract.js')
        await cancelStream(id)
        toast('Stream canceled and unused USDC refunded!', 'success')
        if (window.switchTab) window.switchTab('streams', true)
      } catch (err) {
        toast(err.message || 'Cancel stream failed', 'error')
      }
    }
  )
}

// ─── Dashboard: Create Stream Modal ───
window.setStreamPurpose = (title) => {
  const input = document.getElementById('modal-stream-title')
  if (input) input.value = title
  document.querySelectorAll('.purpose-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.trim().toLowerCase() === title.trim().toLowerCase())
  })
}

window.openCreateStreamModal = () => {
  openModal(`
    <div style="max-width:460px;margin:0 auto;text-align:left;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);display:flex;align-items:center;justify-content:center;color:var(--green)">${svg('zap', 20)}</div>
        <div>
          <h3 style="margin:0;font-size:1.2rem;color:#fff;font-weight:800;">Start a Money Stream</h3>
          <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-sec);">Continuous per-second USDC streaming on Arc</p>
        </div>
      </div>

      <!-- Stream Purpose / Title -->
      <div class="form-group" style="margin-bottom:14px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--text-sec)">Stream Title / Purpose</label>
        <input type="text" id="modal-stream-title" placeholder="e.g. Monthly Engineering Retainer" style="width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:#fff;font-size:0.85rem;">
        <div class="stream-purpose-chips">
          <span class="purpose-chip" onclick="window.setStreamPurpose('Retainer')">Retainer</span>
          <span class="purpose-chip" onclick="window.setStreamPurpose('Payroll')">Payroll</span>
          <span class="purpose-chip" onclick="window.setStreamPurpose('SaaS Subscription')">SaaS</span>
          <span class="purpose-chip" onclick="window.setStreamPurpose('Freelance Project')">Freelance</span>
          <span class="purpose-chip" onclick="window.setStreamPurpose('Grant')">Grant</span>
        </div>
      </div>

      <!-- Recipient Address -->
      <div class="form-group" style="margin-bottom:14px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-sec)">Recipient Wallet Address</label>
        <input type="text" id="modal-stream-recipient" placeholder="0x..." style="width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:#fff;font-family:monospace;font-size:0.85rem;" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div class="form-group">
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-sec)">Total Amount (USDC)</label>
          <input type="number" id="modal-stream-amount" placeholder="50.00" min="0.01" step="0.01" style="width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:#fff;" required oninput="window.calcStreamRatePreview()">
        </div>
        <div class="form-group">
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-sec)">Duration (Days)</label>
          <input type="number" id="modal-stream-days" value="30" min="1" step="1" style="width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:#fff;" required oninput="window.calcStreamRatePreview()">
        </div>
      </div>

      <!-- Optional Memo / Notes -->
      <div class="form-group" style="margin-bottom:14px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--text-sec)">Description / Notes (Optional)</label>
        <textarea id="modal-stream-memo" placeholder="Optional deliverables, milestone notes, or purpose details..." rows="2" style="width:100%;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:#fff;font-size:0.82rem;font-family:inherit;resize:none;"></textarea>
      </div>

      <div id="modal-stream-rate-preview" style="padding:10px 12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;font-size:0.8rem;color:var(--text-sec);margin-bottom:16px;">
        ${svg('activity', 13)} Rate: <strong style="color:var(--green);" id="modal-stream-rate-val">-- USDC/day</strong> · Cancel anytime with auto-refund
      </div>

      <div id="modal-stream-status" style="margin-bottom:12px;"></div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="modal-stream-submit-btn" onclick="window.handleCreateStreamFromModal()">${svg('zap',15)} Start Stream</button>
      </div>
    </div>
  `)
}

window.calcStreamRatePreview = () => {
  const amt = parseFloat(document.getElementById('modal-stream-amount')?.value || 0)
  const days = parseInt(document.getElementById('modal-stream-days')?.value || 0)
  const preview = document.getElementById('modal-stream-rate-val')
  if (!preview) return
  if (amt > 0 && days > 0) {
    const perDay = (amt / days).toFixed(4)
    preview.textContent = `${perDay} USDC/day`
  } else {
    preview.textContent = `-- USDC/day`
  }
}

window.handleCreateStreamFromModal = async () => {
  const title = document.getElementById('modal-stream-title')?.value?.trim() || ''
  const memo = document.getElementById('modal-stream-memo')?.value?.trim() || ''
  const recipient = document.getElementById('modal-stream-recipient')?.value?.trim()
  const amtStr = document.getElementById('modal-stream-amount')?.value
  const daysStr = document.getElementById('modal-stream-days')?.value
  const statusEl = document.getElementById('modal-stream-status')
  const btn = document.getElementById('modal-stream-submit-btn')

  if (!recipient || !/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',14)} Invalid recipient address</div>`
    return
  }

  const account = getAccount()
  if (account && recipient.toLowerCase() === account.toLowerCase()) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',14)} Cannot stream to your own address</div>`
    return
  }

  const amount = parseFloat(amtStr)
  const days = parseInt(daysStr)

  if (!amount || amount <= 0 || !days || days <= 0) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',14)} Please enter a valid amount and duration</div>`
    return
  }

  try {
    if (btn) { btn.disabled = true; btn.innerHTML = `${svg('zap',15)} Starting Stream...` }
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-info">${svg('activity',14)} Approving USDC & initiating stream...</div>`

    const { createStream } = await import('./contract.js')
    const durationInSeconds = days * 24 * 60 * 60
    await createStream(recipient, amount, durationInSeconds, title, memo)

    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-success">${svg('checkCircle',14)} Stream activated!</div>`
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg('check',15)} Activated!` }
    toast('Stream created successfully!', 'success')
    setTimeout(() => {
      closeModal()
      if (window.switchTab) window.switchTab('streams', true)
      else if (typeof router === 'function') router()
    }, 900)
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="status-msg status-error">${svg('xCircle',14)} ${err.message || 'Stream failed'}</div>`
    if (btn) { btn.disabled = false; btn.innerHTML = `${svg('zap',15)} Start Stream` }
  }
}

// ─── V2 Arbiter Actions ───
window.selectArbiterType = type => {
  const input = document.getElementById('arbiter-type-input')
  if (input) input.value = type
  
  const platOpt = document.getElementById('arbiter-type-platform')
  const persOpt = document.getElementById('arbiter-type-personal')
  const platGrp = document.getElementById('platform-arbiter-group')
  const persGrp = document.getElementById('personal-arbiter-group')
  
  if (type === 'platform') {
    platOpt?.classList.add('selected')
    persOpt?.classList.remove('selected')
    if (platGrp) platGrp.style.display = ''
    if (persGrp) persGrp.style.display = 'none'
  } else {
    platOpt?.classList.remove('selected')
    persOpt?.classList.add('selected')
    if (platGrp) platGrp.style.display = 'none'
    if (persGrp) persGrp.style.display = ''
  }
}

window.selectPlatformArbiter = (address, cardEl) => {
  const hiddenInput = document.getElementById('selected-platform-arbiter')
  if (hiddenInput) hiddenInput.value = address
  document.querySelectorAll('.arbiter-card').forEach(el => el.classList.remove('selected'))
  cardEl.classList.add('selected')
}

window.handleRegisterArbiter = async (event) => {
  event.preventDefault()
  const amountInput = document.getElementById('arbiter-stake-amount')
  const amount = parseFloat(amountInput?.value || 0)
  if (!amount || amount < CONFIG.minArbiterStake) {
    toast(`Minimum stake is ${CONFIG.minArbiterStake} USDC`, 'warning')
    return
  }
  const btn = document.getElementById('register-arbiter-btn')
  const originalHtml = btn.innerHTML
  btn.disabled = true
  btn.innerHTML = `<span class="spinner"></span> Approving &amp; Staking...`
  try {
    const { registerAsArbiter } = await import('./contract.js')
    await registerAsArbiter(amount)
    toast('Successfully registered as a platform arbiter!', 'success')
    confetti()
    router()
  } catch (e) {
    toast(e.message || 'Staking failed', 'error')
    btn.disabled = false
    btn.innerHTML = originalHtml
  }
}

window.handleWithdrawArbiterStake = async () => {
  showConfirm(
    'Resign & Withdraw Stake',
    'Are you sure you want to resign from the platform arbiter pool and withdraw your staked USDC?',
    async () => {
      const { withdrawArbiterStake } = await import('./contract.js')
      await withdrawArbiterStake()
      toast('Arbiter stake withdrawn successfully!', 'success')
      router()
    }
  )
}

// Stream Ticker Animation (Continuous real-time flow)
setInterval(() => {
  const tickers = document.querySelectorAll('.stream-ticker')
  if (!tickers.length) return

  const now = Math.floor(Date.now() / 1000)
  tickers.forEach(el => {
    const isActive = el.dataset.active !== 'false'
    const start = parseInt(el.dataset.start)
    const stop = parseInt(el.dataset.stop)
    const deposit = parseFloat(el.dataset.deposit)
    const withdrawn = parseFloat(el.dataset.withdrawn || 0)
    const role = el.dataset.role || 'recipient'
    const id = el.dataset.id

    // If stream is ended/cancelled and inactive, show settled totals without phantom ticks
    if (!isActive) {
      if (role === 'recipient') {
        el.textContent = withdrawn.toFixed(6)
      } else {
        const finalStreamed = Math.max(0, deposit - parseFloat(el.dataset.refundable || 0))
        el.textContent = finalStreamed.toFixed(6)
      }
      return
    }

    let totalStreamed = 0
    if (now >= stop) {
      totalStreamed = deposit
    } else if (now > start) {
      const elapsed = now - start
      const duration = Math.max(1, stop - start)
      totalStreamed = (deposit * elapsed) / duration
    }

    el.textContent = totalStreamed.toFixed(6)

    // Update card-level withdrawable/refundable
    if (role === 'recipient') {
      const withdrawableEl = document.getElementById(`stream-withdrawable-${id}`)
      if (withdrawableEl) {
        const withdrawable = Math.max(0, totalStreamed - withdrawn)
        withdrawableEl.textContent = withdrawable.toFixed(4)
      }
    } else {
      const refundableEl = document.getElementById(`stream-refundable-${id}`)
      if (refundableEl) {
        const refundable = Math.max(0, deposit - totalStreamed)
        refundableEl.textContent = refundable.toFixed(4)
      }
    }

    // Update detail page elements if present
    const detailWithdrawEl = document.getElementById('detail-stream-withdrawable')
    if (detailWithdrawEl && el.id === 'detail-stream-ticker') {
      const wAmt = Math.max(0, totalStreamed - withdrawn)
      detailWithdrawEl.textContent = wAmt.toFixed(4) + ' USDC'
    }
    const detailRefundEl = document.getElementById('detail-stream-refundable')
    if (detailRefundEl && el.id === 'detail-stream-ticker') {
      const rAmt = Math.max(0, deposit - totalStreamed)
      detailRefundEl.textContent = rAmt.toFixed(4) + ' USDC'
    }
    const detailProgressEl = document.getElementById('detail-stream-progress-fill')
    if (detailProgressEl && el.id === 'detail-stream-ticker') {
      let pct = 0
      if (now >= stop || !isActive) pct = 100
      else if (now > start) pct = Math.min(100, ((now - start) / Math.max(1, stop - start)) * 100)
      detailProgressEl.style.width = pct + '%'
      const pctEl = document.getElementById('detail-stream-progress-pct')
      if (pctEl) pctEl.textContent = pct.toFixed(1) + '%'
    }
  })
}, 50)

// ─── Admin Access Authorization (Whitelist or On-Chain Protocol Owner/Nominee) ───
let _adminAuthCache = { account: '', authorized: false, timestamp: 0 }

async function isAuthorizedAdmin(account) {
  if (!account) return false
  if (isAdminWallet(account)) return true

  const now = Date.now()
  if (_adminAuthCache.account === account.toLowerCase() && (now - _adminAuthCache.timestamp) < 30000) {
    return _adminAuthCache.authorized
  }

  try {
    const { getAllContractsOwnership } = await import('./contract.js')
    const ao = await getAllContractsOwnership()
    const authorized = (ao.ownedCount > 0 || ao.hasPendingClaims)
    _adminAuthCache = { account: account.toLowerCase(), authorized, timestamp: now }
    return authorized
  } catch (e) {
    return false
  }
}

// ─── Admin Navbar Control (Gated by VITE_ADMIN_WALLETS in .env or on-chain ownership) ───
async function checkAdminNavbar() {
  const account = isConnected() ? getAccount() : null
  const navLinks = document.getElementById('nav-links')
  if (!navLinks) return

  let adminNavLink = document.getElementById('nav-admin')
  const secretPath = CONFIG.adminRoutePath || 'parcis-ops-9842x'

  // Show Admin tab if wallet is in whitelist OR is on-chain owner/pending nominee
  const authorized = account && await isAuthorizedAdmin(account)
  if (authorized) {
    if (!adminNavLink) {
      adminNavLink = document.createElement('a')
      adminNavLink.className = 'nav-link'
      adminNavLink.id = 'nav-admin'
      adminNavLink.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Admin
      `
      const feedbackLink = document.getElementById('nav-feedback')
      if (feedbackLink && feedbackLink.parentNode === navLinks) {
        navLinks.insertBefore(adminNavLink, feedbackLink)
      } else {
        navLinks.appendChild(adminNavLink)
      }
    }
    adminNavLink.href = `#/${secretPath}`
    adminNavLink.dataset.page = secretPath
    adminNavLink.classList.add('visible')
    adminNavLink.style.removeProperty('display')
    return
  }

  // Hide completely if not admin or not connected
  if (adminNavLink) {
    adminNavLink.classList.remove('visible')
    adminNavLink.style.setProperty('display', 'none', 'important')
    adminNavLink.href = 'javascript:void(0)'
    adminNavLink.dataset.page = ''
  }
}

// ─── Ultra-Fast Router ───
async function router() {
  const navLinksEl = document.getElementById('nav-links')
  const mobileBtnEl = document.getElementById('mobile-menu-btn')
  if (navLinksEl) navLinksEl.classList.remove('open')
  if (mobileBtnEl) mobileBtnEl.classList.remove('open')

  checkAdminNavbar()
  const hash = location.hash || '#/'
  const [pathStr, queryStr] = hash.slice(1).split('?')
  const parts = pathStr.split('/').filter(Boolean)
  const route = parts[0] || ''
  const param = parts[1]
  const query = new URLSearchParams(queryStr || '')
  const app = document.getElementById('app')

  // Detect embedded checkout mode (inside iframe/modal)
  const isEmbed = query.get('embed') === 'true' || window.location.href.includes('embed=true') || (window.self !== window.top)
  if (isEmbed) {
    document.body.classList.add('parcis-embedded')
  } else {
    document.body.classList.remove('parcis-embedded')
  }

  // Sync routes render INSTANTLY — no loading spinner needed
  const SYNC_ROUTES = ['', 'send', 'safe', 'create', 'developers', 'docs']
  const isSync = SYNC_ROUTES.includes(route)

  if (!isSync) {
    app.innerHTML = `<div class="loading-overlay"><div class="spinner" style="width:36px;height:36px;border-width:3px"></div><span>Loading...</span></div>`
  }

  try {
    let html = ''
    const adminPath = CONFIG.adminRoutePath || 'parcis-ops-9842x'

    if (!route)                         { setNavActive('home');      html = renderHome() }
    else if (route === 'send')          { setNavActive('send');      html = renderSend() }
    else if (route === 'pay')           { setNavActive('');          html = await renderPay(param, query) }
    else if (route === 'dashboard')     { setNavActive('dashboard'); html = await renderDashboard() }
    else if (route === 'safe')          { setNavActive('safe');      html = renderSafe() }
    else if (route === 'create')        { setNavActive('safe');      html = renderCreate() }
    else if (route === 'deal' && param) { setNavActive('dashboard'); html = await renderDeal(param) }
    else if (route === 'developers')    { setNavActive('developers'); html = renderDevelopers() }
    else if (route === 'docs')          { setNavActive('docs');       html = renderDocs(param, query) }
    else if (route === 'console')       { setNavActive('console');    html = await renderConsole(param, query) }
    else if (route === 'subscribe' && param) { setNavActive(''); html = await renderSubscribe(param) }
    else if (route === 'link' && param) { setNavActive('dashboard'); html = await renderLinkDashboard(param) }
    else if (route === 'stream' && param) { setNavActive('dashboard'); html = await renderStreamDetail(param) }
    else if (route === adminPath) {
      // ── Secret Admin Route Guard: allow admin whitelist or on-chain owner/nominee ──
      const account = isConnected() ? getAccount() : null
      const authorized = account && await isAuthorizedAdmin(account)
      if (!authorized) {
        setNavActive('')
        html = renderNotFound()
      } else {
        setNavActive(adminPath)
        html = await renderAdmin()
      }
    }
    else if (route === 'profile' && param) {
      setNavActive('')
      const isAddr = /^0x[0-9a-fA-F]{40}$/.test(param)
      if (isAddr) {
        html = await renderProfile(param, null)
      } else {
        const link = await fetchLinkFromChain(param)
        if (link && link.creator) {
          html = await renderProfile(link.creator, param)
        } else {
          html = `<div class="empty-state" style="padding-top:120px"><div class="empty-state-icon">${svg('user',48)}</div><h3>Profile not found</h3><p>No Parcis link "${param}" exists on the blockchain.</p><a href="#/" class="btn btn-primary" style="margin-top:16px">Go Home</a></div>`
        }
      }
    }
    else html = renderNotFound()

    app.innerHTML = html
    bindSendForm()
    bindCreateForm()
    if (route === 'developers') loadSDKPreviews()
    window.scrollTo({ top: 0, behavior: 'instant' })
  } catch (err) {
    console.error('[Parcis Router Error]', err)
    app.innerHTML = `<div class="empty-state" style="padding-top:120px"><div class="empty-state-icon">${svg('alertTriangle',48)}</div><h3>Something went wrong</h3><p>${err.message}</p><a href="#/" class="btn btn-primary" style="margin-top:16px">Go Home</a></div>`
  }
}
window.router = router

window.addEventListener('hashchange', router)

// Dynamic floating navbar scrolled style toggler
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav')
    if (nav) {
      if (window.scrollY > 20) {
        nav.classList.add('nav-scrolled')
      } else {
        nav.classList.remove('nav-scrolled')
      }
    }
  })
}

seedDemoLinks()
router()

async function updateGroupProgress(linkId) {
  try {
    const { getLink, getLinkPayments } = await import('./payment.js')
    const link = await getLink(linkId)
    if (!link) return
    const payments = getLinkPayments(linkId)
    const payCount = Math.max(link.paymentCount || 0, payments.length)
    const pct = link.type === 'group' && link.groupTarget ? Math.min(100, Math.round((payCount / link.groupTarget) * 100)) : 0
    
    const progressText = document.getElementById('group-progress-text')
    const progressPercent = document.getElementById('group-progress-percent')
    const progressBar = document.getElementById('group-progress-bar')
    
    if (progressText) progressText.textContent = `${payCount} of ${link.groupTarget} paid`
    if (progressPercent) progressPercent.textContent = `${pct}%`
    if (progressBar) progressBar.style.width = `${pct}%`
  } catch (err) {
    console.error("Failed to update group progress:", err)
  }
}

