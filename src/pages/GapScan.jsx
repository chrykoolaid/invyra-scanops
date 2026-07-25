import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { BatchList, EmptyState, ItemSummaryCard, PageShell, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { classifyGap, GAP_TYPES } from "../lib/scanOpsRules";
import { makeWorkflowBatchItem, removeWorkflowBatchItem, upsertWorkflowBatchItem } from "../lib/scanOpsWorkflowBatch";
import { writeGapScanRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded } from "../lib/inventorySystemAdapter";

const OUTCOMES = [
  { id: GAP_TYPES.BACKROOM_AVAILABLE, label: "Shelf gap, stock in backroom" },
  { id: GAP_TYPES.TRUE_OUT_OF_STOCK, label: "True out of stock" },
  { id: GAP_TYPES.SUPPLIER_PENDING, label: "Supplier delivery pending" },
  { id: GAP_TYPES.SHELF_LABEL_PLANOGRAM_ISSUE, label: "Shelf label / planogram issue" },
];

export default function GapScan() {
  useEffect(() => { ensureInventoryLoaded(); }, []);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [outcome, setOutcome] = useState(GAP_TYPES.BACKROOM_AVAILABLE);
  const [evidence, setEvidence] = useState([]);
  const [continuousScan, setContinuousScan] = useState(false);
  const classification = useMemo(() => classifyGap(item), [item]);
  const outcomeLabel = OUTCOMES.find((option) => option.id === outcome)?.label || outcome;

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setItem(found);
    setOutcome(classifyGap(found).gap_type || GAP_TYPES.BACKROOM_AVAILABLE);
  };

  const save = (itemToSave = item, outcomeToSave = outcome) => {
    if (!itemToSave) return;
    const outcomeToSaveLabel = OUTCOMES.find((o) => o.id === outcomeToSave)?.label || outcomeToSave;
    const classificationResult = classifyGap(itemToSave);
    const line = makeWorkflowBatchItem({ workflowType: "gap_scan", item: itemToSave, reason: outcomeToSaveLabel, meta: { recommendedAction: classificationResult.title || "Review gap" } });
    setEvidence((current) => upsertWorkflowBatchItem(current, line));
    createScanOpsEvent(SCANOPS_EVENT_TYPES.GAP_CONFIRMED, {
      source_module: "Gap Scan",
      item_name: itemToSave.name,
      sku: itemToSave.sku,
      barcode: itemToSave.barcode,
      gap_outcome: outcomeToSave,
      gap_outcome_label: outcomeToSaveLabel,
      recommended_action: classificationResult.title,
      applies_stock_directly: false,
      status: "saved_on_device",
    });
    writeGapScanRecord({ item: itemToSave, outcome: outcomeToSave, outcomeLabel: outcomeToSaveLabel });
    setItem(null);
    setScanValue("");
  };

  const handleNewScanWhileActive = (nextItem) => {
    save(item, outcome);
    scan(nextItem);
  };

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Gap Scan" subtitle="Capture shelf gap evidence" />
      <WorkflowHeader
        title="Gap Scan"
        subtitle="Capture shelf gap evidence"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showHeaderChrome={false}
        continuousScan={continuousScan}
        onContinuousScanChange={setContinuousScan}
        hasActiveItem={!!item}
        onNewScanWhileItemActive={handleNewScanWhileActive}
      />
      <WorkflowMain>
        {item ? <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TouchSelect label="Gap reason" value={outcome} onChange={setOutcome} options={OUTCOMES} />
            <div className="rounded-2xl bg-secondary/60 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Action</p>
              <p className="mt-1 text-sm font-bold text-foreground">{classification.title || "Review gap"}</p>
            </div>
          </SectionCard>
        </> : <EmptyState title="No item selected." />}
        <BatchList
          title="Current gap evidence"
          items={evidence}
          emptyText="No gap evidence yet."
          renderMeta={(line) => `${line.reason} · ${line.recommendedAction || "Review"}`}
          onRemove={(id) => setEvidence((current) => removeWorkflowBatchItem(current, id))}
        />
        <StickyActions leftLabel="Clear Item" rightLabel="Save Gap" onLeft={() => { setItem(null); setScanValue(""); }} onRight={save} rightDisabled={!item} />
      </WorkflowMain>
    </PageShell>
  );
}