import { useFhevmContext } from "fhevm-ts-sdk/react";

export function useFhevmHelpers() {
  const { instance } = useFhevmContext();

  const toHex = (data: string | Uint8Array): string => {
    if (typeof data === "string") return data.startsWith("0x") ? data : `0x${data}`;
    return `0x${Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("")}`;
  };

  const encryptAmount64 = async (contractAddress: string | undefined, amount: bigint) => {
    if (!instance || !contractAddress) throw new Error("fhEVM not ready");
    const input = instance.createEncryptedInput(contractAddress, (instance as any).address ?? "");
    input.add64(amount);
    const { handles, inputProof } = await input.encrypt();
    return { handle: toHex(handles[0]), proof: toHex(inputProof) };
  };

  return { encryptAmount64 };
}
