"use client";

import { useState, useEffect } from "react";
import {
  useEmployeeDirectory,
  EmployeeEntry,
} from "../hooks/useEmployeeDirectory";
import { EncryptedStream } from "../lib/contracts/encryptedPayrollContract";

interface EmployeeDirectoryProps {
  employerAddress: string;
  streams: EncryptedStream[];
}

export default function EmployeeDirectory({
  employerAddress,
  streams,
}: EmployeeDirectoryProps) {
  const { entries, upsertEntry, syncWithStreams, exportCSV } =
    useEmployeeDirectory(employerAddress);

  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync streams with directory on mount / stream changes
  useEffect(() => {
    if (streams.length > 0) {
      syncWithStreams(streams);
    }
  }, [streams, syncWithStreams]);

  const departments = Array.from(
    new Set(entries.map((e) => e.department).filter(Boolean))
  );

  const filteredEntries = entries.filter((entry) => {
    if (filterDept && entry.department !== filterDept) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.address.toLowerCase().includes(q) ||
        entry.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const startEdit = (entry: EmployeeEntry) => {
    setEditingAddress(entry.address);
    setEditName(entry.name);
    setEditDept(entry.department);
  };

  const saveEdit = (entry: EmployeeEntry) => {
    upsertEntry({ ...entry, name: editName, department: editDept });
    setEditingAddress(null);
  };

  const statusColors: Record<string, string> = {
    Active: "bg-emerald-500/20 text-emerald-400",
    Paused: "bg-amber-500/20 text-amber-400",
    Cancelled: "bg-red-500/20 text-red-400",
    Settled: "bg-sky-500/20 text-sky-300",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          Employee Directory ({entries.length})
        </h2>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-400/30 hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/30 focus:outline-none"
          />
        </div>
        {departments.length > 0 && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-blue-400/30 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-500">
              {entries.length === 0
                ? "No employees yet. Create streams to populate the directory."
                : "No employees match your search."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Name / Label
                </th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Address
                </th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Department
                </th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Start Date
                </th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEntries.map((entry) => (
                <tr key={entry.address} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {editingAddress === entry.address ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Employee name"
                        className="w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white focus:border-blue-400/30 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="text-white">
                        {entry.name || (
                          <span className="italic text-slate-500">
                            Click edit to add name
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-400">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingAddress === entry.address ? (
                      <input
                        type="text"
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        placeholder="e.g. Engineering"
                        className="w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white focus:border-blue-400/30 focus:outline-none"
                      />
                    ) : (
                      <span className="text-slate-400">
                        {entry.department || "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        statusColors[entry.streamStatus] ??
                        "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {entry.streamStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {entry.startTime
                      ? new Date(entry.startTime * 1000).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingAddress === entry.address ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(entry)}
                            className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/30"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAddress(null)}
                            className="rounded-lg bg-slate-500/20 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-500/30"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="rounded-lg bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-400 transition hover:bg-blue-500/30"
                          >
                            Edit
                          </button>
                          <a
                            href={`/stream/${entry.streamKey}`}
                            className="rounded-lg bg-slate-500/20 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-500/30"
                          >
                            View
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
