export const SUPPORTED_CHAIN_ID = 11155111;
export const CONFIDENTIAL_DECIMALS = 6;
export const CHAIN_NAME = "Sepolia";

export type SupportedToken = "cETH" | "cUSDC";

export const TOKEN_CONFIG: Record<SupportedToken, {
  name: string;
  symbol: string;
  decimals: number;
  color: string;
  contractAddress: string;
  underlyingSymbol: string;
  underlyingDecimals: number;
}> = {
  cETH: {
    name: "Confidential ETH",
    symbol: "cETH",
    decimals: 6, // CONFIDENTIAL_DECIMALS
    color: "#60a5fa", // blue-400
    contractAddress: process.env.NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_TOKEN || "",
    underlyingSymbol: "ETH",
    underlyingDecimals: 18,
  },
  cUSDC: {
    name: "Confidential USDC",
    symbol: "cUSDC",
    decimals: 6,
    color: "#2775ca", // USDC blue
    contractAddress: process.env.NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_USDC || "",
    underlyingSymbol: "USDC",
    underlyingDecimals: 6,
  },
};
