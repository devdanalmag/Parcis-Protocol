// ═══ Vercel API: Gas Sponsorship for Parcis Link Creation ═══
// POST /api/sponsor-link
// Body: { message, signature, address, linkData }
//
// Environment variables required in Vercel / server:
//   SPONSOR_PRIVATE_KEY (or ADMIN_PRIVATE_KEY) - private key of gas sponsorship relayer wallet
//   LINKS_CONTRACT     - deployed ParcisLinks contract address
//   RPC_URL            - https://arc-testnet.drpc.org

import { createWalletClient, http, verifyMessage } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  arcTestnet,
  getClient,
  checkRateLimit,
  setCorsAndCache,
  slugToBytes32,
  LINKS_CONTRACT,
  LINKS_ABI,
  parseUnits,
  isMainnet
} from './_shared.js';

export default async function handler(req, res) {
  setCorsAndCache(res, { methods: 'POST, OPTIONS', cache: 'no-store' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, signature, address, linkData } = req.body || {};

    // 1. Validate inputs
    if (!message || !signature || !address || !linkData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!linkData.slug || !linkData.label) {
      return res.status(400).json({ error: 'Invalid link data' });
    }

    // Premium custom links are not eligible for gas sponsorship
    if (linkData.premium) {
      return res.status(400).json({ error: 'Premium custom links require USDC in your wallet. Sponsorship is for free-tier links only. Get USDC from the faucet.' });
    }

    // 2. Verify signature - proves user owns the wallet
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Safe message parsing and expiration & replay check
    let parsed;
    try {
      parsed = typeof message === 'string' ? JSON.parse(message) : message;
    } catch {
      return res.status(400).json({ error: 'Malformed message format' });
    }

    const now = Date.now();
    if (!parsed.timestamp || typeof parsed.timestamp !== 'number') {
      return res.status(400).json({ error: 'Missing timestamp in signed message' });
    }
    // Reject signatures older than 5 minutes or in the future by more than 1 minute (clock skew)
    if (now - parsed.timestamp > 5 * 60 * 1000 || parsed.timestamp > now + 60 * 1000) {
      return res.status(400).json({ error: 'Request expired. Please sign a new link request.' });
    }

    // Reject if signed for a different chain ID (cross-chain replay protection)
    if (parsed.chainId && parsed.chainId !== arcTestnet.id) {
      return res.status(400).json({ error: `Signature meant for chain ${parsed.chainId}, expected ${arcTestnet.id}` });
    }

    // 4. Rate limit: max 3 sponsored links per wallet per 24 hours
    if (!checkRateLimit(`sponsor:${address.toLowerCase()}`, 3, 86400000)) {
      return res.status(429).json({ error: 'Daily limit reached (3 sponsored links/day). Get USDC from the faucet for future links.' });
    }

    // 5. Setup gas sponsorship relayer wallet
    const sponsorKey = isMainnet
      ? (process.env.MAINNET_SPONSOR_PRIVATE_KEY || process.env.MAINNET_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY)
      : (process.env.TESTNET_SPONSOR_PRIVATE_KEY || process.env.TESTNET_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY);
    const contractAddr = process.env.LINKS_CONTRACT || LINKS_CONTRACT;
    if (!sponsorKey || !contractAddr) {
      return res.status(500).json({ error: 'Sponsorship not configured on server' });
    }

    const sponsorAccount = privateKeyToAccount(`0x${sponsorKey.replace(/^0x/, '')}`);
    const wc = createWalletClient({ account: sponsorAccount, chain: arcTestnet, transport: http() });
    const pc = getClient();

    // 6. Check ID is still available
    const idBytes = slugToBytes32(linkData.slug);
    const available = await pc.readContract({
      address: contractAddr, abi: LINKS_ABI, functionName: 'isIdAvailable', args: [idBytes],
    });
    if (!available) {
      return res.status(409).json({ error: 'That link ID is already taken' });
    }

    // 7. Execute sponsored transaction
    const typeNum = { fixed: 0, open: 1, group: 2, stream: 3 }[linkData.type] ?? 0;
    const amountWei = linkData.amount ? parseUnits(String(linkData.amount), 6) : 0n;

    const hash = await wc.writeContract({
      address: contractAddr,
      abi: LINKS_ABI,
      functionName: 'createLinkFor',
      args: [
        address,
        idBytes,
        linkData.label,
        amountWei,
        linkData.description || '',
        typeNum,
        linkData.groupTarget || 0,
      ],
      chain: arcTestnet,
    });

    // 8. Wait for confirmation
    const receipt = await pc.waitForTransactionReceipt({ hash, confirmations: 1 });

    return res.status(200).json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      message: 'Link created on Arc via gas sponsorship',
    });

  } catch (err) {
    console.error('[Sponsor API Error]', err);
    return res.status(500).json({ error: err.message || 'Sponsorship failed' });
  }
}
