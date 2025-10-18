import { Contract, BrowserProvider } from "ethers";
import { ENCRYPTED_PAYROLL_ABI } from "./EncryptedPayrollABI";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT || "";

export interface EncryptedStream {
  streamId: string;
  employer: string;
  employee: string;
  rateHandle: string;
  cadenceInSeconds: number;
  status: StreamStatus;
  startTime: number;
  lastAccruedAt: number;
}

export enum StreamStatus {
  None = 0,
  Active = 1,
  Paused = 2,
  Cancelled = 3,
}

export interface CreateEncryptedStreamParams {
  employee: string;
  encryptedRatePerSecond: string; // Handle from fhEVM encryption
  rateProof: string; // Proof from fhEVM encryption
  cadenceInSeconds: number;
  startTime?: number;
}

export class EncryptedPayrollContract {
  private getProvider(): BrowserProvider {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider((window as any).ethereum);
  }

  private async getContract(withSigner: boolean = false) {
    if (!CONTRACT_ADDRESS) {
      throw new Error("EncryptedPayroll contract address not configured");
    }

    const provider = this.getProvider();

    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(CONTRACT_ADDRESS, ENCRYPTED_PAYROLL_ABI, signer);
    }

    return new Contract(CONTRACT_ADDRESS, ENCRYPTED_PAYROLL_ABI, provider);
  }

  /**
   * Compute the stream ID for a given employer and employee pair
   */
  async computeStreamId(employer: string, employee: string): Promise<string> {
    const contract = await this.getContract();
    return await contract.computeStreamId(employer, employee);
  }

  /**
   * Create a new encrypted payroll stream
   */
  async createStream(
    employer: string,
    params: CreateEncryptedStreamParams
  ): Promise<string> {
    const contract = await this.getContract(true);

    console.log("Creating encrypted stream with params:", {
      employee: params.employee,
      encryptedRateHandle: params.encryptedRatePerSecond,
      proofLength: params.rateProof.length,
      cadenceInSeconds: params.cadenceInSeconds,
      startTime: params.startTime || 0,
    });

    // Create stream transaction
    const tx = await contract.createStream(
      params.employee,
      params.encryptedRatePerSecond,
      params.rateProof,
      params.cadenceInSeconds,
      params.startTime || 0
    );

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);

    // Parse stream ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "StreamCreated";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("StreamCreated event not found");
    }

    const parsedEvent = contract.interface.parseLog(event);
    const streamId = parsedEvent?.args.streamId;

    console.log("Stream created with ID:", streamId);

    return streamId;
  }

  /**
   * Get a specific encrypted stream
   */
  async getStream(streamId: string): Promise<EncryptedStream | null> {
    try {
      const contract = await this.getContract();
      const streamData = await contract.getStream(streamId);

      return {
        streamId,
        employer: streamData.employer,
        employee: streamData.employee,
        rateHandle: streamData.rateHandle,
        cadenceInSeconds: Number(streamData.cadenceInSeconds),
        status: Number(streamData.status) as StreamStatus,
        startTime: Number(streamData.startTime),
        lastAccruedAt: Number(streamData.lastAccruedAt),
      };
    } catch (error) {
      console.error("Error fetching stream:", error);
      return null;
    }
  }

  /**
   * Get stream by employer and employee addresses
   */
  async getStreamByAddresses(
    employer: string,
    employee: string
  ): Promise<EncryptedStream | null> {
    const streamId = await this.computeStreamId(employer, employee);
    return this.getStream(streamId);
  }

  /**
   * Get all streams for a given address (as employer or employee)
   * Note: Since streams use deterministic IDs, we need to query events
   */
  async getStreamsByAddress(
    address: string,
    type: "employer" | "employee"
  ): Promise<EncryptedStream[]> {
    try {
      const contract = await this.getContract();

      // Get StreamCreated events
      const filter = contract.filters.StreamCreated();

      // Query recent blocks (last 10000 blocks)
      const currentBlock = await contract.runner?.provider?.getBlockNumber();
      if (!currentBlock) {
        console.error("Could not get current block number");
        return [];
      }

      const fromBlock = Math.max(0, currentBlock - 10000);
      console.log(`Querying encrypted streams from block ${fromBlock} to ${currentBlock}`);

      const events = await contract.queryFilter(filter, fromBlock, currentBlock);
      console.log(`Found ${events.length} total StreamCreated events`);

      const streams: EncryptedStream[] = [];

      for (const event of events) {
        // Type guard to check if event has args (EventLog vs Log)
        if (!('args' in event) || !event.args) continue;

        const streamEmployer = event.args.employer;
        const streamEmployee = event.args.employee;
        const streamId = event.args.streamId;

        console.log(`Event - Stream ${streamId}: employer=${streamEmployer}, employee=${streamEmployee}`);

        // Filter by address and type
        if (
          (type === "employer" && streamEmployer.toLowerCase() === address.toLowerCase()) ||
          (type === "employee" && streamEmployee.toLowerCase() === address.toLowerCase())
        ) {
          console.log(`✓ Matched stream ${streamId} for ${type}`);

          const stream = await this.getStream(streamId);
          if (stream && stream.status !== StreamStatus.None) {
            streams.push(stream);
          }
        }
      }

      console.log(`Returning ${streams.length} encrypted streams for ${type}`);
      return streams;
    } catch (error) {
      console.error("Error fetching encrypted streams:", error);
      return [];
    }
  }

  /**
   * Pause a stream
   */
  async pauseStream(streamId: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.pauseStream(streamId);
    console.log("Pause transaction sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Resume a stream
   */
  async resumeStream(streamId: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.resumeStream(streamId);
    console.log("Resume transaction sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Cancel a stream
   */
  async cancelStream(streamId: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.cancelStream(streamId);
    console.log("Cancel transaction sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Top up a stream with encrypted amount
   */
  async topUp(
    streamId: string,
    encryptedAmount: string,
    amountProof: string
  ): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.topUp(streamId, encryptedAmount, amountProof);
    console.log("Top-up transaction sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  }

  /**
   * Sync a stream to update accrued balance
   */
  async syncStream(streamId: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.syncStream(streamId);
    console.log("Sync transaction sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  }
}

// Singleton instance
export const encryptedPayrollContract = new EncryptedPayrollContract();
