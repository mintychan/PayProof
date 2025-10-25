"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { getAddress } from "ethers";

type EncryptionResult = {
  handle: string;
  proof: string;
  summary: string;
};

type EncryptParams = {
  value: number | bigint;
  bitSize: 64 | 128;
  contractAddress: string;
  userAddress: string;
};

type FhevmContextValue = {
  ready: boolean;
  initializing: boolean;
  error?: string;
  encryptNumber: (params: EncryptParams) => Promise<EncryptionResult>;
  instance: FhevmInstance | null;
};

const FhevmContext = createContext<FhevmContextValue | undefined>(undefined);
const SHOULD_USE_FALLBACK = process.env.NEXT_PUBLIC_FHE_FALLBACK === "1";

function toHex(value: Uint8Array): string {
  return `0x${Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (SHOULD_USE_FALLBACK) {
      setInstance(null);
      setError(undefined);
      setInitializing(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setInitializing(true);
      try {
        if (typeof globalThis !== "undefined" && typeof (globalThis as any).global === "undefined") {
          (globalThis as any).global = globalThis;
        }
        const relayer = await import("@zama-fhe/relayer-sdk/web");
        if (!relayer) throw new Error("Failed to load relayer SDK");

        if (typeof relayer.initSDK !== "function") {
          throw new Error("relayer.initSDK is unavailable");
        }

        await relayer.initSDK();

        const config = { ...relayer.SepoliaConfig };
        const rpcUrl =
          process.env.NEXT_PUBLIC_FHE_RPC_URL ||
          process.env.NEXT_PUBLIC_SEPOLIA_COPROCESSOR_RPC_URL ||
          process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
          undefined;
        if (rpcUrl) {
          config.network = rpcUrl;
        }

        const created = await relayer.createInstance(config);
        if (!cancelled) {
          setInstance(created);
          setError(undefined);
        }
      } catch (err) {
        console.error("Failed to initialise fhEVM relayer", err);
        if (!cancelled) {
          setError((err as Error)?.message ?? "Unknown fhEVM error");
          setInstance(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackEncrypt = useCallback(({ value, bitSize }: EncryptParams): EncryptionResult => {
    const byteLength = bitSize / 8;
    const handleBytes = new Uint8Array(byteLength);
    const proofBytes = new Uint8Array(64);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(handleBytes);
      crypto.getRandomValues(proofBytes);
    } else {
      for (let i = 0; i < byteLength; i += 1) {
        handleBytes[i] = Math.floor(Math.random() * 256);
      }
      for (let i = 0; i < proofBytes.length; i += 1) {
        proofBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return {
      handle: toHex(handleBytes),
      proof: toHex(proofBytes),
      summary: `Demo encrypted ${bitSize}-bit payload (fallback)`
    };
  }, []);

  const coerceToBigInt = useCallback((raw: number | bigint) => {
    if (typeof raw === "bigint") {
      if (raw < 0n) {
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
  }, []);

  const encryptNumber = useCallback(
    async ({ value, bitSize, contractAddress, userAddress }: EncryptParams) => {
      if (instance) {
        const normalizedContract = getAddress(contractAddress);
        const normalizedUser = getAddress(userAddress);

        const input = instance.createEncryptedInput(normalizedContract, normalizedUser);
        const plaintext = coerceToBigInt(value);
        const maxValue = (1n << BigInt(bitSize)) - 1n;
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

        return {
          handle: toHex(handles[0]),
          proof: toHex(inputProof),
          summary: `Encrypted ${bitSize}-bit payload for ${normalizedContract.slice(0, 10)}…`,
        };
      }

      if (SHOULD_USE_FALLBACK) {
        return fallbackEncrypt({ value, bitSize, contractAddress, userAddress });
      }

      throw new Error("fhEVM instance is not ready yet");
    },
    [instance, fallbackEncrypt, coerceToBigInt],
  );

  const value = useMemo<FhevmContextValue>(
    () => ({
      ready: (Boolean(instance) && !initializing && !error) || SHOULD_USE_FALLBACK,
      initializing,
      error,
      encryptNumber,
      instance,
    }),
    [instance, initializing, error, encryptNumber],
  );

  return <FhevmContext.Provider value={value}>{children}</FhevmContext.Provider>;
}

export function useFhevm() {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error("useFhevm must be used within a FhevmProvider");
  }
  return context;
}
