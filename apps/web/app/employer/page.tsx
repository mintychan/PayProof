"use client";

import { useAccount } from "wagmi";
import PayrollStreamForm from "../../components/PayrollStreamForm";
import NetworkStatus from "../../components/NetworkStatus";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { MetricPill } from "../../components/ui/MetricPill";
import { WalletConnectPrompt } from "../../components/WalletConnect";
import { useEncryptedStreams } from "../../hooks/useEncryptedStreams";

export default function EmployerPage() {
  const { address, isConnected } = useAccount();
  const { streams, loading } = useEncryptedStreams(address, "employer");

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Create Encrypted Payroll Streams"
        subtitle="Stream ETH with fully encrypted amounts using Zama's fhEVM. Privacy-preserving payroll on Sepolia testnet."
        actions={
          <a
            href="/employee"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            View as Recipient
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard accent="sky">
          <PayrollStreamForm />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard accent="violet" title="Stream snapshot">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricPill label="Active streams" value={`${streams.length} live`} tone="violet" />
              <MetricPill label="Network" value="Sepolia Testnet" tone="sky" />
              <MetricPill label="Token" value="ETH" tone="emerald" />
              <MetricPill label="Status" value="Real-time streaming" tone="amber" />
            </div>
          </SectionCard>

          <SectionCard accent="slate" title="How it works">
            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                <span className="font-medium text-white">🔒 Encrypted rates:</span> Salary rates are encrypted client-side using fhEVM before being stored on-chain.
              </li>
              <li>
                <span className="font-medium text-white">⏱️ Real-time accrual:</span> Encrypted amounts accrue every second based on the encrypted rate.
              </li>
              <li>
                <span className="font-medium text-white">🔐 Privacy preserved:</span> Only you and the employee can decrypt the actual amounts.
              </li>
            </ul>
            <div className="mt-5 rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3">
              <NetworkStatus />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Created Streams List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Your Streams ({streams.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-950/70 p-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-slate-400">Loading streams...</p>
            </div>
          </div>
        ) : streams.length > 0 ? (
          <div className="grid gap-4">
            {streams.map((stream) => (
              <a
                key={stream.streamId}
                href={`/stream/${stream.streamId}`}
                className="rounded-3xl border border-white/5 bg-slate-950/70 p-6 transition hover:border-sky-400/40 hover:bg-slate-900/70 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        To: {stream.employee.slice(0, 6)}...{stream.employee.slice(-4)}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          stream.status === 1
                            ? "bg-emerald-500/20 text-emerald-400"
                            : stream.status === 2
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {stream.status === 1 ? "Active" : stream.status === 2 ? "Paused" : "Cancelled"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      Stream ID: {stream.streamId.slice(0, 10)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                      🔒 Encrypted
                    </div>
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
                    <p className="text-xs text-slate-500">Rate Handle</p>
                    <p className="mt-1 font-mono text-sm text-slate-300">
                      {stream.rateHandle.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
                    <p className="text-xs text-slate-500">Started</p>
                    <p className="mt-1 text-sm text-white">
                      {new Date(stream.startTime * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-950/70 p-12">
            <div className="text-center">
              <p className="text-slate-400">No streams created yet.</p>
              <p className="mt-1 text-sm text-slate-500">Create your first stream above to get started.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
