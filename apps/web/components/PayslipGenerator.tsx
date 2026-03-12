"use client";

import { useState } from "react";
import { generatePayslipPDF, PayslipData } from "../lib/generatePayslip";
import { CONFIDENTIAL_DECIMALS } from "../lib/config";

interface PayslipGeneratorProps {
  streamId: string;
  streamKey: string;
  employerAddress: string;
  employeeAddress: string;
  tokenSymbol: string;
  startTime: number;
  status: string;
  /** Decrypted values — pass null if not yet decrypted */
  decryptedRate: number | null;
  decryptedWithdrawn: number | null;
  decryptedBuffered: number | null;
  decryptedBalance: number | null;
}

export default function PayslipGenerator({
  streamId,
  streamKey,
  employerAddress,
  employeeAddress,
  tokenSymbol,
  startTime,
  status,
  decryptedRate,
  decryptedWithdrawn,
  decryptedBuffered,
  decryptedBalance,
}: PayslipGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const hasDecryptedData = decryptedRate !== null;

  const handleGenerate = () => {
    if (!hasDecryptedData) return;

    setGenerating(true);
    try {
      const decimals = CONFIDENTIAL_DECIMALS;
      const rate = decryptedRate / 10 ** decimals;
      const monthlyRate = rate * 30 * 24 * 60 * 60;
      const withdrawn = (decryptedWithdrawn ?? 0) / 10 ** decimals;
      const buffered = (decryptedBuffered ?? 0) / 10 ** decimals;
      const balance = (decryptedBalance ?? 0) / 10 ** decimals;
      const totalStreamed = balance + withdrawn - buffered;

      const payslipData: PayslipData = {
        employerAddress,
        employeeAddress,
        streamId,
        streamKey,
        tokenSymbol,
        startDate: new Date(startTime * 1000),
        generatedDate: new Date(),
        ratePerSecond: rate,
        monthlyRate,
        totalStreamed: Math.max(totalStreamed, 0),
        totalWithdrawn: withdrawn,
        availableBalance: balance,
        buffered,
        status,
        networkName: "Sepolia",
        payrollContract:
          process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT || "",
      };

      generatePayslipPDF(payslipData);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={!hasDecryptedData || generating}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 backdrop-blur transition hover:border-blue-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      title={
        hasDecryptedData
          ? "Download payslip as PDF"
          : "Decrypt your salary first to generate a payslip"
      }
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {generating ? "Generating..." : "Download Payslip"}
    </button>
  );
}
