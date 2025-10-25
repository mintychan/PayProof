import { BrowserProvider, Contract } from "ethers";
import { ENCRYPTED_PAYROLL_ABI } from "./EncryptedPayrollABI";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT || "";

export enum StreamStatus {
  None = 0,
  Active = 1,
  Paused = 2,
  Cancelled = 3,
  Settled = 4,
}

export interface EncryptedStream {
  streamKey: string;
  streamId: string; // alias for backwards compatibility with existing views
  numericId: string;
  employer: string;
  employee: string;
  rateHandle: string;
  cadenceInSeconds: number;
  status: StreamStatus;
  startTime: number;
  lastAccruedAt: number;
  cancelable: boolean;
  transferable: boolean;
  hook: string;
  bufferedHandle: string;
  withdrawnHandle: string;
}

export interface CreateEncryptedStreamParams {
  employee: string;
  encryptedRatePerSecond: string;
  rateProof: string;
  cadenceInSeconds: number;
  startTime?: number;
}

export interface CreateStreamResult {
  streamKey: string;
  streamId: string;
  transactionHash: string;
}

export class EncryptedPayrollContract {
  private getProvider(): BrowserProvider {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider((window as any).ethereum);
  }

  private async getContract(withSigner = false) {
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
   * Compute the stream key (bytes32) for a given employer/employee pair.
   */
  async computeStreamKey(employer: string, employee: string): Promise<string> {
    const contract = await this.getContract();
    return await contract.computeStreamId(employer, employee);
  }

  /**
   * Backwards-compatible alias for computeStreamKey.
   */
  async computeStreamId(employer: string, employee: string): Promise<string> {
    return this.computeStreamKey(employer, employee);
  }

  /**
   * Create a new confidential stream and return the emitted identifiers.
   */
  async createStream(
    employer: string,
    params: CreateEncryptedStreamParams
  ): Promise<CreateStreamResult> {
    const contract = await this.getContract(true);

    const tx = await contract.createStream(
      params.employee,
      params.encryptedRatePerSecond,
      params.rateProof,
      params.cadenceInSeconds,
      params.startTime || 0
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt unavailable");
    }

    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "StreamCreated";
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error("StreamCreated event not found in receipt");
    }

    const parsedEvent = contract.interface.parseLog(eventLog);
    const streamKey: string = parsedEvent?.args.streamKey;
    const streamId: string = parsedEvent?.args.streamId?.toString?.() ?? "0";

    return {
      streamKey,
      streamId,
      transactionHash: tx.hash,
    };
  }

  /**
   * Fetch stream metadata and config for a given stream key.
   */
  async getStream(streamKey: string): Promise<EncryptedStream | null> {
    try {
      const contract = await this.getContract();

      const [streamData, config] = await Promise.all([
        contract.getStream(streamKey),
        contract.getStreamConfig(streamKey).catch(() => null),
      ]);

      const cadence = Number(streamData.cadenceInSeconds ?? 0);
      const statusValue = Number(streamData.status ?? 0) as StreamStatus;
      const startTime = Number(streamData.startTime ?? 0);
      const lastAccruedAt = Number(streamData.lastAccruedAt ?? 0);

      const numericId = config?.streamId ? config.streamId.toString() : "0";
      const cancelable = config?.cancelable ?? true;
      const transferable = config?.transferable ?? true;
      const hook = config?.hook ?? "0x0000000000000000000000000000000000000000";
      const bufferedHandle = config?.bufferedHandle ?? "0x0";
      const withdrawnHandle = config?.withdrawnHandle ?? "0x0";

      return {
        streamKey,
        streamId: streamKey,
        numericId,
        employer: streamData.employer,
        employee: streamData.employee,
        rateHandle: streamData.rateHandle,
        cadenceInSeconds: cadence,
        status: statusValue,
        startTime,
        lastAccruedAt,
        cancelable,
        transferable,
        hook,
        bufferedHandle,
        withdrawnHandle,
      };
    } catch (error) {
      console.error("Error fetching encrypted stream:", error);
      return null;
    }
  }

  async getStreamByAddresses(employer: string, employee: string): Promise<EncryptedStream | null> {
    const streamKey = await this.computeStreamKey(employer, employee);
    return this.getStream(streamKey);
  }

  /**
   * Query recent StreamCreated events and return any streams involving the address.
   */
  async getStreamsByAddress(
    address: string,
    type: "employer" | "employee"
  ): Promise<EncryptedStream[]> {
    try {
      const contract = await this.getContract();
      const filter = contract.filters.StreamCreated();
      const currentBlock = await contract.runner?.provider?.getBlockNumber();

      if (!currentBlock) {
        console.error("Unable to load current block number");
        return [];
      }

      const DEFAULT_LOOKBACK = 200_000;
      const fromBlock = Math.max(0, currentBlock - DEFAULT_LOOKBACK);
      let events = await contract.queryFilter(filter, fromBlock, currentBlock);

      if (!events || events.length === 0) {
        // Fallback to full-history scan if recent lookback misses older streams
        events = await contract.queryFilter(filter, 0, currentBlock);
      }

      const lowered = address.toLowerCase();
      const streams: EncryptedStream[] = [];
      const seen = new Set<string>();

      for (const event of events) {
        if (!("args" in event) || !event.args) continue;

        const streamEmployer = event.args.employer?.toLowerCase?.() ?? "";
        const streamEmployee = event.args.employee?.toLowerCase?.() ?? "";
        const streamKey = event.args.streamKey as string;

        if (seen.has(streamKey)) {
          continue;
        }

        const matches =
          (type === "employer" && streamEmployer === lowered) ||
          (type === "employee" && streamEmployee === lowered);

        if (!matches) {
          continue;
        }

        const stream = await this.getStream(streamKey);
        if (stream && stream.status !== StreamStatus.None) {
          streams.push(stream);
          seen.add(streamKey);
        }
      }

      return streams;
    } catch (error) {
      console.error("Error fetching encrypted streams:", error);
      return [];
    }
  }

  async pauseStream(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.pauseStream(streamKey);
    await tx.wait();
    return tx.hash;
  }

  async resumeStream(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.resumeStream(streamKey);
    await tx.wait();
    return tx.hash;
  }

  async cancelStream(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.cancelStream(streamKey);
    await tx.wait();
    return tx.hash;
  }

  async withdrawMax(streamKey: string, to: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.withdrawMax(streamKey, to);
    await tx.wait();
    return tx.hash;
  }

  async topUp(streamKey: string, encryptedAmount: string, amountProof: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.topUp(streamKey, encryptedAmount, amountProof);
    await tx.wait();
    return tx.hash;
  }

  async syncStream(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.syncStream(streamKey);
    await tx.wait();
    return tx.hash;
  }

  async configureStream(streamKey: string, cancelable: boolean, transferable: boolean): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.configureStream(streamKey, cancelable, transferable);
    await tx.wait();
    return tx.hash;
  }

  async setStreamHook(streamKey: string, hook: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.setStreamHook(streamKey, hook);
    await tx.wait();
    return tx.hash;
  }

  async allowHook(hook: string, allowed: boolean): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.allowHook(hook, allowed);
    await tx.wait();
    return tx.hash;
  }

  async encryptedBalanceOf(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const handle: string = await contract.encryptedBalanceOf.staticCall(streamKey);
    await contract.encryptedBalanceOf(streamKey);
    return handle;
  }

  async getStreamConfig(streamKey: string) {
    const contract = await this.getContract();
    const config = await contract.getStreamConfig(streamKey);
    return {
      streamId: config.streamId.toString(),
      cancelable: config.cancelable as boolean,
      transferable: config.transferable as boolean,
      hook: config.hook as string,
      bufferedHandle: config.bufferedHandle as string,
      withdrawnHandle: config.withdrawnHandle as string,
    };
  }

  async streamIdFor(streamKey: string): Promise<string> {
    const contract = await this.getContract();
    const id = await contract.streamIdFor(streamKey);
    return id.toString();
  }

  async streamKeyFor(streamId: string | number | bigint): Promise<string> {
    const contract = await this.getContract();
    return await contract.streamKeyFor(streamId);
  }

  async transferAdmin(newAdmin: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.transferAdmin(newAdmin);
    await tx.wait();
    return tx.hash;
  }
}

export const encryptedPayrollContract = new EncryptedPayrollContract();
