"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { FhevmProvider } from "fhevm-ts-sdk/react";
import { createConfig } from "wagmi";
import { createClient, fallback, http } from "viem";
import { sepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

const isE2ETest = process.env.NEXT_PUBLIC_E2E_TEST === "1";

export function Providers({ children }: { children: ReactNode }) {
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [sepolia],
        connectors: isE2ETest
          ? [injected({ target: "metaMask" })]
          : [metaMask()],
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
