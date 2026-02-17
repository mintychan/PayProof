"use client";

import { useState } from "react";
import { parseUnits } from "ethers";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import CipherBadge from "../CipherBadge";
import { confidentialVestingContract } from "../../lib/contracts/confidentialVestingContract";
import { ConfidentialEthContract } from "../../lib/contracts/confidentialEthContract";
import { useFhevmHelpers } from "../../hooks/useFhevmHelpers";

const CONFIDENTIAL_DECIMALS = 6;

export function VestingCreateForm() {
  const { address } = useAccount();
  const { status: fhevmStatus } = useFhevmContext();
  const { encryptAmount64 } = useFhevmHelpers();

  const [form, setForm] = useState({
    beneficiary: "",
    amount: "",
    durationDays: 30,
    cliffDays: 0,
    initialUnlockBps: 0,
    cancelable: true,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = fhevmStatus === "ready" && !!address;

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  };

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!ready) {
      setError("Connect wallet and wait for fhEVM");
      return;
    }
    if (!form.beneficiary || form.beneficiary.length !== 42 || !form.beneficiary.startsWith("0x")) {
      setError("Enter a valid beneficiary address");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    try {
      setBusy(true);
      const amount = parseUnits(form.amount, CONFIDENTIAL_DECIMALS);

      const vestingAddr = confidentialVestingContract.getAddress();
      const cethAddr = process.env.NEXT_PUBLIC_PAYPROOF_CONFIDENTIAL_TOKEN || "";
      if (!vestingAddr || !cethAddr) throw new Error("Missing contract addresses");

      const ceth = new ConfidentialEthContract(cethAddr);
      setMessage("Wrapping ETH into cETH…");
      await ceth.wrapNative(form.amount, address!);

      setMessage("Setting operator for vault…");
      await ceth.ensureOperator(vestingAddr);

      setMessage("Encrypting amount…");
      const encrypted = await encryptAmount64(vestingAddr, amount);
      const start = Math.floor(Date.now() / 1000);
      const cliff = start + form.cliffDays * 86400;

      setMessage("Submitting createVesting…");
      await confidentialVestingContract.createVesting({
        beneficiary: form.beneficiary,
        start,
        cliff,
        duration: form.durationDays * 86400,
        initialUnlockBps: form.initialUnlockBps,
        cancelable: form.cancelable,
        encryptedAmount: encrypted.handle,
        amountProof: encrypted.proof,
      });

      setMessage("Vesting created!");
    } catch (e: any) {
      setError(e?.message || "Failed to create vesting");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/5 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Create Confidential Vesting</h2>
          <p className="text-xs text-slate-400">Wrap cETH, encrypt locally, and dispatch to the vault.</p>
        </div>
        <CipherBadge label={ready ? "FHE ready" : "Awaiting fhEVM"} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-slate-200">
          Beneficiary
          <input className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100" value={form.beneficiary} onChange={onChange("beneficiary")} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Amount (cETH, 6 decimals)
          <input className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100" value={form.amount} onChange={onChange("amount")} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Duration (days)
          <input type="number" className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100" value={form.durationDays} onChange={onChange("durationDays")} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Cliff (days)
          <input type="number" className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100" value={form.cliffDays} onChange={onChange("cliffDays")} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Initial unlock (bps)
          <input type="number" className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100" value={form.initialUnlockBps} onChange={onChange("initialUnlockBps")} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={form.cancelable} onChange={onChange("cancelable")} /> Cancelable
        </label>
      </div>
      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={!ready || busy}
        className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        {busy ? "Submitting…" : "Create Vesting"}
      </button>
    </div>
  );
}
