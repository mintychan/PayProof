"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import CipherBadge from "./CipherBadge";
import { useFhevmContext, type FHEDecryptRequest } from "fhevm-ts-sdk/react";
import { incomeOracleContract } from "../lib/contracts/incomeOracleContract";
import { parseEther } from "ethers";

const TIERS = [
  { label: "Tier A", description: "≥ 2× threshold" },
  { label: "Tier B", description: "≥ 1.1× threshold" },
  { label: "Tier C", description: "Meets threshold" }
];

export default function PoIAttestationPanel() {
  const { address: verifierAddress } = useAccount();
  const { status: fhevmStatus, error: fheError, instance, helpers } = useFhevmContext();
  const { useDecrypt, useEthersInterop } = helpers;
  const { ethersSigner } = useEthersInterop();
  const [threshold, setThreshold] = useState<string>("");
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [ciphertext, setCiphertext] = useState<{ handle: string; proof: string; summary: string } | null>(null);
  const [result, setResult] = useState<{ attestationId: string; txHash: string; meetsHandle: string; tierHandle: string } | null>(null);
  const [loadingState, setLoadingState] = useState<"idle" | "encrypting" | "verifying" | "checking">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [employer, setEmployer] = useState<string>("");
  const [decryptedResult, setDecryptedResult] = useState<{ meets: boolean; tier: number } | null>(null);

  const fheReady = fhevmStatus === "ready" || fhevmStatus === "sdk-initialized";
  const initializing = fhevmStatus === "loading";
  const ready = useMemo(() => fheReady && verifierAddress && Number(threshold) > 0 && lookbackDays > 0, [fheReady, verifierAddress, threshold, lookbackDays]);

  const oracleAddress = (process.env.NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT?.trim() ||
    "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB") as `0x${string}`;

  const fheErrorMessage = useMemo(() => {
    if (!fheError) return null;
    if (typeof fheError === "string") return fheError;
    if (fheError instanceof Error) return fheError.message;
    return String(fheError);
  }, [fheError]);

  const normalizeHandle = (value: string | null | undefined): `0x${string}` | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
  };

  const decryptRequests = useMemo<readonly FHEDecryptRequest[] | undefined>(() => {
    if (!result) return undefined;
    const handles = [
      normalizeHandle(result.meetsHandle),
      normalizeHandle(result.tierHandle),
    ].filter(Boolean) as `0x${string}`[];
    if (handles.length === 0) return undefined;
    return handles
      .map(
        (handle) =>
          ({
            handle,
            contractAddress: oracleAddress,
          }) as FHEDecryptRequest,
      ) as readonly FHEDecryptRequest[];
  }, [result, oracleAddress]);

  const {
    canDecrypt: canAttestationDecrypt,
    decrypt: triggerDecrypt,
    isDecrypting: attestationDecrypting,
    message: decryptMessage,
    results: decryptResults,
    error: decryptError,
    reset: resetDecrypt,
  } = useDecrypt({
    ethersSigner,
    requests: decryptRequests,
  });

  const decryptErrorMessage = decryptError ?? null;

  const coerceDecryptValue = (value: string | bigint | boolean | undefined): number | undefined => {
    if (typeof value === "undefined") return undefined;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "bigint") return Number(value);
    const numeric = Number(value);
    return Number.isNaN(numeric) ? undefined : numeric;
  };

  useEffect(() => {
    if (!result) {
      setDecryptedResult(null);
      return;
    }
    const meetsKey = normalizeHandle(result.meetsHandle);
    const tierKey = normalizeHandle(result.tierHandle);
    if (!meetsKey || !tierKey) return;
    const meetsValue = decryptResults[meetsKey];
    const tierValue = decryptResults[tierKey];
    const meetsNumeric = coerceDecryptValue(meetsValue);
    const tierNumeric = coerceDecryptValue(tierValue);
    if (typeof meetsNumeric === "undefined" || typeof tierNumeric === "undefined") return;
    setDecryptedResult({
      meets: meetsNumeric === 1,
      tier: tierNumeric,
    });
  }, [result, decryptResults]);

  useEffect(() => {
    if (!result) {
      resetDecrypt();
    }
  }, [result, resetDecrypt]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Clear previous results immediately
    setCiphertext(null);
    setResult(null);
    setDecryptedResult(null);

    if (!ready || !verifierAddress) {
      setFormError("Please connect your wallet first.");
      return;
    }

    // Validate employer address
    if (!employer || employer.length !== 42 || !employer.startsWith("0x")) {
      setFormError("Please enter a valid employer address");
      return;
    }

    // Start with checking phase immediately
    setLoadingState("checking");

    // Defer the async work to next tick to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      // Check if stream exists
      const streamExists = await incomeOracleContract.streamExists(employer, verifierAddress);
      if (!streamExists) {
        setFormError(`No active stream found between employer ${employer} and employee ${verifierAddress}`);
        setLoadingState("idle");
        return;
      }

      // Move to encrypting phase
      setLoadingState("encrypting");
      await new Promise(resolve => setTimeout(resolve, 0));

      // Convert threshold from ETH to wei (threshold is monthly amount in ETH)
      const thresholdWei = parseEther(threshold);
      console.log(`Threshold: ${threshold} ETH = ${thresholdWei} wei`);

      // Encrypt the threshold (in wei) using fhevm instance
      if (!instance) {
        throw new Error("FHEVM instance not ready");
      }
      const encryptedInput = instance.createEncryptedInput(oracleAddress, verifierAddress);
      encryptedInput.add128(thresholdWei);
      const { handles, inputProof } = await encryptedInput.encrypt();
      const enc = {
        handle: handles[0],
        proof: inputProof,
        summary: `Encrypted ${threshold} ETH threshold`
      };
      setCiphertext(enc);

      // Move to verifying phase
      setLoadingState("verifying");
      await new Promise(resolve => setTimeout(resolve, 0));

      // Call the on-chain oracle to attest income
      console.log("Calling oracle contract for attestation...");
      const attestation = await incomeOracleContract.attestMonthlyIncome(
        employer,
        verifierAddress,
        enc.handle,
        enc.proof,
        lookbackDays
      );

      console.log("Attestation result:", attestation);

      setResult({
        attestationId: attestation.attestationId,
        txHash: attestation.txHash,
        meetsHandle: attestation.meetsHandle,
        tierHandle: attestation.tierHandle,
      });
    } catch (err) {
      console.error("Attestation error:", err);
      setFormError((err as Error)?.message ?? "Failed to verify income on-chain");
    } finally {
      setLoadingState("idle");
    }
  };

  const handleDecryptResult = () => {
    if (!result) {
      setFormError("No attestation available to decrypt yet.");
      return;
    }
    if (!canAttestationDecrypt) {
      setFormError("Encrypted attestation not ready. Complete the request first.");
      return;
    }
    if (!ethersSigner) {
      setFormError("Wallet signer is not available for decryption.");
      return;
    }

    setFormError(null);
    resetDecrypt();
    triggerDecrypt();
  };

  return (
    <form className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" onSubmit={handleSubmit} data-testid="poi-form">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Request Proof-of-Income</h2>
          <p className="text-sm text-slate-400">Attest against an encrypted threshold — verifiers learn only the tier.</p>
        </div>
        <CipherBadge label={ready ? "FHE ready" : initializing ? "Initialising fhEVM" : "Awaiting inputs"} />
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Employer Address</span>
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 font-mono text-sm"
          type="text"
          placeholder="0x..."
          required
          value={employer}
          onChange={(event) => setEmployer(event.target.value)}
          name="employer"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Threshold (ETH)</span>
        <input
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          type="number"
          min="0"
          step="any"
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
        className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        disabled={!ready || loadingState !== "idle"}
      >
        {loadingState !== "idle" && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
        )}
        {loadingState === "checking"
          ? "Checking stream…"
          : loadingState === "encrypting"
          ? "Encrypting…"
          : loadingState === "verifying"
          ? "Verifying on-chain…"
          : "Encrypt & Request Proof"}
      </button>
      {formError ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">{formError}</p>
      ) : null}
      {fheErrorMessage ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">{fheErrorMessage}</p>
      ) : null}
      {ciphertext ? (
        <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-200" data-testid="threshold-ciphertext">
          <p className="font-semibold">Encrypted threshold payload</p>
          <p>Handle: <code className="break-all text-emerald-100">{ciphertext.handle}</code></p>
          <p>Proof: <code className="break-all text-emerald-100">{ciphertext.proof}</code></p>
          <p className="text-emerald-300/80">{ciphertext.summary}</p>
        </div>
      ) : null}
      {result ? (
        <div className="grid gap-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-200" data-testid="attestation-result">
          <div>
            <p className="text-xs text-emerald-400 mb-1">✓ On-chain Attestation Successful</p>
            <p className="text-sm text-slate-300">
              Your income has been verified on the blockchain using fully homomorphic encryption.
            </p>
          </div>

          <div className="grid gap-2 rounded border border-slate-800/50 bg-slate-950/50 p-3 text-xs">
            <div>
              <p className="text-slate-500">Transaction Hash</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-sky-400 hover:text-sky-300 break-all"
              >
                {result.txHash}
              </a>
            </div>
            <div>
              <p className="text-slate-500">Attestation ID</p>
              <p className="font-mono text-xs text-slate-300 break-all">
                {result.attestationId}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Encrypted Handles</p>
              <p className="font-mono text-xs text-slate-400">
                Meets: {result.meetsHandle.slice(0, 20)}...
              </p>
              <p className="font-mono text-xs text-slate-400">
                Tier: {result.tierHandle.slice(0, 20)}...
              </p>
            </div>
          </div>

          <div className="rounded border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-sky-200">
            <p className="font-semibold mb-1">🔒 Privacy Preserved</p>
            <p className="text-xs text-sky-300/80">
              The oracle verified your income without revealing the actual amount. Only the encrypted result is stored on-chain.
            </p>
          </div>

          {/* Decrypt Result Button */}
          {result && !decryptedResult && (
            <button
              type="button"
              onClick={handleDecryptResult}
              disabled={!canAttestationDecrypt || attestationDecrypting}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {attestationDecrypting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {attestationDecrypting ? "Decrypting..." : "🔓 Decrypt Result"}
            </button>
          )}

          {result && !decryptedResult && decryptMessage && (
            <p className="text-xs text-slate-400 text-center">{decryptMessage}</p>
          )}

          {decryptErrorMessage ? (
            <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {decryptErrorMessage}
            </p>
          ) : null}

          {/* Decrypted Result */}
          {decryptedResult && (
            <div className={`rounded-2xl border p-4 ${
              decryptedResult.meets
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {decryptedResult.meets ? "✅" : "❌"}
                </span>
                <div className="flex-1">
                  <p className={`text-lg font-semibold ${
                    decryptedResult.meets ? "text-emerald-200" : "text-red-200"
                  }`}>
                    {decryptedResult.meets ? "Threshold Met!" : "Threshold Not Met"}
                  </p>
                  <p className={`text-sm mt-1 ${
                    decryptedResult.meets ? "text-emerald-300/80" : "text-red-300/80"
                  }`}>
                    {decryptedResult.meets
                      ? `Your income meets or exceeds the threshold of ${threshold} ETH over ${lookbackDays} days`
                      : `Your income is below the threshold of ${threshold} ETH over ${lookbackDays} days`
                    }
                  </p>
                  {decryptedResult.meets && decryptedResult.tier > 0 && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-xs text-slate-400">Income Tier</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {decryptedResult.tier === 3 ? "Tier A (≥ 2× threshold)" :
                         decryptedResult.tier === 2 ? "Tier B (≥ 1.1× threshold)" :
                         decryptedResult.tier === 1 ? "Tier C (Meets threshold)" :
                         "No tier"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
