import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import dotenv from 'dotenv';
dotenv.config();

const isMainnet = (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet' ||
  (process.env.CHAIN_ID === '5042' || process.env.VITE_CHAIN_ID === '5042');

const chainId = isMainnet ? 5042 : 5042002;
const rpcUrl = isMainnet
  ? (process.env.MAINNET_RPC_URL || process.env.VITE_MAINNET_RPC_URL || process.env.RPC_URL || 'https://rpc.mainnet.arc.io')
  : (process.env.TESTNET_RPC_URL || process.env.VITE_TESTNET_RPC_URL || process.env.RPC_URL || 'https://arc-testnet.drpc.org');

const arcChain = defineChain({
  id: chainId,
  name: isMainnet ? 'Arc Mainnet' : 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const client = createPublicClient({
  chain: arcChain,
  transport: http(rpcUrl, { timeout: 10000 }),
});

const OWNABLE_ABI = [
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pendingOwner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
];

const LINKS_EXTRA_ABI = [
  ...OWNABLE_ABI,
  { inputs: [], name: 'admin', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'platformWallet', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
];

const DEV_EXTRA_ABI = [
  ...OWNABLE_ABI,
  { inputs: [], name: 'platformTreasury', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'apiRelayer', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
];

async function check() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  CURRENT ON-CHAIN CONTRACT ROLES & OWNERSHIP AUDIT (${isMainnet ? 'MAINNET' : 'TESTNET'})`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ParcisLinks
  const linksAddr = isMainnet 
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT)
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT);
  const linksOwner = await client.readContract({ address: linksAddr, abi: LINKS_EXTRA_ABI, functionName: 'owner' });
  const linksPending = await client.readContract({ address: linksAddr, abi: LINKS_EXTRA_ABI, functionName: 'pendingOwner' });
  const linksAdmin = await client.readContract({ address: linksAddr, abi: LINKS_EXTRA_ABI, functionName: 'admin' });
  const linksPlatform = await client.readContract({ address: linksAddr, abi: LINKS_EXTRA_ABI, functionName: 'platformWallet' });
  console.log(`🔗 ParcisLinks (${linksAddr}):`);
  console.log(`   Owner:          ${linksOwner}`);
  console.log(`   Pending Owner:  ${linksPending}`);
  console.log(`   Admin/Sponsor:  ${linksAdmin}`);
  console.log(`   Platform Wallet:${linksPlatform}\n`);

  // ParcisSafe
  const safeAddr = isMainnet
    ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT)
    : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT);
  const safeOwner = await client.readContract({ address: safeAddr, abi: OWNABLE_ABI, functionName: 'owner' });
  const safePending = await client.readContract({ address: safeAddr, abi: OWNABLE_ABI, functionName: 'pendingOwner' });
  console.log(`🛡️  ParcisSafe (${safeAddr}):`);
  console.log(`   Owner:          ${safeOwner}`);
  console.log(`   Pending Owner:  ${safePending}\n`);

  // ParcisStreams
  const streamsAddr = isMainnet
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT)
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT);
  const streamsOwner = await client.readContract({ address: streamsAddr, abi: OWNABLE_ABI, functionName: 'owner' });
  const streamsPending = await client.readContract({ address: streamsAddr, abi: OWNABLE_ABI, functionName: 'pendingOwner' });
  console.log(`🌊 ParcisStreams (${streamsAddr}):`);
  console.log(`   Owner:          ${streamsOwner}`);
  console.log(`   Pending Owner:  ${streamsPending}\n`);

  // ParcisDevRegistry
  const devAddr = isMainnet
    ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT)
    : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT);
  const devOwner = await client.readContract({ address: devAddr, abi: DEV_EXTRA_ABI, functionName: 'owner' });
  const devPending = await client.readContract({ address: devAddr, abi: DEV_EXTRA_ABI, functionName: 'pendingOwner' });
  const devTreasury = await client.readContract({ address: devAddr, abi: DEV_EXTRA_ABI, functionName: 'platformTreasury' });
  const devRelayer = await client.readContract({ address: devAddr, abi: DEV_EXTRA_ABI, functionName: 'apiRelayer' });
  console.log(`📋 ParcisDevRegistry (${devAddr}):`);
  console.log(`   Owner:          ${devOwner}`);
  console.log(`   Pending Owner:  ${devPending}`);
  console.log(`   Treasury:       ${devTreasury}`);
  console.log(`   API Relayer:    ${devRelayer}\n`);
}

check().catch(console.error);
