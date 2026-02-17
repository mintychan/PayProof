import { BrowserProvider, Contract, zeroPadValue, isHexString } from "ethers";
import { CONFIDENTIAL_VESTING_ABI } from "./ConfidentialVestingABI";

const VESTING_ADDRESS = process.env.NEXT_PUBLIC_PAYPROOF_VESTING_CONTRACT || "";

export class ConfidentialVestingContract {
  getAddress(): string {
    if (!VESTING_ADDRESS) {
      throw new Error("Vesting contract address not configured");
    }
    return VESTING_ADDRESS;
  }

  private getProvider(): BrowserProvider {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider((window as any).ethereum);
  }

  private async getContract(withSigner = false) {
    const address = this.getAddress();
    const provider = this.getProvider();
    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(address, CONFIDENTIAL_VESTING_ABI, signer);
    }
    return new Contract(address, CONFIDENTIAL_VESTING_ABI, provider);
  }

  normalizeId(id: string | number) {
    if (typeof id === "number") return BigInt(id);
    const trimmed = id.trim();
    if (isHexString(trimmed)) return BigInt(trimmed);
    return BigInt(trimmed);
  }

  async getSchedule(vestingId: string | number) {
    const contract = await this.getContract();
    return contract.getSchedule(this.normalizeId(vestingId));
  }

  async encryptedAmounts(vestingId: string | number) {
    const contract = await this.getContract(true);
    return contract.encryptedAmounts(this.normalizeId(vestingId));
  }

  async createVesting(params: {
    beneficiary: string;
    start: number;
    cliff: number;
    duration: number;
    initialUnlockBps: number;
    cancelable: boolean;
    encryptedAmount: string;
    amountProof: string;
  }) {
    const contract = await this.getContract(true);
    const tx = await contract.createVesting(
      params.beneficiary,
      params.start,
      params.cliff,
      params.duration,
      params.initialUnlockBps,
      params.cancelable,
      params.encryptedAmount,
      params.amountProof,
      { gasLimit: 5_000_000 }
    );
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
  }

  async withdraw(vestingId: string | number, to: string) {
    const contract = await this.getContract(true);
    const tx = await contract.withdraw(this.normalizeId(vestingId), to, { gasLimit: 3_000_000 });
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
  }

  async cancel(vestingId: string | number) {
    const contract = await this.getContract(true);
    const tx = await contract.cancel(this.normalizeId(vestingId), { gasLimit: 3_000_000 });
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
  }
}

export const confidentialVestingContract = new ConfidentialVestingContract();
