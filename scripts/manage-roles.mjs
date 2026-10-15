// ═══ Parcis Protocol — Contract Roles & Ownership Management ═══
// Usage:
//   node scripts/manage-roles.mjs --status
//   node scripts/manage-roles.mjs --transfer-owner 0xNewOwnerAddress
//   node scripts/manage-roles.mjs --accept-owner
//   node scripts/manage-roles.mjs --set-sponsor 0xNewSponsorAddress
//
// Works on Arc Testnet (default) or Arc Mainnet (set CHAIN_ID=5042 and appropriate RPC/keys)

import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
dotenv.config();

const isMainnet = (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet' ||
  (process.env.CHAIN_ID === '5042' || process.env.VITE_CHAIN_ID === '5042');

const chainId = isMainnet ? 5042 : 5042002;
const rpcUrl = isMainnet
  ? (process.env.MAINNET_RPC_URL || process.env.VITE_MAINNET_RPC_URL || process.env.RPC_URL || 'https://rpc.mainnet.arc.io')
  : (process.env.TESTNET_RPC_URL || process.env.VITE_TESTNET_RPC_URL || process.env.RPC_URL || 'https://arc-testnet.drpc.org');

const chain = defineChain({
  id: chainId,
  name: isMainnet ? 'Arc Mainnet' : 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl, { timeout: 15000 }),
});

const privateKey = isMainnet
  ? (process.env.MAINNET_DEPLOYER_PRIVATE_KEY || process.env.MAINNET_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY)
  : (process.env.TESTNET_DEPLOYER_PRIVATE_KEY || process.env.TESTNET_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY);
let walletClient = null;
let account = null;

if (privateKey && /^[0-9a-fA-F]{64}$/.test(privateKey.replace(/^0x/, ''))) {
  account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`);
  walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

const OWNABLE2STEP_ABI = [
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pendingOwner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'acceptOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
];

const LINKS_ABI = [
  ...OWNABLE2STEP_ABI,
  { inputs: [], name: 'admin', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'newAdmin', type: 'address' }], name: 'setAdmin', outputs: [], stateMutability: 'nonpayable', type: 'function' },
];

const DEV_ABI = [
  ...OWNABLE2STEP_ABI,
  { inputs: [], name: 'apiRelayer', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_relayer', type: 'address' }], name: 'setApiRelayer', outputs: [], stateMutability: 'nonpayable', type: 'function' },
];

const contracts = [
  {
    name: 'ParcisLinks',
    address: isMainnet
      ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT)
      : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT),
    abi: LINKS_ABI
  },
  {
    name: 'ParcisSafe',
    address: isMainnet
      ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT)
      : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT),
    abi: OWNABLE2STEP_ABI
  },
  {
    name: 'ParcisStreams',
    address: isMainnet
      ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT)
      : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT),
    abi: OWNABLE2STEP_ABI
  },
  {
    name: 'ParcisDevRegistry',
    address: isMainnet
      ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT)
      : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT),
    abi: DEV_ABI
  },
];

async function showStatus() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  PARCIS CONTRACT ROLES AUDIT — ${chain.name} (${chain.id})`);
  console.log('═══════════════════════════════════════════════════════════');
  if (account) {
    console.log(`Current Wallet (from .env): ${account.address}\n`);
  } else {
    console.log(`No signing private key found in .env (Read-Only Mode)\n`);
  }

  for (const c of contracts) {
    if (!c.address) {
      console.log(`⚠️  ${c.name}: Address not found in .env`);
      continue;
    }
    const owner = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'owner' });
    let pending = '0x0000000000000000000000000000000000000000';
    try {
      pending = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'pendingOwner' });
    } catch {}

    console.log(`📦 ${c.name} (${c.address}):`);
    console.log(`   Owner:         ${owner}`);
    if (pending && pending !== '0x0000000000000000000000000000000000000000') {
      console.log(`   ⏳ PENDING OWNER: ${pending} (Awaiting acceptOwnership)`);
    } else {
      console.log(`   Pending Owner: None`);
    }

    if (c.name === 'ParcisLinks') {
      try {
        const admin = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'admin' });
        console.log(`   Sponsor/Admin: ${admin}`);
      } catch {}
    }
    if (c.name === 'ParcisDevRegistry') {
      try {
        const relayer = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'apiRelayer' });
        console.log(`   API Relayer:   ${relayer}`);
      } catch {}
    }
    console.log('');
  }
}

async function transferOwnership(newOwner) {
  if (!walletClient || !account) {
    console.error('❌ Cannot send transaction: DEPLOYER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(newOwner)) {
    console.error('❌ Invalid address:', newOwner);
    process.exit(1);
  }

  console.log(`🚀 Step 1: Initiating 2-Step Ownership Transfer to: ${newOwner}`);
  console.log(`Executing from current owner: ${account.address}\n`);

  for (const c of contracts) {
    if (!c.address) continue;
    try {
      const currentOwner = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'owner' });
      if (currentOwner.toLowerCase() !== account.address.toLowerCase()) {
        console.log(`⚠️  Skipping ${c.name}: wallet is not current owner (${currentOwner})`);
        continue;
      }
      console.log(`Sending transferOwnership on ${c.name}...`);
      const hash = await walletClient.writeContract({
        address: c.address,
        abi: c.abi,
        functionName: 'transferOwnership',
        args: [newOwner],
      });
      console.log(`   Tx sent: ${hash}. Waiting for confirmation...`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ ${c.name}: transfer initiated! Pending owner is now ${newOwner}`);
    } catch (err) {
      console.error(`   ❌ Failed on ${c.name}:`, err.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ⚠️  IMPORTANT NEXT STEP (Step 2 of Ownable2Step):');
  console.log(`  The new owner wallet (${newOwner}) MUST call acceptOwnership()`);
  console.log('  to complete the transfer. You can run:');
  console.log('    node scripts/manage-roles.mjs --accept-owner');
  console.log('  (with the new owner\'s private key in .env) or call it via Safe UI.');
  console.log('═══════════════════════════════════════════════════════════');
}

async function acceptOwnership() {
  if (!walletClient || !account) {
    console.error('❌ Cannot send transaction: Key not configured in .env');
    process.exit(1);
  }

  console.log(`🚀 Step 2: Calling acceptOwnership() from: ${account.address}\n`);

  for (const c of contracts) {
    if (!c.address) continue;
    try {
      const pending = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'pendingOwner' });
      if (pending.toLowerCase() !== account.address.toLowerCase()) {
        console.log(`ℹ️  Skipping ${c.name}: wallet is not pending owner (pending: ${pending})`);
        continue;
      }
      console.log(`Accepting ownership on ${c.name}...`);
      const hash = await walletClient.writeContract({
        address: c.address,
        abi: c.abi,
        functionName: 'acceptOwnership',
      });
      console.log(`   Tx sent: ${hash}. Waiting for confirmation...`);
      await publicClient.waitForTransactionReceipt({ hash });
      const newOwner = await publicClient.readContract({ address: c.address, abi: c.abi, functionName: 'owner' });
      console.log(`   🎉 ${c.name}: Ownership transferred! Current owner is now ${newOwner}`);
    } catch (err) {
      console.error(`   ❌ Failed on ${c.name}:`, err.message);
    }
  }
}

async function setSponsor(sponsorAddress) {
  if (!walletClient || !account) {
    console.error('❌ Cannot send transaction: DEPLOYER_PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(sponsorAddress)) {
    console.error('❌ Invalid address:', sponsorAddress);
    process.exit(1);
  }

  console.log(`🚀 Configuring Sponsor/Relayer Wallet to: ${sponsorAddress}`);
  console.log(`Executing from current owner/admin: ${account.address}\n`);

  // 1. ParcisLinks.setAdmin
  const linksAddr = isMainnet
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT)
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT);
  if (linksAddr) {
    try {
      console.log(`Updating ParcisLinks.admin to ${sponsorAddress}...`);
      const hash = await walletClient.writeContract({
        address: linksAddr,
        abi: LINKS_ABI,
        functionName: 'setAdmin',
        args: [sponsorAddress],
      });
      console.log(`   Tx: ${hash}. Waiting...`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ ParcisLinks admin updated to ${sponsorAddress}`);
    } catch (err) {
      console.error(`   ❌ ParcisLinks setAdmin failed:`, err.message);
    }
  }

  // 2. ParcisDevRegistry.setApiRelayer
  const devAddr = isMainnet
    ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT)
    : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT);
  if (devAddr) {
    try {
      console.log(`Updating ParcisDevRegistry.apiRelayer to ${sponsorAddress}...`);
      const hash = await walletClient.writeContract({
        address: devAddr,
        abi: DEV_ABI,
        functionName: 'setApiRelayer',
        args: [sponsorAddress],
      });
      console.log(`   Tx: ${hash}. Waiting...`);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ ParcisDevRegistry apiRelayer updated to ${sponsorAddress}`);
    } catch (err) {
      console.error(`   ❌ ParcisDevRegistry setApiRelayer failed:`, err.message);
    }
  }

  console.log('\n🎉 Sponsor wallet setup complete!');
  console.log('Now you can safely place this sponsor wallet\'s private key in Vercel as SPONSOR_PRIVATE_KEY.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--transfer-owner')) {
    const idx = args.indexOf('--transfer-owner');
    const target = args[idx + 1];
    await transferOwnership(target);
  } else if (args.includes('--accept-owner')) {
    await acceptOwnership();
  } else if (args.includes('--set-sponsor')) {
    const idx = args.indexOf('--set-sponsor');
    const target = args[idx + 1];
    await setSponsor(target);
  } else {
    await showStatus();
  }
}

main().catch(console.error);
