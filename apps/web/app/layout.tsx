import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PayProof",
  description: "Confidential payroll streams and proof-of-income on fhEVM"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-baseline gap-2">
              <span className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Encrypted</span>
              <h1 className="text-lg font-semibold tracking-tight text-white">PayProof</h1>
            </div>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/employer" className="hover:text-white">
                Employer
              </a>
              <a href="/employee" className="hover:text-white">
                Employee
              </a>
              <a href="/verify" className="hover:text-white">
                Verifier
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col gap-10 px-4 py-10">{children}</main>
        <footer className="border-t border-slate-800 bg-slate-950/60 py-6 text-center text-xs text-slate-400">
          Built for the Zama Builder Track — encrypted payroll, threshold attestations, and composable FH EVM flows.
        </footer>
      </body>
    </html>
  );
}
