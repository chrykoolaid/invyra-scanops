import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MapPin, ScanLine, ShieldCheck } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import { OperatorAlert, PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";

function LookupStep({ icon: Icon, title, helper }) {
  return (
    <div className="flex min-h-[76px] items-start gap-3 rounded-2xl bg-secondary/60 px-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-foreground">{title}</span>
        <span className="mt-1 block text-xs font-bold leading-snug text-muted-foreground">{helper}</span>
      </span>
    </div>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const [scanValue, setScanValue] = useState("");

  const handleScan = (value) => {
    const input = typeof value === "object" ? getItemEntryPrimaryValue(value) : String(value || "").trim();
    if (!input) return;
    navigate(`/product/${encodeURIComponent(input)}`);
  };

  return (
    <PageShell>
      <PageHeader title="Lookup Item" subtitle="Scan first, search second" />
      <WorkflowHeader
        title="Scan or Lookup Item"
        subtitle="Identify an item, check stock, then choose the next task."
        placeholder="Scan barcode, PLU, SKU, or item name..."
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        <SectionCard className="border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-tight text-foreground">Ready for item lookup</p>
              <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                Scan an item to see what it is, where it is, and what you can do next.
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-3">
          <LookupStep
            icon={CheckCircle2}
            title="1. What is this?"
            helper="Confirm product name, SKU, barcode, and item status."
          />
          <LookupStep
            icon={MapPin}
            title="2. Where is it?"
            helper="Check shelf, backroom, department, and primary location."
          />
          <LookupStep
            icon={ShieldCheck}
            title="3. What should I do next?"
            helper="Launch Receive, Count, Transfers, Waste, Markdown, or Expiry."
          />
        </div>

        <OperatorAlert
          tone="info"
          title="Lookup is read-first"
          helper="Inventory quantities are changed only inside controlled workflows."
        />
      </WorkflowMain>
    </PageShell>
  );
}
