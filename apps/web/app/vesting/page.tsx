export default function VestingPage() {
  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <svg className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold text-white">Encrypted Vesting</h1>
        <p className="mb-8 text-2xl text-slate-400">Coming Soon</p>
      </div>

      {/* Feature Overview */}
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur">
          <h2 className="mb-4 text-2xl font-bold text-white">Private Token Vesting</h2>
          <p className="mb-6 text-lg leading-relaxed text-slate-300">
            Keep allocations, cliff schedules, and unlock amounts fully encrypted on-chain. Only beneficiaries can decrypt their available balances and claim what they&apos;ve earned.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-white">Encrypted Allocations</h3>
              </div>
              <p className="text-sm text-slate-400">
                Vesting amounts, cliff periods, and unlock schedules remain encrypted. No one can see how much you&apos;re vesting.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-white">Time-Locked Releases</h3>
              </div>
              <p className="text-sm text-slate-400">
                Encrypted balances unlock over time with on-chain verifiable schedules. Claim anytime after cliff.
              </p>
            </div>
          </div>
        </div>

        {/* Why It Wins */}
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-8 backdrop-blur">
          <h2 className="mb-4 text-2xl font-bold text-white">Why Encrypted Vesting?</h2>
          <p className="leading-relaxed text-slate-300">
            Today&apos;s vesting tools like Sablier and OpenZeppelin&apos;s VestingWallet expose all allocations and schedules publicly on-chain. Anyone can see exactly how much is vesting, when it unlocks, and who the beneficiaries are.
          </p>
          <p className="mt-4 leading-relaxed text-slate-300">
            Our encrypted vesting preserves complete privacy while maintaining full composability. Allocations stay confidential, beneficiaries control their own decryption, and schedules execute trustlessly on-chain—all powered by Zama&apos;s fhEVM.
          </p>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 backdrop-blur transition hover:border-purple-400/40 hover:bg-slate-900/60"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </section>
  );
}
