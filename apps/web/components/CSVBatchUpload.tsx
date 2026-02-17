"use client";

import { useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import { parseUnits } from "ethers";
import { encryptedPayrollContract } from "../lib/contracts/encryptedPayrollContract";
import { CONFIDENTIAL_DECIMALS, SUPPORTED_CHAIN_ID } from "../lib/config";
import { logger } from "../lib/logger";

interface CSVRow {
  employee: string;
  ratePerMonth: string;
  cadenceSeconds: number;
  valid: boolean;
  error?: string;
}

interface CreationStatus {
  index: number;
  status: "pending" | "encrypting" | "creating" | "success" | "error";
  txHash?: string;
  error?: string;
}

const TEMPLATE_CSV = `employee_address,rate_eth_per_month,cadence_seconds
0x1234567890abcdef1234567890abcdef12345678,0.5,2592000
0xabcdef1234567890abcdef1234567890abcdef12,1.0,1209600`;

export default function CSVBatchUpload() {
  const { address, chain } = useAccount();
  const { status: fhevmStatus, instance } = useFhevmContext();
  const fheReady = fhevmStatus === "ready";
  const isCorrectNetwork = chain?.id === SUPPORTED_CHAIN_ID;

  const [rows, setRows] = useState<CSVRow[]>([]);
  const [statuses, setStatuses] = useState<CreationStatus[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const payrollContract =
    process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() || "";

  // Parse CSV content
  const parseCSV = useCallback((content: string) => {
    setParseError(null);
    const lines = content.trim().split("\n");
    if (lines.length === 0) {
      setParseError("CSV file is empty.");
      return;
    }

    const header = lines[0]?.toLowerCase();
    const startIndex = header?.includes("employee") ? 1 : 0;

    if (lines.length <= startIndex) {
      setParseError("CSV file contains no data rows.");
      return;
    }

    const parsed: CSVRow[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.trim());
      if (cols.length < 3) {
        parsed.push({
          employee: cols[0] || "",
          ratePerMonth: cols[1] || "0",
          cadenceSeconds: 0,
          valid: false,
          error: `Row ${i + 1}: Expected 3 columns, found ${cols.length}`,
        });
        continue;
      }

      const [employee, rate, cadence] = cols;
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(employee);
      const rateNum = parseFloat(rate);
      const cadenceNum = parseInt(cadence);

      let error: string | undefined;
      if (!isValidAddress) error = "Invalid Ethereum address";
      else if (isNaN(rateNum) || rateNum <= 0) error = "Rate must be > 0";
      else if (isNaN(cadenceNum) || cadenceNum <= 0)
        error = "Cadence must be > 0";

      parsed.push({
        employee,
        ratePerMonth: rate,
        cadenceSeconds: cadenceNum || 2592000,
        valid: !error,
        error,
      });
    }

    if (parsed.length === 0) {
      setParseError("No valid rows found in CSV.");
      return;
    }

    setRows(parsed);
    setStatuses(parsed.map((_, i) => ({ index: i, status: "pending" })));
  }, []);

  // Handle file upload
  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        setParseError("Please upload a .csv file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) parseCSV(content);
      };
      reader.readAsText(file);
    },
    [parseCSV]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Download template
  const downloadTemplate = useCallback(() => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payproof-batch-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Clear all rows
  const clearRows = useCallback(() => {
    setRows([]);
    setStatuses([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Remove a single row
  const removeRow = useCallback(
    (index: number) => {
      setRows((prev) => prev.filter((_, i) => i !== index));
      setStatuses((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((s, i) => ({ ...s, index: i }))
      );
    },
    []
  );

  // Helper to convert bytes to hex string
  const toHex = (data: string | Uint8Array): string => {
    if (typeof data === "string") {
      return data.startsWith("0x") ? data : `0x${data}`;
    }
    return `0x${Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  };

  // Process all valid rows
  const processAll = useCallback(async () => {
    if (!instance || !address || !fheReady || !isCorrectNetwork) return;
    setProcessing(true);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.valid) {
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "error", error: row.error } : s
          )
        );
        continue;
      }

      try {
        // Encrypting phase
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "encrypting" } : s
          )
        );

        const ratePerMonth = parseUnits(row.ratePerMonth, CONFIDENTIAL_DECIMALS);
        const ratePerSecond = ratePerMonth / BigInt(30 * 24 * 60 * 60);

        if (ratePerSecond === 0n) {
          setStatuses((prev) =>
            prev.map((s, idx) =>
              idx === i
                ? { ...s, status: "error", error: "Rate too small (rounds to 0/sec)" }
                : s
            )
          );
          continue;
        }

        const input = instance.createEncryptedInput(payrollContract, address);
        input.add64(ratePerSecond);
        const enc = await input.encrypt();

        // Creating phase
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "creating" } : s
          )
        );

        const result = await encryptedPayrollContract.createStream(address, {
          employee: row.employee,
          encryptedRatePerSecond: toHex(enc.handles[0]),
          rateProof: toHex(enc.inputProof),
          cadenceInSeconds: row.cadenceSeconds,
          startTime: Math.floor(Date.now() / 1000),
        });

        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { ...s, status: "success", txHash: result.transactionHash }
              : s
          )
        );

        logger.log(`Stream ${i + 1} created: ${result.transactionHash}`);
      } catch (err: any) {
        logger.error(`Stream ${i + 1} failed:`, err);
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: "error",
                  error: err?.message || "Transaction failed",
                }
              : s
          )
        );
      }
    }

    setProcessing(false);
  }, [rows, instance, address, fheReady, isCorrectNetwork, payrollContract]);

  // Computed stats
  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
  const completedCount = statuses.filter((s) => s.status === "success").length;
  const errorCount = statuses.filter((s) => s.status === "error").length;
  const progressPercent =
    rows.length > 0
      ? Math.round(((completedCount + errorCount) / rows.length) * 100)
      : 0;

  const canProcess =
    fheReady &&
    isCorrectNetwork &&
    !!address &&
    validCount > 0 &&
    !processing &&
    completedCount < validCount;

  // Status badge helper
  const statusBadge = (status: CreationStatus) => {
    switch (status.status) {
      case "pending":
        return (
          <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Pending
          </span>
        );
      case "encrypting":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
            <span className="h-2 w-2 animate-spin rounded-full border border-blue-400 border-t-transparent" />
            Encrypting
          </span>
        );
      case "creating":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
            <span className="h-2 w-2 animate-spin rounded-full border border-purple-400 border-t-transparent" />
            Creating
          </span>
        );
      case "success":
        return (
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Created
          </span>
        );
      case "error":
        return (
          <span
            className="max-w-[200px] truncate rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400"
            title={status.error}
          >
            Failed
          </span>
        );
    }
  };

  // Format cadence for display
  const formatCadence = (seconds: number): string => {
    if (seconds >= 2592000) return `${Math.round(seconds / 2592000)}mo`;
    if (seconds >= 604800) return `${Math.round(seconds / 604800)}w`;
    if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-5">
      {/* Header row with template download */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            CSV Batch Upload
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Upload a CSV to create multiple encrypted streams at once.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Template
        </button>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition ${
            dragOver
              ? "border-sky-400 bg-sky-500/10"
              : "border-slate-700 bg-slate-950/40 hover:border-slate-500 hover:bg-slate-900/60"
          }`}
        >
          <svg
            className={`mb-3 h-10 w-10 ${dragOver ? "text-sky-400" : "text-slate-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium text-slate-300">
            {dragOver ? "Drop CSV file here" : "Drag & drop a CSV file, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Columns: employee_address, rate_eth_per_month, cadence_seconds
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {parseError}
        </p>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-300">
              {rows.length} row{rows.length !== 1 ? "s" : ""} total
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
                {invalidCount} invalid
              </span>
            )}
            {completedCount > 0 && (
              <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-400">
                {completedCount} created
              </span>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={clearRows}
              disabled={processing}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          {/* Progress bar (visible during or after processing) */}
          {(processing || completedCount > 0 || errorCount > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {processing
                    ? "Processing streams..."
                    : progressPercent === 100
                      ? "Batch complete"
                      : "Batch paused"}
                </span>
                <span>
                  {completedCount + errorCount}/{rows.length} ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    errorCount > 0 && completedCount === 0
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-sky-500 to-emerald-400"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/80">
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Rate/mo
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Cadence
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition ${
                      !row.valid
                        ? "bg-red-500/5"
                        : statuses[i]?.status === "success"
                          ? "bg-emerald-500/5"
                          : "bg-slate-900/40 hover:bg-slate-900/60"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.valid ? (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                        )}
                        <code className="text-xs text-slate-300">
                          {row.employee.slice(0, 6)}...{row.employee.slice(-4)}
                        </code>
                      </div>
                      {row.error && (
                        <p className="mt-1 text-xs text-red-400">
                          {row.error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {row.ratePerMonth} ETH
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {formatCadence(row.cadenceSeconds)}
                    </td>
                    <td className="px-4 py-3">
                      {statuses[i] && statusBadge(statuses[i])}
                    </td>
                    <td className="px-4 py-3">
                      {statuses[i]?.txHash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${statuses[i].txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:underline"
                        >
                          View tx
                        </a>
                      ) : !processing ? (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-xs text-slate-500 transition hover:text-red-400"
                          title="Remove row"
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FHE / network warnings */}
          {!fheReady && (
            <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              fhEVM is still initialising. Please wait before processing.
            </p>
          )}
          {!isCorrectNetwork && address && (
            <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Please switch to Sepolia testnet (Chain ID: {SUPPORTED_CHAIN_ID}) to proceed.
            </p>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={processAll}
            disabled={!canProcess}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            )}
            {processing
              ? `Processing ${completedCount + errorCount + 1} of ${rows.length}...`
              : completedCount === validCount && validCount > 0
                ? "All streams created"
                : `Encrypt & Create All (${validCount} stream${validCount !== 1 ? "s" : ""})`}
          </button>
        </>
      )}
    </div>
  );
}
