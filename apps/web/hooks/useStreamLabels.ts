"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "payproof-stream-labels";

function readLabels(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeLabels(labels: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useStreamLabels() {
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Hydrate from localStorage after mount
  useEffect(() => {
    setLabels(readLabels());
  }, []);

  const getLabel = useCallback(
    (streamKey: string): string | undefined => {
      return labels[streamKey];
    },
    [labels]
  );

  const setLabel = useCallback(
    (streamKey: string, label: string): void => {
      setLabels((prev) => {
        const next = { ...prev, [streamKey]: label };
        writeLabels(next);
        return next;
      });
    },
    []
  );

  const removeLabel = useCallback(
    (streamKey: string): void => {
      setLabels((prev) => {
        const next = { ...prev };
        delete next[streamKey];
        writeLabels(next);
        return next;
      });
    },
    []
  );

  const getAllLabels = useCallback((): Record<string, string> => {
    return { ...labels };
  }, [labels]);

  return { getLabel, setLabel, removeLabel, getAllLabels };
}
