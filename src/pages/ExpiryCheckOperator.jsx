import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, RotateCcw, ScanLine } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  ItemSummaryCard,
  MetricPill,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { writeExpiryCheckRecord } from "../lib/scanOpsRecordWriter";
import { ensureInventoryLoaded, resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import { FRESHNESS_CONDITIONS, getExpiryStatus, getFreshnessRecommendation } from "../lib/scanOpsRules";

const TODAY = new Date().toISOString().slice(0, 10);

function itemName(item) {
  return item?.name || item?.item_name || "Scanned item";
}

function primaryScanValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.scaleCode || item?.name || "";
}

function ExpirySessionCard({ lines }) {
  const removeCount = lines.filter((line) => String(line.action || "").toLowerCase().includes("remove") || String(line.expiryStatus || "").toLowerCase().includes("expired")).length;
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Expiry Session</p>
          <h2 className="mt-1 text-base font-black text-foreground">Freshness evidence</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Scan → expiry date → condition → save</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricPill label="Checked" value={lines.length} />
        <MetricPill label="Remove" value={removeCount} />
        <MetricPill label="Status" value="Open" />
      </div>
    </SectionCard>
  );
}

function SavedLinesCard({ lines }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Session Progress</p>
          <h2 className="mt-1 text-lg font-black text-foreground">{lines.length} checked</h2>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {lines.length ? lines.slice(0, 6).map((line) => (
          <div key={line.id} className="rounded-2xl bg-secondary/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-foreground">{line.itemName}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">Expiry {line.expiryDate} · {line.expiryStatus}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">Action: {line.action}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">Saved</span>
            </div>
          </div>
        )) : <EmptyState title="No expiry checks yet." helper="Scan an item, confirm freshness, then save the check." />}
      </div>
    </SectionCard>
  );
}

export default function ExpiryCheckOperator() {
  useEffect(() => { ensureInventoryLoaded(); }, []);

  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [expiryDate, setExpiryDate] = useState(TODAY);
  const [condition, setCondition] = useState("near_expiry");
  const [lines, setLines] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [operatorError, setOperatorError] = useState(null);

  const expiryStatus = useMemo(() => getExpiryStatus(expiryDate, TODAY), [expiryDate]);
  const recommendation = useMemo(() => getFreshnessRecommendation(item, expiryStatus, condition), [item, expiryStatus, condition]);
  const actionLabel = recommendation.action?.label || recommendation.actionLabel || recommendation.title || "Review";

  const scan = (value) => {
    const input = typeof value === "object" ? primaryScanValue(value) : String(value || "").trim();
    const found = typeof value === "object" ? value : resolveInventoryIdentity(input);
    if (!found) {
      setOperatorError({ title: "Item not found", helper: "Scan again or use barcode, SKU, PLU, or item name." });
      setLastSaved(null);
      return;
    }
    setOperatorError(null);
    setLastSaved(null);
    setItem(found);
    setScanValue(primaryScanValue(found));
    setExpiryDate(found.expiryDate || found.expiry_date || TODAY);
    setCondition(found.freshness_default || "near_expiry");
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setExpiryDate(TODAY);
    setCondition("near_expiry");
    setOperatorError(null);
  };

  const saveCheck = () => {
    if (!item) {
      setOperatorError({ title: "Item required", helper: "Scan an item before saving an expiry check." });
      return;
    }
    if (!expiryDate) {
      setOperatorError({ title: "Expiry date required", helper: "Enter or confirm the expiry date before saving." });
      return;
    }

    const line = {
      id: `expiry-${Date.now()}`,
      itemName: itemName(item),
      sku: item.sku,
      barcode: item.barcode,
      expiryDate,
      condition,
      expiryStatus: expiryStatus.label,
      action: actionLabel,
    };

    createScanOpsEvent(SCANOPS_EVENT_TYPES.EXPIRY_CHECK_RECORDED, {
      source_module: "Expiry Check",
      item_name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      plu: item.plu || item.scaleCode,
      match_reason: item._searchMatch?.displayReason || null,
      expiry_date: expiryDate,
      expiry_status: expiryStatus.label,
      freshness_condition: condition,
      recommended_action: actionLabel,
      status: "saved_on_device",
      applies_stock_directly: false,
    });
    writeExpiryCheckRecord({
      item,
      expiryDate,
      condition,
      expiryStatusLabel: expiryStatus.label,
      recommendedAction: actionLabel,
    });

    setLines((current) => [line, ...current]);
    setLastSaved(line);
    setItem(null);
    setScanValue("");
    setExpiryDate(TODAY);
    setCondition("near_expiry");
    setOperatorError(null);
  };

  return (
    <PageShell>
      <PageHeader title="Expiry Check" subtitle="Scan item, confirm date, save freshness evidence" />
      <WorkflowHeader
        title="Expiry Check"
        subtitle="Scan → date → condition → save"
        scanValue={scanValue}
        onScanValueChange={setScanValue}
        onScan={scan}
        showHeaderChrome={false}
        placeholder="Scan item barcode, SKU, PLU, or name..."
      />
      <WorkflowMain>
        {operatorError && <OperatorAlert title={operatorError.title} helper={operatorError.helper} tone="warning" actions={[{ label: "Keep Checking", onClick: () => setOperatorError(null), variant: "primary" }]} />}
        {lastSaved && <OperatorAlert tone="success" title="Expiry check saved" helper={`${lastSaved.itemName} recorded. Ready for next scan.`} />}

        <ExpirySessionCard lines={lines} />

        {item ? (
          <>
            <ItemSummaryCard item={item}>
              <div className="grid grid-cols-3 gap-2">
                <MetricPill label="Expiry" value={expiryStatus.label} />
                <MetricPill label="Condition" value={FRESHNESS_CONDITIONS.find((entry) => entry.id === condition)?.label || condition} />
                <MetricPill label="Action" value={actionLabel} />
              </div>
            </ItemSummaryCard>

            <SectionCard className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Freshness Check</p>
                  <h2 className="mt-1 text-base font-black text-foreground">{itemName(item)}</h2>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">Confirm what is physically visible on the product.</p>
                </div>
              </div>
              <TextInputField label="Expiry date" type="date" value={expiryDate} onChange={setExpiryDate} />
              <TouchSelect label="Freshness condition" value={condition} onChange={setCondition} options={FRESHNESS_CONDITIONS} />
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill label="Expiry" value={expiryStatus.label} />
                  <MetricPill label="Action" value={actionLabel} />
                </div>
                <p className="mt-3 text-xs font-bold leading-snug text-muted-foreground">Expiry evidence is recorded on device for sync and review. No stock movement is posted from this screen.</p>
              </div>
            </SectionCard>

            <StickyActions leftLabel="Clear Item" rightLabel="Save Check" onLeft={clearItem} onRight={saveCheck} />
          </>
        ) : (
          <SectionCard className="border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ScanLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-foreground">Ready to check expiry</p>
                <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">Scan an item, confirm the expiry date and freshness condition, then save the check.</p>
              </div>
            </div>
          </SectionCard>
        )}

        <SavedLinesCard lines={lines} />

        <SectionCard className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Expiry stays evidence-only</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">This handheld workflow captures freshness truth only. Inventory Desktop remains the review and posting layer for any resulting action.</p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
