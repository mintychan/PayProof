"use client";

import { useEffect, useMemo, useState } from "react";
import CipherBadge from "./CipherBadge";
import { decryptNumber } from "../lib/crypto/encryption";

interface PayslipCardProps {
  ciphertextBalance: string;
  periodLabel: string;
  ytdCiphertext: string;
}

export default function PayslipCard({ ciphertextBalance, periodLabel, ytdCiphertext }: PayslipCardProps) {
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [plainBalance, setPlainBalance] = useState<number | null>(null);
  const [plainYtd, setPlainYtd] = useState<number | null>(null);

  useEffect(() => {
    if (!showPlaintext) {
      setPlainBalance(null);
      setPlainYtd(null);
      return;
    }
    setPlainBalance(decryptNumber(ciphertextBalance));
    setPlainYtd(decryptNumber(ytdCiphertext));
  }, [ciphertextBalance, showPlaintext, ytdCiphertext]);

  const summary = useMemo(() => {
    if (!showPlaintext || plainBalance === null || plainYtd === null) {
      return "Plaintext hidden — decrypt to view";
    }
    return `This period: ${plainBalance.toLocaleString()} units · YTD: ${plainYtd.toLocaleString()} units`;
  }, [plainBalance, plainYtd, showPlaintext]);

  return (
    <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" data-testid="payslip-card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Encrypted payslip</h2>
          <p className="text-sm text-slate-400">{periodLabel}</p>
        </div>
        <CipherBadge />
      </div>
      <dl className="grid gap-3 text-sm text-slate-300">
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Period ciphertext</dt>
          <dd className="break-all text-emerald-200">{ciphertextBalance}</dd>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Year-to-date ciphertext</dt>
          <dd className="break-all text-emerald-200">{ytdCiphertext}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => setShowPlaintext((prev) => !prev)}
        className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        data-testid="toggle-decrypt"
      >
        {showPlaintext ? "Hide plaintext" : "Decrypt locally"}
      </button>
      <p className="text-sm text-slate-200" data-testid="decryption-summary">
        {summary}
      </p>
    </div>
  );
}
