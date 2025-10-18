"use client";

import { ReactNode } from "react";

type MetricPillProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "sky" | "emerald" | "violet" | "amber";
};

const toneStyles: Record<NonNullable<MetricPillProps["tone"]>, string> = {
  sky: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  emerald: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  violet: "bg-violet-500/15 text-violet-200 ring-violet-400/30",
  amber: "bg-amber-500/20 text-amber-200 ring-amber-400/30",
};

export function MetricPill({ label, value, icon, tone = "sky" }: MetricPillProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/5 p-4 ring-1 ${toneStyles[tone]} shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
        {icon ? <span className="text-base">{icon}</span> : null}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
