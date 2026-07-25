import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import {
  OperatorAlert,
  PageShell,
  SectionCard,
  WorkflowMain,
} from "../components/scanner/WorkflowPrimitives";
import {
  getLiveItemLookupAvailability,
  runLiveItemLookup,
  runLiveItemSearch,
  runLiveItemView,
} from "../lib/scanOpsLiveConnectivity";
import { useScanOpsSession } from "../lib/scanOpsSession";

const APPROVED_MUTATION_KEYS = Object.freeze([
  "inventory",
  "stock",
  "ledger",
  "item_master",
  "pricing",
  "purchase_order",
  "receiving",
]);

const BTN_PRIMARY = "min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const BTN_SECONDARY = "min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm font-black text-foreground active:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

function valueOf(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function hasExactZeroMutationEvidence(read) {
  const counts = read?.result?.mutationCounts;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return false;
  const supplied = Object.keys(counts).sort();
  const approved = [...APPROVED_MUTATION_KEYS].sort();
  return supplied.length === approved.length
    && supplied.every((key, index) => key === approved[index])
    && supplied.every((key) => typeof counts[key] === "number" && counts[key] === 0)
    && read?.inventoryMutationAttempted === false
    && read?.scanOpsMutationAttempted === false;
}

function yesNo(value) {
  return value === null || value === undefined ? null : value ? "Yes" : "No";
}

function Detail({ label, value, wide = false }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={`${wide ? "col-span-2" : ""} min-w-0 rounded-2xl bg-secondary/70 px-3 py-2.5`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{String(value)}</p>
    </div>
  );
}

function LifecycleChip({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();
  const active = normalized === "ACTIVE";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
      {normalized}
    </span>
  );
}

function ConnectionRequired({ availability, onOpenConnectivity }) {
  return (
    <SectionCard className="border-amber-200 bg-amber-50 text-amber-950">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
          <Unplug className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">Inventory not connected</p>
          <p className="mt-1 text-sm font-bold leading-snug opacity-85">
            {availability?.message || "Connect and verify this ScanOps device before looking up an item."}
          </p>
          {availability?.reason && (
            <p className="mt-2 break-all font-mono text-[10px] font-bold opacity-70">{availability.reason}</p>
          )}
        </div>
      </div>
      <button type="button" className={`mt-4 ${BTN_PRIMARY}`} onClick={onOpenConnectivity}>
        Open Sync &amp; Connectivity
      </button>
    </SectionCard>
  );
}

function ReadFailure({ read, fallbackTitle = "Item read needs attention" }) {
  if (!read || read.ok) return null;
  const authorizationUnavailable = read.status === "AUTHORIZATION_UNAVAILABLE";
  const timedOut = read.status === "TIMEOUT";
  return (
    <SectionCard className="border-red-200 bg-red-50 text-red-950" data-authoritative-inventory-result>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">
            {authorizationUnavailable
              ? "Inventory read authorisation unavailable"
              : timedOut
                ? "Inventory request timed out"
                : fallbackTitle}
          </p>
          <p className="mt-1 text-sm font-bold leading-snug opacity-85">
            {authorizationUnavailable
              ? "Inventory Desktop must be reauthorised. The request was not retried and no previous result was used."
              : read.message || "The authoritative Inventory read could not be completed."}
          </p>
          {read.reason && (
            <p className="mt-2 break-all font-mono text-[10px] font-bold opacity-70">{read.reason}</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function ExactLookupResult({ lookup, onViewItem, viewing }) {
  if (!lookup) return null;
  if (!lookup.ok) return <ReadFailure read={lookup} fallbackTitle="Lookup needs attention" />;

  const item = lookup?.result?.item;
  const zeroMutations = hasExactZeroMutationEvidence(lookup);
  const batchTracked = valueOf(item, ["batchTracked", "batch_tracked"]);
  const expiryTracked = valueOf(item, ["expiryTracked", "expiry_tracked"]);
  const unitOfMeasure = valueOf(item, ["unitOfMeasure", "unit_of_measure", "uom"]);
  const primaryLocation = valueOf(item, ["primaryLocation", "primary_location"]);
  const authoritativeQuantity = valueOf(item, ["authoritativeQuantity", "authoritative_quantity"]);
  const canonicalItemId = valueOf(item, ["canonicalItemId", "canonical_item_id"]);

  if (lookup.status === "FOUND" && item) {
    return (
      <SectionCard className="border-emerald-200 bg-emerald-50 text-emerald-950" data-authoritative-inventory-result>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Item found</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-80">Authoritative Inventory result</p>
          </div>
          <LifecycleChip status={valueOf(item, ["lifecycleStatus", "lifecycle_status"])} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Detail label="Item name" value={valueOf(item, ["itemName", "item_name"])} wide />
          <Detail label="SKU" value={valueOf(item, ["sku"])} />
          <Detail label="Primary barcode" value={valueOf(item, ["primaryBarcode", "primary_barcode"])} />
          <Detail label="Unit of measure" value={unitOfMeasure} />
          <Detail label="Primary location" value={primaryLocation} />
          <Detail label="Batch tracked" value={yesNo(batchTracked)} />
          <Detail label="Expiry tracked" value={yesNo(expiryTracked)} />
          <Detail label="Authoritative quantity" value={authoritativeQuantity} />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
          <ShieldCheck className="h-4 w-4" />
          {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
        </div>

        {canonicalItemId && (
          <button
            type="button"
            className={`mt-3 ${BTN_PRIMARY}`}
            disabled={viewing}
            onClick={() => onViewItem(canonicalItemId)}
          >
            {viewing ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Opening item…</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" /> Open operational item view</span>
            )}
          </button>
        )}
      </SectionCard>
    );
  }

  if (lookup.status === "ITEM_NOT_FOUND") {
    return (
      <SectionCard className="border-amber-200 bg-amber-50 text-amber-950" data-authoritative-inventory-result>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Item not found</p>
            <p className="mt-1 font-mono text-xs font-black">ITEM_NOT_FOUND</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
          <ShieldCheck className="h-4 w-4" />
          {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
        </div>
      </SectionCard>
    );
  }

  return null;
}

function SearchResults({ searchResult, onSelect, onPage, viewing }) {
  if (!searchResult) return null;
  if (!searchResult.ok) return <ReadFailure read={searchResult} fallbackTitle="Search needs attention" />;

  const result = searchResult.result;
  const zeroMutations = hasExactZeroMutationEvidence(searchResult);
  const candidates = Array.isArray(result?.results) ? result.results : [];

  if (searchResult.status === "NO_RESULTS") {
    return (
      <SectionCard className="border-amber-200 bg-amber-50 text-amber-950" data-item-name-search-results>
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">No matching items</p>
            <p className="mt-1 text-sm font-bold opacity-80">Try a clearer product name, brand, or pack description.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-black">
          <ShieldCheck className="h-4 w-4" />
          {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard data-item-name-search-results>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black leading-tight text-foreground">Choose an item</p>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            {result?.matchCount ?? candidates.length} matches · Page {result?.page || 1} of {result?.totalPages || 1}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
          No auto-select
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {candidates.map((candidate) => (
          <div key={candidate.canonicalItemId} className="rounded-2xl border border-border bg-background p-3" data-item-search-candidate>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-base font-black leading-tight text-foreground">{candidate.itemName}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {[candidate.brand, candidate.packSize, candidate.unitOfMeasure].filter(Boolean).join(" · ") || "Inventory item"}
                </p>
              </div>
              <LifecycleChip status={candidate.lifecycleStatus} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Detail label="SKU" value={candidate.sku} />
              <Detail label="Barcode" value={candidate.primaryBarcode} />
            </div>
            <button
              type="button"
              className={`mt-3 ${BTN_PRIMARY}`}
              disabled={viewing}
              onClick={() => onSelect(candidate.canonicalItemId)}
            >
              <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" /> View this item</span>
            </button>
          </div>
        ))}
      </div>

      {(result?.hasPrevious || result?.hasNext) && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={!result?.hasPrevious || viewing}
            onClick={() => onPage((result?.page || 1) - 1)}
          >
            <ChevronLeft className="mr-1 inline h-4 w-4" /> Previous
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={!result?.hasNext || viewing}
            onClick={() => onPage((result?.page || 1) + 1)}
          >
            Next <ChevronRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary/70 px-3 py-2 text-xs font-black text-foreground">
        <ShieldCheck className="h-4 w-4" />
        {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
      </div>
    </SectionCard>
  );
}

function OperationalItemView({ itemView, onBack }) {
  if (!itemView) return null;
  if (!itemView.ok) return <ReadFailure read={itemView} fallbackTitle="Item view needs attention" />;

  const result = itemView.result;
  const item = result?.item;
  const zeroMutations = hasExactZeroMutationEvidence(itemView);

  if (itemView.status === "ITEM_NOT_FOUND") {
    return (
      <SectionCard className="border-amber-200 bg-amber-50 text-amber-950" data-operational-item-view>
        <p className="text-lg font-black">Item no longer available</p>
        <p className="mt-1 text-sm font-bold opacity-80">Inventory returned ITEM_NOT_FOUND for the selected canonical item.</p>
      </SectionCard>
    );
  }

  if (itemView.status !== "ITEM_VIEW_READY" || !item) return null;

  const inactive = item.isActive === false || String(item.lifecycleStatus || "").toUpperCase() !== "ACTIVE";
  const alternateBarcodes = Array.isArray(item.alternateBarcodes) ? item.alternateBarcodes.join(", ") : null;

  return (
    <SectionCard className="border-primary/20" data-operational-item-view>
      {onBack && (
        <button type="button" className="mb-4 inline-flex items-center gap-2 text-sm font-black text-primary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to search results
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">Operational item view</p>
          <p className="mt-1 break-words text-xl font-black leading-tight text-foreground">{item.itemName}</p>
          {item.shortDisplayName && item.shortDisplayName !== item.itemName && (
            <p className="mt-1 text-sm font-bold text-muted-foreground">{item.shortDisplayName}</p>
          )}
        </div>
        <LifecycleChip status={item.lifecycleStatus} />
      </div>

      {inactive && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black text-amber-950">
          Inactive item — use this view for reference only. No operational action is authorised here.
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Identity</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Detail label="SKU" value={item.sku} />
          <Detail label="Brand" value={item.brand} />
          <Detail label="Category" value={item.category} />
          <Detail label="Pack size" value={item.packSize} />
          <Detail label="Unit of measure" value={item.unitOfMeasure} />
          <Detail label="Primary barcode" value={item.primaryBarcode} />
          <Detail label="Alternate barcodes" value={alternateBarcodes} wide />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Handling</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Detail label="Batch tracked" value={yesNo(item.batchTracked)} />
          <Detail label="Expiry tracked" value={yesNo(item.expiryTracked)} />
          <Detail label="Serialised" value={yesNo(item.serialised)} />
          <Detail label="Minimum shelf life" value={item.minimumShelfLifeDays === null || item.minimumShelfLifeDays === undefined ? null : `${item.minimumShelfLifeDays} days`} />
          <Detail label="Storage guidance" value={item.storageGuidance} wide />
          <Detail label="Inventory updated" value={item.updatedDate} wide />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-950">
        <ShieldCheck className="h-4 w-4" />
        {zeroMutations ? "Zero mutations verified" : "Mutation evidence unavailable"}
      </div>
    </SectionCard>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [mode, setMode] = useState("EXACT");
  const [skuValue, setSkuValue] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [busyAction, setBusyAction] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [itemView, setItemView] = useState(null);
  const [lastBarcode, setLastBarcode] = useState("");
  const [availability, setAvailability] = useState(() => getLiveItemLookupAvailability(session));
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const requestInFlight = useRef(false);
  const requestSequence = useRef(0);

  const refreshAvailability = useCallback(() => {
    setAvailability(getLiveItemLookupAvailability(session));
  }, [session]);

  useEffect(() => {
    refreshAvailability();
    const refresh = () => refreshAvailability();
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("scanops-session-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("scanops-session-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshAvailability]);

  useEffect(() => {
    if (availability.connected) return;
    requestSequence.current += 1;
    requestInFlight.current = false;
    setBusyAction(null);
    setLookup(null);
    setSearchResult(null);
    setItemView(null);
  }, [availability.connected]);

  const executeRead = useCallback(async (action, runner, applyResult) => {
    if (!availability.connected || requestInFlight.current) return;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    requestInFlight.current = true;
    setBusyAction(action);

    try {
      const next = await runner();
      if (requestSequence.current === sequence) applyResult(next);
    } catch (error) {
      if (requestSequence.current === sequence) {
        applyResult({
          ok: false,
          status: "FAILED",
          reason: "ITEM_READ_FAILED",
          message: error?.message || "The authoritative Inventory read could not be completed.",
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
        });
      }
    } finally {
      if (requestSequence.current === sequence) {
        requestInFlight.current = false;
        setBusyAction(null);
        refreshAvailability();
      }
    }
  }, [availability.connected, refreshAvailability]);

  const runLookup = useCallback((lookupType, rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value || value.length > 128) return;
    setLookup(null);
    setItemView(null);
    executeRead(
      "LOOKUP",
      () => runLiveItemLookup({ lookupType, lookupValue: value, session }),
      setLookup,
    );
  }, [executeRead, session]);

  const runNameSearch = useCallback((rawQuery, page = 1) => {
    const query = String(rawQuery || "").trim();
    if (!query || query.length > 128) return;
    setSearchResult(null);
    setItemView(null);
    executeRead(
      "SEARCH",
      () => runLiveItemSearch({ query, page, limit: 20, session }),
      setSearchResult,
    );
  }, [executeRead, session]);

  const openItemView = useCallback((canonicalItemId) => {
    if (!canonicalItemId) return;
    setItemView(null);
    executeRead(
      "VIEW",
      () => runLiveItemView({ canonicalItemId, session }),
      setItemView,
    );
  }, [executeRead, session]);

  useEffect(() => {
    if (!availability.connected || mode !== "EXACT") return undefined;

    const flushScanner = () => {
      const barcode = scannerBuffer.current.trim();
      scannerBuffer.current = "";
      if (!barcode || barcode.length > 128) return;
      setLastBarcode(barcode);
      setSkuValue("");
      runLookup("BARCODE", barcode);
    };

    const onKeyDown = (event) => {
      const target = event.target;
      const typingTarget = target && (
        target.tagName === "INPUT"
        || target.tagName === "TEXTAREA"
        || target.tagName === "SELECT"
        || target.isContentEditable
      );
      if (typingTarget || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        if (scannerBuffer.current) {
          event.preventDefault();
          window.clearTimeout(scannerTimer.current);
          flushScanner();
        }
        return;
      }

      if (event.key.length === 1) {
        scannerBuffer.current += event.key;
        window.clearTimeout(scannerTimer.current);
        scannerTimer.current = window.setTimeout(flushScanner, 120);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(scannerTimer.current);
      scannerBuffer.current = "";
    };
  }, [availability.connected, mode, runLookup]);

  const connectionDetails = useMemo(() => ({
    environment: availability?.profile?.environment,
    storeId: availability?.profile?.storeId,
  }), [availability]);

  const submitSku = (event) => {
    event.preventDefault();
    runLookup("SKU", skuValue);
  };

  const submitName = (event) => {
    event.preventDefault();
    runNameSearch(nameQuery, 1);
  };

  const changeMode = (nextMode) => {
    if (busyAction) return;
    setMode(nextMode);
    setItemView(null);
  };

  return (
    <PageShell className="bold-blocks" data-phase39-0f5-item-search-view>
      <PageHeader title="Item Lookup" subtitle="Scan, search, and view authoritative Inventory items" />
      <WorkflowMain>
        {!availability.connected ? (
          <ConnectionRequired
            availability={availability}
            onOpenConnectivity={() => navigate("/scanner-settings/sync")}
          />
        ) : (
          <>
            <SectionCard className="border-emerald-200 bg-emerald-50 text-emerald-950">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight">Connected to Inventory</p>
                  <p className="mt-1 text-xs font-bold leading-snug opacity-80">
                    {connectionDetails.environment} · {connectionDetails.storeId}
                  </p>
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1" role="group" aria-label="Item lookup mode">
              <button
                type="button"
                aria-pressed={mode === "EXACT"}
                className={`min-h-12 rounded-xl px-3 text-sm font-black ${mode === "EXACT" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => changeMode("EXACT")}
              >
                Scan / SKU
              </button>
              <button
                type="button"
                aria-pressed={mode === "NAME"}
                className={`min-h-12 rounded-xl px-3 text-sm font-black ${mode === "NAME" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => changeMode("NAME")}
              >
                Search name
              </button>
            </div>

            {mode === "EXACT" ? (
              <>
                <SectionCard>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Barcode className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black leading-tight text-foreground">Scan barcode</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                        A valid hardware scanner barcode submits automatically.
                      </p>
                      {lastBarcode && (
                        <p className="mt-2 break-all font-mono text-[11px] font-bold text-muted-foreground">Last scan: {lastBarcode}</p>
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <PackageSearch className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black leading-tight text-foreground">Enter exact SKU</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                        Use this when the barcode is unavailable.
                      </p>
                    </div>
                  </div>

                  <form className="mt-4 space-y-3" onSubmit={submitSku}>
                    <label className="block">
                      <span className="sr-only">Exact SKU</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <input
                          value={skuValue}
                          onChange={(event) => {
                            setSkuValue(event.target.value.slice(0, 128));
                            setLookup(null);
                            setItemView(null);
                          }}
                          placeholder="Enter exact SKU"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="h-12 w-full rounded-2xl border border-input bg-background pl-10 pr-4 text-base font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </label>
                    <button type="submit" className={BTN_PRIMARY} disabled={Boolean(busyAction) || !skuValue.trim()}>
                      {busyAction === "LOOKUP" ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking Inventory…</span>
                      ) : (
                        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Look up SKU</span>
                      )}
                    </button>
                  </form>
                </SectionCard>

                <ExactLookupResult
                  lookup={lookup}
                  onViewItem={openItemView}
                  viewing={busyAction === "VIEW"}
                />
              </>
            ) : (
              <>
                <SectionCard>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Search className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black leading-tight text-foreground">Search by item name</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                        Inventory returns candidates. You choose which item to open.
                      </p>
                    </div>
                  </div>

                  <form className="mt-4 space-y-3" onSubmit={submitName}>
                    <label className="block">
                      <span className="sr-only">Item name</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <input
                          value={nameQuery}
                          onChange={(event) => {
                            setNameQuery(event.target.value.slice(0, 128));
                            setSearchResult(null);
                            setItemView(null);
                          }}
                          placeholder="Example: detergent 2L"
                          autoComplete="off"
                          autoCapitalize="sentences"
                          autoCorrect="on"
                          spellCheck
                          className="h-12 w-full rounded-2xl border border-input bg-background pl-10 pr-4 text-base font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </label>
                    <button type="submit" className={BTN_PRIMARY} disabled={Boolean(busyAction) || !nameQuery.trim()}>
                      {busyAction === "SEARCH" ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching Inventory…</span>
                      ) : (
                        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Search Inventory</span>
                      )}
                    </button>
                  </form>
                </SectionCard>

                <SearchResults
                  searchResult={searchResult}
                  onSelect={openItemView}
                  onPage={(page) => runNameSearch(searchResult?.result?.query || nameQuery, page)}
                  viewing={busyAction === "VIEW" || busyAction === "SEARCH"}
                />
              </>
            )}

            {busyAction === "VIEW" && !itemView && (
              <SectionCard className="border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 text-sm font-black text-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Opening authoritative operational item view…
                </div>
              </SectionCard>
            )}

            <OperationalItemView
              itemView={itemView}
              onBack={mode === "NAME" && searchResult ? () => setItemView(null) : null}
            />

            <OperatorAlert
              tone="info"
              title="Item reads stay read-only"
              helper="No item, stock, ledger, pricing, purchase-order, Receiving, Item Master, or ScanOps mutation is performed."
            />

            <button type="button" className={BTN_SECONDARY} onClick={() => navigate("/scanner-settings/sync")}>
              <MapPin className="mr-2 inline h-4 w-4" /> Open Sync &amp; Connectivity
            </button>
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}