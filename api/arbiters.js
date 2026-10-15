/**
 * ═══ Parcis Arbiter Leaderboard API ═══
 * GET /api/arbiters
 * 
 * Returns the platform arbiter pool ranked by weighted trust score, stake, and disputes resolved.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  SAFE_CONTRACT,
  SAFE_ABI,
  formatUnits
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=60, stale-while-revalidate=300' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const client = getClient();

    const [arbitersListRes, minStakeRes] = await Promise.allSettled([
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'getPlatformArbiters' }),
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'minArbiterStake' }),
    ]);

    const arbitersList = arbitersListRes.status === 'fulfilled' ? arbitersListRes.value : [];
    const minStake = minStakeRes.status === 'fulfilled' ? parseFloat(formatUnits(minStakeRes.value, 6)) : 10.0;

    if (arbitersList.length === 0) {
      return res.status(200).json({
        totalArbiters: 0,
        minStakeRequired: minStake,
        arbiters: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Multicall all arbiter metrics in parallel
    const calls = [];
    arbitersList.forEach(addr => {
      calls.push({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'arbiterStake', args: [addr] });
      calls.push({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'arbiterTrustScore', args: [addr] });
      calls.push({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'arbiterDisputesResolved', args: [addr] });
      calls.push({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'getArbiterWeightedScore', args: [addr] });
    });

    const results = await client.multicall({ contracts: calls, allowFailure: true });

    const arbiters = [];
    for (let i = 0; i < arbitersList.length; i++) {
      const addr = arbitersList[i];
      const baseIdx = i * 4;

      const stakeRaw = results[baseIdx]?.status === 'success' ? results[baseIdx].result : 0n;
      const trustScoreRaw = results[baseIdx + 1]?.status === 'success' ? results[baseIdx + 1].result : 100n;
      const resolvedRaw = results[baseIdx + 2]?.status === 'success' ? results[baseIdx + 2].result : 0n;
      const weightedScoreRaw = results[baseIdx + 3]?.status === 'success' ? results[baseIdx + 3].result : 0n;

      const stakeUsdc = parseFloat(formatUnits(stakeRaw, 6));
      const trustScore = Number(trustScoreRaw);
      const disputesResolved = Number(resolvedRaw);
      const weightedScore = Number(weightedScoreRaw);

      arbiters.push({
        address: addr,
        stake: stakeUsdc,
        trustScore,
        disputesResolved,
        weightedScore,
        status: stakeUsdc >= minStake ? 'Active' : 'Undercollateralized',
      });
    }

    // Sort by weightedScore desc, then stake desc
    arbiters.sort((a, b) => b.weightedScore - a.weightedScore || b.stake - a.stake);

    return res.status(200).json({
      totalArbiters: arbiters.length,
      minStakeRequired: minStake,
      arbiters,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Arbiters API Error]', err?.message);
    return res.status(500).json({ error: 'Failed to fetch arbiters', message: err.message });
  }
}
