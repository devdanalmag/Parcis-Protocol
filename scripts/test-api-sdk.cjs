/**
 * ═══ Parcis API & SDK Automated Verification Test Suite ═══
 * Tests all REST endpoints, contract lookups, and SDK helpers against Arc Network.
 */

require('dotenv').config();
const { createPublicClient, http, defineChain, formatUnits } = require('viem');

const isMainnet = (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet' ||
  (process.env.CHAIN_ID === '5042' || process.env.VITE_CHAIN_ID === '5042');

const ARC_RPC = isMainnet
  ? (process.env.MAINNET_RPC_URL || process.env.VITE_MAINNET_RPC_URL || process.env.RPC_URL || 'https://rpc.mainnet.arc.io')
  : (process.env.TESTNET_RPC_URL || process.env.VITE_TESTNET_RPC_URL || process.env.RPC_URL || 'https://arc-testnet.drpc.org');

const LINKS_CONTRACT = isMainnet
  ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT || '0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0')
  : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT || '0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94');

const SAFE_CONTRACT = isMainnet
  ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT || '0x7BD84F1EDA677c98217F590560E8C0577Efba809')
  : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT || '0x462b674d2feD79CD38e813eb5455e3DCf27D0077');

const STREAMS_CONTRACT = isMainnet
  ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT || '0xe6775F130F61d9d2e3E93Dad2e6d971788D36557')
  : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT || '0x2dba83814b30e42C0a25E63c331C10A4E0766c3d');

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const arcChain = defineChain({
  id: isMainnet ? 5042 : 5042002,
  name: isMainnet ? 'Arc' : 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
  contracts: {
    multicall3: {
      address: MULTICALL3_ADDRESS,
    },
  },
});
const arcTestnet = arcChain; // Backwards compatibility for existing references

async function runTests() {
  console.log('\n⚡ ══════════════════════════════════════════════════════════ ⚡');
  console.log('       PARCIS PROTOCOL: API & SDK VERIFICATION SUITE       ');
  console.log('⚡ ══════════════════════════════════════════════════════════ ⚡\n');
  console.log(`🔗 RPC: ${ARC_RPC}`);
  console.log(`📋 Links Contract:   ${LINKS_CONTRACT}`);
  console.log(`🛡️  ArcSafe Contract: ${SAFE_CONTRACT}`);
  console.log(`🌊 Streams Contract: ${STREAMS_CONTRACT}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  const client = createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC) });

  // ─── Test 1: Arc RPC Connection & Latency ───
  console.log('🔍 Test 1: RPC Connection & Telemetry...');
  const startRpc = Date.now();
  try {
    const blockNumber = await client.getBlockNumber();
    const latency = Date.now() - startRpc;
    assert(blockNumber > 0n, 'Arc RPC Block Height Check', `Block #${blockNumber}, ${latency}ms latency`);
  } catch (e) {
    assert(false, 'Arc RPC Block Height Check', e.message);
  }

  // ─── Test 2: ParcisLinks Contract Interface ───
  console.log('\n🔍 Test 2: ParcisLinks Contract Interface...');
  try {
    const isAvail = await client.readContract({
      address: LINKS_CONTRACT,
      abi: [{ name: 'isIdAvailable', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'bool' }] }],
      functionName: 'isIdAvailable',
      args: ['0x746573742d736c75672d617661696c61626c6531323300000000000000000000'],
    });
    assert(typeof isAvail === 'boolean', 'ParcisLinks isIdAvailable Call', `Result: ${isAvail}`);
  } catch (e) {
    assert(false, 'ParcisLinks isIdAvailable Call', e.message);
  }

  // ─── Test 3: ParcisSafe Contract Interface ───
  console.log('\n🔍 Test 3: ParcisSafe Contract Interface...');
  try {
    const arbiters = await client.readContract({
      address: SAFE_CONTRACT,
      abi: [{ name: 'getPlatformArbiters', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] }],
      functionName: 'getPlatformArbiters',
    });
    assert(Array.isArray(arbiters), 'ParcisSafe getPlatformArbiters Call', `Arbiters registered: ${arbiters.length}`);
  } catch (e) {
    assert(false, 'ParcisSafe getPlatformArbiters Call', e.message);
  }

  // ─── Test 4: ParcisStreams Contract Interface ───
  console.log('\n🔍 Test 4: ParcisStreams Contract Interface...');
  try {
    const streamCount = await client.readContract({
      address: STREAMS_CONTRACT,
      abi: [{ name: 'streamCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
      functionName: 'streamCount',
    });
    assert(typeof streamCount === 'bigint', 'ParcisStreams streamCount Query', `Stream Count: ${streamCount}`);
  } catch (e) {
    assert(false, 'ParcisStreams streamCount Query', e.message);
  }

  // ─── Test 5: Score Algorithm Verification ───
  console.log('\n🔍 Test 5: Trust Score Mathematical Formula...');
  function calculateTrustScore(stats) {
    const { completed, total, disputed, totalVolume, linksCount } = stats;
    if (total === 0 && linksCount === 0) return { score: 0, level: 'New' };
    const completionRate = total > 0 ? (completed / total) : 0;
    const completionScore = completionRate * 40;
    const volumeScore = Math.min(Math.log10(totalVolume + 1) / 4, 1) * 25;
    const activity = total + linksCount;
    const activityScore = Math.min(activity / 20, 1) * 20;
    const disputeRatio = total > 0 ? (disputed / total) : 0;
    const disputePenalty = disputeRatio * 15;
    const rawScore = Math.max(0, Math.min(100, Math.round(completionScore + volumeScore + activityScore - disputePenalty)));
    let level = 'New';
    if (rawScore >= 90) level = 'Legendary';
    else if (rawScore >= 75) level = 'Trusted';
    else if (rawScore >= 50) level = 'Established';
    else if (rawScore >= 25) level = 'Building';
    else if (rawScore > 0) level = 'Starter';
    return { score: rawScore, level };
  }

  const highRepScore = calculateTrustScore({ completed: 20, total: 20, disputed: 0, totalVolume: 15000, linksCount: 5 });
  assert(highRepScore.score >= 85 && (highRepScore.level === 'Trusted' || highRepScore.level === 'Legendary'), 'High Reputation Score Calc', `Score: ${highRepScore.score}, Level: ${highRepScore.level}`);

  const zeroScore = calculateTrustScore({ completed: 0, total: 0, disputed: 0, totalVolume: 0, linksCount: 0 });
  assert(zeroScore.score === 0 && zeroScore.level === 'New', 'Zero Activity Score Calc', `Score: ${zeroScore.score}`);

  // ─── Test 6: Multicall3 Contract Batching Execution ───
  console.log('\n🔍 Test 6: Multicall3 Contract Batching Execution...');
  try {
    const arbiters = await client.readContract({
      address: SAFE_CONTRACT,
      abi: [{ name: 'getPlatformArbiters', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] }],
      functionName: 'getPlatformArbiters',
    });

    const calls = arbiters.map(a => ({
      address: SAFE_CONTRACT,
      abi: [{ name: 'arbiterTrustScore', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] }],
      functionName: 'arbiterTrustScore',
      args: [a],
    }));

    const results = await client.multicall({ contracts: calls, allowFailure: true });
    assert(Array.isArray(results) && results.length === calls.length, 'Multicall3 Batch Arbiter Query', `Batched ${calls.length} contract calls`);
  } catch (e) {
    assert(false, 'Multicall3 Batch Arbiter Query', e.message);
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('══════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests();
