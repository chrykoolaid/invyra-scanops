import React from "react";

export const BOLD_BG = "#0a0a0a";
export const BOLD_EMERALD = "#10b981";

export function BoldPageShell({ children }) {
  return <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-x-hidden">{children}</div>;
}

export function Block({ children, className = "", ...rest }) {
  return (
    <section className={`rounded-2xl border border-emerald-500 bg-[#0a0a0a] p-4 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function BlockLabel({ children, className = "" }) {
  return <p className={`text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 ${className}`}>{children}</p>;
}

export function BoldMiniMetric({ label, value, suffix = "" }) {
  return (
    <div className="rounded-xl border border-emerald-500/50 bg-[#0a0a0a] px-2 py-2 text-center">
      <p className="font-mono text-lg font-black text-white">{value}{suffix ? ` ${suffix}` : ""}</p>
      <BlockLabel className="mt-0.5">{label}</BlockLabel>
    </div>
  );
}

export function BoldMetric({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl font-black text-white">{value}</span>
      <BlockLabel className="mt-0.5">{label}</BlockLabel>
    </div>
  );
}

export function BoldActions({ leftLabel, rightLabel, onLeft, onRight, rightDisabled = false, leftDisabled = false }) {
  return (
    <div className="scanops-sticky-actions grid grid-cols-2 gap-3">
      <button type="button" disabled={leftDisabled} onClick={onLeft} className="min-h-12 rounded-2xl border border-emerald-500/60 px-3 text-sm font-black uppercase tracking-wide text-emerald-400 active:bg-emerald-950 disabled:opacity-40">
        {leftLabel}
      </button>
      <button type="button" disabled={rightDisabled} onClick={onRight} className="min-h-12 rounded-2xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98] disabled:opacity-40">
        {rightLabel}
      </button>
    </div>
  );
}

export function BoldPrimaryButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-12 w-full rounded-2xl bg-emerald-500 px-3 text-sm font-black uppercase tracking-wide text-[#0a0a0a] active:scale-[0.98] disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

export function BoldGhostButton({ children, onClick, disabled = false, className = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`min-h-12 w-full rounded-2xl border border-emerald-500/60 px-3 text-sm font-black uppercase tracking-wide text-emerald-400 active:bg-emerald-950 disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

export function BoldInfoLine({ label, value }) {
  return (
    <p className="text-xs font-semibold text-gray-400">
      <span className="text-gray-500">{label}:</span> <span className="text-white">{value || "—"}</span>
    </p>
  );
}