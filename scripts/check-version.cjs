const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  const networkName = hre.network.name;
  const isMainnet = networkName === 'arcMainnet' || (networkName !== 'arcTestnet' && (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet');

  console.log("═══════════════════════════════════════════════════");
  console.log(`  PARCIS CONTRACT STATUS & ENV AUDIT (${isMainnet ? 'MAINNET' : 'TESTNET'})`);
  console.log("═══════════════════════════════════════════════════");
  console.log("Network:", networkName);
  console.log("Deployer Wallet:", deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ARC/USDC");
  console.log("");

  const safeAddress = isMainnet 
    ? (process.env.MAINNET_ARCSAFE_CONTRACT || process.env.VITE_MAINNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT)
    : (process.env.TESTNET_ARCSAFE_CONTRACT || process.env.VITE_TESTNET_ARCSAFE_CONTRACT || process.env.VITE_ARCSAFE_CONTRACT);
  const linksAddress = isMainnet
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT)
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || process.env.VITE_LINKS_CONTRACT);
  const streamsAddress = isMainnet
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT)
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT);
  const devAddress = isMainnet
    ? (process.env.MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_MAINNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT)
    : (process.env.TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_TESTNET_DEV_REGISTRY_CONTRACT || process.env.VITE_DEV_REGISTRY_CONTRACT);

  if (safeAddress) {
    try {
      const safe = await ethers.getContractAt([
        "function version() view returns (string)",
        "function owner() view returns (address)"
      ], safeAddress);
      const [ver, owner] = await Promise.all([safe.version(), safe.owner()]);
      console.log(`🛡️  ParcisSafe (${safeAddress}):`);
      console.log(`    Version on-chain: ${ver}`);
      console.log(`    Owner on-chain:   ${owner}`);
      console.log(`    Deployer is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    } catch (e) {
      console.error("Error reading Safe:", e.message);
    }
  }

  if (linksAddress) {
    try {
      const links = await ethers.getContractAt([
        "function version() view returns (string)",
        "function owner() view returns (address)"
      ], linksAddress);
      const [ver, owner] = await Promise.all([links.version(), links.owner()]);
      console.log(`🔗 ParcisLinks (${linksAddress}):`);
      console.log(`    Version on-chain: ${ver}`);
      console.log(`    Owner on-chain:   ${owner}`);
      console.log(`    Deployer is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    } catch (e) {
      console.error("Error reading Links:", e.message);
    }
  }

  if (streamsAddress) {
    try {
      const streams = await ethers.getContractAt([
        "function version() view returns (string)",
        "function owner() view returns (address)"
      ], streamsAddress);
      const [ver, owner] = await Promise.all([streams.version(), streams.owner()]);
      console.log(`🌊 ParcisStreams (${streamsAddress}):`);
      console.log(`    Version on-chain: ${ver}`);
      console.log(`    Owner onchain:   ${owner}`);
      console.log(`    Deployer is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    } catch (e) {
      console.error("Error reading Streams:", e.message);
    }
  }

  if (devAddress) {
    try {
      const dev = await ethers.getContractAt([
        "function owner() view returns (address)"
      ], devAddress);
      const owner = await dev.owner();
      console.log(`📋 ParcisDevRegistry (${devAddress}):`);
      console.log(`    Owner on-chain:   ${owner}`);
      console.log(`    Deployer is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    } catch (e) {
      console.error("Error reading DevRegistry:", e.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
