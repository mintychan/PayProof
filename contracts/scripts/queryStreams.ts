import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x110e416bB6A79f9b9e8d90e8af734cC8fA028C13";
  const senderAddress = "0x8e85673F332b5Bb921DA32231ee1c4dBd192935a";

  console.log("Querying StreamingPayroll contract...");
  console.log("Contract:", contractAddress);
  console.log("Sender:", senderAddress);
  console.log("─────────────────────────────────────────");

  const StreamingPayroll = await ethers.getContractFactory("StreamingPayroll");
  const contract = StreamingPayroll.attach(contractAddress);

  // Query StreamCreated events
  const filter = contract.filters.StreamCreated();
  console.log("\n🔍 Querying StreamCreated events...");

  try {
    const currentBlock = await ethers.provider.getBlockNumber();

    console.log(`Current block: ${currentBlock}`);

    // For free tier Alchemy, we need to query in small chunks (max 10 blocks)
    // Let's query the last 1000 blocks in chunks of 10
    const totalBlocksToQuery = 1000;
    const chunkSize = 10;
    const fromBlock = Math.max(0, currentBlock - totalBlocksToQuery);

    console.log(`Querying from block ${fromBlock} to ${currentBlock} in chunks of ${chunkSize}`);

    let allEvents: any[] = [];
    for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, currentBlock);
      const chunkEvents = await contract.queryFilter(filter, start, end);
      allEvents = allEvents.concat(chunkEvents);
      if (chunkEvents.length > 0) {
        console.log(`  Found ${chunkEvents.length} events in blocks ${start}-${end}`);
      }
    }

    const events = allEvents;
    console.log(`\n✅ Found ${events.length} total StreamCreated events\n`);

    if (events.length === 0) {
      console.log("❌ No streams found. The contract has not created any streams yet.");
      console.log("\nPossible reasons:");
      console.log("1. No streams have been created on this contract");
      console.log("2. The transaction might have failed");
      console.log("3. The events are outside the queried block range");
      return;
    }

    // Filter events for the specific sender
    let senderStreams = 0;
    for (const event of events) {
      const args = event.args;
      if (!args) continue;

      const streamId = args.streamId.toString();
      const sender = args.sender;
      const recipient = args.recipient;
      const ratePerSecond = args.ratePerSecond.toString();
      const deposit = args.deposit.toString();

      console.log(`Stream #${streamId}:`);
      console.log(`  Sender: ${sender}`);
      console.log(`  Recipient: ${recipient}`);
      console.log(`  Rate/sec: ${ethers.formatEther(ratePerSecond)} ETH`);
      console.log(`  Deposit: ${ethers.formatEther(deposit)} ETH`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  Tx: ${event.transactionHash}`);

      if (sender.toLowerCase() === senderAddress.toLowerCase()) {
        senderStreams++;
        console.log(`  ✓ MATCHES SENDER ADDRESS`);
      }
      console.log("");
    }

    console.log("─────────────────────────────────────────");
    console.log(`\n📊 Summary:`);
    console.log(`Total streams: ${events.length}`);
    console.log(`Streams from ${senderAddress}: ${senderStreams}`);
  } catch (error) {
    console.error("❌ Error querying events:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
