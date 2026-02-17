"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "../lib/formatRelativeTime";

export interface StreamEvent {
  type:
    | "created"
    | "topped_up"
    | "withdrawn"
    | "paused"
    | "resumed"
    | "cancelled"
    | "settled"
    | "synced";
  timestamp: number;
  txHash: string;
  blockNumber: number;
  details?: string;
}

interface StreamTimelineProps {
  events: StreamEvent[];
}

const EVENT_DISPLAY_LIMIT = 20;

const EVENT_LABELS: Record<StreamEvent["type"], string> = {
  created: "Stream Created",
  topped_up: "Funds Topped Up",
  withdrawn: "Withdrawal",
  paused: "Stream Paused",
  resumed: "Stream Resumed",
  cancelled: "Stream Cancelled",
  settled: "Stream Settled",
  synced: "Stream Synced",
};

const EVENT_DOT_COLORS: Record<StreamEvent["type"], string> = {
  created: "bg-emerald-400 shadow-emerald-400/40",
  topped_up: "bg-emerald-400 shadow-emerald-400/40",
  withdrawn: "bg-sky-400 shadow-sky-400/40",
  paused: "bg-amber-400 shadow-amber-400/40",
  resumed: "bg-amber-400 shadow-amber-400/40",
  cancelled: "bg-red-400 shadow-red-400/40",
  settled: "bg-emerald-400 shadow-emerald-400/40",
  synced: "bg-slate-400 shadow-slate-400/40",
};

const EVENT_TEXT_COLORS: Record<StreamEvent["type"], string> = {
  created: "text-emerald-300",
  topped_up: "text-emerald-300",
  withdrawn: "text-sky-300",
  paused: "text-amber-300",
  resumed: "text-amber-300",
  cancelled: "text-red-300",
  settled: "text-emerald-300",
  synced: "text-slate-300",
};

function truncateTxHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function StreamTimeline({ events }: StreamTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!events || events.length === 0) {
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-slate-500">No events yet</p>
        <p className="mt-1 text-xs text-slate-600">
          Events will appear here as the stream progresses.
        </p>
      </div>
    );
  }

  // Sort most recent first
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const hasMore = sorted.length > EVENT_DISPLAY_LIMIT;
  const displayed = showAll ? sorted : sorted.slice(0, EVENT_DISPLAY_LIMIT);

  return (
    <div
      className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="relative">
        {displayed.map((event, index) => {
          const isLast = index === displayed.length - 1;

          return (
            <div key={`${event.txHash}-${index}`} className="relative flex gap-4 pb-6">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-800" />
              )}

              {/* Dot */}
              <div className="relative z-10 flex-shrink-0 pt-0.5">
                <div
                  className={`h-[18px] w-[18px] rounded-full border-2 border-slate-900 shadow-md ${EVENT_DOT_COLORS[event.type]}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${EVENT_TEXT_COLORS[event.type]}`}
                    >
                      {EVENT_LABELS[event.type]}
                    </p>
                    {event.details && (
                      <p className="mt-0.5 text-xs text-slate-500">{event.details}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      <span>Block #{event.blockNumber}</span>
                      <span className="text-slate-700">&middot;</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-500/70 transition hover:text-sky-400"
                      >
                        {truncateTxHash(event.txHash)}
                      </a>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-slate-500">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full rounded-xl border border-white/5 bg-slate-950/40 py-2.5 text-xs font-medium text-slate-400 transition hover:border-white/10 hover:text-slate-300"
        >
          View all {sorted.length} events
        </button>
      )}
    </div>
  );
}
