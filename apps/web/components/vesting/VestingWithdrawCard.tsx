"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import CipherBadge from "../CipherBadge";
import { confidentialVestingContract } from "../../lib/contracts/confidentialVestingContract";

export function VestingWithdrawCard() {
  const { address } = useAccount();

  const [vestingId, setVestingId] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) setTo(address);
  }, [address]);

  const ready = useMemo(() => !!address, [address]);

  const withdraw = async () => {
    setMessage(null);
    setError(null);
    if (!vestingId.trim()) {
      setError("Enter a vesting ID");
      return;
    }
    if (!to || !to.startsWith("0x") || to.length !== 42) {
      setError("Enter a valid recipient address");
      return;
    }
    try {
      setBusy(true);
      await confidentialVestingContract.withdraw(vestingId.trim(), to);
      setMessage("Withdrawal submitted. It may take a few blocks to settle.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-3xl border border-white/5 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Recipient Withdrawal</h2>
          <p className="text-xs text-slate-400">Beneficiaries can pull vested funds to any address.</p>
        </div>
        <CipherBadge label={ready ? "Wallet ready" : "Connect wallet"} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-200">
          Vesting ID (uint256)
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
            value={vestingId}
            onChange={(e) => setVestingId(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Withdraw to
          <input
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={withdraw}
        disabled={!ready || busy}
        className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        {busy ? "Submitting…" : "Withdraw"}
      </button>
    </div>
  );
}
