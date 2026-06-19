import React, { useState } from "react";
import { Printer, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Print Label button for approved markdown requests.
 * Calls the printMarkdownLabel backend function and shows inline feedback.
 */
export default function PrintLabelButton({ recordId, disabled = false, onPrinted }) {
  const [state, setState] = useState("idle"); // idle | printing | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const handlePrint = async () => {
    if (!recordId || state === "printing") return;
    setState("printing");
    setErrorMsg("");
    try {
      const res = await base44.functions.invoke("printMarkdownLabel", { recordId });
      if (res.data?.success) {
        setState("done");
        onPrinted?.();
        setTimeout(() => setState("idle"), 5000);
      } else {
        setErrorMsg(res.data?.error || "Print failed. Check printer connection.");
        setState("error");
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err.message || "Could not reach printer.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
        <p className="text-sm font-black text-accent">Label sent to printer successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePrint}
        disabled={disabled || state === "printing"}
        className="flex w-full items-center justify-center gap-2 min-h-12 rounded-2xl bg-primary px-3 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:opacity-40"
      >
        <Printer className={`w-4 h-4 ${state === "printing" ? "animate-pulse" : ""}`} />
        {state === "printing" ? "Sending to printer…" : "Print Label"}
      </button>
      {state === "error" && (
        <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-black text-destructive">{errorMsg}</p>
            <button type="button" onClick={() => setState("idle")} className="mt-1 text-[11px] font-bold text-destructive/70 underline">Try again</button>
          </div>
        </div>
      )}
    </div>
  );
}