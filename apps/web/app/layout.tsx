import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "../components/Header";
import { Providers } from "../components/Providers";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastProvider } from "../components/ToastProvider";

export const metadata: Metadata = {
  title: "PayProof",
  description: "Confidential payroll streams and proof-of-income on fhEVM"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overflow-y-scroll">
      <body className="font-sans">
        <Providers>
          <ToastProvider>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-8">
              <Header />
              <main className="flex flex-1 flex-col gap-8 py-10"><ErrorBoundary>{children}</ErrorBoundary></main>
              <footer className="mt-12 flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-slate-950/70 px-6 py-6 text-xs text-slate-500 backdrop-blur">
                <p>Built for the Zama Special Bounty Track by <a href="mailto:xiaoyilu.au@gmail.com" className="text-blue-400 transition hover:text-blue-300">coderlu</a> — encrypted payroll, threshold attestations, and composable fhEVM flows.</p>
                <p className="text-[11px] text-slate-500">Sepolia fhE Coprocessor · End-to-end encrypted inputs · Threshold attestations</p>
              </footer>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
