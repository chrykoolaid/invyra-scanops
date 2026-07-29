import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Unplug } from "lucide-react";
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
import { mergeItemData, detectLookupType } from "../components/scanner/itemLookup/itemLookupHelpers";
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

  const runBarcodeOrSkuLookup = useCallback((lookupType, value) => {
    setLookup(null);
    setSearchResult(null);
    setItemView(null);
    executeRead(
      "LOOKUP",
      () => runLiveItemLookup({ lookupType, lookupValue: value, session }),
      (result) => {
        setLookup(result);
        if (result?.ok && result?.status === "FOUND" && result?.result?.item?.canonicalItemId) {
          const itemId = result.result.item.canonicalItemId || result.result.item.canonical_item_id;
          if (itemId) {
            requestAnimationFrame(() => {
              executeRead("VIEW", () => runLiveItemView({ canonicalItemId: itemId, session }), setItemView);
            });
          }
        } else if (result?.ok && result?.status === "ITEM_NOT_FOUND") {
          const fallbackQuery = value;
          executeRead(
            "SEARCH",
            () => runLiveItemSearch({ query: fallbackQuery, page: 1, limit: 20, session }),
            setSearchResult,
          );
        }
      },
    );
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
    if (type === "BARCODE") {
      setLastBarcode(value);
      runBarcodeOrSkuLookup("BARCODE", value);
    } else if (type === "SKU") {
      runBarcodeOrSkuLookup("SKU", value);
    } else {
      runNameSearch(value, 1);
    }
  }, [searchValue, runBarcodeOrSkuLookup, runNameSearch]);

  useEffect(() => {
    if (!availability.connected) return undefined;

    const flushScanner = () => {
      const barcode = scannerBuffer.current.trim();
      scannerBuffer.current = "";
      if (!barcode || barcode.length > 128) return;
      setLastBarcode(barcode);
      setSearchValue(barcode);
      runBarcodeOrSkuLookup("BARCODE", barcode);
    };

    const onKeyDown = (event) => {
      const target = event.target;
      const typingTarget = target && (
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable
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
  }, [availability.connected, runBarcodeOrSkuLookup]);

  const mergedItem = useMemo(() => {
    const lookupItem = lookup?.ok && lookup?.status === "FOUND" ? lookup?.result?.item : null;
    const viewItem = itemView?.ok && itemView?.status === "ITEM_VIEW_READY" ? itemView?.result?.item : null;
    if (!lookupItem && !viewItem) return null;
    return mergeItemData(lookupItem, viewItem);
  }, [lookup, itemView]);

  const showDetail = Boolean(mergedItem);
  const showSearchResults = !showDetail && Boolean(searchResult);
  const isBusy = Boolean(busyAction);

  const handleQuickAction = useCallback((key) => {
    if (key === "scan") {
      setSearchValue("");
      setLookup(null);
      setSearchResult(null);
      setItemView(null);
      setLastBarcode("");
      requestAnimationFrame(() => inputRef.current?.focus?.());
    } else if (key === "movements") {
      const itemKey = mergedItem?.primaryBarcode || mergedItem?.sku || mergedItem?.canonicalItemId;
      navigate(itemKey ? `/movements?item=${encodeURIComponent(itemKey)}` : "/movements");
    } else if (key === "locations") {
      setActiveTab("Locations");
    } else if (key === "report") {
      const itemKey = mergedItem?.primaryBarcode || mergedItem?.sku || mergedItem?.canonicalItemId;
      navigate(itemKey ? `/gap-scan?item=${encodeURIComponent(itemKey)}` : "/gap-scan");
    }
  }, [mergedItem, navigate]);

  return (
    <PageShell className="bold-blocks" data-phase39-0f5-item-search-view>
      <PageHeader title="Lookup Item" subtitle="Scan or search item details" />
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
                if (!next) {
                  setLookup(null);
                  setSearchResult(null);
                }
              }}
              onSubmit={handleSubmit}
              busy={isBusy}
            />

            {lastBarcode && !showDetail && !showSearchResults && (
              <p className="break-all font-mono text-[11px] font-bold text-muted-foreground">Last scan: {lastBarcode}</p>
            )}

            {isBusy && !showDetail && !showSearchResults && (
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

            {showSearchResults && (
              <ItemSearchResults
                searchResult={searchResult}
                onSelect={openItemView}
                onPage={(page) => runNameSearch(searchResult?.result?.query || searchValue, page)}
                viewing={isBusy}
              />
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
                  Read-only. No stock, pricing, ledger, or item mutation is performed.
                </div>
              </>
            )}

            {!showDetail && !showSearchResults && !isBusy && !lookup && !searchResult && (
              <SectionCard>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-tight text-foreground">Connected to Inventory</p>
                    <p className="mt-1 text-xs font-bold leading-snug text-muted-foreground">
                      Scan a barcode or search by item name, SKU, or sell ID to open the item detail.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {itemView && !itemView.ok && showDetail && (
              <ReadFailure read={itemView} fallbackTitle="Item view needs attention" />
            )}
          </>
        )}
      </WorkflowMain>
    </PageShell>
  );
}