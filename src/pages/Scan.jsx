import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { EmptyState, PageShell, WorkflowMain } from "../components/scanner/WorkflowPrimitives";

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
        subtitle="Scan, PLU, SKU, shelf label, or name"
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
