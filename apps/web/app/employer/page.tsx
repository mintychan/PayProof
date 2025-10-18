import PayrollStreamForm from "../../components/PayrollStreamForm";
import NetworkStatus from "../../components/NetworkStatus";
import CipherBadge from "../../components/CipherBadge";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { MetricPill } from "../../components/ui/MetricPill";

export default function EmployerPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Confidential Streams"
        subtitle="Create and fund encrypted payroll streams. Employees decrypt payslips locally; verifiers only see threshold attestations."
        actions={
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            View submissions
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard accent="sky">
          <PayrollStreamForm />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard accent="violet" title="Stream snapshot">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricPill label="Active streams" value="3 live" tone="violet" />
              <MetricPill label="Protocol" value="Sepolia fhE Coprocessor" tone="sky" />
              <MetricPill label="Avg. cadence" value="Bi-weekly" tone="emerald" />
              <MetricPill label="Proof requests" value="12 this month" tone="amber" />
            </div>
          </SectionCard>

          <SectionCard accent="slate" title="Runbook" description="Best practices to keep your submission review-ready.">
            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                <span className="font-medium text-white">Encrypt locally:</span> inputs are sealed with the fhEVM relayer before any transaction is broadcast.
              </li>
              <li>
                <span className="font-medium text-white">Store proofs:</span> capture the attestation handle + tx hash for the verification package.
              </li>
              <li>
                <span className="font-medium text-white">Monitor health:</span> ensure the coprocessor RPC responds before running a demo.
              </li>
            </ul>
            <div className="mt-5 space-y-3 rounded-2xl border border-white/5 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CipherBadge label="PoI enabled" />
                <span>Verifier thresholds map to the IncomeOracle tiers.</span>
              </div>
              <NetworkStatus />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
