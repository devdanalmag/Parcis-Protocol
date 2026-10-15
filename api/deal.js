/**
 * ═══ Parcis Escrow Deal API ═══
 * GET /api/deal?id=123 (fetch single deal terms, proofs, and arbitration)
 * GET /api/deal?address=0x... (fetch all escrow deals for a client or worker)
 * 
 * Returns on-chain escrow deal terms, status, milestone deliverable proofs, and arbiter assignments.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  authenticateDevRequest,
  SAFE_CONTRACT,
  SAFE_ABI,
  DEAL_STATUS_LABELS,
  formatUnits
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=10, stale-while-revalidate=60' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateDevRequest(req, res);
  if (!auth) return;

  const { id, address, client: clientQuery, worker: workerQuery } = req.query;
  const targetAddress = address || clientQuery || workerQuery;

  // Mode 1: Query deals by user address (?address=0x...)
  if (targetAddress) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format', usage: 'GET /api/deal?address=0x...' });
    }

    try {
      const client = getClient();
      const addr = targetAddress.toLowerCase();

      const [clientDealIdsRes, workerDealIdsRes] = await Promise.allSettled([
        client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'getClientDeals', args: [addr] }),
        client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'getWorkerDeals', args: [addr] }),
      ]);

      const clientDealIds = clientDealIdsRes.status === 'fulfilled' ? clientDealIdsRes.value : [];
      const workerDealIds = workerDealIdsRes.status === 'fulfilled' ? workerDealIdsRes.value : [];

      const dealMap = new Map();
      for (const dealId of clientDealIds) {
        dealMap.set(dealId.toString(), { id: dealId, role: 'client' });
      }
      for (const dealId of workerDealIds) {
        const existing = dealMap.get(dealId.toString());
        if (existing) existing.role = 'both';
        else dealMap.set(dealId.toString(), { id: dealId, role: 'worker' });
      }

      const uniqueEntries = Array.from(dealMap.values()).slice(0, 50);

      if (uniqueEntries.length === 0) {
        return res.status(200).json({
          address: targetAddress,
          totalDeals: 0,
          clientDealsCount: clientDealIds.length,
          workerDealsCount: workerDealIds.length,
          deals: [],
          timestamp: new Date().toISOString(),
        });
      }

      const calls = uniqueEntries.map(e => ({
        address: SAFE_CONTRACT,
        abi: SAFE_ABI,
        functionName: 'getDeal',
        args: [e.id],
      }));

      const results = await client.multicall({ contracts: calls, allowFailure: true });

      const deals = [];
      results.forEach((r, idx) => {
        if (r.status === 'success' && r.result) {
          const deal = r.result;
          const entry = uniqueEntries[idx];
          const statusCode = Number(deal.status);
          deals.push({
            dealId: Number(entry.id),
            userRole: entry.role,
            client: deal.client,
            worker: deal.worker,
            arbiter: deal.arbiter,
            amount: parseFloat(formatUnits(deal.amount || 0n, 6)),
            amountRaw: deal.amount.toString(),
            status: DEAL_STATUS_LABELS[statusCode] || 'Unknown',
            statusCode,
            deadline: Number(deal.deadline),
            title: deal.title,
            description: deal.description,
            deliverable: deal.deliverable,
            createdAt: Number(deal.createdAt),
          });
        }
      });

      return res.status(200).json({
        address: targetAddress,
        totalDeals: dealMap.size,
        clientDealsCount: clientDealIds.length,
        workerDealsCount: workerDealIds.length,
        deals,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      console.error('[Deal Query By Address API Error]', err?.message);
      return res.status(500).json({ error: 'Failed to fetch deals for address', message: err.message });
    }
  }

  // Mode 2: Query single deal by numeric ID (?id=...)
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      error: 'Missing or invalid deal id or address',
      usage: 'GET /api/deal?id=1 or GET /api/deal?address=0x...'
    });
  }

  const dealId = BigInt(id);

  try {
    const client = getClient();

    const [dealRes, disputeReasonRes, resTimestampRes, appealWindowRes] = await Promise.allSettled([
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'getDeal', args: [dealId] }),
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'disputeReasons', args: [dealId] }),
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'resolutionTimestamp', args: [dealId] }),
      client.readContract({ address: SAFE_CONTRACT, abi: SAFE_ABI, functionName: 'appealWindowDuration' }),
    ]);

    if (dealRes.status !== 'fulfilled' || !dealRes.value) {
      return res.status(404).json({ error: 'Deal not found', dealId: Number(dealId) });
    }

    const deal = dealRes.value;
    if (deal.client === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({ error: 'Deal not found', dealId: Number(dealId) });
    }

    const statusCode = Number(deal.status);
    const amountUsdc = parseFloat(formatUnits(deal.amount || 0n, 6));
    const disputeReason = disputeReasonRes.status === 'fulfilled' ? disputeReasonRes.value : '';
    const resolutionTimestamp = resTimestampRes.status === 'fulfilled' ? Number(resTimestampRes.value) : 0;
    const appealWindowDuration = appealWindowRes.status === 'fulfilled' ? Number(appealWindowRes.value) : 172800;

    return res.status(200).json({
      dealId: Number(dealId),
      client: deal.client,
      worker: deal.worker,
      arbiter: deal.arbiter,
      amount: amountUsdc,
      amountRaw: deal.amount.toString(),
      status: DEAL_STATUS_LABELS[statusCode] || 'Unknown',
      statusCode,
      deadline: Number(deal.deadline),
      title: deal.title,
      description: deal.description,
      deliverable: deal.deliverable,
      createdAt: Number(deal.createdAt),
      disputeReason,
      resolutionTimestamp,
      appealWindowDuration,
      isAppealWindowActive: statusCode === 5 && resolutionTimestamp > 0 && (Date.now() / 1000) < (resolutionTimestamp + appealWindowDuration),
    });

  } catch (err) {
    console.error('[Deal API Error]', err?.message);
    return res.status(500).json({ error: 'Failed to fetch deal', message: err.message });
  }
}
