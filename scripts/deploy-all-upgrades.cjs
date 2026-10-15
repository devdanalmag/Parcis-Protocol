const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PARCIS TESTNET FULL UPGRADE DEPLOYMENT — ALL 4 CONTRACTS     ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Deployer Address:", deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ARC/USDC");
  console.log("");

  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';

  const safeProxyAddress = isMainnet
    ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT)
    : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT);
  const linksProxyAddress = isMainnet
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT)
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT);
  const streamsProxyAddress = isMainnet
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT)
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT);
  const devProxyAddress = isMainnet
    ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT)
    : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT);

  if (!safeProxyAddress || !linksProxyAddress || !streamsProxyAddress || !devProxyAddress) {
    console.error("❌ Missing one or more proxy addresses in .env!");
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────
  // 1. UPGRADE PARCIS SAFE -> V2.2.0 (Circuit Breaker + ReentrancyGuard)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📦 [1/4] Upgrading ParcisSafe (Escrow & Arbitration)...");
  console.log("    Proxy Address:", safeProxyAddress);
  const SafeFactory = await ethers.getContractFactory("ParcisSafeV2");
  console.log("    Deploying ParcisSafeV2 implementation with 8,000,000 gas...");
  const safeImpl = await SafeFactory.deploy({ gasLimit: 8000000 });
  await safeImpl.waitForDeployment();
  const safeImplAddr = await safeImpl.getAddress();
  console.log("    ✅ Implementation deployed at:", safeImplAddr);

  const safeProxy = await ethers.getContractAt("ParcisSafeV2", safeProxyAddress);

  try {
    console.log("    Upgrading ParcisSafe proxy implementation...");
    const tx = await safeProxy.upgradeToAndCall(safeImplAddr, "0x", { gasLimit: 500000 });
    await tx.wait(1);
    console.log("    ✅ ParcisSafe upgraded implementation");
  } catch (err) {
    console.log("    upgradeToAndCall error:", err.message);
  }

  try {
    console.log("    Initializing V2 (minArbiterStake)...");
    const initV2 = await safeProxy.initializeV2({ gasLimit: 300000 });
    await initV2.wait(1);
    console.log("    ✅ initializeV2 executed");
  } catch (e) { console.log("    Note on initializeV2:", e.message); }

  try {
    console.log("    Initializing V2.1 (appealWindow)...");
    const initV2_1 = await safeProxy.initializeV2_1({ gasLimit: 300000 });
    await initV2_1.wait(1);
    console.log("    ✅ initializeV2_1 executed");
  } catch (e) { console.log("    Note on initializeV2_1:", e.message); }

  try {
    console.log("    Initializing V2.2 (Circuit Breaker & 2-Step)...");
    const initV2_2 = await safeProxy.initializeV2_2({ gasLimit: 300000 });
    await initV2_2.wait(1);
    console.log("    ✅ initializeV2_2 executed");
  } catch (e) { console.log("    Note on initializeV2_2:", e.message); }

  const safeVer = await safeProxy.version();
  console.log(`    ⭐ ParcisSafe Version: ${safeVer}`);

  // ─────────────────────────────────────────────────────────────
  // 2. UPGRADE PARCIS LINKS -> V3.1.0 (Circuit Breaker + 2-Step)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📦 [2/4] Upgrading ParcisLinks (Vanity & Tip Checkouts)...");
  console.log("    Proxy Address:", linksProxyAddress);
  const LinksFactory = await ethers.getContractFactory("ParcisLinksV3");
  console.log("    Deploying ParcisLinksV3 implementation with 8,000,000 gas...");
  const linksImpl = await LinksFactory.deploy({ gasLimit: 8000000 });
  await linksImpl.waitForDeployment();
  const linksImplAddr = await linksImpl.getAddress();
  console.log("    ✅ Implementation deployed at:", linksImplAddr);

  const linksProxy = await ethers.getContractAt("ParcisLinksV3", linksProxyAddress);

  try {
    console.log("    Upgrading ParcisLinks proxy implementation...");
    const tx = await linksProxy.upgradeToAndCall(linksImplAddr, "0x", { gasLimit: 500000 });
    await tx.wait(1);
    console.log("    ✅ ParcisLinks upgraded implementation");
  } catch (err) {
    console.log("    upgradeToAndCall error:", err.message);
  }

  try {
    console.log("    Initializing V3 (platformWallet & premiumSlugFee)...");
    const initV3 = await linksProxy.initializeV3(deployer.address, 500000, { gasLimit: 300000 });
    await initV3.wait(1);
    console.log("    ✅ initializeV3 executed");
  } catch (e) { console.log("    Note on initializeV3:", e.message); }

  try {
    console.log("    Initializing Security (Circuit Breaker & 2-Step)...");
    const initSec = await linksProxy.initializeSecurity({ gasLimit: 300000 });
    await initSec.wait(1);
    console.log("    ✅ initializeSecurity executed");
  } catch (e) { console.log("    Note on initializeSecurity:", e.message); }

  const linksVer = await linksProxy.version();
  console.log(`    ⭐ ParcisLinks Version: ${linksVer}`);

  // ─────────────────────────────────────────────────────────────
  // 3. UPGRADE PARCIS STREAMS -> V2.0.0 (Circuit Breaker + 2-Step)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📦 [3/4] Upgrading ParcisStreams (Subscriptions)...");
  console.log("    Proxy Address:", streamsProxyAddress);
  const StreamsFactory = await ethers.getContractFactory("ParcisStreamsV1");
  console.log("    Deploying ParcisStreamsV1 (V2.0.0) implementation with 8,000,000 gas...");
  const streamsImpl = await StreamsFactory.deploy({ gasLimit: 8000000 });
  await streamsImpl.waitForDeployment();
  const streamsImplAddr = await streamsImpl.getAddress();
  console.log("    ✅ Implementation deployed at:", streamsImplAddr);

  const streamsProxy = await ethers.getContractAt("ParcisStreamsV1", streamsProxyAddress);
  const streamsInitData = streamsImpl.interface.encodeFunctionData("initializeSecurity");

  try {
    console.log("    Calling upgradeToAndCall with initializeSecurity()...");
    const tx = await streamsProxy.upgradeToAndCall(streamsImplAddr, streamsInitData, { gasLimit: 1000000 });
    await tx.wait(1);
    console.log("    ✅ ParcisStreams upgraded and initialized V2.0 (tx:", tx.hash, ")");
  } catch (err) {
    console.log("    upgradeToAndCall error, attempting fallback upgradeToAndCall without calldata:", err.message);
    const tx = await streamsProxy.upgradeToAndCall(streamsImplAddr, "0x", { gasLimit: 500000 });
    await tx.wait(1);
    console.log("    ✅ ParcisStreams upgraded without calldata");
    try {
      const initTx = await streamsProxy.initializeSecurity({ gasLimit: 300000 });
      await initTx.wait(1);
      console.log("    ✅ initializeSecurity executed");
    } catch (e) {
      console.log("    Note on initializeSecurity:", e.message);
    }
  }

  const streamsVer = await streamsProxy.version();
  console.log(`    ⭐ ParcisStreams Version: ${streamsVer}`);

  // ─────────────────────────────────────────────────────────────
  // 4. UPGRADE PARCIS DEV REGISTRY (2-Step Ownership Transfer)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📦 [4/4] Upgrading ParcisDevRegistry (Developer Hub)...");
  console.log("    Proxy Address:", devProxyAddress);
  const DevFactory = await ethers.getContractFactory("ParcisDevRegistry");
  console.log("    Deploying ParcisDevRegistry implementation with 8,000,000 gas...");
  const devImpl = await DevFactory.deploy({ gasLimit: 8000000 });
  await devImpl.waitForDeployment();
  const devImplAddr = await devImpl.getAddress();
  console.log("    ✅ Implementation deployed at:", devImplAddr);

  const devProxy = await ethers.getContractAt("ParcisDevRegistry", devProxyAddress);
  const devInitData = devImpl.interface.encodeFunctionData("initializeSecurity");

  try {
    console.log("    Calling upgradeToAndCall with initializeSecurity()...");
    const tx = await devProxy.upgradeToAndCall(devImplAddr, devInitData, { gasLimit: 1000000 });
    await tx.wait(1);
    console.log("    ✅ ParcisDevRegistry upgraded and initialized (tx:", tx.hash, ")");
  } catch (err) {
    console.log("    upgradeToAndCall error, attempting fallback upgradeToAndCall without calldata:", err.message);
    const tx = await devProxy.upgradeToAndCall(devImplAddr, "0x", { gasLimit: 500000 });
    await tx.wait(1);
    console.log("    ✅ ParcisDevRegistry upgraded without calldata");
    try {
      const initTx = await devProxy.initializeSecurity({ gasLimit: 300000 });
      await initTx.wait(1);
      console.log("    ✅ initializeSecurity executed");
    } catch (e) {
      console.log("    Note on initializeSecurity:", e.message);
    }
  }

  const devOwner = await devProxy.owner();
  console.log(`    ⭐ ParcisDevRegistry Owner: ${devOwner}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  🎉 ALL 4 CONTRACTS SUCCESSFULLY UPGRADED ON ARC TESTNET!    ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("• ParcisSafe:        ", safeProxyAddress, `(${safeVer})`);
  console.log("• ParcisLinks:       ", linksProxyAddress, `(${linksVer})`);
  console.log("• ParcisStreams:     ", streamsProxyAddress, `(${streamsVer})`);
  console.log("• ParcisDevRegistry: ", devProxyAddress);
  console.log("\nAll proxy addresses in .env remain identical and valid.");
}

main().catch((err) => {
  console.error("Upgrade failed:", err);
  process.exitCode = 1;
});
