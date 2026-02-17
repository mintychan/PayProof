import { Contract, BrowserProvider } from "ethers";
import { INCOME_ORACLE_ABI } from "./IncomeOracleABI";
import { ENCRYPTED_PAYROLL_ABI } from "./EncryptedPayrollABI";
import { logger } from "../logger";

const ORACLE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT || "";
const PAYROLL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT || "";

export interface AttestationResult {
  attestationId: string;
  meetsHandle: string;
  tierHandle: string;
  txHash: string;
}

export class IncomeOracleContract {
  private getProvider(): BrowserProvider {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider((window as any).ethereum);
  }

  private async getOracleContract(withSigner: boolean = false) {
    if (!ORACLE_CONTRACT_ADDRESS) {
      throw new Error("Oracle contract address not configured");
    }

    const provider = this.getProvider();

    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(ORACLE_CONTRACT_ADDRESS, INCOME_ORACLE_ABI, signer);
    }

    return new Contract(ORACLE_CONTRACT_ADDRESS, INCOME_ORACLE_ABI, provider);
  }

  private async getPayrollContract(withSigner: boolean = false) {
    if (!PAYROLL_CONTRACT_ADDRESS) {
      throw new Error("Payroll contract address not configured");
    }

    const provider = this.getProvider();

    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(PAYROLL_CONTRACT_ADDRESS, ENCRYPTED_PAYROLL_ABI, signer);
    }

    return new Contract(PAYROLL_CONTRACT_ADDRESS, ENCRYPTED_PAYROLL_ABI, provider);
  }

  /**
   * Compute the stream ID for a given employer and employee pair
   */
  async computeStreamId(employer: string, employee: string): Promise<string> {
    const payrollContract = await this.getPayrollContract();
    const streamId = await payrollContract.computeStreamId(employer, employee);
    return streamId;
  }

  /**
   * Request a proof-of-income attestation from the oracle
   * @param employer - The employer address
   * @param employee - The employee address (recipient)
   * @param encryptedThreshold - The encrypted threshold handle (from fhEVM)
   * @param thresholdProof - The proof bytes (from fhEVM)
   * @param lookbackDays - Number of days to look back
   */
  async attestMonthlyIncome(
    employer: string,
    employee: string,
    encryptedThreshold: string,
    thresholdProof: string,
    lookbackDays: number
  ): Promise<AttestationResult> {
    const oracleContract = await this.getOracleContract(true);

    logger.log("Calling attestMonthlyIncome with:", {
      employer,
      employee,
      encryptedThreshold,
      proofLength: thresholdProof.length,
      lookbackDays,
    });

    // Call the oracle contract
    const tx = await oracleContract.attestMonthlyIncome(
      employer,
      employee,
      encryptedThreshold,
      thresholdProof,
      lookbackDays
    );

    logger.log("Attestation transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    logger.log("Attestation confirmed:", receipt);

    // Parse the Attested event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = oracleContract.interface.parseLog(log);
        return parsed?.name === "Attested";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("Attested event not found");
    }

    const parsedEvent = oracleContract.interface.parseLog(event);

    return {
      attestationId: parsedEvent?.args.attestationId,
      meetsHandle: parsedEvent?.args.meetsHandle,
      tierHandle: parsedEvent?.args.tierHandle,
      txHash: tx.hash,
    };
  }

  /**
   * Get the payroll contract address from the oracle
   */
  async getPayrollAddress(): Promise<string> {
    const oracleContract = await this.getOracleContract();
    return await oracleContract.payroll();
  }

  /**
   * Check if a stream exists for a given employer and employee
   */
  async streamExists(employer: string, employee: string): Promise<boolean> {
    try {
      const payrollContract = await this.getPayrollContract();
      const streamId = await payrollContract.computeStreamId(employer, employee);
      const stream = await payrollContract.getStream(streamId);
      // If status is 0 (None), stream doesn't exist
      return stream.status !== 0;
    } catch (error) {
      logger.error("Error checking stream existence:", error);
      return false;
    }
  }

  /**
   * Get stream details
   */
  async getStream(employer: string, employee: string) {
    const payrollContract = await this.getPayrollContract();
    const streamId = await payrollContract.computeStreamId(employer, employee);
    const stream = await payrollContract.getStream(streamId);

    return {
      streamId,
      employer: stream.employer,
      employee: stream.employee,
      rateHandle: stream.rateHandle,
      cadenceInSeconds: Number(stream.cadenceInSeconds),
      status: Number(stream.status),
      startTime: Number(stream.startTime),
      lastAccruedAt: Number(stream.lastAccruedAt),
    };
  }
}

// Singleton instance
export const incomeOracleContract = new IncomeOracleContract();
