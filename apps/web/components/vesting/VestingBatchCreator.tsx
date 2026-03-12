"use client";

import { useMemo, useState } from "react";
import { BrowserProvider, Interface, parseUnits } from "ethers";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";

import CipherBadge from "../CipherBadge";
import { confidentialVestingContract } from "../../lib/contracts/confidentialVestingContract";
import { ConfidentialEthContract } from "../../lib/contracts/confidentialEthContract";
import { CONFIDENTIAL_VESTING_ABI } from "../../lib/contracts/ConfidentialVestingABI";
import { useFhevmHelpers } from "../../hooks/useFhevmHelpers";

const CONFIDENTIAL_DECIMALS = 6;

type CsvRow = {
  beneficiary: string;
  amount: string;
  durationDays: number;
  cliffDays: number;
  initialUnlockBps: number;
  cancelable: boolean;
  start?: number;
};

type PreparedRow = CsvRow & {
  encrypted: { handle: string; proof: string };
  start: number;
};

const csvTemplate = `beneficiary,amount,durationDays,cliffDays,initialUnlockBps,cancelable,start(optional)
0x0000000000000000000000000000000000000001,100,30,0,0,true,
0x0000000000000000000000000000000000000002,250.5,180,30,500,true,`; // last column is seconds since epoch if provided

export function VestingBatchCreator() {
  const { address } = useAccount();
  const { status: fheStatus, error: fheError } = useFhevmContext();
  const { encryptAmount64 } = useFhevmHelpers();

  const [csv, setCsv] = useState(csvTemplate);
  const [rows, setRows] = useState<PreparedRow[]>([]);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [safeUrl, setSafeUrl] = useState<string | null>(null);

  const ready = useMemo(() => fheStatus === "ready" && !!address, [fheStatus, address]);

  const parseCsv = (): CsvRow[] => {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error("CSV is empty");
    const [, ...dataLines] = lines; // skip header
    return dataLines.map((line, idx) => {
      const parts = line.split(/\s*,\s*/);
      if (parts.length < 6) throw new Error(`Row ${idx + 2} has too few columns`);
      const [beneficiary, amount, durationDays, cliffDays, initialUnlockBps, cancelable, start] = parts;
      if (!beneficiary || beneficiary.length !== 42 || !beneficiary.startsWith("0x")) {
        throw new Error(`Row ${idx + 2}: invalid beneficiary`);
      }
      if (!amount || Number(amount) <= 0) throw new Error(`Row ${idx + 2}: amount must be > 0`);
      const toNumber = (v: string, label: string) => {
        const n = Number(v || 0);
        if (Number.isNaN(n) || n < 0) throw new Error(`Row ${idx + 2}: invalid ${label}`);
        return n;
      };
      const parsedCancelable = typeof cancelable === "string" ? /^(true|1)$/i.test(cancelable) : Boolean(cancelable);
      const parsedStart = start && start.length ? Number(start) : undefined;

      return {
        beneficiary,
        amount,
        durationDays: toNumber(durationDays, "duration"),
        cliffDays: toNumber(cliffDays, "cliff"),
        initialUnlockBps: toNumber(initialUnlockBps, "initialUnlockBps"),
        cancelable: parsedCancelable,
        start: parsedStart,
      };
    });
  };

  const prepare = async () => {
    setBusy(true);
    setError(null);
    setLog(null);
    setSafeUrl(null);
    try {
      if (!ready) throw new Error("Connect wallet and wait for fhEVM");
      const vestingAddr = confidentialVestingContract.getAddress();
      const parsed = parseCsv();

      const prepared: PreparedRow[] = [];
      for (const row of parsed) {
        const amount = parseUnits(row.amount, CONFIDENTIAL_DECIMALS);
        const encrypted = await encryptAmount64(vestingAddr, amount);
        prepared.push({ ...row, encrypted, start: row.start ?? Math.floor(Date.now() / 1000) });
      }
      setRows(prepared);
      setLog(`Prepared ${prepared.length} vesting calls with encrypted amounts.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message :"Failed to prepare batch");
    } finally {
      setBusy(false);
    }
  };

  const executeBatch = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError(null);
    setLog(null);
    try {
      if (!ready) throw new Error("Connect wallet and wait for fhEVM");
      const vestingAddr = confidentialVestingContract.getAddress();
      const cethAddr = process.env.NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_TOKEN || "";
      if (!vestingAddr || !cethAddr) throw new Error("Missing vesting or cETH address");

      const ceth = new ConfidentialEthContract(cethAddr);
      await ceth.ensureOperator(vestingAddr);

      for (const row of rows) {
        await ceth.wrapNative(row.amount, address!);
        await confidentialVestingContract.createVesting({
          beneficiary: row.beneficiary,
          start: row.start,
          cliff: row.start + row.cliffDays * 86400,
          duration: row.durationDays * 86400,
          initialUnlockBps: row.initialUnlockBps,
          cancelable: row.cancelable,
          encryptedAmount: row.encrypted.handle,
          amountProof: row.encrypted.proof,
        });
      }
      setLog(`Submitted ${rows.length} createVesting txs`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message :"Batch execution failed");
    } finally {
      setBusy(false);
    }
  };

  const generateSafeFile = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError(null);
    setLog(null);
    try {
      const vestingAddr = confidentialVestingContract.getAddress();
      const provider = new BrowserProvider((window as unknown as { ethereum: import("ethers").Eip1193Provider }).ethereum);
      const network = await provider.getNetwork();
      const iface = new Interface(CONFIDENTIAL_VESTING_ABI);

      const payload = {
        version: "1.0",
        chainId: network.chainId.toString(),
        createdAt: Date.now(),
        meta: {
          name: "PayProof Confidential Vesting Batch",
          description: `Batch of ${rows.length} createVesting calls for Safe Transaction Builder`,
          txBuilderVersion: "1.16.3",
        },
        transactions: rows.map((row) => ({
          to: vestingAddr,
          value: "0",
          data: iface.encodeFunctionData("createVesting", [
            row.beneficiary,
            row.start,
            row.start + row.cliffDays * 86400,
            row.durationDays * 86400,
            row.initialUnlockBps,
            row.cancelable,
            row.encrypted.handle,
            row.encrypted.proof,
          ]),
          operation: 0,
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      setSafeUrl(url);
      setLog("Safe batch JSON ready. Download and import into the Safe Transaction Builder.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message :"Failed to generate Safe batch file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/5 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Safe / CSV Batch Creator</h2>
          <p className="text-xs text-slate-400">Paste recipients, encrypt amounts, then execute or export a Safe batch.</p>
        </div>
        <CipherBadge label={ready ? "FHE ready" : "Awaiting fhEVM"} />
      </div>

      <textarea
        className="w-full min-h-[180px] rounded-2xl border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs text-slate-100"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={prepare}
          disabled={!ready || busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {busy ? "Working…" : "Prepare & Encrypt"}
        </button>
        <button
          onClick={executeBatch}
          disabled={!rows.length || busy}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Execute On-Chain
        </button>
        <button
          onClick={generateSafeFile}
          disabled={!rows.length || busy}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Export Safe JSON
        </button>
        {safeUrl && (
          <a
            href={safeUrl}
            download={`payproof-vesting-batch-${Date.now()}.json`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Download Safe Batch
          </a>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3">
          <p className="text-xs uppercase text-slate-500">Prepared Rows</p>
          <div className="mt-2 grid gap-2 text-xs text-slate-200">
            {rows.map((row, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{row.beneficiary}</span>
                  <span className="text-slate-400">{row.amount} cETH • {row.durationDays}d</span>
                </div>
                <div className="mt-1 grid gap-1 text-[11px] text-slate-400">
                  <span>cliff {row.cliffDays}d • initial {row.initialUnlockBps} bps • cancelable {row.cancelable ? "yes" : "no"}</span>
                  <span className="break-all">handle {row.encrypted.handle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {log && <p className="text-sm text-emerald-300">{log}</p>}
      {(error || fheError) && <p className="text-sm text-red-400">{error || (typeof fheError === "string" ? fheError : fheError instanceof Error ? fheError.message : String(fheError))}</p>}
    </div>
  );
}
