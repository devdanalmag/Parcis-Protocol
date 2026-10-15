/**
 * ═══ Parcis Link Resolution & Query API ═══
 * GET /api/link?id=my-slug or GET /api/link?id=0x...
 * GET /api/link?address=0x... (queries all links created by a wallet)
 * 
 * Returns on-chain metadata for Parcis payment links.
 */

import {
  getClient,
  checkRateLimit,
  getClientIp,
  setCorsAndCache,
  authenticateDevRequest,
  slugToBytes32,
  LINKS_CONTRACT,
  LINKS_ABI,
  LINK_TYPES,
  formatUnits
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'GET, OPTIONS', cache: 's-maxage=30, stale-while-revalidate=120' });

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateDevRequest(req, res);
  if (!auth) return;

  const { id, address } = req.query;

  // Mode 1: Query all links by creator address (?address=0x...)
  if (address) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid wallet address format', usage: 'GET /api/link?address=0x...' });
    }

    try {
      const client = getClient();
      const userLinkIds = await client.readContract({
        address: LINKS_CONTRACT,
        abi: LINKS_ABI,
        functionName: 'getUserLinks',
        args: [address.toLowerCase()],
      });

      if (!userLinkIds || userLinkIds.length === 0) {
        return res.status(200).json({
          address,
          totalLinks: 0,
          links: [],
          timestamp: new Date().toISOString(),
        });
      }

      // Multicall link details up to 50 links
      const idsToFetch = userLinkIds.slice(0, 50);
      const calls = idsToFetch.map(linkId => ({
        address: LINKS_CONTRACT,
        abi: LINKS_ABI,
        functionName: 'getLink',
        args: [linkId],
      }));

      const results = await client.multicall({ contracts: calls, allowFailure: true });

      const links = [];
      results.forEach((r, idx) => {
        if (r.status === 'success' && r.result) {
          const raw = r.result;
          const linkIdHex = idsToFetch[idx];
          const typeNum = Number(raw.linkType);
          links.push({
            id: linkIdHex,
            creator: raw.creator,
            label: raw.label,
            amount: parseFloat(formatUnits(raw.amount || 0n, 6)),
            amountRaw: raw.amount.toString(),
            description: raw.description,
            linkType: LINK_TYPES[typeNum] || 'Unknown',
            linkTypeCode: typeNum,
            groupTarget: Number(raw.groupTarget),
            active: Boolean(raw.active),
            createdAt: Number(raw.createdAt),
            totalRaised: parseFloat(formatUnits(raw.totalRaised || 0n, 6)),
            paymentCount: Number(raw.paymentCount),
            payUrl: `https://parcis.app/#/pay/${linkIdHex}`,
          });
        }
      });

      return res.status(200).json({
        address,
        totalLinks: userLinkIds.length,
        links,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      console.error('[Link Query By Address API Error]', err?.message);
      return res.status(500).json({ error: 'Failed to fetch user links', message: err.message });
    }
  }

  // Mode 2: Query single link by slug or bytes32 ID (?id=...)
  if (!id) {
    return res.status(400).json({
      error: 'Missing link id or address parameter',
      usage: 'GET /api/link?id=my-slug or GET /api/link?address=0x...'
    });
  }

  const idBytes = slugToBytes32(id);

  try {
    const client = getClient();

    const link = await client.readContract({
      address: LINKS_CONTRACT,
      abi: LINKS_ABI,
      functionName: 'getLink',
      args: [idBytes],
    });

    if (!link || link.creator === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({ error: 'Link not found', id, idBytes32: idBytes });
    }

    const typeNum = Number(link.linkType);
    const amountUsdc = parseFloat(formatUnits(link.amount || 0n, 6));
    const totalRaisedUsdc = parseFloat(formatUnits(link.totalRaised || 0n, 6));
    const cleanSlug = typeof id === 'string' && !id.startsWith('0x') ? id : undefined;

    return res.status(200).json({
      id: cleanSlug || id,
      idBytes32: idBytes,
      creator: link.creator,
      label: link.label,
      amount: amountUsdc,
      amountRaw: link.amount.toString(),
      description: link.description,
      linkType: LINK_TYPES[typeNum] || 'Unknown',
      linkTypeCode: typeNum,
      groupTarget: Number(link.groupTarget),
      active: Boolean(link.active),
      createdAt: Number(link.createdAt),
      totalRaised: totalRaisedUsdc,
      paymentCount: Number(link.paymentCount),
      payUrl: `https://parcis.app/#/pay/${cleanSlug || idBytes}`,
    });

  } catch (err) {
    console.error('[Link API Error]', err?.message);
    return res.status(500).json({ error: 'Failed to fetch link', message: err.message });
  }
}
