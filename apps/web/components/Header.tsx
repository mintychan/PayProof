"use client";

import { WalletConnect } from "./WalletConnect";

export function Header() {
  return (
    <header className="flex items-center justify-between rounded-3xl border border-white/5 bg-slate-950/70 px-6 py-4 shadow-[0_15px_35px_-20px_rgba(2,132,199,0.4)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
          <span className="text-lg font-semibold">PP</span>
        </span>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">PayProof Console</p>
          <p className="text-xs text-slate-400">Confidential payroll &amp; programmable PoI</p>
        </div>
      </div>
      <nav className="flex items-center gap-6 text-sm text-slate-300">
        <a href="/employer" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-800/80 hover:text-white">
          As Sender
        </a>
        <a href="/employee" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-800/80 hover:text-white">
          As Recipient
        </a>
        <a href="/verify" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-800/80 hover:text-white">
          Proofs
        </a>
        <WalletConnect />
      </nav>
    </header>
  );
}
