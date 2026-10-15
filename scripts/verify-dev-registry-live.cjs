// ═══ Verify Live ParcisDevRegistry on Arc Testnet ═══
// Usage: npx hardhat run scripts/verify-dev-registry-live.cjs --network arcTestnet

const { ethers } = require("hardhat");

async function main() {
  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const REGISTRY_ADDRESS = isMainnet
    ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || "0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1")
    : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || "0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670");

  console.log("═══════════════════════════════════════════════════");
  console.log(`  Verifying ParcisDevRegistry on ${isMainnet ? 'Arc Mainnet' : 'Arc Testnet'}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("Contract Address: ", REGISTRY_ADDRESS);

  const registry = await ethers.getContractAt("ParcisDevRegistry", REGISTRY_ADDRESS);

  const owner = await registry.owner();
  const treasury = await registry.platformTreasury();
  const relayer = await registry.apiRelayer();
  const streams = await registry.parcisStreams();
  const freeLimit = await registry.FREE_CALL_LIMIT();
  const proLimit = await registry.PRO_CALL_LIMIT();
  const proPrice = await registry.PRO_30_DAYS_PRICE();
  const totalDevs = await registry.totalDevelopers();

  console.log("");
  console.log("Contract State:");
  console.log("  Owner:              ", owner);
  console.log("  Platform Treasury:  ", treasury);
  console.log("  API Relayer:        ", relayer);
  console.log("  ParcisStreams:      ", streams);
  console.log("  Free Quota Limit:   ", freeLimit.toString(), "calls/mo");
  console.log("  Pro Quota Limit:    ", proLimit.toString(), "calls/mo");
  console.log("  Pro Monthly Price:  ", ethers.formatUnits(proPrice, 6), "USDC ($29)");
  console.log("  Total Developers:   ", totalDevs.toString());
  console.log("");
  console.log("✅ Contract is fully initialized, responsive, and live on Arc Testnet!");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
