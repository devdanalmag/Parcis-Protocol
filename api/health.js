/**
 * ═══ Parcis Protocol Health & Telemetry API ═══
 * GET /api/health
 * 
 * Returns Arc RPC connection status, block height, latency, and deployed contract addresses.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  ARC_RPC,
  CHAIN_ID,
  CHAIN_NAME,
  LINKS_CONTRACT,
  SAFE_CONTRACT,
  STREAMS_CONTRACT,
  DEV_REGISTRY_CONTRACT,
  USDC_ADDRESS,
  MULTICALL3_ADDRESS
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 'no-cache, no-store, must-revalidate' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const startTime = Date.now();

  try {
    const client = getClient();
    const blockNumber = await client.getBlockNumber();
    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      status: 'healthy',
      protocol: 'Parcis Protocol v2.0',
      network: {
        chainName: CHAIN_NAME,
        chainId: CHAIN_ID,
        rpcUrl: ARC_RPC,
        blockHeight: Number(blockNumber),
        latencyMs,
      },
      contracts: {
        links: LINKS_CONTRACT,
        escrowSafe: SAFE_CONTRACT,
        streams: STREAMS_CONTRACT,
        devRegistry: DEV_REGISTRY_CONTRACT,
        usdc: USDC_ADDRESS,
        multicall3: MULTICALL3_ADDRESS,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      error: 'RPC unreachable or slow',
      message: err.message,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
}
