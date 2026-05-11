import React, { useMemo, useState } from "react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import { DoneCard, ItemSummaryCard, MetricPill, PageShell, ReadyCard, SectionCard, StickyActions, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { EXPIRY_CHECK_SCAN_ITEM } from "../lib/scanOpsInventoryFixtures";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { FRESHNESS_CONDITIONS, getExpiryStatus, getFreshnessRecommendation } from "../lib/scanOpsRules";

const TODAY = "2026-05-05";

export default function ExpiryCheck() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [expiryDate, setExpiryDate] = useState("2026-05-06");
  const [condition, setCondition] = useState("near_expiry");
  const [done, setDone] = useState(null);
  const expiryStatus = useMemo(() => getExpiryStatus(expiryDate, TODAY), [expiryDate]);
  const recommendation = useMemo(() => getFreshnessRecommendation(item, expiryStatus, condition), [item, expiryStatus, condition]);

  const scan = (value) => {
    const found = resolveInventoryIdentity(String(value || "").trim() || "930000000004") || EXPIRY_CHECK_SCAN_ITEM;
    setItem(found);
    setExpiryDate(found.expiryDate || found.expiry_date || "2026-05-06");
    setCondition(found.freshness_default || "near_expiry");
    setDone(null);
  };

  const save = () => {
    if (!item) return;
    createScanOpsEvent(SCANOPS_EVENT_TYPES.EXPIRY_CHECK_RECORDED, {
      source_module: "Expiry Check",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      expiry_date: expiryDate,
      expiry_status: expiryStatus.label,
      freshness_condition: condition,
      recommended_action: recommendation.action?.label || recommendation.actionLabel || recommendation.title,
      status: "saved_on_device",
    });
    setDone(true);
  };

  return (
    <PageShell>
      <WorkflowHeader title="Expiry Check" subtitle="Capture date and freshness truth" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        {!item && <ReadyCard title="Ready to scan" helper="Use hardware trigger or tap search above." />}
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
          <StickyActions leftLabel="Review" rightLabel="Save Check" onLeft={() => setDone(null)} onRight={save} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
