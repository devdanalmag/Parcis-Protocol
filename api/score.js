/**
 * ═══ Parcis Trust Score API v2.0 (High Performance) ═══
 * GET /api/score?address=0x...
 * 
 * Returns the on-chain Trust Score (0-100), reputation level, and detailed activity metrics.
 * Uses indexed contract queries (getUserLinks, clientDeals, workerDeals) and multicall batching.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  authenticateDevRequest,
  SAFE_CONTRACT,
  SAFE_ABI,
  LINKS_CONTRACT,
  LINKS_ABI,
  formatUnits
} from './_shared.js';

// Status enum: 0=Created, 1=Funded, 2=Submitted, 3=Completed, 4=Disputed, 5=Resolved, 6=Cancelled, 7=Appealed
const STATUS = { CREATED: 0, FUNDED: 1, SUBMITTED: 2, COMPLETED: 3, DISPUTED: 4, RESOLVED: 5, CANCELLED: 6, APPEALED: 7 };

function calculateTrustScore(stats) {
  const { completed, total, disputed, totalVolume, linksCount } = stats;

  if (total === 0 && linksCount === 0) {
    return { score: 0, level: 'New', breakdown: stats };
  }

  // Completion Rate (40% weight)
  const completionRate = total > 0 ? (completed / total) : 0;
  const completionScore = completionRate * 40;

  // Volume Score (25% weight) — logarithmic scale, caps at 10k USDC
  const volumeScore = Math.min(Math.log10(totalVolume + 1) / 4, 1) * 25;

  // Activity Score (20% weight) — based on total deals + links
  const activity = total + linksCount;
  const activityScore = Math.min(activity / 20, 1) * 20;

  // Dispute Penalty (up to -15%)
  const disputeRatio = total > 0 ? (disputed / total) : 0;
  const disputePenalty = disputeRatio * 15;

  const rawScore = Math.max(0, Math.min(100, Math.round(completionScore + volumeScore + activityScore - disputePenalty)));

  let level = 'New';
  if (rawScore >= 90) level = 'Legendary';
  else if (rawScore >= 75) level = 'Trusted';
  else if (rawScore >= 50) level = 'Established';
  else if (rawScore >= 25) level = 'Building';
  else if (rawScore > 0) level = 'Starter';

  return {
    score: rawScore,
    level,
    breakdown: {
      completionRate: Math.round(completionRate * 100),
      completionScore: Math.round(completionScore * 10) / 10,
      volumeScore: Math.round(volumeScore * 10) / 10,
      activityScore: Math.round(activityScore * 10) / 10,
      disputePenalty: Math.round(disputePenalty * 10) / 10,
      ...stats,
    }
  };
}

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=60, stale-while-revalidate=300' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateDevRequest(req, res);
  if (!auth) return;

  const { address } = req.query;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      error: 'Invalid address',
      usage: 'GET /api/score?address=0x...',
    });
  }

  const addr = address.toLowerCase();

  try {
    const client = getClient();

    // ─── Step 1: Query indexed deal IDs and user link IDs in parallel ───
    const [clientDealIdsRes, workerDealIdsRes, userLinkIdsRes] = await Promise.allSettled([
      client.readContract({
        address: SAFE_CONTRACT,
        abi: SAFE_ABI,
        functionName: 'getClientDeals',
        args: [addr],
      }),
      client.readContract({
        address: SAFE_CONTRACT,
        abi: SAFE_ABI,
        functionName: 'getWorkerDeals',
        args: [addr],
      }),
      client.readContract({
        address: LINKS_CONTRACT,
        abi: LINKS_ABI,
        functionName: 'getUserLinks',
        args: [addr],
      }),
    ]);

    const clientDealIds = clientDealIdsRes.status === 'fulfilled' ? clientDealIdsRes.value : [];
    const workerDealIds = workerDealIdsRes.status === 'fulfilled' ? workerDealIdsRes.value : [];
    const userLinkIds = userLinkIdsRes.status === 'fulfilled' ? userLinkIdsRes.value : [];

    // Combine and deduplicate deal IDs
    const allDealIdMap = new Map();
    for (const id of clientDealIds) allDealIdMap.set(id.toString(), { id, isClient: true, isWorker: false });
    for (const id of workerDealIds) {
      const existing = allDealIdMap.get(id.toString());
      if (existing) existing.isWorker = true;
      else allDealIdMap.set(id.toString(), { id, isClient: false, isWorker: true });
    }

    const MAX_BATCH = 100;
    const uniqueDealEntries = Array.from(allDealIdMap.values()).slice(0, MAX_BATCH);

    // ─── Step 2: Batch fetch deal details via multicall ───
    let completed = 0, disputed = 0, volumeEarned = 0, volumeSpent = 0;
    const totalDeals = uniqueDealEntries.length;

    if (uniqueDealEntries.length > 0) {
      const dealCalls = uniqueDealEntries.map(e => ({
        address: SAFE_CONTRACT,
        abi: SAFE_ABI,
        functionName: 'getDeal',
        args: [e.id],
      }));

      const dealResults = await client.multicall({ contracts: dealCalls, allowFailure: true });

      dealResults.forEach((res, idx) => {
        if (res.status === 'success' && res.result) {
          const deal = res.result;
          const entry = uniqueDealEntries[idx];
          const amountUsdc = parseFloat(formatUnits(deal.amount || 0n, 6));
          const status = Number(deal.status);

          if (status === STATUS.COMPLETED || status === STATUS.RESOLVED) {
            completed++;
            if (entry.isWorker) volumeEarned += amountUsdc;
            if (entry.isClient) volumeSpent += amountUsdc;
          }
          if (status === STATUS.DISPUTED || status === STATUS.APPEALED) {
            disputed++;
          }
        }
      });
    }

    // ─── Step 3: Batch fetch user link details via multicall ───
    let totalReceived = 0;
    const slicedUserLinkIds = userLinkIds.slice(0, MAX_BATCH);
    const linksCount = slicedUserLinkIds.length;

    if (slicedUserLinkIds.length > 0) {
      const linkCalls = slicedUserLinkIds.map(id => ({
        address: LINKS_CONTRACT,
        abi: LINKS_ABI,
        functionName: 'getLink',
        args: [id],
      }));

      const linkResults = await client.multicall({ contracts: linkCalls, allowFailure: true });

      linkResults.forEach(res => {
        if (res.status === 'success' && res.result) {
          const link = res.result;
          totalReceived += parseFloat(formatUnits(link.totalRaised || 0n, 6));
        }
      });
    }

    const totalVolume = volumeEarned + volumeSpent + totalReceived;

    const result = calculateTrustScore({
      completed,
      total: totalDeals,
      disputed,
      totalVolume,
      volumeEarned,
      volumeSpent,
      linksCount,
      totalReceived,
    });

    return res.status(200).json({
      address,
      trustScore: result.score,
      level: result.level,
      breakdown: result.breakdown,
      protocol: 'Parcis',
      chain: 'Arc Testnet',
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Parcis Score API Error]', err?.message);
    return res.status(500).json({ error: 'Failed to calculate trust score', message: err.message });
  }
}
