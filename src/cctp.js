import { BridgeKit, isRetryableError, isKitError, isFatalError } from '@circle-fin/bridge-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { createSolanaKitAdapterFromProvider } from '@circle-fin/adapter-solana-kit';
import { VersionedTransaction } from '@solana/web3.js';
import { isMainnet } from './reown.js';

// ─── Chain configs for auto-adding to MetaMask ───
const CHAIN_CONFIGS = {
  // Testnet
  'Base Sepolia': {
    chainId: '0x14a34',        // 84532
    chainName: 'Base Sepolia',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
  },
  'Arbitrum Sepolia': {
    chainId: '0x66eee',        // 421614
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
  },
  'Arc Testnet': {
    chainId: '0x4cef52',       // 5042002
    chainName: 'Arc Testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: ['https://arc-testnet.drpc.org'],
    blockExplorerUrls: ['https://testnet.arcscan.io'],
  },
  // Mainnet
  'Base': {
    chainId: '0x2105',         // 8453
    chainName: 'Base',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  'Arbitrum One': {
    chainId: '0xa4b1',         // 42161
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  'Arc': {
    chainId: '0x13b2',         // 5042
    chainName: 'Arc',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: ['https://rpc.mainnet.arc.io'],
    blockExplorerUrls: ['https://explorer.arc.io'],
  },
};

// Chain display name → BridgeKit chain identifier mapping
const CHAIN_IDS = {
  // Testnet
  'Base Sepolia':     'Base_Sepolia',
  'Arbitrum Sepolia': 'Arbitrum_Sepolia',
  'Solana Devnet':    'Solana_Devnet',
  'Ethereum Sepolia': 'Ethereum_Sepolia',
  'Optimism Sepolia': 'Optimism_Sepolia',
  'Polygon Amoy':     'Polygon_Amoy',
  'Avalanche Fuji':   'Avalanche_Fuji',
  // Mainnet
  'Base':             'Base',
  'Arbitrum One':     'Arbitrum',
  'Solana':           'Solana',
  'Ethereum':         'Ethereum',
  'Optimism':         'Optimism',
  'Polygon':          'Polygon',
  'Avalanche':        'Avalanche',
};

// ─── Helper: switch or add chain in MetaMask ───
export async function switchOrAddChain(chainName) {
  const config = CHAIN_CONFIGS[chainName];
  if (!config) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: config.chainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      // Chain not added yet — add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [config],
      });
    } else if (switchError.code === 4001) {
      throw new Error(`You rejected the network switch to ${chainName}. Please switch manually.`);
    } else {
      throw new Error(`Failed to switch to ${chainName}: ${switchError.message}`);
    }
  }
}

/**
 * Execute a real CCTP bridge via Circle BridgeKit.
 * Burns USDC on the source chain, Circle attests, then mints on Arc Testnet.
 *
 * @param {string} chainName  - Display name: 'Base Sepolia', 'Arbitrum Sepolia', or 'Solana Devnet'
 * @param {number|string} amount - USDC amount (e.g. "1.00")
 * @param {string} _recipientOrSlug - Payment link slug (used only for local record-keeping)
 * @returns {Promise<object>} BridgeKit result with .state and .steps[]
 */
export async function executeRealCCTPBridge(chainName, amount, _recipientOrSlug) {
  const statusText = document.getElementById('cctp-status-text');
  const progress = document.getElementById('cctp-progress');

  try {
    // ── 1. Validate inputs ──
    const originChain = CHAIN_IDS[chainName];
    if (!originChain) throw new Error(`Unsupported chain: ${chainName}`);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Please enter a valid USDC amount.');
    }

    statusText.textContent = 'Connecting wallets…';
    progress.style.width = '10%';

    // ── 2. Create destination adapter (Arc Testnet via MetaMask) ──
    if (!window.ethereum) {
      throw new Error('MetaMask (or another EVM wallet) is required to receive on Arc Testnet.');
    }
    const viemAdapter = await createViemAdapterFromProvider({
      provider: window.ethereum,
    });

    // ── 3. Create origin adapter ──
    let originAdapter;

    if (chainName === 'Solana Devnet') {
      // Solana requires a separate browser wallet (Phantom, Solflare, etc.)
      if (!window.solana) {
        throw new Error(
          'A Solana wallet (Phantom / Solflare) is required to bridge from Solana. ' +
          'Install one and refresh the page.'
        );
      }

      statusText.textContent = 'Connecting Solana wallet…';
      try {
        await window.solana.connect();
      } catch (e) {
        if (e.code === 4001) throw new Error('Solana wallet connection rejected.');
        throw new Error(`Solana wallet error: ${e.message}`);
      }

      if (!window.solana.publicKey) {
        throw new Error('Solana wallet connected but no public key found. Reconnect and try again.');
      }

      // Circle's adapter-solana-kit expects a provider that exposes
      // .address (string) instead of Phantom's .publicKey (PublicKey).
      // Wrap the Phantom provider to match expected interface with robust transaction signing.
      const phantom = window.solana;
      const parseTxBytes = (tx) => {
        if (typeof tx === 'string') {
          const binary = atob(tx);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes;
        }
        if (tx instanceof Uint8Array) return tx;
        if (Array.isArray(tx)) return new Uint8Array(tx);
        return tx;
      };

      const providerWrapper = {
        get isConnected() { return phantom.isConnected; },
        get address() { return phantom.publicKey?.toString(); },
        get publicKey() { return phantom.publicKey; },
        connect: async () => {
          const res = await phantom.connect();
          return { address: res.publicKey.toString() };
        },
        disconnect: async () => phantom.disconnect(),
        signTransaction: async (tx) => {
          if (tx instanceof VersionedTransaction) {
            const signed = await phantom.signTransaction(tx);
            return signed.serialize();
          }
          const bytes = parseTxBytes(tx);
          if (bytes instanceof Uint8Array) {
            const versionedTx = VersionedTransaction.deserialize(bytes);
            const signed = await phantom.signTransaction(versionedTx);
            return signed.serialize();
          }
          const signed = await phantom.signTransaction(tx);
          return signed.serialize ? signed.serialize() : signed;
        },
        signAllTransactions: async (txs) => {
          const parsed = txs.map(tx => {
            if (tx instanceof VersionedTransaction) return tx;
            const bytes = parseTxBytes(tx);
            return bytes instanceof Uint8Array ? VersionedTransaction.deserialize(bytes) : tx;
          });
          const signedTxs = await phantom.signAllTransactions(parsed);
          return signedTxs.map(signed => (signed && signed.serialize ? signed.serialize() : signed));
        },
        signMessage: async (msg) => phantom.signMessage(msg),
      };

      try {
        originAdapter = await createSolanaKitAdapterFromProvider({
          provider: providerWrapper,
        });
      } catch (adapterErr) {
        console.error('[CCTP] Solana adapter creation failed:', adapterErr);
        throw new Error(
          `Failed to create Solana adapter: ${adapterErr.message}. ` +
          'Make sure Phantom is connected to Devnet and has SOL + USDC.'
        );
      }

    } else {
      // EVM origin chain — switch MetaMask to the right network first
      statusText.textContent = `Switching wallet to ${chainName}…`;
      await switchOrAddChain(chainName);

      originAdapter = await createViemAdapterFromProvider({
        provider: window.ethereum,
      });
    }

    // ── 4. Initialize BridgeKit ──
    statusText.textContent = 'Initializing Circle Bridge Kit…';
    progress.style.width = '25%';

    const kit = new BridgeKit();

    // Subscribe to lifecycle events for real-time progress
    kit.on('*', (payload) => {
      console.log('[CCTP Event]', payload);
      const step = payload?.method || '';
      const txHash = payload?.values?.txHash;
      const stepState = payload?.values?.state;

      if (step === 'approve' && (stepState === 'success' || txHash)) {
        statusText.textContent = 'USDC spending approved ✓';
        progress.style.width = '40%';
      } else if (step === 'burn' && (stepState === 'success' || txHash)) {
        statusText.textContent = 'Burn confirmed — waiting for Circle attestation…';
        progress.style.width = '55%';
      } else if (step === 'fetchAttestation') {
        statusText.textContent = 'Fetching Circle attestation (1-2 min)…';
        progress.style.width = '70%';
        // Proactively prompt wallet switch to Arc so user is ready for minting
        switchOrAddChain(isMainnet ? 'Arc' : 'Arc Testnet').catch(() => {});
      } else if (step === 'mint' && (stepState === 'success' || txHash)) {
        statusText.textContent = `Minted on ${isMainnet ? 'Arc' : 'Arc Testnet'}!`;
        progress.style.width = '95%';
      } else if (step) {
        statusText.textContent = `${step}…`;
      }
    });

    // ── 5. Execute bridge ──
    statusText.textContent = `Approve USDC spending on ${chainName}…`;
    progress.style.width = '35%';

    const destChain = isMainnet ? 'Arc' : 'Arc_Testnet';
    const bridgeParams = {
      from: { adapter: originAdapter, chain: originChain },
      to:   { adapter: viemAdapter,   chain: destChain },
      amount: amount.toString(),
    };

    let result = await kit.bridge(bridgeParams);

    // ── 6. Handle error state — use kit.retry() to resume from last successful step ──
    if (result.state === 'error') {
      console.warn('[CCTP] Bridge returned error state:', result);

      // Check if the error is retryable (network timeout, gas issue, etc.)
      // If fatal (invalid input, unsupported route), don't retry
      const failedStep = result.steps?.find(s => s.state === 'error');
      if (failedStep?.errorMessage) {
        console.warn('[CCTP] Failed step:', failedStep.name, failedStep.errorMessage);
      }

      statusText.textContent = 'Retrying from last checkpoint…';
      progress.style.width = '50%';

      // kit.retry() resumes from where it left off — skips already-completed
      // steps (e.g. approve, burn) and retries only the failed/pending ones
      result = await kit.retry(result, {
        from: originAdapter,
        to: viemAdapter,
      });
    }

    // ── 7. Extract tx hash from result ──
    console.log('[CCTP] Bridge complete:', result);

    // The result.steps array contains { name, state, txHash, data, explorerUrl }
    const mintStep = result.steps?.find(s => s.name === 'mint') || {};
    const burnStep = result.steps?.find(s => s.name === 'burn') || {};

    statusText.textContent = `✓ ${amount} USDC delivered to ${isMainnet ? 'Arc' : 'Arc Testnet'}!`;
    progress.style.width = '100%';

    return {
      ...result,
      // Expose a convenient .hash for callers
      hash: mintStep.txHash || burnStep.txHash || null,
      explorerUrl: mintStep.explorerUrl || burnStep.explorerUrl || null,
    };

  } catch (error) {
    console.error('[CCTP Bridge Error]', error);

    // User-friendly error messages
    let msg = error.message || 'Bridge failed';

    // Use SDK error utilities for better classification
    if (isKitError(error)) {
      console.error(`[CCTP] KitError: ${error.name} (code ${error.code})`);
    }

    if (msg.includes('user rejected') || msg.includes('User denied') || error.code === 4001) {
      msg = 'Transaction rejected. You can try again.';
    } else if (msg.includes('insufficient') || msg.includes('Insufficient') || msg.includes('balance')) {
      msg = `Insufficient USDC on ${chainName}. Get testnet USDC from faucet.circle.com`;
    } else if (msg.includes('Max fee must be less than amount')) {
      msg = 'Bridge amount too low — it must exceed the CCTP fee. Try a larger amount.';
    } else if (msg.includes('timeout') || msg.includes('Timed out')) {
      msg = 'Bridge timed out. The transaction may still complete — check your wallet history.';
    } else if (msg.includes('adapter') || msg.includes('provider')) {
      msg = `Wallet adapter error on ${chainName}. Make sure your wallet is connected to the correct network.`;
    } else if (isFatalError(error)) {
      msg = `Bridge configuration error: ${msg}. This route may not be supported yet.`;
    }

    if (statusText) {
      statusText.textContent = msg;
      statusText.style.color = 'var(--danger)';
    }
    if (progress) {
      progress.style.background = 'var(--danger)';
    }
    throw error;
  }
}

