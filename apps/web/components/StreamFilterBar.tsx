"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type StreamFilters = {
  status: string;
};

export type SortOption = "newest" | "oldest" | "rate-high" | "rate-low";

interface StreamFilterBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: StreamFilters) => void;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  filteredCount: number;
}

const STATUS_OPTIONS = ["All", "Active", "Paused", "Cancelled", "Settled"];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rate-high", label: "Highest rate" },
  { value: "rate-low", label: "Lowest rate" },
];

function useDebouncedCallback(callback: (value: string) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (value: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callback(value);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

export default function StreamFilterBar({
  onSearch,
  onFilterChange,
  onSortChange,
  totalCount,
  filteredCount,
}: StreamFilterBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");

  const debouncedSearch = useDebouncedCallback(onSearch, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatus(value);
    onFilterChange({ status: value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SortOption;
    setSort(value);
    onSortChange(value);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          {/* Magnifying glass icon */}
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
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
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search by address, label, or stream key..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        {/* Status Filter */}
        <select
          value={status}
          onChange={handleStatusChange}
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:w-40"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {/* Sort Dropdown */}
        <select
          value={sort}
          onChange={handleSortChange}
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:w-44"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <p className="text-xs text-slate-500">
        Showing {filteredCount} of {totalCount} streams
      </p>
    </div>
  );
}
