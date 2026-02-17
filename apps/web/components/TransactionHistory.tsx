"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "../lib/formatRelativeTime";

export interface TxRecord {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  from: string;
  to: string;
}

interface TransactionHistoryProps {
  transactions: TxRecord[];
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "--";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function truncateTxHash(hash: string): string {
  if (!hash || hash.length <= 14) return hash || "--";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  created: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  topped_up: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  withdrawn: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  resumed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  settled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  synced: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function getTypeBadgeStyle(type: string): string {
  return (
    TYPE_BADGE_STYLES[type.toLowerCase()] ||
    "bg-slate-500/10 text-slate-400 border-slate-500/20"
  );
}

export default function TransactionHistory({
  transactions,
}: TransactionHistoryProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="mb-3 h-10 w-10 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm text-slate-500">No transactions yet</p>
        <p className="mt-1 text-xs text-slate-600">
          Transaction records will appear here as activity occurs.
        </p>
      </div>
    );
  }

  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div
      className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="whitespace-nowrap pb-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Type
              </th>
              <th className="whitespace-nowrap pb-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                From
              </th>
              <th className="whitespace-nowrap pb-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                To
              </th>
              <th className="whitespace-nowrap pb-3 pr-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Time
              </th>
              <th className="whitespace-nowrap pb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Tx
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sorted.map((tx, index) => (
              <tr
                key={`${tx.txHash}-${index}`}
                className="transition hover:bg-slate-800/20"
              >
                <td className="whitespace-nowrap py-3 pr-4">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeStyle(tx.type)}`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-slate-300">
                  {truncateAddress(tx.from)}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-slate-300">
                  {truncateAddress(tx.to)}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">
                  {formatRelativeTime(tx.timestamp)}
                </td>
                <td className="whitespace-nowrap py-3">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-sky-500/70 transition hover:text-sky-400"
                  >
                    {truncateTxHash(tx.txHash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
