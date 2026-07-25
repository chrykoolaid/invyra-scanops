import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Home,
  Info,
  Loader2,
  Menu,
  MoreVertical,
  PackageSearch,
  Pencil,
  ReceiptText,
  ScanLine,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import TouchSelect from "../components/scanner/TouchSelect";
import { PageShell, SectionCard, TextInputField, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
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
  REVIEW: "REVIEW",
  SUCCESS: "SUCCESS",
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

const PRIMARY = "min-h-12 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY = "min-h-12 rounded-xl border border-border bg-card px-4 text-sm font-black text-foreground active:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

function clean(value) {
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
  };
}

function isWeightedUnit(unit) {
  return ["kg", "kilogram", "kilograms", "g", "gram", "grams", "weight"].includes(clean(unit).toLowerCase());
}

function unitLabel(item) {
  return isWeightedUnit(item.unitType) ? `Per ${String(item.unitType).toUpperCase()}` : "Per Unit";
}

function AppBar({ title, back = false, onBack }) {
  return (
    <div className="-mx-4 -mt-4 flex min-h-14 items-center bg-slate-900 px-4 text-white shadow-sm">
      <button type="button" aria-label={back ? "Back" : "Menu"} onClick={back ? onBack : undefined} className="flex h-11 w-11 items-center justify-start">
        {back ? <ArrowLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <h1 className="flex-1 text-center text-base font-black">{title}</h1>
      <span className="flex h-11 w-11 items-center justify-end"><ScanLine className="h-5 w-5" /></span>
    </div>
  );
}

function SearchBox({ value, onChange, onSubmit, busy, inputRef }) {
  return (
    <form onSubmit={onSubmit} className="border-b border-border bg-card p-3">
      <label className="relative block">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 128))}
          placeholder="Search item or scan barcode"
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
        />
        <button type="submit" aria-label="Search" disabled={busy || !clean(value)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-primary disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="h-5 w-5" />}
        </button>
      </label>
    </form>
  );
}

function QuantityInput({ row, onChange }) {
  const weighted = isWeightedUnit(row.item.unitType);
  return (
    <input
      aria-label={`Quantity for ${row.item.name}`}
      value={row.quantity}
      onChange={(event) => {
        const next = event.target.value.replace(weighted ? /[^0-9.]/g : /[^0-9]/g, "");
        if ((next.match(/\./g) || []).length > 1) return;
        onChange(next);
      }}
      inputMode={weighted ? "decimal" : "numeric"}
      placeholder=""
      className="h-11 w-20 rounded-lg border border-input bg-background px-2 text-center text-base font-black outline-none focus:ring-2 focus:ring-primary/25"
    />
  );
}

function QueueRow({ row, onQuantityChange, onMenu }) {
  const quantity = Number(row.quantity);
  const complete = quantity > 0 && (isWeightedUnit(row.item.unitType) || Number.isInteger(quantity));
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border bg-card px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-foreground">{row.item.name}</p>
        <p className="mt-0.5 text-xs font-bold text-muted-foreground">{unitLabel(row.item)}</p>
      </div>
      <QuantityInput row={row} onChange={onQuantityChange} />
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${complete ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"}`}>
        {complete ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </span>
      <button type="button" aria-label={`Options for ${row.item.name}`} onClick={onMenu} className="flex h-10 w-8 items-center justify-center text-muted-foreground">
        <MoreVertical className="h-5 w-5" />
      </button>
    </div>
  );
}

function SearchResults({ query, result, busy, onQueryChange, onSubmit, onBack, onSelect }) {
  const candidates = Array.isArray(result?.result?.results) ? result.result.results : [];
  return (
    <>
      <AppBar title="Item Search" back onBack={onBack} />
      <SearchBox value={query} onChange={onQueryChange} onSubmit={onSubmit} busy={busy} />
      <div className="border-b border-border bg-background px-3 py-2 text-xs font-black text-muted-foreground">{candidates.length} Results</div>
      <div className="divide-y divide-border bg-card">
        {candidates.map((candidate) => {
          const item = mapAuthoritativeItem(candidate);
          const inactive = clean(item.lifecycleStatus).toUpperCase() !== "ACTIVE";
          return (
            <button key={item.canonicalItemId || `${item.sku}-${item.name}`} type="button" disabled={inactive} onClick={() => onSelect(item)} className="flex min-h-24 w-full items-center gap-3 px-3 py-3 text-left disabled:opacity-50">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/40"><PackageSearch className="h-7 w-7 text-primary" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">{item.name}</span>
                <span className="mt-1 block text-xs font-bold text-muted-foreground">{item.packSize || unitLabel(item)}</span>
                {item.barcode && <span className="mt-2 block truncate text-[11px] font-semibold text-muted-foreground">Barcode: {item.barcode}</span>}
              </span>
              <span className="text-right text-xs font-black text-muted-foreground">{unitLabel(item)}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      <div className="m-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <div className="flex gap-3"><Info className="h-5 w-5 shrink-0" /><div><p className="text-sm font-black">Can’t find your item?</p><p className="mt-1 text-xs font-bold">Try a different name or check the barcode.</p></div></div>
      </div>
    </>
  );
}

function WasteDetails({ draft, onChange, onCancel, onAdd, editing }) {
  const noteRequired = NOTE_REQUIRED_REASONS.has(draft.reasonCode);
  return (
    <>
      <AppBar title="Waste Details" back onBack={onCancel} />
      <div className="flex items-center gap-3 border-b border-border bg-card p-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/40"><PackageSearch className="h-8 w-8 text-primary" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-base font-black">{draft.item.name}</p><p className="mt-1 text-xs font-bold text-muted-foreground">{unitLabel(draft.item)}</p>{draft.item.barcode && <p className="mt-2 truncate text-[11px] font-semibold text-muted-foreground">Barcode: {draft.item.barcode}</p>}</div>
      </div>
      <div className="space-y-5 bg-background p-4">
        <TouchSelect label="Waste Reason" value={draft.reasonCode} onChange={(reasonCode) => onChange({ ...draft, reasonCode })} options={REASON_OPTIONS} />
        <div>
          <TextInputField label={noteRequired ? "Notes (required)" : "Notes (optional)"} value={draft.notes} onChange={(notes) => onChange({ ...draft, notes: notes.slice(0, 100) })} placeholder="Add notes..." />
          <p className="mt-1 text-right text-xs font-bold text-muted-foreground">{draft.notes.length}/100</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border bg-card p-3">
        <button type="button" className={SECONDARY} onClick={onCancel}><X className="mr-2 inline h-4 w-4" />Cancel</button>
        <button type="button" className={PRIMARY} disabled={!draft.reasonCode || (noteRequired && !clean(draft.notes))} onClick={onAdd}>{editing ? "Save Changes" : "Add Waste"}</button>
      </div>
    </>
  );
}

function ItemOptionsSheet({ row, onClose, onEdit, onDelete, onView }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between"><div><p className="text-base font-black">{row.item.name}</p><p className="text-xs font-bold text-muted-foreground">{unitLabel(row.item)}</p></div><button type="button" onClick={onClose} className="h-10 w-10"><X className="mx-auto h-5 w-5" /></button></div>
        <div className="overflow-hidden rounded-xl border border-border">
          <button type="button" onClick={onEdit} className="flex min-h-16 w-full items-center gap-3 border-b border-border px-4 text-left"><Pencil className="h-5 w-5" /><span className="flex-1"><span className="block text-sm font-black">Edit Item</span><span className="block text-xs font-bold text-muted-foreground">Change reason or details</span></span><ChevronRight className="h-5 w-5" /></button>
          <button type="button" onClick={onDelete} className="flex min-h-16 w-full items-center gap-3 border-b border-border px-4 text-left"><Trash2 className="h-5 w-5" /><span className="flex-1"><span className="block text-sm font-black">Delete Item</span><span className="block text-xs font-bold text-muted-foreground">Remove from list</span></span><ChevronRight className="h-5 w-5" /></button>
          <button type="button" onClick={onView} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><Info className="h-5 w-5" /><span className="flex-1"><span className="block text-sm font-black">View Details</span><span className="block text-xs font-bold text-muted-foreground">View item information</span></span><ChevronRight className="h-5 w-5" /></button>
        </div>
        <button type="button" className={`mt-3 w-full ${SECONDARY}`} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function ReviewScreen({ queue, onCancel, onSubmit, busy }) {
  return (
    <>
      <AppBar title="Review Waste" back onBack={onCancel} />
      <div className="flex items-center gap-3 border-b border-border bg-card p-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><ClipboardList className="h-6 w-6" /></span><div><p className="text-base font-black">Review Your Waste</p><p className="text-xs font-bold text-muted-foreground">{queue.length} items</p><p className="mt-1 text-xs text-muted-foreground">Please review before submitting.</p></div></div>
      <div className="divide-y divide-border bg-card">
        {queue.map((row) => <div key={row.id} className="px-4 py-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-black">{row.item.name}</p><p className="text-xs font-bold text-muted-foreground">{unitLabel(row.item)}</p></div><p className="text-sm font-black">Qty: {row.quantity}{isWeightedUnit(row.item.unitType) ? ` ${row.item.unitType}` : ""}</p></div><p className="mt-2 text-xs font-bold text-muted-foreground">Reason: {row.reasonLabel}</p></div>)}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border bg-card p-3"><button type="button" className={SECONDARY} onClick={onCancel}><X className="mr-2 inline h-4 w-4" />Cancel</button><button type="button" className={`${PRIMARY} bg-emerald-600`} onClick={onSubmit} disabled={busy}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <><Send className="mr-2 inline h-4 w-4" />Submit Waste</>}</button></div>
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
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [message, setMessage] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [availability, setAvailability] = useState(() => getLiveItemLookupAvailability(session));

  const menuRow = queue.find((row) => row.id === menuId) || null;
  const incompleteCount = queue.filter((row) => {
    const quantity = Number(row.quantity);
    return !(quantity > 0 && (isWeightedUnit(row.item.unitType) || Number.isInteger(quantity)));
  }).length;
  const queueValid = queue.length > 0 && incompleteCount === 0;

  const focusSearch = useCallback(() => window.setTimeout(() => searchInputRef.current?.focus(), 50), []);

  useEffect(() => {
    const refresh = () => setAvailability(getLiveItemLookupAvailability(session));
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, [session]);

  const openDetails = useCallback((item, row = null) => {
    setDraft({ item, reasonCode: row?.reasonCode || "damaged_in_handling", notes: row?.notes || "" });
    setEditingId(row?.id || null);
    setMenuId(null);
    setScreen(SCREEN.DETAILS);
  }, []);

  const runExactBarcode = useCallback(async (barcode) => {
    if (!availability.connected || busy || !clean(barcode)) return;
    setBusy(true);
    try {
      const result = await runLiveItemLookup({ lookupType: "BARCODE", lookupValue: clean(barcode), session });
      if (result.ok && result.status === "FOUND" && result.result?.item) openDetails(mapAuthoritativeItem(result.result.item));
      else setMessage(result.message || "Item not found. Scan again or search by item name.");
    } finally { setBusy(false); }
  }, [availability.connected, busy, openDetails, session]);

  useEffect(() => {
    if (screen !== SCREEN.QUEUE || !availability.connected) return undefined;
    const flush = () => { const barcode = clean(scannerBuffer.current); scannerBuffer.current = ""; if (barcode) runExactBarcode(barcode); };
    const onKeyDown = (event) => {
      const typing = event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") { if (scannerBuffer.current) { event.preventDefault(); window.clearTimeout(scannerTimer.current); flush(); } }
      else if (event.key.length === 1) { scannerBuffer.current += event.key; window.clearTimeout(scannerTimer.current); scannerTimer.current = window.setTimeout(flush, 120); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => { window.removeEventListener("keydown", onKeyDown, true); window.clearTimeout(scannerTimer.current); scannerBuffer.current = ""; };
  }, [availability.connected, runExactBarcode, screen]);

  const searchItems = async (event) => {
    event.preventDefault();
    const searchQuery = clean(query);
    if (!availability.connected || busy || !searchQuery) return;
    setBusy(true); setMessage(null); setSearchResult(null);
    try {
      const result = await runLiveItemSearch({ query: searchQuery, page: 1, limit: 20, session });
      setSearchResult(result);
      if (result.ok && result.status === "SEARCH_RESULTS") setScreen(SCREEN.RESULTS);
      else setMessage(result.message || "No matching items. Try another item name.");
    } catch (error) { setMessage(error?.message || "Inventory search could not be completed."); }
    finally { setBusy(false); }
  };

  const addOrUpdateQueue = () => {
    if (!draft) return;
    const reason = getWasteReviewReason(draft.reasonCode);
    if (editingId) setQueue((rows) => rows.map((row) => row.id === editingId ? { ...row, item: draft.item, reasonCode: draft.reasonCode, reasonLabel: reason.label, notes: draft.notes } : row));
    else setQueue((rows) => [...rows, { id: `waste-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, item: draft.item, reasonCode: draft.reasonCode, reasonLabel: reason.label, notes: draft.notes, quantity: "" }]);
    setDraft(null); setEditingId(null); setQuery(""); setScreen(SCREEN.QUEUE); focusSearch();
  };

  const submitBatch = () => {
    if (!queueValid) return;
    const permission = canPerformScanOpsAction(GOVERNED_ACTIONS.WASTE_SUBMIT, governance);
    if (!permission.allowed) { recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission); setMessage(permission.reason || "Waste submission is blocked for this role."); setScreen(SCREEN.QUEUE); return; }
    setBusy(true);
    const submitted = queue.map((row) => {
      const review = createWasteReviewDraft({ item: row.item, reasonCode: row.reasonCode, quantity: Number(row.quantity), expiryDate: "", batchLot: "", shelfLocation: "", evidenceNote: row.notes });
      writeWasteRecord({ item: row.item, reasonCode: row.reasonCode, quantity: Number(row.quantity), expiryDate: "", batchLot: "", evidenceNote: row.notes, status: "draft", reviewId: review.reviewId });
      return submitWasteReview(review.reviewId);
    }).filter(Boolean);
    recordGovernedAction(GOVERNED_ACTIONS.WASTE_SUBMIT, "Waste Review", null, permission, { eventLabel: "Waste evidence batch submitted", itemCount: submitted.length });
    setReceipt({ reference: `WS-${Date.now().toString().slice(-8)}`, itemCount: submitted.length, rows: queue, status: "Pending Inventory review" });
    setQueue([]); setBusy(false); setScreen(SCREEN.SUCCESS);
  };

  if (!availability.connected) {
    return <PageShell><WorkflowMain><SectionCard className="mt-4 border-amber-200 bg-amber-50"><AlertTriangle className="h-6 w-6 text-amber-700" /><h2 className="mt-3 text-xl font-black">Inventory connection required</h2><p className="mt-2 text-sm font-bold text-muted-foreground">{availability?.message || "Connect this scanner before searching for items."}</p><button type="button" className={`mt-4 w-full ${PRIMARY}`} onClick={() => window.location.assign("/scanner-settings/sync")}>Open Sync &amp; Connectivity</button></SectionCard></WorkflowMain></PageShell>;
  }

  return (
    <PageShell data-waste-reference-workflow className="overflow-hidden">
      <WorkflowMain className="flex min-h-[calc(100dvh-9rem)] flex-col p-4">
        {screen === SCREEN.RESULTS ? <SearchResults query={query} result={searchResult} busy={busy} onQueryChange={setQuery} onSubmit={searchItems} onBack={() => setScreen(SCREEN.QUEUE)} onSelect={openDetails} />
        : screen === SCREEN.DETAILS && draft ? <WasteDetails draft={draft} onChange={setDraft} onCancel={() => { setDraft(null); setEditingId(null); setScreen(SCREEN.QUEUE); }} onAdd={addOrUpdateQueue} editing={Boolean(editingId)} />
        : screen === SCREEN.REVIEW ? <ReviewScreen queue={queue} onCancel={() => setScreen(SCREEN.QUEUE)} onSubmit={submitBatch} busy={busy} />
        : screen === SCREEN.SUCCESS && receipt ? <><AppBar title="Waste" /><div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-14 w-14" /></span><h2 className="mt-6 text-2xl font-black">Waste Submitted</h2><p className="mt-3 text-base font-bold text-muted-foreground">{receipt.itemCount} items submitted successfully.</p><div className="mt-10 w-full space-y-3"><button type="button" className={`w-full ${SECONDARY}`} onClick={() => setScreen(SCREEN.RECEIPT)}><ReceiptText className="mr-2 inline h-5 w-5" />View Receipt</button><button type="button" className={`w-full ${SECONDARY}`} onClick={() => window.location.assign("/")}><Home className="mr-2 inline h-5 w-5" />Back to Home</button></div></div></>
        : screen === SCREEN.RECEIPT && receipt ? <><AppBar title="Waste Receipt" back onBack={() => setScreen(SCREEN.SUCCESS)} /><div className="space-y-3 p-4"><SectionCard><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reference</p><p className="mt-1 text-xl font-black">{receipt.reference}</p><p className="mt-2 text-sm font-bold text-muted-foreground">{receipt.status}</p></SectionCard>{receipt.rows.map((row) => <SectionCard key={row.id}><div className="flex justify-between"><div><p className="text-sm font-black">{row.item.name}</p><p className="mt-1 text-xs font-bold text-muted-foreground">Reason: {row.reasonLabel}</p></div><p className="text-sm font-black">Qty {row.quantity}</p></div></SectionCard>)}</div></>
        : <>
          <AppBar title="Waste" />
          <SearchBox value={query} onChange={setQuery} onSubmit={searchItems} busy={busy} inputRef={searchInputRef} />
          {message && <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{message}</div>}
          <div className="grid grid-cols-[1fr_80px_24px_32px] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground"><span>Item</span><span className="text-center">Qty</span><span /><span /></div>
          <div className="flex-1 bg-background">{queue.length ? queue.map((row) => <QueueRow key={row.id} row={row} onQuantityChange={(quantity) => setQueue((rows) => rows.map((entry) => entry.id === row.id ? { ...entry, quantity } : entry))} onMenu={() => setMenuId(row.id)} />) : <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><ScanLine className="h-10 w-10 text-primary" /><p className="mt-4 text-base font-black">Scan or search items</p><p className="mt-2 text-sm font-bold text-muted-foreground">Selected items will appear in this list.</p></div>}</div>
          <div className="flex items-center justify-between border-t border-border bg-card px-3 py-3 text-xs font-black"><span>{queue.length} items</span><span className={incompleteCount ? "text-amber-600" : "text-emerald-600"}>{incompleteCount ? `${incompleteCount} incomplete` : queue.length ? "Complete" : ""}</span></div>
          <div className="grid grid-cols-3 gap-2 border-t border-border bg-card p-3"><button type="button" className={SECONDARY} disabled={!menuRow} onClick={() => menuRow && openDetails(menuRow.item, menuRow)}><Pencil className="mr-1 inline h-4 w-4" />Edit</button><button type="button" className={SECONDARY} disabled={!menuRow} onClick={() => { if (menuRow) setQueue((rows) => rows.filter((row) => row.id !== menuRow.id)); setMenuId(null); }}><Trash2 className="mr-1 inline h-4 w-4" />Delete</button><button type="button" className={PRIMARY} disabled={!queueValid} onClick={() => setScreen(SCREEN.REVIEW)}><Send className="mr-1 inline h-4 w-4" />Submit</button></div>
          <ItemOptionsSheet row={menuRow} onClose={() => setMenuId(null)} onEdit={() => openDetails(menuRow.item, menuRow)} onDelete={() => { setQueue((rows) => rows.filter((row) => row.id !== menuRow.id)); setMenuId(null); }} onView={() => { setMessage(`${menuRow.item.name} · ${unitLabel(menuRow.item)}${menuRow.item.barcode ? ` · Barcode ${menuRow.item.barcode}` : ""}`); setMenuId(null); }} />
        </>}
      </WorkflowMain>
    </PageShell>
  );
}
