// ═══ Direct UUPS Upgrade for ParcisLinksV3 ═══
// Usage: npx hardhat run scripts/upgrade-links.cjs --network arcTestnet

const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const proxyAddress = isMainnet
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT || process.env.LINKS_CONTRACT)
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT || process.env.LINKS_CONTRACT);

  if (!proxyAddress) {
    console.error("❌ No VITE_LINKS_CONTRACT found in .env");
    process.exit(1);
  }

  const PLATFORM_WALLET = process.env.PLATFORM_WALLET || deployer.address;
  const PREMIUM_FEE = 500_000n; // 0.50 USDC (6 decimals)

  console.log("═══════════════════════════════════════════════════");
  console.log("  Upgrading: PARCIS LINKS -> V3 (Direct UUPS)");
  console.log("═══════════════════════════════════════════════════");
  console.log("Proxy address (UNCHANGED):", proxyAddress);
  console.log("Deployer / Admin:         ", deployer.address);
  console.log("Platform Revenue Wallet:  ", PLATFORM_WALLET);
  console.log("Premium Slug Fee:         ", "0.50 USDC (500000 units)");
  console.log("");

  // 1. Deploy ParcisLinksV3 implementation directly
  console.log("Step 1: Deploying ParcisLinksV3 implementation contract...");
  const ParcisLinksV3 = await ethers.getContractFactory("ParcisLinksV3");
  const v3Impl = await ParcisLinksV3.deploy({ gasLimit: 3000000 });
  await v3Impl.waitForDeployment();
  const v3ImplAddress = await v3Impl.getAddress();
  console.log("✅ New Implementation deployed at:", v3ImplAddress);

  // 2. Prepare upgrade transaction on UUPS proxy
  console.log("\nStep 2: Upgrading proxy to new implementation...");
  const proxy = await ethers.getContractAt("ParcisLinksV3", proxyAddress);

  // Encode initializeV3 call
  const initData = v3Impl.interface.encodeFunctionData("initializeV3", [
    PLATFORM_WALLET,
    PREMIUM_FEE,
  ]);

  try {
    console.log("Calling upgradeToAndCall on proxy...");
    const tx = await proxy.upgradeToAndCall(v3ImplAddress, initData, { gasLimit: 500000 });
    console.log("Tx sent:", tx.hash);
    const receipt = await tx.wait(1);
    console.log("✅ Proxy upgraded & initialized in tx:", receipt.hash);
  } catch (err) {
    console.log("upgradeToAndCall failed, falling back to upgradeTo:", err.message);
    const tx = await proxy.upgradeToAndCall(v3ImplAddress, "0x", { gasLimit: 300000 });
    await tx.wait(1);
    console.log("✅ Proxy upgraded without calldata");

    console.log("Configuring platformWallet & premiumSlugFee...");
    try {
      const tx1 = await proxy.initializeV3(PLATFORM_WALLET, PREMIUM_FEE, { gasLimit: 200000 });
      await tx1.wait(1);
      console.log("✅ initializeV3 executed");
    } catch (e2) {
      console.log("initializeV3 note:", e2.message);
      const txSet1 = await proxy.setPlatformWallet(PLATFORM_WALLET, { gasLimit: 100000 });
      await txSet1.wait(1);
      const txSet2 = await proxy.setPremiumSlugFee(PREMIUM_FEE, { gasLimit: 100000 });
      await txSet2.wait(1);
      console.log("✅ Setters executed");
    }
  }

  // 3. Verify upgraded contract state
  console.log("\nStep 3: Verifying on-chain state...");
  const version = await proxy.version();
  const onChainPlatformWallet = await proxy.platformWallet();
  const onChainFee = await proxy.premiumSlugFee();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ PARCIS LINKS V3 LIVE ON ARC NETWORK");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Proxy address:   ${proxyAddress}`);
  console.log(`Implementation:  ${v3ImplAddress}`);
  console.log(`Version:         ${version}`);
  console.log(`Platform Wallet: ${onChainPlatformWallet}`);
  console.log(`Premium Fee:     ${ethers.formatUnits(onChainFee, 6)} USDC (${onChainFee.toString()} units)`);
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
