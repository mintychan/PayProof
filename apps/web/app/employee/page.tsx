"use client";

import { useAccount } from "wagmi";
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
      {/* Header */}
      <div>
        <h1 className="mb-6 text-3xl font-bold text-white">Payment Streams</h1>

        {/* Tabs */}
        <div className="flex items-center gap-3">
          <a
            href="/employer"
            className="flex items-center gap-3 rounded-xl px-6 py-4 text-base font-semibold text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            As sender
          </a>
          <a
            href="/employee"
            className="flex items-center gap-3 rounded-xl bg-orange-500/10 px-6 py-4 text-base font-semibold text-orange-400 transition"
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
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Wallet</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {employeeAddress ? `${employeeAddress.slice(0, 6)}...${employeeAddress.slice(-4)}` : "Not connected"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Active streams</p>
              <p className="mt-0.5 text-sm font-medium text-white">{streams.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/20">
              <svg className="h-5 w-5 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20">
              <div className={`h-3 w-3 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-0.5 text-sm font-medium text-white">{loading ? "Syncing..." : "Live"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Streams Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your Streams ({streams.length})</h2>
      </div>

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-sm text-slate-400">Loading streams...</p>
          </div>
        </div>
      ) : streams.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">No Streams Found</h3>
            <p className="mt-2 text-sm text-slate-400">
              No payment streams found for your address
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ask your employer to create a stream to your wallet
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {streams.map((stream) => (
            <a
              key={stream.streamId}
              href={`/stream/${stream.streamId}`}
              className="group rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition hover:border-blue-400/30 hover:bg-slate-900/60"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                    <svg className="h-6 w-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Stream #{stream.streamId.slice(0, 8)}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      From {stream.employer.slice(0, 6)}...{stream.employer.slice(-4)}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-slate-400">Encrypted Rate</span>
                  </div>
                  <span className="font-mono text-xs text-violet-400">🔒 {stream.rateHandle.slice(0, 10)}...</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate-400">Started</span>
                  </div>
                  <span className="text-xs font-medium text-white">
                    {new Date(stream.startTime * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-blue-300">Click to decrypt amount</span>
                </div>
                <svg className="h-4 w-4 text-blue-400 transition group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">About Encrypted Streams</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Your salary streams use fully homomorphic encryption (fhEVM) to protect your privacy. Only you and your employer can decrypt the actual amounts. Third parties can verify income thresholds without learning your specific salary.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Encrypted rates</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Private decryption</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Proof generation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
