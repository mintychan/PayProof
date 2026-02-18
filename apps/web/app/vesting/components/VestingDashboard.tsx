"use client";

import { useState, useMemo, Suspense } from "react";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import { confidentialVestingContract } from "../../../lib/contracts/confidentialVestingContract";
import CipherBadge from "../../../components/CipherBadge";
import { VestingCreateForm } from "../../../components/vesting/VestingCreateForm";
import { VestingBatchCreator } from "../../../components/vesting/VestingBatchCreator";
import { VestingWithdrawCard } from "../../../components/vesting/VestingWithdrawCard";

export function VestingDashboard() {
  const { address } = useAccount();
  const { status: fhevmStatus, error: fheError } = useFhevmContext();
  const [vestingIdInput, setVestingIdInput] = useState<string>("");
  const [schedule, setSchedule] = useState<any | null>(null);
  const [handles, setHandles] = useState<{ total: string; released: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = useMemo(() => fhevmStatus === "ready" && !!address, [fhevmStatus, address]);
  const fheErrorMessage = useMemo(() => {
    if (!fheError) return null;
    if (typeof fheError === "string") return fheError;
    if (fheError instanceof Error) return fheError.message;
    return String(fheError);
  }, [fheError]);

  const fetchSchedule = async () => {
    setError(null);
    setSchedule(null);
    setHandles(null);
    if (!ready) {
      setError("Connect wallet and wait for fhEVM");
      return;
    }
    if (!vestingIdInput.trim()) {
      setError("Enter a vesting ID");
      return;
    }
    try {
      setLoading(true);
      const scheduleData = await confidentialVestingContract.getSchedule(vestingIdInput.trim());
      const [totalHandle, releasedHandle] = await confidentialVestingContract.encryptedAmounts(vestingIdInput.trim());
      setSchedule(scheduleData);
      setHandles({ total: totalHandle, released: releasedHandle });
    } catch (e: any) {
      setError(e?.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-white/5 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Vesting Vault Console</h2>
          <p className="text-slate-400">Lookup confidential vesting schedules and decrypt balances client-side.</p>
        </div>
        <CipherBadge label={ready ? "FHE ready" : "Awaiting fhEVM"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          placeholder="Enter vesting ID (uint256)"
          value={vestingIdInput}
          onChange={(e) => setVestingIdInput(e.target.value)}
        />
        <button
          onClick={fetchSchedule}
          disabled={!ready || loading}
          className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Loading…" : "Fetch"}
        </button>
      </div>

      {fheErrorMessage && <p className="text-sm text-amber-400">{fheErrorMessage}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {schedule && (
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-slate-200">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Sponsor</p>
              <p className="font-mono text-sm">{schedule.sponsor}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Beneficiary</p>
              <p className="font-mono text-sm">{schedule.beneficiary}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Start</p>
              <p className="text-sm">{new Date(Number(schedule.start) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Cliff</p>
              <p className="text-sm">{new Date(Number(schedule.cliff) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Duration (days)</p>
              <p className="text-sm">{Number(schedule.duration) / 86400}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Cancelable</p>
              <p className="text-sm">{schedule.cancelable ? "Yes" : "No"}</p>
            </div>
          </div>
          {handles && (
            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <p>Encrypted total handle: <span className="break-all font-mono">{handles.total}</span></p>
              <p>Encrypted released handle: <span className="break-all font-mono">{handles.released}</span></p>
              <p className="text-slate-500">Decrypt amounts locally with the fhEVM SDK (requires access permissions).</p>
            </div>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <VestingCreateForm />
            <VestingWithdrawCard />
          </div>
          <VestingBatchCreator />
        </>
      </Suspense>
    </div>
  );
}
