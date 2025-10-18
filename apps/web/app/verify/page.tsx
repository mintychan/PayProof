"use client";

import PoIAttestationPanel from "../../components/PoIAttestationPanel";
import NetworkStatus from "../../components/NetworkStatus";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { MetricPill } from "../../components/ui/MetricPill";

export default function VerifyPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Verifier Console"
        subtitle="Provide an encrypted income threshold and receive a privacy-preserving attestation with deterministic tiers."
        actions={
          <button className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow hover:brightness-105">
            Download verifier snippet
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard accent="emerald">
          <PoIAttestationPanel />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard accent="sky" title="Proof summary">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricPill label="Network" value="Sepolia" tone="sky" />
              <MetricPill label="Contract" value="IncomeOracle" tone="emerald" />
              <MetricPill label="Attestation tiers" value="A / B / C / -" tone="violet" />
              <MetricPill label="Response time" value="~ 6s" tone="amber" />
            </div>
          </SectionCard>

          <SectionCard accent="slate" title="Verifier checklist">
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Encrypt thresholds with the fhEVM relayer or a secure enclave before submitting.</li>
              <li>• Log attestation hashes, block numbers, and oracle responses for your audit trail.</li>
              <li>• Share the verification script along with JSON proof artifacts for underwriting teams.</li>
            </ul>
            <div className="mt-5 space-y-3">
              <NetworkStatus />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
