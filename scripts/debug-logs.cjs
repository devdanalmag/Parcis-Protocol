const { ethers } = require("hardhat");

async function main() {
  require("dotenv").config();
  const isMainnet = hre.network.name === 'arcMainnet' || (process.env.NETWORK || process.env.VITE_NETWORK || '').toLowerCase() === 'mainnet';
  const contractAddress = isMainnet
    ? (process.env.MAINNET_LINKS_CONTRACT || process.env.VITE_MAINNET_LINKS_CONTRACT || "0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0")
    : (process.env.TESTNET_LINKS_CONTRACT || process.env.VITE_TESTNET_LINKS_CONTRACT || "0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94");
  const ParcisLinks = await ethers.getContractFactory("ParcisLinksV1");
  const contract = ParcisLinks.attach(contractAddress);

  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block number:", currentBlock);
  
  const startBlock = Math.max(0, currentBlock - 9000);
  console.log(`Querying logs from block ${startBlock} to ${currentBlock} (range: ${currentBlock - startBlock})`);
  
  const filter = contract.filters.PaymentReceived();
  const events = await contract.queryFilter(filter, startBlock, currentBlock);
  console.log(`Found ${events.length} PaymentReceived events:`);
  for (const event of events) {
    console.log("Event args:", {
      id: event.args.id,
      payer: event.args.payer,
      creator: event.args.creator,
      amount: event.args.amount.toString(),
      blockNumber: event.blockNumber,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
