/**
 * ═══ Parcis Developer Profile & Usage API ═══
 * GET /api/developer (with X-API-Key header)
 * GET /api/developer?address=0x...
 * 
 * Returns developer profile, active tier, stream status, and remaining quota.
 */

import {
  getClient,
  setCorsAndCache,
  authenticateDevRequest,
  DEV_REGISTRY_CONTRACT,
  DEV_REGISTRY_ABI,
  TIER_NAMES
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=5, stale-while-revalidate=15' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateDevRequest(req, res);
  if (!auth) return;

  const targetAddress = req.query?.address || auth.devAddress;

  if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
    return res.status(400).json({
      error: 'Missing or invalid developer address. Provide ?address=0x... or supply a valid X-API-Key header.',
      usage: 'GET /api/developer?address=0x...'
    });
  }

  try {
    const client = getClient();
    const result = await client.readContract({
      address: DEV_REGISTRY_CONTRACT,
      abi: DEV_REGISTRY_ABI,
      functionName: 'getDeveloper',
      args: [targetAddress]
    });

    const [dev, currentTier, isTrialActive, trialSecondsRemaining, isStreamActive, callLimit] = result;
    const tierName = TIER_NAMES[currentTier] || 'Free';

    // Fetch webhooks if registered
    let webhooks = [];
    try {
      webhooks = await client.readContract({
        address: DEV_REGISTRY_CONTRACT,
        abi: DEV_REGISTRY_ABI,
        functionName: 'getWebhooks',
        args: [targetAddress]
      });
    } catch {
      webhooks = [];
    }

    const callsUsed = Number(dev.apiCallsUsed);
    const limit = callLimit === 115792089237316195423570985008687907853269984665640564039457584007913129639935n
      ? 'Unlimited'
      : Number(callLimit);

    return res.status(200).json({
      developer: {
        address: dev.wallet,
        registered: dev.active,
        registeredAt: Number(dev.registeredAt),
        tier: currentTier,
        tierName,
        isTrialActive,
        trialSecondsRemaining: Number(trialSecondsRemaining),
        isStreamActive,
        activeStreamId: Number(dev.activeStreamId),
        hasApiKey: dev.apiKeyHash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      },
      usage: {
        callsUsed,
        callLimit: limit,
        remainingCalls: typeof limit === 'number' ? Math.max(0, limit - callsUsed) : 'Unlimited',
        cycleStartTime: Number(dev.cycleStartTime)
      },
      webhooks: (webhooks || []).map(w => ({
        url: w.url,
        eventType: Number(w.eventType),
        active: w.active
      }))
    });
  } catch (err) {
    console.error('Developer API error:', err);
    return res.status(500).json({ error: 'Failed to query developer profile', details: err.message });
  }
}
