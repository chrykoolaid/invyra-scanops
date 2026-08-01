import React from "react";
import { ScanLine } from "lucide-react";

export default function QuickActions({ onAction }) {
  return (
    <button
      type="button"
      onClick={() => onAction?.("scan")}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ScanLine className="h-4 w-4" />
      </span>
      Scan or search another item
    </button>
  );
}
