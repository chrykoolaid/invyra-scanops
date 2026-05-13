import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import { EmptyState, PageShell, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { getItemEntryPrimaryValue } from "../lib/scanOpsItemEntry";

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
      <PageHeader title="Product Lookup" subtitle="Scan or search item details" />
      <WorkflowHeader
        title="Product Lookup"
        subtitle="Scan, PLU, SKU, shelf label, or name"
        showHeaderChrome={false}
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={handleScan}
      />
      <WorkflowMain>
        <EmptyState title="No item selected." />
      </WorkflowMain>
    </PageShell>
  );
}
