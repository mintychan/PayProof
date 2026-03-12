"use client";

import { useState, useEffect, useCallback } from "react";

export interface EmployeeEntry {
  address: string;
  name: string;
  department: string;
  streamKey: string;
  streamStatus: string;
  startTime: number;
}

const STORAGE_KEY = "payproof_employee_directory";

function loadDirectory(employer: string): EmployeeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${employer.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDirectory(employer: string, entries: EmployeeEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${STORAGE_KEY}_${employer.toLowerCase()}`,
    JSON.stringify(entries)
  );
}

export function useEmployeeDirectory(employerAddress: string | undefined) {
  const [entries, setEntries] = useState<EmployeeEntry[]>([]);

  useEffect(() => {
    if (!employerAddress) return;
    setEntries(loadDirectory(employerAddress));
  }, [employerAddress]);

  const upsertEntry = useCallback(
    (entry: EmployeeEntry) => {
      if (!employerAddress) return;
      setEntries((prev) => {
        const idx = prev.findIndex(
          (e) => e.address.toLowerCase() === entry.address.toLowerCase()
        );
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...entry };
        } else {
          next.push(entry);
        }
        saveDirectory(employerAddress, next);
        return next;
      });
    },
    [employerAddress]
  );

  const removeEntry = useCallback(
    (address: string) => {
      if (!employerAddress) return;
      setEntries((prev) => {
        const next = prev.filter(
          (e) => e.address.toLowerCase() !== address.toLowerCase()
        );
        saveDirectory(employerAddress, next);
        return next;
      });
    },
    [employerAddress]
  );

  const syncWithStreams = useCallback(
    (
      streams: Array<{
        employee: string;
        streamKey: string;
        status: number;
        startTime: number;
      }>
    ) => {
      if (!employerAddress) return;
      setEntries((prev) => {
        const next = [...prev];
        for (const stream of streams) {
          const idx = next.findIndex(
            (e) =>
              e.address.toLowerCase() === stream.employee.toLowerCase()
          );
          const statusMap: Record<number, string> = {
            1: "Active",
            2: "Paused",
            3: "Cancelled",
            4: "Settled",
          };
          const statusLabel = statusMap[stream.status] ?? "Unknown";

          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              streamKey: stream.streamKey,
              streamStatus: statusLabel,
              startTime: stream.startTime,
            };
          } else {
            next.push({
              address: stream.employee,
              name: "",
              department: "",
              streamKey: stream.streamKey,
              streamStatus: statusLabel,
              startTime: stream.startTime,
            });
          }
        }
        saveDirectory(employerAddress, next);
        return next;
      });
    },
    [employerAddress]
  );

  const exportCSV = useCallback(() => {
    const headers = [
      "Name",
      "Address",
      "Department",
      "Stream Status",
      "Start Date",
      "Stream Key",
    ];
    const rows = entries.map((e) => [
      e.name || "Unnamed",
      e.address,
      e.department || "-",
      e.streamStatus,
      new Date(e.startTime * 1000).toLocaleDateString(),
      e.streamKey,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  return {
    entries,
    upsertEntry,
    removeEntry,
    syncWithStreams,
    exportCSV,
  };
}
