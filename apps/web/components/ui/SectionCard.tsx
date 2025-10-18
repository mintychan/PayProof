"use client";

import { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  accent?: "sky" | "violet" | "slate" | "emerald";
};

const accentMap: Record<NonNullable<SectionCardProps["accent"]>, string> = {
  slate: "border-slate-800/80 shadow-[0_24px_50px_-25px_rgba(15,23,42,0.9)]",
  sky: "border-sky-500/20 shadow-[0_24px_50px_-25px_rgba(14,165,233,0.45)]",
  violet: "border-violet-500/20 shadow-[0_24px_60px_-30px_rgba(139,92,246,0.6)]",
  emerald: "border-emerald-500/20 shadow-[0_24px_50px_-25px_rgba(16,185,129,0.45)]",
};

export function SectionCard({ title, description, children, footer, className, accent = "slate" }: SectionCardProps) {
  return (
    <section
      className={`rounded-3xl border bg-slate-950/70 p-6 backdrop-blur transition-shadow duration-200 hover:shadow-lg ${
        accentMap[accent]
      } ${className ?? ""}`}
    >
      {(title || description) && (
        <header className="mb-6 space-y-1">
          {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </header>
      )}
      <div className="space-y-6">{children}</div>
      {footer ? <footer className="mt-6 border-t border-white/5 pt-4 text-sm text-slate-400">{footer}</footer> : null}
    </section>
  );
}
