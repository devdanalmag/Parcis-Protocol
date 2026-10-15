// ═══ Upgrade a Parcis Contract (SAME ADDRESS, NEW CODE) ═══
// Usage:
//   npx hardhat run scripts/upgrade.cjs --network arcTestnet
//
// Before running:
//   1. Create your new V2 contract (e.g. ParcisSafeV2.sol)
//   2. Set the CONTRACT and NEW_VERSION below
//   3. Run the script — proxy address stays the same!

const { ethers, upgrades } = require("hardhat");

// ═══════════════════════════════════════════
// CONFIGURE THESE FOR EACH UPGRADE
// ═══════════════════════════════════════════

// Which contract to upgrade? Options: "safe", "links", "streams"
const TARGET = "safe";

const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';

// The proxy addresses resolved dynamically based on network (from .env)
const PROXY_ADDRESSES = {
  safe:    isMainnet 
    ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT) 
    : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT),
  links:   isMainnet 
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT) 
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT),
  streams: isMainnet 
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT) 
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT),
};

// The new contract factory name (the Solidity contract name in your .sol file)
const NEW_CONTRACT_NAMES = {
  safe:    "ParcisSafeV2",     // Upgrading ParcisSafe to V2.1.0 (reinitializer 3)
  links:   "ParcisLinksV2",    // Changed to ParcisLinksV2
  streams: "ParcisStreamsV1",  // Change to "ParcisStreamsV2" when you create V2
};

const OLD_CONTRACT_NAMES = {
  safe:    "ParcisSafeV2",     // Deployed contract factory is ParcisSafeV2 (version 2.0.0)
  links:   "ParcisLinksV1",
  streams: "ParcisStreamsV1",
};

// ═══════════════════════════════════════════

async function main() {
  const [deployer] = await ethers.getSigners();
  const proxyAddress = PROXY_ADDRESSES[TARGET];
  const newContractName = NEW_CONTRACT_NAMES[TARGET];
  const oldContractName = OLD_CONTRACT_NAMES[TARGET];

  if (!proxyAddress) {
    console.error(`❌ No proxy address found for "${TARGET}". Check your .env file.`);
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════");
  console.log(`  Upgrading: ${TARGET.toUpperCase()}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("Proxy address (UNCHANGED):", proxyAddress);
  console.log("New implementation:       ", newContractName);
  console.log("Deployer:                 ", deployer.address);
  console.log("");

  // Read old version before upgrade
  const oldFactory = await ethers.getContractFactory(oldContractName);
  const oldContract = oldFactory.attach(proxyAddress);
  let oldVersion = "unknown";
  try { oldVersion = await oldContract.version(); } catch (e) {}
  console.log("Current version:", oldVersion);

  // Perform the upgrade
  console.log("Upgrading...");
  const NewContract = await ethers.getContractFactory(newContractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, NewContract, { kind: "uups" });
  await upgraded.waitForDeployment();

  // Call reinitializers on the upgraded contract if it's safe
  if (TARGET === "safe") {
    console.log("Initializing V2_1 state variables...");
    try {
      const initTx = await upgraded.initializeV2_1();
      await initTx.wait();
      console.log("✅ V2_1 initialized successfully!");
    } catch (e) {
      console.log("⚠️ V2_1 initializer warning (might already be initialized):", e.message);
    }
  }

  // Read new version after upgrade
  let newVersion = "unknown";
  try { newVersion = await upgraded.version(); } catch (e) {}

  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅ UPGRADE COMPLETE");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Proxy address: ${proxyAddress} (SAME — no change!)`);
  console.log(`Version:       ${oldVersion} → ${newVersion}`);
  console.log("");
  console.log("All existing data (deals, links, streams) is preserved.");
  console.log("Users don't need to change anything.");
  console.log("═══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
