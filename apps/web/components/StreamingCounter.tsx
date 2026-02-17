"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatUnits } from "ethers";
import { CONFIDENTIAL_DECIMALS } from "../lib/config";

interface StreamingCounterProps {
  ratePerSecond: bigint;
  totalAccrued: bigint;
  startTime: number;
  status: string;
}

/**
 * Real-time streaming counter that animates accrued value when the stream
 * is active, using requestAnimationFrame for smooth 50ms-interval updates.
 *
 * Values are in cETH micro-units (6 decimals). Display divides by 1e6.
 */
export default function StreamingCounter({
  ratePerSecond,
  totalAccrued,
  startTime,
  status,
}: StreamingCounterProps) {
  const isActive = status === "Active";
  const [displayValue, setDisplayValue] = useState<bigint>(totalAccrued);
  const lastTickRef = useRef<number>(Math.floor(Date.now() / 1000));
  const rafIdRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  // Reset display when totalAccrued changes from outside (e.g. decrypt / refresh)
  useEffect(() => {
    setDisplayValue(totalAccrued);
    lastTickRef.current = Math.floor(Date.now() / 1000);
  }, [totalAccrued]);

  const tick = useCallback(
    (timestamp: number) => {
      // Throttle to ~50ms intervals (20fps) to avoid excessive re-renders
      if (timestamp - lastFrameRef.current < 50) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      lastFrameRef.current = timestamp;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const elapsed = BigInt(Math.max(0, nowSeconds - lastTickRef.current));

      if (elapsed > 0n && ratePerSecond > 0n) {
        setDisplayValue((prev) => prev + ratePerSecond * elapsed);
        lastTickRef.current = nowSeconds;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [ratePerSecond]
  );

  useEffect(() => {
    if (!isActive || !ratePerSecond || ratePerSecond === 0n) {
      return;
    }

    lastTickRef.current = Math.floor(Date.now() / 1000);
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isActive, ratePerSecond, tick]);

  // Format for display: divide by 1e6 (CONFIDENTIAL_DECIMALS)
  const formatted = formatUnits(displayValue, CONFIDENTIAL_DECIMALS);

  // Ensure exactly 6 decimal places
  const [intPart, rawDecPart = ""] = formatted.split(".");
  const decPart = rawDecPart.padEnd(6, "0").slice(0, 6);

  // Rate display: show per-second in human-readable form
  const rateDisplay =
    ratePerSecond > 0n
      ? formatUnits(ratePerSecond, CONFIDENTIAL_DECIMALS)
      : "0";

  // Split digits so the last one can get the pulse animation
  const allDigits = `${intPart}.${decPart}`;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Main counter */}
      <div className="flex items-baseline font-mono text-4xl font-bold tracking-tight">
        {allDigits.split("").map((char, i) => {
          const isLast = i === allDigits.length - 1;
          return (
            <span
              key={i}
              className={
                isLast && isActive
                  ? "text-emerald-400 animate-pulse"
                  : char === "."
                    ? "text-slate-500 mx-px"
                    : "bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent"
              }
            >
              {char}
            </span>
          );
        })}
        <span className="ml-2 text-base font-medium text-slate-400">cETH</span>
      </div>

      {/* Rate label */}
      <p className="text-xs text-slate-500">
        {isActive ? (
          <>
            per second:{" "}
            <span className="font-mono text-slate-400">{rateDisplay}</span> cETH
          </>
        ) : (
          <span className="text-slate-500">Stream is not active</span>
        )}
      </p>
    </div>
  );
}
