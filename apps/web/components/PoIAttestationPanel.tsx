"use client";

import { FormEvent, useMemo, useState } from "react";
import CipherBadge from "./CipherBadge";
import { encryptNumber } from "../lib/crypto/encryption";

const TIERS = [
  { label: "Tier A", description: "≥ 2× threshold" },
  { label: "Tier B", description: "≥ 1.1× threshold" },
  { label: "Tier C", description: "Meets threshold" }
];

export default function PoIAttestationPanel() {
  const [threshold, setThreshold] = useState<string>("");
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [ciphertext, setCiphertext] = useState<string>("");
  const [result, setResult] = useState<{ meets: boolean; tier: string; attestationHash: string } | null>(null);

  const ready = useMemo(() => Number(threshold) > 0 && lookbackDays > 0, [threshold, lookbackDays]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enc = encryptNumber(Number(threshold));
    setCiphertext(enc);
    const meets = Number(threshold) <= 5_000;
    const tier = meets ? (Number(threshold) <= 2_500 ? "A" : Number(threshold) <= 3_500 ? "B" : "C") : "-";
    const attestationHash = crypto.randomUUID();
    setResult({
      meets,
      tier,
      attestationHash
    });
  };

  return (
    <form className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" onSubmit={handleSubmit} data-testid="poi-form">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Request Proof-of-Income</h2>
          <p className="text-sm text-slate-400">Attest against an encrypted threshold — verifiers learn only the tier.</p>
        </div>
        <CipherBadge />
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Threshold (encrypted units)</span>
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          type="number"
          min="1"
          required
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          name="threshold"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Lookback window (days)</span>
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          type="number"
          min="1"
          required
          value={lookbackDays}
          onChange={(event) => setLookbackDays(Number(event.target.value))}
          name="lookback"
        />
      </label>
      <div className="grid gap-2 rounded border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">Tiering rubric</p>
        <ul className="list-disc space-y-1 pl-4">
          {TIERS.map((tier) => (
            <li key={tier.label}>
              <span className="font-semibold text-slate-100">{tier.label}:</span> {tier.description}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="submit"
        className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        disabled={!ready}
      >
        Encrypt &amp; Request Proof
      </button>
      {ciphertext ? (
        <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-200" data-testid="threshold-ciphertext">
          <p className="font-semibold">Encrypted threshold payload</p>
          <code className="break-all text-emerald-100">{ciphertext}</code>
        </div>
      ) : null}
      {result ? (
        <div className="grid gap-2 rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200" data-testid="attestation-result">
          <p>
            Outcome: <strong>{result.meets ? "Threshold met" : "Threshold not met"}</strong>
          </p>
          <p>Tier: {result.tier}</p>
          <p className="text-xs text-slate-400">Attestation ID: {result.attestationHash}</p>
        </div>
      ) : null}
    </form>
  );
}
