"use client";

/* ------------------------------------------------------------------ */
/*  Base Skeleton                                                      */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800 ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonText – N lines of varying widths                           */
/* ------------------------------------------------------------------ */

const LINE_WIDTHS = ["w-full", "w-[85%]", "w-[70%]"];

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${LINE_WIDTHS[i % LINE_WIDTHS.length]}`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonCard – matches the stream card layout                      */
/* ------------------------------------------------------------------ */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur ${className}`}
    >
      {/* Title row: avatar + heading + badge */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Info rows */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="mt-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonStreamDetail – matches the stream detail page              */
/* ------------------------------------------------------------------ */

export function SkeletonStreamDetail({ className = "" }: { className?: string }) {
  return (
    <section className={`min-h-screen p-6 ${className}`}>
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-12" />
      </div>

      {/* Back + title */}
      <div className="mb-8 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-7 w-48" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left side - Circular visualization placeholder */}
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-slate-900/40 p-12 backdrop-blur">
            <Skeleton className="h-80 w-80 rounded-full" />
          </div>
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        </div>

        {/* Right side - Attributes */}
        <div className="space-y-6">
          {/* Heading */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Attribute grid */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stream details */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonTable – N rows x M columns                                 */
/* ------------------------------------------------------------------ */

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`${rowIdx}-${colIdx}`}
              className="h-10 flex-1 rounded-xl"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
