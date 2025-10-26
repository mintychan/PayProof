"use client";

import { useQuery } from "@tanstack/react-query";
import { useFhevm } from "fhevm-ts-sdk/react";

interface PayslipDataParams {
  employeeAddress: string | undefined;
  periodIncome: number;
  ytdIncome: number;
  enabled?: boolean;
}

export function usePayslipData({
  employeeAddress,
  periodIncome,
  ytdIncome,
  enabled = true,
}: PayslipDataParams) {
  const { encryptNumber, ready: fheReady } = useFhevm();

  const payrollContract =
    process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() ||
    "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

  return useQuery({
    queryKey: ["payslip", employeeAddress, periodIncome, ytdIncome],
    queryFn: async () => {
      if (!employeeAddress) {
        throw new Error("Employee address is required");
      }

      const [period, ytd] = await Promise.all([
        encryptNumber({
          value: periodIncome,
          bitSize: 64,
          contractAddress: payrollContract,
          userAddress: employeeAddress,
        }),
        encryptNumber({
          value: ytdIncome,
          bitSize: 128,
          contractAddress: payrollContract,
          userAddress: employeeAddress,
        }),
      ]);

      return { period, ytd };
    },
    enabled: enabled && fheReady && Boolean(employeeAddress),
    staleTime: 60_000, // Cache for 1 minute
    retry: 2,
  });
}
