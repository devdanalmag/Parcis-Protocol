/**
 * ═══ Parcis Streams API ═══
 * GET /api/stream?id=123
 * 
 * Returns real-time continuous subscription stream stats, elapsed flow, and withdrawable amounts.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  authenticateDevRequest,
  STREAMS_CONTRACT,
  STREAMS_ABI,
  formatUnits
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=5, stale-while-revalidate=15' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateDevRequest(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Missing or invalid stream id', usage: 'GET /api/stream?id=1' });
  }

  const streamId = BigInt(id);

  try {
    const client = getClient();

    const rawStream = await client.readContract({
      address: STREAMS_CONTRACT,
      abi: STREAMS_ABI,
      functionName: 'streams',
      args: [streamId],
    });

    const [sender, recipient, depositAmount, startTime, stopTime, amountWithdrawn, isActive] = rawStream;

    if (sender === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({ error: 'Stream not found', streamId: Number(streamId) });
    }

    const now = Math.floor(Date.now() / 1000);
    const start = Number(startTime);
    const stop = Number(stopTime);
    const duration = Math.max(1, stop - start);
    const depositUsdc = parseFloat(formatUnits(depositAmount || 0n, 6));
    const withdrawnUsdc = parseFloat(formatUnits(amountWithdrawn || 0n, 6));

    // Calculate accrued real-time balance
    let totalAccruedUsdc = 0;
    let claimableUsdc = 0;
    let remainingDepositUsdc = 0;

    if (!isActive) {
      // Contract returns (0, 0) when isActive is false (cancelled or fully finalized)
      totalAccruedUsdc = withdrawnUsdc;
      claimableUsdc = 0;
      remainingDepositUsdc = 0;
    } else if (now >= stop) {
      totalAccruedUsdc = depositUsdc;
      claimableUsdc = Math.max(0, depositUsdc - withdrawnUsdc);
      remainingDepositUsdc = 0;
    } else if (now > start) {
      const elapsed = now - start;
      totalAccruedUsdc = (depositUsdc * elapsed) / duration;
      claimableUsdc = Math.max(0, totalAccruedUsdc - withdrawnUsdc);
      remainingDepositUsdc = Math.max(0, depositUsdc - totalAccruedUsdc);
    } else {
      totalAccruedUsdc = 0;
      claimableUsdc = 0;
      remainingDepositUsdc = depositUsdc;
    }

    const ratePerSecondUsdc = duration > 0 ? depositUsdc / duration : 0;

    return res.status(200).json({
      streamId: Number(streamId),
      sender,
      recipient,
      depositAmount: depositUsdc,
      depositAmountRaw: depositAmount.toString(),
      amountWithdrawn: withdrawnUsdc,
      claimableAmount: claimableUsdc,
      remainingUnstreamed: remainingDepositUsdc,
      ratePerSecond: ratePerSecondUsdc,
      startTime: start,
      stopTime: stop,
      durationSeconds: duration,
      durationDays: duration / 86400,
      isActive: Boolean(isActive),
      progressPercent: depositUsdc > 0 ? Math.min(100, Math.max(0, (totalAccruedUsdc / depositUsdc) * 100)) : 0,
      isCompleted: now >= stop,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Stream API Error]', err?.message);
    return res.status(500).json({ error: 'Failed to fetch stream', message: err.message });
  }
}
