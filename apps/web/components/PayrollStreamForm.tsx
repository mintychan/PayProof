"use client";

import { FormEvent, useMemo, useState } from "react";
import CipherBadge from "./CipherBadge";
import NetworkStatus from "./NetworkStatus";
import { encryptNumber } from "../lib/crypto/encryption";

const CADENCE_OPTIONS = [
  { label: "Monthly", seconds: 30 * 24 * 60 * 60 },
  { label: "Bi-weekly", seconds: 14 * 24 * 60 * 60 },
  { label: "Weekly", seconds: 7 * 24 * 60 * 60 }
];

export default function PayrollStreamForm() {
  const [employerAddress, setEmployerAddress] = useState<string>("");
  const [employeeAddress, setEmployeeAddress] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [cadence, setCadence] = useState<number>(CADENCE_OPTIONS[0].seconds);
  const [encryptionPreview, setEncryptionPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const encryptionReady = useMemo(() => {
    return Boolean(employerAddress && employeeAddress && rate && Number(rate) > 0);
  }, [employerAddress, employeeAddress, rate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const encrypted = encryptNumber(Number(rate));
    setEncryptionPreview(encrypted);
    setResult(
      `Stream for ${employeeAddress.slice(0, 8)}… will accrue ${rate} units every ${cadence / (24 * 60 * 60)} day(s).`
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:items-start">
      <form
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
        onSubmit={handleSubmit}
        data-testid="stream-form"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Confidential Stream</h2>
          <CipherBadge label={encryptionReady ? "Encryption ready" : "Add inputs"} />
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Employer wallet</span>
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
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
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            placeholder="0xABCD…"
            value={employeeAddress}
            onChange={(event) => setEmployeeAddress(event.target.value)}
            required
            name="employee"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-300">Stream rate (encrypted units / second)</span>
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
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
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
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
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          disabled={!encryptionReady}
        >
          Encrypt &amp; Create Stream
        </button>
        {encryptionPreview ? (
          <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-200" data-testid="encryption-preview">
            <p className="font-semibold">Encryption payload</p>
            <code className="break-all text-emerald-100">{encryptionPreview}</code>
          </div>
        ) : null}
        {result ? (
          <p className="rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200" data-testid="stream-result">
            {result}
          </p>
        ) : null}
      </form>
      <aside className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
        <h3 className="text-base font-semibold text-white">Network readiness</h3>
        <p className="text-xs text-slate-400">
          Verify RPC health before recording the demo. Both the Protocol testnet and Sepolia Coprocessor should respond to `eth_chainId`.
        </p>
        <NetworkStatus />
        <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Demo prompts</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Encrypt inputs client-side before submitting.
            </li>
            <li>Show the ciphertext payload in the UI.
            </li>
            <li>Record the transaction hash and stream ID for README updates.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
