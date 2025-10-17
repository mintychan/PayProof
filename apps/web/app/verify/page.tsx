import PoIAttestationPanel from "../../components/PoIAttestationPanel";

export default function VerifyPage() {
  return (
    <section className="space-y-6">
      <header className="grid gap-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Verifier Portal</p>
        <h2 className="text-2xl font-bold text-white">Request threshold proof-of-income</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Submit an encrypted income threshold and receive a boolean/tier response. Attestation hashes reference on-chain events for auditability.
        </p>
      </header>
      <PoIAttestationPanel />
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-xs text-slate-400">
        <p className="text-sm font-semibold text-slate-200">Verifier checklist</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Encrypt thresholds client-side or via secure enclave.</li>
          <li>Log attestation hashes and block numbers for audit trails.</li>
          <li>Share verification snippet with downstream underwriting flows.</li>
        </ul>
      </div>
    </section>
  );
}
