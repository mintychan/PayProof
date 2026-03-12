"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { WalletConnectPrompt } from "../../../components/WalletConnect";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_PAYPROOF_SUBGRAPH_URL?.trim();

interface StreamSummary {
  id: string;
  employee: string;
  status: string;
  startTime: string;
  cadenceInSeconds: string;
  createdAtTimestamp: string;
}

interface StreamEventSummary {
  id: string;
  eventType: string;
  timestamp: string;
  txHash: string;
}

interface AnalyticsData {
  totalStreams: number;
  activeStreams: number;
  pausedStreams: number;
  cancelledStreams: number;
  settledStreams: number;
  uniqueEmployees: number;
  streams: StreamSummary[];
  recentEvents: StreamEventSummary[];
}

function relativeTime(timestamp: string): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
}

function eventTypeLabel(eventType: string): {
  label: string;
  className: string;
} {
  switch (eventType) {
    case "CREATED":
      return {
        label: "Stream Created",
        className: "bg-blue-500/20 text-blue-400",
      };
    case "PAUSED":
      return {
        label: "Stream Paused",
        className: "bg-amber-500/20 text-amber-400",
      };
    case "RESUMED":
      return {
        label: "Stream Resumed",
        className: "bg-emerald-500/20 text-emerald-400",
      };
    case "CANCELLED":
      return {
        label: "Stream Cancelled",
        className: "bg-red-500/20 text-red-400",
      };
    case "WITHDRAWN":
      return {
        label: "Withdrawal",
        className: "bg-purple-500/20 text-purple-400",
      };
    case "TOPPED_UP":
      return {
        label: "Top Up",
        className: "bg-sky-500/20 text-sky-400",
      };
    case "SETTLED":
      return {
        label: "Stream Settled",
        className: "bg-indigo-500/20 text-indigo-400",
      };
    default:
      return {
        label: eventType,
        className: "bg-slate-500/20 text-slate-400",
      };
  }
}

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!address || !SUBGRAPH_URL) return;
    setLoading(true);
    setError(null);

    try {
      const streamsQuery = `
        query EmployerAnalytics($employer: Bytes!) {
          streams(
            where: { employer: $employer }
            orderBy: createdAtTimestamp
            orderDirection: desc
            first: 100
          ) {
            id
            employee
            status
            startTime
            cadenceInSeconds
            createdAtTimestamp
          }
          streamEvents(
            where: { stream_: { employer: $employer } }
            orderBy: timestamp
            orderDirection: desc
            first: 20
          ) {
            id
            eventType
            timestamp
            txHash
          }
        }
      `;

      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: streamsQuery,
          variables: { employer: address.toLowerCase() },
        }),
      });

      if (!response.ok) {
        throw new Error(`Subgraph query failed: ${response.statusText}`);
      }

      const payload = await response.json();

      if (payload.errors) {
        throw new Error(payload.errors[0]?.message ?? "Subgraph returned errors");
      }

      const streams: StreamSummary[] = payload.data?.streams ?? [];
      const events: StreamEventSummary[] = payload.data?.streamEvents ?? [];

      const uniqueEmployees = new Set(
        streams.map((s) => s.employee.toLowerCase())
      ).size;

      setData({
        totalStreams: streams.length,
        activeStreams: streams.filter((s) => s.status === "ACTIVE").length,
        pausedStreams: streams.filter((s) => s.status === "PAUSED").length,
        cancelledStreams: streams.filter((s) => s.status === "CANCELLED").length,
        settledStreams: streams.filter((s) => s.status === "SETTLED").length,
        uniqueEmployees,
        streams,
        recentEvents: events,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchAnalytics();
    }
  }, [isConnected, address, fetchAnalytics]);

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  const healthPercent =
    data && data.totalStreams > 0
      ? Math.round((data.activeStreams / data.totalStreams) * 100)
      : 0;

  const barTotal = data ? data.totalStreams : 0;
  const barSegments = data
    ? [
        {
          count: data.activeStreams,
          color: "bg-emerald-500",
          label: "Active",
        },
        {
          count: data.pausedStreams,
          color: "bg-amber-500",
          label: "Paused",
        },
        {
          count: data.cancelledStreams,
          color: "bg-red-500",
          label: "Cancelled",
        },
        {
          count: data.settledStreams,
          color: "bg-blue-500",
          label: "Settled",
        },
      ]
    : [];

  return (
    <section className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <a href="/employer" className="transition hover:text-slate-200">
            Payments
          </a>
          <span>&rsaquo;</span>
          <span className="text-slate-200">Analytics</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/employer"
              aria-label="Back to employer dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-slate-900/60 transition hover:border-white/10"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </a>
            <h1 className="text-3xl font-bold text-white">
              Payroll Analytics
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void fetchAnalytics()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Encrypted Notice */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
            <svg
              className="h-4 w-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-200">
              Privacy-Preserving Analytics
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              All payment amounts are encrypted on-chain via fhEVM. This
              dashboard shows stream metadata only (counts, timestamps,
              statuses). Decrypt individual streams to view amounts.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-16 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-400">
              Loading analytics from subgraph...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-200">
                Failed to load analytics
              </p>
              <p className="mt-1 text-xs text-red-300/70">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Row */}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Streams */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                  <svg
                    className="h-5 w-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Streams</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">
                    {data.totalStreams}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Streams */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
                  <svg
                    className="h-5 w-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active Streams</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">
                      {data.activeStreams}
                    </p>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Unique Employees */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Unique Employees</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">
                    {data.uniqueEmployees}
                  </p>
                </div>
              </div>
            </div>

            {/* Stream Health */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-sky-600/20">
                  <svg
                    className="h-5 w-5 text-sky-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Stream Health</p>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-white">
                      {healthPercent}%
                    </p>
                    <p className="text-xs text-slate-500">active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown with Donut Chart */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Status Breakdown
              </h2>
              <button
                type="button"
                onClick={() => {
                  const headers = ["Stream ID", "Employee", "Status", "Start Date", "Cadence (s)"];
                  const rows = data.streams.map((s) => [
                    s.id,
                    s.employee,
                    s.status,
                    new Date(Number(s.startTime) * 1000).toLocaleDateString(),
                    s.cadenceInSeconds,
                  ]);
                  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `payroll_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>

            {barTotal > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Donut Chart */}
                <div className="flex items-center justify-center">
                  <DonutChart segments={barSegments} total={barTotal} />
                </div>

                {/* Legend & Bar */}
                <div className="space-y-4">
                  {/* Horizontal stacked bar */}
                  <div className="flex h-4 overflow-hidden rounded-full bg-slate-800/60">
                    {barSegments.map(
                      (seg) =>
                        seg.count > 0 && (
                          <div
                            key={seg.label}
                            className={`${seg.color} transition-all duration-500`}
                            style={{
                              width: `${(seg.count / barTotal) * 100}%`,
                            }}
                            title={`${seg.label}: ${seg.count}`}
                          />
                        )
                    )}
                  </div>

                  {/* Legend */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {barSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2">
                        <div
                          className={`h-3 w-3 rounded-full ${seg.color}`}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {seg.count}
                          </p>
                          <p className="text-xs text-slate-500">{seg.label}</p>
                        </div>
                        <p className="ml-auto text-xs text-slate-500">
                          {barTotal > 0 ? Math.round((seg.count / barTotal) * 100) : 0}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No streams to display yet.
              </p>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity */}
            <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Recent Activity
              </h2>

              {data.recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {data.recentEvents.map((event) => {
                    const badge = eventTypeLabel(event.eventType);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {relativeTime(event.timestamp)}
                          </span>
                        </div>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-blue-400"
                        >
                          <span className="font-mono">
                            {event.txHash.slice(0, 6)}...
                            {event.txHash.slice(-4)}
                          </span>
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 p-8">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-slate-500">
                      No events recorded yet
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stream List Summary */}
            <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
              <h2 className="mb-4 text-lg font-semibold text-white">
                All Streams ({data.totalStreams})
              </h2>

              {data.streams.length > 0 ? (
                <div className="space-y-3">
                  {data.streams.slice(0, 10).map((stream) => {
                    const statusStyles: Record<string, string> = {
                      ACTIVE: "bg-emerald-500/20 text-emerald-400",
                      PAUSED: "bg-amber-500/20 text-amber-400",
                      CANCELLED: "bg-red-500/20 text-red-400",
                      SETTLED: "bg-blue-500/20 text-blue-300",
                    };
                    const statusClass =
                      statusStyles[stream.status] ??
                      "bg-slate-500/20 text-slate-400";

                    return (
                      <a
                        key={stream.id}
                        href={`/stream/${stream.id}`}
                        className="group flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 transition hover:border-blue-400/30 hover:bg-slate-950/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            <svg
                              className="h-4 w-4 text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {stream.employee.slice(0, 6)}...
                              {stream.employee.slice(-4)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Started{" "}
                              {new Date(
                                Number(stream.startTime) * 1000
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}
                          >
                            {stream.status}
                          </span>
                          <svg
                            className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </a>
                    );
                  })}

                  {data.streams.length > 10 && (
                    <p className="pt-2 text-center text-xs text-slate-500">
                      Showing 10 of {data.streams.length} streams.{" "}
                      <a
                        href="/employer"
                        className="text-blue-400 transition hover:text-blue-300"
                      >
                        View all
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 p-8">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-slate-500">
                      No streams created yet
                    </p>
                    <a
                      href="/employer"
                      className="mt-2 inline-block text-xs text-blue-400 transition hover:text-blue-300"
                    >
                      Create your first stream
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Activity Timeline */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Monthly Activity
            </h2>

            {data.streams.length > 0 ? (
              <MonthlyTimeline streams={data.streams} />
            ) : (
              <p className="text-sm text-slate-500">
                No data for timeline yet.
              </p>
            )}
          </div>
        </>
      )}

      {/* No Subgraph Warning */}
      {!SUBGRAPH_URL && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-200">
                Subgraph Not Configured
              </p>
              <p className="mt-1 text-xs text-amber-300/70">
                Set <code className="rounded bg-amber-500/20 px-1.5 py-0.5">NEXT_PUBLIC_PAYPROOF_SUBGRAPH_URL</code> in your environment to enable analytics.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Renders a simple bar chart showing how many streams were created per month.
 */
function MonthlyTimeline({ streams }: { streams: StreamSummary[] }) {
  // Group streams by year-month based on their createdAtTimestamp
  const monthCounts: Record<string, number> = {};

  for (const stream of streams) {
    const date = new Date(Number(stream.createdAtTimestamp) * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] ?? 0) + 1;
  }

  // Sort months chronologically and take last 6
  const sortedMonths = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  if (sortedMonths.length === 0) {
    return <p className="text-sm text-slate-500">No monthly data available.</p>;
  }

  const maxCount = Math.max(...sortedMonths.map(([, count]) => count));

  return (
    <div className="flex items-end gap-3">
      {sortedMonths.map(([month, count]) => {
        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const [year, mon] = month.split("-");
        const monthLabel = new Date(
          Number(year),
          Number(mon) - 1
        ).toLocaleString("default", { month: "short" });

        return (
          <div
            key={month}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-medium text-white">{count}</span>
            <div className="w-full rounded-t-lg bg-slate-800/60" style={{ height: "120px" }}>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                style={{
                  height: `${Math.max(heightPercent, 8)}%`,
                  marginTop: `${100 - Math.max(heightPercent, 8)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500">
              {monthLabel} {year?.slice(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SVG-based donut chart for stream status breakdown.
 */
function DonutChart({
  segments,
  total,
}: {
  segments: { count: number; color: string; label: string }[];
  total: number;
}) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const colorMap: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-amber-500": "#f59e0b",
    "bg-red-500": "#ef4444",
    "bg-blue-500": "#3b82f6",
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg) => {
        if (seg.count === 0) return null;
        const pct = seg.count / total;
        const dashLength = pct * circumference;
        const dashOffset = -offset * circumference;
        offset += pct;

        return (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[seg.color] ?? "#64748b"}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        className="fill-white text-2xl font-bold"
        fontSize="24"
      >
        {total}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        className="fill-slate-400 text-xs"
        fontSize="11"
      >
        streams
      </text>
    </svg>
  );
}
