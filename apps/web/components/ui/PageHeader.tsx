"use client";

import { ReactNode } from "react";

type PageHeaderProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-3xl border border-sky-400/10 bg-slate-900/60 p-6 shadow-[0_10px_30px_-12px_rgba(2,132,199,0.4)] backdrop-blur ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
              {icon}
            </span>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-300 md:text-base">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
