"use client";

import { createConfig, http, WagmiProvider as WagmiProviderBase } from "wagmi";
import { sepolia } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    ),
  },
});

export function WagmiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000, // 10 seconds
            refetchInterval: 30_000, // 30 seconds for blockchain data
            retry: 2,
          },
        },
      })
  );

  return (
    <WagmiProviderBase config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProviderBase>
  );
}
