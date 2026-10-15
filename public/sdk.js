/**
 * ═══════════════════════════════════════════════════════════════
 *                    PARCIS UNIVERSAL SDK v2.0
 *            The Decentralized Commerce Layer for Arc
 * ═══════════════════════════════════════════════════════════════
 * 
 * Features:
 *   - In-Page Seamless Checkout Modal (Zero Popup Blocking)
 *   - Bi-directional postMessage Event Bus (onSuccess, onError, onClose)
 *   - Web Components: <parcis-pay>, <parcis-stream>, <parcis-profile>
 *   - Programmatic JavaScript & REST Client (window.Parcis)
 * 
 * Usage:
 *   <script src="https://parcis.app/sdk.js"></script>
 *   <parcis-pay address="your-slug" amount="50" label="Pay for Work"></parcis-pay>
 */

(function () {
  'use strict';

  // ─── Base URL Detection ───
  const PARCIS_BASE = (() => {
    const scripts = document.querySelectorAll('script[src*="sdk.js"]');
    for (const s of scripts) {
      try {
        const url = new URL(s.src);
        if (url.origin && url.origin !== 'null') return url.origin;
      } catch (e) { /* ignore */ }
    }
    return window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'https://parcis.app';
  })();

  const BRAND_GREEN = '#22c55e';
  const BRAND_DARK = '#0d0d0f';
  const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  // ─── Active Callbacks Registry for Event Bus ───
  let activeCallbacks = {
    onSuccess: null,
    onError: null,
    onClose: null,
  };

  // ─── Modal Overlay Controller ───
  class ParcisModalController {
    constructor() {
      this.modalEl = null;
      this.iframeEl = null;
      this.initGlobalListener();
    }

    initGlobalListener() {
      const allowedOrigins = new Set([
        PARCIS_BASE,
        window.location.origin,
      ]);
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        allowedOrigins.add(`http://localhost:${window.location.port || '3000'}`);
        allowedOrigins.add(`http://127.0.0.1:${window.location.port || '3000'}`);
        allowedOrigins.add('http://localhost:5173');
        allowedOrigins.add('http://localhost:3000');
      }

      window.addEventListener('message', (event) => {
        // Validate source origin strictly
        if (!allowedOrigins.has(event.origin)) return;

        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PARCIS_PAYMENT_SUCCESS') {
          if (activeCallbacks.onSuccess) activeCallbacks.onSuccess(data);
          this.dispatchCustomEvent('parcis:success', data);
        } else if (data.type === 'PARCIS_PAYMENT_ERROR') {
          if (activeCallbacks.onError) activeCallbacks.onError(data);
          this.dispatchCustomEvent('parcis:error', data);
        } else if (data.type === 'PARCIS_MODAL_CLOSE') {
          this.close();
        }
      });

      // Handle ESC key to close modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl) {
          this.close();
        }
      });
    }

    dispatchCustomEvent(name, detail) {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    open(url, callbacks = {}) {
      activeCallbacks = {
        onSuccess: callbacks.onSuccess || null,
        onError: callbacks.onError || null,
        onClose: callbacks.onClose || null,
      };

      if (!this.modalEl) {
        this.createModalDom();
      }

      this.iframeEl.src = url;
      this.modalEl.style.display = 'flex';
      // Force reflow for CSS transition
      void this.modalEl.offsetHeight;
      this.modalEl.classList.add('parcis-modal-visible');
      document.body.style.overflow = 'hidden';
    }

    close() {
      if (!this.modalEl) return;
      this.modalEl.classList.remove('parcis-modal-visible');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (this.modalEl) {
          this.modalEl.style.display = 'none';
          if (this.iframeEl) this.iframeEl.src = 'about:blank';
        }
        if (activeCallbacks.onClose) activeCallbacks.onClose();
        this.dispatchCustomEvent('parcis:close', {});
        activeCallbacks = { onSuccess: null, onError: null, onClose: null };
      }, 250);
    }

    createModalDom() {
      const wrapper = document.createElement('div');
      wrapper.id = 'parcis-modal-overlay';
      wrapper.innerHTML = `
        <style>
          #parcis-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(4, 5, 8, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.25s ease;
            box-sizing: border-box;
            padding: 16px;
          }
          #parcis-modal-overlay.parcis-modal-visible {
            opacity: 1;
          }
          #parcis-modal-card {
            position: relative;
            width: 100%;
            max-width: 440px;
            height: 560px;
            max-height: min(560px, 92vh);
            background: #09090b;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(34, 197, 94, 0.18);
            transform: scale(0.95) translateY(10px);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
          }
          #parcis-modal-overlay.parcis-modal-visible #parcis-modal-card {
            transform: scale(1) translateY(0);
          }
          #parcis-modal-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            transition: all 0.2s ease;
            outline: none;
          }
          #parcis-modal-close:hover {
            background: rgba(255, 255, 255, 0.16);
            color: #ffffff;
            transform: rotate(90deg);
          }
          #parcis-modal-iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
          }
          @media (max-width: 480px) {
            #parcis-modal-card {
              max-height: 98vh;
              height: 94vh;
              border-radius: 18px;
            }
          }
        </style>
        <div id="parcis-modal-card">
          <button id="parcis-modal-close" aria-label="Close Parcis Checkout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <iframe id="parcis-modal-iframe" allow="clipboard-write; ethereum" title="Parcis Checkout"></iframe>
        </div>
      `;

      document.body.appendChild(wrapper);
      this.modalEl = wrapper;
      this.iframeEl = wrapper.querySelector('#parcis-modal-iframe');

      wrapper.querySelector('#parcis-modal-close').addEventListener('click', () => this.close());
      wrapper.addEventListener('click', (e) => {
        if (e.target === wrapper) this.close();
      });
    }
  }

  const modal = new ParcisModalController();

  // ─── Helper for Opening Payment Flow ───
  function cleanTargetAddress(input) {
    if (!input) return '';
    let cleaned = input.trim();
    const match = cleaned.match(/[#/]pay\/([^/?#]+)/);
    if (match) cleaned = match[1];
    else if (cleaned.includes('/pay/')) cleaned = cleaned.split('/pay/')[1];
    else if (cleaned.includes('#/profile/')) cleaned = cleaned.split('#/profile/')[1];
    return cleaned.split('?')[0].replace(/^\/+|\/+$/g, '').trim();
  }

  function launchPaymentFlow(config, callbacks = {}) {
    const { address: rawAddress, amount, description, label, type, duration, display = 'modal' } = config;
    const address = cleanTargetAddress(rawAddress);

    if (!address) {
      console.error('[Parcis SDK] Missing "address" or "slug"');
      return;
    }

    const params = new URLSearchParams();
    params.set('to', address);
    if (amount) params.set('amount', amount);
    if (description) params.set('desc', description);
    if (label) params.set('label', label);
    if (type) params.set('type', type);
    if (duration) params.set('duration', duration);
    params.set('embed', 'true');

    const payUrl = `${PARCIS_BASE}/#/pay?${params.toString()}`;

    if (display === 'redirect') {
      window.location.href = payUrl;
    } else if (display === 'popup') {
      const w = 440, h = 600;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      window.open(payUrl, 'parcis_pay', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`);
    } else {
      // Default: Seamless In-Page Modal
      modal.open(payUrl, callbacks);
    }
  }

  // ─── <parcis-pay> Web Component ───
  class ParcisPay extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
      return ['address', 'amount', 'label', 'description', 'theme', 'size', 'display'];
    }

    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    get config() {
      return {
        address: this.getAttribute('address') || '',
        amount: this.getAttribute('amount') || '',
        label: this.getAttribute('label') || 'Pay with Parcis',
        description: this.getAttribute('description') || '',
        theme: this.getAttribute('theme') || 'dark',
        size: this.getAttribute('size') || 'md',
        display: this.getAttribute('display') || 'modal',
      };
    }

    render() {
      const { amount, label, theme, size } = this.config;
      const isDark = theme === 'dark';
      const bg = isDark ? BRAND_DARK : '#ffffff';
      const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      const text = isDark ? '#f0f0f2' : '#1a1a1e';
      const textSec = isDark ? '#8888a0' : '#666';

      const sizes = {
        sm: { pad: '8px 14px', font: '0.8rem', icon: 16, gap: '6px' },
        md: { pad: '12px 22px', font: '0.9rem', icon: 18, gap: '8px' },
        lg: { pad: '16px 28px', font: '1rem', icon: 20, gap: '10px' },
      };
      const s = sizes[size] || sizes.md;

      this.shadowRoot.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap');
          :host { display: inline-block; }
          .parcis-container {
            font-family: ${FONT};
            display: inline-flex;
            flex-direction: column;
            gap: 6px;
          }
          .parcis-btn {
            display: inline-flex;
            align-items: center;
            gap: ${s.gap};
            padding: ${s.pad};
            border: 1px solid ${border};
            border-radius: 12px;
            background: ${bg};
            color: ${text};
            font-family: ${FONT};
            font-size: ${s.font};
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .parcis-btn:hover {
            border-color: ${BRAND_GREEN};
            box-shadow: 0 0 0 3px rgba(34,197,94,0.18), 0 4px 12px rgba(0,0,0,0.2);
            transform: translateY(-1px);
          }
          .parcis-btn:active { transform: translateY(0); }
          .parcis-logo {
            width: ${s.icon}px;
            height: ${s.icon}px;
            border-radius: 4px;
            object-fit: cover;
          }
          .parcis-label { flex: 1; }
          .parcis-amount {
            font-weight: 700;
            color: ${BRAND_GREEN};
            background: rgba(34,197,94,0.1);
            padding: 2px 8px;
            border-radius: 6px;
          }
          .parcis-powered {
            font-size: 0.68rem;
            color: ${textSec};
            text-align: center;
            font-family: ${FONT};
          }
          .parcis-powered a {
            color: ${BRAND_GREEN};
            text-decoration: none;
            font-weight: 600;
          }
        </style>
        <div class="parcis-container">
          <button class="parcis-btn" id="pay-btn">
            <img class="parcis-logo" src="${PARCIS_BASE}/logo.png" alt="Parcis">
            <span class="parcis-label">${label}</span>
            ${amount ? `<span class="parcis-amount">$${parseFloat(amount).toFixed(2)} USDC</span>` : ''}
          </button>
          <span class="parcis-powered">Secured by <a href="${PARCIS_BASE}" target="_blank">Parcis</a> on Arc</span>
        </div>
      `;

      this.shadowRoot.getElementById('pay-btn').addEventListener('click', () => {
        launchPaymentFlow(this.config);
      });
    }
  }

  // ─── <parcis-stream> Web Component ───
  class ParcisStream extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
      return ['address', 'amount', 'duration', 'label', 'description', 'theme', 'size', 'display'];
    }

    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    get config() {
      return {
        address: this.getAttribute('address') || '',
        amount: this.getAttribute('amount') || '',
        duration: this.getAttribute('duration') || '30',
        label: this.getAttribute('label') || 'Subscribe',
        description: this.getAttribute('description') || '',
        theme: this.getAttribute('theme') || 'dark',
        size: this.getAttribute('size') || 'md',
        display: this.getAttribute('display') || 'modal',
        type: 'stream',
      };
    }

    render() {
      const { amount, duration, label, theme, size } = this.config;
      const isDark = theme === 'dark';
      const bg = isDark ? BRAND_DARK : '#ffffff';
      const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      const text = isDark ? '#f0f0f2' : '#1a1a1e';
      const textSec = isDark ? '#8888a0' : '#666';

      const sizes = {
        sm: { pad: '8px 14px', font: '0.8rem', icon: 16, gap: '6px' },
        md: { pad: '12px 22px', font: '0.9rem', icon: 18, gap: '8px' },
        lg: { pad: '16px 28px', font: '1rem', icon: 20, gap: '10px' },
      };
      const s = sizes[size] || sizes.md;

      this.shadowRoot.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap');
          :host { display: inline-block; }
          .parcis-container {
            font-family: ${FONT};
            display: inline-flex;
            flex-direction: column;
            gap: 6px;
          }
          .parcis-btn {
            display: inline-flex;
            align-items: center;
            gap: ${s.gap};
            padding: ${s.pad};
            border: 1px solid ${border};
            border-radius: 12px;
            background: ${bg};
            color: ${text};
            font-family: ${FONT};
            font-size: ${s.font};
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            line-height: 1.4;
          }
          .parcis-btn:hover {
            border-color: ${BRAND_GREEN};
            box-shadow: 0 0 0 3px rgba(34,197,94,0.18), 0 4px 12px rgba(0,0,0,0.2);
            transform: translateY(-1px);
          }
          .parcis-label { flex: 1; }
          .parcis-amount {
            font-weight: 700;
            color: ${BRAND_GREEN};
          }
          .parcis-duration {
            font-size: 0.75rem;
            color: ${textSec};
            margin-left: 2px;
          }
          .parcis-powered {
            font-size: 0.68rem;
            color: ${textSec};
            text-align: center;
            font-family: ${FONT};
          }
          .parcis-powered a {
            color: ${BRAND_GREEN};
            text-decoration: none;
            font-weight: 600;
          }
        </style>
        <div class="parcis-container">
          <button class="parcis-btn" id="stream-btn">
            <svg width="${s.icon}" height="${s.icon}" viewBox="0 0 24 24" fill="none" stroke="${BRAND_GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span class="parcis-label">${label}</span>
            ${amount ? `<span class="parcis-amount">$${parseFloat(amount).toFixed(2)} <span class="parcis-duration">/${duration}d</span></span>` : ''}
          </button>
          <span class="parcis-powered">Streaming by <a href="${PARCIS_BASE}" target="_blank">Parcis</a></span>
        </div>
      `;

      this.shadowRoot.getElementById('stream-btn').addEventListener('click', () => {
        launchPaymentFlow(this.config);
      });
    }
  }

  // ─── <parcis-profile> Web Component ───
  class ParcisProfile extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
      return ['address', 'theme', 'size'];
    }

    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    get config() {
      return {
        address: this.getAttribute('address') || '',
        theme: this.getAttribute('theme') || 'dark',
        size: this.getAttribute('size') || 'md',
      };
    }

    async fetchScore(addr) {
      if (!addr || !addr.startsWith('0x')) return null;
      try {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/score?address=${addr}`, {}, 6000);
        if (res.ok) return await res.json();
      } catch (e) { /* ignore */ }
      return null;
    }

    async render() {
      const { address, theme } = this.config;
      const isDark = theme === 'dark';
      const bg = isDark ? BRAND_DARK : '#ffffff';
      const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      const text = isDark ? '#f0f0f2' : '#1a1a1e';
      const textSec = isDark ? '#8888a0' : '#666';
      const short = address ? (address.length > 15 ? address.slice(0, 6) + '...' + address.slice(-4) : address) : '0x...';

      this.shadowRoot.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap');
          :host { display: inline-block; }
          .profile-card {
            font-family: ${FONT};
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            border: 1px solid ${border};
            border-radius: 14px;
            background: ${bg};
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .profile-card:hover {
            border-color: ${BRAND_GREEN};
            box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
            transform: translateY(-1px);
          }
          .avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${BRAND_GREEN}, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 0.85rem;
            font-family: ${FONT};
          }
          .info { display: flex; flex-direction: column; gap: 2px; }
          .addr { font-weight: 600; font-size: 0.85rem; color: ${text}; font-family: 'SF Mono', monospace; }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 7px;
            border-radius: 4px;
            background: rgba(34,197,94,0.12);
            color: ${BRAND_GREEN};
            font-size: 0.7rem;
            font-weight: 600;
            width: fit-content;
          }
          .score-pill {
            font-size: 0.7rem;
            font-weight: 700;
            color: #3b82f6;
            background: rgba(59,130,246,0.12);
            padding: 1px 6px;
            border-radius: 4px;
            margin-left: 4px;
          }
        </style>
        <div class="profile-card" id="card">
          <div class="avatar">${address ? address.slice(2, 4).toUpperCase() : '?'}</div>
          <div class="info">
            <span class="addr">${short}</span>
            <div style="display:flex;align-items:center;">
              <span class="badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                Parcis Verified
              </span>
              <span id="score-val" class="score-pill" style="display:none"></span>
            </div>
          </div>
        </div>
      `;

      this.shadowRoot.getElementById('card').addEventListener('click', () => {
        if (address) window.open(`${PARCIS_BASE}/#/profile/${address}`, '_blank');
      });

      if (address && address.startsWith('0x') && address.length === 42) {
        this.fetchScore(address).then(data => {
          if (data && data.trustScore !== undefined) {
            const scoreEl = this.shadowRoot.getElementById('score-val');
            if (scoreEl) {
              scoreEl.style.display = 'inline-block';
              scoreEl.textContent = `Score: ${data.trustScore}`;
            }
          }
        });
      }
    }
  }

  // ─── Register Custom Elements ───
  if (!customElements.get('parcis-pay')) customElements.define('parcis-pay', ParcisPay);
  if (!customElements.get('parcis-stream')) customElements.define('parcis-stream', ParcisStream);
  if (!customElements.get('parcis-profile')) customElements.define('parcis-profile', ParcisProfile);

  // ─── Global SDK Client API ───
  window.Parcis = {
    version: '2.0.0',
    base: PARCIS_BASE,

    // Launch in-page modal or popup
    pay: (opts = {}) => {
      launchPaymentFlow(opts, opts);
    },

    stream: (opts = {}) => {
      launchPaymentFlow({ ...opts, type: 'stream' }, opts);
    },

    openModal: (url, callbacks = {}) => {
      modal.open(url, callbacks);
    },

    closeModal: () => {
      modal.close();
    },

    // Component Factory Methods (returns DOM element)
    createPayButton: (opts = {}) => {
      const el = document.createElement('parcis-pay');
      if (opts.address) el.setAttribute('address', opts.address);
      if (opts.amount) el.setAttribute('amount', opts.amount);
      if (opts.label) el.setAttribute('label', opts.label);
      if (opts.description) el.setAttribute('description', opts.description);
      if (opts.theme) el.setAttribute('theme', opts.theme);
      if (opts.display) el.setAttribute('display', opts.display);
      return el;
    },

    createStreamButton: (opts = {}) => {
      const el = document.createElement('parcis-stream');
      if (opts.address) el.setAttribute('address', opts.address);
      if (opts.amount) el.setAttribute('amount', opts.amount);
      if (opts.duration) el.setAttribute('duration', opts.duration);
      if (opts.label) el.setAttribute('label', opts.label);
      if (opts.theme) el.setAttribute('theme', opts.theme);
      if (opts.display) el.setAttribute('display', opts.display);
      return el;
    },

    createProfileCard: (address, opts = {}) => {
      const el = document.createElement('parcis-profile');
      el.setAttribute('address', address);
      if (opts.theme) el.setAttribute('theme', opts.theme);
      return el;
    },

    // ─── High-Speed REST API Client ───
    api: {
      getTrustScore: async (address) => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/score?address=${encodeURIComponent(address)}`);
        if (!res.ok) throw new Error(`Score API Error (${res.status})`);
        return await res.json();
      },
      getLink: async (id) => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/link?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`Link API Error (${res.status})`);
        return await res.json();
      },
      getDeal: async (dealId) => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/deal?id=${encodeURIComponent(dealId)}`);
        if (!res.ok) throw new Error(`Deal API Error (${res.status})`);
        return await res.json();
      },
      getStream: async (streamId) => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/stream?id=${encodeURIComponent(streamId)}`);
        if (!res.ok) throw new Error(`Stream API Error (${res.status})`);
        return await res.json();
      },
      getArbiters: async () => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/arbiters`);
        if (!res.ok) throw new Error(`Arbiters API Error (${res.status})`);
        return await res.json();
      },
      getHealth: async () => {
        const res = await fetchWithTimeout(`${PARCIS_BASE}/api/health`);
        if (!res.ok) throw new Error(`Health API Error (${res.status})`);
        return await res.json();
      },
    },

    // Convenience Shortcuts
    getTrustScore: (address) => window.Parcis.api.getTrustScore(address),
    getLink: (id) => window.Parcis.api.getLink(id),
    getDeal: (dealId) => window.Parcis.api.getDeal(dealId),
    getStream: (streamId) => window.Parcis.api.getStream(streamId),
    getArbiters: () => window.Parcis.api.getArbiters(),
    getHealth: () => window.Parcis.api.getHealth(),
  };

  async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.log('%c⚡ Parcis Universal SDK v2.0 initialized', 'color: #22c55e; font-weight: bold; font-size: 12px;');
})();
