// ═══ Deploy ParcisDevRegistry via UUPS Proxy ═══
// Usage: npx hardhat run scripts/deploy-dev-registry.cjs --network arcTestnet

const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════");
  console.log("  Parcis — Developer Registry Proxy Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer: ", deployer.address);
  console.log("Network:  ", (await ethers.provider.getNetwork()).name);
  console.log("");

  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const STREAMS_CONTRACT = isMainnet
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || "0xe6775F130F61d9d2e3E93Dad2e6d971788D36557")
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || "0x2dba83814b30e42C0a25E63c331C10A4E0766c3d");
  const PLATFORM_TREASURY = deployer.address;
  const API_RELAYER = deployer.address;

  console.log("Connecting with:");
  console.log("  ParcisStreams:     ", STREAMS_CONTRACT);
  console.log("  Platform Treasury: ", PLATFORM_TREASURY);
  console.log("  API Relayer:       ", API_RELAYER);
  console.log("");

  console.log("Deploying ParcisDevRegistry UUPS proxy...");
  const ParcisDevRegistry = await ethers.getContractFactory("ParcisDevRegistry");
  const registry = await upgrades.deployProxy(
    ParcisDevRegistry,
    [STREAMS_CONTRACT, PLATFORM_TREASURY, API_RELAYER],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  console.log("    ✅ ParcisDevRegistry proxy deployed at:", registryAddr);
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE — Update your .env:");
  console.log("═══════════════════════════════════════════════════");
  console.log(`VITE_DEV_REGISTRY_CONTRACT=${registryAddr}`);
  console.log(`DEV_REGISTRY_CONTRACT=${registryAddr}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
