"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
            <h2 className="text-lg font-semibold text-red-300">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-400">{this.state.error?.message ?? "An unexpected error occurred."}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-white/20"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
