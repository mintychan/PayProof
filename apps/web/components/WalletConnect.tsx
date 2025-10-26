"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && chain?.id !== 11155111) {
      // Sepolia chain ID
      console.warn("Please switch to Sepolia network");
    }
  }, [isConnected, chain]);

  if (!mounted) {
    return (
      <button
        disabled
        className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-400 opacity-70"
      >
        Connecting wallet…
      </button>
    );
  }

  if (isConnected && address) {
    const isWrongNetwork = chain?.id !== 11155111;

    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/20 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-medium text-amber-100">
              Switch to Sepolia
            </span>
          </div>
        )}
        {!isWrongNetwork && (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-sm font-medium text-emerald-100">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        )}
        <button
          onClick={() => disconnect()}
          className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-red-400/40 hover:text-red-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Only show MetaMask connector - check for both possible IDs
  const metaMaskConnector = connectors.find((c) =>
    c.id === "metaMask" || c.id === "io.metamask" || c.name.toLowerCase().includes("metamask")
  );

  if (!metaMaskConnector) {
    // Debug: show what connectors are available
    console.log("Available connectors:", connectors.map(c => ({ id: c.id, name: c.name })));
    return (
      <div className="text-sm text-slate-400">
        MetaMask not detected. Please install MetaMask extension.
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: metaMaskConnector })}
      disabled={isPending}
      className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white disabled:opacity-50"
    >
      {isPending ? "Connecting..." : "Connect MetaMask"}
    </button>
  );
}

export function WalletConnectPrompt() {
  const { isConnected } = useAccount();

  if (isConnected) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-violet-500/10 px-8 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Connect Your Wallet</h2>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Connect your wallet to access confidential payroll streams and encrypted
          payslip data.
        </p>
      </div>
      <WalletConnect />
      <p className="max-w-md text-center text-xs text-slate-400">
        Make sure you&apos;re connected to Sepolia testnet for fhEVM coprocessor access.
      </p>
    </div>
  );
}
