import React from "react";
import { ArrowLeft, CheckCircle2, HelpCircle, MonitorSmartphone, ScanBarcode, Settings, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/scanner/AppHeader";

const HELP_ITEMS = [
  {
    icon: ScanBarcode,
    title: "Scanning",
    helper: "Use Scan or Lookup Item for item checks. If the scanner does not read, use manual barcode, SKU, PLU, or item-name fallback.",
  },
  {
    icon: MonitorSmartphone,
    title: "Sync & Connectivity",
    helper: "Use Settings > Sync for bridge status, queue status, connection testing, and Inventory Desktop pairing.",
  },
  {
    icon: Wifi,
    title: "Wi-Fi",
    helper: "Android owns Wi-Fi joining and passwords. ScanOps only displays network and bridge status.",
  },
  {
    icon: Settings,
    title: "Scanner Test",
    helper: "Use Settings > Scanner to test barcode input. Scanner tests do not change inventory, prices, waste, promos, or stock.",
  },
];

function HelpCard({ icon: Icon, title, helper }) {
  const cardLabel = `${title}. ${helper}`;
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm" aria-label={cardLabel} title={cardLabel}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-foreground" title={title}>{title}</p>
          <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground" title={helper}>{helper}</p>
        </div>
      </div>
    </section>
  );
}

export default function ScanOpsHelp() {
  const navigate = useNavigate();
  const readOnlyLabel = "Help is read-only. This page does not bypass the bridge, mutate inventory, change pricing, adjust stock, print labels, or alter audit behavior.";
  const backLabel = "Back to Home";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader title="Help" subtitle="Quick operator guidance" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm" aria-label="Operator Help. What do I do next?" title="Operator Help. What do I do next?">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70" aria-hidden="true">
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80" title="Operator Help">Operator Help</p>
              <h1 className="mt-1 text-2xl font-black leading-tight" title="What do I do next?">What do I do next?</h1>
              <p className="mt-1 text-sm font-bold leading-snug opacity-90" title="Use this page for quick support only. UAT and release readiness evidence is no longer part of the handheld operator UI.">Use this page for quick support only. UAT and release readiness evidence is no longer part of the handheld operator UI.</p>
            </div>
          </div>
        </section>

        {HELP_ITEMS.map((item) => <HelpCard key={item.title} {...item} />)}

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm" aria-label={readOnlyLabel} title={readOnlyLabel}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-black" title="Help is read-only.">Help is read-only.</p>
              <p className="mt-1 text-xs font-bold leading-snug" title="This page does not bypass the bridge, mutate inventory, change pricing, adjust stock, print labels, or alter audit behavior.">This page does not bypass the bridge, mutate inventory, change pricing, adjust stock, print labels, or alter audit behavior.</p>
            </div>
          </div>
        </section>

        <button type="button" onClick={() => navigate("/")} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98]" aria-label={backLabel} title={backLabel}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Home
        </button>
      </main>
    </div>
  );
}
