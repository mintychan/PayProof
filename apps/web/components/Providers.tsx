"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { FhevmProvider } from "fhevm-ts-sdk/react";
import { createConfig } from "wagmi";
import { createClient, fallback, http } from "viem";
import { sepolia } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";

export function Providers({ children }: { children: ReactNode }) {
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [sepolia],
        connectors: [metaMask()],
        ssr: true,
        client: ({ chain }) => {
          const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
          return createClient({
            chain,
            transport: fallback([http(rpcUrl), http()]),
          });
        },
      }),
    []
  );

  // For Sepolia testnet, we don't need mock chains
  const fhevmOptions = useMemo(
    () => ({
      enabled: true,
      client: {
        mockChains: [],
      },
      instance: {
        mockChains: [],
      },
    }),
    []
  );

  return (
    <FhevmProvider wagmiConfig={wagmiConfig} fhevm={fhevmOptions}>
      {children}
    </FhevmProvider>
  );
}
