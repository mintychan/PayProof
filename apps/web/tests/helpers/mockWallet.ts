import type { Page } from "@playwright/test";

const MOCK_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

/**
 * Injects a mock window.ethereum provider so wagmi's injected connector
 * detects it and can "connect" without a real browser extension.
 *
 * Call BEFORE page.goto().
 */
export async function injectMockEthereum(page: Page) {
  await page.addInitScript(
    ({ address, chainId }) => {
      const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

      const provider = {
        isMetaMask: true,
        selectedAddress: address,
        chainId,
        networkVersion: "11155111",
        isConnected: () => true,
        _metamask: { isUnlocked: async () => true },

        request: async ({
          method,
        }: {
          method: string;
          params?: unknown[];
        }) => {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return [address];
            case "eth_chainId":
              return chainId;
            case "net_version":
              return "11155111";
            case "wallet_switchEthereumChain":
              return null;
            case "wallet_requestPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "wallet_getPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "eth_getBalance":
              return "0x1bc16d674ec80000"; // 2 ETH
            case "eth_blockNumber":
              return "0x100";
            case "eth_getCode":
              return "0x";
            case "eth_call":
              return "0x0000000000000000000000000000000000000000000000000000000000000000";
            case "eth_estimateGas":
              return "0x5208";
            case "eth_gasPrice":
              return "0x3b9aca00";
            case "eth_getTransactionCount":
              return "0x0";
            case "personal_sign":
              return "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
            default:
              console.log("[MockEthereum] unhandled method:", method);
              return null;
          }
        },

        on: (event: string, cb: (...args: unknown[]) => void) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
        },
        removeListener: (event: string, cb: (...args: unknown[]) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((l) => l !== cb);
          }
        },
        removeAllListeners: () => {
          Object.keys(listeners).forEach((k) => delete listeners[k]);
        },
        emit: (event: string, ...args: unknown[]) => {
          (listeners[event] || []).forEach((cb) => cb(...args));
        },
      };

      (window as any).ethereum = provider;
    },
    { address: MOCK_ADDRESS, chainId: SEPOLIA_CHAIN_ID }
  );
}

/**
 * Connects the mock wallet by clicking the "Connect MetaMask" button.
 * Call AFTER page.goto() and after injectMockEthereum().
 */
export async function connectMockWallet(page: Page) {
  // Wait for hydration
  await page.waitForLoadState("networkidle");

  // Click "Connect MetaMask" button in the wallet connect prompt
  const connectButton = page.getByRole("button", {
    name: /Connect MetaMask/i,
  });

  if (await connectButton.first().isVisible({ timeout: 5000 })) {
    await connectButton.first().click();

    // Wait for the wallet gate to disappear (wallet connect prompt gone)
    // The heading "Connect Your Wallet" should disappear once connected
    await page
      .getByRole("heading", { name: "Connect Your Wallet" })
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {
        // If heading wasn't there, that's fine
      });

    // Wait for React re-render to settle
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
  }
}

export { MOCK_ADDRESS };
