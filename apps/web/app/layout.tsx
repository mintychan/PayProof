import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { FhevmProvider } from "../providers/FhevmProvider";

export const metadata: Metadata = {
  title: "PayProof",
  description: "Confidential payroll streams and proof-of-income on fhEVM"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <FhevmProvider>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-8">
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
                  Streams
                </a>
                <a href="/employee" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-800/80 hover:text-white">
                  Payslips
                </a>
                <a href="/verify" className="rounded-full px-3 py-1.5 transition-colors hover:bg-slate-800/80 hover:text-white">
                  Proofs
                </a>
                <span className="ml-3 hidden items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 md:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> fhE Ready
                </span>
              </nav>
            </header>
            <main className="flex flex-1 flex-col gap-8 py-10">{children}</main>
            <footer className="mt-12 flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-slate-950/70 px-6 py-6 text-xs text-slate-500 backdrop-blur">
              <p>Built for the Zama Builder Track — encrypted payroll, threshold attestations, and composable fhEVM flows.</p>
              <p className="text-[11px] text-slate-500">Sepolia fhE Coprocessor · End-to-end encrypted inputs · Threshold attestations</p>
            </footer>
          </div>
        </FhevmProvider>
      </body>
    </html>
  );
}
