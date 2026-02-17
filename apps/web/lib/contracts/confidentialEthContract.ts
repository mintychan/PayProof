import { BrowserProvider, Contract, parseUnits } from "ethers";
import { CONFIDENTIAL_ETH_ABI } from "./ConfidentialEthABI";

export class ConfidentialEthContract {
  private readonly contractAddress: string;

  constructor(address: string) {
    if (!address) {
      throw new Error("ConfidentialETH address is required");
    }
    this.contractAddress = address;
  }

  private getProvider(): BrowserProvider {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not detected");
    }
    return new BrowserProvider((window as any).ethereum);
  }

  private async getContract(withSigner = false) {
    const provider = this.getProvider();
    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(this.contractAddress, CONFIDENTIAL_ETH_ABI, signer);
    }
    return new Contract(this.contractAddress, CONFIDENTIAL_ETH_ABI, provider);
  }

  private async getHolderAddress(): Promise<string> {
    const provider = this.getProvider();
    const signer = await provider.getSigner();
    return signer.address;
  }

  async wrapNative(amountEth: string, recipient: string): Promise<string> {
    if (!amountEth || Number(amountEth) <= 0) {
      throw new Error("Wrap amount must be greater than zero");
    }
    if (!recipient) {
      throw new Error("Recipient address missing for wrapNative");
    }
    const contract = await this.getContract(true);
    const value = parseUnits(amountEth, 18);
    const tx = await contract.wrapNative(recipient, {
      value,
      gasLimit: 2_000_000n,
    });
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  }

  async ensureOperator(payrollAddress: string, durationSeconds = 365 * 24 * 60 * 60): Promise<void> {
    if (!payrollAddress) {
      throw new Error("Payroll address missing for operator authorization");
    }
    const holder = await this.getHolderAddress();
    const contract = await this.getContract(true);
    const isAlreadyOperator = await contract.isOperator(holder, payrollAddress);
    if (isAlreadyOperator) {
      return;
    }
    const expiry = Math.floor(Date.now() / 1000) + durationSeconds;
    const tx = await contract.setOperator(payrollAddress, expiry);
    await tx.wait();
  }
}
