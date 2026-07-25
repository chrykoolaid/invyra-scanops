import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  PackageSearch,
  ScanLine,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import TouchSelect from "../components/scanner/TouchSelect";
import {
  EmptyState,
  OperatorAlert,
  PageShell,
  SectionCard,
  StickyActions,
  TextInputField,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import {
  getLiveItemLookupAvailability,
  runLiveItemLookup,
  runLiveItemSearch,
} from "../lib/scanOpsLiveConnectivity";
import { useScanOpsSession } from "../lib/scanOpsSession";
import { writeWasteRecord } from "../lib/scanOpsRecordWriter";
import {
  GOVERNED_ACTIONS,
  canPerformScanOpsAction,
  recordGovernedAction,
  useScanOpsGovernanceContext,
} from "../lib/scanOpsGovernance";
import {
  createWasteReviewDraft,
  getWasteReviewReason,
  submitWasteReview,
  WASTE_REVIEW_REASON_OPTIONS,
} from "../lib/scanOpsWasteReview";

const SCREEN = Object.freeze({
  QUEUE: "QUEUE",
  RESULTS: "RESULTS",
  DETAILS: "DETAILS",
  RECEIPT: "RECEIPT",
});

const WASTE_REASON_IDS = new Set([
  "damaged_in_handling",
  "packaging_broken",
  "spillage",
  "contamination_risk",
  "expired_out_of_date",
  "spoiled_rotten",
  "temperature_issue",
  "theft_suspected_theft",
  "seal_tampering",
  "missing_stock",
  "unknown_loss",
  "count_discrepancy",
  "high_value_discrepancy",
]);

const REASON_OPTIONS = WASTE_REVIEW_REASON_OPTIONS.filter((option) => WASTE_REASON_IDS.has(option.id));
const NOTE_REQUIRED_REASONS = new Set([
  "theft_suspected_theft",
  "missing_stock",
  "unknown_loss",
  "count_discrepancy",
  "high_value_discrepancy",
  "seal_tampering",
]);

const BUTTON_PRIMARY = "min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_SECONDARY = "min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground active:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mapAuthoritativeItem(raw = {}) {
  return {
    id: raw.canonicalItemId || raw.canonical_item_id || raw.id || null,
    canonicalItemId: raw.canonicalItemId || raw.canonical_item_id || raw.id || null,
    name: raw.itemName || raw.item_name || raw.name || "Inventory item",
    item_name: raw.itemName || raw.item_name || raw.name || "Inventory item",
    sku: raw.sku || null,
    barcode: raw.primaryBarcode || raw.primary_barcode || raw.barcode || null,
    brand: raw.brand || null,
    packSize: raw.packSize || raw.pack_size || null,
    unitType: raw.unitOfMeasure || raw.unit_of_measure || raw.uom || "each",
    unit_type: raw.unitOfMeasure || raw.unit_of_measure || raw.uom || "each",
    lifecycleStatus: raw.lifecycleStatus || raw.lifecycle_status || "ACTIVE",
    lifecycle_status: raw.lifecycleStatus || raw.lifecycle_status || "ACTIVE",
    batchTracked: raw.batchTracked ?? raw.batch_tracked ?? false,
    expiryTracked: raw.expiryTracked ?? raw.expiry_tracked ?? false,
  };
}

function isWeightedUnit(unit) {
  const normalized = text(unit).toLowerCase();
  return ["kg", "kilogram", "kilograms", "g", "gram", "grams", "weight"].includes(normalized);
}

function itemSecondary(item) {
  return [item.brand, item.packSize, item.unitType].filter(Boolean).join(" · ") || "Inventory item";
}

function ConnectionRequired({ availability, onOpenConnectivity }) {
  return (
    <SectionCard className="border-amber-200 bg-amber-50 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black">Inventory connection required</p>
          <p className="mt-1 text-sm font-bold opacity-85">
            {availability?.message || "Connect and verify this scanner before searching for an item."}
          </p>
        </div>
      </div>
      <button type="button" className={`mt-4 ${BUTTON_PRIMARY}`} onClick={onOpenConnectivity}>
        Open Sync &amp; Connectivity
      </button>
    </SectionCard>
  );
}

function SearchField({ value, onChange, onSubmit, busy, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <label className="relative block">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 128))}
          placeholder="Search item or scan barcode"
          autoComplete="off"
          className="h-12 w-full rounded-xl bg-background pl-10 pr-24 text-base font-bold text-foreground outline-none ring-1 ring-input focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={busy || !text(value)}
          className="absolute right-1.5 top-1.5 h-9 rounded-lg bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </label>
    </form>
  );
}

function QuantityInput({ row, onChange }) {
  const weighted = isWeightedUnit(row.item.unitType);
  const invalid = row.quantity === "" || Number(row.quantity) <= 0 || (!weighted && !Number.isInteger(Number(row.quantity)));
  return (
    <div className="w-28 shrink-0 text-right">
      <div className={`flex h-11 items-center rounded-xl border bg-background ${invalid ? "border-amber-400" : "border-input"}`}>
        <input
          aria-label={`Quantity for ${row.item.name}`}
          value={row.quantity}
          onChange={(event) => {
            const next = event.target.value.replace(weighted ? /[^0-9.]/g : /[^0-9]/g, "");
            if ((next.match(/\./g) || []).length > 1) return;
            onChange(next);
          }}
          inputMode={weighted ? "decimal" : "numeric"}
          className="min-w-0 flex-1 bg-transparent px-2 text-right text-lg font-black outline-none"
          placeholder="0"
        />
        <span className="pr-2 text-[10px] font-black text-muted-foreground">{row.item.unitType}</span>
      </div>
      {invalid && <p className="mt-1 text-[10px] font-black text-amber-700">Qty required</p>}
    </div>
  );
}

function QueueRow({ row, selected, onSelect, onQuantityChange }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border bg-card"}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-foreground">{row.item.name}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{itemSecondary(row.item)}</p>
          <p className="mt-2 text-xs font-black text-foreground">{row.reasonLabel}</p>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <QuantityInput row={row} onChange={onQuantityChange} />
        </div>
      </div>
    </button>
  );
}

function SearchResults({ result, onBack, onSelect }) {
  const candidates = Array.isArray(result?.result?.results) ? result.result.results : [];
  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Waste
      </button>
      <SectionCard>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Search Results</p>
        <h2 className="mt-1 text-xl font-black text-foreground">Choose an item</h2>
        <p className="mt-1 text-sm font-bold text-muted-foreground">Nothing is selected automatically.</p>
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {candidates.map((candidate) => {
            const item = mapAuthoritativeItem(candidate);
            const inactive = text(item.lifecycleStatus).toUpperCase() !== "ACTIVE";
            return (
              <button
                type="button"
                key={item.canonicalItemId || `${item.sku}-${item.name}`}
                disabled={inactive}
                onClick={() => onSelect(item)}
                className="flex min-h-20 w-full items-center gap-3 bg-background px-4 py-3 text-left disabled:opacity-55"
              >
                <PackageSearch className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-black text-foreground">{item.name}</span>
                  <span className="mt-1 block text-xs font-bold text-muted-foreground">{itemSecondary(item)}</span>
                  {(item.sku || item.barcode) && <span className="mt-1 block text-[10px] font-bold text-muted-foreground">{item.sku || item.barcode}</span>}
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${inactive ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
                  {inactive ? "Inactive" : "Select"}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

function WasteDetails({ draft, onChange, onCancel, onAdd, editing }) {
  const reason = getWasteReviewReason(draft.reasonCode);
  const noteRequired = NOTE_REQUIRED_REASONS.has(draft.reasonCode);
  return (
    <>
      <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Waste
      </button>
      <SectionCard>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Waste Details</p>
        <h2 className="mt-1 break-words text-xl font-black text-foreground">{draft.item.name}</h2>
        <p className="mt-1 text-sm font-bold text-muted-foreground">
          {isWeightedUnit(draft.item.unitType) ? `Per ${draft.item.unitType}` : "Per Unit"}
        </p>
      </SectionCard>
      <SectionCard className="space-y-3">
        <TouchSelect
          label="Waste reason"
          value={draft.reasonCode}
          onChange={(reasonCode) => onChange({ ...draft, reasonCode })}
          options={REASON_OPTIONS}
          helper={reason.helper}
        />
        <TextInputField
          label={noteRequired ? "Notes required" : "Notes (optional)"}
          value={draft.notes}
          onChange={(notes) => onChange({ ...draft, notes })}
          placeholder={noteRequired ? "Briefly describe what was observed" : "Optional note"}
        />
      </SectionCard>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={BUTTON_SECONDARY} onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className={BUTTON_PRIMARY}
          disabled={!draft.reasonCode || (noteRequired && !text(draft.notes))}
          onClick={onAdd}
        >
          {editing ? "Save Changes" : "Add Waste"}
        </button>
      </div>
    </>
  );
}

export default function WasteOperator() {
  const session = useScanOpsSession();
  const governance = useScanOpsGovernanceContext();
  const searchInputRef = useRef(null);
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const [screen, setScreen] = useState(SCREEN.QUEUE);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [availability, setAvailability] = useState(() => getLiveItemLookupAvailability(session));

  const selectedRow = queue.find((row) => row.id === selectedId) || null;
  const queueValid = queue.length > 0 && queue.every((row) => {
    const quantity = Number(row.quantity);
    return quantity > 0 && (isWeightedUnit(row.item.unitType) || Number.isInteger(quantity)) && row.reasonCode;
  });
  const totalQuantity = useMemo(() => queue.reduce((sum, row) => sum + Number(row.quantity || 0), 0), [queue]);

  const focusSearch = useCallback(() => {
    window.setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const refresh = () => setAvailability(getLiveItemLookupAvailability(session));
    refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [session]);

  const openDetails = useCallback((item, row = null) => {
    setDraft({
      item,
      reasonCode: row?.reasonCode || "damaged_in_handling",
      notes: row?.notes || "",
    });
    setEditingId(row?.id || null);
    setScreen(SCREEN.DETAILS);
    setMessage(null);
  }, []);

  const runExactBarcode = useCallback(async (barcode) => {
    if (!availability.connected || busy || !text(barcode)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await runLiveItemLookup({ lookupType: "BARCODE", lookupValue: text(barcode), session });
      if (result.ok && result.status === "FOUND" && result.result?.item) {
        openDetails(mapAuthoritativeItem(result.result.item));
      } else {
        setMessage({ tone: "warning", title: "Item not found", helper: result.message || "Scan again or search by item name." });
        focusSearch();
      }
    } finally {
      setBusy(false);
    }
  }, [availability.connected, busy, focusSearch, openDetails, session]);

  useEffect(() => {
    if (screen !== SCREEN.QUEUE || !availability.connected) return undefined;
    const flush = () => {
      const barcode = text(scannerBuffer.current);
      scannerBuffer.current = "";
      if (barcode) runExactBarcode(barcode);
    };
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") {
        if (scannerBuffer.current) {
          event.preventDefault();
          window.clearTimeout(scannerTimer.current);
          flush();
        }
      } else if (event.key.length === 1) {
        scannerBuffer.current += event.key;
        window.clearTimeout(scannerTimer.current);
        scannerTimer.current = window.setTimeout(flush, 120);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scannerTimer.current);
      scannerBuffer.current = "";
    };
  }, [availability.connected, runExactBarcode, screen]);

  const searchItems = async (event) => {
    event.preventDefault();
    const searchQuery = text(query);
    if (!availability.connected || busy || !searchQuery) return;
    setBusy(true);
    setMessage(null);
    setSearchResult(null);
    try {
      const result = await runLiveItemSearch({ query: searchQuery, page: 1, limit: 20, session });
      setSearchResult(result);
      if (result.ok && result.status === "SEARCH_RESULTS") {
        setScreen(SCREEN.RESULTS);
      } else {
        setMessage({
          tone: result.status === "NO_RESULTS" ? "info" : "warning",
          title: result.status === "NO_RESULTS" ? "No matching items" : "Search needs attention",
          helper: result.message || "Try another item name.",
        });
        focusSearch();
      }
    } catch (error) {
      setMessage({ tone: "warning", title: "Search failed", helper: error?.message || "Inventory search could not be completed." });
    } finally {
      setBusy(false);
    }
  };

  const addOrUpdateQueue = () => {
    if (!draft) return;
    const reason = getWasteReviewReason(draft.reasonCode);
    if (editingId) {
      setQueue((rows) => rows.map((row) => row.id === editingId
        ? { ...row, item: draft.item, reasonCode: draft.reasonCode, reasonLabel: reason.label, notes: draft.notes }
        : row));
      setSelectedId(editingId);
      setMessage({ tone: "success", title: "Waste item updated", helper: "Quantity remains available in the queue." });
    } else {
      const id = `waste-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setQueue((rows) => [...rows, {
        id,
        item: draft.item,
        reasonCode: draft.reasonCode,
        reasonLabel: reason.label,
        notes: draft.notes,
        quantity: "",
      }]);
      setSelectedId(id);
      setMessage({ tone: "success", title: "Waste item added", helper: "Enter the quantity in the queue, then scan the next item." });
    }
    setDraft(null);
    setEditingId(null);
    setQuery("");
    setScreen(SCREEN.QUEUE);
    focusSearch();
  };

  const editSelected = () => {
    if (selectedRow) openDetails(selectedRow.item, selectedRow);
  };

  const deleteSelected = () => {
    if (!selectedRow) return;
    setQueue((rows) => rows.filter((row) => row.id !== selectedRow.id));
    setSelectedId(null);
    setMessage({ tone: "info", title: "Item removed", helper: `${selectedRow.item.name} was removed from this draft queue.` });
    focusSearch();
  };

  const submitBatch = () => {
    if (!queueValid) {
      setMessage({ tone: "warning", title: "Complete the queue", helper: "Every item needs a valid quantity before submission." });
      return;
    }
    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) {
      recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission);
      setMessage({ tone: "warning", title: "Permission required", helper: permission.reason || "Waste submission is blocked for this role." });
      return;
    }

    const submitted = queue.map((row) => {
      const review = createWasteReviewDraft({
        item: row.item,
        reasonCode: row.reasonCode,
        quantity: Number(row.quantity),
        expiryDate: "",
        batchLot: "",
        shelfLocation: "",
        evidenceNote: row.notes,
      });
      writeWasteRecord({
        item: row.item,
        reasonCode: row.reasonCode,
        quantity: Number(row.quantity),
        expiryDate: "",
        batchLot: "",
        evidenceNote: row.notes,
        status: "draft",
        reviewId: review.reviewId,
      });
      return submitWasteReview(review.reviewId);
    }).filter(Boolean);

    recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission, {
      eventLabel: "Waste evidence batch submitted",
      itemCount: submitted.length,
    });
    setReceipt({
      reference: `WS-${Date.now().toString().slice(-8)}`,
      itemCount: submitted.length,
      totalQuantity,
      status: "Pending Inventory review",
    });
    setQueue([]);
    setSelectedId(null);
    setMessage(null);
    setScreen(SCREEN.RECEIPT);
  };

  const returnToFreshQueue = () => {
    setReceipt(null);
    setQuery("");
    setScreen(SCREEN.QUEUE);
    focusSearch();
  };

  return (
    <PageShell data-waste-reference-workflow>
      <PageHeader title="Waste" subtitle="Scan item, classify loss, queue evidence" />
      <WorkflowMain>
        {!availability.connected ? (
          <ConnectionRequired availability={availability} onOpenConnectivity={() => window.location.assign("/scanner-settings/sync")} />
        ) : screen === SCREEN.RESULTS ? (
          <SearchResults result={searchResult} onBack={() => { setScreen(SCREEN.QUEUE); focusSearch(); }} onSelect={openDetails} />
        ) : screen === SCREEN.DETAILS && draft ? (
          <WasteDetails
            draft={draft}
            onChange={setDraft}
            onCancel={() => { setDraft(null); setEditingId(null); setScreen(SCREEN.QUEUE); focusSearch(); }}
            onAdd={addOrUpdateQueue}
            editing={Boolean(editingId)}
          />
        ) : screen === SCREEN.RECEIPT && receipt ? (
          <SectionCard className="border-emerald-200 bg-emerald-50 text-emerald-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em]">Batch Submitted</p>
                <h2 className="mt-1 text-2xl font-black">{receipt.reference}</h2>
                <p className="mt-2 text-sm font-bold">{receipt.itemCount} items · Qty {receipt.totalQuantity}</p>
                <p className="mt-1 text-xs font-bold opacity-80">{receipt.status}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
              <ShieldCheck className="h-4 w-4" /> Inventory remains the posting authority
            </div>
            <button type="button" className={`mt-4 ${BUTTON_PRIMARY}`} onClick={returnToFreshQueue}>Start New Waste Batch</button>
          </SectionCard>
        ) : (
          <>
            <SearchField value={query} onChange={setQuery} onSubmit={searchItems} busy={busy} inputRef={searchInputRef} />

            {message && (
              <OperatorAlert
                tone={message.tone}
                title={message.title}
                helper={message.helper}
                actions={[{ label: "Dismiss", onClick: () => setMessage(null), variant: "primary" }]}
              />
            )}

            <SectionCard className="border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ScanLine className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-foreground">{queue.length ? `${queue.length} item${queue.length === 1 ? "" : "s"} in queue` : "Ready for waste"}</p>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">Scan or search, choose a reason, then enter quantity below.</p>
                </div>
              </div>
            </SectionCard>

            <div className="space-y-2">
              {queue.length ? queue.map((row) => (
                <QueueRow
                  key={row.id}
                  row={row}
                  selected={selectedId === row.id}
                  onSelect={() => setSelectedId(selectedId === row.id ? null : row.id)}
                  onQuantityChange={(quantity) => setQueue((rows) => rows.map((entry) => entry.id === row.id ? { ...entry, quantity } : entry))}
                />
              )) : (
                <EmptyState title="Queue empty" helper="Scan an item or search Inventory to begin." />
              )}
            </div>

            <SectionCard className="py-3">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span>{queue.length} items</span>
                <span>Qty {totalQuantity}</span>
                <span className={queueValid ? "text-emerald-700" : "text-amber-700"}>{queueValid ? "Ready" : "Needs attention"}</span>
              </div>
            </SectionCard>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={BUTTON_SECONDARY} disabled={!selectedRow} onClick={editSelected}>
                <Edit3 className="mr-2 inline h-4 w-4" /> Edit
              </button>
              <button type="button" className={BUTTON_SECONDARY} disabled={!selectedRow} onClick={deleteSelected}>
                <Trash2 className="mr-2 inline h-4 w-4" /> Delete
              </button>
            </div>

            <OperatorAlert
              tone="info"
              title="Evidence only"
              helper="ScanOps submits waste evidence for governed Inventory review. It does not change stock, ledger, pricing, approvals, Item Master, POS, or orders."
            />
          </>
        )}
      </WorkflowMain>

      {availability.connected && screen === SCREEN.QUEUE && (
        <StickyActions
          leftLabel={selectedRow ? "Clear Selection" : "Refresh Connection"}
          rightLabel={queue.length ? `Submit (${queue.length})` : "Submit"}
          onLeft={() => selectedRow ? setSelectedId(null) : setAvailability(getLiveItemLookupAvailability(session))}
          onRight={submitBatch}
          rightDisabled={!queueValid || busy}
        />
      )}
    </PageShell>
  );
}
