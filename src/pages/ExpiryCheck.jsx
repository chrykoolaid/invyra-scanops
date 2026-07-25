import React, { useEffect, useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, EmptyState, ItemSummaryCard, MetricPill, PageShell, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { writeExpiryCheckRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded } from "../lib/inventorySystemAdapter";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { FRESHNESS_CONDITIONS, getExpiryStatus, getFreshnessRecommendation } from "../lib/scanOpsRules";

const TODAY = new Date().toISOString().slice(0, 10);

export default function ExpiryCheck() {
  useEffect(() => { ensureInventoryLoaded(); }, []);
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [expiryDate, setExpiryDate] = useState(TODAY);
  const [condition, setCondition] = useState("near_expiry");
  const [done, setDone] = useState(null);
  const [continuousScan, setContinuousScan] = useState(false);
  const expiryStatus = useMemo(() => getExpiryStatus(expiryDate, TODAY), [expiryDate]);
  const recommendation = useMemo(() => getFreshnessRecommendation(item, expiryStatus, condition), [item, expiryStatus, condition]);

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    setItem(found);
    setExpiryDate(found.expiryDate || found.expiry_date || "2026-05-06");
    setCondition(found.freshness_default || "near_expiry");
    setDone(null);
  };

  const save = (itemToSave = item, expiryToSave = expiryDate, conditionToSave = condition) => {
    if (!itemToSave) return;
    const statusForSave = getExpiryStatus(expiryToSave, TODAY);
    const recForSave = getFreshnessRecommendation(itemToSave, statusForSave, conditionToSave);
    createScanOpsEvent(SCANOPS_EVENT_TYPES.EXPIRY_CHECK_RECORDED, {
      source_module: "Expiry Check",
      item_name: itemToSave.name,
      sku: itemToSave.sku,
      barcode: itemToSave.barcode,
      plu: itemToSave.plu || itemToSave.scaleCode,
      match_reason: itemToSave._searchMatch?.displayReason || null,
      expiry_date: expiryToSave,
      expiry_status: statusForSave.label,
      freshness_condition: conditionToSave,
      recommended_action: recForSave.action?.label || recForSave.actionLabel || recForSave.title,
      status: "saved_on_device",
    });
    writeExpiryCheckRecord({
      item: itemToSave,
      expiryDate: expiryToSave,
      condition: conditionToSave,
      expiryStatusLabel: statusForSave.label,
      recommendedAction: recForSave.action?.label || recForSave.actionLabel || recForSave.title,
    });
    setDone(true);
  };

  const handleNewScanWhileActive = (nextItem) => {
    save(item, expiryDate, condition);
    scan(nextItem);
  };

  return (
    <PageShell className="bold-blocks">
      <PageHeader title="Expiry Check" subtitle="Capture date and freshness truth" />
      <WorkflowHeader
        title="Expiry Check"
        subtitle="Capture date and freshness truth"
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
        {!item && <EmptyState title="No item selected." />}
        {item && <>
          <ItemSummaryCard item={item} />
          <SectionCard className="space-y-3">
            <TextInputField label="Expiry date" type="date" value={expiryDate} onChange={setExpiryDate} />
            <TouchSelect label="Freshness status" value={condition} onChange={setCondition} options={FRESHNESS_CONDITIONS} />
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Expiry" value={expiryStatus.label} />
              <MetricPill label="Action" value={recommendation.action?.label || recommendation.actionLabel || recommendation.title || "Review"} />
            </div>
            <div className="rounded-2xl bg-secondary/60 p-3 text-xs leading-snug text-muted-foreground">Show test scenarios is development-only and collapsed from the operator path.</div>
          </SectionCard>
          {done && <DoneCard title="Expiry check saved" helper="Freshness/expiry truth was recorded on device for sync and review." rows={[{ label: "Expiry", value: expiryStatus.label }, { label: "Condition", value: FRESHNESS_CONDITIONS.find((c) => c.id === condition)?.label || condition }]} />}
          <StickyActions leftLabel="Clear" rightLabel="Save Check" onLeft={() => { setItem(null); setScanValue(""); setDone(null); }} onRight={save} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}