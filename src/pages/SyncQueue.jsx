import React, { useMemo, useState } from "react";
import PageHeader from "../components/scanner/PageHeader";
import { AlertTriangle, CheckCircle2, Eye, RefreshCw, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { createScanOpsEvent, SCANOPS_EVENT_TYPES } from "../lib/scanOpsEvents";
import { getInventoryConnection } from "../lib/inventorySystemAdapter";
import {
  getMarkdownRequests,
  getReceivingRequests,
  getShelfTicketRequests,
  getTransferRequests,
  getWasteRequests,
} from "../lib/scanOpsRequestLifecycle";
import { getNetworkMode, getSyncQueue, getSyncSummary, retryAllSyncEvents, retrySyncEvent, SYNC_STATUSES } from "../lib/scanOpsSync";

const BUTTON_PRIMARY = "w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const BUTTON_SECONDARY = "w-full py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100";
const MINI_BUTTON = "px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold active:scale-[0.98] active:bg-border transition-all flex items-center justify-center gap-1.5 disabled:opacity-40";
const TAB_BUTTON = "rounded-2xl px-3 py-3 text-xs font-black border transition-all active:scale-[0.98]";

const PENDING_STATUSES = new Set([SYNC_STATUSES.QUEUED, SYNC_STATUSES.SYNC_PENDING, SYNC_STATUSES.SYNCING, SYNC_STATUSES.LOCAL_SAVED]);
const ISSUE_STATUSES = new Set([SYNC_STATUSES.SYNC_FAILED, SYNC_STATUSES.FAILED, SYNC_STATUSES.CONFLICT, SYNC_STATUSES.NEEDS_REVIEW]);

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}

function statusTone(status) {
  if (status === SYNC_STATUSES.SYNCED) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700";
  if (ISSUE_STATUSES.has(status)) return "bg-destructive/10 border-destructive/20 text-destructive";
  if (PENDING_STATUSES.has(status)) return "bg-primary/10 border-primary/20 text-primary";
  return "bg-secondary border-border text-muted-foreground";
}

function statusLabel(record) {
  return record.statusLabel || String(record.status || "sync_pending").replaceAll("_", " ");
}

function sourceRequestFor(record) {
  const id = record.sourceRequestId;
  const workflow = record.sourceWorkflow;
  const lists = {
    receiving: getReceivingRequests(),
    transfer: getTransferRequests(),
    waste: getWasteRequests(),
    markdown: getMarkdownRequests(),
    shelf_tickets: getShelfTicketRequests(),
  };
  const list = lists[workflow] || [];
  return list.find((request) => request.requestId === id) || null;
}

function itemRowsFor(record) {
  const source = sourceRequestFor(record);
  if (source?.items?.length) return source.items;
  const payload = record.payloadSnapshot || record.payload || {};
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.item_name || payload.sku || payload.requested_qty) return [payload];
  return [];
}

function workflowTitle(record) {
  const labels = {
    stock_count: "Stock Count",
    receiving: "Receiving",
    transfer: "Transfers",
    waste: "Waste",
    markdown: "Markdowns",
    shelf_tickets: "Shelf Tickets",
    task: "Tasks",
  };
  return labels[record.sourceWorkflow] || record.sourceModule || "ScanOps";
}

function retryable(record) {
  return record.status !== SYNC_STATUSES.SYNCED && record.status !== SYNC_STATUSES.NEEDS_REVIEW;
}

export default function SyncQueue() {
  const [queue, setQueue] = useState(() => getSyncQueue());
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [connection, setConnection] = useState(() => getInventoryConnection());
  const summary = useMemo(() => getSyncSummary(), [queue]);

  const refresh = () => {
    setQueue(getSyncQueue());
    setConnection(getInventoryConnection());
  };

  const filtered = useMemo(() => {
    if (activeTab === "failed") return queue.filter((record) => ISSUE_STATUSES.has(record.status));
    if (activeTab === "synced") return queue.filter((record) => record.status === SYNC_STATUSES.SYNCED);
    return queue.filter((record) => PENDING_STATUSES.has(record.status));
  }, [activeTab, queue]);

  const handleRetry = (record) => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.SYNC_RETRY_REQUESTED, {
      source_module: "Sync Queue",
      status: "requested",
      sync_record_id: record.id,
      source_request_id: record.sourceRequestId,
      sync_exempt: true,
    });
    const result = retrySyncEvent(record.id);
    setSelected(result || record);
    refresh();
  };

  const handleRetryAll = () => {
    createScanOpsEvent(SCANOPS_EVENT_TYPES.INVENTORY_PUSH_STARTED, { source_module: "Sync Queue", status: "started", sync_exempt: true });
    const results = retryAllSyncEvents();
    createScanOpsEvent(SCANOPS_EVENT_TYPES.INVENTORY_PUSH_SUCCEEDED, {
      source_module: "Sync Queue",
      status: "attempted",
      attempted_count: results.length,
      synced_count: results.filter((item) => item?.status === SYNC_STATUSES.SYNCED).length,
      sync_exempt: true,
    });
    refresh();
  };

  if (selected) {
    return <SyncDetail record={selected} onBack={() => { setSelected(null); refresh(); }} onRetry={() => handleRetry(selected)} />;
  }

  const offline = getNetworkMode() === "offline";
  const issueCount = summary.issue || summary.failed + summary.conflict + summary.needsReview;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Sync Queue" subtitle="Pending, failed, and synced handheld records" />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${offline ? "bg-amber-500/10 text-amber-700" : issueCount ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>
              {offline ? <WifiOff className="w-5 h-5" /> : issueCount ? <AlertTriangle className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queue Status</p>
              <h2 className="text-lg font-black text-foreground mt-1 break-words">{summary.pending} pending · {issueCount} failed · {summary.synced} synced</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words">This is a local visibility and recovery layer. It does not mutate stock, activate prices, print tickets, or run approvals.</p>
            </div>
          </div>
          <button onClick={handleRetryAll} disabled={!queue.some(retryable)} className={`${BUTTON_SECONDARY} mt-4`}>
            <RefreshCw className="w-4 h-4" />Retry Pending / Failed
          </button>
          <p className="text-xs text-muted-foreground mt-3">Connection: {connection.statusLabel || "Online"}</p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <button onClick={() => setActiveTab("pending")} className={`${TAB_BUTTON} ${activeTab === "pending" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>Pending</button>
          <button onClick={() => setActiveTab("failed")} className={`${TAB_BUTTON} ${activeTab === "failed" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>Failed</button>
          <button onClick={() => setActiveTab("synced")} className={`${TAB_BUTTON} ${activeTab === "synced" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>Synced</button>
        </section>

        <section className="space-y-3 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center min-w-0">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-bold text-foreground mt-3">No {activeTab} records</p>
              <p className="text-xs text-muted-foreground mt-1">Submit a workflow record to see it here.</p>
            </div>
          ) : (
            filtered.map((record) => <SyncCard key={record.id} record={record} onView={() => setSelected(record)} onRetry={() => handleRetry(record)} />)
          )}
        </section>
      </main>
    </div>
  );
}

function SyncCard({ record, onView, onRetry }) {
  const itemCount = itemRowsFor(record).length;
  return (
    <article className="bg-card rounded-2xl border border-border p-4 min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusTone(record.status)}`}>{statusLabel(record)}</span>
          <h3 className="text-base font-black text-foreground mt-3 break-words">{record.title || workflowTitle(record)}</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{record.summary || record.payloadSummary}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-foreground">{itemCount || "—"}</p>
          <p className="text-[11px] text-muted-foreground mt-1">items</p>
        </div>
      </div>
      {record.failureReason && <p className="rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3 break-words">{record.failureReason}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onView} className={MINI_BUTTON}><Eye className="w-3.5 h-3.5" />View</button>
        <button onClick={onRetry} disabled={!retryable(record)} className={MINI_BUTTON}><RotateCcw className="w-3.5 h-3.5" />Retry</button>
      </div>
    </article>
  );
}

function SyncDetail({ record, onBack, onRetry }) {
  const rows = [
    ["Status", statusLabel(record)],
    ["Created by", `${record.createdBy || "Scanner operator"} · ${record.createdRole || "Staff"}`],
    ["Created at", formatTime(record.createdAt)],
    ["Workflow", workflowTitle(record)],
    ["Source request", record.sourceRequestId || "—"],
    ["Last attempt", formatTime(record.lastAttemptAt)],
    ["Synced at", formatTime(record.syncedAt)],
  ];
  const items = itemRowsFor(record);
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <PageHeader title="Sync Detail" subtitle={record.title || workflowTitle(record)} />
      <main className="flex-1 px-4 py-5 pb-8 space-y-4 overflow-y-auto overflow-x-hidden">
        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusTone(record.status)}`}>{statusLabel(record)}</span>
          <h2 className="text-lg font-black text-foreground mt-3 break-words">{record.title || workflowTitle(record)}</h2>
          <p className="text-sm text-muted-foreground mt-1 break-words">{record.summary || record.payloadSummary}</p>
          {record.failureReason && <p className="mt-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold p-3 break-words">{record.failureReason}</p>}
        </section>

        <section className="bg-card rounded-2xl border border-border divide-y divide-border min-w-0">
          {rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
        </section>

        <section className="bg-card rounded-2xl border border-border p-5 min-w-0 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Items / Payload Snapshot</p>
          {items.length === 0 ? (
            <PayloadSnapshot payload={record.payloadSnapshot || record.payload} />
          ) : (
            items.map((item, index) => <PayloadItem key={item.requestItemId || item.count_line_id || `${record.id}-${index}`} item={item} index={index} />)
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sync history</p>
          <div className="space-y-3 mt-3">
            {(record.syncHistory || []).length === 0 ? <p className="text-sm text-muted-foreground">No sync history yet.</p> : (record.syncHistory || []).map((entry, index) => (
              <div key={`${entry.at}-${index}`} className="rounded-2xl bg-secondary/60 px-3 py-3">
                <p className="text-xs font-bold text-foreground">{entry.label || entry.status}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{entry.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{formatTime(entry.at)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <button onClick={onRetry} disabled={!retryable(record)} className={BUTTON_PRIMARY}><RotateCcw className="w-4 h-4" />Retry Sync</button>
          <button onClick={onBack} className={BUTTON_SECONDARY}>Back to Sync Queue</button>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5 min-w-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right break-words min-w-0">{value || "—"}</span>
    </div>
  );
}

function PayloadItem({ item, index }) {
  const name = item.itemName || item.item_name || item.name || item.title || `Item ${index + 1}`;
  const qty = item.quantity ?? item.counted_quantity ?? item.requested_qty ?? item.copies ?? "—";
  const reason = item.reason || item.reason_label || item.condition || item.markdownType || item.ticketType || item.status || "—";
  const action = item.disposalAction || item.disposal_action || item.paperSize || item.review_status || item.destination_location_label || "—";
  return (
    <article className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0">
      <p className="text-sm font-black text-foreground break-words">{name}</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <SmallFact label="Qty" value={String(qty)} />
        <SmallFact label="Reason" value={reason} />
        <SmallFact label="Action" value={action} />
        <SmallFact label="SKU" value={item.sku || item.barcode || item.plu || "—"} />
      </div>
    </article>
  );
}

function SmallFact({ label, value }) {
  return (
    <div className="rounded-xl bg-card border border-border p-2 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
      <p className="text-xs font-bold text-foreground mt-1 break-words">{value || "—"}</p>
    </div>
  );
}

function PayloadSnapshot({ payload }) {
  if (!payload) return <p className="text-sm text-muted-foreground">No payload snapshot found.</p>;
  const keys = Object.keys(payload).filter((key) => !["rawItem", "payload", "payloadSnapshot"].includes(key)).slice(0, 10);
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3 min-w-0 space-y-2">
      {keys.map((key) => <InfoRow key={key} label={key.replaceAll("_", " ")} value={String(payload[key])} />)}
    </div>
  );
}
