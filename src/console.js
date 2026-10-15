// ═══ Parcis Developer Console (Fully Decentralized) ═══
import { svg } from './icons.js'
import { isConnected, getAccount, connectWallet } from './wallet.js'
import { formatUnits, parseUnits } from 'viem'
import { CONFIG } from './config.js'
import {
  getDeveloperProfile,
  registerDeveloper,
  generateAndRegisterApiKey,
  revokeApiKey,
  linkSubscriptionStream,
  unlinkSubscriptionStream,
  addWebhook,
  removeWebhook,
  getWebhooks,
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  DEV_REGISTRY_ADDRESS,
  STREAMS_CONTRACT_ADDRESS,
  PARCIS_STREAMS_ABI,
} from './devAuth.js'
import { getWalletClient, getPublicClient } from './wallet.js'

let currentActiveTab = 'overview'
let cachedProfile = null
let isKeyRevealed = false

export async function renderConsole(subTab = null, query = new URLSearchParams()) {
  if (subTab) currentActiveTab = subTab

  const account = getAccount()
  const connected = isConnected()

  if (!connected || !account) {
    return `
      <div class="page console-page">
        <div class="console-container console-container-narrow">
        <div class="console-hero-card">
          <div class="console-hero-badge">${svg('terminal', 14)} Decentralized Developer Infrastructure</div>
          <h1 class="console-hero-title">Parcis Developer Console</h1>
          <p class="console-hero-subtitle">
            Manage your on-chain API keys, live money streaming subscriptions, webhooks, and embedded checkout widgets.
            Zero centralized databases — 100% wallet authenticated.
          </p>
          <div class="console-hero-actions">
            <button class="btn btn-primary btn-lg" onclick="window.connectWallet()">${svg('wallet', 16)} Connect Wallet to Access</button>
            <a href="#/developers" class="btn btn-secondary btn-lg">${svg('book', 16)} SDK Documentation</a>
          </div>
        </div>

        <div class="console-features-grid">
          <div class="console-feature-item">
            <div class="console-feat-icon" style="color:var(--green);">${svg('key', 20)}</div>
            <h4>Deterministic EIP-712 Keys</h4>
            <p>Your API key is generated client-side from a wallet signature. The contract stores only the hash.</p>
          </div>
          <div class="console-feature-item">
            <div class="console-feat-icon" style="color:var(--cyan);">${svg('zap', 20)}</div>
            <h4>Streaming Subscriptions</h4>
            <p>Stream $29/mo in USDC per second. Cancel at any second and get unstreamed USDC refunded automatically.</p>
          </div>
          <div class="console-feature-item">
            <div class="console-feat-icon" style="color:var(--purple);">${svg('bell', 20)}</div>
            <h4>On-Chain Webhook Registry</h4>
            <p>Store your callback endpoints directly on Arc Network with HMAC-SHA256 signature verification.</p>
          </div>
        </div>
      </div>
    </div>
  `
  }

  // Fetch developer profile from smart contract
  try {
    cachedProfile = await getDeveloperProfile(account)
  } catch (err) {
    console.error('Failed to load developer profile:', err)
  }

  const isRegistered = cachedProfile && cachedProfile.active
  const tierName = cachedProfile ? cachedProfile.tierName : 'Not Registered'
  const isTrial = cachedProfile ? cachedProfile.isTrialActive : false
  const trialDaysLeft = cachedProfile ? Math.ceil(cachedProfile.trialSecondsRemaining / 86400) : 0
  const isStreaming = cachedProfile ? cachedProfile.isStreamActive : false
  const callsUsed = cachedProfile ? cachedProfile.apiCallsUsed : 0
  const callLimit = cachedProfile ? cachedProfile.callLimit : 500
  const localKey = getStoredApiKey(account)

  return `
    <div class="page console-page">
      <div class="console-container">
        <!-- Console Header Bar -->
      <div class="console-header-card">
        <div class="console-header-left">
          <div class="console-tag">
            <span class="console-dot ${isRegistered ? 'online' : 'idle'}"></span>
            ${isRegistered ? `${tierName} Developer` : 'Unregistered Wallet'}
          </div>
          <h2 style="font-size:1.6rem;font-weight:800;color:#fff;margin:6px 0 4px;letter-spacing:-0.02em;">
            Developer Console
          </h2>
          <div class="console-account-badge">
            <span class="console-account-addr">${account}</span>
            <button class="icon-btn-inline" onclick="window.copyText('${account}', this)" title="Copy Address">${svg('copy', 12)}</button>
          </div>
        </div>

        <div class="console-header-right">
          ${!isRegistered
      ? `<button class="btn btn-primary" id="btn-register-dev" onclick="window.handleRegisterDev()">${svg('zap', 14)} Activate 30-Day Pro Trial (Free)</button>`
      : isTrial
        ? `<div class="trial-pill">${svg('clock', 13)} Pro Trial: <strong>${trialDaysLeft} days left</strong></div>`
        : isStreaming
          ? `<div class="streaming-pill">${svg('zap', 13)} Pro Stream Active (#${cachedProfile.activeStreamId})</div>`
          : `<div class="free-pill">${svg('shield', 13)} Free Tier (500 calls/mo)</div>`
    }
        </div>
      </div>

      <!-- Console Tabs Navigation -->
      <div class="console-tabs-bar">
        <button class="console-tab-btn ${currentActiveTab === 'overview' ? 'active' : ''}" onclick="window.switchConsoleTab('overview')">
          ${svg('dashboard', 15)} Overview
        </button>
        <button class="console-tab-btn ${currentActiveTab === 'keys' ? 'active' : ''}" onclick="window.switchConsoleTab('keys')">
          ${svg('key', 15)} API Keys
        </button>
        <button class="console-tab-btn ${currentActiveTab === 'subscriptions' ? 'active' : ''}" onclick="window.switchConsoleTab('subscriptions')">
          ${svg('zap', 15)} Subscriptions & Streams
        </button>
        <button class="console-tab-btn ${currentActiveTab === 'webhooks' ? 'active' : ''}" onclick="window.switchConsoleTab('webhooks')">
          ${svg('bell', 15)} Webhooks
        </button>
        <button class="console-tab-btn ${currentActiveTab === 'widget' ? 'active' : ''}" onclick="window.switchConsoleTab('widget')">
          ${svg('code', 15)} Widget Builder
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="console-tab-content" style="margin-top:20px;">
        ${renderCurrentTabContent(currentActiveTab, {
      account,
      cachedProfile,
      isRegistered,
      tierName,
      isTrial,
      trialDaysLeft,
      isStreaming,
      callsUsed,
      callLimit,
      localKey,
    })}
      </div>
    </div>
  `
}

function renderCurrentTabContent(tab, state) {
  switch (tab) {
    case 'overview':
      return renderOverviewTab(state)
    case 'keys':
      return renderKeysTab(state)
    case 'subscriptions':
      return renderSubscriptionsTab(state)
    case 'webhooks':
      return renderWebhooksTab(state)
    case 'widget':
      return renderWidgetTab(state)
    default:
      return renderOverviewTab(state)
  }
}

// ─── TAB 1: OVERVIEW ───
function renderOverviewTab({ account, cachedProfile, isRegistered, tierName, isTrial, trialDaysLeft, isStreaming, callsUsed, callLimit, localKey }) {
  if (!isRegistered) {
    return `
      <div class="console-card" style="text-align:center;padding:50px 24px;">
        <div style="width:64px;height:64px;border-radius:18px;background:rgba(34,197,94,0.1);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
          ${svg('terminal', 32)}
        </div>
        <h3 style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:8px;">Ready to build on Parcis?</h3>
        <p style="max-width:520px;margin:0 auto 24px;color:var(--text-sec);font-size:0.92rem;line-height:1.6;">
          Register your developer profile on Arc Network. You'll instantly receive a <strong>free 30-Day Pro Trial</strong> granting 50,000 monthly API calls, webhooks, and custom widget embedding.
        </p>
        <button class="btn btn-primary btn-lg" onclick="window.handleRegisterDev()">${svg('zap', 16)} Register & Claim 30-Day Pro Trial</button>
      </div>
    `
  }

  const limitNum = typeof callLimit === 'number' ? callLimit : 50000
  const pct = Math.min(100, Math.round((callsUsed / limitNum) * 100))

  return `
    <div class="console-grid-overview">
      <!-- Card: Current Tier & Status -->
      <div class="console-card">
        <div class="console-card-header">
          <div class="console-card-title">${svg('shield', 16)} Plan & Entitlements</div>
          <span class="badge ${isTrial ? 'badge-trial' : isStreaming ? 'badge-pro' : 'badge-free'}">
            ${isTrial ? '30-Day Pro Trial' : isStreaming ? 'Pro Streaming' : 'Free Tier'}
          </span>
        </div>
        <div style="margin:16px 0;">
          <div style="font-size:2rem;font-weight:900;color:#fff;letter-spacing:-0.03em;">
            ${tierName}
          </div>
          <p style="color:var(--text-sec);font-size:0.86rem;margin-top:4px;">
            ${isTrial
      ? `You have full Pro privileges. Trial ends in <strong>${trialDaysLeft} days</strong>.`
      : isStreaming
        ? `Active second-by-second USDC stream to platform treasury.`
        : `Permanent free plan with 500 calls/mo and standard RPC routing.`
    }
          </p>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-secondary btn-sm" onclick="window.switchConsoleTab('subscriptions')">${svg('zap', 13)} Manage Plan</button>
          <button class="btn btn-ghost btn-sm" onclick="window.switchConsoleTab('keys')">${svg('key', 13)} View API Key</button>
        </div>
      </div>

      <!-- Card: Monthly API Quota -->
      <div class="console-card">
        <div class="console-card-header">
          <div class="console-card-title">${svg('activity', 16)} Monthly API Quota</div>
          <span style="font-family:monospace;font-size:0.8rem;color:var(--text-muted);">${callsUsed} / ${callLimit} calls</span>
        </div>
        <div style="margin:20px 0 10px;">
          <div class="quota-bar-track">
            <div class="quota-bar-fill" style="width:${pct}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-top:8px;">
            <span>${pct}% used</span>
            <span>${typeof callLimit === 'number' ? `${callLimit - callsUsed} remaining` : 'Unlimited'}</span>
          </div>
        </div>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:16px;">
          Quota resets every 30 days automatically. Rate limits are enforced on-chain via Edge middleware.
        </p>
      </div>

      <!-- Card: Quick Stats / Endpoints -->
      <div class="console-card console-card-wide">
        <div class="console-card-header">
          <div class="console-card-title">${svg('server', 16)} On-Chain Developer Architecture</div>
          <span style="font-family:monospace;font-size:0.75rem;color:var(--green);">● ${CONFIG.chainName} (${CONFIG.chainId})</span>
        </div>
        <div class="console-contract-info-grid">
          <div class="contract-info-item">
            <div class="info-label">Dev Registry Contract</div>
            <div class="info-val">
              <span>${DEV_REGISTRY_ADDRESS}</span>
              <button class="icon-btn-inline" onclick="window.copyText('${DEV_REGISTRY_ADDRESS}', this)">${svg('copy', 12)}</button>
            </div>
          </div>
          <div class="contract-info-item">
            <div class="info-label">Streams Contract</div>
            <div class="info-val">
              <span>${STREAMS_CONTRACT_ADDRESS}</span>
              <button class="icon-btn-inline" onclick="window.copyText('${STREAMS_CONTRACT_ADDRESS}', this)">${svg('copy', 12)}</button>
            </div>
          </div>
          <div class="contract-info-item">
            <div class="info-label">Key Status</div>
            <div class="info-val" style="color:${cachedProfile.hasApiKey ? 'var(--green)' : 'var(--text-muted)'};">
              ${cachedProfile.hasApiKey ? '● Active Key Hash Set' : '○ No Key Registered'}
            </div>
          </div>
          <div class="contract-info-item">
            <div class="info-label">Storage Backend</div>
            <div class="info-val" style="color:var(--cyan);">Pure On-Chain / Zero DB</div>
          </div>
        </div>
      </div>
    </div>
  `
}

// ─── TAB 2: API KEYS ───
function renderKeysTab({ account, cachedProfile, isRegistered, localKey }) {
  if (!isRegistered) {
    return `
      <div class="console-card" style="text-align:center;padding:40px 20px;">
        <p style="color:var(--text-sec);margin-bottom:16px;">Please register your developer account first before generating API keys.</p>
        <button class="btn btn-primary" onclick="window.handleRegisterDev()">${svg('zap', 14)} Register Developer Account</button>
      </div>
    `
  }

  const hasKey = cachedProfile && cachedProfile.hasApiKey
  const displayKey = localKey
    ? isKeyRevealed
      ? localKey
      : `${localKey.slice(0, 10)}••••••••••••••••••••${localKey.slice(-4)}`
    : 'No key in local cache (re-derive with signature below)'

  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <!-- Key Management Card -->
      <div class="console-card">
        <div class="console-card-header">
          <div>
            <h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin:0 0 4px;">Deterministic API Key</h3>
            <p style="color:var(--text-sec);font-size:0.85rem;margin:0;">
              Your API key is generated client-side from an EIP-712 typed signature. You can re-derive it at any time with your wallet.
            </p>
          </div>
          <span class="badge ${hasKey ? 'badge-pro' : 'badge-free'}">
            ${hasKey ? 'Key Active' : 'No Key Generated'}
          </span>
        </div>

        <div class="api-key-box" style="margin:20px 0 16px;">
          <div style="font-family:monospace;font-size:0.95rem;color:#fff;word-break:break-all;flex:1;">
            ${displayKey}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${localKey
      ? `
                <button class="btn btn-secondary btn-sm" onclick="window.toggleKeyReveal()">
                  ${isKeyRevealed ? svg('eyeOff', 13) : svg('eye', 13)} ${isKeyRevealed ? 'Hide' : 'Reveal'}
                </button>
                <button class="btn btn-primary btn-sm" onclick="window.copyText('${localKey}', this)">
                  ${svg('copy', 13)} Copy Key
                </button>
              `
      : ''
    }
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:16px;">
          <button class="btn btn-primary btn-sm" onclick="window.handleGenerateKey()">
            ${svg('key', 14)} ${hasKey ? 'Rotate / Re-derive Key' : 'Generate API Key (EIP-712 Sign)'}
          </button>
          ${hasKey
      ? `
              <button class="btn btn-danger btn-sm" onclick="window.handleRevokeKey()">
                ${svg('trash', 14)} Revoke Key On-Chain
              </button>
            `
      : ''
    }
        </div>
      </div>

      <!-- Quickstart Code Snippets -->
      <div class="console-card">
        <div class="console-card-header">
          <div class="console-card-title">${svg('terminal', 16)} Using Your Key with Parcis APIs</div>
          <span style="font-size:0.8rem;color:var(--text-muted);">Pass via <code>X-API-Key</code> header</span>
        </div>

        <div class="code-snippet-box">
          <div class="code-snippet-header">
            <span>cURL</span>
            <button class="icon-btn-inline" onclick="window.copyText(\`curl -H 'X-API-Key: ${localKey || 'YOUR_API_KEY'}' https://parcis.app/api/score?address=${account}\`, this)">${svg('copy', 12)} Copy</button>
          </div>
          <pre class="code-pre"><code>curl -H "X-API-Key: ${localKey || 'YOUR_API_KEY'}" \\
  https://parcis.app/api/score?address=${account}</code></pre>
        </div>

        <div class="code-snippet-box" style="margin-top:16px;">
          <div class="code-snippet-header">
            <span>JavaScript / ParcisClient SDK</span>
            <button class="icon-btn-inline" onclick="window.copyText(\`import { ParcisClient } from '@parcis/sdk';\\n\\nconst client = new ParcisClient({\\n  apiKey: '${localKey || 'YOUR_API_KEY'}',\\n});\\n\\nconst score = await client.getTrustScore('${account}');\\nconsole.log(score);\`, this)">${svg('copy', 12)} Copy</button>
          </div>
          <pre class="code-pre"><code>import { ParcisClient } from '@parcis/sdk';

const client = new ParcisClient({
  apiKey: '${localKey || 'YOUR_API_KEY'}',
});

const score = await client.getTrustScore('${account}');
console.log(score);</code></pre>
        </div>
      </div>
    </div>
  `
}

// ─── TAB 3: SUBSCRIPTIONS & STREAMS ───
function renderSubscriptionsTab({ account, cachedProfile, isRegistered, isTrial, trialDaysLeft, isStreaming }) {
  return `
    <div style="display:flex;flex-direction:column;gap:24px;">
      <!-- Active Subscription Header -->
      <div class="console-card">
        <div class="console-card-header">
          <div>
            <h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin:0 0 4px;">Subscription & Streaming Status</h3>
            <p style="color:var(--text-sec);font-size:0.85rem;margin:0;">
              Parcis subscriptions run on continuous money streams powered by <code>ParcisStreams.sol</code>.
            </p>
          </div>
          <span class="badge ${isTrial ? 'badge-trial' : isStreaming ? 'badge-pro' : 'badge-free'}">
            ${isTrial ? 'Pro Trial' : isStreaming ? 'Pro Stream' : 'Free Tier'}
          </span>
        </div>

        <div style="margin:20px 0;padding:18px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);">Current Active Tier</div>
            <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-top:2px;">
              ${isTrial ? '30-Day Pro Trial' : isStreaming ? 'Pro Streaming ($29/mo)' : 'Free Tier ($0/mo)'}
            </div>
            <div style="font-size:0.84rem;color:var(--text-sec);margin-top:4px;">
              ${isTrial
      ? `Automatic Pro trial is active. You have <strong>${trialDaysLeft} days remaining</strong>.`
      : isStreaming
        ? `Active continuous USDC stream to platform treasury.`
        : `Permanent tight free tier (500 calls/mo). Upgrade to unlock 50,000 calls and webhooks.`
    }
            </div>
          </div>

          <div>
            ${isStreaming
      ? `<button class="btn btn-danger btn-sm" onclick="window.handleCancelDevSubscription()">${svg('xCircle', 13)} Stop Stream & Refund Unused USDC</button>`
      : `<button class="btn btn-primary" onclick="window.handleStartProStream()">${svg('zap', 14)} Start Pro Stream ($29/30 days)</button>`
    }
          </div>
        </div>
      </div>

      <!-- Tier Comparison Matrix -->
      <div class="pricing-matrix-grid">
        <!-- Free Tier Card -->
        <div class="pricing-card">
          <div class="pricing-header">
            <h4>Free Tier</h4>
            <div class="pricing-price">$0 <span>/ month</span></div>
            <p>For individuals building personal proofs of concept.</p>
          </div>
          <ul class="pricing-features">
            <li>${svg('check', 14)} 500 API calls / month</li>
            <li>${svg('check', 14)} Max 5 Payment Links</li>
            <li>${svg('check', 14)} Max 3 Safe Escrow Deals</li>
            <li>${svg('check', 14)} Standard RPC endpoints</li>
            <li class="disabled">${svg('x', 14)} No Webhooks</li>
            <li class="disabled">${svg('x', 14)} No Custom Widget Config</li>
          </ul>
        </div>

        <!-- Pro Tier Card (Featured) -->
        <div class="pricing-card featured">
          <div class="pricing-badge">Recommended</div>
          <div class="pricing-header">
            <h4>Pro Tier</h4>
            <div class="pricing-price">$29 <span>/ month via Stream</span></div>
            <p>For growing dApps, commercial stores, and active merchants.</p>
          </div>
          <ul class="pricing-features">
            <li>${svg('check', 14)} <strong>50,000 API calls / month</strong></li>
            <li>${svg('check', 14)} <strong>Unlimited</strong> Payment Links & Deals</li>
            <li>${svg('check', 14)} <strong>5 Active Webhooks</strong></li>
            <li>${svg('check', 14)} Embed Checkout Widget customizer</li>
            <li>${svg('check', 14)} Second-by-second cancellation</li>
            <li>${svg('check', 14)} Unused USDC auto-refunded to wallet</li>
          </ul>
          <button class="btn btn-primary btn-block" style="margin-top:20px;" onclick="window.handleStartProStream()">
            ${isStreaming ? 'Stream Active' : 'Start $29/mo Stream'}
          </button>
        </div>

        <!-- Enterprise Tier Card -->
        <div class="pricing-card">
          <div class="pricing-header">
            <h4>Enterprise</h4>
            <div class="pricing-price">$149 <span>/ month via Stream</span></div>
            <p>For high-frequency aggregators, exchanges, and enterprises.</p>
          </div>
          <ul class="pricing-features">
            <li>${svg('check', 14)} <strong>Unlimited API calls</strong></li>
            <li>${svg('check', 14)} <strong>20 Active Webhook Endpoints</strong></li>
            <li>${svg('check', 14)} Low-latency dedicated relayer</li>
            <li>${svg('check', 14)} 24/7 Priority Telegram Dev Desk</li>
            <li>${svg('check', 14)} Co-marketing & ecosystem listing</li>
          </ul>
          <button class="btn btn-secondary btn-block" style="margin-top:20px;" onclick="window.handleStartEnterpriseStream()">
            Start $149/mo Stream
          </button>
        </div>
      </div>
    </div>
  `
}

// ─── TAB 4: WEBHOOKS ───
function renderWebhooksTab({ account, cachedProfile, isRegistered, isTrial, isStreaming }) {
  const isEligible = isTrial || isStreaming || (cachedProfile && cachedProfile.currentTier > 0)

  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div class="console-card">
        <div class="console-card-header">
          <div>
            <h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin:0 0 4px;">Webhook Endpoints</h3>
            <p style="color:var(--text-sec);font-size:0.85rem;margin:0;">
              Receive instant JSON event notifications when payment links are paid, escrow deals change state, or streams are created.
            </p>
          </div>
          <span class="badge ${isEligible ? 'badge-pro' : 'badge-free'}">
            ${isEligible ? 'Webhooks Unlocked' : 'Pro / Trial Only'}
          </span>
        </div>

        ${!isEligible
      ? `
            <div style="text-align:center;padding:32px 20px;border-radius:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);margin-top:16px;">
              <div style="color:var(--danger);margin-bottom:8px;">${svg('lock', 24)}</div>
              <h4 style="color:#fff;margin-bottom:6px;">Webhooks require Pro Tier</h4>
              <p style="color:var(--text-sec);font-size:0.85rem;max-width:440px;margin:0 auto 16px;">
                Webhooks are unlocked during your 30-day Pro trial or with an active $29/mo Parcis Stream.
              </p>
              <button class="btn btn-primary btn-sm" onclick="window.switchConsoleTab('subscriptions')">${svg('zap', 13)} Upgrade to Pro</button>
            </div>
          `
      : `
            <!-- Add Webhook Form -->
            <div style="margin-top:20px;padding:18px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);">
              <h4 style="font-size:0.95rem;color:#fff;margin-bottom:12px;">Add Webhook Endpoint</h4>
              <div class="webhook-add-grid">
                <div>
                  <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Endpoint URL (HTTPS)</label>
                  <input type="url" id="webhook-url-input" class="form-input" placeholder="https://api.yourdomain.com/webhook" style="width:100%;">
                </div>
                <div>
                  <label style="display:block;font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Event Trigger</label>
                  <select id="webhook-event-select" class="form-input" style="width:100%;">
                    <option value="0">All Events (*)</option>
                    <option value="1">Payment Link Paid</option>
                    <option value="2">Escrow Deal Created</option>
                    <option value="3">Escrow Deal Released</option>
                    <option value="4">Stream Created</option>
                  </select>
                </div>
                <button class="btn btn-primary" onclick="window.handleAddWebhook()">${svg('plus', 14)} Add Endpoint</button>
              </div>
            </div>

            <!-- Existing Webhooks List -->
            <div id="webhooks-list-container" style="margin-top:20px;">
              <div style="display:flex;justify-content:center;padding:24px;">
                <div class="spinner" style="width:24px;height:24px;"></div>
              </div>
            </div>
          `
    }
      </div>

      <!-- Webhook Security Guide -->
      <div class="console-card">
        <div class="console-card-header">
          <div class="console-card-title">${svg('shield', 16)} Verifying Webhook Signatures</div>
          <span style="font-size:0.8rem;color:var(--text-muted);">HMAC-SHA256 Header</span>
        </div>
        <p style="color:var(--text-sec);font-size:0.85rem;margin:8px 0 16px;">
          Every webhook dispatched by the Parcis relayer contains an <code>X-Parcis-Signature: sha256=...</code> header computed with your secret.
        </p>
        <div class="code-snippet-box">
          <pre class="code-pre"><code>// Node.js Express Webhook Signature Verification
import crypto from 'crypto';

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-parcis-signature'];
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.PARCIS_API_KEY)
                                    .update(req.body)
                                    .digest('hex');

  if (signature !== expected) return res.status(401).send('Invalid signature');
  const event = JSON.parse(req.body);
  console.log('Received Parcis Event:', event.type, event.data);
  res.sendStatus(200);
});</code></pre>
        </div>
      </div>
    </div>
  `
}

// ─── TAB 5: WIDGET BUILDER ───
function renderWidgetTab({ account }) {
  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div class="console-card">
        <div class="console-card-header">
          <div>
            <h3 style="font-size:1.15rem;font-weight:700;color:#fff;margin:0 0 4px;">Embed Checkout Widget Builder</h3>
            <p style="color:var(--text-sec);font-size:0.85rem;margin:0;">
              Customize and embed the interactive Parcis USDC payment button directly on your website or React/Vue app.
            </p>
          </div>
          <span class="badge badge-pro">Live Preview</span>
        </div>

        <div class="widget-builder-grid">
          <!-- Controls Column -->
          <div class="widget-controls" style="display:flex;flex-direction:column;gap:16px;">
            <div>
              <label class="form-label">Payment Link Slug</label>
              <input type="text" id="widget-slug" class="form-input" value="donate" oninput="window.updateWidgetPreview()" placeholder="e.g. coffee or PL-102">
            </div>

            <div>
              <label class="form-label">Button Text</label>
              <input type="text" id="widget-text" class="form-input" value="Pay with USDC" oninput="window.updateWidgetPreview()">
            </div>

            <div>
              <label class="form-label">Theme</label>
              <select id="widget-theme" class="form-input" onchange="window.updateWidgetPreview()">
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="emerald">Emerald Brand</option>
              </select>
            </div>

            <div>
              <label class="form-label">Border Radius</label>
              <select id="widget-radius" class="form-input" onchange="window.updateWidgetPreview()">
                <option value="10px">Rounded (10px)</option>
                <option value="4px">Sharp (4px)</option>
                <option value="999px">Pill (999px)</option>
              </select>
            </div>
          </div>

          <!-- Preview Column -->
          <div class="widget-preview-card" style="padding:24px;border-radius:14px;background:rgba(0,0,0,0.3);border:1px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:260px;">
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:20px;">
              Live Interactive Button
            </div>
            <div id="widget-button-preview-target">
              <!-- Rendered button -->
              <button class="parcis-embed-btn" style="background:#10b981;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:0.95rem;display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                ${svg('zap', 16)} Pay with USDC
              </button>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:20px;">
              Powered by Parcis protocol on Arc Network
            </div>
          </div>
        </div>

        <!-- Generated Embed Code -->
        <div style="margin-top:24px;">
          <label class="form-label">Embed HTML Snippet</label>
          <div class="code-snippet-box">
            <div class="code-snippet-header">
              <span>HTML / React</span>
              <button class="icon-btn-inline" id="btn-copy-widget-code" onclick="window.copyWidgetCode()">${svg('copy', 12)} Copy Snippet</button>
            </div>
            <pre class="code-pre"><code id="widget-code-output">&lt;script src="https://parcis.app/widget.js" data-link="donate" data-theme="dark"&gt;&lt;/script&gt;</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
`
}

// ─── Global Handlers & Window Binds ───

window.switchConsoleTab = async (tab) => {
  currentActiveTab = tab
  const content = document.getElementById('console-tab-content')
  if (!content) return

  // Update nav buttons
  document.querySelectorAll('.console-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab))
  })

  const account = getAccount()
  content.innerHTML = renderCurrentTabContent(tab, {
    account,
    cachedProfile,
    isRegistered: cachedProfile && cachedProfile.active,
    tierName: cachedProfile ? cachedProfile.tierName : 'Free',
    isTrial: cachedProfile ? cachedProfile.isTrialActive : false,
    trialDaysLeft: cachedProfile ? Math.ceil(cachedProfile.trialSecondsRemaining / 86400) : 0,
    isStreaming: cachedProfile ? cachedProfile.isStreamActive : false,
    callsUsed: cachedProfile ? cachedProfile.apiCallsUsed : 0,
    callLimit: cachedProfile ? cachedProfile.callLimit : 500,
    localKey: getStoredApiKey(account),
  })

  if (tab === 'webhooks') {
    window.loadConsoleWebhooks()
  } else if (tab === 'widget') {
    window.updateWidgetPreview()
  }
}

window.handleRegisterDev = async () => {
  try {
    window.toast('Submitting on-chain registration on Arc Testnet...', 'info')
    await registerDeveloper()
    window.toast('Developer account registered! 30-Day Pro Trial activated.', 'success')
    location.reload()
  } catch (err) {
    window.toast(err.message || 'Registration failed', 'error')
  }
}

window.handleGenerateKey = async () => {
  try {
    window.toast('Please sign the EIP-712 request in your wallet...', 'info')
    const { apiKey } = await generateAndRegisterApiKey(0)
    window.toast('API key derived and hash recorded on-chain!', 'success')
    window.switchConsoleTab('keys')
  } catch (err) {
    window.toast(err.message || 'Key generation cancelled or failed', 'error')
  }
}

window.toggleKeyReveal = () => {
  isKeyRevealed = !isKeyRevealed
  window.switchConsoleTab('keys')
}

window.handleRevokeKey = async () => {
  if (!confirm('Are you sure you want to revoke this API key? All applications using it will stop working immediately.')) {
    return
  }
  try {
    window.toast('Submitting key revocation on-chain...', 'info')
    await revokeApiKey()
    window.toast('API key revoked on-chain.', 'success')
    window.switchConsoleTab('keys')
  } catch (err) {
    window.toast(err.message || 'Revocation failed', 'error')
  }
}

window.handleStartProStream = async () => {
  const account = getAccount()
  if (!account) return window.toast('Connect wallet first', 'warning')

  try {
    window.toast('Creating 29 USDC subscription stream...', 'info')
    const walletClient = getWalletClient()
    const publicClient = getPublicClient()
    const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
    const depositAmount = 29n * 10n ** 6n // 29 USDC
    const durationSeconds = 30 * 24 * 60 * 60 // 30 days

    // 1. Approve USDC to ParcisStreams
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'approve',
      args: [STREAMS_CONTRACT_ADDRESS, depositAmount],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    // 2. Create stream to platform treasury
    const treasuryAddress = await publicClient.readContract({
      address: DEV_REGISTRY_ADDRESS,
      abi: [{ name: 'platformTreasury', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
      functionName: 'platformTreasury',
    })

    const streamTx = await walletClient.writeContract({
      address: STREAMS_CONTRACT_ADDRESS,
      abi: PARCIS_STREAMS_ABI,
      functionName: 'createStream',
      args: [treasuryAddress, depositAmount, BigInt(durationSeconds)],
    })
    const streamReceipt = await publicClient.waitForTransactionReceipt({ hash: streamTx })

    // Parse StreamCreated event from receipt to get exact streamId (avoids race condition)
    const streamId = _parseStreamIdFromReceipt(streamReceipt)

    // 3. Link stream to ParcisDevRegistry
    window.toast('Linking stream to developer profile on-chain...', 'info')
    await linkSubscriptionStream(streamId, 1) // Tier.Pro

    window.toast('Pro subscription stream activated successfully!', 'success')
    location.reload()
  } catch (err) {
    window.toast(err.message || 'Stream creation failed', 'error')
  }
}

window.handleStartEnterpriseStream = async () => {
  window.toast('Initiating Enterprise Stream ($149/30 days)...', 'info')
  // Same flow with 149 USDC
  try {
    const walletClient = getWalletClient()
    const publicClient = getPublicClient()
    const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'
    const depositAmount = 149n * 10n ** 6n
    const durationSeconds = 30 * 24 * 60 * 60

    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }],
      functionName: 'approve',
      args: [STREAMS_CONTRACT_ADDRESS, depositAmount],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    const treasuryAddress = await publicClient.readContract({
      address: DEV_REGISTRY_ADDRESS,
      abi: [{ name: 'platformTreasury', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
      functionName: 'platformTreasury',
    })

    const streamTx = await walletClient.writeContract({
      address: STREAMS_CONTRACT_ADDRESS,
      abi: PARCIS_STREAMS_ABI,
      functionName: 'createStream',
      args: [treasuryAddress, depositAmount, BigInt(durationSeconds)],
    })
    const streamReceipt = await publicClient.waitForTransactionReceipt({ hash: streamTx })

    // Parse StreamCreated event from receipt to get exact streamId (avoids race condition)
    const streamId = _parseStreamIdFromReceipt(streamReceipt)

    await linkSubscriptionStream(streamId, 2) // Tier.Enterprise
    window.toast('Enterprise subscription activated!', 'success')
    location.reload()
  } catch (err) {
    window.toast(err.message || 'Enterprise stream failed', 'error')
  }
}

/**
 * Helper: Parse StreamCreated event from a transaction receipt to extract the exact streamId.
 * Avoids race condition of reading the global streamCount counter.
 * StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, ...)
 */
function _parseStreamIdFromReceipt(receipt) {
  // StreamCreated event topic0: keccak256("StreamCreated(uint256,address,address,uint256,uint256,uint256)")
  const streamsAddr = STREAMS_CONTRACT_ADDRESS.toLowerCase()
  for (const log of receipt.logs || []) {
    if (log.address?.toLowerCase() === streamsAddr && log.topics?.length >= 2) {
      // topics[1] is the indexed streamId
      return BigInt(log.topics[1])
    }
  }
  // Fallback: read streamCount if event parsing fails (shouldn't happen)
  console.warn('[console] Could not parse StreamCreated event, falling back to streamCount')
  const publicClient = getPublicClient()
  return publicClient.readContract({
    address: STREAMS_CONTRACT_ADDRESS,
    abi: [{ name: 'streamCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
    functionName: 'streamCount',
  })
}

window.handleCancelDevSubscription = async () => {
  if (!confirm('Stop stream? The stream will be cancelled, unstreamed USDC will be returned to your wallet, and your plan will revert to Free.')) {
    return
  }
  try {
    // 1. Cancel the actual USDC stream on ParcisStreams to stop money flow and refund
    if (cachedProfile && cachedProfile.activeStreamId) {
      window.toast('Cancelling USDC stream and refunding unused balance...', 'info')
      const walletClient = getWalletClient()
      const publicClient = getPublicClient()
      const cancelHash = await walletClient.writeContract({
        address: STREAMS_CONTRACT_ADDRESS,
        abi: PARCIS_STREAMS_ABI,
        functionName: 'cancelStream',
        args: [BigInt(cachedProfile.activeStreamId)],
      })
      await publicClient.waitForTransactionReceipt({ hash: cancelHash })
    }

    // 2. Unlink from DevRegistry (sets tier back to Free)
    window.toast('Unlinking stream from developer profile...', 'info')
    await unlinkSubscriptionStream()
    window.toast('Stream cancelled and refunded. Reverted to Free plan.', 'success')
    location.reload()
  } catch (err) {
    window.toast(err.message || 'Cancel stream failed', 'error')
  }
}

window.loadConsoleWebhooks = async () => {
  const container = document.getElementById('webhooks-list-container')
  if (!container) return

  const account = getAccount()
  try {
    const list = await getWebhooks(account)
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.88rem;">
          ${svg('bell', 24)}<br>
          <span style="display:inline-block;margin-top:8px;">No webhook endpoints registered yet.</span>
        </div>
      `
      return
    }

    const eventLabels = ['All Events (*)', 'Payment Link Paid', 'Escrow Deal Created', 'Escrow Deal Released', 'Stream Created']

    container.innerHTML = `
      <div class="console-table-responsive">
        <table class="console-table">
          <thead>
            <tr>
              <th>Endpoint URL</th>
              <th>Trigger Event</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
        .map(
          (w) => `
              <tr>
                <td style="font-family:monospace;font-size:0.85rem;color:#fff;word-break:break-all;">${w.url}</td>
                <td><span class="badge badge-pro">${eventLabels[w.eventType] || 'Custom'}</span></td>
                <td><span style="color:var(--green);font-size:0.8rem;">● Active</span></td>
                <td style="text-align:right;">
                  <button class="btn btn-ghost btn-sm" onclick="window.handleRemoveWebhook(${w.index})">${svg('trash', 13)} Remove</button>
                </td>
              </tr>
            `
        )
        .join('')}
          </tbody>
        </table>
      </div>
    `
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);padding:16px;">Failed to load webhooks: ${err.message}</div>`
  }
}

window.handleAddWebhook = async () => {
  const url = document.getElementById('webhook-url-input')?.value?.trim()
  const eventType = parseInt(document.getElementById('webhook-event-select')?.value || '0', 10)

  if (!url || !url.startsWith('https://')) {
    return window.toast('Please enter a valid HTTPS webhook URL', 'warning')
  }

  try {
    window.toast('Registering webhook endpoint on-chain...', 'info')
    await addWebhook(url, eventType)
    window.toast('Webhook endpoint added on-chain!', 'success')
    window.loadConsoleWebhooks()
  } catch (err) {
    window.toast(err.message || 'Failed to add webhook', 'error')
  }
}

window.handleRemoveWebhook = async (index) => {
  try {
    window.toast('Removing webhook endpoint on-chain...', 'info')
    await removeWebhook(index)
    window.toast('Webhook endpoint removed.', 'success')
    window.loadConsoleWebhooks()
  } catch (err) {
    window.toast(err.message || 'Failed to remove webhook', 'error')
  }
}

window.updateWidgetPreview = () => {
  const slug = document.getElementById('widget-slug')?.value?.trim() || 'donate'
  const text = document.getElementById('widget-text')?.value?.trim() || 'Pay with USDC'
  const theme = document.getElementById('widget-theme')?.value || 'dark'
  const radius = document.getElementById('widget-radius')?.value || '10px'

  const target = document.getElementById('widget-button-preview-target')
  const codeEl = document.getElementById('widget-code-output')

  let bg = '#10b981'
  let color = '#fff'
  if (theme === 'light') {
    bg = '#f3f4f6'
    color = '#111827'
  } else if (theme === 'dark') {
    bg = '#18181b'
    color = '#fff'
  }

  if (target) {
    target.innerHTML = `
      <button class="parcis-embed-btn" style="background:${bg};color:${color};border:1px solid rgba(255,255,255,0.15);padding:12px 24px;border-radius:${radius};font-weight:700;font-size:0.95rem;display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.2);">
        ${svg('zap', 16)} ${text}
      </button>
    `
  }

  if (codeEl) {
    codeEl.textContent = `<script src="https://parcis.app/widget.js" data-link="${slug}" data-theme="${theme}" data-radius="${radius}" data-text="${text}"></script>`
  }
}

window.copyWidgetCode = () => {
  const codeEl = document.getElementById('widget-code-output')
  if (codeEl) {
    window.copyText(codeEl.textContent)
    const btn = document.getElementById('btn-copy-widget-code')
    if (btn) {
      btn.innerHTML = `${svg('check', 12)} Copied!`
      setTimeout(() => {
        btn.innerHTML = `${svg('copy', 12)} Copy Snippet`
      }, 2000)
    }
  }
}
