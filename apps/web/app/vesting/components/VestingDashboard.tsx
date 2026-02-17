"use client";

import { useState, useMemo, Suspense } from "react";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import { confidentialVestingContract } from "../../../lib/contracts/confidentialVestingContract";
import CipherBadge from "../../../components/CipherBadge";
import { VestingCreateForm } from "../../../components/vesting/VestingCreateForm";
import { VestingBatchCreator } from "../../../components/vesting/VestingBatchCreator";
import { VestingWithdrawCard } from "../../../components/vesting/VestingWithdrawCard";
import { parseUnits } from "ethers";
import { useFhevmHelpers } from "../../../hooks/useFhevmHelpers";

const CONFIDENTIAL_DECIMALS = 6;

export function VestingDashboard() {
  const { address } = useAccount();
  const { status: fhevmStatus, error: fheError } = useFhevmContext();
  const [vestingIdInput, setVestingIdInput] = useState<string>("");
  const [schedule, setSchedule] = useState<any | null>(null);
  const [handles, setHandles] = useState<{ total: string; released: string } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { encryptAmount64 } = useFhevmHelpers();

  const [createForm, setCreateForm] = useState({
    beneficiary: "",
    amount: "",
    durationDays: 30,
    cliffDays: 0,
    initialUnlockBps: 0,
    cancelable: true,
  });

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

  const handleCreate = async () => {
    setError(null);
    if (!ready) {
      setError("Connect wallet and wait for fhEVM");
      return;
    }
    if (!createForm.beneficiary || createForm.beneficiary.length !== 42 || !createForm.beneficiary.startsWith("0x")) {
      setError("Enter a valid beneficiary address");
      return;
    }
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      setError("Enter a positive amount");
      return;
    }
    try {
      setCreateLoading(true);
      const amount64 = parseUnits(createForm.amount, CONFIDENTIAL_DECIMALS);
      const vestingAddress = confidentialVestingContract.getAddress();
      const encrypted = await encryptAmount64(vestingAddress, amount64);
      const start = Math.floor(Date.now() / 1000);
      const cliff = start + createForm.cliffDays * 86400;
      const duration = createForm.durationDays * 86400;

      const tx = await confidentialVestingContract.createVesting({
        beneficiary: createForm.beneficiary,
        start,
        cliff,
        duration,
        initialUnlockBps: createForm.initialUnlockBps,
        cancelable: createForm.cancelable,
        encryptedAmount: encrypted.handle,
        amountProof: encrypted.proof,
      });

      setVestingIdInput(tx.receipt?.logs?.[0]?.topics?.[1] ? BigInt(tx.receipt.logs[0].topics[1]).toString() : "");
    } catch (e: any) {
      setError(e?.message || "Failed to create vesting");
    } finally {
      setCreateLoading(false);
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

      <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Create test vesting</p>
            <p className="text-sm text-slate-300">Encrypt locally, then send to the vault (cETH funding required).</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={!ready || createLoading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {createLoading ? "Creating…" : "Create"}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Beneficiary</span>
            <input
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={createForm.beneficiary}
              onChange={(e) => setCreateForm((f) => ({ ...f, beneficiary: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Amount (cETH, 6 decimals)</span>
            <input
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={createForm.amount}
              onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Duration (days)</span>
            <input
              type="number"
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={createForm.durationDays}
              onChange={(e) => setCreateForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Cliff (days)</span>
            <input
              type="number"
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={createForm.cliffDays}
              onChange={(e) => setCreateForm((f) => ({ ...f, cliffDays: Number(e.target.value) }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-slate-300">Initial unlock (BPS)</span>
            <input
              type="number"
              className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={createForm.initialUnlockBps}
              onChange={(e) => setCreateForm((f) => ({ ...f, initialUnlockBps: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={createForm.cancelable}
              onChange={(e) => setCreateForm((f) => ({ ...f, cancelable: e.target.checked }))}
            />
            Cancelable
          </label>
        </div>
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
