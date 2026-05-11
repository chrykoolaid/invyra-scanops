import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { PageShell, ReadyCard, WorkflowMain, SectionCard } from "../components/scanner/WorkflowPrimitives";

export default function Scan() {
  const navigate = useNavigate();
  const [scanValue, setScanValue] = useState("");

  const handleScan = (value) => {
    const input = String(value || "").trim() || "demo";
    navigate(`/product/${encodeURIComponent(input)}`);
  };

  return (
    <PageShell>
      <WorkflowHeader
        title="Product Lookup"
        subtitle="Scan, PLU, SKU, shelf label, or item name"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        <ReadyCard title="Ready to scan" helper="Use the hardware trigger or search above. Product lookup does not change stock." />
        <SectionCard>
          <p className="text-xs font-black uppercase tracking-wider text-primary">Scanner-first flow</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Hardware scan, keyboard wedge input, and manual lookup now use the same header search path.
          </p>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
