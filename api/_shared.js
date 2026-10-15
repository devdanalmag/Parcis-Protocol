/**
 * ═══ Parcis API Shared Utilities & Chain Configuration ═══
 * Common RPC client, chain definitions, ABIs, and rate-limiting
 * shared across all Parcis serverless API endpoints.
 */

import { createPublicClient, http, defineChain, formatUnits, parseUnits, keccak256, stringToBytes } from 'viem';

const serverNetwork = (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase();
export const isMainnet = serverNetwork === 'mainnet' || 
  (!serverNetwork && (
    process.env.VITE_CHAIN_ID === '5042' || 
    process.env.CHAIN_ID === '5042' ||
    (process.env.RPC_URL && !process.env.RPC_URL.includes('testnet')) ||
    (process.env.VITE_RPC_URL && !process.env.VITE_RPC_URL.includes('testnet'))
  ));

export function resolveServerEnv(keySuffix, mainnetFallback, testnetFallback) {
  const mainVal = process.env[`MAINNET_${keySuffix}`] || process.env[`VITE_MAINNET_${keySuffix}`];
  const testVal = process.env[`TESTNET_${keySuffix}`] || process.env[`VITE_TESTNET_${keySuffix}`];
  const directVal = process.env[keySuffix] || process.env[`VITE_${keySuffix}`];

  if (isMainnet) {
    return mainVal || directVal || mainnetFallback;
  } else {
    return testVal || directVal || testnetFallback;
  }
}

export const ARC_RPC = resolveServerEnv('RPC_URL', 'https://rpc.mainnet.arc.io', 'https://arc-testnet.drpc.org');
export const LINKS_CONTRACT = resolveServerEnv('LINKS_CONTRACT', '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0', '0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94');
export const SAFE_CONTRACT = resolveServerEnv('ARCSAFE_CONTRACT', '0x7BD84F1EDA677c98217F590560E8C0577Efba809', '0x462b674d2feD79CD38e813eb5455e3DCf27D0077');
export const STREAMS_CONTRACT = resolveServerEnv('STREAMS_CONTRACT', '0xe6775F130F61d9d2e3E93Dad2e6d971788D36557', '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d');
export const DEV_REGISTRY_CONTRACT = resolveServerEnv('DEV_REGISTRY_CONTRACT', '0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1', '0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670');
export const USDC_ADDRESS = resolveServerEnv('USDC_ADDRESS', '0x3600000000000000000000000000000000000000', '0x3600000000000000000000000000000000000000');
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export const CHAIN_ID = parseInt(resolveServerEnv('CHAIN_ID', '5042', '5042002'));
export const CHAIN_NAME = resolveServerEnv('CHAIN_NAME', 'Arc', 'Arc Testnet');

export const arcChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
  contracts: {
    multicall3: {
      address: MULTICALL3_ADDRESS,
    },
  },
});
export const arcTestnet = arcChain; // Backwards-compatible alias for existing imports

let _publicClient = null;

/**
 * Returns a cached singleton PublicClient connected to Arc Testnet
 */
export function getClient(rpcUrl = ARC_RPC) {
  if (!_publicClient || rpcUrl !== ARC_RPC) {
    _publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(rpcUrl, {
        retryCount: 3,
        retryDelay: 800,
        timeout: 12000,
      }),
    });
  }
  return _publicClient;
}

/**
 * In-memory sliding-window rate limiter (for Vercel lambda & Vite dev server)
 */
const rateMap = new Map();
export function checkRateLimit(key, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const entry = rateMap.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  rateMap.set(key, entry);
  return entry.count <= limit;
}

/**
 * Extracts client IP address from request headers or socket
 */
export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

/**
 * Sets standard CORS and Cache-Control headers
 */
export function setCorsAndCache(res, {
  methods = 'GET, OPTIONS',
  cache = 's-maxage=30, stale-while-revalidate=120',
  origin = '*',
} = {}) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-Developer-Tier');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (cache) {
    res.setHeader('Cache-Control', cache);
  }
}

/**
 * Converts a string slug or hex to bytes32 format
 */
export function slugToBytes32(slug) {
  if (typeof slug === 'string' && slug.startsWith('0x') && slug.length === 66) {
    return slug;
  }
  const buf = Buffer.alloc(32);
  buf.write(String(slug || '').toLowerCase().trim(), 'utf8');
  return `0x${buf.toString('hex')}`;
}

export const LINK_TYPES = ['Fixed', 'Open', 'Group', 'Stream'];
export const DEAL_STATUS_LABELS = ['Created', 'Funded', 'Submitted', 'Completed', 'Disputed', 'Resolved', 'Cancelled', 'Appealed'];

// ─── Shared Smart Contract ABIs ───

export const LINKS_ABI = [
  {
    name: 'getLink', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{
      type: 'tuple', components: [
        { name: 'creator', type: 'address' },
        { name: 'label', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'description', type: 'string' },
        { name: 'linkType', type: 'uint8' },
        { name: 'groupTarget', type: 'uint8' },
        { name: 'active', type: 'bool' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'totalRaised', type: 'uint256' },
        { name: 'paymentCount', type: 'uint256' }
      ]
    }]
  },
  {
    name: 'isIdAvailable', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'bool' }]
  },
  {
    name: 'getUserLinks', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bytes32[]' }]
  },
  {
    name: 'createLinkFor', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator',     type: 'address' },
      { name: 'id',          type: 'bytes32' },
      { name: 'label',       type: 'string'  },
      { name: 'amount',      type: 'uint256' },
      { name: 'description', type: 'string'  },
      { name: 'linkType',    type: 'uint8'   },
      { name: 'groupTarget', type: 'uint8'   },
    ], outputs: []
  },
];

export const SAFE_ABI = [
  {
    name: 'getDeal', type: 'function', stateMutability: 'view',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [{
      type: 'tuple', components: [
        { name: 'client', type: 'address' },
        { name: 'worker', type: 'address' },
        { name: 'arbiter', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'deliverable', type: 'string' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' }
      ]
    }]
  },
  {
    name: 'getClientDeals', type: 'function', stateMutability: 'view',
    inputs: [{ name: '_a', type: 'address' }], outputs: [{ type: 'uint256[]' }]
  },
  {
    name: 'getWorkerDeals', type: 'function', stateMutability: 'view',
    inputs: [{ name: '_a', type: 'address' }], outputs: [{ type: 'uint256[]' }]
  },
  {
    name: 'disputeReasons', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'string' }]
  },
  {
    name: 'resolutionTimestamp', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'appealWindowDuration', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getPlatformArbiters', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'address[]' }]
  },
  {
    name: 'arbiterStake', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'arbiterTrustScore', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'arbiterDisputesResolved', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'minArbiterStake', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getArbiterWeightedScore', type: 'function', stateMutability: 'view',
    inputs: [{ name: '_arbiter', type: 'address' }], outputs: [{ type: 'uint256' }]
  },
];

export const STREAMS_ABI = [
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
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'streamId', type: 'uint256' }],
    outputs: [
      { name: 'recipientBalance', type: 'uint256' },
      { name: 'senderRefund', type: 'uint256' }
    ]
  }
];

export const ERC20_ABI = [
  {
    name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint8' }]
  },
  {
    name: 'symbol', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'string' }]
  },
];

export const DEV_REGISTRY_ABI = [
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
  },
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
    name: 'recordApiCall', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'devAddress', type: 'address' }, { name: 'count', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'getWebhooks', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'devAddress', type: 'address' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'url', type: 'string' },
          { name: 'eventType', type: 'uint8' },
          { name: 'active', type: 'bool' }
        ]
      }
    ]
  }
];

export const TIER_NAMES = ['Free', 'Pro', 'Enterprise'];

/**
 * Middleware helper to authenticate and rate-limit API calls using on-chain developer keys.
 * Returns { devAddress, tier, tierName, callsRemaining, authenticated: true/false }
 */
export async function authenticateDevRequest(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query?.apiKey || null;
  
  if (!apiKey) {
    // No API key provided — enforce standard IP rate limit (60/min)
    const ip = getClientIp(req);
    if (!checkRateLimit(`ip:${ip}`, 60, 60000)) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        error: 'Too many requests. Include an X-API-Key header to increase limits or visit /#/console to get an on-chain key.',
        tier: 'Public',
        rateLimit: 60
      });
      return null;
    }
    return { authenticated: false, tier: 0, tierName: 'Public', isPublic: true };
  }

  try {
    const keyHash = keccak256(stringToBytes(String(apiKey).trim()));
    const client = getClient();
    const result = await client.readContract({
      address: DEV_REGISTRY_CONTRACT,
      abi: DEV_REGISTRY_ABI,
      functionName: 'verifyApiKey',
      args: [keyHash]
    });

    const [devAddress, tier, callsUsed, callLimit, isValid] = result;
    const tierName = TIER_NAMES[tier] || 'Free';

    // Set rate limit headers
    const remaining = callLimit > callsUsed ? Number(callLimit - callsUsed) : 0;
    res.setHeader('X-RateLimit-Limit', callLimit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-Developer-Tier', tierName);

    if (!isValid) {
      if (devAddress === '0x0000000000000000000000000000000000000000') {
        res.status(401).json({
          error: 'Invalid or revoked API key. Register or generate keys at /#/console.',
          code: 'INVALID_API_KEY'
        });
        return null;
      }
      res.status(429).json({
        error: `Monthly quota of ${callLimit} calls exceeded for ${tierName} tier. Upgrade your plan at /#/console.`,
        code: 'QUOTA_EXCEEDED',
        tier: tierName,
        limit: Number(callLimit),
        used: Number(callsUsed)
      });
      return null;
    }

    return {
      authenticated: true,
      devAddress,
      tier,
      tierName,
      callsUsed: Number(callsUsed),
      callLimit: Number(callLimit),
      remaining
    };
  } catch (err) {
    console.warn('API key verification fallback:', err?.message || err);
    return { authenticated: false, tier: 0, tierName: 'Fallback', error: err?.message };
  }
}

export { formatUnits, parseUnits };
