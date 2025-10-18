"use client";

import { useAccount } from "wagmi";
import PoIAttestationPanel from "../../components/PoIAttestationPanel";
import { WalletConnectPrompt } from "../../components/WalletConnect";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();

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
            className="flex items-center gap-3 rounded-xl px-6 py-4 text-base font-semibold text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As recipient
          </a>
          <a
            href="/verify"
            className="flex items-center gap-3 rounded-xl bg-orange-500/10 px-6 py-4 text-base font-semibold text-orange-400 transition"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contract</p>
              <p className="mt-0.5 text-sm font-medium text-white">IncomeOracle</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tiers</p>
              <p className="mt-0.5 text-sm font-medium text-white">A / B / C</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Attestation Request Form */}
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
          <PoIAttestationPanel />
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Attestation Tiers */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-white">Attestation Tiers</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-400">A</span>
                  <span className="text-sm text-slate-300">Premium</span>
                </div>
                <span className="text-xs text-slate-400">≥ 2× threshold</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-400">B</span>
                  <span className="text-sm text-slate-300">Standard</span>
                </div>
                <span className="text-xs text-slate-400">≥ 1.1× threshold</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-amber-400">C</span>
                  <span className="text-sm text-slate-300">Basic</span>
                </div>
                <span className="text-xs text-slate-400">Meets threshold</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-500/20 bg-slate-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-400">−</span>
                  <span className="text-sm text-slate-300">None</span>
                </div>
                <span className="text-xs text-slate-400">Below threshold</span>
              </div>
            </div>
          </div>

          {/* Verifier Checklist */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-white">Best Practices</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Client-side encryption</p>
                  <p className="mt-0.5 text-xs text-slate-400">Encrypt thresholds with fhEVM relayer before submitting</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Audit trail</p>
                  <p className="mt-0.5 text-xs text-slate-400">Log attestation hashes and block numbers for compliance</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Share proof artifacts</p>
                  <p className="mt-0.5 text-xs text-slate-400">Export JSON proof for underwriting teams</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Info */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">Privacy Guarantee</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  You receive tiered attestation results without learning the exact salary amount. All computations happen on encrypted data using Zama&apos;s fhEVM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
