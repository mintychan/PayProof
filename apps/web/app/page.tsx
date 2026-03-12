export default function Home() {
  return (
    <section className="space-y-16">
      {/* Hero Section */}
      <div className="relative text-center pt-8">
        {/* Animated gradient background */}
        <div className="pointer-events-none absolute inset-0 -top-20 flex items-center justify-center">
          <div className="h-[300px] w-[600px] rounded-full bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 blur-[100px]" />
        </div>

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
            Powered by Zama fhEVM
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-6xl">
            Privacy-Preserving
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Payroll on Chain
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Stream encrypted salaries, generate verifiable payslips, and prove income eligibility — all without revealing your exact salary. Built with fully homomorphic encryption.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/employer"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:shadow-blue-500/40"
            >
              Start as Employer
            </a>
            <a
              href="/employee"
              className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/20"
            >
              View as Employee
            </a>
            <a
              href="/verify"
              className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/20"
            >
              Verify Income
            </a>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div>
        <h2 className="mb-8 text-center text-2xl font-bold text-white">How It Works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "Encrypt",
              description: "Employer encrypts salary rate client-side using fhEVM before submitting to the blockchain",
              color: "blue",
            },
            {
              step: "2",
              title: "Stream",
              description: "Encrypted salary accrues every second on-chain. Amounts stay confidential in ciphertext",
              color: "purple",
            },
            {
              step: "3",
              title: "Decrypt",
              description: "Employee signs an EIP-712 message to decrypt their salary locally in the browser",
              color: "emerald",
            },
            {
              step: "4",
              title: "Verify",
              description: "Third parties can verify income thresholds without ever learning the exact salary",
              color: "amber",
            },
          ].map(({ step, title, description, color }) => (
            <div
              key={step}
              className="relative rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-${color}-500/20 text-${color}-400 text-sm font-bold`}>
                {step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{description}</p>
              {step !== "4" && (
                <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 md:block">
                  <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards Grid - 4 Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Payments Card */}
        <a
          href="/employer"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition-all hover:border-blue-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
              <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Payments</h3>
            <p className="mb-3 text-sm text-slate-400">
              Stream encrypted payroll with real-time accrual and confidential withdrawals.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
              Explore
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Vesting Card */}
        <a
          href="/vesting"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition-all hover:border-purple-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
              <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Vesting</h3>
            <p className="mb-3 text-sm text-slate-400">
              Manage encrypted vesting schedules with cliff unlocks and time-locked releases.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
              Explore
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Verify Card */}
        <a
          href="/verify"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition-all hover:border-amber-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20">
              <svg className="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Verify</h3>
            <p className="mb-3 text-sm text-slate-400">
              Prove income thresholds to lenders or landlords without revealing your salary.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
              Explore
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Airdrops Card */}
        <a
          href="/airdrops"
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur transition-all hover:border-emerald-400/30 hover:bg-slate-900/60"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Airdrops</h3>
            <p className="mb-3 text-sm text-slate-400">
              Distribute tokens to multiple recipients with privacy-preserving proofs.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              Explore
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>
      </div>

      {/* Use Cases Section */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Real-World Use Cases
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              ),
              title: "Payroll",
              description: "Stream encrypted salaries to employees with per-second accrual",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              ),
              title: "Vesting",
              description: "Token grants with encrypted amounts, cliff periods, and linear unlocks",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              ),
              title: "Income Verification",
              description: "Prove salary meets a threshold for loans or rentals without revealing the amount",
            },
            {
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              ),
              title: "Proof of Employment",
              description: "Generate verifiable proofs of employment duration and active status",
            },
          ].map(({ icon, title, description }) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {icon}
                </svg>
              </div>
              <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Built with fhEVM */}
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

      {/* Submission Badge */}
      <div className="text-center">
        <p className="text-sm text-slate-500">
          Submitted for the Zama Special Bounty Track — Confidential Payroll
        </p>
      </div>
    </section>
  );
}
