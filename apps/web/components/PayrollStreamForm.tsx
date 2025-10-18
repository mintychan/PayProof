"use client";

import { FormEvent, useMemo, useState } from "react";
import CipherBadge from "./CipherBadge";
import { useFhevm } from "../providers/FhevmProvider";

const CADENCE_OPTIONS = [
  { label: "Monthly", seconds: 30 * 24 * 60 * 60 },
  { label: "Bi-weekly", seconds: 14 * 24 * 60 * 60 },
  { label: "Weekly", seconds: 7 * 24 * 60 * 60 }
];

export default function PayrollStreamForm() {
  const { encryptNumber, ready, initializing, error: fheError } = useFhevm();
  const [employerAddress, setEmployerAddress] = useState<string>("");
  const [employeeAddress, setEmployeeAddress] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [cadence, setCadence] = useState<number>(CADENCE_OPTIONS[0].seconds);
  const [encryptionPreview, setEncryptionPreview] = useState<{ handle: string; proof: string; summary: string } | null>(null);
  const [result, setResult] = useState<string>("");
  const [encrypting, setEncrypting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const encryptionReady = useMemo(() => {
    return ready && Boolean(employerAddress && employeeAddress && rate && Number(rate) > 0);
  }, [ready, employerAddress, employeeAddress, rate]);

  const payrollContract = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() || "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!encryptionReady) {
      setFormError("fhEVM is still initialising. Please try again in a moment.");
      return;
    }

    try {
      setEncrypting(true);
      const encrypted = await encryptNumber({
        value: Number(rate),
        bitSize: 64,
        contractAddress: payrollContract,
        userAddress: employerAddress
      });
      setEncryptionPreview(encrypted);
      setResult(
        `Stream for ${employeeAddress.slice(0, 8)}… will accrue ${rate} units every ${cadence / (24 * 60 * 60)} day(s). Handle ${encrypted.handle.slice(0, 10)}…`
      );
    } catch (err) {
      const message = (err as Error)?.message ?? "Encryption failed";
      setFormError(message);
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} data-testid="stream-form">
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Create Confidential Stream</h2>
          <p className="text-xs text-slate-400">Inputs are encrypted client-side and stored privately on-chain.</p>
        </div>
        <CipherBadge
          label={
            encryptionReady
              ? "FHE ready"
              : initializing
                ? "Initialising fhEVM"
                : "Awaiting inputs"
          }
        />
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Employer wallet</span>
        <input
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          placeholder="0x1234…"
          value={employerAddress}
          onChange={(event) => setEmployerAddress(event.target.value)}
          required
          name="employer"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Employee wallet</span>
        <input
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          placeholder="0xABCD…"
          value={employeeAddress}
          onChange={(event) => setEmployeeAddress(event.target.value)}
          required
          name="employee"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Stream rate (encrypted units / second)</span>
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            type="number"
            min="1"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            required
            name="rate"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Cadence</span>
          <select
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            value={cadence}
            onChange={(event) => setCadence(Number(event.target.value))}
            name="cadence"
          >
            {CADENCE_OPTIONS.map((option) => (
              <option key={option.seconds} value={option.seconds}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!encryptionReady || encrypting}
      >
        {encrypting ? "Encrypting…" : "Encrypt & Create Stream"}
      </button>
      {formError ? (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {formError}
        </p>
      ) : null}
      {fheError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {fheError}
        </p>
      ) : null}
      {encryptionPreview ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-xs text-emerald-200" data-testid="encryption-preview">
          <p className="font-semibold text-emerald-100">Encrypted rate payload</p>
          <p className="mt-2">Handle: <code className="break-all text-emerald-100/90">{encryptionPreview.handle}</code></p>
          <p className="mt-2">Proof: <code className="break-all text-emerald-100/90">{encryptionPreview.proof}</code></p>
          <p className="mt-3 text-emerald-200/80">{encryptionPreview.summary}</p>
        </div>
      ) : null}
      {result ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200" data-testid="stream-result">
          {result}
        </p>
      ) : null}
    </form>
  );
}
