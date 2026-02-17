"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Colour mapping                                                     */
/* ------------------------------------------------------------------ */

const TYPE_STYLES: Record<
  ToastType,
  { border: string; bg: string; icon: string; bar: string }
> = {
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
    bar: "bg-emerald-400",
  },
  error: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    icon: "text-red-400",
    bar: "bg-red-400",
  },
  info: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    icon: "text-sky-400",
    bar: "bg-sky-400",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    icon: "text-amber-400",
    bar: "bg-amber-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Icons (inline SVGs)                                                */
/* ------------------------------------------------------------------ */

function ToastIcon({ type }: { type: ToastType }) {
  const cls = `h-5 w-5 ${TYPE_STYLES[type].icon}`;

  switch (type) {
    case "success":
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "error":
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "info":
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "warning":
      return (
        <svg className={cls} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Single toast component                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_DURATION = 5000;
const MAX_VISIBLE = 3;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration ?? DEFAULT_DURATION;
  const styles = TYPE_STYLES[toast.type];
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(Date.now());
  const [progress, setProgress] = useState(100);

  // Auto-dismiss timer
  useEffect(() => {
    startRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onDismiss, toast.id]);

  // Progress bar animation via requestAnimationFrame
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / duration);
      setProgress(remaining * 100);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto relative w-80 overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${styles.border} ${styles.bg} bg-slate-900/80 ${
        exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100"
      }`}
      style={{
        animation: exiting ? undefined : "toast-slide-in 0.3s ease-out",
      }}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 shrink-0">
          <ToastIcon type={toast.type} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-slate-300">{toast.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:text-white"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-slate-800/50">
        <div
          className={`h-full ${styles.bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((opts: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => {
      const next = [...prev, { ...opts, id }];
      // Keep only the last MAX_VISIBLE toasts
      return next.slice(-MAX_VISIBLE);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      {children}

      {/* Toast container -- only render on client */}
      {mounted && toasts.length > 0 && (
        <div
          aria-label="Notifications"
          className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}

      {/* Keyframes for slide-in animation */}
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
