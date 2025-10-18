"use client";

import { useAccount } from "wagmi";
import PayrollStreamForm from "../../components/PayrollStreamForm";
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
      {/* Header */}
      <div>
        <h1 className="mb-6 text-3xl font-bold text-white">Payment Streams</h1>

        {/* Tabs */}
        <div className="flex items-center gap-3">
          <a
            href="/employer"
            className="flex items-center gap-3 rounded-xl bg-orange-500/10 px-6 py-4 text-base font-semibold text-orange-400 transition"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            As sender
          </a>
          <a
            href="/employee"
            className="flex items-center gap-3 rounded-xl px-6 py-4 text-base font-semibold text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As recipient
          </a>
          <a
            href="/verify"
            className="flex items-center gap-3 rounded-xl px-6 py-4 text-base font-semibold text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Proof of Income
          </a>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Wallet</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Active streams</p>
              <p className="mt-0.5 text-sm font-medium text-white">{streams.length} live</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-sky-600/20">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Network</p>
              <p className="mt-0.5 text-sm font-medium text-white">Sepolia</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-0.5 text-sm font-medium text-white">Streaming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Stream Creation Form */}
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
          <PayrollStreamForm />
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-white">How it works</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Client-side encryption</p>
                  <p className="mt-0.5 text-xs text-slate-400">Rates encrypted using fhEVM before on-chain storage</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Real-time accrual</p>
                  <p className="mt-0.5 text-xs text-slate-400">Encrypted amounts accrue every second</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Privacy preserved</p>
                  <p className="mt-0.5 text-xs text-slate-400">Only you and employee can decrypt amounts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">Privacy-preserving payroll</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Powered by Zama&apos;s fhEVM on Sepolia testnet. All salary amounts remain encrypted on-chain while still enabling real-time streaming and verifiable income proofs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Created Streams List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Your Streams ({streams.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-12 backdrop-blur">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-3 text-sm text-slate-400">Loading streams...</p>
            </div>
          </div>
        ) : streams.length > 0 ? (
          <div className="grid gap-4">
            {streams.map((stream) => (
              <a
                key={stream.streamId}
                href={`/stream/${stream.streamId}`}
                className="group rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition hover:border-blue-400/30 hover:bg-slate-900/60"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                      <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        To: {stream.employee.slice(0, 6)}...{stream.employee.slice(-4)}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Stream #{stream.streamId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                    <p className="text-xs text-slate-500">Encrypted Rate</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="font-mono text-sm text-slate-300">
                        {stream.rateHandle.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                    <p className="text-xs text-slate-500">Started</p>
                    <p className="mt-1 text-sm text-white">
                      {new Date(stream.startTime * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-3">
                  <p className="text-xs text-slate-300">Click to view stream details and manage</p>
                  <svg className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-12 backdrop-blur">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-400">No streams created yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first encrypted stream above to get started</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
