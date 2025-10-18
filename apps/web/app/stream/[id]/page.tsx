"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { encryptedPayrollContract, StreamStatus } from "../../../lib/contracts/encryptedPayrollContract";
import { PageHeader } from "../../../components/ui/PageHeader";
import { WalletConnectPrompt } from "../../../components/WalletConnect";
import { useFhevm } from "../../../providers/FhevmProvider";
import { formatEther, ethers } from "ethers";

export default function EncryptedStreamPage({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount();
  const { ready: fheReady, initializing, instance } = useFhevm();
  const { data: walletClient } = useWalletClient();
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decryptedRate, setDecryptedRate] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Create ethers signer from wagmi wallet client
  const ethersSigner = useMemo(() => {
    if (!walletClient || !address) return undefined;

    const eip1193Provider = {
      request: async (args: any) => {
        return await walletClient.request(args);
      },
    } as ethers.Eip1193Provider;

    const ethersProvider = new ethers.BrowserProvider(eip1193Provider);
    return new ethers.JsonRpcSigner(ethersProvider, address);
  }, [walletClient, address]);

  useEffect(() => {
    const fetchStream = async () => {
      setLoading(true);
      try {
        const data = await encryptedPayrollContract.getStream(params.id);
        setStream(data);
      } catch (error) {
        console.error("Error fetching stream:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchStream();
    }
  }, [params.id]);

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
          <p className="mt-4 text-sm text-slate-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Stream Not Found</h2>
          <p className="mt-2 text-slate-400">The stream you&apos;re looking for doesn&apos;t exist.</p>
          <a
            href="/employer"
            className="mt-4 inline-block rounded-full bg-sky-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
          >
            Create a Stream
          </a>
        </div>
      </div>
    );
  }

  const isAuthorized =
    address?.toLowerCase() === stream.employer.toLowerCase() ||
    address?.toLowerCase() === stream.employee.toLowerCase();

  const viewRole = address?.toLowerCase() === stream.employer.toLowerCase()
    ? "employer"
    : "employee";

  const handleDecrypt = async () => {
    if (!isAuthorized) {
      setDecryptError("You are not authorized to decrypt this stream's data");
      return;
    }

    if (!fheReady || !instance) {
      setDecryptError("fhEVM is still initializing. Please wait...");
      return;
    }

    if (!address || !ethersSigner) {
      setDecryptError("Wallet not available");
      return;
    }

    setDecrypting(true);
    setDecryptError(null);

    try {
      console.log("Decrypting rate handle:", stream.rateHandle);

      const payrollContract = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT;
      if (!payrollContract) {
        throw new Error("Payroll contract address not configured");
      }

      // Generate keypair for decryption
      const { publicKey, privateKey } = (instance as any).generateKeypair();

      // Create EIP-712 signature request
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365;
      const eip712 = (instance as any).createEIP712(
        publicKey,
        [payrollContract],
        startTimestamp,
        durationDays
      );

      // Request user signature
      const signature = await (ethersSigner as any).signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      console.log("Signature obtained, decrypting...");

      // Decrypt using userDecrypt
      const results = await (instance as any).userDecrypt(
        [{ handle: stream.rateHandle, contractAddress: payrollContract }],
        privateKey,
        publicKey,
        signature,
        [payrollContract],
        address,
        startTimestamp,
        durationDays
      );

      const decryptedValue = results[stream.rateHandle];
      console.log("Decrypted rate per second (wei):", decryptedValue);

      // Convert from wei per second to ETH per month
      const ratePerSecondWei = BigInt(decryptedValue);
      const ratePerMonthWei = ratePerSecondWei * BigInt(30 * 24 * 60 * 60);
      const ratePerMonthETH = formatEther(ratePerMonthWei);

      console.log("Rate per month (ETH):", ratePerMonthETH);

      setDecryptedRate(ratePerMonthETH);
    } catch (error: any) {
      console.error("Decryption error:", error);
      setDecryptError(error?.message || "Failed to decrypt. Make sure you have permission to decrypt this stream.");
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <section className="space-y-8">
      <PageHeader
        title={`Encrypted Stream`}
        subtitle="View encrypted payroll stream with privacy-preserving fhEVM technology"
        actions={
          <a
            href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            View Contract on Explorer
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left side - Stream Info */}
        <div className="space-y-6">
          {/* Stream Status Card */}
          <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Stream Status</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  stream.status === StreamStatus.Active
                    ? "bg-emerald-500/20 text-emerald-400"
                    : stream.status === StreamStatus.Paused
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {stream.status === StreamStatus.Active
                  ? "🟢 Active"
                  : stream.status === StreamStatus.Paused
                  ? "⏸️ Paused"
                  : "⏹️ Cancelled"}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Stream ID</p>
                <p className="mt-1 font-mono text-sm text-slate-300 break-all">
                  {stream.streamId}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Started</p>
                <p className="mt-1 text-sm text-white">
                  {new Date(stream.startTime * 1000).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Cadence</p>
                <p className="mt-1 text-sm text-white">
                  Every {stream.cadenceInSeconds / (24 * 60 * 60)} days
                </p>
              </div>
            </div>
          </div>

          {/* Authorization Card */}
          <div className={`rounded-3xl border p-6 ${
            isAuthorized
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isAuthorized ? "✓ Authorized" : "⚠️ Not Authorized"}
            </h3>
            <p className="text-sm text-slate-300">
              {isAuthorized
                ? `You are the ${viewRole} and can view encrypted details.`
                : "You are not authorized to decrypt this stream's data."}
            </p>
          </div>
        </div>

        {/* Right side - Details */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Participants</h3>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
                <p className="text-xs text-slate-500">Employer</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="font-mono text-sm text-white">
                    {stream.employer.slice(0, 10)}...{stream.employer.slice(-8)}
                  </p>
                  {address?.toLowerCase() === stream.employer.toLowerCase() && (
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-400">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3">
                <p className="text-xs text-slate-500">Employee</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="font-mono text-sm text-white">
                    {stream.employee.slice(0, 10)}...{stream.employee.slice(-8)}
                  </p>
                  {address?.toLowerCase() === stream.employee.toLowerCase() && (
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Encrypted Data */}
          <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🔒 Encrypted Data</h3>
              {fheReady ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
                  FHE Ready
                </span>
              ) : initializing ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-400">
                  Initializing...
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                <p className="text-xs text-violet-400 mb-2">Encrypted Rate Handle</p>
                <p className="font-mono text-xs text-slate-300 break-all">
                  {stream.rateHandle}
                </p>
              </div>

              {decryptedRate && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs text-emerald-400 mb-2">✓ Decrypted Rate</p>
                  <p className="text-2xl font-semibold text-emerald-300">
                    {parseFloat(decryptedRate).toFixed(6)} ETH/month
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-2">
                    ≈ {(parseFloat(decryptedRate) / 30).toFixed(8)} ETH/day
                  </p>
                </div>
              )}

              {decryptError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-xs text-red-400">{decryptError}</p>
                </div>
              )}

              {isAuthorized && !decryptedRate && (
                <button
                  onClick={handleDecrypt}
                  disabled={decrypting || !fheReady}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {decrypting && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  )}
                  {decrypting ? "Decrypting..." : !fheReady ? "Waiting for fhEVM..." : "🔓 Decrypt Amount"}
                </button>
              )}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6">
            <h4 className="text-sm font-semibold text-sky-200 mb-2">🔐 Privacy Protection</h4>
            <p className="text-xs text-sky-300/80 leading-relaxed">
              This stream uses fully homomorphic encryption (fhEVM). The salary rate is encrypted
              and stored on-chain. Only the employer and employee can decrypt the actual amounts.
              Third parties can verify income thresholds without learning the specific salary amount.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
