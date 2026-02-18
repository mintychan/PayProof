"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useFhevmContext } from "fhevm-ts-sdk/react";
import { fheDecrypt } from "fhevm-ts-sdk/core";
import { GenericStringInMemoryStorage } from "fhevm-ts-sdk/storage";
import { encryptedPayrollContract, StreamStatus, EncryptedStream } from "../../../lib/contracts/encryptedPayrollContract";
import { ConfidentialEthContract } from "../../../lib/contracts/confidentialEthContract";
import { WalletConnectPrompt } from "../../../components/WalletConnect";
import StreamLabel from "../../../components/StreamLabel";
import { useStreamLabels } from "../../../hooks/useStreamLabels";
import StreamingCounter from "../../../components/StreamingCounter";
import StreamShapeIndicator from "../../../components/StreamShapeIndicator";
import { formatUnits, parseUnits, ethers } from "ethers";
import { logger } from "../../../lib/logger";
import { CONFIDENTIAL_DECIMALS, TOKEN_CONFIG, SupportedToken } from "../../../lib/config";
import StreamTimeline, { StreamEvent } from "../../../components/StreamTimeline";
import TransactionHistory, { TxRecord } from "../../../components/TransactionHistory";
import { SkeletonStreamDetail } from "../../../components/Skeleton";

type StreamPageProps = { params: Promise<{ id: string }> };

export default function EncryptedStreamPage({ params }: StreamPageProps) {
const { address, isConnected } = useAccount();
const { status: fhevmStatus, instance } = useFhevmContext();
const { data: walletClient } = useWalletClient();
const signatureStorage = useMemo(() => new GenericStringInMemoryStorage(), []);
const { getLabel, setLabel: setStreamLabel } = useStreamLabels();

// Map the new SDK status to the old format for compatibility
const fheReady = fhevmStatus === "ready";
const initializing = fhevmStatus === "loading";
const [stream, setStream] = useState<EncryptedStream | null>(null);
const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [balanceHandle, setBalanceHandle] = useState<string | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [decryptedRate, setDecryptedRate] = useState<string | null>(null);
const [decryptedBalances, setDecryptedBalances] = useState<
    | {
        streamed: string;
        withdrawn: string;
        available: string | null;
        buffered: string;
        debt: string;
      }
    | null
  >(null);
  const [decryptedRatePerSecond, setDecryptedRatePerSecond] = useState<bigint>(0n);
  const [decryptedStreamedWei, setDecryptedStreamedWei] = useState<bigint>(0n);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
const [fundingTokenAddress, setFundingTokenAddress] = useState<string | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"timeline" | "transactions">("timeline");

  const payrollContractAddress = process.env.NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT?.trim() || "";

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    encryptedPayrollContract
      .fundingToken()
      .then((addr) => setFundingTokenAddress(addr))
      .catch((error) => logger.error("Failed to fetch funding token", error));
  }, [mounted]);

  const resolveFundingToken = useCallback(async () => {
    if (fundingTokenAddress) {
      return fundingTokenAddress;
    }
    const addr = await encryptedPayrollContract.fundingToken();
    setFundingTokenAddress(addr);
    return addr;
  }, [fundingTokenAddress]);

  // Determine which token this stream uses based on the funding token address
  const streamToken: SupportedToken = useMemo(() => {
    if (!fundingTokenAddress) return "cETH";
    const lower = fundingTokenAddress.toLowerCase();
    for (const [key, config] of Object.entries(TOKEN_CONFIG)) {
      if (config.contractAddress && config.contractAddress.toLowerCase() === lower) {
        return key as SupportedToken;
      }
    }
    return "cETH";
  }, [fundingTokenAddress]);

  const tokenConfig = TOKEN_CONFIG[streamToken];

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(params).then((resolved) => {
      if (!cancelled) {
        setStreamKey(resolved.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  const fetchStream = useCallback(async () => {
    if (!streamKey) return;
    setLoading(true);
    try {
      const data = await encryptedPayrollContract.getStream(streamKey);
      setStream(data);
      setBalanceHandle(null);
      setActionError(null);
      setDecryptedRate(null);
      setDecryptedRatePerSecond(0n);
      setDecryptedStreamedWei(0n);
      setDecryptedBalances(null);
    } catch (error) {
      logger.error("Error fetching stream:", error);
    } finally {
      setLoading(false);
    }
  }, [streamKey]);

  useEffect(() => {
    if (streamKey) {
      fetchStream();
    }
  }, [streamKey, fetchStream]);

  const formatEthDisplay = useCallback((value: string | null, decimals = 3) => {
    if (!value) {
      return "0.000";
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return value;
    }
    return numeric.toFixed(decimals);
  }, []);

  if (!mounted) {
    return <SkeletonStreamDetail />;
  }

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  if (loading) {
    return <SkeletonStreamDetail />;
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

  const streamedDisplay = `${tokenConfig.symbol} ${formatEthDisplay(decryptedBalances?.streamed ?? null, 6)}`;
  const withdrawnDisplay = `${tokenConfig.symbol} ${formatEthDisplay(decryptedBalances?.withdrawn ?? null, 6)}`;
  const availableDisplay =
    decryptedBalances?.available !== null && decryptedBalances?.available !== undefined
      ? `${tokenConfig.symbol} ${formatEthDisplay(decryptedBalances?.available ?? null, 6)}`
      : "Pending";
  const debtDisplay = `${tokenConfig.symbol} ${formatEthDisplay(decryptedBalances?.debt ?? null, 6)}`;
  const bufferedDisplay = `${tokenConfig.symbol} ${formatEthDisplay(decryptedBalances?.buffered ?? null, 6)}`;

  const isAuthorized =
    address?.toLowerCase() === stream.employer.toLowerCase() ||
    address?.toLowerCase() === stream.employee.toLowerCase();

  const viewRole = address?.toLowerCase() === stream.employer.toLowerCase()
    ? "employer"
    : "employee";

  const isEmployer = viewRole === "employer";

  const handleDecrypt = async (balanceHandleOverride?: string | null) => {
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
      logger.log("Decrypting handles for stream", stream.streamKey);

      if (!payrollContractAddress) {
        throw new Error("Payroll contract address not configured");
      }

      const normalizeHandleValue = (value?: string | null): (`0x${string}` | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed || trimmed === "0x" || trimmed === "0x0") return null;
        const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
        const normalized = prefixed as `0x${string}`;
        return normalized === ethers.ZeroHash ? null : normalized;
      };

      const contractAddress = ethers.getAddress(payrollContractAddress) as `0x${string}`;

      const normalizedRateHandle = normalizeHandleValue(stream.rateHandle);
      if (!normalizedRateHandle) {
        throw new Error("Stream rate handle unavailable for decryption");
      }

      const balanceHandleCandidate = balanceHandleOverride ?? balanceHandle;
      const normalizedBufferedHandle = normalizeHandleValue(stream.bufferedHandle);
      const normalizedWithdrawnHandle = normalizeHandleValue(stream.withdrawnHandle);
      const normalizedBalanceHandle = normalizeHandleValue(balanceHandleCandidate);

      const handles: (`0x${string}`)[] = [normalizedRateHandle];
      if (normalizedBufferedHandle) handles.push(normalizedBufferedHandle);
      if (normalizedWithdrawnHandle) handles.push(normalizedWithdrawnHandle);
      if (normalizedBalanceHandle) handles.push(normalizedBalanceHandle);

      logger.log("Calling fheDecrypt with handles:", handles);

      const results = await fheDecrypt({
        instance,
        signer: ethersSigner,
        storage: signatureStorage,
        contractAddress,
        handles,
      });

      logger.log("Decryption results:", results);

      const getResultValue = (handle: `0x${string}` | null): string | bigint | boolean | undefined => {
        if (!handle) {
          return undefined;
        }
        return results[handle];
      };

      const toBigInt = (value: string | bigint | boolean | undefined): bigint => {
        if (typeof value === "bigint") {
          return value;
        }
        if (typeof value === "boolean") {
          return value ? 1n : 0n;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return 0n;
          }
          // BigInt accepts both decimal and hex (0x-prefixed) strings, so pass through verbatim
          return BigInt(trimmed);
        }
        return 0n;
      };

      const ratePerSecondWei = toBigInt(getResultValue(normalizedRateHandle));
      const ratePerMonthWei = ratePerSecondWei * BigInt(30 * 24 * 60 * 60);
      const ratePerMonthETH = formatUnits(ratePerMonthWei, CONFIDENTIAL_DECIMALS);

      logger.log("Rate per second (Wei):", ratePerSecondWei.toString());
      logger.log("Rate per month (ETH):", ratePerMonthETH);

      setDecryptedRate(ratePerMonthETH);
      setDecryptedRatePerSecond(ratePerSecondWei);

      if (normalizedBufferedHandle || normalizedWithdrawnHandle || normalizedBalanceHandle) {
        const bufferedWei = normalizedBufferedHandle ? toBigInt(getResultValue(normalizedBufferedHandle)) : 0n;
        const withdrawnWei = normalizedWithdrawnHandle ? toBigInt(getResultValue(normalizedWithdrawnHandle)) : 0n;
        const availableWei =
          normalizedBalanceHandle && getResultValue(normalizedBalanceHandle) !== undefined
            ? toBigInt(getResultValue(normalizedBalanceHandle))
            : null;

        let streamedWei: bigint = BigInt(0);
        if (availableWei !== null) {
          streamedWei = availableWei + withdrawnWei - bufferedWei;
        } else {
          streamedWei = withdrawnWei >= bufferedWei ? withdrawnWei - bufferedWei : BigInt(0);
        }

        if (streamedWei < BigInt(0)) {
          streamedWei = BigInt(0);
        }

        setDecryptedStreamedWei(streamedWei);

        const debtWei = streamedWei + bufferedWei < withdrawnWei ? withdrawnWei - streamedWei - bufferedWei : BigInt(0);

        setDecryptedBalances({
          streamed: formatUnits(streamedWei, CONFIDENTIAL_DECIMALS),
          withdrawn: formatUnits(withdrawnWei, CONFIDENTIAL_DECIMALS),
          available: availableWei !== null ? formatUnits(availableWei, CONFIDENTIAL_DECIMALS) : null,
          buffered: formatUnits(bufferedWei, CONFIDENTIAL_DECIMALS),
          debt: formatUnits(debtWei, CONFIDENTIAL_DECIMALS),
        });
      }
    } catch (error: any) {
      logger.error("Decryption error:", error);
      setDecryptError(error?.message || "Failed to decrypt. Make sure you have permission to decrypt this stream.");
    } finally {
      setDecrypting(false);
    }
  };

  // Calculate streaming progress (mock for now - would need real-time updates)
  const getStreamProgress = () => {
    if (!stream) return 0;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - stream.startTime;
    const cadenceProgress = (elapsed % stream.cadenceInSeconds) / stream.cadenceInSeconds;
    return cadenceProgress * 100;
  };

  const handleWithdraw = async () => {
    if (!stream) return;
    if (!isAuthorized || !address) {
      setActionError("Only the employer or employee can withdraw.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setWithdrawing(true);
    try {
      const txHash = await encryptedPayrollContract.withdrawMax(stream.streamKey, address);
      setActionMessage(`Withdrawal sent: ${txHash.slice(0, 10)}…`);
      await fetchStream();
    } catch (error: any) {
      logger.error("Withdraw error", error);
      setActionError(error?.message ?? "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCancel = async () => {
    if (!stream) return;
    if (!isEmployer) {
      setActionError("Only the employer can cancel the stream.");
      return;
    }
    if (!stream.cancelable) {
      setActionError("This stream can no longer be cancelled.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setCanceling(true);
    try {
      const txHash = await encryptedPayrollContract.cancelStream(stream.streamKey);
      setActionMessage(`Cancellation sent: ${txHash.slice(0, 10)}…`);
      await fetchStream();
    } catch (error: any) {
      logger.error("Cancel error", error);
      setActionError(error?.message ?? "Failed to cancel stream");
    } finally {
      setCanceling(false);
    }
  };

  const handleTopUp = async () => {
    if (!stream) return;
    if (!isEmployer) {
      setActionError("Only the employer can top up the stream.");
      return;
    }
    if (!topUpAmount || Number(topUpAmount) <= 0) {
      setActionError("Enter a positive amount to top up.");
      return;
    }
    if (!address) {
      setActionError("Connect your wallet to top up the stream.");
      return;
    }
    if (!fheReady || !instance) {
      setActionError("fhEVM encryption is not ready yet.");
      return;
    }
    if (!payrollContractAddress) {
      setActionError("Payroll contract address is missing in configuration.");
      return;
    }

    setTopUpLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const tokenAddress = await resolveFundingToken();
      if (!tokenAddress) {
        throw new Error("Funding token is not available");
      }

      setActionMessage(`Wrapping ${tokenConfig.underlyingSymbol} into confidential ${tokenConfig.symbol}...`);
      const confidentialToken = new ConfidentialEthContract(tokenAddress);
      await confidentialToken.wrapNative(topUpAmount, address);

      setActionMessage(`Authorising payroll contract to move your ${tokenConfig.symbol}...`);
      await confidentialToken.ensureOperator(payrollContractAddress);

      const amountWei = parseUnits(topUpAmount, CONFIDENTIAL_DECIMALS);

      // Encrypt the top-up amount using the new SDK
      const input = instance.createEncryptedInput(payrollContractAddress, address);
      input.add128(amountWei);
      const encryptionResult = await input.encrypt();

      const toHex = (data: string | Uint8Array): string => {
        if (typeof data === "string") {
          return data.startsWith("0x") ? data : `0x${data}`;
        }
        return `0x${Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      };

      const encrypted = {
        handle: toHex(encryptionResult.handles[0]),
        proof: toHex(encryptionResult.inputProof),
      };

      setActionMessage("Submitting encrypted top-up…");
      const txHash = await encryptedPayrollContract.topUp(stream.streamKey, encrypted.handle, encrypted.proof);
      setActionMessage(`Top-up sent: ${txHash.slice(0, 10)}…`);
      setTopUpAmount("");
      await fetchStream();
    } catch (error: any) {
      logger.error("Top-up error", error);
      setActionError(error?.message ?? "Failed to top up stream");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleCheckBalance = async (): Promise<string | null> => {
    if (!stream) return null;
    if (!address) {
      setActionError("Connect your wallet to sync the stream.");
      return null;
    }
    let fetchedHandle: string | null = null;
    try {
      setActionError(null);
      setActionMessage(null);
      setCheckingBalance(true);
      const currentStreamKey = stream.streamKey;
      // Call syncStream to update balances and permissions
      const txHash = await encryptedPayrollContract.syncStream(currentStreamKey);
      // Fetch the fresh encrypted withdrawable handle for later decryption
      const encryptedHandle = await encryptedPayrollContract.encryptedBalanceOf(currentStreamKey);
      // Refresh the stream data to get updated handles
      await fetchStream();
      const normalizedHandle = (() => {
        if (!encryptedHandle) {
          return null;
        }
        const candidates: unknown[] = Array.isArray(encryptedHandle)
          ? encryptedHandle
          : [encryptedHandle, (encryptedHandle as any)?.[0]];
        for (const candidate of candidates) {
          if (!candidate) continue;
          if (typeof candidate === "string" && candidate.startsWith("0x")) {
            return candidate;
          }
          if (candidate instanceof Uint8Array) {
            return ethers.hexlify(candidate);
          }
          if (typeof (candidate as any)?.toHexString === "function") {
            const hex = (candidate as any).toHexString();
            if (typeof hex === "string" && hex.startsWith("0x")) {
              return hex;
            }
          }
          if (typeof (candidate as any)?.toString === "function") {
            const maybeString = (candidate as any).toString();
            if (typeof maybeString === "string" && maybeString.startsWith("0x")) {
              return maybeString;
            }
          }
        }
        logger.warn("Unexpected encrypted balance handle type:", encryptedHandle);
        return null;
      })();
      fetchedHandle = normalizedHandle;
      setBalanceHandle(fetchedHandle);
      setActionMessage(
        txHash
          ? `Stream synced. Balances updated on-chain (tx ${txHash.slice(0, 10)}…). Balance handle refreshed.`
          : "Stream synced. Balances updated on-chain. Balance handle refreshed."
      );
    } catch (error: any) {
      logger.error("Sync error", error);
      setActionError(error?.message ?? "Failed to sync stream");
      fetchedHandle = null;
    } finally {
      setCheckingBalance(false);
    }
    return fetchedHandle;
  };

  const handleRevealBalance = async () => {
    if (!stream) return;
    if (decrypting) return;
    const handle = await handleCheckBalance();
    if (!handle) {
      return;
    }
    await handleDecrypt(handle);
  };

  return (
    <section className="min-h-screen p-6">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm text-slate-400">
        <a href="/employee" className="hover:text-slate-200 transition">Payments</a>
        <span>›</span>
        <span className="text-slate-200">Stream</span>
        <span>›</span>
        <span>Pay at a constant rate. Top up over time.</span>
      </div>

      {/* Back button and title */}
      <div className="mb-8 flex items-center gap-4">
        <a
          href="/employee"
          aria-label="Back to payments"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 border border-white/5 hover:border-white/10 transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Stream #{stream.streamId.slice(0, 8)}...</h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${tokenConfig.color}20`, color: tokenConfig.color }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: tokenConfig.color }}
              />
              {tokenConfig.symbol}
            </span>
          </div>
          <div className="mt-1">
            <StreamLabel
              streamKey={stream.streamKey}
              initialLabel={getLabel(stream.streamKey)}
              onLabelChange={(label) => setStreamLabel(stream.streamKey, label)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left side - Circular Visualization */}
        <div className="space-y-6">
          {/* Circular Progress Visualization */}
          <div className="relative flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-12 backdrop-blur">
            {/* Circular Progress */}
            <div className="relative h-80 w-80">
              <svg className="h-full w-full -rotate-90 transform">
                {/* Background circle */}
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle with gradient */}
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  stroke="url(#streamGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${getStreamProgress() * 8.8} 880`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Icon */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                  <svg className="h-8 w-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Streaming counter -- animates when active & decrypted */}
                {decryptedRatePerSecond > 0n ? (
                  <StreamingCounter
                    ratePerSecond={decryptedRatePerSecond}
                    totalAccrued={decryptedStreamedWei}
                    startTime={stream.startTime}
                    status={stream.status === StreamStatus.Active ? "Active" : "Inactive"}
                  />
                ) : (
                  <div className="mb-2 text-center">
                    <div className="text-5xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
                      {decryptedRate ? `${parseFloat(decryptedRate).toFixed(6)}` : '0.000000'}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {decryptedRate ? `${parseFloat(decryptedRate).toFixed(6)} ${tokenConfig.symbol} / Month` : `${tokenConfig.symbol} 0.000 / Month`}
                    </p>
                  </div>
                )}
              </div>

              {/* Small status indicator */}
              <div className="absolute -top-2 -right-2">
              <div className={`h-4 w-4 rounded-full ${
                  stream.status === StreamStatus.Active ? 'bg-emerald-500' :
                  stream.status === StreamStatus.Paused ? 'bg-amber-500' :
                  stream.status === StreamStatus.Settled ? 'bg-sky-400' :
                  'bg-slate-500'
                } shadow-lg`} />
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-12 flex gap-3">
              <button aria-label="View stream analytics" className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs backdrop-blur transition hover:border-white/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </button>
              <button aria-label="Add funds" className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs backdrop-blur transition hover:border-white/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => void handleRevealBalance()}
              disabled={decrypting || checkingBalance || !fheReady || !isAuthorized}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {decrypting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {decrypting || checkingBalance
                ? "Decrypting..."
                : decryptedBalances
                  ? "✓ Decrypted"
                  : !fheReady
                    ? "Initializing..."
                    : "Decrypt"}
            </button>
            <button className="rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/20 backdrop-blur">
              Details
            </button>
          </div>
        </div>

        {/* Right side - Attributes */}
        <div className="space-y-6">
          {/* Attributes Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Attributes</h2>
            <div className="flex gap-2">
              <button className="rounded-full border border-white/10 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-300 backdrop-blur transition hover:border-white/20">
                Select
              </button>
              <button className="rounded-full border border-white/10 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-300 backdrop-blur transition hover:border-white/20">
                Share Link
              </button>
            </div>
          </div>

          {/* Participants Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur transition hover:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Employer</p>
                  <p className="text-xs text-slate-500">{stream.employer.slice(0, 6)}...{stream.employer.slice(-4)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <svg className="h-3 w-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="group rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur transition hover:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Employee</p>
                  <p className="text-xs text-slate-500">{stream.employee.slice(0, 6)}...{stream.employee.slice(-4)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attribute Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Shape with stream curve visualization */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">Shape</p>
                  <p className="mt-1 text-sm font-medium text-white">Linear Flow</p>
                </div>
              </div>
              <div className="mt-3">
                <StreamShapeIndicator
                  streamType="linear"
                  currentTime={Math.floor(Date.now() / 1000)}
                  endTime={stream.startTime + stream.cadenceInSeconds * 12}
                />
              </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-medium text-white">
                  {stream.status === StreamStatus.Active ? "Streaming" :
                     stream.status === StreamStatus.Paused ? "Paused" :
                     stream.status === StreamStatus.Settled ? "Settled" : "Cancelled"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rate/Month */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">Rate/Month</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {decryptedRate ? `${parseFloat(decryptedRate).toFixed(4)} ${tokenConfig.symbol}` : '🔒 Encrypted'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chain */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">Chain</p>
                  <p className="mt-1 text-sm font-medium text-white">Ethereum</p>
                </div>
              </div>
            </div>

            {/* In debt since */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">In debt since</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(stream.startTime * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Started on */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500">Started on</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(stream.startTime * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stream Details */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-slate-300">Streamed amount</span>
              </div>
              <span className="font-mono text-sm font-medium text-white">{streamedDisplay}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                </svg>
                <span className="text-sm text-slate-300">Withdrawn amount</span>
              </div>
              <span className="font-mono text-sm font-medium text-white">{withdrawnDisplay}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-slate-300">Debt</span>
              </div>
              <span className="font-mono text-sm font-medium text-white">{debtDisplay}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span className="text-sm text-slate-300">Refundable</span>
              </div>
              <span className="font-mono text-sm font-medium text-white">{bufferedDisplay}</span>
            </div>
          </div>

          {/* Debt Notice */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-400">The stream has been in debt since</p>
                  <p className="mt-1 text-sm text-white">{new Date(stream.startTime * 1000).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button aria-label="Refresh debt info" className="rounded-full border border-white/10 bg-slate-900/60 p-2 transition hover:border-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button aria-label="Share stream" className="rounded-full border border-white/10 bg-slate-900/60 p-2 transition hover:border-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Manage Stream</h3>
              <p className="mt-1 text-xs text-slate-500">
                Employers can top up or cancel. Both parties may withdraw encrypted balances.
              </p>
            </div>
            {actionError && (
              <div aria-live="polite" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {actionError}
              </div>
            )}
            {actionMessage && (
              <div aria-live="polite" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                {actionMessage}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Top up amount ({tokenConfig.underlyingSymbol})</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  type="number"
                  min="0"
                  step="any"
                  value={topUpAmount}
                  onChange={(event) => setTopUpAmount(event.target.value)}
                  placeholder="0.10"
                  disabled={!isEmployer || !fheReady || topUpLoading}
                />
                <button
                  type="button"
                  onClick={handleTopUp}
                  disabled={!isEmployer || !fheReady || topUpLoading}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {topUpLoading ? "Encrypting…" : "Encrypt & Top Up"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Amounts are encrypted locally using fhEVM before being sent on-chain.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={!isAuthorized || withdrawing}
                className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {withdrawing ? "Withdrawing…" : "Withdraw available"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!isEmployer || !stream.cancelable || canceling}
                className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2 text-sm font-medium text-white transition hover:border-red-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canceling ? "Cancelling…" : "Cancel stream"}
              </button>
              <button
                type="button"
                onClick={() => void handleCheckBalance()}
                disabled={checkingBalance}
                className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2 text-sm font-medium text-white transition hover:border-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingBalance ? "Syncing…" : "Sync stream"}
              </button>
              <button
                type="button"
                onClick={() => void fetchStream()}
                disabled={loading}
                className="rounded-xl border border-white/5 bg-slate-950/60 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
            {balanceHandle && (
              <div className="rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-[11px] font-mono leading-relaxed text-slate-300">
                Encrypted balance handle:
                <div className="mt-1 break-all text-slate-400">{balanceHandle}</div>
              </div>
            )}
          </div>

          {/* Decryption Section */}
          {decryptedRate && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur">
              <div className="flex items-center gap-3 mb-3">
                <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h4 className="text-sm font-semibold text-emerald-200">Decrypted Amount</h4>
              </div>
              <p className="text-2xl font-bold text-emerald-300 mb-2">
                {parseFloat(decryptedRate).toFixed(6)} {tokenConfig.symbol}/month
              </p>
              <p className="text-xs text-emerald-400/80">
                ≈ {(parseFloat(decryptedRate) / 30).toFixed(8)} {tokenConfig.symbol}/day
              </p>
            </div>
          )}

          {decryptError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 backdrop-blur">
              <p className="text-sm text-red-300">{decryptError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline & Transactions Section */}
      <div className="mt-8 rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        {/* Tab Pills */}
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveHistoryTab("timeline")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeHistoryTab === "timeline"
                ? "bg-sky-500/20 text-sky-400"
                : "bg-slate-800 text-slate-400 hover:text-slate-300"
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveHistoryTab("transactions")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeHistoryTab === "transactions"
                ? "bg-sky-500/20 text-sky-400"
                : "bg-slate-800 text-slate-400 hover:text-slate-300"
            }`}
          >
            Transactions
          </button>
        </div>

        {/* Tab Content */}
        {activeHistoryTab === "timeline" && (
          <StreamTimeline
            events={(() => {
              const events: StreamEvent[] = [];

              // Stream creation event
              if (stream.startTime > 0) {
                events.push({
                  type: "created",
                  timestamp: stream.startTime,
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  details: `Stream opened between ${stream.employer.slice(0, 6)}...${stream.employer.slice(-4)} and ${stream.employee.slice(0, 6)}...${stream.employee.slice(-4)}`,
                });
              }

              // Status-based events
              if (stream.status === StreamStatus.Paused) {
                events.push({
                  type: "paused",
                  timestamp: stream.lastAccruedAt || stream.startTime,
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  details: "Stream paused by employer",
                });
              }

              if (stream.status === StreamStatus.Cancelled) {
                events.push({
                  type: "cancelled",
                  timestamp: stream.lastAccruedAt || stream.startTime,
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  details: "Stream cancelled",
                });
              }

              if (stream.status === StreamStatus.Settled) {
                events.push({
                  type: "settled",
                  timestamp: stream.lastAccruedAt || stream.startTime,
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  details: "Stream fully settled",
                });
              }

              // If lastAccruedAt differs from startTime, show a sync event
              if (stream.lastAccruedAt > 0 && stream.lastAccruedAt !== stream.startTime) {
                events.push({
                  type: "synced",
                  timestamp: stream.lastAccruedAt,
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  details: "Balances synchronized on-chain",
                });
              }

              return events;
            })()}
          />
        )}

        {activeHistoryTab === "transactions" && (
          <TransactionHistory
            transactions={(() => {
              const txs: TxRecord[] = [];

              // Creation transaction
              if (stream.startTime > 0) {
                txs.push({
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  timestamp: stream.startTime,
                  type: "created",
                  from: stream.employer,
                  to: stream.employee,
                });
              }

              // Last accrued sync transaction
              if (stream.lastAccruedAt > 0 && stream.lastAccruedAt !== stream.startTime) {
                const statusType =
                  stream.status === StreamStatus.Paused
                    ? "paused"
                    : stream.status === StreamStatus.Cancelled
                      ? "cancelled"
                      : stream.status === StreamStatus.Settled
                        ? "settled"
                        : "synced";

                txs.push({
                  txHash: stream.streamKey,
                  blockNumber: 0,
                  timestamp: stream.lastAccruedAt,
                  type: statusType,
                  from: stream.employer,
                  to: stream.employee,
                });
              }

              return txs;
            })()}
          />
        )}
      </div>
    </section>
  );
}
