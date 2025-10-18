"use client";

import { useAccount } from "wagmi";
import NetworkStatus from "../../components/NetworkStatus";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { MetricPill } from "../../components/ui/MetricPill";
import { WalletConnectPrompt } from "../../components/WalletConnect";
import { useEncryptedStreams } from "../../hooks/useEncryptedStreams";

export default function EmployeePage() {
  const { address: employeeAddress, isConnected } = useAccount();
  const { streams, loading } = useEncryptedStreams(employeeAddress, "employee");

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title="Your Encrypted Payroll Streams"
        subtitle="View encrypted payroll streams with privacy-preserving fhEVM technology. Verify income without revealing amounts."
        actions={
          <a
            href="/verify"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            Generate Proof
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Streams List */}
        <div className="space-y-4">
          <SectionCard accent="violet" title={`Active Streams (${streams.length})`}>
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading streams...
              </div>
            ) : streams.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">
                  No streams found for your address
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Ask your employer to create a stream to your wallet address
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {streams.map((stream) => (
                  <a
                    key={stream.streamId}
                    href={`/stream/${stream.streamId}`}
                    className="block rounded-3xl border border-white/5 bg-slate-950/70 p-6 transition hover:border-violet-400/40 hover:bg-slate-900/70 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            From: {stream.employer.slice(0, 6)}...{stream.employer.slice(-4)}
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
                        <div className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
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
                    <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-200">
                      <p className="font-semibold">🔐 Privacy Protected</p>
                      <p className="mt-1 text-sky-300/80">
                        Click to view details and decrypt your salary amount.
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <SectionCard accent="sky" title="Status overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricPill
                label="Wallet"
                value={employeeAddress ? `${employeeAddress.slice(0, 10)}…` : "Not connected"}
                tone="sky"
              />
              <MetricPill
                label="Active streams"
                value={`${streams.length}`}
                tone="emerald"
              />
              <MetricPill
                label="Network"
                value="Sepolia"
                tone="violet"
              />
              <MetricPill
                label="Status"
                value={loading ? "Syncing…" : "Live"}
                tone="amber"
              />
            </div>
          </SectionCard>

          <SectionCard accent="slate" title="About encrypted streams">
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                Your salary streams use fully homomorphic encryption (fhEVM) to protect your privacy while enabling verifiable income proofs.
              </p>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
                <li>🔒 Rates are encrypted - only you and employer can decrypt</li>
                <li>✅ Verify income without revealing actual amounts</li>
                <li>🔐 Generate privacy-preserving proof-of-income attestations</li>
              </ul>
              <NetworkStatus />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
