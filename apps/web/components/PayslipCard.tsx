"use client";

import { useMemo, useState } from "react";
import CipherBadge from "./CipherBadge";

interface PayslipCardProps {
  periodLabel: string;
  periodHandle?: string;
  periodProof?: string;
  periodValue: number;
  yearToDateHandle?: string;
  yearToDateProof?: string;
  yearToDateValue: number;
  loading?: boolean;
  error?: string | null;
}

export default function PayslipCard({
  periodLabel,
  periodHandle,
  periodProof,
  periodValue,
  yearToDateHandle,
  yearToDateProof,
  yearToDateValue,
  loading = false,
  error,
}: PayslipCardProps) {
  const [showPlaintext, setShowPlaintext] = useState(false);

  const summary = useMemo(() => {
    if (!showPlaintext) return "Plaintext hidden — decrypt to view";
    return `This period: ${periodValue.toLocaleString()} units · YTD: ${yearToDateValue.toLocaleString()} units`;
  }, [showPlaintext, periodValue, yearToDateValue]);

  const hasCiphertext = Boolean(periodHandle && periodProof && yearToDateHandle && yearToDateProof);

  return (
    <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" data-testid="payslip-card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Encrypted payslip</h2>
          <p className="text-sm text-slate-400">{periodLabel}</p>
        </div>
        <CipherBadge label={hasCiphertext ? "Encrypted" : loading ? "Encrypting" : "Pending"} />
      </div>
      <dl className="grid gap-3 text-sm text-slate-300">
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Period handle</dt>
          <dd className="break-all text-emerald-200">{periodHandle ?? "—"}</dd>
          <dt className="mt-2 text-xs uppercase tracking-wide text-slate-400">Proof</dt>
          <dd className="break-all text-emerald-200">{periodProof ?? "—"}</dd>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Year-to-date handle</dt>
          <dd className="break-all text-emerald-200">{yearToDateHandle ?? "—"}</dd>
          <dt className="mt-2 text-xs uppercase tracking-wide text-slate-400">Proof</dt>
          <dd className="break-all text-emerald-200">{yearToDateProof ?? "—"}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => setShowPlaintext((prev) => !prev)}
        className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        data-testid="toggle-decrypt"
        disabled={!hasCiphertext || loading}
      >
        {showPlaintext ? "Hide plaintext" : loading ? "Encrypting…" : "Decrypt locally"}
      </button>
      <p className="text-sm text-slate-200" data-testid="decryption-summary">
        {loading ? "Encrypting payslip data…" : summary}
      </p>
      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>
      ) : null}
    </div>
  );
}
