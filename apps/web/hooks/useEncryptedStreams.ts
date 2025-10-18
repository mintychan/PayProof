"use client";

import { useEffect, useState } from "react";
import { encryptedPayrollContract, EncryptedStream } from "../lib/contracts/encryptedPayrollContract";

export function useEncryptedStreams(address: string | undefined, type: "employer" | "employee") {
  const [streams, setStreams] = useState<EncryptedStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const fetchStreams = async () => {
      setLoading(true);
      const data = await encryptedPayrollContract.getStreamsByAddress(address, type);
      setStreams(data);
      setLoading(false);
    };

    fetchStreams();

    // Refresh every 10 seconds (encrypted streams don't update as frequently)
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, [address, type]);

  return {
    streams,
    loading,
  };
}
