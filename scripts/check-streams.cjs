const { ethers } = require("hardhat");

async function main() {
  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const streamsAddr = isMainnet
    ? (process.env.MAINNET_STREAMS_CONTRACT || process.env.VITE_MAINNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT)
    : (process.env.TESTNET_STREAMS_CONTRACT || process.env.VITE_TESTNET_STREAMS_CONTRACT || process.env.VITE_STREAMS_CONTRACT);
  console.log(`Streams Contract (${isMainnet ? 'Mainnet' : 'Testnet'}):`, streamsAddr);

  if (!streamsAddr) {
    console.error("❌ VITE_STREAMS_CONTRACT not set in .env");
    return;
  }

  const ABI = [
    "function streamCount() view returns (uint256)",
    "function streams(uint256) view returns (address sender, address recipient, uint256 depositAmount, uint256 startTime, uint256 stopTime, uint256 amountWithdrawn, bool isActive)",
    "function version() view returns (string)",
    "function senderStreams(address, uint256) view returns (uint256)",
    "function recipientStreams(address, uint256) view returns (uint256)",
  ];

  const contract = new ethers.Contract(streamsAddr, ABI, ethers.provider);

  // Check version
  try {
    const ver = await contract.version();
    console.log("Version:", ver);
  } catch (e) {
    console.log("version() call failed:", e.message);
  }

  // Check stream count
  try {
    const count = await contract.streamCount();
    console.log("Stream count:", count.toString());

    if (count > 0) {
      for (let i = 1; i <= Math.min(Number(count), 10); i++) {
        try {
          const s = await contract.streams(i);
          console.log(`\nStream #${i}:`);
          console.log("  sender:", s.sender);
          console.log("  recipient:", s.recipient);
          console.log("  depositAmount:", ethers.formatUnits(s.depositAmount, 6), "USDC");
          console.log("  startTime:", new Date(Number(s.startTime) * 1000).toISOString());
          console.log("  stopTime:", new Date(Number(s.stopTime) * 1000).toISOString());
          console.log("  amountWithdrawn:", ethers.formatUnits(s.amountWithdrawn, 6), "USDC");
          console.log("  isActive:", s.isActive);
        } catch (e) {
          console.log(`  Stream #${i} read failed:`, e.message);
        }
      }
    } else {
      console.log("No streams have been created on this contract.");
    }
  } catch (e) {
    console.error("streamCount() failed:", e.message);
  }
}

main().catch(console.error);
