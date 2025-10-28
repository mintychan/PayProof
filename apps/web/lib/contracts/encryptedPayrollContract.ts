import { BrowserProvider, Contract, isHexString, zeroPadValue } from "ethers";
import { ENCRYPTED_PAYROLL_ABI } from "./EncryptedPayrollABI";
import { ERC721_ENUMERABLE_ABI } from "./ERC721EnumerableABI";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT || "";
const SUBGRAPH_URL = process.env.NEXT_PUBLIC_PAYPROOF_SUBGRAPH_URL?.trim();
const PAYROLL_CONTRACT_ABI = [...ENCRYPTED_PAYROLL_ABI, ...ERC721_ENUMERABLE_ABI];

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
      return new Contract(CONTRACT_ADDRESS, PAYROLL_CONTRACT_ABI, signer);
    }

    return new Contract(CONTRACT_ADDRESS, PAYROLL_CONTRACT_ABI, provider);
  }

  private normalizeStreamKey(value: string | null | undefined): string | null {
    if (!value) return null;
    let key = value.trim();
    if (!key) return null;
    if (!key.startsWith("0x")) {
      key = `0x${key}`;
    }
    if (!isHexString(key)) {
      return null;
    }
    try {
      const padded = zeroPadValue(key, 32);
      return padded;
    } catch {
      return null;
    }
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

    // Try to estimate gas to see if the transaction would fail
    try {
      console.log("Calling createStream with params:", {
        employee: params.employee,
        encryptedRatePerSecond: params.encryptedRatePerSecond,
        rateProof: params.rateProof?.substring(0, 100) + "...",
        cadenceInSeconds: params.cadenceInSeconds,
        startTime: params.startTime || 0
      });
      
      const gasEstimate = await contract.createStream.estimateGas(
        params.employee,
        params.encryptedRatePerSecond,
        params.rateProof,
        params.cadenceInSeconds,
        params.startTime || 0
      );
      console.log("Estimated gas:", gasEstimate.toString());
    } catch (estimateError: any) {
      console.error("Gas estimation failed:", estimateError);

      // Try to decode custom error
      let decoded = null as null | { name: string; args: any[] };
      try {
        const data = estimateError?.data || estimateError?.error?.data || estimateError?.info?.error?.data;
        if (data) {
          const parsed = (contract.interface as any).parseError(data);
          if (parsed) decoded = { name: parsed.name, args: parsed.args };
        }
      } catch {}

      const friendlyMap: Record<string, string> = {
        InvalidEmployee: "Invalid employee address.",
        InvalidRate: "Invalid rate: must be > 0 and within allowed bounds.",
        StreamAlreadyExists: "A stream already exists for this employer/employee pair.",
        HookNotAllowlisted: "The configured hook is not allowlisted.",
      };

      const errorMessage = decoded
        ? `${decoded.name}${friendlyMap[decoded.name] ? ` - ${friendlyMap[decoded.name]}` : ""}`
        : (estimateError?.reason || estimateError?.message || estimateError?.data?.message || "Unknown error during gas estimation");

      throw new Error(`Transaction will fail: ${errorMessage}`);
    }

    const tx = await contract.createStream(
      params.employee,
      params.encryptedRatePerSecond,
      params.rateProof,
      params.cadenceInSeconds,
      params.startTime || 0,
      {
        gasLimit: 5000000, // Set a high gas limit for FHE operations
      }
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt unavailable");
    }

    console.log("Transaction receipt status:", receipt.status);
    console.log("Transaction receipt:", receipt);
    console.log("Receipt logs:", receipt.logs);
    console.log("Receipt logs length:", receipt.logs.length);

    // Check transaction status
    if (receipt.status === 0) {
      console.error("Transaction failed. Receipt:", receipt);
      throw new Error("Transaction reverted. Check console for details.");
    }

    if (!receipt.logs || receipt.logs.length === 0) {
      console.error("Transaction succeeded but has no logs. This might indicate:");
      console.error("1. Function executed but didn't emit events");
      console.error("2. Gas was insufficient to emit events");
      console.error("3. Contract logic issue");
      console.error("Full receipt:", JSON.stringify(receipt, null, 2));
    }

    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        console.log("Parsed log:", parsed);
        return parsed?.name === "StreamCreated";
      } catch (e) {
        console.log("Failed to parse log:", log, e);
        return false;
      }
    });

    if (!eventLog) {
      console.error("StreamCreated event not found in receipt. All logs:", receipt.logs);
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
      throw new Error(
        `StreamCreated event not found in receipt. The transaction was mined but didn't emit the expected event. ` +
        `This usually means the FHE proof validation failed. ` +
        `View transaction: ${etherscanUrl}`
      );
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

      // Normalise stream key to a 32-byte hex value expected by the contract
      const normalizedKey = this.normalizeStreamKey(streamKey);

      if (!normalizedKey) {
        console.warn("Invalid stream key format; skipping fetch", streamKey);
        return null;
      }

      const [streamData, config] = await Promise.all([
        contract.getStream(normalizedKey),
        contract.getStreamConfig(normalizedKey).catch(() => null),
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
        streamKey: normalizedKey,
        streamId: normalizedKey,
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
   * List streams associated with an address. Employees are resolved via the ERC-721
   * enumerable interface; employers fall back to the subgraph.
   */
  async getStreamsByAddress(address: string, type: "employer" | "employee"): Promise<EncryptedStream[]> {
    if (!address) return [];

    if (type === "employee") {
      const onChainStreams = await this.getEmployeeStreams(address);
      if (onChainStreams.length > 0 || !SUBGRAPH_URL) {
        return onChainStreams;
      }

      const keys = await this.fetchStreamKeysFromSubgraph(address, "employee");
      return this.resolveStreams(keys);
    }

    const employerKeys = await this.fetchStreamKeysFromSubgraph(address, "employer");
    return this.resolveStreams(employerKeys);
  }

  private async getEmployeeStreams(address: string): Promise<EncryptedStream[]> {
    try {
      const contract = await this.getContract();
      const balance: bigint = await contract.balanceOf(address);
      const count = Number(balance);
      if (!Number.isFinite(count) || count <= 0) {
        return [];
      }

      const tokenIds = await Promise.all(
        Array.from({ length: count }, (_, index) => contract.tokenOfOwnerByIndex(address, index))
      );

      const streamKeys = await Promise.all(
        tokenIds.map((tokenId: bigint) => contract.streamKeyFor(tokenId))
      );

      const normalized = streamKeys
        .map((key: string) => this.normalizeStreamKey(key))
        .filter((key): key is string => Boolean(key));

      return this.resolveStreams(normalized);
    } catch (error) {
      console.warn("NFT enumeration failed; falling back to subgraph for employee streams", error);
      const keys = await this.fetchStreamKeysFromSubgraph(address, "employee");
      return this.resolveStreams(keys);
    }
  }

  private async fetchStreamKeysFromSubgraph(
    address: string,
    role: "employer" | "employee"
  ): Promise<string[]> {
    if (!SUBGRAPH_URL) {
      console.warn("Subgraph URL not configured");
      return [];
    }

    const query = `
      query Streams($address: Bytes!) {
        streams(
          where: { ${role}: $address }
          orderBy: updatedAtBlock
          orderDirection: desc
        ) {
          id
        }
      }
    `;

    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          variables: {
            address: address.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        console.error("Subgraph query failed", response.status, response.statusText);
        return [];
      }

      const payload = await response.json();
      if (payload.errors) {
        console.error("Subgraph returned errors", payload.errors);
        return [];
      }

      const results: Array<{ id: string }> = payload.data?.streams ?? [];
      return results
        .map((item) => this.normalizeStreamKey(item.id))
        .filter((key): key is string => Boolean(key));
    } catch (error) {
      console.error("Unable to query subgraph", error);
      return [];
    }
  }

  private async resolveStreams(streamKeys: (string | null | undefined)[]): Promise<EncryptedStream[]> {
    const uniqueKeys = Array.from(
      new Set(
        streamKeys
          .filter((key): key is string => typeof key === "string")
          .map((key) => key.toLowerCase())
      )
    );

    const results = await Promise.all(uniqueKeys.map((key) => this.getStream(key)));
    return results.filter((stream): stream is EncryptedStream => Boolean(stream) && stream.status !== StreamStatus.None);
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
    const tx = await contract.encryptedBalanceOf(streamKey);
    await tx.wait();
    return handle;
  }

  /**
   * Sync a stream to update accrued balances based on elapsed time.
   * This also refreshes FHE permissions for the balances.
   */
  async syncStream(streamKey: string): Promise<string> {
    const contract = await this.getContract(true);
    const tx = await contract.syncStream(streamKey);
    await tx.wait();
    return tx.hash;
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
