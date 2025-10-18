export default function AirdropsPage() {
  return (
    <section className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
            <svg className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold text-white">Private Airdrops</h1>
        <p className="mb-8 text-2xl text-slate-400">Coming Soon</p>
      </div>

      {/* Feature Overview */}
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur">
          <h2 className="mb-4 text-2xl font-bold text-white">Encrypted Eligibility & Distribution</h2>
          <p className="mb-6 text-lg leading-relaxed text-slate-300">
            Compute eligibility scores and allocations over encrypted inputs, revealing only what each claimer needs to know—eligibility status, tier level, or exact allocation at claim time.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-white">Private Scoring</h3>
              </div>
              <p className="text-sm text-slate-400">
                Eligibility criteria and scoring logic remain encrypted. Users prove they qualify without revealing the exact rules.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-white">Sybil Resistance</h3>
              </div>
              <p className="text-sm text-slate-400">
                Combine FHE with ZK proofs (Semaphore, MACI-style) for privacy-preserving identity verification and gas-efficient claims.
              </p>
            </div>
          </div>
        </div>

        {/* Why It Wins */}
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-8 backdrop-blur">
          <h2 className="mb-4 text-2xl font-bold text-white">Why Private Airdrops?</h2>
          <p className="leading-relaxed text-slate-300">
            Traditional public airdrops leak eligibility criteria, making them vulnerable to gaming and sybil attacks. Once the rules are known, bad actors can create wallets to farm rewards.
          </p>
          <p className="mt-4 leading-relaxed text-slate-300">
            Existing ZK airdrop solutions help, but often still expose criteria publicly or require complex trusted setup ceremonies. Our approach combines the best of both worlds: FHE for private scoring over encrypted criteria, plus ZK proofs (Semaphore/MACI-style) for sybil-resistant identity verification.
          </p>
          <p className="mt-4 leading-relaxed text-slate-300">
            The result? You can distribute tokens fairly without revealing your eligibility formula, protect against gaming, and keep gas costs low with efficient claim verification—all powered by Zama&apos;s fhEVM.
          </p>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 backdrop-blur transition hover:border-emerald-400/40 hover:bg-slate-900/60"
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
