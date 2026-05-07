"use client";

import { useState, type ReactNode } from "react";

export default function ChannelDetailsAccordion({
  children,
  label = "View per-channel breakdown",
  defaultOpen = false,
}: {
  children: ReactNode;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left"
      >
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-tertiary)] font-medium">
            Channel detail
          </span>
          <span className="mt-0.5 text-base font-semibold text-[color:var(--text-primary)] tracking-tight">
            {label}
          </span>
        </div>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="#5A6345" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="border-t border-[color:var(--border)] p-5 sm:p-6 grid gap-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}
