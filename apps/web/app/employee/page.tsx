"use client";

import { useEffect, useState } from "react";
import PayslipCard from "../../components/PayslipCard";
import CipherBadge from "../../components/CipherBadge";
import { useFhevm } from "../../providers/FhevmProvider";

const PERIOD_INCOME = 4200;
const YTD_INCOME = 50200;

export default function EmployeePage() {
  const { encryptNumber, ready: fheReady, initializing, error: fheError } = useFhevm();
  const [periodEncrypted, setPeriodEncrypted] = useState<{ handle: string; proof: string; summary: string } | null>(null);
  const [ytdEncrypted, setYtdEncrypted] = useState<{ handle: string; proof: string; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payrollContract = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() || "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
  const employeeAddress = process.env.NEXT_PUBLIC_PAYPROOF_EMPLOYEE?.trim() || "0xdDDdDdDdDDdDDddDddDDdDdDdDDdDddDdddddDD";

  useEffect(() => {
    let cancelled = false;
    if (!fheReady) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [period, ytd] = await Promise.all([
          encryptNumber({ value: PERIOD_INCOME, bitSize: 64, contractAddress: payrollContract, userAddress: employeeAddress }),
          encryptNumber({ value: YTD_INCOME, bitSize: 128, contractAddress: payrollContract, userAddress: employeeAddress })
        ]);
        if (!cancelled) {
          setPeriodEncrypted(period);
          setYtdEncrypted(ytd);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error)?.message ?? "Failed to encrypt payslip data");
          setPeriodEncrypted(null);
          setYtdEncrypted(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fheReady, encryptNumber, payrollContract, employeeAddress]);

  return (
    <section className="space-y-6">
      <header className="grid gap-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Employee Wallet</p>
        <h2 className="text-2xl font-bold text-white">Decrypt your payslip locally</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Your payslip data never leaves your device. Download the attestation artifact when a verifier needs proof-of-income.
        </p>
      </header>
      <PayslipCard
        periodHandle={periodEncrypted?.handle}
        periodProof={periodEncrypted?.proof}
        periodValue={PERIOD_INCOME}
        periodLabel="September 2025"
        yearToDateHandle={ytdEncrypted?.handle}
        yearToDateProof={ytdEncrypted?.proof}
        yearToDateValue={YTD_INCOME}
        loading={loading || initializing}
        error={error || fheError}
      />
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
        <CipherBadge label="Attestation ready" />
        <p>
          Export the JSON proof for lenders or rental agents. They can verify the attestation hash on-chain without seeing your exact salary.
        </p>
      </div>
    </section>
  );
}
