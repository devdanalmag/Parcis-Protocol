// ═══ Deploy All Parcis Contracts via UUPS Proxy ═══
// Usage: npx hardhat run scripts/deploy-proxy.cjs --network arcTestnet

const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  Parcis — Upgradeable Proxy Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Network: ", (await ethers.provider.getNetwork()).name);
  console.log("");

  // ── USDC address on Arc ──
  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const USDC = isMainnet
    ? (process.env.MAINNET_USDC_ADDRESS || process.env.VITE_MAINNET_USDC_ADDRESS || "0x3600000000000000000000000000000000000000")
    : (process.env.TESTNET_USDC_ADDRESS || process.env.VITE_TESTNET_USDC_ADDRESS || "0x3600000000000000000000000000000000000000");
  const PLATFORM_WALLET = deployer.address; // You receive platform fees
  const ADMIN_WALLET = deployer.address;    // Admin for gas sponsorship

  // ─── 1. Deploy ParcisSafe (Escrow) ───
  console.log("1/3 — Deploying ParcisSafe proxy...");
  const ParcisSafe = await ethers.getContractFactory("ParcisSafeV1");
  const safe = await upgrades.deployProxy(ParcisSafe, [USDC, PLATFORM_WALLET], {
    kind: "uups",
    initializer: "initialize",
  });
  await safe.waitForDeployment();
  const safeAddr = await safe.getAddress();
  console.log("    ✅ ParcisSafe proxy:  ", safeAddr);
  console.log("    Version:", await safe.version());

  // ─── 2. Deploy ParcisLinks ───
  console.log("2/3 — Deploying ParcisLinks proxy...");
  const ParcisLinks = await ethers.getContractFactory("ParcisLinksV1");
  const links = await upgrades.deployProxy(ParcisLinks, [ADMIN_WALLET, USDC], {
    kind: "uups",
    initializer: "initialize",
  });
  await links.waitForDeployment();
  const linksAddr = await links.getAddress();
  console.log("    ✅ ParcisLinks proxy: ", linksAddr);
  console.log("    Version:", await links.version());

  // ─── 3. Deploy ParcisStreams ───
  console.log("3/3 — Deploying ParcisStreams proxy...");
  const ParcisStreams = await ethers.getContractFactory("ParcisStreamsV1");
  const streams = await upgrades.deployProxy(ParcisStreams, [USDC, PLATFORM_WALLET], {
    kind: "uups",
    initializer: "initialize",
  });
  await streams.waitForDeployment();
  const streamsAddr = await streams.getAddress();
  console.log("    ✅ ParcisStreams proxy:", streamsAddr);
  console.log("    Version:", await streams.version());

  // ─── Summary ───
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE — Copy these to your .env:");
  console.log("═══════════════════════════════════════════════════");
  console.log(`VITE_ARCSAFE_CONTRACT=${safeAddr}`);
  console.log(`VITE_LINKS_CONTRACT=${linksAddr}`);
  console.log(`VITE_STREAMS_CONTRACT=${streamsAddr}`);
  console.log(`LINKS_CONTRACT=${linksAddr}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("⚠️  IMPORTANT: Save these addresses! They are PERMANENT.");
  console.log("    Future upgrades will use these SAME addresses.");
  console.log("    The proxy addresses NEVER change.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
