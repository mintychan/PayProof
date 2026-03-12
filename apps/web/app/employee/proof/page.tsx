"use client";

import { useAccount } from "wagmi";
import { WalletConnectPrompt } from "../../../components/WalletConnect";
import { useEncryptedStreams } from "../../../hooks/useEncryptedStreams";
import ProofOfEmployment from "../../../components/ProofOfEmployment";

export default function ProofOfEmploymentPage() {
  const { address, isConnected } = useAccount();
  const { streams, loading } = useEncryptedStreams(address, "employee");

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return (
    <section className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <a href="/employee" className="transition hover:text-slate-200">
            My Streams
          </a>
          <span>&rsaquo;</span>
          <span className="text-slate-200">Proof of Employment</span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/employee"
            aria-label="Back to streams"
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
          <div>
            <h1 className="text-3xl font-bold text-white">
              Proof of Employment
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Generate verifiable proofs of employment and income threshold — only possible with FHE
            </p>
          </div>
        </div>
      </div>

      {/* FHE Explainer */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
            <svg
              className="h-4 w-4 text-purple-400"
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
            <p className="text-sm font-medium text-purple-200">
              Privacy-Preserving Proofs with FHE
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Prove employment status or income thresholds to landlords, lenders,
              or visa officers without revealing your exact salary. The
              IncomeOracle compares your encrypted income against an encrypted
              threshold using fully homomorphic encryption — neither party learns
              the other&apos;s values.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-16 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-400">Loading your streams...</p>
          </div>
        </div>
      ) : (
        <ProofOfEmployment
          streams={streams}
          employeeAddress={address || ""}
        />
      )}
    </section>
  );
}
