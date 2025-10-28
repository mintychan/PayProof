"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import CipherBadge from "./CipherBadge";
import { encryptedPayrollContract, CreateStreamResult } from "../lib/contracts/encryptedPayrollContract";
import { parseEther } from "ethers";

const CADENCE_OPTIONS = [
  { label: "Monthly", seconds: 30 * 24 * 60 * 60 },
  { label: "Bi-weekly", seconds: 14 * 24 * 60 * 60 },
  { label: "Weekly", seconds: 7 * 24 * 60 * 60 }
];

export default function PayrollStreamForm() {
  const { address: connectedAddress, chain } = useAccount();
  const { status: fhevmStatus, error: fhevmError, instance } = useFhevmContext();
  const [employeeAddress, setEmployeeAddress] = useState<string>("");
  const [rate, setRate] = useState<string>("");
  const [cadence, setCadence] = useState<number>(CADENCE_OPTIONS[0].seconds);
  const [encryptionPreview, setEncryptionPreview] = useState<{ handle: string; proof: string; summary: string } | null>(null);
  const [result, setResult] = useState<(CreateStreamResult & { message: string }) | null>(null);
  const [loadingState, setLoadingState] = useState<"idle" | "encrypting" | "creating">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-populate employer address from connected wallet
  const employerAddress = connectedAddress || "";

  // Check if on correct network
  const isCorrectNetwork = chain?.id === 11155111;
  const networkError = !isCorrectNetwork && employerAddress ? "Please switch MetaMask to Sepolia testnet (Chain ID: 11155111)" : null;

  // Check if fhEVM is ready
  const ready = fhevmStatus === 'ready' || fhevmStatus === 'sdk-initialized';
  const initializing = fhevmStatus === 'loading';
  const fheError = fhevmError?.message;

  const encryptionReady = useMemo(() => {
    return ready && isCorrectNetwork && Boolean(employerAddress && employeeAddress && rate && Number(rate) > 0);
  }, [ready, isCorrectNetwork, employerAddress, employeeAddress, rate]);

  const payrollContract = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() || "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setEncryptionPreview(null);
    setResult(null);

    if (!encryptionReady) {
      setFormError("fhEVM is still initialising. Please try again in a moment.");
      return;
    }

    // Validate employee address
    if (!employeeAddress || employeeAddress.length !== 42 || !employeeAddress.startsWith("0x")) {
      setFormError("Please enter a valid employee address");
      return;
    }

    setLoadingState("encrypting");
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      // Check network using wagmi's chain from useAccount (more reliable than window.ethereum)
      const currentChainId = chain?.id;
      console.log("Connected to chain:", currentChainId);
      if (currentChainId !== 11155111) {
        throw new Error(`Wrong network! Please connect to Sepolia testnet (Chain ID: 11155111). Currently on Chain ID: ${currentChainId}`);
      }

      console.log("Contract address being used:", payrollContract);
      console.log("Employer:", employerAddress);
      console.log("Employee:", employeeAddress);

      // Convert rate per month to rate per second in wei
      const ratePerMonth = parseEther(rate);
      const ratePerSecond = ratePerMonth / BigInt(30 * 24 * 60 * 60);

      console.log("Rate per month (wei):", ratePerMonth.toString());
      console.log("Rate per second (wei):", ratePerSecond.toString());
      
      // Ensure rate is not 0
      if (ratePerSecond === 0n) {
        throw new Error("Rate per second is 0. Please use a higher monthly rate (minimum ~0.0026 ETH/month for 1 wei/second)");
      }

      if (!instance) {
        throw new Error("fhEVM instance not initialized");
      }

      // Helper to 0x-hex encode bytes
      const toHex = (data: string | Uint8Array): string => {
        if (typeof data === "string") {
          return data.startsWith("0x") ? data : `0x${data}`;
        }
        return `0x${Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("")}`;
      };

      // Encrypt the rate per second using the new SDK
      const input = instance.createEncryptedInput(payrollContract, employerAddress);
      input.add64(ratePerSecond);
      const encryptionResult = await input.encrypt();

      const encrypted = {
        handle: toHex(encryptionResult.handles[0]),
        proof: toHex(encryptionResult.inputProof),
        summary: `Encrypted 64-bit payload for ${payrollContract.slice(0, 10)}…`,
      };

      console.log("Encryption result:", {
        handle: encrypted.handle,
        proofLength: (encryptionResult.inputProof as any)?.length ?? (encrypted.proof?.length ?? 0),
        summary: encrypted.summary
      });

      setEncryptionPreview(encrypted);

      // Move to creating phase
      setLoadingState("creating");
      await new Promise(resolve => setTimeout(resolve, 0));

      // Create the encrypted stream on-chain
      console.log("Creating encrypted stream with params:", {
        employee: employeeAddress,
        encryptedRatePerSecond: encrypted.handle,
        proofLength: encrypted.proof.length,
        cadenceInSeconds: cadence,
      });

      const creation = await encryptedPayrollContract.createStream(employerAddress, {
        employee: employeeAddress,
        encryptedRatePerSecond: encrypted.handle,
        rateProof: encrypted.proof,
        cadenceInSeconds: cadence,
        startTime: Math.floor(Date.now() / 1000),
      });

      setResult({
        ...creation,
        message: `Stream created successfully! Streaming ${rate} ETH/month to ${employeeAddress.slice(0, 6)}...${employeeAddress.slice(-4)}`,
      });

      // Reset form
      setEmployeeAddress("");
      setRate("");
    } catch (err) {
      console.error("Stream creation error:", err);
      const message = (err as Error)?.message ?? "Failed to create stream";
      setFormError(message);
    } finally {
      setLoadingState("idle");
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
        <span className="text-slate-300">Sender wallet (your connected wallet)</span>
        <input
          className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-slate-400 placeholder:text-slate-500 focus:outline-none"
          placeholder="Connect wallet first"
          value={employerAddress}
          disabled
          readOnly
          name="employer"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Recipient wallet (paste address)</span>
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
          <span className="text-slate-300">Stream rate (ETH per month)</span>
          <input
            className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            type="number"
            min="0"
            step="any"
            placeholder="0.5"
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
        className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
        disabled={!encryptionReady || loadingState !== "idle"}
      >
        {loadingState !== "idle" && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
        )}
        {loadingState === "encrypting"
          ? "Encrypting rate…"
          : loadingState === "creating"
          ? "Creating stream on-chain…"
          : "Encrypt & Create Stream"}
      </button>
      {networkError ? (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          ⚠️ {networkError}
        </p>
      ) : null}
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
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm" data-testid="stream-result">
          <p className="font-semibold text-emerald-100">✓ Stream Created!</p>
          <p className="mt-2 text-emerald-200">{result.message}</p>
          <p className="mt-3 text-xs text-emerald-300/80">
            Stream Key: <code className="break-all">{result.streamKey}</code>
          </p>
        </div>
      ) : null}
    </form>
  );
}
