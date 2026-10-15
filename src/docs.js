// ═══ Parcis API & SDK Documentation Portal ═══
import { svg } from './icons.js'
import './docs.css'

// ─── Utility: Code block with copy ───
function codeBlock(lang, title, code) {
  const id = 'cb-' + Math.random().toString(36).slice(2, 8)
  return `<div class="docs-code-block">
    <div class="docs-code-header">
      <div class="docs-code-header-left">
        <span class="dev-code-dot red"></span>
        <span class="dev-code-dot yellow"></span>
        <span class="dev-code-dot green"></span>
        <span class="docs-code-lang">${title || lang}</span>
      </div>
      <button class="docs-code-copy" onclick="window._docsCopy('${id}', this)">${svg('copy', 11)} Copy</button>
    </div>
    <pre class="docs-code-pre" id="${id}"><code>${code}</code></pre>
  </div>`
}

// ─── Utility: Param row ───
function paramRow(name, type, req, desc) {
  const reqCls = req ? 'required' : 'optional'
  const reqLabel = req ? 'Required' : 'Optional'
  return `<tr>
    <td><span class="docs-param-name">${name}</span></td>
    <td><span class="docs-param-type">${type}</span></td>
    <td><span class="docs-param-req ${reqCls}">${reqLabel}</span></td>
    <td style="color:var(--text-sec)">${desc}</td>
  </tr>`
}

function paramTable(rows) {
  return `<table class="docs-param-table">
    <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ─── Utility: Expandable endpoint card ───
function endpointCard(method, path, summary, auth, body) {
  const id = 'ep-' + path.replace(/[^a-z0-9]/gi, '-')
  const authBadge = auth === 'key'
    ? `<span class="docs-auth-badge required">${svg('key', 10)} API Key Required</span>`
    : `<span class="docs-auth-badge public">${svg('globe', 10)} Public</span>`
  const cleanSearch = `${method} ${path} ${summary}`
    .replace(/<[^>]*>/g, '')
    .replace(/"/g, '&quot;')
    .trim()
  return `<div class="docs-endpoint" id="${id}" data-doc-search="${cleanSearch}">
    <div class="docs-endpoint-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="docs-method ${method.toLowerCase()}">${method}</span>
      <span class="docs-endpoint-path">${path}</span>
      <span class="docs-endpoint-summary">${summary}</span>
      <span class="docs-endpoint-chevron">${svg('chevronRight', 14)}</span>
    </div>
    <div class="docs-endpoint-body">
      ${authBadge}
      ${body}
    </div>
  </div>`
}

// ─── Utility: SDK method card ───
function methodCard(sig, returnType, description, body) {
  const cleanSearch = `${sig} ${returnType || ''} ${description || ''}`
    .replace(/<[^>]*>/g, '')
    .replace(/"/g, '&quot;')
    .trim()
  return `<div class="docs-method-card" data-doc-search="${cleanSearch}">
    <div class="docs-method-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="docs-sdk-badge">SDK</span>
      <span class="docs-method-sig">${sig}${returnType ? ` <span class="fn-return">→ ${returnType}</span>` : ''}</span>
      <span class="docs-endpoint-summary">${description}</span>
      <span class="docs-endpoint-chevron">${svg('chevronRight', 14)}</span>
    </div>
    <div class="docs-method-body">
      <p class="docs-endpoint-desc">${description}</p>
      ${body || ''}
    </div>
  </div>`
}

// ─── Utility: Contract address card ───
function contractCard(name, address, desc) {
  const id = 'cc-' + name.replace(/\s/g, '-')
  return `<div class="docs-contract-card" id="${id}">
    <span class="docs-contract-name">${name}</span>
    <span class="docs-contract-addr" title="${address}">${address}</span>
    <button class="docs-contract-copy" onclick="navigator.clipboard.writeText('${address}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)">Copy</button>
  </div>`
}

function callout(type, icon, text) {
  return `<div class="docs-callout ${type}">
    <span class="docs-callout-icon">${svg(icon, 16)}</span>
    <span>${text}</span>
  </div>`
}

// ═══════════════════════════════════════════════
//  SECTION RENDERERS
// ═══════════════════════════════════════════════

function renderGettingStarted() {
  const base = window.location.origin
  return `
  <div class="docs-section" id="doc-getting-started">
    <h2 class="docs-section-title">${svg('zap', 20)} Getting Started</h2>
    <p class="docs-section-desc">Everything you need to integrate Parcis into your application — from a simple payment button to full programmatic Web3 commerce.</p>

    ${callout('info', 'info', '<strong>Base URL:</strong> All REST API endpoints are available at <code>' + base + '/api/</code> — no signup required for public endpoints.')}

    <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px; margin-top:20px;">Installation Options</h3>

    ${codeBlock('html', 'Option 1: Script Tag (Browser)', `<span class="c-comment">&lt;!-- Drop into any HTML page --&gt;</span>
&lt;script src="${base}/sdk.js"&gt;&lt;/script&gt;

<span class="c-comment">&lt;!-- Use the global Parcis object --&gt;</span>
&lt;script&gt;
  Parcis.<span class="c-fn">pay</span>({ <span class="c-prop">address</span>: <span class="c-str">'your-link-slug'</span>, <span class="c-prop">amount</span>: <span class="c-num">25</span> })
&lt;/script&gt;`)}

    ${codeBlock('javascript', 'Option 2: ParcisClient SDK (Node / Viem)', `<span class="c-kw">import</span> { ParcisClient } <span class="c-kw">from</span> <span class="c-str">'./sdk/ParcisClient.js'</span>

<span class="c-kw">const</span> client = <span class="c-kw">new</span> <span class="c-fn">ParcisClient</span>({
  <span class="c-prop">rpcUrl</span>: <span class="c-str">'https://arc-testnet.drpc.org'</span>,
  <span class="c-prop">apiBase</span>: <span class="c-str">'${base}'</span>,
})

<span class="c-kw">const</span> score = <span class="c-kw">await</span> client.<span class="c-fn">getTrustScore</span>(<span class="c-str">'0x...'</span>)
console.<span class="c-fn">log</span>(score.trustScore, score.level)`)}

    <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px; margin-top:24px;">Authentication</h3>
    <p class="docs-section-desc">Most read-only endpoints are <strong>public</strong>. Endpoints that query user-specific data require an API key via the <code>X-API-Key</code> header.</p>

    ${codeBlock('bash', 'Authenticated Request', `curl -X GET "${base}/api/link?address=0x..." \\
  -H <span class="c-str">"X-API-Key: your-api-key-here"</span>`)}

    ${callout('success', 'key', 'API keys are generated deterministically from your wallet signature via EIP-712. Generate one in the <a href="#/console?tab=keys">Developer Console</a>.')}

    <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px; margin-top:24px;">Rate Limits</h3>
    ${paramTable(
      paramRow('Public endpoints', '60 req', false, 'Per IP, per 60-second sliding window') +
      paramRow('Authenticated endpoints', '120 req', false, 'Per API key, per 60-second sliding window') +
      paramRow('Sponsor-link', '10 req', false, 'Per address, per 60-second window (gas-sponsored)')
    )}
  </div>`
}

function renderRestApi() {
  const base = window.location.origin
  return `
  <div class="docs-section" id="doc-rest-api">
    <h2 class="docs-section-title">${svg('cpu', 20)} REST API Reference</h2>
    <p class="docs-section-desc">All endpoints return JSON. Errors include an <code>error</code> field with a human-readable message.</p>

    ${endpointCard('GET', '/api/health', 'System health & telemetry', 'public', `
      <p class="docs-endpoint-desc">Returns Arc RPC connection status, block height, latency, and deployed contract addresses. Useful for monitoring and integration testing.</p>
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"status"</span>: <span class="c-str">"healthy"</span>,
  <span class="c-prop">"protocol"</span>: <span class="c-str">"Parcis Protocol v2.0"</span>,
  <span class="c-prop">"network"</span>: {
    <span class="c-prop">"chainName"</span>: <span class="c-str">"Arc Testnet"</span>,
    <span class="c-prop">"chainId"</span>: <span class="c-num">5042002</span>,
    <span class="c-prop">"blockHeight"</span>: <span class="c-num">1234567</span>,
    <span class="c-prop">"latencyMs"</span>: <span class="c-num">48</span>
  },
  <span class="c-prop">"contracts"</span>: {
    <span class="c-prop">"links"</span>: <span class="c-str">"0xed01...1c94"</span>,
    <span class="c-prop">"escrowSafe"</span>: <span class="c-str">"0x462b...0077"</span>,
    <span class="c-prop">"streams"</span>: <span class="c-str">"0x2dba...c3d"</span>,
    <span class="c-prop">"usdc"</span>: <span class="c-str">"0x3600...0000"</span>
  },
  <span class="c-prop">"timestamp"</span>: <span class="c-str">"2026-09-19T03:00:00.000Z"</span>
}`)}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/score', 'Trust Score lookup', 'key', `
      <p class="docs-endpoint-desc">Returns the on-chain Trust Score (0-100), reputation level, and detailed activity breakdown for any wallet address. Uses multicall batching for performance.</p>
      <div class="docs-response-label">Parameters</div>
      ${paramTable(
        paramRow('address', 'string', true, 'Wallet address (0x format, 40 hex chars)')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"address"</span>: <span class="c-str">"0xDe46...aDe7"</span>,
  <span class="c-prop">"trustScore"</span>: <span class="c-num">78</span>,
  <span class="c-prop">"level"</span>: <span class="c-str">"Trusted"</span>,
  <span class="c-prop">"breakdown"</span>: {
    <span class="c-prop">"completionRate"</span>: <span class="c-num">0.92</span>,
    <span class="c-prop">"completionScore"</span>: <span class="c-num">36.8</span>,
    <span class="c-prop">"volumeScore"</span>: <span class="c-num">18.5</span>,
    <span class="c-prop">"activityScore"</span>: <span class="c-num">15.0</span>,
    <span class="c-prop">"disputePenalty"</span>: <span class="c-num">2.3</span>,
    <span class="c-prop">"totalDeals"</span>: <span class="c-num">25</span>,
    <span class="c-prop">"completed"</span>: <span class="c-num">23</span>,
    <span class="c-prop">"disputed"</span>: <span class="c-num">2</span>,
    <span class="c-prop">"totalVolume"</span>: <span class="c-num">4500.00</span>
  }
}`)}
      ${callout('info', 'info', '<strong>Scoring:</strong> Completion Rate (40%), Volume (25% log scale), Activity (20%), Dispute Penalty (up to -15%). Levels: New → Starter → Building → Established → Trusted → Legendary.')}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/link', 'Payment link lookup', 'key', `
      <p class="docs-endpoint-desc">Resolve a Parcis payment link by slug/ID, or query all links created by a wallet address. Returns on-chain metadata including amount, type, and payment stats.</p>
      <div class="docs-response-label">Parameters (use one mode)</div>
      ${paramTable(
        paramRow('id', 'string', false, 'Link slug (e.g. "my-shop") or bytes32 ID') +
        paramRow('address', 'string', false, 'Creator wallet address — returns all links for that wallet')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Single Link Response</div>
      ${codeBlock('json', 'Response (by id)', `{
  <span class="c-prop">"id"</span>: <span class="c-str">"my-shop"</span>,
  <span class="c-prop">"creator"</span>: <span class="c-str">"0xDe46...aDe7"</span>,
  <span class="c-prop">"label"</span>: <span class="c-str">"My Coffee Shop"</span>,
  <span class="c-prop">"amount"</span>: <span class="c-num">5.00</span>,
  <span class="c-prop">"description"</span>: <span class="c-str">"Pay for coffee"</span>,
  <span class="c-prop">"linkType"</span>: <span class="c-str">"standard"</span>,
  <span class="c-prop">"active"</span>: <span class="c-num">true</span>,
  <span class="c-prop">"totalRaised"</span>: <span class="c-num">250.00</span>,
  <span class="c-prop">"paymentCount"</span>: <span class="c-num">50</span>,
  <span class="c-prop">"payUrl"</span>: <span class="c-str">"${base}/#/pay/my-shop"</span>
}`)}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/deal', 'Escrow deal lookup', 'key', `
      <p class="docs-endpoint-desc">Fetch a single escrow deal by ID, or query all deals for a wallet (as client or worker). Returns terms, status, milestone proofs, and arbiter assignments.</p>
      <div class="docs-response-label">Parameters (use one mode)</div>
      ${paramTable(
        paramRow('id', 'number', false, 'Deal ID (numeric)') +
        paramRow('address', 'string', false, 'Wallet address — returns all deals as client or worker')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Single Deal Response</div>
      ${codeBlock('json', 'Response (by id)', `{
  <span class="c-prop">"dealId"</span>: <span class="c-num">42</span>,
  <span class="c-prop">"client"</span>: <span class="c-str">"0xAbc..."</span>,
  <span class="c-prop">"worker"</span>: <span class="c-str">"0xDef..."</span>,
  <span class="c-prop">"arbiter"</span>: <span class="c-str">"0x789..."</span>,
  <span class="c-prop">"amount"</span>: <span class="c-num">500.00</span>,
  <span class="c-prop">"status"</span>: <span class="c-str">"Funded"</span>,
  <span class="c-prop">"title"</span>: <span class="c-str">"Logo Design"</span>,
  <span class="c-prop">"deadline"</span>: <span class="c-num">1732300800</span>
}`)}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/stream', 'Streaming subscription lookup', 'key', `
      <p class="docs-endpoint-desc">Returns real-time continuous payment stream stats including elapsed flow, withdrawable amounts, rate per second, and progress percentage.</p>
      <div class="docs-response-label">Parameters</div>
      ${paramTable(
        paramRow('id', 'number', true, 'Stream ID (numeric)')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"streamId"</span>: <span class="c-num">7</span>,
  <span class="c-prop">"sender"</span>: <span class="c-str">"0xAbc..."</span>,
  <span class="c-prop">"recipient"</span>: <span class="c-str">"0xDef..."</span>,
  <span class="c-prop">"depositAmount"</span>: <span class="c-num">100.00</span>,
  <span class="c-prop">"amountWithdrawn"</span>: <span class="c-num">33.50</span>,
  <span class="c-prop">"claimableAmount"</span>: <span class="c-num">12.75</span>,
  <span class="c-prop">"ratePerSecond"</span>: <span class="c-num">0.0000386</span>,
  <span class="c-prop">"isActive"</span>: <span class="c-num">true</span>,
  <span class="c-prop">"progressPercent"</span>: <span class="c-num">46.25</span>,
  <span class="c-prop">"durationDays"</span>: <span class="c-num">30</span>
}`)}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/arbiters', 'Arbiter leaderboard', 'public', `
      <p class="docs-endpoint-desc">Returns the platform arbiter pool ranked by weighted trust score, stake amount, and disputes resolved. No authentication required.</p>
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"totalArbiters"</span>: <span class="c-num">5</span>,
  <span class="c-prop">"minStakeRequired"</span>: <span class="c-num">50.00</span>,
  <span class="c-prop">"arbiters"</span>: [
    {
      <span class="c-prop">"address"</span>: <span class="c-str">"0x789..."</span>,
      <span class="c-prop">"stake"</span>: <span class="c-num">200.00</span>,
      <span class="c-prop">"trustScore"</span>: <span class="c-num">92</span>,
      <span class="c-prop">"disputesResolved"</span>: <span class="c-num">15</span>,
      <span class="c-prop">"weightedScore"</span>: <span class="c-num">88.5</span>
    }
  ]
}`)}
      <a href="#/developers" class="docs-try-btn">${svg('send', 11)} Try it in Explorer</a>
    `)}

    ${endpointCard('GET', '/api/developer', 'Developer profile & usage', 'key', `
      <p class="docs-endpoint-desc">Returns developer profile from the on-chain DevRegistry: active tier, stream subscription status, and remaining API quota.</p>
      <div class="docs-response-label">Parameters</div>
      ${paramTable(
        paramRow('address', 'string', false, 'Developer wallet address. Defaults to the API key owner if omitted.')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"address"</span>: <span class="c-str">"0xDe46...aDe7"</span>,
  <span class="c-prop">"registered"</span>: <span class="c-num">true</span>,
  <span class="c-prop">"tier"</span>: <span class="c-str">"Builder"</span>,
  <span class="c-prop">"activeStream"</span>: <span class="c-num">true</span>,
  <span class="c-prop">"streamId"</span>: <span class="c-num">12</span>,
  <span class="c-prop">"remainingQuota"</span>: <span class="c-num">9500</span>
}`)}
    `)}

    ${endpointCard('POST', '/api/sponsor-link', 'Gas-sponsored link creation', 'public', `
      <p class="docs-endpoint-desc">Creates a Parcis payment link using the platform's admin wallet to sponsor gas fees. The user signs a message client-side; the server verifies and submits the transaction on their behalf.</p>
      ${callout('warning', 'alertTriangle', 'Rate limited to 10 requests per address per minute to prevent abuse.')}
      <div class="docs-response-label">Request Body (JSON)</div>
      ${paramTable(
        paramRow('message', 'string', true, 'The original message string the user signed') +
        paramRow('signature', 'string', true, 'The wallet signature (0x-prefixed)') +
        paramRow('address', 'string', true, 'The signer wallet address') +
        paramRow('linkData', 'object', true, 'Link creation params: { slug, label, amount, description, linkType, groupTarget }')
      )}
      <div class="docs-response-label"><span class="docs-status-badge s200">200</span> Response</div>
      ${codeBlock('json', 'Response', `{
  <span class="c-prop">"success"</span>: <span class="c-num">true</span>,
  <span class="c-prop">"txHash"</span>: <span class="c-str">"0xabc123..."</span>,
  <span class="c-prop">"linkId"</span>: <span class="c-str">"my-shop"</span>,
  <span class="c-prop">"payUrl"</span>: <span class="c-str">"${base}/#/pay/my-shop"</span>
}`)}
    `)}
  </div>`
}

function renderSdkReference() {
  return `
  <div class="docs-section" id="doc-sdk">
    <h2 class="docs-section-title">${svg('package', 20)} ParcisClient SDK Reference</h2>
    <p class="docs-section-desc">The <code>ParcisClient</code> is a full-featured Viem-based Web3 client for programmatic access to Links, Escrow, Streams, and Trust Scores on the Arc blockchain.</p>

    <div class="docs-subsection-header" id="sdk-constructor">
      <span class="docs-subgroup-icon">${svg('settings', 15)}</span>
      <span>Constructor</span>
    </div>
    ${methodCard(
      '<span class="fn-kw">new</span> <span class="fn-name">ParcisClient</span><span class="fn-paren">(</span><span class="fn-param">config?</span><span class="fn-paren">)</span>',
      'ParcisClient',
      'Creates a new ParcisClient instance. All parameters are optional with sensible defaults for Arc Testnet.',
      paramTable(
        paramRow('config.rpcUrl', 'string', false, 'RPC endpoint. Default: <code>https://arc-testnet.drpc.org</code>') +
        paramRow('config.apiBase', 'string', false, 'REST API base URL. Default: current origin') +
        paramRow('config.contracts', 'object', false, 'Contract address overrides: { links, escrow, streams, devRegistry, usdc }') +
        paramRow('config.publicClient', 'PublicClient', false, 'Custom Viem PublicClient instance') +
        paramRow('config.walletClient', 'WalletClient', false, 'Custom Viem WalletClient for write operations')
      ) +
      codeBlock('javascript', 'Example', `<span class="c-kw">const</span> client = <span class="c-kw">new</span> <span class="c-fn">ParcisClient</span>({
  <span class="c-prop">rpcUrl</span>: <span class="c-str">'https://arc-testnet.drpc.org'</span>,
  <span class="c-prop">walletClient</span>: myWalletClient,
})`)
    )}

    <div class="docs-subsection-header" id="sdk-links">
      <span class="docs-subgroup-icon">${svg('link', 15)}</span>
      <span>Links Methods</span>
    </div>

    ${methodCard(
      '<span class="fn-name">getLink</span><span class="fn-paren">(</span><span class="fn-param">slugOrId</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisLink&gt;',
      'Fetches a single payment link by slug or bytes32 ID from the ParcisLinks contract.',
      paramTable(paramRow('slugOrId', 'string', true, 'Human-readable slug or bytes32 ID'))
    )}

    ${methodCard(
      '<span class="fn-name">getUserLinks</span><span class="fn-paren">(</span><span class="fn-param">address?</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisLink[]&gt;',
      'Returns all payment links created by the given address. Defaults to the connected wallet.',
      paramTable(paramRow('address', 'string', false, 'Wallet address. Defaults to connected wallet'))
    )}

    ${methodCard(
      '<span class="fn-name">isSlugAvailable</span><span class="fn-paren">(</span><span class="fn-param">slug</span><span class="fn-paren">)</span>',
      'Promise&lt;boolean&gt;',
      'Checks if a slug is available for use as a payment link ID.',
      paramTable(paramRow('slug', 'string', true, 'The slug to check'))
    )}

    ${methodCard(
      '<span class="fn-name">createLink</span><span class="fn-paren">(</span><span class="fn-param">options</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Creates a new on-chain payment link. Requires a connected wallet.',
      paramTable(
        paramRow('options.id', 'string', true, 'Unique slug/ID for the link') +
        paramRow('options.label', 'string', true, 'Display label (e.g. "My Shop")') +
        paramRow('options.amount', 'number', false, 'Fixed USDC amount. Omit for open/tip links') +
        paramRow('options.description', 'string', false, 'Description shown on the pay page') +
        paramRow('options.linkType', 'number', false, '0=Standard, 1=Tip, 2=Group') +
        paramRow('options.groupTarget', 'number', false, 'Target payer count (for group links)')
      )
    )}

    ${methodCard(
      '<span class="fn-name">payLink</span><span class="fn-paren">(</span><span class="fn-param">slugOrId, amountUsdc</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Pays a Parcis link with USDC. Handles allowance approval automatically.',
      paramTable(
        paramRow('slugOrId', 'string', true, 'Link slug or bytes32 ID') +
        paramRow('amountUsdc', 'number|string', true, 'USDC amount to pay')
      )
    )}

    ${methodCard(
      '<span class="fn-name">resolveSlug</span><span class="fn-paren">(</span><span class="fn-param">slug</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisLink&gt;',
      'Resolves a human-readable slug to its full on-chain link data. Alias for <code>getLink(slug)</code>.',
      paramTable(paramRow('slug', 'string', true, 'Link slug'))
    )}

    <div class="docs-subsection-header" id="sdk-escrow">
      <span class="docs-subgroup-icon">${svg('shield', 15)}</span>
      <span>Escrow Methods</span>
    </div>

    ${methodCard(
      '<span class="fn-name">createEscrow</span><span class="fn-paren">(</span><span class="fn-param">options</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Creates a new escrow deal between a client and worker with an assigned arbiter.',
      paramTable(
        paramRow('options.worker', 'string', true, 'Worker wallet address') +
        paramRow('options.arbiter', 'string', true, 'Arbiter wallet address') +
        paramRow('options.amount', 'number|string', true, 'USDC amount to escrow') +
        paramRow('options.deadline', 'number', false, 'Unix timestamp deadline') +
        paramRow('options.title', 'string', true, 'Deal title') +
        paramRow('options.description', 'string', false, 'Deal description')
      )
    )}

    ${methodCard(
      '<span class="fn-name">getDeal</span><span class="fn-paren">(</span><span class="fn-param">dealId</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisDeal&gt;',
      'Fetches a single escrow deal by its numeric ID.',
      paramTable(paramRow('dealId', 'number|string', true, 'Deal ID'))
    )}

    ${methodCard(
      '<span class="fn-name">getUserDeals</span><span class="fn-paren">(</span><span class="fn-param">address?</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisDeal[]&gt;',
      'Returns all escrow deals where the address is a client or worker.',
      paramTable(paramRow('address', 'string', false, 'Wallet address. Defaults to connected wallet'))
    )}

    <div class="docs-subsection-header" id="sdk-streams">
      <span class="docs-subgroup-icon">${svg('activity', 15)}</span>
      <span>Streams Methods</span>
    </div>

    ${methodCard(
      '<span class="fn-name">startStream</span><span class="fn-paren">(</span><span class="fn-param">options</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Starts a continuous USDC payment stream to a recipient. Funds are streamed per-second.',
      paramTable(
        paramRow('options.recipient', 'string', true, 'Recipient wallet address') +
        paramRow('options.amount', 'number|string', true, 'Total USDC deposit amount') +
        paramRow('options.durationDays', 'number', false, 'Stream duration in days. Default: 30')
      )
    )}

    ${methodCard(
      '<span class="fn-name">getStream</span><span class="fn-paren">(</span><span class="fn-param">streamId</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisStream&gt;',
      'Fetches real-time stream data including claimable amount and progress.',
      paramTable(paramRow('streamId', 'number|string', true, 'Stream ID'))
    )}

    ${methodCard(
      '<span class="fn-name">getStreamBalance</span><span class="fn-paren">(</span><span class="fn-param">streamId</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisStreamBalance&gt;',
      'Returns withdrawable and refundable amounts for a stream.',
      paramTable(paramRow('streamId', 'number|string', true, 'Stream ID'))
    )}

    ${methodCard(
      '<span class="fn-name">withdrawStream</span><span class="fn-paren">(</span><span class="fn-param">streamId</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Withdraws available funds from a stream (recipient only).',
      paramTable(paramRow('streamId', 'number|string', true, 'Stream ID'))
    )}

    ${methodCard(
      '<span class="fn-name">cancelStream</span><span class="fn-paren">(</span><span class="fn-param">streamId</span><span class="fn-paren">)</span>',
      'Promise&lt;TransactionReceipt&gt;',
      'Cancels an active stream and refunds remaining deposit (sender only).',
      paramTable(paramRow('streamId', 'number|string', true, 'Stream ID'))
    )}

    <div class="docs-subsection-header" id="sdk-trust">
      <span class="docs-subgroup-icon">${svg('award', 15)}</span>
      <span>Trust &amp; Reputation</span>
    </div>

    ${methodCard(
      '<span class="fn-name">getTrustScore</span><span class="fn-paren">(</span><span class="fn-param">address</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisTrustScoreResponse&gt;',
      'Returns the calculated trust score, level, and full activity breakdown for any wallet.',
      paramTable(paramRow('address', 'string', true, 'Wallet address'))
    )}

    ${methodCard(
      '<span class="fn-name">getArbiters</span><span class="fn-paren">(</span><span class="fn-paren">)</span>',
      'Promise&lt;{ arbiters, totalArbiters, minStakeRequired }&gt;',
      'Returns the full arbiter leaderboard, sorted by weighted score.',
      ''
    )}

    ${methodCard(
      '<span class="fn-name">getArbiter</span><span class="fn-paren">(</span><span class="fn-param">address</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisArbiter&gt;',
      'Fetches a single arbiter profile by wallet address.',
      paramTable(paramRow('address', 'string', true, 'Arbiter wallet address'))
    )}

    <div class="docs-subsection-header" id="sdk-utility">
      <span class="docs-subgroup-icon">${svg('heart', 15)}</span>
      <span>Utility Methods</span>
    </div>

    ${methodCard(
      '<span class="fn-name">getHealth</span><span class="fn-paren">(</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisHealth&gt;',
      'Returns protocol health status, block height, and latency.',
      ''
    )}

    ${methodCard(
      '<span class="fn-name">getBalance</span><span class="fn-paren">(</span><span class="fn-param">address?</span><span class="fn-paren">)</span>',
      'Promise&lt;ParcisBalance&gt;',
      'Returns USDC balance for a wallet address.',
      paramTable(paramRow('address', 'string', false, 'Wallet address. Defaults to connected wallet'))
    )}

    <div class="docs-subsection-header" id="sdk-events">
      <span class="docs-subgroup-icon">${svg('radio', 15)}</span>
      <span>Event System</span>
    </div>

    ${methodCard(
      '<span class="fn-name">on</span><span class="fn-paren">(</span><span class="fn-param">event, listener</span><span class="fn-paren">)</span>',
      '() =&gt; void (unsubscribe)',
      'Subscribe to client events. Returns an unsubscribe function.',
      codeBlock('javascript', 'Events', `<span class="c-comment">// Available events:</span>
<span class="c-str">'tx:pending'</span>    <span class="c-comment">// Transaction submitted to network</span>
<span class="c-str">'tx:confirmed'</span>  <span class="c-comment">// Transaction confirmed on-chain</span>
<span class="c-str">'tx:error'</span>      <span class="c-comment">// Transaction failed or reverted</span>
<span class="c-str">'link:paid'</span>     <span class="c-comment">// Link payment completed</span>
<span class="c-str">'deal:created'</span>  <span class="c-comment">// Escrow deal created</span>
<span class="c-str">'stream:started'</span> <span class="c-comment">// Stream started</span>

<span class="c-kw">const</span> unsub = client.<span class="c-fn">on</span>(<span class="c-str">'tx:confirmed'</span>, (data) => {
  console.<span class="c-fn">log</span>(<span class="c-str">'Confirmed:'</span>, data.hash)
})
<span class="c-comment">// Later: unsub() to remove listener</span>`)
    )}
  </div>`
}

function renderWebComponents() {
  return `
  <div class="docs-section" id="doc-components">
    <h2 class="docs-section-title">${svg('layers', 20)} Web Components</h2>
    <p class="docs-section-desc">Drop-in HTML elements for instant checkout. These web components work in any framework — React, Vue, Svelte, plain HTML.</p>

    <h3 style="font-size:1rem; font-weight:700; margin:20px 0 12px;">&lt;parcis-pay&gt;</h3>
    <p class="docs-section-desc">Renders a styled "Pay with Parcis" button that opens an in-page checkout modal.</p>
    ${paramTable(
      paramRow('address', 'string', true, 'Recipient wallet address (0x) or Parcis slug') +
      paramRow('amount', 'number', false, 'USDC amount. Omit for open/tip payments') +
      paramRow('label', 'string', false, 'Custom button text. Default: "Pay with Parcis"') +
      paramRow('description', 'string', false, 'Description shown in checkout') +
      paramRow('display', 'string', false, '<code>modal</code> (default), <code>popup</code>, or <code>redirect</code>') +
      paramRow('theme', 'string', false, '<code>dark</code> (default) or <code>light</code>') +
      paramRow('size', 'string', false, '<code>sm</code>, <code>md</code> (default), or <code>lg</code>')
    )}
    ${codeBlock('html', 'Example', `&lt;parcis-pay
  <span class="c-prop">address</span>=<span class="c-str">"my-shop"</span>
  <span class="c-prop">amount</span>=<span class="c-str">"25"</span>
  <span class="c-prop">label</span>=<span class="c-str">"Buy for $25 USDC"</span>
  <span class="c-prop">theme</span>=<span class="c-str">"dark"</span>
  <span class="c-prop">display</span>=<span class="c-str">"modal"</span>
&gt;&lt;/parcis-pay&gt;`)}

    <h3 style="font-size:1rem; font-weight:700; margin:28px 0 12px;">&lt;parcis-stream&gt;</h3>
    <p class="docs-section-desc">A subscription button that starts a per-second USDC stream to the recipient.</p>
    ${paramTable(
      paramRow('address', 'string', true, 'Recipient wallet address or slug') +
      paramRow('amount', 'number', true, 'Total USDC deposit for the stream') +
      paramRow('duration', 'number', false, 'Stream duration in days. Default: 30') +
      paramRow('display', 'string', false, '<code>modal</code> (default), <code>popup</code>, or <code>redirect</code>') +
      paramRow('theme', 'string', false, '<code>dark</code> or <code>light</code>')
    )}
    ${codeBlock('html', 'Example', `&lt;parcis-stream
  <span class="c-prop">address</span>=<span class="c-str">"0xDe46...aDe7"</span>
  <span class="c-prop">amount</span>=<span class="c-str">"100"</span>
  <span class="c-prop">duration</span>=<span class="c-str">"30"</span>
&gt;&lt;/parcis-stream&gt;`)}

    <h3 style="font-size:1rem; font-weight:700; margin:28px 0 12px;">&lt;parcis-profile&gt;</h3>
    <p class="docs-section-desc">Renders an inline identity card showing a wallet's trust score, reputation level, and deal history.</p>
    ${paramTable(
      paramRow('address', 'string', true, 'Target wallet address') +
      paramRow('theme', 'string', false, '<code>dark</code> (default) or <code>light</code>') +
      paramRow('size', 'string', false, '<code>sm</code>, <code>md</code> (default), or <code>lg</code>')
    )}
    ${codeBlock('html', 'Example', `&lt;parcis-profile
  <span class="c-prop">address</span>=<span class="c-str">"0xDe46...aDe7"</span>
  <span class="c-prop">theme</span>=<span class="c-str">"dark"</span>
  <span class="c-prop">size</span>=<span class="c-str">"md"</span>
&gt;&lt;/parcis-profile&gt;`)}

    <h3 style="font-size:1rem; font-weight:700; margin:28px 0 12px;">${svg('radio', 16)} PostMessage Events</h3>
    <p class="docs-section-desc">When using <code>modal</code> or <code>popup</code> display mode, the checkout iframe broadcasts lifecycle events via <code>window.postMessage</code>.</p>
    ${codeBlock('javascript', 'Event Listener', `window.<span class="c-fn">addEventListener</span>(<span class="c-str">'message'</span>, (event) => {
  <span class="c-kw">const</span> { type, txHash, amount, payer } = event.data || {}

  <span class="c-kw">if</span> (type === <span class="c-str">'PARCIS_PAYMENT_SUCCESS'</span>) {
    console.<span class="c-fn">log</span>(<span class="c-str">'✅ Paid:'</span>, txHash, amount, <span class="c-str">'USDC'</span>)
  }
  <span class="c-kw">if</span> (type === <span class="c-str">'PARCIS_PAYMENT_ERROR'</span>) {
    console.<span class="c-fn">error</span>(<span class="c-str">'❌ Failed:'</span>, event.data.error)
  }
  <span class="c-kw">if</span> (type === <span class="c-str">'PARCIS_MODAL_CLOSE'</span>) {
    console.<span class="c-fn">log</span>(<span class="c-str">'Modal dismissed'</span>)
  }
})`)}
  </div>`
}

function renderContracts() {
  return `
  <div class="docs-section" id="doc-contracts">
    <h2 class="docs-section-title">${svg('fileText', 20)} Smart Contracts</h2>
    <p class="docs-section-desc">All Parcis contracts are deployed on <strong>Arc Mainnet</strong> (Chain ID: <code>5042</code>) and <strong>Arc Testnet</strong> (Chain ID: <code>5042002</code>) as UUPS upgradeable proxies.</p>

    <h3 style="font-size:1rem; font-weight:700; margin:20px 0 12px; color:var(--green);">Arc Mainnet Deployed Addresses (Chain ID: 5042)</h3>
    ${contractCard('ParcisLinks', '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0', 'Payment link creation, vanity slugs and platform fees')}
    ${contractCard('ParcisSafe (Escrow)', '0x7BD84F1EDA677c98217F590560E8C0577Efba809', 'Trustless escrow with arbitration & staking')}
    ${contractCard('ParcisStreams', '0xe6775F130F61d9d2e3E93Dad2e6d971788D36557', 'Per-second USDC streaming')}
    ${contractCard('ParcisDevRegistry', '0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1', 'Developer API registration & tier subscriptions')}

    <h3 style="font-size:1rem; font-weight:700; margin:24px 0 12px; color:var(--text-sec);">Arc Testnet Deployed Addresses (Chain ID: 5042002)</h3>
    ${contractCard('ParcisLinks', '0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94', 'Payment link creation and resolution')}
    ${contractCard('ParcisSafe (Escrow)', '0x462b674d2feD79CD38e813eb5455e3DCf27D0077', 'Trustless escrow with arbitration')}
    ${contractCard('ParcisStreams', '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d', 'Per-second USDC streaming')}
    ${contractCard('ParcisDevRegistry', '0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670', 'Developer registration and API key hashes')}
    ${contractCard('USDC Token', '0x3600000000000000000000000000000000000000', 'Native USDC on Arc Network')}
    ${contractCard('Multicall3', '0xcA11bde05977b3631167028862bE2a173976CA11', 'Batch read calls')}

    ${callout('info', 'info', 'All contracts use the <strong>UUPS proxy pattern</strong> (OpenZeppelin). The addresses above are the proxy addresses — the implementation can be upgraded without changing the address.')}

    <h3 style="font-size:1rem; font-weight:700; margin:24px 0 12px;">Key Contract Functions</h3>

    <h4 style="font-size:0.9rem; font-weight:700; margin:16px 0 8px; color:#10b981;">ParcisLinks</h4>
    ${codeBlock('solidity', 'ParcisLinks.sol', `<span class="c-kw">function</span> <span class="c-fn">createLink</span>(bytes32 id, string label, uint256 amount, string desc, uint8 linkType, uint32 groupTarget)
<span class="c-kw">function</span> <span class="c-fn">payLink</span>(bytes32 id, uint256 amount)
<span class="c-kw">function</span> <span class="c-fn">getLink</span>(bytes32 id) <span class="c-kw">view returns</span> (Link)
<span class="c-kw">function</span> <span class="c-fn">getUserLinks</span>(address user) <span class="c-kw">view returns</span> (bytes32[])
<span class="c-kw">function</span> <span class="c-fn">toggleLink</span>(bytes32 id)  <span class="c-comment">// Activate/deactivate</span>`)}

    <h4 style="font-size:0.9rem; font-weight:700; margin:16px 0 8px; color:#8b5cf6;">ParcisSafe (Escrow)</h4>
    ${codeBlock('solidity', 'ParcisSafe.sol', `<span class="c-kw">function</span> <span class="c-fn">createDeal</span>(address worker, address arbiter, uint256 amount, uint256 deadline, string title, string desc)
<span class="c-kw">function</span> <span class="c-fn">fundDeal</span>(uint256 dealId)
<span class="c-kw">function</span> <span class="c-fn">submitDeliverable</span>(uint256 dealId, string proof)
<span class="c-kw">function</span> <span class="c-fn">approveDeal</span>(uint256 dealId)
<span class="c-kw">function</span> <span class="c-fn">disputeDeal</span>(uint256 dealId, string reason)
<span class="c-kw">function</span> <span class="c-fn">resolveDispute</span>(uint256 dealId, uint8 resolution)  <span class="c-comment">// Arbiter only</span>`)}

    <h4 style="font-size:0.9rem; font-weight:700; margin:16px 0 8px; color:#60a5fa;">ParcisStreams</h4>
    ${codeBlock('solidity', 'ParcisStreams.sol', `<span class="c-kw">function</span> <span class="c-fn">createStream</span>(address recipient, uint256 deposit, uint256 startTime, uint256 stopTime)
<span class="c-kw">function</span> <span class="c-fn">withdrawFromStream</span>(uint256 streamId)
<span class="c-kw">function</span> <span class="c-fn">cancelStream</span>(uint256 streamId)
<span class="c-kw">function</span> <span class="c-fn">getStream</span>(uint256 streamId) <span class="c-kw">view returns</span> (Stream)
<span class="c-kw">function</span> <span class="c-fn">balanceOf</span>(uint256 streamId, address who) <span class="c-kw">view returns</span> (uint256)`)}
  </div>`
}

function renderErrors() {
  return `
  <div class="docs-section" id="doc-errors">
    <h2 class="docs-section-title">${svg('alertTriangle', 20)} Error Reference</h2>
    <p class="docs-section-desc">Both the REST API and SDK use consistent error patterns.</p>

    <h3 style="font-size:1rem; font-weight:700; margin:20px 0 12px;">HTTP Status Codes</h3>
    ${paramTable(
      '<tr><td><span class="docs-status-badge s200">200</span></td><td></td><td></td><td>Success. Response body contains the requested data.</td></tr>' +
      '<tr><td><span class="docs-status-badge s400">400</span></td><td></td><td></td><td>Bad Request. Missing or invalid query parameters.</td></tr>' +
      '<tr><td><span class="docs-status-badge s400">401</span></td><td></td><td></td><td>Unauthorized. Missing or invalid API key for authenticated endpoints.</td></tr>' +
      '<tr><td><span class="docs-status-badge s400">404</span></td><td></td><td></td><td>Not Found. The requested entity does not exist on-chain.</td></tr>' +
      '<tr><td><span class="docs-status-badge s429">429</span></td><td></td><td></td><td>Rate Limited. Too many requests in the sliding window.</td></tr>' +
      '<tr><td><span class="docs-status-badge s503">503</span></td><td></td><td></td><td>Service Unavailable. RPC node unreachable or slow.</td></tr>'
    )}

    <h3 style="font-size:1rem; font-weight:700; margin:24px 0 12px;">SDK Error Classes</h3>

    <div class="docs-method-card" style="margin-bottom:10px;">
      <div style="padding:14px 16px;">
        <div style="font-family:'SF Mono',monospace; font-size:0.82rem; margin-bottom:6px;"><span style="color:#ef4444;">ParcisError</span> extends Error</div>
        <p style="font-size:0.8rem; color:var(--text-sec);">Base error class. Properties: <code>code</code> (string), <code>details</code> (object).</p>
      </div>
    </div>
    <div class="docs-method-card" style="margin-bottom:10px;">
      <div style="padding:14px 16px;">
        <div style="font-family:'SF Mono',monospace; font-size:0.82rem; margin-bottom:6px;"><span style="color:#f59e0b;">RpcTimeoutError</span> extends ParcisError</div>
        <p style="font-size:0.8rem; color:var(--text-sec);">Code: <code>RPC_TIMEOUT</code>. Thrown when an RPC call exceeds the timeout threshold.</p>
      </div>
    </div>
    <div class="docs-method-card" style="margin-bottom:10px;">
      <div style="padding:14px 16px;">
        <div style="font-family:'SF Mono',monospace; font-size:0.82rem; margin-bottom:6px;"><span style="color:#f59e0b;">InsufficientAllowanceError</span> extends ParcisError</div>
        <p style="font-size:0.8rem; color:var(--text-sec);">Code: <code>INSUFFICIENT_ALLOWANCE</code>. USDC approval failed or is insufficient for the operation.</p>
      </div>
    </div>
    <div class="docs-method-card" style="margin-bottom:10px;">
      <div style="padding:14px 16px;">
        <div style="font-family:'SF Mono',monospace; font-size:0.82rem; margin-bottom:6px;"><span style="color:#ef4444;">TransactionRevertedError</span> extends ParcisError</div>
        <p style="font-size:0.8rem; color:var(--text-sec);">Code: <code>TRANSACTION_REVERTED</code>. The on-chain transaction was reverted by the EVM.</p>
      </div>
    </div>
    <div class="docs-method-card" style="margin-bottom:10px;">
      <div style="padding:14px 16px;">
        <div style="font-family:'SF Mono',monospace; font-size:0.82rem; margin-bottom:6px;"><span style="color:#f59e0b;">EntityNotFoundError</span> extends ParcisError</div>
        <p style="font-size:0.8rem; color:var(--text-sec);">Code: <code>ENTITY_NOT_FOUND</code>. The requested link, deal, or stream does not exist on-chain.</p>
      </div>
    </div>

    ${codeBlock('javascript', 'Error Handling', `<span class="c-kw">import</span> { ParcisClient, EntityNotFoundError, RpcTimeoutError } <span class="c-kw">from</span> <span class="c-str">'./sdk/ParcisClient.js'</span>

<span class="c-kw">try</span> {
  <span class="c-kw">const</span> link = <span class="c-kw">await</span> client.<span class="c-fn">getLink</span>(<span class="c-str">'non-existent-slug'</span>)
} <span class="c-kw">catch</span> (err) {
  <span class="c-kw">if</span> (err <span class="c-kw">instanceof</span> EntityNotFoundError) {
    console.<span class="c-fn">log</span>(<span class="c-str">'Link does not exist'</span>)
  } <span class="c-kw">else if</span> (err <span class="c-kw">instanceof</span> RpcTimeoutError) {
    console.<span class="c-fn">log</span>(<span class="c-str">'Network slow — retrying...'</span>)
  }
}`)}
  </div>`
}

// ═══════════════════════════════════════════════
//  SIDEBAR NAV DATA
// ═══════════════════════════════════════════════

const NAV_SECTIONS = [
  {
    id: 'getting-started', label: 'Getting Started', icon: 'zap',
    items: [
      { id: 'doc-getting-started', label: 'Overview & Installation' },
    ]
  },
  {
    id: 'rest-api', label: 'REST API', icon: 'cpu',
    items: [
      { id: 'ep--api-health', label: 'GET /api/health' },
      { id: 'ep--api-score', label: 'GET /api/score' },
      { id: 'ep--api-link', label: 'GET /api/link' },
      { id: 'ep--api-deal', label: 'GET /api/deal' },
      { id: 'ep--api-stream', label: 'GET /api/stream' },
      { id: 'ep--api-arbiters', label: 'GET /api/arbiters' },
      { id: 'ep--api-developer', label: 'GET /api/developer' },
      { id: 'ep--api-sponsor-link', label: 'POST /api/sponsor-link' },
    ]
  },
  {
    id: 'sdk', label: 'ParcisClient SDK', icon: 'package',
    items: [
      { id: 'sdk-constructor', label: 'Constructor' },
      { id: 'sdk-links', label: 'Links Methods' },
      { id: 'sdk-escrow', label: 'Escrow Methods' },
      { id: 'sdk-streams', label: 'Streams Methods' },
      { id: 'sdk-trust', label: 'Trust & Reputation' },
      { id: 'sdk-utility', label: 'Utility Methods' },
      { id: 'sdk-events', label: 'Event System' },
    ]
  },
  {
    id: 'components', label: 'Web Components', icon: 'layers',
    items: [
      { id: 'doc-components', label: 'Pay, Stream & Profile' },
    ]
  },
  {
    id: 'contracts', label: 'Smart Contracts', icon: 'fileText',
    items: [
      { id: 'doc-contracts', label: 'Addresses & Functions' },
    ]
  },
  {
    id: 'errors', label: 'Error Reference', icon: 'alertTriangle',
    items: [
      { id: 'doc-errors', label: 'HTTP Codes & SDK Errors' },
    ]
  },
]

function renderSidebar() {
  let groups = ''
  for (const section of NAV_SECTIONS) {
    let items = ''
    for (const item of section.items) {
      items += `<a class="docs-nav-item" data-target="${item.id}" onclick="window._docsScrollTo('${item.id}')">${item.label}</a>`
    }
    groups += `
    <div class="docs-nav-group open" id="nav-grp-${section.id}">
      <div class="docs-nav-group-label" onclick="this.parentElement.classList.toggle('open')">
        ${svg(section.icon, 14)}
        ${section.label}
        <span class="chevron">${svg('chevronRight', 10)}</span>
      </div>
      <div class="docs-nav-items">${items}</div>
    </div>`
  }

  return `
  <aside class="docs-sidebar" id="docs-sidebar">
    <div class="docs-sidebar-title">Documentation</div>
    <div class="docs-search">
      <span class="docs-search-icon">${svg('search', 14)}</span>
      <input type="text" placeholder="Search docs..." id="docs-search-input" oninput="window._docsFilter(this.value)">
    </div>
    ${groups}
  </aside>
  <div class="docs-sidebar-overlay" id="docs-sidebar-overlay" onclick="window._docsCloseMobile()"></div>`
}

// ═══════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════

export function renderDocs(subRoute, query) {
  return `
  <div class="docs-page">
    ${renderSidebar()}
    <div class="docs-content" id="docs-content">
      <div class="docs-content-header">
        <h1>Parcis API & SDK Documentation</h1>
        <p>Complete reference for the Parcis Protocol — REST APIs, ParcisClient SDK, Web Components, and Smart Contracts on Arc Network.</p>
      </div>
      ${renderGettingStarted()}
      ${renderRestApi()}
      ${renderSdkReference()}
      ${renderWebComponents()}
      ${renderContracts()}
      ${renderErrors()}
    </div>
    <button class="docs-mobile-toggle" id="docs-mobile-toggle" onclick="window._docsToggleMobile()" aria-label="Toggle docs sidebar">
      ${svg('menu', 22)}
    </button>
  </div>`
}

// ═══════════════════════════════════════════════
//  GLOBAL HANDLERS
// ═══════════════════════════════════════════════

// Copy code block
window._docsCopy = function(id, btn) {
  const el = document.getElementById(id)
  if (!el) return
  const text = el.textContent || el.innerText
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML
    btn.innerHTML = `${svg('check', 11)} Copied!`
    btn.style.color = '#10b981'
    btn.style.borderColor = 'rgba(16,185,129,0.4)'
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; btn.style.borderColor = '' }, 1800)
  })
}

// Scroll to section
window._docsScrollTo = function(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // If endpoint card, open it
    if (el.classList.contains('docs-endpoint')) {
      el.classList.add('open')
    }
  }
  // Close mobile sidebar
  window._docsCloseMobile()
  // Highlight active nav item
  document.querySelectorAll('.docs-nav-item').forEach(i => i.classList.remove('active'))
  const navItem = document.querySelector(`.docs-nav-item[data-target="${id}"]`)
  if (navItem) navItem.classList.add('active')
}

// Mobile sidebar toggle
window._docsToggleMobile = function() {
  const sidebar = document.getElementById('docs-sidebar')
  const overlay = document.getElementById('docs-sidebar-overlay')
  if (sidebar) sidebar.classList.toggle('mobile-open')
  if (overlay) overlay.classList.toggle('mobile-open')
}
window._docsCloseMobile = function() {
  const sidebar = document.getElementById('docs-sidebar')
  const overlay = document.getElementById('docs-sidebar-overlay')
  if (sidebar) sidebar.classList.remove('mobile-open')
  if (overlay) overlay.classList.remove('mobile-open')
}

// Search/filter
window._docsFilter = function(query) {
  const q = query.toLowerCase().trim()
  const items = document.querySelectorAll('.docs-endpoint, .docs-method-card')
  items.forEach(item => {
    const searchText = (item.dataset.docSearch || item.textContent || '').toLowerCase()
    if (!q || searchText.includes(q)) {
      item.style.display = ''
    } else {
      item.style.display = 'none'
    }
  })
}
