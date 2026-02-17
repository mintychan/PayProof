import Link from "next/link";
import { Suspense } from "react";
import { VestingDashboard } from "./components/VestingDashboard";

const featureCards = [
  {
    title: "Lookup confidential vesting schedules",
    body: "Paste any vesting ID to fetch sponsor, beneficiary, cliff, and duration without exposing the encrypted balances.",
  },
  {
    title: "Client-side fhEVM decryption",
    body: "Handles stay encrypted on-chain. Only addresses with permissions can decrypt the ciphertext locally.",
  },
  {
    title: "Batch-friendly workflows",
    body: "Generate CSV/Safe payloads so finance teams can fund dozens of cliffs in one review cycle.",
  },
];

export default function VestingPage() {
  return (
    <section className="space-y-12 pb-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-white/5 bg-gradient-to-br from-purple-900/50 via-slate-900/80 to-slate-950/80 p-8 shadow-xl shadow-purple-500/10">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Confidential Benefits</div>
          <h1 className="text-4xl font-bold text-white">Encrypted Vesting</h1>
          <p className="text-lg text-slate-300">
            This vesting vault keeps option grants, cliffs, and unlock curves private while still giving beneficiaries provable payout guarantees.
            The vault runs fully on Zama&apos;s fhEVM so every release emits new ciphertext handles instead of plaintext balances.
          </p>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-slate-400">Cliffs &amp; unlocks</p>
              <p className="mt-2 text-base text-white">Define cliffs, duration, and initial unlock BPS per schedule.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-slate-400">NFT ownership</p>
              <p className="mt-2 text-base text-white">Every schedule mints an ERC-721 token so wallets can prove their claim.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-white/5 bg-slate-900/50 p-6">
          <h2 className="text-2xl font-semibold text-white">Feature Highlights</h2>
          <div className="grid gap-4">
            {featureCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/5 bg-slate-950/70 p-4">
                <p className="text-base font-medium text-white">{card.title}</p>
                <p className="mt-2 text-sm text-slate-300">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-8">
        <h2 className="text-2xl font-semibold text-white">Why Encrypted Vesting?</h2>
        <p className="mt-3 text-slate-300">
          Traditional vesting tools like Sablier or OpenZeppelin timelocks leak every amount on-chain. PayProof keeps the math private,
          yet still allows auditors to decrypt on demand and regulators to verify compliance proofs.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <p className="text-sm font-semibold text-white">Private cliffs</p>
            <p className="mt-2 text-sm text-slate-300">Schedule metadata is public, but amounts and unlock ratios never leave ciphertext form.</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <p className="text-sm font-semibold text-white">Proof-ready</p>
            <p className="mt-2 text-sm text-slate-300">Beneficiaries can decrypt handles locally to satisfy due diligence without leaking on-chain.</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <p className="text-sm font-semibold text-white">Employer controls</p>
            <p className="mt-2 text-sm text-slate-300">Allowlisted sponsors decide if schedules are cancelable or transferable post-cliff.</p>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 text-slate-400">Loading vesting dashboard…</div>}>
        <VestingDashboard />
      </Suspense>

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:border-sky-400/60 hover:text-sky-200"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
