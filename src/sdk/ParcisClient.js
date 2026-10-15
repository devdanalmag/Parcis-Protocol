/**
 * ═══ Parcis Programmatic Web3 SDK (Viem Client) v2.2 ═══
 * Direct Web3 & REST client for dApps, bots, and backend commerce on Arc Network.
 * Includes automated retries, typed error classes, event subscriptions, and multicall batch queries.
 */

import { createPublicClient, http, formatUnits, parseUnits } from 'viem';

export const ARC_TESTNET_CHAIN = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://arc-testnet.drpc.org'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
};

export const ARC_MAINNET_CHAIN = {
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://explorer.arc.io' } },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
};

export const TESTNET_CONTRACTS = {
  links: '0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94',
  escrow: '0x462b674d2feD79CD38e813eb5455e3DCf27D0077',
  streams: '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d',
  devRegistry: '0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670',
  usdc: '0x3600000000000000000000000000000000000000',
};

export const MAINNET_CONTRACTS = {
  links: '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0',
  escrow: '0x7BD84F1EDA677c98217F590560E8C0577Efba809',
  streams: '0xe6775F130F61d9d2e3E93Dad2e6d971788D36557',
  devRegistry: '0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1',
  usdc: '0x3600000000000000000000000000000000000000',
};

export const DEFAULT_CONTRACTS = MAINNET_CONTRACTS;

// ─── Typed SDK Error Classes ───

export class ParcisError extends Error {
  constructor(message, code = 'PARCIS_ERROR', details = {}) {
    super(message);
    this.name = 'ParcisError';
    this.code = code;
    this.details = details;
  }
}

export class RpcTimeoutError extends ParcisError {
  constructor(message = 'RPC request timed out', details = {}) {
    super(message, 'RPC_TIMEOUT', details);
    this.name = 'RpcTimeoutError';
  }
}

export class InsufficientAllowanceError extends ParcisError {
  constructor(message = 'Insufficient USDC allowance or approval failed', details = {}) {
    super(message, 'INSUFFICIENT_ALLOWANCE', details);
    this.name = 'InsufficientAllowanceError';
  }
}

export class TransactionRevertedError extends ParcisError {
  constructor(message = 'Transaction reverted on-chain', details = {}) {
    super(message, 'TRANSACTION_REVERTED', details);
    this.name = 'TransactionRevertedError';
  }
}

export class EntityNotFoundError extends ParcisError {
  constructor(entityType, id, details = {}) {
    super(`${entityType} '${id}' was not found on-chain`, 'ENTITY_NOT_FOUND', { entityType, id, ...details });
    this.name = 'EntityNotFoundError';
  }
}

// ─── RPC Retry Wrapper ───

export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 400, backoffFactor = 2 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const isRetryable =
        err.name === 'RpcTimeoutError' ||
        /timeout|network|econnrefused|fetch failed|rate limit|429|503/i.test(err.message || '');
      if (!isRetryable && attempt > 1) throw err;
      const delay = Math.round(baseDelayMs * Math.pow(backoffFactor, attempt - 1) + Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ─── Contract ABIs ───

const LINKS_ABI = [
  { name: 'payLink', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'createLink', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'label', type: 'string' }, { name: 'amount', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'linkType', type: 'uint8' }, { name: 'groupTarget', type: 'uint8' }], outputs: [] },
  { name: 'getLink', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'tuple', components: [{ name: 'creator', type: 'address' }, { name: 'label', type: 'string' }, { name: 'amount', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'linkType', type: 'uint8' }, { name: 'groupTarget', type: 'uint8' }, { name: 'active', type: 'bool' }, { name: 'createdAt', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'paymentCount', type: 'uint256' }] }] },
  { name: 'getUserLinks', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
  { name: 'isIdAvailable', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
];

const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const SAFE_ABI = [
  { name: 'createDeal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_worker', type: 'address' }, { name: '_arbiter', type: 'address' }, { name: '_amount', type: 'uint256' }, { name: '_deadline', type: 'uint256' }, { name: '_title', type: 'string' }, { name: '_description', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { name: 'fundDeal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_id', type: 'uint256' }], outputs: [] },
  { name: 'getDeal', type: 'function', stateMutability: 'view', inputs: [{ name: '_id', type: 'uint256' }], outputs: [{ type: 'tuple', components: [{ name: 'client', type: 'address' }, { name: 'worker', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'title', type: 'string' }, { name: 'description', type: 'string' }, { name: 'deliverable', type: 'string' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }] }] },
  { name: 'getClientDeals', type: 'function', stateMutability: 'view', inputs: [{ name: '_a', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getWorkerDeals', type: 'function', stateMutability: 'view', inputs: [{ name: '_a', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'dealCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getPlatformArbiters', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'arbiterStake', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'arbiterTrustScore', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'arbiterDisputesResolved', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'getArbiterWeightedScore', type: 'function', stateMutability: 'view', inputs: [{ name: '_arbiter', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const STREAMS_ABI = [
  { name: 'createStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'depositAmount', type: 'uint256' }, { name: 'durationInSeconds', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'withdrawFromStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'cancelStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ name: 'withdrawableByRecipient', type: 'uint256' }, { name: 'refundableToSender', type: 'uint256' }] },
  { name: 'streams', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'depositAmount', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'stopTime', type: 'uint256' }, { name: 'amountWithdrawn', type: 'uint256' }, { name: 'isActive', type: 'bool' }] },
];

export function slugToBytes32(slug) {
  if (typeof slug === 'string' && slug.startsWith('0x') && slug.length === 66) return slug;
  const bytes = new TextEncoder().encode(slug);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  return '0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new RpcTimeoutError(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Main SDK Class ───

export class ParcisClient {
  constructor(config = {}) {
    const isMainnet = config.network === 'mainnet' || config.chainId === 5042 || (config.rpcUrl && !config.rpcUrl.includes('testnet'));
    this.network = isMainnet ? 'mainnet' : 'testnet';
    const defaultChain = isMainnet ? ARC_MAINNET_CHAIN : ARC_TESTNET_CHAIN;
    const defaultContracts = isMainnet ? MAINNET_CONTRACTS : TESTNET_CONTRACTS;

    this.rpcUrl = config.rpcUrl || defaultChain.rpcUrls.default.http[0];
    this.apiBase = config.apiBase || 'https://parcis.app';
    this.apiKey = config.apiKey || null;
    this.contracts = { ...defaultContracts, ...(config.contracts || {}) };

    this.publicClient = config.publicClient || createPublicClient({
      chain: defaultChain,
      transport: http(this.rpcUrl, {
        retryCount: 3,
        retryDelay: 800,
        timeout: 12000,
      }),
    });

    this.walletClient = config.walletClient || null;
    this._listeners = new Map();
  }

  _getHeaders(customHeaders = {}) {
    const headers = { ...customHeaders };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  // ─── Event Emitter ───
  on(event, listener) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) this._listeners.delete(event);
    }
  }

  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try { listener(data); } catch (e) { console.error(`[ParcisClient Event Error ${event}]`, e); }
      }
    }
  }

  // ─── Internal Helper: Check & Approve USDC ───
  async _ensureAllowance(spender, amountWei) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required for on-chain transactions', 'NO_WALLET');
    }
    const userAddr = this.walletClient.account.address;

    const allowance = await withRetry(async () => {
      return await this.publicClient.readContract({
        address: this.contracts.usdc,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddr, spender],
      });
    });

    if (allowance < amountWei) {
      this.emit('allowance:request', { spender, amountWei, currentAllowance: allowance });

      const approveHash = await this.walletClient.writeContract({
        address: this.contracts.usdc,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amountWei],
      });
      this.emit('tx:sent', { hash: approveHash, type: 'approve', spender, amountWei });

      const approveReceipt = await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status === 'reverted') {
        const err = new InsufficientAllowanceError('USDC allowance approval transaction reverted', { txHash: approveHash, receipt: approveReceipt });
        this.emit('tx:error', { error: err, type: 'approve', hash: approveHash });
        throw err;
      }
      this.emit('allowance:approved', { spender, amountWei, hash: approveHash, receipt: approveReceipt });
    }
  }

  // ─── Balance & Token Operations ───
  async getBalance(address) {
    return await withRetry(async () => {
      const userAddr = address || this.walletClient?.account?.address;
      if (!userAddr) throw new ParcisError('Address is required to check balance', 'INVALID_ADDRESS');

      const raw = await this.publicClient.readContract({
        address: this.contracts.usdc,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddr],
      });

      return {
        address: userAddr,
        amount: parseFloat(formatUnits(raw, 6)),
        formatted: formatUnits(raw, 6),
        raw,
        symbol: 'USDC',
        decimals: 6,
      };
    });
  }

  // ─── Payment Links Operations ───
  async getLink(slugOrId) {
    return await withRetry(async () => {
      const idBytes = slugToBytes32(slugOrId);
      const link = await this.publicClient.readContract({
        address: this.contracts.links,
        abi: LINKS_ABI,
        functionName: 'getLink',
        args: [idBytes],
      });

      if (!link || link.creator === '0x0000000000000000000000000000000000000000') {
        throw new EntityNotFoundError('Payment Link', slugOrId, { idBytes });
      }

      return {
        id: slugOrId,
        idBytes,
        creator: link.creator,
        label: link.label,
        amount: parseFloat(formatUnits(link.amount, 6)),
        amountRaw: link.amount.toString(),
        description: link.description,
        linkType: Number(link.linkType),
        groupTarget: Number(link.groupTarget),
        active: Boolean(link.active),
        createdAt: Number(link.createdAt),
        totalRaised: parseFloat(formatUnits(link.totalRaised, 6)),
        paymentCount: Number(link.paymentCount),
        payUrl: `https://parcis.app/#/pay/${slugOrId}`,
      };
    });
  }

  async isSlugAvailable(slug) {
    return await withRetry(async () => {
      return await this.publicClient.readContract({
        address: this.contracts.links,
        abi: LINKS_ABI,
        functionName: 'isIdAvailable',
        args: [slugToBytes32(slug)],
      });
    });
  }

  async resolveSlug(slug) {
    return await this.getLink(slug);
  }

  async getUserLinks(address) {
    return await withRetry(async () => {
      const userAddr = (address || this.walletClient?.account?.address || '').toLowerCase();
      if (!userAddr) throw new ParcisError('Address required for getUserLinks', 'INVALID_ADDRESS');

      const ids = await this.publicClient.readContract({
        address: this.contracts.links,
        abi: LINKS_ABI,
        functionName: 'getUserLinks',
        args: [userAddr],
      });

      if (!ids || ids.length === 0) return [];

      const slicedIds = ids.slice(0, 50);
      const calls = slicedIds.map(id => ({
        address: this.contracts.links,
        abi: LINKS_ABI,
        functionName: 'getLink',
        args: [id],
      }));

      const results = await this.publicClient.multicall({ contracts: calls, allowFailure: true });
      const links = [];
      results.forEach((r, idx) => {
        if (r.status === 'success' && r.result) {
          const l = r.result;
          links.push({
            id: slicedIds[idx],
            creator: l.creator,
            label: l.label,
            amount: parseFloat(formatUnits(l.amount || 0n, 6)),
            amountRaw: l.amount.toString(),
            description: l.description,
            linkType: Number(l.linkType),
            groupTarget: Number(l.groupTarget),
            active: Boolean(l.active),
            createdAt: Number(l.createdAt),
            totalRaised: parseFloat(formatUnits(l.totalRaised || 0n, 6)),
            paymentCount: Number(l.paymentCount),
          });
        }
      });
      return links;
    });
  }

  async createLink({ id, label, amount = 0, description = '', linkType = 0, groupTarget = 0 }) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required to create a link', 'NO_WALLET');
    }
    const idBytes = slugToBytes32(id);
    const amountWei = parseUnits(String(amount), 6);

    this.emit('tx:prepare', { type: 'createLink', id, label, amount });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.links,
      abi: LINKS_ABI,
      functionName: 'createLink',
      args: [idBytes, label, amountWei, description, linkType, groupTarget],
    });

    this.emit('tx:sent', { hash: txHash, type: 'createLink', id });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('createLink transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'createLink', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      id,
      idBytes,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    this.emit('link:created', payload);
    return payload;
  }

  async payLink(slugOrId, amountUsdc) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required for payments', 'NO_WALLET');
    }

    const idBytes = slugToBytes32(slugOrId);
    const amountWei = parseUnits(String(amountUsdc), 6);

    await this._ensureAllowance(this.contracts.links, amountWei);

    this.emit('tx:prepare', { type: 'payLink', slugOrId, amountUsdc });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.links,
      abi: LINKS_ABI,
      functionName: 'payLink',
      args: [idBytes, amountWei],
    });

    this.emit('tx:sent', { hash: txHash, type: 'payLink', slugOrId, amountUsdc });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('payLink transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'payLink', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      slugOrId,
      amountUsdc,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    this.emit('link:paid', payload);
    return payload;
  }

  // ─── Escrow Operations ───
  async getUserDeals(address) {
    return await withRetry(async () => {
      const userAddr = (address || this.walletClient?.account?.address || '').toLowerCase();
      if (!userAddr) throw new ParcisError('Address required for getUserDeals', 'INVALID_ADDRESS');

      const [clientDealIds, workerDealIds] = await Promise.all([
        this.publicClient.readContract({ address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'getClientDeals', args: [userAddr] }),
        this.publicClient.readContract({ address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'getWorkerDeals', args: [userAddr] }),
      ]);

      const dealMap = new Map();
      for (const id of clientDealIds) dealMap.set(id.toString(), { id, role: 'client' });
      for (const id of workerDealIds) {
        const ex = dealMap.get(id.toString());
        if (ex) ex.role = 'both';
        else dealMap.set(id.toString(), { id, role: 'worker' });
      }

      const entries = Array.from(dealMap.values()).slice(0, 50);
      if (entries.length === 0) return [];

      const calls = entries.map(e => ({
        address: this.contracts.escrow,
        abi: SAFE_ABI,
        functionName: 'getDeal',
        args: [e.id],
      }));

      const results = await this.publicClient.multicall({ contracts: calls, allowFailure: true });
      const deals = [];
      results.forEach((r, idx) => {
        if (r.status === 'success' && r.result) {
          const d = r.result;
          const e = entries[idx];
          deals.push({
            dealId: Number(e.id),
            role: e.role,
            client: d.client,
            worker: d.worker,
            arbiter: d.arbiter,
            amount: parseFloat(formatUnits(d.amount || 0n, 6)),
            amountRaw: d.amount.toString(),
            deadline: Number(d.deadline),
            title: d.title,
            description: d.description,
            deliverable: d.deliverable,
            status: Number(d.status),
            createdAt: Number(d.createdAt),
          });
        }
      });
      return deals;
    });
  }

  async createEscrow({ worker, arbiter, amount, deadline, title, description = '' }) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required to create escrow', 'NO_WALLET');
    }

    const amountWei = parseUnits(String(amount), 6);
    const deadlineTimestamp = typeof deadline === 'number' ? BigInt(deadline) : BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);

    await this._ensureAllowance(this.contracts.escrow, amountWei);

    this.emit('tx:prepare', { type: 'createEscrow', worker, arbiter, amount, title });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.escrow,
      abi: SAFE_ABI,
      functionName: 'createDeal',
      args: [worker, arbiter, amountWei, deadlineTimestamp, title, description],
    });

    this.emit('tx:sent', { hash: txHash, type: 'createEscrow', worker, arbiter, amount });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('createDeal transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'createEscrow', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      worker,
      arbiter,
      amount,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    this.emit('escrow:created', payload);
    return payload;
  }

  // ─── Streaming Operations ───
  async getStreamBalance(streamId) {
    return await withRetry(async () => {
      const result = await this.publicClient.readContract({
        address: this.contracts.streams,
        abi: STREAMS_ABI,
        functionName: 'balanceOf',
        args: [BigInt(streamId)],
      });
      const [withdrawable, refundable] = result;
      return {
        streamId: Number(streamId),
        withdrawableAmount: parseFloat(formatUnits(withdrawable || 0n, 6)),
        refundableAmount: parseFloat(formatUnits(refundable || 0n, 6)),
        withdrawableRaw: withdrawable,
        refundableRaw: refundable,
      };
    });
  }

  async startStream({ recipient, amount, durationDays = 30 }) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required to start a stream', 'NO_WALLET');
    }

    const amountWei = parseUnits(String(amount), 6);
    const durationSeconds = BigInt(Math.max(1, Math.round(durationDays * 86400)));

    await this._ensureAllowance(this.contracts.streams, amountWei);

    this.emit('tx:prepare', { type: 'startStream', recipient, amount, durationDays });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.streams,
      abi: STREAMS_ABI,
      functionName: 'createStream',
      args: [recipient, amountWei, durationSeconds],
    });

    this.emit('tx:sent', { hash: txHash, type: 'startStream', recipient, amount });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('createStream transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'startStream', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      recipient,
      amount,
      durationDays,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    this.emit('stream:started', payload);
    return payload;
  }

  async withdrawStream(streamId) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required to withdraw', 'NO_WALLET');
    }

    this.emit('tx:prepare', { type: 'withdrawStream', streamId });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.streams,
      abi: STREAMS_ABI,
      functionName: 'withdrawFromStream',
      args: [BigInt(streamId)],
    });

    this.emit('tx:sent', { hash: txHash, type: 'withdrawStream', streamId });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('withdrawFromStream transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'withdrawStream', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      streamId: Number(streamId),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    return payload;
  }

  async cancelStream(streamId) {
    if (!this.walletClient || !this.walletClient.account) {
      throw new ParcisError('WalletClient with account is required to cancel stream', 'NO_WALLET');
    }

    this.emit('tx:prepare', { type: 'cancelStream', streamId });

    const txHash = await this.walletClient.writeContract({
      address: this.contracts.streams,
      abi: STREAMS_ABI,
      functionName: 'cancelStream',
      args: [BigInt(streamId)],
    });

    this.emit('tx:sent', { hash: txHash, type: 'cancelStream', streamId });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      const err = new TransactionRevertedError('cancelStream transaction reverted on-chain', { txHash, receipt });
      this.emit('tx:error', { error: err, type: 'cancelStream', hash: txHash });
      throw err;
    }

    const payload = {
      hash: txHash,
      streamId: Number(streamId),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status,
      receipt,
      success: true,
    };
    this.emit('tx:confirmed', payload);
    return payload;
  }

  // ─── Arbiter Operations ───
  async getArbiter(address) {
    return await withRetry(async () => {
      const addr = address.toLowerCase();
      const calls = [
        { address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'arbiterStake', args: [addr] },
        { address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'arbiterTrustScore', args: [addr] },
        { address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'arbiterDisputesResolved', args: [addr] },
        { address: this.contracts.escrow, abi: SAFE_ABI, functionName: 'getArbiterWeightedScore', args: [addr] },
      ];

      const results = await this.publicClient.multicall({ contracts: calls, allowFailure: true });
      const stakeRaw = results[0]?.status === 'success' ? results[0].result : 0n;
      const trustScore = results[1]?.status === 'success' ? Number(results[1].result) : 100;
      const disputesResolved = results[2]?.status === 'success' ? Number(results[2].result) : 0;
      const weightedScore = results[3]?.status === 'success' ? Number(results[3].result) : 0;

      return {
        address: addr,
        stake: parseFloat(formatUnits(stakeRaw, 6)),
        stakeRaw,
        trustScore,
        disputesResolved,
        weightedScore,
      };
    });
  }

  // ─── REST Helpers ───
  async getTrustScore(address) {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/score?address=${encodeURIComponent(address)}`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Score API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getDeal(dealId) {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/deal?id=${encodeURIComponent(dealId)}`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Deal API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getStream(streamId) {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/stream?id=${encodeURIComponent(streamId)}`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Stream API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getArbiters() {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/arbiters`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Arbiters API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getHealth() {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/health`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Health API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getDeveloperProfile(address) {
    return await withRetry(async () => {
      const query = address ? `?address=${encodeURIComponent(address)}` : '';
      const res = await fetchWithTimeout(
        `${this.apiBase}/api/developer${query}`,
        { headers: this._getHeaders() }
      );
      if (!res.ok) throw new ParcisError(`Developer API Error: ${res.status} ${res.statusText}`, 'API_ERROR', { status: res.status });
      return await res.json();
    });
  }

  async getUsageQuota() {
    const profile = await this.getDeveloperProfile();
    return profile.usage;
  }
}
