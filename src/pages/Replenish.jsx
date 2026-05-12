import React, { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, MapPin, PackageCheck, PackageX, ShieldAlert, Warehouse } from "lucide-react";
import WorkflowHeader from "../components/scanner/WorkflowHeader";
import { BatchList, DoneCard, EmptyState, InfoLine, ItemSummaryCard, MetricPill, PageShell, QuantityStepper, SectionCard, StickyActions, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import { resolveInventoryIdentity } from "../lib/inventorySystemAdapter";
import {
  getOpenReplenishmentTasks,
  getReplenishmentAction,
  getReplenishmentTasks,
  getShelfNeedSnapshot,
  REPLENISHMENT_ACTIONS,
  REPLENISHMENT_OUTCOMES,
  saveReplenishmentAction,
} from "../lib/scanOpsReplenishment";

const ISSUE_OPTIONS = [
  { id: "shelf_low", label: "Shelf low" },
  { id: "shelf_empty", label: "Shelf empty" },
  { id: "gap_found", label: "Gap found" },
  { id: "promo_fill", label: "Promo fill" },
  { id: "customer_request", label: "Customer request" },
  { id: "manual_check", label: "Manual check" },
];

const ACTION_ICON = {
  [REPLENISHMENT_OUTCOMES.TASK_CREATED]: ClipboardList,
  [REPLENISHMENT_OUTCOMES.SHELF_FILLED]: PackageCheck,
  [REPLENISHMENT_OUTCOMES.SHORT_FILL]: AlertTriangle,
  [REPLENISHMENT_OUTCOMES.NO_BACKROOM_STOCK]: PackageX,
  [REPLENISHMENT_OUTCOMES.DAMAGED_STOCK]: AlertTriangle,
  [REPLENISHMENT_OUTCOMES.WRONG_LOCATION]: MapPin,
  [REPLENISHMENT_OUTCOMES.MANAGER_REVIEW]: ShieldAlert,
};

function pillTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["empty", "no stock", "exception", "review required"].includes(normalized)) return "bg-destructive/10 text-destructive border-destructive/20";
  if (["low", "partial"].includes(normalized)) return "bg-amber-100 text-amber-800 border-amber-200";
  if (["available", "ok", "completed"].includes(normalized)) return "bg-primary/10 text-primary border-primary/20";
  return "bg-secondary text-muted-foreground border-border";
}

function ActionButton({ action, active, onClick }) {
  const Icon = ACTION_ICON[action.id] || ClipboardList;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[4.5rem] rounded-2xl border p-3 text-left active:scale-[0.99] ${
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground active:bg-secondary"
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="break-words text-xs font-black leading-tight">{action.label}</p>
          <p className={`mt-1 text-[10px] font-semibold leading-snug ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{action.helper}</p>
        </div>
      </div>
    </button>
  );
}

function IssueButton({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl px-2 text-xs font-black active:scale-[0.98] ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:bg-border"}`}
    >
      {option.label}
    </button>
  );
}

function ShelfNeedCard({ item, quantity, setQuantity }) {
  const need = useMemo(() => getShelfNeedSnapshot(item), [item]);
  const recommended = Number(need.recommendedMove || 0);

  return (
    <SectionCard className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Warehouse className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-foreground">Shelf / backroom need</p>
          <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Stage AA records execution evidence only. It does not directly mutate inventory quantities.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border px-3 py-2 ${pillTone(need.shelfState)}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Shelf state</p>
          <p className="mt-0.5 text-sm font-black">{need.shelfState}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-2 ${pillTone(need.backroomState)}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Backroom</p>
          <p className="mt-0.5 text-sm font-black">{need.backroomState}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="Min shelf" value={need.minimum ?? "—"} suffix={need.minimum == null ? "" : need.unit} />
        <MetricPill label="Need" value={need.shelfNeed ?? "—"} suffix={need.shelfNeed == null ? "" : need.unit} />
        <MetricPill label="Suggested" value={recommended || "—"} suffix={recommended ? need.unit : ""} />
      </div>

      <div className="rounded-2xl bg-secondary/60 p-3">
        <InfoLine label="Shelf location" value={need.shelfLocation} />
        <InfoLine label="Backroom source" value={need.backroomLocation} />
        <InfoLine label="Planogram" value={need.planogramStatus} />
      </div>

      <QuantityStepper label="Qty moved / requested" value={quantity} onChange={setQuantity} unit={need.unit} min={0} />
    </SectionCard>
  );
}

function RecentReplenishmentList({ records }) {
  return (
    <BatchList
      title="Replenishment activity"
      items={records.slice(0, 8).map((task) => ({
        ...task,
        quantity: task.quantityMoved,
        reason: `${task.status} · ${task.outcomeLabel}`,
        item: {
          itemName: task.itemName || task.item_name,
          raw: task.item_snapshot,
          unit: task.unit,
        },
      }))}
      emptyText="No replenishment activity yet."
      renderMeta={(line) => `${line.status} · ${line.sourceLocation || "Backroom"} → ${line.destinationLocation || "Shelf"}`}
    />
  );
}

export default function Replenish() {
  const [scanValue, setScanValue] = useState("");
  const [item, setItem] = useState(null);
  const [issue, setIssue] = useState("shelf_low");
  const [quantity, setQuantity] = useState(0);
  const [actionId, setActionId] = useState(REPLENISHMENT_OUTCOMES.TASK_CREATED);
  const [notes, setNotes] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [records, setRecords] = useState(() => getReplenishmentTasks());
  const [savedResult, setSavedResult] = useState(null);

  const selectedAction = getReplenishmentAction(actionId);
  const openCount = getOpenReplenishmentTasks().length;

  const scan = (value) => {
    const found = typeof value === "object" ? value : resolveInventoryIdentity(String(value || "").trim());
    if (!found) return;
    const need = getShelfNeedSnapshot(found);
    setItem(found);
    setQuantity(Math.max(0, Number(need.recommendedMove || 0)));
    setSavedResult(null);
  };

  const clearItem = () => {
    setItem(null);
    setScanValue("");
    setNotes("");
    setEvidenceNote("");
    setSavedResult(null);
  };

  const submitAction = () => {
    if (!item) return;
    const issueLabel = ISSUE_OPTIONS.find((option) => option.id === issue)?.label || issue;
    const result = saveReplenishmentAction({ item, actionId, quantity, issueReason: issueLabel, notes, evidenceNote });
    if (!result) return;
    setRecords(result.tasks);
    setSavedResult(result.task);
    setItem(null);
    setScanValue("");
    setNotes("");
    setEvidenceNote("");
  };

  return (
    <PageShell>
      <WorkflowHeader title="Replenishment" subtitle="Backroom-to-shelf execution" scanValue={scanValue} onScanValueChange={setScanValue} onScan={scan} />
      <WorkflowMain>
        <SectionCard className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Stage AA execution workspace</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">Scan an item, confirm shelf need, then record the physical replenishment outcome.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Open</p>
              <p className="text-lg font-black text-foreground">{openCount}</p>
            </div>
          </div>
        </SectionCard>

        {savedResult && (
          <DoneCard
            title={`${savedResult.outcomeLabel} saved`}
            helper="The event is stored locally with user/device proof and queued through the existing ScanOps event pipeline."
            rows={[
              { label: "Item", value: savedResult.itemName },
              { label: "Status", value: savedResult.status },
              { label: "Qty", value: `${savedResult.quantityMoved} ${savedResult.unit}` },
            ]}
          />
        )}

        {item ? (
          <>
            <ItemSummaryCard item={item} />
            <ShelfNeedCard item={item} quantity={quantity} setQuantity={setQuantity} />

            <SectionCard className="space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reason</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ISSUE_OPTIONS.map((option) => <IssueButton key={option.id} option={option} active={issue === option.id} onClick={() => setIssue(option.id)} />)}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Outcome</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {REPLENISHMENT_ACTIONS.map((action) => <ActionButton key={action.id} action={action} active={actionId === action.id} onClick={() => setActionId(action.id)} />)}
                </div>
              </div>
            </SectionCard>

            <SectionCard className="space-y-3">
              <label className="block min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Evidence note</span>
                <textarea
                  value={evidenceNote}
                  onChange={(event) => setEvidenceNote(event.target.value)}
                  rows={2}
                  placeholder="Example: Backroom rack checked, only 2 cases found."
                  className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operator note optional</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Add detail only if useful."
                  className="mt-2 w-full min-w-0 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </SectionCard>
          </>
        ) : (
          <EmptyState title="Scan or search an item to start replenishment." helper="The header search handles manual lookup and scanner input. No stock movement is applied until an outcome is submitted." />
        )}

        <RecentReplenishmentList records={records} />

        <StickyActions
          leftLabel="Clear Item"
          rightLabel={selectedAction.shortLabel ? `Submit ${selectedAction.shortLabel}` : "Submit"}
          onLeft={clearItem}
          onRight={submitAction}
          rightDisabled={!item}
          leftDisabled={!item && !scanValue}
        />
      </WorkflowMain>
    </PageShell>
  );
}
