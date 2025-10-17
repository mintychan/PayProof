import Link from "next/link";
import CipherBadge from "../components/CipherBadge";

export default function Home() {
  return (
    <section className="grid gap-8">
      <div className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <CipherBadge label="Confidential by default" />
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Stream payroll privately, share proof-of-income when you need it.
        </h2>
        <p className="text-base text-slate-300">
          PayProof lets employers stream encrypted salaries on-chain, employees decrypt payslips locally, and verifiers receive threshold-style attestations without raw income data.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground" href="/employer">
            Employer Console
          </Link>
          <Link className="rounded border border-slate-700 px-4 py-2 font-medium text-slate-200" href="/employee">
            Employee Wallet
          </Link>
          <Link className="rounded border border-slate-700 px-4 py-2 font-medium text-slate-200" href="/verify">
            Verifier Portal
          </Link>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
        <p>
          • Built on Zama&apos;s fhEVM primitives. Encrypt before submit, decrypt locally, and keep amounts confidential on the L1.
        </p>
        <p>
          • Threshold attestations (≥) give verifiers the signal they need — nothing more. Programmable tiers help automate credit policy.
        </p>
        <p>
          • Designed for the Zama Builder Track timeline: deploy, demo, document, and submit before the 23:59 AOE deadline each month.
        </p>
      </div>
    </section>
  );
}
