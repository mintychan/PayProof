import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { FhevmProvider } from "../providers/FhevmProvider";
import { WagmiProvider } from "../providers/WagmiProvider";
import { Header } from "../components/Header";

export const metadata: Metadata = {
  title: "PayProof",
  description: "Confidential payroll streams and proof-of-income on fhEVM"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <WagmiProvider>
          <FhevmProvider>
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-8">
              <Header />
              <main className="flex flex-1 flex-col gap-8 py-10">{children}</main>
              <footer className="mt-12 flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-slate-950/70 px-6 py-6 text-xs text-slate-500 backdrop-blur">
                <p>Built for the Zama Builder Track by coderlu — encrypted payroll, threshold attestations, and composable fhEVM flows.</p>
                <p className="text-[11px] text-slate-500">Sepolia fhE Coprocessor · End-to-end encrypted inputs · Threshold attestations</p>
              </footer>
            </div>
          </FhevmProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
