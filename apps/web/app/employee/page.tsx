"use client";

import { useEffect, useState } from "react";
import NetworkStatus from "../../components/NetworkStatus";
import PayslipCard from "../../components/PayslipCard";
import CipherBadge from "../../components/CipherBadge";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { MetricPill } from "../../components/ui/MetricPill";
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
    <section className="space-y-8">
      <PageHeader
        title="Payslip Vault"
        subtitle="Decrypt the latest earnings privately, share attestations with verifiers, and keep your salary protected end-to-end."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> fhE session active
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard accent="violet" description="Only you can decrypt the payslip. Handles and proofs never leave your browser.">
          <PayslipCard
            periodHandle={periodEncrypted?.handle}
            periodProof={periodEncrypted?.proof}
            periodValue={PERIOD_INCOME}
            periodLabel="Current pay period"
            yearToDateHandle={ytdEncrypted?.handle}
            yearToDateProof={ytdEncrypted?.proof}
            yearToDateValue={YTD_INCOME}
            loading={loading || initializing}
            error={error || fheError}
          />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard accent="sky" title="Status overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricPill label="Wallet" value={employeeAddress.slice(0, 10) + "…"} tone="sky" />
              <MetricPill label="Stream cadence" value="On-chain enforced" tone="emerald" />
              <MetricPill label="Last sync" value={loading ? "Syncing…" : "Moments ago"} tone="violet" />
              <MetricPill label="Proof policy" value="Threshold attestations" tone="amber" />
            </div>
          </SectionCard>

          <SectionCard accent="slate" title="Export & share">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3">
                <CipherBadge label="Attestation ready" />
                <p>Generate an encrypted proof artifact for lenders, landlords, or partners.</p>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
                <li>• Handles + proofs stay local; only the pass/fail signal leaves your device.</li>
                <li>• Need a credential? Export the JSON artifact and share the verifier snippet.</li>
                <li>• Network health check ensures the fhE Coprocessor is responsive before sharing.</li>
              </ul>
              <NetworkStatus />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
