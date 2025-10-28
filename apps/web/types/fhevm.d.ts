declare module "fhevm-ts-sdk/react" {
  export * from "fhevm-ts-sdk/dist/react";
  export { useFhevmContext, FhevmProvider } from "fhevm-ts-sdk/dist/react/FhevmProvider";
  export type { FHEDecryptRequest } from "fhevm-ts-sdk/dist/react/useFHEDecrypt";
}

declare module "fhevm-ts-sdk" {
  export * from "fhevm-ts-sdk/dist";
}
