import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, PageShell, ReadyCard, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { classifyGap, GAP_TYPES } from "../lib/scanOpsRules";

const OUTCOMES = [
  { id: GAP_TYPES.BACKROOM_AVAILABLE, label: "Shelf gap, stock in backroom" },
  { id: GAP_TYPES.TRUE_OUT_OF_STOCK, label: "True out of stock" },
  { id: GAP_TYPES.SUPPLIER_PENDING, label: "Supplier delivery pending" },
  { id: GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE, label: "Shelf label / planogram issue" },
];

export default function GapScan() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [outcome, setOutcome] = useState(GAP_TYPES.BACKROOM_AVAILABLE);
  const [done, setDone] = useState(false);
  const classification = useMemo(() => classifyGap(item), [item]);

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000001") || resolveInventoryIdentity("930000000001");
    setItem(found);
    setOutcome(classifyGap(found).gap_type || GAP_TYPES.BACKROOM_AVAILABLE);
    setDone(false);
  };

  const save = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GAP_CONFIRMED, {
      source_module: "Gap Scan",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      gap_outcome: outcome,
      recommended_action: classification.title,
      status: "saved_on_device",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Gap Scan" subtitle="Capture shelf gap evidence" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!item && <ReadyCard title="Ready to scan" helper="Use hardware trigger or tap search above." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Gap reason" value={outcome} onChange={setOutcome} options={OUTCOMES} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Action</p>
              <p className="mt-1 text-sm font-bold text-foreground">{classification.title || "Review gap"}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{classification.helper || "Save the gap result for review."}</p>
            </div>
          </SectionCard>
          {done && <DoneCard title="Gap scan saved" helper="Gap result saved on device. Any replenishment or reorder action remains governed by Inventory." rows={[{ label: "Outcome", value: OUTCOMES.find((o) => o.id === outcome)?.label || outcome }]} />}
          <StickyActions leftLabel="Review" rightLabel="Save Gap Scan" onLeft={() => setDone(false)} onRight={save} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
