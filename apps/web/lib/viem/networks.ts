export const networks = {
  protocol: {
    id: 850,
    name: "Zama Protocol Testnet",
    rpcUrl: process.env.NEXT_PUBLIC_PROTOCOL_RPC_URL || "https://protocol-rpc-placeholder",
    explorerUrl: "https://explorer.zama.ai"
  },
  sepoliaCoprocessor: {
    id: 11155111,
    name: "fhEVM Coprocessor (Sepolia)",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_COPROCESSOR_RPC_URL || "https://sepolia-rpc-placeholder",
    explorerUrl: "https://sepolia.etherscan.io"
  }
} as const;

type NetworkKey = keyof typeof networks;

export type NetworkConfig = (typeof networks)[NetworkKey];
