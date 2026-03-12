"use client";

import { useState, useMemo } from "react";
import { EncryptedStream, StreamStatus } from "../lib/contracts/encryptedPayrollContract";

interface ProofOfEmploymentProps {
  streams: EncryptedStream[];
  employeeAddress: string;
}

type ProofType = "employment" | "income";

interface GeneratedProof {
  type: ProofType;
  employeeAddress: string;
  employerAddress: string;
  streamKey: string;
  streamStatus: string;
  startTime: number;
  durationDays: number;
  generatedAt: number;
  threshold?: number;
}

export default function ProofOfEmployment({
  streams,
  employeeAddress,
}: ProofOfEmploymentProps) {
  const [selectedStreamKey, setSelectedStreamKey] = useState<string>("");
  const [proofType, setProofType] = useState<ProofType>("employment");
  const [threshold, setThreshold] = useState("");
  const [generatedProof, setGeneratedProof] = useState<GeneratedProof | null>(
    null
  );

  const activeStreams = useMemo(
    () =>
      streams.filter(
        (s) =>
          s.status === StreamStatus.Active || s.status === StreamStatus.Paused
      ),
    [streams]
  );

  const selectedStream = useMemo(
    () => activeStreams.find((s) => s.streamKey === selectedStreamKey),
    [activeStreams, selectedStreamKey]
  );

  const durationDays = useMemo(() => {
    if (!selectedStream) return 0;
    return Math.floor(
      (Date.now() / 1000 - selectedStream.startTime) / 86400
    );
  }, [selectedStream]);

  const handleGenerate = () => {
    if (!selectedStream) return;

    const proof: GeneratedProof = {
      type: proofType,
      employeeAddress,
      employerAddress: selectedStream.employer,
      streamKey: selectedStream.streamKey,
      streamStatus:
        selectedStream.status === StreamStatus.Active ? "Active" : "Paused",
      startTime: selectedStream.startTime,
      durationDays,
      generatedAt: Math.floor(Date.now() / 1000),
      ...(proofType === "income" && threshold
        ? { threshold: parseFloat(threshold) }
        : {}),
    };

    setGeneratedProof(proof);
  };

  const proofUrl = useMemo(() => {
    if (!generatedProof) return "";
    const params = new URLSearchParams({
      employee: generatedProof.employeeAddress,
      employer: generatedProof.employerAddress,
      stream: generatedProof.streamKey,
      type: generatedProof.type,
      days: generatedProof.durationDays.toString(),
      ts: generatedProof.generatedAt.toString(),
    });
    if (generatedProof.threshold) {
      params.set("threshold", generatedProof.threshold.toString());
    }
    return `${typeof window !== "undefined" ? window.location.origin : ""}/verify?${params.toString()}`;
  }, [generatedProof]);

  return (
    <div className="space-y-6">
      {/* Stream Selection */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <h3 className="mb-4 text-lg font-semibold text-white">
          1. Select Stream
        </h3>

        {activeStreams.length === 0 ? (
          <p className="text-sm text-slate-400">
            No active streams found. You need an active payroll stream to
            generate a proof.
          </p>
        ) : (
          <div className="space-y-3">
            {activeStreams.map((stream) => {
              const days = Math.floor(
                (Date.now() / 1000 - stream.startTime) / 86400
              );
              const isSelected = selectedStreamKey === stream.streamKey;
              return (
                <button
                  key={stream.streamKey}
                  type="button"
                  onClick={() => setSelectedStreamKey(stream.streamKey)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        From {stream.employer.slice(0, 6)}...
                        {stream.employer.slice(-4)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Active for {days} days | Started{" "}
                        {new Date(
                          stream.startTime * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        isSelected
                          ? "border-blue-400 bg-blue-400"
                          : "border-slate-600"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof Type */}
      {selectedStream && (
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
          <h3 className="mb-4 text-lg font-semibold text-white">
            2. Choose Proof Type
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setProofType("employment")}
              className={`rounded-2xl border p-4 text-left transition ${
                proofType === "employment"
                  ? "border-blue-400/30 bg-blue-500/10"
                  : "border-white/5 bg-slate-950/40 hover:border-white/10"
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-white">
                Proof of Employment
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Prove you have an active stream from a specific employer
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProofType("income")}
              className={`rounded-2xl border p-4 text-left transition ${
                proofType === "income"
                  ? "border-blue-400/30 bg-blue-500/10"
                  : "border-white/5 bg-slate-950/40 hover:border-white/10"
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                <svg
                  className="h-5 w-5 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-white">
                Income Threshold
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Prove salary meets a minimum threshold without revealing exact
                amount
              </p>
            </button>
          </div>

          {proofType === "income" && (
            <div className="mt-4">
              <label className="block text-xs text-slate-400">
                Minimum monthly income (cETH)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 1.5"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/30 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {selectedStream && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={proofType === "income" && !threshold}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40 disabled:opacity-40"
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Generate Proof
          </button>
        </div>
      )}

      {/* Generated Proof Display */}
      {generatedProof && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Proof Generated
              </h3>
              <p className="text-xs text-slate-400">
                Share this with verifiers to prove your{" "}
                {generatedProof.type === "employment"
                  ? "employment"
                  : "income threshold"}
              </p>
            </div>
          </div>

          {/* Proof Details */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Employee</span>
              <span className="font-mono text-white">
                {generatedProof.employeeAddress.slice(0, 6)}...
                {generatedProof.employeeAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Employer</span>
              <span className="font-mono text-white">
                {generatedProof.employerAddress.slice(0, 6)}...
                {generatedProof.employerAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Employment Duration</span>
              <span className="text-white">
                {generatedProof.durationDays} days
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <span className="text-emerald-400">
                {generatedProof.streamStatus}
              </span>
            </div>
            {generatedProof.threshold && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Income Threshold</span>
                <span className="text-violet-400">
                  {generatedProof.threshold} cETH/month
                </span>
              </div>
            )}
          </div>

          {/* Shareable Link */}
          <div className="mt-4">
            <label className="block text-xs text-slate-400">
              Shareable Verification Link
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                readOnly
                value={proofUrl}
                className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(proofUrl)}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition hover:text-white"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Info about on-chain verification */}
          <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-xs leading-relaxed text-blue-200">
              For on-chain income verification, the verifier can use the{" "}
              <a href="/verify" className="underline">
                Proof of Income
              </a>{" "}
              page to submit an encrypted threshold against your stream. The
              IncomeOracle will compare your income homomorphically and return
              an encrypted yes/no result — without ever revealing your salary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
