"use client";

import { useState, useRef, useEffect } from "react";

interface StreamLabelProps {
  streamKey: string;
  initialLabel?: string;
  onLabelChange: (label: string) => void;
}

const MAX_LABEL_LENGTH = 30;

export default function StreamLabel({ streamKey, initialLabel, onLabelChange }: StreamLabelProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialLabel ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external label changes
  useEffect(() => {
    setValue(initialLabel ?? "");
  }, [initialLabel]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = value.trim();
    setValue(trimmed);
    setEditing(false);
    onLabelChange(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setValue(initialLabel ?? "");
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={MAX_LABEL_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className="w-full max-w-[200px] rounded-lg border border-sky-500/40 bg-slate-950/80 px-2 py-0.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
        placeholder="Add label..."
        onClick={(e) => e.preventDefault()}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      className="group/label flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-xs transition hover:bg-slate-800/60"
      title="Click to edit label"
    >
      <span className={value ? "text-sky-300" : "text-slate-500 italic"}>
        {value || "Add label"}
      </span>
      {/* Pencil icon */}
      <svg
        className="h-3 w-3 text-slate-500 opacity-0 transition group-hover/label:opacity-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  );
}
