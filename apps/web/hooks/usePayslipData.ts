"use client";

import { useQuery } from "@tanstack/react-query";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import { getAddress } from "ethers";

interface EncryptionResult {
  handle: string;
  proof: string;
  summary: string;
}

interface PayslipDataParams {
  employeeAddress: string | undefined;
  periodIncome: number;
  ytdIncome: number;
  enabled?: boolean;
}

function toHex(value: Uint8Array): string {
  return `0x${Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function coerceToBigInt(raw: number | bigint): bigint {
  if (typeof raw === "bigint") {
    if (raw < BigInt(0)) {
      throw new Error("Encrypted values must be non-negative.");
    }
    return raw;
  }

  if (!Number.isFinite(raw)) {
    throw new Error("Encrypted values must be finite numbers.");
  }

  if (raw < 0) {
    throw new Error("Encrypted values must be non-negative.");
  }

  return BigInt(Math.floor(raw));
}

export function usePayslipData({
  employeeAddress,
  periodIncome,
  ytdIncome,
  enabled = true,
}: PayslipDataParams) {
  const { status: fhevmStatus, instance } = useFhevmContext();

  const fheReady = fhevmStatus === "ready";
  const payrollContract = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim();

  const queryEnabled = enabled && Boolean(employeeAddress) && (fheReady && Boolean(instance));

  return useQuery({
    queryKey: ["payslip", employeeAddress, periodIncome, ytdIncome],
    queryFn: async () => {
      if (!employeeAddress) {
        throw new Error("Employee address is required");
      }

      if (!payrollContract) {
        throw new Error("Payroll contract address is missing");
      }

      const normalizedContract = getAddress(payrollContract);
      const normalizedEmployee = getAddress(employeeAddress);

      const encryptValue = async (value: number, bitSize: 64 | 128): Promise<EncryptionResult> => {
        if (!instance) {
          throw new Error("fhEVM instance is not ready yet");
        }

        const input = instance.createEncryptedInput(normalizedContract, normalizedEmployee);
        const plaintext = coerceToBigInt(value);
        const maxValue = (BigInt(1) << BigInt(bitSize)) - BigInt(1);
        if (plaintext > maxValue) {
          throw new Error(`Value exceeds ${bitSize}-bit encryption capacity.`);
        }

        if (bitSize === 128) {
          input.add128(plaintext);
        } else {
          input.add64(plaintext);
        }

        const { handles, inputProof } = await input.encrypt();
        if (!handles || handles.length === 0) {
          throw new Error("fhEVM returned no handles for the encrypted input");
        }

        const handle = typeof handles[0] === "string" ? handles[0] : toHex(handles[0] as Uint8Array);
        const proof =
          typeof inputProof === "string"
            ? inputProof
            : inputProof instanceof Uint8Array
              ? toHex(inputProof)
              : String(inputProof);

        return {
          handle,
          proof,
          summary: `Encrypted ${bitSize}-bit payload for ${normalizedContract.slice(0, 10)}…`,
        };
      };

      const [period, ytd] = await Promise.all([encryptValue(periodIncome, 64), encryptValue(ytdIncome, 128)]);

      return { period, ytd };
    },
    enabled: queryEnabled,
    staleTime: 60_000,
    retry: 2,
  });
}
