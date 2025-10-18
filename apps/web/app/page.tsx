export default function Home() {
  return (
    <section className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-white">
          Privacy-Preserving Payroll
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400">
          Stream encrypted salaries, manage token vesting, and distribute airdrops with fully homomorphic encryption
        </p>
      </div>

      {/* Chroma Grid - 3 Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Payments Card */}
        <a
          href="/employer"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur transition-all hover:border-blue-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          <div className="relative">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
              <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-white">Payments</h3>
            <p className="mb-4 text-slate-400">
              Stream encrypted payroll with real-time accrual. Only you and your employees can decrypt amounts.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
              Explore Payments
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Vesting Card */}
        <a
          href="/vesting"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur transition-all hover:border-purple-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          <div className="relative">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-white">Vesting</h3>
            <p className="mb-4 text-slate-400">
              Manage token vesting schedules with encrypted allocations and time-locked releases.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
              Explore Vesting
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Airdrops Card */}
        <a
          href="/airdrops"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur transition-all hover:border-emerald-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          <div className="relative">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-white">Airdrops</h3>
            <p className="mb-4 text-slate-400">
              Distribute tokens to multiple recipients with privacy-preserving merkle tree proofs.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              Explore Airdrops
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>
      </div>

      {/* Info Section */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur">
        <h2 className="mb-6 text-2xl font-bold text-white">Built with Zama&apos;s fhEVM</h2>
        <div className="grid gap-4 text-slate-300 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Client-Side Encryption</p>
              <p className="mt-1 text-sm text-slate-400">All amounts encrypted before on-chain submission</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Private Decryption</p>
              <p className="mt-1 text-sm text-slate-400">Only authorized parties can decrypt data</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <svg className="h-3.5 w-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">On-Chain Privacy</p>
              <p className="mt-1 text-sm text-slate-400">Confidential amounts remain encrypted on L1</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
