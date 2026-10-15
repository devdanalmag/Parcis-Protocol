/**
 * ═══ Parcis SDK TypeScript Definitions v2.2 ═══
 */

export interface ParcisPayOptions {
  address: string;
  amount?: string | number;
  label?: string;
  description?: string;
  theme?: 'dark' | 'light' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  display?: 'modal' | 'popup' | 'redirect';
  onSuccess?: (data: { txHash: string; amount: number; payer: string; linkId?: string }) => void;
  onError?: (error: { error: string; message?: string }) => void;
  onClose?: () => void;
}

export interface ParcisStreamOptions extends ParcisPayOptions {
  duration?: string | number;
}

export interface ParcisProfileOptions {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export interface ParcisTrustScoreBreakdown {
  completionRate: number;
  completionScore: number;
  volumeScore: number;
  activityScore: number;
  disputePenalty: number;
  totalDeals: number;
  completed: number;
  disputed: number;
  totalVolume: number;
  volumeEarned: number;
  volumeSpent: number;
  linksCount: number;
  totalReceived: number;
}

export interface ParcisTrustScoreResponse {
  address: string;
  trustScore: number;
  level: 'Legendary' | 'Trusted' | 'Established' | 'Building' | 'Starter' | 'New';
  breakdown: ParcisTrustScoreBreakdown;
  protocol: string;
  chain: string;
  timestamp: string;
}

export interface CreateLinkOptions {
  id: string;
  label: string;
  amount?: number | string;
  description?: string;
  linkType?: number;
  groupTarget?: number;
}

export interface CreateEscrowOptions {
  worker: string;
  arbiter: string;
  amount: number | string;
  deadline?: number;
  title: string;
  description?: string;
}

export interface StartStreamOptions {
  recipient: string;
  amount: number | string;
  durationDays?: number;
}

export interface ParcisLink {
  id: string;
  idBytes: string;
  creator: string;
  label: string;
  amount: number;
  amountRaw?: string;
  description: string;
  linkType: number;
  groupTarget: number;
  active: boolean;
  createdAt: number;
  totalRaised: number;
  paymentCount: number;
  payUrl?: string;
}

export interface ParcisDeal {
  dealId: number;
  role?: 'client' | 'worker' | 'both';
  client: string;
  worker: string;
  arbiter: string;
  amount: number;
  amountRaw: string;
  status: string | number;
  statusCode?: number;
  deadline: number;
  title: string;
  description: string;
  deliverable: string;
  createdAt: number;
  disputeReason?: string;
  resolutionTimestamp?: number;
  appealWindowDuration?: number;
  isAppealWindowActive?: boolean;
}

export interface ParcisStream {
  streamId: number;
  sender: string;
  recipient: string;
  depositAmount: number;
  amountWithdrawn: number;
  claimableAmount: number;
  remainingUnstreamed: number;
  ratePerSecond: number;
  startTime: number;
  stopTime: number;
  durationSeconds: number;
  durationDays: number;
  isActive: boolean;
  progressPercent: number;
  isCompleted: boolean;
  timestamp?: string;
}

export interface ParcisArbiter {
  address: string;
  stake: number;
  trustScore: number;
  disputesResolved: number;
  weightedScore: number;
  status?: string;
}

export interface ParcisHealth {
  status: 'healthy' | 'degraded';
  protocol: string;
  network: {
    chainName: string;
    chainId: number;
    rpcUrl: string;
    blockHeight: number;
    latencyMs: number;
  };
  contracts: {
    links: string;
    escrowSafe: string;
    streams: string;
    usdc: string;
    multicall3?: string;
  };
  timestamp: string;
}

export interface ParcisBalance {
  address: string;
  amount: number;
  formatted: string;
  raw: bigint;
  symbol: string;
  decimals: number;
}

export interface ParcisStreamBalance {
  streamId: number;
  withdrawableAmount: number;
  refundableAmount: number;
  withdrawableRaw: bigint;
  refundableRaw: bigint;
}

export interface ParcisTransactionReceipt {
  hash: string;
  blockNumber: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  status: string;
  receipt?: any;
  success: boolean;
  [key: string]: any;
}

// ─── Error Classes ───

export class ParcisError extends Error {
  code: string;
  details: Record<string, any>;
  constructor(message: string, code?: string, details?: Record<string, any>);
}

export class RpcTimeoutError extends ParcisError {}
export class InsufficientAllowanceError extends ParcisError {}
export class TransactionRevertedError extends ParcisError {}
export class EntityNotFoundError extends ParcisError {}

export declare function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number; backoffFactor?: number }
): Promise<T>;

export declare function slugToBytes32(slug: string): string;

export declare const ARC_TESTNET_CHAIN: any;
export declare const DEFAULT_CONTRACTS: {
  links: string;
  escrow: string;
  streams: string;
  usdc: string;
};

// ─── ParcisClient Class ───

export class ParcisClient {
  rpcUrl: string;
  apiBase: string;
  contracts: Record<string, string>;
  publicClient: any;
  walletClient: any;

  constructor(config?: {
    rpcUrl?: string;
    apiBase?: string;
    contracts?: Record<string, string>;
    publicClient?: any;
    walletClient?: any;
  });

  on(event: string, listener: (data: any) => void): () => void;
  off(event: string, listener: (data: any) => void): void;
  emit(event: string, data: any): void;

  getBalance(address?: string): Promise<ParcisBalance>;
  getLink(slugOrId: string): Promise<ParcisLink>;
  isSlugAvailable(slug: string): Promise<boolean>;
  resolveSlug(slug: string): Promise<ParcisLink>;
  getUserLinks(address?: string): Promise<ParcisLink[]>;
  createLink(options: CreateLinkOptions): Promise<ParcisTransactionReceipt>;
  payLink(slugOrId: string, amountUsdc: number | string): Promise<ParcisTransactionReceipt>;

  getUserDeals(address?: string): Promise<ParcisDeal[]>;
  createEscrow(options: CreateEscrowOptions): Promise<ParcisTransactionReceipt>;
  getDeal(dealId: string | number): Promise<ParcisDeal>;

  getStream(streamId: string | number): Promise<ParcisStream>;
  getStreamBalance(streamId: string | number): Promise<ParcisStreamBalance>;
  startStream(options: StartStreamOptions): Promise<ParcisTransactionReceipt>;
  withdrawStream(streamId: number | string): Promise<ParcisTransactionReceipt>;
  cancelStream(streamId: number | string): Promise<ParcisTransactionReceipt>;

  getArbiter(address: string): Promise<ParcisArbiter>;
  getArbiters(): Promise<{ totalArbiters: number; minStakeRequired: number; arbiters: ParcisArbiter[]; timestamp: string }>;
  getTrustScore(address: string): Promise<ParcisTrustScoreResponse>;
  getHealth(): Promise<ParcisHealth>;
}

export interface ParcisGlobal {
  version: string;
  base: string;
  pay(options: ParcisPayOptions): void;
  stream(options: ParcisStreamOptions): void;
  openModal(url: string, callbacks?: Partial<ParcisPayOptions>): void;
  closeModal(): void;
  createPayButton(options?: ParcisPayOptions): HTMLElement;
  createStreamButton(options?: ParcisStreamOptions): HTMLElement;
  createProfileCard(address: string, options?: ParcisProfileOptions): HTMLElement;
  api: {
    getTrustScore(address: string): Promise<ParcisTrustScoreResponse>;
    getLink(id: string): Promise<ParcisLink>;
    getDeal(dealId: string | number): Promise<ParcisDeal>;
    getStream(streamId: string | number): Promise<ParcisStream>;
    getArbiters(): Promise<any>;
    getHealth(): Promise<ParcisHealth>;
  };
  getTrustScore(address: string): Promise<ParcisTrustScoreResponse>;
  getLink(id: string): Promise<ParcisLink>;
  getDeal(dealId: string | number): Promise<ParcisDeal>;
  getStream(streamId: string | number): Promise<ParcisStream>;
  getArbiters(): Promise<any>;
  getHealth(): Promise<ParcisHealth>;
}

declare global {
  interface Window {
    Parcis: ParcisGlobal;
  }
}
