"use client";

import { useEffect, useState } from "react";

const networks = [
  {
    id: "protocol",
    label: "Zama Protocol Testnet",
    rpc: process.env.NEXT_PUBLIC_PROTOCOL_RPC_URL
  },
  {
    id: "sepolia",
    label: "fhEVM Coprocessor (Sepolia)",
    rpc: process.env.NEXT_PUBLIC_SEPOLIA_COPROCESSOR_RPC_URL
  }
];

export default function NetworkStatus() {
  const [online, setOnline] = useState<Record<string, boolean>>({});

  useEffect(() => {
    networks.forEach(async (net) => {
      if (!net.rpc) return;
      try {
        const response = await fetch(net.rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" })
        });
        setOnline((prev) => ({ ...prev, [net.id]: response.ok }));
      } catch (error) {
        setOnline((prev) => ({ ...prev, [net.id]: false }));
      }
    });
  }, []);

  return (
    <div className="grid gap-2 text-xs text-slate-400">
      {networks.map((net) => (
        <div key={net.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-3 py-2">
          <span>{net.label}</span>
          <span
            className={
              "flex items-center gap-2" +
              (online[net.id]
                ? " text-emerald-400"
                : net.rpc
                ? " text-amber-400"
                : " text-slate-500")
            }
          >
            <span className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: online[net.id]
                  ? "rgb(52 211 153)"
                  : net.rpc
                  ? "rgb(251 191 36)"
                  : "rgb(100 116 139)"
              }}
            />
            {online[net.id] === undefined && net.rpc
              ? "Checking..."
              : online[net.id]
              ? "Online"
              : net.rpc
              ? "RPC not reachable"
              : "RPC URL missing"}
          </span>
        </div>
      ))}
    </div>
  );
}
