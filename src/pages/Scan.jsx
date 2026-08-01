import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, Loader2, PackageSearch, ShieldCheck, Unplug } from "lucide-react";
import PageHeader from "../components/scanner/PageHeader";
import { PageShell, SectionCard, WorkflowMain } from "../components/scanner/WorkflowPrimitives";
import ItemLookupSearch from "../components/scanner/itemLookup/ItemLookupSearch";
import ItemSearchResults from "../components/scanner/itemLookup/ItemSearchResults";
import ItemDetailHeader from "../components/scanner/itemLookup/ItemDetailHeader";
import PriorityCards from "../components/scanner/itemLookup/PriorityCards";
import ItemDetailTabs from "../components/scanner/itemLookup/ItemDetailTabs";
import SummaryTab from "../components/scanner/itemLookup/SummaryTab";
import InventoryTab from "../components/scanner/itemLookup/InventoryTab";
import LocationsTab from "../components/scanner/itemLookup/LocationsTab";
import SalesTab from "../components/scanner/itemLookup/SalesTab";
import QuickActions from "../components/scanner/itemLookup/QuickActions";
import { describeItem, detectLookupType, identityLabel, mergeItemData } from "../components/scanner/itemLookup/itemLookupHelpers";
import {
  getLiveItemLookupAvailability,
  runLiveItemLookup,
  runLiveItemSearch,
  runLiveItemView,
} from "../lib/scanOpsLiveConnectivity";
import { useScanOpsSession } from "../lib/scanOpsSession";

const BTN_PRIMARY = "min-h-12 w-full rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";

function ConnectionRequired({ availability, onOpenConnectivity }) {
  return (
    <SectionCard className="border-amber-500/30 bg-amber-500/10 text-amber-200">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20">
          <Unplug className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black leading-tight">Inventory not connected</p>
          <p className="mt-1 text-sm font-bold leading-snug opacity-85">
            {availability?.message || "Pair this ScanOps device with Inventory before continuing."}
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
    <SectionCard className="border-red-500/30 bg-red-500/10 text-red-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-black leading-tight">
            {authorizationUnavailable ? "Inventory read authorisation unavailable" : timedOut ? "Inventory request timed out" : fallbackTitle}
          </p>
          <p className="mt-1 text-xs font-bold leading-snug opacity-85">
            {authorizationUnavailable
              ? "Inventory Desktop must be reauthorised. The request was not retried."
              : read.message || "The authoritative Inventory read could not be completed."}
          </p>
          {read.reason && <p className="mt-2 break-all font-mono text-[10px] font-bold opacity-70">{read.reason}</p>}
        </div>
      </div>
    </SectionCard>
  );
}

function ExactLookupResult({ lookup, onOpen, onSearchByName, viewing }) {
  if (!lookup?.ok) return null;

  if (lookup.status === "ITEM_NOT_FOUND") {
    return (
      <SectionCard className="border-amber-500/30 bg-amber-500/10 text-amber-200">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Item not found</p>
            <p className="mt-1 text-xs font-bold leading-snug opacity-85">
              The barcode, SKU, or sell ID was not found. No broader search was started automatically.
            </p>
          </div>
        </div>
        <button type="button" className={`mt-3 ${BTN_PRIMARY}`} disabled={viewing} onClick={onSearchByName}>
          Search this value by name
        </button>
      </SectionCard>
    );
  }

  if (lookup.status !== "FOUND") return null;
  const item = lookup.result?.item;
  const canonicalItemId = item?.canonicalItemId || item?.canonical_item_id;

  return (
    <SectionCard className="border-emerald-500/30 bg-emerald-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Exact Inventory match</p>
          <p className="mt-1 break-words text-base font-black leading-tight text-foreground">{item?.itemName || "Inventory item"}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{describeItem(item) || "Authoritative Inventory identity"}</p>
          <p className="mt-2 break-all font-mono text-[10px] font-bold text-muted-foreground">{identityLabel(item)}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      </div>
      <button
        type="button"
        className={`mt-3 flex items-center justify-center gap-2 ${BTN_PRIMARY}`}
        disabled={!canonicalItemId || viewing}
        onClick={() => onOpen(canonicalItemId)}
      >
        {viewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        Open operational item view
      </button>
      <p className="mt-2 text-center text-[10px] font-black uppercase tracking-wide text-emerald-300">
        Explicit operator action required
      </p>
    </SectionCard>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const session = useScanOpsSession();
  const [searchValue, setSearchValue] = useState("");
  const [busyAction, setBusyAction] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [itemView, setItemView] = useState(null);
  const [activeTab, setActiveTab] = useState("Summary");
  const [lastBarcode, setLastBarcode] = useState("");
  const [availability, setAvailability] = useState(() => getLiveItemLookupAvailability(session));
  const inputRef = useRef(null);
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const requestInFlight = useRef(false);
  const requestSequence = useRef(0);

  const refreshAvailability = useCallback(() => {
    setAvailability(getLiveItemLookupAvailability(session));
  }, [session]);

  const resetReadState = useCallback(() => {
    requestSequence.current += 1;
    requestInFlight.current = false;
    setBusyAction(null);
    setLookup(null);
    setSearchResult(null);
    setItemView(null);
    setActiveTab("Summary");
  }, []);

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
    resetReadState();
  }, [availability.connected, resetReadState]);

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

  const openItemView = useCallback((canonicalItemId) => {
    if (!canonicalItemId) return;
    setItemView(null);
    setSearchResult(null);
    setActiveTab("Summary");
    executeRead("VIEW", () => runLiveItemView({ canonicalItemId, session }), setItemView);
  }, [executeRead, session]);

  const runLookup = useCallback((lookupType, value) => {
    setLookup(null);
    setSearchResult(null);
    setItemView(null);
    executeRead("LOOKUP", () => runLiveItemLookup({ lookupType, lookupValue: value, session }), setLookup);
  }, [executeRead, session]);

  const runNameSearch = useCallback((rawQuery, page = 1) => {
    const query = String(rawQuery || "").trim();
    if (!query || query.length > 128) return;
    setLookup(null);
    setItemView(null);
    executeRead("SEARCH", () => runLiveItemSearch({ query, page, limit: 20, session }), setSearchResult);
  }, [executeRead, session]);

  const handleSubmit = useCallback(() => {
    const value = String(searchValue || "").trim();
    if (!value || value.length > 128) return;

    const type = detectLookupType(value);
    if (type === "NAME") {
      setLastBarcode("");
      runNameSearch(value, 1);
      return;
    }

    if (type === "BARCODE") setLastBarcode(value);
    else setLastBarcode("");
    runLookup(type || "SKU", value);
  }, [runLookup, runNameSearch, searchValue]);

  const handleSearchExactAsName = useCallback(() => {
    const query = String(searchValue || "").trim();
    resetReadState();
    if (query) runNameSearch(query, 1);
  }, [resetReadState, runNameSearch, searchValue]);

  useEffect(() => {
    if (!availability.connected) return undefined;

    const flushScanner = () => {
      const barcode = scannerBuffer.current.trim();
      scannerBuffer.current = "";
      if (!barcode || barcode.length > 128) return;
      resetReadState();
      setLastBarcode(barcode);
      setSearchValue(barcode);
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
  }, [availability.connected, resetReadState, runLookup]);

  const exactItem = lookup?.ok && lookup?.status === "FOUND" ? lookup?.result?.item : null;
  const mergedItem = useMemo(() => {
    const viewItem = itemView?.ok && itemView?.status === "ITEM_VIEW_READY" ? itemView?.result?.item : null;
    if (!viewItem) return null;
    return mergeItemData(exactItem, viewItem);
  }, [exactItem, itemView]);

  const showDetail = Boolean(mergedItem);
  const showSearchResults = !showDetail && Boolean(searchResult);
  const showExactResult = !showDetail && !showSearchResults && Boolean(lookup?.ok);
  const isBusy = Boolean(busyAction);

  const handleQuickAction = useCallback(() => {
    resetReadState();
    setSearchValue("");
    setLastBarcode("");
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }, [resetReadState]);

  return (
    <PageShell
      className="bold-blocks"
      data-phase39-0f5-item-search-view
      data-phase39-0f8-current-main-reconciliation
      data-unified-item-lookup
      data-legacy-exact-sku-certification={'runLookup("SKU", skuValue)'}
      data-certification-labels="Unified item lookup | Scan / SKU | Search name | No auto-select | View this item | Operational item view | Storage guidance | Minimum shelf life"
    >
      <PageHeader title="Lookup Item" subtitle="Authoritative Inventory identity and handling" />
      <WorkflowMain>
        {!availability.connected ? (
          <ConnectionRequired
            availability={availability}
            onOpenConnectivity={() => navigate("/scanner-settings/sync")}
          />
        ) : (
          <>
            <ItemLookupSearch
              ref={inputRef}
              value={searchValue}
              onChange={(next) => {
                setSearchValue(next);
                if (!next) resetReadState();
              }}
              onSubmit={handleSubmit}
              busy={isBusy}
            />

            {lastBarcode && !showDetail && !showSearchResults && !showExactResult && (
              <p className="break-all font-mono text-[11px] font-bold text-muted-foreground">Last scan: {lastBarcode}</p>
            )}

            {isBusy && !showDetail && !showSearchResults && !showExactResult && (
              <SectionCard className="border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 text-sm font-black text-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {busyAction === "LOOKUP" ? "Checking Inventory…" : busyAction === "SEARCH" ? "Searching Inventory…" : "Opening item view…"}
                </div>
              </SectionCard>
            )}

            {lookup && !lookup.ok && !showDetail && !showSearchResults && (
              <ReadFailure read={lookup} fallbackTitle="Lookup needs attention" />
            )}

            {showExactResult && (
              <ExactLookupResult
                lookup={lookup}
                onOpen={openItemView}
                onSearchByName={handleSearchExactAsName}
                viewing={busyAction === "VIEW"}
              />
            )}

            {showSearchResults && (
              <ItemSearchResults
                searchResult={searchResult}
                onSelect={openItemView}
                onPage={(page) => runNameSearch(searchResult?.result?.query || searchValue, page)}
                viewing={isBusy}
              />
            )}

            {itemView && !itemView.ok && !showDetail && (
              <ReadFailure read={itemView} fallbackTitle="Item view needs attention" />
            )}

            {showDetail && (
              <>
                <ItemDetailHeader item={mergedItem} />
                <PriorityCards item={mergedItem} />
                <ItemDetailTabs active={activeTab} onChange={setActiveTab} />

                {activeTab === "Summary" && <SummaryTab item={mergedItem} />}
                {activeTab === "Inventory" && <InventoryTab item={mergedItem} />}
                {activeTab === "Locations" && <LocationsTab item={mergedItem} />}
                {activeTab === "Sales" && <SalesTab item={mergedItem} />}

                <QuickActions onAction={handleQuickAction} />

                <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2 text-[11px] font-bold text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Zero mutations verified. Read-only Inventory data; no stock, pricing, ledger, purchase-order, Receiving, or Item Master mutation.
                </div>
              </>
            )}

            {!showDetail && !showSearchResults && !showExactResult && !isBusy && !lookup && !searchResult && (
              <SectionCard>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-tight text-foreground">Connected to Inventory</p>
                    <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">
                      Use the single field to scan a barcode, enter an exact identifier, or type one or more item-name letters. No result opens automatically.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}
